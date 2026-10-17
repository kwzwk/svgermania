import { AGE_GROUPS, LEVELS, THEMES, PHASES, SESSION_LENGTHS, RITUAL_MINUTES } from './config.js';
import { generatePlan, isoWeek } from './generator.js';
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
} from './i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const option = (value, label, selected = false) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;

let exercises = [];
let rituals = null;
let variant = 0;

// ---------- Zustand <-> URL, damit ein Plan per Link geteilt werden kann ----------

function readState() {
  const q = new URLSearchParams(location.search);
  const age = AGE_GROUPS[q.get('age')] ? q.get('age') : 'F';
  return {
    age,
    level: LEVELS[q.get('level')] ? Number(q.get('level')) : 1,
    sessions: clamp(Number(q.get('sessions')) || 2, 1, 3),
    minutes: SESSION_LENGTHS.includes(Number(q.get('minutes'))) ? Number(q.get('minutes')) : AGE_GROUPS[age].defaultMinutes,
    players: clamp(Number(q.get('players')) || 12, 2, 40),
    theme: THEMES[q.get('theme')] ? q.get('theme') : 'auto',
    week: clamp(Number(q.get('week')) || isoWeek(), 1, 53),
    variant: Number(q.get('v')) || 0,
  };
}

function writeState(s) {
  const q = new URLSearchParams({ age: s.age, level: s.level, sessions: s.sessions, minutes: s.minutes, players: s.players, theme: s.theme, week: s.week });
  if (s.variant) q.set('v', s.variant);
  if (getLang() !== 'de') q.set('lang', getLang());
  history.replaceState(null, '', `?${q}${location.hash}`);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

// ---------- Statische Texte ----------

function applyStaticTexts() {
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  const langBtn = $('#lang-toggle');
  langBtn.textContent = t('langButton');
  langBtn.title = t('langTitle');
  langBtn.setAttribute('aria-label', t('langTitle'));
}

// ---------- Formular ----------

function fillForm(state) {
  $('#age').innerHTML = Object.keys(AGE_GROUPS).map((id) => option(id, ageGroup(id).label, id === state.age)).join('');
  $('#minutes').innerHTML = SESSION_LENGTHS.map((m) => option(m, `${m} min`, m === state.minutes)).join('');
  $('#levels').innerHTML = Object.keys(LEVELS)
    .map((id) => `<label><input type="radio" name="level" value="${id}"${Number(id) === state.level ? ' checked' : ''}><span>${esc(levelInfo(id).label)}</span></label>`)
    .join('');
  const form = $('#plan-form');
  form.sessions.value = state.sessions;
  form.players.value = state.players;
  form.week.value = state.week;
  fillThemes(state.age, state.theme);
}

function bindForm() {
  const form = $('#plan-form');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'age') {
      form.minutes.value = AGE_GROUPS[form.age.value].defaultMinutes;
      fillThemes(form.age.value, form.theme.value);
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
  window.addEventListener('beforeprint', () => document.querySelectorAll('#plan details').forEach((d) => (d.open = true)));
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
    sessions: Number(f.sessions.value),
    minutes: Number(f.minutes.value),
    players: clamp(Number(f.players.value) || 12, 2, 40),
    theme: f.theme.value,
    week: clamp(Number(f.week.value) || isoWeek(), 1, 53),
    variant,
  };
}

// ---------- Plan ----------

function render() {
  const state = formState();
  writeState(state);
  const lvl = levelInfo(state.level);
  $('#level-hint').textContent = `${lvl.label}: ${lvl.hint}`;
  const plan = generatePlan(exercises, state, rituals);
  const group = ageGroup(plan.age);
  const fields = plan.fields === 1 ? t('field1') : t('fieldN', { n: plan.fields });

  $('#plan').innerHTML = `
    <div class="plan-summary">
      <h2>${esc(t('summaryTitle', { week: plan.week, age: group.short, theme: themeLabel(plan.theme) }))}</h2>
      <p>${t('summaryLine', {
        sessions: plan.sessions.length,
        minutes: plan.minutes,
        players: plan.players,
        level: esc(levelInfo(plan.level).label),
        fields,
        field: esc(group.field),
        goals: plan.miniGoals,
      })}</p>
    </div>
    ${plan.sessions.map((s) => renderSession(s, plan)).join('')}`;
}

function renderSession(session, plan) {
  const progression = session.number > 1 && session.level > plan.level ? t('harderStep') : '';
  const standard = ritualTexts(rituals)?.standard;
  return `
    <article class="session">
      <h3>${esc(t('training', { n: session.number }))}<span class="muted">${esc(progression)}</span></h3>
      <ol class="blocks">
        ${renderRitualBlock('arrival', t('before'), t('arrival'), session.opening.arrival)}
        ${renderRitualBlock('opening', `${session.opening.minutes} min`, t('openingCircle'), session.opening.circle, standard?.opening)}
        ${session.blocks.map((b) => `<li class="block phase-${b.phase}">${renderBlock(b)}</li>`).join('')}
        ${renderRitualBlock('closing', `${session.closing.minutes} min`, t('closingCircle'), session.closing.circle, standard?.closing)}
      </ol>
    </article>`;
}

