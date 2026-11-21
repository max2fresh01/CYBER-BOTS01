/* CYBER BOTS - lib/rooms.js
   Raum- und Multiplayer-Logik fuer Vercel Functions (WebSocket) - OHNE lokalen Dauerzustand.

   Warum so gebaut?
   - Eine WebSocket-Verbindung haengt an genau EINER Function-Instanz, neue Verbindungen koennen auf eine andere Instanz kommen.
     Deshalb liegen Raeume, Sitzungen und Praesenz im gemeinsamen Speicher (Redis) und Nachrichten laufen ueber Redis-Pub/Sub.
   - Verbindungen werden nach dem maximalen Laufzeitlimit der Function geschlossen -> der Client verbindet sich neu,
     meldet sich mit pid+token an ("Resume") und bekommt den kompletten Raumzustand erneut (Resync).
   - Jeder Spieler simuliert sein eigenes Spiel; der Server validiert, haelt die Raeume und verteilt Positionen/Ereignisse.

   Redis-Schluessel:  cb:room:<CODE>  Raum-JSON (TTL 6 h)      cb:lock:<CODE>  kurzer Sperr-Schluessel (3 s)
                      cb:s:<PID>      Sitzung {token,room}      cb:pr:<PID>     Praesenz (TTL 45 s)
                      cb:pub          Menge oeffentlicher Raumcodes
   Pub/Sub-Kanal:     cb:ch:<CODE>    (nur Instanzen mit lokalen Spielern des Raums abonnieren ihn) */
import crypto from "node:crypto";
import { createSocial, cleanText } from "./social.js";
import { iceServers, turnConfigured } from "./voice.js";

export const MAX_PLAYERS = 4;
export const CODE_LEN = 6;
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";       // ohne I, O, 0, 1 (Verwechslungsgefahr)
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const SECTOR_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];     // 10-14 = Kampagne DESERT PLANET (Update 2.0)

const rk = (c) => "cb:room:" + c, chn = (c) => "cb:ch:" + c, sk = (p) => "cb:s:" + p, pk = (p) => "cb:pr:" + p;
const PID_RE = /^[0-9a-f]{8}$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s, max, dflt) => { s = String(s == null ? "" : s).replace(/[^\w \-.!?]/g, "").trim().slice(0, max); return s || dflt; };

export function newCode() {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return s;
}

