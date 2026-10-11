// Zweisprachigkeit (Deutsch / Englisch). Deutsch ist die Grundsprache der Daten;
// Englisch kommt aus den Übersetzungen hier und aus data/*.en.json.

import { AGE_GROUPS, LEVELS, THEMES, PHASES, FUNINO_RULES } from './config.js';

export const LANGS = ['de', 'en'];

const STRINGS = {
  de: {
    title: 'Funino-Wochenplaner',
    tagline: 'SV Germania · Kinderfußball nach dem Prinzip Spielen – Üben – Spielen',
    tabPlan: 'Wochenplan',
    tabCatalog: 'Übungen',
    tabRules: 'Ablauf & Regeln',
    age: 'Altersklasse',
    level: 'Niveau',
    sessions: 'Einheiten pro Woche',
    minutes: 'Dauer (Minuten)',
    players: 'Anzahl Kinder',
    theme: 'Schwerpunkt',
    week: 'Kalenderwoche',
    shuffle: 'Neu mischen',
    print: 'Drucken',
    phase: 'Phase',
    all: 'Alle',
    themeAuto: 'Automatisch (Wochenrotation)',
    footer: 'Grundlage: Horst Weins Funino und die DFB-Spielformen im Kinderfußball. Feldmaße sind Richtwerte.',
    summaryTitle: 'KW {week} · {age} · Schwerpunkt: {theme}',
    summaryLine: '{sessions} × {minutes} min · {players} Kinder · {level}. Für Spielform und Abschlussspiel: <strong>{fields}</strong> ({field}), {goals} Minitore.',
    field1: '1 Feld',
    fieldN: '{n} Felder',
    training: 'Training {n}',
    harderStep: ' · eine Stufe schwerer',
    before: 'vorher',
    arrival: 'Ankommen',
    openingCircle: 'Begrüßungskreis',
    closingCircle: 'Abschlusskreis',
    ritual: 'Ritual',
    tip: 'Tipp',
    noExercise: 'keine passende Übung',
    easier: 'Leichter',
    base: 'Grundform',
    harder: 'Schwerer',
    forYourLevel: 'Für euer Niveau ({dial})',
    fieldLabel: 'Feld',
    material: 'Material',
    playersLabel: 'Spieler',
    setup: 'Aufbau',
    procedure: 'Ablauf',
    questions: 'Fragen an die Kinder',
    catCount: '{n} von {total} Übungen',
    fieldAria: 'Funino-Feld {l} × {w} m mit 4 Minitoren und Schusszonen',
    approx: 'ca.',
    structureTitle: 'Ablauf einer Trainingseinheit',
    structArrival: 'Ankommen (vor Beginn)',
    structArrivalText: 'Jedes Kind wird persönlich mit Namen begrüßt, dann sofort Ball und freies Spiel.',
    structOpeningText: 'Im Kreis zusammenkommen, ein kurzes Ritual zum Ankommen und Kennenlernen, Schwerpunkt vorstellen, Teamruf.',
    structClosingText: 'Lob und Rückmeldung, Teamruf, gemeinsam aufräumen, jedes Kind einzeln verabschieden.',
    principles: 'Grundsätze für Trainer',
    ritualChoice: 'Rituale zur Auswahl',
    hintAufwaermen: 'Spielerisch warm werden mit vielen Ballkontakten (Fangspiele, Dribbelspiele).',
    hintUebung: 'Den Schwerpunkt üben, erst ohne, dann mit Gegner. Kurze Wartezeiten.',
    hintSpielform: 'Kleine Spiele (1 gegen 1 bis 4 gegen 4) mit Sonderregeln für den Schwerpunkt, mehrere Felder.',
    hintAbschluss: 'Funino nach den Regeln unten, Gewinner steigen auf, Verlierer ab.',
    rulesTitle: 'Funino-Grundregeln',
    formatsTitle: 'Formate nach Altersklasse (DFB)',
    format: 'Format',
    goals: 'Tore',
    scoring: 'Torerzielung',
    ball: 'Ball',
    themeAutoBtn: '◐ Automatisch',
    themeLight: '☀ Hell',
    themeDark: '☾ Dunkel',
    themeTitle: 'Farbschema wechseln',
    langButton: 'EN',
    langTitle: 'Switch to English',
    loadError: 'Die Übungen konnten nicht geladen werden ({msg}). Die Seite muss über einen Webserver geöffnet werden, nicht als Datei.',
  },
  en: {
    title: 'Funino Weekly Planner',
    tagline: 'SV Germania · Kids’ football following Play – Practise – Play',
    tabPlan: 'Weekly plan',
    tabCatalog: 'Exercises',
    tabRules: 'Structure & rules',
    age: 'Age group',
    level: 'Level',
    sessions: 'Sessions per week',
    minutes: 'Length (minutes)',
    players: 'Number of kids',
    theme: 'Focus',
    week: 'Calendar week',
    shuffle: 'Shuffle',
    print: 'Print',
    phase: 'Phase',
    all: 'All',
    themeAuto: 'Automatic (weekly rotation)',
    footer: 'Based on Horst Wein’s Funino and the DFB children’s football formats. Field sizes are guidelines.',
    summaryTitle: 'Week {week} · {age} · Focus: {theme}',
    summaryLine: '{sessions} × {minutes} min · {players} kids · {level}. For game forms and the final game: <strong>{fields}</strong> ({field}), {goals} mini goals.',
    field1: '1 field',
    fieldN: '{n} fields',
    training: 'Session {n}',
    harderStep: ' · one step harder',
    before: 'before',
    arrival: 'Arrival',
    openingCircle: 'Welcome circle',
    closingCircle: 'Closing circle',
    ritual: 'Ritual',
    tip: 'Tip',
    noExercise: 'no matching exercise',
    easier: 'Easier',
    base: 'Standard',
    harder: 'Harder',
    forYourLevel: 'For your level ({dial})',
    fieldLabel: 'Field',
    material: 'Equipment',
    playersLabel: 'Players',
    setup: 'Setup',
    procedure: 'How it works',
    questions: 'Questions for the kids',
    catCount: '{n} of {total} exercises',
    fieldAria: 'Funino field {l} × {w} m with 4 mini goals and shooting zones',
    approx: 'approx.',
    structureTitle: 'Structure of a session',
    structArrival: 'Arrival (before the start)',
    structArrivalText: 'Every child is welcomed personally by name, then gets a ball straight away and plays freely.',
    structOpeningText: 'Come together in a circle, a short ritual to arrive and get to know each other, introduce the focus, team call.',
    structClosingText: 'Praise and feedback, team call, tidy up together, say goodbye to every child individually.',
    principles: 'Principles for coaches',
    ritualChoice: 'Rituals to choose from',
    hintAufwaermen: 'Warm up playfully with lots of ball contacts (tag games, dribbling games).',
    hintUebung: 'Practise the focus, first without and then with an opponent. Short waiting times.',
    hintSpielform: 'Small games (1v1 to 4v4) with special rules for the focus, several fields.',
    hintAbschluss: 'Funino with the rules below, winners move up, losers move down.',
    rulesTitle: 'Funino basic rules',
    formatsTitle: 'Formats by age group (DFB)',
    format: 'Format',
    goals: 'Goals',
    scoring: 'Scoring',
    ball: 'Ball',
    themeAutoBtn: '◐ Auto',
    themeLight: '☀ Light',
    themeDark: '☾ Dark',
    themeTitle: 'Change colour scheme',
    langButton: 'DE',
    langTitle: 'Auf Deutsch wechseln',
    loadError: 'The exercises could not be loaded ({msg}). The page must be opened through a web server, not as a file.',
  },
};

