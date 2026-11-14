
(() => {
  const KEY = "chatstats.dsColony.v1";
  let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  if (window.__TABLO) on = true;
  document.body.classList.toggle("ds", on);
  // Словесный знак: «Colony» — жирно, «Stats» — тише
  const h1 = document.querySelector("header h1");
  if (h1 && !h1.querySelector(".wm-a")) { const t = h1.textContent.trim(), m = t.match(/^(\S+)\s+(.+)$/); if (m) h1.innerHTML = `<span class="wm-a">${m[1]}</span><span class="wm-b">${m[2]}</span>`; }
  // Переключатель в «Настройки → Оформление»
  const anchor = document.getElementById("theme-grid");
  if (anchor && !document.getElementById("set-ds")) {
    const box = document.createElement("div"); box.className = "filters";
    box.innerHTML = `<label class="checkline" title="Табло вместо карточек, вкладки с подчёркиванием, фильтры строкой, спокойный фон с сеткой точек"><input type="checkbox" id="set-ds"${on ? " checked" : ""}>Стиль «Колония»</label>`;
    anchor.after(box);
    box.querySelector("input").addEventListener("change", e => { on = e.target.checked; document.body.classList.toggle("ds", on); try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {} });
  }
})();
