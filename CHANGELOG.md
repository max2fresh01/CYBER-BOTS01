# CHANGELOG

## Update 2.0 - Phase 4: Sprachchat (setzt Phase 1-3 voraus)

### Neu
- WebRTC-Sprachchat nur zwischen Freunden im selben Raum; Signalisierung ueber den vorhandenen WebSocket, serverseitig geprueft (Freundschaft, beide im Sprachchat, Groessen- und Tempolimit)
- ICE-Konfiguration vom Server: STUN, optional TURN (feste oder kurzlebige Zugangsdaten per `TURN_SECRET`)
- Einwilligungsdialog (Datenschutz, Alter), Mikrofon-Abfrage, Nur-Zuhoeren-Modus, Mikrofon stumm (Taste V), Spieler stummschalten, Sprecheranzeige (Lobby + Spiel), Sprachleiste im Spiel
- Freundschaft beenden trennt die Sprachverbindung; Wiederverbinden nach Verbindungsabbruch stellt den Sprachchat wieder her
- WebSocket-Nachrichtengroesse von 2 KB auf 8 KB erhoeht (WebRTC-Angebote sind groesser)
- `vercel.json`: `Permissions-Policy` erlaubt Mikrofon fuer die eigene Seite (`microphone=(self)`)

### Neue Dateien
`lib/voice.js`, `public/js/voice.js`, `test/voice.js`

### Geaendert
`lib/rooms.js`, `lib/social.js`, `api/ws.js`, `server/dev.js`, `vercel.json`, `package.json`, `test/helpers.js`, `test/glue.js`, `test/run.js`, `public/index.html`, `public/css/style.css`, `public/js/net.js, friends.js, online.js`, `README.md`, `CHANGELOG.md`, `INSTALLATION.md`

## Update 2.0 - Phase 3: Freunde und Textchat (setzt Phase 1 und 2 voraus)

### Neu
- Freundesliste mit Freundes-ID (8 Zeichen), Anfragen annehmen/ablehnen/zurueckziehen, Freunde entfernen
- Online-Status (Punkt), Modus APPEAR OFFLINE, Einladungen in den eigenen Raum
- Privater Chat zwischen Freunden, Team-Chat in Lobby und im Spiel (ENTER), MUTE je Spieler, Chat ausblendbar
- Server-Pruefungen: nur Freunde duerfen schreiben/einladen, Limits (50 Freunde, 30 offene Anfragen), Rate-Limits, Textbereinigung (140 Zeichen, Steuerzeichen raus), Schluessel nur als SHA-256 gespeichert
- Funktioniert ueber mehrere Server-Instanzen (Pub/Sub); `npm test` enthaelt jetzt `test/social.js`

### Neue Dateien
`lib/social.js`, `public/js/friends.js`, `test/social.js`

### Geaendert
`lib/rooms.js`, `package.json`, `public/index.html`, `public/css/style.css`, `public/js/net.js, online.js`, `README.md`, `CHANGELOG.md`, `INSTALLATION.md`

### Hinweise
- Keine Konten/E-Mail: Die Freundes-ID liegt im localStorage des Browsers. Anderer Browser/Geraet = neue ID (oder Daten im Browser loeschen = ID weg).
- Ohne Redis liegt alles im Serverspeicher und ist nach einem Neustart weg (Render-Free schlaeft/startet neu). Fuer dauerhafte Freundeslisten `REDIS_URL` setzen.

## Update 2.0 - Phase 2: Waffen und Skins (setzt Phase 1 voraus)

### Neu
- LASER RIFLE (2.500 CR), PLASMA BLASTER MK2 (3.500 CR), ELECTRO GUN (5.500 CR), HEAVY CANNON (7.000 CR): Werte, Pixelmodell, Sound, Menue-Karte, Schadenssystem, Online-Anzeige
- SKINS-Menue: 5 Roboter-Skins, 5 Waffen-Skins (kosmetisch); DESERT SAND / DUNE BRASS / MAGMA frei durch Sieg in D1, D2, D5
- Mitspieler zeigen Waffe und Skins (Server leitet nur geprueft kurze Kennungen weiter)

### Neue Dateien
`public/js/weapons2.js`, `public/js/skins-ui.js`

### Geaendert
`public/js/game.js, sprites.js, render.js, storage.js, ui.js, net.js`, `public/index.html`, `public/css/style.css`, `lib/rooms.js`, `test/run.js`, `README.md`, `CHANGELOG.md`, `INSTALLATION.md`

### Spielstand
Neuer Bereich `skins`; gekaufte Waffen, Credits und Phase-1-Fortschritt bleiben erhalten.

### Hinweise
- Es gibt schon einen "PLASMA BLASTER" (Starterwaffe), daher heisst die neue Waffe "PLASMA BLASTER MK2".
- Skins aendern keine Werte.

## Update 2.0 - Phase 1: DESERT PLANET Kampagne

### Neu
- 5 Sektoren (ID 10-14): THE DUNES, DUST TOWN, OUTPOST 09, THE UNDERGROUND, THE CORE
- Boss DESERT TITAN mit 3 Phasen (66 % / 33 %), Adds, Granatenfaecher, Laserbalken, Stampf-Schockwelle, Feuerfeld
- Gegner: Desert Scout, Sand Guard (Frontschild), Combat Drone, Heavy Defender
- Sandstuerme als Wetter, Geheimraeume, 3 Relikte pro Sektor, 3 Missionen pro Sektor, Kampagnenbonus 3000 Credits
- Kampagnenuebersicht im Hauptmenue, Missionsanzeige im Ergebnisbildschirm
- Neue Hintergruende, Pixelgrafik, Musik und Soundeffekte (alles im Code erzeugt)
- `npm start` (Render/lokal), Raumserver kennt Sektoren 10-14

### Geaendert
`public/index.html`, `public/css/style.css`, `public/js/game.js, render.js, storage.js, ui.js, online.js`, `lib/rooms.js`, `package.json`, `README.md`, `VERCEL.md`

### Neue Dateien
`public/js/desert-config.js, desert-sprites.js, desert-enemies.js, desert-bg.js, desert.js, desert-ui.js, audio-desert.js`, `CHANGELOG.md`, `INSTALLATION.md`

### Spielstand
Alter Spielstand (`cyberbots-save-v1`) bleibt erhalten; neuer Bereich `desert` wird automatisch angelegt.

### Noch NICHT enthalten (spaetere Phasen)
Phase 3: Freundesliste, Textchat. Phase 4: Sprachchat (WebRTC).
