import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGE_GROUPS, LEVELS, PHASES, THEMES, SESSION_LENGTHS, RITUAL_MINUTES } from '../js/config.js';
import { generatePlan, sessionSteps, splitMinutes, suitableExercises, themeForWeek, isoWeek } from '../js/generator.js';

const exercises = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url)));
const rituals = JSON.parse(readFileSync(new URL('../data/rituals.json', import.meta.url)));

test('exercise data is well-formed', () => {
  const ids = new Set();
  for (const ex of exercises) {
    assert.ok(!ids.has(ex.id), `duplicate id ${ex.id}`);
    ids.add(ex.id);
    assert.match(ex.id, /^[a-z0-9-]+$/, ex.id);
    assert.ok(PHASES.some((p) => p.id === ex.phase), `${ex.id}: unknown phase`);
    for (const a of ex.ages) assert.ok(AGE_GROUPS[a], `${ex.id}: unknown age ${a}`);
    for (const t of ex.themes) assert.ok(THEMES[t], `${ex.id}: unknown theme ${t}`);
    for (const l of ex.levels ?? []) assert.ok(LEVELS[l], `${ex.id}: unknown level ${l}`);
    for (const key of ['name', 'setup', 'field', 'material', 'easier', 'harder']) assert.ok(ex[key], `${ex.id}: missing ${key}`);
    assert.ok(ex.rules.length > 0 && ex.questions.length > 0, `${ex.id}: rules/questions`);
  }
});

test('every age, level and phase has at least two exercises', () => {
  for (const age of Object.keys(AGE_GROUPS)) {
    for (const level of [1, 2, 3]) {
      const pool = suitableExercises(exercises, { age, level, players: 8 });
      for (const p of PHASES) {
        const n = pool.filter((ex) => ex.phase === p.id).length;
        assert.ok(n >= 2, `${age}/${level}/${p.id}: only ${n}`);
      }
    }
  }
});

test('minutes add up for every session length, including rituals', () => {
  for (const m of SESSION_LENGTHS) {
    const plan = generatePlan(exercises, { age: 'F', level: 2, sessions: 1, minutes: m, week: 1 }, rituals);
    const s = plan.sessions[0];
    const total = s.opening.minutes + s.blocks.reduce((sum, b) => sum + b.minutes, 0) + s.closing.minutes;
    assert.equal(total, m);
    assert.ok(s.blocks.every((b) => b.minutes >= 5));
    assert.equal(splitMinutes(m).reduce((a, x) => a + x, 0), m);
  }
});

test('without rituals the phases get the whole session and the exercises stay the same', () => {
  for (const m of SESSION_LENGTHS) {
    const opts = { age: 'E', level: 2, sessions: 2, minutes: m, week: 7, players: 12 };
    const withR = generatePlan(exercises, opts, rituals);
    const without = generatePlan(exercises, { ...opts, rituals: false }, rituals);
    assert.equal(without.rituals, false);
    for (const [i, s] of without.sessions.entries()) {
      assert.equal(s.opening, null);
      assert.equal(s.closing, null);
      assert.equal(s.blocks.reduce((sum, b) => sum + b.minutes, 0), m);
      assert.deepEqual(s.blocks.map((b) => b.exercise.id), withR.sessions[i].blocks.map((b) => b.exercise.id));
    }
  }
});

test('session steps list rituals and phases in order with their minutes', () => {
  const plan = generatePlan(exercises, { age: 'F', level: 1, sessions: 1, minutes: 60, week: 1 }, rituals);
  const steps = sessionSteps(plan.sessions[0]);
  assert.deepEqual(steps.map((st) => st.kind), ['opening', ...PHASES.map((p) => p.id), 'closing']);
  assert.equal(steps.reduce((sum, st) => sum + st.minutes, 0), 60);
  const bare = generatePlan(exercises, { age: 'F', level: 1, sessions: 1, minutes: 60, week: 1, rituals: false }, rituals);
  assert.deepEqual(sessionSteps(bare.sessions[0]).map((st) => st.kind), PHASES.map((p) => p.id));
});

test('session follows the DFB order Aktivierung – Spielen – Üben – Spielen', () => {
  assert.deepEqual(PHASES.map((p) => p.id), ['aufwaermen', 'spielform', 'uebung', 'abschluss']);
  const plan = generatePlan(exercises, { age: 'E', level: 2, sessions: 1, minutes: 75, week: 2 }, rituals);
  assert.deepEqual(plan.sessions[0].blocks.map((b) => b.phase), PHASES.map((p) => p.id));
});

test('Bambini get no queue drills and no uneven-number games', () => {
  const pool = exercises.filter((ex) => ex.ages.includes('G'));
  for (const id of ['ue-torschuss-schusszone', 'ab-funino-joker']) assert.ok(!pool.some((ex) => ex.id === id), id);
  for (const ex of pool) assert.ok(!/\b(3 gegen 2|4 gegen 3|Joker)\b/.test(ex.easier) || /Ab F-Jugend/.test(ex.easier), `${ex.id}: ${ex.easier}`);
});

test('ritual data is well-formed and covers every age group', () => {
  assert.ok(rituals.principles.length > 0);
  assert.ok(rituals.standard.opening.length > 0 && rituals.standard.closing.length > 0);
  const ids = new Set();
  for (const kind of ['arrival', 'opening', 'closing']) {
    for (const r of rituals[kind]) {
      assert.ok(!ids.has(r.id), `duplicate ritual id ${r.id}`);
      ids.add(r.id);
      assert.ok(r.name && r.steps.length > 0 && r.tip, `${r.id}: missing fields`);
      for (const a of r.ages) assert.ok(AGE_GROUPS[a], `${r.id}: unknown age ${a}`);
    }
    for (const age of Object.keys(AGE_GROUPS)) {
      assert.ok(rituals[kind].filter((r) => r.ages.includes(age)).length >= 2, `${kind}/${age}: fewer than 2 rituals`);
    }
  }
});

