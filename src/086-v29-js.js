
/* ===================== v29: настройки по устройству и свайпы на телефоне ===================== */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const mq = window.matchMedia("(max-width:720px)");

  /* ---------- Открыт раздел «Телефон» на компьютере — переключаемся на «Оформление» ---------- */
  function fixCat(){
    const tab = $("tab-settings"); if (!tab || mq.matches || tab.dataset.scat !== "mobile") return;
    tab.querySelector('.set-tabs [data-scat="look"]')?.click();
  }
  fixCat(); setTimeout(fixCat, 500);
  mq.addEventListener?.("change", fixCat);

  /* ---------- Свайпы ---------- */
  const curTab = () => (document.querySelector("main > .tab.active")?.id || "").replace(/^tab-/, "");
  const menuOpen = () => !!$("ma-menu")?.classList.contains("open");
  const SKIP = "input,textarea,select,[contenteditable],svg,canvas,.msel-pop,.hc-pop,.ma-panel,dialog,[role=dialog],[data-no-swipe],.pick .pop";
  // Свайп не перехватываем, если палец лёг на то, что само листается вбок (таблица, лента чипов, сегменты).
  function sideScroller(el){
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2) { const ox = getComputedStyle(n).overflowX; if (ox === "auto" || ox === "scroll") return true; }
    }
    return false;
  }
  function anim(dir){
    const b = document.body; b.classList.remove("sw-from-l", "sw-from-r");
    void b.offsetWidth; b.classList.add(dir > 0 ? "sw-from-r" : "sw-from-l");
    clearTimeout(anim.t); anim.t = setTimeout(() => b.classList.remove("sw-from-l", "sw-from-r"), 320);
  }
  function tapMa(k){ const b = document.querySelector(`#ma-tabs [data-ma="${k}"]`); if (b) { b.click(); return true; } return false; }
  // dir: +1 — следующая вкладка (свайп справа налево), -1 — назад (свайп слева направо)
  function navigate(dir){
    const tab = curTab(), settings = $("tab-settings");
    // Настройки: слева направо — на шаг назад (раздел → список разделов → меню).
    if (tab === "settings" && !menuOpen()) {
      if (dir > 0) return false;
      if (settings?.classList.contains("sm-in")) { settings.querySelector(".set-back")?.click(); anim(-1); return true; }
      if (document.body.classList.contains("mapp")) return tapMa("menu");
      return false;
    }
    if (document.body.classList.contains("mapp")) {
      const ORDER = ["hub", "profile", "stats", "charts", "menu"];
      let i = menuOpen() ? 4 : ORDER.indexOf(tab);
      if (i < 0) { // раздел, открытый из «Меню»: назад — в меню
        if (dir < 0) return tapMa("menu");
        return false;
      }
      const j = i + dir; if (j < 0 || j >= ORDER.length) return false;
      const k = ORDER[j];
      if (k === "menu") return tapMa("menu");
      tapMa(k); anim(dir); return true;
    }
    // Обычная мобильная версия: по порядку вкладок в шапке.
    const seen = new Set(), list = [...document.querySelectorAll("header nav button[data-tab]")].filter(b => b.offsetParent && !seen.has(b.dataset.tab) && seen.add(b.dataset.tab));
    const i = list.findIndex(b => b.dataset.tab === tab), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return false;
    list[j].click(); scrollTo({top:0}); anim(dir); return true;
  }
  let st = null;
  document.addEventListener("touchstart", e => {
    st = null;
    if (!mq.matches || e.touches.length !== 1) return;
    if ($("ma-fsheet")?.classList.contains("open")) return;
    const t = e.touches[0], el = e.target;
    if (t.clientX < 24 || t.clientX > innerWidth - 24) return; // края экрана — системные жесты «назад/вперёд»
    if (el.closest && el.closest(SKIP)) return;
    if (sideScroller(el)) return;
    st = {x:t.clientX, y:t.clientY, t:Date.now()};
  }, {passive:true});
  document.addEventListener("touchmove", e => { if (st && e.touches.length > 1) st = null; }, {passive:true});
  document.addEventListener("touchend", e => {
    const s = st; st = null; if (!s) return;
    const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Date.now() - s.t > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
    const sel = window.getSelection && String(window.getSelection()); if (sel) return;
    navigate(dx < 0 ? 1 : -1);
  }, {passive:true});
  document.addEventListener("touchcancel", () => { st = null; }, {passive:true});
  window.__swipeNav = navigate;
})();
