
/* ===================== Настройки: вкладки по категориям ===================== */
(function(){
  const tab = document.getElementById("tab-settings"); if (!tab || tab.querySelector(".set-panes")) return;
  const KEY = "chatstats.settingsCat.v1";
  const CATS = [
    {k:"look", ic:"🎨", c:"#5e8bff", t:"Оформление", d:"Тема, цвет фона, шрифт и язык", h:["Тема оформления", "Шрифт"]},
    {k:"mobile", ic:"📱", c:"#ff375f", t:"Телефон", d:"Мобильная версия в стиле приложения, вибрация", h:["Мобильная версия"]},
    {k:"fx", ic:"✨", c:"#bf5af2", t:"Эффекты", d:"Анимации, частицы на фоне, рамка таблиц и графиков", h:["Эффекты"]},
    {k:"exp", ic:"🧪", c:"#ff6b9d", t:"Эксперименты", d:"Пробные функции интерактивных графиков — включай по одной и оставляй нужные", h:["Эксперименты"]},
    {k:"filters", ic:"🎛️", c:"#34c759", t:"Фильтры и таблицы", d:"Вид фильтров и дополнения к таблицам", h:["Фильтры", "Экспериментально"]},
    {k:"people", ic:"👥", c:"#ff9f0a", t:"Участники", d:"Имена, цвета, дни рождения, города и аватарки", h:["Участники", "Дни рождения", "Аватарки"]},
    {k:"data", ic:"🗄️", c:"#30b0c7", t:"Данные", d:"Ultimate, кэш, автообновление и сервер", h:["Colony Ultimate", "Кэш истории", "Автообновление", "Адрес сервера", "Поля API"]},
    {k:"site", ic:"ℹ️", c:"#8e8e93", t:"Перенос и версия", d:"Экспорт и импорт настроек, версия сайта, история обновлений", h:["Перенос настроек", "О сайте"]},
  ];
  const catOfH2 = txt => { txt = txt.trim(); const c = CATS.find(c => c.h.some(p => txt.startsWith(p))); return c ? c.k : null; };
  // Раскладываем содержимое вкладки по разделам: всё после заголовка относится к его разделу.
  const panes = {};
  const box = document.createElement("div"); box.className = "set-panes";
  CATS.forEach(c => {
    const p = document.createElement("div"); p.className = "set-pane"; p.dataset.cat = c.k;
    p.innerHTML = `<button type="button" class="set-back">Настройки</button>`;
    panes[c.k] = p; box.appendChild(p);
  });
  let curCat = CATS[0].k;
  [...tab.children].forEach(n => {
    if (n.tagName === "H2") curCat = catOfH2(n.textContent) || curCat;
    panes[curCat].appendChild(n);
  });
  const bar = document.createElement("div"); bar.className = "set-tabs"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Разделы настроек");
  bar.innerHTML = CATS.map(c => `<button type="button" role="tab" data-scat="${c.k}"><i aria-hidden="true">${c.ic}</i>${c.t}</button>`).join("");
  const menu = document.createElement("div"); menu.className = "set-menu-wrap";
  menu.innerHTML = `<div class="set-menu">${CATS.map(c => `<button type="button" class="ma-row" data-scat="${c.k}"><span class="ma-ico" style="--c:${c.c}">${c.ic}</span><span class="ma-txt"><span><b>${c.t}</b><em>${c.d}</em></span><span class="ma-chev">›</span></span></button>`).join("")}</div>`;
  tab.append(bar, menu.firstElementChild, box);
  // На вкладке настроек «К разделу» больше не нужен — у неё свои вкладки.
  tab.querySelectorAll(":scope > .sec-nav, .set-pane > .sec-nav").forEach(n => n.remove());
  let cat = CATS[0].k;
  try { const s = localStorage.getItem(KEY); if (s && panes[s]) cat = s; } catch (e) {}
  function show(k, enter){
    if (!panes[k]) return;
    cat = k; tab.dataset.scat = k;
    bar.querySelectorAll("button").forEach(b => { const a = b.dataset.scat === k; b.classList.toggle("active", a); b.setAttribute("aria-selected", a ? "true" : "false"); });
    if (enter) tab.classList.add("sm-in");
    try { localStorage.setItem(KEY, k); } catch (e) {}
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }
  tab.addEventListener("click", e => {
    const b = e.target.closest("[data-scat]");
    if (b && (b.closest(".set-tabs") || b.closest(".set-menu"))) {
      const fromMenu = !!b.closest(".set-menu");
      show(b.dataset.scat, fromMenu);
      // Вход в раздел из списка — отдельный шаг в истории: «назад» вернёт к списку разделов, а не к другой вкладке.
      if (fromMenu) { const h = "#settings/" + b.dataset.scat; try { if (location.hash !== h) { history.pushState(null, "", h); pushedPane = true; } } catch (err) {} }
      if (fromMenu || document.body.classList.contains("mapp")) scrollTo({top:0});
      return;
    }
    if (e.target.closest(".set-back")) {
      if (pushedPane && /^#settings\/./.test(location.hash)) { history.back(); return; }
      closePane();
    }
  });
  let pushedPane = false;
  function closePane(){
    pushedPane = false;
    tab.classList.remove("sm-in"); scrollTo({top:0});
    try { if (/^#settings\/./.test(location.hash)) history.replaceState(null, "", "#settings"); } catch (e) {}
  }
  // Назад/вперёд браузера и системная кнопка «назад» на телефоне: адрес #settings/раздел ↔ #settings.
  function fromHash(){
    const m = /^#settings(?:\/([a-z]+))?$/.exec(location.hash); if (!m) return;
    if (m[1] && panes[m[1]]) { if (!tab.classList.contains("sm-in") || cat !== m[1]) { show(m[1], true); scrollTo({top:0}); } }
    else if (tab.classList.contains("sm-in")) { pushedPane = false; tab.classList.remove("sm-in"); scrollTo({top:0}); }
  }
  window.addEventListener("popstate", fromHash);
  window.addEventListener("hashchange", fromHash);
  // Если что-то из сайта ведёт к элементу настроек (например, по id), открываем нужный раздел.
  document.addEventListener("focusin", e => { const p = e.target.closest && e.target.closest(".set-pane"); if (p && p.dataset.cat !== cat) show(p.dataset.cat, true); });
  window.__settingsCats = {show:(k) => show(k, true), list:CATS.map(c => c.k)};
  window.__settingsPane = {get:() => tab.classList.contains("sm-in") ? cat : "", open:(k) => { if (panes[k]) show(k, true); }, close:() => tab.classList.remove("sm-in")};
  // Страницу открыли по ссылке на раздел настроек (#settings/раздел) — адрес разобран раньше, чем появились разделы.
  if (window.__pendingSettingsPane && panes[window.__pendingSettingsPane]) { const k = window.__pendingSettingsPane; window.__pendingSettingsPane = ""; setTimeout(() => show(k, true), 0); }
  show(cat, false);
})();

/* ===================== Анимированные плашки годов: анимируются только те, что на экране ===================== */
(function(){
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("yc-live", e.isIntersecting)), {rootMargin:"80px 0px"}) : null;
  let n = 0;
  function scan(root){
    if (!root.querySelectorAll) return;
    const list = root.classList && root.classList.contains("ychip") ? [root] : root.querySelectorAll(".ychip");
    list.forEach(el => {
      if (el.dataset.yc) return; el.dataset.yc = "1";
      el.style.setProperty("--yc-d", ((n++ * .23) % 3.6).toFixed(2) + "s");
      if (io) io.observe(el); else el.classList.add("yc-live");
    });
  }
  const host = document.querySelector("main") || document.body;
  scan(host);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(nd => { if (nd.nodeType === 1) scan(nd); }))).observe(host, {childList:true, subtree:true});
})();
