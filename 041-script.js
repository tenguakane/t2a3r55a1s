
/* Список серий под графиком («Динамика», «По годам», «График мест», «Разброс», «Маленькие графики»): скрыть и вернуть любой год или участника */
(function(){
  const host = $("c-chips"), out = $("c-out"); if (!host || !out) return;
  function render(){
    const info = typeof lineSeriesInfo !== "undefined" ? lineSeriesInfo : null;
    if (!info || !info.length || !["trend", "years", "bump", "spread", "multiples"].includes(cType)) { host.hidden = true; host.innerHTML = ""; return; }
    const word = cType === "years" ? "Годы" : (chartEntity === "chats" ? "Чаты" : "Участники");
    host.innerHTML = `<span class="lbl">${word}:</span>` + info.map(s => `<button type="button" class="chip${hiddenSeries.has(s.name) ? " off" : ""}" style="--c:${escH(s.color)}" data-series="${escH(s.name)}" aria-pressed="${!hiddenSeries.has(s.name)}" title="${hiddenSeries.has(s.name) ? "Показать" : "Скрыть"}"><i></i>${escH(s.name)}</button>`).join("")
      + `<button type="button" class="mini" data-series-all="1">Показать все</button>` + (info.length > 1 ? `<button type="button" class="mini" data-series-none="1">Скрыть все</button>` : "");
    host.hidden = false;
  }
  new MutationObserver(render).observe(out, {childList:true});
  host.addEventListener("click", e => {
    const c = e.target.closest("[data-series]"), all = e.target.closest("[data-series-all]"), none = e.target.closest("[data-series-none]");
    if (!c && !all && !none) return;
    const names = (lineSeriesInfo || []).map(s => s.name);
    if (c) { const n = c.dataset.series; hiddenSeries.has(n) ? hiddenSeries.delete(n) : hiddenSeries.add(n); }
    else if (all) names.forEach(n => hiddenSeries.delete(n));
    else names.forEach(n => hiddenSeries.add(n));
    renderCharts();
  });
  $("y-ceil").addEventListener("change", () => renderCharts());
  // «Доли во времени» удалены: если она была сохранена, возвращаемся к столбцам
  function fix(){
    try {
      const raw = localStorage.getItem("chatstats.tabFilters.v1");
      if (raw && raw.includes('"stacked"')) localStorage.setItem("chatstats.tabFilters.v1", raw.replace(/"c-type":"stacked"/g, '"c-type":"bars"'));
    } catch (e) {}
    const sel = $("c-type"); if (sel.value === "stacked" || !sel.value) { sel.value = "bars"; cType = "bars"; }
  }
  fix(); document.addEventListener("click", e => { if (e.target.closest && e.target.closest('nav button[data-tab="charts"]')) setTimeout(fix, 0); });
})();
