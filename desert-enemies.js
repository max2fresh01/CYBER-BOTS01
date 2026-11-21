/* CYBER BOTS - desert-enemies.js
   Verhalten (KI), Zusatzgrafik und Boss-Kampf der Wuestenroboter. Nutzt die Bausteine aus game.js (CB.Game.api) und hazards.js. */
(function (CB) {
  "use strict";

  var E = CB.ENEMIES, W = CB.W, GROUND = CB.GROUND;
  function api() { return CB.Game.api; }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function blink(t, f) { return (Math.floor(t * f) & 1) === 1; }
  function patrol(e, dt, A, mul) {
    e.patrolT -= dt;
    if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 1.5 + A.rand() * 2; }
    e.vx = e.dir * e.cfg.speed * (mul || 0.4); e.face = e.dir;
  }
  // Wurfgeschoss mit Flugbahn zum Zielpunkt tx (Flugzeit T)
  function lob(e, A, tx, T, opts, y0) {
    var g = 420, x0 = e.x + e.face * 10; y0 = y0 == null ? e.y - e.h + 4 : y0;
    var s = A.enemyShot(x0, y0, 0, 1, e.cfg.dmg * e.dmgMul, Object.assign({ g: g, r: 3, big: true, life: 2.6, quiet: true }, opts));
    s.vx = (tx - x0) / T; s.vy = (GROUND - y0 - 0.5 * g * T * T) / T;
    A.sfx("lob");
    return s;
  }
  function boom(r) { return function (b) { CB.Hazards.blast(b.x, GROUND - 2, r, b.dmg, "#ffa23a"); }; }

  // ---------- DESERT SCOUT: schleicht heran, duckt sich (Warnung), schiesst im Sprint auf den Spieler zu, zieht sich zurueck ----------
  E.scout.init = function (e) { e.mode = "stalk"; e.mt = 0; };
  E.scout.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, want = sgn(dx);
    e.mt -= dt;
    if (!e.aggro) { patrol(e, dt, A, 0.35); A.groundPhysics(e, dt); return; }
    if (e.mode === "stalk") {
      e.face = want;
      e.vx = Math.abs(dx) > 90 ? want * c.speed * 0.8 : -want * c.speed * 0.3;
      if (e.onGround && e.hopCd <= 0 && py < e.y - e.h - 18 && Math.abs(dx) < 70) { e.vy = -250; e.hopCd = 1.4; }
      if (e.cool <= 0 && Math.abs(dx) < 170 && Math.abs(py - (e.y - 8)) < 50) { e.mode = "wind"; e.mt = 0.4; e.vx = 0; A.sfx("warn"); }
    } else if (e.mode === "wind") {
      e.vx = 0; e.face = want;
      if (e.mt <= 0) { e.mode = "dash"; e.mt = 0.42; e.dashDir = want; }
    } else if (e.mode === "dash") {
      e.vx = e.dashDir * c.speed * 2.7; e.face = e.dashDir;
      if (e.mt <= 0) { e.mode = "back"; e.mt = 0.7; e.cool = 1.4 + A.rand() * 1.2; }
    } else {
      e.vx = -e.dashDir * c.speed * 0.9; e.face = e.dashDir;
      if (e.mt <= 0) e.mode = "stalk";
    }
    A.groundPhysics(e, dt);
  };
  E.scout.fx = function (ctx, e, x, t) {
    if (e.mode === "wind") R(ctx, "#ff3b3b", x - 8, e.y - e.h - 2, 16, e.h + 4, blink(t, 20) ? 0.45 : 0.15);
    if (e.mode === "dash") for (var i = 1; i < 4; i++) R(ctx, "#ffe29a", x - e.dashDir * i * 8 - 3, e.y - e.h + 3, 6, e.h - 6, 0.22 / i);
  };

  // ---------- SAND GUARD: Frontschild, dreht sich langsam um (Ruecken ungeschuetzt), Dreier-Salven ----------
  E.sandguard.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, want = sgn(dx);
    if (e.aggro) {
      e.turnT = Math.max(0, (e.turnT || 0) - dt);
      if (want !== e.face) {
        if (!e.turning) { e.turning = true; e.turnT = 0.9; }
        if (e.turnT <= 0) { e.face = want; e.turning = false; }
        e.vx = 0;
      } else {
        e.turning = false;
        var d = Math.abs(dx);
        e.vx = d > 90 ? e.face * c.speed : d < 50 ? -e.face * c.speed * 0.5 : 0;
        if (e.burst > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) {
            e.burst--; e.burstT = 0.16;
            A.enemyShot(e.x + e.face * 9, e.y - 12, Math.atan2(py - (e.y - 12), px - e.x), 150, c.dmg * e.dmgMul, { col: "#ffb23f" });
          }
        } else if (e.cool <= 0 && dist < c.detect) { e.burst = 3; e.burstT = 0; e.cool = 1 / c.rate + A.rand() * 0.8; }
      }
    } else { e.turning = false; patrol(e, dt, A, 0.4); }
    A.groundPhysics(e, dt);
  };
  function shield(ctx, e, x, t, tall, wide) {
    var sx = x + e.face * (e.w / 2 + 3), top = e.y - e.h + (tall ? 2 : 3), h = e.h - (tall ? 4 : 6), down = e.turning;
    var col = down ? "#7a6a58" : "#ffd27a";
    R(ctx, col, sx - 1 - (e.face > 0 ? 0 : 1), top, 2 + (wide || 0), h, down ? 0.35 : 0.9);
    R(ctx, col, sx - 3, top, 7, h, down ? 0.06 : 0.18 + 0.08 * Math.sin(t * 8));
    if (!down) R(ctx, "#ffffff", sx - (e.face > 0 ? 0 : 1), top + 1, 1, h - 2, 0.7);
  }
  E.sandguard.fx = function (ctx, e, x, t) { shield(ctx, e, x, t, false, 0); };

  // ---------- COMBAT DRONE: umkreist den Spieler in der Luft, feuert Doppelschuesse, taucht gelegentlich an ----------
  E.cdrone.init = function (e) { e.vx = 0; e.vy = 0; };
  E.cdrone.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game;
    if (e.aggro) {
      var tx = px + Math.cos(e.t * 0.9) * 110, ty = py - 64 + Math.sin(e.t * 1.6) * 16;
      e.vx += clamp(tx - e.x, -140, 140) * 2 * dt; e.vx = clamp(e.vx, -c.speed, c.speed);
      e.y += clamp(ty - e.y, -55, 55) * 2.2 * dt;
      e.face = sgn(dx);
      if (e.cool <= 0 && dist < 260) {
        e.cool = 1 / c.rate + A.rand() * 0.6;
        var a = Math.atan2(py - e.y, px - e.x);
        for (var i = -1; i <= 1; i += 2) A.enemyShot(e.x + e.face * 6, e.y + i * 2, a + i * 0.06, 150, c.dmg * e.dmgMul, { col: "#35f0ff" });
      }
    } else {
      e.vx += e.dir * 20 * dt; e.vx = clamp(e.vx, -24, 24);
      e.y = e.baseY + Math.sin(e.t * 2) * 6;
      e.patrolT -= dt; if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 2 + A.rand() * 2; }
      e.face = e.dir;
    }
    e.x = clamp(e.x + e.vx * dt, e.w / 2, G.worldW - e.w / 2);
    e.y = clamp(e.y, 22, GROUND - 26);
  };

  // ---------- HEAVY DEFENDER: langsam, wirft Moerser-Granaten und stampft (Schockwelle nach kurzer Warnung) ----------
  E.defender.init = function (e) { e.mode = "walk"; e.mt = 0; };
  E.defender.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, want = sgn(dx), Hz = CB.Hazards;
    e.mt -= dt;
    if (!e.aggro) { patrol(e, dt, A, 0.35); A.groundPhysics(e, dt); return; }
    e.face = want;
    if (e.mode === "walk") {
      e.vx = Math.abs(dx) > 110 ? want * c.speed : 0;
      if (e.cool <= 0) {
        if (Math.abs(dx) < 90) { e.mode = "stomp"; e.mt = 0.7; e.vx = 0; A.sfx("warn"); }
        else {
          var n = 2;
          for (var i = 0; i < n; i++) lob(e, A, px + (i - 0.5) * 50, 1.05, { r: 4, col: "#ff7a3d", onLand: boom(26) }, e.y - e.h + 6);
          e.cool = 1 / c.rate + 0.5;
        }
      }
    } else {                                                           // Stampf: Warnung, dann Schockwellen nach beiden Seiten
      e.vx = 0;
      if (e.mt <= 0) {
        e.mode = "walk"; e.cool = 1.6;
        Hz.blast(e.x, GROUND - 4, 70, Math.round(c.dmg * 1.4 * e.dmgMul), "#ffb23f");
        A.shake(4);
      }
    }
    A.groundPhysics(e, dt);
  };
  E.defender.fx = function (ctx, e, x, t) {
    if (e.mode === "stomp") R(ctx, "#ff5a2a", x - 70, GROUND - 3, 140, 3, blink(t, 16) ? 0.6 : 0.2);
  };

  // =====================================================================================
  // BOSS: DESERT TITAN - 3 Phasen
  //  1) Salven + Laserfaecher       2) Panzerphase, Scouts, Stampfen + Granatenregen       3) Raserei: Doppellaser, Drohnen, Feuer
  // =====================================================================================
  E.titan.init = function (e) { e.stage = 1; e.invT = 0; e.face = -1; e.shT = 0; e.mode = "walk"; e.mt = 0; e.stompN = 0; };
  E.titan.onHurt = function (e, dmg) {
    if (e.invT > 0) { e.shT -= 1; if (e.shT <= 0) { e.shT = 6; api().text(e.x, e.y - e.h - 6, "ARMORED", "#e8a468"); api().sfx("block"); } return 0; }
    return dmg;
  };
  function titanBeam(e, A, ang, sweep, dur, mul) {
    var c = e.cfg, b = CB.Hazards.beam(e.x, e.y - 52, ang, 780, 1.0, dur, Math.round(c.dmg * 1.4 * e.dmgMul * (mul || 1)), 8, "#ff5a2a");
    b.sweep = sweep; b.src = e; b.ox = e.face * 16; b.oy = -52; b.owner = e;
    A.sfx("charge");
    return b;
  }
  E.titan.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, Hz = CB.Hazards, i, dm = e.dmgMul;
    var ph = e.hp < e.maxHp * 0.33 ? 3 : e.hp < e.maxHp * 0.66 ? 2 : 1;
    e.aggro = true; e.phase = ph; e.invT = Math.max(0, e.invT - dt); e.mt -= dt;
    if (e.mode !== "stomp") e.face = sgn(dx);

    if (ph > e.stage) {                                               // Phasenwechsel: kurz gepanzert, ruft Verstaerkung
      e.stage = ph; e.invT = 3; e.vx = 0; e.mode = "walk"; e.cool = 2.5;
      for (i = 0; i < 2; i++) { var s = A.spawnEnemy(ph === 2 ? "scout" : "cdrone", e.x + (i ? 70 : -70), ph === 2 ? GROUND : 60); s.aggro = true; s.alert = 0.5; }
      A.text(e.x, e.y - e.h - 10, ph === 2 ? "ARMOR PLATING!" : "OVERLOAD!", ph === 2 ? "#e8a468" : "#ff3b2a");
      A.sfx("boss"); A.shake(7);
      A.burst(e.x, e.y - 32, 28, ["#e8a468", "#ffffff", "#ff8a1f"], 130, 0.7, 0, 2);
    }

    if (e.mode === "walk") {
      e.vx = (Math.abs(dx) > 190 && e.invT <= 0) ? e.face * c.speed * (1 + 0.3 * (ph - 1)) : 0;
      if (e.cool <= 0 && e.invT <= 0) {
        var k = e.pat++ % (ph === 1 ? 2 : 3);
        if (k === 0) {                                                // Granatenfaecher
          var n = ph === 1 ? 3 : ph === 2 ? 4 : 5, mid = (n - 1) / 2;
          for (i = 0; i < n; i++) lob(e, A, px + (i - mid) * 46, 1.1, { r: 4, col: "#ff7a3d", onLand: boom(28) }, e.y - 52);
        } else if (k === 1) {                                         // Laserfaecher von der Schulterkanone
          titanBeam(e, A, e.face > 0 ? 1.1 : Math.PI - 1.1, (e.face > 0 ? -1 : 1) * 0.8 * (1 + 0.25 * (ph - 1)), 1.7);
          if (ph === 3) titanBeam(e, A, e.face > 0 ? 0.5 : Math.PI - 0.5, (e.face > 0 ? 1 : -1) * 0.8, 1.7, 0.8);   // zweiter Strahl kreuzt
        } else {                                                      // Stampfen: Warnung, dann Einschlagreihen links und rechts
          e.mode = "stomp"; e.mt = 0.8; e.vx = 0; A.sfx("warn");
        }
        e.cool = [2.3, 1.8, 1.4][ph - 1];
      }
    } else if (e.mode === "stomp") {
      e.vx = 0;
      if (e.mt <= 0) {
        e.mode = "walk"; A.shake(8); A.ring(e.x, GROUND - 4, 70, "#ffb23f", 0.35); A.sfx("slam");
        Hz.blast(e.x, GROUND - 4, 74, Math.round(c.dmg * 1.5 * dm), "#ffb23f");
        var cnt = ph === 2 ? 3 : 5;
        for (i = 0; i < cnt; i++) Hz.strike(clamp(px + (i - (cnt - 1) / 2) * 60 + (A.rand() - 0.5) * 20, 20, G.worldW - 20), 30, 1.2, Math.round(c.dmg * 1.3 * dm), "shell");
        if (ph === 3) Hz.fire(clamp(px, 40, G.worldW - 40), 60, 4);   // Feuerfeld in Phase 3
      }
    }
    A.groundPhysics(e, dt);
  };
  E.titan.fx = function (ctx, e, x, t) {
    var ph = e.phase || 1, top = e.y - e.h;
    if (e.mode === "stomp") R(ctx, "#ff5a2a", x - 74, GROUND - 3, 148, 3, blink(t, 16) ? 0.65 : 0.2);
    if (e.invT > 0) R(ctx, "#ffe0a0", x - 32, top, 64, e.h, 0.12 + 0.1 * Math.sin(t * 30));
    if (ph >= 2) R(ctx, "#ff8a1f", x + 6, top + 4, 3, 2, blink(t, 10) ? 0.9 : 0.2);     // Rauch/Glut aus den Rohren
    if (ph === 3 && blink(t, 7)) R(ctx, "#ff3b2a", x - 30, top + 32, 60, 2, 0.5);
  };
})(window.CB);