const CONFIG_EN = {
  ages: {
    G: {
      label: 'G youth / Bambini (U6–U7)',
      short: 'G youth',
      format: '2v2 or 3v3',
      field: '16 × 20 m up to 28 × 22 m',
      goals: '4 mini goals, no goalkeeper',
      shootingZone: '2v2: goals from your own attacking half. 3v3: only from the 6 m shooting zone',
      ball: 'Size 3',
    },
    F: {
      label: 'F youth (U8–U9)',
      short: 'F youth',
      format: '3v3 (recommended) or 5v5',
      field: '3v3: 26–28 × 20–22 m. 5v5: up to 40 × 25 m',
      goals: '4 mini goals, no goalkeeper',
      shootingZone: '6 m shooting zone in front of each end line',
      ball: 'Size 4 (light ball)',
    },
    E: {
      label: 'E youth (U10–U11)',
      short: 'E youth',
      format: '5v5 or 7v7 (in training often 3v3 / 4v4)',
      field: '5v5: up to 40 × 25 m. 7v7: 55 × 35 m',
      goals: '5v5: 4 mini goals. 7v7: 2 small goals with goalkeeper',
      shootingZone: '6 m shooting zone (Funino)',
      ball: 'Size 4',
    },
  },
  levels: {
    1: { label: 'Beginner', hint: 'More space, extra players, little pressure, few rules.' },
    2: { label: 'Intermediate', hint: 'Standard form: even numbers, semi-active to active opponent.' },
    3: { label: 'Advanced', hint: 'Less space and time, active opponent, extra rules.' },
  },
  themes: {
    dribbling: 'Dribbling & ball control',
    finten: 'Feints',
    '1v1': '1v1',
    torschuss: 'Shooting',
    passen: 'Passing & receiving',
    orientierung: 'Awareness & switching play',
    umschalten: 'Transition',
    koordination: 'Coordination & movement',
  },
  phases: {
    aufwaermen: 'Warm-up game',
    uebung: 'Exercise',
    spielform: 'Game form',
    abschluss: 'Final game (Funino)',
  },
  rules: [
    'No goalkeeper, 4 mini goals: each team attacks two goals and defends two.',
    'Goals only count from the shooting zone (6 m in front of the end line).',
    'Restart by passing or dribbling in, opponents at least 3 m away.',
    'After every goal, each team swaps one player at the halfway line (rotation).',
    'If a team is 3 goals behind, it may bring on an extra player until the gap closes.',
    'No referee: the kids decide themselves, adults support.',
    'Foul in the shooting zone: 1v0 from the halfway line.',
  ],
};

