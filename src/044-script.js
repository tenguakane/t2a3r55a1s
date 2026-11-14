
/* ===================== Компактные фильтры ===================== */
(function(){
  const K_COMPACT = "chatstats.compactFilters.v1", K_STT = "chatstats.statRowsToggle.v1";
  // Режимы, которые лучше держать на виду, а не в меню.
  const KEEP = new Set(["dm-year", "dm-week", "dm-years"]);
  let compact = true, sttShow = true;
  try { compact = localStorage.getItem(K_COMPACT) !== "0"; sttShow = localStorage.getItem(K_STT) !== "0"; } catch (e) {}
  const pops = [];
  function count(pop){ const n = [...pop.querySelectorAll(".opt-list input[type=checkbox]")].filter(i => i.checked && !i.closest("[hidden]") && getComputedStyle(i.closest("label")).display !== "none").length; pop.querySelector(".opt-n").textContent = n ? String(n) : ""; }
  function build(){
    document.querySelectorAll(".filters").forEach(f => {
      if (f.closest("#tab-settings") || f.querySelector(":scope > .opt-pop")) return;
      const items = [...f.querySelectorAll(":scope > .checkline")].filter(l => { const i = l.querySelector("input"); return i && !KEEP.has(i.id); });
      if (items.length < 2) return;
      const pop = document.createElement("details"); pop.className = "opt-pop";
      pop.innerHTML = `<summary title="Дополнительные параметры">Параметры <b class="opt-n"></b></summary><div class="opt-list"></div>`;
      items[0].before(pop);
      const list = pop.querySelector(".opt-list");
      items.forEach(l => { l.dataset.optHome = "1"; list.appendChild(l); });
      pop._items = items; pops.push(pop); count(pop);
    });
  }
  function unbuild(){
    while (pops.length) { const pop = pops.pop(); pop._items.forEach(l => pop.before(l)); pop.remove(); }
  }
  function apply(){
    document.body.classList.add("hide-statrows-toggle");
    if (compact) build(); else unbuild();
    const a = document.getElementById("set-compact-filters"); if (a) a.checked = compact;
    pops.forEach(count);
  }
  document.addEventListener("change", e => {
    if (e.target.id === "set-compact-filters") { compact = e.target.checked; try { localStorage.setItem(K_COMPACT, compact ? "1" : "0"); } catch (err) {} apply(); return; }
    const pop = e.target.closest && e.target.closest(".opt-pop"); if (pop) count(pop);
  });
  document.addEventListener("click", e => { pops.forEach(p => { if (p.open && !p.contains(e.target)) p.open = false; }); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") pops.forEach(p => { p.open = false; }); });
  // Галочки могут меняться из кода (синхронизация между вкладками) — обновляем счётчики при открытии вкладок.
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("nav button,[data-gtab]")) setTimeout(() => pops.forEach(count), 300); });
  window.__compactFilters = {apply, rebuild(){ unbuild(); apply(); }};
  apply();
})();