export function createHub(store, options) {
  const o = Object.assign({ graceMs: 25000, presenceMs: 15000, heartbeatMs: 20000, maxAgeMs: 270000, maxConn: 800, roomTtl: 6 * 3600 * 1000, helloMs: 6000, log: false }, options || {});
  const inst = crypto.randomBytes(4).toString("hex");
  const conns = new Map();        // pid -> conn (nur lokale Verbindungen)
  const local = new Map();        // code -> Set(pid) (lokale Spieler je Raum)
  const cache = new Map();        // code -> letzter bekannter Raumzustand (fuer schnelles Weiterreichen von "st")
  const subbed = new Set();
  const graces = new Map();       // pid -> Timer (Schonfrist nach Verbindungsabbruch)
  const timers = [];
  let closed = false;
  const log = (...a) => { if (o.log) console.log("[hub " + inst + "]", ...a); };
  const social = createSocial({ store, inst, send: (c, obj) => send(c, obj), withLock: (k, fn) => withLock(k, fn), log, onFriends: (u) => { const x = social._uconns.get(u); if (x) x.vf = null; } });   // Freunde + privater Chat (lib/social.js)

  // ------------------------------------------------------------ Senden
  function send(c, obj) { if (c.ws.readyState === 1) { try { c.ws.send(JSON.stringify(obj)); } catch (e) { /* */ } } }
  function roomInfo(d) {
    return { t: "room", code: d.code, host: d.host, sector: d.sector, pub: !!d.pub, state: d.state, max: MAX_PLAYERS, v: d.v | 0,
      players: d.members.map((m) => ({ id: m.id, name: m.name, robot: m.robot, ready: !!m.ready, kills: m.kills | 0, hp: m.hp == null ? 1 : m.hp, dead: !!m.dead, done: m.done || null, away: !!m.away, voice: !!m.v })) };
  }
  function deliver(code, obj, except, to) {
    const set = local.get(code); if (!set) return;
    Array.from(set).forEach((pid) => {
      if (pid === except || (to && pid !== to)) return;
      const c = conns.get(pid); if (!c) return;
      send(c, obj);
      if (obj.t === "left" && obj.you) detachLocal(c);
    });
  }
  function bus(code, payload) { payload.src = inst; return store.publish(chn(code), JSON.stringify(payload)).catch((e) => console.error("[publish]", e.message)); }
  function hasRemote(d) { return !d || d.members.some((m) => m.inst !== inst && !m.away); }
  /* Nachricht an alle Spieler des Raums (lokal sofort, andere Instanzen ueber Pub/Sub) */
  function emit(code, obj, opt) {
    opt = opt || {};
    deliver(code, obj, opt.except, opt.to);
    const needBus = opt.to ? !conns.has(opt.to) : hasRemote(cache.get(code));
    if (needBus) bus(code, { k: "msg", o: obj, ex: opt.except, to: opt.to });
  }
  function pushRoom(code, d) {
    deliver(code, roomInfo(d));
    if (hasRemote(d)) bus(code, { k: "room", doc: d });
  }

  // ------------------------------------------------------------ Pub/Sub
  store.onMessage = function (chan, raw) {
    let p; try { p = JSON.parse(raw); } catch (e) { return; }
    if (String(chan).startsWith("cb:uc:")) return social.onBus(chan, raw);       // Ereignisse fuer einen Spieler (Freunde, Einladungen, privater Chat)
    if (!p || p.src === inst) return;
    const code = String(chan).slice(6);
    if (!local.has(code)) return;
    if (p.k === "room" && p.doc) {
      const have = cache.get(code);
      if (have && (have.v | 0) >= (p.doc.v | 0)) return;                // veraltete/doppelte Version (Pub/Sub garantiert keine Reihenfolge ueber Instanzen)
      cache.set(code, p.doc); deliver(code, roomInfo(p.doc));
    }
    else if (p.k === "msg" && p.o) {
      if (p.o.t === "replaced") {                                     // dieselbe Sitzung hat sich auf einer anderen Instanz neu verbunden
        const c = conns.get(p.to);
        if (c && c.born < (p.o.at || 0)) { conns.delete(c.pid); detachLocal(c); try { c.ws.close(4001, "REPLACED"); } catch (e) { /* */ } }
        return;
      }
      deliver(code, p.o, p.ex, p.to);
    }
    else if (p.k === "closed") cache.delete(code);
  };

  async function ensureSub(code) { if (!subbed.has(code)) { subbed.add(code); await store.subscribe(chn(code)); } }
  function attachLocal(c, code) {
    let s = local.get(code); if (!s) local.set(code, (s = new Set()));
    s.add(c.pid); c.room = code;
  }
  function detachLocal(c) {
    const code = c.room; c.room = null;
    if (!code) return;
    const s = local.get(code);
    if (s) { s.delete(c.pid); if (!s.size) { local.delete(code); cache.delete(code); if (subbed.delete(code)) store.unsubscribe(chn(code)).catch(() => {}); } }
  }

  // ------------------------------------------------------------ Raum-Zustand (atomar per Sperre)
  async function withLock(code, fn) {
    const lk = "cb:lock:" + code, tok = crypto.randomBytes(6).toString("hex");
    for (let i = 0; i < 14; i++) {
      if (await store.setnx(lk, tok, 3000)) {
        try { return await fn(); } finally { try { if ((await store.get(lk)) === tok) await store.del(lk); } catch (e) { /* */ } }
      }
      await sleep(25 + Math.random() * 60);
    }
    throw new Error("LOCKED");
  }
  /* Raum lesen -> fn(doc) aendert ihn (synchron) -> speichern und an alle verteilen. fn kann {err} zurueckgeben. */
  function mutate(code, fn) {
    return withLock(code, async () => {
      const raw = await store.get(rk(code));
      if (!raw) return { err: "ROOM NOT FOUND" };
      const doc = JSON.parse(raw), res = fn(doc);
      if (res && res.err) return res;
      if (doc._del) {
        await store.del(rk(code)); await store.srem("cb:pub", code);
        cache.delete(code); bus(code, { k: "closed" });
        return { doc, res };
      }
      doc.v = (doc.v | 0) + 1;
      await store.set(rk(code), JSON.stringify(doc), o.roomTtl);
      const have = cache.get(code);
      if (local.has(code)) cache.set(code, doc);
      if (!have || (have.v | 0) < doc.v || !local.has(code)) pushRoom(code, doc);   // schon neuere Version per Pub/Sub erhalten -> nicht zurueckdrehen
      else if (hasRemote(doc)) bus(code, { k: "room", doc });
      return { doc, res };
    });
  }
  function finishCheck(d) {                                          // alle fertig -> zurueck in die Lobby
    if (d.state === "play" && d.members.every((m) => m.done)) { d.state = "lobby"; d.startedAt = 0; d.members.forEach((m) => { m.ready = false; }); }
  }
  async function setSessionRoom(pid, code) {
    try { const raw = await store.get(sk(pid)); if (!raw) return; const s = JSON.parse(raw); s.room = code; await store.set(sk(pid), JSON.stringify(s), o.roomTtl); } catch (e) { /* */ }
  }
  const touchPresence = (pid) => store.set(pk(pid), "1", 45000).catch(() => {});

  async function removeMember(code, pid, opt) {
    opt = opt || {};
    const r = await mutate(code, (d) => {
      const i = d.members.findIndex((x) => x.id === pid);
      if (i < 0) return { err: "NOT MEMBER" };
      if (opt.byHost && (d.host !== opt.byHost || d.state !== "lobby")) return { err: "NOT HOST" };
      if (opt.onlyIfGone) { const m = d.members[i]; if (!m.away || Date.now() - m.away < o.graceMs || conns.has(pid)) return { err: "BACK" }; }
      d.members.splice(i, 1);
      if (!d.members.length) { d._del = true; return; }
      if (d.host === pid) { const nh = d.members.find((x) => !x.away) || d.members[0]; d.host = nh.id; }   // Host-Wechsel
      finishCheck(d);
    });
    if (r.err) return r;
    await setSessionRoom(pid, null);
    if (!r.doc._del) emit(code, { t: "left", id: pid }, { except: pid });
    return r;
  }
  // Freundschaft serverseitig pruefen (Ergebnis 30 s zwischengespeichert)
  async function areFriends(c, otherUid) {
    if (!c.uid || !otherUid) return false;
    const now = Date.now(); c.vf = c.vf || new Map();
    const hit = c.vf.get(otherUid); if (hit && now - hit.t < 30000) return hit.v;
    const v = await social.isFriend(c.uid, otherUid); c.vf.set(otherUid, { v, t: now }); return v;
  }
  async function voicePeers(c, d) {
    const out = [];
    for (const x of d.members) if (x.id !== c.pid && x.v && x.u && !x.away && await areFriends(c, x.u)) out.push(x.id);
    return out;
  }
  async function leaveRoom(c, kicked) {
    const code = c.room; if (!code) return;
    detachLocal(c);
    await removeMember(code, c.pid);
    send(c, { t: "left", id: c.pid, you: true, kicked: !!kicked });
  }

  // ------------------------------------------------------------ Eingehende Nachrichten
  function onSt(c, m) {
    const d = cache.get(c.room);
    if (!d || d.state !== "play") return;
    if (typeof m.x !== "number" || typeof m.y !== "number" || !isFinite(m.x) || !isFinite(m.y) || m.x < -100 || m.x > 20000 || m.y < -500 || m.y > 1000) return;
    const aim = typeof m.aim === "number" && isFinite(m.aim) ? Math.round(m.aim * 100) / 100 : 0;
    c.hp = Math.max(0, Math.min(1, +m.hp || 0)); c.kills = Math.max(0, Math.min(99999, m.k | 0)); c.dead = !!m.dead;
    const tag = (v) => (typeof v === "string" && /^[a-z0-9_]{1,16}$/.test(v)) ? v : "";     // Waffen-/Skin-ID (nur Kennung, wird clientseitig aufgeloest)
    const obj = { t: "st", id: c.pid, x: Math.round(m.x), y: Math.round(m.y), f: m.f < 0 ? -1 : 1, aim, hp: c.hp, k: c.kills, dead: c.dead, w: tag(m.w), sk: tag(m.sk), wk: tag(m.wk) };
    deliver(c.room, obj, c.pid);
    if (hasRemote(d)) bus(c.room, { k: "msg", o: obj, ex: c.pid });
  }

  async function listRooms() {
    const codes = (await store.smembers("cb:pub")).slice(0, 60);
    const raws = await store.mget(codes.map(rk)), out = [], now = Date.now();
    for (let i = 0; i < codes.length; i++) {
      if (!raws[i]) { store.srem("cb:pub", codes[i]).catch(() => {}); continue; }
      const d = JSON.parse(raws[i]);
      if (!d.pub || d.state !== "lobby" || d.members.length >= MAX_PLAYERS) continue;
      const pres = await store.mget(d.members.map((m) => pk(m.id)));      // verwaiste Raeume (Instanz abgestuerzt) nicht anzeigen
      const live = d.members.some((m, j) => conns.has(m.id) || (m.away ? now - m.away < o.graceMs * 2 : pres[j] !== null));
      if (!live) { mutate(codes[i], (x) => { if (x.members.every((m) => !conns.has(m.id))) x._del = true; else return { err: "LIVE" }; }).catch(() => {}); continue; }
      const h = d.members.find((m) => m.id === d.host);
      out.push({ code: d.code, sector: d.sector, n: d.members.length, max: MAX_PLAYERS, host: h ? h.name : "?" });
      if (out.length >= 30) break;
    }
    return out;
  }

  async function onHello(c, m) {
    c.name = clean(m.name, 12, "PLAYER");
    c.robot = clean(m.robot, 16, "nova").toLowerCase().replace(/[^a-z0-9]/g, "") || "nova";
    let session = null;
    if (typeof m.pid === "string" && PID_RE.test(m.pid) && typeof m.token === "string" && m.token.length === 24) {
      const raw = await store.get(sk(m.pid));
      if (raw) {
        const s = JSON.parse(raw), a = Buffer.from(s.token || ""), b = Buffer.from(m.token);
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) session = s;
      }
    }
    const resumed = !!session;
    if (resumed) c.pid = m.pid, c.token = session.token;
    else {
      c.pid = crypto.randomBytes(4).toString("hex"); c.token = crypto.randomBytes(12).toString("hex"); session = { token: c.token, room: null };
      await store.set(sk(c.pid), JSON.stringify(session), o.roomTtl);
    }
    const old = conns.get(c.pid);
    conns.set(c.pid, c);
    if (old && old !== c) { try { old.ws.close(4001, "REPLACED"); } catch (e) { /* */ } }
    const g = graces.get(c.pid); if (g) { clearTimeout(g); graces.delete(c.pid); }
    await touchPresence(c.pid);
    c.hello = true;
    send(c, { t: "welcome", id: c.pid, token: c.token, resumed, max: MAX_PLAYERS, sectors: SECTOR_IDS, graceMs: o.graceMs, serverTime: Date.now() });

    if (resumed && session.room && CODE_RE.test(session.room)) {          // Resync: Raumzustand erneut senden
      const code = session.room;
      await ensureSub(code);
      let restart = null;
      const r = await mutate(code, (d) => {
        const mem = d.members.find((x) => x.id === c.pid);
        if (!mem) return { err: "GONE" };
        mem.away = 0; mem.inst = inst; mem.name = c.name; mem.robot = c.robot;
        attachLocal(c, code);
        if (d.state === "play" && !mem.done && !m.ing) {                  // Client spielt gerade nicht (z. B. Seite neu geladen)
          if (d.startedAt && Date.now() - d.startedAt < 15000) restart = { sector: d.sector, seed: d.seed };
          else { mem.done = "lose"; finishCheck(d); }
        }
      });
      if (r.err) {
        if (c.room === code) detachLocal(c); else if (!local.has(code) && subbed.delete(code)) store.unsubscribe(chn(code)).catch(() => {});
        await setSessionRoom(c.pid, null);
        send(c, { t: "left", id: c.pid, you: true, gone: true });
      } else {
        bus(code, { k: "msg", to: c.pid, o: { t: "replaced", at: Date.now() } });
        if (restart) send(c, { t: "start", sector: restart.sector, seed: restart.seed, resume: true });
        return;
      }
    }
    send(c, { t: "rooms", rooms: await listRooms() });
  }

  async function handle(c, m) {
    const t = m.t;
    if (t === "ping") return send(c, { t: "pong", n: m.n | 0 });
    if (t === "hello") { if (c.hello) return; return onHello(c, m); }
    if (!c.hello) return;
    if (await social.handle(c, m)) return;
    const code = c.room;

    switch (t) {
      case "list": send(c, { t: "rooms", rooms: await listRooms() }); break;

      case "create": {
        const now = Date.now(); c.creates = (c.creates || []).filter((x) => now - x < 60000);
        if (c.creates.length >= 5) return send(c, { t: "err", msg: "TOO MANY ROOMS - WAIT" });
        c.creates.push(now);
        await leaveRoom(c);
        const sector = SECTOR_IDS.indexOf(m.sector | 0) >= 0 ? m.sector | 0 : 1;
        let newc = null, doc = null;
        for (let i = 0; i < 25 && !newc; i++) {                              // eindeutiger Code: SET NX
          const cand = newCode();
          doc = { code: cand, host: c.pid, sector, pub: !!m.pub, state: "lobby", seed: 0, startedAt: 0, v: 1, created: now,
            members: [{ id: c.pid, name: c.name, robot: c.robot, ready: false, kills: 0, hp: 1, dead: false, done: null, inst, away: 0 }] };
          if (await store.setnx(rk(cand), JSON.stringify(doc), o.roomTtl)) newc = cand;
        }
        if (!newc) return send(c, { t: "err", msg: "SERVER BUSY" });
        attachLocal(c, newc); cache.set(newc, doc);
        await ensureSub(newc);
        if (doc.pub) await store.sadd("cb:pub", newc);
        await setSessionRoom(c.pid, newc);
        send(c, roomInfo(doc));
        break;
      }

      case "join": {
        const want = String(m.code == null ? "" : m.code).toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!CODE_RE.test(want)) return send(c, { t: "err", msg: "INVALID ROOM CODE" });
        if (code === want) return;
        await leaveRoom(c);
        await ensureSub(want);
        const r = await mutate(want, (d) => {
          if (d.members.some((x) => x.id === c.pid)) { attachLocal(c, want); return; }
          if (d.members.length >= MAX_PLAYERS) return { err: "ROOM IS FULL" };
          if (d.state !== "lobby") return { err: "GAME ALREADY RUNNING" };
          d.members.push({ id: c.pid, name: c.name, robot: c.robot, ready: false, kills: 0, hp: 1, dead: false, done: null, inst, away: 0 });
          attachLocal(c, want);
        });
        if (r.err) {
          if (c.room === want) detachLocal(c); else if (!local.has(want) && subbed.delete(want)) store.unsubscribe(chn(want)).catch(() => {});
          return send(c, { t: "err", msg: r.err });
        }
        await setSessionRoom(c.pid, want);
        break;
      }

      case "chat": {                                                  // Raum-Textchat: nur Mitglieder, Rate-Limit, nichts wird gespeichert
        const text = cleanText(m.text), now = Date.now();
        if (!code || !text) break;
        c.chatT = (c.chatT || []).filter((x) => now - x < 8000);
        if (c.chatT.length >= 5) return send(c, { t: "err", msg: "CHAT: SLOW DOWN" });
        c.chatT.push(now);
        emit(code, { t: "chat", id: c.pid, name: c.name, text, ts: now });
        break;
      }

      // ---- Sprachchat (Phase 4): nur Signalisierung; nur Freunde im selben Raum duerfen sich verbinden
      case "vjoin": {
        if (!code || !c.uid) return send(c, { t: "verr", msg: "SIGN IN TO FRIENDS FIRST" });
        const r = await mutate(code, (d) => { const me = d.members.find((x) => x.id === c.pid); if (!me) return { err: "x" }; me.u = c.uid; me.v = 1; });
        if (r.err) return;
        const peers = await voicePeers(c, r.doc);
        send(c, { t: "vpeers", peers, ice: iceServers(process.env, c.uid), turn: turnConfigured(process.env) });
        break;
      }
      case "vleave":
        if (code) { await mutate(code, (d) => { const me = d.members.find((x) => x.id === c.pid); if (!me || !me.v) return { err: "x" }; me.v = 0; }); emit(code, { t: "vleft", id: c.pid }, { except: c.pid }); }
        break;
      case "vsig": {
        const d0 = code && cache.get(code);
        if (!d0 || typeof m.to !== "string" || !PID_RE.test(m.to) || m.to === c.pid || !m.d || typeof m.d !== "object") return;
        const now = Date.now(); c.vsT = (c.vsT || []).filter((x) => now - x < 10000);
        if (c.vsT.length >= 150) return; c.vsT.push(now);
        if (JSON.stringify(m.d).length > 6000) return;
        const me = d0.members.find((x) => x.id === c.pid), to = d0.members.find((x) => x.id === m.to);
        if (!me || !to || !me.v || !to.v || !(await areFriends(c, to.u))) return;          // beide in der Sprache UND befreundet, sonst wird verworfen
        emit(code, { t: "vsig", from: c.pid, d: m.d }, { to: m.to });
        break;
      }

      case "leave": await leaveRoom(c); send(c, { t: "rooms", rooms: await listRooms() }); break;

      case "ready":
        if (code) await mutate(code, (d) => { const me = d.members.find((x) => x.id === c.pid); if (!me || d.state !== "lobby") return { err: "x" }; me.ready = !!m.v; });
        break;

      case "sector":
        if (code && SECTOR_IDS.indexOf(m.id | 0) >= 0) await mutate(code, (d) => {
          if (d.host !== c.pid || d.state !== "lobby") return { err: "x" };
          d.sector = m.id | 0; d.members.forEach((x) => { if (x.id !== d.host) x.ready = false; });
        });
        break;

      case "pub":
        if (code) {
          const r = await mutate(code, (d) => { if (d.host !== c.pid) return { err: "x" }; d.pub = !!m.v; });
          if (!r.err) await (r.doc.pub ? store.sadd("cb:pub", code) : store.srem("cb:pub", code));
        }
        break;

      case "kick":
        if (code && typeof m.id === "string" && PID_RE.test(m.id) && m.id !== c.pid) {
          const d0 = cache.get(code);
          if (d0 && d0.host === c.pid && d0.state === "lobby") {
            const tgt = conns.get(m.id), isLocal = tgt && tgt.room === code;
            if (isLocal) detachLocal(tgt);
            const r = await removeMember(code, m.id, { byHost: c.pid });
            if (!r.err) { if (isLocal) send(tgt, { t: "left", id: tgt.pid, you: true, kicked: true }); else emit(code, { t: "left", id: m.id, you: true, kicked: true }, { to: m.id }); }
          }
        }
        break;

      case "start": {
        if (!code) return;
        let seed = crypto.randomInt(1, 2147483647), sector = 1;
        const r = await mutate(code, (d) => {
          if (d.host !== c.pid || d.state !== "lobby") return { err: "x" };
          if (d.members.some((x) => x.id !== d.host && (!x.ready || x.away))) return { err: "NOT EVERYONE IS READY" };
          d.state = "play"; d.seed = seed; d.startedAt = Date.now(); sector = d.sector;
          d.members.forEach((x) => { x.done = null; x.dead = false; x.kills = 0; x.hp = 1; });
        });
        if (r.err) { if (r.err !== "x") send(c, { t: "err", msg: r.err }); return; }
        emit(code, { t: "start", sector, seed });
        break;
      }

      case "done": {
        if (!code) return;
        const result = m.result === "win" ? "win" : "lose", kills = Math.max(0, Math.min(99999, m.k | 0));
        const r = await mutate(code, (d) => {
          const me = d.members.find((x) => x.id === c.pid);
          if (!me || d.state !== "play" || me.done) return { err: "x" };
          me.done = result; me.kills = kills; finishCheck(d);
        });
        if (!r.err) emit(code, { t: "ev", k: "done", id: c.pid, name: c.name, result });
        break;
      }
    }
  }

  // ------------------------------------------------------------ Verbindungen
  function onClose(c) {
    clearTimeout(c.helloT);
    if (!c.pid || conns.get(c.pid) !== c) return;                       // ersetzte Verbindung: nichts zu tun
    conns.delete(c.pid);
    social.onClose(c);
    store.del(pk(c.pid)).catch(() => {});
    const code = c.room; if (!code) return;
    detachLocal(c);
    mutate(code, (d) => { const me = d.members.find((x) => x.id === c.pid); if (!me || conns.has(c.pid)) return { err: "x" }; me.away = Date.now(); })
      .catch((e) => log("away failed", e.message));
    clearTimeout(graces.get(c.pid));
    graces.set(c.pid, setTimeout(() => { graces.delete(c.pid); removeMember(code, c.pid, { onlyIfGone: true }).catch(() => {}); }, o.graceMs + 300));
  }

  function attach(ws) {
    if (closed || conns.size >= o.maxConn) { try { ws.close(1013, "BUSY"); } catch (e) { /* */ } return; }
    const c = { ws, pid: null, token: null, name: "PLAYER", robot: "nova", room: null, alive: true, born: Date.now(), tokens: 80, tokT: Date.now(), hello: false, hp: 1, kills: 0, dead: false, q: Promise.resolve() };
    c.helloT = setTimeout(() => { if (!c.hello) try { ws.close(4002, "HELLO TIMEOUT"); } catch (e) { /* */ } }, o.helloMs);
    ws.on("pong", () => { c.alive = true; });
    ws.on("message", (data, isBinary) => {
      if (isBinary) return;
      const now = Date.now();                                            // Rate-Limit ~80 Nachrichten/s
      c.tokens = Math.min(80, c.tokens + (now - c.tokT) * 0.08); c.tokT = now;
      if (--c.tokens < 0) return;
      let m; try { m = JSON.parse(data.toString("utf8")); } catch (e) { return; }
      if (!m || typeof m !== "object" || Array.isArray(m) || typeof m.t !== "string") return;
      if (m.t === "st") { if (c.hello && c.room) onSt(c, m); return; }  // schneller Weg, ohne Warteschlange
      c.q = c.q.then(() => handle(c, m)).catch((e) => {
        log("handler error", m.t, e.message);
        send(c, { t: "err", msg: e.message === "LOCKED" ? "SERVER BUSY - TRY AGAIN" : "SERVER ERROR" });
      });
    });
    ws.on("close", () => onClose(c));
    ws.on("error", () => onClose(c));
  }

  // ------------------------------------------------------------ Hintergrund: Herzschlag, Praesenz, Aufraeumen
  timers.push(setInterval(() => {                                      // Verbindung pruefen + vor dem Funktions-Limit sauber neu verbinden lassen
    const now = Date.now();
    conns.forEach((c) => {
      if (!c.alive) { try { c.ws.terminate(); } catch (e) { /* */ } return; }
      if (now - c.born > o.maxAgeMs) { try { c.ws.close(4000, "RECYCLE"); } catch (e) { /* */ } return; }
      c.alive = false; try { c.ws.ping(); } catch (e) { /* */ }
    });
  }, o.heartbeatMs));

  timers.push(setInterval(async () => {                                // Praesenz erneuern + Spieler anderer (toter) Instanzen aufraeumen
    try {
      conns.forEach((c) => { if (c.room) touchPresence(c.pid); social.touch(c); });
      for (const code of Array.from(local.keys())) {
        const raw = await store.get(rk(code)); if (!raw) continue;
        const d = JSON.parse(raw), now = Date.now();
        const others = d.members.filter((m) => !conns.has(m.id));
        if (!others.length) continue;
        const pres = await store.mget(others.map((m) => pk(m.id)));
        for (let i = 0; i < others.length; i++) {
          const m = others[i];
          if (pres[i] !== null) continue;
          if (!m.away) await mutate(code, (x) => { const y = x.members.find((z) => z.id === m.id); if (!y || y.away || conns.has(m.id)) return { err: "x" }; y.away = now; });
          else if (now - m.away > o.graceMs) await removeMember(code, m.id, { onlyIfGone: true });
        }
      }
    } catch (e) { log("reaper", e.message); }
  }, o.presenceMs));
  timers.forEach((t) => t.unref && t.unref());

  async function close() {
    closed = true; timers.forEach(clearInterval); graces.forEach(clearTimeout);
    conns.forEach((c) => { try { c.ws.terminate(); } catch (e) { /* */ } });
    await store.close();
  }
  return { attach, close, inst, store, stats: () => ({ inst, conns: conns.size, rooms: local.size }), _conns: conns, _local: local };
}
