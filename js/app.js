import { AGE_GROUPS, LEVELS, THEMES, PHASES, SESSION_LENGTHS, maxSessions, ritualMinutes } from './config.js';
import { generatePlan, isoWeek, sessionSteps } from './generator.js';
import { MAX_ITEMS, MAX_MINUTES, buildSession, decodeCustom, defaultMinutes, emptyCustom, encodeCustom, fixRituals, ritualsFor, totalMinutes } from './custom.js';
import {
  t,
  getLang,
  setLang,
  setTranslations,
  ageGroup,
  level as levelInfo,
  themeLabel,
  phaseLabel,
  funinoRules,
  localizeExercise,
  localizeRitual,
  ritualTexts,
  sessionTitle,
} from './i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const option = (value, label, selected = false) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;

let exercises = [];
let rituals = null;
let prevention = null;
let variant = 0;
let currentPlan = null;

// Bereich: Kinderfußball (G–E, Funino) oder Jugendfußball (D, C nach der DFB-Trainingsphilosophie).
const stageOf = (age) => AGE_GROUPS[age]?.stage ?? 'kids';
const agesOf = (st) => Object.keys(AGE_GROUPS).filter((id) => stageOf(id) === st);
let stage = 'kids';

// ---------- Zustand <-> URL, damit ein Plan per Link geteilt werden kann ----------

function readState() {
  const q = new URLSearchParams(location.search);
  const age = AGE_GROUPS[q.get('age')] ? q.get('age') : 'F';
  return {
    age,
    level: LEVELS[q.get('level')] ? Number(q.get('level')) : 1,
    sessions: clamp(Number(q.get('sessions')) || 2, 1, maxSessions(age)),
    minutes: SESSION_LENGTHS.includes(Number(q.get('minutes'))) ? Number(q.get('minutes')) : AGE_GROUPS[age].defaultMinutes,
    players: clamp(Number(q.get('players')) || (stageOf(age) === 'youth' ? 16 : 12), 2, 40),
    keepers: clamp(Number(q.get('keepers') ?? 1), 0, 4),
    theme: THEMES[q.get('theme')] ? q.get('theme') : 'auto',
    week: clamp(Number(q.get('week')) || isoWeek(), 1, 53),
    variant: Number(q.get('v')) || 0,
    rituals: q.get('rituals') !== '0',
    prevention: q.get('prev') !== '0',
  };
}

function writeState(s) {
  const q = new URLSearchParams({ age: s.age, level: s.level, sessions: s.sessions, minutes: s.minutes, players: s.players, theme: s.theme, week: s.week });
  if (s.keepers != null) q.set('keepers', s.keepers);
  if (s.variant) q.set('v', s.variant);
  if (!s.rituals) q.set('rituals', '0');
  if (s.prevention === false) q.set('prev', '0');
  if (getLang() !== 'de') q.set('lang', getLang());
  history.replaceState(null, '', `?${q}${location.hash}`);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

// ---------- Statische Texte ----------

function applyStaticTexts() {
  const youth = stage === 'youth';
  document.title = t(youth ? 'titleYouth' : 'title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  $('h1[data-i18n="title"]').textContent = t(youth ? 'titleYouth' : 'title');
  $('.tagline').textContent = t(youth ? 'taglineYouth' : 'tagline');
  $('#players-label').textContent = t(youth ? 'playersYouth' : 'players');
  $('#keepers-field').hidden = !youth;
  $('#prevention-field').hidden = !youth;
  $('.site-footer p').textContent = t(youth ? 'footerYouth' : 'footer');
  $('#rituals-label').textContent = t(youth ? 'includeRitualsYouth' : 'includeRituals');
  const langBtn = $('#lang-toggle');
  langBtn.textContent = t('langButton');
  langBtn.title = t('langTitle');
  langBtn.setAttribute('aria-label', t('langTitle'));
}

// ---------- Formular ----------

function fillForm(state) {
  // Eine Liste für alle Altersklassen, gruppiert nach Kinder- und Jugendfußball.
  $('#age').innerHTML = ['kids', 'youth']
    .map((st) => `<optgroup label="${esc(t(st === 'kids' ? 'stageKids' : 'stageYouth'))}">${agesOf(st).map((id) => option(id, ageGroup(id).label, id === state.age)).join('')}</optgroup>`)
    .join('');
  $('#minutes').innerHTML = SESSION_LENGTHS.map((m) => option(m, `${m} min`, m === state.minutes)).join('');
  $('#levels').innerHTML = Object.keys(LEVELS)
    .map((id) => `<label><input type="radio" name="level" value="${id}"${Number(id) === state.level ? ' checked' : ''}><span>${esc(levelInfo(id).label)}</span></label>`)
    .join('');
  fillSessions(state.age, state.sessions);
  const form = $('#plan-form');
  form.players.value = state.players;
  form.keepers.value = state.keepers ?? 1;
  form.week.value = state.week;
  form.rituals.checked = state.rituals;
  form.prevention.checked = state.prevention !== false;
  fillThemes(state.age, state.theme);
}

function bindForm() {
  const form = $('#plan-form');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'age') {
      form.minutes.value = AGE_GROUPS[form.age.value].defaultMinutes;
      fillThemes(form.age.value, form.theme.value);
      fillSessions(form.age.value, Number(form.sessions.value));
      const next = stageOf(form.age.value);
      if (next !== stage) switchStage(next);
    }
    variant = 0;
    render();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#shuffle').addEventListener('click', () => {
    variant += 1;
    render();
  });
  $('#print').addEventListener('click', () => window.print());
  // Beim Drucken alle Übungen aufklappen.
  window.addEventListener('beforeprint', () => document.querySelectorAll('#plan details, #custom-plan details').forEach((d) => (d.open = true)));
}

// Wechsel zwischen Kinder- und Jugendfußball, ausgelöst durch die Wahl der Altersklasse.
function switchStage(next) {
  stage = next;
  const prev = formState();
  const state = { ...prev, minutes: AGE_GROUPS[prev.age].defaultMinutes, players: next === 'youth' ? 16 : 12 };
  applyStaticTexts();
  fillForm(state);
  $('#cat-age').value = '';
  fillCatalogFilters();
  renderCatalog();
  renderRules();
  render();
}

