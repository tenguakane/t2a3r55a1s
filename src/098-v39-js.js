
(() => {
  /* ---------- Лёгкий градиент в цветах участников: переключатель ---------- */
  const cb = document.getElementById("set-soft-grad");
  if (cb) {
    cb.checked = !!window.SOFT_GRAD;
    cb.addEventListener("change", () => {
      window.SOFT_GRAD = cb.checked;
      try { localStorage.setItem("chatstats.softGrad.v1", cb.checked ? "1" : "0"); } catch (e) {}
      try { if (typeof renderCharts === "function") renderCharts(); } catch (e) {}
    });
  }
  /* ---------- Панель инструментов: поиск, годы, разделы и копирование — в одну строку ---------- */
  const TABS = ["months", "days", "records", "forecast", "usermap", "birthdays", "vk"];
  const BIG = ".wrap, .tiles, .chart, .p-card, [id$='-out']";
  const onlyExport = f => f.matches(".filters") && f.children.length && ![...f.children].some(c => !c.matches(".table-export-actions"));
  const HEAD = ".table-export-row, .section-head";
  // «Карточки / Таблица» — в строку заголовка таблицы, если между ними только подсказки
  function mergeHeads(sec){
    sec.querySelectorAll(".hc-bar:not(.hc-moved)").forEach(hc => {
      if (!hc.nextElementSibling?.matches(".wrap")) return;
      let n = hc.previousElementSibling;
      if (!n && hc.parentElement !== sec) n = hc.parentElement.previousElementSibling;
      const skip = x => x.matches("p, .hint, .status") || !x.offsetHeight;
      while (n && skip(n)) n = n.previousElementSibling;
      if (!n || !n.matches(HEAD) || !n.querySelector(":scope > h2, :scope > h3")) return;
      hc.classList.add("hc-moved"); n.classList.add("tb-head"); n.appendChild(hc);
      // кнопка копирования сверху вкладки, сразу над этим заголовком — туда же
      let pv = n.previousElementSibling;
      while (pv && !pv.offsetHeight && !pv.matches(".tbar")) pv = pv.previousElementSibling;
      if (pv && pv.matches(".tbar") && pv.children.length === 1 && onlyExport(pv.firstElementChild)) { const h = pv.firstElementChild; pv.remove(); pv = h; }
      if (pv && onlyExport(pv)) { pv.classList.add("tb-in-head"); n.insertBefore(pv, hc); }
    });
  }
  function build(sec){
    if (!sec || !matchMedia("(min-width:721px)").matches) return;
    mergeHeads(sec);
    let bar = sec.querySelector(":scope > .tbar");
    const items = [...sec.children].filter(c => c.matches(".sec-nav, .year-legend, .top-tools") || onlyExport(c));
    const hasMain = items.some(c => c.matches(".year-legend, .top-tools"));
    if (!items.length && !bar) return;
    if (!bar) { bar = document.createElement("div"); bar.className = "tbar"; bar.dataset.noExport = "1"; items[0].before(bar); }
    // У поиска справа — копирование и «Карточки / Таблица», годы — строкой ниже
    if (hasMain || bar.querySelector(".top-tools")) {
      const hc = sec.querySelector(":scope > .hc-bar:not(.hc-moved)");
      if (hc && hc.nextElementSibling?.matches(".wrap")) { hc.classList.add("hc-moved"); items.push(hc); }
    }
    const rank = c => c.matches(".sec-nav") ? 0 : c.matches(".top-tools") ? 1 : c.matches(".filters") ? 2 : c.matches(".hc-bar") ? 3 : 4;
    items.sort((a, b) => rank(a) - rank(b)).forEach(c => bar.appendChild(c));
  }
  const icon = () => document.querySelectorAll(".top-search > span").forEach(sp => {
    if (sp.querySelector("svg") || !window.__lineIcon) return;
    const sv = window.__lineIcon.svg("search"); if (sv) sp.innerHTML = sv;
  });
  let raf = 0;
  const run = () => { raf = 0; const wide = matchMedia("(min-width:721px)").matches;
    document.querySelectorAll("main > section.tab.active").forEach(sec => { if (!wide) return; if (TABS.includes(sec.id.slice(4))) build(sec); else if (!/^tab-(stats|charts|settings|hub|profile|daymatrix|compare)$/.test(sec.id)) mergeHeads(sec); });
    icon(); };
  const later = () => { if (!raf) raf = requestAnimationFrame(run); };
  const main = document.querySelector("main");
  if (main) new MutationObserver(later).__hub(main);
  document.addEventListener("click", e => { if (e.target.closest?.("[data-tab], [data-ma], [data-ma-go]")) setTimeout(later, 60); });
  later();
})();
