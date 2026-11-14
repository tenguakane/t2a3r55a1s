
/* ===================== Отдельная память фильтров для каждой вкладки ===================== */
(function(){
  const KEY = "chatstats.tabFilters.v1";
  let STORE = {};
  try { STORE = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { STORE = {}; }
  if (typeof STORE !== "object" || Array.isArray(STORE)) STORE = {};
  // Значения по умолчанию для вкладок, где ещё ничего не выбирали (один раз берутся из прежних общих настроек).
  if (!STORE.__def) STORE.__def = {hl: hideLeft, cmp: comparisonEnabled, norm: NORM, mode: "day"};
  const DEF = Object.assign({}, STORE.__def, {day: $("day").value, month: $("month").value, year: $("year").value});
  const SHARED = ["participants", "chats", "charts"];
  const CMP_ID = {participants: "compare-participants", chats: "compare-chats", daymatrix: "dm-compare"};
  const SKIP_TABS = ["profile", "compare", "settings", "yearreview", "marathons"];
  const SKIP_IDS = new Set(["s-date", "s-name"]);
  const SPECIAL = new Set([...HIDE_LEFT_CONTROLS, ...COMPARISON_CONTROLS, "mode", "day", "month", "year", "chat", "norm-seg"]);
  let applying = false, saveTimer = 0, frozen = false;
  const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(STORE)); } catch (e) {} }, 150); };
  const tabEl = key => document.getElementById("tab-" + key);
  // В режиме «Фильтры справа» фильтры вкладки живут в правой шторке.
  const drawerFor = key => { const d = document.getElementById("fd-body"); return d && d.dataset.tab === key ? d : null; };
  const hasHL = key => scopes(key).some(t => HIDE_LEFT_CONTROLS.some(id => t.querySelector("#" + id)));
  const scopes = key => {
    const out = []; const t = tabEl(key); if (t) out.push(t);
    const dr = drawerFor(key); if (dr) out.push(dr);
    if (SHARED.includes(key)) document.querySelectorAll("#shared > .filters").forEach(f => { if (f.id !== "chats-toolbar-controls" || key === "chats") out.push(f); });
    return out;
  };
  function controls(key){
    if (SKIP_TABS.includes(key)) return [];
    const out = [];
    scopes(key).forEach(sc => sc.querySelectorAll("input[id],select[id],.seg[id]").forEach(el => {
      if (SPECIAL.has(el.id) || SKIP_IDS.has(el.id) || el.id.startsWith("mr-f-")) return;
      if (!el.closest(".filters") && !sc.classList.contains("filters")) return;
      if (sc.id !== "fd-body" && el.closest("#fd-body")) return;
      if (el.closest(".pop,.chart-settings-panel,.pick")) return;
      if (el.matches("input") && !["checkbox", "date", "month", "number"].includes(el.type)) return;
      out.push(el);
    }));
    return out;
  }
  function capture(key){
    if (!key || frozen) return;
    const st = STORE[key] || (STORE[key] = {});
    if (hasHL(key)) st.hl = hideLeft;
    if (CMP_ID[key]) st.cmp = comparisonEnabled;
    if (SHARED.includes(key)) {
      st.mode = mode; st.day = $("day").value; st.month = $("month").value; st.year = $("year").value; st.norm = NORM;
      if (mode === "range" && RANGE_SEL) { st.rf = RANGE_SEL.from; st.rt = RANGE_SEL.to; }
      if (key !== "chats" && $("chat").options.length > 1) st.chat = $("chat").value;
    }
    const c = st.c || (st.c = {});
    controls(key).forEach(el => {
      if (el.matches(".seg")) { const i = [...el.querySelectorAll("button")].findIndex(b => b.classList.contains("active")); if (i >= 0) c[el.id] = i; }
      else if (el.type === "checkbox") c[el.id] = el.checked;
      else if (el.tagName === "SELECT") { if (el.options.length > 1 || !(el.id in c)) c[el.id] = el.value; }
      else c[el.id] = el.value;
    });
    persist();
  }
  // Возвращает, что изменилось, чтобы вызывающий код мог перерисовать вкладку.
  function applyGlobals(key){
    const st = STORE[key] || {}, f = {hl: false, cmp: false, shared: false};
    if (hasHL(key)) {
      const v = st.hl !== undefined ? !!st.hl : !!DEF.hl;
      if (v !== hideLeft) { hideLeft = v; leftFilterError = ""; f.hl = true; try { localStorage.setItem("chatstats.hideLeft.v1", v ? "1" : "0"); } catch (e) {} }
      syncHideLeftControls();
      if (f.hl) { try { renderPeople(); } catch (e) {} }
    }
    if (CMP_ID[key]) {
      const v = st.cmp !== undefined ? !!st.cmp : !!DEF.cmp;
      if (v !== comparisonEnabled) { comparisonEnabled = v; f.cmp = true; try { localStorage.setItem("chatstats.comparison.v1", v ? "1" : "0"); } catch (e) {} }
      syncComparisonControls();
    }
    if (SHARED.includes(key)) {
      const want = {mode: st.mode || DEF.mode, day: st.day || DEF.day, month: st.month || DEF.month, year: st.year || DEF.year, norm: st.norm || DEF.norm};
      const wantRange = want.mode === "range" && st.rf && st.rt;
      if (wantRange && (mode !== "range" || !RANGE_SEL || RANGE_SEL.from !== st.rf || RANGE_SEL.to !== st.rt)) { RANGE_SEL = {from:st.rf, to:st.rt}; f.shared = true; }
      { const rb = document.querySelector('#mode button[data-m="range"]'); if (rb) rb.hidden = !(wantRange || (want.mode === mode && mode === "range")); }
      if (want.mode !== mode && (["day", "week", "month", "year", "all"].includes(want.mode) || wantRange)) {
        mode = want.mode;
        document.querySelectorAll("#mode button").forEach(x => x.classList.toggle("active", x.dataset.m === mode));
        $("f-day").hidden = !(mode === "day" || mode === "week" || mode === "range"); $("f-month").hidden = mode !== "month"; $("f-year").hidden = mode !== "year";
        f.shared = true;
      }
      ["day", "month", "year"].forEach(id => { if (want[id] && $(id).value !== want[id]) { $(id).value = want[id]; f.shared = true; } });
      if (want.norm && want.norm !== NORM && ["abs", "day", "share"].includes(want.norm)) {
        NORM = want.norm; try { localStorage.setItem(NORM_KEY, NORM); } catch (e) {}
        syncNormSeg(); f.shared = true;
      }
      syncComparisonControls();
    }
    return f;
  }
  function applyChat(key, tries){
    const want = (STORE[key] || {}).chat;
    if (key === "chats" || !SHARED.includes(key) || want === undefined) return;
    const sel = $("chat");
    if (sel.value !== want && [...sel.options].some(o => o.value === want)) { sel.value = want; sel.dispatchEvent(new Event("change", {bubbles: true})); return; }
    if (tries > 0 && sel.value !== want) setTimeout(() => { if (activeDataTab() === key) applyChat(key, tries - 1); }, 700);
  }
  function applyGeneric(key){
    const c = (STORE[key] || {}).c; if (!c) return;
    applying = true;
    try {
      controls(key).forEach(el => {
        if (!(el.id in c)) return;
        const v = c[el.id];
        if (el.matches(".seg")) {
          const bs = [...el.querySelectorAll("button")], cur = bs.findIndex(b => b.classList.contains("active"));
          if (typeof v === "number" && v >= 0 && v !== cur && bs[v]) bs[v].click();
        } else if (el.type === "checkbox") {
          if (el.checked !== !!v) { el.checked = !!v; el.dispatchEvent(new Event("change", {bubbles: true})); }
        } else if (el.tagName === "SELECT") {
          if (el.value !== v && [...el.options].some(o => o.value === v)) { el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); }
        } else if (typeof v === "string" && el.value !== v) {
          el.value = v; el.dispatchEvent(new Event("input", {bubbles: true})); el.dispatchEvent(new Event("change", {bubbles: true}));
        }
      });
    } finally { applying = false; }
  }
  function afterEnter(key, f){
    if (activeDataTab() !== key) return;
    applyGeneric(key);
    // Списки чатов/участников заполняются после загрузки данных — повторяем попытку.
    setTimeout(() => { if (activeDataTab() === key) applyGeneric(key); }, 1200);
    setTimeout(() => { if (activeDataTab() === key) applyGeneric(key); }, 3500);
    applyChat(key, 6);
    // «Графики» при переключении сами данные не загружают — догружаем, если период или режим другие.
    if (f && f.shared && key === "charts") load();
  }
  // Перед тем как приложение переключит вкладку: сохраняем уходящую, подготавливаем входящую.
  document.addEventListener("click", e => {
    const t = e.target; if (!t || !t.closest) return;
    let dest = null;
    const sb = t.closest("#stats-subnav [data-stats-view]");
    if (sb) dest = sb.dataset.statsView;
    else {
      const gb = t.closest("[data-gtab]");
      const nb = t.closest("nav button[data-tab], .nav-sheet button[data-tab]");
      if (gb) dest = gb.dataset.gtab;
      else if (nb) dest = nb.dataset.tab === "stats" ? statsView : nb.dataset.tab;
    }
    if (!dest) return;
    const from = activeDataTab();
    if (!from || dest === from) return;
    capture(from);
    const f = applyGlobals(dest);
    setTimeout(() => afterEnter(dest, f), 0);
  }, true);
  // Любое изменение фильтров на вкладке сразу запоминается.
  const onUserChange = () => { if (applying) return; const key = activeDataTab(); setTimeout(() => { if (!applying) capture(key); }, 0); };
  document.addEventListener("change", e => { if (e.target.closest && e.target.closest(".filters,#shared")) onUserChange(); });
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest(".filters .seg button,#shared .seg button")) onUserChange(); });
  // Сброс фильтров вкладки (кнопка в шапке телефона): записываем исходные значения и больше ничего не запоминаем до перезагрузки.
  window.__tabFilters = {
    reset(key){
      frozen = true; clearTimeout(saveTimer);
      STORE[key] = {mode:"day", norm:"abs", hl:false, cmp:false};
      try { localStorage.setItem(KEY, JSON.stringify(STORE)); } catch (e) {}
    },
    skip: key => SKIP_TABS.includes(key)
  };
  // Первая вкладка после перезагрузки страницы.
  (function init(){
    const key = activeDataTab();
    const f = applyGlobals(key);
    afterEnter(key, null);
    if (f.hl) onHideLeftChanged(hideLeft);
    else if (f.cmp) onComparisonChanged(comparisonEnabled);
    else if (f.shared) load();
    capture(key);
  })();
})();
