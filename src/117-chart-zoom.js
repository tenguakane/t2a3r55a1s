
/* ===================== Приближение графиков колесом мыши (ПК) =====================
   Меняется viewBox у SVG: график векторный, поэтому при любом масштабе остаётся чётким.
   Колесо над графиком — приблизить или отдалить в точку под курсором; если график не приближен,
   прокрутка вниз листает страницу как обычно. Приближенный график можно двигать мышью, двойной клик — сбросить.
   Картинки и видео графиков всегда делаются целиком, без приближения. Масштаб переживает автообновление графика. */
(function(){
  const desk = matchMedia("(pointer:fine) and (min-width:721px)");
  const MAXZ = 8, SKIP = "table, nav, button, .tile, .hub-kpi, #tab-settings, .chart-settings-panel, .hc-pop, .msel-pop, #filter-drawer, .ma-ico, .ev-card, .theme-card, [data-no-zoom]";
  const parse = v => { const a = String(v || "").trim().split(/[\s,]+/).map(Number); return a.length === 4 && a.every(isFinite) && a[2] > 0 && a[3] > 0 ? a : null; };
  const outer = el => { let s = el && el.closest && el.closest("svg"); while (s && s.ownerSVGElement) s = s.ownerSVGElement; return s; };
  function zoomable(svg){
    if (!svg || !svg.closest("main") || svg.closest(SKIP)) return false;
    if (!parse(svg.getAttribute("viewBox"))) return false;
    const r = svg.getBoundingClientRect(); return r.width >= 300 && r.height >= 140;
  }
  const state = new WeakMap(); // контейнер графика → {base, vb}
  const base = svg => parse(svg.dataset.vb0 || svg.getAttribute("viewBox"));
  function setVB(svg, vb){
    const b = base(svg); if (!svg.dataset.vb0) svg.dataset.vb0 = b.join(" ");
    const full = vb[2] >= b[2] * .999;
    if (full) { svg.setAttribute("viewBox", svg.dataset.vb0); svg.classList.remove("cz-on"); state.delete(svg.parentElement); }
    else { svg.setAttribute("viewBox", vb.map(v => +v.toFixed(3)).join(" ")); svg.classList.add("cz-on"); if (svg.parentElement) state.set(svg.parentElement, {base:svg.dataset.vb0, vb:vb.slice()}); }
    badge(svg, full ? 1 : b[2] / vb[2]);
  }
  // Подпись масштаба в углу графика
  let tag = null, tagT = 0;
  function badge(svg, z){
    if (!tag) { tag = document.createElement("div"); tag.className = "cz-badge"; document.body.appendChild(tag); }
    clearTimeout(tagT);
    if (z <= 1.001) { tag.classList.remove("show"); return; }
    const r = svg.getBoundingClientRect();
    tag.innerHTML = `×${z.toFixed(1).replace(".", ",")} <span>двойной клик — сбросить</span>`;
    tag.style.left = Math.round(r.right - 12) + "px"; tag.style.top = Math.round(Math.max(8, r.top + 10)) + "px";
    tag.classList.add("show"); tagT = setTimeout(() => tag.classList.remove("show"), 1800);
  }
  const clampVB = (svg, x, y, w, h) => { const b = base(svg); x = Math.min(Math.max(x, b[0]), b[0] + b[2] - w); y = Math.min(Math.max(y, b[1]), b[1] + b[3] - h); return [x, y, w, h]; };
  document.addEventListener("wheel", e => {
    if (!desk.matches || e.ctrlKey) return;
    const svg = outer(e.target); if (!zoomable(svg)) return;
    const b = base(svg), cur = parse(svg.getAttribute("viewBox"));
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    const f = Math.exp(Math.max(-1, Math.min(1, dy * .0016)));
    if (f > 1 && cur[2] >= b[2] * .999) return; // не приближен — прокрутка вниз листает страницу
    e.preventDefault();
    const w = Math.min(b[2], Math.max(b[2] / MAXZ, cur[2] * f)), h = w * b[3] / b[2];
    const m = svg.getScreenCTM(); if (!m) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(m.inverse());
    const k = w / cur[2];
    setVB(svg, clampVB(svg, p.x - (p.x - cur[0]) * k, p.y - (p.y - cur[1]) * k, w, h));
  }, {passive:false});
  // Перетаскивание приближенного графика
  let drag = null, moved = false, movedSvg = null;
  document.addEventListener("pointerdown", e => {
    moved = false; movedSvg = null;
    if (e.button !== 0 || !desk.matches) return;
    const svg = outer(e.target); if (!svg || !svg.classList.contains("cz-on")) return;
    drag = {svg, x:e.clientX, y:e.clientY, vb:parse(svg.getAttribute("viewBox")), m:svg.getScreenCTM()}; moved = false;
  });
  document.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true; movedSvg = drag.svg; drag.svg.classList.add("cz-drag");
    const s = drag.m ? drag.m.a : 1, [x, y, w, h] = drag.vb;
    setVB(drag.svg, clampVB(drag.svg, x - dx / s, y - dy / s, w, h));
  });
  const end = () => { if (drag) drag.svg.classList.remove("cz-drag"); drag = null; };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  // после перетаскивания клик не должен срабатывать (например, скрывать серию в легенде)
  // гасится только клик по тому же графику сразу после перетаскивания; кнопки и фильтры не трогаются
  document.addEventListener("click", e => { if (moved && movedSvg && outer(e.target) === movedSvg) { e.stopPropagation(); e.preventDefault(); } moved = false; movedSvg = null; }, true);
  document.addEventListener("dblclick", e => {
    const svg = outer(e.target); if (!svg || !svg.dataset.vb0 || !svg.classList.contains("cz-on")) return;
    e.preventDefault(); setVB(svg, parse(svg.dataset.vb0));
  });
  // Перерисованный график (автообновление, смена фильтра того же вида) остаётся приближенным
  const main = document.querySelector("main");
  if (main) new MutationObserver(ms => {
    ms.forEach(m => m.addedNodes.forEach(n => {
      const svgs = n.nodeType !== 1 ? [] : n.tagName === "svg" ? [n] : [...(n.querySelectorAll?.("svg") || [])];
      svgs.forEach(svg => {
        if (svg.ownerSVGElement || svg.dataset.vb0) return;
        const st = state.get(svg.parentElement); if (!st) return;
        if (svg.getAttribute("viewBox")?.trim() === st.base) { svg.dataset.vb0 = st.base; svg.setAttribute("viewBox", st.vb.join(" ")); svg.classList.add("cz-on"); }
        else state.delete(svg.parentElement);
      });
    }));
  }).__hub(main);
  window.__chartZoom = {reset:svg => svg?.dataset.vb0 && setVB(svg, parse(svg.dataset.vb0))};
})();
