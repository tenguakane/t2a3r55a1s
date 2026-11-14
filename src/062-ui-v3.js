
/* ===================== Быстрый период в «Статистике» (рядом с «Участники / Чаты») ===================== */
(function(){
  const $ = id => document.getElementById(id);
  const sub = $("stats-subnav"); if (!sub || !$("mode")) return;
  const bar = document.createElement("div"); bar.className = "stats-topbar";
  sub.before(bar); bar.appendChild(sub);
  const q = document.createElement("div"); q.className = "stats-quick"; q.id = "stats-quick"; q.setAttribute("role", "group"); q.setAttribute("aria-label", "Период");
  q.innerHTML = `<div class="sq-seg">
      <button type="button" data-sq="today">Сегодня</button><button type="button" data-sq="yday">Вчера</button><button type="button" data-sq="7">7 дней</button><button type="button" data-sq="month">Этот месяц</button><button type="button" data-sq="pmonth">Прошлый месяц</button><button type="button" data-sq="year">Этот год</button><button type="button" data-sq="all">Всё время</button>
    </div>
    <label class="sq-date" title="Точная дата, месяц или год"><span aria-hidden="true">📅</span><input type="date" id="sq-day" aria-label="Дата"></label><label class="sq-date sq-sub" id="sq-month-l" title="Месяц" hidden><input type="month" id="sq-month" aria-label="Месяц"></label><label class="sq-date sq-sub" id="sq-year-l" title="Год" hidden><input type="number" id="sq-year" min="2000" max="2100" aria-label="Год"></label>
    <span class="sq-range" id="sq-range"></span>`;
  bar.appendChild(q);
  const pad = n => String(n).padStart(2, "0");
  const isoD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const curMode = () => (document.querySelector("#mode button.active") || {}).dataset?.m || "day";
  function setMode(m){ const b = document.querySelector(`#mode button[data-m="${m}"]`); if (b) b.click(); }
  function setVal(id, v, fire){ const el = $(id); if (!el) return; el.value = v; if (fire) el.dispatchEvent(new Event("change", {bubbles:true})); }
  function pick(k){
    const t = new Date(), today = isoD(t);
    if (k === "today" || k === "yday") { setVal("day", k === "today" ? today : isoD(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1))); setMode("day"); }
    else if (k === "7") { setVal("day", today); setMode("week"); }
    else if (k === "month" || k === "pmonth") { const d = new Date(t.getFullYear(), t.getMonth() - (k === "pmonth" ? 1 : 0), 1); setVal("month", `${d.getFullYear()}-${pad(d.getMonth() + 1)}`); setMode("month"); }
    else if (k === "year") { setVal("year", t.getFullYear()); setMode("year"); }
    else if (k === "all") setMode("all");
    setTimeout(sync, 0);
  }
  q.querySelector(".sq-seg").addEventListener("click", e => { const b = e.target.closest("[data-sq]"); if (b) pick(b.dataset.sq); });
  $("sq-day").addEventListener("change", e => {
    if (!e.target.value) return;
    const m = curMode();
    setVal("day", e.target.value, m === "day" || m === "week");
    if (m !== "day" && m !== "week") setMode("day");
    setTimeout(sync, 0);
  });
  $("sq-month").addEventListener("change", e => { if (e.target.value) { setVal("month", e.target.value, true); setTimeout(sync, 0); } });
  $("sq-year").addEventListener("change", e => { if (e.target.value) { setVal("year", e.target.value, true); setTimeout(sync, 0); } });
  function fmtR(a, b){ const f = s => s.split("-").reverse().join("."); return a === b ? f(a) : `${f(a)} — ${f(b)}`; }
  function sync(){
    const m = curMode(), t = new Date(), today = isoD(t), yday = isoD(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1));
    const day = $("day")?.value || "", month = $("month")?.value || "", year = String($("year")?.value || "");
    const thisM = `${t.getFullYear()}-${pad(t.getMonth() + 1)}`, pm = new Date(t.getFullYear(), t.getMonth() - 1, 1), prevM = `${pm.getFullYear()}-${pad(pm.getMonth() + 1)}`;
    const act = m === "day" && day === today ? "today" : m === "day" && day === yday ? "yday" : m === "week" && day === today ? "7"
      : m === "month" && month === thisM ? "month" : m === "month" && month === prevM ? "pmonth" : m === "year" && year === String(t.getFullYear()) ? "year" : m === "all" ? "all" : "";
    q.querySelectorAll("[data-sq]").forEach(b => b.classList.toggle("active", b.dataset.sq === act));
    { const MV = {yday:"Вчера", "7":"7 дней", pmonth:"Прошлый месяц", all:"Всё время"}, lb0 = q.querySelector(".sq-date"); if (lb0) { if (MV[act]) lb0.dataset.preset = MV[act]; else delete lb0.dataset.preset; } }
    $("sq-month-l").hidden = m !== "month"; $("sq-year-l").hidden = m !== "year";
    q.querySelector(".sq-date")?.classList.toggle("is-range", m === "range");
    if (document.activeElement !== $("sq-day")) $("sq-day").value = day;
    if (document.activeElement !== $("sq-month")) $("sq-month").value = month;
    if (document.activeElement !== $("sq-year")) $("sq-year").value = year;
    let r = "";
    try { const x = typeof range === "function" ? range() : null; if (x && m !== "all" && x[0] !== x[1]) r = fmtR(x[0], x[1]); else if (m === "all") r = "все данные"; } catch (e) {}
    // Для одного дня дата уже видна в поле выбора — подпись рядом не дублируем.
    $("sq-range").textContent = r;
    // Период показывается подсказкой при наведении на поле даты, а не текстом рядом.
    const lbl = q.querySelector(".sq-date");
    if (lbl) lbl.title = r ? `Показан период: ${r}` : "Точная дата, месяц или год";
  }
  new MutationObserver(sync).observe($("mode"), {subtree:true, attributes:true, attributeFilter:["class"]});
  ["day", "month", "year"].forEach(id => $(id)?.addEventListener("change", () => setTimeout(sync, 0)));
  const st = $("status"); if (st) new MutationObserver(() => sync()).observe(st, {childList:true, characterData:true, subtree:true});
  sub.addEventListener("click", () => setTimeout(sync, 0));
  sync();
})();

