import { AGE_GROUPS, LEVELS, THEMES, PHASES, SESSION_LENGTHS, FUNINO_RULES } from './config.js';
import { generatePlan, isoWeek } from './generator.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const option = (value, label, selected = false) => `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
const phaseLabel = (id) => PHASES.find((p) => p.id === id)?.label ?? id;
const VARIATION_LABEL = { easier: 'Leichter', base: 'Grundform', harder: 'Schwerer' };

let exercises = [];
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
  history.replaceState(null, '', `?${q}${location.hash}`);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

// ---------- Formular ----------

function initForm(state) {
  const form = $('#plan-form');
  $('#age').innerHTML = Object.values(AGE_GROUPS).map((g) => option(g.id, g.label, g.id === state.age)).join('');
  $('#minutes').innerHTML = SESSION_LENGTHS.map((m) => option(m, `${m} min`, m === state.minutes)).join('');
  $('#levels').innerHTML = Object.values(LEVELS)
    .map((l) => `<label><input type="radio" name="level" value="${l.id}"${l.id === state.level ? ' checked' : ''}><span>${esc(l.label)}</span></label>`)
    .join('');
  form.sessions.value = state.sessions;
  form.players.value = state.players;
  form.week.value = state.week;
  fillThemes(state.age, state.theme);

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
  $('#theme').innerHTML =
    option('auto', 'Automatisch (Wochenrotation)', keep === 'auto') + themes.map((t) => option(t, THEMES[t], t === keep)).join('');
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
  $('#level-hint').textContent = `${LEVELS[state.level].label}: ${LEVELS[state.level].hint}`;
  const plan = generatePlan(exercises, state);
  const group = AGE_GROUPS[plan.age];

  $('#plan').innerHTML = `
    <div class="plan-summary">
      <h2>KW ${plan.week} · ${esc(group.short)} · Schwerpunkt: ${esc(THEMES[plan.theme])}</h2>
      <p>${plan.sessions.length} × ${plan.minutes} min · ${plan.players} Kinder · ${esc(LEVELS[plan.level].label)}.
        Für Spielform und Abschlussspiel: <strong>${plan.fields} ${plan.fields === 1 ? 'Feld' : 'Felder'}</strong>
        (${esc(group.field)}), ${plan.miniGoals} Minitore.</p>
    </div>
    ${plan.sessions.map((s) => renderSession(s, plan)).join('')}`;
}

function renderSession(session, plan) {
  const progression = session.number > 1 && session.level > plan.level ? ' · eine Stufe schwerer' : '';
  return `
    <article class="session">
      <h3>Training ${session.number}<span class="muted">${progression}</span></h3>
      <ol class="blocks">
        ${session.blocks.map((b) => `<li class="block phase-${b.phase}">${renderBlock(b)}</li>`).join('')}
      </ol>
    </article>`;
}

function renderBlock(block) {
  const ex = block.exercise;
  if (!ex) return `<div class="block-head"><span class="time">${block.minutes} min</span><span>${esc(block.label)}: keine passende Übung</span></div>`;
  return `
    <details>
      <summary class="block-head">
        <span class="time">${block.minutes} min</span>
        <span class="phase">${esc(block.label)}</span>
        <span class="name">${esc(ex.name)}</span>
        <span class="tag tag-${block.variation}">${VARIATION_LABEL[block.variation]}</span>
      </summary>
      ${renderExerciseBody(ex, block.variation)}
    </details>`;
}

function renderExerciseBody(ex, variation) {
  const dial = variation === 'easier' ? ['Leichter', ex.easier] : variation === 'harder' ? ['Schwerer', ex.harder] : null;
  return `
    <div class="ex-body">
      <p class="themes">${ex.themes.map((t) => `<span class="chip">${esc(THEMES[t])}</span>`).join('')}</p>
      ${dial ? `<p class="dial"><strong>Für euer Niveau (${dial[0]}):</strong> ${esc(dial[1])}</p>` : ''}
      <dl>
        <dt>Feld</dt><dd>${esc(ex.field)}</dd>
        <dt>Material</dt><dd>${esc(ex.material)}</dd>
        <dt>Spieler</dt><dd>${ex.players.min}–${ex.players.max}</dd>
        <dt>Aufbau</dt><dd>${esc(ex.setup)}</dd>
      </dl>
      <h4>Ablauf</h4>
      <ol>${ex.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      <div class="variations">
        <p><strong>Leichter:</strong> ${esc(ex.easier)}</p>
        <p><strong>Schwerer:</strong> ${esc(ex.harder)}</p>
      </div>
      <h4>Fragen an die Kinder</h4>
      <ul class="questions">${ex.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
    </div>`;
}

