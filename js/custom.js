// Eigener Plan: eine Einheit von Hand aus den vorhandenen Übungen zusammenstellen.
// Reine Funktionen ohne DOM; der ganze Plan steckt kodiert im Link (Hash #custom?...).

import { AGE_GROUPS, LEVELS, PHASES, ritualMinutes } from './config.js';
import { splitMinutes, variationFor } from './generator.js';

export const MAX_ITEMS = 20;
export const MAX_MINUTES = 90;
export const MAX_TITLE = 60;
const RITUAL_KINDS = ['arrival', 'opening', 'closing'];
const RITUAL_PARAMS = { arrival: 'ra', opening: 'ro', closing: 'rc' };

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function emptyCustom(age = 'F') {
  return { age: AGE_GROUPS[age] ? age : 'F', level: 2, title: '', rituals: true, arrival: null, opening: null, closing: null, items: [] };
}

// Vorschlag für die Dauer einer Übung: der Anteil ihrer Phase an einer Standard-Einheit der Altersklasse.
export function defaultMinutes(age, phase) {
  const group = AGE_GROUPS[age] ?? AGE_GROUPS.F;
  const rm = ritualMinutes(age);
  const split = splitMinutes(group.defaultMinutes - rm.opening - rm.closing, group.phaseShares, group.stage === 'youth');
  const i = PHASES.findIndex((p) => p.id === phase);
  return i < 0 ? 15 : split[i];
}

export function ritualsFor(rituals, kind, age) {
  return (rituals?.[kind] ?? []).filter((r) => r.ages.includes(age));
}

// Fehlt ein Ritual oder passt es nicht zur Altersklasse, wird das erste passende genommen.
export function fixRituals(state, rituals) {
  const next = { ...state };
  for (const kind of RITUAL_KINDS) {
    const pool = ritualsFor(rituals, kind, state.age);
    if (!pool.some((r) => r.id === next[kind])) next[kind] = pool[0]?.id ?? null;
  }
  return next;
}

/** Plan -> Text für den Hash, z. B. "age=F&lvl=2&r=1&ro=...&x=aw-ampel.10,sf-wellen.15". */
export function encodeCustom(state) {
  const q = new URLSearchParams({ age: state.age, lvl: state.level });
  if (state.title) q.set('t', state.title.slice(0, MAX_TITLE));
  q.set('r', state.rituals ? '1' : '0');
  for (const kind of RITUAL_KINDS) if (state[kind]) q.set(RITUAL_PARAMS[kind], state[kind]);
  // Übungs-IDs bestehen nur aus a-z, 0-9 und "-", deshalb lesbar ohne Escaping.
  const items = state.items.map((it) => `${it.id}.${it.minutes}`).join(',');
  return items ? `${q}&x=${items}` : q.toString();
}

/** Text aus dem Hash -> Plan. Unbekannte Übungen und Rituale fallen weg, Werte werden begrenzt. */
export function decodeCustom(text, exercises, rituals = null) {
  const q = new URLSearchParams(text);
  const state = emptyCustom(q.get('age'));
  state.level = LEVELS[q.get('lvl')] ? Number(q.get('lvl')) : 2;
  state.title = (q.get('t') ?? '').slice(0, MAX_TITLE);
  state.rituals = q.get('r') !== '0';
  for (const kind of RITUAL_KINDS) {
    const id = q.get(RITUAL_PARAMS[kind]);
    state[kind] = rituals ? (rituals[kind]?.some((r) => r.id === id) ? id : null) : id;
  }
  const known = new Set(exercises.map((ex) => ex.id));
  state.items = (q.get('x') ?? '')
    .split(',')
    .map((part) => {
      const [id, min] = part.split('.');
      return { id, minutes: clamp(Math.round(Number(min)) || 0, 1, MAX_MINUTES) };
    })
    .filter((it) => known.has(it.id))
    .slice(0, MAX_ITEMS);
  return rituals ? fixRituals(state, rituals) : state;
}

export function totalMinutes(state) {
  const rm = ritualMinutes(state.age);
  const rit = state.rituals ? rm.opening + rm.closing : 0;
  return { total: rit + state.items.reduce((s, it) => s + it.minutes, 0), rituals: rit };
}

// Eine Einheit im selben Format wie generatePlan, damit Darstellung und Trainingsmodus sie wiederverwenden.
export function buildSession(state, exercises, rituals = null) {
  const byId = new Map(exercises.map((ex) => [ex.id, ex]));
  const find = (kind) => (rituals?.[kind] ?? []).find((r) => r.id === state[kind]) ?? null;
  const rm = ritualMinutes(state.age);
  const variation = variationFor(state.level);
  const withRituals = state.rituals && rituals;
  return {
    number: 1,
    level: state.level,
    opening: withRituals ? { minutes: rm.opening, arrival: find('arrival'), circle: find('opening') } : null,
    blocks: state.items
      .map((it) => ({ it, exercise: byId.get(it.id) }))
      .filter(({ exercise }) => exercise)
      .map(({ it, exercise }) => ({ phase: exercise.phase, minutes: it.minutes, exercise, variation })),
    closing: withRituals ? { minutes: rm.closing, circle: find('closing') } : null,
  };
}
