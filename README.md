# Funino-Wochenplaner (SV Germania)

Ein Werkzeug für Kindertrainer: Altersklasse und Niveau wählen, und man bekommt einen Wochenplan mit Übungen nach dem Funino-Prinzip (Spielen – Üben – Spielen).

Live: https://svgermania.geyen.org

## Was es kann

- **Wochenplan**: Altersklasse (G-, F-, E-Jugend), Niveau (Einsteiger, Fortgeschritten, Könner), Einheiten pro Woche, Dauer, Anzahl Kinder, Schwerpunkt und Kalenderwoche einstellen. Jede Einheit hat vier Phasen: Aufwärmspiel, Übungsform, Spielform und ein Funino-Abschlussspiel.
- **Niveau als Stellschraube**: Das Niveau ändert nicht das Spielformat, sondern zeigt für jede Übung die leichtere oder schwerere Variante. Ab der zweiten Einheit der Woche geht es eine Stufe schwerer.
- **Schwerpunkt pro Woche**: automatisch rotierend nach Kalenderwoche oder fest gewählt.
- **Teilen und Drucken**: Alle Einstellungen stehen in der URL. "Drucken" klappt alle Übungen auf.
- **Übungskatalog** mit Filtern und eine Seite mit den **Funino-Regeln** und DFB-Formaten je Altersklasse.

## Aufbau

Eine statische Website ohne Build-Schritt und ohne Backend.

| Datei | Inhalt |
|---|---|
| `index.html`, `css/style.css` | Oberfläche |
| `js/config.js` | Altersklassen, Niveaus, Schwerpunkte, Phasen, Funino-Regeln |
| `js/generator.js` | Plan-Generator (reine Funktionen, auch in Node testbar) |
| `js/app.js` | Formular, Darstellung, Katalog |
| `data/exercises.json` | Übungsdatenbank |
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
  "phase": "aufwaermen | uebung | spielform | abschluss",
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

`levels` ist optional (ohne Angabe passt die Übung zu allen Niveaus). `npm test` prüft, dass alle Felder gültig sind und jede Altersklasse in jeder Phase genug Übungen hat.

## Hosting

Jeder statische Webserver reicht: einfach den Repository-Inhalt ausliefern. Für GitHub Pages liegt eine `CNAME`-Datei für `svgermania.geyen.org` bei. Dafür in den Repository-Einstellungen unter Pages "Deploy from a branch" mit `main` / `(root)` wählen und beim DNS-Anbieter einen CNAME-Eintrag `svgermania` → `kwzwk.github.io` anlegen.

## Grundlage

Horst Weins Funino und die DFB-Spielformen im Kinderfußball (verbindlich seit 2024/25). Feldmaße sind Richtwerte. Die Übungen sind eigene Beschreibungen, angelehnt an gängige Spielformen.

## Docker

Bei jedem Push auf `main` baut GitHub Actions automatisch ein Image (amd64 und arm64) und veröffentlicht es als `ghcr.io/kwzwk/svgermania:latest`. Tags `v*` erzeugen zusätzlich Versions-Tags.

Der Container liefert die Seite mit nginx auf Port **8080** aus (ohne Root), mit Healthcheck unter `/healthz`.

```sh
docker compose up -d          # nutzt docker-compose.yml
# oder
docker run -d --name svgermania --restart unless-stopped -p 127.0.0.1:8080:8080 ghcr.io/kwzwk/svgermania:latest
```

Im Reverse Proxy `svgermania.geyen.org` auf `http://<server>:8080` weiterleiten. Updates holen mit `docker compose pull && docker compose up -d` (oder automatisch mit Watchtower).

Falls das Paket auf GitHub privat ist: entweder unter *Package settings* auf "Public" stellen oder auf dem Server mit `docker login ghcr.io` und einem Token mit `read:packages` anmelden.

Lokal bauen: `docker build -t svgermania . && docker run -p 8080:8080 svgermania`
