# CYBER BOTS

2D pixel-art robot shooter in NEON CITY. Plain HTML5 + CSS3 + JavaScript, drawn on a canvas.
No libraries, no build step, no external requests. All graphics and sounds are generated in code.

## Deploy on Netlify
Drag this folder (or the ZIP) onto https://app.netlify.com/drop - no build settings needed.
The game also runs by simply opening `index.html` in a browser.

## Controls
| Key | Action |
| --- | --- |
| A / D | Move |
| Space | Jump (S = drop through platforms) |
| Mouse | Aim |
| Left mouse button | Shoot |
| Q (or E / Shift) | Special ability |
| F | Toggle auto-fire |
| ESC | Pause |

Phones and tablets get on-screen touch controls automatically (landscape mode).

### Xbox controller (Gamepad API, standard mapping)
Connect the controller and press any button once (browsers only expose it after that).

| Input | Action |
|---|---|
| Left stick / D-pad | Move |
| A | Jump |
| Right stick | Aim (crosshair is shown) |
| RT / RB | Shoot |
| B / X / LB | Special ability |
| Y | Toggle auto-fire |
| Start | Pause / resume |
| Menus: D-pad or left stick, A = select, B = back | |

Vibration can be switched off in SETTINGS. Unplugging the controller during a run pauses the game.

## Project structure
```
index.html          page, menus, HUD markup
css/style.css       neon UI styling, responsive layout, touch controls
js/config.js        robots, weapons, enemies, sectors, upgrades, themes (all balance values)
js/storage.js       LocalStorage save system (validated on load)
js/audio.js         Web Audio sound effects + synth music (track system)
js/audio-space.js   extra SFX and one music track per space sector
js/input.js         keyboard, mouse, touch and gamepad input
js/sprites.js       procedural pixel-art sprites (robots, enemies, weapons)
js/background.js    parallax NEON CITY backgrounds, rain, signs, smoke, traffic
js/hazards.js       sector hazards: laser gates, vents, acid, portals, gravity wells, meteors, crates ...
js/space-config.js  space themes, enemies, pickups and sectors 05-09
js/space-enemies*.js enemy and boss AI of the space sectors
js/space-sprites.js pixel-art sprites of the space enemies and bosses
js/space-bg.js      pixel-art backgrounds of the space sectors
js/game.js          game logic (fixed 60 Hz timestep, frame-rate independent)
js/render.js        canvas drawing
js/ui.js            menus, HUD, shop, settings
js/main.js          boot + main loop
```

## Content
* 5 robots: Mini-Bot, Standard-Bot, Heavy-Bot, Titan-Bot, Colossus - each with own stats and special ability
* 5 weapons: Plasma Blaster, Double Blaster, Electro Cannon, Rocket Launcher, Plasma Cannon
* 5 enemy types + boss (Neon Warden) that detect, chase and attack the player
* 4 sectors in NEON CITY: Downtown, Factory Row, Core Tower (boss), Overdrive (endless)
* 5 additional space sectors (unlocked one after the other, starting after Core Tower; saved like all progress):

| Sector | Setting | New mechanics | Boss | Reward |
| --- | --- | --- | --- | --- |
| 05 ORBITAL STATION | space station | laser gates, low gravity, solid crates; shield guards, laser towers, kamikaze drones | STATION SENTINEL (salvos, laser grid, dash, drones) | STATION KEYCARD |
| 06 REACTOR CORE | damaged ship | steam vents, explosive energy cores; golems, lobbers, meltdown drones | REACTOR boss (charged / vented cycle - only open when vented) | REACTOR ROD |
| 07 VOID LABORATORY | research ship | acid pools, one-way portals (walk right into the entrance, exit is skipped ahead); phase stalkers (teleport), splitting blobs, homing wisps | ABERRATION (rift beams, clones - damage reduced while clones live) | VOID SAMPLE |
| 08 DREADNOUGHT | hostile warship | conveyor belts, crosswinds, armour cover; elites with charge, mortars, gunships, cannons | LEVIATHAN (salvo, sweeping beam, shell carpet, armour phases with elite reinforcements) | WAR ENGINE CORE |
| 09 THE LAST FRONTIER | final sector | gravity wells, meteor storms, moving platforms; wraiths (dive), knights (shield cycle) | THE LAST SOVEREIGN (3 phases: star spiral, ring waves + gravity, supernova + rotating beams) | FRONTIER CROWN |