// Auswahl 1 bis zur Höchstzahl der Altersklasse; ein zu hoher Wert wird auf das Maximum gekürzt.
function fillSessions(age, current) {
  const max = maxSessions(age);
  const keep = clamp(Number(current) || 2, 1, max);
  $('#sessions').innerHTML = Array.from({ length: max }, (_, i) => option(i + 1, i + 1, i + 1 === keep)).join('');
}

function fillThemes(age, current) {
  const themes = AGE_GROUPS[age].themes;
  const keep = themes.includes(current) ? current : 'auto';
  $('#theme').innerHTML = option('auto', t('themeAuto'), keep === 'auto') + themes.map((id) => option(id, themeLabel(id), id === keep)).join('');
}

function formState() {
  const f = $('#plan-form');
  return {
    age: f.age.value,
    level: Number(f.querySelector('input[name=level]:checked').value),
    sessions: clamp(Number(f.sessions.value) || 2, 1, maxSessions(f.age.value)),
    minutes: Number(f.minutes.value),
    players: clamp(Number(f.players.value) || 12, 2, 40),
    keepers: stageOf(f.age.value) === 'youth' ? clamp(Number(f.keepers.value) || 0, 0, 4) : undefined,
    theme: f.theme.value,
    week: clamp(Number(f.week.value) || isoWeek(), 1, 53),
    variant,
    rituals: f.rituals.checked,
    prevention: stageOf(f.age.value) === 'youth' ? f.prevention.checked : undefined,
  };
}

// ---------- Plan ----------

function render() {
  const state = formState();
  writeState(state);
  const lvl = levelInfo(state.level);
  const hintKey = `levelHintYouth${state.level}`;
  $('#level-hint').textContent = `${lvl.label}: ${stageOf(state.age) === 'youth' && t(hintKey) !== hintKey ? t(hintKey) : lvl.hint}`;
  const plan = generatePlan(exercises, state, rituals);
  const group = ageGroup(plan.age);
  const fields = plan.fields === 1 ? t('field1') : t('fieldN', { n: plan.fields });

  const youth = plan.stage === 'youth';
  const netLow = youth && plan.minNetPlay && plan.netPlay < plan.minNetPlay;
  const netPlay = youth && plan.minNetPlay
    ? `<p class="net-play${netLow ? ' low' : ''}">${esc(t('netPlay', { net: plan.netPlay, min: plan.minNetPlay }))}${netLow ? ` ${esc(t('netPlayLow', { min: plan.minNetPlay }))}` : ''}<br><span class="muted">${esc(t('fieldSplitHint'))}</span></p>`
    : '';
  $('#plan').innerHTML = `
    <div class="plan-summary">
      <h2>${esc(t('summaryTitle', { week: plan.week, age: group.short, theme: themeLabel(plan.theme) }))}</h2>
      <p>${t(youth ? 'summaryLineYouth' : 'summaryLine', {
        sessions: plan.sessions.length,
        minutes: plan.minutes,
        players: plan.players,
        keepers: plan.keepers ?? 0,
        level: esc(levelInfo(plan.level).label),
        fields,
        field: esc(group.field),
        goals: plan.miniGoals,
      })}</p>
    </div>
    ${netPlay}
    ${plan.sessions.map((s) => renderSession(s, plan)).join('')}`;
  currentPlan = plan;
  fillStartSessions(plan);
}

function renderSession(session, plan) {
  const progression = session.number > 1 && session.level > plan.level ? t('harderStep') : '';
  const standard = ritualTexts(rituals, plan.stage)?.standard;
  const youthPlan = plan.stage === 'youth';
  return `
    <article class="session">
      <h3>${esc(sessionTitle(session.number, plan.age))}<span class="muted">${esc(progression)}</span></h3>
      <ol class="blocks">
        ${session.opening ? renderRitualBlock('arrival', t('before'), t('arrival'), session.opening.arrival) : ''}
        ${session.opening ? renderRitualBlock('opening', `${session.opening.minutes} min`, t(youthPlan ? 'openingYouth' : 'openingCircle'), session.opening.circle, standard?.opening, plan.theme) : ''}
        ${session.blocks.map((b) => `<li class="block phase-${b.phase}">${renderBlock(b, plan.age)}</li>`).join('')}
        ${session.closing ? renderRitualBlock('closing', `${session.closing.minutes} min`, t(youthPlan ? 'closingYouth' : 'closingCircle'), session.closing.circle, standard?.closing) : ''}
      </ol>
    </article>`;
}

function focusNote(theme) {
  return `<p class="focus-note"><strong>${esc(t('focusOfWeek'))}:</strong> ${esc(themeLabel(theme))}</p>`;
}

function renderRitualBody(item, standard = [], theme = null) {
  return `
        <div class="ex-body">
          ${theme ? focusNote(theme) : ''}
          <ol>${[...item.steps, ...standard].map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
          <p class="dial"><strong>${esc(t('tip'))}:</strong> ${esc(item.tip)}</p>
        </div>`;
}

function renderRitualBlock(kind, time, label, raw, standard = [], theme = null) {
  const item = localizeRitual(kind, raw);
  if (!item) return '';
  return `
    <li class="block ritual ritual-${kind}">
      <details>
        <summary class="block-head">
          <span class="time">${esc(time)}</span>
          <span class="phase">${esc(label)}</span>
          <span class="name">${esc(item.name)}</span>
          <span class="tag tag-ritual">${esc(t('ritual'))}</span>
        </summary>
        ${renderRitualBody(item, standard, theme)}
      </details>
    </li>`;
}

// Präventions-Aufwärmen (nach FIFA 11+ / 11+ Kids), eigene Kurzbeschreibung aus data/prevention.json.
const preventionProgram = (id) => prevention?.programs.find((p) => p.id === id) ?? null;
const loc = (o) => (o ? o[getLang()] ?? o.de : '');

