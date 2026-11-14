
(function(){
  "use strict";
  const T = window.__tx || (s => s);
  /* ============ График на весь экран (двойное касание или меню «⋮») ============ */
  const SKIP = "table, nav, button, .tile, .hub-kpi, #tab-settings, .chart-settings-panel, .hc-pop, .msel-pop, #filter-drawer, .ma-ico, .theme-card, [data-no-zoom], .ui-i, #mz-view";
  const PROPS = ["fill", "stroke", "opacity", "fill-opacity", "stroke-opacity", "stroke-width", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "font-size", "font-weight", "font-family", "letter-spacing", "text-anchor", "dominant-baseline", "visibility", "display"];
  const narrow = () => { try { return matchMedia("(max-width:720px)").matches || matchMedia("(pointer:coarse)").matches; } catch (e) { return false; } };
  function chartOf(el){
    let s = el && el.closest && el.closest("svg"); while (s && s.ownerSVGElement) s = s.ownerSVGElement;
    if (!s || !s.closest("main") || s.closest(SKIP)) return null;
    const vb = s.viewBox && s.viewBox.baseVal; if (!vb || vb.width < 300 || vb.height < 80) return null;
    const r = s.getBoundingClientRect(); if (r.width < 220 || r.height < 90) return null;
    return s;
  }
  function best(){
    const vh = window.innerHeight, mid = vh / 2; let pick = null, dist = 1e9;
    document.querySelectorAll("main svg").forEach(s => {
      if (s.ownerSVGElement || chartOf(s) !== s) return;
      const r = s.getBoundingClientRect(), vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (vis < Math.min(r.height, vh) * 0.4) return;
      const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < dist) { dist = d; pick = s; }
    });
    return pick;
  }
  T.add && T.add({
    "Увеличить":["Zoom in","Збільшити","Павялічыць","Үлкейту","Agrandir","Powiększ"],
    "Уменьшить":["Zoom out","Зменшити","Паменшыць","Кішірейту","Réduire","Pomniejsz"],
    "Сбросить масштаб":["Reset zoom","Скинути масштаб","Скінуць маштаб","Масштабты бастапқы қалпына келтіру","Réinitialiser le zoom","Zresetuj powiększenie"],
    "Палец по графику — подсказка, два пальца — масштаб, двойное касание — приблизить":["Drag a finger over the chart for a tooltip, pinch to zoom, double-tap to zoom in","Палець по графіку — підказка, два пальці — масштаб, подвійний дотик — наблизити","Палец па графіку — падказка, два пальцы — маштаб, двайны дотык — наблізіць","Графикте саусақ жүргізу — анықтама, екі саусақ — масштаб, қос түрту — жақындату","Un doigt sur le graphique : infobulle ; deux doigts : zoom ; double appui : agrandir","Palec po wykresie — podpowiedź, dwa palce — skala, podwójne stuknięcie — przybliż"],
    "Серии на графике":["Series on the chart","Серії на графіку","Серыі на графіку","Графиктегі қатарлар","Séries du graphique","Serie na wykresie"]
  });
  const NS = "http://www.w3.org/2000/svg";
  const ICON = {
    out: '<path d="M5 12h14"/>',
    in: '<path d="M12 5v14M5 12h14"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>'
  };
  let view = null, live = null;
  function ensure(){
    if (view) return view;
    view = document.createElement("div"); view.id = "mz-view"; view.setAttribute("role", "dialog"); view.setAttribute("aria-modal", "true"); view.setAttribute("aria-label", T("График на весь экран"));
    view.innerHTML = `<div class="mz-stage"></div><button type="button" class="mz-close" data-no-icons="true" aria-label="${T("Закрыть")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
    document.body.appendChild(view);
    view.querySelector(".mz-close").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && view.classList.contains("open")) { e.stopPropagation(); close(); } }, true);
    window.addEventListener("resize", () => { if (view.classList.contains("open")) orient(); });
    return view;
  }
  let aspect = 2;
  function orient(){ view.classList.toggle("rot", window.innerHeight > window.innerWidth && aspect > 1.15); }

  /* Живое управление копией графика: подсказка под пальцем, масштаб двумя пальцами, двойное касание, кнопки, список серий */
  function setup(c, stage, src){
    const hov = src.querySelector("#hov"); let M = null;
    try { if (hov && typeof lineMeta !== "undefined" && lineMeta && Math.abs(+hov.getAttribute("x") - lineMeta.L) < 1 && Math.abs(+hov.getAttribute("y") - lineMeta.T) < 1) M = lineMeta; } catch (e) {}
    const bv = c.viewBox.baseVal, vb0 = {x: bv.x, y: bv.y, w: bv.width, h: bv.height}, vb = Object.assign({}, vb0);
    let k = 1; const hid = new Set();
    let xh = null;
    if (M) {
      xh = document.createElementNS(NS, "line");
      [["y1", M.T], ["y2", M.B], ["stroke", "#ffffffb0"], ["stroke-width", "1.5"], ["stroke-dasharray", "4 4"], ["visibility", "hidden"], ["pointer-events", "none"]].forEach(([n, v]) => xh.setAttribute(n, v));
      c.appendChild(xh);
    }
    const tip = document.createElement("div"); tip.className = "mz-tip mz-ui"; stage.appendChild(tip);
    const tools = document.createElement("div"); tools.className = "mz-tools mz-ui"; tools.setAttribute("role", "group");
    const mk = (z, label) => { const b = document.createElement("button"); b.type = "button"; b.className = "mz-btn"; b.dataset.z = z; b.dataset.noIcons = "true"; b.setAttribute("aria-label", label); b.title = label; b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[z]}</svg>`; tools.appendChild(b); return b; };
    const bOut = mk("out", T("Уменьшить")), bIn = mk("in", T("Увеличить")), bReset = mk("reset", T("Сбросить масштаб"));
    stage.appendChild(tools);
    if (M && M.series.length > 1) {
      const lg = document.createElement("div"); lg.className = "mz-lg mz-ui"; lg.setAttribute("role", "group"); lg.setAttribute("aria-label", T("Серии на графике"));
      M.series.forEach(s => {
        const b = document.createElement("button"); b.type = "button"; b.className = "mz-chip on"; b.dataset.n = s.name; b.dataset.noIcons = "true"; b.setAttribute("aria-pressed", "true");
        const dot = document.createElement("i"); dot.style.background = s.c; const t = document.createElement("span"); t.textContent = s.name; b.append(dot, t); lg.appendChild(b);
      });
      stage.appendChild(lg); stage.classList.add("has-lg");
    }
    const sp = (x, y) => { const p = c.createSVGPoint(); p.x = x; p.y = y; const m = c.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : {x: 0, y: 0}; };
    const clampVB = () => { vb.x = Math.min(Math.max(vb.x, vb0.x), vb0.x + vb0.w - vb.w); vb.y = Math.min(Math.max(vb.y, vb0.y), vb0.y + vb0.h - vb.h); };
    /* При приближении линии серий утончаются (в корень из масштаба), чтобы график не превращался в толстые полосы */
    const strokes = [...c.querySelectorAll("path[data-n]")].map(el => [el, parseFloat(el.style.strokeWidth) || parseFloat(getComputedStyle(el).strokeWidth) || 0]).filter(q => q[1] > 0);
    const apply = () => { c.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h); bOut.disabled = bReset.disabled = k <= 1.001; bIn.disabled = k >= 7.99; const f = Math.sqrt(k); strokes.forEach(q => { q[0].style.strokeWidth = (q[1] / f).toFixed(2); }); };
    /* Масштаб k; точка A (в координатах графика) остаётся под экранной точкой (cx, cy) */
    const place = (nk, A, cx, cy) => {
      k = Math.min(8, Math.max(1, nk)); vb.w = vb0.w / k; vb.h = vb0.h / k;
      if (k <= 1.001) { k = 1; vb.x = vb0.x; vb.y = vb0.y; apply(); return; }
      clampVB(); apply();
      if (A) { const P = sp(cx, cy); vb.x += A.x - P.x; vb.y += A.y - P.y; clampVB(); apply(); }
    };
    apply();
    const hideTipv = () => { tip.style.display = "none"; if (xh) xh.setAttribute("visibility", "hidden"); };
    function scrub(cx, cy){
      const P = sp(cx, cy); let html = "";
      if (M) {
        const x = lineSnapX(M, P.x), px = M.L + (x - M.xMin) / ((M.xMax - M.xMin) || 1) * M.span;
        xh.setAttribute("x1", px); xh.setAttribute("x2", px); xh.setAttribute("visibility", "visible");
        html = lineTipHtml(M, x, hid);
      } else {
        const t = document.elementFromPoint(cx, cy); if (!t || !c.contains(t)) { hideTipv(); return; }
        const dayEl = t.closest("[data-day]"), ekEl = t.closest("[data-ek]"), tn = t.closest("[data-tip]");
        if (dayEl) html = dayTipHtml(dayEl.dataset.day); else if (ekEl) html = entityTipHtml(ekEl.dataset.ek);
        else if (tn) { const [a, b = ""] = tn.dataset.tip.split("|"); html = "<b>" + escH(a) + "</b>" + escH(b); }
      }
      if (!html) { hideTipv(); return; }
      tip.innerHTML = html; tip.style.display = "block"; tip.classList.toggle("r", (P.x - vb.x) / vb.w < 0.5);
    }
    const pts = new Map(); let pinch = null, locked = false, tap = null, dt = {t: 0, x: 0, y: 0};
    const isUi = e => !!(e.target.closest && e.target.closest(".mz-ui"));
    stage.addEventListener("pointerdown", e => {
      if (isUi(e)) return;
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; locked = true;
        pinch = {d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: k, A: sp((a.x + b.x) / 2, (a.y + b.y) / 2)}; hideTipv();
      } else if (pts.size === 1) { locked = false; tap = {t: Date.now(), x: e.clientX, y: e.clientY}; scrub(e.clientX, e.clientY); }
    });
    stage.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; place(pinch.k0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0, pinch.A, (a.x + b.x) / 2, (a.y + b.y) / 2); }
      else if (!locked && pts.size === 1) scrub(e.clientX, e.clientY);
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      const was = pts.size; pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) locked = false;
      if (was === 1 && e.type === "pointerup" && tap && Date.now() - tap.t < 300 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 14) {
        const now = Date.now();
        if (now - dt.t < 320 && Math.hypot(e.clientX - dt.x, e.clientY - dt.y) < 30) {
          dt.t = 0; hideTipv();
          if (k > 1.01) place(1); else place(2.5, sp(e.clientX, e.clientY), e.clientX, e.clientY);
        } else dt = {t: now, x: e.clientX, y: e.clientY};
      }
    };
    stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
    const zoom = f => { const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; place(k * f, sp(cx, cy), cx, cy); hideTipv(); };
    stage.addEventListener("click", e => {
      const z = e.target.closest && e.target.closest(".mz-btn");
      if (z) { if (z.dataset.z === "in") zoom(1.6); else if (z.dataset.z === "out") zoom(1 / 1.6); else { place(1); hideTipv(); } return; }
      const b = e.target.closest && e.target.closest(".mz-chip"); if (!b) return;
      const n = b.dataset.n; hid.has(n) ? hid.delete(n) : hid.add(n);
      const on = !hid.has(n); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
      c.querySelectorAll("[data-n]").forEach(el => { if (el.dataset.n === n) el.style.display = on ? "" : "none"; });
      hideTipv();
    });
    return {M: !!M, get k(){ return k; }, zoom, reset(){ place(1); }, scrub, hide: hideTipv};
  }
  function open(svg){
    if (!svg) return;
    ensure();
    const src = [svg, ...svg.querySelectorAll("*")], c = svg.cloneNode(true), dst = [c, ...c.querySelectorAll("*")];
    if (src.length === dst.length) for (let i = 1; i < src.length; i++) {
      const el = src[i], d = dst[i]; if (!d.style || /^(defs|clipPath|linearGradient|radialGradient|stop|title|desc|style)$/i.test(el.tagName)) continue;
      const cs = getComputedStyle(el); let st = "";
      for (const p of PROPS) { const v = cs.getPropertyValue(p); if (v) st += p + ":" + v + ";"; }
      d.setAttribute("style", st + "animation:none;transition:none;");
    }
    if (c.dataset && c.dataset.vb0) { c.setAttribute("viewBox", c.dataset.vb0); delete c.dataset.vb0; }
    c.querySelectorAll("#hov, #xh, #mxh, [data-no-export], [data-hover]").forEach(el => el.remove());
    c.removeAttribute("id"); c.removeAttribute("width"); c.removeAttribute("height"); c.setAttribute("preserveAspectRatio", "xMidYMid meet");
    c.style.color = getComputedStyle(svg).color;
    [["width", "100%"], ["height", "100%"], ["max-width", "none"], ["max-height", "none"], ["min-width", "0"], ["min-height", "0"], ["margin", "0"], ["flex", "1 1 auto"], ["aspect-ratio", "auto"], ["transform", "none"], ["overflow", "hidden"]].forEach(([k, v]) => c.style.setProperty(k, v, "important"));
    const vb = c.viewBox.baseVal; aspect = vb && vb.height ? vb.width / vb.height : 2;
    const stage = view.querySelector(".mz-stage"); stage.textContent = ""; stage.classList.remove("has-lg"); stage.appendChild(c);
    live = setup(c, stage, svg);
    orient(); view.classList.add("open");
    try {
      if (!localStorage.getItem("chatstats.mzHint2.v1")) {
        localStorage.setItem("chatstats.mzHint2.v1", "1");
        const h = document.createElement("div"); h.className = "mz-hint"; h.setAttribute("role", "status"); h.textContent = T("Палец по графику — подсказка, два пальца — масштаб, двойное касание — приблизить");
        stage.appendChild(h); setTimeout(() => h.remove(), 4200);
      }
    } catch (x) {}
  }
  function close(){ if (!view) return; view.classList.remove("open"); view.querySelector(".mz-stage").textContent = ""; live = null; }
  window.__mz = {best, open, close, openBest(){ open(best()); }, get live(){ return live; }};

  const HINT = "chatstats.mzHint.v1";
  let last = {t: 0, x: 0, y: 0, s: null};
  document.addEventListener("pointerup", e => {
    if (!narrow() || (e.pointerType === "mouse" && e.button !== 0)) return;
    const s = chartOf(e.target); if (!s) { last.s = null; return; }
    const now = Date.now();
    if (last.s === s && now - last.t < 380 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 36) { last = {t: 0, x: 0, y: 0, s: null}; e.preventDefault(); open(s); return; }
    last = {t: now, x: e.clientX, y: e.clientY, s};
    try {
      if (!localStorage.getItem(HINT)) { localStorage.setItem(HINT, "1"); if (typeof toastMsg === "function") toastMsg(T("Двойное касание по графику — открыть его на весь экран")); }
    } catch (x) {}
  }, true);

  /* ============ Настройка «Масштаб на телефоне» ============ */
  function scaleUi(){
    const host = document.getElementById("set-mobile-box"); if (!host || document.getElementById("set-mscale-row") || !window.__mscale) return !!host;
    const row = document.createElement("div"); row.id = "set-mscale-row"; row.title = T("Уменьшает весь интерфейс на телефоне, чтобы на экран помещалось больше. На компьютере ничего не меняет.");
    const cur = window.__mscale.get();
    row.innerHTML = `<span>${T("Масштаб на телефоне")}</span><div class="seg" id="set-mscale" role="group" aria-label="${T("Масштаб на телефоне")}">` + [[1, "100%"], [0.9, "90%"], [0.8, "80%"]].map(([v, l]) => `<button type="button" data-ms="${v}" class="${Math.abs(v - cur) < 0.01 ? "active" : ""}" aria-pressed="${Math.abs(v - cur) < 0.01}">${l}</button>`).join("") + `</div>`;
    host.appendChild(row);
    row.addEventListener("click", e => {
      const b = e.target.closest("[data-ms]"); if (!b) return;
      const v = parseFloat(b.dataset.ms); window.__mscale.set(v);
      row.querySelectorAll("[data-ms]").forEach(x => { const on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-pressed", on); });
      try { if (typeof toastMsg === "function") toastMsg(T("Масштаб: {1}", b.textContent)); } catch (x) {}
      setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (x) {} }, 120);
    });
    return true;
  }
  let tries = 0;
  (function wait(){ if (scaleUi() || ++tries > 40) return; setTimeout(wait, 250); })();
})();
