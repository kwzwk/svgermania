# Trainings-Wochenplaner (SV Germania)

Ein Werkzeug für Kinder- und Jugendtrainer: Altersklasse und Niveau wählen, und man bekommt einen Wochenplan mit Übungen. Im Kinderfußball (G- bis E-Jugend) nach dem Funino-Prinzip (Spielen – Üben – Spielen), in der D- bis A-Jugend nach der DFB-„Trainingsphilosophie Deutschland“ (Aktivierung – Spielblock – Zwischenblock – Spielblock).

Live: https://scg.geyen.org

## Was es kann

- **Kinder / Jugend**: Die Altersklasse entscheidet: Die Liste ist gruppiert in Kinderfußball (G, F, E) und Jugendfußball (D, C, B, A). Untertitel, Torhüter-Feld, Katalog und die Seite „Ablauf & Regeln“ folgen der gewählten Altersklasse.
- **Jugend (D bis A)**: Einheiten im Verhältnis 15/30/15/30 Minuten (bei 90 min), Spielformen nie größer als 4+TW gegen 4+TW (plus bis zu 2 Anspieler), Durchgänge von 3–4 min mit Pause. Ein Feld „Torhüter“ blendet Übungen aus, die mehr Torhüter brauchen. Statt Begrüßungs- und Abschlusskreis gibt es eine kurze Teambesprechung und Nachbesprechung (je 3 Minuten), ab der C-Jugend mit eigenen Ritualen, die die Spieler selbst führen (Ziel der Einheit, Szene aus dem letzten Spiel, Reflexion, Feedback in Paaren). Die Aktivierung ist standardmäßig ein Präventions-Aufwärmen nach FIFA 11+ Kids (D-Jugend) bzw. FIFA 11+ (C bis A) in eigener Kurzbeschreibung (`data/prevention.json`), die Stufe folgt dem Niveau der Einheit; abschaltbar im Formular (`prev=0` im Link). Der Plan zeigt die geschätzte Netto-Spielzeit pro Spieler und Woche und warnt unter dem DFB-Mindestwert (48 Minuten, in der A-Jugend 32 Minuten).
- **Wochenplan**: Altersklasse, Niveau (Einsteiger, Fortgeschritten, Könner), Einheiten pro Woche, Trainingstage, Dauer, Anzahl Kinder, Schwerpunkt und Kalenderwoche einstellen. Der Plan zeigt die Trainingszeit pro Woche.
- **Einheiten pro Woche nach Alter**: höchstens 2 in der G- und F-Jugend, 3 in E und D, 4 in der C-Jugend, 5 in B und A (`maxSessions` in `js/config.js`). Kinder sollen zusätzlich frei spielen statt mehr organisiert trainieren.
- **Trainingstage und Spieltag**: Die Trainingstage sind Wochentag-Schalter (`days=2,4` im Link); sie bestimmen die Zahl der Einheiten. In der Jugend gibt es dazu einen Spieltag (`match=6`): Ohne gewählte Tage verteilt der Planer die Einheiten vor das Spiel. Die Einheit am Tag vor dem Spiel ist kurz und knackig ohne Steigerung, am Tag nach dem Spiel locker für alle, die viel gespielt haben. Die erste Einheit nach dem Spiel greift in der Teambesprechung eine Szene aus dem Spiel auf.
- **Drei-Wochen-Blöcke**: Ein Schwerpunkt gilt drei Wochen. Woche 1 auf dem gewählten Niveau, Woche 2 ab der zweiten Einheit eine Stufe schwerer, Woche 3 durchgehend eine Stufe schwerer; danach kommt der nächste Schwerpunkt.
- **Ankerspiel**: Spielblock 1 (bzw. Spielen I) bleibt über alle Einheiten des Blocks gleich, damit die Spieler die Regeln kennen und sich auf die Lösung konzentrieren. Die anderen Phasen wechseln.
- **Torhüter-Station (Jugend)**: Ist mindestens ein Torhüter eingetragen, läuft parallel zum Zwischenblock eine Torwartübung mit dem Co-Trainer (`role: "keeper"` in `data/exercises.json`, 9 Übungen von Grundstellung bis Spieleröffnung).
- **Für zu Hause und den Bolzplatz**: Unter dem Plan stehen zwei freiwillige Aufgaben zum Schwerpunkt und ein Vorschlag für freies Spielen (`data/home.json`).
- **Fester Ablauf jeder Einheit**: Ankommen (jedes Kind wird persönlich begrüßt), Begrüßungskreis mit einem Ritual zum Ankommen und Kennenlernen, dann nach der DFB-Entwicklungstabelle Aktivierung, Spielen I, Üben und Spielen II (Funino), zum Schluss ein Abschlusskreis mit Lob, Teamruf und Verabschiedung. Die Rituale wechseln von Einheit zu Einheit und passen zur Altersklasse.
- **Bambini-Spielstunde**: Für die G-Jugend gibt es keinen Übungsblock, sondern Aktivierung – Spielen – Spielen – Spielen mit kurzen Challenges, in Gleichzahl und ohne isolierte Technikschulung.
- **Rituale abschaltbar**: Ohne Haken bei „Rituale einplanen“ entfallen Begrüßungs- und Abschlusskreis, die Zeit geht an die Übungsphasen.
- **Eigener Plan**: Im Tab „Eigener Plan“ stellt man eine Einheit selbst aus den vorhandenen Übungen zusammen: Übungen hinzufügen (Filter nach Phase und Schwerpunkt), Minuten anpassen, Reihenfolge mit ↑/↓ ändern. Rituale (Ankommen, Begrüßungs- und Abschlusskreis bzw. Team- und Nachbesprechung) lassen sich ein- und ausschalten und einzeln auswählen. Der ganze Plan steckt im Link (`#custom?...`), „Link teilen“ öffnet auf dem Handy das Teilen-Menü, sonst wird kopiert. Drucken und Trainingsmodus funktionieren wie beim Wochenplan.
- **Trainingsmodus**: „Training jetzt starten“ unter dem Plan führt im Vollbild Schritt für Schritt durch die gewählte Einheit, mit Countdown pro Übung, Signal (Ton und Vibration) bei Ablauf, Pause, Zurück und Nächste Übung. Das Display bleibt dabei an.
- **Niveau als Stellschraube**: Das Niveau ändert nicht das Spielformat, sondern zeigt für jede Übung die leichtere oder schwerere Variante. Über den Drei-Wochen-Block geht es eine Stufe schwerer (siehe oben).
- **Schwerpunkt pro Block**: automatisch alle drei Wochen neu nach Kalenderwoche oder fest gewählt.
- **Deutsch / Englisch** per Knopf oben rechts (oder `?lang=en` im Link), inklusive aller Übungen und Rituale.
- **Hell / Dunkel / Automatisch** per Knopf oben rechts, die Wahl wird im Browser gespeichert.
- **Logo**: eine Datei `img/logo.svg` erscheint oben links (siehe `img/README.md`).
- **Teilen und Drucken**: Alle Einstellungen stehen in der URL. "Drucken" klappt alle Übungen auf.
- **Übungskatalog** mit Filtern und eine Seite mit dem **Ablauf einer Einheit**, den **Funino-Regeln** und DFB-Formaten je Altersklasse.