function renderPreventionBody(program, level) {
  const stufe = clamp(level || 1, 1, 3);
  return `
    <div class="ex-body">
      <p class="dial">${esc(loc(program.note))}</p>
      ${program.parts
        .map(
          (part) => `
        ${program.parts.length > 1 || part.title ? `<h4 class="prevention-part">${esc(loc(part.title))}</h4>` : ''}
        <ol class="prevention-list">${part.exercises
          .map((x) => `<li><strong>${esc(loc(x.name))}</strong>: ${esc(loc(x.how))}${x.levels ? ` <span class="prevention-level">${esc(t('preventionLevel', { n: stufe }))}: ${esc(loc(x.levels[stufe - 1]))}</span>` : ''}</li>`)
          .join('')}</ol>`,
        )
        .join('')}
      <p class="hint">${esc(loc(prevention.source))}</p>
    </div>`;
}

function renderBlock(block, age) {
  const label = phaseLabel(block.phase, age);
  const prog = block.prevention && preventionProgram(block.prevention);
  if (prog) {
    return `
    <details>
      <summary class="block-head">
        <span class="time">${block.minutes} min</span>
        <span class="phase">${esc(label)}</span>
        <span class="name">${esc(loc(prog.name))}</span>
        <span class="tag tag-ritual">${esc(t('preventionLevel', { n: clamp(block.preventionLevel || 1, 1, 3) }))}</span>
      </summary>
      ${renderPreventionBody(prog, block.preventionLevel)}
    </details>`;
  }
  if (!block.exercise) return `<div class="block-head"><span class="time">${block.minutes} min</span><span>${esc(label)}: ${esc(t('noExercise'))}</span></div>`;
  const ex = localizeExercise(block.exercise);
  return `
    <details>
      <summary class="block-head">
        <span class="time">${block.minutes} min</span>
        <span class="phase">${esc(label)}</span>
        <span class="name">${esc(ex.name)}</span>
        <span class="tag tag-${block.variation}">${esc(t(block.variation))}</span>
      </summary>
      ${renderExerciseBody(ex, block.variation)}
    </details>`;
}

// Animierte Draufsicht aus tools/exercise-gifs; fehlt die Datei, verschwindet das Bild.
function exerciseAnimation(ex) {
  const suffix = getLang() === 'de' ? '' : `.${getLang()}`;
  return `<img class="ex-anim" src="img/exercises/${esc(ex.id)}${suffix}.gif" alt="${esc(ex.name)}" loading="lazy" width="416" onerror="this.remove()">`;
}

function renderExerciseBody(ex, variation) {
  const dial = variation === 'easier' ? ex.easier : variation === 'harder' ? ex.harder : null;
  return `
    <div class="ex-body">
      ${exerciseAnimation(ex)}
      <p class="themes">${ex.themes.map((id) => `<span class="chip">${esc(themeLabel(id))}</span>`).join('')}</p>
      ${dial ? `<p class="dial"><strong>${esc(t('forYourLevel', { dial: t(variation) }))}:</strong> ${esc(dial)}</p>` : ''}
      <dl>
        <dt>${esc(t('fieldLabel'))}</dt><dd>${esc(ex.field)}</dd>
        <dt>${esc(t('material'))}</dt><dd>${esc(ex.material)}</dd>
        <dt>${esc(t('playersLabel'))}</dt><dd>${ex.players.min}–${ex.players.max}</dd>
        ${ex.format ? `<dt>${esc(t('formatLabel'))}</dt><dd>${esc(ex.format)}</dd>` : ''}
        ${ex.goalkeepers ? `<dt>${esc(t('keepersNeeded'))}</dt><dd>${ex.goalkeepers}</dd>` : ''}
        ${ex.blocks ? `<dt>${esc(t('blocksLabel'))}</dt><dd>${esc(t('blocksValue', ex.blocks))}</dd>` : ''}
        <dt>${esc(t('setup'))}</dt><dd>${esc(ex.setup)}</dd>
      </dl>
      <h4>${esc(t('procedure'))}</h4>
      <ol>${ex.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <div class="variations">
        <p><strong>${esc(t('easier'))}:</strong> ${esc(ex.easier)}</p>
        <p><strong>${esc(t('harder'))}:</strong> ${esc(ex.harder)}</p>
      </div>
      <h4>${esc(t('questions'))}</h4>
      <ul class="questions">${ex.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
    </div>`;
}

// ---------- Übungskatalog ----------

function fillCatalogFilters() {
  const keep = (id) => $(id).value;
  const [age, phase, theme] = [keep('#cat-age'), keep('#cat-phase'), keep('#cat-theme')];
  const all = option('', t('all'));
  $('#cat-age').innerHTML = all + agesOf(stage).map((id) => option(id, ageGroup(id).short, id === age)).join('');
  const phaseAge = stage === 'youth' ? 'D' : null;
  $('#cat-phase').innerHTML = all + PHASES.map((p) => option(p.id, phaseLabel(p.id, phaseAge), p.id === phase)).join('');
  $('#cat-theme').innerHTML = all + Object.keys(THEMES).map((id) => option(id, themeLabel(id), id === theme)).join('');
}

function renderCatalog() {
  const age = $('#cat-age').value;
  const phase = $('#cat-phase').value;
  const theme = $('#cat-theme').value;
  const stageAges = agesOf(stage);
  const inStage = exercises.filter((ex) => ex.ages.some((a) => stageAges.includes(a)));
  const list = inStage.filter((ex) => (!age || ex.ages.includes(age)) && (!phase || ex.phase === phase) && (!theme || ex.themes.includes(theme)));
  $('#cat-count').textContent = t('catCount', { n: list.length, total: inStage.length });
  $('#catalog').innerHTML = list
    .map(localizeExercise)
    .map(
      (ex) => `
      <details class="card">
        <summary>
          <span class="name">${esc(ex.name)}</span>
          <span class="muted">${esc(phaseLabel(ex.phase, stage === 'youth' ? 'D' : null))} · ${esc(ex.ages.map((a) => ageGroup(a).short).join(', '))}</span>
        </summary>
        ${renderExerciseBody(ex, 'base')}
      </details>`,
    )
    .join('');
}