test('every session opens and closes with age-appropriate rituals, varied within the week', () => {
  for (const age of Object.keys(AGE_GROUPS)) {
    const plan = generatePlan(exercises, { age, level: 2, sessions: 2, minutes: 60, week: 3 }, rituals);
    for (const s of plan.sessions) {
      assert.equal(s.opening.minutes, RITUAL_MINUTES.opening);
      assert.equal(s.closing.minutes, RITUAL_MINUTES.closing);
      for (const r of [s.opening.arrival, s.opening.circle, s.closing.circle]) assert.ok(r && r.ages.includes(age));
    }
    assert.notEqual(plan.sessions[0].opening.circle.id, plan.sessions[1].opening.circle.id);
  }
});

test('plan respects age group, level and has no repeats within a week', () => {
  for (const age of Object.keys(AGE_GROUPS)) {
    for (const level of [1, 2, 3]) {
      const plan = generatePlan(exercises, { age, level, sessions: 2, minutes: 60, week: 12, players: 10 });
      const ids = plan.sessions.flatMap((s) => s.blocks.map((b) => b.exercise.id));
      assert.equal(new Set(ids).size, ids.length, `${age}/${level}: repeated exercise`);
      for (const s of plan.sessions) {
        assert.equal(s.blocks.length, PHASES.length);
        for (const b of s.blocks) assert.ok(b.exercise.ages.includes(age));
        assert.equal(s.blocks.at(-1).exercise.phase, 'abschluss');
      }
    }
  }
});

test('plan is deterministic and variant reshuffles', () => {
  const opts = { age: 'F', level: 2, sessions: 2, minutes: 75, week: 30, players: 12 };
  const ids = (p) => p.sessions.flatMap((s) => s.blocks.map((b) => b.exercise.id)).join(',');
  assert.equal(ids(generatePlan(exercises, opts)), ids(generatePlan(exercises, opts)));
  const variants = new Set([0, 1, 2, 3, 4].map((variant) => ids(generatePlan(exercises, { ...opts, variant }))));
  assert.ok(variants.size > 1);
});

test('second session steps difficulty up', () => {
  const plan = generatePlan(exercises, { age: 'E', level: 1, sessions: 2, minutes: 90, week: 1 });
  assert.equal(plan.sessions[0].blocks[0].variation, 'easier');
  assert.equal(plan.sessions[1].blocks[0].variation, 'base');
});

test('weekly theme rotates and explicit theme wins', () => {
  assert.notEqual(themeForWeek('F', 1), themeForWeek('F', 2));
  assert.equal(generatePlan(exercises, { age: 'F', level: 2, sessions: 1, minutes: 60, week: 5, theme: 'torschuss' }).theme, 'torschuss');
});

test('field count scales with players', () => {
  assert.equal(generatePlan(exercises, { age: 'F', level: 2, sessions: 1, minutes: 60, week: 1, players: 16 }).fields, 2);
  assert.equal(generatePlan(exercises, { age: 'F', level: 2, sessions: 1, minutes: 60, week: 1, players: 17 }).miniGoals, 12);
});

test('isoWeek', () => {
  assert.equal(isoWeek(new Date(2026, 0, 1)), 1);
  assert.equal(isoWeek(new Date(2026, 9, 10)), 41);
});

test('English translations cover all strings, config and data', async () => {
  const { STRING_KEYS, CONFIG_EN } = await import('../js/i18n.js');
  assert.deepEqual([...STRING_KEYS.en].sort(), [...STRING_KEYS.de].sort());
  for (const id of Object.keys(AGE_GROUPS)) assert.ok(CONFIG_EN.ages[id]?.label, `age ${id}`);
  for (const id of Object.keys(LEVELS)) assert.ok(CONFIG_EN.levels[id]?.label, `level ${id}`);
  for (const id of Object.keys(THEMES)) assert.ok(CONFIG_EN.themes[id], `theme ${id}`);
  for (const p of PHASES) assert.ok(CONFIG_EN.phases[p.id], `phase ${p.id}`);

  const exEn = JSON.parse(readFileSync(new URL('../data/exercises.en.json', import.meta.url)));
  for (const ex of exercises) {
    const en = exEn[ex.id];
    assert.ok(en, `missing English exercise ${ex.id}`);
    for (const key of ['name', 'field', 'material', 'setup', 'easier', 'harder']) assert.ok(en[key], `${ex.id}: English ${key}`);
    assert.equal(en.rules.length, ex.rules.length, `${ex.id}: rules`);
    assert.equal(en.questions.length, ex.questions.length, `${ex.id}: questions`);
  }
  const ritEn = JSON.parse(readFileSync(new URL('../data/rituals.en.json', import.meta.url)));
  assert.equal(ritEn.principles.length, rituals.principles.length);
  for (const kind of ['arrival', 'opening', 'closing']) {
    for (const r of rituals[kind]) {
      const en = ritEn[kind][r.id];
      assert.ok(en?.name && en.tip, `missing English ritual ${r.id}`);
      assert.equal(en.steps.length, r.steps.length, `${r.id}: steps`);
    }
  }
});
