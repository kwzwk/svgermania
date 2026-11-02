import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AGE_GROUPS, LEVELS, PHASES, THEMES, SESSION_LENGTHS, RITUAL_MINUTES, maxSessions, ritualMinutes } from '../js/config.js';
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
      assert.equal(s.opening.minutes, ritualMinutes(age).opening);
      assert.equal(s.closing.minutes, ritualMinutes(age).closing);
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

test('session caps: kids up to 3, youth up to 4 (D), 5 (C) and 6 (B, A)', () => {
  assert.deepEqual(Object.keys(AGE_GROUPS).map((a) => maxSessions(a)), [3, 3, 3, 4, 5, 6, 6]);
  assert.equal(generatePlan(exercises, { age: 'F', level: 2, sessions: 6, minutes: 75, week: 1 }).sessions.length, 3);
  assert.equal(generatePlan(exercises, { age: 'A', level: 2, sessions: 9, minutes: 90, week: 1 }).sessions.length, 6);
  assert.equal(generatePlan(exercises, { age: 'C', level: 2, sessions: 0, minutes: 90, week: 1 }).sessions.length, 1);
});

test('many sessions per week: variety, no back-to-back repeats, prevention levels and net play', () => {
  for (const age of Object.keys(AGE_GROUPS)) {
    const max = maxSessions(age);
    for (const level of [1, 2, 3]) {
      for (const [players, keepers] of [[10, 1], [16, 0], [16, 2]]) {
        for (const week of [3, 17, 40]) {
          const opts = { age, level, sessions: max, minutes: 90, week, players, keepers: AGE_GROUPS[age].stage === 'youth' ? keepers : undefined };
          const plan = generatePlan(exercises, opts, rituals);
          const tag = `${age}/${level}/${players}/${keepers}/${week}`;
          assert.equal(plan.sessions.length, max, tag);
          const ids = plan.sessions.flatMap((s) => s.blocks.map((b) => b.exercise.id));
          // Keine Wiederholung, solange die Phase noch unbenutzte Übungen hat.
          for (const [i, phase] of PHASES.entries()) {
            const picked = plan.sessions.map((s) => s.blocks[i].exercise.id);
            const all = suitableExercises(exercises, { age, level, players }).filter((ex) => ex.phase === phase.id);
            const fit = all.filter((ex) => opts.keepers == null || (ex.goalkeepers ?? 0) <= opts.keepers);
            const pool = new Set((fit.length ? fit : all).map((ex) => ex.id));
            assert.equal(new Set(picked).size, Math.min(picked.length, pool.size), `${tag} ${phase.id}: too many repeats ${picked}`);
          }
          for (let s = 1; s < plan.sessions.length; s++) {
            const prev = new Set(plan.sessions[s - 1].blocks.map((b) => b.exercise.id));
            for (const b of plan.sessions[s].blocks) assert.ok(!prev.has(b.exercise.id), `${tag}: ${b.exercise.id} twice in a row`);
            assert.notEqual(plan.sessions[s].opening.circle.id, plan.sessions[s - 1].opening.circle.id, `${tag}: same opening ritual twice in a row`);
          }
          assert.ok(ids.length === max * PHASES.length);
          for (const s of plan.sessions) {
            assert.ok(s.level >= 1 && s.level <= 3);
            const warm = s.blocks[0];
            if (AGE_GROUPS[age].prevention) assert.ok(warm.preventionLevel >= 1 && warm.preventionLevel <= 3, tag);
          }
          if (plan.minNetPlay) {
            const two = generatePlan(exercises, { ...opts, sessions: 2 }, rituals);
            assert.ok(plan.netPlay > two.netPlay, `${tag}: net play should grow with sessions`);
          }
        }
      }
    }
  }
});
