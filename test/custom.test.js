import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ritualMinutes } from '../js/config.js';
import { MAX_ITEMS, buildSession, decodeCustom, defaultMinutes, emptyCustom, encodeCustom, fixRituals, totalMinutes } from '../js/custom.js';
import { sessionSteps } from '../js/generator.js';

const exercises = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url)));
const rituals = JSON.parse(readFileSync(new URL('../data/rituals.json', import.meta.url)));

const sample = () => {
  const forF = exercises.filter((ex) => ex.ages.includes('F'));
  return fixRituals(
    {
      ...emptyCustom('F'),
      level: 3,
      title: 'Dienstag & Co, F1',
      items: forF.slice(0, 3).map((ex, i) => ({ id: ex.id, minutes: 10 + i * 5 })),
    },
    rituals,
  );
};

test('a custom plan survives the round trip through the link', () => {
  const state = sample();
  const text = encodeCustom(state);
  assert.match(text, /&x=[a-z0-9.,-]+$/);
  assert.deepEqual(decodeCustom(text, exercises, rituals), state);
  const off = { ...state, rituals: false };
  assert.deepEqual(decodeCustom(encodeCustom(off), exercises, rituals), off);
});

test('decoding drops unknown exercises and clamps values', () => {
  const s = decodeCustom('age=Z&lvl=9&r=1&ro=gibt-es-nicht&x=gibt-es-nicht.10,aw-ampel.500,aw-ampel.abc', exercises, rituals);
  assert.equal(s.age, 'F');
  assert.equal(s.level, 2);
  assert.deepEqual(s.items, [{ id: 'aw-ampel', minutes: 90 }, { id: 'aw-ampel', minutes: 1 }]);
  assert.ok(rituals.opening.some((r) => r.id === s.opening && r.ages.includes('F')));
  const many = Array.from({ length: 30 }, () => 'aw-ampel.5').join(',');
  assert.equal(decodeCustom(`x=${many}`, exercises).items.length, MAX_ITEMS);
});

test('rituals are replaced when they do not fit the age group', () => {
  const kids = sample();
  const youth = fixRituals({ ...kids, age: 'A' }, rituals);
  for (const kind of ['arrival', 'opening', 'closing']) {
    assert.ok(rituals[kind].find((r) => r.id === youth[kind]).ages.includes('A'), kind);
  }
});

test('custom session works with the training mode and adds up', () => {
  const state = sample();
  const session = buildSession(state, exercises, rituals);
  const rm = ritualMinutes('F');
  assert.equal(session.blocks.length, 3);
  assert.ok(session.blocks.every((b) => b.variation === 'harder'));
  assert.equal(session.opening.circle.id, state.opening);
  assert.equal(session.closing.circle.id, state.closing);
  const steps = sessionSteps(session);
  assert.equal(steps.length, 5);
  const { total, rituals: r } = totalMinutes(state);
  assert.equal(r, rm.opening + rm.closing);
  assert.equal(steps.reduce((s, st) => s + st.minutes, 0), total);
  const plain = buildSession({ ...state, rituals: false }, exercises, rituals);
  assert.equal(plain.opening, null);
  assert.equal(sessionSteps(plain).length, 3);
});

test('suggested minutes follow the phase shares', () => {
  for (const age of ['G', 'F', 'E', 'D', 'A']) {
    for (const phase of ['aufwaermen', 'spielform', 'uebung', 'abschluss']) {
      const m = defaultMinutes(age, phase);
      assert.ok(m >= 5 && m <= 40, `${age}/${phase}: ${m}`);
    }
  }
});
