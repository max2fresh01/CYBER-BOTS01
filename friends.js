/* CYBER BOTS - friends.js
   Update 2.0 Phase 3: Freundesliste, Anfragen, Online-Status, Einladungen, privater Chat und Raum-Textchat (Client).
   Identitaet: zufaellige FREUNDES-ID + geheimer Schluessel im localStorage (keine E-Mail, kein Konto). Chat-Verlaeufe liegen nur im Speicher
   dieser Seite und werden nie gespeichert. Alle Regeln (nur Freunde, Limits) prueft der Server (lib/social.js). */
(function (CB) {
  "use strict";
  var Net = CB.Net, KEY = "cyberbots-fid", CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }   // nur textContent: Chat/Namen koennen kein HTML einschleusen
  function fmtId(u) { return u ? u.slice(0, 4) + "-" + u.slice(4) : ""; }
  function rnd(n, chars) { var a = new Uint8Array(n), s = "", i; (window.crypto || window.msCrypto).getRandomValues(a); for (i = 0; i < n; i++) s += chars.charAt(a[i] % chars.length); return s; }

  var F = {
    id: null, S: null, err: "", sel: null, priv: {}, unread: {}, room: [], mute: {}, chatOn: true, banner: null, open: false
  };

  function loadId() {
    try { var x = JSON.parse(localStorage.getItem(KEY)); if (x && /^[A-HJ-NP-Z2-9]{8}$/.test(x.uid) && /^[0-9a-f]{24}$/.test(x.key)) return x; } catch (e) { /* */ }
    var n = { uid: rnd(8, CH), key: rnd(24, "0123456789abcdef") };
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch (e) { /* */ }
    return n;
  }

  // ---------- Verbindung ----------
  Net.onWelcome = function () { F.id = F.id || loadId(); Net.send({ t: "fauth", uid: F.id.uid, key: F.id.key, name: Net.name }); if (CB.Voice) CB.Voice.afterReconnect(); };

  Net.ext = function (m) {
    switch (m.t) {
      case "fstate": F.S = m; F.err = ""; if (CB.Voice) CB.Voice.resync(); if (F.sel && !m.friends.some(function (f) { return f.u === F.sel; })) F.sel = null; break;
      case "ferr":
        F.err = m.msg || "ERROR";
        if (m.fatal) { F.S = null; F.err = "FRIEND ID IN USE. RESET IT BELOW."; }
        break;
      case "freq": note(m.name + (m.now ? " IS NOW YOUR FRIEND" : " SENT A FRIEND REQUEST"), "good"); break;
      case "fpres": if (F.S) F.S.friends.forEach(function (f) { if (f.u === m.u) f.on = m.on; }); if (m.on) note(m.name + " IS ONLINE"); break;
      case "finvite": showInvite(m); break;
      case "fmsg": {
        if (m.ok === false) { addPriv(m.u, "", "NOT DELIVERED - FRIEND IS OFFLINE", true); break; }
        var other = m.u;
        if (m.mine) addPriv(other, "YOU", m.text, false);
        else if (m.text) { addPriv(other, m.name || "FRIEND", m.text, false); if (F.sel !== other || !F.open) { F.unread[other] = (F.unread[other] || 0) + 1; note(m.name + ": " + m.text.slice(0, 24)); } }
        break;
      }
      case "fok": if (m.what === "invite") note("INVITE SENT", "good"); break;
      case "chat": roomChat(m); break;
      case "vpeers": case "vsig": case "vleft": case "verr": if (CB.Voice) CB.Voice.onMsg(m); break;
    }
    refresh();
  };

  function note(t, kind) { if (CB.UI && CB.UI.toast) CB.UI.toast(t, kind); }
  function addPriv(u, who, text, sys) {
    var l = F.priv[u] || (F.priv[u] = []);
    l.push({ who: who, text: text, sys: !!sys }); if (l.length > 40) l.shift();
  }
  function nameOf(u) { var f = F.S && F.S.friends.filter(function (x) { return x.u === u; })[0]; return f ? f.name : "FRIEND"; }

  // ---------- Raum-Chat ----------
  function roomChat(m) {
    if (!F.chatOn || F.mute[m.id]) return;
    F.room.push({ id: m.id, name: m.name, text: m.text, t: performance.now(), me: m.id === Net.id });
    if (F.room.length > 50) F.room.shift();
    renderOverlay();
  }
  F.sendRoom = function (text) { text = String(text || "").trim(); if (text) Net.send({ t: "chat", text: text }); };
  F.toggleMute = function (pid) { F.mute[pid] = !F.mute[pid]; if (CB.Voice) CB.Voice.applyMute(pid); refresh(); };
  Net.onRoomReset = function () { F.room = []; renderOverlay(); };

  // ---------- Aktionen ----------
  F.add = function (code) { code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (code.length !== 8) { F.err = "FRIEND ID HAS 8 CHARACTERS"; refresh(); return; } F.err = ""; Net.send({ t: "fadd", code: code }); };
  F.accept = function (u) { Net.send({ t: "facc", u: u }); };
  F.decline = function (u) { Net.send({ t: "fdec", u: u }); };
  F.remove = function (u) { Net.send({ t: "frem", u: u }); };
  F.invite = function (u) { Net.send({ t: "finv", u: u }); };
  F.hide = function (v) { Net.send({ t: "fhide", v: v ? 1 : 0 }); };
  F.sendPrivate = function (u, text) { text = String(text || "").trim(); if (text) Net.send({ t: "fmsg", u: u, text: text }); };
  F.resetId = function () { try { localStorage.removeItem(KEY); } catch (e) { /* */ } F.id = loadId(); if (Net.connected) Net.onWelcome(); };

  // ---------- Einladung (Banner) ----------
  function showInvite(m) {
    var b = $("frBanner"); if (!b) return;
    b.textContent = "";
    b.appendChild(el("span", null, m.name + " INVITES YOU  [" + m.code + "]"));
    var j = el("button", "btn small", "JOIN"), x = el("button", "btn small", "IGNORE");
    j.onclick = function () { b.hidden = true; CB.Audio.play("click"); if (Net.room) Net.leaveRoom(); Net.joinRoom(m.code); if (!Net.active) CB.UI.show("online"); };
    x.onclick = function () { b.hidden = true; };
    b.appendChild(j); b.appendChild(x); b.hidden = false;
    clearTimeout(F.banner); F.banner = setTimeout(function () { b.hidden = true; }, 20000);
    if (CB.Audio) CB.Audio.play("pickup");
  }

  // ---------- Oberflaeche (Online-Bildschirm) ----------
  function logBox(box, lines) {
    box.textContent = "";
    lines.forEach(function (l) { var d = el("div", "ch-l" + (l.sys ? " sys" : "")); if (l.who) d.appendChild(el("b", null, l.who + ": ")); d.appendChild(document.createTextNode(l.text)); box.appendChild(d); });
    box.scrollTop = box.scrollHeight;
  }

  function refresh() {
    var root = $("onSocial"); if (!root) return;
    F.open = $("scr-online").classList.contains("open");
    root.hidden = !Net.connected;
    if (!Net.connected) return;
    var id = F.id || loadId();
    $("frId").textContent = fmtId(id.uid);
    $("frErr").textContent = F.err || "";
    $("frHide").checked = !!(F.S && F.S.hide);
    var S = F.S, req = $("frReq"), list = $("frList");
    req.textContent = ""; list.textContent = "";
    if (!S) { list.appendChild(el("div", "on-item", F.err ? "-" : "LOADING...")); return; }
    S.inR.forEach(function (r) {
      var row = el("div", "on-item"), a = el("button", "btn small", "ACCEPT"), d = el("button", "btn small", "DECLINE"), right = el("span");
      a.onclick = function () { CB.Audio.play("buy"); F.accept(r.u); }; d.onclick = function () { F.decline(r.u); };
      right.appendChild(a); right.appendChild(document.createTextNode(" ")); right.appendChild(d);
      row.appendChild(el("span", null, "REQUEST: " + r.name + "  [" + fmtId(r.u) + "]")); row.appendChild(right); req.appendChild(row);
    });
    S.outR.forEach(function (r) {
      var row = el("div", "on-item"), d = el("button", "btn small", "CANCEL"); d.onclick = function () { F.decline(r.u); };
      row.appendChild(el("span", "dim", "SENT TO " + r.name + "  [" + fmtId(r.u) + "]")); row.appendChild(d); req.appendChild(row);
    });
    if (!S.friends.length) list.appendChild(el("div", "on-item", "NO FRIENDS YET - SHARE YOUR ID"));
    S.friends.slice().sort(function (a, b) { return (b.on ? 1 : 0) - (a.on ? 1 : 0); }).forEach(function (f) {
      var row = el("div", "on-item" + (F.sel === f.u ? " sel" : "")), left = el("span", f.on ? "fr-on" : "fr-off", (f.on ? "● " : "○ ") + f.name), right = el("span");
      var unread = F.unread[f.u] ? " (" + F.unread[f.u] + ")" : "";
      var c = el("button", "btn small", "CHAT" + unread); c.onclick = function () { F.sel = f.u; F.unread[f.u] = 0; refresh(); var i = $("frMsg"); if (i) i.focus(); };
      right.appendChild(c);
      if (Net.room && f.on) { var iv = el("button", "btn small", "INVITE"); iv.onclick = function () { CB.Audio.play("click"); F.invite(f.u); }; right.appendChild(document.createTextNode(" ")); right.appendChild(iv); }
      var rm = el("button", "btn small", "X"); rm.title = "Remove friend"; rm.setAttribute("aria-label", "Remove " + f.name);
      rm.onclick = function () { if (window.confirm("Remove " + f.name + " from your friends?")) F.remove(f.u); };
      right.appendChild(document.createTextNode(" ")); right.appendChild(rm);
      row.appendChild(left); row.appendChild(right); list.appendChild(row);
    });
    var pc = $("frChat");
    pc.hidden = !F.sel;
    if (F.sel) { $("frChatName").textContent = "CHAT WITH " + nameOf(F.sel); logBox($("frLog"), F.priv[F.sel] || []); }
    // Raum-Chat in der Lobby
    var ov = $("onVoice"); if (ov) ov.hidden = !Net.room;
    var rc = $("onChat"); if (rc) { rc.hidden = !Net.room; if (Net.room) logBox($("onChatLog"), F.room.map(function (l) { return { who: l.name, text: l.text }; })); }
    if (CB.Voice) CB.Voice.render();
    var co = $("onChatOn"); if (co) co.checked = F.chatOn;
  }

  // ---------- In-Game-Overlay: letzte Nachrichten + Eingabe (Enter oeffnet) ----------
  function renderOverlay() {
    var box = $("chatOv"); if (!box) return;
    var now = performance.now(), recent = F.room.filter(function (l) { return now - l.t < 9000; }).slice(-5), log = $("chatLog");
    log.textContent = "";
    recent.forEach(function (l) { var d = el("div", "ch-l"); d.appendChild(el("b", null, l.name + ": ")); d.appendChild(document.createTextNode(l.text)); log.appendChild(d); });
    box.hidden = !(Net.active && (recent.length || F.typing));
    if (recent.length && !F.fadeT) F.fadeT = setTimeout(function () { F.fadeT = null; renderOverlay(); }, 1000);
    refreshRoom();
  }
  function refreshRoom() { var rc = $("onChat"); if (rc && !rc.hidden) logBox($("onChatLog"), F.room.map(function (l) { return { who: l.name, text: l.text }; })); }

  function openTyping() {
    if (!Net.active || !Net.connected || !Net.room || F.typing) return;
    var i = $("chatIn"); F.typing = true; $("chatOv").hidden = false; i.hidden = false; i.value = "";
    if (CB.Input) { ["left", "right", "up", "down", "jump", "fire", "drop"].forEach(function (k) { CB.Input[k] = false; }); }
    i.focus();
  }
  function closeTyping() { var i = $("chatIn"); F.typing = false; i.hidden = true; i.blur(); renderOverlay(); }

  function init() {
    $("frAdd").onclick = function () { CB.Audio.play("click"); F.add($("frCode").value); $("frCode").value = ""; };
    $("frCode").addEventListener("keydown", function (e) { if (e.key === "Enter") { F.add($("frCode").value); $("frCode").value = ""; } });
    $("frCopy").onclick = function () { var t = (F.id || loadId()).uid; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { note("FRIEND ID COPIED", "good"); }, function () { note(fmtId(t)); }); else note(fmtId(t)); };
    $("frHide").onchange = function () { F.hide($("frHide").checked); };
    $("frReset").onclick = function () { if (window.confirm("Create a NEW friend ID? Your current friends list will no longer be linked to this browser.")) { F.resetId(); } };
    $("frClose").onclick = function () { F.sel = null; refresh(); };
    function sendP() { var i = $("frMsg"); if (F.sel && i.value.trim()) { F.sendPrivate(F.sel, i.value); i.value = ""; } }
    $("frSend").onclick = sendP; $("frMsg").addEventListener("keydown", function (e) { if (e.key === "Enter") sendP(); });
    function sendR() { var i = $("onChatIn"); if (i.value.trim()) { F.sendRoom(i.value); i.value = ""; } }
    $("onChatSend").onclick = sendR; $("onChatIn").addEventListener("keydown", function (e) { if (e.key === "Enter") sendR(); });
    $("onChatOn").onchange = function () { F.chatOn = $("onChatOn").checked; if (!F.chatOn) { F.room = []; renderOverlay(); } refresh(); };
    $("chatIn").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { var v = $("chatIn").value; if (v.trim()) F.sendRoom(v); closeTyping(); }
      else if (e.key === "Escape") { e.stopPropagation(); closeTyping(); }
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !F.typing && Net.active && CB.Game && CB.Game.state === "playing" && !(e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) { e.preventDefault(); openTyping(); }
    });
    var prev = Net.onChange;
    Net.onChange = function () { if (prev) prev(); refresh(); };
  }

  CB.Friends = F; F.refresh = refresh;
  init();
})(window.CB);