// ---------- Übungskatalog ----------

function initCatalog() {
  $('#cat-age').innerHTML += Object.values(AGE_GROUPS).map((g) => option(g.id, g.short)).join('');
  $('#cat-phase').innerHTML += PHASES.map((p) => option(p.id, p.label)).join('');
  $('#cat-theme').innerHTML += Object.entries(THEMES).map(([id, label]) => option(id, label)).join('');
  for (const id of ['#cat-age', '#cat-phase', '#cat-theme']) $(id).addEventListener('change', renderCatalog);
  renderCatalog();
}

function renderCatalog() {
  const age = $('#cat-age').value;
  const phase = $('#cat-phase').value;
  const theme = $('#cat-theme').value;
  const list = exercises.filter((ex) => (!age || ex.ages.includes(age)) && (!phase || ex.phase === phase) && (!theme || ex.themes.includes(theme)));
  $('#cat-count').textContent = `${list.length} von ${exercises.length} Übungen`;
  $('#catalog').innerHTML = list
    .map(
      (ex) => `
      <details class="card">
        <summary>
          <span class="name">${esc(ex.name)}</span>
          <span class="muted">${esc(phaseLabel(ex.phase))} · ${ex.ages.map((a) => AGE_GROUPS[a].short).join(', ')}</span>
        </summary>
        ${renderExerciseBody(ex, 'base')}
      </details>`,
    )
    .join('');
}

// ---------- Funino-Regeln ----------

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
    <svg class="field" viewBox="0 0 ${W + pad * 2} ${H + pad * 2}" role="img" aria-label="Funino-Feld ${l} × ${w} m mit 4 Minitoren und Schusszonen">
      <rect class="pitch" x="${pad}" y="${pad}" width="${W}" height="${H}"/>
      <rect class="zone" x="${pad}" y="${pad}" width="${zone}" height="${H}"/>
      <rect class="zone" x="${pad + W - zone}" y="${pad}" width="${zone}" height="${H}"/>
      <line class="line" x1="${pad + W / 2}" y1="${pad}" x2="${pad + W / 2}" y2="${pad + H}"/>
      ${goals(pad - 8)}${goals(pad + W)}
      <text x="${pad + zone / 2}" y="${pad + H / 2}" text-anchor="middle">6 m</text>
      <text x="${pad + W - zone / 2}" y="${pad + H / 2}" text-anchor="middle">6 m</text>
      <text x="${pad + W / 2}" y="${pad + H + 15}" text-anchor="middle">ca. ${l} m</text>
    </svg>`;
}

function renderRules() {
  $('#rules').innerHTML = `
    <h2>Funino-Grundregeln</h2>
    <ul class="rules">${FUNINO_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <h2>Formate nach Altersklasse (DFB)</h2>
    <div class="age-cards">
      ${Object.values(AGE_GROUPS)
        .map(
          (g) => `
        <article class="card">
          <h3>${esc(g.label)}</h3>
          ${fieldSvg(g)}
          <dl>
            <dt>Format</dt><dd>${esc(g.format)}</dd>
            <dt>Feld</dt><dd>${esc(g.field)}</dd>
            <dt>Tore</dt><dd>${esc(g.goals)}</dd>
            <dt>Torerzielung</dt><dd>${esc(g.shootingZone)}</dd>
            <dt>Ball</dt><dd>${esc(g.ball)}</dd>
          </dl>
        </article>`,
        )
        .join('')}
    </div>`;
}

// ---------- Tabs ----------

function showView(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  for (const t of document.querySelectorAll('.tab')) {
    if (t.dataset.view === name) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  }
  history.replaceState(null, '', name === 'plan' ? location.search : `${location.search}#${name}`);
}

async function main() {
  const res = await fetch('data/exercises.json');
  exercises = await res.json();
  const state = readState();
  variant = state.variant;
  initForm(state);
  initCatalog();
  renderRules();
  render();
  for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => showView(t.dataset.view));
  const hash = location.hash.slice(1);
  if (['catalog', 'rules'].includes(hash)) showView(hash);
}

main().catch((err) => {
  $('#plan').innerHTML = `<p class="error">Die Übungen konnten nicht geladen werden (${esc(err.message)}). Die Seite muss über einen Webserver geöffnet werden, nicht als Datei.</p>`;
});
