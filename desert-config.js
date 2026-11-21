/* CYBER BOTS - desert-config.js
   UPDATE 2.0 "DESERT PLANET": Kampagne mit 5 Sektoren (ID 10-14), Farbthemen, Wuestengegner, Pickups, Missionen, Sammlerstuecke.
   Die vorhandenen Sektoren 1-9 und alle Spielstaende bleiben unveraendert (neue Daten liegen in Save.data.desert). */
(function (CB) {
  "use strict";

  // ---------- Farbthemen (Sonnenuntergang, Daemmerung, Militaer, Untergrund, Fabrik) ----------
  var T0 = CB.THEMES.length;
  CB.THEMES.push(
    { name: "dunes", kind: "dunes", sky: ["#2a0a3c", "#b53d22", "#ffb347"], far: "#8a2f26", mid: "#b8502a", near: "#7a3320",
      neon: ["#ffd23f", "#ff7a2b", "#35f0ff"], sun: ["#ff9a3d", "#fff0b0"], ground: "#c9783a", fog: "#ffb347" },
    { name: "dusttown", kind: "dusttown", sky: ["#14062e", "#7a2a4a", "#e0803a"], far: "#4a1f3c", mid: "#6a2c3e", near: "#2c1230",
      neon: ["#35f0ff", "#ff2bd6", "#ffd23f"], sun: ["#ff8a3d", "#ffe0a0"], ground: "#8a4a34", fog: "#e0803a" },
    { name: "outpost", kind: "outpost", sky: ["#06081c", "#1c2a4a", "#6a5a52"], far: "#1c2438", mid: "#2c3446", near: "#10141e",
      neon: ["#ff3b3b", "#ffd23f", "#8fe6ff"], sun: ["#ffb28a", "#fff0e0"], ground: "#3a3a40", fog: "#8a7a70" },
    { name: "underground", kind: "underground", sky: ["#02040c", "#06122a", "#0a2238"], far: "#08182c", mid: "#0c2438", near: "#040c18",
      neon: ["#35f0ff", "#6bff8a", "#ff2bd6"], sun: ["#35f0ff", "#d8ffff"], ground: "#0a1a2a", fog: "#35f0ff" },
    { name: "core", kind: "core", sky: ["#1a0604", "#4a1208", "#8a2a0c"], far: "#2a0e0a", mid: "#3e1810", near: "#160604",
      neon: ["#ff7a1f", "#ffd23f", "#ff3b3b"], sun: ["#ff6a1f", "#ffe14a"], ground: "#241210", fog: "#ff6a1f" }
  );

  // ---------- Wuestengegner (Werte; KI in desert-enemies.js, Grafik in desert-sprites.js) ----------
  CB.ENEMIES.scout = { name: "DESERT SCOUT", hp: 34, speed: 100, dmg: 0, contact: 11, credits: 12, w: 14, h: 14, fly: false, detect: 270, rate: 0 };
  CB.ENEMIES.sandguard = { name: "SAND GUARD", hp: 120, speed: 44, dmg: 10, contact: 14, credits: 20, w: 14, h: 20, fly: false, detect: 250, rate: 0.7,
    shield: true, shieldMul: 0.2 };
  CB.ENEMIES.cdrone = { name: "COMBAT DRONE", hp: 44, speed: 74, dmg: 8, contact: 8, credits: 16, w: 16, h: 10, fly: true, detect: 300, rate: 0.9 };
  CB.ENEMIES.defender = { name: "HEAVY DEFENDER", hp: 280, speed: 24, dmg: 13, contact: 22, credits: 44, w: 26, h: 30, fly: false, detect: 320, rate: 0.35,
    big: true, heavy: true };
  CB.ENEMIES.titan = { name: "DESERT TITAN", hp: 3500, speed: 34, dmg: 13, contact: 24, credits: 1800, w: 60, h: 64, fly: false, detect: 9999, rate: 1,
    isBoss: true, noMul: true, heavy: true };

  // ---------- Pickups je Sektor ----------
  CB.PICKUPS.water   = { heal: 0.25, shield: 2, col: "#7fd8ff", name: "WATER CELL", msg: "HYDRATED" };
  CB.PICKUPS.scrap   = { heal: 0.20, over: 6, col: "#ffb23f", name: "SCRAP CELL", msg: "OVERCLOCK" };
  CB.PICKUPS.medkit  = { heal: 0.30, shield: 3, col: "#6bff8a", name: "FIELD KIT", msg: "SHIELD" };
  CB.PICKUPS.serum   = { heal: 0.20, inv: 2.5, col: "#b86bff", name: "LAB SERUM", msg: "PHASE" };
  CB.PICKUPS.coolant = { heal: 0.30, boost: 8, col: "#ff7a1f", name: "COOLANT CORE", msg: "OVERDRIVE" };

  // ---------- Sektoren 10-14 (Kampagne DESERT PLANET) ----------
  // storm: Sandsturm als Wetterereignis (erstes Mal nach 'first' s, danach alle gap s, Dauer dur s). open: von Anfang an waehlbar.
  CB.SECTORS.push(
    { id: 10, label: "D1", area: "DESERT PLANET", name: "THE DUNES", width: 3300, quota: 24, maxAlive: 6, open: true, desert: true, creditMul: 2,
      weights: { scout: 4, cdrone: 2, sandguard: 1, walker: 1 }, fixed: { turret: 2 },
      hpMul: 1.4, dmgMul: 0.7, reward: 700, firstBonus: 400, drop: 0.14, pickup: "water", trophy: "CRASHED SHIP LOG",
      theme: T0, music: "dunes", hz: { crates: 6 }, storm: { first: 25, gap: [45, 70], dur: 14, wind: 38 },
      info: "Huge orange dunes, crashed starships and abandoned machines. Sandstorms roll in. Hidden dune cave and 3 relics." },
    { id: 11, label: "D2", area: "DESERT PLANET", name: "DUST TOWN", width: 3300, quota: 24, maxAlive: 6, desert: true, creditMul: 2, requires: 10,
      weights: { scout: 3, cdrone: 3, sandguard: 2, walker: 1 }, fixed: { turret: 2, lasertower: 1 },
      hpMul: 1.1, dmgMul: 0.6, reward: 900, firstBonus: 600, drop: 0.14, pickup: "scrap", trophy: "SPACEPORT PASS",
      theme: T0 + 1, music: "dusttown", hz: { crates: 8 }, storm: { first: 35, gap: [55, 80], dur: 10, wind: 26 },
      info: "Narrow streets, a spaceport and abandoned shops. Robot patrols and combat drones. Light sandstorms." },
    { id: 12, label: "D3", area: "DESERT PLANET", name: "OUTPOST 09", width: 3400, quota: 24, maxAlive: 6, desert: true, creditMul: 2, requires: 11,
      weights: { sandguard: 3, cdrone: 3, scout: 2, defender: 1 }, fixed: { turret: 2, lasertower: 3 },
      hpMul: 1.0, dmgMul: 0.5, reward: 1100, firstBonus: 800, drop: 0.14, pickup: "medkit", trophy: "OUTPOST KEYCARD",
      theme: T0 + 2, music: "outpost", hz: { gates: 6, crates: 6 }, storm: { first: 45, gap: [70, 100], dur: 9, wind: 22 },
      info: "A deserted military station: control rooms, laser gates, defence towers and heavy guards." },
    { id: 13, label: "D4", area: "DESERT PLANET", name: "THE UNDERGROUND", width: 3400, quota: 24, maxAlive: 6, desert: true, creditMul: 2, requires: 12,
      weights: { sandguard: 3, cdrone: 2, scout: 2, defender: 2 }, fixed: { lasertower: 2, turret: 1 },
      hpMul: 0.9, dmgMul: 0.4, reward: 1300, firstBonus: 1000, drop: 0.15, pickup: "serum", trophy: "RESEARCH DATA CORE",
      theme: T0 + 3, music: "underground", hz: { acid: 5, crates: 5 },
      info: "Underground research station: dark corridors, acid leaks, secret labs and advanced robots." },
    { id: 14, label: "D5", area: "DESERT PLANET", name: "THE CORE", width: 3600, quota: 24, maxAlive: 6, boss: true, bossType: "titan", desert: true, creditMul: 2, requires: 13,
      weights: { sandguard: 3, defender: 3, cdrone: 2, scout: 2 }, fixed: { turret: 2, cannon: 2 },
      hpMul: 0.85, dmgMul: 0.5, reward: 2500, firstBonus: 3000, drop: 0.16, pickup: "coolant", trophy: "TITAN CORE",
      theme: T0 + 4, music: "core", hz: { conv: 5, vents: 6 },
      info: "A gigantic robot factory with conveyor belts and steam vents. Final boss: THE DESERT TITAN (3 phases)." }
  );

  CB.sectorById = CB.sectorById || function (id) { return CB.byId(CB.SECTORS, id); };
  var prevNext = CB.nextSector;
  CB.nextSector = function (id) {                         // Kampagne D1 -> D5, nach dem Titan endet sie
    if (id >= 10 && id <= 14) return id < 14 ? id + 1 : 0;
    return prevNext(id);
  };

  // ---------- Kampagne: Sammlerstuecke (3 pro Sektor), Missionen, Belohnungen ----------
  CB.DESERT = {
    ids: [10, 11, 12, 13, 14],
    isDesert: function (id) { return id >= 10 && id <= 14; },
    relics: {
      10: ["SOLAR COMPASS", "WRECK BLACKBOX", "DUNE CRYSTAL"],
      11: ["SPACEPORT BADGE", "MERCHANT TOKEN", "NEON LANTERN"],
      12: ["COMMAND SEAL", "RADAR LENS", "MEDAL OF 09"],
      13: ["LAB SAMPLE", "OLD SERVER DISC", "GLOW SPORE"],
      14: ["GEAR OF TITAN", "FACTORY BLUEPRINT", "CORE SHARD"]
    },
    // Missionen je Sektor. t: clear | relics | secret | kills | time. Belohnung in Credits (einmalig).
    missions: {
      10: [{ t: "clear", text: "Clear THE DUNES", reward: 200 }, { t: "relics", n: 2, text: "Find 2 relics", reward: 250 }, { t: "secret", text: "Open the hidden dune cave", reward: 300 }],
      11: [{ t: "clear", text: "Clear DUST TOWN", reward: 250 }, { t: "kills", types: ["cdrone"], n: 8, text: "Shoot down 8 combat drones", reward: 300 }, { t: "relics", n: 2, text: "Find 2 relics", reward: 300 }],
      12: [{ t: "clear", text: "Clear OUTPOST 09", reward: 300 }, { t: "kills", types: ["turret", "lasertower"], n: 4, text: "Destroy 4 defence towers", reward: 350 }, { t: "time", s: 360, text: "Clear in under 6:00", reward: 400 }],
      13: [{ t: "clear", text: "Clear THE UNDERGROUND", reward: 350 }, { t: "secret", text: "Find the secret research room", reward: 400 }, { t: "kills", types: ["defender"], n: 4, text: "Destroy 4 heavy defenders", reward: 400 }],
      14: [{ t: "clear", text: "Defeat the DESERT TITAN", reward: 500 }, { t: "relics", n: 3, text: "Find all 3 relics", reward: 500 }, { t: "time", s: 480, text: "Clear in under 8:00", reward: 600 }]
    },
    campaignReward: 3000                                   // Bonus, wenn alle 15 Missionen erfuellt sind
  };
})(window.CB);
