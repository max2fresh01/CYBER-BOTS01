/* CYBER BOTS - Test Freunde + Textchat (ohne Browser): node test/social.js  (laeuft auch in npm test) */
import { createMemoryBackend, startInstance, Client, sleep } from "./helpers.js";
let ok = 0, bad = 0;
const chk = (name, v) => { if (v) { ok++; console.log("  ok   " + name); } else { bad++; console.log("  FAIL " + name); } };
const hex = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const ID = (s) => s;

async function main() {
  const backend = createMemoryBackend();
  const A = await startInstance(backend), B = await startInstance(backend), C = await startInstance(backend);
  const clients = [];
  const mk = async (inst, name, uid) => { const c = new Client(inst.url, name); await c.connect(); c.uid = uid; c.key = hex(24); clients.push(c); return c; };
  const login = async (c) => { c.send({ t: "fauth", uid: c.uid, key: c.key, name: c.name }); return c.wait((m) => m.t === "fstate" || m.t === "ferr"); };
  const st = (c, pred) => c.wait((m) => m.t === "fstate" && pred(m));

  console.log("Freunde-Anmeldung");
  const u1 = await mk(A, "ANNA", "AAAA2222"), u2 = await mk(B, "BEN", "BBBB3333"), u3 = await mk(C, "CARA", "CCCC4444");
  const s1 = await login(u1); chk("Anmeldung legt Konto an (leere Listen)", s1.t === "fstate" && s1.me === "AAAA2222" && !s1.friends.length);
  await login(u2); await login(u3);
  const bad1 = await mk(A, "X", "short"); chk("Ungueltige Freundes-ID abgewiesen", (await login(bad1)).t === "ferr");
  const thief = await mk(B, "THIEF", "AAAA2222"); const tr = await login(thief); chk("Fremder Schluessel kann ID nicht uebernehmen", tr.t === "ferr" && tr.fatal);

  console.log("Anfragen");
  u1.send({ t: "fadd", code: "zzzz-9999" }); chk("Unbekannte ID: Fehler", (await u1.wait((m) => m.t === "ferr")).msg === "UNKNOWN FRIEND ID");
  u1.send({ t: "fadd", code: "AAAA2222" }); chk("Sich selbst hinzufuegen verboten", (await u1.wait((m) => m.t === "ferr")).msg === "INVALID FRIEND ID");
  u1.clear(); u2.clear();
  u1.send({ t: "fadd", code: "BBBB-3333" });
  const rq = await u2.wait((m) => m.t === "freq");
  chk("BEN (andere Instanz) bekommt Anfrage von ANNA", rq.u === "AAAA2222" && rq.name === "ANNA");
  const s2 = await st(u2, (m) => m.inR.length === 1); chk("BEN sieht Anfrage in seiner Liste", s2.inR[0].u === "AAAA2222");
  const s1b = await st(u1, (m) => m.outR.length === 1); chk("ANNA sieht ausgehende Anfrage", s1b.outR[0].name === "BEN");
  u1.send({ t: "fadd", code: "BBBB3333" }); chk("Doppelte Anfrage abgewiesen", (await u1.wait((m) => m.t === "ferr")).msg === "REQUEST ALREADY SENT");
  u2.clear(); u1.clear();
  u2.send({ t: "facc", u: "AAAA2222" });
  const f2 = await st(u2, (m) => m.friends.length === 1), f1 = await st(u1, (m) => m.friends.length === 1);
  chk("Anfrage angenommen: beide sind Freunde und online", f2.friends[0].u === "AAAA2222" && f2.friends[0].on && f1.friends[0].on && !f2.inR.length);
  u3.send({ t: "facc", u: "AAAA2222" }); chk("Annehmen ohne Anfrage abgewiesen", (await u3.wait((m) => m.t === "ferr")).msg === "NO SUCH REQUEST");
  u3.clear(); u3.send({ t: "fadd", code: "AAAA2222" }); await sleep(150);
  u1.clear(); u1.send({ t: "fadd", code: "CCCC4444" });
  const f3 = await st(u3, (m) => m.friends.length === 1); chk("Gegenseitige Anfragen werden sofort Freundschaft", f3.friends[0].u === "AAAA2222");

  console.log("Online-Status");
  u1.clear(); u2.close(); await u1.wait((m) => m.t === "fpres" && m.u === "BBBB3333" && m.on === false, 3000); chk("Freund geht offline -> Meldung auf anderer Instanz", true);
  const u2b = await mk(C, "BEN", "BBBB3333"); u2b.key = u2.key; u1.clear(); await login(u2b);
  await u1.wait((m) => m.t === "fpres" && m.u === "BBBB3333" && m.on === true, 3000); chk("Wieder online (neue Instanz) -> Meldung", true);
  u2b.send({ t: "fhide", v: 1 }); await u1.wait((m) => m.t === "fpres" && m.u === "BBBB3333" && m.on === false, 3000); chk("Unsichtbar-Modus: Freund sieht ihn offline", true);
  u1.clear(); u1.send({ t: "fmsg", u: "BBBB3333", text: "hallo" }); chk("Nachricht an unsichtbaren Spieler nicht zustellbar", (await u1.wait((m) => m.t === "fmsg")).ok === false);
  u2b.send({ t: "fhide", v: 0 }); await u1.wait((m) => m.t === "fpres" && m.on === true, 3000);

  console.log("Privater Chat");
  u1.clear(); u2b.clear(); u1.send({ t: "fmsg", u: "BBBB3333", text: "  Hi\u0000  <b>BEN</b>\n\n  los? " });
  const got = await u2b.wait((m) => m.t === "fmsg" && !m.mine);
  chk("Nachricht kommt an (Instanz A -> C), bereinigt", got.u === "AAAA2222" && got.name === "ANNA" && got.text === "Hi <b>BEN</b> los?");
  chk("Absender bekommt Zustellbestaetigung", (await u1.wait((m) => m.t === "fmsg" && m.mine)).ok === true);
  u1.send({ t: "fmsg", u: "CCCC4444", text: "x".repeat(500) }); const long = await u3.wait((m) => m.t === "fmsg"); chk("Text auf 140 Zeichen gekuerzt", long.text.length === 140);
  const stranger = await mk(A, "NOPE", "DDDD5555"); await login(stranger);
  stranger.send({ t: "fmsg", u: "AAAA2222", text: "spam" }); chk("Nur Freunde duerfen schreiben", (await stranger.wait((m) => m.t === "ferr")).msg === "NOT YOUR FRIEND");
  u1.clear(); for (let i = 0; i < 12; i++) u1.send({ t: "fmsg", u: "BBBB3333", text: "m" + i });
  await sleep(300); chk("Rate-Limit bremst Spam", u1.msgs.some((m) => m.t === "ferr" && m.msg === "SLOW DOWN"));
  await sleep(5200);

  console.log("Einladung");
  u3.clear(); u3.send({ t: "finv", u: "AAAA2222" }); await sleep(100); chk("Einladen ohne Raum passiert nichts", !u3.has((m) => m.t === "fok"));
  u1.send({ t: "create", pub: false, sector: 10 }); const room = await u1.wait((m) => m.t === "room");
  u2b.clear(); u1.send({ t: "finv", u: "BBBB3333" });
  const inv = await u2b.wait((m) => m.t === "finvite"); chk("Freund erhaelt Raumcode (" + inv.code + ")", inv.code === room.code && inv.name === "ANNA");
  stranger.clear(); u1.clear(); u1.send({ t: "finv", u: "DDDD5555" }); chk("Nicht-Freund kann nicht eingeladen werden", (await u1.wait((m) => m.t === "ferr")).msg === "NOT YOUR FRIEND");

  console.log("Raum-Textchat");
  u2b.send({ t: "join", code: room.code }); await u2b.roomState((r) => r.players.length === 2);
  stranger.send({ t: "join", code: room.code }); await stranger.roomState((r) => r.players.length === 3);
  u2b.clear(); u1.clear(); stranger.clear(); u3.clear();
  u1.send({ t: "chat", text: " gg  <script>x</script> " });
  const c2 = await u2b.wait((m) => m.t === "chat"), c3 = await stranger.wait((m) => m.t === "chat");
  chk("Raumchat erreicht alle Mitglieder ueber Instanzen", c2.text === "gg <script>x</script>" && c2.name === "ANNA" && c3.text === c2.text && c2.id === u1.pid);
  await sleep(100); chk("Nicht-Mitglied (anderer Raum) bekommt nichts", !u3.has((m) => m.t === "chat"));
  u1.clear(); u3.send({ t: "chat", text: "ich bin in keinem Raum" }); await sleep(150); chk("Chat ohne Raum wird verworfen", !u1.has((m) => m.t === "chat"));
  u1.clear(); for (let i = 0; i < 9; i++) u1.send({ t: "chat", text: "s" + i }); await sleep(300);
  chk("Raumchat: Rate-Limit (max 5 / 8 s)", u1.msgs.filter((m) => m.t === "chat").length <= 5 && u1.has((m) => m.t === "err"));

  console.log("Entfernen");
  u2b.clear(); u1.clear(); u1.send({ t: "frem", u: "BBBB3333" });
  await st(u1, (m) => !m.friends.some((f) => f.u === "BBBB3333")); await st(u2b, (m) => !m.friends.some((f) => f.u === "AAAA2222"));
  chk("Freund entfernen wirkt auf beiden Seiten", true);
  u1.send({ t: "finv", u: "BBBB3333" }); chk("Nach Entfernen keine Einladung/Chat mehr", (await u1.wait((m) => m.t === "ferr")).msg === "NOT YOUR FRIEND");
  u1.clear(); u2b.send({ t: "fadd", code: "AAAA2222" }); await st(u1, (m) => m.inR.length === 1);
  u1.send({ t: "fdec", u: "BBBB3333" }); await st(u1, (m) => m.inR.length === 0); const dd = await st(u2b, (m) => m.outR.length === 0); chk("Ablehnen entfernt Anfrage bei beiden", !!dd);

  clients.forEach((c) => c.close()); await sleep(100);
  await Promise.all([A, B, C].map((i) => i.close().catch(() => {})));
  console.log("\n" + ok + " bestanden, " + bad + " fehlgeschlagen");
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error("TEST ABGEBROCHEN:", e); process.exit(1); });