/* ===================== Переливающаяся рамка таблиц ===================== */
(function(){
  const KEY = "chatstats.tableBorder.v1", STYLES = ["rainbow", "aurora", "sunset", "ocean", "neon", "fire", "gold", "silver", "accent", "comet"], SPEEDS = ["slow", "mid", "fast"];
  let st = {style:"rainbow", speed:"mid"};
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  function apply(){
    const b = document.body, on = !window.__TABLO && STYLES.includes(st.style);
    [...b.classList].filter(c => /^tb-/.test(c)).forEach(c => b.classList.remove(c));
    if (on) b.classList.add("tb-on", "tb-" + st.style, "tb-" + (SPEEDS.includes(st.speed) ? st.speed : "mid"));
    const s = document.getElementById("tb-style"), v = document.getElementById("tb-speed");
    if (s) s.value = on ? st.style : "off";
    if (v) { v.value = SPEEDS.includes(st.speed) ? st.speed : "mid"; v.disabled = !on; }
  }
  document.addEventListener("change", e => {
    if (e.target.id === "tb-style") st.style = e.target.value;
    else if (e.target.id === "tb-speed") st.speed = e.target.value;
    else return;
    save(); apply();
  });
  document.getElementById("fx-all-off")?.addEventListener("click", () => { st.style = "off"; save(); apply(); });
  document.getElementById("fx-all-on")?.addEventListener("click", () => { if (!STYLES.includes(st.style)) { st.style = "rainbow"; save(); apply(); } });
  apply();
})();

