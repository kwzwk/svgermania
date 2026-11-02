// Stammdaten: Altersklassen, Niveaus, Schwerpunkte und Trainingsphasen.
// Werte nach DFB-Spielformen im Kinderfußball (verbindlich ab 2024/25) und Horst Weins Funino.

export const AGE_GROUPS = {
  G: {
    id: 'G',
    label: 'G-Jugend / Bambini (U6–U7)',
    short: 'G-Jugend',
    format: '2 gegen 2 oder 3 gegen 3',
    playersPerField: 6, // 3v3, plus Wechselspieler
    field: '16 × 20 m bis 28 × 22 m',
    fieldSize: { w: 20, l: 25 },
    goals: '4 Minitore, kein Torwart',
    shootingZone: '2 gegen 2: Tore aus der eigenen Angriffshälfte. 3 gegen 3: nur aus der 6-m-Schusszone',
    ball: 'Größe 3',
    defaultMinutes: 60,
    themes: ['dribbling', 'koordination', '1v1', 'torschuss', 'orientierung'],
    // DFB: Bambini spielen nur (Aktivierung – Spielen – Spielen – Spielen), keine isolierte Technikschulung.
    sessionKey: 'playHour',
    phaseLabels: { spielform: 'Spielen I', uebung: 'Spielen II (Challenges)', abschluss: 'Spielen III (Funino)' },
  },
  F: {
    id: 'F',
    label: 'F-Jugend (U8–U9)',
    short: 'F-Jugend',
    format: '3 gegen 3 (empfohlen) oder 5 gegen 5',
    playersPerField: 8,
    field: '3 gegen 3: 26–28 × 20–22 m. 5 gegen 5: bis 40 × 25 m',
    fieldSize: { w: 21, l: 27 },
    goals: '4 Minitore, kein Torwart',
    shootingZone: '6-m-Schusszone vor jeder Grundlinie',
    ball: 'Größe 4 (Leichtball)',
    defaultMinutes: 75,
    themes: ['dribbling', '1v1', 'torschuss', 'finten', 'passen', 'orientierung'],
  },
  E: {
    id: 'E',
    label: 'E-Jugend (U10–U11)',
    short: 'E-Jugend',
    format: '5 gegen 5 oder 7 gegen 7 (im Training oft 3 gegen 3 / 4 gegen 4)',
    playersPerField: 8,
    field: '5 gegen 5: bis 40 × 25 m. 7 gegen 7: 55 × 35 m',
    fieldSize: { w: 22, l: 32 },
    goals: '5 gegen 5: 4 Minitore. 7 gegen 7: 2 Kleinfeldtore mit Torwart',
    shootingZone: '6-m-Schusszone (Funino)',
    ball: 'Größe 4',
    defaultMinutes: 90,
    themes: ['finten', '1v1', 'passen', 'orientierung', 'torschuss', 'umschalten', 'dribbling'],
  },
  // Jugend nach der DFB-"Trainingsphilosophie Deutschland" (2024): Aktivierung 15 – Spielblock 30 –
  // Zwischenblock 15 – Spielblock 30, im Training höchstens 4+TW gegen 4+TW (plus bis zu 2 Anspieler).
  D: {
    id: 'D',
    stage: 'youth',
    // Präventions-Aufwärmen in der Aktivierung (FIFA 11+ Kids unter 14, sonst FIFA 11+).
    prevention: '11plus-kids',
    label: 'D-Jugend (U12–U13)',
    short: 'D-Jugend',
    format: 'Wettspiel 7 gegen 7 (regional auch 9 gegen 9). Im Training 1 gegen 1 bis 4+TW gegen 4+TW',
    playersPerField: 10, // 4+TW gegen 4+TW
    field: 'Hybridfeld ca. 33 × 25 m (doppelter Strafraum)',
    fieldSize: { w: 25, l: 33 },
    goals: 'Pro Feld ein Jugendtor (5 × 2 m) mit Torwart und 2 Minitore',
    matchLength: '2 × 30 Minuten, bis zu 9 Spieler, Tore bis 5 × 2 m',
    ball: 'Größe 4 (Ultraleicht, 350 g) im Wettspiel',
    defaultMinutes: 90,
    minNetPlay: 48,
    themes: ['1v1', 'dribbling', 'finten', 'torschuss', 'passen', 'umschalten', 'orientierung', 'flanken'],
    phaseLabels: { spielform: 'Spielblock 1', uebung: 'Zwischenblock', abschluss: 'Spielblock 2' },
    phaseShares: [1 / 6, 1 / 3, 1 / 6, 1 / 3],
  },
  C: {
    id: 'C',
    stage: 'youth',
    prevention: '11plus',
    label: 'C-Jugend (U14–U15)',
    short: 'C-Jugend',
    format: 'Wettspiel meist 11 gegen 11 (7 bis 11 Spieler). Im Training 1 gegen 1 bis 4+TW gegen 4+TW',
    playersPerField: 10,
    field: 'Hybridfeld ca. 33 × 25 m (doppelter Strafraum)',
    fieldSize: { w: 25, l: 33 },
    goals: 'Pro Feld ein Jugendtor mit Torwart und 2 Minitore',
    matchLength: '2 × 35 Minuten, Großfeld mit Abseits',
    ball: 'Größe 5, Leichtbälle fürs Kopfballtraining',
    defaultMinutes: 90,
    minNetPlay: 48,
    themes: ['1v1', 'passen', 'umschalten', 'verteidigen', 'torschuss', 'flanken', 'orientierung', 'kopfball'],
    phaseLabels: { spielform: 'Spielblock 1', uebung: 'Zwischenblock', abschluss: 'Spielblock 2' },
    phaseShares: [1 / 6, 1 / 3, 1 / 6, 1 / 3],
  },
  B: {
    id: 'B',
    stage: 'youth',
    prevention: '11plus',
    label: 'B-Jugend (U16–U17)',
    short: 'B-Jugend',
    format: 'Wettspiel 11 gegen 11. Im Training 1 gegen 1 bis 4+TW gegen 4+TW',
    playersPerField: 10,
    field: 'Hybridfeld ca. 33 × 25 m (doppelter Strafraum)',
    fieldSize: { w: 25, l: 33 },
    goals: 'Pro Feld ein Großfeldtor mit Torwart und 2 Minitore',
    matchLength: '2 × 40 Minuten, Großfeld mit Abseits',
    ball: 'Größe 5, Kopfball in kurzen Serien',
    defaultMinutes: 90,
    // DFB: 48 min bis U16; der jüngere Jahrgang gibt den Mindestwert vor.
    minNetPlay: 48,
    themes: ['1v1', 'passen', 'umschalten', 'verteidigen', 'torschuss', 'flanken', 'kopfball', 'athletik'],
    phaseLabels: { spielform: 'Spielblock 1', uebung: 'Zwischenblock', abschluss: 'Spielblock 2' },
    phaseShares: [1 / 6, 1 / 3, 1 / 6, 1 / 3],
  },
  A: {
    id: 'A',
    stage: 'youth',
    prevention: '11plus',
    label: 'A-Jugend (U18–U19)',
    short: 'A-Jugend',
    format: 'Wettspiel 11 gegen 11. Im Training 1 gegen 1 bis 4+TW gegen 4+TW',
    playersPerField: 10,
    field: 'Hybridfeld ca. 33 × 25 m (doppelter Strafraum)',
    fieldSize: { w: 25, l: 33 },
    goals: 'Pro Feld ein Großfeldtor mit Torwart und 2 Minitore',
    matchLength: '2 × 45 Minuten, Großfeld mit Abseits',
    ball: 'Größe 5, Kopfball in kurzen Serien',
    defaultMinutes: 90,
    // DFB: ab U17 mindestens 32 min netto pro Woche.
    minNetPlay: 32,
    themes: ['1v1', 'passen', 'umschalten', 'verteidigen', 'torschuss', 'flanken', 'kopfball', 'athletik'],
    phaseLabels: { spielform: 'Spielblock 1', uebung: 'Zwischenblock', abschluss: 'Spielblock 2' },
    phaseShares: [1 / 6, 1 / 3, 1 / 6, 1 / 3],
  },
};