// ---------- Ablauf & Regeln ----------

// Hybridfeld der Jugend: ein Jugendtor auf der einen, zwei Minitore auf der anderen Seite.
function youthFieldSvg(group) {
  const { w, l } = group.fieldSize;
  const s = 10;
  const W = l * s;
  const H = w * s;
  const pad = 20;
  const box = 8 * s;
  const mini = 2 * s;
  return `
    <svg class="field" viewBox="0 0 ${W + pad * 2} ${H + pad * 2}" role="img" aria-label="${esc(group.field)}">
      <rect class="pitch" x="${pad}" y="${pad}" width="${W}" height="${H}"/>
      <rect class="zone" x="${pad}" y="${pad + H / 2 - box}" width="${11 * s}" height="${box * 2}"/>
      <line class="line" x1="${pad + W / 2}" y1="${pad}" x2="${pad + W / 2}" y2="${pad + H}"/>
      <rect class="goal" x="${pad - 8}" y="${pad + H / 2 - 25}" width="8" height="50"/>
      <rect class="goal" x="${pad + W}" y="${pad + H * 0.25 - mini / 2}" width="8" height="${mini}"/>
      <rect class="goal" x="${pad + W}" y="${pad + H * 0.75 - mini / 2}" width="8" height="${mini}"/>
      <text x="${pad + W / 2}" y="${pad + H + 15}" text-anchor="middle">${esc(t('approx'))} ${l} × ${w} m</text>
    </svg>`;
}

function fieldSvg(group) {
  if (group.stage === 'youth') return youthFieldSvg(group);
  const { w, l } = group.fieldSize;
  const s = 10;
  const W = l * s;
  const H = w * s;
  const pad = 20;
  const zone = 6 * s;
  const goalW = 2 * s;
  const goalY = [H * 0.2, H * 0.8 - goalW];
  const goals = (x) => goalY.map((y) => `<rect class="goal" x="${x}" y="${pad + y}" width="8" height="${goalW}"/>`).join('');
  return `
    <svg class="field" viewBox="0 0 ${W + pad * 2} ${H + pad * 2}" role="img" aria-label="${esc(t('fieldAria', { l, w }))}">
      <rect class="pitch" x="${pad}" y="${pad}" width="${W}" height="${H}"/>
      <rect class="zone" x="${pad}" y="${pad}" width="${zone}" height="${H}"/>
      <rect class="zone" x="${pad + W - zone}" y="${pad}" width="${zone}" height="${H}"/>
      <line class="line" x1="${pad + W / 2}" y1="${pad}" x2="${pad + W / 2}" y2="${pad + H}"/>
      ${goals(pad - 8)}${goals(pad + W)}
      <text x="${pad + zone / 2}" y="${pad + H / 2}" text-anchor="middle">6 m</text>
      <text x="${pad + W - zone / 2}" y="${pad + H / 2}" text-anchor="middle">6 m</text>
      <text x="${pad + W / 2}" y="${pad + H + 15}" text-anchor="middle">${esc(t('approx'))} ${l} m</text>
    </svg>`;
}

const PHASE_HINT_KEYS = { aufwaermen: 'hintAufwaermen', uebung: 'hintUebung', spielform: 'hintSpielform', abschluss: 'hintAbschluss' };

