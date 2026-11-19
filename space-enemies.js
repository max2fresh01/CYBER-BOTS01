/* CYBER BOTS - space-enemies.js
   Verhalten (KI), Zusatzgrafik und Boss-Kaempfe der Weltraum-Gegner. Alle Gegner nutzen die
   Bausteine aus game.js (CB.Game.api) und hazards.js (Einschlaege, Strahlen, Explosionen). */
(function (CB) {
  "use strict";

  var E = CB.ENEMIES, W = CB.W, GROUND = CB.GROUND;
  function api() { return CB.Game.api; }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function blink(t, f) { return (Math.floor(t * f) & 1) === 1; }

  // Frontschild zeichnen (Wachroboter und Sentinel)
  function shieldFx(ctx, e, x, t, tall, wide) {
    var sx = x + e.face * (e.w / 2 + 3), top = e.y - e.h + (tall ? 2 : 3), h = e.h - (tall ? 4 : 6);
    var down = e.turning;                                   // dreht sich gerade um: Schild offen, Ruecken frei
    var col = down ? "#6a7090" : "#8fe6ff";
    R(ctx, col, sx - 1 - (e.face > 0 ? 0 : 1), top, 2 + (wide || 0), h, down ? 0.35 : 0.9);
    R(ctx, col, sx - 3, top, 7, h, down ? 0.06 : 0.18 + 0.08 * Math.sin(t * 8));
    if (!down) { R(ctx, "#ffffff", sx - (e.face > 0 ? 0 : 1), top + 1, 1, h - 2, 0.7); }
  }

  // ---------- Wachroboter: Frontschild, dreht sich langsam um ----------
  E.guard.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, want = sgn(dx);
    if (e.aggro) {
      e.turnT = Math.max(0, (e.turnT || 0) - dt);
      if (want !== e.face) {
        if (!e.turning) { e.turning = true; e.turnT = 0.9; }          // Zeitfenster, in dem der Ruecken ungeschuetzt ist
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
            A.enemyShot(e.x + e.face * 9, e.y - 12, Math.atan2(py - (e.y - 12), px - e.x), 150, c.dmg * e.dmgMul, { col: "#8fe6ff" });
          }
        } else if (e.cool <= 0 && dist < c.detect) { e.burst = 3; e.burstT = 0; e.cool = 1 / c.rate + A.rand() * 0.8; }
      }
    } else {
      e.turning = false;
      e.patrolT -= dt;
      if (e.patrolT <= 0) { e.dir = -e.dir; e.patrolT = 1.5 + A.rand() * 2; }
      e.vx = e.dir * c.speed * 0.4; e.face = e.dir;
    }
    A.groundPhysics(e, dt);
  };
  E.guard.fx = function (ctx, e, x, t) { shieldFx(ctx, e, x, t, false, 0); };

  // ---------- Laser-Turm: zielt, rastet ein, feuert einen Dauerstrahl ----------
  E.lasertower.init = function (e) { e.aim = -Math.PI / 2; e.ph = "idle"; e.st = 0; e.beam = null; e.cool = 1.2 + Math.random() * 1.5; };
  E.lasertower.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, Hz = CB.Hazards, ox = e.x, oy = e.y - 22;
    e.vx = 0; e.vy = 0; e.st -= dt;
    if (e.ph === "idle") {
      if (e.aggro && dist < c.detect && e.cool <= 0) {
        e.ph = "charge"; e.st = 1.25;
        var b = Hz.beam(ox, oy, Math.atan2(py - oy, px - ox), 700, 1.25, 0.5, c.dmg * e.dmgMul, 6, "#ff3b6b");
        b.trackUntil = 0.9; b.turn = 1.5; b.owner = e; e.beam = b;
        A.sfx("charge");
      }
    } else if (e.ph === "charge") {
      if (e.st <= 0) { e.ph = "cool"; e.st = 0.6; e.cool = 2.2 + A.rand() * 0.8; }
    } else if (e.st <= 0) e.ph = "idle";
    if (e.beam) { e.aim = e.beam.ang; if (e.beam.t >= e.beam.warn + e.beam.dur) e.beam = null; }
  };
  E.lasertower.fx = function (ctx, e, x, t) {
    var oy = e.y - 22, charging = e.ph === "charge";
    var lx = x + Math.cos(e.aim) * 7, ly = oy + Math.sin(e.aim) * 7;
    ctx.fillStyle = "#07031a"; ctx.fillRect(Math.round(lx) - 2, Math.round(ly) - 2, 5, 5);
    ctx.fillStyle = charging ? (blink(t, 16) ? "#ffffff" : "#ff3b6b") : "#ff9aa8";
    ctx.fillRect(Math.round(lx) - 1, Math.round(ly) - 1, 3, 3);
    if (charging) R(ctx, "#ff3b6b", x - 9, oy - 9, 18, 18, 0.1 + 0.1 * Math.sin(t * 30));
  };

  // ---------- Boss 05: STATION SENTINEL ----------
  // Frontal gepanzert (15 %). Wer ueber ihn springt, trifft den Ruecken, solange er sich langsam dreht.
  function sentinelSalvo(e, A, px, G) {
    var c = e.cfg, Hz = CB.Hazards, g = 420, T = 1.0;
    for (var i = 0; i < 3; i++) {
      var tx = px + (i - 1) * 55, x0 = e.x + e.face * 18, y0 = e.y - 40;
      var s = A.enemyShot(x0, y0, 0, 1, c.dmg * 1.2 * e.dmgMul, { g: g, r: 3, big: true, col: "#ffa23a", life: 2.5, quiet: true,
        onLand: function (b) { Hz.blast(b.x, GROUND - 2, 26, b.dmg, "#ffa23a"); } });
      s.vx = (tx - x0) / T + (i - 1) * 4; s.vy = (GROUND - y0 - 0.5 * g * T * T) / T;
    }
    A.sfx("lob");
  }
  function sentinelGrid(e, ph, A, G, px) {
    var c = e.cfg, Hz = CB.Hazards, cols = [], x, step = 52;
    for (x = Math.round(G.camX) + 22; x < G.camX + W - 10; x += step) cols.push(x);
    var near = 0, bd = 1e9, i;
    for (i = 0; i < cols.length; i++) if (Math.abs(cols[i] - px) < bd) { bd = Math.abs(cols[i] - px); near = i; }
    var other = (near + 2 + Math.floor(A.rand() * (cols.length - 3)) ) % cols.length;
    for (i = 0; i < cols.length; i++) {
      if (i === near || i === other) continue;
      Hz.strike(cols[i], 22, ph === 2 ? 0.95 : 1.15, Math.round(c.dmg * 1.8 * e.dmgMul), "laser");
    }
    A.sfx("warn"); A.shake(1.5);
  }
  E.sentinel.init = function (e) { e.mode = "walk"; e.mt = 0; e.turning = false; e.turnT = 0; e.droneT = 6; e.face = -1; };
  E.sentinel.ai = function (e, dt, px, py, dx, dist) {
    var A = api(), c = e.cfg, G = CB.Game, ph = e.hp < e.maxHp * 0.5 ? 2 : 1, want = sgn(dx);
    e.aggro = true; e.phase = ph;
    e.turnT = Math.max(0, e.turnT - dt); e.mt -= dt;
    if (e.mode !== "dash") {
      if (want !== e.face) {
        if (!e.turning) { e.turning = true; e.turnT = ph === 2 ? 0.9 : 1.3; }
        if (e.turnT <= 0) { e.face = want; e.turning = false; }
      } else e.turning = false;
    }
    if (e.mode === "walk") {
      e.vx = (!e.turning && Math.abs(dx) > 140) ? e.face * c.speed * (ph === 2 ? 1.4 : 1) : 0;
      if (e.cool <= 0 && !e.turning) {
        var k = e.pat++ % 3;
        if (k === 0) sentinelSalvo(e, A, px, G);
        else if (k === 1) sentinelGrid(e, ph, A, G, px);
        else { e.mode = "tele"; e.mt = 0.6; A.sfx("warn"); }
        e.cool = ph === 2 ? 1.5 : 2.3;
      }
    } else if (e.mode === "tele") {
      e.vx = 0;
      if (e.mt <= 0) { e.mode = "dash"; e.mt = 0.65; e.dashDir = e.face; A.sfx("slam"); }
    } else if (e.mode === "dash") {
      e.vx = e.dashDir * 235;
      if (e.mt <= 0) { e.mode = "walk"; e.vx = 0; A.shake(3); A.ring(e.x, e.y - 6, 40, "#8fe6ff", 0.3); }
    }
    if (ph === 2) {
      e.droneT -= dt;
      var n = 0, j;
      for (j = 0; j < G.enemies.length; j++) if (G.enemies[j].type === "drone") n++;
      if (e.droneT <= 0 && n < 3) {
        e.droneT = 9;
        for (j = 0; j < 2; j++) { var d = A.spawnEnemy("drone", e.x + (j ? 26 : -26), e.y - 50); d.aggro = true; d.alert = 0.5; }
        A.text(e.x, e.y - e.h - 10, "DEFENSE DRONES!", "#35f0ff");
      }
    }
    A.groundPhysics(e, dt);
  };
  E.sentinel.fx = function (ctx, e, x, t) {
    shieldFx(ctx, e, x, t, true, 2);
    if (e.mode === "tele") { var a = blink(t, 18) ? 0.5 : 0.15; R(ctx, "#ff3b6b", x - 22, e.y - e.h - 2, 44, e.h + 4, a); }
    if (e.mode === "dash") for (var i = 1; i < 4; i++) R(ctx, "#8fe6ff", x - e.dashDir * i * 12 - 6, e.y - e.h + 8, 12, e.h - 16, 0.22 / i);
    if (e.phase === 2 && blink(t, 6)) R(ctx, "#ff3b6b", x - 3, e.y - e.h + 20, 6, 2, 0.9);   // Kern gluehte rot
  };
})(window.CB);
