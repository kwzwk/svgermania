// Wochenplan-Generator. Reine Funktionen ohne DOM, damit sie im Browser und in Node-Tests laufen.

import { AGE_GROUPS, PHASES, RITUAL_MINUTES } from './config.js';

// Kleiner deterministischer Zufallsgenerator (mulberry32), damit ein Plan reproduzierbar ist.
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Ein Schwerpunkt pro Woche, rotierend durch die Themen der Altersklasse.
export function themeForWeek(ageId, week) {
  const themes = AGE_GROUPS[ageId].themes;
  return themes[(((week - 1) % themes.length) + themes.length) % themes.length];
}

// Verteilt die Trainingszeit auf die Phasen (Spielen – Üben – Spielen), gerundet auf 5 Minuten.
export function splitMinutes(total) {
  // Abrunden, damit der Rest dem Abschlussspiel (Funino) zugutekommt.
  const blocks = PHASES.map((p) => Math.max(5, Math.floor((total * p.share) / 5) * 5));
  const diff = total - blocks.reduce((s, m) => s + m, 0);
  blocks[blocks.length - 1] += diff;
  return blocks;
}

export function suitableExercises(exercises, { age, level, players }) {
  return exercises.filter(
    (ex) =>
      ex.ages.includes(age) &&
      (!ex.levels || ex.levels.includes(level)) &&
      (!players || ex.players.min <= players),
  );
}

function variationFor(level) {
  return level <= 1 ? 'easier' : level >= 3 ? 'harder' : 'base';
}

function pick(candidates, theme, used, rng) {
  const fresh = candidates.filter((ex) => !used.has(ex.id));
  const pool = fresh.length ? fresh : candidates;
  if (!pool.length) return null;
  const weights = pool.map((ex) => (ex.themes.includes(theme) ? 4 : 1));
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Erstellt einen Wochenplan.
 * @param {object[]} exercises Übungsdatenbank (data/exercises.json)
 * @param {object} opts
 * @param {'G'|'F'|'E'} opts.age Altersklasse
 * @param {1|2|3} opts.level Niveau der Mannschaft
 * @param {number} opts.sessions Trainingseinheiten pro Woche
 * @param {number} opts.minutes Dauer einer Einheit
 * @param {string} [opts.theme] Schwerpunkt oder 'auto' (Rotation nach Kalenderwoche)
 * @param {number} opts.week Kalenderwoche
 * @param {number} [opts.players] Anzahl Kinder
 * @param {number} [opts.variant] Zum Neu-Mischen
 * @param {boolean} [opts.rituals=true] Begrüßungs- und Abschlusskreis einplanen; ohne sie bekommen die Phasen die Zeit
 * @param {object} [rituals] Rituale (data/rituals.json) für Ankommen, Begrüßungs- und Abschlusskreis
 */
export function generatePlan(exercises, opts, rituals = null) {
  const { age, level, sessions, minutes, week, players, variant = 0 } = opts;
  const withRituals = opts.rituals !== false;
  const group = AGE_GROUPS[age];
  if (!group) throw new Error(`Unbekannte Altersklasse: ${age}`);
  const theme = !opts.theme || opts.theme === 'auto' ? themeForWeek(age, week) : opts.theme;
  const rng = createRng(hashSeed(age, level, sessions, minutes, theme, week, players ?? '', variant));
  const candidates = suitableExercises(exercises, { age, level, players });
  const phaseMinutes = splitMinutes(withRituals ? minutes - RITUAL_MINUTES.opening - RITUAL_MINUTES.closing : minutes);
  const used = new Set();
  const usedRituals = new Set();
  const ritual = (kind) => {
    const pool = (rituals?.[kind] ?? []).filter((r) => r.ages.includes(age));
    const fresh = pool.filter((r) => !usedRituals.has(r.id));
    const list = fresh.length ? fresh : pool;
    if (!list.length) return null;
    const item = list[Math.floor(rng() * list.length)];
    usedRituals.add(item.id);
    return item;
  };

  const plan = [];
  for (let s = 0; s < sessions; s++) {
    // Progression innerhalb der Woche: ab der 2. Einheit eine Stufe schwerer (Stellschrauben drehen).
    const sessionLevel = Math.min(3, level + (s > 0 ? 1 : 0));
    const blocks = PHASES.map((phase, i) => {
      const exercise = pick(
        candidates.filter((ex) => ex.phase === phase.id),
        theme,
        used,
        rng,
      );
      if (exercise) used.add(exercise.id);
      return { phase: phase.id, label: phase.label, minutes: phaseMinutes[i], exercise, variation: variationFor(sessionLevel) };
    });
    // Rituale immer auswürfeln, damit die Übungsauswahl mit und ohne Rituale gleich bleibt.
    const opening = { minutes: RITUAL_MINUTES.opening, arrival: ritual('arrival'), circle: ritual('opening') };
    const closing = { minutes: RITUAL_MINUTES.closing, circle: ritual('closing') };
    plan.push({
      number: s + 1,
      level: sessionLevel,
      opening: withRituals ? opening : null,
      blocks,
      closing: withRituals ? closing : null,
    });
  }

  const fields = players ? Math.max(1, Math.ceil(players / group.playersPerField)) : 1;
  return {
    age,
    level,
    week,
    theme,
    minutes,
    players: players ?? null,
    rituals: withRituals,
    fields,
    miniGoals: fields * 4,
    sessions: plan,
  };
}

// Ablauf einer Einheit als Liste von Schritten mit Minuten, z. B. für den Trainingsmodus mit Timer.
// kind ist 'opening', 'closing' oder die Phasen-ID; Ankommen läuft vor Beginn und hat keinen eigenen Schritt.
export function sessionSteps(session) {
  const steps = [];
  if (session.opening) steps.push({ kind: 'opening', minutes: session.opening.minutes, ritual: session.opening.circle });
  for (const b of session.blocks) steps.push({ kind: b.phase, minutes: b.minutes, block: b });
  if (session.closing) steps.push({ kind: 'closing', minutes: session.closing.minutes, ritual: session.closing.circle });
  return steps;
}