function renderStructure() {
  if (!rituals) return '';
  const youth = stage === 'youth';
  const texts = ritualTexts(rituals, stage);
  const rm = ritualMinutes(youth ? 'D' : 'F');
  const openLabel = t(youth ? 'openingYouth' : 'openingCircle');
  const closeLabel = t(youth ? 'closingYouth' : 'closingCircle');
  const st = (key) => t(youth ? `${key}Youth` : key);
  const hint = (id) => t(youth ? `hintYouth${id[0].toUpperCase()}${id.slice(1)}` : PHASE_HINT_KEYS[id]);
  const steps = [
    [t('structArrival'), st('structArrivalText')],
    [`${openLabel} (${rm.opening} min)`, st('structOpeningText')],
    ...PHASES.map((p) => [phaseLabel(p.id, youth ? 'D' : null), hint(p.id)]),
    [`${closeLabel} (${rm.closing} min)`, st('structClosingText')],
  ];
  const stageAges = agesOf(stage);
  return `
    <h2>${esc(t('structureTitle'))}</h2>
    <p>${esc(t(youth ? 'structSourceYouth' : 'structSource'))}</p>
    <ol class="structure">${steps.map(([title, d]) => `<li><strong>${esc(title)}</strong><br>${esc(d)}</li>`).join('')}</ol>
    ${youth ? '' : `<p class="dial">${esc(t('structBambini'))}</p>`}
    ${youth ? `<h3>${esc(t('youthPrinciplesTitle'))}</h3><ul class="rules">${t('youthPrinciples').split('|').map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <h3>${esc(t('principles'))}</h3>
    <ul class="rules">${texts.principles.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <h3>${esc(t('ritualChoice'))}</h3>
    <div class="age-cards">
      ${[['arrival', t('arrival')], ['opening', openLabel], ['closing', closeLabel]]
        .map(
          ([kind, title]) => `
        <article class="card">
          <h3>${esc(title)}</h3>
          <ul>${rituals[kind]
            .filter((raw) => raw.ages.some((a) => stageAges.includes(a)))
            .map((raw) => localizeRitual(kind, raw))
            .map((r) => `<li>${esc(r.name)} <span class="muted">(${esc(r.ages.map((a) => ageGroup(a).short).join(', '))})</span></li>`)
            .join('')}</ul>
        </article>`,
        )
        .join('')}
    </div>`;
}

function renderRules() {
  $('#rules').innerHTML = `
    ${renderStructure()}
    ${stage === 'youth' ? '' : `<h2>${esc(t('rulesTitle'))}</h2>
    <ul class="rules">${funinoRules().map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`}
    <h2>${esc(t('formatsTitle'))}</h2>
    <div class="age-cards">
      ${agesOf(stage)
        .map(ageGroup)
        .map(
          (g) => `
        <article class="card">
          <h3>${esc(g.label)}</h3>
          ${fieldSvg(g)}
          <dl>
            <dt>${esc(t('format'))}</dt><dd>${esc(g.format)}</dd>
            <dt>${esc(t('fieldLabel'))}</dt><dd>${esc(g.field)}</dd>
            <dt>${esc(t('goals'))}</dt><dd>${esc(g.goals)}</dd>
            ${g.shootingZone ? `<dt>${esc(t('scoring'))}</dt><dd>${esc(g.shootingZone)}</dd>` : ''}
            ${g.matchLength ? `<dt>${esc(t('matchLength'))}</dt><dd>${esc(g.matchLength)}</dd>` : ''}
            <dt>${esc(t('ball'))}</dt><dd>${esc(g.ball)}</dd>
          </dl>
        </article>`,
        )
        .join('')}
    </div>`;
}

// ---------- Eigener Plan ----------

let custom = null;
let lastAdded = null;

const customHash = () => `#custom?${encodeCustom(custom)}`;

function saveCustom() {
  if (!$('#view-custom').hidden) history.replaceState(null, '', `${location.search}${customHash()}`);
  try {
    localStorage.setItem('customPlan', encodeCustom(custom));
  } catch {
    // Ohne Speicher bleibt der Plan trotzdem im Link erhalten.
  }
}

function ritualLabel(kind, age) {
  const youth = stageOf(age) === 'youth';
  if (kind === 'arrival') return t('arrival');
  return t(kind === 'opening' ? (youth ? 'openingYouth' : 'openingCircle') : youth ? 'closingYouth' : 'closingCircle');
}

function fillCustomForm() {
  const form = $('#custom-form');
  $('#c-age').innerHTML = ['kids', 'youth']
    .map((st) => `<optgroup label="${esc(t(st === 'kids' ? 'stageKids' : 'stageYouth'))}">${agesOf(st).map((id) => option(id, ageGroup(id).label, id === custom.age)).join('')}</optgroup>`)
    .join('');
  $('#c-levels').innerHTML = Object.keys(LEVELS)
    .map((id) => `<label><input type="radio" name="level" value="${id}"${Number(id) === custom.level ? ' checked' : ''}><span>${esc(levelInfo(id).label)}</span></label>`)
    .join('');
  form.title.value = custom.title;
  form.title.placeholder = t('customTitlePlaceholder');
  form.rituals.checked = custom.rituals;
  for (const kind of ['arrival', 'opening', 'closing']) {
    form[kind].innerHTML = ritualsFor(rituals, kind, custom.age)
      .map((raw) => localizeRitual(kind, raw))
      .map((r) => option(r.id, r.name, r.id === custom[kind]))
      .join('');
  }
  $('#c-opening-label').textContent = ritualLabel('opening', custom.age);
  $('#c-closing-label').textContent = ritualLabel('closing', custom.age);
  for (const el of form.querySelectorAll('.c-ritual')) el.hidden = !custom.rituals;
  const keep = (id) => $(id).value;
  const [phase, theme] = [keep('#c-phase'), keep('#c-theme')];
  const all = option('', t('all'));
  $('#c-phase').innerHTML = all + PHASES.map((p) => option(p.id, phaseLabel(p.id, custom.age), p.id === phase)).join('');
  $('#c-theme').innerHTML = all + AGE_GROUPS[custom.age].themes.map((id) => option(id, themeLabel(id), id === theme)).join('');
}

function renderCustom() {
  renderCustomPlan();
  renderCustomPicker();
  saveCustom();
}

function renderCustomPlan() {
  const session = buildSession(custom, exercises, rituals);
  const { total, rituals: ritualMin } = totalMinutes(custom);
  const standard = ritualTexts(rituals, stageOf(custom.age))?.standard;
  const items = session.blocks
    .map((b, i) => {
      const ex = localizeExercise(b.exercise);
      const btn = (act, label, sym, off) => `<button type="button" data-act="${act}" data-i="${i}" aria-label="${esc(label)}" title="${esc(label)}"${off ? ' disabled' : ''}>${sym}</button>`;
      return `
        <li class="block phase-${b.phase} c-item">
          <div class="c-row">
            <label class="c-min"><input type="number" inputmode="numeric" min="1" max="${MAX_MINUTES}" value="${b.minutes}" data-i="${i}" aria-label="${esc(t('minutesShort'))}: ${esc(ex.name)}"><span>min</span></label>
            <div class="c-name"><span class="phase">${esc(phaseLabel(b.phase, custom.age))}</span><span class="name">${esc(ex.name)}</span></div>
            <div class="c-btns">
              ${btn('up', t('moveUp'), '↑', i === 0)}${btn('down', t('moveDown'), '↓', i === session.blocks.length - 1)}${btn('remove', t('remove'), '✕', false)}
            </div>
          </div>
          <details>
            <summary class="c-more">${esc(t('details'))} <span class="tag tag-${b.variation}">${esc(t(b.variation))}</span></summary>
            ${renderExerciseBody(ex, b.variation)}
          </details>
        </li>`;
    })
    .join('');
  const op = session.opening;
  const cl = session.closing;
  $('#custom-plan').innerHTML = `
    <div class="plan-summary">
      <h2>${esc(custom.title || t('customSession'))}</h2>
      <p>${esc(ageGroup(custom.age).short)} · ${esc(levelInfo(custom.level).label)} · <strong>${esc(t(custom.rituals ? 'customTotalRituals' : 'customTotal', { total, rituals: ritualMin }))}</strong></p>
    </div>
    <article class="session">
      <ol class="blocks">
        ${op ? renderRitualBlock('arrival', t('before'), t('arrival'), op.arrival) : ''}
        ${op ? renderRitualBlock('opening', `${op.minutes} min`, ritualLabel('opening', custom.age), op.circle, standard?.opening) : ''}
        ${items || `<li class="c-empty">${esc(t('customEmpty'))}</li>`}
        ${cl ? renderRitualBlock('closing', `${cl.minutes} min`, ritualLabel('closing', custom.age), cl.circle, standard?.closing) : ''}
      </ol>
    </article>`;
  $('#c-start').disabled = !session.blocks.length;
  $('#c-clear').disabled = !custom.items.length;
}

function renderCustomPicker() {
  const phase = $('#c-phase').value;
  const theme = $('#c-theme').value;
  const forAge = exercises.filter((ex) => ex.ages.includes(custom.age));
  const list = forAge.filter((ex) => (!phase || ex.phase === phase) && (!theme || ex.themes.includes(theme)));
  const counts = new Map();
  for (const it of custom.items) counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
  const full = custom.items.length >= MAX_ITEMS;
  $('#c-count').textContent = `${t('catCount', { n: list.length, total: forAge.length })}${full ? ` · ${t('customFull', { n: MAX_ITEMS })}` : ''}`;
  $('#c-catalog').innerHTML = list
    .map(localizeExercise)
    .map((ex) => {
      const n = counts.get(ex.id);
      return `
      <article class="card pick phase-${ex.phase}">
        <div class="pick-head">
          <div class="pick-title">
            <span class="name">${esc(ex.name)}</span>
            <span class="muted">${esc(phaseLabel(ex.phase, custom.age))} · ${esc(ex.themes.map(themeLabel).join(', '))}${n ? ` · <strong class="in-plan">${esc(t('customInPlan', { n }))}</strong>` : ''}</span>
          </div>
          <button type="button" class="add" data-add="${esc(ex.id)}"${full ? ' disabled' : ''}>${esc(t(lastAdded === ex.id ? 'customAdded' : 'customAdd'))}</button>
        </div>
        <details>
          <summary class="c-more">${esc(t('details'))}</summary>
          ${renderExerciseBody(ex, 'base')}
        </details>
      </article>`;
    })
    .join('');
}

function setCustom(next) {
  custom = next;
  renderCustom();
}

function moveItem(i, delta) {
  const items = [...custom.items];
  const j = i + delta;
  if (j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  setCustom({ ...custom, items });
}

async function shareCustom() {
  const lang = getLang() === 'de' ? '' : `?lang=${getLang()}`;
  const url = `${location.origin}${location.pathname}${lang}${customHash()}`;
  const status = $('#c-share-status');
  status.textContent = '';
  // Auf dem Handy das System-Teilen-Menü, sonst in die Zwischenablage.
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: custom.title || t('customSession'), url });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = t('linkCopied');
  } catch {
    window.prompt(t('copyLink'), url);
  }
}

function bindCustom() {
  const form = $('#custom-form');
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', (e) => {
    if (e.target.name !== 'title') return;
    custom = { ...custom, title: e.target.value };
    renderCustomPlan();
    saveCustom();
  });
  form.addEventListener('change', (e) => {
    const name = e.target.name;
    if (name === 'title') return;
    let next = { ...custom };
    if (name === 'age') next = fixRituals({ ...next, age: form.age.value }, rituals);
    else if (name === 'level') next.level = Number(e.target.value);
    else if (name === 'rituals') next.rituals = e.target.checked;
    else if (['arrival', 'opening', 'closing'].includes(name)) next[name] = e.target.value;
    custom = next;
    if (name === 'age' || name === 'rituals') fillCustomForm();
    renderCustom();
  });
  $('#custom-plan').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    if (btn.dataset.act === 'up') moveItem(i, -1);
    else if (btn.dataset.act === 'down') moveItem(i, 1);
    else if (btn.dataset.act === 'remove') setCustom({ ...custom, items: custom.items.filter((_, k) => k !== i) });
  });
  $('#custom-plan').addEventListener('change', (e) => {
    if (!e.target.matches('.c-min input')) return;
    const i = Number(e.target.dataset.i);
    const minutes = Math.min(MAX_MINUTES, Math.max(1, Math.round(Number(e.target.value)) || 1));
    setCustom({ ...custom, items: custom.items.map((it, k) => (k === i ? { ...it, minutes } : it)) });
  });
  $('#c-catalog').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-add]');
    if (!btn || custom.items.length >= MAX_ITEMS) return;
    const ex = exercises.find((x) => x.id === btn.dataset.add);
    if (!ex) return;
    lastAdded = ex.id;
    setCustom({ ...custom, items: [...custom.items, { id: ex.id, minutes: defaultMinutes(custom.age, ex.phase) }] });
    setTimeout(() => {
      if (lastAdded !== ex.id) return;
      lastAdded = null;
      const b = $(`#c-catalog button[data-add="${ex.id}"]`);
      if (b) b.textContent = t('customAdd');
    }, 1500);
  });
  for (const id of ['#c-phase', '#c-theme']) $(id).addEventListener('change', renderCustomPicker);
  $('#c-share').addEventListener('click', shareCustom);
  $('#c-print').addEventListener('click', () => window.print());
  $('#c-clear').addEventListener('click', () => {
    if (custom.items.length && window.confirm(t('customClearConfirm'))) setCustom({ ...custom, items: [] });
  });
  $('#c-start').addEventListener('click', () => {
    const session = buildSession(custom, exercises, rituals);
    if (!session.blocks.length) return;
    startSession(session, { age: custom.age, title: () => custom.title || t('customSession'), returnTo: '#c-start' });
  });
}

