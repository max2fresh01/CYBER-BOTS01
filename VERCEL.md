# CYBER BOTS auf Vercel veröffentlichen (Multiplayer mit Vercel WebSocket Functions)

Dieses Projekt ist das bestehende Spiel – nur das Online-Backend wurde umgezogen. **Kein Render-Server mehr nötig.**

## Was läuft wo?

| Teil | Wo | Datei |
| --- | --- | --- |
| Spiel (HTML/CSS/JS) | Vercel (statisch, Ordner `public/`) | `public/…` |
| WebSocket-Endpunkt | Vercel Function (Node.js, Fluid compute) | `api/ws.js` → `wss://DEINE-DOMAIN/api/ws` |
| Raum-/Multiplayer-Logik | in der Function | `lib/rooms.js` |
| Gemeinsamer Speicher + Nachrichten zwischen Instanzen | **Redis** (kostenlos über den Vercel Marketplace) | `lib/store.js` |
| Health-Check | Vercel Function | `api/health.js` |
| Lokaler Test-Server | nur Entwicklung | `server/dev.js` |

### Warum Redis?
Laut Vercel-Dokumentation hängt jede WebSocket-Verbindung an **einer** Function-Instanz, neue Verbindungen können auf eine **andere** Instanz
kommen, und Verbindungen werden beim Erreichen der maximalen Laufzeit der Function geschlossen. Deshalb liegen Räume, Sitzungen und Anwesenheit
in Redis, und Spielerpositionen/Ereignisse laufen über Redis-Pub/Sub zu Spielern auf anderen Instanzen. Ohne Redis würde es nur funktionieren,
wenn zufällig alle Spieler auf derselben Instanz landen.

## Schritt für Schritt

1. **GitHub:** Neues Repository anlegen (oder das alte leeren) und den **gesamten Inhalt dieses Ordners** hochladen – mit Ordnerstruktur
   (`api/`, `lib/`, `public/`, `server/`, `test/`, `package.json`, `vercel.json` …). Im GitHub-Webeditor („Add file → Upload files“) lassen
   sich ganze Ordner per Drag & Drop hineinziehen. *Nicht* hochladen: `node_modules`.
2. **Vercel-Konto:** auf vercel.com mit GitHub anmelden (Hobby-Plan, kostenlos).
3. **Projekt importieren:** „Add New… → Project“ → das Repository wählen. **Framework Preset: „Other“.** Build- und Output-Einstellungen
   nicht ändern (kommen aus `vercel.json`: Output-Ordner `public`, kein Build-Schritt). Noch **nicht** auf Deploy klicken – erst Schritt 4,
   oder nach dem Deploy neu deployen (Schritt 6).
4. **Redis anlegen (kostenlos):** Im Projekt „Storage“ (oder Marketplace) → **Redis** wählen (z. B. *Upstash Redis* oder *Redis Cloud* mit
   Gratis-Tarif) → „Create“ → mit dem Projekt verbinden (alle Umgebungen). Die Integration setzt die Umgebungsvariablen automatisch.
5. **Umgebungsvariablen prüfen** (Project → Settings → Environment Variables):

   | Variable | Pflicht | Bedeutung |
   | --- | --- | --- |
   | `REDIS_URL` | **ja** (setzt die Redis-Integration; alternativ werden `KV_URL`, `STORAGE_URL`, `UPSTASH_REDIS_URL` erkannt) | Verbindungsadresse `rediss://…` mit Passwort. **Nur serverseitig** – steht nie im Frontend. |
   | `ALLOWED_ORIGINS` | nein | Zusätzliche Webseiten, die sich verbinden dürfen, kommagetrennt, z. B. `https://spiel.meinedomain.de`. Standard: nur die eigene Domain. |
   | `CB_DEBUG` | nein | `1` = Debug-Ausgaben im Function-Log. |

   Es gibt **keine** Schlüssel im Spielcode. Liefert die Integration nur `KV_REST_API_URL`/`KV_REST_API_TOKEN` (reine REST-Variante), lege
   zusätzlich die TCP-Adresse des Anbieters als `REDIS_URL` an – Pub/Sub funktioniert nur über TCP.
6. **Deploy** (bzw. „Redeploy“, falls du die Variablen erst nach dem ersten Deploy gesetzt hast – Variablen gelten nur für neue Deployments).
7. **Prüfen:** `https://DEINE-DOMAIN/api/health` muss `{"ok":true,"store":"redis",…}` zeigen. Steht dort `"store":"memory"`, fehlt `REDIS_URL`.
8. **Fluid compute:** WebSockets brauchen Fluid compute (Standard für Projekte seit 23.04.2025). Falls das Projekt älter ist:
   Project → Settings → Functions → Fluid Compute einschalten.