## Aufbau

Eine statische Website ohne Build-Schritt und ohne Backend.

| Datei | Inhalt |
|---|---|
| `index.html`, `css/style.css` | Oberfläche |
| `js/config.js` | Altersklassen (mit `stage` kids/youth), Niveaus, Schwerpunkte, Phasen, Funino-Regeln |
| `js/generator.js` | Plan-Generator (reine Funktionen, auch in Node testbar) |
| `js/custom.js` | Eigener Plan: Link-Kodierung und Aufbau der Einheit (reine Funktionen) |
| `js/app.js` | Formular, Darstellung, Katalog |
| `data/exercises.json` | Übungsdatenbank |
| `js/i18n.js`, `data/*.en.json` | Englische Texte und Übersetzungen |
| `data/home.json` | Aufgaben für zu Hause und freies Spielen, je Schwerpunkt (de/en in einer Datei) |
| `data/rituals.json` | Trainer-Grundsätze und Rituale für Ankommen, Begrüßungs- und Abschlusskreis |
| `img/exercises/`, `tools/exercise-gifs/` | Animierte Draufsicht pro Übung (de/en) und der Renderer dazu: `python3 tools/exercise-gifs/render.py --all` (braucht Pillow) |
| `test/` | Tests (`npm test`) |

## Lokal starten

```sh
npm start        # oder: python3 -m http.server 8080
# http://localhost:8080 öffnen
npm test
```

Die Seite lädt `data/exercises.json` per `fetch`, deshalb funktioniert sie nicht als direkt geöffnete Datei.

## Eine Übung hinzufügen

