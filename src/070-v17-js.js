
/* ===================== Статистика: «Сегодня» — к самым свежим данным; «Столбцы» в строке «Участники / Чаты» на телефоне ===================== */
(function(){
  const sub = document.getElementById("stats-subnav"), bar = sub && sub.closest(".stats-topbar");
  if (!sub || !bar || document.getElementById("st-today")) return;
  const tools = document.createElement("div"); tools.className = "st-tools";
  tools.innerHTML = `<button type="button" class="st-today" id="st-today" title="Данные за сегодня — заново загрузить самые свежие"><i aria-hidden="true"></i>Сегодня</button>`
    + `<button type="button" class="hc-btn" id="st-hc" aria-haspopup="true" aria-expanded="false" title="Скрыть или вернуть столбцы"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12s3.5-6.5 9-6.5 9 6.5 9 6.5-3.5 6.5-9 6.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.6"/></svg><b hidden></b></button>`;
  sub.after(tools);
  const btn = tools.querySelector("#st-today"), hc = tools.querySelector("#st-hc");
  const pad = n => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const curMode = () => (document.querySelector("#mode button.active") || {}).dataset?.m || "day";
  function sync(){
    const on = curMode() === "day" && (document.getElementById("day")?.value || "") === today();
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    // Счётчик скрытых столбцов у видимой таблицы.
    const t = visibleTable(), b = t && document.querySelector(`.hc-bar[data-for="${t.dataset.hc}"] .hc-btn b`);
    const n = b && !b.hidden ? b.textContent : "";
    hc.querySelector("b").textContent = n; hc.querySelector("b").hidden = !n; hc.classList.toggle("has", !!n);
    hc.hidden = !t;
  }
  function visibleTable(){ return [...document.querySelectorAll("#tab-stats table[data-hc]")].find(t => t.offsetParent && !t.closest(".sticky-table-head")) || null; }
  btn.addEventListener("click", () => {
    const d = document.getElementById("day"); if (d) d.value = today();
    const sq = document.getElementById("sq-day"); if (sq) sq.value = today();
    btn.classList.add("busy"); setTimeout(() => btn.classList.remove("busy"), 900);
    // Нажатие на «День» заново загружает данные с сервера — так видны самые новые сообщения.
    document.querySelector('#mode button[data-m="day"]')?.click();
    setTimeout(sync, 0);
  });
  // «Столбцы»: перед открытием меню указываем, какая таблица сейчас на экране.
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#st-hc")) return;
    const t = visibleTable(); if (t) hc.dataset.hcFor = t.dataset.hc;
  }, true);
  const mode = document.getElementById("mode"); if (mode) new MutationObserver(sync).observe(mode, {subtree:true, attributes:true, attributeFilter:["class"]});
  document.getElementById("day")?.addEventListener("change", () => setTimeout(sync, 0));
  sub.addEventListener("click", () => setTimeout(sync, 60));
  const tab = document.getElementById("tab-stats"); if (tab) new MutationObserver(() => { clearTimeout(sync.t); sync.t = setTimeout(sync, 120); }).observe(tab, {childList:true, subtree:true});
  setInterval(() => { if (tab?.classList.contains("active")) sync(); }, 2000);
  sync();
})();

/* ===================== Таблицы: убираем горизонтальную прокрутку, если таблица на самом деле помещается ===================== */
(function(){
  let t = 0;
  function fit(){
    t = 0;
    document.querySelectorAll("main .wrap").forEach(w => {
      if (!w.offsetParent) return;
      // Сначала снимаем наши правки и меряем «честно».
      w.classList.remove("wrap-fit");
      if (w.dataset.fitW) {
        // Возвращаем прежнюю ширину, только если её с тех пор никто не менял (например, перетаскиванием края таблицы).
        if (w.style.getPropertyValue("width") === w.dataset.fitMine) { w.style.removeProperty("width"); if (w.dataset.fitW !== "-") w.style.setProperty("width", w.dataset.fitW, "important"); }
        delete w.dataset.fitW; delete w.dataset.fitMine;
      }
      const over = w.scrollWidth - w.clientWidth;
      if (over <= 0) return;
      if (over <= 8) { w.classList.add("wrap-fit"); return; } // переполнение на пару пикселей — округление и рамки
      // Обёртка у́же, чем позволяет страница (сохранённая ширина таблицы) — расширяем её, если таблица влезает.
      const parent = w.parentElement; if (!parent) return;
      const cs = getComputedStyle(parent), room = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const need = w.scrollWidth + (w.offsetWidth - w.clientWidth) + 2;
      if (need <= room + 1 && w.getBoundingClientRect().width < room - 1) {
        w.dataset.fitW = w.style.getPropertyValue("width") || "-";
        w.style.setProperty("width", Math.ceil(need) + "px", "important"); w.dataset.fitMine = Math.ceil(need) + "px";
        if (w.scrollWidth - w.clientWidth > 0 && w.scrollWidth - w.clientWidth <= 8) w.classList.add("wrap-fit");
      }
    });
  }
  const later = () => { if (!t) t = setTimeout(fit, 150); };
  addEventListener("resize", later);
  const main = document.querySelector("main");
  if (main) new MutationObserver(ms => { if (ms.some(m => !(m.target.closest && m.target.closest(".hc-pop, .msel-pop")))) later(); }).__hub(main);
  document.addEventListener("click", () => setTimeout(later, 50));
  later();
})();
