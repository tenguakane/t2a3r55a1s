
(function(){
  const body = document.body;
  /* 1. Правая панель сама сворачивается, когда в ней нет фильтров */
  function frSync(){
    const b = document.getElementById("fd-body"); if (!b || !body.classList.contains("filters-right")) return;
    let user = false; try { user = localStorage.getItem("chatstats.filtersRightCollapsed.v1") === "1"; } catch (e) {}
    const want = user || b.childElementCount === 0;
    if (body.classList.contains("fr-collapsed") !== want) body.classList.toggle("fr-collapsed", want);
  }
  new MutationObserver(frSync).observe(body, {attributes:true, attributeFilter:["class"]});
  const dr = document.getElementById("filter-drawer"); if (dr) new MutationObserver(frSync).observe(dr, {childList:true, subtree:true});
  setInterval(frSync, 700);
  /* 4. Пустой профиль: одна заметка вместо ряда нулей */
  const ZERO = /^[\s0—–\-]*(дн\S*|сообщ\S*|д\.)?\s*$/i;
  function pfEmpty(){
    const tab = document.getElementById("tab-profile"); if (!tab || !tab.classList.contains("active")) return;
    tab.querySelectorAll(".pf-empty-note").forEach(n => { const pv = n.previousElementSibling; if (!pv || !pv.classList.contains("tiles") || pv.style.display !== "none") n.remove(); });
    tab.querySelectorAll(".tiles").forEach(t => {
      if (t.closest(".p-hero,[data-no-export]")) return;
      const nums = [...t.querySelectorAll(".num")]; if (nums.length < 2) return;
      const allZero = nums.every(n => ZERO.test(n.textContent.replace(/\s+/g, " ").trim()));
      if (allZero && t.style.display !== "none") { t.style.display = "none"; const n = document.createElement("div"); n.className = "pf-empty-note"; n.textContent = "Пока нет данных — появятся после первых сообщений."; t.after(n); }
    });
  }
  /* затухание у рядов, которые обрезаются */
  function fades(){
    document.querySelectorAll(".sec-nav,#bd-nav,.series-chips").forEach(e => {
      const ov = e.scrollWidth > e.clientWidth + 2 && e.scrollLeft + e.clientWidth < e.scrollWidth - 2;
      e.classList.toggle("ov-fade", ov);
    });
  }
  document.addEventListener("scroll", e => { if (e.target.classList && e.target.matches && e.target.matches(".sec-nav,#bd-nav,.series-chips")) fades(); }, true);
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(() => { pfEmpty(); fades(); }, 200); };
  new MutationObserver(later).__hub(document.querySelector("main") || body);
  setInterval(() => { pfEmpty(); fades(); }, 2000);
})();
