/* CYBER BOTS - net.js
   Multiplayer-Client (WebSocket): Raeume, Lobby, Start, Mitspieler als "Geister" im Spiel.
   Jeder Spieler simuliert sein eigenes Spiel; der Server (server/server.js) reicht nur die Zustaende weiter. */
(function (CB) {
  "use strict";

  var COLORS = ["#35f0ff", "#ff2bd6", "#ffd23f", "#6bff8a"];
  var WS_PATH = "/api/ws";                 // Vercel WebSocket Function (api/ws.js)
  var GIVE_UP_MS = 40000;                  // laenger getrennt als die Schonfrist des Servers -> Raum gilt als verloren
  var Net = {
    ws: null, connected: false, reconnecting: false, id: "", token: "", name: "PLAYER", room: null, rooms: [], err: "", active: false,
    ghosts: {}, onChange: null, sectorAtStart: 0, tries: 0,
    sentDone: false, _tick: null
  };
  var want = false, url = "", retryT = null, downSince = 0, hadSession = false, pingT = null;

  function changed() { if (Net.onChange) Net.onChange(); }
  function send(o) { if (Net.ws && Net.ws.readyState === 1) { Net.ws.send(JSON.stringify(o)); return true; } return false; }
  Net.send = send;

  function validUrl(u) { return /^wss?:\/\/[\w.\-]+(:\d{1,5})?(\/[\w.\-\/]*)?$/.test(u); }
  Net.validUrl = validUrl;

  // Standard: gleiche Domain wie die Seite -> wss://<domain>/api/ws (lokal: ws://localhost:8080/api/ws)
  Net.defaultUrl = function () {
    if (location.protocol === "http:" || location.protocol === "https:") return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + WS_PATH;
    return "ws://localhost:8080" + WS_PATH;
  };

  // Sitzung (pid + geheimer Token) nur im sessionStorage dieses Tabs: erlaubt Wiederverbinden/Seite neu laden, ohne etwas dauerhaft zu speichern
  function loadSess() { try { var s = JSON.parse(sessionStorage.getItem("cb-mp-sess")); if (s && /^[0-9a-f]{8}$/.test(s.id) && typeof s.token === "string" && s.token.length === 24) return s; } catch (e) { /* */ } return null; }
  function saveSess() { try { if (Net.id) sessionStorage.setItem("cb-mp-sess", JSON.stringify({ id: Net.id, token: Net.token })); } catch (e) { /* */ } }
  function clearSess() { try { sessionStorage.removeItem("cb-mp-sess"); } catch (e) { /* */ } }

  function resetRoom() { Net.room = null; Net.active = false; Net.ghosts = {}; if (Net.onRoomReset) Net.onRoomReset(); }

  Net.connect = function (u, name) {
    Net.disconnect(true);
    Net.err = "";
    if (!validUrl(u)) { Net.err = "INVALID SERVER ADDRESS"; changed(); return; }
    Net.name = (name || "PLAYER").replace(/[^\w \-.!?]/g, "").slice(0, 12) || "PLAYER";
    url = u; want = true; hadSession = false; Net.tries = 0; downSince = 0;
    var s = loadSess(); if (s) { Net.id = s.id; Net.token = s.token; }
    open();
  };

  function open() {
    clearTimeout(retryT);
    var ws;
    try { ws = new WebSocket(url); } catch (e) { fail("CONNECTION FAILED"); return; }
    Net.ws = ws; if (!Net.reconnecting) Net.err = "CONNECTING...";
    var opened = false;
    ws.onopen = function () {
      opened = true;
      send({ t: "hello", name: Net.name, robot: CB.Save.data.selRobot, pid: Net.id || undefined, token: Net.token || undefined, ing: !!Net.active });
    };
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      onMsg(m);
    };
    ws.onclose = function (ev) {
      if (Net.ws !== ws) return;
      Net.ws = null; Net.connected = false; clearInterval(pingT);
      if (!want) return;
      if (!hadSession && !Net.reconnecting) { want = false; Net.err = opened ? "CONNECTION LOST" : "SERVER NOT REACHABLE"; changed(); return; }   // erster Verbindungsversuch fehlgeschlagen: sofort melden
      scheduleReconnect(ev && ev.code === 4000 ? 250 : 0);
    };
    ws.onerror = function () { /* onclose meldet den Fehler */ };
    changed();
  }
  function fail(msg) { want = false; Net.err = msg; changed(); }

  // Automatisches Wiederverbinden mit exponentiellem Backoff (1 s -> 30 s). Raum und laufendes Spiel bleiben erhalten.
  function scheduleReconnect(fast) {
    if (!downSince) downSince = Date.now();
    Net.reconnecting = true; Net.tries++;
    if (Date.now() - downSince > GIVE_UP_MS && (Net.room || Net.active)) { resetRoom(); Net.err = "CONNECTION LOST - ROOM CLOSED"; }
    else if (!Net.err || Net.err === "CONNECTING..." || /^RECONNECTING/.test(Net.err)) Net.err = "RECONNECTING...";
    var delay = fast || Math.min(1000 * Math.pow(2, Math.min(Net.tries - 1, 5)), 30000);
    clearTimeout(retryT); retryT = setTimeout(function () { if (want) open(); }, delay);
    changed();
  }

  Net.disconnect = function (keepSession) {
    want = false; Net.reconnecting = false; downSince = 0; clearTimeout(retryT); clearInterval(pingT);
    var ws = Net.ws; Net.ws = null; Net.connected = false; resetRoom();
    if (!keepSession) { Net.id = ""; Net.token = ""; clearSess(); }
    if (ws) { try { ws.close(); } catch (e) { /* */ } }
  };

  function toast(t) { if (CB.UI && CB.UI.toast && Net.active) CB.UI.toast(t); }
  function nameOf(id, room) { var p = room && room.players.filter(function (x) { return x.id === id; })[0]; return p ? p.name : "PLAYER"; }

  function onMsg(m) {
    if (m.t === "chat" || (m.t.charAt(0) === "f" && m.t !== "fail") || /^v(peers|sig|left|err)$/.test(m.t)) { if (Net.ext) Net.ext(m); changed(); return; }       // Freunde + Chat (friends.js)
    switch (m.t) {
      case "welcome":
        // Resync: der Server hat die Sitzung erkannt (resumed) und schickt gleich den Raumzustand; sonst beginnt alles neu
        if (!m.resumed) { if (Net.room || Net.active) Net.err = "SESSION EXPIRED"; resetRoom(); }
        Net.id = m.id; Net.token = m.token; saveSess();
        Net.connected = true; Net.reconnecting = false; hadSession = true; Net.tries = 0; downSince = 0;
        if (Net.err === "RECONNECTING..." || Net.err === "CONNECTING...") Net.err = "";
        clearInterval(pingT); pingT = setInterval(function () { send({ t: "ping", n: 0 }); }, 25000);
        if (Net.onWelcome) Net.onWelcome();                                // Freundes-Anmeldung (friends.js)
        break;
      case "rooms": Net.rooms = Array.isArray(m.rooms) ? m.rooms : []; break;
      case "room": {
        var old = Net.room;
        if (old && old.code === m.code && Net.active) {                  // Beitritte, Austritte, Host-Wechsel im Spiel melden
          m.players.forEach(function (p) { if (!old.players.some(function (q) { return q.id === p.id; })) toast(p.name + " JOINED"); });
          old.players.forEach(function (q) { if (!m.players.some(function (p) { return p.id === q.id; })) toast(q.name + " LEFT"); });
          if (old.host !== m.host && m.players.length) toast(nameOf(m.host, m) + " IS NOW HOST");
        }
        Net.room = m;
        Object.keys(Net.ghosts).forEach(function (k) { if (!m.players.some(function (p) { return String(p.id) === k; })) delete Net.ghosts[k]; });
        break;
      }
      case "left":
        if (m.you) { resetRoom(); if (m.kicked) Net.err = "YOU WERE KICKED"; else if (m.gone) Net.err = "ROOM NO LONGER EXISTS"; }
        else delete Net.ghosts[m.id];
        break;
      case "err": Net.err = String(m.msg || "ERROR").slice(0, 40); break;
      case "start": startGame(m); return;
      case "st": {
        var g = Net.ghosts[m.id];
        if (!g) { g = Net.ghosts[m.id] = { x: m.x, y: m.y }; }
        if (m.dead && !g.dead) toast(nameOf(m.id, Net.room) + " WAS DOWN");
        g.tx = m.x; g.ty = m.y; g.f = m.f; g.aim = m.aim; g.hp = m.hp; g.k = m.k; g.dead = !!m.dead; g.w = m.w; g.sk = m.sk; g.wk = m.wk; g.seen = performance.now();
        return;
      }
      case "ev":
        if (m.k === "done") toast((m.name || "PLAYER") + (m.result === "win" ? " CLEARED THE SECTOR" : " IS OUT"));
        break;
    }
    changed();
  }

  function startGame(m) {
    if (!CB.byId(CB.SECTORS, m.sector)) return;
    if (Net.active && m.resume) return;                                  // laufendes Spiel nicht neu starten
    Net.active = true; Net.sentDone = false; Net.ghosts = {};
    if (!Net._tick) Net._tick = setInterval(tick, 66);
    CB.UI.launch(m.sector);
  }

  // Eigenen Zustand senden (~15x pro Sekunde), Ende melden
  function tick() {
    if (!Net.active || !Net.connected) return;
    var G = CB.Game, p = G.p;
    if (!p) return;
    if (G.state === "result" || G.state === "menu") {
      if (!Net.sentDone) { Net.sentDone = true; send({ t: "done", result: G.state === "result" && G.win ? "win" : "lose", k: G.run ? G.run.kills : 0 }); }
      return;
    }
    send({ t: "st", x: p.x, y: p.y, f: p.face < 0 ? -1 : 1, aim: p.aim || 0, hp: Math.max(0, p.hp / p.maxHp), k: G.run.kills, dead: !p.alive, w: G.stats.weapon.id, sk: (CB.Save.data.skins.robot || ""), wk: (CB.Save.data.skins.weapon || "") });
  }

  // Beim Verlassen des Spiels (Menue): Ende melden, aber im Raum bleiben
  Net.leaveGame = function () {
    if (Net.active && !Net.sentDone && Net.connected) { Net.sentDone = true; send({ t: "done", result: "lose", k: CB.Game.run ? CB.Game.run.kills : 0 }); }
    Net.active = false; Net.ghosts = {};
  };

  Net.createRoom = function (pub, sector) { send({ t: "create", pub: !!pub, sector: sector || 1 }); };
  Net.joinRoom = function (code) { send({ t: "join", code: String(code || "").toUpperCase().slice(0, 6) }); };
  Net.leaveRoom = function () { send({ t: "leave" }); };
  Net.setReady = function (v) { send({ t: "ready", v: !!v }); };
  Net.setSector = function (id) { send({ t: "sector", id: id }); };
  Net.setPublic = function (v) { send({ t: "pub", v: !!v }); };
  Net.kick = function (id) { send({ t: "kick", id: id }); };
  Net.start = function () { send({ t: "start" }); };
  Net.refresh = function () { send({ t: "list" }); };

  // Mitspieler zeichnen (Geister) + Team-Anzeige
  Net.draw = function (ctx, camX, t) {
    var room = Net.room, ids = Object.keys(Net.ghosts), i;
    var order = room ? room.players.map(function (p) { return p.id; }) : [];
    ctx.save();
    ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
    for (i = 0; i < ids.length; i++) {
      var g = Net.ghosts[ids[i]];
      if (performance.now() - g.seen > 4000) continue;                       // Spieler ist weg / Verbindung haengt
      g.x += (g.tx - g.x) * 0.35; g.y += (g.ty - g.y) * 0.35;                // glaetten
      var info = room && room.players.filter(function (p) { return String(p.id) === ids[i]; })[0];
      if (!info) continue;
      var spr = (CB.Skins.robotSprite(CB.Sprites.robot[info.robot] ? info.robot : "nova", g.sk || "")), img = spr.frames[0];
      var x = Math.round(g.x - camX), col = COLORS[Math.max(0, order.indexOf(info.id)) % 4];
      if (x < -40 || x > CB.W + 40) {                                        // Pfeil am Rand
        ctx.globalAlpha = 0.8; ctx.fillStyle = col; ctx.fillText(x < 0 ? "<" : ">", x < 0 ? 8 : CB.W - 8, 20); ctx.globalAlpha = 1; continue;
      }
      ctx.globalAlpha = g.dead ? 0.25 : 0.8;
      ctx.save(); ctx.translate(x, Math.round(g.y) + 1); if (g.f < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -(img.width >> 1), -img.height); ctx.restore();
      if (g.w && CB.byId(CB.WEAPONS, g.w)) {                                  // Waffe des Mitspielers (Update 2.0)
        var wi = CB.Skins.weaponSprite(g.w, g.wk || ""), ga = g.aim || 0;
        ctx.save(); ctx.translate(x, Math.round(g.y) - Math.round(img.height * 0.55)); ctx.rotate(ga); if (Math.cos(ga) < 0) ctx.scale(1, -1); ctx.drawImage(wi, 1, -3); ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#07031a"; ctx.fillText(info.name, x + 1, g.y - img.height - 3); ctx.fillStyle = col; ctx.fillText(info.name, x, g.y - img.height - 4);
      ctx.fillStyle = "#07031a"; ctx.fillRect(x - 10, g.y - img.height - 2, 20, 3); ctx.fillStyle = g.hp > 0.35 ? "#6bff8a" : "#ff4b6b"; ctx.fillRect(x - 9, g.y - img.height - 1, Math.round(18 * g.hp), 1);
    }
    if (Net.reconnecting && Net.active) { ctx.fillStyle = "#ffd23f"; ctx.textAlign = "center"; ctx.fillText("RECONNECTING...", CB.W / 2, 28); }
    // Team-Liste rechts oben
    if (room) {
      ctx.textAlign = "right";
      var y = 40, G = CB.Game;
      for (i = 0; i < room.players.length; i++) {
        var pl = room.players[i], me = pl.id === Net.id, gg = Net.ghosts[pl.id];
        var kills = me ? G.run.kills : gg ? gg.k : pl.kills, hp = me ? G.p.hp / G.p.maxHp : gg ? gg.hp : 1;
        ctx.fillStyle = "rgba(7,3,26,0.6)"; ctx.fillRect(CB.W - 92, y - 7, 88, 10);
        ctx.fillStyle = COLORS[i % 4]; ctx.fillText(pl.name.slice(0, 8), CB.W - 56, y);
        ctx.fillStyle = "#fff"; ctx.fillText(String(kills | 0), CB.W - 6, y);
        ctx.fillStyle = hp > 0.35 ? "#6bff8a" : "#ff4b6b"; ctx.fillRect(CB.W - 90, y + 1, Math.round(30 * Math.max(0, Math.min(1, hp))), 1);
        y += 11;
      }
    }
    ctx.restore();
  };

  CB.Net = Net;
})(window.CB);
