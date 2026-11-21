/* Testhilfen: mehrere simulierte Function-Instanzen (je ein WebSocket-Server + Hub), die sich EIN Backend teilen (wie Redis). */
import http from "node:http";
import { WebSocketServer } from "ws";
import { createHub } from "../lib/rooms.js";
import { MemoryStore, createMemoryBackend } from "../lib/store.js";

export { createMemoryBackend };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startInstance(backend, opts) {
  const hub = createHub(new MemoryStore(backend), Object.assign({ graceMs: 600, presenceMs: 150, heartbeatMs: 5000 }, opts || {}));
  const server = http.createServer();
  const wss = new WebSocketServer({ server, maxPayload: 8192, perMessageDeflate: false });
  wss.on("connection", (ws) => hub.attach(ws));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  return { hub, port, url: "ws://127.0.0.1:" + port, close: async () => { await hub.close(); wss.close(); server.closeAllConnections && server.closeAllConnections(); server.close(); } };
}

export class Client {
  constructor(url, name) { this.url = url; this.name = name || "T"; this.msgs = []; this.pid = null; this.token = null; this.room = null; this.closeCode = null; }
  connect(extra) {
    return new Promise((res, rej) => {
      const ws = (this.ws = new WebSocket(this.url));
      ws.onmessage = (e) => { const m = JSON.parse(e.data); this.msgs.push(m); if (m.t === "welcome") { this.pid = m.id; this.token = m.token; this.resumed = m.resumed; } if (m.t === "room") this.room = m; if (m.t === "left" && m.you) this.room = null; };
      ws.onclose = (e) => { this.closeCode = e.code; this.closed = true; };
      ws.onerror = () => rej(new Error("ws error"));
      ws.onopen = () => { ws.send(JSON.stringify(Object.assign({ t: "hello", name: this.name, robot: "nova" }, extra || {}))); this.wait((m) => m.t === "welcome", 2000).then(res, rej); };
    });
  }
  send(o) { this.ws.send(typeof o === "string" ? o : JSON.stringify(o)); }
  async wait(pred, ms) {
    const t0 = Date.now(), from = this._seen || 0;
    for (;;) {
      const i = this.msgs.findIndex((m, k) => k >= 0 && pred(m) && !m._used);
      if (i >= 0) { this.msgs[i]._used = true; return this.msgs[i]; }
      if (Date.now() - t0 > (ms || 2000)) throw new Error("timeout waiting (" + this.name + ") got: " + JSON.stringify(this.msgs.filter((m) => !m._used).slice(-4)));
      await sleep(10);
    }
  }
  has(pred) { return this.msgs.some((m) => !m._used && pred(m)); }
  clear() { this.msgs.forEach((m) => (m._used = true)); }
  async roomState(pred, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 2000)) { if (this.room && pred(this.room)) return this.room; await sleep(10); } throw new Error("room state timeout " + this.name + " " + JSON.stringify(this.room)); }
  close() { try { this.ws.close(); } catch (e) { /* */ } }
}
