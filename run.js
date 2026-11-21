/* CYBER BOTS - Test der Multiplayer-Logik (ohne Browser): npm test
   Mehrere "Instanzen" teilen ein Backend (wie Redis). Echte WebSocket-Verbindungen (Node 22). */
import { createMemoryBackend, startInstance, Client, sleep } from "./helpers.js";

let ok = 0, bad = 0;
const chk = (name, v) => { if (v) { ok++; console.log("  ok   " + name); } else { bad++; console.log("  FAIL " + name); } };
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;

async function main() {
  const backend = createMemoryBackend();
  const A = await startInstance(backend), B = await startInstance(backend), C = await startInstance(backend);
  const clients = [];
  const mk = async (inst, name, extra) => { const c = new Client(inst.url, name); await c.connect(extra); clients.push(c); return c; };

  console.log("Raum-System");
  const anna = await mk(A, "ANNA"), ben = await mk(B, "BEN"), cara = await mk(C, "CARA"), dan = await mk(A, "DAN"), eve = await mk(B, "EVE");
  chk("welcome liefert pid (8 hex) und token (24 hex)", /^[0-9a-f]{8}$/.test(anna.pid) && anna.token.length === 24 && anna.resumed === false);
  anna.send({ t: "create", pub: true, sector: 3 });
  const r0 = await anna.wait((m) => m.t === "room");
  chk("Raumcode hat 6 Zeichen aus erlaubtem Alphabet (" + r0.code + ")", CODE.test(r0.code));
  chk("Ersteller ist Host, Sektor 3, 1 Spieler", r0.host === anna.pid && r0.sector === 3 && r0.players.length === 1 && r0.state === "lobby");
  const code = r0.code;

  ben.send({ t: "list" });
  const lst = await ben.wait((m) => m.t === "rooms" && m.rooms.length);
  chk("Raum erscheint in Liste auf anderer Instanz", lst.rooms.some((r) => r.code === code && r.n === 1));

  ben.send({ t: "join", code: code.toLowerCase() });
  await ben.roomState((r) => r.code === code && r.players.length === 2);
  await anna.roomState((r) => r.players.length === 2);
  chk("BEN (Instanz B) tritt bei, ANNA (Instanz A) sieht 2 Spieler", true);
  cara.send({ t: "join", code }); await cara.roomState((r) => r.players.length === 3);
  dan.send({ t: "join", code }); await dan.roomState((r) => r.players.length === 4);
  chk("4 Spieler ueber 3 Instanzen im selben Raum", anna.room.players.length === 4 && ben.room.players.length === 4);
  eve.send({ t: "join", code }); const full = await eve.wait((m) => m.t === "err");
  chk("5. Spieler abgewiesen (ROOM IS FULL)", full.msg === "ROOM IS FULL" && !eve.room);
  eve.send({ t: "join", code: "ABC" }); chk("Ungueltiger Code abgewiesen", (await eve.wait((m) => m.t === "err")).msg === "INVALID ROOM CODE");
  eve.send({ t: "join", code: "AAAAAA" }); chk("Unbekannter Code: ROOM NOT FOUND", (await eve.wait((m) => m.t === "err")).msg === "ROOM NOT FOUND");
  eve.send({ t: "join", code: "AB12" + "!!" }); chk("Code mit Sonderzeichen abgewiesen", (await eve.wait((m) => m.t === "err")).t === "err");

  console.log("Lobby: Bereit, Sektor, Start");
  ben.send({ t: "sector", id: 5 }); await sleep(100); chk("Nicht-Host kann Sektor nicht aendern", anna.room.sector === 3);
  ben.send({ t: "start" }); await sleep(100); chk("Nicht-Host kann nicht starten", anna.room.state === "lobby");
  anna.send({ t: "sector", id: 5 }); await ben.roomState((r) => r.sector === 5); chk("Host aendert Sektor -> alle sehen 5", true);
  anna.send({ t: "sector", id: 99 }); await sleep(100); chk("Ungueltiger Sektor ignoriert", anna.room.sector === 5);
  anna.send({ t: "start" }); chk("Start ohne Bereit blockiert", (await anna.wait((m) => m.t === "err")).msg.includes("READY"));
  for (const c of [ben, cara, dan]) c.send({ t: "ready", v: true });
  await anna.roomState((r) => r.players.filter((p) => p.ready).length === 3);
  chk("Bereit-Status von 3 Instanzen sichtbar", true);
  ben.clear(); cara.clear(); dan.clear(); anna.clear();
  anna.send({ t: "start" });
  const sts = await Promise.all([anna, ben, cara, dan].map((c) => c.wait((m) => m.t === "start")));
  chk("Start erreicht alle 4 Spieler mit gleichem Seed", sts.every((s) => s.sector === 5 && s.seed === sts[0].seed && s.seed > 0));
  await anna.roomState((r) => r.state === "play");

  console.log("Spielzustand synchronisieren");
  ben.clear(); cara.clear(); anna.clear();
  anna.send({ t: "st", x: 400, y: 200, f: 1, aim: 0.5, hp: 0.8, k: 3, dead: false });
  const g1 = await ben.wait((m) => m.t === "st"), g2 = await cara.wait((m) => m.t === "st");
  chk("Position erreicht Spieler auf anderen Instanzen", g1.id === anna.pid && g1.x === 400 && g2.x === 400 && g1.k === 3 && g1.hp === 0.8);
  ben.clear(); anna.send({ t: "st", x: 401, y: 200, f: 1, aim: 0.5, hp: 0.8, k: 3, dead: false, w: "laser", sk: "r_ice", wk: "<script>x" });
  const g3w = await ben.wait((m) => m.t === "st" && m.x === 401);
  chk("Waffe/Skin werden weitergereicht, ungueltige Kennungen verworfen", g3w.w === "laser" && g3w.sk === "r_ice" && g3w.wk === "");
  await sleep(100); chk("Sender bekommt eigene Position nicht zurueck", !anna.has((m) => m.t === "st"));
  const bad1 = [{ x: 1e9, y: 0 }, { x: null, y: 0 }, { x: "5", y: 1 }, { x: NaN, y: 1 }, { x: 10, y: -9999 }];
  ben.clear(); bad1.forEach((b) => anna.send(Object.assign({ t: "st" }, b))); anna.send('{"t":"st","x":Infinity,"y":1}');
  await sleep(150); chk("Ungueltige Positionen werden nicht weitergereicht", !ben.has((m) => m.t === "st"));
  ["garbage", "[]", "null", '{"t":5}', '{"t":"zzz"}', "{" + "a".repeat(100)].forEach((g) => anna.send(g));
  anna.send({ t: "st", x: 10, y: 10, f: -1, aim: 0, hp: 5, k: -4, dead: true });
  const g3 = await ben.wait((m) => m.t === "st");
  chk("Kaputte Nachrichten ueberlebt, Werte begrenzt (hp<=1, k>=0)", g3.hp === 1 && g3.k === 0 && g3.f === -1 && g3.dead === true);
  anna.send("x".repeat(12000)); await sleep(200); chk("Zu grosse Nachricht trennt die Verbindung (maxPayload)", anna.closed === true);
  anna.msgs.length = 0;
  const anna2 = await mk(A, "ANNA", { pid: anna.pid, token: anna.token, ing: true });
  chk("Resume nach Verbindungsabbruch auf Instanz A erkannt", anna2.resumed === true && anna2.pid === anna.pid);
  const rr = await anna2.roomState((r) => r.code === code && r.players.length === 4);
  chk("Raumzustand nach Reconnect wiederhergestellt (Host, 4 Spieler, play)", rr.host === anna.pid && rr.state === "play");
  await ben.roomState((r) => r.players.every((p) => !p.away)); chk("Andere sehen ANNA nicht mehr als 'away'", true);
  ben.clear(); anna2.send({ t: "st", x: 77, y: 20, f: 1, aim: 0, hp: 1, k: 0, dead: false });
  chk("Positionen fliessen nach Reconnect wieder", (await ben.wait((m) => m.t === "st")).x === 77);

  console.log("Reconnect auf ANDERE Instanz");
  ben.ws.close(); await sleep(60);
  await anna2.roomState((r) => r.players.find((p) => p.id === ben.pid).away === true); chk("Abgebrochener Spieler wird als 'away' markiert, bleibt im Raum", anna2.room.players.length === 4);
  const ben2 = await mk(C, "BEN", { pid: ben.pid, token: ben.token, ing: true });
  chk("BEN verbindet sich mit Instanz C wieder (Resume)", ben2.resumed === true);
  await ben2.roomState((r) => r.players.length === 4 && r.state === "play"); await anna2.roomState((r) => r.players.every((p) => !p.away));
  anna2.clear(); ben2.send({ t: "st", x: 123, y: 50, f: 1, aim: 0, hp: 1, k: 2, dead: false });
  chk("Zustand von Instanz C kommt bei A an", (await anna2.wait((m) => m.t === "st")).x === 123);
  const evil = await mk(A, "EVIL", { pid: ben.pid, token: "0".repeat(24) });
  chk("Falscher Token uebernimmt keine Sitzung", evil.resumed === false && evil.pid !== ben.pid);
  const evil2 = await mk(A, "EVIL2", { pid: ben.pid, token: "x" }); chk("Ungueltiger Token -> neue Sitzung", evil2.resumed === false);
  evil.close(); evil2.close();
  const ben2b = await mk(B, "BEN", { pid: ben.pid, token: ben.token, ing: true });
  await sleep(100); chk("Zweite Verbindung derselben Sitzung ersetzt die alte (Instanz C)", ben2.closed === true && ben2b.resumed === true);

  console.log("Spielende, Ereignisse");
  anna2.send({ t: "done", result: "win", k: 9 });
  const ev = await cara.wait((m) => m.t === "ev"); chk("Fertig-Ereignis erreicht alle", ev.k === "done" && ev.id === anna.pid && ev.result === "win");
  anna2.send({ t: "done", result: "lose", k: 1 }); await sleep(80); chk("Doppeltes 'done' ignoriert", !cara.has((m) => m.t === "ev"));
  for (const c of [ben2b, cara, dan]) c.send({ t: "done", result: "lose", k: 0 });
  await anna2.roomState((r) => r.state === "lobby"); chk("Alle fertig -> Raum zurueck in Lobby, Bereit zurueckgesetzt", anna2.room.players.every((p) => !p.ready));

  console.log("Verlassen, Host-Wechsel, Kick");
  anna2.send({ t: "leave" }); await anna2.wait((m) => m.t === "left" && m.you);
  const hm = await cara.roomState((r) => r.players.length === 3 && r.host !== anna.pid);
  chk("Host verlaesst Raum -> neuer Host bestimmt", hm.players.some((p) => p.id === hm.host));
  const newHost = [ben2b, cara, dan].find((c) => c.pid === hm.host);
  const victim = [ben2b, cara, dan].find((c) => c !== newHost);
  victim.clear(); newHost.send({ t: "kick", id: victim.pid }); const kk = await victim.wait((m) => m.t === "left" && m.you);
  chk("Host kann Spieler (andere Instanz) kicken", kk.kicked === true && !victim.room);
  const other = [ben2b, cara, dan].find((c) => c !== newHost && c !== victim);
  other.send({ t: "kick", id: newHost.pid }); await sleep(100); chk("Nicht-Host kann nicht kicken", newHost.room && newHost.room.players.length === 2);

  console.log("Host faellt aus (Verbindungsabbruch, keine Rueckkehr)");
  newHost.ws.close();
  await other.roomState((r) => r.players.length === 1 && r.host === other.pid, 3000);
  chk("Nach Schonfrist: Spieler entfernt, Host wandert zum verbleibenden Spieler", true);
  other.send({ t: "leave" }); await other.wait((m) => m.t === "left" && m.you); await sleep(100);
  chk("Leerer Raum wird geloescht", (await A.hub.store.get("cb:room:" + code)) === null);
  const lst2 = (other.send({ t: "list" }), await other.wait((m) => m.t === "rooms")); chk("Geloeschter Raum nicht mehr gelistet", !lst2.rooms.some((r) => r.code === code));

  console.log("Absturz einer Instanz (kein Close, Praesenz laeuft ab)");
  const x1 = await mk(A, "X1"), x2 = await mk(B, "X2");
  x1.send({ t: "create", pub: false, sector: 1 }); const rc = await x1.wait((m) => m.t === "room");
  x2.send({ t: "join", code: rc.code }); await x2.roomState((r) => r.players.length === 2);
  A.hub._conns.forEach((c) => c.ws.removeAllListeners("close")); A.hub._conns.forEach((c) => c.ws.removeAllListeners("error"));
  await A.hub.close(); backend.kv.delete("cb:pr:" + x1.pid);
  await x2.roomState((r) => r.players.length === 1 && r.host === x2.pid, 4000);
  chk("Spieler einer abgestuerzten Instanz wird nach Schonfrist entfernt, Host wechselt", true);

  console.log("Eindeutige Codes");
  const many = [];
  const bots = [];
  for (let i = 0; i < 12; i++) bots.push(await mk(i % 2 ? B : C, "B" + i));
  for (let round = 0; round < 4; round++) {
    bots.forEach((b) => { b.clear(); b.send({ t: "create", pub: true, sector: 1 }); });
    for (const b of bots) { const r = await b.wait((m) => m.t === "room", 3000); many.push(r.code); }
    await sleep(70);
  }
  const rl = bots[0]; rl.clear(); for (let i = 0; i < 3; i++) rl.send({ t: "create", pub: false, sector: 1 }); await sleep(400);
  chk("Rate-Limit: mehr als 5 Raeume/Minute je Spieler werden abgelehnt", rl.has((m) => m.t === "err" && /TOO MANY/.test(m.msg)));
  chk(many.length + " erstellte Raeume haben " + new Set(many).size + " verschiedene Codes", new Set(many).size === many.length && many.every((c) => CODE.test(c)));
  const lst3 = (bots[0].send({ t: "list" }), await bots[0].wait((m) => m.type === undefined && m.t === "rooms")); chk("Raumliste auf max. 30 begrenzt", lst3.rooms.length <= 30 && lst3.rooms.length > 0);

  console.log("Rate-Limit / Handshake");
  const spam = await mk(B, "SPAM"); spam.clear(); for (let i = 0; i < 400; i++) spam.send({ t: "ping", n: i }); await sleep(300);
  chk("Nachrichtenflut wird begrenzt (<300 Antworten auf 400)", spam.msgs.filter((m) => m.t === "pong").length < 300);
  const silent = new Client(B.url, "S"); await new Promise((r) => { silent.ws = new WebSocket(silent.url); silent.ws.onopen = r; silent.ws.onclose = (e) => { silent.closeCode = e.code; }; });
  silent.ws.send(JSON.stringify({ t: "create", pub: true })); await sleep(300); chk("Ohne hello keine Aktionen (kein Raum erzeugt)", !silent.closed || silent.closeCode !== 1000);
  silent.ws.close();

  clients.forEach((c) => c.close()); await sleep(100);
  await Promise.all([A, B, C].map((i) => i.close().catch(() => {})));
  console.log("\n" + ok + " bestanden, " + bad + " fehlgeschlagen");
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error("TEST ABGEBROCHEN:", e); process.exit(1); });
