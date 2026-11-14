
/* ===================== Календарь в стиле сайта =====================
   Вместо системного календаря (его нельзя оформить) у полей даты и месяца открывается свой:
   на ПК — панель под полем, на телефоне — окно по центру (Material 3). Учитывает min/max поля,
   работает с клавиатуры: стрелки — по дням, PageUp/PageDown — по месяцам, Enter — выбрать, Esc — закрыть.
   После выбора поле получает значение и события input и change, как от обычного календаря. */
(function(){
  const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const MGEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const MSH = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const WD = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const mobile = matchMedia("(max-width:720px)");
  const pad = n => String(n).padStart(2, "0");
  const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const todayIso = () => { const t = new Date(); return isoOf(t.getFullYear(), t.getMonth(), t.getDate()); };
  const SKIP = "[data-native-date], .chart-settings-panel";
  const PRESETS = [["yday", "Вчера"], ["7", "7 дней"], ["pmonth", "Прошлый месяц"], ["all", "Всё время"]];
  const presetsHtml = () => { const on = document.querySelector("#stats-quick [data-sq].active")?.dataset.sq || ""; return `<div class="dp-pre" role="group" aria-label="Быстрый выбор периода">${PRESETS.map(([k, n]) => `<button type="button" class="dp-q${k === on ? " on" : ""}" data-dpq="${k}">${n}</button>`).join("")}</div>`; };
  let el = null, inp = null, kind = "date", view = "days", vy = 0, vm = 0, focusIso = "", scrim = null;
  // Выбор периода: первый клик — начало, второй — конец; второй клик по тому же дню — только этот день.
  // rng — куда записать период: {get() → [с, по] | null, set(с, по)}; start — выбранное начало; hover — день под курсором.
  let rng = null, start = "", hover = "", cur = null;
  const PAIRS = [["dm-from", "dm-to"], ["mr-f-from", "mr-f-to"]];
  function rangeFor(input){
    if ((input.id === "day" || input.id === "sq-day") && window.__statsRange) return window.__statsRange;
    const pr = PAIRS.find(p => p.includes(input.id));
    if (pr) {
      const a = document.getElementById(pr[0]), b = document.getElementById(pr[1]);
      if (!a || !b) return null;
      return {get:() => a.value && b.value ? [a.value, b.value] : null, set(x, y){
        if (x > y) [x, y] = [y, x];
        [[a, x], [b, y]].forEach(([el, v]) => { if (el.value !== v) { el.value = v; el.dispatchEvent(new Event("input", {bubbles:true})); el.dispatchEvent(new Event("change", {bubbles:true})); } });
      }};
    }
    return null;
  }

  function build(){
    scrim = document.createElement("div"); scrim.className = "dp-scrim"; scrim.hidden = true;
    el = document.createElement("div"); el.className = "dp"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "false");
    document.body.append(scrim, el);
    scrim.addEventListener("click", close);
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    el.addEventListener("mouseover", e => { if (!rng || !start) return; const d = e.target.closest(".dp-day"); if (!d || d.disabled || d.dataset.v === hover) return; hover = d.dataset.v; paintRange(); });
  }
  const inRange = v => (!inp.min || v >= inp.min.slice(0, v.length)) && (!inp.max || v <= inp.max.slice(0, v.length));
  function render(){
    const sel = inp.value || "", t = todayIso();
    let h = "";
    if (view === "days") {
      const first = new Date(vy, vm, 1), lead = (first.getDay() + 6) % 7, dim = new Date(vy, vm + 1, 0).getDate();
      const prevOk = inRange(isoOf(vm ? vy : vy - 1, vm ? vm - 1 : 11, new Date(vy, vm, 0).getDate())), nextOk = inRange(isoOf(vm < 11 ? vy : vy + 1, vm < 11 ? vm + 1 : 0, 1));
      h += `<div class="dp-head"><button type="button" class="dp-nav" data-dp="prev" aria-label="Предыдущий месяц"${prevOk ? "" : " disabled"}>‹</button><button type="button" class="dp-title" data-dp="months" aria-label="Выбрать месяц">${MONTHS[vm]} ${vy}</button><button type="button" class="dp-nav" data-dp="next" aria-label="Следующий месяц"${nextOk ? "" : " disabled"}>›</button></div>`;
      if (rng) h += `<p class="dp-hint" role="status">${start ? "Теперь конец периода — или тот же день, чтобы показать только его" : "Выбери начало периода"}</p>`;
      h += `<div class="dp-wd" aria-hidden="true">${WD.map((w, i) => `<span${i > 4 ? ' class="we"' : ""}>${w}</span>`).join("")}</div><div class="dp-grid" role="grid">`;
      for (let i = 0; i < lead; i++) h += `<span class="dp-pad"></span>`;
      let lo = "", hi = "";
      if (rng) { if (start) { const e2 = hover || start; lo = start < e2 ? start : e2; hi = start < e2 ? e2 : start; } else if (cur) { lo = cur[0]; hi = cur[1]; } }
      for (let d = 1; d <= dim; d++) {
        const v = isoOf(vy, vm, d), ok = inRange(v), wd = (lead + d - 1) % 7;
        const rc = rng && lo ? (v === lo && v === hi ? " sel" : v === lo ? " rs" : v === hi ? " re" : v > lo && v < hi ? " in" : "") : (v === sel ? " sel" : "");
        h += `<button type="button" class="dp-day${rc}${v === t ? " today" : ""}${wd > 4 ? " we" : ""}" data-v="${v}" tabindex="${v === focusIso ? 0 : -1}" aria-label="${d} ${MGEN[vm]} ${vy}"${rc.trim() ? ' aria-selected="true"' : ""}${ok ? "" : " disabled"}>${d}</button>`;
      }
      h += `</div><div class="dp-foot"><button type="button" class="dp-link" data-dp="today"${inRange(t) ? "" : " disabled"}>Сегодня</button><button type="button" class="dp-link" data-dp="close">Закрыть</button></div>`;
    } else {
      const prevOk = !inp.min || String(vy - 1) >= inp.min.slice(0, 4), nextOk = !inp.max || String(vy + 1) <= inp.max.slice(0, 4);
      h += `<div class="dp-head"><button type="button" class="dp-nav" data-dp="yprev" aria-label="Предыдущий год"${prevOk ? "" : " disabled"}>‹</button><span class="dp-title is-static">${vy}</span><button type="button" class="dp-nav" data-dp="ynext" aria-label="Следующий год"${nextOk ? "" : " disabled"}>›</button></div><div class="dp-months" role="grid">`;
      const selM = sel.slice(0, 7), curM = todayIso().slice(0, 7);
      for (let m = 0; m < 12; m++) { const v = `${vy}-${pad(m + 1)}`, ok = inRange(v); h += `<button type="button" class="dp-mon${v === selM ? " sel" : ""}${v === curM ? " today" : ""}" data-m="${m}" tabindex="${m === vm ? 0 : -1}" aria-label="${MONTHS[m]} ${vy}"${ok ? "" : " disabled"}>${MSH[m]}</button>`; }
      h += `</div><div class="dp-foot">${kind === "month" ? `<button type="button" class="dp-link" data-dp="thism">Этот месяц</button>` : `<button type="button" class="dp-link" data-dp="back">К дням</button>`}<button type="button" class="dp-link" data-dp="close">Закрыть</button></div>`;
    }
    { const withPre = !mobile.matches && inp && /^sq-(day|month)$/.test(inp.id); el.classList.toggle("dp-has-pre", withPre); if (withPre) h = presetsHtml() + `<div class="dp-cal">${h}</div>`; }
    el.innerHTML = h;
  }
  // Перекраска подсветки без перерисовки (чтобы не терять наведение)
  function paintRange(){
    const e2 = hover || start, lo = start < e2 ? start : e2, hi = start < e2 ? e2 : start;
    el.querySelectorAll(".dp-day").forEach(d => { const v = d.dataset.v; d.classList.toggle("sel", v === lo && v === hi); d.classList.toggle("rs", v === lo && lo !== hi); d.classList.toggle("re", v === hi && lo !== hi); d.classList.toggle("in", v > lo && v < hi); });
  }
  function place(){
    if (mobile.matches) { el.classList.add("dp-modal"); scrim.hidden = false; el.style.left = el.style.top = ""; return; }
    el.classList.remove("dp-modal"); scrim.hidden = true;
    const r = inp.getBoundingClientRect(), w = el.offsetWidth, hgt = el.offsetHeight;
    let x = Math.min(Math.max(8, r.left), innerWidth - w - 8), y = r.bottom + 6;
    if (y + hgt > innerHeight - 8 && r.top - hgt - 6 > 8) y = r.top - hgt - 6;
    el.style.left = Math.round(x) + "px"; el.style.top = Math.round(Math.max(8, y)) + "px";
  }
  function focusCur(){ const b = el.querySelector('[tabindex="0"]:not([disabled])') || el.querySelector(".dp-day:not([disabled]), .dp-mon:not([disabled])"); b && b.focus({preventScroll:true}); }
  function open(input){
    if (!el) build();
    inp = input; kind = input.type === "month" ? "month" : "date"; view = kind === "month" ? "months" : "days";
    rng = kind === "date" ? rangeFor(input) : null; start = ""; hover = ""; cur = rng ? rng.get() : null;
    if (cur && cur[0] === cur[1]) cur = [cur[0], cur[0]];
    const v = input.value || (kind === "month" ? todayIso().slice(0, 7) : todayIso());
    const v0 = cur ? cur[1] : v;
    vy = +v0.slice(0, 4); vm = +v0.slice(5, 7) - 1; focusIso = kind === "date" ? (cur ? cur[1] : input.value || todayIso()) : "";
    el.setAttribute("aria-label", kind === "month" ? "Выбор месяца" : rng ? "Выбор периода" : "Выбор даты");
    el.hidden = false; el.classList.toggle("glass", document.body.classList.contains("glass-ui"));
    render(); place(); focusCur();
    input.setAttribute("aria-expanded", "true");
  }
  function close(){
    if (!el || el.hidden) return;
    el.hidden = true; scrim.hidden = true;
    if (inp) { inp.setAttribute("aria-expanded", "false"); try { inp.focus({preventScroll:true}); } catch (e) {} }
    inp = null; rng = null; start = ""; hover = "";
  }
  function commit(v){
    const target = inp; close();
    if (!target || target.value === v) return;
    target.value = v;
    target.dispatchEvent(new Event("input", {bubbles:true}));
    target.dispatchEvent(new Event("change", {bubbles:true}));
  }
  function shiftMonth(n){ vm += n; while (vm < 0) { vm += 12; vy--; } while (vm > 11) { vm -= 12; vy++; } }
  function onClick(e){
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.dpq) { const k = b.dataset.dpq; close(); document.querySelector(`#stats-quick [data-sq="${k}"]`)?.click(); return; }
    const a = b.dataset.dp;
    if (b.dataset.v) {
      if (!rng) { commit(b.dataset.v); return; }
      const v = b.dataset.v;
      if (!start) { start = v; hover = v; focusIso = v; render(); focusCur(); return; }
      const a = start < v ? start : v, z = start < v ? v : start, target = rng; close(); target.set(a, z); return;
    }
    if (b.dataset.m) { const m = +b.dataset.m; if (kind === "month") { commit(`${vy}-${pad(m + 1)}`); return; } vm = m; view = "days"; focusIso = isoOf(vy, vm, Math.min(+(focusIso.slice(8, 10) || 1), new Date(vy, vm + 1, 0).getDate())); render(); place(); focusCur(); return; }
    if (a === "prev" || a === "next") { shiftMonth(a === "prev" ? -1 : 1); focusIso = isoOf(vy, vm, Math.min(+(focusIso.slice(8, 10) || 1), new Date(vy, vm + 1, 0).getDate())); render(); place(); el.querySelector(`[data-dp="${a}"]`)?.focus(); return; }
    if (a === "yprev" || a === "ynext") { vy += a === "yprev" ? -1 : 1; render(); el.querySelector(`[data-dp="${a}"]`)?.focus(); return; }
    if (a === "months") { view = "months"; render(); place(); focusCur(); return; }
    if (a === "back") { view = "days"; render(); place(); focusCur(); return; }
    if (a === "today") { if (rng) { const t = todayIso(), target = rng; close(); target.set(t, t); } else commit(todayIso()); return; }
    if (a === "thism") { commit(todayIso().slice(0, 7)); return; }
    if (a === "close") close();
  }
  function onKey(e){
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") { // фокус не уходит из окна
      const f = [...el.querySelectorAll("button:not([disabled])")].filter(b => b.tabIndex !== -1 || b === document.activeElement);
      if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      return;
    }
    const day = e.target.closest(".dp-day"), mon = e.target.closest(".dp-mon");
    if (day) {
      const step = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7}[e.key];
      let d = new Date(+focusIso.slice(0, 4), +focusIso.slice(5, 7) - 1, +focusIso.slice(8, 10));
      if (step) d.setDate(d.getDate() + step);
      else if (e.key === "PageUp" || e.key === "PageDown") d.setMonth(d.getMonth() + (e.key === "PageUp" ? -1 : 1));
      else if (e.key === "Home") d.setDate(d.getDate() - (d.getDay() + 6) % 7);
      else if (e.key === "End") d.setDate(d.getDate() + 6 - (d.getDay() + 6) % 7);
      else return;
      e.preventDefault();
      const v = isoOf(d.getFullYear(), d.getMonth(), d.getDate()); if (!inRange(v)) return;
      focusIso = v; vy = d.getFullYear(); vm = d.getMonth(); if (rng && start) hover = v; render(); focusCur();
    } else if (mon) {
      const step = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-3, ArrowDown:3}[e.key]; if (!step) return;
      e.preventDefault(); const n = Math.min(11, Math.max(0, +mon.dataset.m + step)); el.querySelector(`.dp-mon[data-m="${n}"]`)?.focus();
    }
  }
  const eligible = t => t && t.matches && t.matches('input[type="date"], input[type="month"]') && !t.disabled && !t.readOnly && !t.closest(SKIP);
  // Клик по полю (и по значку календаря в нём) открывает наш календарь вместо системного
  document.addEventListener("click", e => { const t = e.target; if (!eligible(t)) return; e.preventDefault(); if (el && !el.hidden && inp === t) { close(); return; } open(t); }, true);
  // Системный календарь не должен успеть открыться: касание на телефоне и нажатие на значок календаря на ПК гасятся сразу
  document.addEventListener("pointerdown", e => {
    const t = e.target; if (!eligible(t)) return;
    if (e.pointerType === "touch" || e.pointerType === "pen") { e.preventDefault(); return; }
    const r = t.getBoundingClientRect(); if (e.clientX > r.right - 34) e.preventDefault();
  }, true);
  // С клавиатуры: Enter, пробел, Alt+↓ или F4 на поле. Ввод цифр в поле работает как обычно.
  document.addEventListener("keydown", e => { const t = e.target; if (!eligible(t)) return; if (e.key === "Enter" || e.key === " " || e.key === "F4" || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); open(t); } }, true);
  // Клик мимо — закрыть; прокрутка и ресайз — переставить или закрыть
  document.addEventListener("pointerdown", e => { if (!el || el.hidden) return; if (el.contains(e.target) || e.target === inp || (scrim && e.target === scrim)) return; close(); }, true);
  addEventListener("resize", () => { if (el && !el.hidden) place(); });
  addEventListener("scroll", () => { if (el && !el.hidden && !mobile.matches) { if (!inp || !inp.isConnected || !inp.offsetParent) close(); else place(); } }, {passive:true, capture:true});
  window.__datePicker = {open, close};
})();
