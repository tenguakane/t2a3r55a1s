
/* ===================== Скрытие столбцов: кнопка «Столбцы» над каждой таблицей ===================== */
(function(){
  const KEY = "chatstats.hiddenCols.v1", MAX_COLS = 40;
  const SKIP = "#tab-settings, .chart-settings-panel, .msel-pop, .hc-pop, [data-no-hc], #ma-fsheet, .s-cloud-dlg";
  let H = {};
  try { const j = JSON.parse(localStorage.getItem(KEY) || "{}"); if (j && typeof j === "object") H = j; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(H)); } catch (e) {} };
  const style = document.createElement("style"); style.id = "hc-rules"; document.head.appendChild(style);
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
  const clean = t => String(t || "").replace(/[▲▼△▽↑↓⇅⬍↕]/g, "").replace(/\s+/g, " ").trim();
  let uid = 0;
  // Ключ таблицы: её id, иначе вкладка + порядковый номер таблицы без id на этой вкладке.
  function keyOf(t){
    if (t.id) return t.id;
    const sec = t.closest("section.tab, .tab, main") || document.body;
    const list = [...sec.querySelectorAll("table:not([id])")].filter(x => !x.closest(SKIP));
    return (sec.id || "main") + ":" + list.indexOf(t);
  }
  function headRow(t){
    const th = t.tHead; if (!th || th.rows.length !== 1) return null;
    const r = th.rows[0];
    if (r.cells.length < 2 || r.cells.length > MAX_COLS || [...r.cells].some(c => c.colSpan > 1 || c.rowSpan > 1)) return null;
    return r;
  }
  function colsOf(t){
    const r = headRow(t); if (!r) return null;
    return [...r.cells].map((c, i) => clean(c.dataset.hcName || c.textContent) || `Столбец ${i + 1}`);
  }
  function hostOf(t){ return t.closest(".wrap") || t.parentElement; }
  function eligible(t){
    if (!t.isConnected || t.closest(SKIP) || !t.closest("main")) return false;
    return !!colsOf(t);
  }
  function hiddenIdx(t, cols){
    const set = new Set(H[t.dataset.hcKey] || []);
    const idx = []; cols.forEach((n, i) => { if (set.has(n)) idx.push(i); });
    if (idx.length >= cols.length) idx.pop(); // хотя бы один столбец остаётся
    return idx;
  }
  // Строки с объединёнными ячейками (разделители годов, «Нет данных», итоги) правим вручную.
  function fixSpans(t, hid){
    const hs = new Set(hid);
    t.querySelectorAll(":scope > :is(thead,tbody,tfoot) > tr").forEach(tr => {
      const cells = [...tr.cells];
      if (!cells.some(c => c.colSpan > 1 || c.dataset.hcCs)) return;
      let col = 0;
      cells.forEach(c => {
        const span = Number(c.dataset.hcCs || c.colSpan) || 1;
        let vis = 0; for (let k = col; k < col + span; k++) if (!hs.has(k)) vis++;
        if (span > 1 || c.dataset.hcCs) {
          if (!c.dataset.hcCs) c.dataset.hcCs = String(span);
          c.colSpan = Math.max(1, vis);
        }
        c.classList.toggle("hc-cell-off", vis === 0);
        col += span;
      });
    });
  }
  function rules(){
    let css = "";
    document.querySelectorAll("table[data-hc]").forEach(t => { try {
      const cols = colsOf(t); if (!cols) return;
      const hid = hiddenIdx(t, cols);
      if (hid.length) {
        const sel = hid.map(i => `table[data-hc="${t.dataset.hc}"] > :is(thead,tbody,tfoot) > tr:not(:has(> [colspan], > [data-hc-cs])) > :nth-child(${i + 1})`).join(",");
        // Вместе с ячейками прячем и <col> с сохранённой шириной — иначе справа остаётся пустой столбец.
        const colSel = hid.map(i => `table[data-hc="${t.dataset.hc}"] > colgroup > col:nth-child(${i + 1})`).join(",");
        css += sel + "," + colSel + "{display:none!important}\n";
      }
      if (hid.length || t.querySelector("[data-hc-cs]")) fixSpans(t, hid);
      const b = t.__hcBtn, bb = b && b.querySelector("b"); if (b) b.classList.toggle("has", hid.length > 0); if (bb) { bb.textContent = hid.length ? String(hid.length) : ""; bb.hidden = !hid.length; }
    } catch (e) {} }); // ошибка в одной таблице не мешает остальным
    if (style.textContent !== css) style.textContent = css;
  }
  function attach(t){
    if (!t.dataset.hc) t.dataset.hc = String(++uid);
    t.dataset.hcKey = keyOf(t);
    const host = hostOf(t); if (!host) return;
    let bar = host.previousElementSibling;
    if (!bar || !bar.classList.contains("hc-bar") || bar.dataset.for !== t.dataset.hc) bar = document.querySelector(`.hc-bar.hc-moved[data-for="${t.dataset.hc}"]`) || bar;
    if (!bar || !bar.classList.contains("hc-bar") || bar.dataset.for !== t.dataset.hc) {
      bar = document.createElement("div"); bar.className = "hc-bar"; bar.dataset.for = t.dataset.hc; bar.dataset.noExport = "1";
      bar.innerHTML = `<button type="button" class="hc-btn" aria-haspopup="true" aria-expanded="false" title="Настройка таблицы: вид, столбцы и строки">${EYE}Таблица<b hidden></b></button>`;
      host.before(bar);
    }
    t.__hcBtn = bar.querySelector(".hc-btn");
  }
  let pending = 0;
  function scan(){
    pending = 0;
    document.querySelectorAll("main table").forEach(t => { try { if (eligible(t)) attach(t); } catch (e) {} });
    // Убираем кнопки, чья таблица исчезла.
    document.querySelectorAll(".hc-bar").forEach(b => { const t = document.querySelector(`table[data-hc="${b.dataset.for}"]`); if (!t || (hostOf(t)?.previousElementSibling !== b && !b.classList.contains("hc-moved"))) b.remove(); });
    rules();
  }
  const later = () => { if (!pending) pending = setTimeout(scan, 60); };
  // ---------- Меню «Столбцы» ----------
  let pop = null, popTable = null, popBtn = null;
  function closePop(){ if (pop) { pop.remove(); pop = null; } if (popBtn) popBtn.setAttribute("aria-expanded", "false"); popTable = popBtn = null; }
  function setHidden(t, names){ const k = t.dataset.hcKey; if (names.length) H[k] = names; else delete H[k]; save(); rules(); }
  function drawPop(){
    const t = popTable, cols = colsOf(t); if (!cols) { closePop(); return; }
    const set = new Set(H[t.dataset.hcKey] || []), shown = cols.filter(n => !set.has(n)).length;
    pop.innerHTML = `<h4>Столбцы таблицы</h4><div class="hc-list">${cols.map((n, i) => {
      const on = !set.has(n), last = on && shown === 1;
      return `<label class="hc-item${on ? "" : " off"}"${last ? ' title="Последний видимый столбец скрыть нельзя"' : ""}><input type="checkbox" data-hc-col="${i}"${on ? " checked" : ""}${last ? " disabled" : ""}><span>${escH(n)}</span></label>`;
    }).join("")}</div><div class="hc-foot"><button type="button" data-hc-all${set.size ? "" : " disabled"}>Показать все</button></div>`;
  }
  function place(){
    if (!pop || !popBtn) return;
    const r = popBtn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let x = Math.min(innerWidth - w - 8, Math.max(8, r.right - w)), y = r.bottom + 6;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6);
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function openPop(btn){
    const forId = btn.dataset.hcFor || btn.closest(".hc-bar")?.dataset.for, t = forId && document.querySelector(`table[data-hc="${forId}"]`); if (!t) return;
    if (popBtn === btn) { closePop(); return; }
    closePop();
    popTable = t; popBtn = btn; btn.setAttribute("aria-expanded", "true");
    pop = document.createElement("div"); pop.className = "hc-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Настройка таблицы");
    document.body.appendChild(pop); drawPop(); place();
    pop.addEventListener("change", e => {
      const i = Number(e.target.dataset.hcCol); if (!Number.isFinite(i)) return;
      const cols = colsOf(popTable), set = new Set(H[popTable.dataset.hcKey] || []);
      if (e.target.checked) set.delete(cols[i]); else set.add(cols[i]);
      setHidden(popTable, cols.filter(n => set.has(n))); drawPop();
    });
    pop.addEventListener("click", e => { if (e.target.closest("[data-hc-all]")) { setHidden(popTable, []); drawPop(); } });
  }
  document.addEventListener("click", e => {
    const b = e.target.closest(".hc-btn"); if (b) { openPop(b); return; }
    if (pop && !e.target.closest(".hc-pop")) closePop();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && pop) closePop(); });
  addEventListener("resize", () => place());
  addEventListener("scroll", () => place(), {passive:true, capture:true});
  // Быстро: правый клик по заголовку столбца на ПК — скрыть его.
  document.addEventListener("contextmenu", e => {
    const th = e.target.closest && e.target.closest("thead th"); if (!th || e.shiftKey) return;
    const t = th.closest("table[data-hc]"); if (!t || !headRow(t)) return;
    const cols = colsOf(t), set = new Set(H[t.dataset.hcKey] || []), n = cols[th.cellIndex];
    if (!n || cols.filter(x => !set.has(x)).length <= 1) return;
    e.preventDefault(); set.add(n); setHidden(t, cols.filter(x => set.has(x)));
    if (typeof toastMsg === "function") { try { toastMsg(`Столбец «${n}» скрыт. Вернуть — кнопка «Таблица» над таблицей`); } catch (err) {} }
  });
  const root = document.querySelector("main") || document.body;
  new MutationObserver(ms => { if (ms.some(m => !(m.target.closest && m.target.closest(".hc-bar, .hc-pop")))) later(); }).observe(root, {childList:true, subtree:true});
  // страховка: строки «Всего» с объединёнными ячейками ещё раз сверяются со скрытыми столбцами
  setInterval(() => { let need = false; document.querySelectorAll("main table[data-hc]").forEach(t => { if ((H[t.dataset.hcKey] || []).length && t.querySelector(":scope > tfoot > tr > [colspan]:not([data-hc-cs])")) need = true; }); if (need) later(); }, 1500);
  scan();
})();