// Netto-Spielzeit im Spielblock: Durchgänge von 3–4 Minuten mit 1–2 Minuten Pause (DFB), also etwa zwei Drittel.
export const NET_PLAY_SHARE = 2 / 3;

// Das Niveau ändert nicht das Spielformat, sondern dreht an den "Stellschrauben"
// (Raum, Überzahl, Gegnerdruck, Regeln, Zeit).
export const LEVELS = {
  1: { id: 1, label: 'Einsteiger', hint: 'Mehr Raum, wenig Gegnerdruck, wenige Regeln. Überzahl erst ab F-Jugend, Bambini spielen in Gleichzahl.' },
  2: { id: 2, label: 'Fortgeschritten', hint: 'Grundform: gleiche Zahl, halbaktiver bis aktiver Gegner.' },
  3: { id: 3, label: 'Könner', hint: 'Weniger Raum und Zeit, aktiver Gegner, Zusatzregeln.' },
};

export const THEMES = {
  dribbling: 'Dribbeln & Ballführung',
  finten: 'Finten',
  '1v1': '1 gegen 1',
  torschuss: 'Torschuss',
  passen: 'Passen & Ballannahme',
  orientierung: 'Orientierung & Spielverlagerung',
  umschalten: 'Umschalten',
  koordination: 'Koordination & Bewegung',
  flanken: 'Flanken & Flugbälle',
  verteidigen: 'Verteidigen im Verbund',
  kopfball: 'Kopfball (mit Leichtball)',
  athletik: 'Schnelligkeit & Athletik',
};

