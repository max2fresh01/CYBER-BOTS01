/* CYBER BOTS - desert.js
   Spiellogik der Kampagne DESERT PLANET: Sandsturm (Wetterereignis), versteckte Geheimraeume, Sammlerstuecke (Relikte),
   Missionen und Kampagnenbelohnungen. Wird von game.js (Start, Update, Kill, Ende) und render.js (Zeichnen) aufgerufen.
   Alle Daten liegen in Save.data.desert, bestehende Spielstaende bleiben unberuehrt. */
(function (CB) {
  "use strict";

  var W = CB.W, GROUND = CB.GROUND;
  var D = { stormK: 0, st: null };
  var DOOR_W = 12, ROOM_W = 120, WALL_H = 36;                      // so niedrig, dass man ueber die Kammer springen kann (Dach = Plattform)

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function api() { return CB.Game.api; }
  function data() { return CB.Save.data.desert; }
  function bits(n) { return (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1); }

  // ---------- Sektor-Aufbau ----------
  D.build = function (sec, G) {
    D.stormK = 0; D.st = null;
    if (!sec.desert) return;
    var r = mulberry(sec.id * 977 + 5), th = CB.THEMES[sec.theme];
    var st = D.st = { sec: sec, th: th, kills: {}, relics: [], door: null, scan: 0, storm: null, intro: 1.2, cache: false };
    // Geheimraum: Tuer + Kammer + Endwand am Boden, ca. 40-58 % der Welt
    var dx = Math.round(sec.width * (0.4 + r() * 0.16) / 10) * 10;
    st.door = { x: dx, open: false, hp: 70, hit: 0, x1: dx + DOOR_W, x2: dx + DOOR_W + ROOM_W, endX: dx + DOOR_W + ROOM_W };
    var a = dx - 30, b = st.door.endX + 14, i;
    G.platforms = G.platforms.filter(function (p) { return p.x + p.w < a || p.x > b; });               // keine Plattform ueber dem Raum
    G.platforms.push({ x: dx, y: GROUND - WALL_H, w: DOOR_W + ROOM_W + 8 });                           // Dach der Kammer: man laeuft darueber weiter
    var Hz = CB.Hazards.state();
    ["props", "gates", "vents", "portals"].forEach(function (k) { Hz[k] = Hz[k].filter(function (o) { return o.x < a || o.x > b; }); });
    // Relikte 0 und 2 auf erhoehten Plattformen, Relikt 1 in der Geheimkammer
    var plats = G.platforms.filter(function (p) { return p.x > 300 && p.x + p.w < sec.width - 150; });
    function pickPlat(from, to) {
      var c = plats.filter(function (p) { return p.x > sec.width * from && p.x < sec.width * to; });
      c.sort(function (p, q) { return p.y - q.y; });
      return c[0] || plats[Math.floor(r() * plats.length)] || { x: sec.width * from, w: 60, y: GROUND - 34 };
    }
    var p0 = pickPlat(0.12, 0.36), p2 = pickPlat(0.62, 0.88), got = data().relics[sec.id] | 0;
    var spots = [{ x: p0.x + p0.w / 2, y: p0.y - 12 }, { x: st.door.x1 + ROOM_W / 2, y: GROUND - 14 }, { x: p2.x + p2.w / 2, y: p2.y - 12 }];
    for (i = 0; i < 3; i++) st.relics.push({ x: spots[i].x, y: spots[i].y, idx: i, taken: !!(got & (1 << i)), name: CB.DESERT.relics[sec.id][i] });
    if (sec.storm) st.storm = { next: sec.storm.first, phase: "wait", t: 0, dir: r() < 0.5 ? -1 : 1 };
  };
  D.clear = function () { D.st = null; D.stormK = 0; };

  // ---------- Kollision: geschlossene Tuer und Endwand sind fest ----------
  var origBlock = CB.Hazards.blockX;
  CB.Hazards.blockX = function (ent, px0) {
    origBlock.call(CB.Hazards, ent, px0);
    var st = D.st; if (!st || !ent || ent.y < GROUND - WALL_H + 2 || ent.cfg && (ent.cfg.fly || ent.cfg.isBoss)) return;
    var hw = (ent.w || 12) / 2, d = st.door, walls = [[d.endX, 8]];
    if (!d.open) walls.push([d.x, DOOR_W]);
    for (var i = 0; i < walls.length; i++) {
      var wx = walls[i][0], ww = walls[i][1];
      if (ent.x + hw > wx && ent.x - hw < wx + ww) {
        ent.x = (px0 <= wx + ww / 2 ? wx - hw : wx + ww + hw);
        if (ent.cfg && ent.onGround) ent.vy = -250;                                                    // Gegner huepfen ueber die Kammer
      }
    }
  };

  // ---------- Update ----------
  function openDoor(st, G, how) {
    var d = st.door; if (d.open) return;
    d.open = true;
    var A = api(), sec = st.sec;
    A.burst(d.x + DOOR_W / 2, GROUND - 30, 40, ["#c8a070", "#ffffff", "#8a5a30"], 130, 0.7, 40, 2);
    A.sfx("secret"); A.shake(4); A.text(d.x, GROUND - WALL_H - 6, "SECRET ROOM!", "#ffd23f");
    var dd = data(); if (!dd.secrets[sec.id]) { dd.secrets[sec.id] = true; }
    CB.UI.toast("SECRET ROOM FOUND", "good");
    G.pickups.push({ x: d.x1 + 30, y: GROUND - 14, vy: 0, t: 0, life: 40, kind: sec.pickup || "heal" });
    G.pickups.push({ x: d.x1 + ROOM_W - 30, y: GROUND - 14, vy: 0, t: 0, life: 40, kind: sec.pickup || "heal" });
    if (!st.cache) { st.cache = true; var cr = Math.round(80 * (1 + (sec.id - 10) * 0.5) * CB.diff().cr); G.run.credits += cr; CB.Save.data.credits += cr; A.text(d.x1 + ROOM_W / 2, GROUND - 50, "+" + cr, "#ffd23f"); }
    CB.Save.save();
  }

  D.update = function (dt, playing) {
    var st = D.st; if (!st || !playing) return;
    var G = CB.Game, p = G.p, A = api(), i, sec = st.sec;
    st.intro -= dt;
    // Gegner aus der Geheimkammer entfernen (feste Tuerme koennten dort stehen)
    var d = st.door;
    for (i = 0; i < G.enemies.length; i++) { var e = G.enemies[i]; if (e.cfg.speed === 0 && e.x > d.x - 10 && e.x < d.endX + 12) e.x = d.x - 40; }   // feste Tuerme nicht in der Kammer

    // Tuer: durch Schuesse beschaedigen oder 1,8 s davor stehen (Scan)
    if (!d.open) {
      d.hit = Math.max(0, d.hit - dt);
      for (i = 0; i < G.shots.length; i++) {
        var s = G.shots[i];
        if (s.x > d.x - 2 && s.x < d.x + DOOR_W + 2 && s.y > GROUND - WALL_H && s.y < GROUND) {
          d.hp -= s.dmg; d.hit = 0.12; s.life = 0; A.burst(s.x, s.y, 3, ["#c8a070", "#ffffff"], 50, 0.2, 0, 1); A.sfx("block");
        }
      }
      var near = p.alive && Math.abs(p.x - (d.x + DOOR_W / 2)) < 30;
      st.scan = near ? st.scan + dt : Math.max(0, st.scan - dt * 2);
      if (d.hp <= 0 || st.scan >= 1.8) openDoor(st, G);
    }

    // Relikte einsammeln
    for (i = 0; i < st.relics.length; i++) {
      var rl = st.relics[i];
      if (rl.taken || !p.alive) continue;
      if (Math.abs(p.x - rl.x) < 13 && Math.abs((p.y - p.h / 2) - rl.y) < 20) {
        rl.taken = true; var dd = data(); dd.relics[sec.id] = (dd.relics[sec.id] | 0) | (1 << rl.idx);
        A.sfx("relic"); A.burst(rl.x, rl.y, 24, ["#ffd23f", "#ffffff", "#35f0ff"], 110, 0.7, 0, 2); A.ring(rl.x, rl.y, 30, "#ffd23f", 0.4);
        A.text(rl.x, rl.y - 14, rl.name, "#ffd23f");
        CB.UI.toast("RELIC FOUND: " + rl.name + " (" + bits(dd.relics[sec.id]) + "/3)", "good");
        CB.Save.save();
      }
    }

    // Sandsturm: Warnung -> Sturm -> Abklingen
    var sm = st.storm, target = 0;
    if (sm) {
      var cfg = sec.storm;
      if (sm.phase === "wait") { if (G.run.time >= sm.next - 3) { sm.phase = "warn"; sm.t = 3; G.banner = { text: "WARNING - SANDSTORM INCOMING", t: 2.6, boss: false }; A.sfx("warn"); } }
      else if (sm.phase === "warn") { sm.t -= dt; if (sm.t <= 0) { sm.phase = "storm"; sm.t = cfg.dur; A.sfx("sandstorm"); } }
      else if (sm.phase === "storm") { target = 1; sm.t -= dt; if (sm.t <= 0) { sm.phase = "wait"; sm.next = G.run.time + cfg.gap[0] + A.rand() * (cfg.gap[1] - cfg.gap[0]); sm.dir = A.rand() < 0.5 ? -1 : 1; } }
    }
    D.stormK += (target - D.stormK) * Math.min(1, dt * 1.2);
    if (D.stormK < 0.01) D.stormK = 0;
    if (D.stormK > 0.05) { G.extVx = (G.extVx || 0) + sm.dir * sec.storm.wind * D.stormK; }
  };

  // ---------- Kill-Zaehler fuer Missionen ----------
  D.onKill = function (e) { if (D.st) D.st.kills[e.type] = (D.st.kills[e.type] | 0) + 1; };

  // ---------- Missionen ----------
  D.missionDone = function (id, i) { return data().missions[id + "-" + i] === true; };
  D.relicCount = function (id) { return bits(data().relics[id] | 0); };
  D.progress = function (id) { var n = 0; for (var i = 0; i < 3; i++) if (D.missionDone(id, i)) n++; return n; };
  D.totalMissions = function () { var n = 0; CB.DESERT.ids.forEach(function (id) { n += D.progress(id); }); return n; };
  D.campaignDone = function () { return D.totalMissions() >= 15; };

  // Beim Sektorsieg aufgerufen: prueft Missionen, zahlt Belohnungen aus, liefert Ergebniszeilen fuer den Ergebnisbildschirm
  D.onFinish = function (sec, win) {
    if (!sec.desert || !win) return null;
    var st = D.st, G = CB.Game, dd = data(), list = CB.DESERT.missions[sec.id], out = { missions: [], campaign: 0 }, bonus = 0;
    for (var i = 0; i < list.length; i++) {
      var m = list[i], key = sec.id + "-" + i;
      if (dd.missions[key]) continue;
      var ok = false;
      if (m.t === "clear") ok = true;
      else if (m.t === "relics") ok = D.relicCount(sec.id) >= m.n;
      else if (m.t === "secret") ok = !!dd.secrets[sec.id];
      else if (m.t === "kills") { var n = 0; (m.types || []).forEach(function (ty) { n += (st && st.kills[ty]) | 0; }); ok = n >= m.n; }
      else if (m.t === "time") ok = G.run.time <= m.s;
      if (ok) { dd.missions[key] = true; bonus += m.reward; out.missions.push({ text: m.text, reward: m.reward }); }
    }
    if (!dd.campaignDone && D.campaignDone()) { dd.campaignDone = true; out.campaign = CB.DESERT.campaignReward; bonus += out.campaign; }
    if (bonus) { CB.Save.data.credits += bonus; G.run.credits += bonus; }
    out.bonus = bonus;
    return out;
  };

  // ---------- Zeichnen ----------
  function relicSprite(ctx, x, y, t, col) {
    var bob = Math.sin(t * 2.4 + x) * 2;
    R(ctx, col, x - 12, y - 12 + bob, 24, 24, 0.06 + 0.04 * Math.sin(t * 3));
    ctx.save(); ctx.translate(Math.round(x), Math.round(y + bob)); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#07031a"; ctx.fillRect(-6, -6, 12, 12); ctx.fillStyle = col; ctx.fillRect(-5, -5, 10, 10); ctx.fillStyle = "#ffffff"; ctx.fillRect(-4, -4, 3, 3);
    ctx.restore();
    R(ctx, "#ffffff", x + Math.cos(t * 3) * 9, y + bob + Math.sin(t * 3) * 9, 1, 1, 0.9);
  }

  D.drawBack = function (ctx, camX, t) {
    var st = D.st; if (!st) return;
    var d = st.door, th = st.th, x0 = Math.round(d.x - camX), x2 = Math.round(d.endX - camX) + 8, top = GROUND - WALL_H;
    if (x2 > -10 && x0 < W + 10) {
      if (d.open) {                                                      // offene Kammer: dunkler Innenraum, Fackeln, Sockel
        R(ctx, "#07031a", x0 + DOOR_W, GROUND - WALL_H + 7, ROOM_W, WALL_H - 7);
        R(ctx, th.mid, x2 - 8, GROUND - WALL_H + 7, 8, WALL_H - 7);
        for (var k = 0; k < 2; k++) { var tx = x0 + DOOR_W + 14 + k * (ROOM_W - 28); R(ctx, "#5a3a20", tx, GROUND - 18, 2, 6); R(ctx, "#ffd23f", tx - 1, GROUND - 22 + (Math.sin(t * 12 + k) > 0 ? 0 : 1), 4, 4, 0.9); R(ctx, "#ff8a1f", tx - 10, GROUND - 32, 22, 22, 0.07); }
        R(ctx, th.neon[0], x0 + DOOR_W + ROOM_W / 2 - 8, GROUND - 6, 16, 6, 0.5); R(ctx, "#07031a", x0 + DOOR_W + ROOM_W / 2 - 9, GROUND - 7, 18, 1);
      } else {                                                           // geschlossen: Felsklotz mit Rissen und leuchtendem Zeichen
        R(ctx, "#07031a", x0 - 1, top, ROOM_W + DOOR_W + 10, WALL_H);
        R(ctx, th.mid, x0, top + 7, ROOM_W + DOOR_W + 8, WALL_H - 7); R(ctx, th.far, x0, top + 16, ROOM_W + DOOR_W + 8, 3); R(ctx, th.far, x0, top + 26, ROOM_W + DOOR_W + 8, 3);
        R(ctx, th.near, x0, GROUND - 6, ROOM_W + DOOR_W + 8, 6);
        var fl = d.hit > 0 ? 1 : 0, gx = x0 + 3;
        R(ctx, "#2a1208", gx, GROUND - WALL_H + 7, DOOR_W - 6, WALL_H - 7, 0.9);                                         // Tuerplatte
        R(ctx, th.neon[0], gx + 1, GROUND - 24, 2, 8, 0.4 + 0.5 * Math.abs(Math.sin(t * 2)) + fl);
        R(ctx, th.neon[0], gx + 1, GROUND - 14, 4, 2, 0.4 + 0.5 * Math.abs(Math.sin(t * 2)) + fl);
        R(ctx, "#000000", gx - 1, GROUND - 30, 1, 12, 0.5); R(ctx, "#000000", gx, GROUND - 20, 4, 1, 0.5);        // Risse
        if (st.scan > 0) { R(ctx, "#07031a", x0 - 8, GROUND - WALL_H - 18, 32, 5); R(ctx, "#35f0ff", x0 - 7, GROUND - WALL_H - 17, Math.round(30 * Math.min(1, st.scan / 1.8)), 3); }
      }
    }
    for (var i = 0; i < st.relics.length; i++) {
      var rl = st.relics[i]; if (rl.taken) continue;
      var rx = rl.x - camX; if (rx < -20 || rx > W + 20) continue;
      if (rl.idx === 1 && !d.open) continue;                                                                      // Kammer-Relikt erst nach dem Oeffnen sichtbar
      relicSprite(ctx, rx, rl.y, t, ["#ffd23f", "#35f0ff", "#ff2bd6"][rl.idx]);
    }
  };

  D.drawFront = function (ctx, camX, t) {
    var st = D.st; if (!st) return;
    var sm = st.storm;
    if (sm && sm.phase === "warn" && Math.sin(t * 14) > 0) { ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#ffd23f"; ctx.fillText("SANDSTORM", W / 2, 50); }
  };

  CB.Desert = D;
})(window.CB);