function initCustom(fallbackAge) {
  const hash = location.hash.slice(1);
  let src = hash.startsWith('custom') ? hash.slice('custom'.length).replace(/^\?/, '') : '';
  if (!src) {
    try {
      src = localStorage.getItem('customPlan') ?? '';
    } catch {
      src = '';
    }
  }
  custom = src ? decodeCustom(src, exercises, rituals) : fixRituals(emptyCustom(fallbackAge), rituals);
  fillCustomForm();
  bindCustom();
  renderCustomPlan();
  renderCustomPicker();
}

// ---------- Trainingsmodus mit Countdown ----------

const trainer = { steps: [], index: 0, endAt: 0, left: 0, paused: false, alerted: false, timer: null, wakeLock: null, audio: null };

function fillStartSessions(plan) {
  const select = $('#start-session');
  const keep = Number(select.value) || 1;
  select.innerHTML = plan.sessions.map((s) => option(s.number, sessionTitle(s.number, plan.age), s.number === keep)).join('');
  $('#start-session-label').hidden = plan.sessions.length < 2;
}

function startTraining() {
  const session = currentPlan?.sessions.find((s) => s.number === Number($('#start-session').value)) ?? currentPlan?.sessions[0];
  if (!session) return;
  const age = currentPlan.age;
  startSession(session, { age, theme: currentPlan.theme, title: () => sessionTitle(session.number, age), returnTo: '#start-training' });
}

