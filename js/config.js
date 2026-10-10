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
};

// Das Niveau ändert nicht das Spielformat, sondern dreht an den "Stellschrauben"
// (Raum, Überzahl, Gegnerdruck, Regeln, Zeit).
export const LEVELS = {
  1: { id: 1, label: 'Einsteiger', hint: 'Mehr Raum, Überzahl, wenig Gegnerdruck, wenige Regeln.' },
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
};

// Spielen – Üben – Spielen. Anteile pro Phase an der Trainingszeit.
export const PHASES = [
  { id: 'aufwaermen', label: 'Einstieg / Aufwärmspiel', share: 0.17 },
  { id: 'uebung', label: 'Hinführung / Übungsform', share: 0.25 },
  { id: 'spielform', label: 'Spielform', share: 0.28 },
  { id: 'abschluss', label: 'Abschlussspiel (Funino)', share: 0.3 },
];

export const SESSION_LENGTHS = [45, 60, 75, 90];

export const FUNINO_RULES = [
  'Kein Torwart, 4 Minitore: jedes Team greift zwei Tore an und verteidigt zwei.',
  'Tore zählen nur aus der Schusszone (6 m vor der Grundlinie).',
  'Wiederbeginn durch Einpassen oder Eindribbeln, Gegner mindestens 3 m entfernt.',
  'Nach jedem Tor wechselt jedes Team einen Spieler an der Mittellinie (Rotation).',
  'Liegt ein Team 3 Tore zurück, darf es einen Spieler mehr bringen, bis der Abstand kleiner ist.',
  'Kein Schiedsrichter: Die Kinder entscheiden selbst, Erwachsene begleiten.',
  'Foul in der Schusszone: 1 gegen 0 von der Mittellinie.',
];
