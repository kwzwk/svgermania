import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AGE_GROUPS, LEVELS, PHASES, THEMES, SESSION_LENGTHS, RITUAL_MINUTES, ritualMinutes } from '../js/config.js';
import { generatePlan, sessionSteps, splitMinutes, suitableExercises, themeForWeek, isoWeek, blockOf, trainingDays, matchLoad, maxSessions, homeChallenges } from '../js/generator.js';

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
      assert.equal(s.opening.minutes, ritualMinutes(age).opening);
      assert.equal(s.closing.minutes, ritualMinutes(age).closing);
      for (const r of [s.opening.arrival, s.opening.circle, s.closing.circle]) assert.ok(r && r.ages.includes(age));
    }
    assert.notEqual(plan.sessions[0].opening.circle.id, plan.sessions[1].opening.circle.id);
  }
});

test('plan respects age group, level and repeats only the anchor game within a week', () => {
  for (const age of Object.keys(AGE_GROUPS)) {
    for (const level of [1, 2, 3]) {
      const plan = generatePlan(exercises, { age, level, sessions: 2, minutes: 60, week: 12, players: 10 });
      const ids = plan.sessions.flatMap((s) => s.blocks.filter((b) => !b.anchor).map((b) => b.exercise.id));
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

test('difficulty steps up across the three-week block', () => {
  const levels = (week) => generatePlan(exercises, { age: 'E', level: 1, sessions: 2, minutes: 90, week }).sessions.map((s) => s.level);
  assert.deepEqual(levels(1), [1, 1]); // Woche 1: Niveau der Mannschaft
  assert.deepEqual(levels(2), [1, 2]); // Woche 2: ab der 2. Einheit schwerer
  assert.deepEqual(levels(3), [2, 2]); // Woche 3: durchgehend schwerer
  assert.deepEqual(levels(4), [1, 1]); // neuer Block, neuer Schwerpunkt
  const plan = generatePlan(exercises, { age: 'E', level: 1, sessions: 2, minutes: 90, week: 2 });
  assert.equal(plan.sessions[0].blocks[0].variation, 'easier');
  assert.equal(plan.sessions[1].blocks[0].variation, 'base');
  assert.deepEqual(generatePlan(exercises, { age: 'E', level: 3, sessions: 2, minutes: 90, week: 3 }).sessions.map((s) => s.level), [3, 3]);
});

test('theme holds for a three-week block, then rotates; explicit theme wins', () => {
  assert.deepEqual([1, 2, 3, 4, 6, 7].map((w) => blockOf(w).week), [1, 2, 3, 1, 3, 1]);
  assert.equal(themeForWeek('F', 1), themeForWeek('F', 3));
  assert.notEqual(themeForWeek('F', 3), themeForWeek('F', 4));
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

// ---------- Jugend (D, C) ----------

const youthAges = Object.keys(AGE_GROUPS).filter((a) => AGE_GROUPS[a].stage === 'youth');

test('youth age groups exist with DFB session shares', () => {
  assert.deepEqual(youthAges, ['D', 'C', 'B', 'A']);
  for (const a of youthAges) {
    assert.deepEqual(splitMinutes(90, AGE_GROUPS[a].phaseShares, true), [15, 30, 15, 30]);
    // DFB: 48 min netto bis U16, ab U17 32 min.
    assert.equal(AGE_GROUPS[a].minNetPlay, a === 'A' ? 32 : 48);
  }
});

test('youth plans reach the DFB minimum net play with two 90 min sessions', () => {
  for (const age of youthAges) {
    for (const level of [1, 2, 3]) {
      const plan = generatePlan(exercises, { age, level, sessions: 2, minutes: 90, players: 16, keepers: 1, theme: 'auto', week: 10 }, rituals);
      assert.equal(plan.stage, 'youth');
      assert.ok(plan.netPlay >= plan.minNetPlay, `${age}/${level}: ${plan.netPlay} < ${plan.minNetPlay}`);
      const [a, s1, z, s2] = plan.sessions[0].blocks.filter((b) => b.exercise || b.phase).filter((b) => !b.ritual).map((b) => b.minutes);
      assert.ok(s1 >= 25 && s2 >= 25 && a <= 15 && z <= 15, `${age}: ${[a, s1, z, s2]}`);
    }
  }
});

test('keeper filter: no exercise needs more keepers than available', () => {
  for (const age of youthAges) {
    const pool = suitableExercises(exercises, { age, level: 2, players: 16, keepers: 0 });
    assert.ok(pool.every((ex) => (ex.goalkeepers ?? 0) === 0));
    for (const phase of PHASES) assert.ok(pool.some((ex) => ex.phase === phase.id), `${age}: no ${phase.id} without keepers`);
  }
});

test('youth exercise fields are valid', () => {
  for (const ex of exercises) {
    if (ex.family) assert.ok(['gleichzahl', 'anspieler', 'linie', 'ueberzahl'].includes(ex.family), `${ex.id}: family`);
    if (ex.goalkeepers != null) assert.ok(Number.isInteger(ex.goalkeepers) && ex.goalkeepers >= 0 && ex.goalkeepers <= 2, `${ex.id}: goalkeepers`);
    if (ex.blocks) for (const k of ['count', 'minutes', 'rest']) assert.ok(ex.blocks[k] > 0, `${ex.id}: blocks.${k}`);
    if (ex.format) {
      // DFB: im Training nie größer als 4+TW gegen 4+TW.
      for (const n of ex.format.match(/\d+(?=\s*\+?\s*(TW)?\s*(gegen|v))/g) ?? []) assert.ok(Number(n) <= 4, `${ex.id}: ${ex.format}`);
    }
  }
});

test('youth sessions use short team talks and keep both game blocks equal', () => {
  assert.equal(ritualMinutes('F'), RITUAL_MINUTES);
  for (const age of youthAges) {
    const plan = generatePlan(exercises, { age, level: 2, sessions: 1, minutes: 90, week: 5 }, rituals);
    const s = plan.sessions[0];
    assert.equal(s.opening.minutes, 3);
    assert.equal(s.closing.minutes, 3);
    assert.deepEqual(s.blocks.map((b) => b.minutes), [14, 28, 14, 28]);
  }
  // Kindliche Rituale enden mit der D-Jugend, ab C gibt es eigene.
  for (const kind of ['arrival', 'opening', 'closing']) {
    for (const r of rituals[kind]) {
      if (r.ages.includes('G')) assert.ok(!r.ages.includes('C'), `${r.id}: kids ritual reaches C youth`);
    }
  }
  assert.ok(rituals.principlesYouth.length > 0 && rituals.standardYouth.opening.length > 0);
});

test('youth activation uses the prevention warm-up unless switched off', () => {
  const prev = JSON.parse(readFileSync(new URL('../data/prevention.json', import.meta.url)));
  const ids = new Set(prev.programs.map((p) => p.id));
  for (const p of prev.programs) {
    assert.ok(p.name.de && p.name.en && p.note.de && p.note.en, `${p.id}: texts`);
    for (const part of p.parts) {
      for (const x of part.exercises) {
        assert.ok(x.name.de && x.name.en && x.how.de && x.how.en, `${p.id}: exercise texts`);
        if (x.levels) assert.equal(x.levels.length, 3, `${p.id}/${x.name.de}: three levels`);
      }
    }
  }
  for (const age of Object.keys(AGE_GROUPS)) {
    const group = AGE_GROUPS[age];
    const opts = { age, level: 2, sessions: 2, minutes: group.defaultMinutes, week: 7 };
    const on = generatePlan(exercises, opts, rituals);
    const off = generatePlan(exercises, { ...opts, prevention: false }, rituals);
    for (const s of on.sessions) {
      const warm = s.blocks.find((b) => b.phase === 'aufwaermen');
      if (group.stage === 'youth') {
        assert.ok(ids.has(warm.prevention), `${age}: prevention program`);
        assert.equal(warm.preventionLevel, s.level);
      } else {
        assert.equal(warm.prevention, undefined, `${age}: no prevention for kids`);
      }
    }
    assert.ok(off.sessions.every((s) => s.blocks.every((b) => !b.prevention)));
    // Der Schalter ändert die Übungsauswahl nicht.
    assert.deepEqual(on.sessions.map((s) => s.blocks.map((b) => b.exercise?.id)), off.sessions.map((s) => s.blocks.map((b) => b.exercise?.id)));
  }
  assert.equal(AGE_GROUPS.D.prevention, '11plus-kids');
  assert.equal(AGE_GROUPS.A.prevention, '11plus');
});

test('every exercise has a GIF scene and rendered GIFs in both languages', () => {
  for (const ex of exercises) {
    for (const file of [`tools/exercise-gifs/scenes/${ex.id}.json`, `img/exercises/${ex.id}.gif`, `img/exercises/${ex.id}.en.gif`]) {
      assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${ex.id}: ${file}`);
    }
  }
});

test('youth catalog covers every theme of each youth age group', () => {
  for (const [age, group] of Object.entries(AGE_GROUPS)) {
    if (group.stage !== 'youth') continue;
    for (const phase of PHASES) assert.ok(exercises.some((e) => e.phase === phase.id && e.ages.includes(age)), `${age}: ${phase.id}`);
    for (const theme of group.themes) assert.ok(exercises.filter((e) => e.ages.includes(age) && e.themes.includes(theme)).length >= 2, `${age}: ${theme}`);
  }
});

// ---------- Ankerspiel, Trainingstage, Spieltag, Umfang, Torhüter ----------

test('anchor game stays the same across all sessions and weeks of a block', () => {
  for (const age of Object.keys(AGE_GROUPS)) {
    const opts = { age, level: 2, sessions: maxSessions(age), minutes: AGE_GROUPS[age].defaultMinutes, players: 14, keepers: 1 };
    const anchors = [10, 11, 12].flatMap((week) => generatePlan(exercises, { ...opts, week }).sessions.map((s) => s.blocks.find((b) => b.phase === 'spielform')));
    assert.ok(anchors.every((b) => b.anchor && b.exercise), `${age}: anchor flag`);
    assert.equal(new Set(anchors.map((b) => b.exercise.id)).size, 1, `${age}: anchor changes within the block`);
    // Andere Dauer oder Einheitenzahl ändert das Ankerspiel nicht.
    const other = generatePlan(exercises, { ...opts, week: 11, sessions: 1, minutes: 60 }).sessions[0].blocks[1].exercise.id;
    assert.equal(other, anchors[0].exercise.id, `${age}: anchor depends on minutes or sessions`);
  }
  const ids = new Set([1, 4, 7, 10, 13, 16].map((week) => generatePlan(exercises, { age: 'C', level: 2, sessions: 2, minutes: 90, week, players: 16 }).sessions[0].blocks[1].exercise.id));
  assert.ok(ids.size > 1, 'anchor never changes between blocks');
});

test('weekly sessions are capped by age group', () => {
  assert.deepEqual(Object.keys(AGE_GROUPS).map(maxSessions), [2, 2, 3, 3, 4, 5, 5]);
  for (const age of Object.keys(AGE_GROUPS)) {
    const plan = generatePlan(exercises, { age, level: 2, sessions: 5, minutes: 60, week: 1 });
    assert.equal(plan.sessions.length, maxSessions(age), age);
    assert.equal(plan.weeklyMinutes, maxSessions(age) * 60);
  }
  // Bis zu fünf Einheiten ohne doppelte Übung (außer dem Ankerspiel).
  const plan = generatePlan(exercises, { age: 'A', level: 2, sessions: 5, minutes: 90, week: 20, players: 18, keepers: 2 });
  assert.ok(plan.sessions.every((s) => s.blocks.every((b) => b.exercise)));
});

test('training days follow the match day, explicit days win', () => {
  assert.deepEqual(trainingDays(2), [2, 4]);
  assert.deepEqual(trainingDays(2, null, 6), [2, 4]); // Spiel Samstag: Dienstag, Donnerstag
  assert.deepEqual(trainingDays(3, null, 6), [1, 3, 5]);
  assert.deepEqual(trainingDays(5, null, 6), [1, 2, 4, 5, 7]); // Sonntag = Tag nach dem Spiel
  assert.deepEqual(trainingDays(3, null, 7), [2, 4, 6]); // Spiel Sonntag
  assert.deepEqual(trainingDays(2, [5, 1]), [1, 5]);
  assert.deepEqual(trainingDays(2, [1, 6], 6), [2, 4], 'training on match day falls back to defaults');
  assert.deepEqual(trainingDays(3, [1, 2]), [1, 3, 5], 'wrong count falls back to defaults');
  for (let m = 1; m <= 7; m++) for (let n = 1; n <= 5; n++) assert.ok(!trainingDays(n, null, m).includes(m), `${n} sessions, match ${m}`);
  assert.deepEqual(matchLoad(5, 6), { load: 'sharp', before: 1, after: 6 });
  assert.deepEqual(matchLoad(7, 6), { load: 'recovery', before: 6, after: 1 });
  assert.equal(matchLoad(3, 6).load, 'normal');
  assert.equal(matchLoad(3, null).load, 'normal');
});

test('match day sets the load: no step-up the day before or after, first session after the match flagged', () => {
  const base = { age: 'B', level: 2, sessions: 4, minutes: 90, players: 16, keepers: 1, week: 2, match: 6 };
  const plan = generatePlan(exercises, { ...base, days: [1, 2, 4, 5] }, rituals);
  assert.deepEqual(plan.sessions.map((s) => s.load), ['normal', 'normal', 'normal', 'sharp']);
  assert.deepEqual(plan.sessions.map((s) => s.level), [2, 3, 3, 2]);
  assert.deepEqual(plan.sessions.map((s) => s.afterMatch), [true, false, false, false]);
  const rec = generatePlan(exercises, { ...base, sessions: 2, days: [2, 7], match: 6, week: 1 }, rituals);
  assert.deepEqual(rec.sessions.map((s) => [s.day, s.load, s.level]), [[2, 'normal', 2], [7, 'recovery', 1]]);
  assert.equal(rec.sessions[1].afterMatch, true);
  // Kinder: kein Spieltag-Einfluss.
  const kids = generatePlan(exercises, { age: 'E', level: 2, sessions: 2, minutes: 90, week: 2, match: 6 });
  assert.equal(kids.match, null);
  assert.ok(kids.sessions.every((s) => s.load === 'normal'));
});

test('home challenges exist for every theme and stage', () => {
  const home = JSON.parse(readFileSync(new URL('../data/home.json', import.meta.url)));
  const ids = new Set();
  for (const c of [...home.challenges, ...home.freePlay]) {
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`);
    ids.add(c.id);
    assert.ok(c.name.de && c.name.en && c.how.de && c.how.en, `${c.id}: texts`);
    for (const st of c.stages ?? []) assert.ok(['kids', 'youth'].includes(st), `${c.id}: stage`);
    for (const th of c.themes ?? []) assert.ok(THEMES[th], `${c.id}: theme ${th}`);
  }
  for (const [age, group] of Object.entries(AGE_GROUPS)) {
    const stage = group.stage ?? 'kids';
    for (const theme of group.themes) {
      const list = homeChallenges(home, { stage, theme, week: 5 });
      assert.equal(list.length, 3, `${age}/${theme}`);
      assert.ok(list.slice(0, 2).some((c) => c.themes?.includes(theme)), `${age}/${theme}: nothing for the theme`);
      assert.ok(home.freePlay.includes(list[2]), `${age}/${theme}: free play`);
      assert.deepEqual(homeChallenges(home, { stage, theme, week: 5 }), list, 'deterministic');
    }
  }
});

test('goalkeeper station runs parallel to the intermediate block in youth', () => {
  const keeperEx = exercises.filter((ex) => ex.role === 'keeper');
  assert.ok(keeperEx.length >= 8);
  for (const ex of keeperEx) {
    assert.equal(ex.phase, 'uebung', ex.id);
    assert.ok(ex.ages.every((a) => AGE_GROUPS[a].stage === 'youth'), `${ex.id}: youth only`);
  }
  for (const age of youthAges) {
    const plan = generatePlan(exercises, { age, level: 2, sessions: 2, minutes: 90, week: 4, players: 16, keepers: 2 });
    for (const s of plan.sessions) {
      const z = s.blocks.find((b) => b.phase === 'uebung');
      assert.ok(z.keeper?.role === 'keeper' && z.keeper.ages.includes(age), `${age}: keeper station`);
      for (const b of s.blocks) assert.notEqual(b.exercise.role, 'keeper', `${age}: keeper exercise for the whole team`);
    }
    assert.notEqual(plan.sessions[0].blocks[2].keeper.id, plan.sessions[1].blocks[2].keeper.id, `${age}: same keeper drill twice`);
    const none = generatePlan(exercises, { age, level: 2, sessions: 2, minutes: 90, week: 4, players: 16, keepers: 0 });
    assert.ok(none.sessions.every((s) => s.blocks.every((b) => !b.keeper)), `${age}: station without keepers`);
  }
  const kids = generatePlan(exercises, { age: 'E', level: 2, sessions: 2, minutes: 90, week: 4, keepers: 1 });
  assert.ok(kids.sessions.every((s) => s.blocks.every((b) => !b.keeper)));
});