// Startet den Trainingsmodus für eine Einheit (aus dem Wochenplan oder dem eigenen Plan).
function startSession(session, { age, theme = null, title, returnTo }) {
  trainer.steps = sessionSteps(session).map((st) => ({ ...st, level: session.level }));
  trainer.title = title;
  trainer.returnTo = returnTo;
  trainer.age = age;
  trainer.theme = theme;
  // Audio muss in einer Nutzeraktion entsperrt werden (iOS).
  try {
    trainer.audio ??= new (window.AudioContext || window.webkitAudioContext)();
    trainer.audio.resume();
  } catch {
    trainer.audio = null;
  }
  $('#trainer').hidden = false;
  document.body.classList.add('training');
  goToStep(0);
  trainer.timer = setInterval(tick, 250);
  keepScreenOn();
}

function stopTraining() {
  clearInterval(trainer.timer);
  trainer.timer = null;
  $('#trainer').hidden = true;
  document.body.classList.remove('training');
  trainer.wakeLock?.release().catch(() => {});
  trainer.wakeLock = null;
  $(trainer.returnTo ?? '#start-training')?.focus();
}

function goToStep(i) {
  trainer.index = i;
  trainer.left = trainer.steps[i] ? trainer.steps[i].minutes * 60000 : 0;
  trainer.endAt = Date.now() + trainer.left;
  trainer.paused = false;
  trainer.alerted = false;
  renderTrainer();
}

function remainingMs() {
  return trainer.paused ? trainer.left : trainer.endAt - Date.now();
}

function togglePause() {
  if (trainer.paused) trainer.endAt = Date.now() + trainer.left;
  else trainer.left = trainer.endAt - Date.now();
  trainer.paused = !trainer.paused;
  renderTrainerControls();
  tick();
}

function formatClock(ms) {
  const secs = Math.ceil(Math.abs(ms) / 1000);
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return ms < 0 && secs > 0 ? `+${text}` : text;
}

function tick() {
  if (trainer.index >= trainer.steps.length) return;
  const ms = remainingMs();
  const clock = $('#trainer-clock');
  clock.textContent = formatClock(ms);
  clock.classList.toggle('overtime', ms <= 0);
  $('#trainer-overtime').hidden = ms > 0;
  const step = trainer.steps[trainer.index];
  $('#trainer-bar').style.width = `${Math.min(100, Math.max(0, 100 - (ms / (step.minutes * 60000)) * 100))}%`;
  const later = trainer.steps.slice(trainer.index + 1).reduce((sum, st) => sum + st.minutes, 0);
  $('#trainer-total').textContent = t('remainingTotal', { min: Math.ceil(Math.max(0, ms) / 60000) + later });
  if (ms <= 0 && !trainer.alerted) {
    trainer.alerted = true;
    signalTimeUp();
  }
}

function signalTimeUp() {
  navigator.vibrate?.([300, 150, 300]);
  const ctx = trainer.audio;
  if (!ctx) return;
  for (const [i, freq] of [880, 880, 1175].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + i * 0.3;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  }
}

async function keepScreenOn() {
  try {
    if ('wakeLock' in navigator && !trainer.wakeLock && trainer.timer) trainer.wakeLock = await navigator.wakeLock.request('screen');
    trainer.wakeLock?.addEventListener('release', () => (trainer.wakeLock = null));
  } catch {
    // Ohne Wake Lock kann das Display ausgehen; der Timer läuft trotzdem weiter.
  }
}

function stepTitle(step) {
  if (step.kind === 'opening' || step.kind === 'closing') {
    const item = localizeRitual(step.kind, step.ritual);
    const y = stageOf(trainer.age) === 'youth';
    return { label: t(step.kind === 'opening' ? (y ? 'openingYouth' : 'openingCircle') : y ? 'closingYouth' : 'closingCircle'), name: item?.name ?? '' };
  }
  const prog = step.block.prevention && preventionProgram(step.block.prevention);
  if (prog) return { label: phaseLabel(step.kind, trainer.age), name: loc(prog.name) };
  const ex = step.block.exercise && localizeExercise(step.block.exercise);
  return { label: phaseLabel(step.kind, trainer.age), name: ex ? ex.name : t('noExercise') };
}