Difficulty rises continuously (enemy HP x1.9 -> x3.6, damage x1.3 -> x2.1, quota 28 -> 36, boss HP 3000 -> 6500).
Each sector has its own pixel-art background, colour palette, music track and sound effects, pickups and a first-clear bonus.
* 5 upgrades with 10 levels each; progress is saved automatically in the browser


## Online co-op (multiplayer rooms, Vercel WebSocket Functions)

The ONLINE CO-OP button in the main menu opens the room system (up to 4 players). The multiplayer backend runs as an official
**Vercel WebSocket Function** (`api/ws.js`) with a shared **Redis** store - no separate game server (no Render) is needed.
Full publishing guide in German: **VERCEL.md**.

    npm install
    npm run dev        # local: http://localhost:8080  (same room logic, in-memory store; set REDIS_URL to use Redis)
    npm test           # multiplayer logic: 3 simulated instances sharing one store + Redis glue + api/ws.js
    npm run test:browser   # optional: two real browsers (needs Playwright)

**Rooms:** CREATE ROOM gives a random 6-character code (alphabet without I/O/0/1), optionally listed publicly. Others join by code or from the
room list. The lobby shows all players with a [HOST] marker and READY status. The host picks the sector (01-09) and presses START once all
other players are READY. The host leaves or stays away longer than 25 s -> the next player becomes host.
Health check: `https://<your-domain>/api/health`.

