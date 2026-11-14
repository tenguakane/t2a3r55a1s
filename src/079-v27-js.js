
/* ===================== v27: на «Графиках» вид графика, «Пользователи | Чаты» и дата остаются на странице ===================== */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const DATE_IDS = ["f-mode", "f-day", "f-month", "f-year"]; // «Режим» (день, неделя, месяц…) тоже на странице «Графиков»
  const chartFields = () => [$("c-entity")?.closest(".field"), $("c-type")?.closest(".field")].filter(Boolean);
  const activeTab = () => document.querySelector("main > .tab.active")?.id || "";
  // Поля с data-fr-keep шторка оставляет на странице. Даты общие для нескольких вкладок — помечаем их только на «Графиках».
  function syncKeep(){
    const on = activeTab() === "tab-charts";
    DATE_IDS.forEach(id => { const f = $(id); if (f) f.toggleAttribute("data-fr-keep", on); });
    chartFields().forEach(f => f.setAttribute("data-fr-keep", ""));
  }
  // Дата попадает в отдельную строку над вкладкой — переносим её к остальным полям «Графиков».
  function arrange(){
    if (!document.body.classList.contains("filters-right") || activeTab() !== "tab-charts") return;
    const holder = document.querySelector("#tab-charts > .filters.fr-keep"); if (!holder) return;
    DATE_IDS.forEach(id => { const f = $(id); if (f && f.parentElement && f.parentElement.classList.contains("fr-keep") && f.parentElement !== holder) holder.appendChild(f); });
  }
  syncKeep();
  const later = () => { setTimeout(syncKeep, 20); setTimeout(arrange, 140); setTimeout(arrange, 600); };
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("nav button, .nav-sheet button, [data-gtab], [data-hub-go], [data-open-profile]")) later(); }, true);
  window.addEventListener("popstate", later);
  new MutationObserver(() => setTimeout(arrange, 60)).observe(document.body, {attributes:true, attributeFilter:["class"]});
  setTimeout(arrange, 120); setTimeout(arrange, 800);
  // Шторку только что включили или открыли «Графики» при загрузке — перемонтируем с новыми отметками.
  setTimeout(() => { if (activeTab() === "tab-charts" && window.__filterDrawer && document.body.classList.contains("filters-right")) { window.__filterDrawer.mount(); setTimeout(arrange, 60); } }, 300);
})();
