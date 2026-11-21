/* Prueft (a) den echten Vercel-Einstiegspunkt api/ws.js und (b) die Redis-Anbindung gegen einen nachgebildeten ioredis-Client
   (kein echter Redis-Server in dieser Umgebung -> pruft Aufrufformen/Pub-Sub-Verdrahtung, nicht den Redis-Server selbst). */
import Module from "node:module";
import { EventEmitter } from "node:events";
const bus = new EventEmitter(), kv = new Map(), sets = new Map(), calls = [];
class FakeRedis extends EventEmitter {
  constructor(url, opts) { super(); this.url = url; this.subs = new Set(); bus.on("m", (ch, msg) => { if (this.subs.has(ch)) this.emit("message", ch, msg); }); }
  async get(k) { calls.push(["get", k]); return kv.has(k) ? kv.get(k) : null; }
  async mget(ks) { return ks.map((k) => (kv.has(k) ? kv.get(k) : null)); }
  async set(k, v, ...a) { calls.push(["set", k, ...a]); const nx = a.includes("NX"); if (nx && kv.has(k)) return null; kv.set(k, v); const i = a.indexOf("PX"); if (i >= 0) setTimeout(() => kv.delete(k), a[i + 1]).unref(); return "OK"; }
  async del(k) { kv.delete(k); } async sadd(s, m) { (sets.get(s) || sets.set(s, new Set()).get(s)).add(m); } async srem(s, m) { (sets.get(s) || new Set()).delete(m); }
  async smembers(s) { return [...(sets.get(s) || [])]; } async publish(ch, msg) { bus.emit("m", ch, msg); }
  async subscribe(ch) { this.subs.add(ch); } async unsubscribe(ch) { this.subs.delete(ch); } disconnect() {}
}
const orig = Module._load; Module._load = function (r, ...x) { return r === "ioredis" ? FakeRedis : orig.call(this, r, ...x); };

let ok = 0, bad = 0; const chk = (n, v) => { v ? ok++ : bad++; console.log((v ? "  ok   " : "  FAIL ") + n); };
const { RedisStore, redisUrlFromEnv, createStore } = await import("../lib/store.js");
const { createHub } = await import("../lib/rooms.js");
const { WebSocketServer } = await import("ws"); const http = await import("node:http");
const { Client, sleep } = await import("./helpers.js");

chk("REDIS_URL / KV_URL / STORAGE_URL werden erkannt", redisUrlFromEnv({ KV_URL: "rediss://x" }) === "rediss://x" && createStore({ REDIS_URL: "redis://a" }).kind === "redis" && createStore({}).kind === "memory");
// zwei Hubs ueber RedisStore (je eigener Client + Subscriber)
const mkInst = async () => { const hub = createHub(new RedisStore("redis://fake"), { graceMs: 500, presenceMs: 200 }); const s = http.createServer(); const w = new WebSocketServer({ server: s, maxPayload: 8192 }); w.on("connection", (ws) => hub.attach(ws)); await new Promise((r) => s.listen(0, "127.0.0.1", r)); return { hub, url: "ws://127.0.0.1:" + s.address().port, s, w }; };
const A = await mkInst(), B = await mkInst();
const a = new Client(A.url, "A"), b = new Client(B.url, "B"); await a.connect(); await b.connect();
a.send({ t: "create", pub: true, sector: 2 }); const r = await a.wait((m) => m.t === "room");
b.send({ t: "join", code: r.code }); await b.roomState((x) => x.players.length === 2); await a.roomState((x) => x.players.length === 2);
chk("Raum erstellen/beitreten ueber RedisStore (2 Instanzen)", true);
b.send({ t: "ready", v: true }); await a.roomState((x) => x.players.some((p) => p.ready)); a.send({ t: "start" }); await b.wait((m) => m.t === "start");
a.clear(); b.clear(); b.send({ t: "st", x: 5, y: 5, f: 1, aim: 0, hp: 1, k: 0, dead: false }); chk("Positionen ueber Pub/Sub", (await a.wait((m) => m.t === "st")).x === 5);
chk("SET NX mit PX fuer Raumcode und Sperre verwendet", calls.some((c) => c[0] === "set" && c[1].startsWith("cb:room:") && c.includes("NX") && c.includes("PX")) && calls.some((c) => c[1].startsWith("cb:lock:") && c.includes("NX")));
a.close(); b.close(); await sleep(100);

// Echter Einstiegspunkt
process.env.CB_DEBUG = ""; delete process.env.REDIS_URL;
const mod = await import("../api/ws.js"); const srv = mod.default; await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const c = new Client("ws://127.0.0.1:" + srv.address().port, "VERCEL"); await c.connect(); c.send({ t: "create", pub: false, sector: 1 });
chk("api/ws.js exportiert http.Server und bedient Raeume", /^[A-HJ-NP-Z2-9]{6}$/.test((await c.wait((m) => m.t === "room")).code));
const res = await fetch("http://127.0.0.1:" + srv.address().port + "/api/ws"); chk("HTTP-GET auf /api/ws -> 426", res.status === 426);
const evil = new WebSocket("ws://127.0.0.1:" + srv.address().port, { headers: { Origin: "https://evil.example" } });
const blocked = await new Promise((r) => { evil.onerror = () => r(true); evil.onopen = () => r(false); setTimeout(() => r(false), 1500); });
chk("Fremde Origin wird abgelehnt", blocked === true);
c.close();
const health = (await import("../api/health.js")).default; let body = "", code = 0; await health({}, { setHeader() {}, set statusCode(v) { code = v; }, end(s) { body = s; } });
chk("api/health.js antwortet (" + body.slice(0, 80) + ")", code === 200 && JSON.parse(body).ok === true);
console.log("\n" + ok + " bestanden, " + bad + " fehlgeschlagen"); process.exit(bad ? 1 : 0);