// DFB-Trainingsstruktur: Aktivierung – Spielen – Üben – Spielen (mehr Spielen als Üben).
// Anteile pro Phase an der Trainingszeit; das letzte Spiel bekommt den Rest.
export const PHASES = [
  { id: 'aufwaermen', label: 'Aktivierung', share: 0.2 },
  { id: 'spielform', label: 'Spielen I', share: 0.25 },
  { id: 'uebung', label: 'Üben (Zwischenblock)', share: 0.25 },
  { id: 'abschluss', label: 'Spielen II (Funino)', share: 0.3 },
];

// Feste Rituale am Anfang und Ende jeder Einheit (Minuten). Ankommen läuft vor dem offiziellen Beginn.
export const RITUAL_MINUTES = { opening: 5, closing: 5 };
// Jugend: kurze Team- und Nachbesprechung statt Kreis, damit die Spielblöcke nicht schrumpfen.
export const RITUAL_MINUTES_YOUTH = { opening: 3, closing: 3 };
export const ritualMinutes = (age) => (AGE_GROUPS[age]?.stage === 'youth' ? RITUAL_MINUTES_YOUTH : RITUAL_MINUTES);

export const SESSION_LENGTHS = [45, 60, 75, 90, 105];

export const FUNINO_RULES = [
  'Kein Torwart, 4 Minitore: jedes Team greift zwei Tore an und verteidigt zwei.',
  'Tore zählen nur aus der Schusszone (6 m vor der Grundlinie).',
  'Wiederbeginn durch Einpassen oder Eindribbeln, Gegner mindestens 3 m entfernt.',
  'Nach jedem Tor wechselt jedes Team einen Spieler an der Mittellinie (Rotation).',
  'Liegt ein Team 3 Tore zurück, darf es einen Spieler mehr bringen, bis der Abstand kleiner ist.',
  'Kein Schiedsrichter: Die Kinder entscheiden selbst, Erwachsene begleiten.',
  'Foul in der Schusszone: 1 gegen 0 von der Mittellinie.',
];
