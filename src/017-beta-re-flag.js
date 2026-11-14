
/* «Реакции и события» — в релизе: вкладки и новая раскладка («Топы», Селфи/Время/ДР в Хабе) включены всегда.
   Флаг __betaOn и класс body.beta-re оставлены, потому что на них опираются остальные скрипты. */
window.__betaOn = true;
document.body.classList.add("beta-re");
/* Раскладка ПК (вкладки слева, фильтры в шторке справа) включается до первой отрисовки страницы,
   чтобы при загрузке не мелькал старый вид и фильтры не появлялись по центру. Класс fr-boot прячет
   фильтры на странице, пока шторка их не заберёт (его снимает скрипт шторки). */
(() => {
  const b = document.body, ls = k => { try { return localStorage.getItem(k) === "1"; } catch (e) { return false; } };
  b.classList.add("side-nav"); if (ls("chatstats.sideNavCollapsed.v1")) b.classList.add("side-collapsed");
  if (matchMedia("(min-width:721px)").matches) { b.classList.add("filters-right", "fr-boot"); if (ls("chatstats.filtersRightCollapsed.v1")) b.classList.add("fr-collapsed"); }
  setTimeout(() => b.classList.remove("fr-boot"), 4000); // страховка
})();
