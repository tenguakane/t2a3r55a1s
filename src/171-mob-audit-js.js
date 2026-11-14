
/* Шапка мобильного приложения: редкие действия (сброс фильтров, обновление, выход) убраны в меню «⋮», чтобы название раздела не обрезалось */
(function(){
  "use strict";
  const T = window.__tx || (s => s);
  const DOTS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="22" height="22"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>';
  function init(){
    const bar = document.getElementById("ma-bar"), top = bar && bar.querySelector(".ma-top");
    if (!top || document.getElementById("ma-more")) return !!top;
    const src = {freset: document.getElementById("ma-freset"), refresh: document.getElementById("ma-refresh"), exit: document.getElementById("ma-exit")};
    if (!src.refresh || !src.exit) return true;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "ma-ic"; btn.id = "ma-more"; btn.dataset.noIcons = "true";
    btn.setAttribute("aria-label", T("Ещё")); btn.setAttribute("aria-haspopup", "menu"); btn.setAttribute("aria-expanded", "false"); btn.innerHTML = DOTS;
    top.appendChild(btn);
    const menu = document.createElement("div"); menu.id = "ma-more-menu"; menu.setAttribute("role", "menu");
    const item = (key, label) => { const s = src[key]; if (!s) return ""; const svg = s.querySelector("svg"); return `<button type="button" role="menuitem" data-mm="${key}">${svg ? svg.outerHTML : ""}<span>${T(label)}</span></button>`; };
    const EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    menu.innerHTML = `<button type="button" role="menuitem" data-mm="chart" hidden>${EXPAND}<span>${T("График на весь экран")}</span></button>` + item("freset", "Сбросить фильтры") + item("refresh", "Обновить данные") + item("exit", "Выйти из приложения");
    document.body.appendChild(menu);
    bar.classList.add("ma-has-more");
    let openY = 0;
    const close = () => { menu.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
    const open = () => {
      const fr = menu.querySelector('[data-mm="freset"]'); if (fr) fr.hidden = !src.freset || src.freset.hidden;
      const ch = menu.querySelector('[data-mm="chart"]'); if (ch) ch.hidden = !(window.__mz && window.__mz.best());
      openY = window.scrollY; menu.classList.add("open"); btn.setAttribute("aria-expanded", "true");
      const r = btn.getBoundingClientRect(), w = menu.offsetWidth;
      menu.style.top = Math.round(r.bottom + 4) + "px";
      menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, Math.round(r.right - w))) + "px";
    };
    btn.addEventListener("click", e => { e.stopPropagation(); menu.classList.contains("open") ? close() : open(); });
    menu.addEventListener("click", e => { const b = e.target.closest("[data-mm]"); if (!b) return; close(); if (b.dataset.mm === "chart") { if (window.__mz) window.__mz.openBest(); return; } const s = src[b.dataset.mm]; if (s) s.click(); });
    document.addEventListener("click", e => { if (!e.target.closest("#ma-more-menu,#ma-more")) close(); }, true);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    window.addEventListener("scroll", e => { if (!menu.classList.contains("open")) return; const t = e.target; if (t && t.nodeType === 1 && t !== document.documentElement && t !== document.body) return; if (Math.abs(window.scrollY - openY) > 24) close(); }, {passive:true, capture:true});
    window.addEventListener("resize", close, {passive:true});
    return true;
  }
  let tries = 0;
  (function wait(){ if (init() || ++tries > 40) return; setTimeout(wait, 250); })();
})();
