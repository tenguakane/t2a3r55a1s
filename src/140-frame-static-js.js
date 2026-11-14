
(() => {
  // ширина видимой области каждой таблицы — для неподвижной рамки (обновляется только при изменении размера)
  // Узкая таблица (уже обёртки) — обёртка сжимается до таблицы, чтобы справа не оставалась тёмная полоса без строк.
  const fit = w => {
    const t = w.querySelector(":scope > table:not(.tv-cards)");
    if (t && w.dataset.fit !== "1" && t.offsetWidth && t.offsetWidth < w.clientWidth - 2) w.dataset.fit = "1";
    const cw = w.clientWidth, tw = t ? t.offsetWidth : 0;
    w.style.setProperty("--wrap-cw", (w.dataset.fit === "1" && tw ? Math.min(cw, tw) : cw) + "px");
  };
  const ro = new ResizeObserver(es => es.forEach(e => { const w = e.target.classList.contains("wrap") ? e.target : e.target.parentElement; if (w) fit(w); }));
  const seen = new WeakSet();
  const scan = () => document.querySelectorAll("main .wrap").forEach(w => { if (!seen.has(w)) { seen.add(w); ro.observe(w); } const t = w.querySelector(":scope > table"); if (t && !seen.has(t)) { seen.add(t); ro.observe(t); } fit(w); });
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); }).__hub(document.querySelector("main"));
  scan();
})();
