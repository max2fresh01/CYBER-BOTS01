/* CYBER BOTS - server/dev.js : lokaler Entwicklungsserver (npm run dev)
   Liefert public/ aus und bedient /api/ws mit derselben Raum-Logik wie auf Vercel (ohne REDIS_URL: Speicher dieses Prozesses).
   Nur zum lokalen Testen - die Veroeffentlichung laeuft ueber Vercel (siehe VERCEL.md). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { getHub, originOk } from "../lib/instance.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const PORT = parseInt(process.env.PORT, 10) || 8080;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const PUBLIC = /^\/(index\.html|favicon\.svg|css\/[\w.-]+|js\/[\w.-]+)?$/;

const server = http.createServer((req, res) => {
  let url = (req.url || "/").split("?")[0];
  if (url === "/api/health") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: true, ...getHub().stats() })); }
  if (!PUBLIC.test(url)) { res.writeHead(404); return res.end("Not found"); }
  if (url === "/") url = "/index.html";
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" });
    res.end(data);
  });
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
wss.on("connection", (ws) => getHub().attach(ws));
server.on("upgrade", (req, socket, head) => {
  if ((req.url || "").split("?")[0] !== "/api/ws" || !originOk(req)) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});
server.listen(PORT, () => console.log("CYBER BOTS dev server: http://localhost:" + PORT));
