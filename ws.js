/* CYBER BOTS - api/ws.js
   WebSocket-Endpunkt als Vercel Function (offiziell: https://vercel.com/docs/functions/websockets).
   Der Client verbindet sich mit  wss://<deine-domain>/api/ws  */
import http from "node:http";
import { WebSocketServer } from "ws";
import { getHub, originOk } from "../lib/instance.js";

const server = http.createServer((req, res) => {
  res.writeHead(426, { "Content-Type": "text/plain", Upgrade: "websocket" });
  res.end("CYBER BOTS: WebSocket endpoint (wss://.../api/ws)");
});
const wss = new WebSocketServer({ server, maxPayload: 8192, perMessageDeflate: false, verifyClient: (info) => originOk(info.req) });
wss.on("connection", (ws) => getHub().attach(ws));

export default server;
