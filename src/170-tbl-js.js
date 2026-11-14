
(function(){
  "use strict";
  const T = window.__tx || (s => s);
  const on = id => !!(window.EXP && typeof window.EXP.on === "function" && window.EXP.on(id));
  const NS = "http://www.w3.org/2000/svg";
  const PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 15v6"/></svg>';
  const GRIP_SVG = '<svg viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>';
  const NATIVE = "th[data-k],[data-chat-sort],[data-re-sort],[data-dm-sort]";
  const SKIP_IDS = new Set(["dm-table", "vk-map-table", "tab-usermap-table-6"]);
  const lang = (window.__lang && window.__lang.get && window.__lang.get()) || "ru";
  const collator = new Intl.Collator({ru:"ru", uk:"uk", be:"be", kk:"kk", fr:"fr", pl:"pl", en:"en"}[lang] || "ru", {numeric:true, sensitivity:"base"});
  /* Состояние сортировки хранится по ключу таблицы, а не по элементу: таблицу можно перерисовать — сортировка останется */
  const stMap = new Map();
  const st = {get: t => stMap.get(tableKeySafe(t)), set: (t, v) => stMap.set(tableKeySafe(t), v), delete: t => stMap.delete(tableKeySafe(t))};
  const tableKeySafe = t => { try { return t.id || t.dataset.resizeKey || columnTableKey(t); } catch (e) { return t.id || "t"; } };
  let uid = 0, busy = false;

  /* ---------- общее ---------- */
  const tableKey = t => { try { return t.dataset.resizeKey || t.id || columnTableKey(t); } catch (e) { return t.id || "t"; } };
  const labelRow = t => t.tHead && t.tHead.rows.length ? t.tHead.rows[t.tHead.rows.length - 1] : null;
  const bodyRows = t => t.tBodies.length ? [...t.tBodies[0].rows] : [];
  function eligible(t){
    if (!t || t.closest(".sticky-table-head,.table-image-measure,[data-no-tools]") || SKIP_IDS.has(t.id)) return false;
    const lr = labelRow(t); if (!lr || lr.cells.length < 2) return false;
    if ([...lr.cells].some(c => c.colSpan > 1 || c.rowSpan > 1)) return false;
    const rows = bodyRows(t); if (rows.length < 2) return false;
    const n = lr.cells.length;
    if (rows.some(r => r.cells.length !== n || [...r.cells].some(c => c.colSpan > 1))) return false;
    if (t.tBodies[0].querySelector("input,select,textarea")) return false;
    return true;
  }
  const hasNative = t => !!(t.tHead && t.tHead.querySelector(NATIVE));
  const clean = th => { const c = th.cloneNode(true); c.querySelectorAll(".column-resize-handle,.tc-grip,[data-no-export]").forEach(x => x.remove()); return (c.textContent || "").replace(/\s+/g, " ").trim(); };
  const rowKey = r => { for (const c of r.cells) { const cl = c.cloneNode(true); cl.querySelectorAll("[data-no-export]").forEach(x => x.remove()); const s = (cl.textContent || "").replace(/\s+/g, " ").trim(); if (s && !/^[\d\s.,%+\-−#№]+$/.test(s)) return s.slice(0, 80); } return ""; };

  /* ---------- значения для сортировки ---------- */
  const DATE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/;
  /* «Октябрь 2026», «окт 2025» — сортируются по времени, а не по алфавиту (на всех языках сайта) */
  const MONTHS = new Map();
  try {
    ["ru", "en", "uk", "be", "kk", "fr", "pl"].forEach(l => ["long", "short"].forEach(w => { const f = new Intl.DateTimeFormat(l, {month: w, timeZone: "UTC"});
      for (let m = 0; m < 12; m++) { const n = f.format(new Date(Date.UTC(2024, m, 15))).toLowerCase().replace(/\.$/, ""); if (!MONTHS.has(n)) MONTHS.set(n, m); } }));
    "январь февраль март апрель май июнь июль август сентябрь октябрь ноябрь декабрь".split(" ").forEach((n, m) => { MONTHS.set(n, m); MONTHS.set(n.slice(0, 3), m); });
  } catch (e) {}
  const MONTH_YEAR = /^([^\d\s.,]+)\.?\s*(\d{4})$/;
  function cellVal(td){
    if (td.dataset && td.dataset.sort !== undefined) { const n = parseFloat(td.dataset.sort); return Number.isFinite(n) ? n : String(td.dataset.sort); }
    const c = td.cloneNode(true); c.querySelectorAll("[data-no-export]").forEach(x => x.remove());
    const raw = (c.textContent || "").replace(/[  \s]+/g, " ").trim();
    if (!raw || raw === "—" || raw === "–" || raw === "-") return null;
    const d = raw.match(DATE); if (d) return Date.UTC(+d[3], +d[2] - 1, +d[1]);
    const my = raw.match(MONTH_YEAR); if (my && MONTHS.has(my[1].toLowerCase())) return +my[2] * 12 + MONTHS.get(my[1].toLowerCase());
    const s = raw.replace(/\s/g, "").replace(/[−–]/g, "-").replace(/^\+/, "");
    const m = s.match(/^-?\d+(?:[.,]\d+)?/);
    if (m && (m[0].length >= s.length * 0.35 || /^-?\d+(?:[.,]\d+)?(%|×|x|км|дн|д\.|ч|мес|лет|г\.)/i.test(s))) return parseFloat(m[0].replace(",", "."));
    return raw;
  }
  function sortedRows(t){
    const rows = bodyRows(t), s = st.get(t), pins = on("pinrows") ? pinSet(t) : null;
    const orig = r => +r.dataset.gsO || 0;
    const isPin = r => !!(pins && pins.has(rowKey(r)));
    let cmp = (a, b) => orig(a) - orig(b);
    if (s) {
      const vals = new Map(rows.map(r => [r, cellVal(r.cells[s.i])]));
      const nums = [...vals.values()].filter(v => typeof v === "number").length, filled = [...vals.values()].filter(v => v !== null).length;
      const numeric = filled > 0 && nums / filled >= 0.7, k = s.dir === "asc" ? 1 : -1;
      cmp = (a, b) => {
        let x = vals.get(a), y = vals.get(b);
        const ex = numeric ? typeof x !== "number" : x === null, ey = numeric ? typeof y !== "number" : y === null;
        if (ex || ey) return ex && ey ? orig(a) - orig(b) : ex ? 1 : -1;
        const r = numeric ? x - y : collator.compare(String(x), String(y));
        return r ? r * k : orig(a) - orig(b);
      };
    }
    return rows.sort((a, b) => (isPin(b) - isPin(a)) || cmp(a, b));
  }
  function render(t){
    const body = t.tBodies[0], rows = sortedRows(t);
    const pins = on("pinrows") ? pinSet(t) : null;
    rows.forEach(r => { body.appendChild(r); r.classList.toggle("tp-pinned", !!(pins && pins.has(rowKey(r)))); });
    const s = st.get(t);
    [...labelRow(t).cells].forEach((th, i) => {
      if (!th.hasAttribute("data-gs")) return;
      const d = s && s.i === i ? s.dir : "";
      if ((th.getAttribute("data-gs-dir") || "") !== d) d ? th.setAttribute("data-gs-dir", d) : th.removeAttribute("data-gs-dir");
    });
  }

  /* ---------- закреплённые строки ---------- */
  const PIN_KEY = "chatstats.pinrows.v1";
  let pinStore = {}; try { pinStore = JSON.parse(localStorage.getItem(PIN_KEY) || "{}") || {}; } catch (e) {}
  const pinSet = t => new Set(pinStore[tableKey(t)] || []);
  function togglePin(t, row){
    const k = tableKey(t), key = rowKey(row), a = pinStore[k] || [], i = a.indexOf(key);
    if (i >= 0) a.splice(i, 1); else a.push(key);
    if (a.length) pinStore[k] = a; else delete pinStore[k];
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pinStore)); } catch (e) {}
    busy = true; render(t); busy = false;
  }
  function pinButtons(t){
    const pinsOn = on("pinrows");
    bodyRows(t).forEach(r => {
      const c = r.cells[0], b = c.querySelector(":scope > .tp-pin");
      if (!pinsOn) { if (b) b.remove(); return; }
      if (b) return;
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "tp-pin"; btn.dataset.noExport = "true"; btn.dataset.noIcons = "true";
      btn.title = T("Закрепить строку наверху"); btn.setAttribute("aria-label", btn.title); btn.innerHTML = PIN_SVG;
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      c.appendChild(btn);
    });
  }

  /* ---------- порядок столбцов ---------- */
  const COL_KEY = "chatstats.colorder.v1";
  let colStore = {}; try { colStore = JSON.parse(localStorage.getItem(COL_KEY) || "{}") || {}; } catch (e) {}
  const saveCols = () => { try { localStorage.setItem(COL_KEY, JSON.stringify(colStore)); } catch (e) {} };
  const labels = t => [...labelRow(t).cells].map(clean);
  function moveCol(t, from, to, widthsToo){
    if (from === to) return;
    [...t.rows].forEach(r => {
      if (r.cells.length <= Math.max(from, to)) return;
      const c = r.cells[from], ref = r.cells[to];
      from < to ? ref.after(c) : ref.before(c);
    });
    if (widthsToo) {
      const g = t.querySelector(":scope > colgroup[data-user-resize]");
      if (g && g.children.length > Math.max(from, to)) { const c = g.children[from], ref = g.children[to]; from < to ? ref.after(c) : ref.before(c); }
      try {
        const w = [...(g ? g.children : [])].map(c => parseFloat(c.style.width)).filter(Number.isFinite);
        if (w.length === labelRow(t).cells.length) saveColumnWidths(t, w);
      } catch (e) {}
    }
  }
  function applyOrder(t, target, widthsToo){
    const cur = labels(t);
    if (new Set(cur).size !== cur.length || target.length !== cur.length || [...target].sort().join("\u0001") !== [...cur].sort().join("\u0001")) return false;
    for (let i = 0; i < target.length; i++) { const j = labels(t).indexOf(target[i]); if (j !== i) moveCol(t, j, i, widthsToo); }
    return true;
  }
  function restoreOrder(t){
    const rec = colStore[tableKey(t)]; if (!rec) return;
    if (labels(t).join("\u0001") === rec.cur.join("\u0001")) return;
    const lr = labels(t);
    if (lr.join("\u0001") === rec.orig.join("\u0001") || [...lr].sort().join() === [...rec.orig].sort().join()) applyOrder(t, rec.cur, false);
  }
  function gripTable(t){
    const lr = labelRow(t), colOn = on("colmove") && t.tHead.rows.length === 1;
    [...lr.cells].forEach(th => {
      const g = th.querySelector(":scope > .tc-grip");
      if (!colOn) { if (g) g.remove(); th.classList.remove("tc-has-grip"); return; }
      if (g) return;
      const el = document.createElement("span");
      el.className = "tc-grip"; el.dataset.noExport = "true"; el.dataset.noIcons = "true";
      el.title = T("Перетащить столбец (двойной клик — вернуть порядок)"); el.innerHTML = GRIP_SVG;
      th.classList.add("tc-has-grip"); th.prepend(el);
    });
  }
  let drag = null, justDragged = 0;
  document.addEventListener("pointerdown", e => {
    const g = e.target.closest && e.target.closest(".tc-grip"); if (!g || e.button) return;
    const th = g.closest("th"), t = th.closest("table"); if (!t) return;
    drag = {t, th, from: th.cellIndex, over: null, id: e.pointerId, x: e.clientX, moved: false};
    try { g.setPointerCapture(e.pointerId); } catch (x) {}
    e.preventDefault();
  });
  document.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.th.classList.add("tc-drag"); document.body.classList.add("tc-dragging"); }
    const el = document.elementFromPoint(e.clientX, e.clientY), th = el && el.closest && el.closest("th");
    const ok = th && th.closest("table") === drag.t && th.parentElement === drag.th.parentElement ? th : null;
    if (drag.over && drag.over !== ok) drag.over.classList.remove("tc-over");
    drag.over = ok; if (ok && ok !== drag.th) ok.classList.add("tc-over");
  });
  function endDrag(e, cancel){
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    d.th.classList.remove("tc-drag"); document.body.classList.remove("tc-dragging");
    if (d.over) d.over.classList.remove("tc-over");
    if (!d.moved) return;
    justDragged = Date.now();
    if (cancel || !d.over || d.over === d.th) return;
    const before = labels(d.t), key = tableKey(d.t);
    busy = true;
    moveCol(d.t, d.from, d.over.cellIndex, true);
    const rec = colStore[key] || {orig: before, cur: before};
    rec.cur = labels(d.t); colStore[key] = rec; saveCols();
    st.delete(d.t); render(d.t);
    busy = false;
    try { window.dispatchEvent(new Event("resize")); } catch (x) {}
  }
  document.addEventListener("pointerup", e => endDrag(e, false));
  document.addEventListener("pointercancel", e => endDrag(e, true));
  document.addEventListener("dblclick", e => {
    const g = e.target.closest && e.target.closest(".tc-grip"); if (!g) return;
    const t = g.closest("table"), key = tableKey(t), rec = colStore[key]; if (!rec) return;
    busy = true; applyOrder(t, rec.orig, true); delete colStore[key]; saveCols(); st.delete(t); render(t); busy = false;
  });

  /* ---------- обработка таблиц ---------- */
  function process(t){
    if (!eligible(t)) return;
    const body = t.tBodies[0], rows = bodyRows(t);
    if (!t.dataset.gsT) t.dataset.gsT = String(++uid);
    let fresh = false;
    if (rows.some(r => !r.hasAttribute("data-gs-o"))) { rows.forEach((r, i) => r.dataset.gsO = i); fresh = true; }
    { const s0 = st.get(t); if (s0 && (hasNative(t) || s0.i >= labelRow(t).cells.length)) st.delete(t); }
    const lr = labelRow(t);
    if (!hasNative(t)) [...lr.cells].forEach((th, i) => {
      if (th.hasAttribute("data-gs")) return;
      if (!clean(th)) return;
      th.setAttribute("data-gs", ""); th.dataset.gsI = i; th.dataset.gsT = t.dataset.gsT; th.title = th.title || T("Сортировать по столбцу");
    });
    gripTable(t); pinButtons(t);
    if (!t.dataset.tcDone) { t.dataset.tcDone = "1"; restoreOrder(t); }
    if ((fresh && st.get(t)) || rows.some(r => r.classList.contains("tp-pinned") !== (on("pinrows") && pinSet(t).has(rowKey(r))))) render(t);
  }
  function processAll(){
    busy = true;
    try { document.querySelectorAll("table").forEach(t => { try { process(t); } catch (e) { window.__tblErr = e; } }); } catch (e) {}
    busy = false;
  }
  let timer = 0;
  const relevant = n => n.nodeType === 1 && (/^(TABLE|THEAD|TBODY|TR|TH|TD)$/.test(n.tagName) || !!n.querySelector("table"));
  const obs = new MutationObserver(recs => {
    if (busy || timer) return;
    if (!recs.some(r => (r.target.closest && r.target.closest("table") && !r.target.closest(".sticky-table-head")) || [...r.addedNodes].some(relevant))) return;
    timer = setTimeout(() => { timer = 0; processAll(); }, 120);
  });

  /* ---------- клик по заголовку ---------- */
  let downEl = null;
  document.addEventListener("pointerdown", e => { downEl = e.target; }, true);
  document.addEventListener("click", e => {
    let th = e.target.closest && e.target.closest("th[data-gs]"); if (!th) return;
    if (e.target.closest(".column-resize-handle,.tc-grip") || (downEl && downEl.closest && downEl.closest(".column-resize-handle,.tc-grip")) || Date.now() - justDragged < 350) return;
    if (th.closest(".sticky-table-clone")) {
      const t0 = [...document.querySelectorAll("table[data-gs-t]")].find(x => x.dataset.gsT === th.dataset.gsT && !x.closest(".sticky-table-head"));
      th = t0 && t0.tHead.querySelector(`th[data-gs-i="${th.dataset.gsI}"]`); if (!th) return;
    }
    const t = th.closest("table"), i = th.cellIndex, s = st.get(t);
    const numericFirst = (() => { const vs = bodyRows(t).map(r => cellVal(r.cells[i])).filter(v => v !== null); return vs.length && vs.filter(v => typeof v === "number").length / vs.length >= 0.7; })();
    const first = numericFirst ? "desc" : "asc", second = first === "asc" ? "desc" : "asc";
    if (!s || s.i !== i) st.set(t, {i, dir: first}); else if (s.dir === first) st.set(t, {i, dir: second}); else st.delete(t);
    busy = true; render(t); busy = false;
    const lbl = labelRow(t); if (lbl) { /* форсируем перестройку закреплённой шапки */ }
  });

  /* ---------- закрепление: клик ---------- */
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest(".tc-grip")) { e.stopPropagation(); e.preventDefault(); return; }
    const b = e.target.closest && e.target.closest(".tp-pin"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    togglePin(b.closest("table"), b.closest("tr"));
  }, true);

  document.addEventListener("change", e => { if (e.target.closest && e.target.closest("input[data-exp]")) setTimeout(() => { document.querySelectorAll("table").forEach(t => { if (eligible(t)) { pinButtons(t); gripTable(t); render(t); } }); }, 0); });

  /* =================== Клик по легенде =================== */
  let last = {n: "", t: 0};
  function legendNames(){
    const s = new Set((typeof lineSeriesInfo !== "undefined" && lineSeriesInfo ? lineSeriesInfo : []).map(x => x.name));
    document.querySelectorAll("#c-out .lg-item,#c-chips [data-series]").forEach(el => { const n = el.dataset.name || el.dataset.series; if (n) s.add(n); });
    return [...s];
  }
  document.addEventListener("click", e => {
    if (!on("legend")) return;
    const el = e.target.closest && e.target.closest("#c-out .lg-item,#c-chips [data-series]"); if (!el) return;
    const n = el.dataset.name || el.dataset.series; if (!n) return;
    const now = Date.now(), dbl = last.n === n && now - last.t < 450, snap = dbl ? last.snap : new Set(hiddenSeries);
    last = {n, t: now, snap};
    if (!(e.shiftKey || dbl)) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (dbl) { hiddenSeries.clear(); snap.forEach(x => hiddenSeries.add(x)); }
    const names = legendNames(), alone = names.every(x => x === n ? !hiddenSeries.has(x) : hiddenSeries.has(x));
    names.forEach(x => (alone || x === n) ? hiddenSeries.delete(x) : hiddenSeries.add(x));
    last = {n: "", t: 0};
    try { hideTip && hideTip(); } catch (x) {}
    renderCharts();
  }, true);

  /* =================== Режим «Аниме» =================== */
  const out = document.getElementById("c-out");
  const AN_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>', AN_STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>';
  let bar = null, run = null;
  function stopAnime(){
    if (!run) return;
    cancelAnimationFrame(run.raf);
    const {svg, g, clip, btn} = run; run = null;
    try {
      if (svg && g && g.parentNode) { while (g.firstChild) g.parentNode.insertBefore(g.firstChild, g); g.remove(); }
      if (clip) clip.remove();
      if (svg) svg.classList.remove("anime-run");
      const xh = document.getElementById("xh"); if (xh) xh.setAttribute("visibility", "hidden");
    } catch (e) {}
    if (btn) { btn.innerHTML = AN_PLAY + T("Аниме"); btn.classList.remove("on"); }
  }
  function ensureBar(){
    if (bar && bar.isConnected) return bar;
    bar = document.createElement("div"); bar.id = "anime-bar"; bar.hidden = true;
    bar.innerHTML = `<button type="button" class="an-btn an-go">${AN_PLAY}${T("Аниме")}</button><button type="button" class="an-btn an-sp" title="${T("Скорость")}">1×</button><span class="an-date"></span><span class="an-vals"></span>`;
    out.before(bar); return bar;
  }
  let speed = 1;
  function playAnime(){
    const M = lineMeta, svg = out.querySelector("svg"); if (!M || !svg || !svg.querySelector("#hov")) return;
    stopAnime();
    const H = svg.viewBox.baseVal.height, W = svg.viewBox.baseVal.width;
    let defs = svg.querySelector("defs"); if (!defs) { defs = document.createElementNS(NS, "defs"); svg.prepend(defs); }
    const clip = document.createElementNS(NS, "clipPath"); clip.id = "anime-clip";
    const rect = document.createElementNS(NS, "rect"); rect.setAttribute("x", 0); rect.setAttribute("y", 0); rect.setAttribute("width", 0); rect.setAttribute("height", H);
    clip.appendChild(rect); defs.appendChild(clip);
    const g = document.createElementNS(NS, "g"); g.setAttribute("clip-path", "url(#anime-clip)");
    const keep = [...svg.children].filter(c => !["defs"].includes(c.tagName) && c.id !== "xh" && c.id !== "hov");
    keep[0] ? keep[0].before(g) : svg.appendChild(g); keep.forEach(c => g.appendChild(c));
    svg.classList.add("anime-run");
    const btn = bar.querySelector(".an-go"); btn.innerHTML = AN_STOP + T("Стоп"); btn.classList.add("on");
    const xh = document.getElementById("xh");
    const keys = M.series.map(s => [...s.v.keys()].sort((a, b) => a - b));
    const total = (M.xMax - M.xMin) || 1, dur = Math.min(16000, Math.max(5000, 3000 + M.xs.length * 14)) / speed;
    const t0 = performance.now(); run = {svg, g, clip, btn, raf: 0};
    const dateEl = bar.querySelector(".an-date"), valsEl = bar.querySelector(".an-vals");
    const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    const f = typeof fmt === "function" ? fmt : (v => String(Math.round(v)));
    function frame(now){
      if (!run) return;
      const p = Math.min(1, (now - t0) / dur), x = M.xMin + p * total, px = M.L + p * M.span;
      rect.setAttribute("width", p >= 1 ? W : Math.max(0, px + 2));
      if (xh) { xh.setAttribute("x1", px); xh.setAttribute("x2", px); xh.setAttribute("visibility", "visible"); }
      try { let xi = 0, lo = 0, hi = M.xs.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (M.xs[m] <= x) { xi = m; lo = m + 1; } else hi = m - 1; } dateEl.textContent = M.xLabel(M.xs[xi]); } catch (e) { dateEl.textContent = ""; }
      const vals = M.series.map((s, k) => { const ks = keys[k]; let lo = 0, hi = ks.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (ks[m] <= x) { r = m; lo = m + 1; } else hi = m - 1; } return {n: s.name, c: s.c, v: r >= 0 ? s.v.get(ks[r]) : null}; }).filter(o => o.v !== null).sort((a, b) => b.v - a.v).slice(0, 6);
      valsEl.innerHTML = vals.map(o => `<span><i style="background:${esc(o.c)}"></i>${esc(o.n)} <b>${esc(f(o.v))}</b></span>`).join("");
      if (p >= 1) { stopAnime(); return; }
      run.raf = requestAnimationFrame(frame);
    }
    run.raf = requestAnimationFrame(frame);
  }
  function syncBar(){
    if (!out) return;
    const show = on("anime") && !!lineMeta && !!out.querySelector("svg #hov");
    if (!show) { stopAnime(); if (bar) bar.hidden = true; return; }
    ensureBar().hidden = false;
  }
  if (out) {
    new MutationObserver(() => { stopAnime(); syncBar(); }).observe(out, {childList:true});
    document.addEventListener("click", e => {
      const go = e.target.closest && e.target.closest("#anime-bar .an-go"), sp = e.target.closest && e.target.closest("#anime-bar .an-sp");
      if (go) { run ? stopAnime() : playAnime(); }
      if (sp) { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; sp.textContent = speed + "×"; if (run) playAnime(); }
    });
    document.addEventListener("change", e => { if (e.target.closest && e.target.closest("input[data-exp]")) setTimeout(syncBar, 0); });
    setTimeout(syncBar, 300);
  }

  obs.__hub(document.body);
  window.__tbltools = {process, processAll, st, sortState: () => Object.fromEntries(stMap), pinStore:() => pinStore, colStore:() => colStore, playAnime, stopAnime};
  processAll(); setTimeout(processAll, 800);
})();