Einen Eintrag in `data/exercises.json` ergänzen:

```json
{
  "id": "ue-meine-uebung",
  "name": "Name der Übung",
  "phase": "aufwaermen | spielform | uebung | abschluss",
  "ages": ["G", "F", "E"],
  "levels": [1, 2, 3],
  "themes": ["dribbling", "finten", "1v1", "torschuss", "passen", "orientierung", "umschalten", "koordination"],
  "players": { "min": 4, "max": 16 },
  "field": "20 × 20 m",
  "material": "Bälle, Hütchen",
  "setup": "Aufbau in einem Satz.",
  "rules": ["Schritt 1", "Schritt 2"],
  "easier": "Leichtere Variante",
  "harder": "Schwerere Variante",
  "questions": ["Frage an die Kinder?"]
}
```

Für die Jugend (D bis A) gibt es optional:

```json
  "family": "gleichzahl | anspieler | linie | ueberzahl",
  "format": "4+TW gegen 4+TW",
  "goalkeepers": 1,
  "blocks": { "count": 4, "minutes": 4, "rest": 1 }
```

`family` ist eine der vier DFB-Spielfamilien, `goalkeepers` die Zahl der nötigen Torhüter (der Generator filtert danach), `blocks` die Durchgänge (Anzahl, Minuten netto, Pause). Torwartübungen bekommen `"role": "keeper"`, `"phase": "uebung"` und `"goalkeepers": 1`; sie erscheinen nur als Torhüter-Station, nie als Übung für alle.

Rituale werden genauso in `data/rituals.json` ergänzt (`arrival`, `opening` oder `closing`, jeweils mit `id`, `name`, `ages`, `steps`, `tip`). Für die Jugend gelten `principlesYouth` und `standardYouth` statt `principles` und `standard`.

Neue Übungen und Rituale brauchen auch einen englischen Eintrag in `data/exercises.en.json` bzw. `data/rituals.en.json` (gleiche `id`); `npm test` prüft das.

`levels` ist optional (ohne Angabe passt die Übung zu allen Niveaus). `npm test` prüft, dass alle Felder gültig sind und jede Altersklasse in jeder Phase genug Übungen hat.

## Hosting

Jeder statische Webserver reicht: einfach den Repository-Inhalt ausliefern. Für GitHub Pages liegt eine `CNAME`-Datei für `scg.geyen.org` bei. Dafür in den Repository-Einstellungen unter Pages "Deploy from a branch" mit `main` / `(root)` wählen und beim DNS-Anbieter einen CNAME-Eintrag `svgermania` → `kwzwk.github.io` anlegen.

## Grundlage

Horst Weins Funino und die DFB-Spielformen im Kinderfußball (verbindlich seit 2024/25), für die D- bis A-Jugend die DFB-„Trainingsphilosophie Deutschland“ (2024) und die DFB-Jugendordnung. Feldmaße sind Richtwerte. Die Übungen sind eigene Beschreibungen, angelehnt an gängige Spielformen.

## Docker

Bei jedem Push auf `main` baut GitHub Actions automatisch ein Image (amd64 und arm64) und veröffentlicht es als `ghcr.io/kwzwk/svgermania:latest`. Tags `v*` erzeugen zusätzlich Versions-Tags und ein GitHub-Release. Ein Tag mit Varianten-Suffix wie `v1.0.0-u11` liefert `:1.0.0-u11` und `:u11-latest`; der Release-Titel ist die Nachricht des annotierten Tags:

```sh
git tag -a v1.0.0-u11 -m "1.0 (u11)" && git push origin v1.0.0-u11
```

Der Container liefert die Seite mit nginx auf Port **8080** aus (ohne Root), mit Healthcheck unter `/healthz`.

```sh
docker compose up -d          # nutzt docker-compose.yml
# oder
docker run -d --name svgermania --restart unless-stopped -p 127.0.0.1:8080:8080 ghcr.io/kwzwk/svgermania:latest
```

Im Reverse Proxy `scg.geyen.org` auf `http://<server>:8080` weiterleiten. Updates holen mit `docker compose pull && docker compose up -d` (oder automatisch mit Watchtower).

Falls das Paket auf GitHub privat ist: entweder unter *Package settings* auf "Public" stellen oder auf dem Server mit `docker login ghcr.io` und einem Token mit `read:packages` anmelden.

Lokal bauen: `docker build -t svgermania . && docker run -p 8080:8080 svgermania`