function renderTrainer() {
  const box = $('#trainer');
  const total = trainer.steps.length;
  if (trainer.index >= total) {
    box.innerHTML = `
      <div class="trainer-inner trainer-done">
        <p class="trainer-step">${esc(trainer.title())}</p>
        <h2>${esc(t('trainingDone'))}</h2>
        <p>${esc(t('trainingDoneText'))}</p>
        <div class="trainer-controls"><button type="button" class="primary" data-act="end">${esc(t('close'))}</button></div>
      </div>`;
    return;
  }
  const step = trainer.steps[trainer.index];
  const { label, name } = stepTitle(step);
  const next = trainer.steps[trainer.index + 1];
  const standard = ritualTexts(rituals, stageOf(trainer.age))?.standard;
  let body = '';
  if (step.ritual) {
    const item = localizeRitual(step.kind, step.ritual);
    if (item) body = renderRitualBody(item, standard?.[step.kind], trainer.index === 0 ? trainer.theme : null);
  } else if (step.block.prevention && preventionProgram(step.block.prevention)) {
    body = renderPreventionBody(preventionProgram(step.block.prevention), step.block.preventionLevel);
  } else if (step.block.exercise) {
    body = renderExerciseBody(localizeExercise(step.block.exercise), step.block.variation);
  }
  const tag = step.ritual ? `<span class="tag tag-ritual">${esc(t('ritual'))}</span>` : `<span class="tag tag-${step.block.variation}">${esc(t(step.block.variation))}</span>`;
  box.innerHTML = `
    <div class="trainer-inner ${step.ritual ? 'ritual' : `phase-${step.kind}`}">
      <div class="trainer-top">
        <p class="trainer-step">${esc(trainer.title())} · ${esc(t('stepOf', { n: trainer.index + 1, total }))} · <span id="trainer-total"></span></p>
        <button type="button" class="trainer-close" data-act="end" aria-label="${esc(t('endTraining'))}">✕</button>
      </div>
      <div class="trainer-progress"><span id="trainer-bar"></span></div>
      <p class="trainer-phase">${esc(label)} · ${step.minutes} min ${tag}</p>
      <h2 class="trainer-name">${esc(name)}</h2>
      <p id="trainer-clock" class="trainer-clock" role="timer" aria-live="off"></p>
      <p id="trainer-overtime" class="trainer-overtime" hidden>${esc(t('timeUp'))}</p>
      <div class="trainer-controls" id="trainer-controls"></div>
      ${next ? `<p class="trainer-next"><strong>${esc(t('upNext'))}:</strong> ${esc(stepTitle(next).name || stepTitle(next).label)} · ${next.minutes} min</p>` : ''}
      <details class="trainer-details" open>
        <summary>${esc(t('procedure'))}</summary>
        ${trainer.index === 0 && !step.ritual && trainer.theme ? focusNote(trainer.theme) : ''}
        ${body}
      </details>
    </div>`;
  renderTrainerControls();
  tick();
}

function renderTrainerControls() {
  const last = trainer.index === trainer.steps.length - 1;
  $('#trainer-controls').innerHTML = `
    <button type="button" data-act="back"${trainer.index === 0 ? ' disabled' : ''}>${esc(t('back'))}</button>
    <button type="button" data-act="pause">${esc(t(trainer.paused ? 'resume' : 'pause'))}</button>
    <button type="button" class="primary" data-act="next">${esc(t(last ? 'finishTraining' : 'nextExercise'))}</button>`;
}

function bindTrainer() {
  $('#start-training').addEventListener('click', startTraining);
  $('#trainer').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'end') stopTraining();
    else if (act === 'pause') togglePause();
    else if (act === 'back') goToStep(Math.max(0, trainer.index - 1));
    else if (act === 'next') goToStep(trainer.index + 1);
  });
  document.addEventListener('keydown', (e) => {
    if ($('#trainer').hidden) return;
    if (e.key === 'Escape') stopTraining();
  });
  // Wake Lock geht beim Wechsel in den Hintergrund verloren und wird danach neu angefordert.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && trainer.timer) keepScreenOn();
  });
}

// ---------- Farbschema (Automatisch / Hell / Dunkel) ----------

const THEME_KEYS = { auto: 'themeAutoBtn', light: 'themeLight', dark: 'themeDark' };
const THEME_ORDER = ['auto', 'light', 'dark'];
let colorScheme = document.documentElement.dataset.theme || 'auto';

function applyColorScheme() {
  if (colorScheme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = colorScheme;
  const button = $('#theme-toggle');
  button.textContent = t(THEME_KEYS[colorScheme]);
  button.title = t('themeTitle');
  button.setAttribute('aria-label', `${t('themeTitle')}: ${t(THEME_KEYS[colorScheme]).slice(2)}`);
}

function bindThemeToggle() {
  $('#theme-toggle').addEventListener('click', () => {
    colorScheme = THEME_ORDER[(THEME_ORDER.indexOf(colorScheme) + 1) % THEME_ORDER.length];
    applyColorScheme();
    try {
      if (colorScheme === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', colorScheme);
    } catch {
      // Ohne Speicher gilt die Wahl nur bis zum Neuladen.
    }
  });
}

// ---------- Sprache ----------

function renderAll() {
  applyStaticTexts();
  applyColorScheme();
  if (!exercises.length) return;
  const state = formState();
  fillForm(state);
  fillCatalogFilters();
  renderCatalog();
  renderRules();
  render();
  fillCustomForm();
  renderCustomPlan();
  renderCustomPicker();
  if (trainer.timer) renderTrainer();
}

function bindLangToggle() {
  $('#lang-toggle').addEventListener('click', () => {
    setLang(getLang() === 'de' ? 'en' : 'de');
    renderAll();
  });
}

// ---------- Tabs ----------

function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  for (const tab of document.querySelectorAll('.tab')) {
    if (tab.dataset.view === name) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  const hash = name === 'plan' ? '' : name === 'custom' ? customHash() : `#${name}`;
  history.replaceState(null, '', `${location.search}${hash}`);
}

setLang(getLang());
applyStaticTexts();
applyColorScheme();
bindThemeToggle();
bindLangToggle();

async function main() {
  const files = ['exercises.json', 'rituals.json', 'exercises.en.json', 'rituals.en.json'];
  const [ex, rit, exEn, ritEn] = await Promise.all(files.map((f) => fetch(`data/${f}`).then((r) => r.json())));
  // Optional: ohne die Datei bleibt die Aktivierung eine normale Übung.
  prevention = await fetch('data/prevention.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  exercises = ex;
  rituals = rit;
  setTranslations(exEn, ritEn);
  const state = readState();
  stage = stageOf(state.age);
  applyStaticTexts();
  variant = state.variant;
  fillForm(state);
  bindForm();
  bindTrainer();
  fillCatalogFilters();
  for (const id of ['#cat-age', '#cat-phase', '#cat-theme']) $(id).addEventListener('change', renderCatalog);
  renderCatalog();
  renderRules();
  render();
  initCustom(state.age);
  for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => showView(tab.dataset.view));
  const hash = location.hash.slice(1);
  if (['catalog', 'rules'].includes(hash)) showView(hash);
  else if (hash.startsWith('custom')) showView('custom');
}

main().catch((err) => {
  $('#plan').innerHTML = `<p class="error">${esc(t('loadError', { msg: err.message }))}</p>`;
});
