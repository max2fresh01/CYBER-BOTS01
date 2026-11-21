/* CYBER BOTS - Test Sprachchat-Signalisierung (ohne Browser): node test/voice.js  (Teil von npm test) */
import { createMemoryBackend, startInstance, Client, sleep } from "./helpers.js";
import { iceServers, turnConfigured } from "../lib/voice.js";
import crypto from "node:crypto";
let ok = 0, bad = 0;
const chk = (name, v) => { if (v) { ok++; console.log("  ok   " + name); } else { bad++; console.log("  FAIL " + name); } };
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

async function main() {
  console.log("ICE-Konfiguration");
  const d0 = iceServers({}, "ABCD2345", 1e12);
  chk("Standard: nur STUN, kein TURN", d0.length === 1 && /^stun:/.test(d0[0].urls[0]) && !turnConfigured({}));
  const env = { TURN_URLS: "turn:t.example.com:3478?transport=udp,turns:t.example.com:5349?transport=tcp,javascript:alert(1)", TURN_SECRET: "geheim", STUN_URLS: "stun:s.example.com:3478" };
  const d1 = iceServers(env, "ABCD2345", 1700000000000), tu = d1[1];
  const expUser = (1700000000 + 3600) + ":ABCD2345";
  chk("TURN mit Secret: kurzlebige Zugangsdaten (coturn-Format), ungueltige URLs verworfen", d1[0].urls[0] === "stun:s.example.com:3478" && tu.username === expUser && tu.urls.length === 2 &&
    tu.credential === crypto.createHmac("sha1", "geheim").update(expUser).digest("base64") && turnConfigured(env));
  chk("Feste TURN-Zugangsdaten moeglich", iceServers({ TURN_URLS: "turn:a.b:3478", TURN_USERNAME: "u", TURN_CREDENTIAL: "p" }, "X")[1].credential === "p");
  chk("TURN-URL ohne Zugangsdaten wird nicht ausgegeben", iceServers({ TURN_URLS: "turn:a.b:3478" }, "X").length === 1);

  const backend = createMemoryBackend();
  const A = await startInstance(backend), B = await startInstance(backend), C = await startInstance(backend);
  const clients = [];
  const mk = async (inst, name, uid) => { const c = new Client(inst.url, name); await c.connect(); c.uid = uid; c.key = hex(24); clients.push(c); return c; };
  const login = async (c) => { c.send({ t: "fauth", uid: c.uid, key: c.key, name: c.name }); await c.wait((m) => m.t === "fstate"); };
  const anna = await mk(A, "ANNA", "AAAA2222"), ben = await mk(B, "BEN", "BBBB3333"), cara = await mk(C, "CARA", "CCCC4444"), noauth = await mk(A, "GUEST", "EEEE6666");
  await login(anna); await login(ben); await login(cara);
  anna.send({ t: "fadd", code: "BBBB3333" }); await ben.wait((m) => m.t === "freq"); ben.send({ t: "facc", u: "AAAA2222" }); await anna.wait((m) => m.t === "fstate" && m.friends.length === 1);
  // CARA ist NICHT mit ANNA/BEN befreundet

  console.log("Sprachraum");
  anna.send({ t: "create", pub: false, sector: 1 }); const room = await anna.wait((m) => m.t === "room");
  for (const c of [ben, cara, noauth]) { c.send({ t: "join", code: room.code }); await c.roomState((r) => r.code === room.code); }
  await anna.roomState((r) => r.players.length === 4);
  noauth.send({ t: "vjoin" }); chk("Ohne Freunde-Anmeldung kein Sprachchat", (await noauth.wait((m) => m.t === "verr")).t === "verr");
  anna.clear(); anna.send({ t: "vjoin" });
  const p1 = await anna.wait((m) => m.t === "vpeers");
  chk("Erster im Sprachchat: keine Peers; ICE-Server geliefert", p1.peers.length === 0 && p1.ice[0].urls.length >= 1);
  await ben.roomState((r) => r.players.some((p) => p.voice)); chk("Alle sehen, wer im Sprachchat ist (voice-Flag)", true);
  cara.send({ t: "vjoin" }); await cara.wait((m) => m.t === "vpeers");
  ben.clear(); ben.send({ t: "vjoin" });
  const p2 = await ben.wait((m) => m.t === "vpeers");
  chk("BEN sieht nur seinen Freund ANNA als Peer (nicht CARA)", p2.peers.length === 1 && p2.peers[0] === anna.pid);

  console.log("Signalisierung");
  ben.send({ t: "vsig", to: anna.pid, d: { k: "offer", sdp: "v=0..." } });
  const s1 = await anna.wait((m) => m.t === "vsig");
  chk("Angebot BEN -> ANNA (andere Instanz) kommt an", s1.from === ben.pid && s1.d.k === "offer");
  anna.send({ t: "vsig", to: ben.pid, d: { k: "answer", sdp: "v=0" } }); chk("Antwort ANNA -> BEN", (await ben.wait((m) => m.t === "vsig")).d.k === "answer");
  cara.clear(); ben.send({ t: "vsig", to: cara.pid, d: { k: "offer", sdp: "x" } }); await sleep(250);
  chk("Signal an Nicht-Freund wird verworfen", !cara.has((m) => m.t === "vsig"));
  anna.send({ t: "vsig", to: cara.pid, d: { k: "offer", sdp: "x" } }); await sleep(200); chk("... auch in Gegenrichtung", !cara.has((m) => m.t === "vsig"));
  noauth.clear(); anna.send({ t: "vsig", to: noauth.pid, d: { k: "offer" } }); await sleep(200); chk("Signal an Spieler ohne Sprachchat verworfen", !noauth.has((m) => m.t === "vsig"));
  anna.send({ t: "vsig", to: "ffffffff", d: { k: "offer" } }); anna.send({ t: "vsig", to: ben.pid, d: "text" }); anna.send({ t: "vsig", to: ben.pid, d: { sdp: "x".repeat(7000) } });
  ben.clear(); await sleep(250); chk("Ungueltige Ziele/Formate/zu grosse Nachrichten verworfen", !ben.has((m) => m.t === "vsig"));
  ben.clear(); anna.send({ t: "vsig", to: ben.pid, d: { k: "cand", c: { candidate: "candidate:1 1 udp 1 1.2.3.4 5 typ host" } } });
  chk("ICE-Kandidat wird weitergereicht", (await ben.wait((m) => m.t === "vsig")).d.k === "cand");

  console.log("Verlassen / Freundschaft beenden");
  ben.clear(); anna.send({ t: "vleave" }); chk("Verlassen: Mitspieler erhalten vleft", (await ben.wait((m) => m.t === "vleft")).id === anna.pid);
  ben.clear(); ben.send({ t: "vsig", to: anna.pid, d: { k: "offer" } }); await sleep(200); chk("Nach dem Verlassen werden Signale an ANNA verworfen", !anna.has((m) => m.t === "vsig" && m.d.k === "offer"));
  ben.send({ t: "vjoin" }); await ben.wait((m) => m.t === "vpeers"); anna.send({ t: "vjoin" }); await anna.wait((m) => m.t === "vpeers");
  anna.clear(); ben.clear(); anna.send({ t: "frem", u: "BBBB3333" });
  await anna.wait((m) => m.t === "fstate" && !m.friends.length); await ben.wait((m) => m.t === "fstate" && !m.friends.length);
  anna.send({ t: "vjoin" }); const p3 = await anna.wait((m) => m.t === "vpeers");
  chk("Nach Freundschaftsende: ehemaliger Freund nicht mehr in der Peer-Liste", !p3.peers.includes(ben.pid));
  anna.clear(); ben.send({ t: "vsig", to: anna.pid, d: { k: "offer" } }); await sleep(200);
  chk("Nach Freundschaftsende: Signale werden sofort verworfen", !anna.has((m) => m.t === "vsig"));

  clients.forEach((c) => c.close()); await sleep(100);
  await Promise.all([A, B, C].map((i) => i.close().catch(() => {})));
  console.log("\n" + ok + " bestanden, " + bad + " fehlgeschlagen");
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error("TEST ABGEBROCHEN:", e); process.exit(1); });
