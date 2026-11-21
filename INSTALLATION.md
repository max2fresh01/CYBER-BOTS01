# Installation Update 2.0 DESERT PLANET (alle Phasen in einer ZIP)

Diese ZIP enthaelt alle neuen und geaenderten Dateien gegenueber `cyber-bots-vercel.zip` (Phasen 1-4). Es wird nichts geloescht.

1. ZIP entpacken. Die Ordnerstruktur entspricht deinem Projekt (`public/`, `lib/`, `api/`, `server/`, `test/`).
2. Alle Dateien ins Projekt kopieren und vorhandene ersetzen. (Hast du die Einzel-ZIPs Phase 1-4 schon eingespielt, ist diese ZIP trotzdem unbedenklich: gleicher Stand.)
3. Auf GitHub hochladen (Commit). Render bzw. Vercel deployen automatisch.
   - Render: Build Command `npm install`, Start Command `npm start`.
   - Vercel: wie in `VERCEL.md`.
4. Pruefen: Hauptmenue zeigt DESERT PLANET, WEAPONS (9 Waffen), SKINS; ONLINE -> CONNECT zeigt FRIENDS; im Raum erscheint VOICE CHAT. Sprachchat braucht HTTPS (Render/Vercel liefern es).

## API-Keys
Keine. (Nur falls du einen TURN-Dienst nutzt: dessen Zugangsdaten.)

## Umgebungsvariablen (alle optional)
| Variable | Zweck |
|---|---|
| `REDIS_URL` | Freundeslisten dauerhaft speichern (Render); auf Vercel fuer Multiplayer noetig |
| `STUN_URLS` | eigene STUN-Server, kommagetrennt (Standard: `stun:stun.l.google.com:19302`) |
| `TURN_URLS` | TURN-Server, z. B. `turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp` |
| `TURN_SECRET` | coturn `static-auth-secret`; der Server erzeugt kurzlebige Zugangsdaten |
| `TURN_USERNAME`, `TURN_CREDENTIAL` | Alternative: feste TURN-Zugangsdaten eines Anbieters |
| `PORT`, `ALLOWED_ORIGINS` | wie bisher |

Render braucht keine Pflicht-Variable. Ohne `REDIS_URL` gehen Freundeslisten beim Server-Neustart verloren. Ohne TURN scheitert Sprache hinter strengen Firewalls ("VOICE LINK FAILED"); einen kostenlosen TURN kann ich nicht zusichern.

## Durchgefuehrte Tests
- Phase 1: Migration alter Spielstand, Relikte, Geheimraum, Sandsturm, Bot-Durchlauf D1-D5 (Missionen, Bonus, Speichern), Bosskampf 3 Phasen, Kalibrierung
- Phase 2: 4 Waffen (Durchschlag, Salve, Kette+Betaeubung, Explosion), Kauf, Spielschleife je Waffe, Skins kaufen/ausruesten/freischalten, alter Spielstand, Mitspieler-Anzeige
- Phase 3: Freunde/Chat serverseitig (31 Checks, 3 Instanzen) und im Browser (2 Seiten)
- Phase 4: Sprachchat serverseitig (19 Checks) und im Browser (3 Seiten, Fake-Mikrofon, echte WebRTC-Verbindung mit Audio-Paketen, Mikrofon verweigert = nur Zuhoeren)
- `npm test`: 48 + 8 + 31 + 19 Checks, Browser-Raumtest 14; Regression Sektoren 1-9: 24 Checks ohne JS-Fehler
- Pruefung dieser ZIP: auf eine frische Kopie von `cyber-bots-vercel.zip` gelegt, `npm test` und Syntaxpruefung aller Dateien bestanden

## Offene Punkte / Einschraenkungen
- Kein Test auf echtem Render/Vercel/Redis, nicht im echten Internet zwischen verschiedenen Netzen, nicht mit Safari/Firefox/Handy, nicht mit echtem Controller, nicht von Hand gespielt (Balance nur per Bot).
- Kein TURN-Server vorhanden/getestet.
- "PLASMA BLASTER MK2" heisst so, weil die Starterwaffe schon "PLASMA BLASTER" heisst.
- Freunde ohne Konto: Freundes-ID haengt am Browser. Kein Wortfilter, keine Melde-Funktion, Altersangabe nur Selbstbestaetigung, keine Offline-Nachrichten, kein Push-to-Talk.
- Skins sind rein kosmetisch.