9. **Spielen:** Spiel öffnen → ONLINE CO-OP → Namen eingeben → CONNECT → CREATE ROOM → den 6-stelligen Code an Freunde schicken.
   Es muss **kein Server-Adresse** eingetragen werden (das Feld erscheint nur, wenn das Spiel als lokale Datei geöffnet wird).

## Grenzen & Verhalten

* **Maximale Verbindungsdauer:** `vercel.json` setzt `maxDuration: 300` (Hobby-Maximum) für `api/ws.js`. Der Server schließt Verbindungen nach
  4,5 Minuten selbst sauber (Code 4000); der Client verbindet sich sofort neu, das laufende Spiel läuft weiter (kurze
  „RECONNECTING…“-Anzeige), Raum und Mitspieler bleiben erhalten.
* **Schonfrist:** Wer die Verbindung verliert, bleibt 25 s im Raum (Anzeige „[RECONNECTING]“). Danach wird er entfernt; war er Host, wird
  der nächste Spieler Host.
* **Neue Deployments:** Bestehende Verbindungen bleiben auf dem alten Deployment, bis sie schließen; neue Verbindungen landen auf dem neuen.
  Die Raumdaten liegen in Redis, daher bleiben Räume über Deployments hinweg nutzbar. Wenn du den Raumzustand-Aufbau (`lib/rooms.js`) änderst,
  räume Redis vorher einmal leer, damit keine alten Räume im alten Format hängen.
* **Kosten/Limits:** WebSockets nutzen Vercel Functions mit denselben Limits/Preisen wie normale Aufrufe (aktive Function-Zeit, Datenübertragung).
  Im Hobby-Plan gibt es ein monatliches Gratis-Kontingent; viel Dauerspielzeit kann es aufbrauchen. Redis-Gratistarife haben Befehlslimits
  (Positionsdaten laufen nur dann über Redis, wenn Spieler eines Raums auf verschiedenen Instanzen sitzen; Raumänderungen sind selten).
  Aktuelle Quoten bitte im Vercel-/Redis-Dashboard prüfen.
* **Sicherheit:** Serverseitige Prüfung aller Nachrichten (Typ, Größe max. 2 KB, Wertebereiche, Rate-Limit ca. 80 Nachrichten/s, max. 5 Räume
  pro Minute je Spieler), nur Host darf starten/Sektor wählen/kicken, max. 4 Spieler atomar per Sperre erzwungen, Raumcodes per `SET NX`
  eindeutig, Origin-Prüfung gegen fremde Webseiten, geheimer Sitzungs-Token nur im Tab (sessionStorage), Namen werden bereinigt.
* **Spielprinzip (unverändert):** Jeder simuliert sein eigenes Spiel, Mitspieler erscheinen als „Geister“. Gegner sind nicht synchronisiert.

## Lokal testen

    npm install
    npm run dev          # http://localhost:8080 (zwei Browser-Tabs öffnen)
    npm test             # Tests der Multiplayer-Logik

Mit gesetzter `REDIS_URL` nutzt der lokale Server ebenfalls Redis.

## Dateiübersicht

    api/ws.js       WebSocket-Function (exportiert einen http.Server, ws)
    api/health.js   Health-Check
    lib/rooms.js    Räume, Lobby, Start, Reconnect/Resync, Host-Wechsel, Aufräumen, Validierung
    lib/store.js    Redis-Anbindung (ioredis) + Speicher-Variante für Tests
    lib/instance.js Hub je Instanz, Origin-Prüfung
    public/         das Spiel (index.html, css/, js/ – js/net.js = Client mit Auto-Reconnect, js/online.js = Lobby-Oberfläche)
    server/dev.js   lokaler Entwicklungsserver
    test/           Tests (run.js, glue.js, browser.js)
    vercel.json     Output-Ordner, maxDuration, Sicherheits-Header (CSP)

## Hinweis zu Update 2.0 (Wuestenkampagne)
Die Kampagne laeuft ohne weitere Einstellungen auf Vercel. Fuer den geplanten Sprachchat (Phase 4, WebRTC) ist ein dauerhaft laufender Server (z. B. Render mit `npm start`) die bessere Wahl; die Vercel-Variante bleibt erhalten.
