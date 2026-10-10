import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGE_GROUPS, LEVELS, PHASES, THEMES, SESSION_LENGTHS } from '../js/config.js';
import { generatePlan, splitMinutes, suitableExercises, themeForWeek, isoWeek } from '../js/generator.js';

const exercises = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url)));

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

test('minutes add up for every session length', () => {
  for (const m of SESSION_LENGTHS) {
    const parts = splitMinutes(m);
    assert.equal(parts.reduce((s, x) => s + x, 0), m);
    assert.ok(parts.every((x) => x >= 5));
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
