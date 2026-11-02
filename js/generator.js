// Wochenplan-Generator. Reine Funktionen ohne DOM, damit sie im Browser und in Node-Tests laufen.

import { AGE_GROUPS, PHASES, NET_PLAY_SHARE, BLOCK_WEEKS, DEFAULT_DAYS, DAYS_BEFORE_MATCH, MAX_SESSIONS, ritualMinutes } from './config.js';

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

// Drei-Wochen-Block der Kalenderwoche: index zählt die Blöcke, week ist 1 bis 3 innerhalb des Blocks.
export function blockOf(week) {
  const w = Math.max(1, week) - 1;
  return { index: Math.floor(w / BLOCK_WEEKS), week: (w % BLOCK_WEEKS) + 1, weeks: BLOCK_WEEKS };
}

// Ein Schwerpunkt pro Drei-Wochen-Block, rotierend durch die Themen der Altersklasse.
export function themeForWeek(ageId, week) {
  const themes = AGE_GROUPS[ageId].themes;
  const i = blockOf(week).index;
  return themes[((i % themes.length) + themes.length) % themes.length];
}

export const maxSessions = (age) => AGE_GROUPS[age]?.maxSessions ?? 3;

// Trainingstage der Woche: die gewählten Tage, wenn sie zur Zahl der Einheiten passen, sonst Standardtage
// (mit Spieltag so verteilt, dass die letzte Einheit möglichst kurz vor dem Spiel liegt).
export function trainingDays(sessions, days = null, match = null) {
  const n = Math.min(MAX_SESSIONS, Math.max(1, sessions));
  const valid = Array.isArray(days) && days.length === n && new Set(days).size === n && days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7 && d !== match);
  if (valid) return [...days].sort((a, b) => a - b);
  if (!match) return DEFAULT_DAYS[n];
  return DAYS_BEFORE_MATCH[n].map((before) => ((match - before - 1 + 7) % 7) + 1).sort((a, b) => a - b);
}

// Belastung einer Einheit im Verhältnis zum Spieltag: Tag nach dem Spiel locker, Tag davor kurz und knackig.
export function matchLoad(day, match) {
  if (!match || !day || day === match) return { load: 'normal', before: null, after: null };
  const before = (match - day + 7) % 7;
  const after = (day - match + 7) % 7;
  const load = after === 1 ? 'recovery' : before === 1 ? 'sharp' : 'normal';
  return { load, before, after };
}

// Verteilt die Trainingszeit auf die Phasen (Spielen – Üben – Spielen), gerundet auf 5 Minuten.
// shares: Anteile je Phase, z. B. für die Jugend 15/30/15/30 nach der DFB-Trainingsphilosophie.
export function splitMinutes(total, shares = PHASES.map((p) => p.share), nearest = false) {
  // Kinder: auf 5 Minuten abrunden, der Rest geht an den letzten Spielblock.
  // Jugend (nearest): auf ganze Minuten runden, damit beide Spielblöcke gleich lang bleiben
  // (90 min mit Team- und Nachbesprechung: 14/28/14/28).
  const step = nearest ? 1 : 5;
  const snap = nearest ? Math.round : Math.floor;
  const blocks = shares.map((share) => Math.max(5, snap((total * share) / step) * step));
  const diff = total - blocks.reduce((s, m) => s + m, 0);
  blocks[blocks.length - 1] += diff;
  return blocks;
}

export function suitableExercises(exercises, { age, level, players, keepers }) {
  return exercises.filter(
    (ex) =>
      ex.ages.includes(age) &&
      (!ex.levels || ex.levels.includes(level)) &&
      (!players || ex.players.min <= players) &&
      (keepers == null || (ex.goalkeepers ?? 0) <= keepers),
  );
}

// Netto-Spielzeit pro Spieler in den beiden Spielblöcken einer Woche (DFB: Durchgänge mit Pausen).
export function netPlayMinutes(sessions) {
  const play = sessions.flatMap((s) => s.blocks).filter((b) => b.phase === 'spielform' || b.phase === 'abschluss');
  return Math.round(play.reduce((sum, b) => sum + b.minutes, 0) * NET_PLAY_SHARE);
}