function detectLang() {
  if (typeof location === 'undefined') return 'de';
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem('lang');
    if (LANGS.includes(saved)) return saved;
  } catch {
    // Kein Speicher verfügbar.
  }
  return 'de';
}

let lang = detectLang();
let exercisesEn = {};
let ritualsEn = null;

export const getLang = () => lang;

export function setLang(next) {
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem('lang', next);
  } catch {
    // Die Wahl gilt dann nur bis zum Neuladen.
  }
}

export function setTranslations(exEn, ritEn) {
  exercisesEn = exEn ?? {};
  ritualsEn = ritEn;
}

export function t(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.de[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

const en = () => lang === 'en';

export const ageGroup = (id) => (en() ? { ...AGE_GROUPS[id], ...CONFIG_EN.ages[id] } : AGE_GROUPS[id]);
export const level = (id) => (en() ? { ...LEVELS[id], ...CONFIG_EN.levels[id] } : LEVELS[id]);
export const themeLabel = (id) => (en() ? CONFIG_EN.themes[id] : THEMES[id]);
export const phaseLabel = (id) => (en() ? CONFIG_EN.phases[id] : PHASES.find((p) => p.id === id)?.label ?? id);
export const funinoRules = () => (en() ? CONFIG_EN.rules : FUNINO_RULES);

// Übung oder Ritual in der aktuellen Sprache (fehlende Übersetzungen fallen auf Deutsch zurück).
export const localizeExercise = (ex) => (en() && exercisesEn[ex.id] ? { ...ex, ...exercisesEn[ex.id] } : ex);
export const localizeRitual = (kind, item) => (item && en() && ritualsEn?.[kind]?.[item.id] ? { ...item, ...ritualsEn[kind][item.id] } : item);

export function ritualTexts(rituals) {
  if (!en() || !ritualsEn) return rituals;
  return { ...rituals, principles: ritualsEn.principles, standard: ritualsEn.standard };
}

// Für Tests: Schlüssel beider Sprachen.
export const STRING_KEYS = { de: Object.keys(STRINGS.de), en: Object.keys(STRINGS.en) };
export { CONFIG_EN };