/* ===================== Топ месяцев и дней: топ-25, поиск, «показать все» ===================== */
(function(){
  const N = 25;
  const GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const WDF = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
  const norm = s => String(s).toLowerCase().replace(/ё/g, "е");
  // Каждое слово запроса должно совпасть с началом какого-нибудь слова описания.
  function match(q, hay){
    const words = norm(hay).split(/\s+/).filter(Boolean);
    return norm(q).split(/[\s,;]+/).filter(Boolean).every(w => words.some(x => x.startsWith(w)));
  }
  function monthHay(k){
    const [y, m] = k.split("-"), i = Number(m) - 1;
    return `${MONTHS[i]} ${GEN[i]} ${y} ${m}.${y} ${k} ${m}/${y} ${Number(m)}.${y}`;
  }
  function dayHay(k){
    const [y, m, d] = k.split("-"), i = Number(m) - 1, wd = WDF[new Date(Date.UTC(+y, i, +d)).getUTCDay()];
    return `${d}.${m}.${y} ${Number(d)}.${Number(m)}.${y} ${d}.${m} ${Number(d)}.${Number(m)} ${Number(d)} ${d} ${GEN[i]} ${MONTHS[i]} ${y} ${k} ${wd}`;
  }
  window.__topLimit = {
    months:{all:false}, days:{all:false},
    // Отбираем строки для показа: поиск — все совпадения, иначе первые 25 (или все, если раскрыто).
    take(kind, list, keep){
      const st = this[kind], q = (document.getElementById(kind === "months" ? "m-q" : "d-q")?.value || "").trim();
      let out = list;
      if (q) out = out.filter(e => (keep && keep(e)) || match(q, kind === "months" ? monthHay(e[0]) : dayHay(e[0])));
      const total = out.length;
      if (!q && !st.all) out = out.slice(0, N + (keep && out[0] && keep(out[0]) ? 1 : 0));
      const more = document.getElementById(kind === "months" ? "m-more" : "d-more");
      if (more) {
        const what = kind === "months" ? ["месяц", "месяца", "месяцев"] : ["день", "дня", "дней"];
        if (q) more.innerHTML = total ? `<span>Найдено: ${fmt(total)} ${wordForm(total, what)}</span>` : "";
        else if (total <= N + 1) more.innerHTML = "";
        else more.innerHTML = st.all
          ? `<span>Показаны все ${fmt(total)} ${wordForm(total, what)}</span><button type="button" class="mini" data-top-less="${kind}">Свернуть до топ-${N}</button>`
          : `<span>Показаны первые ${N} из ${fmt(total)}</span><button type="button" class="mini" data-top-all="${kind}">Показать все (${fmt(total)})</button>`;
      }
      return {list:out, q, total};
    }
  };
  const rer = kind => { if (kind === "months") renderMonths(); else renderDays(); };
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-top-all]"), l = e.target.closest("[data-top-less]");
    if (a) { window.__topLimit[a.dataset.topAll].all = true; rer(a.dataset.topAll); }
    else if (l) {
      const k = l.dataset.topLess; window.__topLimit[k].all = false; rer(k);
      document.getElementById(k === "months" ? "months-table" : "days-table")?.scrollIntoView({block:"start", behavior:"smooth"});
    }
  });
  let t = 0;
  document.addEventListener("input", e => {
    const id = e.target.id; if (id !== "m-q" && id !== "d-q") return;
    clearTimeout(t); t = setTimeout(() => rer(id === "m-q" ? "months" : "days"), 120);
  });
})();
