/* CYBER BOTS - desert-ui.js
   Menue der Kampagne DESERT PLANET: Sektorauswahl, Missionsuebersicht, Relikte, Kampagnenfortschritt. */
(function (CB) {
  "use strict";
  var sel = 0;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  function defaultSel() {
    var ids = CB.DESERT.ids, d = CB.Save.data;
    for (var i = 0; i < ids.length; i++) if (CB.Save.isUnlocked(ids[i]) && !d.progress.cleared[ids[i]]) return ids[i];
    return ids[0];
  }

  function render() {
    var d = CB.Save.data, D = CB.Desert, ids = CB.DESERT.ids;
    if (!sel || !CB.Save.isUnlocked(sel)) sel = defaultSel();
    var cleared = ids.filter(function (id) { return d.progress.cleared[id]; }).length, relics = 0;
    ids.forEach(function (id) { relics += D.relicCount(id); });
    $("cpSummary").innerHTML = '<div><span>SECTORS</span><b>' + cleared + ' / 5</b></div><div><span>MISSIONS</span><b>' + D.totalMissions() + ' / 15</b></div><div><span>RELICS</span><b>' + relics + ' / 15</b></div>' +
      '<div class="cp-bar"><i style="width:' + Math.round((cleared / 5) * 100) + '%"></i></div>' +
      (d.desert.campaignDone ? '<div class="newbest">&#9733; CAMPAIGN COMPLETE</div>' : '<div class="cp-hint">Complete all 15 missions for a ' + fmt(CB.DESERT.campaignReward) + ' credit bonus.</div>');
    var list = $("cpList"); list.textContent = "";
    ids.forEach(function (id) {
      var s = CB.sectorById(id), locked = !CB.Save.isUnlocked(id), b = document.createElement("button");
      b.className = "sector cp-s" + (locked ? " locked" : "") + (id === sel ? " sel" : ""); b.setAttribute("data-id", id);
      b.innerHTML = '<span class="num">' + esc(s.label) + '</span><span><b>' + esc(s.name) + '</b><small>' + (locked ? "Clear the previous sector to unlock." : esc(s.info)) + '</small></span>' +
        '<span class="best">' + (locked ? "LOCKED" : (d.progress.cleared[id] ? '<span class="tag">CLEARED</span><br>' : "") + D.progress(id) + "/3 MISSIONS<br>" + D.relicCount(id) + "/3 RELICS") + "</span>";
      b.onclick = function () { if (locked) { CB.Audio.play("deny"); CB.UI.toast("CLEAR THE PREVIOUS SECTOR FIRST", "bad"); return; } CB.Audio.play("click"); sel = id; render(); };
      list.appendChild(b);
    });
    var s2 = CB.sectorById(sel), rows = "", i;
    rows += '<h3>' + esc(s2.area) + ' - ' + esc(s2.name) + '</h3><small>' + esc(s2.info) + '</small><h3>MISSIONS</h3><ul class="cp-list">';
    CB.DESERT.missions[sel].forEach(function (m, k) { var ok = D.missionDone(sel, k); rows += '<li class="' + (ok ? "ok" : "") + '"><i>' + (ok ? "&#10003;" : "&#9675;") + '</i> ' + esc(m.text) + '<b>+' + fmt(m.reward) + '</b></li>'; });
    rows += '</ul><h3>RELICS</h3><ul class="cp-list">';
    var got = d.desert.relics[sel] | 0;
    for (i = 0; i < 3; i++) rows += '<li class="' + ((got >> i) & 1 ? "ok" : "") + '"><i>' + ((got >> i) & 1 ? "&#9670;" : "&#9671;") + '</i> ' + ((got >> i) & 1 ? esc(CB.DESERT.relics[sel][i]) : "???") + '</li>';
    rows += '</ul>' + (d.desert.secrets[sel] ? '<small class="tag">&#10003; SECRET ROOM FOUND</small>' : '<small>Hidden areas: one secret room.</small>');
    if (d.progress.best[sel]) rows += '<small>HI-SCORE ' + fmt(d.progress.best[sel]) + '</small>';
    $("cpDetail").innerHTML = rows;
    $("cpLaunch").textContent = "LAUNCH " + s2.label + " - " + s2.name;
  }

  function init() { $("cpLaunch").onclick = function () { if (!CB.Save.isUnlocked(sel)) return; CB.Audio.play("buy"); CB.UI.launch(sel); }; }
  CB.DesertUI = { render: render };
  init();
})(window.CB);
