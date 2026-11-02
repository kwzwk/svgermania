// Zweisprachigkeit (Deutsch / Englisch). Deutsch ist die Grundsprache der Daten;
// Englisch kommt aus den Übersetzungen hier und aus data/*.en.json.

import { AGE_GROUPS, LEVELS, THEMES, PHASES, FUNINO_RULES } from './config.js';

export const LANGS = ['de', 'en'];

const STRINGS = {
  de: {
    title: 'Funino-Wochenplaner',
    tagline: 'Kinderfußball nach dem Prinzip Spielen – Üben – Spielen',
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
    includeRituals: 'Rituale einplanen (Begrüßungs- und Abschlusskreis)',
    startWhich: 'Einheit',
    focusOfWeek: 'Schwerpunkt der Woche',
    startTraining: '▶ Training jetzt starten',
    stepOf: 'Schritt {n} von {total}',
    remainingTotal: 'noch {min} min insgesamt',
    timeUp: 'Zeit ist um, weiter, wenn ihr so weit seid',
    upNext: 'Danach',
    back: '◀ Zurück',
    pause: '⏸ Pause',
    resume: '▶ Weiter',
    nextExercise: 'Nächste Übung ▶',
    finishTraining: 'Training beenden ✓',
    endTraining: 'Trainingsmodus schließen',
    trainingDone: 'Training geschafft!',
    trainingDoneText: 'Gut gemacht. Jetzt noch jedes Kind einzeln verabschieden.',
    close: 'Schließen',
    print: 'Drucken',
    phase: 'Phase',
    all: 'Alle',
    themeAuto: 'Automatisch (Wochenrotation)',
    footer: 'Grundlage: Horst Weins Funino und die DFB-Spielformen im Kinderfußball. Feldmaße sind Richtwerte.',
    footerYouth: 'Grundlage: DFB-„Trainingsphilosophie Deutschland“ (2024) und die DFB-Jugendordnung. Feldmaße sind Richtwerte.',
    summaryTitle: 'KW {week} · {age} · Schwerpunkt: {theme}',
    summaryLine: '{sessions} × {minutes} min · {players} Kinder · {level}. Für die Spielblöcke: <strong>{fields}</strong> ({field}), {goals} Minitore.',
    field1: '1 Feld',
    fieldN: '{n} Felder',
    training: 'Training {n}',
    playHour: 'Spielstunde {n}',
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
    hintAufwaermen: 'Lauf-, Fang- und Staffelspiele, Ballschule mit verschiedenen Bällen, leichte Dribbelaufgaben.',
    hintUebung: 'Den Schwerpunkt spielerisch üben, mit und ohne Gegenspieler, mit beiden Füßen und vielen Wiederholungen. Kurze Wartezeiten.',
    hintSpielform: 'Kleine, freie Spiele ohne feste Positionen (F: 1 gegen 1 bis 3 gegen 3, E: bis 4 gegen 4, auch mit Torwart), mehrere Felder.',
    hintAbschluss: 'Funino nach den Regeln unten, Gewinner steigen auf, Verlierer ab.',
    structBambini: 'Bambini (G-Jugend): Spielstunde statt Training. Aktivierung – Spielen – Spielen – Spielen, in Gleichzahl, keine isolierte Technikschulung, nur kurze Tor- und Dribbel-Challenges zwischen den Spielen. Am besten in eine Geschichte verpacken.',
    structSource: 'Nach der DFB-Entwicklungstabelle Kinder (Kindertrainer-Zertifikat): mehr Spielen als Üben.',
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
    titleYouth: 'Jugend-Trainingsplaner',
    taglineYouth: 'D- bis A-Jugend nach der DFB-Trainingsphilosophie: Aktivierung – Spielblock – Zwischenblock – Spielblock',
    stageKids: 'Kinderfußball',
    stageYouth: 'Jugendfußball',
    stageLabel: 'Bereich wählen',
    keepers: 'Torhüter',
    playersYouth: 'Anzahl Spieler',
    summaryLineYouth: '{sessions} × {minutes} min · {players} Spieler · {keepers} Torhüter · {level}. Für die Spielblöcke: <strong>{fields}</strong> ({field}), je Feld ein Tor mit Torwart und 2 Minitore.',
    netPlay: 'Netto-Spielzeit in kleinen Spielformen: ca. {net} min pro Spieler und Woche (DFB-Mindestwert: {min} min).',
    netPlayLow: 'Zu wenig: Der DFB empfiehlt mindestens {min} min pro Woche. Mehr Einheiten oder längere Spielblöcke einplanen.',
    fieldSplitHint: 'Felder nach Entwicklungsstand einteilen, nicht nach Jahrgang: Frühentwickler fordern, Spätentwickler nicht überfordern.',
    formatLabel: 'Spielform',
    blocksLabel: 'Durchgänge',
    blocksValue: '{count} × {minutes} min, je {rest} min Pause',
    keepersNeeded: 'Torhüter',
    matchLength: 'Wettspiel',
    hintYouthAufwaermen: 'Ballbeherrschung mit Schwerpunkt Dribbeln und Finten, Fangspiele mit und ohne Ball. Viele Aktionen, keine Wartezeiten.',
    hintYouthSpielform: '1 gegen 1 bis 4+TW gegen 4+TW (plus bis zu 2 Anspieler) auf mehreren Feldern auf Tore. Durchgänge von 3–4 min netto, 1–2 min Pause.',
    hintYouthUebung: 'Technik und Athletik mit vielen Wiederholungen: Torschuss, Flanken, Flugbälle, Ballmitnahme, Kopfball (bis zur C-Jugend nur mit Leichtball), Sprints und Sprünge.',
    hintYouthAbschluss: 'Wieder kleine Spielformen auf mehreren Feldern, andere Spielidee als im ersten Block (Gleichzahl, Anspieler, Linie verteidigen, Über-/Unterzahl).',
    structSourceYouth: 'Nach der DFB-„Trainingsphilosophie Deutschland“ (2024): mindestens zweimal pro Woche diese Struktur, im Training nie größer als 4+TW gegen 4+TW.',
    youthPrinciplesTitle: 'Grundsätze für die Jugend',
    youthPrinciples: 'Freude, Intensität und Wiederholung in jeder Minute.|Mindestens 48 Minuten netto in kleinen Spielformen pro Spieler und Woche (ab U17: 32 Minuten).|Auf mehreren Feldern gleichzeitig spielen, damit niemand wartet.|Felder nach Entwicklungsstand einteilen, ab der C-Jugend auch nach Positionen.|Große Spielformen und gegnerorientierte Taktik gehören nicht ins Training dieser Altersklassen.|Kopfball bis zur C-Jugend nur mit Leicht- oder Schaumstoffbällen, auch danach ohne lange Wiederholungsserien.',
  },
  en: {
    title: 'Funino Weekly Planner',
    tagline: 'Kids’ soccer following Play – Practise – Play',
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
    includeRituals: 'Include rituals (welcome and closing circle)',
    startWhich: 'Session',
    focusOfWeek: 'Focus of the week',
    startTraining: '▶ Start training now',
    stepOf: 'Step {n} of {total}',
    remainingTotal: '{min} min left in total',
    timeUp: 'Time’s up, move on when you’re ready',
    upNext: 'Up next',
    back: '◀ Back',
    pause: '⏸ Pause',
    resume: '▶ Resume',
    nextExercise: 'Next exercise ▶',
    finishTraining: 'Finish training ✓',
    endTraining: 'Close training mode',
    trainingDone: 'Training done!',
    trainingDoneText: 'Well done. Now say goodbye to every child individually.',
    close: 'Close',
    print: 'Print',
    phase: 'Phase',
    all: 'All',
    themeAuto: 'Automatic (weekly rotation)',
    footer: 'Based on Horst Wein’s Funino and the DFB children’s soccer formats. Field sizes are guidelines.',
    footerYouth: 'Based on the DFB “Trainingsphilosophie Deutschland” (2024) and the DFB youth regulations. Field sizes are guidelines.',
    summaryTitle: 'Week {week} · {age} · Focus: {theme}',
    summaryLine: '{sessions} × {minutes} min · {players} kids · {level}. For the game blocks: <strong>{fields}</strong> ({field}), {goals} mini goals.',
    field1: '1 field',
    fieldN: '{n} fields',
    training: 'Session {n}',
    playHour: 'Play hour {n}',
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
    hintAufwaermen: 'Running, tag and relay games, ball school with different balls, easy dribbling tasks.',
    hintUebung: 'Practise the focus playfully, with and without an opponent, with both feet and many repetitions. Short waiting times.',
    hintSpielform: 'Small, free games without fixed positions (F: 1v1 to 3v3, E: up to 4v4, also with a goalkeeper), several fields.',
    hintAbschluss: 'Funino with the rules below, winners move up, losers move down.',
    structBambini: 'Bambini (G youth): a play hour instead of training. Activation – Play – Play – Play, with even numbers, no isolated technique drills, only short goal and dribbling challenges between the games. Ideally wrapped in a story.',
    structSource: 'Based on the DFB development table for children (children’s coach certificate): more playing than practising.',
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
    titleYouth: 'Youth Training Planner',
    taglineYouth: 'D to A youth following the DFB training philosophy: activation – game block – in-between block – game block',
    stageKids: 'Kids’ soccer',
    stageYouth: 'Youth soccer',
    stageLabel: 'Choose section',
    keepers: 'Goalkeepers',
    playersYouth: 'Number of players',
    summaryLineYouth: '{sessions} × {minutes} min · {players} players · {keepers} goalkeepers · {level}. For the game blocks: <strong>{fields}</strong> ({field}), each with a goal, a goalkeeper and 2 mini goals.',
    netPlay: 'Net playing time in small-sided games: about {net} min per player per week (DFB minimum: {min} min).',
    netPlayLow: 'Too little: the DFB recommends at least {min} min per week. Add sessions or longer game blocks.',
    fieldSplitHint: 'Split the fields by development, not by birth year: challenge early developers, don’t overwhelm late developers.',
    formatLabel: 'Format',
    blocksLabel: 'Rounds',
    blocksValue: '{count} × {minutes} min, {rest} min rest each',
    keepersNeeded: 'Goalkeepers',
    matchLength: 'Match',
    hintYouthAufwaermen: 'Ball mastery with a focus on dribbling and feints, tag games with and without the ball. Many actions, no waiting.',
    hintYouthSpielform: '1v1 up to 4+GK v 4+GK (plus up to 2 support players) on several fields, on goals. Rounds of 3–4 min net, 1–2 min rest.',
    hintYouthUebung: 'Technique and athletics with many repetitions: shooting, crosses, long balls, receiving, heading (up to C youth only with a light ball), sprints and jumps.',
    hintYouthAbschluss: 'Small-sided games on several fields again, with a different game idea than in the first block (equal numbers, support players, defending a line, overloads).',
    structSourceYouth: 'Based on the DFB “Trainingsphilosophie Deutschland” (2024): this structure at least twice a week, never bigger than 4+GK v 4+GK in training.',
    youthPrinciplesTitle: 'Principles for youth',
    youthPrinciples: 'Fun, intensity and repetition in every minute.|At least 48 minutes net of small-sided play per player per week (from U17: 32 minutes).|Play on several fields at once so nobody waits.|Split fields by development stage, from C youth also by position.|Large game formats and opponent-oriented tactics don’t belong in training at these ages.|Heading up to C youth only with light or foam balls, and never in long series of repetitions.',
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
    D: {
      label: 'D youth (U12–U13)',
      short: 'D youth',
      format: 'Matches 7v7 (9v9 in some regions). In training 1v1 up to 4+GK v 4+GK',
      field: 'Hybrid field about 33 × 25 m (double penalty area)',
      goals: 'Per field one youth goal (5 × 2 m) with a goalkeeper and 2 mini goals',
      matchLength: '2 × 30 minutes, up to 9 players, goals up to 5 × 2 m',
      ball: 'Size 4 (ultralight, 350 g) in matches',
    },
    C: {
      label: 'C youth (U14–U15)',
      short: 'C youth',
      format: 'Matches mostly 11v11 (7 to 11 players). In training 1v1 up to 4+GK v 4+GK',
      field: 'Hybrid field about 33 × 25 m (double penalty area)',
      goals: 'Per field one youth goal with a goalkeeper and 2 mini goals',
      matchLength: '2 × 35 minutes, full pitch with offside',
      ball: 'Size 5, light balls for heading practice',
    },
    B: {
      label: 'B youth (U16–U17)',
      short: 'B youth',
      format: 'Matches 11v11. In training 1v1 up to 4+GK v 4+GK',
      field: 'Hybrid field about 33 × 25 m (double penalty area)',
      goals: 'Per field one full-size goal with a goalkeeper and 2 mini goals',
      matchLength: '2 × 40 minutes, full pitch with offside',
      ball: 'Size 5, heading in short series',
    },
    A: {
      label: 'A youth (U18–U19)',
      short: 'A youth',
      format: 'Matches 11v11. In training 1v1 up to 4+GK v 4+GK',
      field: 'Hybrid field about 33 × 25 m (double penalty area)',
      goals: 'Per field one full-size goal with a goalkeeper and 2 mini goals',
      matchLength: '2 × 45 minutes, full pitch with offside',
      ball: 'Size 5, heading in short series',
    },
  },
  levels: {
    1: { label: 'Beginner', hint: 'More space, little pressure, few rules. Extra players only from F youth on, Bambini play with even numbers.' },
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
    flanken: 'Crosses & long balls',
    verteidigen: 'Defending as a unit',
    kopfball: 'Heading (with a light ball)',
    athletik: 'Speed & athletics',
  },
  phases: {
    aufwaermen: 'Activation',
    spielform: 'Play I',
    uebung: 'Practice (in-between block)',
    abschluss: 'Play II (Funino)',
  },
  phaseLabels: {
    G: { spielform: 'Play I', uebung: 'Play II (challenges)', abschluss: 'Play III (Funino)' },
    D: { spielform: 'Game block 1', uebung: 'In-between block', abschluss: 'Game block 2' },
    C: { spielform: 'Game block 1', uebung: 'In-between block', abschluss: 'Game block 2' },
    B: { spielform: 'Game block 1', uebung: 'In-between block', abschluss: 'Game block 2' },
    A: { spielform: 'Game block 1', uebung: 'In-between block', abschluss: 'Game block 2' },
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
// Phasenname, für Bambini mit eigenen Bezeichnungen (dort gibt es keinen Übungsblock).
export function phaseLabel(id, age = null) {
  const special = en() ? CONFIG_EN.phaseLabels[age]?.[id] : AGE_GROUPS[age]?.phaseLabels?.[id];
  return special ?? (en() ? CONFIG_EN.phases[id] : PHASES.find((p) => p.id === id)?.label ?? id);
}

export const sessionTitle = (n, age) => t(AGE_GROUPS[age]?.sessionKey ?? 'training', { n });
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
