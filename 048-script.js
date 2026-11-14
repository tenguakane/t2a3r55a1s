
/* ===================== Боковые панели: высота шапки и перетаскивание ширины ===================== */
(function(){
  const hdr = document.querySelector("header");
  // Заголовки «Навигация» и «Фильтры» по высоте совпадают с шапкой сайта.
  const syncH = () => { if (hdr) document.body.style.setProperty("--hdr-h", Math.round(hdr.getBoundingClientRect().height) + "px"); };
  if (hdr && window.ResizeObserver) new ResizeObserver(syncH).observe(hdr);
  addEventListener("resize", syncH); syncH();
  const PANES = [
    {id:"side-resizer", v:"--side-w-open", key:"chatstats.sideW.v1", min:150, max:380, def:188, dir:1},
    {id:"fr-resizer", v:"--fr-w-open", key:"chatstats.frW.v1", min:250, max:560, def:360, dir:-1},
  ];
  PANES.forEach(P => {
    const el = document.createElement("div"); el.id = P.id; el.className = "pane-resizer"; el.title = "Потяни, чтобы изменить ширину · двойной клик — по умолчанию";
    document.body.appendChild(el);
    const set = w => { w = Math.max(P.min, Math.min(P.max, Math.round(w))); document.body.style.setProperty(P.v, w + "px"); return w; };
    try { const w = Number(localStorage.getItem(P.key)); if (w) set(w); } catch (e) {}
    el.addEventListener("pointerdown", e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add("drag"); document.body.classList.add("pane-dragging");
      let last = null;
      const move = ev => { last = set(P.dir > 0 ? ev.clientX : innerWidth - ev.clientX); };
      const up = () => {
        el.classList.remove("drag"); document.body.classList.remove("pane-dragging");
        el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
        if (last) { try { localStorage.setItem(P.key, String(last)); } catch (err) {} }
        try { window.dispatchEvent(new Event("resize")); } catch (err) {}
      };
      el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    });
    el.addEventListener("dblclick", () => { set(P.def); try { localStorage.removeItem(P.key); } catch (e) {} try { window.dispatchEvent(new Event("resize")); } catch (err) {} });
  });
})();
