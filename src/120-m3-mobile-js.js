
/* Мобильная версия: семантика переключателей, цвет системной панели, «назад» закрывает шторку фильтров */
(function(){
  // Переключатели меню — роль switch и состояние для TalkBack
  const menu = document.getElementById("ma-menu");
  const sem = () => menu && menu.querySelectorAll("[data-ma-sw]").forEach(r => { r.setAttribute("role", "switch"); r.setAttribute("aria-checked", String(r.classList.contains("on"))); });
  if (menu) new MutationObserver(sem).observe(menu, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
  // Активная вкладка нижней навигации
  const tabs = document.getElementById("ma-tabs");
  if (tabs) new MutationObserver(() => tabs.querySelectorAll("button").forEach(b => b.classList.contains("on") ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"))).observe(tabs, {subtree:true, attributes:true, attributeFilter:["class"]});
  // Цвет системной панели = фон темы
  const meta = document.querySelector('meta[name="theme-color"]') || (() => { const m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); return m; })();
  const paint = () => { const c = getComputedStyle(document.body).getPropertyValue("--bg").trim(); if (c && meta.content !== c) meta.content = c; };
  paint(); new MutationObserver(paint).observe(document.documentElement, {attributes:true, attributeFilter:["style", "class"]});
  // Системная кнопка «назад» закрывает шторку фильтров, а не уводит со страницы
  const fs = document.getElementById("ma-fsheet"); if (!fs) return;
  let pushed = false;
  new MutationObserver(() => {
    const open = fs.classList.contains("open");
    if (open && !pushed) { try { history.pushState({maSheet:1}, ""); pushed = true; } catch (e) {} }
    else if (!open && pushed) { pushed = false; if (history.state && history.state.maSheet) { try { history.back(); } catch (e) {} } }
  }).observe(fs, {attributes:true, attributeFilter:["class"]});
  window.addEventListener("popstate", () => { if (pushed && fs.classList.contains("open")) { pushed = false; fs.querySelector(".ma-done")?.click(); } });
})();
