/* CYBER BOTS - desert-bg.js
   Hintergruende, Boeden und Plattformen der Kampagne DESERT PLANET (kind: dunes, dusttown, outpost, underground, core).
   Werden in CB.SpaceBG.kinds eingetragen; Sandstuerme zeichnen sich ueber CB.Desert.stormK (0..1) in die Atmosphaere. */
(function (CB) {
  "use strict";

  var W = CB.W, H = CB.H, GROUND = CB.GROUND, TW = 960, TAU = Math.PI * 2;
  var K = CB.SpaceBG.kinds;
  function mk(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function wrapX(x) { return ((x % TW) + TW) % TW; }
  function R(ctx, col, x, y, w, h, a) {
    if (a !== undefined) ctx.globalAlpha = a;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function tile(ctx, img, camX, f) {
    var off = -Math.floor(camX * f) % TW;
    if (off > 0) off -= TW;
    ctx.drawImage(img, off, 0);
    if (off + TW < W) ctx.drawImage(img, off + TW, 0);
  }
  function each(x, camX, f, w, fn) {
    var sx = wrapX(x - camX * f);
    if (sx < W + w) fn(sx);
    if (sx - TW > -w && sx - TW < W) fn(sx - TW);
  }
  function storm() { return (CB.Desert && CB.Desert.stormK) || 0; }
  function skyGrad(th, rnd, stars) {
    var sky = mk(W, H), sx = sky.getContext("2d"), g = sx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    for (var i = 0; i < (stars || 0); i++) { sx.globalAlpha = 0.2 + rnd() * 0.6; sx.fillStyle = "#ffffff"; sx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H * 0.5), rnd() < 0.1 ? 2 : 1, 1); }
    sx.globalAlpha = 1;
    return sky;
  }
  // periodische Duenenlinie (nahtlos kachelbar)
  function dunes(ctx, col, base, a1, a2, k1, k2, ph, hl) {
    for (var x = 0; x < TW; x++) {
      var y = base + Math.sin(x * k1 * TAU / TW + ph) * a1 + Math.sin(x * k2 * TAU / TW + ph * 2.3) * a2;
      ctx.fillStyle = col; ctx.fillRect(x, Math.round(y), 1, H - Math.round(y));
      if (hl) { ctx.fillStyle = hl; ctx.globalAlpha = 0.35; ctx.fillRect(x, Math.round(y), 1, 1); ctx.globalAlpha = 1; }
    }
  }
  // Sandstrich-Partikel; staerker im Sandsturm
  function sandAtmo(ctx, t, q, base, col) {
    var k = storm(), n = Math.round((q === "low" ? 8 : 18) + k * (q === "low" ? 40 : 110));
    ctx.fillStyle = col;
    for (var i = 0; i < n; i++) {
      var sp = 90 + (i % 7) * 36 + k * 260, y = (i * 37.3 + Math.sin(t * 0.7 + i) * 6) % H, x = ((W + 20) - ((i * 71.9 + t * sp) % (W + 40)));
      ctx.globalAlpha = (0.12 + (i % 4) * 0.05) * (0.4 + k);
      ctx.fillRect(Math.round(x), Math.round(y), 3 + Math.round(k * 9) + (i % 3), 1);
    }
    ctx.globalAlpha = 1;
  }
  function stormVeil(ctx, col, k) {
    if (k <= 0.02) return;
    ctx.globalAlpha = Math.min(0.62, k * 0.6); ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }

  // =====================================================================================
  // 1 THE DUNES: Sonnenuntergang, riesige Duenen, abgestuerzte Raumschiffe, verlassene Maschinen
  // =====================================================================================
  function wreck(c, x, y, ang, col, dk) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col; c.fillRect(-34, -9, 62, 14); c.fillRect(28, -6, 10, 8); c.fillRect(-40, -16, 8, 10);       // Rumpf, Bug, Heckflosse
    c.fillStyle = dk; c.fillRect(-34, 3, 62, 3); c.fillRect(-10, -14, 20, 5); c.fillRect(-26, -5, 6, 4); c.fillRect(8, -5, 6, 4);
    c.fillStyle = "#07031a"; c.fillRect(30, -4, 6, 3);
    c.restore();
  }
  K.dunes = {
    build: function (th, rnd) {
      var o = {}; o.sky = skyGrad(th, rnd, 60);
      var far = mk(TW, H), fx = far.getContext("2d"); dunes(fx, th.far, 170, 14, 7, 2, 5, 0.4);
      wreck(fx, 600, 178, 0.35, "#5a2420", "#3a1614"); o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"); dunes(mx, th.mid, 196, 20, 8, 1, 3, 1.7, "#ffcf8a");
      wreck(mx, 300, 204, -0.22, "#6a3a28", "#3a1e14"); o.smoke = [{ x: 262, y: 188 }];
      mx.fillStyle = "#3a1e14";                                                                                      // verlassene Maschine (Bagger)
      mx.fillRect(740, 192, 26, 9); mx.fillRect(748, 176, 5, 16); mx.fillRect(748, 176, 26, 4); mx.fillRect(772, 176, 3, 16); mx.fillStyle = "#07031a"; mx.fillRect(738, 200, 30, 4);
      o.mid = mid;
      var near = mk(TW, H), nx = near.getContext("2d"); dunes(nx, th.near, 232, 8, 4, 3, 7, 2.1);
      nx.fillStyle = "#2a140e";
      for (var i = 0; i < 7; i++) { var px = 80 + i * 130 + Math.floor(rnd() * 40), ph = 22 + Math.floor(rnd() * 22); nx.fillRect(px, 232 - ph, 2, ph + 6); if (rnd() < 0.6) nx.fillRect(px - 3, 232 - ph, 8, 2); }
      o.near = near; return o;
    },
    draw: function (ctx, b, camX, t) {
      ctx.drawImage(b.sky, 0, 0);
      var sx = 340 - camX * 0.02, sy = 150;                                                                          // riesige Sonne
      for (var r = 62; r > 0; r -= 6) R(ctx, "#ffd9a0", sx - r, sy - r, r * 2, r * 2, 0.025);
      for (var yy = -34; yy <= 34; yy++) { var hw = Math.floor(Math.sqrt(1156 - yy * yy)); R(ctx, yy > 8 ? "#ffcf6a" : "#fff0b0", sx - hw, sy + yy, hw * 2, 1, 0.95); }
      R(ctx, "#b53d22", sx - 40, sy + 4, 80, 1, 0.5); R(ctx, "#b53d22", sx - 38, sy + 14, 76, 1, 0.5);
      R(ctx, "#e8d8ff", 60 - camX * 0.01, 34, 7, 7, 0.85); R(ctx, "#ffe0f0", 118 - camX * 0.01, 56, 4, 4, 0.8);     // zwei Monde
      tile(ctx, b.far, camX, 0.1); tile(ctx, b.mid, camX, 0.28);
      for (var i = 0; i < b.smoke.length; i++) each(b.smoke[i].x, camX, 0.28, 30, function (px) {                      // Rauch am Wrack
        for (var k = 0; k < 6; k++) R(ctx, "#2a1a1a", px + Math.sin(t * 0.8 + k) * 4 + k, b.smoke[i].y - k * 8 - (t * 6 % 8), 6 + k, 5, 0.4 - k * 0.05);
      });
      tile(ctx, b.near, camX, 0.5);
    },
    atmo: function (ctx, b, t, q) { sandAtmo(ctx, t, q, 0, "#f0b070"); stormVeil(ctx, "#c8782a", storm()); },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND); R(ctx, "#8a4a22", 0, GROUND + 14, W, H - GROUND - 14); R(ctx, "#07031a", 0, GROUND, W, 2); R(ctx, "#ffd27a", 0, GROUND, W, 1);
      var off = -Math.floor(camX) % 48;
      for (var x = off; x < W; x += 48) { R(ctx, "#a85e2a", x + 6, GROUND + 6, 20, 1); R(ctx, "#e8a060", x + 12, GROUND + 4, 10, 1, 0.5); R(ctx, "#7a3e1c", x + 30, GROUND + 18, 12, 1); R(ctx, "#5a2e18", x + 20, GROUND + 22, 2, 2); }
    },
    platform: function (ctx, p, x) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 10); R(ctx, "#7a4a2a", x, p.y, p.w, 7); R(ctx, "#ffd27a", x, p.y, p.w, 1);
      R(ctx, "#5a3018", x, p.y + 5, p.w, 2); for (var k = 4; k < p.w - 4; k += 12) R(ctx, "#3a1e10", x + k, p.y + 2, 4, 2);
    }
  };

  // =====================================================================================
  // 2 DUST TOWN: Daemmerung, Kuppelstadt, Raumhafen, Neonschilder
  // =====================================================================================
  K.dusttown = {
    build: function (th, rnd) {
      var o = {}; o.sky = skyGrad(th, rnd, 40);
      var far = mk(TW, H), fx = far.getContext("2d"), px = 0;
      while (px < TW) { var w = 18 + Math.floor(rnd() * 26), h = 40 + Math.floor(rnd() * 60); fx.fillStyle = th.far; fx.fillRect(px, 190 - h, w, h + 50);
        if (rnd() < 0.4) { fx.beginPath(); fx.arc(px + w / 2, 190 - h, w / 2, Math.PI, 0); fx.fill(); } px += w + 2 + Math.floor(rnd() * 8); }
      o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"); px = 0; o.win = []; o.sign = [];
      while (px < TW) {
        var bw = 34 + Math.floor(rnd() * 40), bh = 60 + Math.floor(rnd() * 70), by = 214 - bh;
        mx.fillStyle = th.mid; mx.fillRect(px, by, bw, bh + 30);
        if (rnd() < 0.5) { mx.beginPath(); mx.arc(px + bw / 2, by, bw / 2, Math.PI, 0); mx.fill(); } else mx.fillRect(px + 4, by - 6, bw - 8, 6);
        mx.fillStyle = "#07031a"; mx.fillRect(px, by + bh - 12, bw, 2);
        for (var wy = by + 8; wy < by + bh - 14; wy += 12) for (var wx = px + 5; wx < px + bw - 8; wx += 11) if (rnd() < 0.65) o.win.push({ x: wx, y: wy, ph: rnd() * 6, on: rnd() < 0.5 });
        if (rnd() < 0.4) o.sign.push({ x: px + 6, y: by + 18 + Math.floor(rnd() * 20), w: 12 + Math.floor(rnd() * 10), col: ["#35f0ff", "#ff2bd6", "#ffd23f"][Math.floor(rnd() * 3)], ph: rnd() * 6 });
        px += bw + 8 + Math.floor(rnd() * 14);
      }
      mx.fillStyle = "#1a0c20"; mx.fillRect(60, 150, 60, 6); mx.fillRect(76, 140, 28, 10); mx.fillRect(112, 146, 14, 4); mx.fillRect(66, 156, 4, 58); mx.fillRect(110, 156, 4, 58);   // Raumhafen-Schiff
      o.mid = mid;
      var near = mk(TW, H), nx = near.getContext("2d");
      for (var i = 0; i < 12; i++) { var lx = 30 + i * 78 + Math.floor(rnd() * 20); nx.fillStyle = th.near; nx.fillRect(lx, 188, 2, 52); nx.fillRect(lx - 4, 188, 10, 2); }
      nx.fillStyle = th.near; nx.fillRect(0, 238, TW, 40); o.near = near; return o;
    },
    draw: function (ctx, b, camX, t) {
      ctx.drawImage(b.sky, 0, 0);
      var sx = 120 - camX * 0.02; for (var yy = -22; yy <= 22; yy++) { var hw = Math.floor(Math.sqrt(484 - yy * yy)); R(ctx, "#ffb878", sx - hw, 128 + yy, hw * 2, 1, 0.9); }
      tile(ctx, b.far, camX, 0.1); tile(ctx, b.mid, camX, 0.28);
      for (var i = 0; i < b.win.length; i++) { var w = b.win[i], on = w.on ? (Math.sin(t * 0.7 + w.ph) > -0.8) : false;
        if (on) each(w.x, camX, 0.28, 6, function (px) { R(ctx, "#ffd27a", px, w.y, 5, 6, 0.85); }); }
      for (var s = 0; s < b.sign.length; s++) { var sg = b.sign[s], fl = Math.sin(t * 3 + sg.ph) > -0.6 ? 0.9 : 0.25;
        each(sg.x, camX, 0.28, sg.w, function (px) { R(ctx, sg.col, px, sg.y, sg.w, 3, fl); R(ctx, sg.col, px - 2, sg.y - 2, sg.w + 4, 7, fl * 0.15); }); }
      each(66, camX, 0.28, 60, function (px) { R(ctx, Math.sin(t * 4) > 0 ? "#ff3b3b" : "#4a1a1a", px + 2, 150, 3, 3); R(ctx, "#35f0ff", px + 48, 148, 3, 3, 0.8); });
      var fog = ctx.createLinearGradient(0, H - 110, 0, H - 30); fog.addColorStop(0, "rgba(224,128,58,0)"); fog.addColorStop(1, "rgba(224,128,58,0.16)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 110, W, 80);
      tile(ctx, b.near, camX, 0.5);
    },
    atmo: function (ctx, b, t, q) { sandAtmo(ctx, t, q, 0, "#e8a070"); stormVeil(ctx, "#b8622a", storm()); },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND); R(ctx, "#5a2e24", 0, GROUND + 12, W, H - GROUND - 12); R(ctx, "#07031a", 0, GROUND, W, 2); R(ctx, "#35f0ff", 0, GROUND, W, 1); R(ctx, "#35f0ff", 0, GROUND + 1, W, 2, 0.18);
      var off = -Math.floor(camX) % 40;
      for (var x = off; x < W; x += 40) { R(ctx, "#000000", x, GROUND + 3, 1, 30, 0.28); R(ctx, "#a86a44", x + 8, GROUND + 7, 10, 1, 0.6); R(ctx, "#2a1418", x + 22, GROUND + 18, 8, 1); }
      R(ctx, "#ff2bd6", 0, GROUND + 33, W, 1, 0.12);
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 10); R(ctx, "#4a2a3a", x, p.y, p.w, 7); R(ctx, "#35f0ff", x, p.y, p.w, 1);
      for (var k = 3; k < p.w - 3; k += 10) R(ctx, "#2a1424", x + k, p.y + 2, 5, 3);
      for (var q = 5; q < p.w - 5; q += 14) R(ctx, "#ff2bd6", x + q, p.y + 8, 3, 2, 0.5 + 0.4 * Math.sin(t * 3 + q + p.x));
    }
  };

  // =====================================================================================
  // 3 OUTPOST 09: Militaerstation, Radar, Suchscheinwerfer, Bunker
  // =====================================================================================
  K.outpost = {
    build: function (th, rnd) {
      var o = {}; o.sky = skyGrad(th, rnd, 120);
      var far = mk(TW, H), fx = far.getContext("2d"); dunes(fx, th.far, 176, 18, 9, 2, 6, 0.9); o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"), px = 0; o.alarm = []; o.dish = [];
      while (px < TW) {
        var bw = 40 + Math.floor(rnd() * 50), bh = 26 + Math.floor(rnd() * 44), by = 216 - bh;
        mx.fillStyle = th.mid; mx.fillRect(px, by, bw, bh + 30); mx.fillStyle = "#10141e"; mx.fillRect(px, by, bw, 3);
        mx.fillStyle = "#0a0e18"; mx.fillRect(px + 6, by + 10, bw - 12, 7);                                           // Schlitzfenster
        if (rnd() < 0.45) { mx.fillStyle = th.mid; mx.fillRect(px + bw / 2 - 2, by - 38, 4, 38); mx.fillRect(px + bw / 2 - 8, by - 44, 16, 8); o.alarm.push({ x: px + bw / 2 - 1, y: by - 46, ph: rnd() * 5 }); }
        else if (rnd() < 0.5) o.dish.push({ x: px + bw / 2, y: by - 4 });
        px += bw + 10 + Math.floor(rnd() * 26);
      }
      o.mid = mid;
      var near = mk(TW, H), nx = near.getContext("2d");
      for (var i = 0; i < 16; i++) { var fx2 = 20 + i * 60; nx.fillStyle = th.near; nx.fillRect(fx2, 212, 2, 30); nx.fillRect(fx2, 218, 62, 1); nx.fillRect(fx2, 226, 62, 1); }
      for (var j = 0; j < 9; j++) { nx.fillStyle = "#3a2a22"; nx.fillRect(40 + j * 100, 228, 14, 12); nx.fillStyle = "#5a4034"; nx.fillRect(40 + j * 100, 228, 14, 2); }
      o.near = near; return o;
    },
    draw: function (ctx, b, camX, t) {
      ctx.drawImage(b.sky, 0, 0);
      R(ctx, "#f0e0d0", 360 - camX * 0.02, 44, 12, 12, 0.9);
      tile(ctx, b.far, camX, 0.1); tile(ctx, b.mid, camX, 0.28);
      for (var d = 0; d < b.dish.length; d++) each(b.dish[d].x, camX, 0.28, 14, function (px) {                       // drehende Radarschuessel
        var a = t * 1.1 + d, sw = Math.cos(a) * 7; R(ctx, "#6a7a9a", px - 7, b.dish[d].y, 14, 3); R(ctx, "#8aa0c0", px - Math.abs(sw), b.dish[d].y - 4, Math.abs(sw) * 2, 2); R(ctx, "#6a7a9a", px, b.dish[d].y - 9, 1, 8); });
      for (var i = 0; i < b.alarm.length; i++) { var al = b.alarm[i], on = Math.sin(t * 5 + al.ph) > 0;
        each(al.x, camX, 0.28, 12, function (px) { R(ctx, on ? "#ff3b3b" : "#4a1a1a", px - 1, al.y, 3, 3); if (on) R(ctx, "#ff3b3b", px - 8, al.y - 6, 18, 14, 0.12); }); }
      for (var s = 0; s < 2; s++) {                                                                                  // Suchscheinwerfer
        var ang = Math.sin(t * 0.5 + s * 2.4) * 0.5 - 1.5708, bx = 150 + s * 520 - camX * 0.28; bx = ((bx % TW) + TW) % TW; if (bx > W + 60) bx -= TW;
        ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = "#fff2c8"; ctx.beginPath(); ctx.moveTo(bx, 200); ctx.lineTo(bx + Math.cos(ang - 0.08) * 300, 200 + Math.sin(ang - 0.08) * 300); ctx.lineTo(bx + Math.cos(ang + 0.08) * 300, 200 + Math.sin(ang + 0.08) * 300); ctx.fill(); ctx.restore();
      }
      tile(ctx, b.near, camX, 0.5);
    },
    atmo: function (ctx, b, t, q) { sandAtmo(ctx, t, q, 0, "#b8a898"); stormVeil(ctx, "#7a6a5a", storm()); },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND); R(ctx, "#2a2a30", 0, GROUND + 14, W, H - GROUND - 14); R(ctx, "#07031a", 0, GROUND, W, 2); R(ctx, "#ffd23f", 0, GROUND, W, 1);
      var off = -Math.floor(camX) % 32;
      for (var x = off; x < W; x += 32) { R(ctx, "#000000", x, GROUND + 3, 1, 36, 0.3); if (((x - off) / 32 + Math.floor(camX / 32)) % 3 === 0) { R(ctx, "#ffd23f", x + 4, GROUND + 22, 8, 3, 0.7); R(ctx, "#07031a", x + 8, GROUND + 22, 4, 3, 0.7); } }
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 10); R(ctx, "#4a4a52", x, p.y, p.w, 7); R(ctx, "#ffd23f", x, p.y, p.w, 1);
      for (var k = 2; k < p.w - 6; k += 12) { R(ctx, "#ffd23f", x + k, p.y + 3, 5, 2); R(ctx, "#1a1a20", x + k + 5, p.y + 3, 5, 2); }
      R(ctx, "#ff3b3b", x + 2, p.y + 8, 2, 2, Math.sin(t * 4 + p.x) > 0 ? 0.9 : 0.2);
    }
  };

  // =====================================================================================
  // 4 THE UNDERGROUND: dunkle Forschungsgaenge, Glastanks, Serverreihen, Kabel
  // =====================================================================================
  K.underground = {
    build: function (th, rnd) {
      var o = {}; o.sky = skyGrad(th, rnd, 0);
      var far = mk(TW, H), fx = far.getContext("2d");
      fx.fillStyle = th.far; fx.fillRect(0, 0, TW, 34);                                                              // Decke mit Rohren
      for (var p = 0; p < 6; p++) { var py = 8 + p * 4; fx.fillStyle = p % 2 ? "#0c2038" : "#102a46"; fx.fillRect(0, py, TW, 3); }
      for (var x = 0; x < TW; x += 64) { fx.fillStyle = "#06101e"; fx.fillRect(x, 0, 6, 120); }
      o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"), px = 0; o.tank = []; o.led = [];
      while (px < TW) {
        var kind = rnd();
        if (kind < 0.45) { var tw = 26 + Math.floor(rnd() * 12); mx.fillStyle = "#0a1c30"; mx.fillRect(px, 100, tw, 116); mx.fillStyle = "#04101c"; mx.fillRect(px + 3, 108, tw - 6, 100); o.tank.push({ x: px + 3, w: tw - 6, ph: rnd() * 6 }); px += tw + 14; }
        else { var sw = 22, sh = 80 + Math.floor(rnd() * 30); mx.fillStyle = "#0c2036"; mx.fillRect(px, 216 - sh, sw, sh); mx.fillStyle = "#06121e"; for (var r = 0; r < sh - 8; r += 8) mx.fillRect(px + 2, 216 - sh + 4 + r, sw - 4, 5);
          for (var l = 0; l < 6; l++) o.led.push({ x: px + 3 + (l % 2) * 12, y: 216 - sh + 5 + Math.floor(l / 2) * 20, ph: rnd() * 6 }); px += sw + 12; }
      }
      o.mid = mid;
      var near = mk(TW, H), nx = near.getContext("2d"); nx.strokeStyle = th.near; nx.lineWidth = 2;
      for (var c = 0; c < 10; c++) { var cx = 40 + c * 96 + Math.floor(rnd() * 30); nx.beginPath(); nx.moveTo(cx, 0); nx.quadraticCurveTo(cx + 20, 60 + rnd() * 40, cx + 50, 20); nx.stroke(); }
      nx.fillStyle = th.near; nx.fillRect(0, 0, TW, 10); o.near = near; return o;
    },
    draw: function (ctx, b, camX, t) {
      ctx.drawImage(b.sky, 0, 0);
      tile(ctx, b.far, camX, 0.1); tile(ctx, b.mid, camX, 0.28);
      for (var i = 0; i < b.tank.length; i++) { var tk = b.tank[i];
        each(tk.x, camX, 0.28, tk.w, function (px) { R(ctx, "#6bff8a", px, 140, tk.w, 68, 0.2 + 0.05 * Math.sin(t + tk.ph)); R(ctx, "#6bff8a", px, 140, tk.w, 1, 0.6);
          for (var q = 0; q < 3; q++) R(ctx, "#d8ffd8", px + 4 + q * 7, 200 - ((t * 14 + q * 22 + tk.ph * 9) % 56), 2, 2, 0.5); }); }
      for (var l = 0; l < b.led.length; l++) { var ld = b.led[l], on = Math.sin(t * 4 + ld.ph * 3) > 0;
        each(ld.x, camX, 0.28, 4, function (px) { R(ctx, on ? "#35f0ff" : "#0e3a4a", px, ld.y, 2, 2); }); }
      var fog = ctx.createLinearGradient(0, H - 100, 0, H - 30); fog.addColorStop(0, "rgba(53,240,255,0)"); fog.addColorStop(1, "rgba(53,240,255,0.1)");
      ctx.fillStyle = fog; ctx.fillRect(0, H - 100, W, 70);
      tile(ctx, b.near, camX, 0.5);
      var v = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 300); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,4,12,0.55)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);   // dunkle Gaenge
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 8 : 20; ctx.fillStyle = "#8fe6ff";
      for (var i = 0; i < n; i++) { ctx.globalAlpha = 0.2 + 0.3 * Math.sin(t + i); ctx.fillRect(Math.round((i * 67 + t * (4 + i % 4)) % W), Math.round((i * 41 + Math.sin(t * 0.6 + i) * 10) % H), 1, 1); }
      ctx.globalAlpha = 1;
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND); R(ctx, "#050e18", 0, GROUND + 14, W, H - GROUND - 14); R(ctx, "#07031a", 0, GROUND, W, 2); R(ctx, "#35f0ff", 0, GROUND, W, 1); R(ctx, "#35f0ff", 0, GROUND + 1, W, 2, 0.2);
      var off = -Math.floor(camX) % 24;
      for (var x = off; x < W; x += 24) { R(ctx, "#000000", x, GROUND + 3, 1, 36, 0.4); R(ctx, "#0e2a3e", x + 3, GROUND + 6, 16, 2); R(ctx, "#35f0ff", x + 5, GROUND + 22, 10, 1, 0.25 + 0.2 * Math.sin(t * 2 + x * 0.1 + camX * 0.05)); }
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 10); R(ctx, "#12304a", x, p.y, p.w, 7); R(ctx, "#35f0ff", x, p.y, p.w, 1);
      for (var k = 2; k < p.w - 2; k += 6) R(ctx, "#0a1c30", x + k, p.y + 2, 3, 4);
      R(ctx, "#35f0ff", x + 2, p.y + 8, p.w - 4, 3, 0.1 + 0.08 * Math.sin(t * 3 + p.x));
    }
  };

  // =====================================================================================
  // 5 THE CORE: gigantische Roboterfabrik - Zahnraeder, Schlote, Fliessbaender, Glut
  // =====================================================================================
  function gear(ctx, cx, cy, r, ang, col, teeth) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    for (var i = 0; i < teeth; i++) { var a = ang + i / teeth * TAU; ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a); ctx.fillRect(-3, -3, 7, 6); ctx.restore(); }
    ctx.fillStyle = "#160604"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, TAU); ctx.fill();
  }
  K.core = {
    build: function (th, rnd) {
      var o = {}; o.sky = skyGrad(th, rnd, 0);
      var far = mk(TW, H), fx = far.getContext("2d"), px = 0; o.smoke = [];
      while (px < TW) { var w = 22 + Math.floor(rnd() * 20), h = 80 + Math.floor(rnd() * 90); fx.fillStyle = th.far; fx.fillRect(px, 230 - h, w, h + 20); fx.fillStyle = "#1a0806"; fx.fillRect(px - 2, 230 - h, w + 4, 6); o.smoke.push({ x: px + w / 2, y: 230 - h, ph: rnd() * 6 }); px += w + 30 + Math.floor(rnd() * 40); }
      o.far = far;
      var mid = mk(TW, H), mx = mid.getContext("2d"); mx.fillStyle = th.mid;
      mx.fillRect(0, 150, TW, 12); mx.fillRect(0, 190, TW, 5);                                                       // Rohrbruecken und Fliessband
      for (var x = 0; x < TW; x += 80) { mx.fillRect(x, 150, 8, 90); mx.fillRect(x + 36, 110, 4, 52); }
      mx.fillStyle = "#07031a"; for (var y2 = 0; y2 < TW; y2 += 40) mx.fillRect(y2 + 10, 190, 14, 5);
      o.mid = mid; o.bot = [0, 1, 2, 3, 4, 5].map(function (i) { return { x: i * 160 + rnd() * 40, ph: rnd() }; });
      var near = mk(TW, H), nx = near.getContext("2d"); nx.fillStyle = th.near;
      for (var p = 0; p < 12; p++) { var cx = 30 + p * 80; nx.fillRect(cx, 200, 10, 60); nx.fillRect(cx - 3, 196, 16, 6); }
      o.near = near; return o;
    },
    draw: function (ctx, b, camX, t) {
      ctx.drawImage(b.sky, 0, 0);
      var gl = ctx.createLinearGradient(0, H - 130, 0, H); gl.addColorStop(0, "rgba(255,122,31,0)"); gl.addColorStop(1, "rgba(255,122,31,0.35)"); ctx.fillStyle = gl; ctx.fillRect(0, H - 130, W, 130);   // Ofenglut
      tile(ctx, b.far, camX, 0.1);
      for (var i = 0; i < b.smoke.length; i++) each(b.smoke[i].x, camX, 0.1, 40, function (px) { for (var k = 0; k < 5; k++) R(ctx, "#3a1a12", px + Math.sin(t * 0.6 + b.smoke[i].ph + k) * 6 + k * 2, b.smoke[i].y - 6 - k * 9 - ((t * 5 + b.smoke[i].ph * 3) % 9), 10 + k * 2, 7, 0.32 - k * 0.05); });
      ctx.save(); ctx.translate(-Math.floor(camX * 0.18) % 480, 0);
      for (var g = 0; g < 4; g++) { gear(ctx, 70 + g * 240, 70 + (g % 2) * 40, 38 + (g % 2) * 14, t * (g % 2 ? -0.5 : 0.5), "#34140c", 10); }
      ctx.restore();
      tile(ctx, b.mid, camX, 0.28);
      for (var r = 0; r < b.bot.length; r++) each(b.bot[r].x + t * 18, camX, 0.28, 14, function (px) { R(ctx, "#07031a", px, 176, 8, 14); R(ctx, "#ff3b3b", px + 5, 179, 2, 2); R(ctx, "#07031a", px + 1, 172, 6, 4); });
      for (var k = 0; k < 12; k++) each(30 + k * 80, camX, 0.5, 20, function (px) { var ph = Math.abs(Math.sin(t * 1.4 + k * 0.8)); R(ctx, "#5a2414", px + 2, 214 + ph * 14 - 14, 6, 14); R(ctx, "#ff7a1f", px + 2, 214 + ph * 14 - 14, 6, 1, 0.7); });
      tile(ctx, b.near, camX, 0.5);
    },
    atmo: function (ctx, b, t, q) {
      var n = q === "low" ? 14 : 36; ctx.fillStyle = "#ffa23a";
      for (var i = 0; i < n; i++) { ctx.globalAlpha = 0.25 + 0.5 * Math.sin(t * 2 + i); ctx.fillRect(Math.round((i * 53 + Math.sin(t + i) * 12) % W), Math.round(H - ((i * 37 + t * (14 + i % 5 * 6)) % H)), 1, 1); }
      ctx.globalAlpha = 1;
    },
    ground: function (ctx, th, camX, t) {
      R(ctx, th.ground, 0, GROUND, W, H - GROUND); R(ctx, "#100605", 0, GROUND + 14, W, H - GROUND - 14); R(ctx, "#07031a", 0, GROUND, W, 2); R(ctx, "#ff7a1f", 0, GROUND, W, 1); R(ctx, "#ff7a1f", 0, GROUND + 1, W, 2, 0.25);
      var off = -Math.floor(camX) % 40;
      for (var x = off; x < W; x += 40) { R(ctx, "#000000", x, GROUND + 3, 1, 36, 0.4); R(ctx, "#3a1a12", x + 6, GROUND + 6, 22, 3); R(ctx, "#ff7a1f", x + 8, GROUND + 24, 14, 1, 0.3 + 0.25 * Math.sin(t * 2.2 + x * 0.07 + camX * 0.04)); }
    },
    platform: function (ctx, p, x, th, t) {
      R(ctx, "#07031a", x - 1, p.y - 1, p.w + 2, 10); R(ctx, "#4a2216", x, p.y, p.w, 7); R(ctx, "#ff7a1f", x, p.y, p.w, 1);
      for (var k = 3; k < p.w - 3; k += 9) { R(ctx, "#2a120a", x + k, p.y + 2, 4, 3); R(ctx, "#ffd23f", x + k + 1, p.y + 1, 1, 1, 0.8); }
      R(ctx, "#ff7a1f", x + 2, p.y + 8, p.w - 4, 3, 0.12 + 0.08 * Math.sin(t * 3 + p.x));
    }
  };
})(window.CB);
