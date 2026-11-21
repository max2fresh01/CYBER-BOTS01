/* CYBER BOTS - weapons2.js
   UPDATE 2.0 Phase 2: vier neue Waffen (LASER RIFLE, PLASMA BLASTER MK2, HEAVY CANNON, ELECTRO GUN) und Skins
   (Roboter- und Waffen-Skins, rein kosmetisch). Grafik und Sound werden live erzeugt, keine Dateien noetig.
   Schuss-Logik: Game.api (hurtEnemy, burst, ...). Treffer der Spezialwaffen werden hier berechnet, Projektile laufen ueber game.js. */
(function (CB) {
  "use strict";
  var A = CB.Audio, S = A.SFX, tone = A.tone, noise = A.noise, Sp = CB.Sprites;

  // ---------- Waffen-Werte ----------
  // shots: Projektile pro Ausloesen (fuer DPS-Anzeige); rad: Explosionsradius; chain: Kettenglieder; stun: Betaeubung in s
  CB.WEAPONS.push(
    { id: "laser", name: "LASER RIFLE", price: 2500, type: "laser", dmg: 15, rate: 2.2, range: 300, speed: 0, color: "#ff3b5c",
      desc: "Instant laser beam. Pierces every enemy in line (-20 % per target)." },
    { id: "pbmk2", name: "PLASMA BLASTER MK2", price: 3500, type: "burst", shots: 3, dmg: 9, rate: 2.0, range: 230, speed: 340, color: "#4dffb0",
      desc: "Fires a fast 3-round plasma burst in a tight spread." },
    { id: "egun", name: "ELECTRO GUN", price: 5500, type: "shock", dmg: 12, rate: 3.0, range: 170, speed: 0, color: "#7fb8ff", chain: 3, stun: 0.55,
      desc: "Auto-aiming lightning. Chains to 3 more enemies and stuns them briefly." },
    { id: "heavy", name: "HEAVY CANNON", price: 7000, type: "cannon", dmg: 95, rate: 0.55, range: 300, speed: 200, color: "#ffb23f", rad: 56,
      desc: "Slow, devastating shells with a huge blast. Strong recoil." }
  );

  // ---------- Waffen-Grafik (14x7, zeigt nach rechts) ----------
  var WD = Sp.weaponDraw;
  WD.laser = function (c, col) {
    c("#59627f", 0, 1, 8, 3); c("#3a4160", 1, 4, 2, 2); c("#c6d0f2", 8, 2, 6, 1); c(col, 3, 0, 3, 1); c(col, 5, 2, 2, 1);
    c("#c6d0f2", 0, 1, 8, 1); c("#ffffff", 13, 2, 1, 1);
  };
  WD.pbmk2 = function (c, col) {
    c("#4a5a70", 0, 0, 6, 7); c("#9aa6d0", 6, 0, 6, 1); c("#9aa6d0", 6, 3, 6, 1); c("#9aa6d0", 6, 6, 6, 1);
    c(col, 2, 2, 2, 3); c(col, 12, 0, 1, 1); c(col, 12, 3, 1, 1); c(col, 12, 6, 1, 1); c("#c6d0f2", 0, 0, 6, 1);
  };
  WD.egun = function (c, col) {
    c("#4a5a90", 0, 1, 5, 4); c("#c6d0f2", 5, 2, 6, 1); c("#3a4160", 1, 5, 2, 2);
    c(col, 5, 0, 1, 5); c(col, 7, 0, 1, 5); c(col, 9, 0, 1, 5); c("#ffffff", 11, 2, 2, 1); c("#ffffff", 12, 1, 1, 3);
  };
  WD.heavy = function (c, col) {
    c("#3a4160", 0, 0, 9, 7); c("#59627f", 0, 0, 9, 2); c("#8a94b8", 9, 1, 4, 5); c(col, 9, 0, 1, 7); c(col, 4, 2, 2, 3);
    c("#1a1e30", 12, 2, 2, 3); c("#ffffff", 13, 3, 1, 1);
  };
  ["laser", "pbmk2", "egun", "heavy"].forEach(function (id) {
    var w = CB.byId(CB.WEAPONS, id);
    Sp.weapon[id] = Sp.build(14, 7, function (c) { WD[id](c, w.color); });
  });

  // ---------- Sounds ----------
  S.laser = function () { tone(1500, 0.14, "sawtooth", 0.07, 260); tone(2400, 0.05, "square", 0.025, 900); noise(0.05, 0.03, 7000); };
  S.pbmk2 = function () { tone(700, 0.05, "square", 0.06, 420); tone(760, 0.05, "square", 0.06, 440, 0.06); tone(820, 0.05, "square", 0.06, 460, 0.12); };
  S.egun = function () { noise(0.16, 0.08, 6000); tone(420, 0.14, "sawtooth", 0.08, 1700); tone(2600, 0.06, "square", 0.03, 800, 0.03); };
  S.heavy = function () { noise(0.55, 0.26, 900); tone(75, 0.5, "sine", 0.24, 28); tone(220, 0.2, "sawtooth", 0.08, 60); };

  // ---------- Schuss-Logik ----------
  function G() { return CB.Game; }
  function api() { return CB.Game.api; }
  function hitLine(ox, oy, ex, ey, pad) {          // Gegner auf einer Strecke, sortiert nach Entfernung
    var g = G(), dx = ex - ox, dy = ey - oy, l2 = dx * dx + dy * dy || 1, out = [];
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (e.dead || e.hacked > 0) continue;
      var qx = e.x, qy = e.y - e.h / 2, t = api().clamp(((qx - ox) * dx + (qy - oy) * dy) / l2, 0, 1);
      if (Math.hypot(qx - (ox + dx * t), qy - (oy + dy * t)) < Math.max(e.w, e.h) / 2 + pad) out.push({ e: e, t: t });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  function fireLaser(w, x, y, a, s, dmg) {
    var g = G(), ap = api(), len = s.range, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, dir = ap.sgn(Math.cos(a)) || 1;
    var hits = hitLine(x, y, ex, ey, 3), n, i, stopT = 1;
    for (i = 0; i < hits.length; i++) {
      var e = hits[i].e;
      ap.hurtEnemy(e, dmg * Math.max(0.4, Math.pow(0.8, i)), dir);
      ap.burst(e.x, e.y - e.h / 2, 5, [w.color, "#ffffff"], 90, 0.25, 0, 1);
    }
    if (CB.Hazards && CB.Hazards.shotHit) {                // Kisten/Props zerstoeren: Strahl endet am ersten getroffenen Prop
      for (n = 8; n <= len; n += 8) {
        if (CB.Hazards.shotHit({ x: x + Math.cos(a) * n, y: y + Math.sin(a) * n, r: 2, dmg: dmg * 0.6 })) { stopT = n / len; break; }
      }
    }
    var fx = x + (ex - x) * stopT, fy = y + (ey - y) * stopT;
    g.beams.push({ pts: [{ x: x, y: y }, { x: fx, y: fy }], col: w.color, life: 0.12, max: 0.12 });
    g.beams.push({ pts: [{ x: x, y: y + 0.6 }, { x: fx, y: fy + 0.6 }], col: "#ffffff", life: 0.07, max: 0.07 });
    ap.burst(fx, fy, 4, [w.color, "#ffffff"], 60, 0.2, 0, 1);
    ap.sfx("laser");
    g.p.recoil = 1.5;
  }

  function fireBurst(w, x, y, a, s, dmg) {
    var g = G(), spread = [-0.07, 0, 0.07], i;
    for (i = 0; i < 3; i++) {
      var aa = a + spread[i], bx = x - Math.cos(aa) * i * 7, by = y - Math.sin(aa) * i * 7;      // gestaffelt -> sieht wie eine Salve aus
      g.shots.push({ x: bx, y: by, vx: Math.cos(aa) * w.speed, vy: Math.sin(aa) * w.speed, dmg: dmg, type: "bolt", life: s.range / w.speed, r: 3, col: w.color, hits: null, ang: aa });
    }
    api().sfx("pbmk2"); g.p.recoil = 2.2;
  }

  function fireCannon(w, x, y, a, s, dmg) {
    var g = G(), ap = api();
    g.shots.push({ x: x, y: y, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, dmg: dmg, type: "rocket", life: s.range / w.speed, r: 4, col: w.color, hits: null, ang: a, rad: w.rad });
    g.p.vx -= Math.cos(a) * 140; g.p.recoil = 5;
    ap.burst(x, y, 10, [w.color, "#ffffff", "#8a8aa0"], 110, 0.3, 0, 1); ap.ring(x, y, 14, w.color, 0.2);
    ap.shake(3); ap.rumble(0.7, 0.3, 140); ap.sfx("heavy");
  }

  function fireShock(w, x, y, a, s, dmg) {
    var g = G(), ap = api(), range = s.range, best = null, bs = 1e9, i, e;
    for (i = 0; i < g.enemies.length; i++) {               // Zielhilfe: naechster Gegner in einem Kegel von +-35 Grad
      e = g.enemies[i];
      if (e.dead || e.hacked > 0) continue;
      var ex = e.x - x, ey = (e.y - e.h / 2) - y, d = Math.hypot(ex, ey) - Math.min(e.w, e.h) / 2;
      if (d > range) continue;
      var da = Math.abs(Math.atan2(Math.sin(Math.atan2(ey, ex) - a), Math.cos(Math.atan2(ey, ex) - a)));
      if (da > 0.61) continue;
      var sc = d + da * 120;
      if (sc < bs) { bs = sc; best = e; }
    }
    ap.sfx("egun"); g.p.recoil = 1.5;
    if (!best) {
      var tx = x + Math.cos(a) * range * 0.7, ty = y + Math.sin(a) * range * 0.7;
      g.beams.push({ pts: zig({ x: x, y: y }, { x: tx, y: ty }), col: w.color, life: 0.1, max: 0.1 });
      return;
    }
    var used = [best], cur = best, path = [{ x: x, y: y }, { x: best.x, y: best.y - best.h / 2 }], mul = 1, k;
    zap(best, dmg, w, a);
    for (k = 0; k < w.chain; k++) {
      var nx = null, nd = 80;
      for (i = 0; i < g.enemies.length; i++) {
        e = g.enemies[i];
        if (e.dead || e.hacked > 0 || used.indexOf(e) >= 0) continue;
        var dd = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (dd < nd) { nd = dd; nx = e; }
      }
      if (!nx) break;
      mul *= 0.75; used.push(nx); path.push({ x: nx.x, y: nx.y - nx.h / 2 });
      zap(nx, dmg * mul, w, a); cur = nx;
    }
    var pts = [], j;
    for (j = 0; j < path.length - 1; j++) pts = pts.concat(zig(path[j], path[j + 1]));
    g.beams.push({ pts: pts, life: 0.13, max: 0.13, col: w.color });
    g.beams.push({ pts: pts.map(function (p) { return { x: p.x, y: p.y + 0.5 }; }), life: 0.07, max: 0.07, col: "#ffffff" });
  }
  function zap(e, dmg, w, a) {
    var ap = api();
    ap.hurtEnemy(e, dmg, ap.sgn(Math.cos(a)) || 1, "area");        // Blitz umgeht Frontschilde
    if (!e.dead && !e.cfg.isBoss && !e.cfg.fixed) { e.stun = w.stun; ap.burst(e.x, e.y - e.h / 2, 5, [w.color, "#ffffff"], 70, 0.25, 0, 1); }
    else if (!e.dead) ap.burst(e.x, e.y - e.h / 2, 3, [w.color, "#ffffff"], 50, 0.2, 0, 1);
  }
  function zig(a, b) {
    var pts = [a], n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8)), nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1, i;
    nx /= l; ny /= l;
    for (i = 1; i < n; i++) { var t = i / n, o = (api().rand() - 0.5) * 7; pts.push({ x: a.x + (b.x - a.x) * t + nx * o, y: a.y + (b.y - a.y) * t + ny * o }); }
    pts.push(b);
    return pts;
  }

  // Einstieg aus game.js (fireWeapon) fuer alle neuen Waffentypen
  var FIRE = { laser: fireLaser, burst: fireBurst, cannon: fireCannon, shock: fireShock };
  CB.Weapons2 = {
    handles: function (type) { return !!FIRE[type]; },
    fire: function (w, x, y, a, s, dmg) { FIRE[w.type](w, x, y, a, s, dmg); },
    // Betaeubter Gegner (ELECTRO GUN): bleibt stehen. Rueckgabe true = Gegner-KI uebersprungen
    stunned: function (e, dt) {
      if (!(e.stun > 0)) return false;
      e.stun -= dt; e.t += dt; e.hit = Math.max(0, e.hit - dt);
      var c = e.cfg;
      if (!c.fly && !c.fixed) { e.vx = 0; api().groundPhysics(e, dt); }
      if (api().rand() < 0.25) api().burst(e.x + (api().rand() - 0.5) * e.w, e.y - e.h - 1, 1, ["#7fb8ff", "#ffffff"], 30, 0.2, 0, 1);
      return true;
    }
  };

  // ---------- Skins (rein kosmetisch, keine Werte) ----------
  // price: Credits. cleared: wird automatisch frei, sobald der Sektor besiegt ist (Wuestenkampagne).
  CB.SKINS = {
    robot: [
      { id: "r_sand",    name: "DESERT SAND",  col: { b: "#e0a050", l: "#ffe3a8", d: "#8a5a20" }, cleared: 10 },
      { id: "r_ice",     name: "ICE SHELL",    col: { b: "#7fd8ff", l: "#e0f6ff", d: "#2a6a8a" }, price: 2000 },
      { id: "r_stealth", name: "STEALTH OPS",  col: { b: "#4a5a78", l: "#8aa0c8", d: "#1c2436" }, price: 3000 },
      { id: "r_gold",    name: "GOLD PLATED",  col: { b: "#ffd23f", l: "#fff3b0", d: "#a87a10" }, price: 6000 },
      { id: "r_magma",   name: "MAGMA CORE",   col: { b: "#ff5a1f", l: "#ffb070", d: "#8a1a0a" }, cleared: 14 }
    ],
    weapon: [
      { id: "w_sand",    name: "DUNE BRASS",   color: "#ffb23f", cleared: 11 },
      { id: "w_ice",     name: "FROST",        color: "#9fe8ff", price: 1200 },
      { id: "w_toxic",   name: "TOXIC",        color: "#8aff3a", price: 2000 },
      { id: "w_gold",    name: "GOLD",         color: "#ffd23f", price: 3500 },
      { id: "w_magma",   name: "MAGMA",        color: "#ff5a1f", cleared: 14 }
    ]
  };
  function find(kind, id) { var l = CB.SKINS[kind]; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  CB.Skins = {
    find: find,
    owned: function (kind, id) {
      var sk = find(kind, id), d = CB.Save.data;
      if (!sk) return false;
      return d.skins.owned[id] === true || (sk.cleared != null && d.progress.cleared[sk.cleared] === true);
    },
    selected: function (kind) { var id = CB.Save.data.skins[kind]; return id && this.owned(kind, id) ? find(kind, id) : null; },
    equip: function (kind, id) {                         // id "" = Standard
      var d = CB.Save.data;
      if (id && !this.owned(kind, id)) return false;
      d.skins[kind] = id || ""; CB.Save.save(); return true;
    },
    buy: function (kind, id) {
      var sk = find(kind, id), d = CB.Save.data;
      if (!sk || sk.price == null || this.owned(kind, id) || d.credits < sk.price) return false;
      d.credits -= sk.price; d.skins.owned[id] = true; d.skins[kind] = id; CB.Save.save(); return true;
    },
    robotSprite: function (charId, skinId) {             // skinId weglassen = ausgewaehlter Skin des Spielers
      var sk = skinId === undefined ? this.selected("robot") : (skinId ? find("robot", skinId) : null);
      return Sp.robotFor(charId, sk && sk.col);
    },
    weaponSprite: function (weaponId, skinId) {
      var sk = skinId === undefined ? this.selected("weapon") : (skinId ? find("weapon", skinId) : null);
      return Sp.weaponFor(weaponId, sk && sk.color);
    }
  };
})(window.CB);
