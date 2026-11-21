/* CYBER BOTS - desert-sprites.js
   Pixel-Art der Wuestenroboter und des Bosses DESERT TITAN (per Code gezeichnet, automatischer Umriss).
   Zeichenflaeche = Breite x Hoehe aus CB.ENEMIES, Blickrichtung rechts. */
(function (CB) {
  "use strict";
  var S = CB.Sprites, D = S.DARK;
  function reg(key, col, draw) { S.addEnemy(key, col, draw); }

  // ---------- DESERT SCOUT (14 x 14): schneller Aufklaerer mit Schubduese ----------
  reg("scout", { b: "#d9a441", l: "#ffe29a", d: "#7a4a14", e: "#ff3b3b" }, function (c, f, fr) {
    c(f.d, 2, 11, 3, fr ? 3 : 2); c(f.d, 8, 11, 3, fr ? 2 : 3); c(f.l, 2, 11, 3, 1); c(f.l, 8, 11, 3, 1);
    c(f.b, 1, 5, 11, 7); c(f.l, 1, 5, 11, 1); c(f.d, 1, 11, 11, 1);
    c(f.d, 0, 3, 3, 6); c(f.l, 0, 3, 3, 1); c(fr ? "#ffe14a" : "#ff8a1f", 0, 5, 1, 2);       // Schubduese hinten
    c(f.b, 7, 1, 7, 6); c(f.l, 7, 1, 7, 1); c(D, 9, 3, 5, 2); c(f.e, 11, 3, 3, 2);            // Kopf mit Visier
    c(f.d, 5, 6, 3, 3); c(f.e, 5, 7, 2, 1);
  });

  // ---------- SAND GUARD (14 x 20): schwer gepanzert, Schild vorne ----------
  reg("sandguard", { b: "#b8843a", l: "#f0cc8a", d: "#5a3a14", e: "#ffb23f" }, function (c, f, fr) {
    c(f.d, 3, 15, 3, fr ? 4 : 5); c(f.d, 8, 15, 3, fr ? 5 : 4);
    c(f.b, 2, 7, 10, 8); c(f.l, 2, 7, 10, 1); c(f.d, 2, 14, 10, 1); c(f.e, 6, 9, 2, 3);
    c(f.d, 0, 8, 2, 6); c(f.d, 12, 8, 2, 5); c(f.l, 12, 11, 2, 2);
    c(f.b, 3, 0, 8, 7); c(f.l, 3, 0, 8, 1); c(f.d, 3, 5, 8, 2); c(D, 4, 2, 7, 3); c(f.e, 8, 3, 3, 1);
    c(f.d, 5, 0, 4, 1); c(f.l, 6, 0, 2, 1);                                                    // Kamm
  });

  // ---------- COMBAT DRONE (16 x 10): fliegend, zwei Rotoren und Zwillingslauf ----------
  reg("cdrone", { b: "#c9884a", l: "#ffd9a0", d: "#6a3a14", e: "#35f0ff" }, function (c, f, fr) {
    c(f.l, fr ? 0 : 2, 0, fr ? 5 : 4, 1); c(f.l, fr ? 11 : 10, 0, fr ? 5 : 4, 1);               // Rotoren
    c(f.d, 3, 1, 2, 2); c(f.d, 11, 1, 2, 2);
    c(f.b, 3, 3, 10, 5); c(f.l, 3, 3, 10, 1); c(f.d, 3, 7, 10, 1);
    c(D, 9, 4, 4, 3); c(f.e, 11, 5, 2, 1);
    c(f.d, 12, 8, 4, 1); c(f.l, 14, 7, 2, 1);                                                   // Lauf
    c(f.d, 5, 8, 2, 2); c(f.e, 6, 5, 2, 1);
  });

  // ---------- HEAVY DEFENDER (26 x 30): grosser Panzerkoloss mit Schulterkanone ----------
  reg("defender", { b: "#9a6a3a", l: "#e0b078", d: "#442814", e: "#ff5a2a" }, function (c, f, fr) {
    c(f.d, 4, 22, 7, fr ? 7 : 8); c(f.d, 15, 22, 7, fr ? 8 : 7); c(f.l, 4, 22, 7, 1); c(f.l, 15, 22, 7, 1);
    c(f.b, 3, 20, 9, 3); c(f.b, 14, 20, 9, 3);
    c(f.b, 3, 8, 20, 14); c(f.l, 3, 8, 20, 2); c(f.d, 3, 20, 20, 2);
    c(D, 9, 11, 8, 8); c(f.e, 10, 12, 6, 6); c("#ffffff", 12, 14, 2, 2);
    c(f.d, 4, 13, 3, 1); c(f.d, 19, 13, 3, 1); c(f.d, 5, 17, 3, 1); c(f.d, 18, 17, 3, 1);
    c(f.d, 0, 9, 4, 14); c(f.l, 0, 9, 4, 1); c(f.b, 0, 19, 4, 4);                                // Arme
    c(f.d, 22, 9, 4, 14); c(f.l, 22, 9, 4, 1); c(f.b, 22, 19, 4, 4);
    c(f.b, 8, 1, 11, 8); c(f.l, 8, 1, 11, 1); c(D, 10, 3, 9, 3); c(f.e, 13, 4, 4, 1);           // Kopf
    c(f.d, 15, 0, 2, 2); c(fr ? f.e : f.l, 15, 0, 2, 1);
    c(f.d, 16, 5, 10, 4); c(f.l, 16, 5, 10, 1); c(f.e, 25, 6, 1, 2);                            // Schulterkanone
  });

  // ---------- DESERT TITAN (60 x 64): mechanischer Riese, drei Phasen ----------
  reg("titan", { b: "#9a5a2e", l: "#e8a468", d: "#3a1e10", e: "#ff3b2a" }, function (c, f, fr) {
    var up = fr ? 1 : 0;
    // Beine / Ketten
    c(f.d, 6, 50, 18, 14 - up); c(f.d, 36, 50, 18, 13 + up);
    c(f.b, 3, 58, 24, 6); c(f.b, 33, 58, 24, 6); c(f.l, 3, 58, 24, 1); c(f.l, 33, 58, 24, 1);
    for (var i = 0; i < 5; i++) { c(f.d, 5 + i * 5, 61, 2, 2); c(f.d, 35 + i * 5, 61, 2, 2); }
    // Rumpf
    c(f.b, 8, 20, 44, 32); c(f.l, 8, 20, 44, 3); c(f.d, 8, 49, 44, 3);
    c(f.d, 12, 26, 36, 18); c(D, 14, 28, 32, 14);                                                // Kernfenster
    c(f.e, 22, 30, 16, 10); c("#ffe14a", 26, 32, 8, 6); c("#ffffff", 29, 34, 2, 2);
    for (i = 0; i < 6; i++) c(f.l, 11 + i * 7, 44 + (i & 1), 3, 1);
    for (i = 0; i < 4; i++) { c(f.d, 10 + i * 12, 22, 4, 2); }
    // Schultern und Arme
    c(f.b, 0, 14, 14, 14); c(f.l, 0, 14, 14, 2); c(f.d, 0, 26, 14, 2); c(f.e, 3, 19, 8, 3);
    c(f.b, 46, 14, 14, 14); c(f.l, 46, 14, 14, 2); c(f.d, 46, 26, 14, 2); c(f.e, 49, 19, 8, 3);
    c(f.d, 2, 28, 8, 16 + up); c(f.d, 50, 28, 8, 16 - up);
    c(f.b, 0, 40 + up, 12, 8); c(f.l, 0, 40 + up, 12, 1);                                         // Faust links
    c(f.d, 52, 38, 8, 6); c(f.l, 52, 38, 8, 1); c(f.b, 54, 42, 6, 8); c(f.e, 57, 47, 3, 2);        // Kanone rechts (Blickrichtung)
    // Kopf
    c(f.b, 18, 6, 24, 16); c(f.l, 18, 6, 24, 2); c(f.d, 18, 20, 24, 2);
    c(D, 21, 10, 18, 7); c(f.e, 24, 12, 5, 3); c(f.e, 31, 12, 5, 3); c("#ffffff", 26, 13, 1, 1); c("#ffffff", 33, 13, 1, 1);
    c(f.d, 29, 0, 2, 6); c(fr ? f.e : f.l, 28, 0, 4, 2);                                          // Antenne
    c(f.d, 14, 8, 4, 10); c(f.d, 42, 8, 4, 10);
    // Auspuffrohre
    c(f.d, 12, 8, 3, 8); c(f.d, 45, 8, 3, 8);
  });
})(window.CB);