function renderRitualBlock(kind, time, label, raw, standard = []) {
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
        <div class="ex-body">
          <ol>${[...item.steps, ...standard].map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
          <p class="dial"><strong>${esc(t('tip'))}:</strong> ${esc(item.tip)}</p>
        </div>
      </details>
    </li>`;
}

function renderBlock(block) {
  const label = phaseLabel(block.phase);
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

function renderExerciseBody(ex, variation) {
  const dial = variation === 'easier' ? ex.easier : variation === 'harder' ? ex.harder : null;
  return `
    <div class="ex-body">
      <p class="themes">${ex.themes.map((id) => `<span class="chip">${esc(themeLabel(id))}</span>`).join('')}</p>
      ${dial ? `<p class="dial"><strong>${esc(t('forYourLevel', { dial: t(variation) }))}:</strong> ${esc(dial)}</p>` : ''}
      <dl>
        <dt>${esc(t('fieldLabel'))}</dt><dd>${esc(ex.field)}</dd>
        <dt>${esc(t('material'))}</dt><dd>${esc(ex.material)}</dd>
        <dt>${esc(t('playersLabel'))}</dt><dd>${ex.players.min}–${ex.players.max}</dd>
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
  $('#cat-age').innerHTML = all + Object.keys(AGE_GROUPS).map((id) => option(id, ageGroup(id).short, id === age)).join('');
  $('#cat-phase').innerHTML = all + PHASES.map((p) => option(p.id, phaseLabel(p.id), p.id === phase)).join('');
  $('#cat-theme').innerHTML = all + Object.keys(THEMES).map((id) => option(id, themeLabel(id), id === theme)).join('');
}

function renderCatalog() {
  const age = $('#cat-age').value;
  const phase = $('#cat-phase').value;
  const theme = $('#cat-theme').value;
  const list = exercises.filter((ex) => (!age || ex.ages.includes(age)) && (!phase || ex.phase === phase) && (!theme || ex.themes.includes(theme)));
  $('#cat-count').textContent = t('catCount', { n: list.length, total: exercises.length });
  $('#catalog').innerHTML = list
    .map(localizeExercise)
    .map(
      (ex) => `
      <details class="card">
        <summary>
          <span class="name">${esc(ex.name)}</span>
          <span class="muted">${esc(phaseLabel(ex.phase))} · ${esc(ex.ages.map((a) => ageGroup(a).short).join(', '))}</span>
        </summary>
        ${renderExerciseBody(ex, 'base')}
      </details>`,
    )
    .join('');
}

// ---------- Ablauf & Regeln ----------

function fieldSvg(group) {
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
  const texts = ritualTexts(rituals);
  const steps = [
    [t('structArrival'), t('structArrivalText')],
    [`${t('openingCircle')} (${RITUAL_MINUTES.opening} min)`, t('structOpeningText')],
    ...PHASES.map((p) => [phaseLabel(p.id), t(PHASE_HINT_KEYS[p.id])]),
    [`${t('closingCircle')} (${RITUAL_MINUTES.closing} min)`, t('structClosingText')],
  ];
  return `
    <h2>${esc(t('structureTitle'))}</h2>
    <ol class="structure">${steps.map(([title, d]) => `<li><strong>${esc(title)}</strong><br>${esc(d)}</li>`).join('')}</ol>
    <h3>${esc(t('principles'))}</h3>
    <ul class="rules">${texts.principles.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <h3>${esc(t('ritualChoice'))}</h3>
    <div class="age-cards">
      ${[['arrival', t('arrival')], ['opening', t('openingCircle')], ['closing', t('closingCircle')]]
        .map(
          ([kind, title]) => `
        <article class="card">
          <h3>${esc(title)}</h3>
          <ul>${rituals[kind]
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
    <h2>${esc(t('rulesTitle'))}</h2>
    <ul class="rules">${funinoRules().map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <h2>${esc(t('formatsTitle'))}</h2>
    <div class="age-cards">
      ${Object.keys(AGE_GROUPS)
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
            <dt>${esc(t('scoring'))}</dt><dd>${esc(g.shootingZone)}</dd>
            <dt>${esc(t('ball'))}</dt><dd>${esc(g.ball)}</dd>
          </dl>
        </article>`,
        )
        .join('')}
    </div>`;
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
  history.replaceState(null, '', name === 'plan' ? location.search : `${location.search}#${name}`);
}

setLang(getLang());
applyStaticTexts();
applyColorScheme();
bindThemeToggle();
bindLangToggle();

async function main() {
  const files = ['exercises.json', 'rituals.json', 'exercises.en.json', 'rituals.en.json'];
  const [ex, rit, exEn, ritEn] = await Promise.all(files.map((f) => fetch(`data/${f}`).then((r) => r.json())));
  exercises = ex;
  rituals = rit;
  setTranslations(exEn, ritEn);
  const state = readState();
  variant = state.variant;
  fillForm(state);
  bindForm();
  fillCatalogFilters();
  for (const id of ['#cat-age', '#cat-phase', '#cat-theme']) $(id).addEventListener('change', renderCatalog);
  renderCatalog();
  renderRules();
  render();
  for (const tab of document.querySelectorAll('.tab')) tab.addEventListener('click', () => showView(tab.dataset.view));
  const hash = location.hash.slice(1);
  if (['catalog', 'rules'].includes(hash)) showView(hash);
}

main().catch((err) => {
  $('#plan').innerHTML = `<p class="error">${esc(t('loadError', { msg: err.message }))}</p>`;
});
