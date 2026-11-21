/* CYBER BOTS - skins-ui.js
   Menue SKINS: Roboter- und Waffen-Skins ansehen, kaufen und ausruesten (rein kosmetisch). */
(function (CB) {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  function card(kind, sk, previewCanvasFn) {
    var d = CB.Save.data, K = CB.Skins, owned = sk ? K.owned(kind, sk.id) : true;
    var equipped = (d.skins[kind] || "") === (sk ? sk.id : "") && owned;
    var c = document.createElement("div");
    c.className = "card" + (equipped ? " sel" : "") + (owned ? "" : " locked");
    var cond = !sk ? "Original look" : owned ? (sk.cleared ? "Unlocked: " + CB.sectorById(sk.cleared).name + " cleared" : "Owned")
      : sk.cleared ? "Clear " + CB.sectorById(sk.cleared).name + " to unlock" : fmt(sk.price) + " credits";
    c.innerHTML = '<div class="stage-prev"><canvas class="prev"></canvas></div><h3>' + esc(sk ? sk.name : "DEFAULT") + "</h3><p>" + esc(cond) + "</p>";
    previewCanvasFn(c.querySelector("canvas"), sk ? sk.id : "");
    var b = document.createElement("button");
    if (equipped) { b.className = "btn small equipped"; b.textContent = "EQUIPPED"; }
    else if (owned) { b.className = "btn small"; b.textContent = "EQUIP"; b.onclick = function () { K.equip(kind, sk ? sk.id : ""); CB.Audio.play("buy"); render(); }; }
    else if (sk.price != null) {
      b.className = "btn small buy"; b.textContent = "BUY  " + fmt(sk.price) + " CR";
      b.onclick = function () {
        if (K.buy(kind, sk.id)) { CB.Audio.play("buy"); CB.UI.toast(sk.name + " UNLOCKED!", "good"); render(); CB.UI.refreshCredits(); }
        else { CB.Audio.play("deny"); CB.UI.toast("NOT ENOUGH CREDITS (" + fmt(sk.price - d.credits) + " MORE NEEDED)", "bad"); }
      };
    } else { b.className = "btn small"; b.textContent = "LOCKED"; b.disabled = true; }
    c.appendChild(b);
    return c;
  }

  function render() {
    var d = CB.Save.data, ch = CB.byId(CB.ROBOTS, d.selRobot), w = CB.byId(CB.WEAPONS, d.selWeapon);
    $("skCharName").textContent = "(" + ch.name + ")"; $("skWeapName").textContent = "(" + w.name + ")";
    var rb = $("skinRobotCards"), wb = $("skinWeaponCards");
    rb.textContent = ""; wb.textContent = "";
    var rfn = function (cv, id) { CB.Sprites.drawTo(cv, CB.Skins.robotSprite(ch.id, id).frames[0], 4); };
    var wfn = function (cv, id) { CB.Sprites.drawTo(cv, CB.Skins.weaponSprite(w.id, id), 6); };
    rb.appendChild(card("robot", null, rfn)); CB.SKINS.robot.forEach(function (s) { rb.appendChild(card("robot", s, rfn)); });
    wb.appendChild(card("weapon", null, wfn)); CB.SKINS.weapon.forEach(function (s) { wb.appendChild(card("weapon", s, wfn)); });
    CB.UI.refreshCredits();
  }

  CB.SkinsUI = { render: render };
})(window.CB);