/* ===================== Современные выпадающие списки (ПК) ===================== */
(function(){
  const KEY = "chatstats.modernSelect.v1";
  const mq = matchMedia("(min-width:721px) and (pointer:fine)");
  const SCOPE = ".filters select, .section-head select, #filter-drawer select, .race-ctl select, .stats-quick select";
  const SKIP = ".chart-settings-panel, .chart-settings-content, .msel-pop, .s-cloud-dlg, table";
  const on = true; // современные выпадающие списки — всегда (на ПК)
  const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  const descI = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");
  const list = new Set();
  let pop = null, popSel = null, popBtn = null;
  const label = sel => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent.trim() : ""; };
  function refresh(sel){
    const b = sel.__msel; if (!b) return;
    const t = label(sel) || "—";
    if (b.__t !== t) { b.__t = t; b.firstChild.textContent = t; b.title = t.length > 28 ? t : (sel.title || ""); }
    b.disabled = sel.disabled;
    const hid = sel.hidden || sel.style.display === "none";
    if (b.hidden !== hid) b.hidden = hid;
  }
  function enhance(sel){
    if (sel.__msel || sel.multiple || sel.size > 1 || sel.hasAttribute("data-native") || sel.closest(SKIP)) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "msel" + (sel.closest(".field") ? "" : " solo");
    b.setAttribute("aria-haspopup", "listbox"); b.setAttribute("aria-expanded", "false");
    const lab = sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`);
    if (lab) b.setAttribute("aria-label", lab.textContent.trim()); else if (sel.getAttribute("aria-label")) b.setAttribute("aria-label", sel.getAttribute("aria-label"));
    b.appendChild(document.createElement("span"));
    const mw = sel.style.minWidth; if (mw) b.style.minWidth = mw;
    sel.after(b); sel.classList.add("msel-native"); sel.tabIndex = -1; sel.__msel = b; b.__sel = sel; list.add(sel);
    // Значение, выставленное кодом сайта, сразу отражается на кнопке.
    try {
      Object.defineProperty(sel, "value", {configurable:true, get(){ return desc.get.call(this); }, set(v){ desc.set.call(this, v); refresh(this); }});
      Object.defineProperty(sel, "selectedIndex", {configurable:true, get(){ return descI.get.call(this); }, set(v){ descI.set.call(this, v); refresh(this); }});
    } catch (e) {}
    new MutationObserver(() => refresh(sel)).observe(sel, {childList:true, subtree:true, attributes:true, attributeFilter:["disabled", "hidden", "style", "selected", "label"]});
    sel.addEventListener("change", () => refresh(sel));
    b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); pop && popSel === sel ? close() : open(sel); });
    b.addEventListener("keydown", e => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(sel); }
    });
    refresh(sel);
  }
  function unenhance(sel){
    const b = sel.__msel; if (!b) return;
    b.remove(); sel.classList.remove("msel-native"); sel.removeAttribute("tabindex");
    delete sel.value; delete sel.selectedIndex; sel.__msel = null; list.delete(sel);
  }
  function choose(sel, i){
    if (i < 0 || sel.options[i]?.disabled) return;
    const changed = descI.get.call(sel) !== i;
    descI.set.call(sel, i); refresh(sel); close(true);
    if (changed) { sel.dispatchEvent(new Event("input", {bubbles:true})); sel.dispatchEvent(new Event("change", {bubbles:true})); }
  }
  function close(focus){
    if (!pop) return;
    pop.remove(); pop = null;
    if (popBtn) { popBtn.setAttribute("aria-expanded", "false"); if (focus && popBtn.isConnected) popBtn.focus({preventScroll:true}); }
    popSel = popBtn = null;
  }
  function open(sel){
    close(); refresh(sel);
    const b = sel.__msel; if (!b || b.disabled) return;
    popSel = sel; popBtn = b; b.setAttribute("aria-expanded", "true");
    pop = document.createElement("div"); pop.className = "msel-pop"; pop.setAttribute("role", "listbox");
    const many = sel.options.length > 12;
    if (many) { const s = document.createElement("input"); s.type = "search"; s.placeholder = "Поиск…"; s.setAttribute("aria-label", "Поиск"); pop.appendChild(s); }
    const box = document.createElement("div"); box.className = "msel-list"; pop.appendChild(box);
    const items = [];
    let lastGroup = null;
    [...sel.options].forEach((o, i) => {
      const g = o.parentElement && o.parentElement.tagName === "OPTGROUP" ? o.parentElement : null;
      if (g && g !== lastGroup) { const h = document.createElement("div"); h.className = "msel-grp"; h.textContent = g.label; box.appendChild(h); h.__grp = g; }
      lastGroup = g;
      if (o.hidden) return;
      const it = document.createElement("button"); it.type = "button"; it.className = "msel-opt"; it.setAttribute("role", "option");
      it.textContent = o.textContent.trim() || "—"; it.dataset.i = i; if (o.disabled) it.disabled = true;
      it.setAttribute("aria-selected", String(i === sel.selectedIndex));
      box.appendChild(it); items.push(it);
    });
    document.body.appendChild(pop);
    // позиция: под кнопкой, если не помещается — над ней
    const r = (b.closest(".field") || b).getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
    const w = Math.min(Math.max(r.width, 240), 440);
    const below = vh - r.bottom - 10, above = r.top - 10, up = below < 220 && above > below;
    const maxH = Math.max(160, Math.min(460, up ? above : below));
    pop.style.width = w + "px"; box.style.maxHeight = (maxH - (many ? 62 : 18)) + "px";
    pop.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + "px";
    if (up) { pop.classList.add("up"); pop.style.bottom = (vh - r.top + 6) + "px"; } else pop.style.top = (r.bottom + 6) + "px";
    let hl = Math.max(0, items.findIndex(x => x.getAttribute("aria-selected") === "true"));
    const vis = () => items.filter(x => !x.hidden && !x.disabled);
    const mark = el => { items.forEach(x => x.classList.toggle("hl", x === el)); if (el) el.scrollIntoView({block:"nearest"}); };
    mark(items[hl]);
    box.addEventListener("click", e => { const it = e.target.closest(".msel-opt"); if (it) choose(sel, Number(it.dataset.i)); });
    box.addEventListener("pointermove", e => { const it = e.target.closest(".msel-opt"); if (it && !it.disabled) mark(it); });
    const search = pop.querySelector("input");
    if (search) search.addEventListener("input", () => {
      const v = search.value.trim().toLowerCase().replace(/ё/g, "е");
      items.forEach(x => { x.hidden = v && !x.textContent.toLowerCase().replace(/ё/g, "е").includes(v); });
      box.querySelectorAll(".msel-grp").forEach(h => { let n = h.nextElementSibling, any = false; while (n && !n.classList.contains("msel-grp")) { if (!n.hidden) any = true; n = n.nextElementSibling; } h.hidden = !any; });
      let empty = box.querySelector(".msel-empty");
      if (!vis().length) { if (!empty) { empty = document.createElement("div"); empty.className = "msel-empty"; empty.textContent = "Ничего не найдено"; box.appendChild(empty); } } else if (empty) empty.remove();
      mark(vis()[0]);
    });
    let typed = "", typedT = 0;
    pop.addEventListener("keydown", e => {
      const v = vis(), cur = v.indexOf(items.find(x => x.classList.contains("hl")));
      if (e.key === "ArrowDown") { e.preventDefault(); mark(v[Math.min(v.length - 1, cur + 1)] || v[0]); }
      else if (e.key === "ArrowUp") { e.preventDefault(); mark(v[Math.max(0, cur - 1)] || v[0]); }
      else if (e.key === "Home") { e.preventDefault(); mark(v[0]); }
      else if (e.key === "End") { e.preventDefault(); mark(v[v.length - 1]); }
      else if (e.key === "Enter") { e.preventDefault(); const h = items.find(x => x.classList.contains("hl")); if (h) choose(sel, Number(h.dataset.i)); }
      else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); close(true); }
      else if (!search && e.key.length === 1) {
        clearTimeout(typedT); typed += e.key.toLowerCase(); typedT = setTimeout(() => { typed = ""; }, 700);
        const f = v.find(x => x.textContent.toLowerCase().startsWith(typed)); if (f) mark(f);
      }
    });
    (search || items[hl] || pop).focus({preventScroll:true});
    if (!search && !items[hl]) pop.tabIndex = -1;
  }
  document.addEventListener("pointerdown", e => { if (pop && !pop.contains(e.target) && !(popBtn && popBtn.contains(e.target))) close(); }, true);
  addEventListener("resize", () => close());
  document.addEventListener("scroll", e => { if (pop && !pop.contains(e.target)) close(); }, true);
  function scan(root){
    if (!on || !mq.matches) return;
    (root || document).querySelectorAll(SCOPE).forEach(enhance);
  }
  let pend = 0;
  new MutationObserver(muts => {
    if (!on || !mq.matches || pend) return;
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.tagName === "SELECT" || n.querySelector?.("select"))) { pend = requestAnimationFrame(() => { pend = 0; scan(); }); return; }
  }).__hub(document.body);
  // На всякий случай раз в полторы секунды сверяем подписи (если код сайта поменял option.selected напрямую).
  setInterval(() => { list.forEach(sel => { if (!sel.isConnected) { list.delete(sel); return; } refresh(sel); }); }, 1500);
  function apply(){
    if (on && mq.matches) scan(); else { close(); [...list].forEach(unenhance); }
  }
  document.addEventListener("change", e => {
  });
  // Современный вид фильтров и выпадающих списков включён всегда.
  document.body.classList.remove("fv3-off");
  try { localStorage.removeItem("chatstats.filtersV3.v1"); localStorage.removeItem(KEY); } catch (e) {}
  mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
  setTimeout(apply, 0);
})();
