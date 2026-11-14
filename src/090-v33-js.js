
/* Плавное появление блоков вкладки (Настройки → Эффекты):
   — при смене вкладки вкладка мягко проявляется, блоки появляются по очереди сверху вниз;
   — то, что дорисовалось позже (данные загрузились, таблица или график перерисовались), тоже проявляется, а не выскакивает;
   — строки таблиц выезжают лесенкой, графики плавно проступают. */
(function(){
  "use strict";
  const KEY = "chatstats.tabAnim.v1";
  // Включено всегда (при «уменьшить движение» в системе анимация не запускается).
  const on = true; try { localStorage.removeItem(KEY); } catch (e) {}
  const main = document.querySelector("main"); if (!main) return;
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BIG = ".wrap,.chart,table,svg,.tiles,.hub-grid,.hub-feed";
  let seen = new WeakSet();
  // Стекло (backdrop-filter) не рисуется, пока у блока или его предка прозрачность меньше 1.
  // Поэтому стеклянные блоки только выплывают (transform), а проявляется их содержимое.
  const GLASS = ".wrap,.filters,.tile,.p-card,.p-hero,.chart,.yr-chart-card,.yr-award,.yr-pod,.cmp-hero,.cmp-duels,.cmp-verdict,.hub-card,.hub-kpi,.hub-tile,.mt-card,.goal-card,.ach-card,.ach-hero,.bd-banner,.bd-clock,.um-card,.vk-card,.fc-over,.quiet,.set-tabs,.seg,.cl-ver,.cl-sum > div,.theme-card,.stats-topbar,.fr-keep";
  const glassOn = () => document.body.classList.contains("glass-ui");
  function animGlass(el, delay, depth){
    if (seen.has(el)) return; seen.add(el);
    const kids = [...el.children].filter(c => !c.matches("script,style"));
    if (depth === 0) run1(el, delay, "tab-in-g"); // вложенные стеклянные панели едут вместе с внешней, не сами по себе
    kids.forEach(c => {
      if (depth < 2 && (c.matches(GLASS) || c.querySelector(GLASS))) animGlass(c, delay + 60, depth + 1);
      else if (!seen.has(c)) { seen.add(c); run1(c, delay + 90, "tab-in-c"); }
    });
  }
  function run1(el, delay, cls){
    el.style.setProperty("--tab-in-d", Math.round(delay) + "ms");
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    const done = () => { el.classList.remove(cls); el.style.removeProperty("--tab-in-d"); };
    el.addEventListener("animationend", e => { if (e.target === el) done(); });
    setTimeout(done, delay + 1500);
  }
  function anim(el, delay, cls = "tab-in"){
    if (seen.has(el)) return;
    if (cls === "tab-in" && glassOn() && (el.matches(GLASS) || el.querySelector(GLASS))) { animGlass(el, delay, 0); return; }
    seen.add(el);
    el.style.setProperty("--tab-in-d", Math.round(delay) + "ms");
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    const done = () => { el.classList.remove(cls); el.style.removeProperty("--tab-in-d"); };
    el.addEventListener("animationend", done, {once:true});
    setTimeout(done, delay + 1400);
  }
  function blocks(tab){
    const list = [];
    const add = el => { if (!el || el.nodeType !== 1 || el.hidden || el.matches("script,style,template,.sk")) return; const r = el.getBoundingClientRect(); if (r.height < 4 || r.width < 4) return; list.push(el); };
    const open = el => el.children.length > 1 && el.getBoundingClientRect().height > innerHeight * .55 && !el.matches(BIG);
    const shared = document.getElementById("shared");
    if (shared && shared.offsetParent) [...shared.children].forEach(add);
    [...tab.children].forEach(ch => { if (open(ch)) [...ch.children].forEach(c2 => { if (open(c2)) [...c2.children].forEach(add); else add(c2); }); else add(ch); });
    return list.filter(el => el.getBoundingClientRect().top < innerHeight * 1.4).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).slice(0, 24);
  }
  // Блоки в одной строке — вместе, строки — с шагом 70 мс.
  function stagger(list, base = 0){
    const tops = [];
    list.forEach(el => {
      if (seen.has(el)) return;
      const t = Math.round(el.getBoundingClientRect().top / 28);
      let i = tops.indexOf(t); if (i < 0) { tops.push(t); i = tops.length - 1; }
      anim(el, base + Math.min(i, 12) * 70);
    });
  }
  function rows(root){
    root.querySelectorAll("table:not(.tv-cards) > tbody").forEach(tb => {
      const r = tb.getBoundingClientRect(); if (r.top > innerHeight * 1.2 || r.height < 4) return;
      [...tb.rows].slice(0, 30).forEach((tr, i) => anim(tr, 60 + i * 22, "row-in"));
    });
    root.querySelectorAll("table.tv-cards > tbody > tr").forEach((tr, i) => { if (i < 24) anim(tr, 40 + i * 30); });
  }
  let watch = null, until = 0, tabNow = null;
  function onLate(ms){
    if (!on || reduce() || Date.now() > until || !tabNow) return;
    let any = false;
    ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1 || !tabNow.contains(n) || n.closest(".tab-in, .row-in, .tab-in-c")) return;
      any = true;
      // Перерисованный график — плавно проступает целиком.
      if (n.matches("svg") && n.closest(".chart, #c-out, .yr-chart, .fc-chart")) anim(n, 40, "fade-in");
    }));
    if (!any) return;
    requestAnimationFrame(() => { stagger(blocks(tabNow), 0); rows(tabNow); });
  }
  function start(tab){
    if (!on || reduce()) return;
    seen = new WeakSet(); tabNow = tab; until = Date.now() + 2200;
    if (!glassOn()) { tab.classList.remove("tab-fade"); void tab.offsetWidth; tab.classList.add("tab-fade"); setTimeout(() => tab.classList.remove("tab-fade"), 700); }
    stagger(blocks(tab), 30); rows(tab);
    if (!watch) { watch = new MutationObserver(onLate); watch.__hub(main); }
  }
  let last = "";
  function check(){
    const tab = main.querySelector(":scope > .tab.active"); if (!tab) return;
    if (tab.id === last) return; last = tab.id;
    start(tab);
  }
  const mo = new MutationObserver(() => requestAnimationFrame(() => requestAnimationFrame(check)));
  main.querySelectorAll(":scope > .tab").forEach(t => mo.observe(t, {attributes:true, attributeFilter:["class"]}));
  last = main.querySelector(":scope > .tab.active")?.id || "";
  // Переключатели внутри вкладки (Участники | Чаты, Хаб | История, разделы настроек) — тоже с анимацией.
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("main .seg[role=tablist] button, main .group-tabs button, main .set-tabs button, main .set-menu [data-scat], main [data-hub-view]");
    if (!b) return;
    setTimeout(() => { const tab = main.querySelector(":scope > .tab.active"); if (tab) start(tab); }, 30);
  }, true);
})();