**Reconnect:** the client reconnects automatically (1 s -> 30 s backoff). It identifies itself with a secret session token (kept only in the
tab's sessionStorage), the server sends the full room state again and a running game continues. Players get a 25 s grace period before they are
removed from the room.

**What is shared:** every player runs his own game; the server relays positions. You see teammates as labelled ghost robots with HP bar,
a team list with kill counts, and a message when a teammate finishes or drops out. Enemies/bosses are **not** synchronised between players
(it is a "co-op race", not shared enemies). Every player's save/progress stays local.


## Update 2.0 - DESERT PLANET (Phase 1: Wuestenkampagne)

Neue Kampagne mit 5 Sektoren (Hauptmenue -> DESERT PLANET): D1 THE DUNES, D2 DUST TOWN, D3 OUTPOST 09, D4 THE UNDERGROUND, D5 THE CORE (Boss DESERT TITAN, 3 Phasen).
- D1 ist von Anfang an spielbar, danach schaltet jeder Sektor den naechsten frei. Die Sektoren 1-9 bleiben unveraendert.
- Pro Sektor: 3 Missionen (einmalige Credit-Belohnung), 3 Relikte, ein Geheimraum und Sandstuerme als Wetter. 3000 Credits Bonus fuer alle 15 Missionen.
- Neue Gegner: Desert Scout, Sand Guard, Combat Drone, Heavy Defender.
- Fortschritt liegt im Spielstand unter `desert` (alte Spielstaende werden automatisch migriert).
- Online-Raeume unterstuetzen die Wuestensektoren (Sektor-IDs 10-14).

### Update 2.0 - Phase 2: Neue Waffen und Skins
- 4 neue Waffen im WEAPONS-Menue: LASER RIFLE (Strahl durchschlaegt alle Gegner in Linie), PLASMA BLASTER MK2 (3er-Salve), ELECTRO GUN (zielt automatisch, Blitzkette ueber 4 Gegner, betaeubt kurz; Bosse und feste Geschuetze werden nicht betaeubt), HEAVY CANNON (grosse Explosion, starker Rueckstoss).
  Der urspruengliche Starter "PLASMA BLASTER" bleibt unveraendert, deshalb heisst die neue Salvenwaffe MK2.
- Neues Menue SKINS: 5 Roboter-Skins und 5 Waffen-Skins (rein kosmetisch). Teils gegen Credits, teils frei durch Sieg in der Wuestenkampagne (D1, D2, D5).
- Im Online-Spiel sehen Mitspieler deine Waffe und deine Skins.

### Update 2.0 - Phase 3: Freunde und Textchat
Im ONLINE-Menue (nach CONNECT):
- **Freundes-ID:** Jeder Browser bekommt eine zufaellige 8-stellige ID (z. B. `4TFL-T882`). ID weitergeben, beim Freund unter ADD FRIEND eintragen, der bestaetigt per ACCEPT.
- Online-Status, Freunde in den eigenen Raum **einladen** (Banner mit JOIN), **privater Chat** zwischen Freunden, Modus **APPEAR OFFLINE**.
- **Team-Chat** in Lobby und im Spiel (ENTER druecken), MUTE pro Mitspieler, Chat ein/aus.
- Gespeichert werden nur ID, Name und Freundesliste - keine Chatverlaeufe. Ohne Redis (`REDIS_URL`) gehen Freundeslisten beim Neustart des Servers verloren; mit Redis bleiben sie erhalten.

### Update 2.0 - Phase 4: Sprachchat (WebRTC)
- Im Raum unter VOICE CHAT: **JOIN VOICE**. Es gibt einen Einwilligungsdialog (Datenschutz, Altershinweis ab 16 bzw. mit Erlaubnis der Eltern), danach fragt der Browser nach dem Mikrofon.
- Sprechen koennen nur **Freunde im selben Raum** (der Server verwirft sonst die Signalisierung). Mikrofon stumm ([V] oder Knopf), Spieler stummschalten (MUTE), Sprecheranzeige in Lobby und im Spiel.
- Ohne Mikrofon-Erlaubnis: nur Zuhoeren. Textchat bleibt als Alternative.
- Audio wird nie aufgenommen oder gespeichert. Es laeuft direkt zwischen den Browsern; hinter strengen Firewalls braucht es einen **TURN-Server** (Variablen siehe INSTALLATION.md).

### Start auf Render (oder lokal)
`npm install` und `npm start` - startet `server/dev.js` (Spiel + WebSocket unter `/api/ws`, Raeume im Arbeitsspeicher, eine Instanz). Kein Redis und keine API-Keys noetig. Optional: `PORT`, `ALLOWED_ORIGINS`.
Auf Vercel gilt weiter `VERCEL.md` (dort wird Redis fuer Raeume gebraucht).

## Characters (replace the old playable robots)

Five human characters are the only playable figures. All are free to choose (menu: CHARACTERS), the choice is saved.
Cyber Bots is not a team game: every character is played alone with exactly one ability that works on its own.

| Character | Class | Ability | Cooldown | Gameplay effect |
| --- | --- | --- | --- | --- |
| NOVA | Hacker | NEURON-BOOST | 45 s | Takes over the nearest enemy bot (range 300 px, not bosses) for 10 s. It fights the other enemies for you. No target = no cooldown used. |
| ROX | Technikerin | DROHNEN-SCHWARM | 50 s | 3 combat drones for 22 s: fly on their own, shoot enemies, absorb enemy shots (distraction). |
| KAI | Soldat | OVERLOAD-SCHUSS | 40 s | Piercing energy shot along your aim (420 px), 3.2x ability damage to every enemy on the line, destroys enemy shots. |
| DR. LIRA | Strategin | TAKTISCHE ANALYSE | 60 s | +50 % own attack damage for 15 s. |
| ZANE | Supporter | REPARATUR-FIELD | 50 s | Repair field for 3 s: restores about 48 % of own max HP and clears negative effects. |

Activate with **Q** (keyboard), **B / X / LB** (controller) or the **SP** touch button. The HUD shows icon, name and the cooldown; during the cooldown the ability is locked.
Old saves keep credits, weapons, upgrades and sector progress; an old robot selection becomes NOVA. Enemy robots, bosses and NPCs are unchanged.
Files: `js/char-sprites.js` (pixel art + ability icons), `js/config.js` (CB.CHARACTERS), `js/game.js` (abilities), `js/ui.js` (select screen).


## Difficulty

* **Selection:** on the sector screen (before LAUNCH) choose **EASY / MEDIUM / HARD**. The choice is saved. MEDIUM is the default.
  - EASY: enemy HP x0.7, damage taken x0.6, credits x0.75
  - MEDIUM: standard values
  - HARD: enemy HP x1.5, damage taken x1.5, credits x1.5
  The multipliers apply to normal enemies, bosses, enemy shots and hazards (lasers, acid, meteors ...). A non-medium level is shown in the sector banner.
* **All sectors equally hard:** all nine sectors use the same kill quota (24), the same number of simultaneous enemies (6) and the same boss life (3500).
  Because the enemy types differ per sector, each sector's HP/damage multiplier was calibrated with a bot so that the damage taken per minute lands in the same range
  (about 90-150 HP/min for the test bot on MEDIUM). Sector 4 (endless) keeps its rising difficulty over time.
