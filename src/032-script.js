
/* Сворачиваемые блоки в окне настройки графика (состояние запоминается; «Готовые палитры» по умолчанию свёрнуты). */
(function(){
  const box = document.getElementById("chart-settings-content"); if (!box) return;
  const KEY = "chatstats.chartSettingsCollapsed.v1";
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  const isCollapsed = k => k in st ? !!st[k] : k === "Готовые палитры";
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  function decorate(){
    box.querySelectorAll(".chart-setting-group > h3:not([data-cs-init])").forEach(h => {
      h.dataset.csInit = "1"; h.tabIndex = 0; h.setAttribute("role", "button");
      const g = h.parentElement, k = h.textContent.trim().replace(/\s+—.*$/, "");
      h.dataset.csKey = k;
      const apply = () => { const c = isCollapsed(k); g.classList.toggle("cs-collapsed", c); h.setAttribute("aria-expanded", String(!c)); };
      apply();
      const toggle = () => { st[k] = !isCollapsed(k); save(); box.querySelectorAll(`.chart-setting-group > h3[data-cs-key="${CSS.escape(k)}"]`).forEach(x => { const c = isCollapsed(k); x.parentElement.classList.toggle("cs-collapsed", c); x.setAttribute("aria-expanded", String(!c)); }); };
      h.addEventListener("click", toggle);
      h.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
    box.querySelectorAll(".hint:not([title])").forEach(p => { p.title = p.textContent.trim(); });
  }
  new MutationObserver(decorate).observe(box, {childList: true, subtree: true});
  decorate();
})();