export function variationFor(level) {
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
 * @param {number} opts.sessions Trainingseinheiten pro Woche (begrenzt auf die Höchstzahl der Altersklasse)
 * @param {number[]} [opts.days] Trainingstage (1 = Montag … 7 = Sonntag); passen sie nicht zu sessions, gelten Standardtage
 * @param {number} [opts.match] Spieltag (1–7), nur Jugend: steuert die Belastung der Einheiten
 * @param {number} opts.minutes Dauer einer Einheit
 * @param {string} [opts.theme] Schwerpunkt oder 'auto' (Rotation nach Kalenderwoche)
 * @param {number} opts.week Kalenderwoche
 * @param {number} [opts.players] Anzahl Kinder
 * @param {number} [opts.keepers] Anzahl Torhüter; Spielformen, die mehr brauchen, entfallen (nur wenn Ersatz da ist)
 * @param {number} [opts.variant] Zum Neu-Mischen
 * @param {boolean} [opts.rituals=true] Begrüßungs- und Abschlusskreis einplanen; ohne sie bekommen die Phasen die Zeit
 * @param {object} [rituals] Rituale (data/rituals.json) für Ankommen, Begrüßungs- und Abschlusskreis
 */
export function generatePlan(exercises, opts, rituals = null) {
  const { age, level, minutes, week, players, keepers, variant = 0 } = opts;
  const withRituals = opts.rituals !== false;
  const group = AGE_GROUPS[age];
  if (!group) throw new Error(`Unbekannte Altersklasse: ${age}`);
  // Präventions-Aufwärmen: in der Jugend standardmäßig an, ersetzt die Übung der Aktivierung.
  const prevention = opts.prevention !== false && group.prevention ? group.prevention : null;
  const youth = group.stage === 'youth';
  const sessions = Math.min(maxSessions(age), Math.max(1, opts.sessions || 1));
  // Spieltag nur in der Jugend: dort steuert er die Belastung der Einheiten.
  const match = youth && opts.match >= 1 && opts.match <= 7 ? opts.match : null;
  const days = trainingDays(sessions, opts.days, match);
  const block = blockOf(week);
  const theme = !opts.theme || opts.theme === 'auto' ? themeForWeek(age, week) : opts.theme;
  const rng = createRng(hashSeed(age, level, sessions, minutes, theme, week, players ?? '', variant));
  const all = suitableExercises(exercises, { age, level, players });
  // Torhüter-Übungen laufen als eigene Station parallel zum Zwischenblock, nicht als Übung für alle.
  const candidates = all.filter((ex) => ex.role !== 'keeper');
  const keeperPool = youth && keepers > 0 ? all.filter((ex) => ex.role === 'keeper') : [];
  // Torhüter-Filter nur anwenden, wenn für die Phase dann noch etwas übrig bleibt.
  const keeperOk = (ex) => keepers == null || (ex.goalkeepers ?? 0) <= keepers;
  const phasePool = (phaseId) => {
    const all = candidates.filter((ex) => ex.phase === phaseId);
    const fit = all.filter(keeperOk);
    return fit.length ? fit : all;
  };
  const rm = ritualMinutes(age);
  const phaseMinutes = splitMinutes(withRituals ? minutes - rm.opening - rm.closing : minutes, group.phaseShares, group.stage === 'youth');
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

  // Ankerspiel: Spielblock 1 bleibt über den ganzen Drei-Wochen-Block gleich, damit die Spieler die Regeln
  // kennen und sich auf die Lösung konzentrieren. Eigener Zufall, unabhängig von Woche, Dauer und Einheiten.
  const anchor = pick(phasePool('spielform'), theme, new Set(), createRng(hashSeed('anker', age, level, theme, block.index, players ?? '', keepers ?? '', variant)));
  if (anchor) used.add(anchor.id);
  const usedKeeper = new Set();
  // Erste Einheit nach dem Spiel (für den Bezug zum letzten Spiel in der Teambesprechung).
  const loads = days.map((d) => matchLoad(d, match));
  const firstAfter = match ? loads.reduce((best, l, i) => (best < 0 || l.after < loads[best].after ? i : best), -1) : -1;

  const plan = [];
  for (let s = 0; s < sessions; s++) {
    // Progression über den Block: Woche 1 auf dem Niveau, Woche 2 ab der 2. Einheit eine Stufe schwerer,
    // Woche 3 durchgehend eine Stufe schwerer. Am Tag vor und nach dem Spiel wird nicht gesteigert.
    const { load, before, after } = loads[s];
    const blockBase = Math.min(3, level + (block.week === 3 ? 1 : 0));
    let sessionLevel = Math.min(3, blockBase + (block.week === 2 && s > 0 ? 1 : 0));
    if (load === 'sharp') sessionLevel = blockBase;
    if (load === 'recovery') sessionLevel = Math.max(1, blockBase - 1);
    const keeper = keeperPool.length ? pick(keeperPool.filter((ex) => !ex.levels || ex.levels.includes(sessionLevel)), theme, usedKeeper, rng) : null;
    if (keeper) usedKeeper.add(keeper.id);
    const blocks = PHASES.map((phase, i) => {
      const isAnchor = phase.id === 'spielform' && anchor;
      const exercise = isAnchor ? anchor : pick(phasePool(phase.id), theme, used, rng);
      if (exercise && !isAnchor) used.add(exercise.id);
      const block = { phase: phase.id, label: phase.label, minutes: phaseMinutes[i], exercise, variation: variationFor(sessionLevel) };
      if (isAnchor) block.anchor = true;
      if (prevention && phase.id === 'aufwaermen') Object.assign(block, { prevention, preventionLevel: sessionLevel });
      if (keeper && phase.id === 'uebung') block.keeper = keeper;
      return block;
    });
    // Rituale immer auswürfeln, damit die Übungsauswahl mit und ohne Rituale gleich bleibt.
    const opening = { minutes: rm.opening, arrival: ritual('arrival'), circle: ritual('opening') };
    const closing = { minutes: rm.closing, circle: ritual('closing') };
    plan.push({
      number: s + 1,
      day: days[s],
      load,
      daysBefore: before,
      daysAfter: after,
      afterMatch: s === firstAfter,
      level: sessionLevel,
      opening: withRituals ? opening : null,
      blocks,
      closing: withRituals ? closing : null,
    });
  }

  const fields = players ? Math.max(1, Math.ceil(players / group.playersPerField)) : 1;
  return {
    age,
    stage: group.stage ?? 'kids',
    level,
    week,
    theme,
    block,
    match,
    days,
    minutes,
    weeklyMinutes: sessions * minutes,
    maxSessions: maxSessions(age),
    players: players ?? null,
    keepers: keepers ?? null,
    netPlay: netPlayMinutes(plan),
    minNetPlay: group.minNetPlay ?? null,
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

// Aufgaben für zu Hause und freies Spielen zum Schwerpunkt (data/home.json): bis zu zwei passende Challenges
// plus ein Vorschlag für freies Spielen. Wechselt jede Woche, bleibt für dieselbe Woche gleich.
export function homeChallenges(home, { stage = 'kids', theme, week = 1, count = 2 }) {
  if (!home) return [];
  const fits = (c) => !c.stages || c.stages.includes(stage);
  const pool = (home.challenges ?? []).filter(fits);
  const themed = pool.filter((c) => c.themes?.includes(theme));
  const general = pool.filter((c) => !c.themes?.includes(theme));
  const rng = createRng(hashSeed('home', stage, theme, week));
  const take = (list, n) => {
    const rest = [...list];
    const out = [];
    while (rest.length && out.length < n) out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
    return out;
  };
  const picked = take(themed, count);
  if (picked.length < count) picked.push(...take(general, count - picked.length));
  const free = (home.freePlay ?? []).filter(fits);
  return free.length ? [...picked, take(free, 1)[0]] : picked;
}
