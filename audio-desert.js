/* CYBER BOTS - audio-desert.js
   Musik-Tracks und Soundeffekte der Kampagne DESERT PLANET (alles live synthetisiert, keine Audiodateien). */
(function (CB) {
  "use strict";
  var A = CB.Audio, T = A.TRACKS, S = A.SFX, tone = A.tone, noise = A.noise;

  S.sandstorm = function () { noise(1.4, 0.12, 1800); tone(90, 1.2, "sawtooth", 0.03, 60); };
  S.relic     = function () { tone(880, 0.12, "triangle", 0.1); tone(1320, 0.16, "sine", 0.09, 1320, 0.1); tone(1760, 0.3, "sine", 0.08, 1760, 0.22); };
  S.secret    = function () { noise(0.5, 0.16, 700); tone(110, 0.5, "sine", 0.14, 40); tone(660, 0.3, "triangle", 0.06, 990, 0.3); };
  S.mission   = function () { tone(523, 0.1, "square", 0.06); tone(659, 0.1, "square", 0.06, 659, 0.1); tone(784, 0.25, "square", 0.07, 784, 0.2); };

  // ---------- D1 THE DUNES: weit, orientalische Tonleiter, tiefer Bordun ----------
  var DB = [55, 55, 55, 55, 58.3, 58.3, 55, 55, 49, 49, 49, 49, 58.3, 58.3, 55, 55];
  var DA = [440, 466.2, 554.4, 587.3, 698.5, 587.3, 554.4, 466.2];
  T.dunes = { step: 0.2, bass: DB, arp: DA, bossStep: 0.8,
    play: function (i, step, t, boss, h) {
      if (i % 4 === 0) h.note(DB[i], t, 1.0, "triangle", 0.26);
      if (i % 2 === 0) h.note(DA[((i >> 1) + (step >> 4) * 3) % 8], t, 0.22, "sine", 0.07);
      if (i % 8 === 0) h.kick(t);
      if (i % 8 === 4) h.noise(t, 0.05, 0.03, 4000);
      if (boss && i % 2 === 1) h.note(DB[i] * 2, t, 0.1, "sawtooth", 0.07);
    } };

  // ---------- D2 DUST TOWN: lockerer Groove, Zupf-Arpeggio ----------
  var TB = [65.4, 0, 65.4, 0, 73.4, 0, 65.4, 0, 58.3, 0, 58.3, 0, 49, 0, 58.3, 65.4];
  var TA = [392, 466.2, 523.3, 587.3, 523.3, 466.2, 392, 349.2];
  T.dusttown = { step: 0.16, bass: TB, arp: TA, bossStep: 0.8,
    play: function (i, step, t, boss, h) {
      if (TB[i]) h.note(TB[i], t, 0.16, "sawtooth", 0.2);
      if (i % 4 === 0) h.kick(t);
      if (i % 8 === 4) h.noise(t, 0.09, 0.07, 2400);
      if (i % 2 === 1) h.noise(t, 0.02, 0.025, 7500);
      h.note(TA[(i + (step >> 4) * 2) % 8], t, 0.09, "square", 0.04);
    } };

  // ---------- D3 OUTPOST 09: angespannter Marschrhythmus ----------
  var OB = [49, 49, 0, 49, 49, 0, 55, 0, 46.2, 46.2, 0, 46.2, 46.2, 0, 41.2, 0];
  T.outpost = { step: 0.15, bass: OB, arp: [220], bossStep: 0.82,
    play: function (i, step, t, boss, h) {
      if (OB[i]) h.note(OB[i], t, 0.18, "sawtooth", 0.22);
      if (i % 4 === 0) h.kick(t);
      if (i % 8 === 4) h.noise(t, 0.12, 0.12, 1800);
      if (i % 16 === 0) h.note(op(step), t, 0.9, "square", 0.04);
      if (i % 2 === 1) h.noise(t, 0.02, 0.02, 8000);
    } };
  function op(step) { return [220, 233.1, 207.7, 196][(step >> 4) % 4]; }

  // ---------- D4 THE UNDERGROUND: dunkel, schwebend, Tropfen ----------
  var UB = [43.7, 0, 0, 0, 0, 0, 0, 0, 41.2, 0, 0, 0, 0, 0, 38.9, 0];
  var UA = [523.3, 622.3, 587.3, 466.2, 698.5, 554.4, 523.3, 784];
  T.underground = { step: 0.22, bass: UB, arp: UA, bossStep: 0.8,
    play: function (i, step, t, boss, h) {
      if (UB[i]) h.note(UB[i], t, 1.3, "triangle", 0.28);
      var n = UA[(i * 3 + (step >> 4) * 5) % 8];
      if (i % 3 === 0) { h.note(n, t, 0.18, "sine", 0.06); h.note(n * 1.007, t + 0.01, 0.18, "sine", 0.04); }
      if (i % 16 === 8) h.noise(t, 0.5, 0.03, 2600);
      if (i % 8 === 0) h.kick(t);
    } };

  // ---------- D5 THE CORE: schnell, industriell, Boss: schwer ----------
  var CBs = [41.2, 41.2, 0, 41.2, 49, 0, 41.2, 55, 41.2, 41.2, 0, 61.7, 49, 0, 55, 46.2];
  var CA = [329.6, 392, 440, 493.9, 440, 392, 329.6, 293.7];
  T.core = { step: 0.12, bass: CBs, arp: CA, bossStep: 0.8,
    play: function (i, step, t, boss, h) {
      if (CBs[i]) h.note(CBs[i], t, 0.12, "sawtooth", 0.22);
      if (i % 4 === 0) h.kick(t);
      if (i % 4 === 2) h.noise(t, 0.08, 0.08, 2000);
      if (i % 2 === 1) h.noise(t, 0.02, 0.03, 7500);
      if (i % 2 === 0) h.note(CA[((i >> 1) + (step >> 4)) % 8] * ((step >> 5) % 2 ? 0.5 : 1), t, 0.06, "square", 0.04);
      if (boss) { if (CBs[i]) h.note(CBs[i] * 2, t, 0.1, "square", 0.08); if (i % 8 === 6) h.noise(t, 0.2, 0.1, 1200); }
    } };
})(window.CB);
