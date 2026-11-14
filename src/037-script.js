
/* ===================== Аватарки участников ===================== */
(function(){
  const KEY = "chatstats.avatars.v1";
  let STORE = {};
  try { STORE = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { STORE = {}; }
  (function mergeBaked(){
    const B = window.__BAKED, VER_KEY = "chatstats.avatars.ver.v1"; if (!B || !B.avatars) return;
    let ver = ""; try { ver = localStorage.getItem(VER_KEY) || ""; } catch (e) {}
    if (ver === B.avVer) return;
    STORE = Object.assign({}, STORE, B.avatars);      // новая встроенная версия: её ссылки обновляют сохранённые
    try { localStorage.setItem(KEY, JSON.stringify(STORE)); localStorage.setItem(VER_KEY, B.avVer); } catch (e) {}
  })();
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(STORE)); } catch (e) {} };
  const okUrl = u => /^https?:\/\/\S+$/i.test(u) || /^data:image\/[a-z+.-]+;base64,[a-z0-9+/=]+$/i.test(u);
  const get = pk => { const u = STORE[String(pk)]; return u && okUrl(u) ? u : ""; };
  const inner = (pk, letter) => {
    const u = get(pk), l = `<span class="av-l">${escH(letter)}</span>`;
    return u ? l + `<img class="av-i" src="${escH(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('av-ok')" onerror="this.remove()">` : l;
  };
  const cache = new Map();
  async function dataUri(pk){
    const u = get(pk); if (!u) return null;
    if (u.startsWith("data:")) return u;
    if (cache.has(u)) return cache.get(u);
    let res = null;
    try {
      const r = await fetch(u, {mode:"cors", referrerPolicy:"no-referrer"}); if (!r.ok) throw 0;
      const b = await r.blob(); if (!/^image\//.test(b.type)) throw 0;
      res = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(b); });
    } catch (e) {
      try {
        res = await new Promise((ok, no) => { const im = new Image(); im.crossOrigin = "anonymous"; im.referrerPolicy = "no-referrer"; im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); ok(c.toDataURL("image/png")); } catch (err) { no(err); } }; im.onerror = no; im.src = u; });
      } catch (e2) { res = null; }
    }
    cache.set(u, res); return res;
  }
  window.AVATAR = {get, inner, dataUri};

  const active = id => $(id) && $(id).classList.contains("active");
  function repaint(){
    try {
      if (active("tab-profile") && typeof renderProfile === "function") renderProfile();
      if (active("tab-compare") && typeof renderCompare === "function") renderCompare();
      if (active("tab-achievements") && window.renderAchievements) window.renderAchievements();
    } catch (e) {}
  }
  const color = pk => { try { return getStyle("u", pk).c[0]; } catch (e) { return ""; } };
  function row(pk){
    const u = STORE[pk] || "", n = NAMES[pk];
    return `<tr data-av-pk="${escH(pk)}" class="${u ? "av-custom" : ""}"><td><span class="av-prev" style="--c:${color(pk)}">${inner(pk, n.slice(0, 1).toUpperCase())}</span></td><td style="text-align:left">${escH(n)}</td><td><input type="url" data-av-url value="${escH(u)}" placeholder="https://…" spellcheck="false" autocomplete="off"></td><td>${u ? `<button class="mini" type="button" data-av-clear="${escH(pk)}">✕</button>` : ""}</td></tr>`;
  }
  function render(){
    const body = $("av-body"); if (!body) return;
    const pks = Object.keys(NAMES).sort((a, b) => NAMES[a].localeCompare(NAMES[b], "ru"));
    body.innerHTML = pks.map(row).join("");
    const n = pks.filter(pk => get(pk)).length; $("av-msg").textContent = `Аватарок: ${n} из ${pks.length}`;
  }
  function setOne(pk, v){
    v = v.trim();
    if (!v) delete STORE[pk];
    else if (!okUrl(v)) { $("av-msg").textContent = "Нужна ссылка вида https://… на картинку."; return false; }
    else STORE[pk] = v;
    persist(); return true;
  }
  $("av-body")?.addEventListener("change", e => {
    const tr = e.target.closest("tr[data-av-pk]"); if (!tr) return;
    const pk = tr.dataset.avPk; if (!setOne(pk, e.target.value)) { e.target.value = STORE[pk] || ""; return; }
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (err) {}
    render(); repaint();
  });
  $("av-body")?.addEventListener("click", e => { const b = e.target.closest("[data-av-clear]"); if (!b) return; delete STORE[b.dataset.avClear]; persist(); render(); repaint(); });
  $("av-bulk-toggle")?.addEventListener("click", () => { const w = $("av-bulk-wrap"); w.hidden = !w.hidden; });
  $("av-bulk-apply")?.addEventListener("click", () => {
    const lines = $("av-bulk").value.split(/\n/).map(x => x.trim()).filter(Boolean), bad = [];
    let ok = 0; const byName = {}; Object.keys(NAMES).forEach(pk => byName[String(NAMES[pk]).toLowerCase().replace(/ё/g, "е")] = pk);
    lines.forEach(ln => {
      const m = ln.match(/^(.*?)\s*[\s=:]\s*((?:https?:\/\/|data:image\/)\S+)$/i); if (!m) { bad.push(ln.slice(0, 24)); return; }
      const key = m[1].trim().toLowerCase().replace(/ё/g, "е"), pk = NAMES[m[1].trim()] ? m[1].trim() : byName[key];
      if (!pk || !okUrl(m[2])) { bad.push(m[1] || ln.slice(0, 24)); return; }
      STORE[pk] = m[2]; ok++;
    });
    persist(); render(); repaint();
    $("av-msg").textContent = `Применено: ${ok}` + (bad.length ? ` · не распознано: ${bad.join(", ")}` : ""); if (!bad.length) $("av-bulk").value = "";
  });
  $("av-reset-all")?.addEventListener("click", () => { if (!Object.keys(STORE).length) { $("av-msg").textContent = "Аватарок нет."; return; } if (!confirm("Убрать все аватарки?")) return; STORE = {}; persist(); render(); repaint(); });
  const baseRS = renderSettings; renderSettings = function(){ baseRS.apply(this, arguments); render(); };
  render();
  window.__av = {STORE:() => STORE, render};
})();
