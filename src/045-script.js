
/* Рекорды: таблица или график; Время: таблицы или визуализация */
(function(){
  const bind = (secId, segSel, attr, cls, key, def) => {
    const sec = document.getElementById(secId); if (!sec) return;
    let v = def; try { const x = localStorage.getItem(key); if (x) v = x; } catch (e) {}
    const apply = () => {
      Object.values(cls).forEach(c => sec.classList.remove(c)); sec.classList.add(cls[v] || cls[def]);
      document.querySelectorAll(`${segSel} [${attr}]`).forEach(b => b.classList.toggle("active", b.getAttribute(attr) === v));
      setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} }, 50);
    };
    document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(`${segSel} [${attr}]`); if (!b) return; v = b.getAttribute(attr); try { localStorage.setItem(key, v); } catch (err) {} apply(); });
    apply();
  };
  bind("tab-records", "#record-view", "data-rec-view", {table:"rec-view-table", chart:"rec-view-chart"}, "chatstats.recView.v1", "table");
  bind("tab-time", "#time-view", "data-time-view", {tables:"tm-view-tables", charts:"tm-view-charts"}, "chatstats.timeView.v1", "tables");
})();
