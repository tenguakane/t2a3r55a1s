
/* ============ НАСТРОЙКИ ============ */
// API-ключ хранится только у локального прокси (файл api_key.txt рядом с server.py), страница его не знает.
const CONFIG = {
  BASE_URL: (() => { try { const u = (localStorage.getItem("chatstats.apiBase.v1") || "").trim(); if (/^https?:\/\//i.test(u)) return u.replace(/\/+$/, ""); } catch (e) {} if (/\.github\.io$/i.test(location.hostname)) return "https://chat-taras.tenguakane.workers.dev"; return location.protocol.startsWith("http") ? location.origin : "http://localhost:8000"; })(),   // локальный прокси (start.bat)
  ENDPOINT: "/api/v1/excel/user_daily_stats",
  LIMIT: 5000,
};

// Названия полей в ответе API. Можно указать несколько вариантов — подойдёт первый найденный.
let lineMeta = null, lineSeriesInfo = null; const hiddenSeries = new Set();
// «Реакции и события»: два показателя — rgive (поставленные реакции) и rgot (полученные)
const RX_ON = !!window.__betaOn, RX_KEYS = RX_ON ? ["rgive", "rgot"] : [];
const F = {
  date:   "stat_date",
  chat:   "chat_title",
  chatPk: "chat_pk",
  userId: "user_pk",
  name:   "first_name",
  msgs:   ["messages_count","message_count","messages","msg_count","text_count"],
  voice:  ["voice_count","voices_count","voice_messages","voice"],
  video:  ["video_note_count","video_notes_count","video_count","video_messages","video_note"],
  stick:  ["sticker_count","stickers_count","stickers","sticker"],
};
// Имена участников по user_pk. Если id нет в списке, берётся first_name из API.
const NAMES = {
  1:"Артём", 2:"Данил", 3:"Дима", 5:"Наташа", 7:"Адлет", 9:"Ярик", 10:"Артур",
  11:"Анастасия", 13:"Аня", 14:"Алиса", 16:"Есет", 17:"Саша", 19:"Ваня", 20:"Влада",
  26:"Серёга", 27:"Маша", 28:"Егор", 42:"Лера", 46:"Лекса", 55:"Влад", 57:"Яся",
  60:"Гоннор", 62:"Оля", 63:"Геля", 64:"Тишина", 66:"Валик", 69:"Женя", 74:"Настя П.",
  76:"Миша О.", 89:"Настя", 100:"Жопек", 105:"Ульяна", 106:"Миша А.", 107:"Алёна", 108:"Евджений",
};
const PAT = {msgs:/msg|message|text/i, stick:/sticker/i, voice:/voice/i, video:/video|circle|round/i};
const resolved = {};
const g = (x, k) => {
  if (k === "rgive" || k === "rgot") return RX_ON && window.__betaReactCell ? window.__betaReactCell(x, k) : 0;
  if (!resolved[k] || x[resolved[k]] === undefined) {
    let key = [].concat(F[k]).find(n => x[n] !== undefined);
    if (!key) {
      const c = Object.keys(x).filter(n => PAT[k].test(n) && typeof x[n] !== "object");
      key = c.find(n => /count|cnt|num|total/i.test(n)) || c[0];
    }
    if (!key) return undefined;
    resolved[k] = key;
  }
  return x[resolved[k]];
};

/* ======================================================= */

const COLS = [
  {k:"place", t:"Место"},
  {k:"name",  t:"Участник"},
  {k:"msgs",  t:"Сообщения"},
  {k:"voice", t:"Голосовые"},
  {k:"video", t:"Видеосообщения"},
  {k:"stick", t:"Стикеры"},
  ...(RX_ON ? [{k:"rgive", t:"Поставил ❤️", full:"Поставил(а) реакций"}, {k:"rgot", t:"Получил ❤️", full:"Получил(а) реакций"}] : []),
];
const $ = id => document.getElementById(id);
const CHART_BG_KEY = "chatstats.chartBackground.v1";
const CHART_BG_START_KEY = "chatstats.chartBackground.start.v1";
const CHART_BG_END_KEY = "chatstats.chartBackground.end.v1";
const CHART_FONT_KEY = "chatstats.chartFontColor.v1";
const CHART_PREFS_KEY = "chatstats.chartTypeAppearance.v1";
let chartBackgroundStart = "#262626", chartBackgroundEnd = "#262626", chartBackgroundMode = "linear", chartBackgroundAngle = 135, chartFontColor = "#e6e8ee";
try {
  const oldBg = localStorage.getItem(CHART_BG_KEY);
  if (oldBg && /^#[0-9a-f]{6}$/i.test(oldBg)) chartBackgroundStart = chartBackgroundEnd = oldBg;
  const bgStart = localStorage.getItem(CHART_BG_START_KEY), bgEnd = localStorage.getItem(CHART_BG_END_KEY), font = localStorage.getItem(CHART_FONT_KEY);
  if (bgStart && /^#[0-9a-f]{6}$/i.test(bgStart)) chartBackgroundStart = bgStart;
  if (bgEnd && /^#[0-9a-f]{6}$/i.test(bgEnd)) chartBackgroundEnd = bgEnd;
  if (font && /^#[0-9a-f]{6}$/i.test(font)) chartFontColor = font;
} catch (e) {}
let legacyHeatAppearance = {z:"#2a2e39", c:["#4a2a45", "#a8325a", "#ff4d6d"]};
try {
  const savedHeat = JSON.parse(localStorage.getItem("chatstats.heat.v1") || "null");
  if (savedHeat && savedHeat.z && Array.isArray(savedHeat.c) && savedHeat.c.length === 3) legacyHeatAppearance = {z:savedHeat.z, c:[...savedHeat.c]};
} catch (e) {}
const BASE_CHART_APPEARANCE = {backgroundStart:chartBackgroundStart, backgroundEnd:chartBackgroundEnd, backgroundMode:"linear", backgroundAngle:135, fontColor:chartFontColor, seriesColors:{}, heat:legacyHeatAppearance};
let CHART_PREFS = {};
try { const saved = JSON.parse(localStorage.getItem(CHART_PREFS_KEY) || "{}"); if (saved && typeof saved === "object") CHART_PREFS = saved; } catch (e) {}
const DEFAULT_CUSTOM_HEAT_BANDS = [
  {min:0, color:"#ef4444"},
  {min:25, color:"#ec4899"},
  {min:50, color:"#facc15"},
  {min:100, color:"#22c55e"},
  {min:201, color:"#a855f7"}
];
// For the custom map, participant and chat thresholds are intentionally independent.
// Chat totals are usually larger, so their starting thresholds are higher by default.
const DEFAULT_CUSTOM_HEAT_BANDS_CHATS = [
  {min:0, color:"#ef4444"},
  {min:50, color:"#ec4899"},
  {min:100, color:"#facc15"},
  {min:250, color:"#22c55e"},
  {min:500, color:"#a855f7"}
];
const CHART_TYPE_LABELS = {stack:"Активность по дням", bars:"Столбцы", donut:"Кольцо", trend:"Динамика", years:"По годам", heat:"Календарь", spiral:"Спираль года", heatrows:"Карта: участники / чаты", "heatrows-custom":"Карта: Настраиваемая", race:"Гонка", pairs:"Кто активен вместе", season:"Сезонность", bump:"График мест", bumpyears:"Места: месяцы × годы", spread:"Разброс по дням", gini:"Концентрация активности", multiples:"Маленькие графики", norm:"Отклонение от нормы"};
const DEFAULT_TEXT_STYLE = {
  bars:    {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:18,labelsColor:"#e6e8ee",valuesSize:18,valuesColor:"#eceef3",axisSize:19,axisColor:"#eceef3",legendSize:18,legendColor:"#f2f3f7"},
  donut:   {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:18,labelsColor:"#f2f3f7",valuesSize:18,valuesColor:"#eceef3",axisSize:17,axisColor:"#7d8190",legendSize:18,legendColor:"#aab0c0"},
  trend:   {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:18,labelsColor:"#f2f3f7",valuesSize:19,valuesColor:"#eceef3",axisSize:19,axisColor:"#eceef3",legendSize:18,legendColor:"#f2f3f7"},
  years:   {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:18,labelsColor:"#f2f3f7",valuesSize:19,valuesColor:"#eceef3",axisSize:19,axisColor:"#eceef3",legendSize:18,legendColor:"#f2f3f7"},
  season:  {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:18,labelsColor:"#f2f3f7",valuesSize:19,valuesColor:"#eceef3",axisSize:19,axisColor:"#eceef3",legendSize:18,legendColor:"#f2f3f7"},
  heat:    {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:14,labelsColor:"#e6e8ee",valuesSize:14,valuesColor:"#e6e8ee",axisSize:11,axisColor:"#aab0c0",legendSize:14,legendColor:"#7d8190"},
  heatrows:{titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:14,labelsColor:"#e6e8ee",valuesSize:12,valuesColor:"#aab0c0",axisSize:11,axisColor:"#aab0c0",legendSize:14,legendColor:"#7d8190"},
  bump:    {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:16,labelsColor:"#f2f3f7",valuesSize:14,valuesColor:"#eceef3",axisSize:16,axisColor:"#aab0c0",legendSize:15,legendColor:"#f2f3f7"},
  bumpyears:{titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:16,labelsColor:"#f2f3f7",valuesSize:14,valuesColor:"#eceef3",axisSize:16,axisColor:"#aab0c0",legendSize:15,legendColor:"#f2f3f7"},
  spread:  {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:16,labelsColor:"#e6e8ee",valuesSize:14,valuesColor:"#eceef3",axisSize:15,axisColor:"#aab0c0",legendSize:14,legendColor:"#9aa0b0"},
  gini:    {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:16,labelsColor:"#e6e8ee",valuesSize:30,valuesColor:"#eceef3",axisSize:15,axisColor:"#aab0c0",legendSize:15,legendColor:"#9aa0b0"},
  multiples:{titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:15,labelsColor:"#f2f3f7",valuesSize:13,valuesColor:"#aab0c0",axisSize:12,axisColor:"#7d8190",legendSize:14,legendColor:"#9aa0b0"},
  race:    {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:18,labelsColor:"#e6e8ee",valuesSize:18,valuesColor:"#eceef3",axisSize:19,axisColor:"#eceef3",legendSize:18,legendColor:"#f2f3f7"},
  pairs:   {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:16,labelsColor:"#e6e8ee",valuesSize:13,valuesColor:"#eceef3",axisSize:15,axisColor:"#aab0c0",legendSize:14,legendColor:"#9aa0b0"},
  spiral:  {titleSize:36,titleColor:"#aaaaaa",subtitleSize:17,subtitleColor:"#7d8190",labelsSize:14,labelsColor:"#e6e8ee",valuesSize:34,valuesColor:"#eceef3",axisSize:15,axisColor:"#aab0c0",legendSize:14,legendColor:"#7d8190"}
};
const TEXT_STYLE_LABELS = [
  ["title","Заголовок"], ["subtitle","Подзаголовок"], ["labels","Имена / категории"],
  ["values","Числовые значения"], ["axis","Даты, дни и шкалы"], ["legend","Легенда"]
];
const currentChartType = () => $("c-type")?.value || "bars";
function chartPrefs(type = currentChartType()) {
  const saved = CHART_PREFS[type] || {};
  let customBandsByEntity = null;
  let customBandsEntity = null;
  let rawCustomBands;
  if (type === "heatrows-custom") {
    // Migrate legacy shared bands to the participant profile. Chat ranges start
    // independently and can then be adjusted without affecting participant ranges.
    const existingByEntity = saved.customBandsByEntity && typeof saved.customBandsByEntity === "object"
      ? saved.customBandsByEntity : null;
    customBandsByEntity = existingByEntity ? {
      users: Array.isArray(existingByEntity.users) && existingByEntity.users.length ? existingByEntity.users.map(b => ({...b})) : DEFAULT_CUSTOM_HEAT_BANDS.map(b => ({...b})),
      chats: Array.isArray(existingByEntity.chats) && existingByEntity.chats.length ? existingByEntity.chats.map(b => ({...b})) : DEFAULT_CUSTOM_HEAT_BANDS_CHATS.map(b => ({...b}))
    } : {
      users: Array.isArray(saved.customBands) && saved.customBands.length ? saved.customBands.map(b => ({...b})) : DEFAULT_CUSTOM_HEAT_BANDS.map(b => ({...b})),
      chats: DEFAULT_CUSTOM_HEAT_BANDS_CHATS.map(b => ({...b}))
    };
    customBandsEntity = chartEntity === "chats" ? "chats" : "users";
    rawCustomBands = customBandsByEntity[customBandsEntity];
  } else {
    rawCustomBands = Array.isArray(saved.customBands) && saved.customBands.length ? saved.customBands : DEFAULT_CUSTOM_HEAT_BANDS;
  }
  const customBands = (Array.isArray(rawCustomBands) && rawCustomBands.length ? rawCustomBands : DEFAULT_CUSTOM_HEAT_BANDS).map((band, i) => ({
    min: Number.isFinite(Number(band?.min)) ? Math.max(0, Math.floor(Number(band.min))) : ((customBandsEntity === "chats" ? DEFAULT_CUSTOM_HEAT_BANDS_CHATS[i] : DEFAULT_CUSTOM_HEAT_BANDS[i])?.min ?? i * 25),
    color: /^#[0-9a-f]{6}$/i.test(String(band?.color || "")) ? String(band.color) : ((customBandsEntity === "chats" ? DEFAULT_CUSTOM_HEAT_BANDS_CHATS[i] : DEFAULT_CUSTOM_HEAT_BANDS[i])?.color || "#a855f7")
  }));
  return {
    ...BASE_CHART_APPEARANCE,
    ...saved,
    ...(type === "heatrows-custom" ? {customBandsByEntity, customBandsEntity} : {}),
    backgroundMode: ["solid", "linear", "radial"].includes(saved.backgroundMode) ? saved.backgroundMode : "linear",
    backgroundAngle: Number(saved.backgroundAngle ?? 135),
    seriesColors: {...(saved.seriesColors || {})},
    heat: saved.heat && Array.isArray(saved.heat.c) ? {z:saved.heat.z || BASE_CHART_APPEARANCE.heat.z, c:[...saved.heat.c]} : {...BASE_CHART_APPEARANCE.heat, c:[...BASE_CHART_APPEARANCE.heat.c]},
    trendStyle: {...(saved.trendStyle || {})},
    donutRadius: Number(saved.donutRadius ?? 118),
    donutThickness: Number(saved.donutThickness ?? 56),
    heatCellScale: Number(saved.heatCellScale ?? 100),
    heatCellShape: saved.heatCellShape === "circle" ? "circle" : "square",
    heatCircleScale: Number(saved.heatCircleScale ?? 100),
    heatRowsTop: ["all", "auto"].includes(String(saved.heatRowsTop)) ? String(saved.heatRowsTop) : (["5", "10", "20"].includes(String(saved.heatRowsTop)) ? Number(saved.heatRowsTop) : (type === "heatrows" ? "auto" : 10)),
    showSubtitle: saved.showSubtitle !== false,
    customBands,
    textStyle: {...(DEFAULT_TEXT_STYLE[type] || DEFAULT_TEXT_STYLE.bars), ...(saved.textStyle || {})}
  };
}
function saveChartPrefs(){
  try {
    const heat = CHART_PREFS["heatrows-custom"];
    // The temporary entity marker comes from chartPrefs() and is only present
    // after an edit to this chart. Persist that edit under the correct entity.
    if (heat && heat.customBandsEntity && Array.isArray(heat.customBands) && heat.customBands.length) {
      const entity = heat.customBandsEntity === "chats" ? "chats" : "users";
      const byEntity = heat.customBandsByEntity && typeof heat.customBandsByEntity === "object" ? heat.customBandsByEntity : {};
      heat.customBandsByEntity = {...byEntity, [entity]: heat.customBands.map(b => ({...b}))};
      delete heat.customBandsEntity;
    }
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(CHART_PREFS));
  } catch (e) {}
}
function chartBackgroundCss(p = null){
  const a = p || {backgroundMode:"linear", backgroundAngle:135, backgroundStart:chartBackgroundStart, backgroundEnd:chartBackgroundEnd};
  const start = a.backgroundStart || "#262626", end = a.backgroundEnd || start;
  if (a.backgroundMode === "solid") return start;
  if (a.backgroundMode === "radial") return `radial-gradient(circle, ${start}, ${end})`;
  return `linear-gradient(${Number(a.backgroundAngle ?? 135)}deg, ${start}, ${end})`;
}
function applyChartAppearance(type = currentChartType()){
  const p = chartPrefs(type);
  chartBackgroundStart = p.backgroundStart || BASE_CHART_APPEARANCE.backgroundStart;
  chartBackgroundEnd = p.backgroundEnd || BASE_CHART_APPEARANCE.backgroundEnd;
  chartBackgroundMode = p.backgroundMode || "linear";
  chartBackgroundAngle = Number(p.backgroundAngle ?? 135);
  chartFontColor = p.fontColor || BASE_CHART_APPEARANCE.fontColor;
  document.documentElement.style.setProperty("--chart-bg", chartBackgroundCss(p));
  document.documentElement.style.setProperty("--chart-font-color", chartFontColor);
  const preview = $("chart-bg-preview");
  if (preview) { preview.style.background = chartBackgroundCss(p); preview.style.color = chartFontColor; }
}
applyChartAppearance();
const pad = n => String(n).padStart(2,"0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

let mode = "day", rows = [], sort = {k:"msgs", dir:-1}, reqId = 0;
// Произвольный период «с — по», выбранный в календаре (режим «Период»)
let RANGE_SEL = null;
let comparisonRows = null, comparisonError = "", comparisonEnabled = false;
try { comparisonEnabled = localStorage.getItem("chatstats.comparison.v1") === "1"; } catch (e) {}
let hideLeft = false, leftFilterError = "";
try { hideLeft = localStorage.getItem("chatstats.hideLeft.v1") === "1"; } catch (e) {}
let userMetricRows = null, userMetricPromise = null, chatMetricRows = null, chatMetricPromise = null;
let recordsEntity = "users", recordsUserRows = [], recordsChatRows = [], recordsPeriod = "day", recordsHist = null;
const recPeriodCache = new Map();

// User-excluded rows are independent for the Participants and Chats tables and persist in this browser.
const EXCLUDED_ROW_STORAGE_KEY = "chatstats.excludedTableRows.v1";
const EXCLUDED_TABLE_ROWS = {participants:new Map(), chats:new Map(), recUsers:new Map(), recChats:new Map()};
const exclHost = entity => $(String(entity).startsWith("rec") ? "records-excluded-controls" : entity + "-excluded-controls");
const exclRerender = entity => { if (entity === "participants") render(); else if (entity === "chats") renderChatRank(); else if (String(entity).startsWith("rec")) renderRecords(); };
try {
  const savedExcluded = JSON.parse(localStorage.getItem(EXCLUDED_ROW_STORAGE_KEY) || "null");
  for (const entity of ["participants", "chats", "recUsers", "recChats"]) {
    if (Array.isArray(savedExcluded?.[entity])) EXCLUDED_TABLE_ROWS[entity] = new Map(savedExcluded[entity].map(([k,n]) => [String(k), String(n)]));
  }
} catch (e) {}
function isTableRowExcluded(entity, key){ return EXCLUDED_TABLE_ROWS[entity]?.has(String(key)) || false; }
function saveExcludedTableRows(){
  try { localStorage.setItem(EXCLUDED_ROW_STORAGE_KEY, JSON.stringify(Object.fromEntries(Object.entries(EXCLUDED_TABLE_ROWS).map(([k, m]) => [k, [...m]])))); } catch (e) {}
}
function renderExcludedRowsControls(entity, openState = null){
  const host = exclHost(entity);
  if (!host) return;
  const wasOpen = openState === null ? Boolean(host.querySelector("details")?.open) : Boolean(openState);
  const entries = [...EXCLUDED_TABLE_ROWS[entity].entries()].sort((a,b)=>a[1].localeCompare(b[1],"ru"));
  host.hidden = entries.length === 0;
  if (!entries.length) { host.innerHTML = ""; return; }
  const entryHtml = entries.map(([key,name]) => `<div class="excluded-row-item"><span title="${escH(name)}">${escH(name)}</span><button type="button" class="mini" data-restore-row="${escH(key)}" data-restore-entity="${entity}">Вернуть</button></div>`).join("");
  host.innerHTML = `<details class="pick excluded-rows-details"${wasOpen ? " open" : ""}><summary>Исключённые строки (${entries.length})</summary><div class="pop excluded-rows-pop">${entryHtml}<div class="pbtn"><button type="button" class="mini" data-restore-all="${entity}">Восстановить все</button></div></div></details>`;
}

// Внутренние разделы вкладки «Статистика».
const STATS_VIEW_KEY = "chatstats.statsView.v1";
let statsView = "participants";
try { const v = localStorage.getItem(STATS_VIEW_KEY); if (["participants", "chats"].includes(v)) statsView = v; } catch (e) {}
function activeDataTab(){
  const top = document.querySelector("nav button.active[data-tab]")?.dataset.tab || "stats";
  return top === "stats" ? statsView : top;
}

// Hide filters independently per tab, keeping the toggle itself available in the header.
const FILTERS_VISIBILITY_KEY = "chatstats.filtersHidden.v1";
let FILTERS_HIDDEN = {};
try {
  const savedFiltersHidden = JSON.parse(localStorage.getItem(FILTERS_VISIBILITY_KEY) || "{}");
  if (savedFiltersHidden && typeof savedFiltersHidden === "object" && !Array.isArray(savedFiltersHidden)) FILTERS_HIDDEN = savedFiltersHidden;
} catch (e) {}
function renderFiltersSummary(nodes, hidden){
  let bar = document.getElementById("filters-summary");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "filters-summary";
    bar.className = "filters-summary";
    bar.setAttribute("role", "button");
    bar.tabIndex = 0;
    bar.title = "Показать фильтры";
    const go = () => { const b = document.getElementById("filters-visibility-toggle"); if (b) b.click(); };
    bar.addEventListener("click", go);
    bar.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    const m = document.querySelector("main");
    if (m) m.insertBefore(bar, m.firstChild);
  }
  if (!hidden || !nodes.size) { bar.hidden = true; return; }
  const chips = [];
  const vis = el => !el.closest("[hidden]");
  nodes.forEach(n => {
    if (n.id === "c-quick") { const a = n.querySelector(".quick-chip.active"); if (a && vis(n)) chips.push(["Период", a.textContent.trim()]); return; }
    if (!vis(n)) return;
    n.querySelectorAll(".field").forEach(f => {
      if (!vis(f)) return;
      const lab = (f.querySelector(":scope > label") || {}).textContent;
      const sel = f.querySelector("select");
      const inp = f.querySelector("input:not([type=checkbox]):not([type=range]):not([type=color])");
      const seg = f.querySelector(".seg");
      const pick = f.querySelector(".pick summary");
      let val = "";
      if (sel) val = sel.selectedOptions[0] ? sel.selectedOptions[0].textContent.trim() : "";
      else if (inp) val = inp.value.trim();
      else if (seg) { const a = seg.querySelector("button.active"); val = a ? a.textContent.trim() : ""; }
      else if (pick) val = pick.textContent.trim();
      if (lab && val) chips.push([lab.trim(), val]);
    });
    n.querySelectorAll(".checkline").forEach(c => {
      const i = c.querySelector("input");
      if (vis(c) && i && i.checked) chips.push([null, c.textContent.trim()]);
    });
  });
  bar.textContent = "";
  chips.slice(0, 8).forEach(([l, v]) => {
    const s = document.createElement("span");
    s.className = "fs-chip";
    if (l) { const b = document.createElement("b"); b.textContent = l; s.appendChild(b); }
    s.appendChild(document.createTextNode(v));
    bar.appendChild(s);
  });
  if (chips.length > 8) { const s = document.createElement("span"); s.className = "fs-chip"; s.textContent = "+" + (chips.length - 8); bar.appendChild(s); }
  const more = document.createElement("span");
  more.className = "fs-more";
  more.textContent = "◫ показать фильтры";
  bar.appendChild(more);
  bar.hidden = false;
}
function applyFiltersVisibility(){
  document.querySelectorAll(".filters-user-hidden").forEach(el => el.classList.remove("filters-user-hidden"));
  const key = activeDataTab();
  const top = document.querySelector("nav button.active[data-tab]")?.dataset.tab || "stats";
  const hidden = FILTERS_HIDDEN[key] === true;
  const nodes = new Set();
  const scopeId = key === "participants" || key === "chats" ? `tab-${key}` : `tab-${top}`;
  const scope = $(scopeId);
  if (scope) scope.querySelectorAll(".filters").forEach(el => nodes.add(el));
  // Shared period/chat filters are used only by Statistics and Charts.
  if (!$("shared").hidden && ["participants", "chats", "charts"].includes(key)) {
    $("shared").querySelectorAll(".filters").forEach(el => nodes.add(el));
  }
  // Quick date-range chips are also filtering controls on the Charts tab.
  if (key === "charts" && $("c-quick")) nodes.add($("c-quick"));
  if (hidden) nodes.forEach(el => el.classList.add("filters-user-hidden"));
  const btn = $("filters-visibility-toggle");
  if (btn) {
    btn.hidden = key === "settings";
    btn.textContent = hidden ? "◫ Показать фильтры" : "◫ Скрыть фильтры";
    btn.title = hidden ? "Показать фильтры текущей вкладки" : "Скрыть фильтры текущей вкладки";
    btn.setAttribute("aria-pressed", String(hidden));
  }
  renderFiltersSummary(nodes, hidden);
}
const filtersVisibilityButton = $("filters-visibility-toggle");
if (filtersVisibilityButton) filtersVisibilityButton.addEventListener("click", () => {
  const key = activeDataTab();
  FILTERS_HIDDEN[key] = FILTERS_HIDDEN[key] !== true;
  try { localStorage.setItem(FILTERS_VISIBILITY_KEY, JSON.stringify(FILTERS_HIDDEN)); } catch (e) {}
  applyFiltersVisibility();
});

function setStatsView(view, doLoad = true){
  if (!["participants", "chats"].includes(view)) return;
  statsView = view;
  try { localStorage.setItem(STATS_VIEW_KEY, view); } catch (e) {}
  document.querySelectorAll("#stats-subnav [data-stats-view]").forEach(b => {
    const active = b.dataset.statsView === view;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
  });
  $("tab-participants").classList.toggle("active", view === "participants");
  $("tab-chats").classList.toggle("active", view === "chats");
  if (document.querySelector('nav button.active[data-tab="stats"]')) {
    $("shared").hidden = false;
    $("chats-toolbar-controls").hidden = view !== "chats";
    if ($("f-chat")) $("f-chat").hidden = view === "chats";
    $("upd-wrap").hidden = false;
    if (doLoad) load();
  }
  applyFiltersVisibility();
}
document.querySelectorAll("#stats-subnav [data-stats-view]").forEach(b => b.addEventListener("click", () => setStatsView(b.dataset.statsView)));

// Вкладки
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
  const t = b.dataset.tab;
  b.scrollIntoView?.({inline: "center", block: "nearest"});
  const view = t === "stats" ? statsView : t;
  $("shared").hidden = !["stats","charts"].includes(t);
  if (t !== "charts") {
    $("f-mode").hidden = false;
    $("f-day").hidden = !(mode === "day" || mode === "week" || mode === "range");
    $("f-month").hidden = mode !== "month";
    $("f-year").hidden = mode !== "year";
  }
  $("chats-toolbar-controls").hidden = view !== "chats";
  syncComparisonControls();
  if ($("f-chat")) $("f-chat").hidden = view === "chats" || (t === "charts" && chartEntity === "chats");
  if (t === "profile") loadProfile();
  if (t === "months") loadMonths();
  if (t === "days") loadDays();
  if (t === "time") loadTime();
  if (t === "forecast") loadForecast();
  if (t === "records") loadRecords();
  if (t === "stats") load();
  if (t === "charts") renderCharts();
  if (t === "settings") { renderSettings(); renderUltSettings(); }
  if (t === "selfie") loadSelfie();
  if (t === "daymatrix") loadDayMatrix();
  if (t === "marathons") loadMarathons();
  if (t === "yearreview") loadYearReview();
  if (t === "compare") loadCompare();
  if (t === "hub" && window.loadHub) window.loadHub();
  $("upd-wrap").hidden = !["hub","stats","daymatrix","marathons","yearreview","compare","charts","records","profile","months","days","time","forecast","achievements","chronicle","birthdays","usermap","vk"].includes(t);
  applyFiltersVisibility();
});

// Синхронизируем сохранённый внутренний раздел «Статистики».
setStatsView(statsView, false);
applyFiltersVisibility();
// Chat-only actions share the common filter row but remain hidden on other tabs.
$("chats-toolbar-controls").hidden = !$("tab-chats").classList.contains("active");

// Начальные значения: сегодня
const now = new Date();
$("day").value = iso(now);
$("month").value = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
$("year").value = now.getFullYear();

document.querySelectorAll("#mode button").forEach(b => b.onclick = () => {
  mode = b.dataset.m;
  clearChartQuick();
  document.querySelectorAll("#mode button").forEach(x => x.classList.toggle("active", x === b));
  $("f-day").hidden = !(mode === "day" || mode === "week" || mode === "range");
  $("f-month").hidden = mode !== "month";
  $("f-year").hidden = mode !== "year";
  const rb = document.querySelector('#mode button[data-m="range"]'); if (rb) rb.hidden = mode !== "range";
  syncComparisonControls();
  load();
});
// Выбор периода из календаря: два разных дня — режим «Период», один и тот же день — режим «День»
window.__statsRange = {
  get(){ try { return mode === "all" ? null : range(); } catch (e) { return null; } },
  set(a, b){
    if (a > b) [a, b] = [b, a];
    if (a === b) { $("day").value = a; if (mode !== "day") document.querySelector('#mode button[data-m="day"]').click(); else { clearChartQuick(); load(); } return; }
    RANGE_SEL = {from:a, to:b}; $("day").value = b;
    const rb = document.querySelector('#mode button[data-m="range"]'); rb.hidden = false;
    if (mode === "range") { clearChartQuick(); load(); } else rb.click();
  }
};
["day","month","year"].forEach(id => $(id).onchange = () => {
  clearChartQuick();
  if (id === "month" && $("tab-charts").classList.contains("active") && $("c-type").value === "years") {
    renderCharts();
    if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
    return;
  }
  load();
});
$("chat").onchange = () => {
  if ($("tab-charts")?.classList.contains("active")) renderCharts();
  else render();
};
$("participants-top").onchange = render;

function range(){
  if (mode === "range") return RANGE_SEL ? [RANGE_SEL.from, RANGE_SEL.to] : null;
  if (mode === "day") { const d = $("day").value; return d ? [d, d] : null; }
  if (mode === "week") {
    const v = $("day").value; if (!v) return null;
    const [y, m, d] = v.split("-").map(Number);
    // На вкладках «Участники», «Чаты» и «Графики» неделя означает последние 7 дней,
    // включая выбранную дату. На остальных вкладках сохраняется календарная неделя.
    const activeTab = activeDataTab();
    if (["participants", "chats", "charts"].includes(activeTab)) {
      return [iso(new Date(y, m - 1, d - 6)), v];
    }
    const wd = (new Date(y, m - 1, d).getDay() + 6) % 7;
    return [iso(new Date(y, m - 1, d - wd)), iso(new Date(y, m - 1, d - wd + 6))];
  }
  if (mode === "all") return ["2000-01-01", iso(new Date())];
  if (mode === "month") {
    const v = $("month").value; if (!v) return null;
    const [y, m] = v.split("-").map(Number);
    return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`];
  }
  const y = Number($("year").value); if (!y) return null;
  return [`${y}-01-01`, `${y}-12-31`];
}

// «1–15 октября», «28 сентября – 3 октября», с годом, если он не текущий
function rangeTitle(r){
  if (!r) return "выбранный период";
  const G = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"], cy = new Date().getFullYear();
  const [y0, m0, d0] = r[0].split("-").map(Number), [y1, m1, d1] = r[1].split("-").map(Number);
  if (y0 === y1 && m0 === m1) return `${d0}–${d1} ${G[m1 - 1]}${y1 !== cy ? " " + y1 : ""}`;
  if (y0 === y1) return `${d0} ${G[m0 - 1]} – ${d1} ${G[m1 - 1]}${y1 !== cy ? " " + y1 : ""}`;
  return `${d0} ${G[m0 - 1]} ${y0} – ${d1} ${G[m1 - 1]} ${y1}`;
}
function addDaysIso(value, delta){
  const [y,m,d] = value.split("-").map(Number);
  return iso(new Date(y, m - 1, d + delta));
}
function previousPeriodRange(currentRange){
  if (!currentRange || mode === "all") return null;
  const [from, to] = currentRange;
  if (mode === "day") { const d = addDaysIso(from, -1); return [d, d]; }
  if (mode === "week" || mode === "range") {
    const count = Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000) + 1;
    const prevTo = addDaysIso(from, -1);
    return [addDaysIso(prevTo, -(count - 1)), prevTo];
  }
  if (mode === "month") {
    const [y,m] = from.split("-").map(Number);
    const prevStart = new Date(y, m - 2, 1);
    const prevEnd = new Date(y, m - 1, 0);
    return [iso(prevStart), iso(prevEnd)];
  }
  if (mode === "year") {
    const y = Number(from.slice(0,4)) - 1;
    return [`${y}-01-01`, `${y}-12-31`];
  }
  return null;
}
function comparisonCell(current, previous, hasPrevious = true){
  const delta = NORM === "day" || NORM === "share" ? r1(current - previous) : current - previous;
  const signed = n => n > 0 ? "+" + fmtN(n) : fmtN(n);
  const cls = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  // Не показываем разницу, если сравнение недоступно или изменений нет.
  // Это скрывает и (0) при равных ненулевых значениях, и (0) при нулевых.
  const showDiff = hasPrevious && delta !== 0;
  const diff = showDiff ? ` <span class="compare-diff ${cls}">(${signed(delta)})</span>` : "";
  return `<td class="${current ? "" : "zero"}">${current ? fmtN(current) : "-"}${diff}</td>`;
}
function displayedCell(current, previous, compareOn, hasPrevious = true){
  return compareOn ? comparisonCell(current, previous, hasPrevious) : `<td class="${current ? "" : "zero"}">${current ? fmtN(current) : "-"}</td>`;
}
function setStatus(t, err){ const s = $("status"); s.textContent = t; s.className = "status" + (err ? " err" : ""); }

function payloadRows(json){
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== "object") return [];
  for (const key of ["items", "rows", "results", "records", "data"]){
    const v = json[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      for (const nested of ["items", "rows", "results", "records"])
        if (Array.isArray(v[nested])) return v[nested];
    }
  }
  return [];
}
function payloadCursor(json){
  return json?.next_cursor || json?.nextCursor || json?.pagination?.next_cursor ||
    json?.data?.next_cursor || json?.data?.nextCursor || null;
}
// Повторяющиеся строки (дата, чат, имя) храним в одном экземпляре: у каждой строки API они иначе свои, это десятки мегабайт.
const INTERN_POOL = new Map();
function internRows(list){
  const ks = [F.date, F.chat, F.name];
  for (let i = 0; i < list.length; i++) {
    const r = list[i]; if (!r) continue;
    for (let j = 0; j < 3; j++) {
      const k = ks[j], v = r[k];
      if (typeof v !== "string") continue;
      const c = INTERN_POOL.get(v);
      if (c === undefined) { if (INTERN_POOL.size < 100000) INTERN_POOL.set(v, v); } else if (c !== v) r[k] = c;
    }
  }
  return list;
}
async function fetchEndpointAll(endpoint, from = null, to = null){
  let all = [], cursor = null, guard = 0;
  do {
    const url = new URL(endpoint, CONFIG.BASE_URL);
    url.searchParams.set("limit", CONFIG.LIMIT);
    if (from) url.searchParams.set("stat_date_from", from);
    if (to) url.searchParams.set("stat_date_to", to);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) throw new Error(`сервер отклонил ключ (${res.status}). Проверь файл api_key.txt рядом с server.py и перезапусти start.bat`);
    if (res.status === 502) throw new Error("прокси не смог связаться с сервером статистики (502). Проверь интернет");
    if (!res.ok) throw new Error(`Сервер ответил ${res.status}`);
    const json = await res.json();
    { const part = internRows(payloadRows(json)); for (let i = 0; i < part.length; i++) all.push(part[i]); }
    cursor = payloadCursor(json);
  } while (cursor && ++guard < 200);
  if (guard >= 200) throw new Error("Остановлена загрузка: слишком много страниц API.");
  return all;
}
async function fetchAll(from, to){
  return fetchEndpointAll(CONFIG.ENDPOINT, from, to);
}
const USER_METRICS_ENDPOINT = "/api/v1/excel/activity_user_metrics";
const CHAT_METRICS_ENDPOINT = "/api/v1/excel/activity_chat_metrics";
async function ensureUserMetrics(force = false){
  if (force) { userMetricRows = null; userMetricPromise = null; }
  if (userMetricRows) return userMetricRows;
  if (!userMetricPromise) userMetricPromise = fetchEndpointAll(USER_METRICS_ENDPOINT).then(data => {
    userMetricRows = data; userMetricPromise = null; rebuildUserStatuses(); return data;
  }).catch(err => { userMetricPromise = null; throw err; });
  return userMetricPromise;
}
async function ensureChatMetrics(force = false){
  if (force) { chatMetricRows = null; chatMetricPromise = null; }
  if (chatMetricRows) return chatMetricRows;
  if (!chatMetricPromise) chatMetricPromise = fetchEndpointAll(CHAT_METRICS_ENDPOINT).then(data => { chatMetricRows = data; chatMetricPromise = null; return data; }).catch(err => { chatMetricPromise = null; throw err; });
  return chatMetricPromise;
}
const metricUserId = row => {
  for (const k of [F.userId, "user_id", "userId", "telegram_user_id", "member_id", "id_user"]) if (row?.[k] !== undefined && row[k] !== null && row[k] !== "") return String(row[k]);
  const k = Object.keys(row || {}).find(k => /^(user|member|telegram)_?(pk|id)$/i.test(k));
  return k ? String(row[k]) : "";
};
const normKey = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
function pickMetricField(row, aliases = [], regexes = [], validate = () => true){
  if (!row || typeof row !== "object") return null;
  const entries = Object.entries(row);
  const aliasSet = new Set(aliases.map(normKey));
  for (const [k, v] of entries) if (aliasSet.has(normKey(k)) && validate(v, k)) return {key:k, value:v};
  for (const re of regexes) {
    const found = entries.find(([k,v]) => re.test(normKey(k)) && validate(v,k));
    if (found) return {key:found[0], value:found[1]};
  }
  return null;
}
function statusValue(row){
  const f = pickMetricField(row, ["status","member_status","user_status","membership_status","activity_status","state"], [/status$/,/^state$/], v => v !== null && v !== undefined && String(v).trim() !== "");
  return f ? String(f.value).trim().toLowerCase() : "";
}
const userStatuses = new Map();
function rebuildUserStatuses(){
  userStatuses.clear();
  (userMetricRows || []).forEach(row => {
    const id = metricUserId(row); if (!id) return;
    const status = statusValue(row); if (status) userStatuses.set(id, status);
  });
  leftFilterError = "";
}
function isLeftUser(id){
  const status = userStatuses.get(String(id));
  return status === "left" || status === "leaved" || status === "inactive_left" || status === "departed";
}
// Участники, исключённые в Настройках → Участники: не показываются нигде на сайте
const PEOPLE_HIDDEN_KEY = "chatstats.peopleHidden.v1";
let PEOPLE_HIDDEN = new Set();
try { const j = JSON.parse(localStorage.getItem(PEOPLE_HIDDEN_KEY) || "[]"); if (Array.isArray(j)) PEOPLE_HIDDEN = new Set(j.map(String)); } catch (e) {}
const isExcludedUser = id => PEOPLE_HIDDEN.has(String(id));
function isVisibleUser(id){ return !isExcludedUser(id) && (!hideLeft || !isLeftUser(id)); }
function metricDisplayName(row){
  const id = metricUserId(row);
  if (id && NAMES[id]) return NAMES[id];
  for (const k of [F.name,"user_name","participant_name","name","username","full_name"]) if (row?.[k] != null && String(row[k]).trim()) return String(row[k]).trim();
  return id ? `ID ${id}` : "—";
}
function numberValue(v){
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[\s\u00a0]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function metricRecordCount(row){
  const exact = ["max_daily_messages","max_messages_per_day","max_messages_in_day","max_messages_day","max_daily_message_count","max_message_count_per_day","max_messages_count_per_day","max_msgs_per_day","record_messages","messages_max_per_day","max_messages"];
  const f = pickMetricField(row, exact, [/^(max|record|peak).*(messages|message|msgs|msg|text).*(daily|day|perday|inday|count)?$/,/^(messages|message|msgs|msg|text).*(max|record|peak).*(day|daily|perday|inday)?$/], (v,k) => numberValue(v) !== null && !/date|streak|consecutive|silent|silence/i.test(k));
  return f ? numberValue(f.value) : null;
}
function metricRecordDate(row){
  const exact = ["max_daily_messages_date","max_messages_per_day_date","max_messages_in_day_date","max_messages_date","max_message_date","max_msgs_date","record_messages_date","max_daily_message_date","date_max_messages","max_messages_at","max_messages_on","record_date"];
  const f = pickMetricField(row, exact, [/^(max|record|peak).*(messages|message|msgs|msg|text).*(date|at|on|datetime|timestamp)$/,/^(date|datetime|timestamp).*(max|record|peak).*(messages|message|msgs|msg|text)$/], v => v != null && String(v).trim() !== "");
  if (!f) {
    // Some schemas name the date column simply max_messages_day; accept it only when its value parses as a date.
    const maybe = Object.entries(row || {}).find(([k,v]) => /max.*(messages|message|msgs|msg).*day/i.test(k) && parseDate(v));
    return maybe ? maybe[1] : null;
  }
  return f.value;
}
function metricDuration(row, kind){
  if (kind === "streak") {
    const exact = ["max_consecutive_message_days","max_consecutive_days","longest_message_streak_days","max_active_streak_days","max_days_with_messages_in_a_row","max_days_with_messages","longest_active_streak","max_message_streak_days","consecutive_message_days"];
    const f = pickMetricField(row, exact, [/(max|longest|record).*(consecutive|streak|inrow|dayswithmessages|activedays)/,/(consecutive|streak).*(days|messages)/], (v,k) => numberValue(v) !== null && !/date/i.test(k));
    return f ? numberValue(f.value) : null;
  }
  const exact = ["max_silent_days","max_silence_days","max_days_without_messages","longest_silence_days","longest_gap_days","max_inactive_days","max_no_messages_days","max_days_without_message","longest_inactive_period_days","max_silence_duration_days"];
  const f = pickMetricField(row, exact, [/(max|longest|record).*(silent|silence|inactive|withoutmessages|withoutmessage|nomessages|gap|noactivity)/,/(silent|silence|inactive|withoutmessages|withoutmessage|nomessages|gap).*(days|duration)/], (v,k) => numberValue(v) !== null && !/date/i.test(k));
  return f ? numberValue(f.value) : null;
}
function formatMetricDate(value){
  const d = parseDate(value);
  if (d) return formatDateRu(d);
  return value == null || value === "" ? "—" : String(value);
}

function setDayLabel(){
  const l = document.querySelector("#f-day label"), r = mode === "week" || mode === "range" ? range() : null;
  const f = x => x.slice(8) + "." + x.slice(5,7);
  const activeTab = activeDataTab();
  const rolling = ["participants", "chats", "charts"].includes(activeTab);
  l.textContent = r ? `${mode === "range" ? "Период" : mode === "week" && rolling ? "Последние 7 дней" : "Неделя"}: ${f(r[0])}–${f(r[1])}` : (mode === "week" ? "Дата в неделе" : "Дата");
}
async function load(){
  setDayLabel();
  const r = range(); if (!r) return;
  const id = ++reqId;
  const activeTab = activeDataTab();
  const needComparison = comparisonEnabled && mode !== "all" && ["participants", "chats"].includes(activeTab);
  const oldRange = needComparison ? previousPeriodRange(r) : null;
  comparisonRows = null; comparisonError = "";
  setStatus("");
  if (!(mode === "all" && allRows) && !LIVE) { $("body").innerHTML = skRows(5); $("chat-rank-body").innerHTML = skRows(6); }
  try {
    if (hideLeft) {
      try { await ensureUserMetrics(); }
      catch (e) { leftFilterError = e.message || String(e); }
      renderPeople();
    }
    const cached = mode === "all" && allRows;
    const raw = cached ? null : await fetchAll(r[0], r[1]);
    if (id !== reqId) return;
    const all = cached ? allRows : ultView(raw);
    if (mode === "all" && !allRows) { rawHist = raw; allRows = all; }
    if (!cached) stamp();
    rows = all.filter(x => {
      const d = String(x[F.date] ?? "").slice(0, 10);
      return !d || (d >= r[0] && d <= r[1]);
    });
    if (oldRange) {
      try {
        const prior = ultView(await fetchAll(oldRange[0], oldRange[1]));
        if (id !== reqId) return;
        comparisonRows = prior.filter(x => {
          const d = String(x[F.date] ?? "").slice(0, 10);
          return !d || (d >= oldRange[0] && d <= oldRange[1]);
        });
      } catch (e) { comparisonError = e.message || String(e); }
    }
    syncComparisonControls();
    fillChats();
    render();
    if ($("tab-charts").classList.contains("active") && $("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
  } catch (e) {
    if (id !== reqId) return;
    rows = []; render();
    setStatus("Не удалось загрузить данные: " + e.message +
      (e instanceof TypeError ? " (запущен ли start.bat и открыта ли страница по адресу http://localhost:8000/?)" : ""), true);
  }
}

// Строки chat_pk = 0 — «все чаты». Если таких строк нет, суммируем всё.
const hasAll = () => rows.some(x => Number(x[F.chatPk]) === 0);

function fillChats(){
  const sel = $("chat"), cur = sel.value;
  const src = hasAll() ? rows.filter(x => Number(x[F.chatPk]) !== 0) : rows;
  const titles = [...new Set(src.map(x => x[F.chat]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  sel.innerHTML = '<option value="">Все чаты</option>';
  titles.sort((a, b) => (b === ULT_NAME) - (a === ULT_NAME)).forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t === ULT_NAME ? "⚡ " + t : t; sel.appendChild(o); });
  sel.value = titles.includes(cur) ? cur : "";
}

function hasAllIn(sourceRows){ return sourceRows.some(x => Number(x[F.chatPk]) === 0); }
function aggregateParticipants(sourceRows){
  const chat = $("chat").value;
  let src;
  if (chat) src = sourceRows.filter(x => x[F.chat] === chat && Number(x[F.chatPk]) !== 0);
  else src = hasAllIn(sourceRows) ? sourceRows.filter(x => Number(x[F.chatPk]) === 0) : sourceRows;
  const map = new Map();
  src.forEach(x => {
    const key = String(x[F.userId] ?? x[F.name]);
    if (!isVisibleUser(key)) return;
    const u = map.get(key) || {key, name:NAMES[x[F.userId]] || x[F.name] || "—", msgs:0, voice:0, video:0, stick:0, rgive:0, rgot:0, days:new Set()};
    let any = 0; ["msgs","voice","video","stick", ...RX_KEYS].forEach(k => { const v = Number(g(x, k)) || 0; u[k] += v; any += v; });
    if (any) u.days.add(String(x[F.date] ?? "").slice(0, 10));
    map.set(key, u);
  });
  return map;
}
function sumMapMetric(map, metric){ return [...map.values()].reduce((sum,u)=>sum+(Number(u[metric])||0),0); }
function participantsPeriodTitle(){
  const selection = $("participants-top")?.value || "all";
  const prefix = selection === "all" ? "Рейтинг всех участников" : `Топ-${Number(selection)} участников`;
  if (mode === "all") return `${prefix} за всё время`;
  const r = range();
  if (!r) return `${prefix} за выбранный период`;
  const currentYear = new Date().getFullYear();
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const monthNames = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  if (mode === "day") {
    const [y,m,d] = r[0].split("-").map(Number);
    return `${prefix} за ${d} ${months[m-1]}${y !== currentYear ? " " + y : ""}`;
  }
  if (mode === "week") return `${prefix} за последние 7 дней`;
  if (mode === "range") return `${prefix} за ${rangeTitle(r)}`;
  if (mode === "month") {
    const [y,m] = r[0].split("-").map(Number);
    return `${prefix} за ${monthNames[m-1]}${y !== currentYear ? " " + y : ""}`;
  }
  const year = Number(r[0].slice(0,4));
  return `${prefix} за ${year} год`;
}
function render(){
  const rawPM = aggregateParticipants(rows), map = normMap(rawPM);
  const compareOn = comparisonEnabled && mode !== "all" && Array.isArray(comparisonRows) && !comparisonError;
  const priorMap = compareOn ? normMap(aggregateParticipants(comparisonRows)) : new Map();
  // Top-N is based on message count; header sorting rearranges only the selected top participants.
  const topValue = $("participants-top")?.value || "all";
  const topCount = topValue === "all" ? Infinity : Number(topValue);
  const ranked = [...map.values()].filter(u => !isTableRowExcluded("participants", u.key)).sort((a,b) => (b.msgs - a.msgs) || a.name.localeCompare(b.name,"ru"));
  const topList = ranked.slice(0, topCount);
  const visibleMap = new Map(topList.map(u => [u.key, u]));
  const visiblePriorMap = new Map(topList.filter(u => priorMap.has(u.key)).map(u => [u.key, priorMap.get(u.key)]));
  const list = topList.sort((a,b) =>
    sort.k === "name" ? -sort.dir * a.name.localeCompare(b.name,"ru")
                      : sort.dir * (a[sort.k] - b[sort.k]));
  const title = $("participants-period-title");
  if (title) title.textContent = participantsPeriodTitle() + normSuffix();

  $("head").innerHTML = COLS.map(c =>
    `<th tabindex="0" data-k="${c.k}" class="${sort.k===c.k?"sorted":""}"${c.full ? ` title="${c.full}"` : ""}>${c.t}${sort.k===c.k?(sort.dir<0?" ↓":" ↑"):""}</th>`).join("");
  document.querySelectorAll("#head th").forEach(th => {
    const go = () => { const k = th.dataset.k; if (k === "place") return; sort = {k, dir: sort.k===k ? -sort.dir : -1}; render(); };
    th.onclick = go; th.onkeydown = e => { if (e.key === "Enter") go(); };
  });

  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const cell = (u,k) => displayedCell(Number(u[k])||0, Number((priorMap.get(u.key)||{})[k])||0, compareOn, priorMap.has(u.key));
  // изменение места относительно прошлого периода (только при включённом «Сравнении» и сортировке по сообщениям)
  const priorPlace = new Map(), curPlace = new Map();
  if (compareOn && sort.k === "msgs" && sort.dir < 0) {
    ranked.forEach((u, i) => curPlace.set(u.key, i + 1));
    [...priorMap.values()].filter(u => isVisibleUser(u.key) && !isTableRowExcluded("participants", u.key)).sort((a, b) => (b.msgs - a.msgs) || a.name.localeCompare(b.name, "ru")).forEach((u, i) => priorPlace.set(u.key, i + 1));
  }
  const rkDelta = u => {
    if (!priorPlace.size) return "";
    const p0 = priorPlace.get(u.key), c0 = curPlace.get(u.key);
    if (!p0) return ` <small class="pl-delta pl-new" title="В прошлом периоде не было в рейтинге">new</small>`;
    const d = p0 - c0; if (!d) return ` <small class="pl-delta pl-eq" title="Место не изменилось">=</small>`;
    return ` <small class="pl-delta ${d > 0 ? "pl-up" : "pl-dn"}" title="Прошлый период: ${p0}-е место">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</small>`;
  };
  $("body").innerHTML = list.length
    ? list.map((u, i) => `<tr data-row-entity="participants" data-row-key="${esc(u.key)}"><td class="${i < 3 ? "medal-" + (i + 1) : ""}">${i + 1}${rkDelta(u)}</td><td><div class="row-name-with-action"><span class="pname" data-open-profile="${esc(u.key)}">${esc(u.name)}</span>${goalMini(u.key, rawPM.get(u.key))}<button type="button" class="row-exclude-btn" data-no-export="true" data-exclude-row="participants" data-row-key="${esc(u.key)}" data-row-name="${esc(u.name)}" title="Исключить из таблицы" aria-label="Исключить ${esc(u.name)} из таблицы">×</button></div></td>${cell(u,"msgs")}${cell(u,"voice")}${cell(u,"video")}${cell(u,"stick")}${RX_KEYS.map(k => cell(u, k)).join("")}</tr>`).join("")
    : `<tr><td colspan="${COLS.length}" style="text-align:center;color:var(--muted)">${EXCLUDED_TABLE_ROWS.participants.size ? "Нет строк: участники исключены из таблицы" : "Нет данных за выбранный период"}</td></tr>`;

  $("foot").innerHTML = list.length
    ? (NORM === "day" ? "" : `<tr class="total-row"><td class="total-place"></td><td class="total-label">Всего (${list.length})</td>${["msgs","voice","video","stick", ...RX_KEYS].map(k => displayedCell(sumMapMetric(visibleMap,k), sumMapMetric(visiblePriorMap,k), compareOn, visiblePriorMap.size > 0)).join("")}</tr>`)
      + statRows(list, ["msgs","voice","video","stick", ...RX_KEYS], label => `<td></td><td>${label}</td>`) : "";

  let statusText = hideLeft && leftFilterError ? `Не удалось получить статусы участников: ${leftFilterError}. Вышедшие не отфильтрованы.` : "";
  if (comparisonEnabled && mode === "all") statusText = [statusText, "Сравнение недоступно для режима «Все данные». Выберите день, неделю, месяц или год."].filter(Boolean).join(" ");
  else if (comparisonEnabled && comparisonError && ["participants","chats"].includes(activeDataTab())) statusText = [statusText, `Не удалось загрузить предыдущий период: ${comparisonError}`].filter(Boolean).join(" ");
  setStatus(statusText, Boolean(comparisonEnabled && comparisonError));
  renderExcludedRowsControls("participants");
  try { renderQuiet(); } catch (e) {}
  if ($("tab-chats").classList.contains("active")) renderChatRank();
  if ($("tab-charts").classList.contains("active")) {
    renderCharts();
    if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
  }
}

/* ---------- Профиль ---------- */
let allRows = null, histP = null;
function getHistory(){
  if (allRows) return Promise.resolve(allRows);
  return histP || (histP = fetchAll("2000-01-01", iso(new Date()))
    .then(r => { allRows = r; stamp(); return r; })
    .catch(e => { histP = null; throw e; }));
}
const MET = ["msgs","stick","voice","video"];
const escH = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt = v => v.toLocaleString("ru-RU");
const person = $("person");
Object.entries(NAMES).filter(([pk]) => !isExcludedUser(pk)).sort((a,b) => a[1].localeCompare(b[1],"ru")).forEach(([pk, n]) => {
  const o = document.createElement("option"); o.value = pk; o.textContent = n; person.appendChild(o);
});
person.onchange = () => { person.dataset.init = "1"; renderProfile(); };

function pStatus(t, err){ const s = $("p-status"); s.textContent = t; s.className = "status" + (err ? " err" : ""); }

async function loadProfile(){
  if (!allRows) $("p-out").innerHTML = `<div class="sk sk-poster" style="height:130px"></div>` + skPage(4, 2);
  try {
    await getHistory();
    try { await ensureUserMetrics(); } catch (e) { leftFilterError = e.message || String(e); }
    pStatus("");
    if (!person.dataset.init) { person.dataset.init = "1"; try { const me = window.__me && window.__me.get(); if (me && [...person.options].some(o => o.value === me)) person.value = me; } catch (e) {} }
    renderProfile();
  } catch (e) { pStatus("Не удалось загрузить данные: " + e.message, true); }
}

function renderProfile(){
  if (!allRows) return;
  const pk = person.value;
  const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0);
  const tot = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
  const today = iso(new Date());
  const P = [
    ["Сегодня", d => d === today],
    ["Этот месяц", d => d.startsWith(today.slice(0,7))],
    ["Этот год", d => d.startsWith(today.slice(0,4))],
    ["За всё время", () => true],
  ];
  const stats = P.map(([, f]) => {
    const m = new Map();
    tot.forEach(x => {
      if (!f(String(x[F.date] ?? "").slice(0,10))) return;
      const k = String(x[F.userId]);
      const u = m.get(k) || {msgs:0, stick:0, voice:0, video:0};
      MET.forEach(t => u[t] += Number(g(x, t)) || 0);
      m.set(k, u);
    });
    return m;
  });
  const cell = (i, t) => {
    const m = stats[i], mine = (m.get(pk) || {})[t] || 0;
    if (!mine) return {v:0, place:"—"};
    let better = 0, n = 0;
    m.forEach(u => { if (u[t] > 0) n++; if (u[t] > mine) better++; });
    return {v:mine, place:`${better+1} место из ${n}`};
  };

  const tiles = P.map(([l], i) => { const c = cell(i, "msgs");
    return `<div class="tile"><div class="lbl">${l}</div><div class="num">${fmt(c.v)}</div><div class="place">${c.place}</div></div>`; }).join("");

  const media = [["stick","Стикеры"], ["voice","Голосовые"], ["video","Видеосообщения"]];
  // Периоды, где у участника нет ни стикеров, ни голосовых, ни кружков, не занимают строку таблицы — они перечислены под ней.
  const mediaRows = P.map(([l], i) => ({l, cells: media.map(([k]) => cell(i, k))}));
  const mediaFull = mediaRows.filter(r => r.cells.some(c => c.v)), mediaEmpty = mediaRows.filter(r => !r.cells.some(c => c.v)).map(r => r.l);
  const mediaTbl = !mediaFull.length ? `<p class="hint p-media-none">Стикеров, голосовых и видеосообщений пока нет.</p>` :
    `<div class="wrap"><table class="p-media"><thead><tr><th>Период</th>${media.map(([,t]) => `<th>${t}</th>`).join("")}</tr></thead><tbody>` +
    mediaFull.map(r => `<tr><td>${r.l}</td>${r.cells.map(c => c.v ? `<td>${fmt(c.v)}<small>${c.place}</small></td>` : `<td class="zero">0</td>`).join("")}</tr>`).join("") + `</tbody></table></div>` +
    (mediaEmpty.length ? `<p class="hint p-media-note">${mediaEmpty.map((l, i) => i ? l.charAt(0).toLowerCase() + l.slice(1) : l).join(", ")} — пока ничего.</p>` : "");

  const byChat = new Map();
  allRows.filter(x => String(x[F.userId]) === pk && (!hasTot || Number(x[F.chatPk]) !== 0)).forEach(x => {
    const k = x[F.chat] || "—";
    const u = byChat.get(k) || {msgs:0, stick:0, voice:0, video:0};
    MET.forEach(t => u[t] += Number(g(x, t)) || 0);
    byChat.set(k, u);
  });
  const list = [...byChat.entries()].sort((a,b) => b[1].msgs - a[1].msgs);
  const total = list.reduce((s, [, u]) => s + u.msgs, 0);
  const chatTbl = `<div class="wrap"><table><thead><tr><th>Чат</th><th>Сообщения</th><th>Доля</th><th>Стикеры</th><th>Голосовые</th><th>Видеосообщения</th></tr></thead><tbody>` +
    (list.length ? list.map(([c, u]) => `<tr><td>${escH(c)}</td><td>${fmt(u.msgs)}</td><td class="share-cell">${total ? Math.round(u.msgs / total * 100) + "%" : "—"}<span class="share-bar"><i style="width:${total ? (u.msgs / total * 100).toFixed(1) : 0}%"></i></span></td><td>${fmt(u.stick)}</td><td>${fmt(u.voice)}</td><td>${fmt(u.video)}</td></tr>`).join("")
      : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Нет данных по отдельным чатам</td></tr>`) + `</tbody></table></div>`;

  const mineDaily = new Map();
  tot.forEach(x => {
    if (String(x[F.userId]) !== pk) return;
    const d = String(x[F.date] ?? "").slice(0, 10), v = Number(g(x, "msgs")) || 0;
    if (d.length === 10 && v) mineDaily.set(d, (mineDaily.get(d) || 0) + v);
  });
  const pName = NAMES[pk] || `ID ${pk}`;
  const pColor = getStyle("u", pk).c[0];
  const st = streakStats(mineDaily);
  const metricRow = (userMetricRows || []).find(x => metricUserId(x) === String(pk));
  const mStreak = metricRow ? metricDuration(metricRow, "streak") : null;
  const mSilence = metricRow ? metricDuration(metricRow, "silence") : null;
  const maxStreak = Math.max(mStreak ?? 0, st.maxStreak);
  const maxSilence = Math.max(mSilence ?? 0, st.maxSilence);
  const dayW = n => wordForm(n, ["день","дня","дней"]);
  const startRow = MEMBERSHIP_STARTS.find(([, id]) => String(id) === String(pk));
  let memberLine = "Дата вступления не указана";
  if (startRow) {
    const s0 = parseDate(startRow[0]), t0 = todayUtc(), dd = dateDiffDays(s0, t0);
    memberLine = `В чате с ${formatDateRu(s0)} · ${fmt(dd)} ${dayW(dd)} (${durationText(durationParts(s0, t0))})`;
  }
  const allTime = cell(3, "msgs");
  const avgActive = st.activeDays ? st.total / st.activeDays : 0;
  const pStat = (v, l) => `<div class="p-stat"><b title="${escH(String(v))}">${v}</b><span>${l}</span></div>`;
  const hero = `<div class="p-hero" style="--p-color:${pColor}">
    <div class="p-avatar">${window.AVATAR ? AVATAR.inner(pk, pName.slice(0, 1).toUpperCase()) : escH(pName.slice(0, 1).toUpperCase())}</div>
    <div class="p-hero-main"><div class="p-name">${escH(pName)}${isLeftUser(pk) ? '<span class="p-badge left">вышел(а) из чата</span>' : ""}</div><div class="p-sub">${escH(memberLine)}</div><button class="mini p-cmp-btn" type="button" data-compare-with="${escH(pk)}">Сравнить с…</button></div>
    <div class="p-stats">
      ${pStat(fmt(st.total), "сообщений за всё время")}
      ${pStat(allTime.v ? allTime.place.replace(" место из ", " из ") : "—", "место за всё время")}
      ${pStat(fmt(st.activeDays), "активных дней")}
      ${pStat(st.best ? fmt(st.best.v) : "—", st.best ? `лучший день · ${formatDateRu(parseDate(st.best.d))}` : "лучший день")}
    </div></div>`;

  // Серии активности: текущая рядом с максимальной.
  const curPct = maxStreak ? Math.min(100, Math.round(st.current / maxStreak * 100)) : 0;
  let curNote;
  if (st.current) curNote = `с ${formatDateRu(parseDate(st.start))}${st.todayActive ? "" : " · сегодня ещё нет сообщений"}`;
  else if (st.last) curNote = `последнее сообщение ${formatDateRu(parseDate(st.last))} (${st.sinceLast} ${dayW(st.sinceLast)} назад)`;
  else curNote = "сообщений ещё не было";
  const streaks = `<div class="streak-grid">
    <div class="tile streak-card current${st.current ? "" : " off"}"><div class="lbl">Текущая серия</div><div class="num">${fmt(st.current)} <span style="font-size:16px;color:var(--muted)">${dayW(st.current)}</span></div><div class="place">${escH(curNote)}</div>
      <div class="streak-progress"><i style="width:${curPct}%"></i></div><div class="streak-note">${maxStreak ? (st.current >= maxStreak && st.current ? "это личный рекорд" : `${curPct}% от рекорда · до рекорда ${fmt(maxStreak - st.current + 1)} ${dayW(maxStreak - st.current + 1)}`) : "рекорда пока нет"}</div></div>
    <div class="tile" style="--tile-accent:#9ece6a"><div class="lbl">Максимальная серия</div><div class="num">${fmt(maxStreak)} <span style="font-size:16px;color:var(--muted)">${dayW(maxStreak)}</span></div><div class="place">${st.maxStart ? `${formatDateRu(parseDate(st.maxStart))} — ${formatDateRu(parseDate(st.maxEnd))}` : "дней подряд с сообщениями"}</div></div>
    <div class="tile" style="--tile-accent:#f7768e"><div class="lbl">Максимальный период молчания</div><div class="num">${fmt(maxSilence)} <span style="font-size:16px;color:var(--muted)">${dayW(maxSilence)}</span></div><div class="place">в среднем ${fmtR(avgActive)} сообщ. за активный день</div></div>
  </div>`;

  // Прогноз для выбранного участника.
  const b = fcBounds(pFcPeriod), T = fcCompute(mineDaily, b);
  const word = pFcPeriod === "year" ? "года" : "месяца";
  const fTile = (lbl, num, place, acc = "") => `<div class="tile"${acc ? ` style="--tile-accent:${acc}"` : ""}><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${place}</div></div>`;
  const forecast = `<div class="section-head"><h2>Прогноз сообщений</h2>
      <div class="seg" id="p-fc-period"><button data-p="month" class="${pFcPeriod === "month" ? "active" : ""}">До конца месяца</button><button data-p="year" class="${pFcPeriod === "year" ? "active" : ""}">До конца года</button></div>
      <button class="mini" id="p-fc-settings-toggle" type="button">⚙ Настройка</button><button class="mini copy-btn" id="p-fc-copy" type="button">Копировать</button><span class="hint" id="p-fc-msg"></span></div>
    <div class="chart-settings-panel fc-settings-panel${pFcSettingsOpen ? " open" : ""}" id="p-fc-settings-panel" aria-hidden="${!pFcSettingsOpen}"><div class="chart-settings-heading"><h2>Настройка графика прогноза</h2><button class="mini" id="p-fc-settings-close" type="button">Свернуть</button></div><div id="p-fc-settings-content" class="chart-settings-content fc-settings-content"></div></div>
    <div class="tiles">
      ${fTile(`Сейчас · ${escH(b.label)}`, fmt(T.current), `день ${Math.min(T.elapsed, T.daysTotal)} из ${T.daysTotal}`, "#7aa2f7")}
      ${fTile(`Прогноз к концу ${word}`, `≈ ${fmt(Math.round(T.forecast))}`, `диапазон ${fmt(Math.round(T.lo))}–${fmt(Math.round(T.hi))}`, "#ff4d6d")}
      ${fTile("Темп", fmtR(T.rate), "сообщений в день", "#e0af68")}
      ${fTile(escH(b.prevLabel), fmt(T.prevFull), `на эту же дату: ${fmt(T.prevSame)} ${pctDelta(T.current, T.prevSame)}`, "#8b91a1")}
    </div>
    <div class="chart fc-chart" id="p-fc-chart" style="margin-top:12px">${fcChart("p-fc-chart", mineDaily, b, T, `${pName} · прогноз · ${b.label}`, "сообщения, накопительно")}</div>`;

  // Активность за 12 месяцев и по дням недели.
  const byMonth = new Map(), wd = Array(7).fill(0);
  mineDaily.forEach((v, d) => {
    byMonth.set(d.slice(0, 7), (byMonth.get(d.slice(0, 7)) || 0) + v);
    const a = d.split("-").map(Number);
    wd[(new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay() + 6) % 7] += v;
  });
  const SMn = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const t12 = new Date(), m12 = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(t12.getFullYear(), t12.getMonth() - i, 1); const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; m12.push({k, y:d.getFullYear(), m:d.getMonth(), v:byMonth.get(k) || 0}); }
  const mMax = Math.max(1, ...m12.map(x => x.v)), wMax = Math.max(1, ...wd), wTot = wd.reduce((a, v) => a + v, 0);
  const short = v => v >= 1000 ? shortNum(v) : fmt(v);
  const monthsBars = m12.map((x, i) => `<div class="mbar${i === 11 ? " cur" : ""}" title="${MONTHS[x.m]} ${x.y}: ${fmt(x.v)}"><span class="mbar-v">${x.v ? short(x.v) : ""}</span><div class="mbar-col"><i style="height:${(x.v / mMax * 100).toFixed(1)}%;background:${yearHue(x.y)}"></i></div><span class="mbar-l">${SMn[x.m]}</span></div>`).join("");
  const WDn = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"], topWd = wd.indexOf(Math.max(...wd));
  const wdBars = wd.map((v, i) => `<div class="mbar${i === topWd && v ? " cur" : ""}" title="${WDn[i]}: ${fmt(v)}"><span class="mbar-v">${wTot ? Math.round(v / wTot * 100) + "%" : ""}</span><div class="mbar-col"><i style="height:${(v / wMax * 100).toFixed(1)}%;background:${pColor};opacity:${i === topWd ? 1 : .55}"></i></div><span class="mbar-l">${WDn[i]}</span></div>`).join("");
  const yearsShown = [...new Set(m12.map(x => x.y))];
  // место участника среди всех по сообщениям в каждом из последних 12 месяцев (1 = самый активный)
  const rankKeys = new Set(m12.map(x => x.k)), perMonthUser = new Map();
  tot.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 7); if (!rankKeys.has(d)) return;
    const u = String(x[F.userId]); if (!isVisibleUser(u) && u !== pk) return;
    const v = Number(g(x, "msgs")) || 0; if (!v) return;
    let mm = perMonthUser.get(d); if (!mm) perMonthUser.set(d, mm = new Map()); mm.set(u, (mm.get(u) || 0) + v);
  });
  const rankCols = m12.map(x => {
    const mm = perMonthUser.get(x.k), mine = mm && mm.get(pk); if (!mine) return {...x, rank:null, n:mm ? mm.size : 0};
    let better = 0; mm.forEach(v => { if (v > mine) better++; });
    return {...x, rank:better + 1, n:mm.size};
  });
  const rankN = Math.max(3, ...rankCols.map(x => x.rank || 0));
  const rankBars = rankCols.map((x, i) => `<div class="mbar${x.rank === 1 ? " cur" : ""}" title="${MONTHS[x.m]} ${x.y}: ${x.rank ? `${x.rank}-е место из ${x.n}` : "не писал(а)"}"><span class="mbar-v">${x.rank ? "#" + x.rank : ""}</span><div class="mbar-col"><i style="height:${x.rank ? ((rankN + 1 - x.rank) / rankN * 100).toFixed(1) : 0}%;background:${x.rank === 1 ? "#ffd166" : pColor};opacity:${x.rank ? (x.rank <= 3 ? 1 : .6) : 0}"></i></div><span class="mbar-l">${SMn[x.m]}</span></div>`).join("");
  const rankCard = rankCols.some(x => x.rank) ? `<div class="p-card" style="margin-top:12px"><h3>Место по сообщениям · последние 12 месяцев</h3><div class="mbars">${rankBars}</div><p class="hint" style="margin:6px 0 0">Чем выше столбик, тем выше место среди всех участников за месяц. Золотой — первое место.</p></div>` : "";
  const activity = `<h2>Активность</h2><div class="p-grid2">
    <div class="p-card"><h3>Последние 12 месяцев · ${yearsShown.map(y => `<span style="color:${yearHue(y)}">${y}</span>`).join(" / ")}</h3><div class="mbars">${monthsBars}</div></div>
    <div class="p-card"><h3>По дням недели${wd[topWd] ? ` · чаще всего ${["в понедельник","во вторник","в среду","в четверг","в пятницу","в субботу","в воскресенье"][topWd]}` : ""}</h3><div class="mbars">${wdBars}</div></div>
  </div>${rankCard}`;

  $("p-out").innerHTML = `${hero}
    <h2>Сообщения</h2><div class="tiles">${tiles}</div>
    ${typeof bioProfileHtml === "function" ? bioProfileHtml(pk, pColor) : ""}
    <h2>Серии активности</h2>${streaks}
    ${goalsHtml(pk, pColor)}
    ${forecast}
    ${activity}
    ${radarHtml(pk, pColor)}
    ${selfieProfileHtml(pk)}
    <h2>Стикеры, голосовые, видеосообщения</h2>${mediaTbl}
    ${RX_ON && window.__beta?.profileHtml ? window.__beta.profileHtml(pk, pColor) : ""}
    <h2>По чатам, за всё время</h2><div style="--p-color:${pColor}">${chatTbl}</div>`;
  fcStyleAll();
  if (pFcSettingsOpen) renderFcSettings("p-fc-settings-content");
}
let pFcPeriod = "month";
function streakStats(daily){
  const days = [...daily.entries()].filter(([d, v]) => v > 0 && !vkDay(d)).map(([d]) => d).sort();
  const today = iso(new Date()), yesterday = addDaysIso(today, -1);
  let run = 0, prev = null, runStart = null, maxStreak = 0, maxStart = null, maxEnd = null, maxSilence = 0, best = null, total = 0;
  daily.forEach((v, d) => { if (v > 0 && vkDay(d)) total += v; });
  for (const d of days) {
    const v = daily.get(d); total += v;
    if (!best || v > best.v) best = {d, v};
    if (prev && dayIdx(d) - dayIdx(prev) === 1) run++;
    else { if (prev) maxSilence = Math.max(maxSilence, dayIdx(d) - dayIdx(prev) - 1); run = 1; runStart = d; }
    if (run > maxStreak) { maxStreak = run; maxStart = runStart; maxEnd = d; }
    prev = d;
  }
  const sinceLast = prev ? dayIdx(today) - dayIdx(prev) : null;
  if (prev) maxSilence = Math.max(maxSilence, sinceLast - 1);
  const todayActive = (daily.get(today) || 0) > 0;
  let current = 0, start = null, d = todayActive ? today : yesterday;
  while ((daily.get(d) || 0) > 0) { current++; start = d; d = addDaysIso(d, -1); }
  return {current, start, todayActive, maxStreak, maxStart, maxEnd, maxSilence, last: prev, sinceLast, activeDays: days.length, total, best};
}
$("p-out").addEventListener("click", e => {
  const pb = e.target.closest("#p-fc-period button");
  if (pb) { pFcPeriod = pb.dataset.p; renderProfile(); return; }
  if (e.target.closest("#p-fc-copy")) {
    const svg = $("p-fc-chart")?.querySelector("svg");
    copyPngToStatus(() => svgToPngBlob(svg, chartPrefs("forecast")), $("p-fc-msg"), "График скопирован");
  }
});

/* ---------- Цвета лет для топов ---------- */
const YEAR_PAL = ["#7aa2f7","#ff9e64","#9ece6a","#bb9af7","#2ac3de","#f7768e","#e0af68","#73daca","#ff7eb6","#c0caf5","#b4f9f8","#f6c177"];
const yearHue = y => YEAR_PAL[(((Number(y) - 2015) % YEAR_PAL.length) + YEAR_PAL.length) % YEAR_PAL.length];
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hexA = (h, a) => `rgba(${hexRgb(h).join(",")},${a})`;
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
// Лёгкий градиент для одноцветных участников: начало темнее, конец светлее. Выключается в «Настройки → Эффекты».
var SOFT_GRAD = (() => { try { return localStorage.getItem("chatstats.softGrad.v1") !== "0"; } catch (e) { return true; } })();
const softPair = c => { if (!/^#[0-9a-f]{6}$/i.test(String(c || ""))) return [c, c]; return [mixHex(c, "#000000", .2), mixHex(c, "#ffffff", .2)]; };
let softGid = 0;
// SVG: заливка слева направо (по рамке фигуры) — {f: значение fill, d: <defs>}
function softSvg(c, vertical){
  if (!SOFT_GRAD) return {f:c, d:""};
  const [a, z] = softPair(c); if (a === z) return {f:c, d:""};
  const id = "sg" + (++softGid);
  return {f:`url(#${id})`, d:`<defs><linearGradient id="${id}" x1="0" y1="${vertical ? 1 : 0}" x2="${vertical ? 0 : 1}" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${z}"/></linearGradient></defs>`};
}
// Canvas: горизонтальный градиент от x0 до x1
function softCanvas(ctx, c, x0, x1){
  if (!SOFT_GRAD || x1 <= x0) return c;
  const [a, z] = softPair(c); if (a === z) return c;
  const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(1, z); return g;
}
let ROW_BASE = "#171a22";
function yearRowCells(y, place, label, nums, pct, extraRowClass = ""){
  const yc = yearHue(y);
  return `<tr class="${extraRowClass.trim()}"><td style="text-align:center;border-left:4px solid ${yc}">${place}</td>`
    + `<td style="text-align:left"><span class="yname">${label}<span class="ychip" style="color:${yc};border-color:${hexA(yc, .55)};background-color:${hexA(yc, .12)}">${y}</span></span></td>`
    + nums.map(v => `<td class="${v ? "" : "zero"}">${v ? fmt(v) : "-"}</td>`).join("") + `</tr>`;
}
function renderYearLegend(hostId, yearTotals, active, onPick){
  const host = $(hostId); if (!host) return;
  const years = [...yearTotals.keys()].sort();
  if (years.length < 2) { host.innerHTML = ""; return; }
  host.classList.toggle("filtered", Boolean(active));
  host.innerHTML = `<button type="button" class="ychip-btn all${active ? "" : " active"}" style="--yc:var(--accent)" data-year="">Все годы</button>` +
    years.map(y => `<button type="button" class="ychip-btn${active === y ? " active" : ""}" style="--yc:${yearHue(y)}" data-year="${y}"><i></i>${y}<small>${fmt(yearTotals.get(y))}</small></button>`).join("");
  host.onclick = e => { const btn = e.target.closest("[data-year]"); if (btn) onPick(btn.dataset.year === active ? "" : btn.dataset.year); };
}

/* ---------- Общие функции ---------- */
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MLBL = {msgs:"Сообщения", stick:"Стикеры", voice:"Голосовые", video:"Видеосообщения", rgive:"Поставленные реакции", rgot:"Полученные реакции"};
const who = x => NAMES[x[F.userId]] || x[F.name] || "—";
// Строки chat_pk = 0 — «все чаты»; иначе строки нужного чата; если «нулевых» нет — все строки
function pick(arr, chat){
  const hasT = arr.some(x => Number(x[F.chatPk]) === 0);
  if (chat) return arr.filter(x => x[F.chat] === chat && Number(x[F.chatPk]) !== 0);
  return hasT ? arr.filter(x => Number(x[F.chatPk]) === 0) : arr;
}
const scoped = () => pick(rows, $("chat").value);
function fillChatSel(sel, arr){
  const cur = sel.value, hasT = arr.some(x => Number(x[F.chatPk]) === 0);
  const titles = [...new Set((hasT ? arr.filter(x => Number(x[F.chatPk]) !== 0) : arr).map(x => x[F.chat]).filter(Boolean))].sort((a,b) => a.localeCompare(b,"ru"));
  sel.innerHTML = '<option value="">Все чаты</option>';
  titles.sort((a, b) => (b === ULT_NAME) - (a === ULT_NAME)).forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t === ULT_NAME ? "⚡ " + t : t; sel.appendChild(o); });
  sel.value = titles.includes(cur) ? cur : "";
}

/* ===================== Colony Ultimate ===================== */
const ULT_KEY = "chatstats.ultimate.v1", ULT_PK = "ultimate", ULT_NAME = "Colony Ultimate", ULT_COLOR = "#f5c542";
let ULT = {on:false, sel:{}};
try { const j = JSON.parse(localStorage.getItem(ULT_KEY) || "null"); if (j) ULT = {on:!!j.on, sel:(j.sel && typeof j.sel === "object") ? j.sel : {}}; } catch (e) {}
let ultVer = 0, rawHist = null;
const ultSave = () => { try { localStorage.setItem(ULT_KEY, JSON.stringify(ULT)); } catch (e) {} };
const ultDefaultMember = t => !/original|premium/i.test(String(t));
const ultIsMember = t => !!t && t !== ULT_NAME && (Object.prototype.hasOwnProperty.call(ULT.sel, t) ? !!ULT.sel[t] : ultDefaultMember(t));
const isUltPk = pk => String(pk) === ULT_PK;
function ultTitles(arr){
  const m = new Map();
  (arr || []).forEach(x => { const t = x[F.chat]; if (!t || Number(x[F.chatPk]) === 0 || isUltPk(x[F.chatPk])) return; m.set(t, (m.get(t) || 0) + (Number(g(x, "msgs")) || 0)); });
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
}
// Строки отмеченных чатов сливаются в одну строку на участника и день.
function ultMerge(arr){
  const m = new Map(), skip = new Set([F.date, F.userId, F.chatPk, F.chat, F.name]);
  for (const x of arr) {
    if (Number(x[F.chatPk]) === 0 || isUltPk(x[F.chatPk]) || !ultIsMember(x[F.chat])) continue;
    const k = String(x[F.date] ?? "").slice(0, 10) + "|" + String(x[F.userId] ?? x[F.name]);
    const r = m.get(k);
    if (!r) { m.set(k, {...x, [F.chat]:ULT_NAME, [F.chatPk]:ULT_PK}); continue; }
    for (const key in x) {
      if (skip.has(key)) continue;
      const v = x[key];
      if (typeof v === "number") r[key] = (Number(r[key]) || 0) + v;
      else if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) && /^-?\d+(\.\d+)?$/.test(String(r[key] ?? "0"))) r[key] = (Number(r[key]) || 0) + Number(v);
    }
  }
  return [...m.values()];
}
const ULT_MEMO = new WeakMap();
const VKDAYS = new Set();
function vkDay(d){ return VKDAYS.size > 0 && VKDAYS.has(d); }
function ultView(arr){
  if (Array.isArray(arr) && window.__vkAugment) arr = window.__vkAugment(arr);
  if (!ULT.on || !Array.isArray(arr)) return arr;
  const c = ULT_MEMO.get(arr); if (c && c.v === ultVer) return c.out;
  const out = arr.filter(x => Number(x[F.chatPk]) === 0 || !ultIsMember(x[F.chat])).concat(ultMerge(arr));
  ULT_MEMO.set(arr, {v:ultVer, out}); return out;
}
let ultOnlyMemo = null;
function ultOnlyRows(){
  if (!rawHist) return [];
  if (ultOnlyMemo && ultOnlyMemo.src === rawHist && ultOnlyMemo.v === ultVer) return ultOnlyMemo.out;
  const out = ultMerge(window.__vkAugment ? window.__vkAugment(rawHist) : rawHist); ultOnlyMemo = {src:rawHist, v:ultVer, out}; return out;
}
// Строки чата по названию; Colony Ultimate доступен даже при выключенном переключателе.
function chatSrc(name){ if (name === ULT_NAME && !ULT.on) return ultOnlyRows(); return pick(allRows, name); }
function ultSync(){
  const b = $("ult-toggle"); if (b) { b.classList.toggle("on", ULT.on); b.setAttribute("aria-pressed", String(ULT.on)); }
  const c = $("ult-on"); if (c) c.checked = ULT.on;
}
async function ultApply(){
  ultVer++; ultSave(); ultSync();
  rows = []; comparisonRows = null;
  if (rawHist) allRows = ultView(rawHist); else { allRows = null; histP = null; }
  try { dmCache.clear(); mrCache.clear(); } catch (e) {}
  await refreshAll(true);
  if ($("tab-settings")?.classList.contains("active")) renderUltSettings();
}
async function renderUltSettings(){
  const box = $("ult-list"); if (!box) return;
  ultSync();
  if (!rawHist) { box.innerHTML = `<p class="hint">Загружаю список чатов…</p>`; try { await getHistory(); } catch (e) { box.innerHTML = `<p class="hint">Не удалось загрузить чаты: ${escH(e.message || e)}</p>`; return; } }
  const list = ultTitles(rawHist || []);
  box.innerHTML = list.map(([t, v]) => `<label class="ult-item${ultIsMember(t) ? " on" : ""}"><input type="checkbox" data-ult-chat="${escH(t)}"${ultIsMember(t) ? " checked" : ""}><span>${escH(t)}</span><small>${fmt(v)}</small></label>`).join("") || `<p class="hint">Чатов с названием нет.</p>`;
  const inc = list.filter(([t]) => ultIsMember(t)), tot = inc.reduce((s2, [, v]) => s2 + v, 0);
  $("ult-sum").textContent = `В Ultimate: ${inc.length} ${wordForm(inc.length, ["чат", "чата", "чатов"])}, ${fmt(tot)} сообщений за всё время.`;
}
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset?.ultChat !== undefined) {
    const name = t.dataset.ultChat;
    if (t.checked === ultDefaultMember(name)) delete ULT.sel[name]; else ULT.sel[name] = t.checked;
    t.closest(".ult-item")?.classList.toggle("on", t.checked);
    if (ULT.on) ultApply(); else { ultVer++; ultSave(); renderUltSettings(); }
  } else if (t.id === "ult-on") { ULT.on = t.checked; ultApply(); }
});

/* ---------- Топ месяцев: используем полную историю user_daily_stats ---------- */
let mSort = "msgs", mDir = -1;
function mStatus(t, err){ const e = $("m-status"); e.textContent = t; e.className = "status" + (err ? " err" : ""); }
document.querySelectorAll("#m-sort button").forEach(b => b.onclick = () => {
  mSort = b.dataset.s; document.querySelectorAll("#m-sort button").forEach(x => x.classList.toggle("active", x === b)); renderMonths(); });
document.querySelectorAll("#m-dir button").forEach(b => b.onclick = () => {
  mDir = Number(b.dataset.d); document.querySelectorAll("#m-dir button").forEach(x => x.classList.toggle("active", x === b)); renderMonths(); });
$("m-chat").onchange = renderMonths;
$("m-month").onchange = renderMonths;
const WD_PL = ["воскресенья", "понедельники", "вторники", "среды", "четверги", "пятницы", "субботы"];
const wdOf = k => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10))).getUTCDay();
// Подпись выбранного фильтра «один месяц / один день недели» для подсказки и заголовка картинки.
function topFilterLabel(kind){
  const v = $(kind === "months" ? "m-month" : "d-wd")?.value || "";
  if (!v) return "";
  return kind === "months" ? MONTHS[+v - 1].toLowerCase() + " за все годы" : WD_PL[+v];
}
function topFilterHint(kind, shown){
  const el = $(kind === "months" ? "m-fhint" : "d-fhint"); if (!el) return;
  const lab = topFilterLabel(kind);
  el.hidden = !lab;
  const what = kind === "months" ? ["месяц", "месяца", "месяцев"] : ["день", "дня", "дней"];
  if (lab) el.textContent = `Только ${lab}: ${fmt(shown)} ${wordForm(shown, what)}. Место — из общего топа ${kind === "months" ? "всех месяцев" : "всех дней"}.`;
}
async function loadMonths(){
  if (!allRows) $("m-body").innerHTML = skRows(6, 12);
  try {
    await getHistory();
    fillChatSel($("m-chat"), allRows);
    mStatus("");
    renderMonths();
  } catch (e) { mStatus("Не удалось загрузить историю: " + e.message, true); }
}
let mYear = "";
function monthsData(){
  const m = new Map();
  pick(allRows, $("m-chat").value).forEach(x => {
    const k = String(x[F.date] ?? "").slice(0,7); if (!/^\d{4}-\d{2}$/.test(k)) return;
    const u = m.get(k) || {msgs:0, stick:0, voice:0, video:0, rgive:0, rgot:0};
    [...MET, ...RX_KEYS].forEach(t => u[t] += Number(g(x, t)) || 0);
    m.set(k, u);
  });
  // Фильтр «один месяц»: показываем, например, только октябри, а место берём из общего топа.
  const mm = $("m-month")?.value || "", okM = k => !mm || k.slice(5, 7) === mm;
  const yearTotals = new Map();
  m.forEach((u, k) => { if (okM(k)) yearTotals.set(k.slice(0, 4), (yearTotals.get(k.slice(0, 4)) || 0) + u.msgs); });
  const place = new Map([...m.entries()].sort((a,b) => b[1].msgs - a[1].msgs || a[0].localeCompare(b[0])).map(([k], i) => [k, i + 1]));
  const max = Math.max(1, ...[...m.values()].map(u => u.msgs));
  const curMonth = iso(new Date()).slice(0, 7);
  const entries = [...m.entries()].filter(([k]) => (!mYear || k.startsWith(mYear)) && okM(k));
  const row = ([k, u]) => yearRowCells(k.slice(0, 4), place.get(k), `${MONTHS[+k.slice(5) - 1]}${k === curMonth ? '<span class="now-chip">сейчас</span>' : ""}`,
    [u.msgs, u.stick, u.voice, u.video, ...RX_KEYS.map(t => u[t])], (u.msgs / max * 100).toFixed(1));
  return {entries, yearTotals, row};
}
function renderMonths(){
  if (!allRows) return;
  const data = monthsData();
  renderYearLegend("m-years", data.yearTotals, mYear, y => { mYear = y; renderMonths(); });
  const sorted = data.entries.sort((a,b) => mDir * (mSort === "msgs" ? a[1].msgs - b[1].msgs : (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
  // По умолчанию — топ-25; поиск показывает все совпадения, «Показать все» раскрывает список.
  topFilterHint("months", sorted.length);
  const sel = window.__topLimit ? window.__topLimit.take("months", sorted) : {list:sorted, q:""};
  const list = sel.list;
  let html = "", prevY = null;
  list.forEach(e => {
    const y = e[0].slice(0, 4);
    if (mSort === "date" && y !== prevY && data.yearTotals.size > 1)
      html += `<tr class="year-sep"><td colspan="6" style="border-left:4px solid ${yearHue(y)}"><span class="ychip" style="margin:0 8px 0 0;color:${yearHue(y)};border-color:${hexA(yearHue(y), .55)};background-color:${hexA(yearHue(y), .12)}">${y}</span>${fmt(data.yearTotals.get(y))} сообщений</td></tr>`;
    prevY = y; html += data.row(e);
  });
  $("m-body").innerHTML = html || `<tr><td colspan="6" style="text-align:center;color:var(--muted)">${sel.q ? "Ничего не найдено" : "Нет данных"}</td></tr>`;
}

/* ---------- Топ дней: полная история user_daily_stats ---------- */
let dayTopSort = "msgs", dayTopDir = -1;
function dStatus(t, err){ const e = $("d-status"); e.textContent = t; e.className = "status" + (err ? " err" : ""); }
document.querySelectorAll("#d-sort button").forEach(b => b.onclick = () => {
  dayTopSort = b.dataset.s;
  document.querySelectorAll("#d-sort button").forEach(x => x.classList.toggle("active", x === b));
  renderDays();
});
document.querySelectorAll("#d-dir button").forEach(b => b.onclick = () => {
  dayTopDir = Number(b.dataset.d);
  document.querySelectorAll("#d-dir button").forEach(x => x.classList.toggle("active", x === b));
  renderDays();
});
$("d-chat").onchange = renderDays;
$("d-show-today").onchange = renderDays;
$("d-wd").onchange = renderDays;
async function loadDays(){
  if (!allRows) $("d-body").innerHTML = skRows(6, 12);
  try {
    await getHistory();
    fillChatSel($("d-chat"), allRows);
    dStatus("");
    renderDays();
  } catch (e) { dStatus("Не удалось загрузить историю: " + e.message, true); }
}
let dYear = "";
function daysData(includeToday){
  const byDay = new Map();
  pick(allRows, $("d-chat").value).forEach(x => {
    const k = String(x[F.date] ?? "").slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || vkDay(k)) return;
    const u = byDay.get(k) || {msgs:0, stick:0, voice:0, video:0, rgive:0, rgot:0};
    [...MET, ...RX_KEYS].forEach(t => u[t] += Number(g(x, t)) || 0);
    byDay.set(k, u);
  });
  const today = iso(new Date());
  // The toggle must display today even if the API has not returned a row for it yet.
  if (includeToday && !byDay.has(today)) byDay.set(today, {msgs:0, stick:0, voice:0, video:0, rgive:0, rgot:0});
  // Фильтр «один день недели»: показываем, например, только понедельники, место — из общего топа.
  const wdSel = $("d-wd")?.value || "", okD = k => wdSel === "" || wdOf(k) === +wdSel;
  const yearTotals = new Map();
  byDay.forEach((u, k) => { if (okD(k)) yearTotals.set(k.slice(0, 4), (yearTotals.get(k.slice(0, 4)) || 0) + u.msgs); });
  // Place is always the real ranking by messages, independently of the selected display sorting.
  const ranked = [...byDay.entries()].sort((a,b) => b[1].msgs - a[1].msgs || a[0].localeCompare(b[0]));
  const place = new Map(ranked.map(([k], i) => [k, i + 1]));
  const max = Math.max(1, ...[...byDay.values()].map(u => u.msgs));
  const shortMonths = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"], WDs = ["вс","пн","вт","ср","чт","пт","сб"];
  const entries = [...byDay.entries()].filter(([k]) => (!dYear || k.startsWith(dYear)) && okD(k));
  const row = ([k, u]) => {
    const [y, mo, d] = k.split("-");
    const wd = WDs[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
    const label = `${d} ${shortMonths[Number(mo) - 1] || mo}<span class="wd-mute">${wd}</span>${k === today ? '<span class="now-chip">сегодня</span>' : ""}`;
    return yearRowCells(y, place.get(k), label, [u.msgs, u.stick, u.voice, u.video, ...RX_KEYS.map(t => u[t])], (u.msgs / max * 100).toFixed(1), k === today ? " is-today" : "");
  };
  return {entries, yearTotals, row, today, has: k => byDay.has(k) && okD(k), get: k => byDay.get(k)};
}
function renderDays(){
  if (!allRows) return;
  const showToday = $("d-show-today").checked;
  const data = daysData(showToday);
  renderYearLegend("d-years", data.yearTotals, dYear, y => { dYear = y; renderDays(); });
  const compareDate = (a,b) => a[0].localeCompare(b[0]);
  let list = data.entries.sort((a,b) => {
    if (dayTopSort === "date") return dayTopDir * compareDate(a,b);
    return dayTopDir * (a[1].msgs - b[1].msgs || compareDate(a,b));
  });
  // Pin today's row first for viewing, but keep its original rank in the first column.
  if (showToday && data.has(data.today)) list = [[data.today, data.get(data.today)], ...list.filter(([k]) => k !== data.today)];
  topFilterHint("days", data.entries.length);
  // По умолчанию — топ-25 (закреплённый «сегодня» не считается); поиск показывает все совпадения.
  const pinned = showToday && data.has(data.today) ? (e => e[0] === data.today) : null;
  const sel = window.__topLimit ? window.__topLimit.take("days", list, pinned) : {list, q:""};
  list = sel.list;
  $("d-body").innerHTML = list.length ? list.map(data.row).join("") : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">${sel.q ? "Ничего не найдено" : "Нет данных"}</td></tr>`;
}

/* ---------- Рейтинг чатов за выбранный период ---------- */
let chatRankSort = {k:"msgs", dir:-1};
const CHAT_RANK_COLS = [
  {k:"place", t:"Место"}, {k:"name", t:"Чат"}, {k:"msgs", t:"Сообщения"},
  {k:"stick", t:"Стикеры"}, {k:"voice", t:"Голосовые"}, {k:"video", t:"Видеосообщения"}
];
function aggregateChats(sourceRows){
  const map = new Map();
  sourceRows.filter(x => Number(x[F.chatPk]) !== 0 && (x[F.chat] || x[F.chatPk] !== undefined)).forEach(x => {
    const key = String(x[F.chatPk] ?? x[F.chat]);
    const u = map.get(key) || {name:String(x[F.chat] || `Чат ${key}`), key, msgs:0, stick:0, voice:0, video:0, days:new Set()};
    let any = 0; MET.forEach(k => { const v = Number(g(x, k)) || 0; u[k] += v; any += v; });
    if (any) u.days.add(String(x[F.date] ?? "").slice(0, 10));
    map.set(key, u);
  });
  return map;
}
function chatRankPeriodTitle(){
  if (mode === "all") return "Рейтинг чатов за всё время";
  const r = range();
  if (!r) return "Рейтинг чатов за выбранный период";
  const currentYear = new Date().getFullYear();
  const monthNames = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const monthNamesNominative = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  if (mode === "day") {
    const [y,m,d] = r[0].split("-").map(Number);
    return `Рейтинг чатов за ${d} ${monthNames[m-1]}${y !== currentYear ? " " + y : ""}`;
  }
  if (mode === "week") return "Рейтинг чатов за последние 7 дней";
  if (mode === "range") return `Рейтинг чатов за ${rangeTitle(r)}`;
  if (mode === "month") {
    const [y,m] = r[0].split("-").map(Number);
    return `Рейтинг чатов за ${monthNamesNominative[m-1]}${y !== currentYear ? " " + y : ""}`;
  }
  const year = Number(r[0].slice(0,4));
  return `Рейтинг чатов за ${year} год`;
}
function renderChatRank(){
  const status = $("chat-rank-status");
  const headEl = $("chat-rank-head"), bodyEl = $("chat-rank-body"), footEl = $("chat-rank-foot");
  const titleEl = document.querySelector("#tab-chats h2");
  if (titleEl) titleEl.textContent = chatRankPeriodTitle() + normSuffix();
  if (!headEl || !bodyEl) return;
  headEl.innerHTML = CHAT_RANK_COLS.map(c => {
    const selected = chatRankSort.k === c.k;
    const arrow = selected ? (chatRankSort.dir < 0 ? " ↓" : " ↑") : "";
    return `<th tabindex="0" data-chat-sort="${c.k}" class="${selected ? "sorted" : ""}">${c.t}${arrow}</th>`;
  }).join("");
  headEl.querySelectorAll("th").forEach(th => {
    const go = () => {
      const k = th.dataset.chatSort;
      if (k === "place") return;
      chatRankSort = {k, dir: chatRankSort.k === k ? -chatRankSort.dir : -1};
      renderChatRank();
    };
    th.onclick = go; th.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
  });
  if (!rows.length){ status.textContent = "Нет загруженных данных за выбранный период"; bodyEl.innerHTML = ""; if(footEl) footEl.innerHTML=""; return; }
  const map = normMap(aggregateChats(rows));
  const compareOn = comparisonEnabled && mode !== "all" && Array.isArray(comparisonRows) && !comparisonError;
  const priorMap = compareOn ? normMap(aggregateChats(comparisonRows)) : new Map();
  const list = [...map.values()].filter(u => !isTableRowExcluded("chats", u.key)).sort((a,b) => {
    if (chatRankSort.k === "name") return chatRankSort.dir * a.name.localeCompare(b.name,"ru");
    return chatRankSort.dir * ((a[chatRankSort.k] || 0) - (b[chatRankSort.k] || 0));
  });
  const shownMap = new Map(list.map(u => [u.key, u]));
  // The totals row compares the same set of currently displayed chats.
  const shownPriorMap = new Map(list.filter(u => priorMap.has(u.key)).map(u => [u.key, priorMap.get(u.key)]));
  status.textContent = "";
  bodyEl.innerHTML = list.length ? list.map((u,i) => {
    const value = k => displayedCell(Number(u[k])||0, Number((priorMap.get(u.key)||{})[k])||0, compareOn, priorMap.has(u.key));
    return `<tr data-row-entity="chats" data-row-key="${escH(u.key)}"><td class="${i < 3 ? "medal-" + (i + 1) : ""}">${i+1}</td><td style="text-align:left"><div class="row-name-with-action"><span>${escH(u.name)}</span><button type="button" class="row-exclude-btn" data-no-export="true" data-exclude-row="chats" data-row-key="${escH(u.key)}" data-row-name="${escH(u.name)}" title="Исключить из таблицы" aria-label="Исключить ${escH(u.name)} из таблицы">×</button></div></td>${value("msgs")}${value("stick")}${value("voice")}${value("video")}</tr>`;
  }).join("") : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">${EXCLUDED_TABLE_ROWS.chats.size ? "Нет строк: чаты исключены из таблицы" : "Нет данных по отдельным чатам за выбранный период"}</td></tr>`;
  if (footEl) footEl.innerHTML = list.length ? (NORM === "day" ? "" : `<tr class="total-row"><td class="total-place"></td><td class="total-label">Всего (${list.length} чатов)</td>${["msgs","stick","voice","video"].map(k=>displayedCell(sumMapMetric(shownMap,k),sumMapMetric(shownPriorMap,k),compareOn,shownPriorMap.size > 0)).join("")}</tr>`)
    + statRows(list, ["msgs","stick","voice","video"], label => `<td></td><td>${label}</td>`) : "";
  renderExcludedRowsControls("chats");
}
// Exclude and restore individual rows without modifying the underlying API data.
document.addEventListener("click", e => {
  const excludeBtn = e.target.closest?.("[data-exclude-row]");
  if (excludeBtn) {
    e.preventDefault(); e.stopPropagation();
    const entity = excludeBtn.dataset.excludeRow, key = String(excludeBtn.dataset.rowKey ?? ""), name = String(excludeBtn.dataset.rowName || key);
    if (!EXCLUDED_TABLE_ROWS[entity] || !key) return;
    EXCLUDED_TABLE_ROWS[entity].set(key, name); saveExcludedTableRows();
    exclRerender(entity);
    renderExcludedRowsControls(entity);
    return;
  }
  const restoreBtn = e.target.closest?.("[data-restore-row]");
  if (restoreBtn) {
    e.preventDefault(); e.stopPropagation();
    const entity = restoreBtn.dataset.restoreEntity, key = String(restoreBtn.dataset.restoreRow ?? "");
    if (!EXCLUDED_TABLE_ROWS[entity]) return;
    const host = exclHost(entity), wasOpen = Boolean(host?.querySelector("details")?.open);
    EXCLUDED_TABLE_ROWS[entity].delete(key); saveExcludedTableRows();
    exclRerender(entity);
    renderExcludedRowsControls(entity, wasOpen);
    return;
  }
  const restoreAllBtn = e.target.closest?.("[data-restore-all]");
  if (restoreAllBtn) {
    e.preventDefault(); e.stopPropagation();
    const entity = restoreAllBtn.dataset.restoreAll;
    if (!EXCLUDED_TABLE_ROWS[entity]) return;
    EXCLUDED_TABLE_ROWS[entity].clear(); saveExcludedTableRows();
    exclRerender(entity);
    renderExcludedRowsControls(entity, false);
  }
});


/* ---------- Время участия и ближайшие юбилеи ---------- */
// Даты вступления заданы вручную. ID преобразуются в имена через встроенный словарь NAMES.
// Формат даты: ГГГГ-ММ-ДД.
const MEMBERSHIP_STARTS = [
  ["2025-05-29", 1],
  ["2015-03-27", 2],
  ["2015-03-27", 3],
  ["2019-08-15", 5],
  ["2017-10-10", 7],
  ["2015-09-19", 9],
  ["2019-08-15", 10],
  ["2019-08-15", 11],
  ["2018-07-25", 13],
  ["2018-06-29", 14],
  ["2018-12-10", 16],
  ["2016-10-09", 17],
  ["2018-10-29", 19],
  ["2018-02-27", 20],
  ["2015-03-27", 26],
  ["2021-08-29", 27],
  ["2021-09-26", 28],
  ["2022-06-18", 42],
  ["2022-12-30", 46],
  ["2018-07-28", 55],
  ["2024-03-06", 57],
  ["2023-09-25", 60],
  ["2024-04-27", 62],
  ["2024-05-14", 63],
  ["2023-09-24", 64],
  ["2025-04-09", 66],
  ["2025-09-06", 69],
  ["2025-12-10", 76],
  ["2026-02-26", 89],
  ["2026-08-03", 105],
  ["2015-03-27", 106],
  ["2026-09-15", 107],
  ["2026-10-05", 108],
];
let membershipRows = null;
function timeStatus(message, err = false){ const el = $("time-status"); el.textContent = message; el.className = "status" + (err ? " err" : ""); }
const DAY_MS = 86400000;
function utcDateOnly(date){ return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function todayUtc(){ const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
function parseDate(value){
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : utcDateOnly(value);
  if (typeof value === "number") {
    if (value > 100000000000) return utcDateOnly(new Date(value));
    return null;
  }
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2])-1, Number(m[3])));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : utcDateOnly(d);
}
function dateDiffDays(start, end){ return Math.max(0, Math.floor((utcDateOnly(end) - utcDateOnly(start)) / DAY_MS)); }
function addDaysUtc(date, days){ const d = utcDateOnly(date); d.setUTCDate(d.getUTCDate() + days); return d; }
function addMonthsClamped(date, months){
  const d = utcDateOnly(date), wantedDay = d.getUTCDate();
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(wantedDay, lastDay));
  return first;
}
function durationParts(start, end){
  start = utcDateOnly(start); end = utcDateOnly(end);
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  while (years > 0 && addMonthsClamped(start, years * 12) > end) years--;
  let cursor = addMonthsClamped(start, years * 12);
  let months = (end.getUTCFullYear() - cursor.getUTCFullYear()) * 12 + end.getUTCMonth() - cursor.getUTCMonth();
  while (months > 0 && addMonthsClamped(cursor, months) > end) months--;
  cursor = addMonthsClamped(cursor, months);
  const days = dateDiffDays(cursor, end);
  return {years, months, days};
}
function wordForm(value, forms){
  const n = Math.abs(value) % 100, n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
function durationText(parts){
  const out = [];
  if (parts.years) out.push(`${parts.years} ${wordForm(parts.years,["год","года","лет"])}`);
  if (parts.months) out.push(`${parts.months} ${wordForm(parts.months,["месяц","месяца","месяцев"])}`);
  if (parts.days || !out.length) out.push(`${parts.days} ${wordForm(parts.days,["день","дня","дней"])}`);
  return out.join(" ");
}
function buildMembershipRows(){
  const today = todayUtc();
  return MEMBERSHIP_STARTS.filter(([date, id]) => isVisibleUser(id)).map(([date, id]) => {
    const start = parseDate(date);
    const name = NAMES[id] || `ID ${id}`;
    return {id, name, start, days:dateDiffDays(start, today), parts:durationParts(start, today)};
  }).sort((a,b) => b.days - a.days || a.name.localeCompare(b.name,"ru"));
}
function nextDayMilestone(days){
  const list = new Set([100, 500, 777, 1000, 1111, 1234, 1500, 2000, 2222, 2500, 3000, 3333, 3500, 4000, 4444, 4500, 5000, 5555, 6000, 6666, 7000, 7777, 8000, 8888, 9000, 9999, 10000]);
  for (let d = 500; d <= days + 5000; d += 500) list.add(d);
  return [...list].filter(n => n > days).sort((a,b) => a-b)[0] || (Math.floor(days/500 + 1) * 500);
}
function memberMilestones(m){
  const today = todayUtc(), events = [];
  const anniversaryYears = m.parts.years + 1;
  const anniversaryDate = addMonthsClamped(m.start, anniversaryYears * 12);
  events.push({name:m.name, label:`${anniversaryYears} ${wordForm(anniversaryYears,["год участия","года участия","лет участия"])}`, date:anniversaryDate, left:dateDiffDays(today,anniversaryDate)});
  const roundDays = nextDayMilestone(m.days), roundDate = addDaysUtc(today, roundDays - m.days);
  events.push({name:m.name, label:`${fmt(roundDays)} дней участия`, date:roundDate, left:roundDays - m.days});
  return events;
}
// Все круглые значения дней участия до maxDays (тот же набор, что и у ближайших юбилеев).
function roundDayList(maxDays){
  const list = new Set([100, 500, 777, 1000, 1111, 1234, 1500, 2000, 2222, 2500, 3000, 3333, 3500, 4000, 4444, 4500, 5000, 5555, 6000, 6666, 7000, 7777, 8000, 8888, 9000, 9999, 10000]);
  for (let d = 500; d <= maxDays + 5000; d += 500) list.add(d);
  return [...list].sort((a, b) => a - b);
}
// Уже наступившие юбилеи участника: годовщины и круглые значения дней.
function memberPastMilestones(m){
  const today = todayUtc(), out = [];
  for (let y = 1; y <= m.parts.years; y++) {
    const date = addMonthsClamped(m.start, y * 12); if (date > today) break;
    out.push({name:m.name, label:`${y} ${wordForm(y, ["год участия", "года участия", "лет участия"])}`, date, ago:dateDiffDays(date, today)});
  }
  roundDayList(m.days).forEach(n => {
    if (n > m.days) return;
    out.push({name:m.name, label:`${fmt(n)} дней участия`, date:addDaysUtc(m.start, n), ago:m.days - n});
  });
  return out;
}
const PAST_MS_LIMIT = 20;
function renderPastMilestones(){
  const body = $("milestone-past-body"); if (!body || !membershipRows) return;
  const past = membershipRows.flatMap(memberPastMilestones).sort((a, b) => b.date - a.date || a.name.localeCompare(b.name, "ru")).slice(0, PAST_MS_LIMIT);
  body.innerHTML = past.length ? past.map(e =>
    `<tr><td>${escH(e.name)}</td><td>${escH(e.label)}</td><td>${formatDateRu(e.date)}</td><td class="time-upcoming">${e.ago === 0 ? "Сегодня" : e.ago === 1 ? "Вчера" : `${fmt(e.ago)} ${wordForm(e.ago, ["день", "дня", "дней"])} назад`}</td></tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">Пока нет прошедших юбилеев</td></tr>`;
}
function formatDateRu(date){ return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth()+1)}.${date.getUTCFullYear()}`; }
let TIME_ALL_MS = false;
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#milestone-toggle")) { TIME_ALL_MS = !TIME_ALL_MS; renderTime(); } });
function renderTime(){
  if (!membershipRows) return;
  const escName = name => escH(name);
  $("time-body").innerHTML = membershipRows.length ? membershipRows.map(m =>
    `<tr><td><span class="pname" data-open-profile="${escH(m.id)}">${escName(m.name)}</span></td><td class="time-days">${fmt(m.days)}</td><td>${durationText(m.parts)}</td></tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;color:var(--muted)">Список участников не заполнен</td></tr>`;
  const allEvents = membershipRows.flatMap(memberMilestones).sort((a,b) => a.left - b.left || a.name.localeCompare(b.name,"ru"));
  // по умолчанию — ближайшие 30 дней (но не меньше 8 строк); остальное под кнопкой «Показать все»
  const near = allEvents.filter(e => e.left <= 30), events = TIME_ALL_MS || allEvents.length <= 10 ? allEvents : (near.length >= 8 ? near : allEvents.slice(0, 8));
  { const wrap = $("milestone-table").closest(".wrap"); let more = $("milestone-more");
    if (!more && wrap) { more = document.createElement("div"); more.id = "milestone-more"; more.className = "top-more"; wrap.insertAdjacentElement("afterend", more); }
    if (more) more.innerHTML = allEvents.length > events.length || (TIME_ALL_MS && allEvents.length > 10) ? `<button type="button" class="mini" id="milestone-toggle">${TIME_ALL_MS ? "Только ближайшие" : `Показать все (${allEvents.length})`}</button><span class="hint">${TIME_ALL_MS ? "" : `Сейчас видно ${events.length}`}</span>` : ""; }
  $("milestone-body").innerHTML = events.length ? events.map(e =>
    `<tr><td>${escName(e.name)}</td><td>${escH(e.label)}</td><td>${formatDateRu(e.date)}</td><td class="time-upcoming">${e.left === 0 ? "Сегодня" : `через ${fmt(e.left)} ${wordForm(e.left,["день","дня","дней"])}`}</td></tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">Нет предстоящих юбилеев</td></tr>`;
  renderPastMilestones();
  if (typeof renderTimeCharts === "function") renderTimeCharts();
}
async function loadTime(){
  if (hideLeft) {
    timeStatus("Загружаю статусы участников…");
    try { await ensureUserMetrics(); leftFilterError = ""; }
    catch (e) { leftFilterError = e.message || String(e); }
  }
  membershipRows = buildMembershipRows();
  timeStatus(hideLeft && leftFilterError ? `Не удалось получить статусы участников: ${leftFilterError}. Вышедшие не отфильтрованы.` : `Участников в списке: ${membershipRows.length}`);
  renderTime();
}

/* ---------- Рекорды участника и чата ---------- */
function recordsStatus(message, err = false){ const el = $("records-status"); el.textContent = message; el.className = "status" + (err ? " err" : ""); }
function maxDailyFallback(source, entity, bucket){
  const useTotals = entity === "users" && source.some(x => Number(x[F.chatPk]) === 0);
  const daily = new Map();
  source.forEach(x => {
    const date = String(x[F.date] ?? "").slice(0,10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (entity === "users" && !isVisibleUser(x[F.userId])) return;
    const chatPk = Number(x[F.chatPk]);
    if (entity === "users" && useTotals && chatPk !== 0) return;
    if (entity === "users" && !useTotals && chatPk === 0) return;
    if (entity === "chats" && (chatPk === 0 || !x[F.chat])) return;
    const id = entity === "users" ? String(x[F.userId] ?? x[F.name]) : String(x[F.chatPk] ?? x[F.chat]);
    const name = entity === "users" ? who(x) : String(x[F.chat] || `Чат ${id}`);
    const bk = bucket ? bucket(date) : date;
    const key = `${id}|${bk}`;
    const item = daily.get(key) || {id, name, date:bk, value:0};
    item.value += Number(g(x,"msgs")) || 0; daily.set(key,item);
  });
  const best = new Map();
  daily.forEach(x => { const cur = best.get(x.id); if (!cur || x.value > cur.value || (x.value === cur.value && x.date < cur.date)) best.set(x.id,x); });
  return best;
}
function recordValueFromMetric(row){ return metricRecordCount(row); }
function recordDateFromMetric(row){ return metricRecordDate(row); }
function mergeRecordMetrics(metricRows, fallback, entity){
  const map = new Map();
  (metricRows || []).forEach(row => {
    const id = entity === "users" ? metricUserId(row) : String(row.chat_pk ?? row.chat_id ?? row.id ?? row.chat_title ?? row.chat_name ?? "");
    if (!id || (entity === "users" && !isVisibleUser(id))) return;
    const val = recordValueFromMetric(row), date = recordDateFromMetric(row);
    const name = entity === "users" ? metricDisplayName(row) : String(row.chat_title ?? row.chat_name ?? row.name ?? `Чат ${id}`);
    map.set(id, {id, name, value:val, date, source:row});
  });
  fallback.forEach((row,id) => {
    const cur = map.get(id);
    if (!cur) map.set(id, {...row});
    else {
      if (cur.value == null && row.value != null) cur.value = row.value;
      if (!cur.date && row.date) cur.date = row.date;
      if (!cur.name || cur.name === "—") cur.name = row.name;
    }
  });
  return [...map.values()].filter(x => x.value != null).sort((a,b) => b.value - a.value || String(a.name).localeCompare(String(b.name),"ru"));
}
const REC_PER = {day:"день", week:"неделю", month:"месяц"};
function recBucket(period){ return period === "week" ? (d => addDaysIso(d, -((new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7))) : (d => d.slice(0, 7)); }
function recPeriodEnd(period, key){
  if (period === "week") return addDaysIso(key, 6);
  if (period === "month") { const y = +key.slice(0, 4), m = +key.slice(5, 7); return `${key}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`; }
  return key;
}
// Дата рекорда с чипом года — те же цвета лет, что и в «Топах»
function recYearOf(key){ const m = /^(\d{4})-\d{2}(-\d{2})?$/.exec(String(key || "")); return m ? (recYearOfPeriod(key, m[1])) : null; }
function recYearOfPeriod(key, y){ return y; }
function recYearBorder(key){ const y = recYearOf(key); return y ? ` style="border-left:4px solid ${yearHue(y)}"` : ""; }
function recDateHtml(period, key){
  const k = String(key || ""), m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(k);
  if (!m) return escH(recLabel(period, key));
  const short = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  let y = m[1], text;
  if (period === "week" && m[3]) { const e = addDaysIso(k, 6), f = x => `${x.slice(8)}.${x.slice(5, 7)}`; text = `${f(k)} — ${f(e)}`; y = e.slice(0, 4); }
  else if (period === "month") text = MONTHS[+m[2] - 1];
  else if (m[3]) text = `${m[3]} ${short[+m[2] - 1] || m[2]}`;
  else return escH(recLabel(period, key));
  const yc = yearHue(y);
  return `<span class="yname">${escH(text)}<span class="ychip" style="color:${yc};border-color:${hexA(yc, .55)};background-color:${hexA(yc, .12)}">${y}</span></span>`;
}
function recLabel(period, key){
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(String(key))) return formatMetricDate(key);
  if (period === "week") { const e = addDaysIso(key, 6), f = x => `${x.slice(8)}.${x.slice(5, 7)}`; return `${f(key)} — ${f(e)}.${e.slice(0, 4)}`; }
  if (period === "month") return `${MONTHS[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`;
  return formatMetricDate(key);
}
// сколько дней рекорд уже держится (от конца периода, в котором он поставлен)
function recHeld(period, key){
  const m = /^(\d{4}-\d{2}(?:-\d{2})?)/.exec(String(key || "")); if (!m) return "—";
  const end = recPeriodEnd(period, m[1]), today = iso(new Date());
  if (end >= today) return period === "day" ? "сегодня" : "идёт сейчас";
  const n = dayIdx(today) - dayIdx(end); return `${fmt(n)} ${wordForm(n, ["день","дня","дней"])}`;
}
function recRowsFor(isUsers){
  if (recordsPeriod === "day" || !recordsHist) return isUsers ? recordsUserRows : recordsChatRows;
  const ck = recordsPeriod + (isUsers ? "u" : "c") + recordsHist.length + (hideLeft ? "h" : "");
  if (!recPeriodCache.has(ck)) {
    const best = maxDailyFallback(recordsHist, isUsers ? "users" : "chats", recBucket(recordsPeriod));
    recPeriodCache.set(ck, [...best.values()].sort((a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name), "ru")));
  }
  return recPeriodCache.get(ck);
}
function renderRecords(){
  const isUsers = recordsEntity === "users", rowsData = recRowsFor(isUsers), RP = recordsPeriod;
  const titleEl = $("records-title");
  if (titleEl) titleEl.textContent = (isUsers ? "Рекорды участников" : "Рекорды чатов") + (RP === "day" ? "" : " · за " + REC_PER[RP]);
  const head = $("records-head"), body = $("records-body");
  head.innerHTML = `<th>Место</th><th>${isUsers ? "Участник" : "Чат"}</th><th>Максимум сообщений за ${REC_PER[RP]}</th><th>${RP === "day" ? "Дата рекорда" : RP === "week" ? "Неделя рекорда" : "Месяц рекорда"}</th><th>Держится</th>`;
  const ek = isUsers ? "recUsers" : "recChats";
  renderExcludedRowsControls(ek);
  const shown = rowsData.filter(r => !isTableRowExcluded(ek, r.id));
  const chartBox = $("rec-chart"); if (chartBox) { chartBox.innerHTML = shown.length ? recChartSvg(shown, isUsers, RP) : ""; chartBox.closest(".rec-card").hidden = !shown.length; }
  if (!shown.length){ body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">${rowsData.length ? "Все строки исключены" : "Нет данных о рекордах за доступную историю"}</td></tr>`; return; }
  const nameCell = r => `<div class="row-name-with-action">${isUsers ? `<span class="pname" data-open-profile="${escH(r.id)}">${escH(r.name)}</span>` : `<span>${escH(r.name)}</span>`}<button type="button" class="row-exclude-btn" data-no-export="true" data-exclude-row="${ek}" data-row-key="${escH(r.id)}" data-row-name="${escH(r.name)}" title="Исключить из таблицы" aria-label="Исключить ${escH(r.name)}">×</button></div>`;
  body.innerHTML = shown.map((r,i) => `<tr><td${recYearBorder(r.date)}>${i+1}</td><td style="text-align:left">${nameCell(r)}</td><td>${fmt(r.value)}</td><td>${recDateHtml(RP, r.date)}</td><td class="rec-held">${escH(recHeld(RP, r.date))}</td></tr>`).join("");
}
function recChartSvg(list, isUsers, RP = "day"){
  const th = tmTheme(), L0 = list.slice(0, 15);
  const W = 1000, L = 210, R = 790, T = 96, rh = 38, H = T + L0.length * rh + 22, max = Math.max(1, ...L0.map(x => x.value));
  const years = new Map(); list.forEach(r => { const y = String(r.date || "").slice(0, 4); if (/^\d{4}$/.test(y)) years.set(y, (years.get(y) || 0) + 1); });
  let o = `<text x="24" y="40" font-size="23" font-weight="700" fill="${th.tx}">${isUsers ? "Рекорды участников" : "Рекорды чатов"}</text><text x="24" y="66" font-size="15" fill="${th.mu}">Максимум сообщений за ${RP === "day" ? "один день" : RP === "week" ? "одну неделю" : "один месяц"}${list.length > 15 ? " · топ-15" : ""}</text>`;
  let cx = W - 24;
  [...years.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).forEach(([y, n]) => { const t = `${y}: ${n}`, w = t.length * 9 + 22; cx -= w; o += `<rect x="${cx}" y="24" width="${w - 8}" height="28" rx="14" fill="${yearHue(y)}" fill-opacity=".25" stroke="${yearHue(y)}" stroke-opacity=".7"><title>Рекордов, поставленных в ${y} году: ${n}</title></rect><text x="${cx + (w - 8) / 2}" y="43" font-size="15" fill="${th.tx}" text-anchor="middle">${t}</text>`; });
  if (years.size) o += `<text x="${cx - 10}" y="43" font-size="14" fill="${th.mu}" text-anchor="end">год рекорда:</text>`;
  L0.forEach((r, i) => {
    const y = T + i * rh, c = getStyle(isUsers ? "u" : "c", r.id).c[0], w = Math.max(4, r.value / max * (R - L)), sv = softSvg(c);
    o += `<text x="${L - 12}" y="${y + 23}" font-size="16" fill="${th.tx}" text-anchor="end">${i + 1}. ${escH(cmpFit(r.name, 19))}</text>`
      + sv.d + `<rect class="anim-bar-x" style="animation-delay:${i * 25}ms" x="${L}" y="${y + 7}" width="${w.toFixed(1)}" height="24" rx="7" fill="${sv.f}"><title>${escH(r.name)}: ${fmt(r.value)} — ${escH(recLabel(RP, r.date))}</title></rect>`
      + `<text x="${(L + w + 10).toFixed(1)}" y="${y + 24}" font-size="17" font-weight="700" fill="${th.tx}">${fmt(r.value)}</text>`
      + `<text x="${W - 24}" y="${y + 24}" font-size="15" fill="${th.mu}" text-anchor="end">${escH(recLabel(RP, r.date))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}
async function loadRecords(){
  recordsStatus(""); $("records-body").innerHTML = skRows(4, 10);
  try {
    const tasks = [getHistory(), ensureUserMetrics(), ensureChatMetrics()];
    const results = await Promise.allSettled(tasks);
    if (results[0].status === "rejected") throw results[0].reason;
    const history = results[0].value;
    const userMetrics = results[1].status === "fulfilled" ? results[1].value : [];
    const chatMetrics = (results[2].status === "fulfilled" ? results[2].value : []).filter(row => !ULT.on || !ultIsMember(String(row.chat_title ?? row.chat_name ?? row.name ?? "")));
    if (hideLeft && results[1].status === "rejected") leftFilterError = results[1].reason?.message || String(results[1].reason);
    recordsHist = history; recPeriodCache.clear();
    const userFallback = maxDailyFallback(history, "users");
    const chatFallback = maxDailyFallback(history, "chats");
    recordsUserRows = mergeRecordMetrics(userMetrics, userFallback, "users");
    recordsChatRows = mergeRecordMetrics(chatMetrics, chatFallback, "chats");
    const errors = [];
    if (results[1].status === "rejected") errors.push("не удалось загрузить метрики участников");
    if (results[2].status === "rejected") errors.push("не удалось загрузить метрики чатов");
    recordsStatus(errors.length ? `Используется резервный расчёт по дневной истории; ${errors.join(", " )}.` : `Рекорды по максимальному числу сообщений за день.` , errors.length > 0);
    renderRecords();
  } catch (e) {
    recordsUserRows = []; recordsChatRows = []; renderRecords();
    recordsStatus("Не удалось загрузить рекорды: " + (e.message || e), true);
  }
}
document.querySelectorAll("#record-period button").forEach(b => b.onclick = () => {
  recordsPeriod = b.dataset.recordPeriod;
  document.querySelectorAll("#record-period button").forEach(x => x.classList.toggle("active", x === b));
  renderRecords();
});
document.querySelectorAll("#record-entity button").forEach(b => b.onclick = () => {
  recordsEntity = b.dataset.recordEntity;
  document.querySelectorAll("#record-entity button").forEach(x => x.classList.toggle("active", x === b));
  renderRecords();
});

/* ---------- Графики ---------- */
const YPAL = {2019:"#6b6b6b",2020:"#3f7f7f",2021:"#7a4a7a",2022:"#44468a",2023:"#3b6577",2024:"#756a4c",2025:"#3d6247"};
const CUR = "#ff4d6d";
let cType = "bars";
let chartEntity = "users";
// «По годам» compares the same month across years: show the month picker,
// but do not expose the unrelated day/week/year period selector.
function syncYearsChartFilterFields(){
  const onCharts = $("tab-charts")?.classList.contains("active");
  const active = onCharts && cType === "years";
  // «Места: месяцы × годы» строится по всей истории — режим и дата на нём ничего не меняют.
  const allHist = onCharts && cType === "bumpyears";
  if ($("f-mode")) $("f-mode").hidden = active || allHist;
  if ($("f-day")) $("f-day").hidden = active || allHist ? true : !(mode === "day" || mode === "week" || mode === "range");
  if ($("f-month")) $("f-month").hidden = allHist ? true : active ? false : mode !== "month";
  if ($("f-year")) $("f-year").hidden = active || allHist ? true : mode !== "year";
  return active;
}
const TREND_STYLE_KEY = "chatstats.trendAppearance.v4";
const DEFAULT_TREND_STYLE = Object.freeze({line: 4, point: 4.5, arrowLength: 22, arrowSize: 16, opacity: 100});
const clampTrendStyle = (key, value) => {
  const limits = {line: [1, 8], point: [1, 10], arrowLength: [6, 32], arrowSize: [6, 28], opacity: [0, 100]};
  const n = Number(value), [min, max] = limits[key] || [0, 100];
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : DEFAULT_TREND_STYLE[key];
};
let TREND_STYLE = {...DEFAULT_TREND_STYLE};
try {
  // Сначала читаем текущую версию. Старые значения толщины линий и точек сохраняем,
  // но увеличиваем старые небольшие наконечники до более различимого стартового размера.
  const current = JSON.parse(localStorage.getItem(TREND_STYLE_KEY) || "null");
  const savedV3 = JSON.parse(localStorage.getItem("chatstats.trendAppearance.v3") || "null");
  const saved = current && typeof current === "object" ? current
    : savedV3 && typeof savedV3 === "object" ? savedV3
    : JSON.parse(localStorage.getItem("chatstats.trendAppearance.v2") || "null");
  if (saved && typeof saved === "object") {
    for (const key of ["line", "point"])
      if (saved[key] !== undefined) TREND_STYLE[key] = clampTrendStyle(key, saved[key]);
    if (current && current.arrowLength !== undefined)
      TREND_STYLE.arrowLength = clampTrendStyle("arrowLength", current.arrowLength);
    else if (saved.arrowLength !== undefined || saved.arrow !== undefined) {
      const oldLength = Number(saved.arrowLength !== undefined ? saved.arrowLength : saved.arrow);
      TREND_STYLE.arrowLength = clampTrendStyle("arrowLength", oldLength < 14 ? 22 : oldLength);
    }
    if (current && current.arrowSize !== undefined)
      TREND_STYLE.arrowSize = clampTrendStyle("arrowSize", current.arrowSize);
    else if (saved.arrowSize !== undefined)
      TREND_STYLE.arrowSize = clampTrendStyle("arrowSize", Number(saved.arrowSize) < 14 ? 16 : saved.arrowSize);
  } else {
    const previous = JSON.parse(localStorage.getItem("chatstats.trendAppearance.v1") || "{}");
    for (const key of ["line", "point"])
      if (previous[key] !== undefined) TREND_STYLE[key] = clampTrendStyle(key, previous[key]);
  }
} catch (e) {}
const saveTrendStyle = () => { try { localStorage.setItem(TREND_STYLE_KEY, JSON.stringify(TREND_STYLE)); } catch (e) {} };
function loadTrendStyleForChartType(type = currentChartType()) {
  if (type !== "trend") return;
  const saved = CHART_PREFS[type]?.trendStyle;
  if (saved && typeof saved === "object") {
    TREND_STYLE = {...DEFAULT_TREND_STYLE, ...saved};
  } else {
    // First visit migrates the user's previous global trend settings into the new per-chart store.
    TREND_STYLE = {...TREND_STYLE};
    CHART_PREFS[type] = {...(CHART_PREFS[type] || {}), trendStyle:{...TREND_STYLE}};
    saveChartPrefs();
  }
  saveTrendStyle();
}
function chartSeriesStyle(kind, key) {
  const prefs = chartPrefs(currentChartType());
  const color = prefs.seriesColors?.[`${kind}:${String(key)}`];
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return {c:[color]};
  if (kind === "special" && key === "other") return {c:["#555a68"]};
  return getStyle(kind, key);
}
const note = t => /^Нет данных/.test(t)
  ? `<div class="note empty-state" role="status"><div class="es-ico" aria-hidden="true">🗂️</div><div class="es-t">${escH(t)}</div><div class="es-h">Попробуйте другой период или снимите выбор участников.</div><button type="button" class="es-btn" data-es-reset data-no-export="1">Сбросить фильтры</button></div>`
  : `<div class="note">${escH(t)}</div>`;

/* ---------- Быстрые диапазоны графиков (не зависят от общего режима) ---------- */
const CHART_QUICK_KEY = "chatstats.chartQuick.v1";
let chartQuick = "";
// Быстрый «Период графика» убран: период берётся из выбора даты над графиком. Старое сохранённое значение сбрасываем.
try { localStorage.removeItem(CHART_QUICK_KEY); } catch (e) {}
let dayTipCtx = null, tipCtx = null, tipCache = null, tipHistoryRequested = false;
let cRowsCache = {q:null, src:null, to:null, data:[]};
function syncQuickChips(){
  document.querySelectorAll("#c-quick .quick-chip").forEach(b => {
    const on = b.dataset.q === chartQuick;
    b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
  });
}
function saveChartQuick(){ try { localStorage.setItem(CHART_QUICK_KEY, chartQuick); } catch (e) {} }
function setChartQuick(q){
  chartQuick = q || ""; saveChartQuick(); syncQuickChips(); renderCharts();
  if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
}
function clearChartQuick(){ if (!chartQuick) return; chartQuick = ""; saveChartQuick(); syncQuickChips(); }
document.querySelectorAll("#c-quick .quick-chip").forEach(b => b.onclick = () => setChartQuick(b.dataset.q));
syncQuickChips();
// Режим и период, которые видят графики: быстрый чип либо общий фильтр.
const cMode = () => chartQuick ? (chartQuick === "all" ? "all" : "range") : mode;
function cRange(){
  if (!chartQuick) return range();
  const today = iso(new Date());
  if (chartQuick === "all") return ["2000-01-01", today];
  return [addDaysIso(today, -(Number(chartQuick) - 1)), today];
}
function cPrevRange(){
  if (!chartQuick) return mode === "all" ? null : previousPeriodRange(range());
  if (chartQuick === "all") return null;
  const r = cRange(), n = Number(chartQuick), prevTo = addDaysIso(r[0], -1);
  return [addDaysIso(prevTo, -(n - 1)), prevTo];
}
function cRows(){
  if (!chartQuick) return rows;
  if (!allRows) return [];
  const r = cRange();
  if (cRowsCache.q === chartQuick && cRowsCache.src === allRows && cRowsCache.to === r[1]) return cRowsCache.data;
  const data = allRows.filter(x => { const d = String(x[F.date] ?? "").slice(0, 10); return d >= r[0] && d <= r[1]; });
  cRowsCache = {q:chartQuick, src:allRows, to:r[1], data};
  return data;
}
const cScoped = () => pick(cRows(), $("chat").value);
function cPeriodLabel(){
  if (!chartQuick) return periodLabel();
  if (chartQuick === "all") return "Все данные";
  const r = cRange(), cy = new Date().getFullYear(), y0 = +r[0].slice(0, 4), y1 = +r[1].slice(0, 4);
  if (y0 === y1) return `${chartDateLabel(r[0])} - ${chartDateLabel(r[1])}${y0 !== cy ? ` ${y0}` : ""}`;
  return `${chartDateLabel(r[0], y0 !== cy)} - ${chartDateLabel(r[1], y1 !== cy)}`;
}

/* ---------- Аномалии (экспериментально) ---------- */
const ANOM_KEY = "chatstats.anomalies.v1", ANOM_HI = "#ffe066", ANOM_LO = "#5ad1ff";
// Подсветка аномальных дней убрана (2026.10.30): флаг выключен навсегда, связанный код ничего не рисует.
const ANOM = {on:false, k:2};
// z-оценки ряда; null, если ряд слишком короткий или без разброса.
function anomalyScores(values){
  const n = values.length; if (!ANOM.on || n < 7) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return sd > 0 ? values.map(v => (v - mean) / sd) : null;
}
const isAnom = z => ANOM.on && z != null && Math.abs(z) >= ANOM.k;
const zText = z => `${z > 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}σ`;
const anomStroke = z => isAnom(z) ? ` stroke="${z > 0 ? ANOM_HI : ANOM_LO}" stroke-width="2.2"` : "";
const anomLabel = z => isAnom(z) ? ` · аномалия ${zText(z)}` : "";
function anomLegend(x, y){
  const k = String(ANOM.k);
  return `<rect x="${x}" y="${y - 13}" width="16" height="16" rx="3" fill="none" stroke="${ANOM_HI}" stroke-width="2.2"/><text class="chart-legend" x="${x + 24}" y="${y}" font-size="14" fill="#7d8190">выше нормы</text>`
    + `<rect x="${x + 130}" y="${y - 13}" width="16" height="16" rx="3" fill="none" stroke="${ANOM_LO}" stroke-width="2.2"/><text class="chart-legend" x="${x + 154}" y="${y}" font-size="14" fill="#7d8190">ниже нормы (порог ±${k}σ от среднего дня)</text>`;
}

/* ---------- Единые подсказки ---------- */
const fmtR = v => (Math.round(v * 10) / 10).toLocaleString("ru-RU");
const pctStr = f => (f * 100).toLocaleString("ru-RU", {maximumFractionDigits: f < 0.1 ? 1 : 0}) + "%";
const tipRow = (label, value) => `<div class="tr"><em>${label}</em><span>${value}</span></div>`;
function deltaHtml(cur, prev){
  const d = cur - prev;
  if (!d) return "без изменений";
  const pct = prev ? ` (${d > 0 ? "+" : "−"}${Math.abs(Math.round(d / prev * 100))}%)` : "";
  return `<span class="${d > 0 ? "up" : "down"}">${d > 0 ? "+" : "−"}${fmt(Math.abs(Math.round(d)))}${pct}</span>`;
}
function setTipCtx(){
  tipCtx = {metric:$("metric").value, entity:chartEntity, chat:$("chat").value, cur:cRange(), prev:cPrevRange(), quick:chartQuick};
  tipCache = null;
}
function periodTotalsFor(src, r, ctx){
  const m = new Map(); if (!r) return m;
  const base = ctx.entity === "chats" ? chartChatRows(src) : pick(src, ctx.chat);
  base.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10 || d < r[0] || d > r[1]) return;
    const k = ctx.entity === "chats" ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    if (ctx.entity === "users" && !isVisibleUser(k)) return;
    const u = m.get(k) || {k, name: ctx.entity === "chats" ? String(x[F.chat] || `Чат ${k}`) : who(x), v:0};
    u.v += Number(g(x, ctx.metric)) || 0; m.set(k, u);
  });
  return m;
}
function tipStats(){
  if (!tipCtx) setTipCtx();
  if (tipCache) return tipCache;
  const ctx = tipCtx;
  const cur = periodTotalsFor(ctx.quick ? cRows() : rows, ctx.cur, ctx);
  const ranked = [...cur.values()].filter(u => u.v > 0).sort((a, b) => b.v - a.v);
  let prev = null, prevState = ctx.prev ? "loading" : "none";
  if (ctx.prev) {
    const prevSrc = allRows || (!ctx.quick && Array.isArray(comparisonRows) && !comparisonError ? comparisonRows : null);
    if (prevSrc) { prev = periodTotalsFor(prevSrc, ctx.prev, ctx); prevState = "ok"; }
    else if (!tipHistoryRequested) { tipHistoryRequested = true; getHistory().then(() => { tipCache = null; }).catch(() => { tipHistoryRequested = false; }); }
  }
  return tipCache = {cur, rank:new Map(ranked.map((u, i) => [u.k, i + 1])), count:ranked.length, total:ranked.reduce((a, u) => a + u.v, 0), prev, prevState};
}
function entityTipHtml(key){
  const st = tipStats(), u = st.cur.get(String(key));
  if (!u) return "";
  const color = chartSeriesStyle(tipCtx.entity === "chats" ? "c" : "u", u.k).c[0];
  let h = `<b><i style="background:${color}"></i>${escH(u.name)}</b>`;
  h += tipRow(MLBL[tipCtx.metric], fmt(u.v));
  h += tipRow("Доля", st.total ? pctStr(u.v / st.total) : "—");
  h += tipRow("Место", st.rank.has(u.k) ? `${st.rank.get(u.k)} из ${st.count}` : "—");
  if (st.prevState === "ok") {
    const p = st.prev.get(u.k)?.v || 0;
    h += tipRow("Прошлый период", fmt(p)) + tipRow("Изменение", deltaHtml(u.v, p));
  } else if (st.prevState === "loading") h += tipRow("Прошлый период", "загрузка…");
  return h;
}
function setDayTipCtx(by, from, to, metric, z){
  let total = 0; const act = [];
  by.forEach((v, d) => { if (d >= from && d <= to) { total += v; if (v > 0) act.push([d, v]); } });
  act.sort((a, b) => b[1] - a[1]);
  const days = Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 864e5) + 1;
  dayTipCtx = {by, from, to, metric, z: z || new Map(), total, avg: days > 0 ? total / days : 0, rank: new Map(act.map((a, i) => [a[0], i + 1])), count: act.length};
}
function dayTipHtml(date){
  const c = dayTipCtx; if (!c) return "";
  const v = c.by.get(date) || 0, d = parseDate(date), wd = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getUTCDay()];
  let h = `<b>${formatDateRu(d)}, ${wd}</b>` + tipRow(MLBL[c.metric], fmt(v));
  if (date < c.from || date > c.to) return h + tipRow("Вне выбранного периода", "");
  h += tipRow("Доля периода", c.total ? pctStr(v / c.total) : "—");
  h += tipRow("Место дня", c.rank.has(date) ? `${c.rank.get(date)} из ${c.count}` : "—");
  h += tipRow("Средний день", fmtR(c.avg));
  const pd = addDaysIso(date, -1);
  if (pd >= c.from) h += tipRow("К предыдущему дню", deltaHtml(v, c.by.get(pd) || 0));
  const z = c.z.get(date);
  if (isAnom(z)) h += tipRow("Аномалия", `<span class="${z > 0 ? "up" : "down"}">${zText(z)}</span>`);
  if (c.evNote) h += c.evNote(date);
  return h;
}


/* ---------- Спираль года: каждый день — ячейка, один виток — один год ---------- */
function spiralChart(){
  const metric = $("metric").value, chats = chartEntity === "chats";
  const hist = allRows || rows;
  const src = chats ? chartChatRows(hist)
    : pick(hist, $("chat").value).filter(x => { const k = String(x[F.userId] ?? x[F.name]); return isVisibleUser(k) && (!SEL_ACTIVE || SEL.has(k)); });
  const by = new Map(), yearsWithData = new Set();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    by.set(d, (by.get(d) || 0) + v); yearsWithData.add(+d.slice(0, 4));
  });
  const todayIso = iso(now), cm = cMode();
  let years = [], active;
  if (cm === "all") {
    years = [...yearsWithData].sort((a, b) => a - b);
    active = [years.length ? `${years[0]}-01-01` : todayIso, todayIso];
  } else if (cm === "range") {
    const r = cRange(); for (let y = +r[0].slice(0, 4); y <= +r[1].slice(0, 4); y++) years.push(y);
    active = r;
  } else {
    const r = range(), y0 = r ? +r[0].slice(0, 4) : now.getFullYear(), y1 = r ? +r[1].slice(0, 4) : y0;
    for (let y = y0; y <= y1; y++) years.push(y);
    active = [`${y0}-01-01`, `${y1}-12-31`];
  }
  if (!years.length) return note("Нет данных");
  if (years.length > 8) years = years.slice(-8);
  if (active[0] < `${years[0]}-01-01`) active = [`${years[0]}-01-01`, active[1]];
  const actTo = active[1] < todayIso ? active[1] : todayIso;
  let max = 0, total = 0;
  HEAT_LO = 0; by.forEach((v, d) => { if (d >= active[0] && d <= actTo) { total += v; if (v > max) max = v; if (v > 0 && (!HEAT_LO || v < HEAT_LO)) HEAT_LO = v; } });
  if (!max) return note("Нет данных за выбранный период");
  const dates = []; for (let d = active[0]; d <= actTo; d = addDaysIso(d, 1)) dates.push(d);
  const zs = anomalyScores(dates.map(d => by.get(d) || 0));
  const zMap = new Map(zs ? dates.map((d, i) => [d, zs[i]]) : []);
  setDayTipCtx(by, active[0], actTo, metric, zMap);
  const n = years.length, W = 900, cx = 450, cy = 505, Rmax = 345;
  const pitch = Math.min(70, (Rmax - 90) / (n + 0.92)), r0 = Math.max(90, Rmax - pitch * (n + 0.92)), band = pitch * 0.9;
  const TAU = Math.PI * 2, A = f => -Math.PI / 2 + TAU * f;
  const P = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  const palette = chartPrefs("spiral").heat;
  let cells = "", marks = "";
  years.forEach((y, k) => {
    const len = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;
    for (let j = 0; j < len; j++) {
      const d = iso(new Date(y, 0, 1 + j)), f0 = j / len, f1 = (j + 1) / len, a0 = A(f0), a1 = A(f1);
      const ri0 = r0 + pitch * (k + f0), ri1 = r0 + pitch * (k + f1);
      const pts = `${P(ri0, a0)} ${P(ri1, a1)} ${P(ri1 + band, a1)} ${P(ri0 + band, a0)}`;
      const inAct = d >= active[0] && d <= actTo, v = by.get(d) || 0;
      if (inAct) {
        const fill = heatColor(v, max);
        cells += `<polygon points="${pts}" fill="${fill}" stroke="${fill}" stroke-width="0.5" data-day="${d}"/>`;
        const z = zMap.get(d);
        if (isAnom(z)) marks += `<polygon points="${pts}" fill="none" stroke="${z > 0 ? ANOM_HI : ANOM_LO}" stroke-width="1.8" pointer-events="none"/>`;
      } else {
        cells += `<polygon points="${pts}" fill="${palette.z}" fill-opacity="${d > todayIso ? 0.22 : 0.45}" data-day="${d}"/>`;
      }
      if (d === todayIso) {
        const am = A((f0 + f1) / 2), rm = (ri0 + ri1) / 2 + band / 2;
        marks += `<circle cx="${(cx + rm * Math.cos(am)).toFixed(1)}" cy="${(cy + rm * Math.sin(am)).toFixed(1)}" r="${Math.max(3, band * 0.18).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.6" pointer-events="none"/>`;
      }
    }
  });
  const SMn = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  let o = head(cm === "range" ? cPeriodLabel() : (n > 1 ? `${years[0]}–${years[n - 1]}` : String(years[0])), `${sub()}, один виток — один год`);
  o += cells;
  for (let m = 0; m < 12; m++) {
    const f = (Date.UTC(2001, m, 1) - Date.UTC(2001, 0, 1)) / 864e5 / 365;
    const fm = (Date.UTC(2001, m, 15) - Date.UTC(2001, 0, 1)) / 864e5 / 365, a = A(f), am = A(fm);
    o += `<line x1="${(cx + (r0 - 4) * Math.cos(a)).toFixed(1)}" y1="${(cy + (r0 - 4) * Math.sin(a)).toFixed(1)}" x2="${(cx + (Rmax + 8) * Math.cos(a)).toFixed(1)}" y2="${(cy + (Rmax + 8) * Math.sin(a)).toFixed(1)}" stroke="#000" stroke-opacity="0.45" stroke-width="1.4" pointer-events="none"/>`;
    o += `<text class="chart-axis" x="${(cx + (Rmax + 26) * Math.cos(am)).toFixed(1)}" y="${(cy + (Rmax + 26) * Math.sin(am) + 5).toFixed(1)}" text-anchor="middle" font-size="15" fill="#aab0c0">${SMn[m]}</text>`;
  }
  o += marks;
  if (n > 1) years.forEach((y, k) => {
    o += `<text class="chart-axis" x="${cx - 8}" y="${(cy - (r0 + pitch * k + band / 2) + 5).toFixed(1)}" text-anchor="end" font-size="${Math.round(Math.min(14, pitch * 0.35 + 5))}" fill="#aab0c0">${y}</text>`;
  });
  o += `<text class="chart-value" x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="34" fill="#eceef3">${fmt(total)}</text><text class="chart-subtitle" x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="15" fill="#7d8190">${escH(MLBL[metric].toLowerCase())}</text>`;
  const ly = cy + Rmax + 62;
  o += `<text class="chart-legend" x="${cx - 190}" y="${ly + 14}" font-size="14" fill="#7d8190">Меньше</text>`;
  for (let k = 0; k <= 4; k++) o += `<rect x="${cx - 128 + k * 20}" y="${ly + 2}" width="16" height="16" rx="3" fill="${heatColor(k === 0 ? 0 : HEAT_LO > 0 ? HEAT_LO + (k - 1) / 3 * (max - HEAT_LO) : k / 4 * max, max)}"/>`;
  o += `<text class="chart-legend" x="${cx - 18}" y="${ly + 14}" font-size="14" fill="#7d8190">Больше · максимум за день: ${fmt(max)}</text>`;
  if (ANOM.on) o += anomLegend(cx - 190, ly + 46);
  const H = ly + 34 + (ANOM.on ? 32 : 0);
  return `<svg class="spiral-svg" viewBox="0 0 ${W} ${H}" role="img">${o}</svg>`;
}

$("c-type").onchange = () => {
  cType = $("c-type").value;
  applyChartAppearance(cType);
  loadTrendStyleForChartType(cType);
  // Building the settings controls can be expensive for charts with many series.
  // Only rebuild the drawer when it is visible; the chart itself should render immediately.
  if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
  renderCharts();
};
$("heat-scale").onchange = () => renderCharts();
document.querySelectorAll("#c-entity button").forEach(b => b.onclick = () => {
  chartEntity = b.dataset.entity;
  document.querySelectorAll("#c-entity button").forEach(x => x.classList.toggle("active", x === b));
  renderCharts();
  if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
});
$("metric").onchange = () => { renderCharts(); if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel(); };
// «Все» в списке количества: Infinity, иначе число (по умолчанию def).
const trendTop = (def = 5) => { const v = $("trend-top") ? $("trend-top").value : ""; return v === "all" ? Infinity : (Number(v) || def); };
const barsCap = def => { const v = $("bars-top") ? $("bars-top").value : ""; return v === "all" ? 1e6 : v ? Number(v) : def; };
$("bars-top").onchange = () => { renderCharts(); if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel(); };
let TREND_VIEW = "cum"; try { const v = localStorage.getItem("chatstats.trendView.v1"); if (v === "day" || v === "ma7") TREND_VIEW = v; } catch (e) {}
$("trend-view").value = TREND_VIEW;
$("trend-view").onchange = e => { TREND_VIEW = e.target.value; try { localStorage.setItem("chatstats.trendView.v1", TREND_VIEW); } catch (x) {} renderCharts(); };
$("trend-top").onchange = () => { renderCharts(); if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel(); };
$("heatrows-custom-top").onchange = () => {
  const type = cType === "heatrows" ? "heatrows" : "heatrows-custom";
  const p = chartPrefs(type), value = $("heatrows-custom-top").value;
  p.heatRowsTop = value === "all" || value === "auto" ? value : ([5, 10, 20].includes(Number(value)) ? Number(value) : 10);
  CHART_PREFS[type] = p;
  saveChartPrefs();
  renderCharts();
};

const SEL = new Set();
let SEL_ACTIVE = false;
try {
  JSON.parse(localStorage.getItem("chatstats.sel.v1") || "[]").forEach(k => SEL.add(String(k)));
  SEL_ACTIVE = localStorage.getItem("chatstats.sel.active.v1") === "1" || SEL.size > 0;
} catch (e) {
  // Local file/opaque origins may block localStorage; keep default automatic mode.
  SEL_ACTIVE = SEL.size > 0;
}

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function chartDateLabel(isoDate, includeYear = false){
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}${includeYear ? ` ${y}` : ""}`;
}
function periodLabel(){
  const currentYear = new Date().getFullYear();
  if (mode === "range") {
    const r = range(); if (!r) return "";
    const y0 = Number(r[0].slice(0, 4)), y1 = Number(r[1].slice(0, 4));
    if (y0 === y1) return `${chartDateLabel(r[0])} - ${chartDateLabel(r[1])}${y0 !== currentYear ? ` ${y0}` : ""}`;
    return `${chartDateLabel(r[0], y0 !== currentYear)} - ${chartDateLabel(r[1], y1 !== currentYear)}`;
  }
  if (mode === "day") {
    const d = $("day").value;
    if (!d) return "";
    const year = Number(d.slice(0, 4));
    return chartDateLabel(d, year !== currentYear);
  }
  if (mode === "week") {
    const r = range();
    if (!r) return "";
    const y0 = Number(r[0].slice(0, 4)), y1 = Number(r[1].slice(0, 4));
    if (y0 === y1) return `${chartDateLabel(r[0])} - ${chartDateLabel(r[1])}${y0 !== currentYear ? ` ${y0}` : ""}`;
    return `${chartDateLabel(r[0], y0 !== currentYear)} - ${chartDateLabel(r[1], y1 !== currentYear)}`;
  }
  if (mode === "month") {
    const v = $("month").value;
    if (!v) return "";
    const [y, m] = v.split("-").map(Number);
    return `${MONTHS[m - 1]}${y !== currentYear ? ` ${y}` : ""}`;
  }
  if (mode === "all") return "Все данные";
  return String($("year").value);
}
const sub = () => chartEntity === "chats"
  ? `${MLBL[$("metric").value]}, сравнение чатов`
  : `${MLBL[$("metric").value]}, ${$("chat").value || "все чаты"}${SEL_ACTIVE ? ", выбрано участников: " + SEL.size : ""}`;
const head = (t, st, width = 900, showSubtitle = true) => {
  const title = String(t);
  const dateTitle = /^\d{1,2} [а-я]{3}(?: \d{4})?(?: - \d{1,2} [а-я]{3}(?: \d{4})?)?$/i.test(title);
  const center = width / 2;
  const titleSvg = `<text class="chart-title" x="${center}" y="46" text-anchor="middle" font-size="36" fill="#aaa">${escH(dateTitle || window.__TABLO ? title : title.toUpperCase())}</text>`;
  const subtitleSvg = showSubtitle ? `<text class="chart-subtitle" x="${center}" y="72" text-anchor="middle" font-size="17" fill="#7d8190">${escH(st)}</text>` : "";
  return titleSvg + subtitleSvg;
};

function niceMax(v){
  if (!(v > 0)) return {max:4, step:1};
  const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  const st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  return {max: Math.ceil(v / st) * st, step: st};
}
function splineSlopes(P){
  const n = P.length;
  if (n < 2) return Array(n).fill(0);
  const h = [], delta = [], m = Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    h[i] = P[i + 1][0] - P[i][0];
    delta[i] = h[i] ? (P[i + 1][1] - P[i][1]) / h[i] : 0;
  }
  if (n === 2) {
    m[0] = m[1] = delta[0];
    return m;
  }
  const endpoint = (h0, h1, d0, d1) => {
    let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (v * d0 <= 0) return 0;
    if (d0 * d1 < 0 && Math.abs(v) > Math.abs(3 * d0)) return 3 * d0;
    return v;
  };
  m[0] = endpoint(h[0], h[1], delta[0], delta[1]);
  m[n - 1] = endpoint(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  for (let i = 1; i < n - 1; i++) {
    const d0 = delta[i - 1], d1 = delta[i];
    if (!d0 || !d1 || d0 * d1 <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d0 + w2 / d1);
    }
  }
  // Точно те же ограничения монотонности, что и у самой кривой.
  for (let i = 0; i < n - 1; i++) {
    const d = delta[i];
    if (!d) { m[i] = 0; m[i + 1] = 0; continue; }
    let a = m[i] / d, b = m[i + 1] / d;
    if (a < 0) { m[i] = 0; a = 0; }
    if (b < 0) { m[i + 1] = 0; b = 0; }
    const q = a * a + b * b;
    if (q > 9) {
      const tau = 3 / Math.sqrt(q);
      m[i] = tau * a * d;
      m[i + 1] = tau * b * d;
    }
  }
  return m;
}
function smooth(P){
  if (P.length < 2) return P.length ? `M${P[0][0]},${P[0][1]}` : "";
  const n = P.length, m = splineSlopes(P);
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = P[i][0], y0 = P[i][1], x1 = P[i + 1][0], y1 = P[i + 1][1], dx = x1 - x0;
    d += `C${(x0 + dx / 3).toFixed(1)},${(y0 + m[i] * dx / 3).toFixed(1)} ${(x1 - dx / 3).toFixed(1)},${(y1 - m[i + 1] * dx / 3).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}
// Та же кривая, что и smooth(), но с отрезанным концом длиной cut (по длине кривой).
// Возвращает путь и точку обрыва — под наконечником стрелки.
function smoothTrim(P, cut){
  const m = splineSlopes(P), segs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const x0 = P[i][0], y0 = P[i][1], x1 = P[i + 1][0], y1 = P[i + 1][1], dx = x1 - x0;
    segs.push([[x0, y0], [x0 + dx / 3, y0 + m[i] * dx / 3], [x1 - dx / 3, y1 - m[i + 1] * dx / 3], [x1, y1]]);
  }
  const at = (s, t) => { const u = 1 - t; return [0, 1].map(k => u*u*u*s[0][k] + 3*u*u*t*s[1][k] + 3*u*t*t*s[2][k] + t*t*t*s[3][k]); };
  const left = (s, t) => {
    const l = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const a = l(s[0], s[1]), b = l(s[1], s[2]), c = l(s[2], s[3]), d = l(a, b), e = l(b, c);
    return [s[0], a, d, l(d, e)];
  };
  const len = (s, t = 1) => { let L = 0, p = s[0]; for (let k = 1; k <= 16; k++) { const q = at(s, t * k / 16); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return L; };
  let rest = cut, i = segs.length - 1;
  for (; i > 0; i--) { const L = len(segs[i]); if (L > rest) break; rest -= L; }
  const L = len(segs[i]), want = Math.max(0, L - rest);
  let lo = 0, hi = 1;
  for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (len(segs[i], mid) < want) lo = mid; else hi = mid; }
  const used = segs.slice(0, i); used.push(left(segs[i], (lo + hi) / 2));
  const f = v => v.toFixed(1);
  const d = `M${f(used[0][0][0])},${f(used[0][0][1])}` + used.map(sg => `C${f(sg[1][0])},${f(sg[1][1])} ${f(sg[2][0])},${f(sg[2][1])} ${f(sg[3][0])},${f(sg[3][1])}`).join("");
  return {d, end: used[used.length - 1][3]};
}
// Подписи оси X для произвольного периода: t0 — UTC-время первого дня, N — число дней.
// Шаг подбирается по ширине графика, чтобы подписи не налезали друг на друга.
// px — ширина области построения в пикселях, lastDay — обязательно показать последний день (только для коротких периодов).
const TICK_MON = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function makeTicks(t0, N, px = 600, lastDay = false){
  const DAY = 864e5, d0 = new Date(t0), perDay = px / Math.max(1, N - 1), ticks = [];
  if (N <= 45) {
    const need = 38, step = [1, 5, 10].find(k => k * perDay >= need) || 10;
    const label = i => pad(new Date(t0 + (i - 1) * DAY).getUTCDate());
    ticks.push({x:1, label:label(1)});
    for (let i = step === 1 ? 2 : step; i <= N; i += step) ticks.push({x:i, label:label(i)});
    if (lastDay && !ticks.some(t => t.x === N)) {
      while (ticks.length > 1 && (N - ticks[ticks.length - 1].x) * perDay < need) ticks.pop();
      ticks.push({x:N, label:label(N)});
    }
  } else if (N <= 800) {
    const monthPx = 30.4 * perDay, stepM = [1, 2, 3, 6, 12].find(k => k * monthPx >= 50) || 12, all = [];
    let y = d0.getUTCFullYear(), m = d0.getUTCMonth();
    for (;;) {
      const i = Math.round((Date.UTC(y, m, 1) - t0) / DAY) + 1;
      if (i > N) break;
      if (i >= 1) all.push({x:i, m, y});
      if (++m > 11) { m = 0; y++; }
    }
    all.filter(t => stepM === 1 || t.m % stepM === 0).forEach(t => ticks.push({x:t.x, label:t.m === 0 ? String(t.y) : TICK_MON[t.m]}));
  } else {
    const yearPx = 365.25 * perDay, stepY = [1, 2, 5, 10, 20].find(k => k * yearPx >= 54) || 20;
    for (let y = d0.getUTCFullYear(); ; y++) {
      const i = Math.round((Date.UTC(y, 0, 1) - t0) / DAY) + 1;
      if (i > N) break;
      if (i >= 1 && (stepY === 1 || y % stepY === 0)) ticks.push({x:i, label:String(y)});
    }
  }
  return ticks;
}
// Шкала оси Y: от 3 до 6 интервалов, самый «круглый» шаг и минимальный запас сверху.
// ceil — потолок, заданный пользователем (0 = авто).
function axisScale(v, ceil = 0){
  const top = ceil > 0 ? ceil : v;
  if (!(top > 0)) return {max:4, step:1, ceil:false};
  const mant = [1, 2, 2.5, 4, 5], p0 = Math.floor(Math.log10(top / 6)) - 1, cands = [];
  for (let e = p0; e <= p0 + 4; e++) mant.forEach(m => cands.push(m * Math.pow(10, e)));
  cands.sort((a, b) => a - b);
  let best = null;
  if (ceil > 0) {
    for (const st of cands) { const n = ceil / st; if (n >= 3 && n <= 6 && Math.abs(n - Math.round(n)) < 1e-9) { best = {max:ceil, step:st}; break; } }
    if (!best) { const st = cands.find(c => ceil / c <= 6) || ceil; best = {max:ceil, step:st}; }
    return {...best, ceil:true};
  }
  for (const st of cands) { const n = Math.ceil(top / st - 1e-9); if (n >= 3 && n <= 6) { const mx = n * st; if (!best || mx < best.max - 1e-9) best = {max:mx, step:st}; } }
  if (!best) { const st = cands.find(c => Math.ceil(top / c) <= 6) || top; best = {max:Math.ceil(top / st) * st, step:st}; }
  return {...best, ceil:false};
}
function axisTicks(sc){ const out = []; for (let k = 0; k * sc.step <= sc.max + 1e-9; k++) out.push(+(k * sc.step).toFixed(10)); if (sc.ceil && out[out.length - 1] < sc.max - 1e-9) out.push(sc.max); return out; }
// Одна запись коротких чисел по всему сайту: десятичная точка, «K» — тысячи, «M» — миллионы (1.9K · 12K · 1.2M).
function shortNum(v, digits = 1){
  const a = Math.abs(v), t = (x, d) => String(+x.toFixed(d)); // десятичная точка: 1.9K
  if (a >= 1e6) return t(v / 1e6, a >= 1e7 ? 0 : digits) + "M";
  if (a >= 1000) return t(v / 1000, a >= 1e4 ? 0 : digits) + "K";
  return t(v, 2);
}
// Подписи оси Y: «1,2 тыс.» вместо «1.2K», на языке интерфейса; пустое место в тысячах не тратим на лишние нули.
function axisLabel(v){
  let L = "ru"; try { L = (window.__lang && window.__lang.get()) || "ru"; } catch (e) {}
  const U = {ru:["тыс.", "млн"], uk:["тис.", "млн"], be:["тыс.", "млн"], kk:["мың", "млн"], en:["K", "M"], fr:["k", "M"], pl:["tys.", "mln"]}[L] || ["тыс.", "млн"];
  const a = Math.abs(v), num = (x, d) => { const t = String(+x.toFixed(d)); return L === "en" ? t : t.replace(".", ","); }, sp = L === "en" ? "" : "\u00a0";
  if (a >= 1e6) return num(v / 1e6, 2) + sp + U[1];
  if (a >= 1000) return num(v / 1000, 2) + sp + U[0];
  return num(v, 2);
}

// Проредить точки под ширину графика: в каждой корзине оставляем самую низкую и самую высокую точку, первую и последнюю — форма линии не меняется.
function thin(pts, max){
  const n = pts.length; if (n <= max) return pts;
  const g = Math.ceil(n / (max / 2 - 1)), out = [pts[0]];
  for (let i = 1; i < n - 1; i += g) {
    let lo = pts[i], hi = pts[i];
    for (let j = i; j < Math.min(n - 1, i + g); j++) { if (pts[j][1] < lo[1]) lo = pts[j]; if (pts[j][1] > hi[1]) hi = pts[j]; }
    if (lo === hi) out.push(lo); else out.push(...(lo[0] < hi[0] ? [lo, hi] : [hi, lo]));
  }
  out.push(pts[n - 1]); return out;
}
// Линейный график в стиле: тёмная панель, гладкие линии со стрелками, шкала справа
function lineChart({title, st, series: allSeries, xMin, xMax, ticks, yMax: yMaxIn, appearance = null, xLabel = null, valFmt = null, events = null, dateOf = null, shares = true}){
  // xLabel включает интерактивность: клик по легенде скрывает линию, при наведении появляется подсказка
  const series = xLabel ? allSeries.filter(s => !hiddenSeries.has(s.name)) : allSeries;
  const yMax = (xLabel && series.length) ? Math.max(1, ...series.flatMap(s => s.pts.map(p => p[1]).concat(s.fc ? [s.fc.y1, s.fc.hi] : []))) : yMaxIn;
  const gi = (s, html) => xLabel ? `<g class="lg-item" data-name="${escH(s.name)}"${s.ek ? ` data-ek="${escH(s.ek)}"` : ""} opacity="${hiddenSeries.has(s.name) ? 0.35 : 1}" style="cursor:pointer">${html}</g>` : html;
  // Сдвигаем область построения вправо, чтобы значения шкалы не отстояли далеко от графика.
  const endLbl = !!xLabel && series.length >= 3, many = series.length > 6;
  const W = 900, L = endLbl ? 66 : 16, R = endLbl ? 700 : 850, B = 500;
  const size = appearance || DEFAULT_TREND_STYLE;
  const lineWidth = Number(size.line) || 4, pointRadius = Number(size.point) || 8;
  const arrowLength = Number(size.arrowLength) || 6, arrowSize = Number(size.arrowSize) || 8;
  const baseLineOpacity = Math.min(1, Math.max(0, Number(size.opacity ?? 100) / 100));
  const seriesOpacity = s => Math.min(1, Math.max(0, Number(size.seriesOpacity?.[s.seriesKey] ?? 100) / 100));
  // В «Динамике» убрана левая легенда: названия серий показываются у концов линий справа.
  // Верхнее поле графика больше не зависит от количества серий.
  const T = 100;
  const yCeilIn = Number($("y-ceil") && $("y-ceil").value), yCeil = yCeilIn > 0 ? yCeilIn : 0;
  const H = B + 52, sc = axisScale(yMax, yCeil), max = sc.max;
  const sx = x => L + (x - xMin) / ((xMax - xMin) || 1) * (R - L - 20), sy = y => B - y / max * (B - T);
  let o = head(title, st); const defs = [];
  // Сетка и оси бледнее данных: линии — главное на графике.
  axisTicks(sc).forEach(v => { if (v > 0) o += `<line class="chart-grid" x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity=".07" stroke-width="1.5" pointer-events="none"/>`; o += `<text class="chart-axis" x="${endLbl ? L - 10 : 894}" y="${sy(v) + 7}" text-anchor="end" font-size="19" fill="#eceef3" fill-opacity=".72">${axisLabel(v)}</text>`; });
  const clipped = yCeil > 0 && series.some(s => s.pts.some(p => p[1] > max));
  defs.push(`<clipPath id="lc-clip"><rect x="${L - 12}" y="${T - 6}" width="${R - L + 40}" height="${B - T + 14}"/></clipPath>`);
  if (clipped) o += `<text x="${R - 10}" y="${T - 12}" text-anchor="end" font-size="14" fill="#f7768e">график обрезан по потолку ${escH(axisLabel(max))}</text>`;
  // Выходные: еле заметная подложка, пока дни различимы (до ~четырёх месяцев).
  if (dateOf && xMax - xMin >= 1 && xMax - xMin <= 130) {
    const half = (R - L - 20) / ((xMax - xMin) || 1) / 2; let run = null, wk = "";
    const flush = () => { if (run) { const x0 = Math.max(L, sx(run[0]) - half), x1 = Math.min(R - 20 + half, sx(run[1]) + half); wk += `<rect x="${x0.toFixed(1)}" y="${T}" width="${Math.max(0, x1 - x0).toFixed(1)}" height="${B - T}" fill="#ffffff" fill-opacity=".035" pointer-events="none"/>`; run = null; } };
    for (let k = xMin; k <= xMax; k++) { const w = new Date(dateOf(k) + "T12:00:00Z").getUTCDay(); if (w === 0 || w === 6) { if (run && run[1] === k - 1) run[1] = k; else { flush(); run = [k, k]; } } }
    flush(); o += `<g class="chart-weekends" data-no-export="1">${wk}</g>`;
  }
  o += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-opacity=".45" stroke-width="2"/>`;
  ticks.forEach(t => o += `<line x1="${sx(t.x)}" y1="${B}" x2="${sx(t.x)}" y2="${B + 8}" stroke="#dcdcdc" stroke-opacity=".45" stroke-width="2"/><text class="chart-axis" x="${sx(t.x)}" y="${B + 34}" text-anchor="middle" font-size="19" fill="#eceef3" fill-opacity=".72">${t.label}</text>`);
  let evNotes = null;
  if (events && dateOf) {
    const ix = d => { for (let k = xMin; k <= xMax; k++) if (dateOf(k) >= d) return k; return xMax; };
    const ev = chartEventsSvg(events, d => sx(ix(d)), T, B, R);
    o += ev.svg; evNotes = ev.notes;
  }
  o += `<g clip-path="url(#lc-clip)">`;
  series.forEach(s => {
    const P = thin(s.pts, 300).map(p => [sx(p[0]), sy(p[1])]);
    if (!P.length) return;
    const xe = P[P.length - 1][0];
    const pa = paint(s.st, P[0][0], 0, xe === P[0][0] ? xe + 1 : xe, 0);
    defs.push(pa.defs);

    const hasArrow = P.length > 1 && !many && !s.fc;
    const dn = ` data-n="${escH(s.name)}"`;
    const lineOpacity = baseLineOpacity * seriesOpacity(s) * (s.op !== undefined ? s.op : 1);
    // Линия обрывается внутри наконечника (не доходя ~15% его длины до основания),
    // поэтому она не выступает ни за острие, ни за стороны треугольника.
    const tr = hasArrow ? smoothTrim(P, arrowLength * (s.op ? 0.97 : 0.85)) : null;
    // Одна линия на графике — под ней мягкий градиентный спад к оси.
    if (!s.dash && P.length > 1 && series.filter(x => x.pts.length && !x.dash).length === 1) {
      const gid = "lcArea" + Math.random().toString(36).slice(2, 8);
      const yTop = Math.min(...P.map(p => p[1]));
      defs.push(`<linearGradient id="${gid}" x1="0" y1="${yTop.toFixed(1)}" x2="0" y2="${B}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${pa.z}" stop-opacity=".42"/><stop offset=".45" stop-color="${pa.z}" stop-opacity=".14"/><stop offset=".82" stop-color="${pa.z}" stop-opacity="0"/></linearGradient>`);
      o += `<path class="li-area anim-fade-late" d="${smooth(P)} L${P[P.length - 1][0].toFixed(1)},${B} L${P[0][0].toFixed(1)},${B} Z" fill="url(#${gid})" fill-opacity="${lineOpacity}" stroke="none"/>`;
    }
    o += `<path${dn}${s.dash ? "" : ' class="anim-line" pathLength="1"'} d="${hasArrow ? tr.d : smooth(P)}" fill="none" stroke="${pa.p}" stroke-opacity="${lineOpacity}" stroke-width="${lineWidth}" stroke-linecap="butt" stroke-linejoin="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`;
    if (!s.dash) o += `<circle${dn} cx="${P[0][0].toFixed(1)}" cy="${P[0][1].toFixed(1)}" r="${many ? pointRadius * .6 : pointRadius}" fill="${pa.a}" fill-opacity="${lineOpacity}"/>`;
    if (many && P.length > 1 && !s.dash) { const tip = P[P.length - 1]; o += `<circle${dn} class="anim-fade-late" cx="${tip[0].toFixed(1)}" cy="${tip[1].toFixed(1)}" r="${Math.max(4, pointRadius * .75)}" fill="${pa.z}" fill-opacity="${lineOpacity}"/>`; }
    if (s.live && P.length) { const lp = P[P.length - 1]; o += `<circle class="fx-pulse-dot" data-no-export="1" data-n="${escH(s.name)}" cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="4" fill="none" stroke="${pa.z}" stroke-width="2" pointer-events="none"/>`; }
    if (s.fc) {
      // Прогноз: полоса вероятного диапазона, пунктир и точка на конце месяца.
      const f = s.fc, X0 = sx(f.x0), Y0 = sy(f.y0), X1 = sx(f.x1);
      o += `<path data-n="${escH(s.name)}" d="M${X0.toFixed(1)},${Y0.toFixed(1)} L${X1.toFixed(1)},${sy(f.hi).toFixed(1)} L${X1.toFixed(1)},${sy(f.lo).toFixed(1)} Z" fill="${pa.z}" fill-opacity="${(.12 * lineOpacity).toFixed(3)}" pointer-events="none"/>`;
      o += `<line x1="${X0.toFixed(1)}" y1="${Y0.toFixed(1)}" x2="${X1.toFixed(1)}" y2="${sy(f.y1).toFixed(1)}" stroke="${pa.z}" stroke-opacity="${(.9 * lineOpacity).toFixed(3)}" stroke-width="${Math.max(1.5, lineWidth * .6)}" stroke-dasharray="6 5" stroke-linecap="round" data-n="${escH(s.name)}"/>`;
      o += `<circle cx="${X1.toFixed(1)}" cy="${sy(f.y1).toFixed(1)}" r="${Math.max(3.5, pointRadius * .7)}" fill="none" stroke="${pa.z}" stroke-width="2" stroke-opacity="${lineOpacity}" data-n="${escH(s.name)}"/>`;
    }
    if (hasArrow) {
      // Ось наконечника — от точки обрыва линии к последней точке данных.
      const tip = P[P.length - 1], e = tr.end;
      let tx = tip[0] - e[0], ty = tip[1] - e[1];
      const norm = Math.hypot(tx, ty);
      if (norm < 1e-6) { tx = 1; ty = 0; } else { tx /= norm; ty /= norm; }
      const baseX = tip[0] - tx * arrowLength, baseY = tip[1] - ty * arrowLength;
      const nx = -ty, ny = tx, half = arrowSize / 2;
      const p1 = `${(baseX + nx * half).toFixed(2)},${(baseY + ny * half).toFixed(2)}`;
      const p2 = `${tip[0].toFixed(2)},${tip[1].toFixed(2)}`;
      const p3 = `${(baseX - nx * half).toFixed(2)},${(baseY - ny * half).toFixed(2)}`;
      o += `<polygon${dn} class="anim-fade-late" points="${p1} ${p2} ${p3}" fill="${pa.z}" fill-opacity="${lineOpacity}"/>`;
    }
  });
  o += `</g>`;
  const fcAny = series.find(s => s.fc);
  if (fcAny) { const X0 = sx(fcAny.fc.x0); o += `<line x1="${X0.toFixed(1)}" y1="${T}" x2="${X0.toFixed(1)}" y2="${B}" stroke="#ffffff" stroke-opacity=".28" stroke-dasharray="2 4" pointer-events="none"/><text class="chart-axis" x="${(X0 + 6).toFixed(1)}" y="${T + 14}" font-size="13" fill="#aab0c0">сегодня → прогноз</text>`; }
  lineSeriesInfo = xLabel ? allSeries.map(s => ({name:s.name, color:s.st.c[0]})) : null;
  if (endLbl) {
    // Подписи у концов линий: раздвигаем по вертикали, чтобы не налезали, и ведём к линиям тонкие выноски.
    const ends = series.map(s => { if (s.fc) return {s, x:sx(s.fc.x1), y:Math.max(T, sy(s.fc.y1)), v:s.fc.y1, fc:true}; const p = s.pts[s.pts.length - 1]; return p ? {s, x:sx(p[0]), y:Math.max(T, sy(p[1])), v:p[1]} : null; }).filter(Boolean).sort((a, b) => a.y - b.y || b.v - a.v);
    const gap = Math.max(14, Math.min(26, (B - T + 10) / Math.max(1, ends.length)));
    let prev = -1e9; ends.forEach(e => { e.ly = Math.max(e.y, prev + gap); prev = e.ly; });
    if (ends.length && ends[ends.length - 1].ly > B) { ends[ends.length - 1].ly = B; for (let i = ends.length - 2; i >= 0; i--) ends[i].ly = Math.min(ends[i].ly, ends[i + 1].ly - gap); }
    const fs = Math.max(12, Math.min(18, gap - 4)), lx = R + 26, short = v => v >= 1000 ? shortNum(v) : fmt(Math.round(v));
    ends.forEach(e => {
      const c = e.s.st.c[0], nm = e.s.name.length > 15 ? e.s.name.slice(0, 14) + "…" : e.s.name;
      o += gi(e.s, `<path data-n="${escH(e.s.name)}" d="M${(e.x + 6).toFixed(1)},${e.y.toFixed(1)} C${(R + 12).toFixed(1)},${e.y.toFixed(1)} ${(R + 8).toFixed(1)},${e.ly.toFixed(1)} ${(lx - 6).toFixed(1)},${e.ly.toFixed(1)}" fill="none" stroke="${c}" stroke-opacity=".55" stroke-width="1.6"/><circle data-n="${escH(e.s.name)}" cx="${lx - 4}" cy="${e.ly.toFixed(1)}" r="3.5" fill="${c}"/><text data-n="${escH(e.s.name)}" class="end-label" x="${lx + 4}" y="${(e.ly + fs * .35).toFixed(1)}" font-size="${fs.toFixed(0)}" fill="${chartFontColor || "#f2f3f7"}">${escH(nm)}<tspan fill-opacity=".6" font-size="${(fs * .82).toFixed(0)}"> ${e.fc && e.s.fc.now != null ? `${short(e.s.fc.now)} → ` : ""}${e.fc ? "≈" : ""}${short(e.v)}</tspan></text>`);
    });
  }
  let extra = "";
  if (xLabel) {
    lineMeta = {L, T, B, span: R - L - 20, xMin, xMax, xLabel, shares: shares && series.some(s => s.ek), valFmt, evNote: evNotes && dateOf ? x => evNotes(dateOf(x)) : null,
      xs: [...new Set(series.flatMap(s => s.pts.map(p => p[0])))].sort((a, b) => a - b),
      series: series.map(s => ({name: s.name, c: s.st.c[0], v: new Map(s.pts.map(p => [p[0], p[1]])), fc: s.fc || null}))};
    extra = `<line id="xh" x1="0" y1="${T}" x2="0" y2="${B}" stroke="#ffffff66" stroke-width="1.5" stroke-dasharray="4 4" visibility="hidden" pointer-events="none"/><rect id="hov" x="${L}" y="${T}" width="${R - L + 20}" height="${B - T}" fill="transparent" style="touch-action:pan-y"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img"><defs>${defs.join("")}</defs>${o}${extra}</svg>`;
}

function usersAgg(metric, applySelection = true){
  const m = new Map();
  cScoped().forEach(x => {
    const k = String(x[F.userId] ?? x[F.name]);
    if (!isVisibleUser(k)) return;
    const u = m.get(k) || {n: who(x), v: 0, k};
    u.v += Number(g(x, metric)) || 0; m.set(k, u);
  });
  return [...m.values()].filter(u => u.v > 0 && (!applySelection || !SEL_ACTIVE || SEL.has(u.k))).sort((a,b) => b.v - a.v);
}
function chatRowsForChart(source = rows){
  // chat_pk=0 — готовый итог «все чаты», его нужно исключать, иначе будут дубли.
  return source.filter(x => Number(x[F.chatPk]) !== 0 && (x[F.chat] || x[F.chatPk] !== undefined));
}
// Чаты, вручную убранные с графиков (меню «Чаты на графике»). Действует только на вкладке «Графики».
const CHAT_OFF_KEY = "chatstats.chartChatsOff.v1";
let CHAT_OFF = new Set();
try { const j = JSON.parse(localStorage.getItem(CHAT_OFF_KEY) || "[]"); if (Array.isArray(j)) CHAT_OFF = new Set(j.map(String)); } catch (e) {}
const chatKeyOf = x => String(x[F.chatPk] ?? x[F.chat]);
function chartChatRows(source = rows){ const r = chatRowsForChart(source); return CHAT_OFF.size ? r.filter(x => !CHAT_OFF.has(chatKeyOf(x))) : r; }
function chatsAgg(metric, source = cRows()){
  const m = new Map();
  chartChatRows(source).forEach(x => {
    const k = String(x[F.chatPk] ?? x[F.chat]);
    const u = m.get(k) || {n: String(x[F.chat] || `Чат ${k}`), v: 0, k};
    u.v += Number(g(x, metric)) || 0; m.set(k, u);
  });
  return [...m.values()].filter(u => u.v > 0).sort((a,b) => b.v - a.v);
}
function chartAgg(metric, source = cRows()){ return chartEntity === "chats" ? chatsAgg(metric, source) : usersAgg(metric); }
function chartStyleKind(){ return chartEntity === "chats" ? "c" : "u"; }
function barsChart(){
  const list = normChartList(chartAgg($("metric").value), $("metric").value).slice(0, barsCap(chartEntity === "users" && SEL_ACTIVE ? 40 : 20));
  if (!list.length) return note("Нет данных за выбранный период");
  const H = 110 + list.length * 32, max = list[0].v, defs = [];
  // Подбираем левую колонку по самому длинному имени, чтобы названия чатов не обрезались.
  // Одновременно рассчитываем ширину холста с запасом под самое длинное числовое значение.
  const measure = value => {
    const text = String(value);
    try {
      const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = '18px "Samsung Sans", "SamsungOne", "Segoe UI", system-ui, sans-serif';
        const width = ctx.measureText(text).width;
        if (Number.isFinite(width) && width > 0) return width;
      }
    } catch (e) {}
    return [...text].reduce((sum, ch) => sum + (/[ilI.,' `]/.test(ch) ? 4.5 : /[MW@#%]/.test(ch) ? 12 : 9.2), 0);
  };
  const widestName = Math.max(0, ...list.map(u => measure(u.n)));
  const labelX = Math.max(134, Math.ceil(widestName + 10));
  const x0 = labelX + 12;
  const valueSpace = Math.max(38, Math.ceil(measure(fmtN(max))));
  const x1 = x0 + 645;
  const W = Math.max(900, x1 + valueSpace + 18);
  let o = head(cPeriodLabel(), sub() + normSuffix());
  list.forEach((u, i) => {
    const y = 94 + i * 32, w = Math.max(3, u.v / max * (x1 - x0));
    const pa = paint(chartSeriesStyle(chartStyleKind(), u.k), x0, 0, x0 + w, 0); defs.push(pa.defs);
    o += `<g data-n="${escH(u.n)}"><rect x="0" y="${y - 4}" width="${W}" height="30" fill="transparent" data-ek="${escH(u.k)}"/><text class="chart-label" x="${labelX}" y="${y + 17}" text-anchor="end" font-size="18" fill="#e6e8ee" data-ek="${escH(u.k)}">${escH(u.n)}</text>
      <rect class="anim-bar-x" style="animation-delay:${i * 25}ms" x="${x0}" y="${y}" width="${w.toFixed(1)}" height="22" rx="5" fill="${pa.p}" data-ek="${escH(u.k)}"/>
      <text class="chart-value" x="${(x0 + w + 8).toFixed(1)}" y="${y + 17}" font-size="18" fill="#eceef3" data-ek="${escH(u.k)}">${fmtN(u.v)}</text></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img"><defs>${defs.join("")}</defs>${o}</svg>`;
}

let donutOthersOpen = false;
function donutChart(){
  const all = chartAgg($("metric").value);
  if (!all.length) return note("Нет данных за выбранный период");
  const baseCap = barsCap(chartEntity === "users" && SEL_ACTIVE ? 14 : 8);
  const cap = donutOthersOpen ? Math.min(all.length, 30) : baseCap;
  const list = all.slice(0, cap).map(u => ({...u}));
  const restItems = all.slice(cap), rest = restItems.reduce((s, u) => s + u.v, 0);
  if (rest) list.push({n: `Остальные (${restItems.length})`, v: rest, gray: true, others: true, count: restItems.length});
  const canCollapse = donutOthersOpen && all.length > baseCap;
  const total = all.reduce((s, u) => s + u.v, 0), donutPrefs = chartPrefs("donut");
  const R = Math.max(72, Math.min(140, Number(donutPrefs.donutRadius) || 118));
  const ringWidth = Math.max(24, Math.min(76, Number(donutPrefs.donutThickness) || 56));
  const cx = 180, rowH = list.length > 16 ? 25 : 34, legendRows = list.length + (canCollapse ? 1 : 0);
  const H = Math.max(470, 150 + legendRows * rowH), cy = (H + 70) / 2, defs = [];
  const r0 = R - ringWidth / 2, r1 = R + ringWidth / 2, TAU = Math.PI * 2;
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const arc = (a0, a1) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${pt(r1, a0)} A${r1},${r1} 0 ${large} 1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0},${r0} 0 ${large} 0 ${pt(r0, a0)} Z`;
  };
  const box = [cx - r1 - 10, cy - r1 - 10, cx + r1 + 10, cy + r1 + 10];
  let acc = 0, segs = "", legend = "", o = head(cPeriodLabel(), sub());
  list.forEach((u, i) => {
    const pa = u.gray ? paint(chartSeriesStyle("special", "other"), ...box) : paint(chartSeriesStyle(chartStyleKind(), u.k), ...box);
    defs.push(pa.defs);
    const frac = u.v / total, gap = list.length > 1 ? Math.min(3 / R, frac * TAU * 0.3) : 0;
    let a0 = -Math.PI / 2 + acc * TAU + gap / 2, a1 = -Math.PI / 2 + (acc + frac) * TAU - gap / 2;
    if (a1 - a0 >= TAU - 1e-4) a1 = a0 + TAU - 1e-3;
    const mid = (a0 + a1) / 2, push = 9;
    acc += frac;
    const pct = Math.round(frac * 100);
    const attrs = u.others
      ? ` data-donut-toggle="1" data-tip="${escH(`Остальные · ${u.count}`)}|${escH(`${fmt(u.v)} · ${pct}% — нажми, чтобы раскрыть`)}"`
      : ` data-ek="${escH(u.k)}"`;
    // «Остальные» — тихая штриховка, а не большой серый сектор, который перетягивает внимание
    if (u.others && !defs.some(d => d.includes('id="donutOther"'))) defs.push(`<pattern id="donutOther" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#8a90a2" fill-opacity=".14"/><rect width="2.4" height="8" fill="#c0c6d4" fill-opacity=".3"/></pattern>`);
    segs += `<g class="donut-seg" data-seg="${i}" data-n="${escH(u.n)}"${attrs} style="--dx:${(Math.cos(mid) * push).toFixed(1)}px;--dy:${(Math.sin(mid) * push).toFixed(1)}px"><path d="${arc(a0, a1)}" fill="${u.others ? "url(#donutOther)" : pa.p}"/></g>`;
    const y = 130 + i * rowH, fs = rowH < 30 ? 15 : 18;
    legend += `<g class="donut-leg" data-seg="${i}" data-n="${escH(u.n)}"${attrs}><rect x="360" y="${y - rowH / 2}" width="450" height="${rowH}" fill="transparent"/><circle cx="372" cy="${y}" r="7" fill="${u.others ? "url(#donutOther)" : pa.a}"${u.others ? ' stroke="#c0c6d4" stroke-opacity=".45" stroke-width="1"' : ""}/><text class="chart-label" x="392" y="${y + 6}" font-size="${fs}" fill="#f2f3f7">${escH(u.n)}${u.others ? `<tspan data-no-export="1"> ▾</tspan>` : ""}</text>
      <text class="chart-value" x="800" y="${y + 6}" text-anchor="end" font-size="${fs}"><tspan class="chart-value-main" fill="#f2f3f7">${fmt(u.v)}</tspan><tspan class="chart-value-separator" fill="#707789"> • </tspan><tspan class="chart-value-percent" fill="#aab0c0">${pct}%</tspan></text></g>`;
  });
  if (canCollapse) {
    const y = 130 + list.length * rowH;
    legend += `<g class="donut-leg" data-donut-toggle="1" data-no-export="1"><rect x="360" y="${y - rowH / 2}" width="450" height="${rowH}" fill="transparent"/><text class="chart-legend" x="392" y="${y + 6}" font-size="15" fill="#aab0c0">▴ Свернуть в «Остальные»</text></g>`;
  }
  o += segs + legend;
  o += `<text class="chart-value" x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="36" fill="#eceef3">${fmt(total)}</text><text class="chart-subtitle" x="${cx}" y="${cy + 34}" text-anchor="middle" font-size="17" fill="#7d8190">всего</text>`;
  return `<svg viewBox="0 0 820 ${H}" role="img"><defs>${defs.join("")}</defs>${o}</svg>`;
}

function trendChart(){
  if (cMode() === "day") return note("Для динамики выберите период: неделя, месяц, год или все данные");
  const src = chartEntity === "chats" ? chartChatRows(cRows()) : cScoped();
  let r = cRange(); if (!r) return note("Выберите период");
  if (cMode() === "all") {
    const ds = src.map(x => String(x[F.date] ?? "").slice(0,10)).filter(d => d.length === 10).sort();
    if (!ds.length) return note("Нет данных");
    r = [ds[0], r[1]];
  }
  const metric = $("metric").value, a = r[0].split("-").map(Number), e = r[1].split("-").map(Number);
  const t0 = Date.UTC(a[0], a[1] - 1, a[2]), DAY = 864e5;
  const N = Math.round((Date.UTC(e[0], e[1] - 1, e[2]) - t0) / DAY) + 1;
  let last = Math.min(N, Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - t0) / DAY) + 1);
  if (last < 1) return note("Этот период ещё не начался");
  // Для незавершённого текущего месяца ограничиваем ось последним днём,
  // за который в выбранной выборке действительно есть данные.
  const selectedMonth = r[0].slice(0, 7), currentMonth = iso(now).slice(0, 7);
  const partialCurrentMonth = cMode() === "month" && selectedMonth === currentMonth && last < N;
  if (partialCurrentMonth) {
    const availableLast = src.reduce((maxDay, x) => {
      const d = String(x[F.date] ?? "").slice(0, 10);
      if (d < r[0] || d > r[1] || d > iso(now) || d.length !== 10) return maxDay;
      const parts = d.split("-").map(Number);
      const index = Math.round((Date.UTC(parts[0], parts[1] - 1, parts[2]) - t0) / DAY) + 1;
      return Math.max(maxDay, index);
    }, 0);
    if (availableLast > 0) last = Math.min(last, availableLast);
  }
  if (last < 1) return note("Нет данных за выбранный период");
  // Прогноз до конца текущего месяца: ось продлевается до последнего дня месяца.
  const idxOf = d => Math.round((Date.parse(d + "T00:00:00Z") - t0) / DAY) + 1;
  const fcMode = $("trend-forecast")?.value, fcYear = fcMode === "year";
  // До конца месяца или до 31 декабря текущего года.
  const todayIso = iso(now), monthEndIso = fcYear ? `${now.getFullYear()}-12-31` : iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const fcWanted = fcMode === "month" || fcYear;
  const TV = NORM === "abs" ? TREND_VIEW : "cum", fcEnd = idxOf(monthEndIso), fcOn = fcWanted && NORM === "abs" && TV === "cum" && r[0] <= todayIso && r[1] >= addDaysIso(todayIso, -1) && fcEnd > last && last >= 3;
  let displayN = partialCurrentMonth ? last : N;
  if (fcOn) displayN = Math.max(displayN, fcEnd);
  const trendTicks = makeTicks(t0, displayN, 600, true);
  const per = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0,10).split("-").map(Number); if (d.length < 3) return;
    const i = Math.round((Date.UTC(d[0], d[1] - 1, d[2]) - t0) / DAY) + 1; if (i < 1 || i > last) return;
    const k = chartEntity === "chats" ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    if (chartEntity === "users" && !isVisibleUser(k)) return;
    if (chartEntity === "users" && SEL_ACTIVE && !SEL.has(k)) return;
    const name = chartEntity === "chats" ? String(x[F.chat] || `Чат ${k}`) : who(x);
    const u = per.get(k) || {n: name, k, a: Array(last + 1).fill(0)};
    u.a[i] += Number(g(x, metric)) || 0; per.set(k, u);
  });
  const ranked = [...per.values()].map(u => {
    let s = 0, act = 0; u.c = u.a.map((v, i) => i ? (s += v) : 0); u.t = s;
    // Число активных дней нарастающим итогом — для режима «на активный день».
    u.d = u.a.map((v, i) => i ? (act += v > 0 ? 1 : 0) : 0);
    return u;
  }).filter(u => u.t > 0).sort((a, b) => b.t - a.t);
  const top = ranked.slice(0, trendTop());
  if (!top.length) return note(chartEntity === "chats" ? "Нет данных по чатам за выбранный период" : "Нет данных за выбранный период");
  const entityWord = chartEntity === "chats" ? "чата" : "пользователя";
  const allShown = top.length === ranked.length && $("trend-top").value === "all";
  const selectedLabel = chartEntity === "users" && SEL_ACTIVE ? `, выбрано участников: ${SEL.size}` : allShown ? `, все (${top.length})` : `, топ-${top.length} ${entityWord}`;
  // Нормирование: доля — от суммы всех (не только показанных) за период с начала; на активный день — накопленное / активных дней.
  const totC = Array(last + 1).fill(0);
  if (NORM === "share") ranked.forEach(u => { for (let j = 1; j <= last; j++) totC[j] += u.c[j]; });
  // «По дням» и скользящее среднее за 7 дней: темп вместо накопления (только в режиме «Всего»).
  if (TV !== "cum") ranked.forEach(u => { u.v = u.a.map((x, i) => { if (!i) return 0; if (TV === "day") return x; let s2 = 0, n = 0; for (let q = Math.max(1, i - 6); q <= i; q++) { s2 += u.a[q]; n++; } return s2 / n; }); });
  const valAt = (u, j) => TV !== "cum" ? u.v[j] : NORM === "share" ? (totC[j] ? u.c[j] / totC[j] * 100 : 0) : NORM === "day" ? (u.d[j] ? u.c[j] / u.d[j] : 0) : u.c[j];
  const series = top.map(u => ({name: u.n, ek: String(u.k), seriesKey: `${chartStyleKind()}:${String(u.k)}`, st: chartSeriesStyle(chartStyleKind(), u.k), pts: Array.from({length: last}, (_, j) => [j + 1, valAt(u, j + 1)]).filter(p => NORM !== "day" || u.d[p[0]] > 0).filter(p => TV === "cum" || last < 3 || last !== idxOf(todayIso) || p[0] < last), w: 4})); // сегодняшний день ещё не закончен: в темпе его не показываем
  if (last === idxOf(todayIso) || last === idxOf(addDaysIso(todayIso, -1))) series.forEach(s2 => { s2.live = true; });
  // Год / все данные / длинный диапазон: точки по месяцам (конец каждого месяца + последний день) вместо каждого дня.
  const trendMonthly = TV === "cum" && (cMode() === "year" || cMode() === "all" || (cMode() === "range" && last > 120));
  if (trendMonthly) {
    const keep = new Set([1, last]);
    for (let j = 1; j < last; j++) { const d = new Date(t0 + j * DAY); if (d.getUTCDate() === 1) keep.add(j); }
    series.forEach(s2 => { s2.pts = s2.pts.filter(p => keep.has(p[0])); });
  }
  if (fcOn) {
    // Темп: 60% — последние 14 дней, 40% — весь период; разброс — по дневным значениям последних 28 дней.
    const rem = fcEnd - last, monthStartIdx = Math.max(1, idxOf(fcYear ? todayIso.slice(0, 5) + "01-01" : todayIso.slice(0, 8) + "01"));
    top.forEach((u, i) => {
      const n14 = Math.min(14, last), n28 = Math.min(28, last);
      let s14 = 0; for (let j = last - n14 + 1; j <= last; j++) s14 += u.a[j];
      const d28 = []; for (let j = last - n28 + 1; j <= last; j++) d28.push(u.a[j]);
      const m28 = d28.reduce((a2, b2) => a2 + b2, 0) / n28, sd = Math.sqrt(d28.reduce((a2, b2) => a2 + (b2 - m28) ** 2, 0) / n28);
      const rate = .6 * (s14 / n14) + .4 * (u.t / last), y1 = u.t + rate * rem, spread = 1.28 * sd * Math.sqrt(rem);
      let mSoFar = 0; for (let j = monthStartIdx; j <= last; j++) mSoFar += u.a[j] || 0;
      series[i].fc = {x0:last, y0:u.t, x1:fcEnd, y1, lo:Math.max(u.t, y1 - spread), hi:y1 + spread, rate, month:mSoFar + rate * rem, monthSoFar:mSoFar, pw:fcYear ? "год" : "месяц"};
    });
    const order = [...series].sort((a2, b2) => b2.fc.y1 - a2.fc.y1);
    order.forEach((s2, k) => { s2.fc.place = k + 1; });
    series.forEach((s2, k) => { s2.fc.nowPlace = k + 1; });
  }
  const yMax = Math.max(1, ...series.flatMap(s => s.pts.map(p => p[1]).concat(s.fc ? [s.fc.y1, s.fc.hi] : [])));
  const MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const fcWord = fcOn ? `, прогноз до ${+monthEndIso.slice(8)} ${MONTHS_GEN[+monthEndIso.slice(5, 7) - 1]}` : fcWanted && NORM !== "abs" ? ", прогноз — только в режиме «Всего»" : "";
  const normWord = (NORM === "share" ? ", доля от всех, %" : NORM === "day" ? ", в среднем на активный день" : "") + fcWord;
  const dateOf = i => iso(new Date(t0 + (i - 1) * DAY + 12 * 3600e3)).slice(0, 10);
  const sameYear = new Date(t0).getUTCFullYear() === new Date(t0 + (displayN - 1) * DAY).getUTCFullYear() && new Date(t0).getUTCFullYear() === now.getFullYear();
  return lineChart({
    title: cPeriodLabel(), st: sub() + (TV === "day" ? ", по дням" : TV === "ma7" ? ", скользящее среднее за 7 дней" : ", накопительно") + (trendMonthly ? ", по месяцам" : "") + normWord + selectedLabel,
    series, xMin: 1, xMax: displayN, ticks: trendTicks, yMax, appearance: TREND_STYLE,
    xLabel: i => { const d = new Date(t0 + (i - 1) * DAY); return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}` + (sameYear ? "" : `.${d.getUTCFullYear()}`); },
    valFmt: NORM === "share" ? v => fmtR(v) + "%" : NORM === "day" || TV === "ma7" ? v => fmtR(v) : null,
    events: chartEventsFor(dateOf(1), dateOf(displayN), top.map(u => String(u.k))), dateOf,
    shares: NORM === "abs" && TV === "cum",
  });
}

/* «По годам»: какие дни месяца показывать. "" — все, "5"/"7" — окно вокруг сегодняшнего числа, "a-b" — свои. */
const YD_KEY = "chatstats.yearsDays.v1";
let YD = ""; try { YD = localStorage.getItem(YD_KEY) || ""; } catch (e) {}
function yearsStyle(){ const t = chartPrefs("years")?.trendStyle || {}; const o = {...DEFAULT_TREND_STYLE}; for (const k of ["line", "point", "arrowLength", "arrowSize"]) if (t[k] !== undefined) o[k] = clampTrendStyle(k, t[k]); return o; }
function ydWindow(dim){
  const v = YD, td = new Date().getDate();
  if (v === "5" || v === "7") {
    const n = +v; let a = td - Math.floor((n - 1) / 2); if (a < 1) a = 1;
    let b = a + n - 1; if (b > dim) { b = dim; a = Math.max(1, b - n + 1); }
    return {a, b, auto:n};
  }
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) { let a = Math.max(1, Math.min(31, +m[1])), b = Math.max(1, Math.min(31, +m[2])); if (a > b) [a, b] = [b, a]; b = Math.min(b, dim); a = Math.min(a, b); return a === 1 && b >= dim ? null : {a, b}; }
  return null;
}
function ydSync(){
  const custom = /^\d+-\d+$/.test(YD), mode = custom ? "custom" : YD;
  document.querySelectorAll("#years-days button").forEach(b => b.classList.toggle("active", b.dataset.yd === mode));
  const cs = $("years-days-custom"); if (cs) cs.hidden = !custom;
  if (custom) { const [a, b] = YD.split("-"); if (document.activeElement !== $("years-days-a")) $("years-days-a").value = a; if (document.activeElement !== $("years-days-b")) $("years-days-b").value = b; }
}
function ydSet(v){ YD = v; try { localStorage.setItem(YD_KEY, v); } catch (e) {} ydSync(); renderCharts(); }
document.querySelectorAll("#years-days button").forEach(b => b.onclick = () => {
  const d = b.dataset.yd;
  if (d === "custom") { if (/^\d+-\d+$/.test(YD)) return ydSync(); const w = ydWindow(31) || {a:Math.max(1, new Date().getDate() - 3), b:Math.min(31, new Date().getDate() + 3)}; ydSet(`${w.a}-${w.b}`); }
  else ydSet(d);
});
["years-days-a", "years-days-b"].forEach(id => $(id) && $(id).addEventListener("change", () => {
  const a = Math.min(31, Math.max(1, +$("years-days-a").value || 1)), b = Math.min(31, Math.max(1, +$("years-days-b").value || a));
  ydSet(`${Math.min(a, b)}-${Math.max(a, b)}`);
}));
function yearsChart(){
  const metric = $("metric").value;
  let src = pick(allRows || rows, $("chat").value);
  src = src.filter(x => isVisibleUser(x[F.userId]));
  const mv = $("month").value;
  const m = mv ? +mv.slice(5,7) : now.getMonth() + 1;
  const today = new Date(), cy = today.getFullYear(), todayDay = today.getDate(), isCur = m === today.getMonth() + 1;
  const currentMonthDays = new Date(cy, m, 0).getDate();
  // Используем полную длину месяца. В сравнении февраля разных лет учитываем 29-е число,
  // если оно существует хотя бы в одном году, попавшем в историю.
  const maxDaysInData = src.reduce((max, x) => {
    const d = String(x[F.date] ?? "").slice(0, 10);
    if (d.length !== 10 || Number(d.slice(5, 7)) !== m) return max;
    return Math.max(max, new Date(Number(d.slice(0, 4)), m, 0).getDate());
  }, currentMonthDays);
  const xMax0 = maxDaysInData, YW = ydWindow(xMax0), xA = YW ? YW.a : 1, xMax = YW ? YW.b : xMax0;
  const ydTicks = () => YW ? Array.from({length:xMax - xA + 1}, (_, i) => ({x:xA + i, label:pad(xA + i)})).filter((t, i, arr) => arr.length <= 16 || (t.x - xA) % 2 === 0 || i === arr.length - 1) : makeTicks(Date.UTC(cy, m - 1, 1), xMax, 600, true);
  const ydWord = YW ? `, ${xA === xMax ? xA : `${xA}–${xMax}`} ${["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"][m - 1]}` : "";
  const by = {};
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0,10); if (d.length !== 10 || +d.slice(5,7) !== m) return;
    const y = +d.slice(0,4), day = +d.slice(8,10);
    (by[y] || (by[y] = Array(32).fill(0)))[day] += Number(g(x, metric)) || 0;
  });
  const hasMonthData = Object.values(by).some(a => a.some((v, i) => i > 0 && v !== 0));
  if (!hasMonthData) return note("Нет данных за этот месяц");
  // Даже если в текущем месяце ещё нет строк, оставляем место для текущего года,
  // чтобы прогноз мог использовать предыдущие 14 дней по той же модели, что и вкладка «Прогноз».
  if (isCur && !by[cy]) by[cy] = Array(32).fill(0);
  const series = []; let yMax = 0;
  Object.keys(by).map(Number).sort((a, b) => a - b).forEach(y => {
    const dim = new Date(y, m, 0).getDate(), lim = Math.min(xMax, (y === cy && isCur) ? Math.min(todayDay, dim) : dim);
    let s = 0; const pts = [];
    for (let d = 1; d < xA; d++) s += by[y][d] || 0;
    for (let d = xA; d <= lim; d++) { s += by[y][d] || 0; pts.push([d, s]); }
    if (!pts.length || (!s && !(y === cy && isCur))) return;
    yMax = Math.max(yMax, s);
    series.push({name: String(y), st: chartSeriesStyle("y", y), pts, w: 4, y});
  });
  if (!series.length) return note("Нет данных за этот месяц");
  const cur = series.find(s => s.y === cy);
  if (cur && isCur) cur.live = true;
  if (cur && isCur) {
    const n = cur.pts.length ? cur.pts[cur.pts.length - 1][0] : 0, lastV = cur.pts.length ? cur.pts[cur.pts.length - 1][1] : 0, fcEndX = Math.min(currentMonthDays, xMax);
    // Прогноз использует тот же расчёт темпа и остатка периода, что и вкладка «Прогноз».
    if (n && fcEndX > n) {
      const daily = new Map();
      src.forEach(x => {
        const d = String(x[F.date] ?? "").slice(0, 10);
        if (d.length !== 10) return;
        const v = Number(g(x, metric)) || 0;
        if (v) daily.set(d, (daily.get(d) || 0) + v);
      });
      const forecast = fcCompute(daily, fcBounds("month"));
      // Прогноз рисуется как на «Динамике»: пунктир, полоса разброса и итог у конца линии текущего года.
      // В окне дней прогноз — только до конца окна: доля оставшегося до конца месяца.
      const k = (currentMonthDays - n) > 0 ? (fcEndX - n) / (currentMonthDays - n) : 1;
      const endValue = lastV + (forecast.forecast - forecast.current) * k;
      cur.fc = {x0:n, y0:lastV, x1:fcEndX, y1:endValue, now:YW ? lastV : null, lo:Math.max(lastV, lastV + (forecast.lo - forecast.current) * k), hi:lastV + (forecast.hi - forecast.current) * k, month:endValue, place:1, nowPlace:1,
        note:"темп — как на вкладке «Прогноз»"};
      // С чем сравнить: итог того же месяца в прошлые годы.
      cur.fc.prev = series.filter(s2 => s2 !== cur && s2.pts.length).map(s2 => ({name:s2.name, v:s2.pts[s2.pts.length - 1][1]}));
      yMax = Math.max(yMax, cur.fc.hi);
    }
  }
  const yearsSubtitle = `${MLBL[metric]}, ${$("chat").value || "все чаты"}`;
  return lineChart({title: MONTHS[m - 1], st: yearsSubtitle + ydWord + ", накопительно с начала месяца по годам" + (cur && cur.fc ? `, прогноз до ${cur.fc.x1}.${pad(m)}` : ""), series, xMin: xA, xMax, ticks: ydTicks(), yMax, appearance: yearsStyle(), xLabel: i => `${pad(i)}.${pad(m)}`});
}

function applyChartTextStyles(){
  const type = currentChartType(), p = chartPrefs(type), ts = p.textStyle || DEFAULT_TEXT_STYLE[type] || DEFAULT_TEXT_STYLE.bars;
  const out = $("c-out"); if (!out) return;
  const rules = [
    [".chart-title","title"],[".chart-subtitle","subtitle"],[".chart-label","labels"],
    [".chart-value","values"],[".chart-value-main","values"],[".chart-value-separator","axis"],
    [".chart-value-percent","values"],[".chart-axis","axis"],[".chart-legend","legend"]
  ];
  for (const [selector,group] of rules) {
    const size = Number(ts[group+"Size"]), color = ts[group+"Color"];
    out.querySelectorAll(`svg ${selector}`).forEach(el => {
      if (Number.isFinite(size) && size > 0) el.style.setProperty("font-size", `${size}px`, "important");
      if (color && /^#[0-9a-f]{6}$/i.test(color)) el.style.setProperty("fill", color, "important");
    });
  }
}

let chartRenderSequence = 0;
async function renderCharts(){
  const renderSeq = ++chartRenderSequence;
  lineSeriesInfo = null;
  const requestedType = cType;
  // «Сезонность» и «Кто активен вместе» считаются только по участникам: переключатель «Чаты» там ничего не давал.
  if ((requestedType === "season" || requestedType === "pairs" || requestedType === "bumpyears") && chartEntity === "chats") {
    chartEntity = "users";
    document.querySelectorAll("#c-entity button").forEach(x => x.classList.toggle("active", x.dataset.entity === "users"));
  }
  const yearsUi = syncYearsChartFilterFields();
  applyChartAppearance(requestedType);
  if (requestedType === "trend") loadTrendStyleForChartType(requestedType);

  // Do not block drawing the chart while status metadata is loading. The donut and
  // other views render immediately; once status metadata arrives, redraw with the
  // "hide left" filter applied. The sequence guard prevents stale async renders
  // from overwriting the currently selected graph.
  if (hideLeft && !userMetricRows) {
    ensureUserMetrics().then(() => {
      if (renderSeq === chartRenderSequence && cType === requestedType && $("tab-charts").classList.contains("active")) renderCharts();
    }).catch(e => { leftFilterError = e.message || String(e); });
  }

  $("trend-count-field").hidden = !["trend", "race", "pairs", "bump", "spread", "multiples"].includes(requestedType);
  $("y-ceil-field").hidden = !["trend", "years"].includes(requestedType);
  $("trend-fc-field").hidden = requestedType !== "trend";
  $("trend-view-field").hidden = requestedType !== "trend";
  if ($("years-days-field")) { $("years-days-field").hidden = requestedType !== "years"; ydSync(); }
  $("bars-top-field").hidden = !["bars", "donut"].includes(requestedType);
  { const bl = document.querySelector('label[for="bars-top"]'); if (bl) bl.textContent = chartEntity === "chats" ? "Количество чатов" : "Количество участников"; }
  const isHeatRows = requestedType === "heatrows" || requestedType === "heatrows-custom";
  $("heatrows-custom-top-field").hidden = !isHeatRows;
  const heatTopSelect = $("heatrows-custom-top");
  if (heatTopSelect && isHeatRows) {
    const autoOpt = heatTopSelect.querySelector('option[value="auto"]');
    if (autoOpt) autoOpt.hidden = requestedType !== "heatrows";
    heatTopSelect.value = String(heatRowsTopSetting(requestedType));
    const hl = document.querySelector('label[for="heatrows-custom-top"]'); if (hl) hl.textContent = chartEntity === "chats" ? "Чаты на карте" : "Участники на карте";
  }
  $("bump-mode-field").hidden = requestedType !== "bump";
  if ($("norm-weeks-field")) $("norm-weeks-field").hidden = requestedType !== "norm";
  $("spread-zero-field").hidden = requestedType !== "spread" || chartEntity !== "users";
  $("spread-scale-field").hidden = requestedType !== "spread";
  $("mult-scale-field").hidden = requestedType !== "multiples";
  $("chart-events-field").hidden = !["trend", "heat", "multiples", "bump"].includes(requestedType);
  syncChartNormField(requestedType);
  // Threshold-colour mode uses absolute cell values, so the normalized heat scale is irrelevant there.
  $("heat-scale-field").hidden = requestedType !== "heatrows";
  const entityField = $("c-entity")?.closest(".field");
  if (entityField) entityField.hidden = yearsUi || requestedType === "season" || requestedType === "pairs" || requestedType === "bumpyears";
  syncUselessChartControls(requestedType);
  $("people").hidden = yearsUi || chartEntity !== "users" || requestedType === "gini" || requestedType === "bumpyears";
  { const pf = $("people").closest(".field"); if (pf) pf.hidden = $("people").hidden; }
  $("f-chatpick").hidden = yearsUi || chartEntity !== "chats";
  if (chartEntity === "chats" && !yearsUi) renderChatPick();
  $("f-chat").hidden = !yearsUi && chartEntity === "chats";
  const trendLabel = document.querySelector('label[for="trend-top"]');
  if (trendLabel) trendLabel.textContent = chartEntity === "chats" ? "Количество чатов" : "Количество пользователей";
  const topSelect = $("trend-top");
  if (topSelect) [...topSelect.options].forEach(o => { o.textContent = o.value === "all" ? (chartEntity === "chats" ? "Все чаты" : "Все пользователи") : `Топ-${o.value} ${chartEntity === "chats" ? "чатов" : "пользователей"}`; });
  const out = $("c-out");
  dayTipCtx = null; CHART_HOVER = null;
  if (chartQuick && !allRows) {
    out.innerHTML = `<div class="sk sk-block"></div>`;
    try { await getHistory(); }
    catch (e) {
      if (renderSeq !== chartRenderSequence) return;
      out.innerHTML = note("Не удалось загрузить данные: " + e.message); applyChartTextStyles(); return;
    }
    if (renderSeq !== chartRenderSequence || requestedType !== cType) return;
  }
  if (!cRange() && requestedType !== "years") { out.innerHTML = note("Выберите период"); applyChartTextStyles(); return; }
  setTipCtx();
  if (!allRows && !$("chart-events-field").hidden && $("chart-events").value === "all") {
    out.innerHTML = `<div class="sk sk-block"></div>`;
    try { await getHistory(); } catch (e) {}
    if (renderSeq !== chartRenderSequence || requestedType !== cType) return;
  }
  if (requestedType === "years" || requestedType === "spiral" || requestedType === "season" || requestedType === "norm" || requestedType === "bumpyears") {
    if (!allRows) {
      out.innerHTML = `<div class="sk sk-block"></div>`;
      try { await getHistory(); }
      catch (e) {
        if (renderSeq !== chartRenderSequence || requestedType !== cType) return;
        out.innerHTML = note("Не удалось загрузить данные: " + e.message); applyChartTextStyles(); return;
      }
      if (renderSeq !== chartRenderSequence || requestedType !== cType) return;
    }
    out.innerHTML = requestedType === "years" ? yearsChart() : requestedType === "season" ? seasonChart() : requestedType === "norm" ? normChart() : requestedType === "bumpyears" ? bumpYearsChart() : spiralChart(); applyChartTextStyles(); syncChartFocus(); return;
  }
  const renderer = {stack: stackChart, bars: barsChart, donut: donutChart, trend: trendChart, bump: bumpChart, spread: spreadChart, gini: giniChart, multiples: multiplesChart, heat: calendarChart, heatrows: heatRowsChart, "heatrows-custom": () => heatRowsChart(true), race: raceChart, pairs: pairsChart}[requestedType];
  out.innerHTML = renderer ? renderer() : note("Неизвестный тип графика");
  applyChartTextStyles(); syncChartFocus();
  if (requestedType === "race") raceMount();
}

/* ---------- Выбор участников на графиках ---------- */
const saveSel = () => {
  try {
    localStorage.setItem("chatstats.sel.v1", JSON.stringify([...SEL]));
    localStorage.setItem("chatstats.sel.active.v1", SEL_ACTIVE ? "1" : "0");
  } catch (e) {}
};
let pickerSeedFromDisplayed = false;
function displayedUserKeys(){
  const metric = $("metric").value;
  if (cType === "bars") {
    return usersAgg(metric).slice(0, barsCap(SEL_ACTIVE ? 40 : 20)).map(u => String(u.k));
  }
  if (cType === "donut") {
    const cap = barsCap(SEL_ACTIVE ? 14 : 8);
    return usersAgg(metric).slice(0, cap).map(u => String(u.k));
  }
  if (cType === "trend" || cType === "bump" || cType === "multiples" || cType === "spread") {
    if (cMode() === "day") return [];
    const src = cScoped();
    let r = cRange(); if (!r) return [];
    if (cMode() === "all") {
      const dates = src.map(x => String(x[F.date] ?? "").slice(0,10)).filter(d => d.length === 10).sort();
      if (!dates.length) return [];
      r = [dates[0], r[1]];
    }
    const totals = new Map();
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0,10);
      if (d.length !== 10 || d < r[0] || d > r[1] || d > iso(now)) return;
      const k = String(x[F.userId] ?? x[F.name]);
      if (!isVisibleUser(k) || (SEL_ACTIVE && !SEL.has(k))) return;
      const u = totals.get(k) || {k, v:0};
      u.v += Number(g(x, metric)) || 0;
      totals.set(k, u);
    });
    return [...totals.values()].filter(u => u.v > 0).sort((a,b) => b.v-a.v).slice(0, trendTop()).map(u => String(u.k));
  }
  // В режиме «По годам» участники объединяются в годовые линии. Отметим тех,
  // кто вносит вклад в график за выбранный календарный месяц.
  const src = pick(allRows || rows, $("chat").value);
  const dv = $("day").value, mv = $("month").value;
  const monthNum = (mode === "day" || mode === "week") && dv ? +dv.slice(5,7) : mode === "month" && mv ? +mv.slice(5,7) : now.getMonth() + 1;
  const keys = new Set();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0,10), k = String(x[F.userId] ?? x[F.name]);
    if (d.length === 10 && +d.slice(5,7) === monthNum && isVisibleUser(k) && (!SEL_ACTIVE || SEL.has(k)) && (Number(g(x, metric)) || 0) > 0) keys.add(k);
  });
  return [...keys];
}
function renderPeople(checkedKeys = SEL){
  const people = Object.entries(NAMES).filter(([pk]) => isVisibleUser(pk)).sort((a,b) => a[1].localeCompare(b[1],"ru"));
  $("plist").innerHTML = people
    .map(([pk, n]) => `<label><input type="checkbox" value="${pk}"${checkedKeys.has(String(pk)) ? " checked" : ""}>${escH(n)}</label>`).join("");
  $("psum").textContent = SEL_ACTIVE ? `Участники: выбрано ${SEL.size}` : "Участники: авто";
}
// При открытии выпадающего списка отмечаем именно тех участников, чьи линии/столбцы
// сейчас видны. Состояние графика меняется только после того, как пользователь
// действительно изменит хотя бы один флажок.
$("people").addEventListener("toggle", () => {
  if (!$("people").open) return;
  const displayed = new Set(displayedUserKeys());
  renderPeople(displayed);
  pickerSeedFromDisplayed = true;
  $("psum").textContent = `На графике: ${displayed.size}`;
});
$("plist").addEventListener("change", e => {
  if (!e.target.matches("input[type=checkbox]")) return;
  if (pickerSeedFromDisplayed) {
    SEL.clear();
    $("plist").querySelectorAll('input[type="checkbox"]:checked').forEach(input => SEL.add(String(input.value)));
    SEL_ACTIVE = true;
    pickerSeedFromDisplayed = false;
  } else {
    e.target.checked ? SEL.add(String(e.target.value)) : SEL.delete(String(e.target.value));
  }
  saveSel(); $("psum").textContent = SEL_ACTIVE ? `Участники: выбрано ${SEL.size}` : "Участники: авто"; renderCharts();
  if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel();
});
$("p-all").onclick = () => { pickerSeedFromDisplayed = false; SEL_ACTIVE = true; SEL.clear(); Object.keys(NAMES).filter(k => isVisibleUser(k)).forEach(k => SEL.add(k)); saveSel(); renderPeople(); renderCharts(); if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel(); };
$("p-none").onclick = () => { pickerSeedFromDisplayed = false; SEL_ACTIVE = false; SEL.clear(); saveSel(); renderPeople(); renderCharts(); if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel(); };
document.addEventListener("click", e => { const d = $("people"); if (d.open && !d.contains(e.target)) d.open = false; });
renderPeople();
// ---------- «Чаты на графике»: галочка снята — чат убран со всех графиков ----------
function chatPickList(){
  const m = new Map(), metric = $("metric")?.value || "msgs";
  try { chatRowsForChart(cRows()).forEach(x => { const k = chatKeyOf(x); const u = m.get(k) || {k, n:String(x[F.chat] || `Чат ${k}`), v:0}; u.v += Number(g(x, metric)) || 0; m.set(k, u); }); } catch (e) {}
  CHAT_OFF.forEach(k => { if (!m.has(k)) m.set(k, {k, n:`Чат ${k}`, v:0}); });
  return [...m.values()].sort((a, b) => b.v - a.v || a.n.localeCompare(b.n, "ru"));
}
function renderChatPick(){
  const list = chatPickList();
  $("clist").innerHTML = list.length ? list.map(c => `<label><input type="checkbox" value="${escH(c.k)}"${CHAT_OFF.has(c.k) ? "" : " checked"}>${escH(c.n)}${c.v ? ` <small class="hint">${fmt(Math.round(c.v))}</small>` : ""}</label>`).join("") : `<p class="hint" style="margin:6px 4px">Нет чатов за этот период</p>`;
  $("csum").textContent = CHAT_OFF.size ? `Чаты: убрано ${CHAT_OFF.size}` : "Чаты: все";
}
function saveChatOff(){ try { localStorage.setItem(CHAT_OFF_KEY, JSON.stringify([...CHAT_OFF])); } catch (e) {} $("csum").textContent = CHAT_OFF.size ? `Чаты: убрано ${CHAT_OFF.size}` : "Чаты: все"; renderCharts(); if ($("chart-settings-panel")?.classList.contains("open")) renderChartSettingsPanel(); }
$("chatpick").addEventListener("toggle", () => { if ($("chatpick").open) renderChatPick(); });
$("clist").addEventListener("change", e => { if (!e.target.matches("input[type=checkbox]")) return; const k = String(e.target.value); e.target.checked ? CHAT_OFF.delete(k) : CHAT_OFF.add(k); saveChatOff(); });
$("c-all").onclick = () => { CHAT_OFF.clear(); renderChatPick(); saveChatOff(); };
// «Только самые активные»: оставить 5 чатов с наибольшей активностью за период
$("c-top").onclick = () => { const l = chatPickList(); CHAT_OFF = new Set(l.slice(5).map(c => c.k)); renderChatPick(); saveChatOff(); };
document.addEventListener("click", e => { const d = $("chatpick"); if (d.open && !d.contains(e.target)) d.open = false; });

/* ---------- Копировать график ---------- */
let fontCache = null;
async function fontCss(){
  if (fontCache !== null) return fontCache;
  // Встроенный в страницу Samsung Sans — картинки получают шрифт даже без папки fonts/.
  const embedded = document.getElementById("ss-font-embed")?.textContent.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"Samsung Sans"/g, "'Samsung Sans'");
  if (embedded && embedded.includes("@font-face")) return (fontCache = embedded);
  let css = "";
  for (const [file, w] of [["SamsungSans-Regular", 400], ["SamsungSans-Bold", 700]])
    for (const [ext, mime, fmtName] of [["woff2","font/woff2","woff2"], ["ttf","font/ttf","truetype"]]) {
      try {
        const r = await fetch(`fonts/${file}.${ext}`); if (!r.ok) continue;
        const buf = new Uint8Array(await r.arrayBuffer()); let bin = "";
        for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
        css += `@font-face{font-family:'Samsung Sans';font-weight:${w};src:url(data:${mime};base64,${btoa(bin)}) format('${fmtName}')}`;
        break;
      } catch (e) {}
    }
  return (fontCache = css);
}
async function chartBlob(){
  const svg = document.querySelector("#c-out svg");
  if (!svg) throw new Error("Сейчас нет графика");
  return svgToPngBlob(svg, chartPrefs(currentChartType()));
}
// В картинке и видео не нужны подсказки «наведи / кликни» и слои для наведения — они там не работают.
function stripInteractive(c){
  if (c.dataset && c.dataset.vb0) { c.setAttribute("viewBox", c.dataset.vb0); c.classList.remove("cz-on", "cz-drag"); delete c.dataset.vb0; }
  c.querySelectorAll('[data-no-export], #hov, #xh, #mxh, [data-hover]').forEach(el => el.remove());
  // Числа, которые ещё «докручиваются», — сразу в итоговое значение; переходы столбцов не попадают в картинку
  c.querySelectorAll('[data-num-final]').forEach(el => { el.textContent = el.dataset.numFinal; el.removeAttribute("data-num-final"); });
  // Скрытые кликом по легенде серии (полупрозрачные подписи) в картинке не показываем.
  c.querySelectorAll('.lg-item').forEach(el => { if (Number(el.getAttribute("opacity")) < 1) el.remove(); });
  c.querySelectorAll('[style*="cursor"]').forEach(el => { el.style.cursor = ""; });
  c.classList.remove("dimming"); c.querySelectorAll(".hl").forEach(el => el.classList.remove("hl"));
  return c;
}
// Исходный viewBox графика (без приближения колесом мыши)
function svgBaseBox(svg){ const a = String(svg.dataset?.vb0 || "").split(/[\s,]+/).map(Number); if (a.length === 4 && a.every(isFinite)) return {x:a[0], y:a[1], width:a[2], height:a[3]}; return svg.viewBox.baseVal; }
async function svgToPngBlob(svg, exportPrefs){
  if (!svg) throw new Error("Сейчас нет графика");
  const vb = svgBaseBox(svg), W = vb.width, H = vb.height, K = 2;
  const c = stripInteractive(svg.cloneNode(true));
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  c.setAttribute("width", W * K); c.setAttribute("height", H * K);
  c.setAttribute("font-family", "'Samsung Sans','SamsungOne','Segoe UI',system-ui,sans-serif");
  const bgStart = exportPrefs.backgroundStart || "#262626", bgEnd = exportPrefs.backgroundEnd || bgStart;
  let bgDefs = "", bgPaint = bgStart;
  if (exportPrefs.backgroundMode === "radial") {
    bgDefs = `<radialGradient id="chartBackgroundGradient" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${bgStart}"/><stop offset="100%" stop-color="${bgEnd}"/></radialGradient>`;
    bgPaint = "url(#chartBackgroundGradient)";
  } else if (exportPrefs.backgroundMode !== "solid") {
    const angle = Number(exportPrefs.backgroundAngle ?? 135) * Math.PI / 180;
    const dx = Math.sin(angle) / 2, dy = -Math.cos(angle) / 2;
    bgDefs = `<linearGradient id="chartBackgroundGradient" x1="${0.5-dx}" y1="${0.5-dy}" x2="${0.5+dx}" y2="${0.5+dy}"><stop offset="0%" stop-color="${bgStart}"/><stop offset="100%" stop-color="${bgEnd}"/></linearGradient>`;
    bgPaint = "url(#chartBackgroundGradient)";
  }
  const exportFontColor = exportPrefs.fontColor || chartFontColor;
  const extra = `<defs>${bgDefs}</defs><style>${await fontCss()}${exportPrefs.keepTextColors ? "" : `text,tspan{fill:${exportFontColor}!important}`}</style><rect width="${W}" height="${H}" fill="${bgPaint}"/>`;
  const xml = new XMLSerializer().serializeToString(c).replace(/<svg[^>]*>/, m => m + extra);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("Не удалось отрисовать картинку")); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml); });
  const cv = document.createElement("canvas"); cv.width = W * K; cv.height = H * K;
  cv.getContext("2d").drawImage(img, 0, 0, W * K, H * K);
  return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("Не удалось создать PNG")), "image/png"));
}

/* ---------- Копирование таблиц вместе с заголовком как PNG ---------- */
function canvasColor(value, fallback){
  return value && value !== "transparent" && value !== "rgba(0, 0, 0, 0)" ? value : fallback;
}
function readCellTextRuns(cell, baseColor){
  const runs = [];
  const walk = node => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.nodeValue || "";
        if (!text) continue;
        const parent = child.parentElement || cell;
        const cs = getComputedStyle(parent);
        // Normalize HTML whitespace, retaining a single intentional separator between inline spans.
        const cleaned = text.replace(/[\t\r\n]+/g, " ").replace(/ {2,}/g, " ");
        if (!cleaned) continue;
        const marginLeft = parseFloat(cs.marginLeft) || 0;
        const marginRight = parseFloat(cs.marginRight) || 0;
        runs.push({text: cleaned, color: canvasColor(cs.color, baseColor), font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, marginLeft, marginRight});
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.hasAttribute("data-no-export")) continue;
        // SVG text is painted together with the SVG itself; reading it as cell text would draw it twice.
        if (child.namespaceURI === "http://www.w3.org/2000/svg") continue;
        const cs = getComputedStyle(child);
        if (cs.display === "none" || child.hidden) continue;
        if (["BR"].includes(child.tagName)) { runs.push({break:true}); continue; }
        const isBlock = cs.display === "block" || cs.display === "flex" || cs.display === "grid" || cs.display === "table-caption";
        if (isBlock && runs.length) runs.push({break:true});
        walk(child);
        if (isBlock) runs.push({break:true});
      }
    }
  };
  walk(cell);
  while (runs.length && runs[0].break) runs.shift();
  while (runs.length && runs[runs.length-1].break) runs.pop();
  // Avoid visible gaps caused by text split across adjacent inline elements.
  for (let i=1; i<runs.length; i++) {
    if (!runs[i].break && !runs[i].text.startsWith(" ") && !runs[i-1].break && !runs[i-1].text.endsWith(" ") && !runs[i].marginLeft) {
      // Adjacent runs are intentionally joined; no added space is needed (e.g. colored diff).
    }
  }
  return runs;
}
function drawCanvasCellText(ctx, cell, rect, tableRect, xOffset, yOffset, fallbackColor){
  const cs = getComputedStyle(cell);
  const runs = readCellTextRuns(cell, canvasColor(cs.color, fallbackColor));
  if (!runs.length) return;
  const padLeft = parseFloat(cs.paddingLeft) || 0, padRight = parseFloat(cs.paddingRight) || 0;
  const padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0;
  const contentLeft = xOffset + rect.left - tableRect.left + padLeft;
  const contentRight = xOffset + rect.right - tableRect.left - padRight;
  const available = Math.max(1, contentRight-contentLeft);
  const align = cs.textAlign === "start" ? "left" : cs.textAlign === "end" ? "right" : cs.textAlign;
  const isHeader = cell.tagName === "TH";
  const fontSize = parseFloat(cs.fontSize) || (isHeader ? 13 : 15);
  const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.5;
  const lines = [[]];
  runs.forEach(r => { if (r.break) { if (lines[lines.length-1].length) lines.push([]); } else lines[lines.length-1].push(r); });
  const actualLines = lines.filter(line => line.length);
  if (!actualLines.length) return;
  // Несколько строк разного размера (например, крупное «350 629» и мелкое «всего»): высота каждой строки — по её шрифту,
  // чтобы блок целиком стоял по центру ячейки, как на странице.
  const pxOf = r => { const m = /(\d+(?:\.\d+)?)px/.exec(r.font || ""); return m ? Number(m[1]) : fontSize; };
  const lineHs = actualLines.length > 1 ? actualLines.map(line => Math.max(...line.map(pxOf)) * 1.35) : [lineHeight];
  const maxLineHeight = lineHs.reduce((a, b) => a + b, 0);
  const innerHeight = Math.max(lineHeight, rect.height - padTop - padBottom);
  const top0 = yOffset + rect.top - tableRect.top + padTop + Math.max(0, (innerHeight-maxLineHeight)/2);
  const lineY = i => top0 + lineHs.slice(0, i).reduce((a, b) => a + b, 0) + lineHs[i] / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(xOffset+rect.left-tableRect.left+1, yOffset+rect.top-tableRect.top+1, Math.max(1,rect.width-2), Math.max(1,rect.height-2)); ctx.clip();
  actualLines.forEach((line, lineIndex) => {
    let totalWidth = 0;
    for (const r of line) { ctx.font = r.font; totalWidth += r.marginLeft + ctx.measureText(r.text).width + r.marginRight; }
    let x = align === "left" ? contentLeft : align === "right" ? contentRight-totalWidth : contentLeft+(available-totalWidth)/2;
    const y = lineY(lineIndex);
    for (const r of line) {
      ctx.font = r.font; ctx.fillStyle = r.color; x += r.marginLeft;
      ctx.textBaseline = "middle"; ctx.fillText(r.text, x, y); x += ctx.measureText(r.text).width + r.marginRight;
    }
  });
  ctx.restore();
}
// Ячейка с плашками (уровень достижения «I–VII» и т. п.): плашка с фоном и рамкой, текст — точно там, где он на странице.
function drawExactCell(ctx, cell, tableRect, tableX, tableY, fallback){
  const X = r => tableX + r.left - tableRect.left, Y = r => tableY + r.top - tableRect.top;
  cell.querySelectorAll(".ev-tier, .lvl-chip").forEach(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (!r.width) return;
    const rad = parseFloat(cs.borderTopLeftRadius) || 0, bw = parseFloat(cs.borderTopWidth) || 0;
    ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(X(r), Y(r), r.width, r.height, rad); else ctx.rect(X(r), Y(r), r.width, r.height);
    const bg = canvasColor(cs.backgroundColor, "rgba(0,0,0,0)"); if (bg && !/rgba\([^)]*,\s*0\)$/.test(bg)) { ctx.fillStyle = bg; ctx.fill(); }
    if (bw) { ctx.lineWidth = bw; ctx.strokeStyle = canvasColor(cs.borderTopColor, fallback); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(X(r) + bw / 2, Y(r) + bw / 2, r.width - bw, r.height - bw, Math.max(0, rad - bw / 2)); else ctx.rect(X(r), Y(r), r.width, r.height); ctx.stroke(); }
    ctx.restore();
  });
  const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT), range = document.createRange();
  while (w.nextNode()) {
    const n = w.currentNode, t = n.nodeValue.replace(/\s+/g, " "); if (!t.trim()) continue;
    const p = n.parentElement; if (p.closest("[data-no-export]")) continue;
    range.selectNodeContents(n); const r = [...range.getClientRects()].find(x => x.width > 0); if (!r) continue;
    const cs = getComputedStyle(p);
    ctx.save(); ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.fillStyle = canvasColor(cs.color, fallback); ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillText(t.trim(), X(r) + (t.startsWith(" ") ? ctx.measureText(" ").width : 0), Y(r) + r.height / 2); ctx.restore();
  }
}
// Число уровня рядом с полоской — ровно там, где оно стоит на странице (а не по центру ячейки поверх полоски).
function drawLevelText(ctx, cell, tableRect, tableX, tableY, fallback){
  cell.querySelectorAll(".ev-lv > b").forEach(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (!r.width) return;
    ctx.save(); ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.fillStyle = canvasColor(cs.color, fallback); ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillText(el.textContent, tableX + r.left - tableRect.left, tableY + r.top - tableRect.top + r.height / 2); ctx.restore();
  });
}
// Полоски уровня (.ev-lv): дорожка и заливки — с теми цветами и прозрачностью, что на странице.
function drawCellBars(ctx, cell, tableRect, tableX, tableY){
  const conv = c => { const k = c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/i); return k ? `rgba(${Math.round(k[1] * 255)},${Math.round(k[2] * 255)},${Math.round(k[3] * 255)},${k[4] ?? 1})` : c; };
  const cols = el => { const cs = getComputedStyle(el); return ((cs.backgroundImage + " " + cs.backgroundColor).match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|color\(srgb[^)]*\)/gi) || []).map(conv).filter(c => !/rgba\([^)]*,\s*0\)$/.test(c)); };
  const paint = el => {
    const r = el.getBoundingClientRect(); if (r.width < .5 || r.height < .5) return;
    const list = cols(el); if (!list.length) return;
    const x = tableX + r.left - tableRect.left, y = tableY + r.top - tableRect.top;
    let fill = list[0];
    if (list.length > 1) { const gr = ctx.createLinearGradient(x, 0, x + r.width, 0); gr.addColorStop(0, list[0]); gr.addColorStop(1, list[list.length - 1]); fill = gr; }
    ctx.save(); ctx.globalAlpha = Number(getComputedStyle(el).opacity) || 1; ctx.fillStyle = fill;
    const rad = Math.min(r.height / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || r.height / 2);
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, r.width, r.height, rad); else ctx.rect(x, y, r.width, r.height); ctx.fill(); ctx.restore();
  };
  cell.querySelectorAll(".ev-lv i").forEach(track => { paint(track); track.querySelectorAll("em").forEach(paint); });
}
// Смайлы iOS (картинки) в ячейках: рисуются поверх, на своих местах.
async function drawCellEmoji(ctx, cell, tableRect, tableX, tableY){
  for (const im of cell.querySelectorAll("img.ios-emo")) {
    try { if (!im.complete || !im.naturalWidth) await im.decode(); } catch (e) { continue; }
    const r = im.getBoundingClientRect(); if (!r.width) continue;
    try { ctx.drawImage(im, tableX + r.left - tableRect.left, tableY + r.top - tableRect.top, r.width, r.height); } catch (e) {}
  }
}
// Rasterize inline SVGs (such as the "Динамика" sparklines) for table-image export.
// They are separate visual elements, not text, so the canvas exporter must paint them explicitly.
async function drawInlineSvgVisuals(ctx, cell, tableRect, tableX, tableY){
  const svgs = [...cell.querySelectorAll("svg")];
  for (const svg of svgs) {
    const r = svg.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(Math.max(1, Math.ceil(r.width))));
    clone.setAttribute("height", String(Math.max(1, Math.ceil(r.height))));
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], {type:"image/svg+xml;charset=utf-8"}));
    const x = tableX + r.left - tableRect.left;
    const y = tableY + r.top - tableRect.top;
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("SVG не удалось отрисовать"));
        img.src = url;
      });
      ctx.save();
      ctx.beginPath();
      const cr = cell.getBoundingClientRect();
      ctx.rect(tableX + cr.left - tableRect.left + 1, tableY + cr.top - tableRect.top + 1, Math.max(1, cr.width - 2), Math.max(1, cr.height - 2));
      ctx.clip();
      ctx.drawImage(img, x, y, r.width, r.height);
      ctx.restore();
    } catch (e) {
      // Fallback for simple polyline/polygon SVGs if the browser refuses SVG-to-image rasterization.
      const viewBox = (svg.getAttribute("viewBox") || `0 0 ${r.width} ${r.height}`).trim().split(/[ ,]+/).map(Number);
      const vbW = viewBox[2] || r.width, vbH = viewBox[3] || r.height;
      const sx = r.width / vbW, sy = r.height / vbH;
      const toCanvas = (px, py) => [x + (px - (viewBox[0] || 0)) * sx, y + (py - (viewBox[1] || 0)) * sy];
      for (const shape of [...svg.querySelectorAll("polygon, polyline, line")]) {
        ctx.save();
        const tag = shape.tagName.toLowerCase();
        if (tag === "line") {
          const a = toCanvas(Number(shape.getAttribute("x1") || 0), Number(shape.getAttribute("y1") || 0));
          const b = toCanvas(Number(shape.getAttribute("x2") || 0), Number(shape.getAttribute("y2") || 0));
          ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
        } else {
          const points = (shape.getAttribute("points") || "").trim().split(/[ ,]+/).map(Number);
          if (points.length < 4) { ctx.restore(); continue; }
          const first = toCanvas(points[0], points[1]); ctx.beginPath(); ctx.moveTo(...first);
          for (let i=2; i+1<points.length; i+=2) { const p = toCanvas(points[i], points[i+1]); ctx.lineTo(...p); }
          if (tag === "polygon") ctx.closePath();
        }
        const fill = shape.getAttribute("fill");
        const stroke = shape.getAttribute("stroke");
        if (tag === "polygon" && fill && fill !== "none") { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke && stroke !== "none") {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = (Number(shape.getAttribute("stroke-width")) || 1) * ((sx + sy) / 2);
          ctx.lineCap = shape.getAttribute("stroke-linecap") || "butt";
          ctx.lineJoin = shape.getAttribute("stroke-linejoin") || "miter";
          ctx.stroke();
        }
        ctx.restore();
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// Столбцы, где во всех строках пусто или ноль, в картинку не попадают.
// Копирование в режиме «Карточки»: на картинке те же карточки, что на экране (а не таблица).
async function cardsImageBlob(source, title, rowLimit){
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch (e) {} }
  const cssv = n => getComputedStyle(document.body).getPropertyValue(n).trim();
  const bg = cssv("--bg") || "#14161c", panel = cssv("--panel") || "#1c1f27", line = cssv("--line") || "#2c303b", text = cssv("--text") || "#e6e8ee", muted = cssv("--muted") || "#9aa0b2";
  const FONT = '"Samsung Sans","SamsungOne","Segoe UI",system-ui,sans-serif';
  const txt = el => { const c = el.cloneNode(true); c.querySelectorAll("button,[data-no-export],style,script").forEach(x => x.remove()); const p = c.querySelector(".pname"); if (p) return p.textContent.replace(/\s+/g, " ").trim(); return [...c.childNodes].map(n => n.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).join(" "); };
  const shown = el => el.getClientRects().length > 0;   // скрытые строки и столбцы в картинку не попадают
  let rows = [...source.tBodies].flatMap(b => [...b.rows]).filter(shown);
  if (Number.isInteger(rowLimit) && rowLimit > 0) rows = rows.slice(0, rowLimit);
  rows = rows.concat(source.tFoot ? [...source.tFoot.rows].filter(shown) : []);
  if (!rows.length) throw new Error("Нет карточек для копирования");
  const head = source.tHead && source.tHead.rows[0] ? [...source.tHead.rows[0].cells].map(c => c.textContent.replace(/\s+/g, " ").trim()) : [];
  const cards = rows.map(tr => {
    const cells = [...tr.cells];
    if (cells.length === 1 && cells[0].colSpan > 1) return {note:txt(cells[0])};
    const medal = (/medal-(\d)/.exec(cells[0].className) || [])[1];
    const nameCell = cells.length > 1 ? cells[1] : cells[0];
    const pkEl = tr.querySelector(".pname[data-open-profile]"), pk0 = pkEl ? pkEl.dataset.openProfile : (tr.dataset.rowKey || ""), pk = typeof NAMES !== "undefined" && NAMES[pk0] ? String(pk0) : "";
    const lvlEls = shown(nameCell) ? [...nameCell.querySelectorAll(".lvl-chip")] : [];
    return {pk, lvls:lvlEls.map(e => ({t:e.textContent.trim(), col:getComputedStyle(e).color})), place:cells.length > 1 && shown(cells[0]) ? txt(cells[0]) : "", name:shown(nameCell) ? txt(nameCell) : "", medal, foot:!!tr.closest("tfoot"),
      metrics:cells.slice(2).map((c, k) => ({c, k})).filter(x => shown(x.c)).map(x => ({l:x.c.dataset.label || head[x.k + 2] || "", v:txt(x.c) || "—"}))};
  });
  const real = cards.filter(c => !c.note);
  if (!real.length) throw new Error("Нет карточек для копирования");
  const avOn = document.body.classList.contains("cards-avatars");
  if (avOn) await Promise.all(real.map(async c => {
    if (!c.pk) return;
    try { const u = window.AVATAR && await window.AVATAR.dataUri(c.pk); if (u) c.img = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u; }); } catch (e) {}
  }));
  // сколько карточек в ряд — как на экране
  const vis = rows.filter(r => r.getClientRects().length);
  let perRow = 1; if (vis.length > 1) { const t0 = Math.round(vis[0].getBoundingClientRect().top); perRow = Math.max(1, vis.filter(r => Math.abs(Math.round(r.getBoundingClientRect().top) - t0) < 4).length); }
  perRow = Math.min(perRow, 5, Math.max(1, real.length));
  const GAP = 12, PAD = 28, scale = 2, nMet = Math.max(1, ...real.map(c => c.metrics.length)), mPer = Math.min(3, nMet);
  const mctx = document.createElement("canvas").getContext("2d");
  // ширина карточки — по содержимому: имя целиком + показатели без пустого места
  let needName = 0, needMet = 84;
  real.forEach(c => {
    mctx.font = `600 16px ${FONT}`; const nw = mctx.measureText(c.name).width;
    let pre = 14; if (c.place) { mctx.font = `700 15px ${FONT}`; pre += Math.max(26, mctx.measureText(c.place).width + 10); }
    if (avOn && c.pk) pre += 46;
    c.lvls.forEach(l => { mctx.font = `700 11.5px ${FONT}`; pre += mctx.measureText(l.t).width + 24; });
    needName = Math.max(needName, pre + nw + 16);
    c.metrics.forEach(m => { mctx.font = `500 11px ${FONT}`; const a1 = mctx.measureText(m.l).width; mctx.font = `600 15px ${FONT}`; needMet = Math.max(needMet, a1, mctx.measureText(m.v).width + 0); });
  });
  const W0 = Math.ceil(Math.max(200, needName, 28 + mPer * (needMet + 14))), mW = (W0 - 28) / mPer;
  const fit = (ctx, t, w) => { if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1); return t + "…"; };
  // раскладка
  const items = []; let y = 0, cur = [];
  const HD = avOn ? 58 : 46, hOf = c => HD + Math.ceil(c.metrics.length / mPer) * 44 - (c.metrics.length ? 0 : 44) + 4;
  const flush = () => { if (!cur.length) return; const h = Math.max(...cur.map(hOf)); const off = (perRow - cur.length) * (W0 + GAP) / 2; cur.forEach((c, i) => items.push({c, x:off + i * (W0 + GAP), y, h})); y += h + GAP; cur = []; };
  cards.forEach(c => { if (c.note) { flush(); items.push({c, x:0, y, h:34, full:true}); y += 34 + GAP; } else { cur.push(c); if (cur.length === perRow) flush(); } });
  flush();
  const gridW = perRow * W0 + (perRow - 1) * GAP, gridH = Math.max(0, y - GAP);
  const titleText = String(title || "Статистика"), titleFont = `22px ${FONT}`; mctx.font = titleFont;
  const titleW = Math.ceil(mctx.measureText(titleText).width), contentW = Math.max(gridW, titleW);
  const W = Math.max(160, contentW + PAD * 2), H = PAD * 2 + 32 + 10 + gridH;
  const canvas = document.createElement("canvas"); canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext("2d"); ctx.scale(scale, scale);
  const glass = typeof window.__glassWanted === "function" && window.__glassWanted() && typeof window.__glassBackdrop === "function";
  if (glass) window.__glassBackdrop(ctx, W, H);
  else if (!(typeof window.__pageBgPaint === "function" && window.__pageBgPaint(ctx, W, H))) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
  const gx = PAD + Math.round((contentW - gridW) / 2), gy = PAD + 32 + 10;
  ctx.textBaseline = "middle"; ctx.font = titleFont; ctx.fillStyle = text; ctx.textAlign = "left";
  ctx.fillText(titleText, titleW > gridW ? PAD : gx, PAD + 16);
  const MEDAL = {1:"#ffd166", 2:"#d3d9e6", 3:"#e3a36b"};
  const rr = (x, y2, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y2, w, h, r); else ctx.rect(x, y2, w, h); };
  items.forEach(({c, x, y: yy, h, full}) => {
    const X = gx + x, Y = gy + yy, w = full ? gridW : W0;
    rr(X, Y, w, h, 14); ctx.fillStyle = glass ? "rgba(255,255,255,.05)" : (c.foot ? "color-mix(in srgb, " + panel + " 94%, #7aa2f7)" : panel); if (c.foot && !CSS.supports("color", ctx.fillStyle)) ctx.fillStyle = panel; ctx.fill();
    ctx.lineWidth = c.medal ? 1.6 : 1; ctx.strokeStyle = c.medal ? MEDAL[c.medal] : (glass ? "rgba(255,255,255,.14)" : line); rr(X + .5, Y + .5, w - 1, h - 1, 14); ctx.stroke();
    if (c.note) { ctx.font = `600 14.5px ${FONT}`; ctx.fillStyle = text; ctx.textAlign = "left"; ctx.fillText(fit(ctx, c.note, w - 28), X + 14, Y + h / 2); return; }
    let nx = X + 14;
    if (c.place) { ctx.font = `700 15px ${FONT}`; ctx.fillStyle = c.medal ? MEDAL[c.medal] : muted; ctx.textAlign = "left"; ctx.fillText(c.place, nx, Y + HD / 2 + 3); nx += Math.max(26, ctx.measureText(c.place).width + 10); }
    if (avOn && c.pk) {
      const R = 19, acx = nx + R, acy = Y + HD / 2 + 3; let col = "#7aa2f7"; try { col = getStyle("u", c.pk).c[0] || col; } catch (e) {}
      ctx.save(); ctx.beginPath(); ctx.arc(acx, acy, R, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      ctx.fillStyle = col; ctx.fillRect(acx - R, acy - R, R * 2, R * 2);
      if (c.img) { const k = Math.max(R * 2 / c.img.naturalWidth, R * 2 / c.img.naturalHeight), iw = c.img.naturalWidth * k, ih = c.img.naturalHeight * k; ctx.drawImage(c.img, acx - iw / 2, acy - ih / 2, iw, ih); }
      else { ctx.fillStyle = "#0f1117"; ctx.font = `700 17px ${FONT}`; ctx.textAlign = "center"; ctx.fillText((c.name[0] || "?").toUpperCase(), acx, acy + 1); ctx.textAlign = "left"; }
      ctx.restore(); nx += R * 2 + 8;
    }
    ctx.font = `600 16px ${FONT}`; ctx.fillStyle = c.medal ? MEDAL[c.medal] : text; ctx.textAlign = "left"; const lvWs = c.lvls.map(l => (ctx.font = `700 11.5px ${FONT}`, ctx.measureText(l.t).width + 16)), lvTot = lvWs.reduce((a2, b2) => a2 + b2 + 8, 0);
    ctx.font = `600 16px ${FONT}`; const shownName = fit(ctx, c.name, X + w - 14 - nx - lvTot); ctx.fillText(shownName, nx, Y + HD / 2 + 3);
    let bx = nx + ctx.measureText(shownName).width + 8;
    c.lvls.forEach((l, qi) => {
      const lw = lvWs[qi], by = Y + HD / 2 + 3 - 10, col = l.col || "#c4b5fd";
      ctx.save(); ctx.globalAlpha = .16; ctx.fillStyle = col; rr(bx, by, lw, 20, 10); ctx.fill(); ctx.globalAlpha = .5; ctx.strokeStyle = col; ctx.lineWidth = 1; rr(bx + .5, by + .5, lw - 1, 19, 10); ctx.stroke(); ctx.restore();
      ctx.font = `700 11.5px ${FONT}`; ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(l.t, bx + lw / 2, by + 10.5); ctx.textAlign = "left";
      bx += lw + 8;
    });
    c.metrics.forEach((m, k) => {
      const col = k % mPer, rowI = Math.floor(k / mPer), cx = X + 14 + col * mW + mW / 2, ty = Y + HD + 8 + rowI * 44;
      ctx.textAlign = "center"; ctx.font = `500 11px ${FONT}`; ctx.fillStyle = muted; ctx.fillText(fit(ctx, m.l, mW - 6), cx, ty);
      ctx.font = `600 15px ${FONT}`; ctx.fillStyle = text; ctx.fillText(fit(ctx, m.v, mW - 6), cx, ty + 20);
    });
  });
  const out = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Не удалось создать PNG")), "image/png"));
  if (glass) window.__glassRendered = {size:out.size, t:Date.now()};
  window.__padRendered = {size:out.size, t:Date.now()};
  return out;
}
async function tableImageBlob(tableId, title, rowLimit = null){
  const source = typeof tableId === "string" ? $(tableId) : tableId;
  if (!source) throw new Error("Таблица не найдена");
  if (!source.querySelector("tr")) throw new Error("В таблице пока нет строк для копирования");
  if (source.classList.contains("tv-cards") && source.getClientRects().length) return cardsImageBlob(source, title, rowLimit);
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch (e) {} }

  // The on-page table can fill the entire viewport. Measure and render a temporary,
  // content-sized clone so the exported image doesn't inherit that empty horizontal space.
  const measureHost = document.createElement("div");
  measureHost.className = "wrap table-image-measure";
  Object.assign(measureHost.style, {
    position:"fixed", left:"-100000px", top:"0", zIndex:"-1", visibility:"hidden",
    display:"inline-block", width:"max-content", minWidth:"0", maxWidth:"none",
    overflow:"visible", border:"0", borderRadius:"0", padding:"0", margin:"0",
    background:"transparent", height:"auto"
  });
  const table = source.cloneNode(true);
  // Выравнивание текста берём с таблицы на странице: часть правил действует только внутри страницы,
  // и без этого, например, столбец «Место» на картинке уезжал к левому краю.
  { const srcRows = [...source.rows], clRows = [...table.rows];
    clRows.forEach((r, i) => { const sr = srcRows[i]; if (!sr) return; [...r.cells].forEach((c, j) => { const sc = sr.cells[j]; if (!sc) return; const cs = getComputedStyle(sc); const ta = source.classList.contains("tv-cards") && i > 0 && j === 0 ? "center" : cs.textAlign; c.dataset.imgWs = cs.whiteSpace; c.style.setProperty("text-align", ta === "start" ? "left" : ta, "important"); }); }); }
  // Заголовок на картинке заметнее: светлый текст чуть крупнее (фон заголовка — темнее, см. отрисовку ниже).
  if (table.tHead) [...table.tHead.querySelectorAll("th,td")].forEach(c => { const fs = parseFloat(getComputedStyle(source.tHead.rows[0].cells[0] || c).fontSize) || 13; if (!c.matches(".sorted, .dm-weekend, .dm-barcell")) c.style.setProperty("color", "#eef1f8", "important"); c.style.setProperty("font-size", (fs + 1.5) + "px", "important"); c.style.setProperty("font-weight", "600", "important"); });
  table.removeAttribute("id");
  table.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  table.querySelectorAll("[data-no-export]").forEach(el => el.remove());
  table.classList.remove("tv-cards");
  table.querySelectorAll(".is-me-row").forEach(el => el.classList.remove("is-me-row"));
  table.querySelectorAll(".is-me").forEach(el => el.classList.remove("is-me"));
  table.querySelectorAll(".column-resize-handle").forEach(el => el.remove());
  table.querySelectorAll("button.row-exclude-btn").forEach(el => el.remove());
  if (Number.isInteger(rowLimit) && rowLimit > 0) {
    for (const body of table.tBodies) {
      const bodyRows = [...body.rows];
      const isPlaceholder = bodyRows.length === 1 && bodyRows[0].cells.length === 1 && Number(bodyRows[0].cells[0].colSpan) > 1;
      if (!isPlaceholder) bodyRows.slice(rowLimit).forEach(row => row.remove());
    }
  }
  // В картинку попадает ровно то, что видно на странице: пустые столбцы больше не вырезаются
  // (раньше после этого справа оставалось пустое место). Лишний столбец можно скрыть кнопкой «Столбцы».
  Object.assign(table.style, {width:"max-content", minWidth:"0", maxWidth:"none", tableLayout:"auto", margin:"0", borderSpacing:"0"});
  table.style.setProperty("width", "max-content", "important");
  table.style.setProperty("min-width", "0", "important");
  table.style.setProperty("max-width", "none", "important");
  table.style.setProperty("table-layout", "auto", "important");
  // Если ширину таблицы или столбцов задали вручную — картинка повторяет её: те же ширины столбцов, что на экране.
  const rkey = source.dataset.resizeKey;
  const userSized = !source.classList.contains("tv-cards") && rkey && (savedTableWidths?.[rkey] || savedColumnWidths?.[rkey]);
  if (userSized) {
    const headRow = source.tHead?.rows?.[source.tHead.rows.length - 1] || source.rows[0];
    const cw = [...headRow.cells].map(c => c.getBoundingClientRect().width);
    if (cw.length && [...headRow.cells].every(c => c.colSpan === 1)) {
      table.querySelectorAll(":scope > colgroup").forEach(g => g.remove());
      const grp = document.createElement("colgroup");
      cw.forEach(w => { const col = document.createElement("col"); if (w > 0) col.style.width = w.toFixed(2) + "px"; grp.appendChild(col); });
      table.insertBefore(grp, table.firstChild);
      const total = Math.round(cw.reduce((a, b) => a + b, 0));
      table.style.setProperty("width", total + "px", "important");
      table.style.setProperty("table-layout", "fixed", "important");
    }
  }
  for (const cell of table.querySelectorAll("th,td")) {
    // Keep the table current cell spacing in the image export; do not compact columns.
    cell.style.setProperty("white-space", userSized ? (cell.dataset.imgWs || "normal") : "nowrap", "important");
    if (userSized) { cell.style.setProperty("overflow", "hidden", "important"); cell.style.setProperty("text-overflow", "ellipsis", "important"); }
    cell.style.setProperty("position", "static", "important");
    cell.style.setProperty("left", "auto", "important");
    cell.style.setProperty("box-shadow", "none", "important");
    cell.style.setProperty("min-width", "0", "important");
    cell.style.setProperty("max-width", "none", "important");
  }
  // Preserve full participant/chat names in the content-sized clone rather than ellipsizing them.
  for (const box of userSized ? [] : table.querySelectorAll(".row-name-with-action")) {
    const centered = box.closest("td,th")?.style.getPropertyValue("text-align") === "center";
    box.style.setProperty("width", "max-content", "important");
    box.style.setProperty("max-width", "none", "important");
    box.style.setProperty("justify-content", centered ? "center" : "flex-start", "important");
    if (centered) { box.style.setProperty("margin-left", "auto", "important"); box.style.setProperty("margin-right", "auto", "important"); }
    for (const span of box.querySelectorAll(":scope > span")) {
      span.style.setProperty("flex", "0 0 auto", "important");
      span.style.setProperty("width", "max-content", "important");
      span.style.setProperty("max-width", "none", "important");
      span.style.setProperty("overflow", "visible", "important");
      span.style.setProperty("text-overflow", "clip", "important");
    }
  }
  measureHost.appendChild(table);
  document.body.appendChild(measureHost);
  try {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const tableRect = table.getBoundingClientRect();
    const rows = [...table.querySelectorAll("tr")];
    const rowRects = rows.map(row => row.getBoundingClientRect());
    const tableWidth = Math.ceil(Math.max(table.scrollWidth || 0, tableRect.width || 0, 1));
    const tableHeight = Math.ceil(Math.max(table.scrollHeight || 0, tableRect.height || 0, ...rowRects.map(r => r.bottom-tableRect.top)));

    const pad = 28, titleFont = '22px "Samsung Sans", "SamsungOne", "Segoe UI", sans-serif';
    const titleLineHeight = 32, titleGap = 10, scale = 2;
    const titleText = String(title || "Статистика");
    const titleMeasure = document.createElement("canvas").getContext("2d");
    if (!titleMeasure) throw new Error("Браузер не смог подготовить текст заголовка");
    titleMeasure.font = titleFont;
    // The canvas is as wide as either the compact table or its title, without forcing
    // the table itself to stretch to the page width.
    const titleWidth = Math.ceil(titleMeasure.measureText(titleText).width);
    const contentWidth = Math.max(tableWidth, titleWidth);
    const W = Math.max(160, contentWidth + pad*2);
    const H = Math.max(120, pad*2+titleLineHeight+titleGap+tableHeight);
    const canvas = document.createElement("canvas"); canvas.width = W*scale; canvas.height = H*scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Браузер не смог создать изображение");
    ctx.scale(scale, scale);
    const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#14161c";
    const panel = getComputedStyle(document.body).getPropertyValue("--panel").trim() || "#1c1f27";
    const lineColor = getComputedStyle(document.body).getPropertyValue("--line").trim() || "#2c303b";
    const textColor = getComputedStyle(document.body).getPropertyValue("--text").trim() || "#e6e8ee";
    // «Со стеклом»: таблица рисуется сразу на матовом стекле — без линий, заголовок и итоги чуть светлее, углы картинки прямые.
    const glass = typeof window.__glassWanted === "function" && window.__glassWanted() && typeof window.__glassBackdrop === "function";
    if (glass) window.__glassBackdrop(ctx, W, H);
    else if (!(typeof window.__pageBgPaint === "function" && window.__pageBgPaint(ctx, W, H))) { ctx.fillStyle = bg; ctx.fillRect(0,0,W,H); }
    ctx.font = titleFont; ctx.textBaseline = "middle"; ctx.fillStyle = textColor;
    // Таблица — по центру картинки; если заголовок шире таблицы, таблица встаёт по центру под ним
    const tableX = pad + Math.max(0, Math.round((contentWidth - tableWidth) / 2));
    ctx.fillText(titleText, titleWidth > tableWidth ? pad : tableX, pad+titleLineHeight/2);

    const tableY = pad+titleLineHeight+titleGap;
    const tableRadius = glass ? 12 : 8;
    ctx.fillStyle = glass ? "rgba(255,255,255,.035)" : panel;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(tableX, tableY, tableWidth, tableHeight, tableRadius);
    else ctx.rect(tableX, tableY, tableWidth, tableHeight);
    ctx.fill();
    // Заметный цвет ячейки (подсветка лучшего дня, тепловая заливка) сохраняем и на стекле; обычные фоны — нет.
    const normCtx = document.createElement("canvas").getContext("2d");
    const strongColor = c => {
      if (!c) return false;
      normCtx.fillStyle = "#000"; normCtx.fillStyle = c; const v = String(normCtx.fillStyle);
      let r, g, b, a = 1;
      if (v[0] === "#") { r = parseInt(v.slice(1, 3), 16); g = parseInt(v.slice(3, 5), 16); b = parseInt(v.slice(5, 7), 16); }
      else { const n = (v.match(/[\d.]+/g) || []).map(Number); if (/^color\(/.test(v)) { [r, g, b] = n.slice(0, 3).map(x => x * 255); a = n.length > 3 ? n[3] : 1; } else { [r, g, b] = n; a = n.length > 3 ? n[3] : 1; } }
      return a >= .2 && Math.max(r, g, b) - Math.min(r, g, b) >= 40;
    };
    const tableRows = rows.map(r => r.parentElement && r.parentElement.tagName);
    let headFootBg;
    // светлые полосы заголовка и итогов не выходят за скруглённые углы таблицы
    // Заливки ячеек не выходят за скруглённые углы — иначе квадратные углы строк «съедают» обводку в углах.
    ctx.save(); ctx.beginPath(); if (typeof ctx.roundRect === "function") ctx.roundRect(tableX, tableY, tableWidth, tableHeight, tableRadius); else ctx.rect(tableX, tableY, tableWidth, tableHeight); ctx.clip();

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const rr = rowRects[ri];
      const rowY = tableY + (rr.top-tableRect.top), rowH = rr.height;
      const rowCS = getComputedStyle(row);
      const bgRow = canvasColor(rowCS.backgroundColor, panel);
      if (glass) {
        const sec = tableRows[ri];
        if (sec === "THEAD") { ctx.fillStyle = "rgba(255,255,255,.065)"; ctx.fillRect(tableX, rowY, tableWidth, rowH); }
        else if (sec === "TFOOT") { ctx.fillStyle = "rgba(255,255,255,.065)"; ctx.fillRect(tableX, rowY, tableWidth, rowH); }
      } else {
        ctx.fillStyle = bgRow; ctx.fillRect(tableX, rowY, tableWidth, rowH);
      }
      const cells = [...row.children].filter(el => el.tagName === "TD" || el.tagName === "TH");
      for (const cell of cells) {
        const cr = cell.getBoundingClientRect();
        const x = tableX + cr.left-tableRect.left, y = tableY + cr.top-tableRect.top;
        const cs = getComputedStyle(cell);
        const cellBg = canvasColor(cs.backgroundColor, bgRow);
        if (glass) { if (strongColor(cs.backgroundColor)) { ctx.fillStyle = cs.backgroundColor; ctx.fillRect(x, y, cr.width, cr.height); } }
        else if (cellBg !== "rgba(0, 0, 0, 0)" && cellBg !== "transparent") {
          ctx.fillStyle = cellBg; ctx.fillRect(x,y,cr.width,cr.height);
        }
        // заголовок на обычной картинке — такой же светлый, как строка итогов
        if (!glass && tableRows[ri] === "THEAD") {
          if (headFootBg === undefined) {
            const ft = row.closest("table") && row.closest("table").querySelector("tfoot td,tfoot th");
            let c = ft ? getComputedStyle(ft).backgroundColor : "";
            if (!c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c)) c = getComputedStyle(document.body).getPropertyValue("--foot").trim();
            headFootBg = c || "#262b3b";
          }
          ctx.fillStyle = canvasColor(headFootBg, panel); ctx.fillRect(x, y, cr.width, cr.height);
        }
        if (cell.dataset.barPct) {
          const share = Math.max(0, Math.min(100, Number(cell.dataset.barPct) || 0)) / 100;
          ctx.fillStyle = cell.dataset.barColor || "rgba(122,162,247,.3)";
          ctx.fillRect(x, y, cr.width * share, cr.height);
        }
        // Прозрачная граница (например, в режиме «без линий») — не рисуем её цветом линии по умолчанию.
        const seen = c => c && c !== "transparent" && !/^rgba\([^)]*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c);
        const leftBorder = parseFloat(cs.borderLeftWidth) || 0;
        if (!glass && leftBorder > 0 && cs.borderLeftStyle !== "none" && seen(cs.borderLeftColor)) {
          ctx.fillStyle = canvasColor(cs.borderLeftColor, lineColor); ctx.fillRect(x, y, leftBorder, cr.height);
        }
        if (cell.querySelector(".ev-lv i")) drawLevelText(ctx, cell, tableRect, tableX, tableY, textColor);
        else if (cell.querySelector(".ev-tier, .lvl-chip")) drawExactCell(ctx, cell, tableRect, tableX, tableY, textColor);
        else drawCanvasCellText(ctx, cell, cr, tableRect, tableX, tableY, textColor);
        if (cell.querySelector("svg")) await drawInlineSvgVisuals(ctx, cell, tableRect, tableX, tableY);
        if (cell.querySelector("img.ios-emo")) await drawCellEmoji(ctx, cell, tableRect, tableX, tableY);
        if (cell.querySelector(".ev-lv i")) drawCellBars(ctx, cell, tableRect, tableX, tableY);
        const borderWidth = parseFloat(cs.borderBottomWidth) || 0;
        if (!glass && borderWidth > 0 && cs.borderBottomStyle !== "none" && seen(cs.borderBottomColor)) {
          const borderColor = canvasColor(cs.borderBottomColor, lineColor);
          ctx.fillStyle = borderColor; ctx.fillRect(x, y+cr.height-borderWidth, cr.width, borderWidth);
        }
      }
    }
    if (glass) {
      // единственная линия — под заголовком; итоги отделены тонкой линией сверху
      const lastHead = rows.reduce((acc, r, i) => tableRows[i] === "THEAD" ? i : acc, -1);
      const firstFoot = tableRows.indexOf("TFOOT");
      if (lastHead >= 0) { ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(tableX, tableY + rowRects[lastHead].bottom - tableRect.top - 1, tableWidth, 1); }
      if (firstFoot >= 0) { ctx.fillStyle = "rgba(255,255,255,.10)"; ctx.fillRect(tableX, tableY + rowRects[firstFoot].top - tableRect.top, tableWidth, 1); }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 1; ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(tableX+0.5,tableY+0.5,tableWidth-1,tableHeight-1,tableRadius);
      else ctx.rect(tableX+0.5,tableY+0.5,tableWidth-1,tableHeight-1);
      ctx.stroke();
    } else {
      ctx.restore();
      ctx.strokeStyle = lineColor; ctx.lineWidth = 1; ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(tableX+0.5,tableY+0.5,tableWidth-1,tableHeight-1,tableRadius);
      else ctx.rect(tableX+0.5,tableY+0.5,tableWidth-1,tableHeight-1);
      ctx.stroke();
    }
    // Рамка таблиц и графиков (если включена) — вокруг самой таблицы, как на сайте.
    const framed = typeof window.__tbFrameDraw === "function" && window.__tbFrameDraw(ctx, tableX, tableY, tableWidth, tableHeight, tableRadius);
    const out = await new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Не удалось создать PNG")), "image/png"));
    if (glass) window.__glassRendered = {size: out.size, t: Date.now()};
    if (framed) window.__frameRendered = {size: out.size, t: Date.now()};
    // Таблица уже лежит на фоне с полями — повторно в «карточку» не заворачиваем
    window.__padRendered = {size: out.size, t: Date.now()};
    return out;
  } finally {
    measureHost.remove();
  }
}
async function copyTableImage(tableId, titleGetter, statusId){
  const status = $(statusId);
  try {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error("Копирование изображений не поддерживается этим контекстом; откройте страницу через localhost");
    if (status) status.textContent = "Подготовка…";
    if ((tableId === "participants-table" || tableId === "chat-rank-table") && typeof decorateTables === "function") {
      decorateTables();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    const title = typeof titleGetter === "function" ? titleGetter() : titleGetter;
    const blob = await tableImageBlob(tableId, title || "Статистика");
    await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
    if (status) status.textContent = "Изображение скопировано";
  } catch (e) {
    if (status) status.textContent = "Не удалось скопировать: " + (e.message || e);
  }
  if (status) { const current = status.textContent; setTimeout(() => { if (status.textContent === current) status.textContent = ""; }, 4500); }
}
async function copyPngToStatus(makeBlob, statusEl, okText = "Изображение скопировано"){
  try {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error("копирование изображений недоступно; открой страницу через localhost");
    if (statusEl) statusEl.textContent = "Подготовка…";
    // Promise inside ClipboardItem keeps the click's user activation while the PNG is rendered.
    await navigator.clipboard.write([new ClipboardItem({"image/png": makeBlob()})]);
    if (statusEl) statusEl.textContent = okText;
  } catch (e) {
    if (statusEl) statusEl.textContent = "Не удалось скопировать: " + (e?.message || e);
  }
  if (statusEl) { const current = statusEl.textContent; setTimeout(() => { if (statusEl.textContent === current) statusEl.textContent = ""; }, 4500); }
}
function buildTopTable(kind, n){
  const data = kind === "months" ? monthsData() : daysData(false);
  const list = data.entries.slice().sort((a,b) => b[1].msgs - a[1].msgs || a[0].localeCompare(b[0])).slice(0, n);
  const t = document.createElement("table");
  t.appendChild($(kind === "months" ? "months-table" : "days-table").tHead.cloneNode(true));
  const body = document.createElement("tbody");
  body.innerHTML = list.length ? list.map(data.row).join("") : `<tr><td colspan="6">Нет данных</td></tr>`;
  t.appendChild(body);
  return t;
}
function copyTop(kind, n){
  const status = $(kind === "months" ? "months-copy-status" : "days-copy-status");
  if (!allRows) { if (status) status.textContent = "История ещё загружается, попробуй через пару секунд"; ensureMonthDayHistory().catch(() => {}); return; }
  const chat = $(kind === "months" ? "m-chat" : "d-chat").value || "Все чаты", y = kind === "months" ? mYear : dYear;
  const all = !Number.isFinite(n), what = kind === "months" ? "месяцев" : "дней";
  const fl = topFilterLabel(kind);
  const title = `${all ? `Все ${kind === "months" ? "месяцы" : "дни"}` : `Топ-${n} ${what}`} — ${chat}${y ? ` · ${y}` : ""}${fl ? ` · ${kind === "months" ? fl : "только " + fl}` : ""}`;
  copyPngToStatus(() => tableImageBlob(buildTopTable(kind, n), title), status, all ? "Таблица скопирована" : `Топ-${n} скопирован`);
}
function ensureMonthDayHistory(){
  return getHistory().then(data => {
    fillChatSel($("m-chat"), data);
    fillChatSel($("d-chat"), data);
    renderMonths();
    renderDays();
    return data;
  });
}
$("copy-months-top10").onclick = () => copyTop("months", 10);
$("copy-months-top20").onclick = () => copyTop("months", 20);
$("copy-days-top10").onclick = () => copyTop("days", 10);
$("copy-days-top20").onclick = () => copyTop("days", 20);
$("copy-months-all").onclick = () => copyTop("months", Infinity);
$("copy-days-all").onclick = () => copyTop("days", Infinity);
$("copy-milestones-image").onclick = () => copyTableImage("milestone-table", "Ближайшие юбилеи участия", "copy-milestones-status");

$("copy-participants-image").onclick = () => copyTableImage("participants-table", () => $("participants-period-title").textContent, "copy-participants-status");
$("copy-chats-image").onclick = () => copyTableImage("chat-rank-table", () => $("chat-rank-title").textContent, "copy-chats-status");
$("rec-chart-copy").onclick = () => copyPngToStatus(() => svgToPngBlob($("rec-chart").querySelector("svg"), cmpExportPrefs()), $("rec-chart-msg"), "График скопирован");
$("copy-records-image").onclick = () => copyTableImage("records-table", () => (recordsEntity === "users" ? "Рекорды участников" : "Рекорды чатов") + (recordsPeriod === "day" ? "" : " · за " + REC_PER[recordsPeriod]), "copy-records-status");
$("copy-time-image").onclick = () => copyTableImage("time-table", () => $("time-title").textContent, "copy-time-status");
let msgT;
function cMsg(t){ const e = $("c-msg"); e.textContent = t; clearTimeout(msgT); msgT = setTimeout(() => e.textContent = "", 3500); }
$("c-copy").onclick = async () => {
  try {
    await navigator.clipboard.write([new ClipboardItem({"image/png": chartBlob()})]);
    cMsg("Скопировано");
  } catch (e) { cMsg("Не удалось скопировать: " + (e.message || e)); }
};

/* ---------- Обновить ---------- */
function stamp(){ const d = new Date(); $("upd").textContent = `Обновлено в ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
async function refreshAll(soft){
  soft = soft === true;
  const t = activeDataTab(), btn = $("refresh");
  if (!soft) {
    btn.disabled = true; btn.textContent = "Обновляю…";
    allRows = null; histP = null; rawHist = null; membershipRows = null;
    userMetricRows = null; userMetricPromise = null; chatMetricRows = null; chatMetricPromise = null;
    userStatuses.clear(); leftFilterError = "";
  }
  rows = []; comparisonRows = null; comparisonError = "";
  try {
    if (t === "profile") await loadProfile();
    else if (t === "months") await loadMonths();
    else if (t === "days") await loadDays();
    else if (t === "time") await loadTime();
    else if (t === "records") await loadRecords();
    else if (t === "daymatrix") await loadDayMatrix(true);
    else if (t === "marathons") { mrCache.clear(); await loadMarathons(); }
    else if (t === "yearreview") await loadYearReview();
    else if (t === "achievements") await loadAchievements();
    else if (t === "chronicle") await (window.loadChronicle ? window.loadChronicle() : null);
    else if (t === "birthdays") await loadBirthdays();
    else if (t === "usermap") await loadUserMap();
    else if (t === "vk") await loadVk();
    else if (t === "compare") await loadCompare();
    else if (t === "hub") await (window.loadHub ? window.loadHub() : load());
    else await load();
  } finally { btn.disabled = false; btn.textContent = "Обновить"; }
}
$("refresh").onclick = () => refreshAll();
$("ult-toggle").onclick = () => { ULT.on = !ULT.on; ultApply(); };
ultSync();

/* ---------- Цвета и градиенты ---------- */
function hsl2hex(h, s, l){
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

const SKEY = "chatstats.styles.v1";
let STYLE = {u:{}, y:{}, c:{}};
try { const j = JSON.parse(localStorage.getItem(SKEY) || "{}"); STYLE = {u: j.u || {}, y: j.y || {}, c: j.c || {}}; } catch (e) {}
const saveStyle = () => { try { localStorage.setItem(SKEY, JSON.stringify(STYLE)); } catch (e) {} };

function defColor(kind, key){
  if (kind === "special") return "#555a68";
  if (kind === "g") return {main:"#7aa2f7", top:"#e0af68"}[key] || "#7aa2f7";
  if (kind === "c" && (String(key) === "ultimate" || key === "Colony Ultimate")) return "#f5c542";
  if (kind === "y") { const y = Number(key); return y === now.getFullYear() ? CUR : (YPAL[y] || hsl2hex((y * 47) % 360, 30, 42)); }
  let n = kind === "c" ? 0 : Number(key);
  if (kind === "c" || !Number.isFinite(n)) { n = 0; for (const ch of String(kind === "c" ? `chat:${key}` : key)) n = (n * 31 + ch.charCodeAt(0)) >>> 0; }
  return hsl2hex((n * 137.508) % 360, 62, 62);
}
function getStyle(kind, key){
  const st = STYLE[kind]?.[key];
  return (st && Array.isArray(st.c) && st.c.length) ? st : {c: [defColor(kind, key)]};
}
let gid = 0;
// Возвращает заливку для SVG: p — для линии/столбца, a — первый цвет, z — последний, defs — описание градиента
function paint(st, x1, y1, x2, y2){
  let c = st.c;
  if (c.length < 2 && SOFT_GRAD) { const sp = softPair(c[0]); if (sp[0] !== sp[1]) c = sp; }
  if (c.length < 2) return {p: c[0], a: c[0], z: c[0], defs: ""};
  const id = "gr" + (++gid);
  const stops = c.map((col, i) => `<stop offset="${Math.round(i / (c.length - 1) * 100)}%" stop-color="${col}"/>`).join("");
  return {p: `url(#${id})`, a: c[0], z: c[c.length - 1],
    defs: `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`};
}

/* ---------- Вкладка «Настройки» ---------- */
function renderSettings(){
  if (typeof renderPeopleEditor === "function") { peopleDraft = null; renderPeopleEditor(); }
  if (typeof renderCacheInfo === "function") renderCacheInfo();
  if (typeof renderThemeGrid === "function") renderThemeGrid();
}

const HIDE_LEFT_CONTROLS = ["hide-left-participants","hide-left-charts","hide-left-records","hide-left-time","hide-left-forecast","hide-left-selfie","hide-left-daymatrix"];
function syncHideLeftControls(){ HIDE_LEFT_CONTROLS.forEach(id => { if ($(id)) $(id).checked = hideLeft; }); }
const COMPARISON_CONTROLS = ["compare-participants", "compare-chats", "dm-compare"];
function syncComparisonControls(){
  COMPARISON_CONTROLS.forEach(id => {
    const el = $(id); if (!el) return;
    el.checked = comparisonEnabled;
    el.disabled = mode === "all" && id !== "dm-compare";
    const label = el.closest("label");
    if (label) label.title = el.disabled ? "Сравнение недоступно для режима «Все данные»" : "Сравнить с предыдущим сопоставимым периодом";
  });
}
async function onComparisonChanged(value){
  comparisonEnabled = Boolean(value);
  try { localStorage.setItem("chatstats.comparison.v1", comparisonEnabled ? "1" : "0"); } catch (e) {}
  syncComparisonControls();
  const tab = activeDataTab();
  if (tab === "daymatrix") { await loadDayMatrix(); return; }
  if (comparisonEnabled) await load();
  else { comparisonRows = null; comparisonError = ""; render(); if (tab === "chats") renderChatRank(); }
}
COMPARISON_CONTROLS.forEach(id => { const el = $(id); if (el) el.addEventListener("change", () => onComparisonChanged(el.checked)); });
syncComparisonControls();
async function onHideLeftChanged(value){
  hideLeft = Boolean(value);
  try { localStorage.setItem("chatstats.hideLeft.v1", hideLeft ? "1" : "0"); } catch (e) {}
  syncHideLeftControls(); leftFilterError = "";
  if (hideLeft) {
    try { await ensureUserMetrics(); }
    catch (e) { leftFilterError = e.message || String(e); }
  }
  renderPeople();
  if ($("tab-participants").classList.contains("active")) render();
  if ($("tab-charts").classList.contains("active")) renderCharts();
  if ($("tab-forecast").classList.contains("active")) renderForecast();
  if ($("tab-selfie").classList.contains("active")) renderSelfie();
  if ($("tab-daymatrix").classList.contains("active")) renderDayMatrix();
  if ($("tab-records").classList.contains("active")) { recordsUserRows = mergeRecordMetrics(userMetricRows || [], maxDailyFallback(allRows || rows, "users"), "users"); renderRecords(); }
  if ($("tab-time").classList.contains("active")) { membershipRows = buildMembershipRows(); renderTime(); timeStatus(hideLeft && leftFilterError ? `Не удалось получить статусы участников: ${leftFilterError}. Вышедшие не отфильтрованы.` : `Участников в списке: ${membershipRows.length}`); }
  if (leftFilterError && hideLeft && $("tab-records").classList.contains("active")) recordsStatus(`Не удалось получить статусы участников: ${leftFilterError}. Вышедшие не отфильтрованы.`, true);
}
HIDE_LEFT_CONTROLS.forEach(id => { const el = $(id); if (el) el.addEventListener("change", () => onHideLeftChanged(el.checked)); });
syncHideLeftControls();

load();
/* >>> heat */
/* ---------- Календарь активности ---------- */
const HEAT_KEY = "chatstats.heat.v1";
const HEAT_PRESETS = {
  "Розовый": ["#4a2a45", "#a8325a", "#ff4d6d"], "Синий": ["#1f3a5f", "#2f6fb3", "#7ac7ff"],
  "Зелёный": ["#1f3d2b", "#2f8f4e", "#8ef0a8"], "Огонь": ["#4a1f1f", "#d9531e", "#ffd166"],
};
let HEAT = {z: "#2a2e39", c: [...HEAT_PRESETS["Розовый"]]};
try { const j = JSON.parse(localStorage.getItem(HEAT_KEY) || "null"); if (j && j.z && Array.isArray(j.c) && j.c.length >= 2) HEAT = j; } catch (e) {}
const heatRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const heatMix = (a, b, t) => { const A = heatRgb(a), B = heatRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
// HEAT_LO: самое маленькое ненулевое значение на графике. Если задано, шкала растягивается от него до максимума,
// иначе в «Календаре» и «Спирали», где почти каждый день активный, все клетки получались одного цвета.
var HEAT_LO = 0;
const heatColor = (v, max) => {
  const palette = chartPrefs(currentChartType()).heat || HEAT;
  if (!v) return palette.z;
  const lo = HEAT_LO > 0 && HEAT_LO < max ? HEAT_LO : 0;
  const t = lo ? Math.min(1, Math.max(0, .06 + .94 * Math.pow((v - lo) / (max - lo), .8))) : Math.pow(v / max, 0.6), c = palette.c;
  // Палитра из любого числа оттенков: t делится на равные отрезки между соседними цветами
  if (c.length < 2) return c[0] || palette.z;
  const pos = Math.min(c.length - 1 - 1e-9, t * (c.length - 1)), k = Math.floor(pos);
  return heatMix(c[k], c[k + 1], pos - k);
};

function calendarChart(){
  const r = cRange(); if (!r) return note("Выберите период");
  const metric = $("metric").value, DAY = 864e5;
  const src = chartEntity === "chats" ? chartChatRows(cRows())
    : cScoped().filter(x => { const k = String(x[F.userId] ?? x[F.name]); return isVisibleUser(k) && (!SEL_ACTIVE || SEL.has(k)); });
  const by = new Map();
  src.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d.length === 10) by.set(d, (by.get(d) || 0) + (Number(g(x, metric)) || 0)); });
  if (!by.size) return note("Нет данных за выбранный период");
  const ds = [...by.keys()].sort(), todayIso = iso(now);
  const from = r[0] > ds[0] ? r[0] : ds[0], to = r[1] < todayIso ? r[1] : todayIso;
  const U = t => { const a = t.split("-").map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
  const days = Math.round((U(to) - U(from)) / DAY) + 1;
  if (days < 1) return note("Этот период ещё не начался");
  const big = days <= 62, cs = big ? 30 : 12, gap = big ? 4 : 3, x0 = 40, step = cs + gap;
  let max = 0; HEAT_LO = 0; by.forEach((v, d) => { if (d >= from && d <= to && v > 0) { if (v > max) max = v; if (!HEAT_LO || v < HEAT_LO) HEAT_LO = v; } });
  const calDates = []; for (let t = U(from); t <= U(to); t += DAY) calDates.push(new Date(t).toISOString().slice(0, 10));
  const calZ = anomalyScores(calDates.map(d => by.get(d) || 0));
  const zByDate = new Map(calZ ? calDates.map((d, i) => [d, calZ[i]]) : []);
  setDayTipCtx(by, from, to, metric, zByDate);
  // События на календаре: точка в углу клетки (марафон — цвет марафона, событие хроники — жёлтая).
  const calEvents = chartEventsFor(from, to, chartEntity === "users" && SEL_ACTIVE ? [...SEL] : null), calEv = new Map();
  if (calEvents) {
    calEvents.bands.forEach(b => { for (let d = b.from; d <= b.to; d = addDaysIso(d, 1)) if (!calEv.has(d)) calEv.set(d, b.color); });
    calEvents.flags.forEach(f => calEv.set(f.d, EV_FLAG));
    dayTipCtx.evNote = d => chartEventNote(calEvents, d);
  }
  const fy = +from.slice(0, 4), ty = +to.slice(0, 4), multi = fy !== ty, blocks = [];
  for (let y = fy; y <= ty; y++) blocks.push([y === fy ? from : `${y}-01-01`, y === ty ? to : `${y}-12-31`]);
  const SM = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"], WD = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  let o = head(cPeriodLabel(), sub()), yy = 100;
  blocks.forEach(([a, b]) => {
    const ua = U(a), mon = ua - ((new Date(ua).getUTCDay() + 6) % 7) * DAY;
    const gy = yy + (multi ? 24 : 0) + (big ? 0 : 20);
    if (multi) o += `<text class="chart-axis" x="0" y="${yy + 14}" font-size="18" fill="#aab0c0">${a.slice(0, 4)}</text>`;
    for (let wd = 0; wd < 7; wd++) if (big || wd % 2 === 0)
      o += `<text class="chart-axis" x="0" y="${gy + wd * step + cs * 0.72}" font-size="${big ? 14 : 11}" fill="#7d8190">${WD[wd]}</text>`;
    for (let t = ua; t <= U(b); t += DAY) {
      const d = new Date(t), wd = (d.getUTCDay() + 6) % 7, w = Math.floor((t - mon) / (7 * DAY));
      const x = x0 + w * step, y = gy + wd * step, key = d.toISOString().slice(0, 10), v = by.get(key) || 0;
      const label = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}, ${WD[wd]}`;
      const evm = calEv.get(key);
      o += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="3" fill="${heatColor(v, max)}"${anomStroke(zByDate.get(key))} data-day="${key}"/>`;
      if (evm) o += `<circle cx="${x + cs - (big ? 5 : 2.5)}" cy="${y + (big ? 5 : 2.5)}" r="${big ? 3.6 : 2}" fill="${evm}" stroke="#0f1117" stroke-width="${big ? 1.2 : .6}" pointer-events="none"/>`;
      if (big) o += `<text class="chart-axis chart-day" x="${x + cs / 2}" y="${y + (cs + 11) / 2}" text-anchor="middle" font-size="11" fill="#ffffffb0" pointer-events="none">${d.getUTCDate()}</text>`;
      else if (d.getUTCDate() <= 7 && wd === 0) o += `<text class="chart-axis" x="${x}" y="${gy - 6}" font-size="12" fill="#aab0c0">${SM[d.getUTCMonth()]}</text>`;
    }
    yy = gy + 7 * step + 22;
  });
  o += `<text class="chart-legend" x="40" y="${yy + 14}" font-size="14" fill="#7d8190">Меньше</text>`;
  for (let k = 0; k <= 4; k++) o += `<rect x="${100 + k * 20}" y="${yy + 2}" width="16" height="16" rx="3" fill="${heatColor(k === 0 ? 0 : HEAT_LO > 0 ? HEAT_LO + (k - 1) / 3 * (max - HEAT_LO) : k / 4 * max, max)}"/>`;
  o += `<text class="chart-legend" x="210" y="${yy + 14}" font-size="14" fill="#7d8190">Больше</text><text class="chart-value" x="290" y="${yy + 14}" font-size="14" fill="#7d8190">максимум за день: ${fmt(max)}</text>`;
  if (ANOM.on) o += anomLegend(40, yy + 44);
  let evH = 0;
  if (calEvents && (calEvents.bands.length || calEvents.flags.length)) {
    const ey = yy + 44 + (ANOM.on ? 30 : 0);
    o += `<circle cx="48" cy="${ey - 5}" r="5" fill="${calEvents.bands[0]?.color || "#9ece6a"}"/><text class="chart-legend" x="60" y="${ey}" font-size="14" fill="#7d8190">марафон</text><circle cx="150" cy="${ey - 5}" r="5" fill="${EV_FLAG}"/><text class="chart-legend" x="162" y="${ey}" font-size="14" fill="#7d8190">событие хроники<tspan data-no-export="1"> (подробности — при наведении)</tspan></text>`;
    evH = 30;
  }
  return `<svg class="cal-svg" viewBox="0 0 900 ${yy + 34 + (ANOM.on ? 30 : 0) + evH}" role="img">${o}</svg>`;
}
/* <<< heat */

/* ---------- Подсказки на графиках ---------- */
const tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl);
function showTip(html, e){
  if (!html) { hideTip(); return; }
  tipEl.innerHTML = html; tipEl.style.display = "block";
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  tipEl.style.left = Math.max(4, x) + "px"; tipEl.style.top = Math.max(4, y) + "px";
}
/* Общая логика подсказки линейного графика: используется и на странице, и в полноэкранном просмотре. */
function lineSnapX(M, svgX, hidden){
  const span = (M.xMax - M.xMin) || 1;
  let x = Math.max(M.xMin, Math.min(M.xMax, Math.round(M.xMin + (svgX - M.L) / M.span * span)));
  // Разреженные точки (помесячная «Динамика»): прилипаем к ближайшей точке внутри фактических данных.
  if (M.xs?.length && x <= M.xs[M.xs.length - 1] && !M.series.some(s => s.v.has(x))) x = M.xs.reduce((b, c) => Math.abs(c - x) < Math.abs(b - x) ? c : b, M.xs[0]);
  return x;
}
function lineTipHtml(M, x, hidden){
  const list = hidden && hidden.size ? M.series.filter(s => !hidden.has(s.name)) : M.series;
  let items = list.map(s => ({s, v: s.v.get(x)})).filter(q => q.v !== undefined).sort((a, b) => b.v - a.v);
  const fcs = list.filter(s => s.fc && x > s.fc.x0);
  if (fcs.length && !items.length) {
    const fi = fcs.map(s => { const f = s.fc, t2 = (x - f.x0) / (f.x1 - f.x0); return {s, v:f.y0 + (f.y1 - f.y0) * t2, f}; }).sort((a, b) => b.v - a.v);
    const atEnd = x >= fi[0].f.x1;
    return `<b>${escH(M.xLabel(x))} · прогноз</b>` + fi.map((q, k) => {
      const mv = atEnd && Math.round(q.f.month) !== Math.round(q.v) ? ` · за ${q.f.pw || "месяц"} ≈ ${fmt(Math.round(q.f.month))}` : "";
      const mv2 = atEnd && q.f.place !== q.f.nowPlace ? ` <span class="${q.f.place < q.f.nowPlace ? "up" : "down"}">${q.f.place < q.f.nowPlace ? "▲" : "▼"}${Math.abs(q.f.nowPlace - q.f.place)}</span>` : "";
      return tipRow(`<i style="background:${q.s.c}"></i>${k + 1}. ${escH(q.s.name)}${mv2}`, `≈ ${fmt(Math.round(q.v))}${mv}`);
    }).join("") + tipRow("Темп", fi[0].f.note || "60% — последние 14 дней, 40% — весь период") + (M.evNote ? M.evNote(x) : "");
  }
  if (fcs.length) {
    // Есть и факты (например, прошлые годы), и прогноз — показываем вместе, прогноз помечен «≈».
    fcs.forEach(s => { const f = s.fc, t2 = Math.min(1, (x - f.x0) / (f.x1 - f.x0)); items.push({s, v:f.y0 + (f.y1 - f.y0) * t2, fc:true}); });
    items.sort((a, b) => b.v - a.v);
    return `<b>${escH(M.xLabel(x))}</b>` + items.map((q, k) => tipRow(`<i style="background:${q.s.c}"></i>${k + 1}. ${escH(q.s.name)}${q.fc ? " · прогноз" : ""}`, `${q.fc ? "≈ " : ""}${fmt(Math.round(q.v))}${q.fc && x >= q.s.fc.x1 ? ` <small>(${fmt(Math.round(q.s.fc.lo))}–${fmt(Math.round(q.s.fc.hi))})</small>` : ""}`)).join("") + (M.evNote ? M.evNote(x) : "");
  }
  const sum = items.reduce((a, q) => a + q.v, 0);
  const vf = M.valFmt || (v => fmt(Math.round(v)));
  return `<b>${escH(M.xLabel(x))}</b>` + items.map((q, k) => tipRow(`<i style="background:${q.s.c}"></i>${M.shares || M.valFmt ? `${k + 1}. ` : ""}${escH(q.s.name)}`, `${vf(q.v)}${M.shares && sum ? ` · ${pctStr(q.v / sum)}` : ""}`)).join("") + (M.shares && items.length > 1 ? tipRow("Всего", fmt(Math.round(sum))) : "") + (M.evNote ? M.evNote(x) : "");
}
function hideCrosshairs(){ ["xh", "mxh"].forEach(id => { const h = $(id); if (h) h.setAttribute("visibility", "hidden"); }); }
function hideTip(){ tipEl.style.display = "none"; hideCrosshairs(); }
function highlightDonut(seg){
  document.querySelectorAll("#c-out .donut-seg").forEach(g => g.classList.toggle("hl", seg != null && g.dataset.seg === String(seg)));
}
(function(){
  const out = $("c-out");
  const svgPoint = (t, e) => { const svg = t.ownerSVGElement, pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const move = e => {
    const t = e.target;
    if (t.dataset && t.dataset.hover && CHART_HOVER) { CHART_HOVER(t, svgPoint(t, e), e); return; }
    if (t.id === "hov" && lineMeta) {
      const p = svgPoint(t, e), M = lineMeta, x = lineSnapX(M, p.x), span = (M.xMax - M.xMin) || 1;
      const px = M.L + (x - M.xMin) / span * M.span, xh = $("xh");
      xh.setAttribute("x1", px); xh.setAttribute("x2", px); xh.setAttribute("visibility", "visible");
      showTip(lineTipHtml(M, x), e);
      return;
    }
    hideCrosshairs();
    const seg = t.closest?.("[data-seg]");
    highlightDonut(seg ? seg.dataset.seg : null);
    const dayEl = t.closest?.("[data-day]"), ekEl = t.closest?.("[data-ek]"), tipNode = t.closest?.("[data-tip]");
    if (dayEl) showTip(dayTipHtml(dayEl.dataset.day), e);
    else if (ekEl) showTip(entityTipHtml(ekEl.dataset.ek), e);
    else if (tipNode) {
      const [a, b = ""] = tipNode.dataset.tip.split("|");
      showTip(`<b>${escH(a)}</b>${escH(b)}`, e);
    } else hideTip();
  };
  out.addEventListener("pointermove", move); out.addEventListener("pointerdown", move);
  out.addEventListener("pointerleave", () => { hideTip(); highlightDonut(null); });
  out.addEventListener("click", e => {
    if (e.target.closest("[data-donut-toggle]")) { donutOthersOpen = !donutOthersOpen; hideTip(); renderCharts(); return; }
    const el = e.target.closest(".lg-item"); if (!el) return;
    const n = el.dataset.name; hiddenSeries.has(n) ? hiddenSeries.delete(n) : hiddenSeries.add(n);
    hideTip(); renderCharts();
  });
})();

/* ---------- Поля API ---------- */
const API_EPS = [
  ["Дневная статистика (user_daily_stats)", CONFIG.ENDPOINT, true],
  ["Метрики участников (activity_user_metrics)", "/api/v1/excel/activity_user_metrics", false],
  ["Метрики чатов (activity_chat_metrics)", "/api/v1/excel/activity_chat_metrics", false],
];
async function sampleEndpoint(ep, daily){
  const url = new URL(ep, CONFIG.BASE_URL); url.searchParams.set("limit", "200");
  if (daily) url.searchParams.set("stat_date_from", addDaysIso(iso(now), -30));
  const res = await fetch(url);
  if (!res.ok) throw new Error("сервер ответил " + res.status);
  return payloadRows(await res.json());
}
$("api-fields-btn").onclick = async () => {
  const btn = $("api-fields-btn"), st = $("api-fields-status"), box = $("api-fields");
  btn.disabled = true; st.textContent = "Загружаю…"; box.innerHTML = "";
  const used = new Set([F.date, F.chat, F.chatPk, F.userId, F.name, ...F.msgs, ...F.voice, ...F.video, ...F.stick]);
  const parts = [];
  for (const [title, ep, daily] of API_EPS) {
    try {
      const rs = await sampleEndpoint(ep, daily), keys = [...new Set(rs.flatMap(r => Object.keys(r)))];
      const body = keys.map(k => {
        const vals = rs.map(r => r[k]).filter(v => v !== null && v !== undefined && v !== "");
        const ex = vals.length ? (typeof vals[0] === "object" ? JSON.stringify(vals[0]) : String(vals[0])) : "—";
        return `<tr><td>${escH(k)}</td><td>${vals.length ? typeof vals[0] : "—"}</td><td>${Math.round(vals.length / rs.length * 100)}%</td><td style="text-align:left">${escH(ex.slice(0, 60))}</td>${daily ? `<td>${used.has(k) ? "да" : "нет"}</td>` : ""}</tr>`;
      }).join("");
      parts.push(`<h3>${escH(title)}</h3><p class="hint">Строк в примере: ${rs.length}</p><div class="wrap"><table><thead><tr><th>Поле</th><th>Тип</th><th>Заполнено</th><th>Пример</th>${daily ? "<th>Используется</th>" : ""}</tr></thead><tbody>${body || '<tr><td colspan="5">Нет данных</td></tr>'}</tbody></table></div>`);
    } catch (e) { parts.push(`<h3>${escH(title)}</h3><p class="status err">Не удалось загрузить: ${escH(e.message || e)}</p>`); }
  }
  box.innerHTML = parts.join(""); st.textContent = "Готово"; btn.disabled = false;
};

/* >>> heat2 */
/* ---------- Карта активности: участники или чаты × время ---------- */
function customHeatBandsForUse(bands){
  const sorted = (Array.isArray(bands) && bands.length ? bands : DEFAULT_CUSTOM_HEAT_BANDS)
    .map((b, i) => ({min:Math.max(0, Math.floor(Number(b.min) || 0)), color:/^#[0-9a-f]{6}$/i.test(String(b.color || "")) ? b.color : (DEFAULT_CUSTOM_HEAT_BANDS[i]?.color || "#a855f7")}))
    .sort((a,b) => a.min - b.min);
  // If two thresholds collide, the later band wins and the legend remains unambiguous.
  const unique = [];
  sorted.forEach(b => { if (unique.length && unique[unique.length - 1].min === b.min) unique[unique.length - 1] = b; else unique.push(b); });
  return unique;
}
function customHeatColor(value, bands){
  let chosen = bands[0]?.color || "#ef4444";
  for (const band of bands) { if (value >= band.min) chosen = band.color; else break; }
  return chosen;
}
function customHeatBandLabel(bands, index){
  const band = bands[index], next = bands[index + 1];
  if (next) return `${band.min}–${next.min - 1}`;
  return `${band.min}+`;
}
// Сколько строк показывать на карте: «auto» (25, при ручном выборе — до 40), 5/10/20 или «all».
function heatRowsTopSetting(type){
  const v = chartPrefs(type).heatRowsTop;
  if (v === "all" || v === "auto" || [5, 10, 20].includes(Number(v))) return v === "all" || v === "auto" ? v : Number(v);
  return type === "heatrows-custom" ? 10 : "auto";
}
function heatRowsChart(customRanges = false){
  const r = cRange(); if (!r) return note("Выберите период");
  const metric = $("metric").value, DAY = 864e5, chats = chartEntity === "chats";
  const src = chats ? chartChatRows(cRows())
    : cScoped().filter(x => { const k = String(x[F.userId] ?? x[F.name]); return isVisibleUser(k) && (!SEL_ACTIVE || SEL.has(k)); });
  const U = t => { const a = t.split("-").map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
  let dmin = "9999-99-99";
  src.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d.length === 10 && d < dmin) dmin = d; });
  if (dmin === "9999-99-99") return note("Нет данных за выбранный период");
  const todayIso = iso(now), from = r[0] > dmin ? r[0] : dmin, to = r[1] < todayIso ? r[1] : todayIso;
  const days = Math.round((U(to) - U(from)) / DAY) + 1;
  if (days < 1) return note("Этот период ещё не начался");
  const kind = days <= 62 ? "d" : days <= 800 ? "w" : "m", t0 = U(from);
  const mIdx = t => { const d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }, m0 = mIdx(t0);
  const colOf = t => kind === "d" ? Math.round((t - t0) / DAY) : kind === "w" ? Math.floor((t - t0) / (7 * DAY)) : mIdx(t) - m0;
  const ncols = colOf(U(to)) + 1, groups = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10 || d < from || d > to) return;
    const k = chats ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    const e = groups.get(k) || {k, name: chats ? String(x[F.chat] || `Чат ${k}`) : who(x), a: Array(ncols).fill(0), tot: 0};
    const v = Number(g(x, metric)) || 0; e.a[colOf(U(d))] += v; e.tot += v; groups.set(k, e);
  });
  const lim = chats ? 25 : (SEL_ACTIVE ? 40 : 25);
  const rankedList = [...groups.values()].filter(e => e.tot > 0).sort((a, b) => b.tot - a.tot);
  const topSetting = heatRowsTopSetting(customRanges ? "heatrows-custom" : "heatrows");
  const list = String(topSetting) === "all" ? rankedList : rankedList.slice(0, topSetting === "auto" ? lim : Math.max(1, Number(topSetting) || 10));
  if (!list.length) return note("Нет данных за выбранный период");
  const perRow = $("heat-scale").value === "row";
  let gmax = 0; list.forEach(e => e.a.forEach(v => { if (v > gmax) gmax = v; }));
  const shownName = name => name.length > 18 ? name.slice(0, 17) + "…" : name;
  const settingsType = customRanges ? "heatrows-custom" : "heatrows";
  const heatPrefs = chartPrefs(settingsType);
  const customBands = customRanges ? customHeatBandsForUse(heatPrefs.customBands) : [];
  const typography = heatPrefs.textStyle;
  const labelFont = Number(typography.labelsSize) || 14, valueFont = Number(typography.valuesSize) || 12, axisFont = Number(typography.axisSize) || 11, legendFont = Number(typography.legendSize) || 14;
  const measure = (value, font) => {
    try { const cv = document.createElement("canvas"), ctx = cv.getContext("2d"); if (ctx) { ctx.font = font; const w = ctx.measureText(String(value)).width; if (Number.isFinite(w) && w > 0) return w; } } catch (e) {}
    return [...String(value)].reduce((sum, ch) => sum + (/[ilI.,' `]/.test(ch) ? 4 : /[MW@#%]/.test(ch) ? 10 : 8), 0);
  };
  // Fit the label column to the actual labels rather than reserving a fixed 150px.
  const LBL = Math.max(54, Math.ceil(Math.max(...list.map(e => measure(shownName(e.name), `${labelFont}px "Samsung Sans", "SamsungOne", "Segoe UI", system-ui, sans-serif`))) + 12));
  // Use the actual chart viewport instead of a fixed 900px canvas, so the map fills
  // the available width and does not leave large empty margins on either side.
  const viewportW = Math.max(560, ($("c-out")?.clientWidth || 980) - 16);
  const avail = Math.max(120, viewportW - LBL - 70);
  const fitCellSize = Math.max(4, Math.min(52, Math.floor(avail / ncols)));
  const cellScale = Math.max(60, Math.min(150, Number(heatPrefs.heatCellScale) || 100));
  const cellShape = heatPrefs.heatCellShape === "circle" ? "circle" : "square";
  // Circle diameter is controlled independently from the grid spacing so dots can be made much smaller without compressing labels/rows.
  const circleScale = Math.max(10, Math.min(100, Number(heatPrefs.heatCircleScale) || 100));
  // 100% preserves the responsive fit; smaller/larger percentages scale the cells without stretching them.
  const cw = Math.max(4, Math.min(76, Math.round(fitCellSize * cellScale / 100)));
  const CH = cw - 1, RH = cw;
  const maxTotalWidth = Math.max(...list.map(e => measure(fmt(e.tot), `${valueFont}px "Samsung Sans", "SamsungOne", "Segoe UI", system-ui, sans-serif`)));
  const SM = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const bucket = c => { const d = new Date(kind === "d" ? t0 + c * DAY : kind === "w" ? t0 + c * 7 * DAY : Date.UTC(Math.floor((m0 + c) / 12), (m0 + c) % 12, 1));
    const dd = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
    return kind === "d" ? dd : kind === "w" ? `неделя с ${dd}` : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const showSubtitle = heatPrefs.showSubtitle !== false;
  // When the subtitle is hidden, move the entire plot upward to reclaim its vertical space.
  const gy = showSubtitle ? 124 : 96, gridRight = LBL + ncols * cw;
  const lessLabel = "Меньше", scaleLabel = `Больше (шкала: ${perRow ? "по каждой строке" : "общая"})`;
  const legendTextFont = `${legendFont}px "Samsung Sans", "SamsungOne", "Segoe UI", system-ui, sans-serif`;
  const lessW = measure(lessLabel, legendTextFont), scaleW = measure(scaleLabel, legendTextFont);
  const customLegendLabels = customRanges ? customBands.map((_, i) => customHeatBandLabel(customBands, i)) : [];
  const customLegendWidths = customLegendLabels.map(label => Math.max(42, Math.ceil(measure(label, legendTextFont)) + 14));
  const legendGroupW = customRanges
    ? Math.ceil(customLegendWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, customLegendWidths.length - 1) * 8)
    : Math.ceil(lessW + 12 + 5 * 20 + 10 + scaleW + 10);
  const W = Math.ceil(Math.max(gridRight + 8 + maxTotalWidth + 14, legendGroupW + 20, LBL + 160));
  const legendX = Math.max(0, Math.round((W - legendGroupW) / 2));
  const legendSwatchX = Math.ceil(legendX + lessW + 12), legendMoreX = legendSwatchX + 5 * 20 + 10;
  const topLabel = String(topSetting) === "all" ? `${chats ? "все чаты" : "все участники"} (${list.length})` : `топ-${list.length}`;
  let o = head(cPeriodLabel(), sub() + `, ${chats ? "чаты" : "участники"} × ${kind === "d" ? "дни" : kind === "w" ? "недели" : "месяцы"}, ${topLabel}`, W, showSubtitle);
  let prevM = -1;
  for (let c = 0; c < ncols; c++) {
    const d = new Date(kind === "d" ? t0 + c * DAY : kind === "w" ? t0 + c * 7 * DAY : Date.UTC(Math.floor((m0 + c) / 12), (m0 + c) % 12, 1));
    let lab = "";
    if (kind === "d") { if (c % Math.max(1, Math.ceil(16 / cw)) === 0) lab = d.getUTCDate(); }
    else if (kind === "w") { if (d.getUTCMonth() !== prevM) { lab = SM[d.getUTCMonth()]; prevM = d.getUTCMonth(); } }
    else if (d.getUTCMonth() === 0 || c === 0) lab = d.getUTCFullYear();
    if (lab !== "") o += `<text class="chart-axis" x="${LBL + c * cw + cw / 2}" y="${gy - 8}" text-anchor="middle" font-size="${axisFont}" fill="#aab0c0">${lab}</text>`;
  }
  list.forEach((e, i) => {
    HEAT_LO = 0; const y = gy + i * RH, max = perRow ? Math.max(...e.a, 1) : gmax;
    o += `<text class="chart-label" x="${LBL - 8}" y="${y + RH / 2}" dominant-baseline="middle" text-anchor="end" font-size="${labelFont}" fill="#e6e8ee" data-ek="${escH(e.k)}">${escH(shownName(e.name))}</text>`;
    const zs = ANOM.on ? anomalyScores(e.a) : null;
    e.a.forEach((v, c) => {
      const z = zs ? zs[c] : null, an = anomStroke(z), az = anomLabel(z);
      const color = customRanges ? customHeatColor(v, customBands) : heatColor(v, max), tip = `${escH(e.name)}, ${bucket(c)}|${fmt(v)}, ${MLBL[metric].toLowerCase()}${az}`;
      if (cellShape === "circle") {
        o += `<circle cx="${LBL + c * cw + cw / 2}" cy="${y + CH / 2}" r="${Math.max(0.5, ((cw - 3) / 2) * circleScale / 100).toFixed(2)}" fill="${color}"${an} data-tip="${tip}"/>`;
      } else {
        o += `<rect x="${LBL + c * cw}" y="${y}" width="${cw - 1}" height="${CH}" rx="2" fill="${color}"${an} data-tip="${tip}"/>`;
      }
    });
    o += `<text class="chart-value" x="${gridRight + 8}" y="${y + RH / 2}" dominant-baseline="middle" font-size="${valueFont}" fill="#aab0c0">${fmt(e.tot)}</text>`;
  });
  const ly = gy + list.length * RH + 14;
  let legendHeight = 36;
  if (customRanges) {
    o += `<text class="chart-legend" x="${W / 2}" y="${ly + legendFont}" text-anchor="middle" font-size="${legendFont}" fill="#7d8190">Диапазоны значений</text>`;
    let cursor = legendX;
    customBands.forEach((band, i) => {
      const itemW = customLegendWidths[i], centerX = cursor + itemW / 2;
      if (cellShape === "circle") o += `<circle cx="${centerX}" cy="${ly + legendFont + 17}" r="7" fill="${band.color}"/>`;
      else o += `<rect x="${centerX - 8}" y="${ly + legendFont + 9}" width="16" height="16" rx="3" fill="${band.color}"/>`;
      o += `<text class="chart-legend" x="${centerX}" y="${ly + legendFont * 2 + 26}" text-anchor="middle" font-size="${legendFont}" fill="#7d8190">${escH(customLegendLabels[i])}</text>`;
      cursor += itemW + 8;
    });
    legendHeight = legendFont * 2 + 43;
  } else {
    o += `<text class="chart-legend" x="${legendX}" y="${ly + legendFont}" font-size="${legendFont}" fill="#7d8190">${lessLabel}</text>`;
    for (let k = 0; k <= 4; k++) {
      const x = legendSwatchX + k * 20, color = heatColor(k / 4 * 100, 100);
      o += cellShape === "circle"
        ? `<circle cx="${x + 8}" cy="${ly + 10}" r="7" fill="${color}"/>`
        : `<rect x="${x}" y="${ly + 2}" width="16" height="16" rx="3" fill="${color}"/>`;
    }
    o += `<text class="chart-legend" x="${legendMoreX}" y="${ly + legendFont}" font-size="${legendFont}" fill="#7d8190">${escH(scaleLabel)}</text>`;
  }
  return `<svg class="heatrows-svg" width="${W}" height="${ly + legendHeight}" viewBox="0 0 ${W} ${ly + legendHeight}" role="img">${o}</svg>`;
}
/* ---------- Экспериментально: мини-графики и полоски в таблицах ---------- */
const EXP_KEY = "chatstats.exp.v1", EXP_TABLES = [["participants-table", "users"], ["chat-rank-table", "chats"]];
// Мини-графики «Динамика» включены всегда; столбец скрывается в меню «Столбцы», как любой другой.
let EXP = {spark: true, bars: false};
try { const j = JSON.parse(localStorage.getItem(EXP_KEY) || "null"); if (j) EXP.bars = !!j.bars; } catch (e) {}

function sparkSvg(a){
  if (!a || !a.length) return '<span class="spark-empty">—</span>';
  const AC = (getComputedStyle(document.body).getPropertyValue("--accent") || "").trim() || "#7aa2f7";
  const W = 96, H = 24, max = Math.max(...a, 1), n = a.length;
  const px = i => n > 1 ? 2 + i * (W - 4) / (n - 1) : W / 2, py = v => H - 3 - (v / max) * (H - 6);
  if (n === 1) {
    // A single-day range has no trend line, so show a neutral marker instead of hiding the column.
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="vertical-align:middle" aria-label="Нет динамики за один день"><line x1="2" y1="${H-3}" x2="${W-2}" y2="${H-3}" stroke="${hexA(AC, .25)}" stroke-width="1"/><circle cx="${W/2}" cy="${py(a[0])}" r="3" fill="${AC}"/></svg>`;
  }
  const pts = a.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const sg = "spk" + Math.random().toString(36).slice(2, 8);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="vertical-align:middle"><defs><linearGradient id="${sg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${AC}" stop-opacity=".45"/><stop offset=".8" stop-color="${AC}" stop-opacity="0"/></linearGradient></defs><polygon points="${px(0).toFixed(1)},${H - 3} ${pts} ${px(n - 1).toFixed(1)},${H - 3}" fill="url(#${sg})"/><polyline points="${pts}" fill="none" stroke="${AC}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function buildSparkMap(entity){
  const r = range(); if (!r) return null;
  const src = entity === "chats" ? chatRowsForChart(rows) : scoped(), DAY = 864e5;
  const U = t => { const a = t.split("-").map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
  let dmin = "9999-99-99";
  src.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d.length === 10 && d < dmin) dmin = d; });
  if (dmin === "9999-99-99") return null;
  const todayIso = iso(now), from = r[0] > dmin ? r[0] : dmin, to = r[1] < todayIso ? r[1] : todayIso;
  const days = Math.round((U(to) - U(from)) / DAY) + 1; if (days < 1) return null;
  const B = Math.max(1, Math.min(days, 30)), t0 = U(from), map = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10 || d < from || d > to) return;
    const name = entity === "chats" ? String(x[F.chat] || "") : who(x);
    let a = map.get(name); if (!a) { a = Array(B).fill(0); map.set(name, a); }
    a[Math.min(B - 1, Math.floor(Math.round((U(d) - t0) / DAY) * B / days))] += Number(g(x, "msgs")) || 0;
  });
  return map;
}
function sparkRowName(tr, nameCol){
  // The row-exclusion button lives beside the visible name; read only the name span,
  // never td.textContent (which would append the button's × and break map lookup).
  const visibleName = tr.querySelector(".row-name-with-action > span");
  if (visibleName) return visibleName.textContent.trim();
  return String(tr.cells[nameCol]?.textContent || "").replace(/\s*×\s*$/, "").trim();
}
function parseCellNum(td){
  if (!td) return null;
  const m = td.textContent.replace(/[\u00a0\s]/g, "").match(/^\d+([.,]\d+)?/);
  return m ? parseFloat(m[0].replace(",", ".")) : null;
}
function decorateTable(t, entity){
  const body = t.tBodies[0], head = t.tHead && t.tHead.rows[0]; if (!body || !head) return;
  const trs = [...body.rows].filter(tr => tr.cells.length > 1); if (!trs.length) return;
  const nameCol = [...trs[0].cells].findIndex(td => /[A-Za-zА-Яа-яЁё]/.test(td.textContent));
  if (EXP.bars) [...head.cells].forEach((th, c) => {
    if (c === nameCol || th.classList.contains("spark-th") || /Место|Доля|%|Place|Share|Місце|Частка|Месца|Орын|Үлес/.test(th.textContent)) return;
    const vals = trs.map(tr => parseCellNum(tr.cells[c])), max = Math.max(0, ...vals.filter(v => v !== null));
    if (!max) return;
    trs.forEach((tr, i) => { if (vals[i] === null) return; const p = (vals[i] / max * 100).toFixed(1); tr.cells[c].style.background = `linear-gradient(90deg, rgba(122,162,247,.30) ${p}%, transparent ${p}%)`; tr.cells[c].dataset.barPct = p; tr.cells[c].dataset.barColor = "rgba(122,162,247,.30)"; });
  });
  if (mode === "day") {
    head.querySelectorAll(".spark-th").forEach(x => x.remove());
    t.querySelectorAll(".spark-td").forEach(x => x.remove());
  } else if (EXP.spark && nameCol >= 0) {
    const map = buildSparkMap(entity);
    // Keep the column present even when data/range do not allow a sparkline.
    if (!head.querySelector(".spark-th")) { const th = document.createElement("th"); th.className = "spark-th"; th.textContent = "Динамика"; head.appendChild(th); }
    trs.forEach(tr => {
      if (tr.querySelector(".spark-td")) return;
      const td = document.createElement("td"); td.className = "spark-td";
      const series = map?.get(sparkRowName(tr, nameCol));
      td.innerHTML = series ? sparkSvg(series) : '<span class="spark-empty">—</span>';
      tr.appendChild(td);
    });
    const fr = t.tFoot && t.tFoot.rows[0];
    if (fr && !fr.querySelector(".spark-td")) { const td = document.createElement("td"); td.className = "spark-td"; fr.appendChild(td); }
  }
}
function decorateTables(){
  if (!EXP.spark && !EXP.bars) return;
  EXP_TABLES.forEach(([id, ent]) => { const t = $(id); if (t) decorateTable(t, ent); });
}
(function(){
  const br = $("exp-bars");
  if (br) br.checked = EXP.bars;
  if (br) br.onchange = () => {
    EXP = {spark: true, bars: br.checked};
    try { localStorage.setItem(EXP_KEY, JSON.stringify(EXP)); } catch (e) {}
    try { render(); } catch (e) {}
    try { renderChatRank(); } catch (e) {}
    decorateTables();
  };
  EXP_TABLES.forEach(([id]) => { const t = $(id); if (t && t.tBodies[0]) new MutationObserver(decorateTables).observe(t.tBodies[0], {childList: true}); });
  decorateTables();
})();
/* <<< heat2 */

// Chart settings drawer: every graph type keeps its own appearance and series colours.
function chartColorTargets(){
  const type = currentChartType(), metric = $("metric").value;
  if (type === "heat" || type === "spiral" || type === "heatrows" || type === "heatrows-custom" || type === "pairs" || type === "season") return [];
  if (type === "gini") return [{kind:"g", key:"main", name:"Кривая и доля", v:1}, {kind:"g", key:"top", name:"Доля топ-3", v:1}];
  if (type === "years") {
    const src = chartEntity === "chats" ? chartChatRows(allRows || rows)
      : pick(allRows || rows, $("chat").value).filter(x => { const k = String(x[F.userId] ?? x[F.name]); return isVisibleUser(k) && (!SEL_ACTIVE || SEL.has(k)); });
    const mval = (mode === "day" || mode === "week") && $("day").value ? +$("day").value.slice(5,7) : mode === "month" && $("month").value ? +$("month").value.slice(5,7) : now.getMonth() + 1;
    if (chartEntity === "chats") {
      const totals = new Map();
      src.forEach(x => { const d=String(x[F.date] ?? "").slice(0,10); if (d.length!==10 || +d.slice(5,7)!==mval) return; const k=String(x[F.chatPk] ?? x[F.chat]); const q=totals.get(k)||{kind:"c",key:k,name:String(x[F.chat]||`Чат ${k}`),v:0}; q.v+=Number(g(x,metric))||0; totals.set(k,q); });
      return [...totals.values()].sort((a,b)=>b.v-a.v).slice(0,10);
    }
    const years = new Map(); src.forEach(x=>{ const d=String(x[F.date]??"").slice(0,10); if(d.length!==10||+d.slice(5,7)!==mval)return; const y=d.slice(0,4); years.set(y,{kind:"y",key:y,name:y,v:1}); });
    return [...years.values()].sort((a,b)=>Number(a.key)-Number(b.key));
  }
  if (type === "stack") { const M = stackModel(); return M.err ? [] : M.ser.map(se => ({kind:se.kind, key:String(se.k), name:se.n, v:se.tot})); }
  let list = chartAgg(metric);
  if (type === "donut") {
    const cap = barsCap(chartEntity === "users" && SEL_ACTIVE ? 14 : 8);
    const rest = list.slice(cap).reduce((sum, u) => sum + u.v, 0);
    list = list.slice(0, cap).map(u=>({kind:chartStyleKind(),key:String(u.k),name:u.n,v:u.v}));
    if (rest > 0) list.push({kind:"special", key:"other", name:"Остальные", v:rest});
    return list;
  }
  if (type === "trend" || type === "bump" || type === "spread" || type === "multiples") list = list.slice(0, trendTop());
  else list = list.slice(0, type === "bars" ? barsCap(chartEntity === "users" && SEL_ACTIVE ? 40 : 20) : (chartEntity === "users" && SEL_ACTIVE ? 40 : 20));
  return list.map(u=>({kind:chartStyleKind(),key:String(u.k),name:u.n,v:u.v}));
}
function fontSizeVal(el, commit){
  if (el.value === "") return null;
  let v = Math.round(Number(el.value));
  if (!Number.isFinite(v)) return null;
  if (v < 8 || v > 48) { if (!commit && v < 8) return null; v = Math.min(48, Math.max(8, v)); el.value = v; }
  return v;
}
function renderChartSettingsPanel(){
  const content = $("chart-settings-content"), title = $("chart-settings-title");
  if (!content || !title) return;
  const type = currentChartType(), p = chartPrefs(type), titleName = CHART_TYPE_LABELS[type] || type;
  content.dataset.chartType = type;
  title.textContent = `Настройка · ${titleName}`;
  const field = (label, key, value, aria=label) => `<div class="chart-setting-field"><label>${escH(label)}</label><input type="color" data-chart-appearance="${key}" value="${value}" aria-label="${escH(aria)}"></div>`;
  const range = (label,key,min,max,step,value,group) => `<div class="chart-setting-field"><label>${escH(label)}: <output data-range-value="${key}">${value}</output></label><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-chart-font-size="${key}" aria-label="${escH(label)}" data-text-group="${group}"></div>`;
  const resetButton = `<div class="chart-setting-footer"><button class="mini" type="button" id="chart-settings-reset">Сбросить настройки этого графика</button></div>`;
  const bgMode = p.backgroundMode || "linear";
  const bgModeOptions = `<option value="solid"${bgMode === "solid" ? " selected" : ""}>Один цвет</option><option value="linear"${bgMode === "linear" ? " selected" : ""}>Линейный градиент</option><option value="radial"${bgMode === "radial" ? " selected" : ""}>Радиальный градиент</option>`;
  let html = `<div class="chart-setting-group chart-bg-group"><h3>Фон графика</h3><div class="chart-setting-field"><label for="chart-background-mode">Тип фона</label><select id="chart-background-mode" data-chart-background-mode>${bgModeOptions}</select></div><div class="chart-bg-controls"><div class="chart-setting-field"><label>${bgMode === "solid" ? "Цвет фона" : bgMode === "radial" ? "Цвет в центре" : "Градиент · начало"}</label><input type="color" data-chart-appearance="backgroundStart" value="${p.backgroundStart}" aria-label="Цвет начала фона"></div><div class="chart-setting-field" data-chart-background-end-wrap${bgMode === "solid" ? " hidden" : ""}><label>${bgMode === "radial" ? "Цвет по краям" : "Градиент · конец"}</label><input type="color" data-chart-appearance="backgroundEnd" value="${p.backgroundEnd}" aria-label="Цвет конца фона"></div></div><div class="chart-setting-field" data-chart-background-angle-wrap${bgMode !== "linear" ? " hidden" : ""}><label>Угол градиента: <output data-range-value="backgroundAngle">${Number(p.backgroundAngle ?? 135)}°</output></label><input type="range" min="0" max="360" step="5" value="${Number(p.backgroundAngle ?? 135)}" data-chart-background-angle aria-label="Угол линейного градиента"></div><div class="chart-bg-preview" style="background:${chartBackgroundCss(p)};color:${p.fontColor}"><span>Aa 123 · Пример</span></div></div>`;
  const ts = p.textStyle;
  html += `<div class="chart-setting-group chart-typography-group"><h3>Текст и размеры</h3><div class="chart-typography-grid">`;
  for (const [group,label] of TEXT_STYLE_LABELS) {
    const sizeKey = group + "Size", colorKey = group + "Color";
    html += `<div class="chart-typography-row"><span class="chart-setting-series-name" title="${escH(label)}">${escH(label)}</span><div class="chart-font-range"><input type="number" inputmode="numeric" class="chart-font-num" min="8" max="48" step="1" value="${Number(ts[sizeKey]) || 18}" data-chart-font-size="${sizeKey}" aria-label="Размер: ${escH(label)}" title="Размер шрифта, px" data-text-group="${group}"><span class="chart-font-unit">px</span></div><div class="chart-font-color"><input type="color" data-chart-appearance="${colorKey}" value="${ts[colorKey]}" title="Цвет: ${escH(label)}" aria-label="Цвет: ${escH(label)}"></div></div>`;
  }
  html += `</div></div>`;
  if (type === "donut") {
    const drange = (label,key,min,max,step) => `<div class="chart-setting-field"><label>${label}: <output data-range-value="${key}">${p[key]}</output></label><input type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}" data-chart-donut="${key}" aria-label="${label}"></div>`;
    html += `<div class="chart-setting-group"><h3>Размер кольца</h3>${drange("Диаметр / радиус кольца", "donutRadius", 72, 140, 2)}${drange("Толщина кольца", "donutThickness", 24, 76, 2)}<p class="hint">Размер и толщина регулируются независимо.</p></div>`;
  }
  if (type === "heatrows" || type === "heatrows-custom") {
    const shape = p.heatCellShape === "circle" ? "circle" : "square";
    const circleScale = Math.max(10, Math.min(100, Number(p.heatCircleScale) || 100));
    html += `<div class="chart-setting-group"><h3>Размер и форма ячеек</h3><div class="chart-setting-field"><label for="chart-heat-cell-shape">Форма ячеек</label><select id="chart-heat-cell-shape" data-chart-heat-cell-shape><option value="square"${shape === "square" ? " selected" : ""}>Квадраты</option><option value="circle"${shape === "circle" ? " selected" : ""}>Круги</option></select></div><div class="chart-setting-field"><label>Масштаб сетки: <output data-range-value="heatCellScale">${p.heatCellScale}%</output></label><input type="range" min="60" max="150" step="5" value="${p.heatCellScale}" data-chart-heat-cell-scale="1" aria-label="Масштаб сетки"></div>${shape === "circle" ? `<div class="chart-setting-field"><label>Диаметр кружков: <output data-range-value="heatCircleScale">${circleScale}%</output></label><input type="range" min="10" max="100" step="5" value="${circleScale}" data-chart-heat-circle-size="1" aria-label="Диаметр кружков"></div>` : ""}<div class="chart-setting-field chart-subtitle-toggle"><label><input type="checkbox" data-chart-heat-subtitle${p.showSubtitle !== false ? " checked" : ""}> Показывать подзаголовок</label></div><p class="hint">Масштаб сетки задаёт расстояние между ячейками. Для кругов диаметр регулируется отдельно — вплоть до 10%, без сжатия самой сетки.</p></div>`;
  }
  if (type === "pairs") {
    html += `<div class="chart-setting-group"><h3>Цветовая шкала</h3><div class="chart-palette-fields">${field("Меньше совпадений", "heatC0", p.heat.c[0])}${field("Средне", "heatC1", p.heat.c[Math.floor((p.heat.c.length - 1) / 2)])}${field("Больше совпадений", "heatC2", p.heat.c[p.heat.c.length - 1])}</div></div>` + mainPaletteGroupHtml(type, p);
  }
  if (type === "season") {
    const curColor = p.seriesColors["season:cur"] || "#7aa2f7";
    const avgColor = p.seriesColors["season:avg"] || "#e0af68";
    html += `<div class="chart-setting-group"><h3>Цвета сезонности</h3><div class="chart-palette-fields">${field("Текущий год", "seasonCur", curColor)}${field("Среднее и разброс", "seasonAvg", avgColor)}</div><p class="hint">Второй цвет используется для среднего значения и диапазона прошлых лет.</p></div>` + mainPaletteGroupHtml(type, p);
  }
  if (type === "heatrows-custom") {
    const bands = [...p.customBands].sort((a, b) => a.min - b.min);
    if (bands.length) bands[0].min = 0;
    p.customBands = bands;
    CHART_PREFS[type] = p;
    saveChartPrefs();
    const rows = bands.map((band, i) => {
      const isLast = i === bands.length - 1;
      const boundary = isLast ? band.min : bands[i + 1].min - 1;
      const label = isLast ? "От" : "До";
      const thresholdControl = isLast
        ? `<span class="chart-custom-band-start" aria-label="Начало последнего диапазона">${band.min}</span>`
        : `<input type="number" min="${band.min}" max="${i + 2 < bands.length ? Math.max(band.min, bands[i + 2].min - 2) : 1000000000}" step="1" value="${boundary}" data-custom-band-max="${i}" aria-label="Верхняя граница диапазона ${i + 1}">`;
      return `<div class="chart-custom-band"><label>${label}</label>${thresholdControl}<input type="color" value="${band.color}" data-custom-band-color="${i}" aria-label="Цвет диапазона ${i+1}">${bands.length > 1 ? `<button class="mini" type="button" data-custom-band-remove="${i}" title="Удалить диапазон" aria-label="Удалить диапазон ${i+1}">×</button>` : `<span aria-hidden="true"></span>`}</div>`;
    }).join("");
    html += `<div class="chart-setting-group chart-custom-ranges"><h3>Цвета по значениям — ${chartEntity === "chats" ? "чаты" : "участники"}</h3><p class="hint">Диапазоны и цвета сохраняются отдельно для ${chartEntity === "chats" ? "чатов" : "участников"}. Редактируй границу «До»: следующий цвет начнётся со следующего целого числа. Первый диапазон начинается с 0. У последнего показывается начало «От».</p><div class="chart-custom-bands-list">${rows}</div><button class="mini" type="button" data-custom-band-add="1">+ Добавить диапазон</button></div>` + mainPaletteGroupHtml(type, p);
  }
  if (type === "trend" || type === "years") {
    const trend = type === "years" ? yearsStyle() : {...DEFAULT_TREND_STYLE, ...TREND_STYLE, ...(p.trendStyle || {})};
    const trange = (label,key,min,max,step) => `<div class="chart-setting-field"><label>${label}: <output data-range-value="${key}">${trend[key]}${key === "opacity" ? "%" : ""}</output></label><input type="range" min="${min}" max="${max}" step="${step}" value="${trend[key]}" data-chart-trend="${key}" aria-label="${label}"></div>`;
    html += `<div class="chart-setting-group"><h3>Линии и наконечники</h3>${trange("Толщина линий","line",1,8,.5)}${trange("Размер точек","point",1,10,.5)}${trange("Длина наконечников","arrowLength",6,32,1)}${trange("Ширина наконечников","arrowSize",6,28,1)}</div>`;
  }
  if (type === "heat" || type === "heatrows" || type === "spiral") {
    html += `<div class="chart-setting-group"><h3>Свои цвета</h3><div class="chart-palette-fields">${field("Нет активности","heatZ",p.heat.z)}${field("Мало","heatC0",p.heat.c[0])}${field("Средне","heatC1",p.heat.c[Math.floor((p.heat.c.length - 1) / 2)])}${field("Много","heatC2",p.heat.c[p.heat.c.length - 1])}</div></div>` + mainPaletteGroupHtml(type, p);
  }
  if (type !== "heat" && type !== "heatrows" && type !== "heatrows-custom" && type !== "spiral" && type !== "pairs" && type !== "season") {
    const targets = chartColorTargets();
    const rowsHtml = targets.length ? `<div class="chart-setting-series-list">${targets.map(u=>{
      const key = `${u.kind}:${String(u.key)}`, base = getStyle(u.kind,u.key).c[0], chosen = p.seriesColors[key] || base;
      return `<div class="chart-setting-series"><span class="chart-setting-series-name" title="${escH(u.name)}">${escH(u.name)}</span>${type === "trend" ? `<label class="trend-series-opacity" title="Непрозрачность линии: ${escH(u.name)}"><input type="range" min="0" max="100" step="5" value="${Math.max(0,Math.min(100,Number(p.trendStyle?.seriesOpacity?.[key] ?? 100)))}" data-trend-series-opacity="${escH(key)}" aria-label="Непрозрачность: ${escH(u.name)}"><output>${Math.max(0,Math.min(100,Number(p.trendStyle?.seriesOpacity?.[key] ?? 100)))}%</output></label>` : ""}<input type="color" data-chart-series-color="1" data-series-kind="${escH(u.kind)}" data-series-key="${escH(u.key)}" value="${chosen}" aria-label="Цвет: ${escH(u.name)}"><button class="mini" data-chart-series-reset="1" data-series-kind="${escH(u.kind)}" data-series-key="${escH(u.key)}" type="button" title="Вернуть общий цвет">↺</button></div>`;
    }).join("")}</div>` : `<p class="hint">Нет серий для настройки за выбранный период.</p>`;
    html += `<div class="chart-setting-group"><h3>Цвета ${type === "gini" ? "линий" : chartEntity === "chats" ? "чатов" : type === "years" ? "лет" : "участников"}</h3><p class="hint">Цвета сохраняются отдельно для «${escH(titleName)}».</p>${rowsHtml}</div>` + (targets.some(t => t.kind !== "special") ? mainPaletteGroupHtml(type, p) : "");
  }
  html += resetButton;
  content.innerHTML = html;
}
function openChartSettings(open){
  const panel = $("chart-settings-panel"), btn = $("chart-settings-toggle");
  if (!panel || !btn) return;
  const wantOpen = open === undefined ? !panel.classList.contains("open") : Boolean(open);
  panel.classList.toggle("open", wantOpen); panel.setAttribute("aria-hidden", String(!wantOpen));
  btn.setAttribute("aria-expanded", String(wantOpen));
  if (wantOpen) renderChartSettingsPanel();
}
$("chart-settings-toggle").onclick = () => openChartSettings();
$("chart-settings-close").onclick = () => openChartSettings(false);
$("chart-settings-content").addEventListener("input", e => {
  const type = currentChartType(), p = chartPrefs(type);
  if (type === "heatrows-custom" && e.target?.dataset?.customBandColor !== undefined) {
    const i = Number(e.target.dataset.customBandColor);
    if (!p.customBands[i]) return;
    p.customBands[i].color = e.target.value;
    CHART_PREFS[type] = p; saveChartPrefs(); renderCharts();
    return;
  }
  const key = e.target?.dataset?.chartAppearance;
  if (e.target?.dataset?.chartBackgroundAngle !== undefined) {
    p.backgroundAngle = Number(e.target.value);
    CHART_PREFS[type] = p; saveChartPrefs(); applyChartAppearance(type); renderCharts();
    const output = e.target.parentElement?.querySelector('[data-range-value="backgroundAngle"]'); if (output) output.textContent = `${p.backgroundAngle}°`;
    const preview = $("chart-settings-content")?.querySelector(".chart-bg-preview"); if (preview) preview.style.background = chartBackgroundCss(p);
    return;
  }
  if (e.target?.dataset?.chartFontSize) {
    const k = e.target.dataset.chartFontSize, v = fontSizeVal(e.target);
    if (v == null) return;
    p.textStyle = {...p.textStyle, [k]:v};
    CHART_PREFS[type] = p; saveChartPrefs(); renderCharts();
    const output = e.target.parentElement?.querySelector(`[data-range-value="${k}"]`); if (output) output.textContent = e.target.value;
    return;
  }
  if (e.target?.dataset?.chartDonut) {
    const k = e.target.dataset.chartDonut;
    p[k] = Number(e.target.value); CHART_PREFS[type] = p; saveChartPrefs();
    const output = e.target.parentElement?.querySelector(`[data-range-value="${k}"]`); if (output) output.textContent = e.target.value;
    renderCharts(); return;
  }
  if (e.target?.dataset?.chartHeatCellScale) {
    p.heatCellScale = Number(e.target.value); CHART_PREFS[type] = p; saveChartPrefs();
    const output = e.target.parentElement?.querySelector('[data-range-value="heatCellScale"]'); if (output) output.textContent = e.target.value + "%";
    renderCharts(); return;
  }
  if (e.target?.dataset?.chartHeatCircleSize) {
    p.heatCircleScale = Math.max(10, Math.min(100, Number(e.target.value) || 100));
    CHART_PREFS[type] = p; saveChartPrefs();
    const output = e.target.parentElement?.querySelector('[data-range-value="heatCircleScale"]'); if (output) output.textContent = p.heatCircleScale + "%";
    renderCharts(); return;
  }
  if (key && /^(title|subtitle|labels|values|axis|legend)Color$/.test(key)) {
    p.textStyle = {...p.textStyle, [key]:e.target.value}; CHART_PREFS[type] = p; saveChartPrefs(); renderCharts(); return;
  }
  if (key) {
    if (key === "backgroundStart") p.backgroundStart = e.target.value;
    else if (key === "backgroundEnd") p.backgroundEnd = e.target.value;
    else if (key === "fontColor") p.fontColor = e.target.value;
    else if (key === "heatZ") p.heat.z = e.target.value;
    else if (/^heatC[012]$/.test(key)) {
      // ручная правка: многоцветная шкала сводится к трём опорным цветам (мало · средне · много)
      const c = p.heat.c; if (c.length !== 3) p.heat.c = [c[0], c[Math.floor((c.length - 1) / 2)], c[c.length - 1]];
      p.heat.c[+key.slice(-1)] = e.target.value;
    }
    else if (key === "seasonCur") p.seriesColors = {...p.seriesColors, "season:cur":e.target.value};
    else if (key === "seasonAvg") p.seriesColors = {...p.seriesColors, "season:avg":e.target.value};
    CHART_PREFS[type] = p; saveChartPrefs(); applyChartAppearance(type); renderCharts();
    const preview = $("chart-settings-content")?.querySelector(".chart-bg-preview");
    if (preview) { preview.style.background = chartBackgroundCss(p); preview.style.color = p.fontColor; }
    return;
  }
  if (e.target?.dataset?.chartTrend) {
    const k = e.target.dataset.chartTrend;
    if (type === "years") {
      // У «По годам» свои толщина линий и наконечники — «Динамику» не трогаем.
      const v = clampTrendStyle(k, e.target.value);
      p.trendStyle = {...(p.trendStyle || {}), [k]:v}; CHART_PREFS[type] = p; saveChartPrefs();
      const out = e.target.parentElement?.querySelector(`[data-range-value="${k}"]`); if (out) out.textContent = String(v);
      renderCharts(); return;
    }
    TREND_STYLE[k] = clampTrendStyle(k, e.target.value);
    p.trendStyle = {...(p.trendStyle || {}), [k]:TREND_STYLE[k]};
    CHART_PREFS[type] = p; saveChartPrefs(); saveTrendStyle();
    const out = e.target.parentElement?.querySelector(`[data-range-value="${k}"]`); if (out) out.textContent = `${TREND_STYLE[k]}${k === "opacity" ? "%" : ""}`;
    renderCharts();
    return;
  }
  if (e.target?.dataset?.trendSeriesOpacity !== undefined) {
    const key = e.target.dataset.trendSeriesOpacity;
    const opacity = Math.max(0, Math.min(100, Number(e.target.value) || 0));
    p.trendStyle = {...p.trendStyle, seriesOpacity:{...(p.trendStyle?.seriesOpacity || {}), [key]:opacity}};
    TREND_STYLE = {...TREND_STYLE, seriesOpacity:{...(TREND_STYLE.seriesOpacity || {}), [key]:opacity}};
    CHART_PREFS[type] = p; saveChartPrefs(); saveTrendStyle();
    const out = e.target.parentElement?.querySelector("output"); if (out) out.textContent = `${opacity}%`;
    renderCharts();
    return;
  }
  if (e.target?.dataset?.chartSeriesColor) {
    p.seriesColors = {...p.seriesColors, [`${e.target.dataset.seriesKind}:${e.target.dataset.seriesKey}`]:e.target.value};
    CHART_PREFS[type] = p; saveChartPrefs(); renderCharts();
  }
});
$("chart-settings-content").addEventListener("change", e => {
  const type = currentChartType(), p = chartPrefs(type);
  if (e.target?.dataset?.chartFontSize) {
    const k = e.target.dataset.chartFontSize, v = fontSizeVal(e.target, true);
    if (v == null) { e.target.value = Number(p.textStyle?.[k]) || 18; return; }
    p.textStyle = {...p.textStyle, [k]:v};
    CHART_PREFS[type] = p; saveChartPrefs(); renderCharts();
    return;
  }
  if (type === "heatrows-custom" && e.target?.dataset?.customBandMax !== undefined) {
    const i = Number(e.target.dataset.customBandMax);
    if (!p.customBands[i] || !p.customBands[i + 1]) return;
    p.customBands.sort((a, b) => a.min - b.min);
    const lower = Math.max(0, Math.floor(Number(p.customBands[i].min) || 0));
    const nextBoundary = i + 2 < p.customBands.length ? Math.floor(Number(p.customBands[i + 2].min) || 0) - 2 : 1000000000;
    const maxAllowed = Math.max(lower, nextBoundary);
    const typed = Number(e.target.value);
    const upper = Math.max(lower, Math.min(maxAllowed, Number.isFinite(typed) ? Math.floor(typed) : lower));
    p.customBands[i + 1].min = upper + 1;
    if (p.customBands.length) p.customBands[0].min = 0;
    CHART_PREFS[type] = p; saveChartPrefs(); renderChartSettingsPanel(); renderCharts();
    return;
  }
  if (e.target.matches("[data-chart-background-mode]")) {
    p.backgroundMode = e.target.value;
    CHART_PREFS[type] = p; saveChartPrefs(); applyChartAppearance(type); renderChartSettingsPanel(); renderCharts();
    return;
  }
  if (e.target.matches("[data-chart-heat-cell-shape]")) {
    p.heatCellShape = e.target.value === "circle" ? "circle" : "square";
    CHART_PREFS[type] = p; saveChartPrefs(); renderChartSettingsPanel(); renderCharts();
    return;
  }
  if (e.target.matches("[data-chart-heat-subtitle]")) {
    p.showSubtitle = !!e.target.checked;
    CHART_PREFS[type] = p; saveChartPrefs(); renderCharts();
    return;
  }
});
$("chart-settings-content").addEventListener("click", e => {
  const addCustomBand = e.target.closest("[data-custom-band-add]");
  if (addCustomBand && currentChartType() === "heatrows-custom") {
    const type = currentChartType(), p = chartPrefs(type);
    const maxMin = Math.max(0, ...p.customBands.map(b => Number(b.min) || 0));
    const palette = ["#38bdf8", "#fb923c", "#a3e635", "#f472b6", "#818cf8"];
    p.customBands.push({min:maxMin + 50, color:palette[p.customBands.length % palette.length]});
    CHART_PREFS[type] = p; saveChartPrefs(); renderChartSettingsPanel(); renderCharts(); return;
  }
  const removeCustomBand = e.target.closest("[data-custom-band-remove]");
  if (removeCustomBand && currentChartType() === "heatrows-custom") {
    const type = currentChartType(), p = chartPrefs(type), i = Number(removeCustomBand.dataset.customBandRemove);
    if (p.customBands.length > 1 && Number.isInteger(i) && i >= 0 && i < p.customBands.length) {
      p.customBands.splice(i, 1);
      if (p.customBands.length) p.customBands[0].min = 0;
    }
    CHART_PREFS[type] = p; saveChartPrefs(); renderChartSettingsPanel(); renderCharts(); return;
  }
  const resetSeries = e.target.closest("[data-chart-series-reset]");
  if (resetSeries) {
    const type = currentChartType(), p = chartPrefs(type), key = `${resetSeries.dataset.seriesKind}:${resetSeries.dataset.seriesKey}`;
    delete p.seriesColors[key]; CHART_PREFS[type] = p; saveChartPrefs(); renderChartSettingsPanel(); renderCharts(); return;
  }
  if (e.target.closest("#chart-settings-reset")) {
    const type = currentChartType();
    delete CHART_PREFS[type];
    if (type === "trend") { TREND_STYLE = {...DEFAULT_TREND_STYLE}; saveTrendStyle(); }
    saveChartPrefs();
    applyChartAppearance(type); loadTrendStyleForChartType(type);
    renderChartSettingsPanel(); renderCharts();
  }
});

/* ---------- Пользовательская ширина столбцов и всей таблицы ---------- */
const COLUMN_WIDTH_STORAGE_KEY = "chatstats.columnWidths.v1";
const TABLE_WIDTH_STORAGE_KEY = "chatstats.tableWidths.v1";
let savedColumnWidths = {}, savedTableWidths = {};
try { savedColumnWidths = JSON.parse(localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY) || "{}"); } catch (e) { savedColumnWidths = {}; }
try { savedTableWidths = JSON.parse(localStorage.getItem(TABLE_WIDTH_STORAGE_KEY) || "{}"); } catch (e) { savedTableWidths = {}; }
let columnResizeDrag = null, tableWidthResizeDrag = null, columnScanQueued = false;
function columnTableKey(table){
  if (table.id) return table.id;
  if (table.dataset.resizeKey) return table.dataset.resizeKey;
  const tab = table.closest(".tab");
  const siblingTables = [...(tab || document).querySelectorAll("table")].filter(t => !t.closest(".sticky-table-head") && !t.closest(".table-image-measure"));
  const index = Math.max(0, siblingTables.indexOf(table)) + 1;
  return `${tab?.id || "page"}-table-${index}`;
}
function realTableForResizeKey(key){
  return [...document.querySelectorAll("table[data-resize-key]")].find(t => t.dataset.resizeKey === key && !t.closest(".sticky-table-head") && !t.closest(".table-image-measure")) || null;
}
function ensureColumnGroup(table, count){
  let group = table.querySelector(":scope > colgroup[data-user-resize]");
  if (!group){
    group = document.createElement("colgroup"); group.dataset.userResize = "true";
    table.insertBefore(group, table.tHead || table.firstChild);
  }
  while (group.children.length < count) group.appendChild(document.createElement("col"));
  while (group.children.length > count) group.lastElementChild.remove();
  return group;
}
function applyColumnWidths(table, widths){
  if (!table || !widths?.length) return;
  const head = table.tHead?.rows?.[0];
  if (!head || head.cells.length !== widths.length || [...head.cells].some(c => c.colSpan !== 1)) return;
  const group = ensureColumnGroup(table, widths.length);
  widths.forEach((value, i) => { group.children[i].style.width = `${Math.round(value)}px`; });
  table.classList.add("resizable-columns");
  table.style.tableLayout = "fixed";
}
function saveColumnWidths(table, widths){
  if (!table || !widths?.length) return;
  savedColumnWidths[table.dataset.resizeKey || columnTableKey(table)] = widths.map(v => Math.round(v));
  try { localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(savedColumnWidths)); } catch (e) {}
}
function currentColumnWidths(table){
  const head = table.tHead?.rows?.[0];
  if (!head) return [];
  const key = table.dataset.resizeKey || columnTableKey(table);
  const stored = savedColumnWidths[key];
  if (Array.isArray(stored) && stored.length === head.cells.length && stored.every(v => Number.isFinite(Number(v)) && Number(v) > 0)) return stored.map(Number);
  return [...head.cells].map(cell => Math.max(48, cell.getBoundingClientRect().width));
}
function saveTableOuterWidth(table, width, marginLeft, marginRight){
  if (!table || !Number.isFinite(width)) return;
  const key = table.dataset.resizeKey || columnTableKey(table);
  savedTableWidths[key] = {
    width: Math.round(width),
    marginLeft: Math.round(Number(marginLeft) || 0),
    marginRight: Math.round(Number(marginRight) || 0)
  };
  try { localStorage.setItem(TABLE_WIDTH_STORAGE_KEY, JSON.stringify(savedTableWidths)); } catch (e) {}
}
function applyTableOuterWidth(table, width, marginLeft, marginRight){
  if (!table || !Number.isFinite(width)) return;
  // В виде карточек сохранённая ширина таблицы не применяется: карточки занимают всю ширину сайта.
  if (table.classList.contains("tv-cards")) return;
  const minWidth = 80;
  const bounded = Math.max(minWidth, Math.min(12000, Math.round(width)));
  table.classList.add("resizable-table-width");
  table.style.setProperty("width", `${bounded}px`, "important");
  table.style.setProperty("min-width", "0px", "important");
  table.style.setProperty("max-width", "none", "important");
  // Put the horizontal offset and measured width on the wrap itself so the visible border follows the table.
  // The table has no internal outer margin; outer-left dragging moves the wrapper, while right dragging only resizes it.
  table.style.setProperty("margin-left", "0px", "important");
  table.style.setProperty("margin-right", "0px", "important");
  table.style.setProperty("--table-sticky-left", "0px", "important");
  const wrap = table.closest(".wrap");
  if (wrap) {
    wrap.classList.add("resizable-table-wrap");
    // .wrap uses border-box sizing; add its two border pixels around the table's width.
    wrap.style.setProperty("width", `${bounded + 2}px`, "important");
    wrap.style.setProperty("max-width", "100%", "important");
    wrap.style.setProperty("margin-left", "auto", "important");
    wrap.style.setProperty("margin-right", "auto", "important");
  }
}
function applySavedTableOuterWidth(table){
  const key = table.dataset.resizeKey || columnTableKey(table);
  const saved = savedTableWidths[key];
  const width = typeof saved === "number" ? saved : Number(saved?.width);
  if (!Number.isFinite(width) || width < 80) return;
  const left = typeof saved === "object" && Number.isFinite(Number(saved.marginLeft)) ? Number(saved.marginLeft) : 0;
  const right = typeof saved === "object" && Number.isFinite(Number(saved.marginRight)) ? Number(saved.marginRight) : 0;
  applyTableOuterWidth(table, width, left, right);
}
function ensureOuterResizeHandles(table){
  const row = table.tHead?.rows?.[0] || table.rows?.[0];
  if (!row || !row.cells.length) return;
  table.classList.add("resizable-table-width");
  const edges = [[row.cells[0], "left", "Изменить ширину таблицы с левого края. Двойной клик — выровнять столбцы по содержимому"], [row.cells[row.cells.length - 1], "right", "Изменить ширину таблицы с правого края. Двойной клик — выровнять столбцы по содержимому"]];
  for (const [cell, side, label] of edges){
    cell.classList.add("table-outer-resize-cell");
    if (cell.querySelector(`:scope > .table-outer-resize-handle.${side}`)) continue;
    const handle = document.createElement("span");
    handle.className = `table-outer-resize-handle ${side}`;
    handle.dataset.noExport = "true";
    handle.dataset.tableResizeSide = side;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", label);
    handle.title = label;
    handle.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); });
    cell.appendChild(handle);
  }
}
// Выравнивание: сбрасывает ручные ширины столбцов и таблицы — каждый столбец снова занимает ровно столько, сколько нужно его содержимому.
function autoFitTable(any){
  const key = any?.dataset?.resizeKey || (any && columnTableKey(any));
  const table = (key && realTableForResizeKey(key)) || any; if (!table) return;
  delete savedColumnWidths[key]; delete savedTableWidths[key];
  try { localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, JSON.stringify(savedColumnWidths)); localStorage.setItem(TABLE_WIDTH_STORAGE_KEY, JSON.stringify(savedTableWidths)); } catch (e) {}
  const tables = [table, ...document.querySelectorAll(".sticky-table-head table")].filter(t => t === table || t.dataset.resizeKey === key);
  tables.forEach(t => {
    t.querySelector(":scope > colgroup[data-user-resize]")?.remove();
    ["table-layout", "width", "min-width", "max-width", "margin-left", "margin-right", "--table-sticky-left"].forEach(p => t.style.removeProperty(p));
    t.classList.remove("resizable-table-width");
    const wrap = t.closest(".wrap");
    if (wrap) { wrap.classList.remove("resizable-table-wrap"); ["width", "max-width", "margin-left", "margin-right"].forEach(p => wrap.style.removeProperty(p)); }
  });
  ensureOuterResizeHandles(table);
  try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  if (typeof toastMsg === "function") toastMsg("Столбцы выровнены по содержимому");
}
document.addEventListener("dblclick", e => {
  const h = e.target.closest?.(".column-resize-handle, .table-outer-resize-handle"); if (!h) return;
  e.preventDefault(); e.stopPropagation();
  autoFitTable(h.closest("table"));
}, true);
function setupResizableTable(table){
  if (!table || table.closest(".table-image-measure") || table.closest(".sticky-table-head")) return;
  if (!table.dataset.resizeKey) table.dataset.resizeKey = columnTableKey(table);
  applySavedTableOuterWidth(table);
  ensureOuterResizeHandles(table);
  const head = table.tHead?.rows?.[0];
  // Outer width can be changed for every table, including tables without a conventional multi-column header.
  if (!head || head.cells.length < 2 || [...head.cells].some(c => c.colSpan !== 1)) return;
  table.classList.add("resizable-columns");
  const key = table.dataset.resizeKey;
  const widths = savedColumnWidths[key];
  const existingGroup = table.querySelector(":scope > colgroup[data-user-resize]");
  if (Array.isArray(widths) && widths.length === head.cells.length) applyColumnWidths(table, widths.map(Number));
  else if (existingGroup && existingGroup.children.length !== head.cells.length) { existingGroup.remove(); table.style.tableLayout = ""; }
  [...head.cells].forEach((th, i) => {
    if (i === head.cells.length - 1) return;
    if (th.querySelector(":scope > .column-resize-handle")) return;
    const handle = document.createElement("span");
    handle.className = "column-resize-handle";
    handle.dataset.noExport = "true";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", `Изменить ширину столбца «${(th.textContent || "").trim()}»`);
    handle.title = "Перетащите границу, чтобы изменить ширину столбцов. Двойной клик — выровнять все столбцы по содержимому";
    handle.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); });
    th.appendChild(handle);
  });
}
function scanResizableTables(){
  columnScanQueued = false;
  document.querySelectorAll("table").forEach(setupResizableTable);
}
function scheduleColumnScan(){
  if (columnScanQueued) return;
  columnScanQueued = true;
  requestAnimationFrame(scanResizableTables);
}
const columnTableObserver = new MutationObserver(records => {
  // Only rescan when table markup/headers were changed; chart SVG updates are ignored.
  if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches?.("table,thead,tr,th") || n.querySelector?.("table,thead,tr,th"))))) scheduleColumnScan();
});
columnTableObserver.__hub(document.body);
scanResizableTables();
function scaleColumnWidthsForTable(widths, requestedWidth){
  if (!widths?.length) return [];
  const min = 48;
  const target = Math.max(widths.length * min, requestedWidth);
  const extras = widths.map(v => Math.max(1, Number(v) - min));
  const extraTotal = extras.reduce((a,b) => a+b, 0) || widths.length;
  const result = widths.map((v,i) => min + Math.max(0, target - widths.length * min) * extras[i] / extraTotal);
  // Correct rounding drift on the last column so the total remains aligned to the outer table width.
  result[result.length - 1] += target - result.reduce((a,b) => a+b, 0);
  return result;
}
document.addEventListener("pointerdown", e => {
  const outerHandle = e.target.closest?.(".table-outer-resize-handle");
  if (outerHandle) {
    e.preventDefault(); e.stopPropagation();
    const source = outerHandle.closest("table");
    const key = source?.dataset.resizeKey;
    const table = realTableForResizeKey(key);
    if (!table) return;
    // Dragging can start on either the original header or its floating sticky clone;
    // the key always resolves to the original table that owns the dimensions.
    const rect = table.getBoundingClientRect();
    const wrap = table.closest(".wrap");
    const computed = getComputedStyle(wrap || table);
    const startMarginLeft = Number.parseFloat(computed.marginLeft) || 0;
    const startMarginRight = Number.parseFloat(computed.marginRight) || 0;
    const head = table.tHead?.rows?.[0];
    const initialWidths = currentColumnWidths(table);
    const canResizeColumns = !!(head && head.cells.length >= 2 && head.cells.length === initialWidths.length && [...head.cells].every(c => c.colSpan === 1));
    tableWidthResizeDrag = {
      table, key, side: outerHandle.dataset.tableResizeSide || "right", startX:e.clientX,
      startWidth:rect.width, startMarginLeft, startMarginRight,
      initialWidths:canResizeColumns ? initialWidths : [],
      minWidth:canResizeColumns ? initialWidths.length * 48 : 80,
      widthLive:rect.width, marginLeftLive:startMarginLeft, marginRightLive:startMarginRight
    };
    document.body.classList.add("table-width-resizing");
    try { outerHandle.setPointerCapture(e.pointerId); } catch (err) {}
    return;
  }
  const handle = e.target.closest?.(".column-resize-handle");
  if (!handle) return;
  e.preventDefault(); e.stopPropagation();
  const handleTable = handle.closest("table");
  const key = handleTable?.dataset.resizeKey;
  const table = realTableForResizeKey(key);
  if (!table) return;
  const row = handle.closest("tr"), index = [...row.cells].indexOf(handle.closest("th"));
  const widths = currentColumnWidths(table);
  if (index < 0 || index >= widths.length - 1) return;
  columnResizeDrag = {table, key, index, startX:e.clientX, widths, pointerId:e.pointerId};
  document.body.classList.add("column-resizing");
  try { handle.setPointerCapture(e.pointerId); } catch (err) {}
}, true);
document.addEventListener("pointermove", e => {
  if (tableWidthResizeDrag) {
    const d = tableWidthResizeDrag;
    const delta = e.clientX - d.startX;
    // Таблица растёт симметрично от центра, поэтому край смещается вдвое меньше ширины.
    const rawWidth = d.side === "left" ? d.startWidth - 2 * delta : d.startWidth + 2 * delta;
    const nextWidth = Math.max(d.minWidth, Math.min(12000, rawWidth));
    const effectiveDelta = d.side === "left" ? d.startWidth - nextWidth : nextWidth - d.startWidth;
    // Never let the left handle move outside the scroll container: negative margins hide it under .wrap overflow,
    // so clamp to the visible left edge. Beyond that point the table grows to the right and remains resizable.
    const nextMarginLeft = d.side === "left" ? Math.max(0, d.startMarginLeft + effectiveDelta) : d.startMarginLeft;
    if (d.initialWidths.length) {
      const nextColumns = scaleColumnWidthsForTable(d.initialWidths, nextWidth);
      applyColumnWidths(d.table, nextColumns);
      d.widthsLive = nextColumns;
    }
    applyTableOuterWidth(d.table, nextWidth, nextMarginLeft, d.startMarginRight);
    d.widthLive = nextWidth;
    d.marginLeftLive = nextMarginLeft;
    d.marginRightLive = d.startMarginRight;
    return;
  }
  if (!columnResizeDrag) return;
  const {table,index,startX,widths} = columnResizeDrag;
  const delta = e.clientX - startX;
  const minWidth = 48;
  const bounded = Math.max(minWidth - widths[index], Math.min(widths[index+1] - minWidth, delta));
  const next = widths.slice(); next[index] = widths[index] + bounded; next[index+1] = widths[index+1] - bounded;
  columnResizeDrag.widthsLive = next;
  applyColumnWidths(table, next);
}, true);
function finishOuterTableResize(){
  if (!tableWidthResizeDrag) return;
  const d = tableWidthResizeDrag;
  saveTableOuterWidth(d.table, d.widthLive, d.marginLeftLive, d.marginRightLive);
  if (d.widthsLive) saveColumnWidths(d.table, d.widthsLive);
  document.body.classList.remove("table-width-resizing");
  tableWidthResizeDrag = null;
}
function finishColumnResize(){
  if (!columnResizeDrag) return;
  const {table,widths,widthsLive} = columnResizeDrag;
  const finalWidths = widthsLive || widths;
  saveColumnWidths(table, finalWidths);
  document.body.classList.remove("column-resizing");
  columnResizeDrag = null;
}
document.addEventListener("pointerup", finishOuterTableResize, true);
document.addEventListener("pointercancel", finishOuterTableResize, true);
document.addEventListener("pointerup", finishColumnResize, true);
document.addEventListener("pointercancel", finishColumnResize, true);

// Keep a pinned site header and a single floating table-header row visible while scrolling.
(function installStickyHeaders(){
  const siteHeader = document.querySelector("body > header");
  if (!siteHeader) return;
  const overlay = document.createElement("div");
  overlay.className = "sticky-table-head";
  overlay.setAttribute("aria-label", "Закреплённый заголовок таблицы");
  document.body.appendChild(overlay);
  let sourceTable = null, sourceWrap = null, clonedTable = null, sourceShape = "", rafPending = false;

  function hideOverlay(){ overlay.style.display = "none"; sourceTable = sourceWrap = clonedTable = null; sourceShape = ""; overlay.replaceChildren(); }
  // Закрепляем только строку с названиями столбцов — последнюю строку шапки. Строки над ней
  // (например, столбики итогов в «Матрице») объединяют ячейки, и их копия наезжала текстом друг на друга.
  const labelRow = table => table.tHead.rows[table.tHead.rows.length - 1];
  function shapeOf(table){
    const widths = [...labelRow(table).cells].map(cell => cell.getBoundingClientRect().width.toFixed(2)).join(",");
    return table.tHead.innerHTML + "|" + widths + "|" + table.getBoundingClientRect().width.toFixed(2);
  }
  function buildClone(table, wrap){
    overlay.replaceChildren();
    const clone = document.createElement("table");
    clone.className = "sticky-table-clone" + (table.classList.contains("dm-table") ? " dm-table" : "");
    if (table.dataset.resizeKey) clone.dataset.resizeKey = table.dataset.resizeKey;
    const head = document.createElement("thead");
    head.appendChild(labelRow(table).cloneNode(true));
    head.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    const row = head.rows[0];
    const originals = [...labelRow(table).cells];
    // Столбцы, скрытые через «Столбцы», в настоящей таблице спрятаны CSS-правилом, а у копии такого правила нет — убираем их из копии.
    [...row.cells].forEach((cell, i) => { if (originals[i] && getComputedStyle(originals[i]).display === "none") cell.remove(); });
    const shown = originals.filter(o => getComputedStyle(o).display !== "none");
    [...row.cells].forEach((cell, i) => {
      cell.removeAttribute("id");
      cell.style.width = `${shown[i]?.getBoundingClientRect().width || cell.getBoundingClientRect().width}px`;
      cell.style.minWidth = cell.style.width;
      cell.style.boxSizing = "border-box";
      cell.tabIndex = shown[i]?.dataset?.k ? 0 : -1;
    });
    clone.appendChild(head);
    clone.style.width = `${Math.max(table.getBoundingClientRect().width, table.scrollWidth)}px`;
    overlay.appendChild(clone);
    sourceTable = table; sourceWrap = wrap; clonedTable = clone; sourceShape = shapeOf(table);
  }
  function updateOverlay(){
    rafPending = false;
    const activeTab = document.querySelector(".tab.active");
    if (!activeTab) { hideOverlay(); return; }
    const headerBottom = siteHeader.getBoundingClientRect().bottom;
    let candidate = null, bestTop = -Infinity;
    activeTab.querySelectorAll(".wrap table").forEach(table => {
      if (!table.tHead || !table.tHead.rows.length || !table.getClientRects().length || table.classList.contains("tv-cards") || !table.tHead.getClientRects().length) return;
      const wrap = table.closest(".wrap"); if (!wrap || !wrap.getClientRects().length) return;
      const headRect = table.tHead.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const lblRect = labelRow(table).getBoundingClientRect();
      if (lblRect.top < headerBottom - 1 && tableRect.bottom > headerBottom + 2 && wrapRect.bottom > headerBottom + 2 && headRect.top > bestTop) {
        candidate = {table, wrap}; bestTop = headRect.top;
      }
    });
    if (!candidate) { hideOverlay(); return; }
    const {table, wrap} = candidate;
    const shape = shapeOf(table);
    if (sourceTable !== table || sourceWrap !== wrap || !clonedTable || sourceShape !== shape) buildClone(table, wrap);
    const wrapRect = wrap.getBoundingClientRect();
    const top = Math.max(0, Math.min(window.innerHeight - 24, siteHeader.getBoundingClientRect().bottom));
    overlay.style.display = "block";
    overlay.style.left = `${wrapRect.left + wrap.clientLeft}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${wrap.clientWidth}px`;
    const rowH = labelRow(table).getBoundingClientRect().height;
    overlay.style.height = `${rowH}px`;
    clonedTable.style.transform = `translateX(${-wrap.scrollLeft}px)`;
    clonedTable.style.height = `${rowH}px`;
  }
  function schedule(){ if (!rafPending) { rafPending = true; requestAnimationFrame(updateOverlay); } }
  document.addEventListener("scroll", schedule, {passive:true, capture:true});
  window.addEventListener("resize", schedule, {passive:true});
  document.querySelectorAll(".wrap").forEach(w => w.addEventListener("scroll", schedule, {passive:true}));
  overlay.addEventListener("click", e => {
    if (!sourceTable) return;
    const dm = e.target.closest("th[data-dm-sort]");
    if (dm) { const o = sourceTable.tHead.querySelector(`th[data-dm-sort="${dm.dataset.dmSort}"]`); if (o) o.click(); return; }
    const th = e.target.closest("th[data-k]"); if (!th) return;
    const k = th.dataset.k;
    const original = [...sourceTable.tHead.querySelectorAll("th[data-k]")].find(item => item.dataset.k === k);
    if (original) original.click();
  });
  overlay.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const th = e.target.closest("th[data-k]"); if (th) { e.preventDefault(); th.click(); }
  });
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector("main"), {subtree:true, childList:true, attributes:true, attributeFilter:["class","hidden"]});
  schedule();
})();


/* ---------- Прогноз к концу месяца / года ---------- */
let fcPeriod = "month", fcEntity = "users";
// Номер дня по строке даты; результаты запоминаются — функция вызывается десятки тысяч раз.
const DAY_IDX = new Map();
const dayIdx = v => { let r = DAY_IDX.get(v); if (r === undefined) { const a = v.split("-").map(Number); r = Math.round(Date.UTC(a[0], a[1] - 1, a[2]) / 864e5); if (DAY_IDX.size > 50000) DAY_IDX.clear(); DAY_IDX.set(v, r); } return r; };
function fcBounds(period){
  const t = new Date(), y = t.getFullYear(), m = t.getMonth();
  if (period === "year") return {start:`${y}-01-01`, end:`${y}-12-31`, prevStart:`${y - 1}-01-01`, prevEnd:`${y - 1}-12-31`, label:`${y} год`, prevLabel:`${y - 1} год`};
  const pl = new Date(y, m, 0);
  return {start:`${y}-${pad(m + 1)}-01`, end:`${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`, prevStart:iso(new Date(y, m - 1, 1)), prevEnd:iso(pl), label:`${MONTHS[m]} ${y}`, prevLabel:`${MONTHS[pl.getMonth()]} ${pl.getFullYear()}`};
}
function sumRange(daily, from, to){ let s = 0; daily.forEach((v, d) => { if (d >= from && d <= to) s += v; }); return s; }
function fcCompute(daily, b){
  const t = new Date(), today = iso(t), yesterday = addDaysIso(today, -1);
  const daysTotal = dayIdx(b.end) - dayIdx(b.start) + 1;
  const elapsedFull = Math.max(0, Math.min(daysTotal, dayIdx(today) - dayIdx(b.start)));
  const current = sumRange(daily, b.start, today);
  const last14 = sumRange(daily, addDaysIso(today, -14), yesterday) / 14;
  const avgPeriod = elapsedFull ? sumRange(daily, b.start, yesterday) / elapsedFull : last14;
  const w = Math.min(1, elapsedFull / 14) * 0.6;
  const rate = w * avgPeriod + (1 - w) * last14;
  const frac = (t.getHours() * 60 + t.getMinutes()) / 1440;
  const remaining = Math.max(0, daysTotal - elapsedFull - frac);
  const forecast = current + rate * remaining;
  const last30 = Array.from({length: 30}, (_, i) => daily.get(addDaysIso(today, -(i + 1))) || 0);
  const mean = last30.reduce((a, v) => a + v, 0) / 30;
  const sd = Math.sqrt(last30.reduce((a, v) => a + (v - mean) ** 2, 0) / 30);
  const spread = 1.28 * sd * Math.sqrt(remaining);
  const prevSameEnd = addDaysIso(b.prevStart, elapsedFull);
  return {current, rate, forecast, lo: Math.max(current, forecast - spread), hi: forecast + spread, remaining, daysTotal, elapsed: elapsedFull + 1,
    prevFull: sumRange(daily, b.prevStart, b.prevEnd), prevSame: sumRange(daily, b.prevStart, prevSameEnd < b.prevEnd ? prevSameEnd : b.prevEnd)};
}
function fcDailyMaps(src, entity, chat, metric){
  const base = entity === "chats" ? chatRowsForChart(src) : pick(src, chat);
  const per = new Map(), total = new Map();
  base.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10) return;
    const k = entity === "chats" ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    if (entity === "users" && !isVisibleUser(k)) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    let e = per.get(k);
    if (!e) { e = {k, name: entity === "chats" ? String(x[F.chat] || `Чат ${k}`) : who(x), daily: new Map()}; per.set(k, e); }
    e.daily.set(d, (e.daily.get(d) || 0) + v);
    total.set(d, (total.get(d) || 0) + v);
  });
  return {per, total};
}
function fcRecord(totalDaily, period, b){
  const m = new Map();
  totalDaily.forEach((v, d) => { if (d >= b.start) return; const k = period === "year" ? d.slice(0, 4) : d.slice(0, 7); m.set(k, (m.get(k) || 0) + v); });
  let best = null; m.forEach((v, k) => { if (!best || v > best.v) best = {k, v}; });
  if (!best) return null;
  best.label = period === "year" ? `${best.k} год` : `${MONTHS[+best.k.slice(5) - 1]} ${best.k.slice(0, 4)}`;
  return best;
}
function fcStatus(t, err){ const el = $("fc-status"); el.textContent = t; el.className = "status" + (err ? " err" : ""); }
function pctDelta(cur, prev){
  if (!prev) return "";
  const p = Math.round((cur - prev) / prev * 100);
  return `<span class="compare-diff ${p > 0 ? "positive" : p < 0 ? "negative" : "neutral"}">${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p)}%</span>`;
}
function fcChartSvg(daily, b, T, title = "", subtitle = ""){
  const p = chartPrefs("forecast"), o = fcOpts(p), showSub = p.showSubtitle !== false;
  const W = 900, L = 70, R = 870, Tp = title ? (showSub ? 100 : 76) : 30, B = Tp + 290, H = B + 84, n = T.daysTotal, el = Math.min(T.elapsed, n);
  const cum = []; let s = 0;
  for (let i = 0; i < el; i++) { s += daily.get(addDaysIso(b.start, i)) || 0; cum.push(s); }
  const prevLen = dayIdx(b.prevEnd) - dayIdx(b.prevStart) + 1, pc = []; s = 0;
  for (let i = 0; i < Math.min(prevLen, n); i++) { s += daily.get(addDaysIso(b.prevStart, i)) || 0; pc.push(s); }
  const {max, step} = niceMax(Math.max(T.hi, pc[pc.length - 1] || 0, 1));
  const sx = i => L + i / Math.max(1, n - 1) * (R - L), sy = v => B - v / max * (B - Tp), K = max >= 10000;
  let out = "";
  if (title) out += `<text class="chart-title" x="${W / 2}" y="42" text-anchor="middle" font-size="26">${escH(title)}</text>`;
  if (title && subtitle && showSub) out += `<text class="chart-subtitle" x="${W / 2}" y="70" text-anchor="middle" font-size="15">${escH(subtitle)}</text>`;
  for (let v = 0; v <= max + 1e-9; v += step)
    out += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.08"/><text class="chart-axis" x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" text-anchor="end" font-size="14">${K && v ? fmt(v / 1000) + "K" : fmt(v)}</text>`;
  const ticks = [];
  if (n > 40) { for (let m = 0; m < 12; m++) ticks.push([dayIdx(`${b.start.slice(0, 4)}-${pad(m + 1)}-01`) - dayIdx(b.start), MONTHS_SHORT[m]]); }
  else [1, 5, 10, 15, 20, 25, n].filter((d, i, a) => d <= n && a.indexOf(d) === i && !(d !== n && n - d < 3)).forEach(d => ticks.push([d - 1, String(d)]));
  ticks.forEach(([i, lab]) => { out += `<line x1="${sx(i).toFixed(1)}" y1="${B}" x2="${sx(i).toFixed(1)}" y2="${B + 6}" stroke="#dcdcdc" stroke-width="2"/><text class="chart-axis" x="${sx(i).toFixed(1)}" y="${B + 26}" text-anchor="middle" font-size="14">${lab}</text>`; });
  out += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-width="2"/>`;
  if (pc.length > 1) out += `<polyline points="${pc.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${o.prev}" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>`;
  const e0 = el - 1;
  if (e0 < n - 1) {
    out += `<polygon points="${sx(e0).toFixed(1)},${sy(T.current).toFixed(1)} ${sx(n - 1).toFixed(1)},${sy(T.hi).toFixed(1)} ${sx(n - 1).toFixed(1)},${sy(T.lo).toFixed(1)}" fill="${o.fcst}" fill-opacity="0.16"/>`;
    out += `<line x1="${sx(e0).toFixed(1)}" y1="${sy(T.current).toFixed(1)}" x2="${sx(n - 1).toFixed(1)}" y2="${sy(T.forecast).toFixed(1)}" stroke="${o.fcst}" stroke-width="3" stroke-dasharray="10 8" stroke-linecap="round"/>`;
    out += `<circle cx="${sx(n - 1).toFixed(1)}" cy="${sy(T.forecast).toFixed(1)}" r="5" fill="${o.fcst}"/><text class="chart-value" x="${(sx(n - 1) - 10).toFixed(1)}" y="${(sy(T.forecast) - 12).toFixed(1)}" text-anchor="end" font-size="15">≈ ${fmt(Math.round(T.forecast))}</text>`;
  }
  if (cum.length > 1) {
    const gid = "fcArea" + Math.random().toString(36).slice(2, 8), top = Math.min(...cum.map(sy));
    out += `<defs><linearGradient id="${gid}" x1="0" y1="${top.toFixed(1)}" x2="0" y2="${B}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${o.fact}" stop-opacity=".4"/><stop offset=".45" stop-color="${o.fact}" stop-opacity=".12"/><stop offset=".82" stop-color="${o.fact}" stop-opacity="0"/></linearGradient></defs>`;
    out += `<polygon class="li-area" points="${sx(0).toFixed(1)},${B} ${cum.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ")} ${sx(cum.length - 1).toFixed(1)},${B}" fill="url(#${gid})"/>`;
  }
  if (cum.length) {
    out += `<polyline class="anim-line" pathLength="1" points="${cum.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${o.fact}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    out += `<circle cx="${sx(e0).toFixed(1)}" cy="${sy(T.current).toFixed(1)}" r="5.5" fill="${o.fact}"/>`;
  }
  const legend = [[o.fact, "Факт", ""], [o.fcst, "Прогноз и диапазон", "8 6"], [o.prev, b.prevLabel, "3 5"]];
  const legW = legend.map(([, t]) => 34 + String(t).length * 8.4), gapL = 26;
  let lx = W / 2 - (legW.reduce((a, v) => a + v, 0) + gapL * (legend.length - 1)) / 2;
  const ly = B + 64;
  legend.forEach(([c, t, dash], i) => {
    out += `<line x1="${lx.toFixed(1)}" y1="${ly - 5}" x2="${(lx + 22).toFixed(1)}" y2="${ly - 5}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/><text class="chart-legend" x="${(lx + 30).toFixed(1)}" y="${ly}" font-size="14">${escH(t)}</text>`;
    lx += legW[i] + gapL;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${out}</svg>`;
}
async function loadForecast(){
  if (!allRows) $("fc-out").innerHTML = skPage(5, 2);
  try {
    await getHistory();
    if (hideLeft) { try { await ensureUserMetrics(); } catch (e) { leftFilterError = e.message || String(e); } }
    fillChatSel($("fc-chat"), allRows);
    fcStatus(hideLeft && leftFilterError ? `Не удалось получить статусы участников: ${leftFilterError}. Вышедшие не отфильтрованы.` : "");
    renderForecast();
  } catch (e) { fcStatus("Не удалось загрузить историю: " + e.message, true); }
}
function renderForecast(){
  if (!allRows) return;
  const metric = $("fc-metric").value, b = fcBounds(fcPeriod), chats = fcEntity === "chats";
  $("fc-chat-field").hidden = chats;
  const {per, total} = fcDailyMaps(allRows, fcEntity, chats ? "" : $("fc-chat").value, metric);
  const T = fcCompute(total, b), rec = fcRecord(total, fcPeriod, b);
  const word = fcPeriod === "year" ? "года" : "месяца", unit = MLBL[metric].toLowerCase();
  const tile = (lbl, num, place) => `<div class="tile"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${place}</div></div>`;
  const recPlace = rec ? `${escH(rec.label)} · ${T.forecast >= rec.v ? "по прогнозу рекорд будет побит" : `до рекорда по прогнозу не хватит ${fmt(Math.round(rec.v - T.forecast))}`}` : "нет прошлых периодов";
  const tiles = `<div class="tiles">
    ${tile(`Сейчас · ${escH(b.label)}`, fmt(T.current), `день ${Math.min(T.elapsed, T.daysTotal)} из ${T.daysTotal}`)}
    ${tile(`Прогноз к концу ${word}`, `≈ ${fmt(Math.round(T.forecast))}`, `диапазон ${fmt(Math.round(T.lo))}–${fmt(Math.round(T.hi))}`)}
    ${tile("Темп", fmtR(T.rate), `${unit} в день`)}
    ${tile(escH(b.prevLabel), fmt(T.prevFull), `на эту же дату: ${fmt(T.prevSame)} ${pctDelta(T.current, T.prevSame)}`)}
    ${tile(`Рекорд ${fcPeriod === "year" ? "года" : "месяца"}`, rec ? fmt(rec.v) : "—", recPlace)}
  </div>`;
  const scopeName = chats ? "все чаты" : ($("fc-chat").value || "все чаты");
  const chart = `<div class="section-head"><h2>Накопительно: факт и прогноз</h2><button class="mini copy-btn" id="fc-copy-chart" type="button">Копировать</button></div><div class="chart fc-chart" id="fc-chart">${fcChart("fc-chart", total, b, T, `Прогноз · ${b.label}`, `${MLBL[metric]}, ${scopeName}, накопительно`)}</div>`;
  const list = [...per.values()].map(e => ({...e, f: fcCompute(e.daily, b)})).filter(e => e.f.current > 0 || e.f.forecast >= 0.5).sort((a, x) => x.f.forecast - a.f.forecast || x.f.current - a.f.current);
  const body = list.length ? list.map((e, i) => `<tr><td>${i + 1}</td><td style="text-align:left">${chats ? escH(e.name) : `<span class="pname" data-open-profile="${escH(e.k)}">${escH(e.name)}</span>`}</td><td>${fmt(e.f.current)}</td><td>${fmtR(e.f.rate)}</td><td>≈ ${fmt(Math.round(e.f.forecast))}</td><td>${fmt(e.f.prevFull)}</td><td>${e.f.prevFull ? pctDelta(e.f.forecast, e.f.prevFull) : "новый"}</td></tr>`).join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted)">Нет активности в текущем периоде</td></tr>`;
  const table = `<div class="section-head"><h2>${chats ? "Чаты" : "Участники"}: прогноз к концу ${word}</h2><button class="mini copy-btn" id="fc-copy-table" type="button">Копировать</button></div><div class="wrap"><table id="forecast-table"><thead><tr><th>Место</th><th style="text-align:left">${chats ? "Чат" : "Участник"}</th><th>Сейчас</th><th>Темп в день</th><th>Прогноз</th><th>${escH(b.prevLabel)}</th><th>Прогноз к прошлому</th></tr></thead><tbody>${body}</tbody></table></div>`;
  $("fc-out").innerHTML = tiles + chart + fcPlacesHtml(list, b, chats) + table;
  fcStyleAll();
}
document.querySelectorAll("#fc-period button").forEach(b => b.onclick = () => {
  fcPeriod = b.dataset.p; document.querySelectorAll("#fc-period button").forEach(x => x.classList.toggle("active", x === b)); renderForecast();
});
document.querySelectorAll("#fc-entity button").forEach(b => b.onclick = () => {
  fcEntity = b.dataset.e; document.querySelectorAll("#fc-entity button").forEach(x => x.classList.toggle("active", x === b)); renderForecast();
});
$("fc-chat").onchange = renderForecast;
document.addEventListener("click", e => {
  if (e.target.closest("#fc-copy-chart")) fcCopyChart();
  else if (e.target.closest("#fc-copy-table")) fcCopyTable();
});
function fcCopyChart(){
  const svg = $("fc-chart")?.querySelector("svg");
  if (!svg) { $("fc-copy-status").textContent = "График ещё не построен"; return; }
  copyPngToStatus(() => svgToPngBlob(svg, chartPrefs("forecast")), $("fc-copy-status"), "График скопирован");
}
function fcCopyTable(){
  if (!$("forecast-table")) { $("fc-copy-status").textContent = "Таблица ещё не построена"; return; }
  const b = fcBounds(fcPeriod);
  const title = `${fcEntity === "chats" ? "Чаты" : "Участники"}: прогноз к концу ${fcPeriod === "year" ? "года" : "месяца"} · ${b.label} · ${MLBL[$("fc-metric").value]}`;
  copyPngToStatus(() => tableImageBlob("forecast-table", title), $("fc-copy-status"), "Таблица скопирована");
}
$("fc-metric").onchange = renderForecast;

// Экспорт и импорт локальных настроек дашборда (без статистики и API-ключа).
(function installSettingsTransfer(){
  const prefix = "chatstats.";
  const format = "chat-stats-dashboard-settings";
  const version = 1;
  const $transfer = id => document.getElementById(id);
  const status = message => {
    const el = $transfer("settings-transfer-status");
    if (el) el.textContent = message;
  };
  function readSettings(){
    const settings = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value !== null) settings[key] = value;
      }
    }
    return settings;
  }
  function buildPayload(){
    const settings = readSettings();
    return settings && Object.keys(settings).length ? {format, version, exportedAt: new Date().toISOString(), settings} : null;
  }
  async function copySettings(){
    try {
      const payload = buildPayload();
      if (!payload) { status("Не найдено сохранённых настроек."); return; }
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      status(`Скопировано настроек: ${Object.keys(payload.settings).length}.`);
    } catch (e) {
      status("Не удалось скопировать настройки: " + (e?.message || String(e)));
    }
  }
  function downloadSettings(){
    try {
      const payload = buildPayload();
      if (!payload) { status("Не найдено сохранённых настроек."); return; }
      const text = JSON.stringify(payload, null, 2);
      const blob = new Blob([text], {type:"application/json;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0,10);
      a.href = url; a.download = `chat-stats-settings-${date}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status(`JSON скачан. Настроек: ${Object.keys(payload.settings).length}.`);
    } catch (e) {
      status("Не удалось скачать JSON: " + (e?.message || String(e)));
    }
  }
  async function pasteSettings(){
    let text = "";
    try { text = await navigator.clipboard.readText(); }
    catch (e) { status("Браузер не дал прочитать буфер обмена. Разреши доступ или открой JSON-файл."); return; }
    if (!text.trim()) { status("Буфер обмена пуст."); return; }
    applySettingsText(text);
  }
  async function importSettings(file){
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      status("Файл слишком большой. Ожидается JSON-файл настроек размером до 5 МБ.");
      return;
    }
    applySettingsText(await file.text());
  }
  function applySettingsText(text){
    if (text.length > 5 * 1024 * 1024) { status("Текст настроек слишком большой."); return; }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      status("Не удалось прочитать настройки: это не корректный JSON.");
      return;
    }
    if (!payload || payload.format !== format || payload.version !== version || !payload.settings || typeof payload.settings !== "object" || Array.isArray(payload.settings)) {
      status("Это не похоже на экспорт настроек этого дашборда или его версия не поддерживается.");
      return;
    }
    const entries = Object.entries(payload.settings);
    if (entries.length > 200 || entries.some(([key, value]) => !/^chatstats\.[a-zA-Z0-9._-]{1,120}$/.test(key) || typeof value !== "string" || value.length > 2 * 1024 * 1024)) {
      status("В настройках есть недопустимые или слишком большие значения.");
      return;
    }
    if (!confirm(`Импортировать ${entries.length} настроек? Текущие настройки этого дашборда будут заменены.`)) return;
    let previous = {};
    try {
      previous = readSettings();
      for (const key of Object.keys(previous)) localStorage.removeItem(key);
      for (const [key, value] of entries) localStorage.setItem(key, value);
      status("Настройки импортированы. Перезагружаю страницу…");
      setTimeout(() => window.location.reload(), 450);
    } catch (e) {
      // Best-effort rollback if the browser blocks storage or reaches its quota.
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) localStorage.removeItem(key);
        }
        for (const [key, value] of Object.entries(previous)) localStorage.setItem(key, value);
      } catch (_) {}
      status("Не удалось сохранить импортированные настройки. Предыдущие настройки восстановлены, если браузер разрешил запись.");
    }
  }
  const exportButton = $transfer("settings-export");
  const downloadButton = $transfer("settings-download");
  const importButton = $transfer("settings-import");
  const fileInput = $transfer("settings-import-file");
  if (exportButton) exportButton.addEventListener("click", copySettings);
  if (downloadButton) downloadButton.addEventListener("click", downloadSettings);
  const pasteButton = $transfer("settings-paste");
  if (pasteButton) pasteButton.addEventListener("click", pasteSettings);
  if (importButton && fileInput) importButton.addEventListener("click", () => { fileInput.value = ""; fileInput.click(); });
  if (fileInput) fileInput.addEventListener("change", () => importSettings(fileInput.files && fileInput.files[0]));
})();

/* ===================== Селфи по пятницам ===================== */
// База хранится в этом браузере отдельно от настроек (ключ вне chatstats.*), переносится через Excel.
const SELFIE_KEY = "chatselfie.db.v1", SELFIE_DIRTY_KEY = "chatselfie.dirty.v1";
let SELFIE = [], selfieUndo = null, selfieModelCache = null, selfieDirty = false;
const SELFIE_SRC_KEY = "chatselfie.src.v1";
try {
  const saved = JSON.parse(localStorage.getItem(SELFIE_KEY) || "null");
  selfieDirty = localStorage.getItem(SELFIE_DIRTY_KEY) === "1";
  // Своя копия («user») и копия облака («cloud») всегда важнее встроенной базы: встроенная — только для первого запуска.
  const src = localStorage.getItem(SELFIE_SRC_KEY);
  const userData = src === "user" || src === "cloud" || selfieDirty, bk = window.__BAKED && window.__BAKED.selfie;
  if (Array.isArray(saved) && (userData || !bk)) SELFIE = saved.filter(r => r && r.pk != null && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .map(r => ({pk:String(r.pk), name:String(r.name || ""), date:r.date, count:Math.max(1, Math.round(Number(r.count) || 1))}));
  else if (bk) SELFIE = bk.rows.map(([pk, date, count]) => ({pk:String(pk), name:bk.names[pk] || "", date, count}));
} catch (e) {}

const sFmtDate = d => formatDateRu(parseDate(d));
const sShort = d => `${d.slice(8)}.${d.slice(5, 7)}`;
const sFriW = n => wordForm(n, ["пятница","пятницы","пятниц"]);
function fridayOf(d){
  const [y, m, dd] = d.split("-").map(Number), t = new Date(Date.UTC(y, m - 1, dd));
  t.setUTCDate(t.getUTCDate() - (t.getUTCDay() - 5 + 7) % 7);
  return t.toISOString().slice(0, 10);
}
function selfieMsg(text, err = false){
  const el = $("s-msg"); if (!el) return;
  el.textContent = text; el.style.color = err ? "#f7768e" : "";
  clearTimeout(selfieMsg.t); selfieMsg.t = setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 6000);
}
function saveSelfie(){
  try { localStorage.setItem(SELFIE_KEY, JSON.stringify(SELFIE)); localStorage.setItem(SELFIE_DIRTY_KEY, selfieDirty ? "1" : "0"); }
  catch (e) { selfieMsg("Не удалось сохранить базу в браузере: " + (e.message || e), true); }
}
function selfieChanged(dirty = true){
  selfieModelCache = null; selfieDirty = dirty && !scOn(); try { localStorage.setItem(SELFIE_SRC_KEY, "user"); } catch (e) {} saveSelfie();
  if ($("s-undo")) $("s-undo").disabled = !selfieUndo;
  if (scOn()) { scQueue(); scRenderBadge(); }
}
function selfieNameOf(pk){
  const m = selfieModel();
  return NAMES[pk] || m.dbNames.get(String(pk)) || `ID ${pk}`;
}
// Отметить / снять селфи участника в окне пятницы, к которому относится дата.
function selfieSet(pk, name, date, on){
  if (!scCanEdit()) return false;
  pk = String(pk);
  const F = fridayOf(date), has = SELFIE.some(r => r.pk === pk && fridayOf(r.date) === F);
  if (on === has) return false;
  selfieUndo = SELFIE.map(r => ({...r}));
  if (on) SELFIE.push({pk, name:name || NAMES[pk] || selfieModel().dbNames.get(pk) || "", date, count:1});
  else SELFIE = SELFIE.filter(r => !(r.pk === pk && fridayOf(r.date) === F));
  selfieChanged();
  return true;
}

function selfieModel(){
  if (selfieModelCache) return selfieModelCache;
  const dbNames = new Map(), byFriday = new Map(), persons = new Map();
  for (const r of SELFIE) {
    if (r.name && !dbNames.has(r.pk)) dbNames.set(r.pk, r.name);
    const F = fridayOf(r.date);
    if (!byFriday.has(F)) byFriday.set(F, new Map());
    const day = byFriday.get(F); day.set(r.pk, (day.get(r.pk) || 0) + r.count);
    let p = persons.get(r.pk);
    if (!p) { p = {pk:r.pk, fr:new Map(), years:new Map(), total:0}; persons.set(r.pk, p); }
    p.fr.set(F, (p.fr.get(F) || 0) + r.count); p.total += r.count;
    p.years.set(F.slice(0, 4), (p.years.get(F.slice(0, 4)) || 0) + r.count);
  }
  const days = [...byFriday.keys()].sort(), index = new Map(days.map((d, i) => [d, i]));
  const openF = fridayOf(iso(new Date()));
  persons.forEach(p => {
    const fs = [...p.fr.keys()].sort();
    p.first = fs[0]; p.last = fs[fs.length - 1]; p.did = fs.length;
    const fi = index.get(p.first);
    let run = 0, rs = null; p.maxStreak = 0;
    for (let i = fi; i < days.length; i++) {
      const d = days[i];
      if (p.fr.has(d)) { if (!run) rs = d; run++; if (run > p.maxStreak) { p.maxStreak = run; p.maxStart = rs; p.maxEnd = d; } }
      else if (d !== openF) run = 0;
    }
    let i = days.length - 1, cur = 0;
    if (i >= 0 && !p.fr.has(days[i]) && days[i] === openF) i--;
    while (i >= fi && p.fr.has(days[i])) { cur++; i--; }
    p.current = cur;
  });
  selfieModelCache = {days, index, byFriday, persons, dbNames, openF};
  selfieModelCache.dbNames = dbNames;
  return selfieModelCache;
}
const sVisible = pk => isVisibleUser(pk);
function sDayCount(m, d){ let n = 0; (m.byFriday.get(d) || new Map()).forEach((v, pk) => { if (sVisible(pk)) n += v; }); return n; }
function sDayPeople(m, d){ return [...(m.byFriday.get(d) || new Map()).keys()].filter(sVisible); }
// Пятницы, на которых участник уже состоял в «селфи-традиции» (с первого селфи); открытое окно без отметки не считается пропуском.
function sEligible(m, p, days){ return days.filter(d => d >= p.first && !(d === m.openF && !p.fr.has(d))); }
function sRangeDays(m){
  const v = $("s-range")?.value || "26";
  if (/^\d{4}$/.test(v)) return m.days.filter(d => d.startsWith(v));
  if (v === "all") return m.days.slice();
  return m.days.slice(-Number(v));
}
function sRangeLabel(){ const sel = $("s-range"); return sel?.selectedOptions?.[0]?.textContent || ""; }
function sRangeSub(n){ const v = $("s-range")?.value || ""; return /^\d+$/.test(v) && v.length < 4 && Number(v) === n ? sRangeLabel() : `${sRangeLabel()} · ${fmt(n)} ${sFriW(n)}`; }
function sMissedRegulars(m, i){
  const d = m.days[i], prev = m.days.slice(Math.max(0, i - 8), i), did = new Set(sDayPeople(m, d));
  if (d === m.openF) return [];
  return [...m.persons.values()].filter(p => sVisible(p.pk) && !did.has(p.pk) && p.first <= d && prev.some(x => p.fr.has(x))).map(p => p.pk);
}
function sStrip(m, p, days, cell = 11){
  if (!days.length) return '<span class="spark-empty">—</span>';
  const gap = 3, W = days.length * (cell + gap) - gap;
  const rects = days.map((d, i) => {
    const did = p && p.fr.has(d), before = !p || d < p.first, open = d === m.openF && !did;
    const c = did ? (typeof selfieAccent === "function" ? selfieAccent() : "#9ece6a") : before ? "#2f3441" : open ? "#3b4252" : "#f7768e";
    return `<rect x="${i * (cell + gap)}" y="0" width="${cell}" height="${cell}" rx="3" fill="${c}"><title>${sFmtDate(d)}: ${did ? "селфи" : before ? "ещё не участвовал(а)" : open ? "окно ещё открыто" : "пропуск"}</title></rect>`;
  }).join("");
  return `<svg width="${W}" height="${cell}" viewBox="0 0 ${W} ${cell}" style="vertical-align:middle">${rects}</svg>`;
}

/* ---------- Импорт / экспорт Excel (таблица SLF) ---------- */
let jszipPromise = null;
function loadJSZip(){
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (!jszipPromise) jszipPromise = new Promise((resolve, reject) => {
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    sc.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error("библиотека JSZip не загрузилась"));
    sc.onerror = () => { jszipPromise = null; reject(new Error("нет доступа к cdnjs.cloudflare.com — для работы с Excel нужен интернет")); };
    document.head.appendChild(sc);
  });
  return jszipPromise;
}
function xlsxResolve(dir, target){
  if (target.startsWith("/")) return target.slice(1);
  const parts = (dir + target).split("/"), out = [];
  for (const part of parts) { if (part === "..") out.pop(); else if (part && part !== ".") out.push(part); }
  return out.join("/");
}
function excelSerialToIso(v){ return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10); }
function anyToIsoDate(v){
  if (typeof v === "number" && Number.isFinite(v)) return excelSerialToIso(v);
  const t = String(v ?? "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/); if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  if (/^\d+(\.\d+)?$/.test(t)) return excelSerialToIso(Number(t));
  return null;
}
async function readSelfieXlsx(file){
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = async path => { const f = zip.file(path); return f ? new DOMParser().parseFromString(await f.async("string"), "application/xml") : null; };
  const relsOf = async path => {
    const cut = path.lastIndexOf("/") + 1, dir = path.slice(0, cut), doc = await xml(`${dir}_rels/${path.slice(cut)}.rels`), map = new Map();
    if (doc) [...doc.getElementsByTagName("Relationship")].forEach(r => map.set(r.getAttribute("Id"), xlsxResolve(dir, r.getAttribute("Target"))));
    return map;
  };
  const wb = await xml("xl/workbook.xml");
  if (!wb) throw new Error("это не файл Excel (.xlsx)");
  const wbRels = await relsOf("xl/workbook.xml");
  const sheets = [...wb.getElementsByTagName("sheet")].map(sh => ({name:sh.getAttribute("name"), path:wbRels.get(sh.getAttribute("r:id"))})).filter(sh => sh.path);
  if (!sheets.length) throw new Error("в файле нет листов");
  let target = sheets[0], found = false;
  for (const sh of sheets) {
    for (const rel of (await relsOf(sh.path)).values()) {
      if (!/tables\//.test(rel)) continue;
      const t = await xml(rel), name = t?.documentElement.getAttribute("displayName") || t?.documentElement.getAttribute("name");
      if (name && name.toUpperCase() === "SLF") { target = sh; found = true; break; }
    }
    if (found) break;
  }
  const ssPath = [...wbRels.values()].find(x => /sharedStrings\.xml$/.test(x)) || "xl/sharedStrings.xml";
  const ssDoc = await xml(ssPath);
  const ss = ssDoc ? [...ssDoc.getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].filter(t => t.parentNode.nodeName !== "rPh").map(t => t.textContent).join("")) : [];
  const sheet = await xml(target.path);
  const colIdx = ref => { const L = (ref.match(/^[A-Z]+/) || ["A"])[0]; let n = 0; for (const ch of L) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const table = [];
  for (const row of sheet.getElementsByTagName("row")) {
    const arr = []; let pos = -1;
    for (const c of row.getElementsByTagName("c")) {
      const ref = c.getAttribute("r"); pos = ref ? colIdx(ref) : pos + 1;
      const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0]?.textContent;
      let val = null;
      if (t === "s") val = ss[Number(v)] ?? "";
      else if (t === "inlineStr") val = [...c.getElementsByTagName("t")].map(x => x.textContent).join("");
      else if (t === "str" || t === "e") val = v ?? "";
      else if (t === "b") val = v === "1";
      else if (v != null) val = Number(v);
      arr[pos] = val;
    }
    table.push(arr);
  }
  const hi = table.findIndex(r => r.some(v => String(v ?? "").trim().toLowerCase() === "user_pk"));
  if (hi < 0) throw new Error(`на листе «${target.name}» нет столбца user_pk`);
  const head = table[hi].map(v => String(v ?? "").trim().toLowerCase());
  const col = n => head.indexOf(n), cPk = col("user_pk"), cDate = col("stat_date"), cCount = col("selfie_count"), cName = col("display_name");
  if (cDate < 0) throw new Error("нет столбца stat_date");
  const out = []; let skipped = 0;
  for (const r of table.slice(hi + 1)) {
    if (!r.some(v => v != null && v !== "")) continue;
    const pkRaw = r[cPk], date = anyToIsoDate(r[cDate]);
    const pk = typeof pkRaw === "number" ? String(Math.round(pkRaw)) : String(pkRaw ?? "").trim();
    if (!pk || !date) { skipped++; continue; }
    const count = cCount >= 0 && r[cCount] != null && r[cCount] !== "" ? Math.round(Number(r[cCount])) : 1;
    if (!(count > 0)) { skipped++; continue; }
    out.push({pk, name:cName >= 0 ? String(r[cName] ?? "").trim() : "", date, count});
  }
  return {rows:out, skipped, sheet:target.name, table:found};
}
async function exportSelfieXlsx(){
  const JSZip = await loadJSZip(), zip = new JSZip();
  const esc = v => String(v).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const strings = [], sIdx = new Map();
  const si = v => { v = String(v); if (!sIdx.has(v)) { sIdx.set(v, strings.length); strings.push(v); } return sIdx.get(v); };
  const rows = SELFIE.slice().sort((a, b) => b.date.localeCompare(a.date) || (Number(a.pk) - Number(b.pk)) || a.pk.localeCompare(b.pk));
  const m = selfieModel();
  let data = `<row r="1">${["user_pk","display_name","stat_date","selfie_count"].map((h, i) => `<c r="${"ABCD"[i]}1" t="s" s="1"><v>${si(h)}</v></c>`).join("")}</row>`;
  rows.forEach((r, i) => {
    const n = i + 2, [y, mo, d] = r.date.split("-").map(Number), serial = (Date.UTC(y, mo - 1, d) - Date.UTC(1899, 11, 30)) / 864e5;
    const name = NAMES[r.pk] || r.name || m.dbNames.get(r.pk) || "";
    const pkCell = /^\d+$/.test(r.pk) ? `<c r="A${n}"><v>${r.pk}</v></c>` : `<c r="A${n}" t="s"><v>${si(r.pk)}</v></c>`;
    data += `<row r="${n}">${pkCell}<c r="B${n}" t="s"><v>${si(name)}</v></c><c r="C${n}" s="2"><v>${serial}</v></c><c r="D${n}"><v>${r.count}</v></c></row>`;
  });
  const last = Math.max(2, rows.length + 1), ref = `A1:D${last}`;
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', RNS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  zip.file("[Content_Types].xml", head + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`);
  zip.file("_rels/.rels", head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", head + `<workbook ${NS} ${RNS}><sheets><sheet name="Селфи" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`);
  zip.file("xl/styles.xml", head + `<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  zip.file("xl/worksheets/sheet1.xml", head + `<worksheet ${NS} ${RNS}><dimension ref="${ref}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="4" width="17.875" customWidth="1"/></cols><sheetData>${data}</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`);
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>`);
  zip.file("xl/tables/table1.xml", head + `<table ${NS} id="1" name="SLF" displayName="SLF" ref="${ref}" totalsRowShown="0"><autoFilter ref="${ref}"/><tableColumns count="4"><tableColumn id="1" name="user_pk"/><tableColumn id="2" name="display_name"/><tableColumn id="3" name="stat_date"/><tableColumn id="4" name="selfie_count"/></tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`);
  zip.file("xl/sharedStrings.xml", head + `<sst ${NS} count="${strings.length}" uniqueCount="${strings.length}">${strings.map(t => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join("")}</sst>`);
  return zip.generateAsync({type:"blob", mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
$("s-import").onclick = () => { $("s-file").value = ""; $("s-file").click(); };
$("s-file").onchange = async () => {
  const file = $("s-file").files?.[0]; if (!file) return;
  if (!scCanEdit()) { scDenied(); return; }
  selfieMsg("Читаю файл…");
  try {
    const res = await readSelfieXlsx(file);
    if (!res.rows.length) throw new Error("в таблице нет записей");
    if (SELFIE.length && !confirm(`Заменить ${scOn() ? "общую базу в облаке — её увидят все участники —" : "текущую базу"} (записей: ${fmt(SELFIE.length)}) данными из файла (записей: ${fmt(res.rows.length)})?`)) { selfieMsg("Импорт отменён"); return; }
    selfieUndo = SELFIE.length ? SELFIE.map(r => ({...r})) : null;
    SC.bulk = true; SELFIE = res.rows; selfieChanged(false);
    selfieMsg(`Импортировано ${fmt(res.rows.length)} ${wordForm(res.rows.length, ["запись","записи","записей"])}${res.table ? " из таблицы SLF" : ` с листа «${res.sheet}»`}${res.skipped ? `, пропущено строк с ошибками: ${res.skipped}` : ""}`);
    renderSelfie();
  } catch (e) { selfieMsg("Не удалось импортировать: " + (e.message || e), true); }
};
$("s-builtin").onclick = () => {
  const bk = window.__BAKED && window.__BAKED.selfie; if (!bk) { selfieMsg("Встроенной базы нет", true); return; }
  if (!confirm(`Заменить текущую базу встроенной (на ${bk.ver.split("-").reverse().join(".")}, записей: ${fmt(bk.rows.length)})? Ваши изменения в этом браузере пропадут.`)) return;
  try { localStorage.removeItem(SELFIE_KEY); localStorage.removeItem(SELFIE_SRC_KEY); localStorage.removeItem(SELFIE_DIRTY_KEY); } catch (e) {}
  location.reload();
};
$("s-export").onclick = async () => {
  if (!SELFIE.length) { selfieMsg("База пуста — экспортировать нечего", true); return; }
  selfieMsg("Готовлю Excel…");
  try {
    const blob = await exportSelfieXlsx(), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `SLF_${iso(new Date())}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    selfieDirty = false; saveSelfie(); renderSelfieStatus(selfieModel());
    selfieMsg(`Экспортировано ${fmt(SELFIE.length)} ${wordForm(SELFIE.length, ["запись","записи","записей"])}`);
  } catch (e) { selfieMsg("Не удалось экспортировать: " + (e.message || e), true); }
};
$("s-undo").onclick = () => {
  if (!selfieUndo) return;
  if (!scCanEdit()) { scDenied(); return; }
  SC.bulk = true; SELFIE = selfieUndo; selfieUndo = null; selfieChanged(); renderSelfie(); selfieMsg("Последнее изменение отменено");
};
/* ---------- Облако селфи: общая база для всех участников ----------
   Смотреть может любой, отмечать — тот, у кого есть ключ редактора.
   Изменения сначала сохраняются в браузере, потом уходят в облако; если связи нет — уйдут, как только она появится. */
const SC_URL_KEY = "chatselfie.cloudUrl.v1", SC_EDIT_KEY = "chatselfie.editKey.v1", SC_BY_KEY = "chatselfie.editBy.v1";
const SC_REV_KEY = "chatselfie.cloudRev.v1", SC_BASE_KEY = "chatselfie.cloudBase.v1", SC_PEND_KEY = "chatselfie.cloudPending.v1";
const SC_DEFAULT_URL = "https://chat-selfie.tenguakane.workers.dev";
// fresh — в этой сессии уже была полная загрузка из облака; bulk — разрешено массовое удаление (импорт, отмена); forcePut — заменить базу целиком.
const SC = {url:"", key:"", by:"", rev:-1, base:null, pending:false, state:"idle", err:"", at:0, last:null, busy:null, empty:false, timer:0, fresh:false, bulk:false, forcePut:false, skipped:0};
try {
  const u = localStorage.getItem(SC_URL_KEY);
  SC.url = u === "off" ? "" : (u && /^https?:\/\//i.test(u) ? u.replace(/\/+$/, "") : SC_DEFAULT_URL);
  SC.key = localStorage.getItem(SC_EDIT_KEY) || ""; SC.by = localStorage.getItem(SC_BY_KEY) || "";
  SC.rev = Number(localStorage.getItem(SC_REV_KEY) ?? -1); if (!Number.isFinite(SC.rev)) SC.rev = -1;
  const b = JSON.parse(localStorage.getItem(SC_BASE_KEY) || "null"); if (Array.isArray(b)) SC.base = new Map(b.map(r => [r[0] + "|" + r[2], r]));
  SC.pending = localStorage.getItem(SC_PEND_KEY) === "1";
} catch (e) {}
const scOn = () => Boolean(SC.url);
const scCanEdit = () => !scOn() || Boolean(SC.key);
function scDenied(where){
  const t = "Отмечать селфи могут только редакторы. Нажми «🔑 Ключ редактора» и введи ключ.";
  if (where && where.textContent !== undefined) where.textContent = t; else selfieMsg(t, true);
}
function scSaveLocal(){
  try {
    localStorage.setItem(SC_REV_KEY, String(SC.rev));
    localStorage.setItem(SC_PEND_KEY, SC.pending ? "1" : "0");
    localStorage.setItem(SC_BASE_KEY, JSON.stringify(SC.base ? [...SC.base.values()] : null));
  } catch (e) {}
}
const scRowsOf = list => list.map(r => [String(r.pk), String(r.name || ""), r.date, Math.max(1, Math.round(Number(r.count) || 1))]);
function scAdopt(res, own = false){
  const rows = (res.rows || []).filter(r => Array.isArray(r) && r[0] != null && /^\d{4}-\d{2}-\d{2}$/.test(String(r[2])));
  // Облако ещё пустое: свою базу не стираем — её можно выгрузить кнопкой или она уйдёт с первой отметкой редактора.
  SC.fresh = true;
  if (!rows.length && !own) { SC.empty = true; SC.base = new Map(); SC.rev = Number(res.rev) || 0; SC.last = res.last || null; scSaveLocal(); scRenderBadge(); return; }
  SC.base = new Map(rows.map(r => [String(r[0]) + "|" + r[2], [String(r[0]), String(r[1] || ""), r[2], Math.max(1, Math.round(Number(r[3]) || 1))]]));
  SC.rev = Number(res.rev) || 0; SC.last = res.last || SC.last; SC.empty = rows.length === 0;
  SELFIE = [...SC.base.values()].map(([pk, name, date, count]) => ({pk, name, date, count}));
  selfieModelCache = null; selfieDirty = false; if (!own) selfieUndo = null;
  try { localStorage.setItem(SELFIE_SRC_KEY, "cloud"); } catch (e) {}
  saveSelfie(); scSaveLocal(); scRerender();
}
function scRerender(){
  try {
    if ($("tab-selfie")?.classList.contains("active")) renderSelfie();
    else if ($("tab-profile")?.classList.contains("active") && typeof renderProfile === "function") renderProfile();
  } catch (e) {}
  scRenderBadge();
}
async function scFetch(path, opt = {}){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const headers = {...(opt.body ? {"Content-Type":"application/json"} : {}), ...(opt.key ? {"X-Edit-Key":SC.key} : {})};
    const res = await fetch(SC.url + path, {method:opt.method || "GET", headers, body:opt.body ? JSON.stringify(opt.body) : undefined, signal:ctl.signal, cache:"no-store"});
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j.error || ("облако ответило " + res.status)); e.status = res.status; throw e; }
    return j;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("облако не ответило за 15 секунд");
    if (e instanceof TypeError) throw new Error("нет связи с облаком");
    throw e;
  } finally { clearTimeout(t); }
}
function scDiff(){
  const local = new Map(scRowsOf(SELFIE).map(r => [r[0] + "|" + r[2], r])), base = SC.base || new Map(), ops = [];
  local.forEach((r, k) => { const b = base.get(k); if (!b || b[3] !== r[3] || (r[1] && b[1] !== r[1])) ops.push({op:"set", pk:r[0], name:r[1], date:r[2], count:r[3]}); });
  base.forEach((b, k) => { if (!local.has(k)) ops.push({op:"del", pk:b[0], date:b[2]}); });
  return ops;
}
async function scPush(){
  if (!scOn() || !SC.key) return;
  SC.state = "saving"; scRenderBadge();
  const by = SC.by || "редактор";
  // Явная выгрузка всей базы (кнопка «Выгрузить базу в облако»).
  if (SC.forcePut) {
    const res = await scFetch("/selfie", {method:"PUT", key:true, body:{by, rows:scRowsOf(SELFIE)}});
    SC.forcePut = false; SC.bulk = false; SC.pending = false; SC.state = "ok"; SC.err = ""; SC.at = Date.now(); SC.skipped = 0;
    scAdopt(res, true); return;
  }
  let ops = scDiff();
  // Версия облака неизвестна — только добавляем свои отметки, ничего чужого не удаляем.
  if (!SC.base) ops = ops.filter(o => o.op === "set");
  // Защита: много удалений без импорта или отмены — значит, локальная копия устарела. Удаления не отправляем.
  const dels = ops.filter(o => o.op === "del").length;
  SC.skipped = 0;
  if (dels > 10 && !SC.bulk) { ops = ops.filter(o => o.op !== "del"); SC.skipped = dels; }
  if (!ops.length) {
    SC.pending = false; SC.bulk = false; scSaveLocal();
    // Нечего отправлять, но копия могла устареть — подтягиваем облако целиком.
    const res = await scFetch("/selfie");
    SC.state = "ok"; SC.err = ""; SC.at = Date.now(); scAdopt(res); return;
  }
  // Отправляем частями, сервер применяет изменения к своей актуальной версии и ничего чужого не затирает.
  let res = null;
  for (let i = 0; i < ops.length; i += 300) res = await scFetch("/selfie/ops", {method:"POST", key:true, body:{by, ops:ops.slice(i, i + 300)}});
  SC.pending = false; SC.bulk = false; SC.state = "ok"; SC.err = ""; SC.at = Date.now();
  scAdopt(res, true);
}
async function scPull(){
  if (!scOn()) return;
  if (SC.pending && SC.key) return scPush();
  SC.state = SC.state === "ok" ? "ok" : "loading"; scRenderBadge();
  // Первая загрузка в сессии — всегда полная: так копия в браузере не может «перекрыть» облако.
  const res = await scFetch("/selfie" + (SC.fresh && SC.base && SC.rev >= 0 ? "?rev=" + SC.rev : ""));
  SC.state = "ok"; SC.err = ""; SC.at = Date.now();
  if (res.same) { SC.last = res.last || SC.last; scRenderBadge(); return; }
  scAdopt(res);
}
// Одна операция за раз: отметки, сделанные подряд, уходят следующим запросом.
function scSync(kind = "pull"){
  if (!scOn()) return Promise.resolve();
  if (SC.busy) { SC.again = SC.again === "push" ? "push" : kind; return SC.busy; }
  SC.busy = (kind === "push" ? scPush() : scPull()).catch(e => {
    SC.state = "err"; SC.err = e.message || String(e);
    if (e.status === 403) { SC.err = "ключ редактора не подошёл — изменения сохранены только в этом браузере"; }
    scRenderBadge();
  }).finally(() => {
    SC.busy = null;
    if (SC.again) { const k = SC.again; SC.again = ""; scSync(k); }
  });
  return SC.busy;
}
function scQueue(){ if (!scOn()) return; SC.pending = true; scSaveLocal(); clearTimeout(SC.qt); SC.qt = setTimeout(() => scSync("push"), 350); }
function scFmtAt(ms){ const d = new Date(ms); return d.toLocaleString("ru-RU", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}); }
function scBadgeText(){
  if (!scOn()) return {cls:"off", ic:"💾", t:"Только в этом браузере"};
  if (SC.state === "saving") return {cls:"busy", ic:"⏳", t:"Сохраняю в облако…"};
  if (SC.state === "loading") return {cls:"busy", ic:"⏳", t:"Загружаю из облака…"};
  if (SC.state === "err") return {cls:"err", ic:"⚠️", t:SC.pending ? "Не отправлено — повторю позже" : "Нет связи с облаком"};
  if (SC.pending) return {cls:"busy", ic:"⏳", t:"Ждёт отправки"};
  return {cls:"ok", ic:"☁️", t:SC.key ? "Облако · ты редактор" : "Облако · только просмотр"};
}
function scRenderBadge(){
  const b = $("s-cloud-badge"); if (!b) return;
  const s = scBadgeText();
  b.className = "mini s-cloud-badge sc-" + s.cls;
  b.innerHTML = `<span aria-hidden="true">${s.ic}</span>${escH(s.t)}`;
  b.title = SC.err ? "Ошибка: " + SC.err : SC.at ? "Проверено " + scFmtAt(SC.at) : "";
  const kb = $("s-cloud-key"); if (kb) { kb.textContent = SC.key ? "🔑 " + (SC.by || "Редактор") : "🔑 Ключ редактора"; kb.hidden = !scOn(); }
  const bi = $("s-builtin"); if (bi) bi.hidden = scOn() && SC.state === "ok";
  if ($("tab-selfie")?.classList.contains("active")) { try { renderSelfieStatus(selfieModel()); } catch (e) {} }
}
function scStatusTail(){
  if (!scOn()) return "";
  if (SC.state === "err") return ` · <span class="s-dirty">облако: ${escH(SC.err)}</span>`;
  if (SC.skipped) return ` · <span class="s-dirty">не удалил из облака ${fmt(SC.skipped)} ${wordForm(SC.skipped, ["запись","записи","записей"])}: копия в браузере была устаревшей, база обновлена из облака</span>`;
  if (SC.state !== "ok") return "";
  const who = SC.last ? ` · последнее изменение: ${escH(SC.last.by || "редактор")}, ${scFmtAt(SC.last.at)}` : "";
  const seed = SC.empty && SC.key && SELFIE.length ? ` · <button class="mini" type="button" id="s-cloud-seed">Выгрузить базу в облако</button>` : SC.empty && !SELFIE.length ? " · облако пока пустое" : "";
  return ` · <span class="s-cloud-ok">общая база — видна всем участникам</span>${who}${seed}`;
}
function scDialog(){
  document.querySelector(".s-cloud-dlg")?.remove();
  const d = document.createElement("div"); d.className = "s-cloud-dlg"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Редактор селфи");
  d.innerHTML = `<div class="s-cloud-box">
    <h3>Редактор селфи</h3>
    <p class="hint">Смотреть общую базу может каждый. Отмечать селфи — только с ключом редактора (его задаёт владелец в настройках облака).</p>
    <label>Твоё имя<input id="sc-by" maxlength="40" placeholder="Например, Моня" value="${escH(SC.by)}"></label>
    <label>Ключ редактора<input id="sc-key" type="password" autocomplete="off" placeholder="Ключ" value="${escH(SC.key)}"></label>
    <details><summary>Адрес облака</summary><label>Адрес Worker<input id="sc-url" placeholder="${SC_DEFAULT_URL}" value="${escH(SC.url)}"></label><p class="hint">Пусто — работать без облака, база только в этом браузере.</p></details>
    <p class="hint" id="sc-msg" role="status" aria-live="polite"></p>
    <div class="pbtn"><button class="mini" type="button" id="sc-save">Сохранить</button>${SC.key ? '<button class="mini" type="button" id="sc-logout">Выйти из редактора</button>' : ""}<button class="mini" type="button" id="sc-close">Закрыть</button></div>
  </div>`;
  document.body.appendChild(d);
  const close = () => d.remove();
  d.addEventListener("click", e => { if (e.target === d) close(); });
  d.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  d.querySelector("#sc-close").onclick = close;
  d.querySelector("#sc-logout")?.addEventListener("click", () => { SC.key = ""; try { localStorage.removeItem(SC_EDIT_KEY); } catch (e) {} scRenderBadge(); close(); scRerender(); });
  d.querySelector("#sc-save").onclick = async () => {
    const msg = d.querySelector("#sc-msg"), key = d.querySelector("#sc-key").value.trim(), by = d.querySelector("#sc-by").value.trim();
    const rawUrl = d.querySelector("#sc-url").value.trim(), url = rawUrl ? rawUrl.replace(/\/+$/, "") : "";
    if (url && !/^https?:\/\//i.test(url)) { msg.textContent = "Адрес должен начинаться с https://"; return; }
    const urlChanged = url !== SC.url;
    SC.url = url; try { localStorage.setItem(SC_URL_KEY, url || "off"); } catch (e) {}
    if (urlChanged) { SC.base = null; SC.rev = -1; SC.state = "idle"; }
    SC.by = by; try { localStorage.setItem(SC_BY_KEY, by); } catch (e) {}
    if (key && url) {
      msg.textContent = "Проверяю ключ…";
      const old = SC.key; SC.key = key;
      try { await scFetch("/selfie/check", {key:true}); }
      catch (e) { SC.key = old; msg.textContent = e.status === 403 ? "Ключ не подошёл" : "Не удалось проверить: " + e.message; return; }
    } else SC.key = key;
    try { if (SC.key) localStorage.setItem(SC_EDIT_KEY, SC.key); else localStorage.removeItem(SC_EDIT_KEY); } catch (e) {}
    close(); scRenderBadge(); scRerender(); scSync(SC.pending ? "push" : "pull");
  };
  setTimeout(() => d.querySelector(SC.by ? "#sc-key" : "#sc-by")?.focus(), 30);
}
document.addEventListener("click", e => {
  if (e.target.closest("#s-cloud-key")) scDialog();
  else if (e.target.closest("#s-cloud-badge")) scSync(SC.pending ? "push" : "pull");
  else if (e.target.closest("#s-cloud-seed")) {
    if (!confirm(`Выгрузить текущую базу (записей: ${fmt(SELFIE.length)}) в облако? Её увидят все участники.`)) return;
    SC.forcePut = true; SC.pending = true; scSync("push");
  }
});
// Проверяем облако при открытии сайта, при возвращении на вкладку и раз в полминуты, пока открыты «Селфи» или «Профиль».
function scTick(){
  clearTimeout(SC.timer);
  const watching = $("tab-selfie")?.classList.contains("active") || $("tab-profile")?.classList.contains("active");
  SC.timer = setTimeout(() => { if (!document.hidden) scSync(SC.pending && SC.key ? "push" : "pull"); scTick(); }, watching ? 30000 : 180000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) scSync(SC.pending && SC.key ? "push" : "pull"); });
addEventListener("online", () => scSync(SC.pending && SC.key ? "push" : "pull"));
setTimeout(() => { scRenderBadge(); scSync(SC.pending && SC.key ? "push" : "pull"); scTick(); }, 300);


/* ---------- Отметки ---------- */
const sNorm = t => String(t).trim().toLowerCase().replace(/ё/g, "е");
function sKnownPeople(m){
  const all = new Set([...Object.keys(NAMES), ...m.persons.keys()]);
  const recent = new Set(m.days.slice(-26));
  return [...all].filter(sVisible).map(pk => {
    const p = m.persons.get(pk); let rec = 0;
    if (p) p.fr.forEach((v, d) => { if (recent.has(d)) rec++; });
    return {pk, name:selfieNameOf(pk), rec, total:p?.total || 0};
  }).sort((a, b) => b.rec - a.rec || b.total - a.total || a.name.localeCompare(b.name, "ru"));
}
function renderSelfieMark(m){
  const date = $("s-date").value || iso(new Date()), F = fridayOf(date), done = new Set(m.byFriday.get(F)?.keys() || []);
  const end = addDaysIso(F, 6);
  $("s-friday-hint").innerHTML = `Засчитается в пятницу <b>${sFmtDate(F)}</b> (окно ${sShort(F)}–${sShort(end)}) · уже отмечено: ${fmt([...done].filter(sVisible).length)}. Нажми на имя, чтобы поставить или снять отметку.`;
  const people = sKnownPeople(m);
  // В списке — только те, кто делал селфи за последние полгода (26 пятниц) или уже отмечен в эту пятницу; по алфавиту.
  // Остальные находятся через «Добавить по имени».
  const chips = people.filter(u => u.rec > 0 || done.has(u.pk)).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const hidden = people.length - chips.length;
  $("s-people").innerHTML = chips.map(u => `<button type="button" class="s-chip" data-s-pk="${escH(u.pk)}" aria-pressed="${done.has(u.pk)}" title="Всего селфи: ${fmt(u.total)}">${escH(u.name)}<small>${u.total ? fmt(u.total) : ""}</small></button>`).join("") + (hidden ? `<span class="hint" style="align-self:center;margin-left:4px">ещё ${fmt(hidden)} — без селфи за полгода, найди через «Добавить по имени»</span>` : "");
  $("s-names").innerHTML = people.map(u => `<option value="${escH(u.name)}"></option>`).join("");
}
$("s-people").addEventListener("click", e => {
  const chip = e.target.closest("[data-s-pk]"); if (!chip) return;
  if (!scCanEdit()) {
    let note = $("s-people-note"); if (!note) { note = document.createElement("p"); note.id = "s-people-note"; note.className = "hint s-people-note"; note.setAttribute("role", "status"); $("s-people").after(note); }
    scDenied(note);
    const kb = $("s-cloud-key"); if (kb && !kb.hidden) { kb.classList.add("s-key-flash"); kb.scrollIntoView({block:"nearest", behavior:"smooth"}); setTimeout(() => kb.classList.remove("s-key-flash"), 2400); }
    return;
  }
  const date = $("s-date").value || iso(new Date()), on = chip.getAttribute("aria-pressed") !== "true";
  if (selfieSet(chip.dataset.sPk, "", date, on)) {
    selfieMsg(`${selfieNameOf(chip.dataset.sPk)}: ${on ? "селфи засчитано" : "отметка снята"} (${sFmtDate(fridayOf(date))})`);
    renderSelfie();
  }
});
$("s-date").addEventListener("input", () => renderSelfieMark(selfieModel()));
function sAddByName(){
  const raw = $("s-name").value.trim(); if (!raw) return;
  if (!scCanEdit()) { scDenied(); return; }
  const m = selfieModel(), date = $("s-date").value || iso(new Date());
  const byName = new Map(); sKnownPeople(m).forEach(u => byName.set(sNorm(u.name), u.pk));
  Object.entries(NAMES).forEach(([pk, n]) => { if (!byName.has(sNorm(n))) byName.set(sNorm(n), pk); });
  let pk = byName.get(sNorm(raw)), name = "";
  if (!pk) {
    const answer = prompt(`Участника «${raw}» нет в списке. Введи его user_pk из API:`);
    if (!answer || !/^\d+$/.test(answer.trim())) { selfieMsg("Не добавлено: нужен числовой user_pk", true); return; }
    pk = answer.trim(); name = raw;
  }
  if (selfieSet(pk, name, date, true)) selfieMsg(`${name || selfieNameOf(pk)}: селфи засчитано (${sFmtDate(fridayOf(date))})`);
  else selfieMsg(`${name || selfieNameOf(pk)} уже отмечен(а) в эту пятницу`);
  $("s-name").value = ""; renderSelfie();
}
$("s-add").onclick = sAddByName;
$("s-name").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); sAddByName(); } });

/* ---------- Отрисовка вкладки ---------- */
function renderSelfieStatus(m){
  const el = $("s-status"); if (!el) return;
  if (!SELFIE.length) { el.innerHTML = "База селфи пуста. Нажми «Импорт из Excel» и выбери файл с таблицей SLF или начни отмечать вручную." + scStatusTail(); return; }
  el.innerHTML = `В базе ${fmt(SELFIE.length)} ${wordForm(SELFIE.length, ["запись","записи","записей"])} · ${fmt(m.days.length)} ${wordForm(m.days.length, ["селфи-пятница","селфи-пятницы","селфи-пятниц"])} · ${sFmtDate(m.days[0])} — ${sFmtDate(m.days[m.days.length - 1])}`
    + (selfieDirty && !scOn() ? ' · <span class="s-dirty">есть изменения, которые ещё не выгружены в Excel</span>' : "") + scStatusTail();
}
function renderSelfieRange(m){
  const sel = $("s-range"), cur = sel.value || (() => { try { return localStorage.getItem("chatstats.selfieRange.v1") || "26"; } catch (e) { return "26"; } })();
  const years = [...new Set(m.days.map(d => d.slice(0, 4)))].sort().reverse();
  sel.innerHTML = `<option value="12">Последние 12 пятниц</option><option value="26">Последние 26 пятниц</option><option value="52">Последние 52 пятницы</option><option value="all">Вся история</option>` + years.map(y => `<option value="${y}">${y} год</option>`).join("");
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : "26";
}
$("s-range").onchange = () => { try { localStorage.setItem("chatstats.selfieRange.v1", $("s-range").value); } catch (e) {} renderSelfie(); };
$("s-sort").onchange = () => renderSelfie();
function loadSelfie(){
  if (!$("s-date").value) $("s-date").value = iso(new Date());
  scSync(SC.pending && SC.key ? "push" : "pull"); scTick();
  renderSelfie();
  if (hideLeft && !userMetricRows) ensureUserMetrics().then(() => { if ($("tab-selfie").classList.contains("active")) renderSelfie(); }).catch(() => {});
}
function renderSelfie(){
  const m = selfieModel();
  if (!$("s-date").value) $("s-date").value = iso(new Date());
  $("s-undo").disabled = !selfieUndo;
  renderSelfieStatus(m); renderSelfieRange(m); renderSelfieMark(m);
  const days = sRangeDays(m);
  renderSelfieTiles(m, days); renderSelfieChart(); renderSelfieDays(m, days); renderSelfiePeople(m, days); renderSelfieYears(m);
  if ($("s-settings-panel").classList.contains("open")) renderSelfieSettings();
}
function renderSelfieTiles(m, days){
  const box = $("s-tiles");
  if (!m.days.length) { box.innerHTML = ""; return; }
  const tile = (lbl, num, place, acc) => `<div class="tile" style="--tile-accent:${acc}"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${place}</div></div>`;
  const lastD = m.days[m.days.length - 1], prevD = m.days[m.days.length - 2];
  const lastC = sDayCount(m, lastD), prevC = prevD ? sDayCount(m, prevD) : 0;
  const counts = days.map(d => sDayCount(m, d)), total = counts.reduce((a, v) => a + v, 0);
  let rec = null; days.forEach((d, i) => { if (!rec || counts[i] > rec.v) rec = {d, v:counts[i]}; });
  const leaders = [...m.persons.values()].filter(p => sVisible(p.pk) && p.current > 0).sort((a, b) => b.current - a.current);
  const top = leaders[0], topAll = top ? leaders.filter(p => p.current === top.current) : [];
  box.innerHTML = tile(`Последняя пятница · ${sFmtDate(lastD)}`, fmt(lastC), prevD ? `к прошлой: ${pctDelta(lastC, prevC) || "без изменений"} (${fmt(prevC)})` : "первая в базе", "#9ece6a")
    + tile(`Селфи · ${escH(sRangeLabel().toLowerCase())}`, fmt(total), `${fmt(days.length)} ${sFriW(days.length)}`, "#7aa2f7")
    + tile("В среднем за пятницу", days.length ? fmtR(total / days.length) : "—", "в выбранном периоде", "#e0af68")
    + tile("Рекорд периода", rec ? fmt(rec.v) : "—", rec ? sFmtDate(rec.d) : "—", "#ff9e64")
    + tile("Самая длинная текущая серия", top ? `${fmt(top.current)}` : "—", top ? escH(topAll.slice(0, 3).map(p => selfieNameOf(p.pk)).join(", ") + (topAll.length > 3 ? ` и ещё ${topAll.length - 3}` : "")) + ` · ${sFriW(top.current)} подряд` : "нет активных серий", "#bb9af7");
}
let S_NAMES_ALL = false;
function sChips(list, cls = ""){
  if (!list.length) return "";
  const lim = 4, over = !S_NAMES_ALL && list.length > lim + 1, shown = over ? list.slice(0, lim) : list;
  return `<span class="s-nchips">${shown.map(n => `<span class="s-nchip ${cls}">${escH(n)}</span>`).join("")}${over ? `<button type="button" class="s-nchip s-nchip-more" data-s-names-all title="Показать всех: ${escH(list.slice(lim).join(", "))}">+${list.length - lim}</button>` : (S_NAMES_ALL && list.length > lim + 1 ? `<button type="button" class="s-nchip s-nchip-more" data-s-names-all data-no-export="true" title="Свернуть длинные списки">свернуть</button>` : "")}</span>`;
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-s-names-all]"); if (!b) return; S_NAMES_ALL = !S_NAMES_ALL; if (typeof renderSelfie === "function") renderSelfie(); });
function renderSelfieDays(m, days){
  const body = $("s-days-body");
  if (!days.length) { body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">${SELFIE.length ? "Нет селфи-пятниц в периоде" : "База пуста"}</td></tr>`; return; }
  const shown = days.slice(-52).reverse(), max = Math.max(1, ...shown.map(d => sDayCount(m, d)));
  body.innerHTML = shown.map(d => {
    const i = m.index.get(d), c = sDayCount(m, d), prev = i > 0 ? sDayCount(m, m.days[i - 1]) : null, yc = yearHue(d.slice(0, 4));
    const who = sDayPeople(m, d).map(selfieNameOf).sort((a, b) => a.localeCompare(b, "ru"));
    const missed = sMissedRegulars(m, i).map(selfieNameOf).sort((a, b) => a.localeCompare(b, "ru"));
    const pct = (c / max * 100).toFixed(1), bar = hexA(yc, .38), diff = prev == null ? "—" : c - prev === 0 ? "0" : `<span class="compare-diff ${c > prev ? "positive" : "negative"}">${c > prev ? "+" : "−"}${Math.abs(c - prev)}</span>`;
    return `<tr><td style="border-left:4px solid ${yc};white-space:nowrap">${sFmtDate(d)}${d === m.openF ? '<span class="now-chip">окно открыто</span>' : ""}</td><td data-bar-pct="${pct}" data-bar-color="${bar}" style="background-image:linear-gradient(90deg,${bar} ${pct}%,transparent ${pct}%)">${fmt(c)}</td><td>${diff}</td><td class="s-names">${sChips(who) || "—"}</td><td class="s-names s-miss">${d === m.openF ? '<span style="color:var(--muted)">окно ещё открыто</span>' : sChips(missed, "s-nchip-miss") || '<span style="color:#9ece6a">никто</span>'}</td></tr>`;
  }).join("");
}
function sPersonRange(m, p, days){
  const elig = sEligible(m, p, days), did = elig.filter(d => p.fr.has(d)).length, missedDays = elig.filter(d => !p.fr.has(d));
  const count = days.reduce((a, d) => a + (p.fr.get(d) || 0), 0);
  return {elig:elig.length, did, count, missed:missedDays.length, lastMissed:missedDays[missedDays.length - 1] || null, att:elig.length ? did / elig.length : 0};
}
function renderSelfiePeople(m, days){
  const years = [...new Set(m.days.map(d => d.slice(0, 4)))].sort();
  $("s-people-head").innerHTML = `<tr><th>Место</th><th style="text-align:left">Участник</th>${years.map(y => `<th style="color:${yearHue(y)}">${y}</th>`).join("")}<th>Всего</th><th>За период</th><th>Посещаемость</th><th>Серия</th><th>Рекорд серии</th><th>Пропуски</th><th>Последний пропуск</th><th>Последнее селфи</th><th>Последние 12</th></tr>`;
  const sortKey = $("s-sort").value;
  const since = m.days[Math.max(0, (days.length ? m.index.get(days[0]) : m.days.length) - 8)] || "0000";
  const list = [...m.persons.values()].filter(p => sVisible(p.pk)).map(p => ({p, r:sPersonRange(m, p, days), a:sPersonRange(m, p, m.days)})).filter(x => x.r.count > 0 || (x.r.elig > 0 && x.p.last >= since));
  const key = {total:x => x.r.count, att:x => x.a.att, streak:x => x.p.current, missed:x => x.r.missed}[sortKey] || (x => x.r.count);
  list.sort((a, b) => key(b) - key(a) || b.r.count - a.r.count || selfieNameOf(a.p.pk).localeCompare(selfieNameOf(b.p.pk), "ru"));
  const strip = days.slice(-12);
  $("s-people-body").innerHTML = list.length ? list.map(({p, r, a}, i) => {
    const attPct = Math.round(a.att * 100);
    return `<tr><td class="${i < 3 ? "medal-" + (i + 1) : ""}" style="text-align:center">${i + 1}</td><td style="text-align:left"><span class="pname" data-open-profile="${escH(p.pk)}">${escH(selfieNameOf(p.pk))}</span></td>`
      + years.map(y => { const v = p.years.get(y) || 0; return `<td class="${v ? "" : "zero"}">${v ? fmt(v) : "-"}</td>`; }).join("")
      + `<td>${fmt(p.total)}</td><td>${fmt(r.count)}</td><td>${attPct}%<span class="wd-mute">${a.did}/${a.elig}</span></td>`
      + `<td style="color:${p.current ? "#ffb27a" : "var(--muted)"}">${fmt(p.current)}</td><td>${fmt(p.maxStreak)}</td><td class="${r.missed ? "s-miss" : "zero"}">${r.missed ? fmt(r.missed) : "-"}</td><td>${r.lastMissed ? sFmtDate(r.lastMissed) : "—"}</td><td>${sFmtDate(p.last)}</td><td>${sStrip(m, p, strip)}</td></tr>`;
  }).join("") : `<tr><td colspan="${12 + years.length}" style="text-align:center;color:var(--muted)">Нет данных</td></tr>`;
}
function renderSelfieYears(m){
  const years = [...new Set(m.days.map(d => d.slice(0, 4)))].sort().reverse();
  $("s-years-body").innerHTML = years.length ? years.map(y => {
    const ds = m.days.filter(d => d.startsWith(y)), counts = ds.map(d => sDayCount(m, d)), total = counts.reduce((a, v) => a + v, 0);
    let rec = null; ds.forEach((d, i) => { if (!rec || counts[i] > rec.v) rec = {d, v:counts[i]}; });
    const per = [...m.persons.values()].filter(p => sVisible(p.pk) && p.years.get(y)).sort((a, b) => b.years.get(y) - a.years.get(y));
    const best = per.length ? per.filter(p => p.years.get(y) === per[0].years.get(y)).map(p => selfieNameOf(p.pk)).join(", ") + ` · ${fmt(per[0].years.get(y))}` : "—";
    const yc = yearHue(y), tint = mixHex(ROW_BASE, yc, .09), bg = `background-color:${tint}`;
    return `<tr><td style="${bg};border-left:4px solid ${yc};color:${yc}">${y}</td><td style="${bg}">${fmt(total)}</td><td style="${bg}">${fmt(ds.length)}</td><td style="${bg}">${ds.length ? fmtR(total / ds.length) : "—"}</td><td style="${bg}">${rec ? `${fmt(rec.v)}<span class="wd-mute">${sFmtDate(rec.d)}</span>` : "—"}</td><td style="${bg}">${fmt(per.length)}</td><td style="${bg};text-align:left">${escH(best)}</td></tr>`;
  }).join("") : `<tr><td colspan="7" style="text-align:center;color:var(--muted)">Нет данных</td></tr>`;
}
$("s-days-copy").onclick = () => copyTableImage("s-days-table", `Селфи-пятницы · ${sRangeLabel().toLowerCase()}`, "s-days-msg");
$("s-people-copy").onclick = () => copyTableImage("s-people-table", `Селфи: участники · ${sRangeLabel().toLowerCase()}`, "s-people-msg");
$("s-years-copy").onclick = () => copyTableImage("s-years-table", "Селфи по годам", "s-years-msg");

/* ---------- Графики селфи ---------- */
const SELFIE_CHARTS = {fridays:"Селфи по пятницам", matrix:"Карта посещаемости", ranking:"Рейтинг участников", years:"По годам"};
const SELFIE_OPT_DEFAULTS = {barMode:"year", bar:"#7aa2f7", avg:"#ff9e64", labels:true, did:"#9ece6a", miss:"#f7768e", none:"#2a2e39", shape:"square", cellScale:100};
DEFAULT_TEXT_STYLE.norm = {...DEFAULT_TEXT_STYLE.heatrows};
DEFAULT_TEXT_STYLE["selfie-fridays"] = {...DEFAULT_TEXT_STYLE.trend, valuesSize:13, axisSize:14, legendSize:15};
DEFAULT_TEXT_STYLE["selfie-matrix"] = {...DEFAULT_TEXT_STYLE.heatrows};
DEFAULT_TEXT_STYLE["selfie-ranking"] = {...DEFAULT_TEXT_STYLE.bars};
DEFAULT_TEXT_STYLE["selfie-years"] = {...DEFAULT_TEXT_STYLE.trend, valuesSize:22, axisSize:18, legendSize:14};
const sChartKind = () => $("s-chart-type")?.value || "fridays";
const sChartType = () => "selfie-" + sChartKind();
// Цвет «селфи сделано» — цвет выбранной темы, если пользователь не задал свой.
const selfieAccent = () => { try { return getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#9ece6a"; } catch (e) { return "#9ece6a"; } };
const sOpts = p => { const o = {...SELFIE_OPT_DEFAULTS, ...(p.selfie || {})}; if (!o.did || String(o.did).toLowerCase() === "#9ece6a") o.did = selfieAccent(); return o; };
const sSeriesColor = (p, kind, key, fallback) => p.seriesColors?.[`${kind}:${key}`] || fallback;
$("s-chart-type").value = "fridays"; // при каждом открытии — «Селфи по пятницам»

function sChartFridays(m, days, p){
  if (!days.length) return note("Нет селфи-пятниц в выбранном периоде");
  const o = sOpts(p), showSub = p.showSubtitle !== false, vals = days.map(d => sDayCount(m, d)), n = days.length;
  const multiYear = new Set(days.map(d => d.slice(0, 4))).size > 1;
  const W = 900, L = 52, R = 880, T = showSub ? 130 : 110, B = T + 300, H = B + (multiYear ? 66 : 46);
  const {max, step} = niceMax(Math.max(...vals, 1)), sy = v => B - v / max * (B - T), slot = (R - L) / n, bw = Math.max(2, Math.min(44, slot * .72));
  const total = vals.reduce((a, v) => a + v, 0), avg = total / n;
  let s = head(SELFIE_CHARTS.fridays, `${sRangeSub(n)} · всего ${fmt(total)}`, W, showSub);
  for (let v = 0; v <= max + 1e-9; v += step) s += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.08"/><text class="chart-axis" x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" text-anchor="end" font-size="14">${fmt(v)}</text>`;
  const every = Math.max(1, Math.ceil(n / 16));
  days.forEach((d, i) => {
    const x = L + i * slot + (slot - bw) / 2, y = sy(vals[i]), c = o.barMode === "year" ? sSeriesColor(p, "y", d.slice(0, 4), yearHue(d.slice(0, 4))) : o.bar;
    const who = sDayPeople(m, d).map(selfieNameOf).sort((a, b) => a.localeCompare(b, "ru"));
    s += `<rect class="anim-bar-y" style="animation-delay:${i * 12}ms" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, B - y).toFixed(1)}" rx="${Math.min(5, bw / 3).toFixed(1)}" fill="${c}" data-tip="${escH(`${sFmtDate(d)} · ${vals[i]} селфи`)}|${escH(who.slice(0, 18).join(", ") + (who.length > 18 ? "…" : ""))}"/>`;
    if (o.labels && n <= 40 && vals[i]) s += `<text class="chart-value" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="13">${vals[i]}</text>`;
    if (i % every === 0 || i === n - 1 && n - 1 - Math.floor((n - 1) / every) * every > every / 2) s += `<text class="chart-axis" x="${(x + bw / 2).toFixed(1)}" y="${B + 22}" text-anchor="middle" font-size="14">${sShort(d)}</text>`;
    if (multiYear && (i === 0 || days[i - 1].slice(0, 4) !== d.slice(0, 4))) s += `<line x1="${(L + i * slot).toFixed(1)}" y1="${B}" x2="${(L + i * slot).toFixed(1)}" y2="${B + 46}" stroke="#ffffff" stroke-opacity="0.25"/><text class="chart-axis" x="${(L + i * slot + 6).toFixed(1)}" y="${B + 50}" font-size="14">${d.slice(0, 4)}</text>`;
  });
  s += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-width="2"/>`;
  s += `<line x1="${L}" y1="${sy(avg).toFixed(1)}" x2="${R}" y2="${sy(avg).toFixed(1)}" stroke="${o.avg}" stroke-width="2" stroke-dasharray="8 6"/><line x1="${R - 150}" y1="${T - 24}" x2="${R - 126}" y2="${T - 24}" stroke="${o.avg}" stroke-width="2" stroke-dasharray="6 4"/><text class="chart-legend" x="${R}" y="${T - 19}" text-anchor="end" font-size="15">в среднем ${fmtR(avg)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
}
function sChartMatrix(m, days, p){
  if (!days.length) return note("Нет селфи-пятниц в выбранном периоде");
  const o = sOpts(p), ts = p.textStyle, showSub = p.showSubtitle !== false;
  const people = [...m.persons.values()].filter(x => sVisible(x.pk)).map(x => ({x, r:sPersonRange(m, x, days)})).filter(e => e.r.count > 0)
    .sort((a, b) => b.r.count - a.r.count || b.r.att - a.r.att).slice(0, 40);
  if (!people.length) return note("Нет данных");
  const n = days.length, labelSize = Number(ts.labelsSize) || 14, valueSize = Number(ts.valuesSize) || 12, axisSize = Number(ts.axisSize) || 11, legendSize = Number(ts.legendSize) || 14;
  const LBL = Math.ceil(Math.max(...people.map(e => selfieNameOf(e.x.pk).length)) * labelSize * .58) + 14;
  const base = Math.max(4, Math.min(30, Math.floor((900 - LBL - 70) / n))), cw = Math.max(4, Math.round(base * Math.max(50, Math.min(160, Number(o.cellScale) || 100)) / 100));
  const gy = showSub ? 128 : 100, W = Math.max(700, LBL + n * cw + 70), SMn = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  let s = head(SELFIE_CHARTS.matrix, `${sRangeSub(n)} · ${fmt(people.length)} ${wordForm(people.length, ["участник","участника","участников"])}`, W, showSub);
  let prevLab = "";
  days.forEach((d, c) => {
    const lab = cw >= 9 ? SMn[+d.slice(5, 7) - 1] : d.slice(0, 4);
    if (lab !== prevLab) { s += `<text class="chart-axis" x="${LBL + c * cw}" y="${gy - 10}" font-size="${axisSize}">${lab}${cw >= 9 && (c === 0 || d.slice(5, 7) === "01") ? " " + d.slice(2, 4) : ""}</text>`; prevLab = lab; }
  });
  people.forEach((e, i) => {
    const y = gy + i * cw;
    s += `<text class="chart-label" x="${LBL - 8}" y="${y + cw / 2}" dominant-baseline="middle" text-anchor="end" font-size="${labelSize}">${escH(selfieNameOf(e.x.pk))}</text>`;
    days.forEach((d, c) => {
      const did = e.x.fr.has(d), before = d < e.x.first, open = d === m.openF && !did;
      const fill = did ? o.did : before || open ? o.none : o.miss;
      const tip = `${selfieNameOf(e.x.pk)} · ${sFmtDate(d)}|${did ? "селфи" : before ? "ещё не участвовал(а)" : open ? "окно ещё открыто" : "пропуск"}`;
      s += o.shape === "circle"
        ? `<circle cx="${LBL + c * cw + cw / 2}" cy="${y + cw / 2}" r="${Math.max(1.5, cw / 2 - 1.5)}" fill="${fill}" data-tip="${escH(tip)}"/>`
        : `<rect x="${LBL + c * cw}" y="${y}" width="${cw - 1}" height="${cw - 1}" rx="2" fill="${fill}" data-tip="${escH(tip)}"/>`;
    });
    s += `<text class="chart-value" x="${LBL + n * cw + 8}" y="${y + cw / 2}" dominant-baseline="middle" font-size="${valueSize}">${Math.round(e.r.att * 100)}%</text>`;
  });
  const ly = gy + people.length * cw + 24, items = [[o.did, "Селфи"], [o.miss, "Пропуск"], [o.none, "Ещё не участвовал(а)"]];
  let lx = W / 2 - 170;
  items.forEach(([c, t]) => { s += `<rect x="${lx}" y="${ly - 12}" width="16" height="16" rx="3" fill="${c}"/><text class="chart-legend" x="${lx + 24}" y="${ly + 1}" font-size="${legendSize}">${t}</text>`; lx += 46 + t.length * legendSize * .62; });
  return `<svg class="heatrows-svg" width="${W}" height="${ly + 22}" viewBox="0 0 ${W} ${ly + 22}" role="img">${s}</svg>`;
}
function sChartRanking(m, days, p){
  const list = [...m.persons.values()].filter(x => sVisible(x.pk)).map(x => ({x, r:sPersonRange(m, x, days)})).filter(e => e.r.count > 0)
    .sort((a, b) => b.r.count - a.r.count || b.r.att - a.r.att).slice(0, 30);
  if (!list.length) return note("Нет данных за выбранный период");
  const showSub = p.showSubtitle !== false, top = showSub ? 96 : 76, rowH = 32, max = list[0].r.count;
  const labelX = Math.max(120, Math.ceil(Math.max(...list.map(e => selfieNameOf(e.x.pk).length)) * 10) + 12), x0 = labelX + 12, x1 = x0 + 600, W = Math.max(900, x1 + 130), H = top + 20 + list.length * rowH;
  let s = head(SELFIE_CHARTS.ranking, `${sRangeLabel()} · селфи и посещаемость`, W, showSub);
  list.forEach((e, i) => {
    const y = top + i * rowH, w = Math.max(3, e.r.count / max * (x1 - x0)), c = sSeriesColor(p, "u", e.x.pk, getStyle("u", e.x.pk).c[0]);
    s += `<text class="chart-label" x="${labelX}" y="${y + 17}" text-anchor="end" font-size="18">${escH(selfieNameOf(e.x.pk))}</text><rect class="anim-bar-x" style="animation-delay:${i * 25}ms" x="${x0}" y="${y}" width="${w.toFixed(1)}" height="22" rx="5" fill="${c}" data-tip="${escH(selfieNameOf(e.x.pk))}|${escH(`${e.r.count} селфи · посещаемость ${Math.round(e.r.att * 100)}% · пропусков ${e.r.missed}`)}"/><text class="chart-value" x="${(x0 + w + 8).toFixed(1)}" y="${y + 17}" font-size="18">${fmt(e.r.count)} · ${Math.round(e.r.att * 100)}%</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
}
function sChartYears(m, p){
  const years = [...new Set(m.days.map(d => d.slice(0, 4)))].sort();
  if (!years.length) return note("Нет данных");
  const stats = years.map(y => { const ds = m.days.filter(d => d.startsWith(y)), t = ds.reduce((a, d) => a + sDayCount(m, d), 0); return {y, t, n:ds.length}; });
  const showSub = p.showSubtitle !== false, W = 900, L = 40, R = 880, T = showSub ? 130 : 108, B = T + 210, H = B + 74;
  const {max} = niceMax(Math.max(...stats.map(x => x.t), 1)), slot = (R - L) / years.length, bw = Math.min(110, slot * .62);
  let s = head(SELFIE_CHARTS.years, `всего ${fmt(stats.reduce((a, x) => a + x.t, 0))} селфи за ${years.length} ${wordForm(years.length, ["год","года","лет"])}`, W, showSub);
  stats.forEach((x, i) => {
    const cx = L + i * slot + slot / 2, h = x.t / max * (B - T), c = sSeriesColor(p, "y", x.y, yearHue(x.y));
    s += `<rect class="anim-bar-y" style="animation-delay:${i * 60}ms" x="${(cx - bw / 2).toFixed(1)}" y="${(B - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="8" fill="${c}" data-tip="${x.y}|${escH(`${fmt(x.t)} селфи · ${x.n} ${sFriW(x.n)} · в среднем ${fmtR(x.n ? x.t / x.n : 0)}`)}"/>`;
    s += `<text class="chart-value" x="${cx.toFixed(1)}" y="${(B - h - 10).toFixed(1)}" text-anchor="middle" font-size="22">${fmt(x.t)}</text>`;
    s += `<text class="chart-axis" x="${cx.toFixed(1)}" y="${B + 28}" text-anchor="middle" font-size="18">${x.y}</text><text class="chart-legend" x="${cx.toFixed(1)}" y="${B + 52}" text-anchor="middle" font-size="14">${x.n} ${sFriW(x.n)} · ≈${fmtR(x.n ? x.t / x.n : 0)}</text>`;
  });
  s += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" style="max-width:640px;display:block;margin:0 auto">${s}</svg>`;
}
function applySelfieText(out, type){
  const ts = chartPrefs(type).textStyle;
  const rules = [[".chart-title","title"],[".chart-subtitle","subtitle"],[".chart-label","labels"],[".chart-value","values"],[".chart-axis","axis"],[".chart-legend","legend"]];
  for (const [sel, grp] of rules) {
    const size = Number(ts[grp + "Size"]), color = ts[grp + "Color"];
    out.querySelectorAll(`svg ${sel}`).forEach(el => {
      if (size > 0) el.style.setProperty("font-size", `${size}px`, "important");
      if (/^#[0-9a-f]{6}$/i.test(color || "")) el.style.setProperty("fill", color, "important");
    });
  }
}
function renderSelfieChart(){
  const out = $("s-chart-out"), type = sChartType(), p = chartPrefs(type), m = selfieModel();
  out.style.background = chartBackgroundCss(p);
  out.style.setProperty("--chart-font-color", p.fontColor || "#e6e8ee");
  if (!m.days.length) { out.innerHTML = note("Импортируй базу или отметь первые селфи — здесь появятся графики"); return; }
  const days = sRangeDays(m), kind = sChartKind();
  out.innerHTML = kind === "matrix" ? sChartMatrix(m, days, p) : kind === "ranking" ? sChartRanking(m, days, p) : kind === "years" ? sChartYears(m, p) : sChartFridays(m, days, p);
  applySelfieText(out, type);
}
$("s-chart-type").onchange = () => {
  try { localStorage.setItem("chatstats.selfieChart.v1", sChartKind()); } catch (e) {}
  renderSelfieChart(); if ($("s-settings-panel").classList.contains("open")) renderSelfieSettings();
};
$("s-chart-copy").onclick = () => {
  const svg = $("s-chart-out").querySelector("svg");
  if (!svg) { $("s-chart-msg").textContent = "Сейчас нет графика"; return; }
  copyPngToStatus(() => svgToPngBlob(svg, chartPrefs(sChartType())), $("s-chart-msg"), "График скопирован");
};
$("s-chart-out").addEventListener("pointermove", e => {
  const node = e.target.closest?.("[data-tip]");
  if (!node) { hideTip(); return; }
  const [a, b = ""] = node.dataset.tip.split("|");
  showTip(`<b>${escH(a)}</b>${escH(b)}`, e);
});
$("s-chart-out").addEventListener("pointerleave", hideTip);

/* ---------- Настройка графиков селфи ---------- */
function renderSelfieSettings(){
  const type = sChartType(), kind = sChartKind(), p = chartPrefs(type), o = sOpts(p), box = $("s-settings-content");
  $("s-settings-title").textContent = `Настройка · ${SELFIE_CHARTS[kind]}`;
  const mode = p.backgroundMode || "linear", ts = p.textStyle;
  const color = (label, attr, value) => `<div class="chart-setting-field"><label>${escH(label)}</label><input type="color" ${attr} value="${value}" aria-label="${escH(label)}"></div>`;
  let html = `<div class="chart-setting-group chart-bg-group"><h3>Фон графика</h3><div class="chart-setting-field"><label>Тип фона</label><select data-s-bgmode><option value="solid"${mode === "solid" ? " selected" : ""}>Один цвет</option><option value="linear"${mode === "linear" ? " selected" : ""}>Линейный градиент</option><option value="radial"${mode === "radial" ? " selected" : ""}>Радиальный градиент</option></select></div>
    <div class="chart-bg-controls">${color(mode === "solid" ? "Цвет фона" : "Градиент · начало", 'data-s-app="backgroundStart"', p.backgroundStart)}${mode === "solid" ? "" : color("Градиент · конец", 'data-s-app="backgroundEnd"', p.backgroundEnd)}</div>
    ${mode === "linear" ? `<div class="chart-setting-field"><label>Угол градиента: <output data-s-out="angle">${Number(p.backgroundAngle ?? 135)}°</output></label><input type="range" min="0" max="360" step="5" value="${Number(p.backgroundAngle ?? 135)}" data-s-angle></div>` : ""}</div>`;
  html += `<div class="chart-setting-group chart-typography-group"><h3>Текст и размеры</h3><div class="chart-setting-field chart-subtitle-toggle chart-sub-inline"><label><input type="checkbox" data-s-sub${p.showSubtitle !== false ? " checked" : ""}> Показывать подзаголовок</label></div><div class="chart-typography-grid">` + TEXT_STYLE_LABELS.map(([g, label]) =>
    `<div class="chart-typography-row"><span class="chart-setting-series-name">${escH(label)}</span><div class="chart-font-range"><input type="number" inputmode="numeric" class="chart-font-num" min="8" max="48" step="1" value="${Number(ts[g + "Size"]) || 18}" data-s-size="${g}Size" aria-label="Размер: ${escH(label)}" title="Размер шрифта, px"><span class="chart-font-unit">px</span></div><div class="chart-font-color"><input type="color" data-s-app="${g}Color" value="${ts[g + "Color"]}" aria-label="Цвет: ${escH(label)}"></div></div>`).join("") + `</div></div>`;
  if (kind === "fridays") {
    html += `<div class="chart-setting-group"><h3>Столбцы</h3><div class="chart-setting-field"><label>Цвет столбцов</label><select data-s-opt="barMode"><option value="year"${o.barMode === "year" ? " selected" : ""}>По годам</option><option value="single"${o.barMode === "single" ? " selected" : ""}>Один цвет</option></select></div>${o.barMode === "single" ? color("Цвет столбцов", 'data-s-opt="bar"', o.bar) : ""}${color("Линия среднего", 'data-s-opt="avg"', o.avg)}<div class="chart-setting-field chart-subtitle-toggle"><label><input type="checkbox" data-s-opt="labels"${o.labels ? " checked" : ""}> Подписи значений</label></div></div>`;
  }
  if (kind === "matrix") {
    html += `<div class="chart-setting-group"><h3>Ячейки</h3><div class="chart-setting-field"><label>Форма</label><select data-s-opt="shape"><option value="square"${o.shape === "square" ? " selected" : ""}>Квадраты</option><option value="circle"${o.shape === "circle" ? " selected" : ""}>Круги</option></select></div><div class="chart-setting-field"><label>Размер: <output data-s-out="cellScale">${o.cellScale}%</output></label><input type="range" min="50" max="160" step="5" value="${o.cellScale}" data-s-opt="cellScale"></div><div class="chart-palette-fields">${color("Селфи", 'data-s-opt="did"', o.did)}${color("Пропуск", 'data-s-opt="miss"', o.miss)}${color("Не участвовал(а)", 'data-s-opt="none"', o.none)}</div></div>`;
  }
  if (kind === "ranking" || kind === "years" || (kind === "fridays" && o.barMode === "year")) {
    const m = selfieModel();
    const targets = kind === "ranking"
      ? [...m.persons.values()].filter(x => sVisible(x.pk)).map(x => ({x, c:sPersonRange(m, x, sRangeDays(m)).count})).filter(e => e.c > 0).sort((a, b) => b.c - a.c).slice(0, 30).map(e => ({k:`u:${e.x.pk}`, name:selfieNameOf(e.x.pk), base:getStyle("u", e.x.pk).c[0]}))
      : [...new Set(m.days.map(d => d.slice(0, 4)))].sort().map(y => ({k:`y:${y}`, name:y, base:yearHue(y)}));
    html += `<div class="chart-setting-group"><h3>Цвета ${kind === "ranking" ? "участников" : "лет"}</h3><div class="chart-setting-series-list">${targets.map(t => `<div class="chart-setting-series"><span class="chart-setting-series-name">${escH(t.name)}</span><input type="color" data-s-series="${escH(t.k)}" value="${p.seriesColors?.[t.k] || t.base}" aria-label="Цвет: ${escH(t.name)}"><button class="mini" type="button" data-s-series-reset="${escH(t.k)}" title="Вернуть стандартный цвет">↺</button></div>`).join("") || '<p class="hint">Нет данных</p>'}</div></div>`;
  }
  html += selfiePaletteGroupHtml(kind, p);
  html += `<div class="chart-setting-footer"><button class="mini" type="button" data-s-reset>Сбросить настройки этого графика</button></div>`;
  box.innerHTML = html;
}
function sSettingsEvent(e, isChange){
  const t = e.target, d = t.dataset, type = sChartType(), p = chartPrefs(type);
  let rebuild = false;
  const setOut = (k, v) => { const out = $("s-settings-content").querySelector(`[data-s-out="${k}"]`); if (out) out.textContent = v; };
  if (d.sBgmode !== undefined) { if (!isChange) return; p.backgroundMode = t.value; rebuild = true; }
  else if (d.sAngle !== undefined) { p.backgroundAngle = Number(t.value); setOut("angle", `${t.value}°`); }
  else if (d.sSub !== undefined) { if (!isChange) return; p.showSubtitle = t.checked; }
  else if (d.sSize) { const v = fontSizeVal(t, isChange); if (v == null) return; p.textStyle = {...p.textStyle, [d.sSize]:v}; }
  else if (d.sApp) { if (/Color$/.test(d.sApp)) p.textStyle = {...p.textStyle, [d.sApp]:t.value}; else p[d.sApp] = t.value; }
  else if (d.sOpt) {
    if ((t.tagName === "SELECT" || t.type === "checkbox") && !isChange) return;
    const v = t.type === "checkbox" ? t.checked : t.type === "range" ? Number(t.value) : t.value;
    p.selfie = {...sOpts(p), [d.sOpt]:v};
    if (t.type === "range") setOut(d.sOpt, `${v}%`);
    if (t.tagName === "SELECT") rebuild = true;
  }
  else if (d.sSeries) { p.seriesColors = {...(p.seriesColors || {}), [d.sSeries]:t.value}; }
  else return;
  CHART_PREFS[type] = p; saveChartPrefs(); renderSelfieChart();
  if (rebuild) renderSelfieSettings();
}
$("s-settings-content").addEventListener("input", e => sSettingsEvent(e, false));
$("s-settings-content").addEventListener("change", e => sSettingsEvent(e, true));
$("s-settings-content").addEventListener("click", e => {
  const type = sChartType(), resetSeries = e.target.closest("[data-s-series-reset]");
  if (resetSeries) { const p = chartPrefs(type); delete p.seriesColors[resetSeries.dataset.sSeriesReset]; CHART_PREFS[type] = p; }
  else if (e.target.closest("[data-s-reset]")) delete CHART_PREFS[type];
  else return;
  saveChartPrefs(); renderSelfieSettings(); renderSelfieChart();
});
function toggleSelfieSettings(open){
  const panel = $("s-settings-panel"), want = open === undefined ? !panel.classList.contains("open") : open;
  panel.classList.toggle("open", want); panel.setAttribute("aria-hidden", String(!want));
  $("s-settings-toggle").setAttribute("aria-expanded", String(want));
  if (want) renderSelfieSettings();
}
$("s-settings-toggle").onclick = () => toggleSelfieSettings();
$("s-settings-close").onclick = () => toggleSelfieSettings(false);

/* ---------- Селфи в профиле участника ---------- */
function selfieProfileHtml(pk){
  pk = String(pk);
  const m = selfieModel(), p = m.persons.get(pk), today = iso(new Date());
  const tile = (lbl, num, place, acc) => `<div class="tile" style="--tile-accent:${acc}"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${place}</div></div>`;
  let body;
  if (!SELFIE.length) body = `<p class="hint">База селфи пуста — импортируй Excel на вкладке «Селфи» или отметь селфи здесь.</p>`;
  else if (!p) body = `<p class="hint">У этого участника пока нет селфи в базе.</p>`;
  else {
    const all = sPersonRange(m, p, m.days), year = sPersonRange(m, p, m.days.filter(d => d.startsWith(today.slice(0, 4))));
    body = `<div class="tiles">
      ${tile("Всего селфи", fmt(p.total), `первое: ${sFmtDate(p.first)}`, "#9ece6a")}
      ${tile("Посещаемость", `${Math.round(all.att * 100)}%`, `${fmt(all.did)} из ${fmt(all.elig)} ${sFriW(all.elig)} · в этом году ${year.elig ? Math.round(year.att * 100) + "%" : "—"}`, "#7aa2f7")}
      ${tile("Текущая серия", fmt(p.current), `${sFriW(p.current)} подряд · рекорд ${fmt(p.maxStreak)}`, "#ff9e64")}
      ${tile("Пропуски", fmt(all.missed), all.lastMissed ? `последний: ${sFmtDate(all.lastMissed)}` : "ни одного пропуска", "#f7768e")}
      ${tile("Последнее селфи", sFmtDate(p.last), p.last === fridayOf(today) ? "в эту пятницу" : `${Math.round((dayIdx(fridayOf(today)) - dayIdx(p.last)) / 7)} нед. назад`, "#bb9af7")}
    </div>
    <div class="p-card" style="margin-top:12px"><h3>Последние 26 селфи-пятниц</h3>${sStrip(m, p, m.days.slice(-26), 16)}</div>`;
  }
  const F = fridayOf(today), done = p?.fr.has(F);
  return `<h2>Селфи</h2>${body}
    <div class="s-profile-edit"><input type="date" id="p-s-date" value="${today}" aria-label="Дата селфи"><span class="hint" id="p-s-hint">засчитается в пятницу ${sFmtDate(F)}${done ? " · уже отмечено" : ""}</span><button class="mini" id="p-s-mark" type="button">Отметить селфи</button><button class="mini" id="p-s-unmark" type="button">Снять отметку</button><span class="hint" id="p-s-msg"></span></div>`;
}
$("p-out").addEventListener("input", e => {
  if (e.target.id !== "p-s-date" || !e.target.value) return;
  const F = fridayOf(e.target.value), done = selfieModel().persons.get(String(person.value))?.fr.has(F);
  $("p-s-hint").textContent = `засчитается в пятницу ${sFmtDate(F)}${done ? " · уже отмечено" : ""}`;
});
$("p-out").addEventListener("click", e => {
  const mark = e.target.closest("#p-s-mark"), unmark = e.target.closest("#p-s-unmark");
  if (!mark && !unmark) return;
  if (!scCanEdit()) { scDenied($("p-s-msg")); return; }
  const date = $("p-s-date").value || iso(new Date()), pk = String(person.value), on = Boolean(mark);
  const changed = selfieSet(pk, "", date, on), F = sFmtDate(fridayOf(date));
  renderProfile();
  const msg = $("p-s-msg");
  if (msg) msg.textContent = changed ? (on ? `Селфи засчитано за ${F}. ${scOn() ? "Видно всем в облаке." : "Не забудь выгрузить базу в Excel."}` : `Отметка за ${F} снята.`) : (on ? `Уже отмечено за ${F}` : `За ${F} отметки нет`);
  if ($("p-s-date")) $("p-s-date").value = date;
});

/* ===================== Матрица дней / года: участники × периоды ===================== */
const DM_KEY = "chatstats.dayMatrix.v1";
let DM = {quick:"14", from:"", to:"", chat:"", metric:"msgs", top:"all", heat:false, year:false, week:false, minDays:0, sort:{k:"tot", dir:-1}, entity:"users"};
try { const j = JSON.parse(localStorage.getItem(DM_KEY) || "null"); if (j && typeof j === "object") DM = {...DM, ...j}; } catch (e) {}
// С версии 2026.10.25-14 матрица по умолчанию окрашивается в цвета темы сайта (свои цвета можно выбрать снова).
if (!DM.pal) DM.pal = "theme";
if (!DM.sort || typeof DM.sort !== "object") DM.sort = {k:"tot", dir:-1};
const dmSave = () => { try { localStorage.setItem(DM_KEY, JSON.stringify(DM)); } catch (e) {} };
const dmCache = new Map();
let dmRows = null, dmCompareRows = null, dmCompareError = "", dmReq = 0, dmLast = null;
const DM_MAX_DAYS = 92, DM_MAX_WEEK_DAYS = 731;
const DM_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DM_MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const DM_WD = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
function dmStatus(t, err = false){ const el = $("dm-status"); el.textContent = t; el.className = "status" + (err ? " err" : ""); }
function dmQuickRange(q){
  const t = new Date(), today = iso(t);
  if (q === "month") return [iso(new Date(t.getFullYear(), t.getMonth(), 1)), today];
  if (q === "prev") return [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), iso(new Date(t.getFullYear(), t.getMonth(), 0))];
  return [addDaysIso(today, -(Number(q) - 1)), today];
}
function dmYearRange(year){
  const y = Number(year), today = iso(new Date());
  return [`${y}-01-01`, y === new Date().getFullYear() ? today : `${y}-12-31`];
}
// Понедельник недели, в которую попадает дата.
function dmMonday(d){ const wd = new Date(d + "T00:00:00Z").getUTCDay(); return addDaysIso(d, -((wd + 6) % 7)); }
function dmSyncControls(){
  if (DM.year) {
    const anchor = DM.to || DM.from || iso(new Date());
    const y = Number(String(anchor).slice(0,4)) || new Date().getFullYear();
    [DM.from, DM.to] = dmYearRange(y); DM.quick = "";
  } else if (DM.quick) { const [f, t] = dmQuickRange(DM.quick); DM.from = f; DM.to = t; }
  $("dm-from").value = DM.from; $("dm-to").value = DM.to;
  const yearsMode = Boolean(DM.years);
  $("dm-year").checked = Boolean(DM.year) && !yearsMode; $("dm-year").disabled = yearsMode;
  if ($("dm-week")) { $("dm-week").checked = Boolean(DM.week) && !DM.year && !yearsMode; $("dm-week").disabled = Boolean(DM.year) || yearsMode; }
  if ($("dm-years")) $("dm-years").checked = yearsMode;
  if ($("dm-ym")) { $("dm-ym").value = DM.ym || ""; const f = $("dm-ym-field"); if (f) f.hidden = !yearsMode; }
  dmSyncYmd();
  document.querySelectorAll("#dm-quick button").forEach(b => b.classList.toggle("active", !yearsMode && b.dataset.q === DM.quick));
  const quickField = $("dm-quick")?.closest(".field"); if (quickField) quickField.hidden = Boolean(DM.year) || yearsMode;
  // «По годам» берёт всю историю — даты «С / По» не нужны.
  ["dm-from", "dm-to"].forEach(id => { const f = $(id)?.closest(".field"); if (f) f.hidden = yearsMode; });
  $("dm-metric").value = DM.metric; $("dm-top").value = DM.top; $("dm-heat").checked = DM.heat; $("dm-show-share").checked = DM.showShare !== false; $("dm-show-delta").checked = DM.showDelta !== false;
  if ($("dm-min")) $("dm-min").value = String(DM.minDays || 0);
  if ($("dm-min-msgs") && document.activeElement !== $("dm-min-msgs")) $("dm-min-msgs").value = DM.minMsgs ? String(DM.minMsgs) : "";
  if ($("dm-hide-noname")) { $("dm-hide-noname").checked = Boolean(DM.hideNoName); const l = $("dm-hide-noname").closest("label"); if (l) l.hidden = DM.entity === "chats"; }
  const chatsMode = DM.entity === "chats";
  document.querySelectorAll("#dm-entity [data-dm-entity]").forEach(b => b.classList.toggle("active", b.dataset.dmEntity === (chatsMode ? "chats" : "users")));
  const chatField = $("dm-chat")?.closest(".field"); if (chatField) chatField.hidden = chatsMode;
  const topLbl = document.querySelector('label[for="dm-top"]'); if (topLbl) topLbl.textContent = chatsMode ? "Чаты" : "Участники";
  const compare = $("dm-compare"); if (compare) compare.checked = comparisonEnabled;
}
function dmMaxMonth(rows, year){
  let max = 0;
  const prefix = `${year}-`;
  for (const row of rows || []) {
    const d = String(row[F.date] ?? "").slice(0,10);
    if (d.startsWith(prefix)) max = Math.max(max, Number(d.slice(5,7)) || 0);
  }
  return max;
}
function dmCompareRange(from, to, yearView, currentRows, weekView = false){
  if (yearView) {
    const year = Number(from.slice(0,4)) - 1;
    const maxMonth = dmMaxMonth(currentRows, Number(from.slice(0,4))) || Math.max(1, Number(to.slice(5,7)) || 1);
    const lastDay = new Date(year, maxMonth, 0).getDate();
    return [`${year}-01-01`, `${year}-${pad(maxMonth)}-${pad(lastDay)}`];
  }
  if (weekView) {
    const ws = dmMonday(from), ncols = Math.floor((dayIdx(to) - dayIdx(ws)) / 7) + 1;
    return [addDaysIso(ws, -ncols * 7), addDaysIso(ws, -1)];
  }
  const n = dayIdx(to) - dayIdx(from) + 1;
  const prevTo = addDaysIso(from, -1);
  return [addDaysIso(prevTo, -(n - 1)), prevTo];
}
async function dmGetRange(from, to, force = false){
  const key = `${from}|${to}`;
  if (force) dmCache.delete(key);
  if (!dmCache.has(key)) dmCache.set(key, ultView(await fetchAll(from, to)));
  return dmCache.get(key);
}
async function loadDayMatrix(force = false){
  dmSyncControls();
  // Сортировка по конкретной колонке не переносится на другой период.
  if (String(DM.sort?.k || "").startsWith("c")) { DM.sort = {k:"tot", dir:-1}; dmSave(); }
  if (DM.years) {
    const id = ++dmReq;
    try {
      dmStatus(""); $("dm-body").innerHTML = skRows(16, 10);
      if (force) { allRows = null; histP = null; }
      dmRows = await getHistory(); stamp(); // история уже с Ultimate и данными VK, если они включены
      dmCompareRows = null; dmCompareError = "";
    } catch (e) { if (id === dmReq) dmStatus("Не удалось загрузить данные: " + e.message, true); return; }
    if (id !== dmReq) return;
    if (hideLeft && !userMetricRows) { try { await ensureUserMetrics(); } catch (e) { leftFilterError = e.message || String(e); } }
    if (id !== dmReq) return;
    let lo = "", hi = "";
    for (const x of dmRows) { const d = String(x[F.date] ?? "").slice(0, 10); if (!d) continue; if (!lo || d < lo) lo = d; if (!hi || d > hi) hi = d; }
    if (!lo) { dmStatus("Нет данных", true); $("dm-body").innerHTML = ""; $("dm-head").innerHTML = ""; return; }
    const sel = $("dm-chat"); sel.value = DM.chat; fillChatSel(sel, dmRows); DM.chat = sel.value;
    renderDayMatrix(lo.slice(0, 4) + "-01-01", hi);
    return;
  }
  let from = DM.from, to = DM.to;
  if (!from || !to) { dmStatus("Выбери период", true); return; }
  if (from > to) [from, to] = [to, from];
  const len = dayIdx(to) - dayIdx(from) + 1, weekView = Boolean(DM.week) && !DM.year;
  if (!DM.year && !weekView && len > DM_MAX_DAYS) { dmStatus(`Слишком длинный период: ${fmt(len)} ${wordForm(len, ["день","дня","дней"])}. По дням можно до ${DM_MAX_DAYS} — включи «По неделям» (до двух лет) или «Год» для помесячной таблицы.`, true); $("dm-body").innerHTML = ""; $("dm-head").innerHTML = ""; return; }
  if (weekView && len > DM_MAX_WEEK_DAYS) { dmStatus(`Слишком длинный период для недель: максимум два года. Для больших периодов включи «Год».`, true); $("dm-body").innerHTML = ""; $("dm-head").innerHTML = ""; return; }
  const id = ++dmReq;
  try {
    dmStatus(""); $("dm-body").innerHTML = skRows(16, 10);
    const loadFrom = weekView ? dmMonday(from) : from;
    dmRows = await dmGetRange(loadFrom, to, force); stamp();
    // Предыдущий период грузим всегда: он нужен для колонки «Δ места»; разница в ячейках — только при «Сравнении».
    dmCompareRows = null; dmCompareError = "";
    const prev = dmCompareRange(from, to, Boolean(DM.year), dmRows, weekView);
    try { dmCompareRows = await dmGetRange(prev[0], prev[1], force); }
    catch (e) { dmCompareError = e.message || String(e); }
  } catch (e) { if (id === dmReq) dmStatus("Не удалось загрузить данные: " + e.message, true); return; }
  if (id !== dmReq) return;
  if (hideLeft && !userMetricRows) { try { await ensureUserMetrics(); } catch (e) { leftFilterError = e.message || String(e); } }
  if (id !== dmReq) return;
  const sel = $("dm-chat"); sel.value = DM.chat; fillChatSel(sel, dmRows); DM.chat = sel.value;
  renderDayMatrix(from, to);
}
function dmPct(v, total){
  if (!total) return "—";
  const p = v / total * 100;
  const s = p >= 3 ? String(Math.round(p)) : p >= 0.1 ? p.toFixed(1) : p.toFixed(2);
  return s + "%";
}
function dmDelta(current, previous, hasPrevious = true){
  if (!comparisonEnabled || !hasPrevious) return "";
  const delta = current - previous;
  if (!delta) return "";
  const label = delta > 0 ? "+" + fmt(delta) : fmt(delta);
  return ` <span class="compare-diff ${delta > 0 ? "positive" : "negative"}">(${label})</span>`;
}
function dmRankDelta(rank, prevRank){
  if (prevRank == null) return `<span class="dm-rk new" title="Не было в прошлом периоде">нов.</span>`;
  const d = prevRank - rank;
  if (!d) return `<span class="dm-rk same" title="Место не изменилось (было ${prevRank})">=</span>`;
  return `<span class="dm-rk ${d > 0 ? "up" : "down"}" title="Было ${prevRank}-е место">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</span>`;
}
function renderDayMatrix(from = DM.from, to = DM.to){
  if (!dmRows) return;
  // «По годам»: период всегда — вся история (смена чата, показателя и т. п. раньше сужала её до одного года).
  if (DM.years) { let lo = "", hi = ""; for (const x of dmRows) { const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10) continue; if (!lo || d < lo) lo = d; if (!hi || d > hi) hi = d; } if (lo) { from = lo.slice(0, 4) + "-01-01"; to = hi; } }
  if (from > to) [from, to] = [to, from];
  dmPopClose();
  const yearsView = Boolean(DM.years);
  const metric = DM.metric, today = iso(new Date()), yearView = !yearsView && Boolean(DM.year), weekView = !yearsView && !yearView && Boolean(DM.week), year = Number(from.slice(0,4));
  let columns;
  const ymSel = yearsView && /^\d{2}$/.test(DM.ym || "") ? DM.ym : "";
  const ymdW = yearsView ? dmYmdWindow(ymSel) : null;
  if (yearsView && ymdW && ymdW.ytd) {
    // «С начала года по сегодня»: каждый столбец — 1 января … сегодняшнее число своего года
    const y1 = Number(to.slice(0, 4)), cols = [], tm = ymdW.m, td = ymdW.b;
    for (let y = year; y <= y1; y++) {
      const a = `${y}-01-01`, b = `${y}-${pad(tm)}-${pad(Math.min(td, new Date(y, tm, 0).getDate()))}`;
      if (a > to || b < from) continue;
      const bb = b < to ? b : to;
      cols.push({key:`${y}-ytd`, y, label:String(y), sub:`1 ${DM_MONTHS[0]} – ${+bb.slice(8)} ${DM_MONTHS[+bb.slice(5, 7) - 1]}`, index:cols.length, date:a, from:a, to:b});
    }
    columns = cols;
  } else if (yearsView && ymSel) {
    // «Один месяц по годам»: каждый столбец — выбранный месяц своего года (или выбранные дни этого месяца)
    const y1 = Number(to.slice(0, 4)), mi = +ymSel - 1, cols = [];
    const dA = ymdW ? ymdW.a : 1, dB = ymdW ? ymdW.b : 31;
    for (let y = year; y <= y1; y++) {
      const last = new Date(y, mi + 1, 0).getDate(); if (dA > last) continue;
      const a = `${y}-${ymSel}-${pad(dA)}`, b = `${y}-${ymSel}-${pad(Math.min(dB, last))}`;
      if (a > to || b < from) continue;
      const part = to >= a && to < b, bb = part ? to : b;
      const sub = ymdW ? (+bb.slice(8) === dA ? `${dA} ${DM_MONTHS[mi]}` : `${dA}–${+bb.slice(8)} ${DM_MONTHS[mi]}`) : part ? `по ${+to.slice(8)} ${DM_MONTHS[mi]}` : DM_MONTHS[mi];
      cols.push({key:`${y}-${ymSel}`, y, label:String(y), sub, index:cols.length, date:a, from:a, to:b});
    }
    columns = cols;
  } else if (yearsView) {
    const y1 = Number(to.slice(0, 4));
    columns = Array.from({length:y1 - year + 1}, (_, i) => { const y = year + i, part = i === y1 - year && to < `${y}-12-31`; return {key:String(y), label:String(y), sub:part ? `по ${+to.slice(8)} ${DM_MONTHS[+to.slice(5,7)-1]}` : "", index:i, date:`${y}-01-01`, from:`${y}-01-01`, to:`${y}-12-31`}; });
  } else if (yearView) {
    const maxMonth = dmMaxMonth(dmRows, year);
    columns = Array.from({length:maxMonth}, (_, i) => ({key:`${year}-${pad(i+1)}`, label:DM_MONTHS[i], index:i, date:`${year}-${pad(i+1)}-01`, from:`${year}-${pad(i+1)}-01`, to:iso(new Date(year, i + 1, 0))}));
  } else if (weekView) {
    const ws = dmMonday(from), n = Math.floor((dayIdx(to) - dayIdx(ws)) / 7) + 1;
    columns = Array.from({length:n}, (_, i) => { const a = addDaysIso(ws, i * 7), b = addDaysIso(a, 6);
      return {key:a, label:`${+a.slice(8)} ${DM_MONTHS[+a.slice(5,7)-1]}`, sub:`–${+b.slice(8)} ${DM_MONTHS[+b.slice(5,7)-1]}`, index:i, date:a, from:a, to:b}; });
  } else {
    const days = []; for (let d = from; d <= to; d = addDaysIso(d, 1)) days.push(d);
    columns = days.map((d, i) => ({key:d, label:`${d.slice(8)} ${DM_MONTHS[+d.slice(5,7)-1]}`, index:i, date:d, from:d, to:d}));
  }
  const ncol = columns.length;
  const colOf = d => {
    if (yearsView && (ymSel || ymdW)) { const c = columns.find(c => c.y === +d.slice(0, 4)); return c && d >= c.from && d <= c.to ? c.index : -1; }
    if (yearsView) return Number(d.slice(0, 4)) - year;
    if (yearView) { if (d.slice(0, 4) !== String(year)) return -1; return Number(d.slice(5, 7)) - 1; }
    if (weekView) return Math.floor((dayIdx(d) - dayIdx(columns[0].from)) / 7);
    return dayIdx(d) - dayIdx(from);
  };
  const prevRange = yearsView ? [from, to] : dmCompareRange(from, to, yearView, dmRows, weekView);
  const priorColOf = d => {
    if (yearView) return Number(d.slice(5, 7)) - 1;
    if (weekView) return Math.floor((dayIdx(d) - dayIdx(prevRange[0])) / 7);
    return dayIdx(d) - dayIdx(prevRange[0]);
  };
  const chatsMode = DM.entity === "chats";
  function aggregate(sourceRows, isPrior = false){
    const result = new Map();
    (chatsMode ? chatRowsForChart(sourceRows || []) : pick(sourceRows || [], DM.chat)).forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      const idx = isPrior ? priorColOf(d) : colOf(d);
      if (idx == null || idx < 0 || idx >= ncol) return;
      if (!isPrior && (d < columns[0].from || d > columns[ncol - 1].to)) return;
      const k = chatsMode ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
      if (!chatsMode && !isVisibleUser(k)) return;
      const v = Number(g(x, metric)) || 0; if (!v) return;
      let u = result.get(k);
      if (!u) { u = {k, name:chatsMode ? String(x[F.chat] || `Чат ${k}`) : who(x), a:Array(ncol).fill(0), tot:0, days:new Set()}; result.set(k, u); }
      u.a[idx] += v; u.tot += v; u.days.add(d);
    });
    return result;
  }
  const per = aggregate(dmRows);
  let hasPrior = !dmCompareError && Array.isArray(dmCompareRows);
  let priorPer = hasPrior ? aggregate(dmCompareRows, true) : new Map();
  // «По годам»: «Сравнение» показывает разницу с предыдущим годом в каждой ячейке.
  if (yearsView) { hasPrior = true; priorPer = new Map([...per.values()].map(u => [u.k, {k:u.k, name:u.name, a:[u.a[0], ...u.a.slice(0, -1)], tot:u.tot, days:u.days}])); }
  const byTot = (a, b) => b.tot - a.tot || a.name.localeCompare(b.name, "ru");
  const ranked = [...per.values()].sort(byTot);
  const rankOf = new Map(ranked.map((u, i) => [u.k, i + 1]));
  const priorRank = new Map([...priorPer.values()].sort(byTot).map((u, i) => [u.k, i + 1]));
  const showDelta = !yearsView && hasPrior && priorPer.size > 0 && DM.showDelta !== false;
  const showShare = DM.showShare !== false;
  const minDays = Number(DM.minDays) || 0;
  const minMsgs = Math.max(0, Number(DM.minMsgs) || 0), hideNoName = Boolean(DM.hideNoName) && !chatsMode;
  const eligible = ranked.filter(u => u.days.size >= minDays && u.tot >= minMsgs && (!hideNoName || Object.prototype.hasOwnProperty.call(NAMES, u.k)));
  const hiddenLow = ranked.length - eligible.length;
  let shown = DM.top === "all" ? eligible : eligible.slice(0, Number(DM.top));
  // Сортировка по клику на заголовок; № всегда показывает место по сумме.
  const sk = DM.sort?.k || "tot", sd = DM.sort?.dir || -1;
  const sortVal = u => sk === "name" ? null : sk === "delta" ? (priorRank.has(u.k) ? priorRank.get(u.k) - rankOf.get(u.k) : -1e9) : sk === "tot" || sk === "share" ? u.tot : sk === "days" ? u.days.size : u.a[Number(sk.slice(1))] || 0;
  shown = [...shown].sort((a, b) => sk === "name" ? -sd * a.name.localeCompare(b.name, "ru") : sd * (sortVal(a) - sortVal(b)) || byTot(a, b));
  const colTot = columns.map((_, i) => ranked.reduce((sum, u) => sum + u.a[i], 0));
  const priorColTot = columns.map((_, i) => [...priorPer.values()].reduce((sum, u) => sum + u.a[i], 0));
  const grand = colTot.reduce((a, v) => a + v, 0), maxCol = Math.max(1, ...colTot);
  const colMax = columns.map((_, i) => Math.max(0, ...shown.map(u => u.a[i])));
  const cellMax = Math.max(1, ...colMax);
  const chatName = chatsMode ? "Чаты" : (DM.chat || "Все чаты");
  const cmpOn = comparisonEnabled && priorPer.size > 0;
  dmLast = {columns, per, ranked, colTot, metric, yearView, weekView, yearsView, year, priorPer, priorColOf, cmpOn, chatsMode};
  const bar = (v, i) => {
    // Числа под столбиками — в строке «Итого» внизу, поэтому здесь только сами столбики (число — во всплывающей подсказке).
    const h = Math.max(v ? 3 : 0, Math.round(v / maxCol * 58));
    return `<svg width="58" height="66" viewBox="0 0 58 66" aria-label="${fmt(v)}"><title>${fmt(v)}</title><rect class="anim-bar-y" x="14" y="${62 - h}" width="30" height="${h}" rx="3" fill="${dmFill()}" fill-opacity="${v ? .85 : 0}"/><line x1="4" y1="62.5" x2="54" y2="62.5" stroke="#3a4050"/></svg>`;
  };
  const tailCols = 1 + (showShare ? 1 : 0) + (showDelta ? 1 : 0);
  const arrow = k => sk === k ? (sd < 0 ? " ↓" : " ↑") : "";
  const sth = (k, label, cls = "", extra = "") => `<th data-dm-sort="${k}" class="${cls}${sk === k ? " sorted" : ""}" tabindex="0" title="Сортировать"${extra}>${label}${arrow(k)}</th>`;
  const upBtn = yearView ? `<button type="button" class="dm-up" data-dm-up="years" data-no-export="1">← Все годы</button>` : (!yearsView && !weekView && DM.drill === "month" && from.slice(0, 7) === to.slice(0, 7)) ? `<button type="button" class="dm-up" data-dm-up="year" data-no-export="1">← ${from.slice(0, 4)} по месяцам</button>` : "";
  const head1 = `<tr class="dm-bars"><th colspan="2" class="dm-corner">${upBtn}${escH(chatName)}<small>${escH(MLBL[metric].toLowerCase())}${yearsView ? (ymdW && ymdW.ytd ? ` · 1 января — ${ymdW.b} ${DM_GEN[ymdW.m - 1]} по годам` : ymSel ? ` · ${ymdW ? `${ymdW.a === ymdW.b ? ymdW.a : `${ymdW.a}–${ymdW.b}`} ${DM_GEN[+ymSel - 1]}` : MONTHS[+ymSel - 1].toLowerCase()} по годам` : " · по годам") : yearView ? ` · ${year} год` : weekView ? " · по неделям" : ""}</small></th>${columns.map((c, i) => `<th class="dm-barcell">${!yearView && c.from > today ? "" : bar(colTot[i], i)}</th>`).join("")}<th colspan="${tailCols}" class="dm-grand"></th></tr>`;
  const head2 = `<tr class="dm-labels"><th class="dm-no">№</th>${sth("name", chatsMode ? "Чат" : "Имя", "dm-name")}${columns.map((c, i) => {
    const wd = new Date(c.date + "T00:00:00Z").getUTCDay(), weekend = !yearView && !weekView && !yearsView && (wd === 0 || wd === 6);
    const label = weekView || c.sub ? `${escH(c.label)}<small>${escH(c.sub)}</small>` : escH(c.label);
    if (yearsView && ymSel) return `<th class="dm-drill" data-dm-drill="month" data-m="${c.key}" tabindex="0" title="Открыть ${escH(MONTHS[+ymSel - 1].toLowerCase())} ${c.y} по дням">${label}</th>`;
    if (yearsView) return `<th class="dm-drill" data-dm-drill="year" data-y="${c.key}" tabindex="0" title="Открыть ${c.key} год по месяцам">${label}</th>`;
    if (yearView) return `<th class="dm-drill" data-dm-drill="month" data-m="${c.key}" tabindex="0" title="Открыть ${escH(MONTHS[i].toLowerCase())} по дням">${label}</th>`;
    return sth("c" + i, label, weekend ? "dm-weekend" : "", ` data-col="${i}"`);
  }).join("")}${sth("tot", "Всего", "dm-totcol")}${showShare ? sth("share", "%") : ""}${showDelta ? sth("delta", "Δ места", "", ` title="Изменение места по сравнению с прошлым периодом"`) : ""}</tr>`;
  $("dm-head").innerHTML = head1 + head2;
  $("dm-table").style.setProperty("--dm-we", dmHl());
  const colSpanAll = ncol + 2 + tailCols;
  $("dm-body").innerHTML = shown.length ? shown.map(u => {
    const prior = priorPer.get(u.k), rank = rankOf.get(u.k);
    const cells = u.a.map((v, i) => {
      const pv = prior?.a?.[i] || 0;
      if (!v) return `<td class="dm-empty">${yearView || yearsView || columns[i].from <= today ? "–" : ""}${dmDelta(v, pv, cmpOn && Boolean(prior))}</td>`;
      const top = v === colMax[i];
      let style = "";
      if (top) style = `background-color:${hexA(dmHl(), DM.heat ? .6 : .42)};color:#fff`;
      else if (DM.heat) style = `background-color:${hexA(dmFill(), (0.06 + 0.4 * Math.pow(v / cellMax, 0.7)).toFixed(3))}`;
      return `<td class="dm-cell${top ? " dm-top" : ""}" data-dm-cell="${escH(u.k)}|${i}"${style ? ` style="${style}"` : ""}>${fmt(v)}${dmDelta(v, pv, cmpOn && Boolean(prior))}</td>`;
    }).join("");
    return `<tr><td class="dm-no${rank <= 3 ? " medal-" + rank : ""}">${rank}</td><td class="dm-name">${chatsMode ? `<span>${escH(u.name)}</span>` : `<span class="pname" data-open-profile="${escH(u.k)}">${escH(u.name)}</span>`}</td>${cells}<td class="dm-total">${fmt(u.tot)}${dmDelta(u.tot, prior?.tot || 0, cmpOn && Boolean(prior))}</td>${showShare ? `<td class="dm-share">${dmPct(u.tot, grand)}</td>` : ""}${showDelta ? `<td class="dm-delta">${dmRankDelta(rank, priorRank.get(u.k))}</td>` : ""}</tr>`;
  }).join("") : `<tr><td colspan="${colSpanAll}" style="text-align:center;color:var(--muted)">${hiddenLow ? `Все ${chatsMode ? "чаты" : "участники"} скрыты фильтрами (малоактивные, «меньше N», без имени)` : "Нет данных за выбранный период"}</td></tr>`;
  // Отдельная строка итогов по каждому столбцу (по всем участникам/чатам, даже если показан только топ).
  const footName = shown.length < ranked.length ? `Итого по всем (${ranked.length})` : "Итого";
  $("dm-foot").innerHTML = shown.length ? `<tr class="dm-sum"><td class="dm-no"></td><td class="dm-name">${escH(footName)}</td>${colTot.map((v, i) => `<td class="dm-sumcell">${v ? fmt(v) : (yearView || yearsView || columns[i].from <= today ? "–" : "")}${yearsView && i === 0 ? "" : dmDelta(v, priorColTot[i] || 0, cmpOn)}</td>`).join("")}<td class="dm-total">${fmt(grand)}${dmDelta(grand, priorColTot.reduce((a, v) => a + v, 0), cmpOn && !yearsView)}</td>${showShare ? `<td class="dm-share">100%</td>` : ""}${showDelta ? `<td class="dm-delta"></td>` : ""}</tr>` : "";
  dmSticky();
  const leftNote = hideLeft && leftFilterError ? ` · статусы участников не получены, вышедшие не отфильтрованы` : "";
  const comparisonNote = comparisonEnabled ? (yearsView ? " · сравнение с предыдущим годом" : dmCompareError ? ` · не удалось загрузить предыдущий период: ${dmCompareError}` : ` · сравнение с ${yearView ? (year-1) + " годом" : "предыдущим периодом"}`) : "";
  const unit = yearsView ? "каждого года" : yearView ? "каждого месяца" : weekView ? "каждой недели" : "каждого дня";
  const heading = yearsView ? `${ncol} ${wordForm(ncol, ["год","года","лет"])} · ${columns[0].label} — ${columns[ncol - 1].label}${window.__vk && window.__vk.state && window.__vk.state().ON ? " · с данными VK" : ""}` : yearView ? `${ncol} ${wordForm(ncol, ["месяц","месяца","месяцев"])} за ${year} год` : weekView ? `${ncol} ${wordForm(ncol, ["неделя","недели","недель"])} · ${sFmtDate(columns[0].from)} — ${sFmtDate(to)}` : `${fmt(ncol)} ${wordForm(ncol, ["день","дня","дней"])} · ${sFmtDate(from)} — ${sFmtDate(to)}`;
  const lowNote = hiddenLow ? ` · скрыто фильтрами: ${hiddenLow}` : "";
  dmStatus(`${heading} · ${chatsMode ? "чатов" : "участников"}: ${fmt(ranked.length)}${shown.length < ranked.length ? `, показано ${shown.length}` : ""}${lowNote} · подсвечен лучший результат ${unit} · нажми на число, чтобы увидеть подробности${comparisonNote}${leftNote}`);
}
// Шапка и колонки «№ / Имя» не уезжают при прокрутке: отступы считаются по реальным размерам.
function dmSticky(){
  const t = $("dm-table"); if (!t) return;
  requestAnimationFrame(() => {
    const r1 = t.querySelector("thead tr.dm-bars"), no = t.querySelector("thead .dm-no");
    const h1 = r1 ? r1.getBoundingClientRect().height : 0, w1 = no ? no.getBoundingClientRect().width : 44;
    t.style.setProperty("--dm-h1", h1 + "px"); t.style.setProperty("--dm-w1", w1 + "px");
  });
}

/* --- Подробности ячейки --- */
let dmPopEl = null;
function dmPopClose(){ if (dmPopEl) { dmPopEl.remove(); dmPopEl = null; } document.querySelectorAll("#dm-table td.dm-sel").forEach(x => x.classList.remove("dm-sel")); }
function dmCellDetails(k, i){
  const L = dmLast; if (!L) return "";
  const c = L.columns[i], u = L.per.get(k); if (!c || !u) return "";
  const inCol = x => { const d = String(x[F.date] ?? "").slice(0, 10); return d >= c.from && d <= c.to; };
  const chatRows = chatRowsForChart(dmRows || []).filter(inCol);
  const keyU = x => String(x[F.userId] ?? x[F.name]), keyC = x => String(x[F.chatPk] ?? x[F.chat]);
  // Строки, из которых сложено число в ячейке (для участника — с учётом фильтра чата).
  const rowsCell = L.chatsMode ? chatRows.filter(x => keyC(x) === k) : pick(dmRows || [], DM.chat).filter(x => keyU(x) === k && inCol(x));
  const sumM = (rs, key) => rs.reduce((s2, x) => s2 + (Number(g(x, key)) || 0), 0);
  const v = u.a[i], colTot = L.colTot[i];
  const order = L.ranked.map(x => x.a[i]).filter(x => x > 0).sort((a, b) => b - a), place = order.indexOf(v) + 1;
  const unit = L.yearsView ? "года" : L.yearView ? "месяца" : L.weekView ? "недели" : "дня";
  const title = L.yearsView ? `${c.label} год` : L.yearView ? `${MONTHS[i]} ${L.year}` : L.weekView ? `Неделя ${sFmtDate(c.from)} — ${sFmtDate(c.to)}` : `${sFmtDate(c.from)}, ${DM_WD[new Date(c.from + "T00:00:00Z").getUTCDay()]}`;
  let h = `<div class="dm-pop-h"><b>${escH(u.name)}</b><span>${escH(title)}</span><button type="button" class="dm-pop-x" aria-label="Закрыть">×</button></div>`;
  h += `<div class="dm-pop-grid">`;
  h += `<div><em>Место среди ${L.chatsMode ? "чатов" : "участников"}</em><b>${place ? `${place} из ${order.length}` : "—"}</b></div><div><em>Доля ${unit}</em><b>${dmPct(v, colTot)}</b></div>`;
  if (L.cmpOn && !(L.yearsView && i === 0)) { const p = L.priorPer.get(k)?.a?.[i] || 0; h += `<div><em>${L.yearsView ? "В прошлом году" : "В прошлом периоде"}</em><b>${fmt(p)} ${dmDelta(v, p, true)}</b></div>`; }
  if (L.yearView || L.weekView || L.yearsView) {
    const days = new Map(); rowsCell.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10), m = Number(g(x, L.metric)) || 0; if (m) days.set(d, (days.get(d) || 0) + m); });
    const best = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
    h += `<div><em>Активных дней</em><b>${days.size}</b></div>`;
    if (best) h += `<div><em>Лучший день</em><b>${fmt(best[1])} · ${sFmtDate(best[0])}</b></div>`;
  }
  h += `</div><div class="dm-pop-sub">Все показатели${!L.chatsMode && DM.chat ? ` · чат «${escH(DM.chat)}»` : ""}</div><div class="dm-pop-grid">` + ["msgs", "stick", "voice", "video", ...RX_KEYS].map(key => `<div class="${key === L.metric ? "on" : ""}"><em>${MLBL[key]}</em><b>${fmt(sumM(rowsCell, key))}</b></div>`).join("") + `</div>`;
  // Разбивка: для участника — по всем чатам, для чата — по участникам.
  const groups = new Map();
  (L.chatsMode ? chatRows.filter(x => keyC(x) === k && isVisibleUser(keyU(x))) : chatRows.filter(x => keyU(x) === k)).forEach(x => {
    const gk = L.chatsMode ? keyU(x) : String(x[F.chat] || "Без названия"), m = Number(g(x, L.metric)) || 0; if (!m) return;
    const e = groups.get(gk) || {n:L.chatsMode ? who(x) : gk, v:0, k:gk}; e.v += m; groups.set(gk, e);
  });
  const list = [...groups.values()].sort((a, b) => b.v - a.v);
  if (list.length) {
    const mx = list[0].v, tot = list.reduce((a, b) => a + b.v, 0), cap = 15;
    h += `<div class="dm-pop-sub">${L.chatsMode ? `Участники (${list.length})` : `По всем чатам (${list.length})`} · ${escH(MLBL[L.metric].toLowerCase())}</div>`;
    h += list.slice(0, cap).map(e => {
      const sel = !L.chatsMode && DM.chat && e.k === DM.chat, col = L.chatsMode ? getStyle("u", e.k).c[0] : dmFill();
      return `<div class="dm-pop-bar${sel ? " sel" : ""}"><span title="${escH(e.n)}">${L.chatsMode ? `<span class="pname" data-open-profile="${escH(e.k)}">${escH(e.n)}</span>` : escH(e.n)}</span><i style="--w:${(e.v / mx * 100).toFixed(1)}%;--c:${col}"></i><b>${fmt(e.v)}<small> ${dmPct(e.v, tot)}</small></b></div>`;
    }).join("");
    if (list.length > cap) h += `<div class="dm-pop-sub">…и ещё ${list.length - cap}: ${fmt(list.slice(cap).reduce((a, b) => a + b.v, 0))}</div>`;
  }
  return h;
}
$("dm-table").addEventListener("click", e => {
  const up = e.target.closest("[data-dm-up]");
  if (up) {
    if (up.dataset.dmUp === "years") { DM.year = false; DM.years = true; DM.drill = ""; }
    else { const y = Number(DM.from.slice(0, 4)); DM.years = false; DM.year = true; DM.quick = ""; DM.drill = ""; [DM.from, DM.to] = dmYearRange(y); }
    DM.sort = {k:"tot", dir:-1}; dmSave(); loadDayMatrix(); return;
  }
  const dr = e.target.closest("[data-dm-drill]");
  if (dr) {
    dmPopClose();
    if (dr.dataset.dmDrill === "year") { const y = Number(dr.dataset.y); DM.years = false; DM.year = true; DM.week = false; DM.quick = ""; DM.drill = ""; [DM.from, DM.to] = dmYearRange(y); }
    else { const [y, m] = dr.dataset.m.split("-").map(Number), today = iso(new Date()), last = iso(new Date(y, m, 0)); DM.years = false; DM.year = false; DM.week = false; DM.quick = ""; DM.drill = "month"; DM.from = `${y}-${pad(m)}-01`; DM.to = last > today ? today : last; }
    DM.sort = {k:"tot", dir:-1}; dmSave(); loadDayMatrix(); return;
  }
  const th = e.target.closest("[data-dm-sort]");
  if (th) {
    const k = th.dataset.dmSort, cur = DM.sort || {};
    DM.sort = {k, dir: cur.k === k ? -(cur.dir || -1) : (k === "name" ? 1 : -1)};
    dmSave(); renderDayMatrix(); return;
  }
  const td = e.target.closest("td[data-dm-cell]");
  if (!td) return;
  if (e.target.closest(".pname")) return;
  const wasSel = td.classList.contains("dm-sel");
  dmPopClose(); if (wasSel) return;
  const [k, i] = td.dataset.dmCell.split("|");
  const html = dmCellDetails(k, Number(i)); if (!html) return;
  td.classList.add("dm-sel");
  dmPopEl = document.createElement("div"); dmPopEl.className = "dm-pop"; dmPopEl.innerHTML = html; document.body.appendChild(dmPopEl);
  const r = td.getBoundingClientRect(), w = dmPopEl.offsetWidth, h = dmPopEl.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
  if (y + h > innerHeight - 8) y = r.top - h - 8;
  x = Math.max(8, Math.min(innerWidth - w - 8, x)); y = Math.max(8, y);
  dmPopEl.style.left = (x + scrollX) + "px"; dmPopEl.style.top = (y + scrollY) + "px";
});
$("dm-table").addEventListener("keydown", e => { const th = e.target.closest?.("[data-dm-sort], [data-dm-drill]"); if (th && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); th.click(); } });
document.addEventListener("click", e => { if (dmPopEl && (e.target.closest(".dm-pop-x") || (!dmPopEl.contains(e.target) && !e.target.closest("td[data-dm-cell]")))) dmPopClose(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") dmPopClose(); });
$("dm-table").closest(".wrap")?.addEventListener("scroll", () => dmPopClose(), {passive:true});
addEventListener("resize", () => { if ($("tab-daymatrix")?.classList.contains("active")) dmSticky(); });
function dmTitle(){
  const f = DM.from <= DM.to ? DM.from : DM.to, t = DM.from <= DM.to ? DM.to : DM.from;
  if (DM.years && dmLast?.yearsView) { const c = dmLast.columns, ymS = /^\d{2}$/.test(DM.ym || "") ? DM.ym : "", ymW = dmYmdWindow(ymS), ym = ymW && ymW.ytd ? `1 января — ${ymW.b} ${DM_GEN[ymW.m - 1]} ` : ymS ? `${MONTHS[+ymS - 1].toLowerCase()}${ymW ? ` ${ymW.a === ymW.b ? ymW.a : `${ymW.a}–${ymW.b}`}` : ""} ` : ""; return `${MLBL[DM.metric]} · ${ym}по годам · ${DM.entity === "chats" ? "сравнение чатов" : (DM.chat || "Все чаты")} · ${c[0]?.label || ""} — ${c[c.length - 1]?.label || ""}`; }
  return `${MLBL[DM.metric]} ${DM.year ? "по месяцам" : DM.week ? "по неделям" : "по дням"} · ${DM.entity === "chats" ? "сравнение чатов" : (DM.chat || "Все чаты")} · ${DM.year ? f.slice(0,4) + " год" : sFmtDate(f) + " — " + sFmtDate(t)}`;
}
document.querySelectorAll("#dm-quick button").forEach(b => b.onclick = () => { DM.quick = b.dataset.q; DM.year = false; DM.years = false; DM.drill = ""; if (b.dataset.q === "182") DM.week = true; dmSave(); loadDayMatrix(); });
$("dm-week").onchange = () => {
  DM.week = $("dm-week").checked;
  // Вернувшись к дням с длинным периодом, ужимаем его до допустимых 92 дней.
  if (!DM.week && !DM.year && DM.from && DM.to && dayIdx(DM.to) - dayIdx(DM.from) + 1 > DM_MAX_DAYS) { DM.quick = "30"; [DM.from, DM.to] = dmQuickRange("30"); }
  dmSave(); loadDayMatrix();
};
document.querySelectorAll("#dm-entity [data-dm-entity]").forEach(b => b.onclick = () => { DM.entity = b.dataset.dmEntity; dmSave(); dmSyncControls(); renderDayMatrix(); });
$("dm-min").onchange = () => { DM.minDays = Number($("dm-min").value) || 0; dmSave(); renderDayMatrix(); };
{ let t = 0; const apply = () => { DM.minMsgs = Math.max(0, Math.floor(Number($("dm-min-msgs").value) || 0)); dmSave(); renderDayMatrix(); };
  $("dm-min-msgs").addEventListener("input", () => { clearTimeout(t); t = setTimeout(apply, 350); });
  $("dm-min-msgs").addEventListener("change", () => { clearTimeout(t); apply(); }); }
$("dm-hide-noname").onchange = () => { DM.hideNoName = $("dm-hide-noname").checked; dmSave(); renderDayMatrix(); };
["dm-from", "dm-to"].forEach(id => $(id).onchange = () => {
  const value = $(id).value; DM.quick = ""; DM.drill = "";
  if (DM.year && value) { const y = Number(value.slice(0,4)); [DM.from, DM.to] = dmYearRange(y); }
  else { DM.from = $("dm-from").value; DM.to = $("dm-to").value; }
  dmSave(); loadDayMatrix();
});
function dmYmdWindow(ymSel){
  // Какие дни брать в «По годам»: null — все; {a, b} — дни месяца; {ytd, m, b} — с 1 января по сегодняшнее число.
  const v = DM.ymd || "", t = iso(new Date()), tm = +t.slice(5, 7), td = +t.slice(8);
  if (v === "today") return ymSel ? {a:1, b:td} : {ytd:true, m:tm, b:td};
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m && ymSel) { let a = Math.min(31, Math.max(1, +m[1])), b = Math.min(31, Math.max(1, +m[2])); if (a > b) [a, b] = [b, a]; return a === 1 && b === 31 ? null : {a, b}; }
  return null;
}
function dmTodayLabel(){ const t = iso(new Date()), d = +t.slice(8), m = DM_GEN[+t.slice(5, 7) - 1]; return `${d === 1 ? "1" : `1–${d}`} ${m} по годам`; }
function dmSyncYmd(){
  const f = $("dm-ymd-field"); if (!f) return;
  const yearsMode = Boolean(DM.years), ymSel = /^\d{2}$/.test(DM.ym || "") ? DM.ym : "";
  f.hidden = !yearsMode;
  let v = DM.ymd || ""; const custom = /^\d/.test(v);
  const mode = v === "today" ? "today" : custom && ymSel ? "custom" : "";
  f.querySelectorAll("#dm-ymd button").forEach(b => b.classList.toggle("active", b.dataset.d === mode));
  const cb = $("dm-ymd-custom-btn"); if (cb) cb.hidden = !ymSel;
  const tb = $("dm-ymd-today"); if (tb) { const td = +iso(new Date()).slice(8); tb.textContent = ymSel ? (td === 1 ? "1-е число" : `1–${td}`) : "С 1 января по сегодня"; tb.title = ymSel ? "С 1-го по сегодняшнее число в каждом году" : "С 1 января по сегодняшнюю дату в каждом году"; }
  const cs = $("dm-ymd-custom"); if (cs) cs.hidden = mode !== "custom";
  if (mode === "custom") { const [a, b] = v.split("-"); if (document.activeElement !== $("dm-ymd-a")) $("dm-ymd-a").value = a; if (document.activeElement !== $("dm-ymd-b")) $("dm-ymd-b").value = b; }
  const qb = $("dm-today-years"); if (qb) { qb.innerHTML = `<span aria-hidden="true" translate="no">📅</span> <span>${dmTodayLabel()}</span>`; const cur = iso(new Date()).slice(5, 7); qb.classList.toggle("active", yearsMode && DM.ym === cur && DM.ymd === "today"); }
}
function dmYmdApply(){ DM.sort = {k:"tot", dir:-1}; dmSave(); dmSyncYmd(); if (DM.years && dmRows) renderDayMatrix(); else loadDayMatrix(); }
document.querySelectorAll("#dm-ymd button").forEach(b => b.onclick = () => {
  const d = b.dataset.d;
  if (d === "custom") { const t = +iso(new Date()).slice(8); const cur = /^\d/.test(DM.ymd || "") ? DM.ymd : `1-${Math.max(1, t)}`; DM.ymd = cur; }
  else DM.ymd = d;
  dmYmdApply();
});
["dm-ymd-a", "dm-ymd-b"].forEach(id => $(id) && $(id).addEventListener("change", () => {
  const a = Math.min(31, Math.max(1, +$("dm-ymd-a").value || 1)), b = Math.min(31, Math.max(1, +$("dm-ymd-b").value || a));
  DM.ymd = `${Math.min(a, b)}-${Math.max(a, b)}`; dmYmdApply();
}));
$("dm-today-years") && ($("dm-today-years").onclick = () => {
  const cur = iso(new Date()).slice(5, 7), on = DM.years && DM.ym === cur && DM.ymd === "today";
  if (on) { DM.ymd = ""; dmYmdApply(); return; }
  const wasYears = DM.years;
  DM.years = true; DM.ym = cur; DM.ymd = "today"; DM.sort = {k:"tot", dir:-1};
  if ($("dm-years")) $("dm-years").checked = true;
  dmSave();
  if (!wasYears) { dmSyncControls(); loadDayMatrix(); } else { dmSyncControls(); renderDayMatrix(); }
});
$("dm-ym").onchange = () => { DM.ym = $("dm-ym").value; dmSyncYmd(); DM.sort = {k:"tot", dir:-1}; dmSave(); if (DM.years && dmRows) renderDayMatrix(); else loadDayMatrix(); };
$("dm-years").onchange = () => {
  DM.years = $("dm-years").checked;
  if (!DM.years && !DM.from) { DM.quick = "30"; [DM.from, DM.to] = dmQuickRange("30"); }
  DM.sort = {k:"tot", dir:-1};
  dmSave(); loadDayMatrix();
};
$("dm-year").onchange = () => {
  DM.year = $("dm-year").checked; DM.quick = ""; DM.years = false;
  if (DM.year) { const anchor = DM.to || DM.from || iso(new Date()); [DM.from, DM.to] = dmYearRange(Number(anchor.slice(0,4))); }
  else { const today = iso(new Date()); DM.quick = "30"; [DM.from, DM.to] = dmQuickRange(DM.quick); }
  dmSave(); loadDayMatrix();
};
$("dm-chat").onchange = () => { DM.chat = $("dm-chat").value; dmSave(); renderDayMatrix(); };
$("dm-metric").onchange = () => { DM.metric = $("dm-metric").value; dmSave(); renderDayMatrix(); };
$("dm-top").onchange = () => { DM.top = $("dm-top").value; dmSave(); renderDayMatrix(); };
$("dm-heat").onchange = () => { DM.heat = $("dm-heat").checked; dmSave(); renderDayMatrix(); };
$("dm-show-share").onchange = () => { DM.showShare = $("dm-show-share").checked; dmSave(); renderDayMatrix(); };
$("dm-show-delta").onchange = () => { DM.showDelta = $("dm-show-delta").checked; dmSave(); renderDayMatrix(); };
$("dm-copy").onclick = () => {
  // Липкие ячейки при прокрутке смещаются — для картинки возвращаем таблицу в начало.
  const w = $("dm-table").closest(".wrap"); if (w) { w.scrollTop = 0; w.scrollLeft = 0; }
  dmPopClose();
  copyTableImage("dm-table", dmTitle, "dm-copy-status");
};

/* ===================== Палитры для всех графиков ===================== */
// Последовательные палитры (мало → средне → много): календарь, спираль, карта участников/чатов.
const SEQ_PALETTES = [
  ["Тёплые", [
    ["Огонь",["#2a0b0b","#7a1a12","#d9481e","#ff9a3c","#ffe9a8"]],
    ["Закат",["#241033","#6b1f5c","#c2416b","#ff8a5c","#ffe0a3"]],
    ["Роза",["#2a0f1f","#6e1a3f","#c23266","#ff7aa2","#ffd6e3"]],
    ["Янтарь",["#261a08","#6b4510","#c2861b","#f2c14e","#fff1c2"]],
    ["Медь",["#1f130c","#5c3220","#a8603a","#e0a070","#fde3c8"]]]],
  ["Холодные", [
    ["Океан",["#081a26","#0c3d5c","#1f7a8c","#4cc4c9","#cffaf2"]],
    ["Синий",["#0b1430","#1c3b7a","#2f6fd6","#74b3ff","#dcefff"]],
    ["Индиго",["#120f33","#2e2a7a","#4f46e5","#9a9cff","#e6e6ff"]],
    ["Лёд",["#121a24","#2c4a63","#5a8fc2","#a7cdf0","#f3faff"]]]],
  ["Природные", [
    ["Лес",["#0e1f14","#1f4a2b","#3f8a4a","#8fcf6a","#e9f7b8"]],
    ["Мята",["#0b2420","#13564a","#2bb39a","#7fe8cf","#e2fff6"]],
    ["Пустыня",["#241a10","#5c4428","#a8804d","#dcb67f","#f8ead2"]],
    ["Сакура",["#24131d","#5c2a48","#a8507e","#e48fb6","#ffe3f0"]]]],
  ["Неон", [
    ["Синтвейв",["#170a2e","#5b1a8a","#f72585","#ff9e64","#fff0a8"]],
    ["Кибер",["#0d0a26","#3b1a8a","#9333ea","#22d3ee","#d9fbff"]],
    ["Кислота",["#0a1f12","#145c2e","#22c55e","#b8f54a","#f6ffc2"]],
    ["Вейпорвейв",["#1a1033","#6a2c91","#ff6ad5","#8af1ff","#f2feff"]]]],
  ["Научные", [
    ["Виридис",["#440154","#3b528b","#21918c","#5ec962","#fde725"]],
    ["Инферно",["#000004","#57106e","#bc3754","#f98e09","#fcffa4"]],
    ["Магма",["#000004","#51127c","#b73779","#fc8961","#fcfdbf"]],
    ["Мако",["#0b0405","#3e356b","#357ba3","#60cea9","#def5e5"]],
    ["Рокет",["#03051a","#701f57","#e13342","#f6956a","#faebdd"]]]],
  ["Спокойные", [
    ["Графит",["#1a1c22","#3b3f4a","#6b7280","#a9afbb","#eef0f4"]],
    ["Сепия",["#1f1812","#4a3a2c","#8a6d52","#c4a684","#f3e6d2"]],
    ["Лаванда",["#1d1a33","#3f3870","#7c6fd6","#b9b0ff","#f1edff"]],
    ["Ночь и луна",["#0f1428","#2a3466","#5867a8","#b2a9c9","#fff3c4"]]]],
];
// Категориальные палитры: цвета участников, чатов, лет и диапазонов.
const CAT_PALETTES = [
  ["Яркие", [
    ["Стандарт",["#ff4d6d","#7aa2f7","#e0af68","#9ece6a","#bb9af7","#2ac3de","#ff9e64","#73daca","#e879f9","#f7f3a1","#c0caf5"]],
    ["Неон",["#ff2bd6","#00f0ff","#b6ff00","#ffe600","#ff6a00","#8a2bff","#00ff9c","#ff3366","#3d7bff","#ffffff"]],
    ["Конфеты",["#ff6f91","#ffc75f","#f9f871","#845ec2","#00c9a7","#ff9671","#4b9dff","#c34a36","#b0e57c","#d0a2f7"]],
    ["Ретро",["#e76f51","#f4a261","#e9c46a","#2a9d8f","#8ab17d","#d62828","#264653","#9c6644","#f2e8cf","#6d597a"]],
    ["Тропики",["#ff595e","#ffca3a","#8ac926","#1982c4","#6a4c93","#ff924c","#52a675","#c5ca30","#36949d","#ff70a6"]]]],
  ["Мягкие", [
    ["Пастель",["#ffadad","#ffd6a5","#fdffb6","#a8e6a1","#9bf6ff","#a0c4ff","#d4a5ff","#ffc6ff"]],
    ["Винтаж",["#c97b63","#e0a96d","#8fb9a8","#fcd0ba","#a68a9a","#5f7f9e","#f2e9a0","#7c9a5e","#b15e6c","#3f4a5a"]],
    ["Земля",["#bc6c25","#dda15e","#a3b18a","#588157","#e9edc9","#7f5539","#b08968","#2b4a6b","#c9ada7","#e07a5f"]]]],
  ["Тематические", [
    ["Закат",["#ff7b54","#ffd56b","#ff5d8f","#c06c84","#6c5b7b","#3fb8af","#f8b195","#99b898","#ffe8d6","#2a363b"]],
    ["Осень",["#d1495b","#edae49","#00798c","#30638e","#a7754c","#5c3d2e","#f2cc8f","#6a994e","#9b5de5","#e5e5c8"]],
    ["Северное сияние",["#2ed8a3","#00c2ff","#7b61ff","#c792ea","#ff6ec7","#f9f871","#43e97b","#5e60ce","#ffa69e","#e0fbfc"]],
    ["Космос",["#b5179e","#f72585","#4361ee","#4cc9f0","#7209b7","#ffd60a","#06d6a0","#ff8500","#e0aaff","#ffffff"]]]],
  ["Удобные для глаз", [
    ["Окабэ — Ито",["#e69f00","#56b4e9","#009e73","#f0e442","#0072b2","#d55e00","#cc79a7","#999999","#ffffff"]],
    ["Тол",["#4477aa","#66ccee","#228833","#ccbb44","#ee6677","#aa3377","#bbbbbb","#ee8866","#44bb99","#ffaabb"]],
    ["Контраст",["#ffffff","#ffd166","#06d6a0","#118ab2","#ef476f","#8338ec","#fb5607","#b5e48c","#9b5de5","#ff99c8"]]]],
  ["Темы редакторов", [
    ["Катпуччин",["#f38ba8","#89b4fa","#a6e3a1","#f9e2af","#cba6f7","#94e2d5","#fab387","#74c7ec","#f5c2e7","#cdd6f4"]],
    ["Дракула",["#ff79c6","#8be9fd","#50fa7b","#f1fa8c","#bd93f9","#ffb86c","#ff5555","#6272a4","#f8f8f2"]],
    ["Норд",["#88c0d0","#bf616a","#a3be8c","#ebcb8b","#b48ead","#d08770","#5e81ac","#eceff4","#4c566a"]],
    ["Грувбокс",["#fb4934","#b8bb26","#fabd2f","#83a598","#d3869b","#8ec07c","#fe8019","#ebdbb2","#928374"]],
    ["Токио",["#7aa2f7","#bb9af7","#7dcfff","#9ece6a","#e0af68","#f7768e","#ff9e64","#73daca","#ffffff","#db4b4b"]]]],
];
// Пары «селфи / пропуск» для карты посещаемости.
const PAIR_PALETTES = [
  ["Пары", [
    ["Классика",["#9ece6a","#f7768e"]],
    ["Для дальтоников",["#56b4e9","#e69f00"]],
    ["Неон",["#00f5d4","#ff006e"]],
    ["Пастель",["#caffbf","#ffadad"]],
    ["Океан",["#4cc9f0","#f4a261"]],
    ["Фиолет",["#bb9af7","#e0af68"]],
    ["Монохром",["#e5e7eb","#575d6b"]],
    ["Закат",["#ffd56b","#c06c84"]],
    ["Лес",["#52b788","#bc6c25"]],
    ["Лёд",["#a0c4ff","#ff8fa3"]],
    ["Мята и коралл",["#5eead4","#ff7f6e"]],
    ["Лайм и слива",["#a3e635","#a855f7"]],
    ["Золото и графит",["#e8c26a","#4b5563"]],
    ["Небо и малина",["#7dd3fc","#e11d74"]],
    ["Бирюза и янтарь",["#2dd4bf","#f59e0b"]],
    ["Индиго и персик",["#6366f1","#fdba74"]]]],
];
const palMap = groups => new Map(groups.flatMap(([, items]) => items));
const SEQ_MAP = palMap(SEQ_PALETTES), CAT_MAP = palMap(CAT_PALETTES), PAIR_MAP = palMap(PAIR_PALETTES);
const sameColors = (a, b) => a.length === b.length && a.every((c, i) => String(c).toLowerCase() === String(b[i]).toLowerCase());
function palStrip(kind, cols){
  if (kind === "seq") return `linear-gradient(90deg,${cols.join(",")})`;
  const w = 100 / cols.length;
  if (SOFT_GRAD && kind === "cat") return `linear-gradient(90deg,${cols.map((c, i) => { const [d, l] = softPair(c); return `${d} ${(i * w).toFixed(2)}%,${l} ${((i + 1) * w).toFixed(2)}%`; }).join(",")})`;
  return `linear-gradient(90deg,${cols.map((c, i) => `${c} ${(i * w).toFixed(2)}% ${((i + 1) * w).toFixed(2)}%`).join(",")})`;
}
var palGridHtml = function(kind, groups, isActive, attr){
  return `<div class="pal-grid">` + groups.map(([title, items]) => `<div class="pal-group-title">${escH(title)}</div>` + items.map(([name, cols]) =>
    `<button type="button" class="pal-btn${isActive(cols) ? " active" : ""}" ${attr}="${escH(name)}" title="${escH(name)}"><span class="pal-strip" style="background:${palStrip(kind, cols)}"></span><span class="pal-name">${escH(name)}</span></button>`).join("")).join("") + `</div>`;
}
// Совпадает ли текущий набор цветов с палитрой (с учётом повторения по кругу).
const palMatchesTargets = (current, cols) => current.length > 0 && current.every((c, i) => String(c).toLowerCase() === cols[i % cols.length].toLowerCase());

/* --- Палитры в настройке графиков вкладки «Графики» --- */
function mainPaletteGroupHtml(type, p){
  if (type === "season") {
    const current = [p.seriesColors["season:cur"] || "#7aa2f7", p.seriesColors["season:avg"] || "#e0af68"];
    return `<div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">Первый цвет — текущий год, второй — среднее и разброс прошлых лет.</p>${palGridHtml("cat", CAT_PALETTES, cols => sameColors(cols.slice(0, 2), current), "data-pal-cat")}</div>`;
  }
  if (type === "heat" || type === "heatrows" || type === "spiral" || type === "pairs") {
    return `<div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">Цвета от «мало» до «много». Цвет «нет активности» подстраивается под фон палитры.</p>${palGridHtml("seq", SEQ_PALETTES, cols => sameColors(cols, p.heat.c), "data-pal-seq")}</div>`;
  }
  if (type === "heatrows-custom") {
    const current = [...p.customBands].sort((a, b) => a.min - b.min).map(b => b.color);
    return `<div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">Цвета назначаются диапазонам по порядку.</p>${palGridHtml("cat", CAT_PALETTES, cols => palMatchesTargets(current, cols), "data-pal-cat")}</div>`;
  }
  const targets = chartColorTargets().filter(t => t.kind !== "special");
  const current = targets.map(t => p.seriesColors[`${t.kind}:${t.key}`] || getStyle(t.kind, t.key).c[0]);
  return `<div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">Цвета назначаются тем, кто сейчас на графике, по порядку мест. Фон и цвета текста подстраиваются под палитру.</p>${targets.length ? palGridHtml("cat", CAT_PALETTES, cols => palMatchesTargets(current, cols), "data-pal-cat") : '<p class="hint">Нет серий за выбранный период.</p>'}</div>`;
}
$("chart-settings-content").addEventListener("click", e => {
  const seq = e.target.closest("[data-pal-seq]"), cat = e.target.closest("[data-pal-cat]");
  if (!seq && !cat) return;
  const type = currentChartType(), p = chartPrefs(type);
  if (seq) p.heat = {...p.heat, c:[...palColors("seq", seq.dataset.palSeq)]};
  else {
    const cols = palColors("cat", cat.dataset.palCat);
    if (type === "heatrows-custom") p.customBands = [...p.customBands].sort((a, b) => a.min - b.min).map((b, i) => ({...b, color:cols[i % cols.length]}));
    else if (type === "season") p.seriesColors = {...p.seriesColors, "season:cur":cols[0], "season:avg":cols[1 % cols.length]};
    else {
      const sc = {...p.seriesColors};
      chartColorTargets().filter(t => t.kind !== "special").forEach((t, i) => { sc[`${t.kind}:${t.key}`] = cols[i % cols.length]; });
      p.seriesColors = sc;
    }
  }
  applyPalBg(p, seq ? "seq" : "cat", seq ? seq.dataset.palSeq : cat.dataset.palCat);
  CHART_PREFS[type] = p; saveChartPrefs(); applyChartAppearance(type); renderChartSettingsPanel(); renderCharts();
});

/* --- Палитры в настройке графиков вкладки «Селфи» --- */
function sPaletteTargets(kind){
  const m = selfieModel();
  if (kind === "ranking") return [...m.persons.values()].filter(x => sVisible(x.pk)).map(x => ({x, c:sPersonRange(m, x, sRangeDays(m)).count})).filter(e => e.c > 0).sort((a, b) => b.c - a.c).slice(0, 30).map(e => ({k:`u:${e.x.pk}`, base:getStyle("u", e.x.pk).c[0]}));
  return [...new Set(m.days.map(d => d.slice(0, 4)))].sort().map(y => ({k:`y:${y}`, base:yearHue(y)}));
}
function selfiePaletteGroupHtml(kind, p){
  const o = sOpts(p);
  if (kind === "matrix") return `<div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">Цвета «селфи» и «пропуск».</p>${palGridHtml("pair", PAIR_PALETTES, cols => sameColors(cols, [o.did, o.miss]), "data-pal-pair")}</div>`;
  const targets = sPaletteTargets(kind), current = targets.map(t => p.seriesColors?.[t.k] || t.base);
  const isActive = kind === "fridays" && o.barMode === "single" ? cols => sameColors([o.bar], [cols[0]]) : cols => palMatchesTargets(current, cols);
  const hint = kind === "ranking" ? "Цвета назначаются участникам по порядку мест." : kind === "fridays" ? "Цвета лет, одного цвета столбцов и линии среднего." : "Цвета назначаются годам по порядку.";
  return `<div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">${hint}</p>${palGridHtml("cat", CAT_PALETTES, isActive, "data-pal-cat")}</div>`;
}
$("s-settings-content").addEventListener("click", e => {
  const cat = e.target.closest("[data-pal-cat]"), pair = e.target.closest("[data-pal-pair]");
  if (!cat && !pair) return;
  const type = sChartType(), kind = sChartKind(), p = chartPrefs(type);
  if (pair) { const [did, miss] = palColors("pair", pair.dataset.palPair); p.selfie = {...sOpts(p), did, miss}; }
  else {
    const cols = palColors("cat", cat.dataset.palCat), sc = {...(p.seriesColors || {})};
    sPaletteTargets(kind).forEach((t, i) => { sc[t.k] = cols[i % cols.length]; });
    p.seriesColors = sc;
    if (kind === "fridays") p.selfie = {...sOpts(p), bar:cols[0], avg:cols[Math.min(3, cols.length - 1)]};
  }
  applyPalBg(p, pair ? "pair" : "cat", pair ? pair.dataset.palPair : cat.dataset.palCat);
  CHART_PREFS[type] = p; saveChartPrefs(); renderSelfieSettings(); renderSelfieChart();
});

/* ===================== Свои палитры ===================== */
const CUSTOM_PAL_KEY = "chatstats.customPalettes.v1";
let CUSTOM_PAL = {seq:[], cat:[], pair:[]};
try {
  const j = JSON.parse(localStorage.getItem(CUSTOM_PAL_KEY) || "null");
  if (j) for (const k of ["seq", "cat", "pair"]) if (Array.isArray(j[k])) CUSTOM_PAL[k] = j[k].filter(x => Array.isArray(x) && typeof x[0] === "string" && Array.isArray(x[1]) && x[1].every(c => /^#[0-9a-f]{6}$/i.test(c)));
} catch (e) {}
const saveCustomPal = () => { try { localStorage.setItem(CUSTOM_PAL_KEY, JSON.stringify(CUSTOM_PAL)); } catch (e) {} };
const BUILTIN_PAL = {seq:SEQ_MAP, cat:CAT_MAP, pair:PAIR_MAP};
function palColors(kind, name){
  const own = (CUSTOM_PAL[kind] || []).find(([n]) => n === name);
  return own ? own[1] : BUILTIN_PAL[kind].get(name);
}
palGridHtml = function(kind, groups, isActive, attr){
  const own = CUSTOM_PAL[kind] || [];
  const all = own.length ? [["Мои палитры", own, true], ...groups] : groups;
  return `<div class="pal-grid">` + all.map(([title, items, mine]) => `<div class="pal-group-title">${escH(title)}</div>` + items.map(([name, cols]) =>
    `<div class="pal-item"><button type="button" class="pal-btn${isActive(cols) ? " active" : ""}" ${attr}="${escH(name)}" title="${escH(name)}"><span class="pal-strip" style="background:${palStrip(kind, cols)}"></span><span class="pal-name">${escH(name)}</span></button>${mine ? `<button type="button" class="pal-del" data-pal-del="${escH(kind + "|" + name)}" title="Удалить палитру «${escH(name)}»" aria-label="Удалить палитру ${escH(name)}">×</button>` : ""}</div>`).join("")).join("")
    + `</div><div class="pal-actions"><button type="button" class="mini" data-pal-save="${kind}">+ Сохранить текущие цвета как палитру</button></div>`;
};
function palSaveFlow(kind, cols, bg){
  cols = cols.filter(c => /^#[0-9a-f]{6}$/i.test(c));
  if (!cols.length) { alert("Нет цветов для сохранения."); return false; }
  const raw = prompt("Название новой палитры:", "");
  const name = (raw || "").trim().slice(0, 40);
  if (!name) return false;
  const list = CUSTOM_PAL[kind], i = list.findIndex(([n]) => n === name);
  if (i >= 0) { if (!confirm(`Палитра «${name}» уже есть. Заменить её?`)) return false; list[i] = bg ? [name, cols, bg] : [name, cols]; }
  else list.unshift(bg ? [name, cols, bg] : [name, cols]);
  saveCustomPal(); return true;
}
function palDeleteFlow(token){
  const cut = token.indexOf("|"), kind = token.slice(0, cut), name = token.slice(cut + 1);
  if (!CUSTOM_PAL[kind] || !confirm(`Удалить палитру «${name}»?`)) return false;
  CUSTOM_PAL[kind] = CUSTOM_PAL[kind].filter(([n]) => n !== name); saveCustomPal(); return true;
}
function mainCurrentColors(kind){
  const type = currentChartType(), p = chartPrefs(type);
  if (kind === "seq") return [...p.heat.c];
  if (type === "heatrows-custom") return [...p.customBands].sort((a, b) => a.min - b.min).map(b => b.color);
  if (type === "season") return [p.seriesColors["season:cur"] || "#7aa2f7", p.seriesColors["season:avg"] || "#e0af68"];
  return chartColorTargets().filter(t => t.kind !== "special").map(t => p.seriesColors[`${t.kind}:${t.key}`] || getStyle(t.kind, t.key).c[0]).slice(0, 12);
}
function selfieCurrentColors(kind){
  const p = chartPrefs(sChartType()), o = sOpts(p), k = sChartKind();
  if (kind === "pair") return [o.did, o.miss];
  if (k === "fridays" && o.barMode === "single") return [o.bar, o.avg];
  return sPaletteTargets(k).map(t => p.seriesColors?.[t.k] || t.base).slice(0, 12);
}
for (const [boxId, current, rerender, bgOf] of [
  ["chart-settings-content", mainCurrentColors, () => renderChartSettingsPanel(), () => prefBg(chartPrefs(currentChartType()))],
  ["s-settings-content", selfieCurrentColors, () => renderSelfieSettings(), () => prefBg(chartPrefs(sChartType()))],
]) {
  $(boxId).addEventListener("click", e => {
    const save = e.target.closest("[data-pal-save]"), del = e.target.closest("[data-pal-del]");
    if (save) { if (palSaveFlow(save.dataset.palSave, current(save.dataset.palSave), bgOf())) rerender(); }
    else if (del) { if (palDeleteFlow(del.dataset.palDel)) rerender(); }
  });
}


/* ===================== Фон в палитрах ===================== */
const PAL_BG_MODE_KEY = "chatstats.palBgMode.v1";
let PAL_BG_MODE = "palette";
try { const v = localStorage.getItem(PAL_BG_MODE_KEY); if (["palette", "solid", "gradient", "keep"].includes(v)) PAL_BG_MODE = v; } catch (e) {}
const pbRgb = h => { const s = String(h).replace("#", ""); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) || 0); };
const pbHex = rgb => "#" + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const pbMix = (a, b, t) => { const x = pbRgb(a), y = pbRgb(b); return pbHex(x.map((v, i) => v + (y[i] - v) * t)); };
const pbLum = h => { const [r, g2, b] = pbRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g2 + .0722 * b; };
const pbSat = h => { const c = pbRgb(h), mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
// Затемняет цвет, пока его яркость не станет не выше limit: текст графиков светлый, фон должен оставаться тёмным.
function pbDarkTo(h, limit){ let c = h, i = 0; while (pbLum(c) > limit && i++ < 40) c = pbMix(c, "#05060a", .12); return c; }
const PAL_BG_SOLID = new Set(["Графит", "Серебро", "Сепия", "Монохром", "Контраст", "Для дальтоников", "Классика", "Пастель"]);
const PAL_BG_RADIAL = new Set(["Неон", "Кибер", "Плазма", "Вейпорвейв", "Аврора", "Синтвейв", "Космос", "Северное сияние", "Магма", "Огонь", "Лава", "Кислота", "Полночь", "Глубина", "Инферно", "Турбо", "Ночь и луна", "Дракула", "Катпуччин"]);
function palBgAuto(name, cols){
  const list = (cols || []).filter(c => /^#[0-9a-f]{6}$/i.test(c));
  if (!list.length) return null;
  const byLum = [...list].sort((a, b) => pbLum(a) - pbLum(b));
  const dark = byLum[0];
  const vivid = [...list].sort((a, b) => (pbSat(b) + pbLum(b) * .4) - (pbSat(a) + pbLum(a) * .4))[0];
  const start = pbDarkTo(pbMix(dark, "#0a0b10", .55), .018);
  const end = pbDarkTo(pbMix(vivid, "#0a0b10", .72), .045);
  const solid = pbDarkTo(pbMix(pbMix(dark, vivid, .35), "#0b0c11", .7), .025);
  const mode = PAL_BG_SOLID.has(name) ? "solid" : PAL_BG_RADIAL.has(name) ? "radial" : "linear";
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const angle = [135, 160, 120, 180, 145][Math.abs(h) % 5];
  return {mode, solid, start, end, angle};
}
function palBgSpec(kind, name){
  const cols = palColors(kind, name);
  const own = (CUSTOM_PAL[kind] || []).find(([n]) => n === name);
  if (own && own[2]) {
    const b = own[2], auto = palBgAuto(name, cols) || {};
    const grad = b.backgroundMode !== "solid";
    return {mode:b.backgroundMode || "linear", solid:b.backgroundStart, start:grad ? b.backgroundStart : auto.start, end:grad ? (b.backgroundEnd || b.backgroundStart) : auto.end, angle:Number(b.backgroundAngle ?? 135), radial:b.backgroundMode === "radial"};
  }
  return palBgAuto(name, cols);
}
// Итоговый фон палитры с учётом выбранного режима «Фон».
function palBgResolve(kind, name, mode = PAL_BG_MODE){
  if (mode === "keep" || kind === "dm") return null;
  const s = palBgSpec(kind, name); if (!s) return null;
  const pref = mode === "palette" ? s.mode : mode === "solid" ? "solid" : (s.mode === "radial" ? "radial" : "linear");
  if (pref === "solid") return {backgroundMode:"solid", backgroundStart:s.solid, backgroundEnd:s.solid, backgroundAngle:s.angle};
  if (pref === "radial") { const [c, e] = pbLum(s.end) >= pbLum(s.start) ? [s.end, s.start] : [s.start, s.end]; return {backgroundMode:"radial", backgroundStart:c, backgroundEnd:e, backgroundAngle:s.angle}; }
  return {backgroundMode:"linear", backgroundStart:s.start, backgroundEnd:s.end, backgroundAngle:s.angle};
}
function applyPalBg(p, kind, name){
  const bg = palBgResolve(kind, name);
  if (bg) {
    Object.assign(p, bg);
    if (kind === "seq" && p.heat) p.heat = {...p.heat, z:pbMix(bg.backgroundMode === "radial" ? bg.backgroundEnd : bg.backgroundStart, "#ffffff", .1)};
  }
  palAdaptText(p, kind, name);
  // Пользовательская палитра хранит не только фон, но и цвета текста.
  // Без восстановления textStyle палитра автоматически заменяла вручную заданный белый текст цветом своего оттенка.
  const own = (CUSTOM_PAL[kind] || []).find(([n]) => n === name);
  const meta = own?.[2] || {};
  const savedFontColor = meta.fontColor;
  const validColor = c => /^#[0-9a-f]{6}$/i.test(String(c || ""));
  const textColorKeys = ["titleColor", "subtitleColor", "labelsColor", "valuesColor", "axisColor", "legendColor"];
  if (validColor(savedFontColor)) p.fontColor = savedFontColor;
  if (meta.textStyleColors && typeof meta.textStyleColors === "object") {
    const textStyle = {...(p.textStyle || {})};
    for (const key of textColorKeys) {
      if (validColor(meta.textStyleColors[key])) textStyle[key] = meta.textStyleColors[key];
    }
    p.textStyle = textStyle;
  }
  // Legacy palettes can still restore fontColor, but they did not store individual
  // textStyle colors. Those must be re-saved once from the current text settings.
  return p;
}
const pbContrast = (a, b) => { const x = pbLum(a), y = pbLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function pbEnsure(c, bgs, min){ let x = c, i = 0; while (bgs.some(b => pbContrast(x, b) < min) && i++ < 40) x = pbMix(x, "#ffffff", .12); return x; }
// Цвета текста графика подбираются под палитру и под фон: оттенок палитры + достаточный контраст.
function palAdaptText(p, kind, name){
  const cols = (palColors(kind, name) || []).filter(c => /^#[0-9a-f]{6}$/i.test(c));
  const st = /^#[0-9a-f]{6}$/i.test(p.backgroundStart || "") ? p.backgroundStart : "#262626";
  const en = /^#[0-9a-f]{6}$/i.test(p.backgroundEnd || "") ? p.backgroundEnd : st;
  const bgs = p.backgroundMode === "solid" ? [st] : [st, en, pbMix(st, en, .5)];
  const tint = [...cols].sort((a, b) => (pbSat(b) + pbLum(b) * .4) - (pbSat(a) + pbLum(a) * .4))[0] || "#7aa2f7";
  const strong = pbEnsure(pbMix(tint, "#ffffff", .86), bgs, 8);
  const body = pbEnsure(pbMix(tint, "#f2f3f7", .88), bgs, 7);
  const soft = pbEnsure(pbMix(tint, "#b4bac8", .62), bgs, 4.6);
  p.fontColor = body;
  p.textStyle = {...(p.textStyle || {}), titleColor:strong, valuesColor:strong, labelsColor:body, subtitleColor:soft, axisColor:soft, legendColor:soft};
}
const prefBg = p => ({
  backgroundMode:p.backgroundMode || "linear",
  backgroundStart:p.backgroundStart,
  backgroundEnd:p.backgroundEnd,
  backgroundAngle:Number(p.backgroundAngle ?? 135),
  fontColor:p.fontColor || "#e6e8ee",
  // Save the actual per-group text colors alongside the global text color.
  // Palettes used to preserve only fontColor, so manual white colors reverted to the palette tint.
  textStyleColors:Object.fromEntries(["titleColor", "subtitleColor", "labelsColor", "valuesColor", "axisColor", "legendColor"]
    .map(key => [key, p.textStyle?.[key]])
    .filter(([, color]) => /^#[0-9a-f]{6}$/i.test(String(color || ""))))
});
function palPreviewBg(kind, name){
  const bg = palBgResolve(kind, name, PAL_BG_MODE === "keep" ? "palette" : PAL_BG_MODE);
  return bg ? chartBackgroundCss(bg) : "transparent";
}
const PAL_BG_MODES = [["palette", "Из палитры"], ["solid", "Один цвет"], ["gradient", "Градиент"], ["keep", "Не менять"]];
palGridHtml = function(kind, groups, isActive, attr){
  const own = CUSTOM_PAL[kind] || [], withBg = kind !== "dm";
  const all = own.length ? [["Мои палитры", own, true], ...groups] : groups;
  const bgBar = withBg ? `<div class="pal-bgbar"><span>Фон графика:</span><div class="seg pal-bgseg">${PAL_BG_MODES.map(([k, n]) => `<button type="button" data-palbg-mode="${k}" class="${PAL_BG_MODE === k ? "active" : ""}">${n}</button>`).join("")}</div></div>` : "";
  return bgBar + `<div class="pal-grid${withBg && PAL_BG_MODE === "keep" ? " pal-bg-off" : ""}">` + all.map(([title, items, mine]) => `<div class="pal-group-title">${escH(title)}</div>` + items.map(([name, cols]) =>
    `<div class="pal-item"><button type="button" class="pal-btn${isActive(cols) ? " active" : ""}" ${attr}="${escH(name)}" title="${escH(name)}">${withBg ? `<span class="pal-prev" data-pal-k="${kind}" data-pal-n="${escH(name)}" style="background:${palPreviewBg(kind, name)}">` : ""}<span class="pal-strip" style="background:${palStrip(kind, cols)}"></span>${withBg ? "</span>" : ""}<span class="pal-name">${escH(name)}</span></button>${mine ? `<button type="button" class="pal-del" data-pal-del="${escH(kind + "|" + name)}" title="Удалить палитру «${escH(name)}»" aria-label="Удалить палитру ${escH(name)}">×</button>` : ""}</div>`).join("")).join("")
    + `</div><div class="pal-actions"><button type="button" class="mini" data-pal-save="${kind}">+ Сохранить текущие цвета${withBg ? " и фон" : ""} как палитру</button></div>`;
};
document.addEventListener("click", e => {
  const b = e.target.closest?.("[data-palbg-mode]"); if (!b) return;
  e.stopPropagation();
  PAL_BG_MODE = b.dataset.palbgMode;
  try { localStorage.setItem(PAL_BG_MODE_KEY, PAL_BG_MODE); } catch (err) {}
  document.querySelectorAll("[data-palbg-mode]").forEach(x => x.classList.toggle("active", x.dataset.palbgMode === PAL_BG_MODE));
  document.querySelectorAll(".pal-prev[data-pal-k]").forEach(el => { el.style.background = palPreviewBg(el.dataset.palK, el.dataset.palN); });
  document.querySelectorAll(".pal-grid").forEach(g2 => { if (g2.querySelector(".pal-prev")) g2.classList.toggle("pal-bg-off", PAL_BG_MODE === "keep"); });
}, true);

/* ===================== Марафоны ===================== */
const MR_KEY = "chatstats.marathons.v1", MR_SEL_KEY = "chatstats.marathonSel.v1";
const MR_DEFAULTS = [
  {id:"mr-2025-winter", name:"Зимний марафон 2025", from:"2025-12-16", to:"2025-12-30", sponsors:["3","2","69"]},
  {id:"mr-2026-birthday", name:"Марафон к 11-летию чата", from:"2026-03-17", to:"2026-03-26", sponsors:["3","2","69","19"]},
  {id:"mr-2026-may", name:"Майский марафон 2026", from:"2026-05-18", to:"2026-05-31", sponsors:["3","69"]},
  {id:"mr-2026-summer", name:"Летний марафон 2026", from:"2026-08-17", to:"2026-08-30", sponsors:["3","2","5"]},
];
let MARATHONS = MR_DEFAULTS.map(m => ({...m, sponsors:[...m.sponsors]}));
try { const j = JSON.parse(localStorage.getItem(MR_KEY) || "null"); if (Array.isArray(j)) MARATHONS = j.filter(m => m && m.id && m.name && m.from && m.to); } catch (e) {}
let mrSelected = ""; try { mrSelected = localStorage.getItem(MR_SEL_KEY) || ""; } catch (e) {}
let mrEditing = null, mrSponsorDraft = new Set();
const mrCache = new Map();
const mrSave = () => { try { localStorage.setItem(MR_KEY, JSON.stringify(MARATHONS)); localStorage.setItem(MR_SEL_KEY, mrSelected); } catch (e) {} };
const mrSorted = () => MARATHONS.slice().sort((a, b) => b.from.localeCompare(a.from));
const mrDays = m => dayIdx(m.to) - dayIdx(m.from) + 1;
const mrPeriod = m => `${sFmtDate(m.from)} — ${sFmtDate(m.to)}`;
const mrName = pk => NAMES[pk] || `ID ${pk}`;
function mrStatus(t, err = false){ const el = $("mr-status"); el.textContent = t; el.className = "status" + (err ? " err" : ""); }
function mrRows(m){
  const key = `${m.from}|${m.to}`;
  if (!mrCache.has(key)) mrCache.set(key, fetchAll(m.from, m.to).then(ultView).catch(e => { mrCache.delete(key); throw e; }));
  return mrCache.get(key);
}
function mrResults(m, rows, metric, chat){
  const sponsors = new Set(m.sponsors.map(String)), per = new Map(), today = iso(new Date());
  pick(rows, chat).forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < m.from || d > m.to) return;
    const k = String(x[F.userId] ?? x[F.name]); if (sponsors.has(k)) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    const u = per.get(k) || {k, name:who(x), v:0, days:new Set()};
    u.v += v; u.days.add(d); per.set(k, u);
  });
  const list = [...per.values()].sort((a, b) => b.v - a.v || a.name.localeCompare(b.name, "ru"));
  const total = list.reduce((s, u) => s + u.v, 0);
  const elapsed = Math.max(0, Math.min(mrDays(m), dayIdx(today < m.to ? today : m.to) - dayIdx(m.from) + 1));
  return {list, total, elapsed};
}
function mrPhase(m){
  const today = iso(new Date());
  if (today < m.from) return {label:"ещё не начался", cls:"soon"};
  if (today <= m.to) return {label:`идёт сейчас · день ${dayIdx(today) - dayIdx(m.from) + 1} из ${mrDays(m)}`, cls:"live"};
  return {label:"завершён", cls:"done"};
}
function mrFillSelect(){
  const sel = $("mr-select"), list = mrSorted();
  sel.innerHTML = list.length ? list.map(m => `<option value="${escH(m.id)}">${escH(m.name)}</option>`).join("") : `<option value="">Марафонов пока нет</option>`;
  if (!list.some(m => m.id === mrSelected)) mrSelected = list[0]?.id || "";
  sel.value = mrSelected;
  $("mr-edit").disabled = $("mr-delete").disabled = !mrSelected;
}
async function loadMarathons(){
  mrFillSelect();
  await renderMarathon();
  renderMarathonSummary();
}
/* Гонка марафона: те же столбцы-«скачки», что и в «Графиках → Гонка» — места меняются на лету, цифры растут, есть пауза, ползунок и скорость */
var MRRACE = null, mrRaceRaf = 0, mrRaceSpeedV = raceSpeed || 1;
function mrRaceBuild(m, rows, metric, chat){
  const sponsors = new Set(m.sponsors.map(String)), today = iso(new Date());
  const last = today < m.from ? null : (today < m.to ? today : m.to); if (!last) return "";
  const N = dayIdx(last) - dayIdx(m.from) + 1; if (N < 2) return "";
  const step = N <= 120 ? 1 : N <= 900 ? 7 : 30, FR = Math.ceil(N / step), per = new Map();
  pick(rows, chat).forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < m.from || d > last) return;
    const k = String(x[F.userId] ?? x[F.name]); if (sponsors.has(k)) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    let e = per.get(k); if (!e) per.set(k, e = {k, n:who(x), a:new Float64Array(FR)});
    e.a[Math.floor((dayIdx(d) - dayIdx(m.from)) / step)] += v;
  });
  const list = [...per.values()]; if (!list.length) return "";
  list.forEach(e => { let acc = 0; for (let i = 0; i < FR; i++) { acc += e.a[i]; e.a[i] = acc; } });
  const topN = Math.min(10, list.length), cand = new Set();
  for (let i = 0; i < FR && cand.size < 30; i++) list.filter(e => e.a[i] > 0).sort((a, b) => b.a[i] - a.a[i]).slice(0, topN).forEach(e => cand.add(e));
  const ents = [...cand], labels = Array.from({length:FR}, (_, i) => addDaysIso(m.from, Math.min(N - 1, (i + 1) * step - 1)));
  const W = 900, T = 92, rh = Math.max(28, Math.min(40, Math.floor(420 / topN))), H = T + topN * rh + 24;
  const L = Math.min(230, Math.max(110, Math.max(...ents.map(e => Math.min(e.n.length, 20))) * 9.6 + 22)), R = W - 110;
  const reduced = typeof REDUCED_MOTION !== "undefined" && REDUCED_MOTION;
  MRRACE = {ents, FR, labels, topN, step, t:reduced ? FR - 1 : 0, playing:!reduced, y:new Map(), maxV:0, geo:{W, T, rh, H, L, R}};
  let o = `<text x="24" y="34" font-size="22" font-weight="700" fill="#e8eaf1">Гонка · ${escH(MLBL[metric].toLowerCase())} нарастающим итогом</text><text x="24" y="58" font-size="15" fill="#8a90a2">${escH(m.name)} · топ-${topN} без спонсоров</text>`;
  o += `<text id="mr-race-date" x="${W - 24}" y="${T - 20}" text-anchor="end" font-size="30" font-weight="700" fill="#ffffff" fill-opacity=".55"></text>`;
  o += ents.map(e => { let c = "#7aa2f7"; try { c = getStyle("u", e.k).c[0] || c; } catch (err) {} const sv = softSvg(c), nm = e.n.length > 20 ? e.n.slice(0, 19) + "…" : e.n;
    return `<g class="race-row" data-k="${escH(e.k)}" transform="translate(0,${H})" opacity="0">${sv.d}<rect x="${L}" y="0" height="${rh - 8}" rx="6" width="0" fill="${sv.f}"/><text class="chart-label" x="${L - 10}" y="${((rh - 8) / 2 + 6).toFixed(1)}" text-anchor="end" font-size="18" fill="#e6e8ee">${escH(nm)}</text><text class="chart-value" x="${L + 8}" y="${((rh - 8) / 2 + 6).toFixed(1)}" font-size="18" fill="#eceef3"></text></g>`; }).join("");
  const sp = [0.5, 1, 2, 4].map(v => `<option value="${v}"${v === mrRaceSpeedV ? " selected" : ""}>${v}×</option>`).join("");
  return `<svg id="mr-race-svg" viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>
    <div class="race-ctl" data-no-export><button class="mini" type="button" id="mr-race-play" title="Пуск / пауза">${MRRACE.playing ? "❚❚ Пауза" : "▶ Пуск"}</button><button class="mini" type="button" id="mr-race-restart" title="С начала">⟲</button><input type="range" id="mr-race-pos" min="0" max="${FR - 1}" step="0.01" value="${MRRACE.t}" aria-label="Позиция"><select id="mr-race-speed" aria-label="Скорость">${sp}</select></div>`;
}
function mrRaceMount(){
  cancelAnimationFrame(mrRaceRaf);
  const svg = $("mr-race-svg"); if (!svg || !MRRACE) return;
  const R0 = MRRACE, {T, rh, H, L, R} = R0.geo;
  const els = new Map([...svg.querySelectorAll(".race-row")].map(gr => [gr.dataset.k, {gr, rect:gr.querySelector("rect"), val:gr.querySelector(".chart-value"), lab:gr.querySelector(".chart-label")}]));
  const dateEl = $("mr-race-date"), pos = $("mr-race-pos"), play = $("mr-race-play");
  const fps = Math.max(2, R0.FR / 22);
  const updBtn = () => { play.textContent = R0.playing ? "❚❚ Пауза" : "▶ Пуск"; };
  play.onclick = () => { if (!R0.playing && R0.t >= R0.FR - 1) R0.t = 0; R0.playing = !R0.playing; updBtn(); };
  $("mr-race-restart").onclick = () => { R0.t = 0; R0.playing = true; updBtn(); };
  pos.oninput = () => { R0.t = Number(pos.value); R0.playing = false; updBtn(); };
  $("mr-race-speed").onchange = e => { mrRaceSpeedV = Number(e.target.value) || 1; };
  let last = performance.now(), first = true;
  const draw = () => {
    R0.t = Math.max(0, Math.min(R0.FR - 1, Number(R0.t) || 0));
    const i0 = Math.floor(R0.t), i1 = Math.min(R0.FR - 1, i0 + 1), fr = R0.t - i0;
    const vals = R0.ents.map(e => ({e, v:e.a[i0] + (e.a[i1] - e.a[i0]) * fr})).sort((a, b) => b.v - a.v);
    const mx = Math.max(1, vals[0]?.v || 1);
    R0.maxV = first ? mx : R0.maxV + (mx - R0.maxV) * 0.2;
    vals.forEach((o, rank) => {
      const el = els.get(o.e.k); if (!el) return;
      const show = rank < R0.topN && o.v > 0, target = show ? T + rank * rh : H + 4;
      const cur = R0.y.has(o.e.k) && !first ? R0.y.get(o.e.k) : target, ny = cur + (target - cur) * 0.2;
      R0.y.set(o.e.k, ny);
      const w = Math.max(2, o.v / R0.maxV * (R - L));
      el.gr.setAttribute("transform", `translate(0,${ny.toFixed(1)})`);
      el.gr.setAttribute("opacity", show ? "1" : "0");
      const moving = Math.min(1, Math.abs(target - ny) / (rh * .5));
      el.lab.setAttribute("fill-opacity", (1 - moving * .85).toFixed(2));
      el.val.setAttribute("fill-opacity", (1 - moving * .85).toFixed(2));
      el.rect.setAttribute("width", w.toFixed(1));
      el.val.setAttribute("x", (L + w + 8).toFixed(1));
      el.val.textContent = fmt(Math.round(o.v));
    });
    dateEl.textContent = raceLabel(R0.labels[fr > 0.5 ? i1 : i0], R0.step);
    if (document.activeElement !== pos) pos.value = R0.t;
    first = false;
  };
  const loop = now => {
    if (!svg.isConnected || MRRACE !== R0) return;
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    if (svg.getBoundingClientRect().width > 0) {
      if (R0.playing) { R0.t = Math.min(R0.FR - 1, R0.t + dt * fps * mrRaceSpeedV); if (R0.t >= R0.FR - 1) { R0.playing = false; updBtn(); } }
      draw();
    }
    mrRaceRaf = requestAnimationFrame(loop);
  };
  draw(); mrRaceRaf = requestAnimationFrame(loop);
}
async function renderMarathon(){
  const m = MARATHONS.find(x => x.id === mrSelected), out = $("mr-out");
  if (!m) { out.innerHTML = `<div class="s-empty">Создай первый марафон кнопкой «Новый марафон».</div>`; mrStatus(""); return; }
  mrStatus(""); if (!allRows) out.innerHTML = skPage(4, 1);
  let rows;
  try { rows = await mrRows(m); } catch (e) { mrStatus("Не удалось загрузить данные: " + e.message, true); return; }
  if (m.id !== mrSelected) return;
  fillChatSel($("mr-chat"), rows);
  const metric = $("mr-metric").value, chat = $("mr-chat").value, unit = MLBL[metric].toLowerCase();
  const {list, total, elapsed} = mrResults(m, rows, metric, chat), phase = mrPhase(m);
  mrStatus("");
  const tile = (lbl, num, place, acc) => `<div class="tile" style="--tile-accent:${acc}"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${place}</div></div>`;
  const lead = list[0], second = list[1];
  const sponsors = m.sponsors.length ? m.sponsors.map(mrName).sort((a, b) => a.localeCompare(b, "ru")).join(", ") : "нет";
  const tiles = `<div class="tiles">
    ${tile("Период", `${fmt(mrDays(m))} ${wordForm(mrDays(m), ["день","дня","дней"])}`, `${mrPeriod(m)} · ${phase.label}`, "#7aa2f7")}
    ${tile(`Всего · ${unit}`, fmt(total), `без спонсоров · ${elapsed ? fmtR(total / elapsed) + " в день" : "—"}`, "#9ece6a")}
    ${tile("Участников", fmt(list.length), `спонсоры: ${escH(sponsors)}`, "#bb9af7")}
    ${tile(phase.cls === "done" ? "Победитель" : "Лидер", lead ? escH(lead.name) : "—", lead ? `${fmt(lead.v)} · ${second ? `отрыв ${fmt(lead.v - second.v)}` : "без соперников"}` : "нет данных", "#ffd166")}
  </div>`;
  const body = list.length ? list.map((u, i) => `<tr><td class="${i < 3 ? "medal-" + (i + 1) : ""}" style="text-align:center">${i + 1}</td><td style="text-align:left"><span class="pname" data-open-profile="${escH(u.k)}">${escH(u.name)}</span></td><td>${fmt(u.v)}</td><td>${total ? dmPct(u.v, total) : "—"}</td><td>${elapsed ? fmtR(u.v / elapsed) : "—"}</td><td>${fmt(u.days.size)}<span class="wd-mute">из ${fmt(elapsed)}</span></td>${i ? `<td>${fmt(list[i - 1].v - u.v)}</td>` : "<td>—</td>"}</tr>`).join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted)">${phase.cls === "soon" ? "Марафон ещё не начался" : "Нет данных за период марафона"}</td></tr>`;
  out.innerHTML = tiles + `<div class="section-head"><h2>${escH(m.name)}</h2><span class="mr-phase ${phase.cls}">${escH(phase.label)}</span><button class="mini copy-btn" id="mr-copy" type="button">Копировать</button><span class="hint" id="mr-copy-status"></span></div>
    <div class="wrap"><table id="mr-table"><thead><tr><th>Место</th><th style="text-align:left">Участник</th><th>${escH(MLBL[metric])}</th><th>Доля</th><th>В среднем в день</th><th>Активных дней</th><th>До места выше</th></tr></thead><tbody>${body}</tbody></table></div>`;
  $("mr-copy").onclick = () => copyTableImage("mr-table", `${m.name} · ${mrPeriod(m)}${chat ? " · " + chat : ""}`, "mr-copy-status");
  try {
    const race = mrRaceBuild(m, rows, metric, chat);
    if (race) {
      out.insertAdjacentHTML("beforeend", `<div class="section-head"><h2>Гонка по дням</h2><span class="hint">Топ-10 без спонсоров</span><button class="mini copy-btn" id="mr-race-copy" type="button">Копировать</button><span class="hint" id="mr-race-msg"></span></div><div class="yr-chart-card"><div class="yr-chart" id="mr-race">${race}</div></div>`);
      $("mr-race-copy").onclick = () => copyPngToStatus(() => svgToPngBlob($("mr-race").querySelector("svg"), YR_EXPORT), $("mr-race-msg"), "График скопирован");
      mrRaceMount();
    }
  } catch (e) { console.error(e); }
}
async function renderMarathonSummary(){
  const body = $("mr-all-body"), list = mrSorted(), metric = $("mr-metric").value;
  $("mr-all-metric").textContent = MLBL[metric];
  if (!list.length) { body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted)">Марафонов пока нет</td></tr>`; return; }
  const results = await Promise.all(list.map(m => mrRows(m).then(r => mrResults(m, r, metric, ""), () => null)));
  const place = (res, i) => res?.list[i] ? `${escH(res.list[i].name)}<span class="wd-mute">${fmt(res.list[i].v)}</span>` : "—";
  body.innerHTML = list.map((m, i) => {
    const r = results[i];
    return `<tr><td style="text-align:left">${escH(m.name)}</td><td>${mrPeriod(m)}</td><td>${fmt(mrDays(m))}</td><td>${r ? fmt(r.total) : "—"}</td><td>${r ? fmt(r.list.length) : "—"}</td><td class="medal-1" style="text-align:left">${place(r, 0)}</td><td class="medal-2" style="text-align:left">${place(r, 1)}</td><td class="medal-3" style="text-align:left">${place(r, 2)}</td><td style="text-align:left;color:var(--muted)">${escH(m.sponsors.map(mrName).join(", ") || "—")}</td></tr>`;
  }).join("");
}
/* --- Создание и изменение --- */
function mrOpenForm(m){
  mrEditing = m ? m.id : null;
  $("mr-form-title").textContent = m ? "Изменить марафон" : "Новый марафон";
  $("mr-f-name").value = m?.name || "";
  $("mr-f-from").value = m?.from || iso(new Date());
  $("mr-f-to").value = m?.to || addDaysIso(iso(new Date()), 13);
  mrSponsorDraft = new Set((m?.sponsors || []).map(String));
  mrRenderSponsors();
  $("mr-form-msg").textContent = "";
  $("mr-form").hidden = false;
  $("mr-f-name").focus();
}
function mrRenderSponsors(){
  const people = Object.entries(NAMES).sort((a, b) => a[1].localeCompare(b[1], "ru"));
  $("mr-f-sponsors").innerHTML = people.map(([pk, n]) => `<button type="button" class="s-chip mr-chip" data-mr-pk="${pk}" aria-pressed="${mrSponsorDraft.has(pk)}">${escH(n)}</button>`).join("");
}
$("mr-f-sponsors").addEventListener("click", e => {
  const chip = e.target.closest("[data-mr-pk]"); if (!chip) return;
  const pk = chip.dataset.mrPk;
  mrSponsorDraft.has(pk) ? mrSponsorDraft.delete(pk) : mrSponsorDraft.add(pk);
  chip.setAttribute("aria-pressed", String(mrSponsorDraft.has(pk)));
});
$("mr-new").onclick = () => mrOpenForm(null);
$("mr-edit").onclick = () => { const m = MARATHONS.find(x => x.id === mrSelected); if (m) mrOpenForm(m); };
$("mr-cancel").onclick = () => { $("mr-form").hidden = true; };
$("mr-save").onclick = () => {
  const name = $("mr-f-name").value.trim(), from = $("mr-f-from").value, to = $("mr-f-to").value, msg = $("mr-form-msg");
  if (!name) { msg.textContent = "Укажи название марафона"; return; }
  if (!from || !to) { msg.textContent = "Укажи даты начала и конца"; return; }
  if (from > to) { msg.textContent = "Дата начала позже даты конца"; return; }
  const data = {name, from, to, sponsors:[...mrSponsorDraft]};
  if (mrEditing) Object.assign(MARATHONS.find(x => x.id === mrEditing), data);
  else { const id = "mr-" + Date.now().toString(36); MARATHONS.push({id, ...data}); mrEditing = id; }
  mrSelected = mrEditing; mrSave();
  $("mr-form").hidden = true;
  loadMarathons();
};
$("mr-delete").onclick = () => {
  const m = MARATHONS.find(x => x.id === mrSelected);
  if (!m || !confirm(`Удалить марафон «${m.name}»? Сообщения в статистике не пострадают — удалится только сам марафон.`)) return;
  MARATHONS = MARATHONS.filter(x => x.id !== m.id); mrSelected = ""; mrSave(); loadMarathons();
};
$("mr-select").onchange = () => { mrSelected = $("mr-select").value; mrSave(); $("mr-chat").value = ""; renderMarathon(); };
$("mr-metric").onchange = () => { renderMarathon(); renderMarathonSummary(); };
$("mr-chat").onchange = () => renderMarathon();
$("mr-all-copy").onclick = () => copyTableImage("mr-all-table", "Все марафоны", "mr-all-copy-status");

/* ===================== Итоги года ===================== */
const YR_KEY = "chatstats.yearReview.v1";
let YR = {year:"", cmp:"prev", chat:"", same:true};
try { const j = JSON.parse(localStorage.getItem(YR_KEY) || "null"); if (j && typeof j === "object") YR = {...YR, ...j}; } catch (e) {}
const yrSave = () => { try { localStorage.setItem(YR_KEY, JSON.stringify(YR)); } catch (e) {} };
const yrCache = new Map();
let yrCacheSrc = null;
const YR_EXPORT = {backgroundMode:"solid", backgroundStart:"#171a22", backgroundEnd:"#171a22", fontColor:"#e8eaf1", keepTextColors:true};
const MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MONTHS_SHORT_RU = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const WEEKDAYS_ACC = ["в воскресенье","в понедельник","во вторник","в среду","в четверг","в пятницу","в субботу"];
function yrStatus(t, err = false){ const el = $("yr-status"); el.textContent = t; el.className = "status" + (err ? " err" : ""); }
function yrYears(){ return [...new Set(allRows.map(x => String(x[F.date] ?? "").slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort(); }
const yrDayRu = d => `${+d.slice(8)} ${MONTHS_GEN[+d.slice(5, 7) - 1]}`;
function yrStats(y, chat, cutoff){
  if (yrCacheSrc !== allRows) { yrCache.clear(); yrCacheSrc = allRows; }
  const key = `${y}|${chat}|${cutoff || ""}`;
  if (yrCache.has(key)) return yrCache.get(key);
  const from = `${y}-01-01`, lim = cutoff ? `${y}-${cutoff}` : `${y}-12-31`, today = iso(new Date());
  const T = {msgs:0, stick:0, voice:0, video:0}, days = new Map(), months = Array.from({length:12}, () => ({msgs:0, stick:0, voice:0, video:0})), users = new Map();
  for (const x of pick(allRows, chat)) {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > lim) continue;
    const v = {}; MET.forEach(k => { v[k] = Number(g(x, k)) || 0; T[k] += v[k]; months[+d.slice(5, 7) - 1][k] += v[k]; });
    const dd = days.get(d) || {msgs:0, stick:0, voice:0, video:0}; MET.forEach(k => dd[k] += v[k]); if (!vkDay(d)) days.set(d, dd);
    const pk = String(x[F.userId] ?? x[F.name]);
    let u = users.get(pk); if (!u) { u = {pk, name:who(x), msgs:0, stick:0, voice:0, video:0, days:0, best:null}; users.set(pk, u); }
    MET.forEach(k => u[k] += v[k]);
    if (v.msgs > 0 && !vkDay(d)) { u.days++; if (!u.best || v.msgs > u.best.v) u.best = {d, v:v.msgs}; }
  }
  const chats = new Map();
  if (!chat) allRows.forEach(x => {
    if (Number(x[F.chatPk]) === 0) return;
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > lim) return;
    const k = String(x[F.chatPk] ?? x[F.chat]), c = chats.get(k) || {k, name:String(x[F.chat] || `Чат ${k}`), msgs:0, stick:0, voice:0, video:0};
    MET.forEach(m => c[m] += Number(g(x, m)) || 0); chats.set(k, c);
  });
  const end = lim < today ? lim : today, span = end >= from ? dayIdx(end) - dayIdx(from) + 1 : 0;
  const list = [...users.values()].filter(u => u.msgs + u.stick + u.voice + u.video > 0).sort((a, b) => b.msgs - a.msgs || a.name.localeCompare(b.name, "ru"));
  const activeDays = [...days.values()].filter(d => d.msgs > 0).length;
  const res = {y, T, days, months, users:new Map(list.map(u => [u.pk, u])), list, chats:[...chats.values()].sort((a, b) => b.msgs - a.msgs), activeDays, span, from, lim};
  yrCache.set(key, res);
  return res;
}
function yrSelfie(y, cutoff){
  if (!SELFIE.length) return null;
  const m = selfieModel(), lim = cutoff ? `${y}-${cutoff}` : `${y}-12-31`;
  const days = m.days.filter(d => d.startsWith(y) && d <= lim);
  if (!days.length) return null;
  const counts = days.map(d => sDayCount(m, d)), total = counts.reduce((a, v) => a + v, 0);
  let best = null; days.forEach((d, i) => { if (!best || counts[i] > best.v) best = {d, v:counts[i]}; });
  const people = [...m.persons.values()].map(p => ({p, r:sPersonRange(m, p, days)})).filter(e => e.r.count > 0).sort((a, b) => b.r.count - a.r.count);
  const perfect = people.filter(e => e.r.elig >= Math.min(10, days.length) && e.r.missed === 0).map(e => selfieNameOf(e.p.pk));
  return {days, total, avg:total / days.length, best, people, perfect};
}
function yrMarathons(y, cutoff){
  const lim = cutoff ? `${y}-${cutoff}` : `${y}-12-31`;
  return MARATHONS.filter(m => m.from.startsWith(y) && m.from <= lim).sort((a, b) => a.from.localeCompare(b.from)).map(m => ({m, r:mrResults(m, allRows, "msgs", "")}));
}
function yrDelta(cur, prev, plain = false){
  if (prev == null) return "";
  if (!prev) return cur ? `<span class="yr-delta up">новое</span>` : "";
  const p = (cur - prev) / prev * 100, a = Math.abs(p), txt = (a < 10 ? a.toFixed(1) : String(Math.round(a))) + "%";
  if (a < 0.05) return `<span class="yr-delta">без изменений</span>`;
  return `<span class="yr-delta ${p > 0 ? "up" : "down"}">${p > 0 ? "+" : "−"}${txt}</span>`;
}
const yrPlural = (n, f) => `${fmt(n)} ${wordForm(n, f)}`;
const yrShortNum = v => v >= 10000 ? shortNum(v) : fmt(Math.round(v));

/* --- Постер года --- */
function yrPosterSvg(S, C){
  const y = S.y, yc = yearHue(y), W = 900, H = 540;
  const bestM = S.months.reduce((b, m, i) => m.msgs > (b?.v ?? -1) ? {i, v:m.msgs} : b, null);
  let bestD = null; S.days.forEach((v, d) => { if (!bestD || v.msgs > bestD.v) bestD = {d, v:v.msgs}; });
  const mvp = S.list[0];
  const delta = C ? (C.T.msgs ? (S.T.msgs - C.T.msgs) / C.T.msgs * 100 : null) : null;
  const deltaTxt = delta == null ? "" : `${delta >= 0 ? "+" : "−"}${Math.abs(delta) < 10 ? Math.abs(delta).toFixed(1) : Math.round(Math.abs(delta))}% к ${C.y}`;
  const t = (x, yy, size, fill, txt, extra = "") => `<text x="${x}" y="${yy}" font-size="${size}" fill="${fill}"${extra}>${escH(txt)}</text>`;
  let o = `<defs><linearGradient id="yrPosterBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${mixHex("#11141b", yc, .38)}"/><stop offset="55%" stop-color="#151821"/><stop offset="100%" stop-color="#0f1117"/></linearGradient><radialGradient id="yrGlow" cx="0.85" cy="0.1" r="0.6"><stop offset="0%" stop-color="${yc}" stop-opacity="0.35"/><stop offset="100%" stop-color="${yc}" stop-opacity="0"/></radialGradient></defs>`;
  o += `<rect width="${W}" height="${H}" rx="26" fill="url(#yrPosterBg)"/><rect width="${W}" height="${H}" rx="26" fill="url(#yrGlow)"/>`;
  o += `<circle cx="820" cy="470" r="150" fill="none" stroke="${yc}" stroke-opacity="0.12" stroke-width="34"/><circle cx="820" cy="470" r="80" fill="none" stroke="${yc}" stroke-opacity="0.08" stroke-width="20"/>`;
  o += t(52, 72, 18, yc, "ИТОГИ ГОДА", ' letter-spacing="5"');
  o += t(48, 168, 104, "#ffffff", y, ' letter-spacing="-2"');
  if (S.lim < `${y}-12-31` && S.lim >= iso(new Date()).slice(0, 4)) o += t(54, 198, 16, "#aab0c0", `по ${yrDayRu(S.lim)}`);
  o += t(848, 120, 62, "#ffffff", fmt(S.T.msgs), ' text-anchor="end"');
  o += t(848, 152, 18, "#c0c6d4", `${wordForm(S.T.msgs, ["сообщение","сообщения","сообщений"])} за год`, ' text-anchor="end"');
  if (deltaTxt) {
    const w = deltaTxt.length * 9.5 + 28, up = delta >= 0;
    o += `<rect x="${848 - w}" y="170" width="${w}" height="32" rx="16" fill="${up ? "#9ece6a" : "#f7768e"}" fill-opacity="0.16" stroke="${up ? "#9ece6a" : "#f7768e"}" stroke-opacity="0.6"/>` + t(848 - w / 2, 192, 16, up ? "#b9f27c" : "#ff9db0", deltaTxt, ' text-anchor="middle"');
  }
  o += `<line x1="52" y1="238" x2="848" y2="238" stroke="#ffffff" stroke-opacity="0.12"/>`;
  const cols = [["Стикеры", S.T.stick, C?.T.stick], ["Голосовые", S.T.voice, C?.T.voice], ["Видеосообщения", S.T.video, C?.T.video], ["Активных участников", S.list.length, C?.list.length]];
  cols.forEach(([lbl, v, pv], i) => {
    const x = 52 + i * 202;
    o += t(x, 292, 36, "#ffffff", fmt(v)) + t(x, 318, 15, "#aab0c0", lbl);
    if (pv != null && pv) { const p = (v - pv) / pv * 100; o += Math.round(Math.abs(p)) === 0 ? t(x, 342, 14, "#8a90a2", "без изменений") : t(x, 342, 14, p > 0 ? "#9ece6a" : "#f7768e", `${p > 0 ? "+" : "−"}${Math.round(Math.abs(p))}%`); }
  });
  o += `<line x1="52" y1="372" x2="848" y2="372" stroke="#ffffff" stroke-opacity="0.12"/>`;
  const facts = [
    ["Лучший месяц", bestM && bestM.v ? MONTHS[bestM.i] : "—", bestM && bestM.v ? `${fmt(bestM.v)} сообщений` : ""],
    ["Лучший день", bestD ? yrDayRu(bestD.d) : "—", bestD ? `${fmt(bestD.v)} сообщений` : ""],
    ["Участник года", mvp ? mvp.name : "—", mvp ? `${fmt(mvp.msgs)} сообщений` : ""],
  ];
  facts.forEach(([lbl, v, sub], i) => { const x = 52 + i * 270; o += t(x, 412, 14, yc, lbl.toUpperCase(), ' letter-spacing="2"') + t(x, 446, 26, "#ffffff", v) + t(x, 472, 15, "#aab0c0", sub); });
  o += t(52, 516, 13, "#6b7280", `Статистика чата${YR.chat ? " · " + YR.chat : ""}`);
  return `<svg class="yr-poster-svg" viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}

/* --- Графики --- */
function yrMonthsSvg(S, C){
  const W = 900, H = 400, L = 60, R = 880, T = 70, B = 340, yc = yearHue(S.y), cc = C ? yearHue(C.y) : null;
  const vals = S.months.map(m => m.msgs), prev = C ? C.months.map(m => m.msgs) : null;
  const {max, step} = niceMax(Math.max(1, ...vals, ...(prev || [0])));
  const sy = v => B - v / max * (B - T), slot = (R - L) / 12, bw = C ? slot * .34 : slot * .6;
  let o = `<text x="${L}" y="34" font-size="20" fill="#e8eaf1">Сообщения по месяцам</text>`;
  const leg = [[yc, S.y], ...(C ? [[cc, C.y]] : [])];
  leg.forEach(([c, lbl], i) => { const x = R - (leg.length - i) * 92; o += `<rect x="${x}" y="22" width="14" height="14" rx="3" fill="${c}"${i ? ' fill-opacity="0.55"' : ""}/><text x="${x + 22}" y="34" font-size="17" fill="#c0c6d4">${lbl}</text>`; });
  for (let v = 0; v <= max + 1e-9; v += step) o += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.07"/><text x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" font-size="16" fill="#8a90a2" text-anchor="end">${yrShortNum(v)}</text>`;
  for (let i = 0; i < 12; i++) {
    const x0 = L + i * slot + (slot - (C ? bw * 2 + 4 : bw)) / 2;
    if (C) o += `<rect class="anim-bar-y" style="animation-delay:${i * 30}ms" x="${(x0 + bw + 4).toFixed(1)}" y="${sy(prev[i]).toFixed(1)}" width="${bw.toFixed(1)}" height="${(B - sy(prev[i])).toFixed(1)}" rx="4" fill="${cc}" fill-opacity="0.55"><title>${MONTHS[i]} ${C.y}: ${fmt(prev[i])}</title></rect>`;
    o += `<rect class="anim-bar-y" style="animation-delay:${i * 30}ms" x="${x0.toFixed(1)}" y="${sy(vals[i]).toFixed(1)}" width="${bw.toFixed(1)}" height="${(B - sy(vals[i])).toFixed(1)}" rx="4" fill="${yc}"><title>${MONTHS[i]} ${S.y}: ${fmt(vals[i])}</title></rect>`;
    if (vals[i]) o += `<text x="${(x0 + bw / 2).toFixed(1)}" y="${(sy(vals[i]) - 6).toFixed(1)}" font-size="${C ? 13 : 15}" fill="#e8eaf1" text-anchor="middle">${yrShortNum(vals[i])}</text>`;
    o += `<text x="${(L + i * slot + slot / 2).toFixed(1)}" y="${B + 24}" font-size="17" fill="#c0c6d4" text-anchor="middle">${MONTHS_SHORT_RU[i]}</text>`;
  }
  o += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-opacity="0.6" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}
function yrCumulativeSvg(S, C){
  const W = 900, H = 400, L = 64, R = 860, T = 70, B = 340, yc = yearHue(S.y), cc = C ? yearHue(C.y) : null;
  const series = s => { const out = []; let sum = 0; const n = dayIdx(s.lim < iso(new Date()) ? s.lim : iso(new Date())) - dayIdx(`${s.y}-01-01`) + 1; for (let i = 0; i < Math.max(0, n); i++) { sum += s.days.get(addDaysIso(`${s.y}-01-01`, i))?.msgs || 0; out.push(sum); } return out; };
  const a = series(S), b = C ? series(C) : [];
  const {max, step} = niceMax(Math.max(1, a[a.length - 1] || 0, b[b.length - 1] || 0));
  const sx = i => L + i / 365 * (R - L), sy = v => B - v / max * (B - T);
  const line = (arr, c, op, dash) => arr.length ? `<polyline${dash ? "" : ' class="anim-line" pathLength="1"'} points="${arr.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="3" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` : "";
  let o = `<text x="${L}" y="34" font-size="20" fill="#e8eaf1">Накопительно за год</text>`;
  for (let v = 0; v <= max + 1e-9; v += step) o += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.07"/><text x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" font-size="16" fill="#8a90a2" text-anchor="end">${yrShortNum(v)}</text>`;
  for (let mth = 0; mth < 12; mth++) { const i = dayIdx(`2001-${pad(mth + 1)}-01`) - dayIdx("2001-01-01"); o += `<text x="${sx(i + 15).toFixed(1)}" y="${B + 24}" font-size="17" fill="#c0c6d4" text-anchor="middle">${MONTHS_SHORT_RU[mth]}</text><line x1="${sx(i).toFixed(1)}" y1="${B}" x2="${sx(i).toFixed(1)}" y2="${B + 6}" stroke="#dcdcdc" stroke-opacity="0.5"/>`; }
  o += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-opacity="0.6" stroke-width="2"/>`;
  o += line(b, cc, .6, "8 6") + line(a, yc, 1, "");
  if (a.length) o += `<circle cx="${sx(a.length - 1).toFixed(1)}" cy="${sy(a[a.length - 1]).toFixed(1)}" r="5" fill="${yc}"/><text x="${Math.min(R, sx(a.length - 1) + 8).toFixed(1)}" y="${(sy(a[a.length - 1]) - 10).toFixed(1)}" font-size="17" fill="#ffffff"${sx(a.length - 1) > R - 80 ? ' text-anchor="end"' : ""}>${fmt(a[a.length - 1])}</text>`;
  if (C && b.length) o += `<text x="${Math.min(R, sx(b.length - 1)).toFixed(1)}" y="${(sy(b[b.length - 1]) + 20).toFixed(1)}" font-size="16" fill="#c0c6d4" text-anchor="end">${C.y}: ${fmt(b[b.length - 1])}</text>`;
  const leg = [[yc, S.y, ""], ...(C ? [[cc, C.y, "6 4"]] : [])];
  leg.forEach(([c, lbl, dash], i) => { const x = R - (leg.length - i) * 100; o += `<line x1="${x}" y1="29" x2="${x + 22}" y2="29" stroke="${c}" stroke-width="3"${dash ? ` stroke-dasharray="${dash}"` : ""}/><text x="${x + 30}" y="34" font-size="17" fill="#c0c6d4">${lbl}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}

/* --- Номинации --- */
function yrAwards(S, C, cutoff){
  const top = (list, key) => list.filter(u => (typeof key === "function" ? key(u) : u[key]) > 0).sort((a, b) => (typeof key === "function" ? key(b) - key(a) : b[key] - a[key]))[0];
  const cards = [];
  const metricCard = (title, sub, key, unit, acc) => {
    const u = top(S.list, key), p = C ? top(C.list, key) : null;
    cards.push({title, sub, acc, name:u?.name, value:u ? `${fmt(u[key])} ${unit}` : "", prev:p ? `${p.name} · ${fmt(p[key])}` : null});
  };
  metricCard("Голос года", "больше всех сообщений", "msgs", "сообщ.", "#7aa2f7");
  metricCard("Король стикеров", "больше всех стикеров", "stick", "стикеров", "#e0af68");
  metricCard("Голос в эфире", "больше всех голосовых", "voice", "голосовых", "#bb9af7");
  metricCard("Режиссёр", "больше всех видеосообщений", "video", "видео", "#2ac3de");
  if (RX_ON && window.__beta) {
    const rS = window.__beta.react.range(S.from, S.lim), rC = C ? window.__beta.react.range(C.from, C.lim) : null;
    const best = (m) => [...m.entries()].filter(([k]) => isVisibleUser(k)).sort((a, b) => b[1] - a[1])[0];
    [["Ценитель года", "больше всех поставил(а) реакций", "given", "#f7768e"], ["Звезда года", "больше всех получил(а) реакций", "got", "#ffd166"]].forEach(([title, sub, k, acc]) => {
      const u = best(rS[k]), p = rC ? best(rC[k]) : null;
      const nmR = k => window.__rxName ? window.__rxName(k) : (NAMES[k] || k);
      if (u) cards.push({title, sub, acc, name:nmR(u[0]), value:`${fmt(u[1])} реакций`, prev:p ? `${nmR(p[0])} · ${fmt(p[1])}` : null});
    });
    window.__beta.events.inRange(S.from, S.lim).forEach(ev => {
      if (ev.leader) cards.push({title:`Событие «${ev.title}»`, sub:ev.status === "live" ? "лидер идущего события" : "победитель события", acc:ev.c2, name:window.__rxName ? window.__rxName(ev.leader.pk) : (NAMES[ev.leader.pk] || ev.leader.pk), value:`ур. ${ev.leader.level} · ${ev.rank}`, prev:null});
    });
  }
  { const u = top(S.list, "days"), p = C ? top(C.list, "days") : null;
    cards.push({title:"Самый постоянный", sub:"больше всех активных дней", acc:"#9ece6a", name:u?.name, value:u ? `${yrPlural(u.days, ["день","дня","дней"])} из ${fmt(S.span)}` : "", prev:p ? `${p.name} · ${fmt(p.days)}` : null}); }
  { const u = top(S.list, x => x.best?.v || 0), p = C ? top(C.list, x => x.best?.v || 0) : null;
    cards.push({title:"Рекорд дня", sub:"больше всех за один день", acc:"#ff9e64", name:u?.name, value:u ? `${fmt(u.best.v)} · ${yrDayRu(u.best.d)}` : "", prev:p ? `${p.name} · ${fmt(p.best.v)}` : null}); }
  if (C) {
    const g2 = S.list.map(u => ({u, d:u.msgs - (C.users.get(u.pk)?.msgs || 0), was:C.users.get(u.pk)?.msgs || 0})).filter(x => x.d > 0 && x.was > 0).sort((a, b) => b.d - a.d)[0];
    cards.push({title:"Прорыв года", sub:`самый большой рост к ${C.y}`, acc:"#f7768e", name:g2?.u.name, value:g2 ? `+${fmt(g2.d)} сообщ.` : "", prev:g2 ? `было ${fmt(g2.was)} → стало ${fmt(g2.u.msgs)}` : null, prevPlain:true});
  }
  { const lim = cutoff ? `${S.y}-${cutoff}` : `${S.y}-12-31`;
    const newbies = MEMBERSHIP_STARTS.filter(([d]) => d.startsWith(S.y) && d <= lim).map(([d, id]) => ({d, id:String(id), msgs:S.users.get(String(id))?.msgs || 0})).sort((a, b) => b.msgs - a.msgs);
    const n = newbies[0];
    cards.push({title:"Новичок года", sub:newbies.length ? `новых участников: ${newbies.length}` : "лучший из новых участников", acc:"#73daca", name:n ? (NAMES[n.id] || `ID ${n.id}`) : null, value:n ? `${fmt(n.msgs)} сообщ. · с ${yrDayRu(n.d)}` : "", prev:newbies.length > 1 ? `также: ${newbies.slice(1, 4).map(x => NAMES[x.id] || x.id).join(", ")}${newbies.length > 4 ? "…" : ""}` : null, prevPlain:true}); }
  const sf = yrSelfie(S.y, cutoff);
  if (sf && sf.people.length) {
    const t1 = sf.people[0], cs = C ? yrSelfie(C.y, cutoff) : null, p = cs?.people[0];
    cards.push({title:"Селфи-звезда", sub:"больше всех селфи", acc:"#ff7eb6", name:selfieNameOf(t1.p.pk), value:`${fmt(t1.r.count)} селфи · ${Math.round(t1.r.att * 100)}%`, prev:p ? `${selfieNameOf(p.p.pk)} · ${fmt(p.r.count)}` : null});
  }
  const mr = yrMarathons(S.y, cutoff).filter(x => x.r.list.length && mrPhase(x.m).cls === "done");
  if (mr.length) {
    const wins = new Map(); mr.forEach(x => { const w = x.r.list[0]; wins.set(w.name, (wins.get(w.name) || 0) + 1); });
    const best = [...wins.entries()].sort((a, b) => b[1] - a[1]);
    cards.push({title:"Чемпион марафонов", sub:`марафонов за год: ${mr.length}`, acc:"#ffd166", name:best.filter(b => b[1] === best[0][1]).map(b => b[0]).join(", "), value:yrPlural(best[0][1], ["победа","победы","побед"]), prev:null});
  }
  return cards.filter(c => c.name).map(c => `<div class="yr-award" style="--acc:${c.acc}"><div class="yr-award-title">${escH(c.title)}</div><div class="yr-award-name">${escH(c.name)}</div><div class="yr-award-value">${escH(c.value)}</div><div class="yr-award-sub">${escH(c.sub)}</div>${c.prev ? `<div class="yr-award-prev">${c.prevPlain ? "" : `в ${C.y}: `}${escH(c.prev)}</div>` : ""}</div>`).join("");
}

/* --- Отрисовка вкладки --- */
async function loadYearReview(){
  if (!allRows) $("yr-out").innerHTML = `<div class="sk sk-poster"></div>` + skPage(8, 1);
  try { await getHistory(); } catch (e) { yrStatus("Не удалось загрузить данные: " + e.message, true); return; }
  yrStatus("");
  const years = yrYears(), cur = String(new Date().getFullYear());
  if (!years.length) { $("yr-out").innerHTML = `<div class="s-empty">Нет данных</div>`; return; }
  if (!years.includes(YR.year)) YR.year = years.includes(cur) ? cur : years[years.length - 1];
  $("yr-year").innerHTML = years.slice().reverse().map(y => `<option value="${y}">${y}</option>`).join("");
  $("yr-year").value = YR.year;
  $("yr-cmp").innerHTML = `<option value="prev">Прошлый год</option><option value="none">Без сравнения</option>` + years.slice().reverse().filter(y => y !== YR.year).map(y => `<option value="${y}">${y}</option>`).join("");
  if (![...$("yr-cmp").options].some(o => o.value === YR.cmp)) YR.cmp = "prev";
  $("yr-cmp").value = YR.cmp;
  fillChatSel($("yr-chat"), allRows); $("yr-chat").value = YR.chat; YR.chat = $("yr-chat").value;
  $("yr-same").checked = YR.same;
  renderYearReview();
}
function renderYearReviewSync(){
  if (!allRows) return;
  const years = yrYears(), cur = String(new Date().getFullYear()), y = YR.year;
  const cmpY = YR.cmp === "none" ? null : YR.cmp === "prev" ? (years.includes(String(+y - 1)) ? String(+y - 1) : null) : YR.cmp;
  const partial = y === cur || cmpY === cur;
  const cutoff = partial && YR.same ? iso(new Date()).slice(5) : null;
  $("yr-same-wrap").hidden = !partial;
  const S = yrStats(y, YR.chat, cutoff), C = cmpY ? yrStats(cmpY, YR.chat, cutoff) : null;
  const yc = yearHue(y);
  document.getElementById("tab-yearreview").style.setProperty("--yr", yc);
  const note = cutoff ? `Оба года сравниваются по ${yrDayRu(`2000-${cutoff}`)} включительно.` : (y === cur ? "Год ещё идёт — значения на сегодня." : "");
  // Плитки с ключевыми цифрами
  const tile = (lbl, v, pv, fmtV = fmt, sub = "") => `<div class="tile yr-tile"><div class="lbl">${lbl}</div><div class="num">${fmtV(v)}</div><div class="place">${C ? `${yrDelta(v, pv)}<span class="yr-was">в ${C.y}: ${pv == null ? "—" : fmtV(pv)}</span>` : sub}</div></div>`;
  const avg = s => s.span ? s.T.msgs / s.span : 0;
  const newbies = s => MEMBERSHIP_STARTS.filter(([d]) => d.startsWith(s.y) && d <= s.lim).length;
  const sfS = yrSelfie(y, cutoff), sfC = C ? yrSelfie(C.y, cutoff) : null;
  const tiles = [
    tile("Сообщения", S.T.msgs, C?.T.msgs), tile("Стикеры", S.T.stick, C?.T.stick), tile("Голосовые", S.T.voice, C?.T.voice), tile("Видеосообщения", S.T.video, C?.T.video),
    tile("Активных участников", S.list.length, C?.list.length), tile("Активных дней", S.activeDays, C?.activeDays, fmt, `из ${fmt(S.span)}`),
    tile("В среднем в день", avg(S), C ? avg(C) : null, fmtR), tile("Новых участников", newbies(S), C ? newbies(C) : null),
    ...(sfS || sfC ? [tile("Селфи", sfS?.total || 0, sfC ? sfC.total : (C ? 0 : null), fmt, sfS ? `${sfS.days.length} пятниц` : "")] : []),
    ...(RX_ON && window.__beta ? (() => { const rS = window.__beta.react.range(S.from, S.lim), rC = C ? window.__beta.react.range(C.from, C.lim) : null;
      return rS.total || rC?.total ? [tile("Реакций", rS.total, rC ? rC.total : null, fmt, rS.topEmoji ? `чаще всего ${rS.topEmoji}` : "")] : []; })() : []),
  ].join("");
  // Топ участников
  const prevRank = C ? new Map(C.list.map((u, i) => [u.pk, i + 1])) : null, total = S.T.msgs;
  const topRows = S.list.slice(0, 15).map((u, i) => {
    let move = "";
    if (prevRank) { const pr = prevRank.get(u.pk); move = !pr ? '<span class="yr-delta up">новый</span>' : pr === i + 1 ? '<span class="yr-delta">=</span>' : `<span class="yr-delta ${pr > i + 1 ? "up" : "down"}">${pr > i + 1 ? "▲" : "▼"} ${Math.abs(pr - (i + 1))}</span>`; }
    const pu = C?.users.get(u.pk);
    return `<tr><td class="${i < 3 ? "medal-" + (i + 1) : ""}" style="text-align:center">${i + 1}</td><td style="text-align:left"><span class="pname" data-open-profile="${escH(u.pk)}">${escH(u.name)}</span></td><td>${fmt(u.msgs)}</td>${C ? `<td>${yrDelta(u.msgs, pu?.msgs ?? 0)}</td><td>${move}</td>` : ""}<td>${dmPct(u.msgs, total)}</td><td>${fmt(u.stick)}</td><td>${fmt(u.voice)}</td><td>${fmt(u.video)}</td><td>${fmt(u.days)}</td></tr>`;
  }).join("");
  const topTable = `<div class="wrap"><table id="yr-top-table"><thead><tr><th>Место</th><th style="text-align:left">Участник</th><th>Сообщения</th>${C ? `<th>К ${C.y}</th><th>Место в ${C.y}</th>` : ""}<th>Доля</th><th>Стикеры</th><th>Голосовые</th><th>Видео</th><th>Активных дней</th></tr></thead><tbody>${topRows || `<tr><td colspan="10" style="text-align:center;color:var(--muted)">Нет данных</td></tr>`}</tbody></table></div>`;
  // Факты, лучшие дни и месяцы
  const dayList = [...S.days.entries()].filter(([, v]) => v.msgs > 0).sort((a, b) => b[1].msgs - a[1].msgs);
  const wdSum = Array(7).fill(0); S.days.forEach((v, d) => { wdSum[new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8))).getUTCDay()] += v.msgs; });
  const wdBest = wdSum.indexOf(Math.max(...wdSum));
  const lastMonth = S.lim < iso(new Date()) ? 11 : new Date().getMonth();
  const monthsDone = S.months.map((m, i) => ({i, v:m.msgs})).filter(m => m.i <= lastMonth);
  const quiet = monthsDone.filter(m => m.v > 0).sort((a, b) => a.v - b.v)[0];
  const top3 = S.list.slice(0, 3).reduce((a, u) => a + u.msgs, 0);
  const silent = S.span - S.activeDays;
  const facts = [
    total ? `Чаще всего писали <b>${WEEKDAYS_ACC[wdBest]}</b> — ${dmPct(wdSum[wdBest], total)} всех сообщений.` : "",
    quiet ? `Самый тихий месяц — <b>${MONTHS[quiet.i].toLowerCase()}</b>: ${fmt(quiet.v)} сообщений.` : "",
    total && S.list.length > 3 ? `Топ-3 участника написали <b>${dmPct(top3, total)}</b> всех сообщений.` : "",
    `Дней без единого сообщения: <b>${fmt(silent)}</b>.`,
    S.T.msgs && S.T.stick ? `На каждые 100 сообщений приходилось <b>${fmtR(S.T.stick / S.T.msgs * 100)}</b> стикеров.` : "",
    C && C.T.msgs ? `По сравнению с ${C.y} чат стал ${S.T.msgs >= C.T.msgs ? "активнее" : "тише"} на <b>${fmt(Math.abs(S.T.msgs - C.T.msgs))}</b> сообщений.` : "",
  ].filter(Boolean).map(f => `<li>${f}</li>`).join("");
  const bestDays = dayList.slice(0, 5).map(([d, v], i) => `<li><span class="yr-rank">${i + 1}</span>${yrDayRu(d)}<b>${fmt(v.msgs)}</b></li>`).join("");
  const bestMonths = monthsDone.filter(m => m.v > 0).sort((a, b) => b.v - a.v).slice(0, 5).map((m, i) => `<li><span class="yr-rank">${i + 1}</span>${MONTHS[m.i]}<b>${fmt(m.v)}</b></li>`).join("");
  // Чаты года
  const prevChats = C ? new Map(C.chats.map(c => [c.k, c])) : null, chatTotal = S.chats.reduce((a, c) => a + c.msgs, 0);
  const chatsTable = !YR.chat && S.chats.length ? `<div class="section-head"><h2>Чаты года</h2><button class="mini copy-btn" type="button" data-yr-copy="yr-chats-table">Копировать</button><span class="hint" id="yr-chats-table-msg"></span></div>${__tbl.html({id:"yr-chats-table", rows:S.chats,
    cols:[{h:"Место", tdAlign:"center", td:(c, i) => i + 1}, {h:"Чат", align:"left", td:c => escH(c.name)}, {h:"Сообщения", td:c => fmt(c.msgs)}, {h:"Доля", td:c => dmPct(c.msgs, chatTotal)},
      {when:!!C, h:`К ${C && C.y}`, td:c => yrDelta(c.msgs, prevChats.get(c.k)?.msgs ?? 0)}, {h:"Стикеры", td:c => fmt(c.stick)}, {h:"Голосовые", td:c => fmt(c.voice)}, {h:"Видео", td:c => fmt(c.video)}]})}` : "";
  // Селфи года
  let selfieBlock = "";
  if (sfS) {
    selfieBlock = `<div class="section-head"><h2>Селфи года</h2></div><div class="tiles">
      <div class="tile yr-tile"><div class="lbl">Всего селфи</div><div class="num">${fmt(sfS.total)}</div><div class="place">${sfC ? `${yrDelta(sfS.total, sfC.total)}<span class="yr-was">в ${C.y}: ${fmt(sfC.total)}</span>` : `${sfS.days.length} пятниц`}</div></div>
      <div class="tile yr-tile"><div class="lbl">В среднем за пятницу</div><div class="num">${fmtR(sfS.avg)}</div><div class="place">${sfC ? `${yrDelta(sfS.avg, sfC.avg)}<span class="yr-was">в ${C.y}: ${fmtR(sfC.avg)}</span>` : ""}</div></div>
      <div class="tile yr-tile"><div class="lbl">Рекордная пятница</div><div class="num">${fmt(sfS.best.v)}</div><div class="place">${sFmtDate(sfS.best.d)}</div></div>
      <div class="tile yr-tile"><div class="lbl">Ни одного пропуска</div><div class="num">${fmt(sfS.perfect.length)}</div><div class="place">${escH(sfS.perfect.slice(0, 6).join(", ") || "никого")}${sfS.perfect.length > 6 ? "…" : ""}</div></div>
    </div><div class="yr-podium">${sfS.people.slice(0, 5).map((e, i) => `<div class="yr-pod"><span class="yr-rank">${i + 1}</span>${escH(selfieNameOf(e.p.pk))}<b>${fmt(e.r.count)}</b><small>${Math.round(e.r.att * 100)}%</small></div>`).join("")}</div>`;
  }
  // Марафоны года
  const mrs = yrMarathons(y, cutoff);
  const mrBlock = mrs.length ? `<div class="section-head"><h2>Марафоны года</h2></div><div class="yr-awards">${mrs.map(({m, r}) => {
    const ph = mrPhase(m), w = r.list;
    return `<div class="yr-award" style="--acc:#ffd166"><div class="yr-award-title">${escH(m.name)}</div><div class="yr-award-name">${w[0] ? escH(w[0].name) : "—"}</div><div class="yr-award-value">${w[0] ? `${fmt(w[0].v)} сообщ.` : ""}</div><div class="yr-award-sub">${mrPeriod(m)}${ph.cls !== "done" ? " · " + escH(ph.label) : ""}</div>${w[1] ? `<div class="yr-award-prev">2 место: ${escH(w[1].name)} · ${fmt(w[1].v)}${w[2] ? `<br>3 место: ${escH(w[2].name)} · ${fmt(w[2].v)}` : ""}</div>` : ""}</div>`;
  }).join("")}</div>` : "";
  // Все годы
  const allYears = years.slice().reverse().map(yy => {
    const s = yrStats(yy, YR.chat, null), sf = yrSelfie(yy, null), bm = s.months.reduce((b, m, i) => m.msgs > (b?.v ?? -1) ? {i, v:m.msgs} : b, null), mv = s.list[0];
    const mark = yy === y ? "yr-row-sel" : yy === cmpY ? "yr-row-cmp" : "";
    return `<tr class="${mark}"><td style="text-align:left;border-left:4px solid ${yearHue(yy)}"><span class="ychip" style="margin:0;color:${yearHue(yy)};border-color:${hexA(yearHue(yy), .55)};background-color:${hexA(yearHue(yy), .12)}">${yy}</span></td><td>${fmt(s.T.msgs)}</td><td>${fmt(s.T.stick)}</td><td>${fmt(s.T.voice)}</td><td>${fmt(s.T.video)}</td><td>${fmt(s.list.length)}</td><td>${fmtR(avg(s))}</td><td style="text-align:left">${bm && bm.v ? MONTHS[bm.i] : "—"}</td><td style="text-align:left">${mv ? `${escH(mv.name)}<span class="wd-mute">${fmt(mv.msgs)}</span>` : "—"}</td><td>${sf ? fmt(sf.total) : "—"}</td></tr>`;
  }).join("");
  $("yr-out").innerHTML = `
    ${note ? `<p class="hint">${note}</p>` : ""}
    <div class="yr-poster">${yrPosterSvg(S, C)}</div>
    <div class="pbtn yr-poster-actions"><button class="mini copy-btn" type="button" id="yr-poster-copy">Копировать</button><span class="hint" id="yr-poster-msg"></span></div>
    <div class="tiles yr-tiles">${tiles}</div>
    <div class="section-head"><h2>Год по месяцам</h2></div>
    <div class="yr-charts"><div class="yr-chart-card"><div class="yr-chart" id="yr-months-chart">${yrMonthsSvg(S, C)}</div><div class="pbtn"><button class="mini copy-btn" type="button" data-yr-svg="yr-months-chart">Копировать</button><span class="hint" id="yr-months-chart-msg"></span></div></div>
      <div class="yr-chart-card"><div class="yr-chart" id="yr-cum-chart">${yrCumulativeSvg(S, C)}</div><div class="pbtn"><button class="mini copy-btn" type="button" data-yr-svg="yr-cum-chart">Копировать</button><span class="hint" id="yr-cum-chart-msg"></span></div></div></div>
    <div class="section-head"><h2>Номинации года</h2>${C ? `<span class="hint">ниже — победитель той же номинации в ${C.y}</span>` : ""}</div>
    <div class="yr-awards">${yrAwards(S, C, cutoff) || '<p class="hint">Недостаточно данных</p>'}</div>
    <div class="section-head"><h2>Участники года</h2><button class="mini copy-btn" type="button" data-yr-copy="yr-top-table">Копировать</button><span class="hint" id="yr-top-table-msg"></span></div>
    ${topTable}
    <div class="p-grid2 yr-grid3">
      <div class="p-card"><h3>Интересные факты</h3><ul class="yr-facts">${facts}</ul></div>
      <div class="p-card"><h3>Лучшие дни</h3><ol class="yr-list">${bestDays || "<li>—</li>"}</ol></div>
      <div class="p-card"><h3>Лучшие месяцы</h3><ol class="yr-list">${bestMonths || "<li>—</li>"}</ol></div>
    </div>
    ${chatsTable}
    ${selfieBlock}
    ${mrBlock}
    <div class="section-head"><h2>Все годы</h2><button class="mini copy-btn" type="button" data-yr-copy="yr-years-table">Копировать</button><span class="hint" id="yr-years-table-msg"></span></div>
    <p class="hint">Полные годы${YR.chat ? `, чат «${escH(YR.chat)}»` : ""}. Выбранный год выделен, год сравнения отмечен пунктиром.</p>
    <div class="wrap"><table id="yr-years-table"><thead><tr><th style="text-align:left">Год</th><th>Сообщения</th><th>Стикеры</th><th>Голосовые</th><th>Видео</th><th>Участников</th><th>В среднем в день</th><th style="text-align:left">Лучший месяц</th><th style="text-align:left">Участник года</th><th>Селфи</th></tr></thead><tbody>${allYears}</tbody></table></div>`;
}
$("yr-out").addEventListener("click", e => {
  const titles = {"yr-top-table":`Участники ${YR.year} года`, "yr-chats-table":`Чаты ${YR.year} года`, "yr-years-table":"Итоги по годам"};
  const tb = e.target.closest("[data-yr-copy]"), sv = e.target.closest("[data-yr-svg]");
  if (tb) copyTableImage(tb.dataset.yrCopy, titles[tb.dataset.yrCopy] || "Итоги года", tb.dataset.yrCopy + "-msg");
  else if (sv) copyPngToStatus(() => svgToPngBlob($(sv.dataset.yrSvg).querySelector("svg"), YR_EXPORT), $(sv.dataset.yrSvg + "-msg"), "График скопирован");
  else if (e.target.closest("#yr-poster-copy")) copyPngToStatus(() => svgToPngBlob($("yr-out").querySelector(".yr-poster svg"), {...YR_EXPORT, backgroundStart:"#0f1117", backgroundEnd:"#0f1117"}), $("yr-poster-msg"), "Постер скопирован");
});
$("yr-year").onchange = () => { YR.year = $("yr-year").value; yrSave(); loadYearReview(); };
$("yr-cmp").onchange = () => { YR.cmp = $("yr-cmp").value; yrSave(); renderYearReview(); };
$("yr-chat").onchange = () => { YR.chat = $("yr-chat").value; yrSave(); renderYearReview(); };
$("yr-same").onchange = () => { YR.same = $("yr-same").checked; yrSave(); renderYearReview(); };

/* ===================== Темы оформления сайта ===================== */
const SITE_THEME_KEY = "chatstats.siteTheme.v1";
// Все темы тёмные: фон — одна из нейтральных «основ», от темы зависят только цветовые акценты.
const SITE_BASES = {
  night:   {name:"Полночь",  bg:"#0f1117", panel:"#171a22", panel2:"#1d212b", line:"#272b36", text:"#e8eaf1", muted:"#8a90a2", th:"#1b1f29", ctrl:"#11141b", hover:"#1e2331", foot:"#1b1f2a"},
  graphite:{name:"Графит",   bg:"#111214", panel:"#1a1b1e", panel2:"#212226", line:"#2c2d32", text:"#ececee", muted:"#8d8f97", th:"#1e1f23", ctrl:"#141518", hover:"#24262b", foot:"#1f2024"},
  slate:   {name:"Сланец",   bg:"#0e1215", panel:"#161b1f", panel2:"#1c2227", line:"#273036", text:"#e6ecef", muted:"#87939b", th:"#1a2025", ctrl:"#101417", hover:"#1e252b", foot:"#192025"},
  warm:    {name:"Тёплый",   bg:"#121110", panel:"#1b1a18", panel2:"#22201e", line:"#2e2b28", text:"#efebe6", muted:"#968f87", th:"#1f1d1b", ctrl:"#151413", hover:"#262321", foot:"#201e1c"},
  oled:    {name:"Чёрный",   bg:"#000000", panel:"#0c0c0e", panel2:"#131316", line:"#26262c", text:"#f5f5f7", muted:"#a0a0aa", th:"#101013", ctrl:"#060607", hover:"#19191d", foot:"#121215"},
  navy:    {name:"Глубокий синий", bg:"#0a0f1c", panel:"#111829", panel2:"#172033", line:"#22304a", text:"#e6ecfa", muted:"#8593b3", th:"#141c2f", ctrl:"#0c1220", hover:"#1a2440", foot:"#151e31"},
  dusk:    {name:"Сумерки",  bg:"#100e1a", panel:"#181525", panel2:"#1f1b2f", line:"#2c2742", text:"#ece8f7", muted:"#938cab", th:"#1c1829", ctrl:"#13101e", hover:"#241f37", foot:"#1d192b"},
  plum:    {name:"Слива",    bg:"#130d14", panel:"#1c141e", panel2:"#241a27", line:"#352638", text:"#f2e8f2", muted:"#9e8aa0", th:"#201722", ctrl:"#160f17", hover:"#2a1e2d", foot:"#221824"},
  wine:    {name:"Бордо",    bg:"#140b0e", panel:"#1e1115", panel2:"#26161b", line:"#381f27", text:"#f4e7ea", muted:"#a3878d", th:"#221418", ctrl:"#170d10", hover:"#2c1a20", foot:"#24161a"},
  forest:  {name:"Лес",      bg:"#0b110e", panel:"#121a16", panel2:"#18221d", line:"#24322b", text:"#e7f1eb", muted:"#86998e", th:"#151e19", ctrl:"#0d1410", hover:"#1b2821", foot:"#16201b"},
  teal:    {name:"Бирюзовая ночь", bg:"#081214", panel:"#0f1b1e", panel2:"#152427", line:"#1f3438", text:"#e3f2f3", muted:"#7f9a9d", th:"#122023", ctrl:"#0a1517", hover:"#172b2e", foot:"#132225"},
  olive:   {name:"Олива",    bg:"#11120c", panel:"#1a1b13", panel2:"#212318", line:"#2f3122", text:"#eeefe4", muted:"#969883", th:"#1e1f16", ctrl:"#14150e", hover:"#26281b", foot:"#202118"},
  cocoa:   {name:"Шоколад",  bg:"#130e0b", panel:"#1d1612", panel2:"#251c17", line:"#372a22", text:"#f3ebe5", muted:"#a08f83", th:"#211915", ctrl:"#16100d", hover:"#2c211b", foot:"#231b16"},
  asphalt: {name:"Асфальт",  bg:"#16181c", panel:"#1f2227", panel2:"#262a30", line:"#33373f", text:"#eceef2", muted:"#949aa6", th:"#23262c", ctrl:"#1a1c21", hover:"#2b2f36", foot:"#25282e"},
  cosmos:  {name:"Космос",   bg:"#05040b", panel:"#0d0b18", panel2:"#131022", line:"#221d38", text:"#eeeaff", muted:"#8d86ad", th:"#100e1e", ctrl:"#08070f", hover:"#19152c", foot:"#110f20"},
};
const SITE_ACCENTS = [
  ["midnight", "Полночь", "#7aa2f7", "#bb9af7", "night"],
  ["graphite", "Графит", "#a9b4c8", "#e2e5ea", "graphite"],
  ["ocean", "Океан", "#4cc9f0", "#4361ee", "night"],
  ["emerald", "Изумруд", "#4ade80", "#2dd4bf", "slate"],
  ["amethyst", "Аметист", "#c792ea", "#f472b6", "night"],
  ["sunset", "Закат", "#ff9e64", "#ff4d6d", "warm"],
  ["coffee", "Кофе", "#d4a373", "#e9c46a", "warm"],
  ["cyber", "Кибер", "#00f5d4", "#f15bb5", "oled"],
  ["contrast", "Контраст", "#ffd166", "#4cc9f0", "oled"],
  ["ruby", "Рубин", "#f7768e", "#ff9e64", "graphite"],
  ["sakura", "Сакура", "#ff8fb7", "#c3a6ff", "night"],
  ["lime", "Лайм", "#a3e635", "#facc15", "graphite"],
  ["mint", "Мята", "#5eead4", "#7dd3fc", "slate"],
  ["amber", "Янтарь", "#fbbf24", "#fb923c", "warm"],
  ["lavender", "Лаванда", "#a5b4fc", "#f0abfc", "night"],
  ["indigo", "Индиго", "#818cf8", "#38bdf8", "night"],
  ["coral", "Коралл", "#ff7f6e", "#ffc078", "graphite"],
  ["aurora", "Северное сияние", "#34d399", "#a78bfa", "oled"],
  ["gold", "Золото", "#e8c26a", "#c9925a", "oled"],
  ["glacier", "Ледник", "#9fd8ff", "#c7d2fe", "slate"],
  ["crimson", "Кармин", "#ef4444", "#f97316", "oled"],
  ["sea", "Морская волна", "#2dd4bf", "#22d3ee", "night"],
  ["custom", "Свой оттенок", "#ff7a59", "#ffc857", "night"],
];
// «Свой оттенок»: два цвета акцента, которые выбирает пользователь (Настройки → Тема)
const SITE_CUSTOM_KEY = "chatstats.siteCustom.v1";
(function(){
  try { const j = JSON.parse(localStorage.getItem(SITE_CUSTOM_KEY) || "null"); const ok = v => /^#[0-9a-f]{6}$/i.test(v || "");
    if (j && ok(j.a1) && ok(j.a2)) { const c = SITE_ACCENTS.find(x => x[0] === "custom"); c[2] = j.a1; c[3] = j.a2; if (j.base && SITE_BASES[j.base]) c[4] = j.base; } } catch (e) {}
})();
const SITE_BASE_KEY = "chatstats.siteBase.v1";
let siteBaseId = "auto";
try { const b = localStorage.getItem(SITE_BASE_KEY); if (b === "auto" || SITE_BASES[b]) siteBaseId = b; } catch (e) {}
function siteTheme(id, baseOverride = siteBaseId){
  const a = SITE_ACCENTS.find(x => x[0] === id) || SITE_ACCENTS[0];
  const baseId = baseOverride !== "auto" && SITE_BASES[baseOverride] ? baseOverride : a[4], b = SITE_BASES[baseId];
  return {...b, id:a[0], name:a[1], accent:a[2], accent2:a[3], baseId,
    accentBg:pbMix(b.panel, a[2], .17), glow1:pbMix(b.bg, a[2], .13), glow2:pbMix(b.bg, a[3], .10)};
}
const SITE_THEMES = SITE_ACCENTS.map(a => siteTheme(a[0], "auto"));
let siteThemeId = "midnight";
try { const t = localStorage.getItem(SITE_THEME_KEY); if (SITE_THEMES.some(x => x.id === t)) siteThemeId = t; } catch (e) {}
function applySiteTheme(id){
  const t = siteTheme(id), r = document.documentElement.style;
  siteThemeId = t.id;
  const vars = {"--bg":t.bg, "--panel":t.panel, "--panel-2":t.panel2, "--line":t.line, "--text":t.text, "--muted":t.muted, "--accent":t.accent, "--accent-2":t.accent2,
    "--accent-bg":t.accentBg, "--th-bg":t.th, "--ctrl":t.ctrl, "--hover":t.hover, "--foot":t.foot, "--glow1":t.glow1, "--glow2":t.glow2,
    "--header-bg":hexA(t.bg, .62), "--tip-bg":hexA(t.bg, .95), "--nav-bg":hexA(t.ctrl, .96)};
  Object.entries(vars).forEach(([k, v]) => r.setProperty(k, v));
  ROW_BASE = t.panel;
  document.querySelectorAll(".spark-td,.spark-th").forEach(x => x.remove());
  try { decorateTables(); } catch (e) {}
}
function renderThemeGrid(){
  const box = $("theme-grid"); if (!box) return;
  const bases = $("theme-bases");
  if (bases) bases.innerHTML = `<span class="qr-label">Фон:</span>` + [["auto", "Как в теме"], ...Object.entries(SITE_BASES).map(([k, b]) => [k, b.name])].map(([k, n]) => `<button type="button" class="quick-chip${k === siteBaseId ? " active" : ""}" data-site-base="${k}"${k !== "auto" ? ` style="--chip-bg:${SITE_BASES[k].bg}"` : ""}>${k !== "auto" ? `<i class="base-dot" style="background:${SITE_BASES[k].bg};border-color:${SITE_BASES[k].line}"></i>` : ""}${escH(n)}</button>`).join("");
  box.innerHTML = SITE_ACCENTS.map(a => siteTheme(a[0])).map(t => `<button type="button" class="theme-card${t.id === siteThemeId ? " active" : ""}" data-theme-id="${t.id}" style="--t-bg:${t.bg};--t-panel:${t.panel};--t-line:${t.line};--t-text:${t.text};--t-muted:${t.muted};--t-accent:${t.accent};--t-accent2:${t.accent2}">
    <span class="theme-preview"><span class="theme-prev-head"><i></i><b></b></span><span class="theme-prev-row"><em></em><em></em><em></em></span><span class="theme-prev-row"><em></em><em class="hl"></em><em></em></span></span>
    <span class="theme-name">${escH(t.name)}</span></button>`).join("");
  const cu = SITE_ACCENTS.find(x => x[0] === "custom"), box2 = $("theme-custom");
  if (box2) {
    const hue = (() => { const h = cu[2].slice(1), r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round((x * 60 + 360) % 360); })();
    box2.innerHTML = `<div class="field"><label for="tc-hue">Оттенок</label><input type="range" id="tc-hue" min="0" max="359" step="1" value="${hue}" class="tc-hue"></div>
      <div class="field"><label for="tc-a1">Основной цвет</label><input type="color" id="tc-a1" value="${cu[2]}"></div>
      <div class="field"><label for="tc-a2">Второй цвет</label><input type="color" id="tc-a2" value="${cu[3]}"></div>
      <span class="hint">${siteThemeId === "custom" ? "Свой оттенок включён" : "Выбери цвет — тема «Свой оттенок» включится сама"}</span>`;
  }
}
// цвет по оттенку: насыщенный и светлый, чтобы читался на тёмном фоне
function hslHex(h, s, l){ s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); }
function setCustomTheme(a1, a2, rerender){
  const cu = SITE_ACCENTS.find(x => x[0] === "custom"); cu[2] = a1; cu[3] = a2;
  try { localStorage.setItem(SITE_CUSTOM_KEY, JSON.stringify({a1, a2})); localStorage.setItem(SITE_THEME_KEY, "custom"); } catch (e) {}
  applySiteTheme("custom");
  if (rerender) renderThemeGrid();
  else { document.querySelectorAll("#theme-grid .theme-card").forEach(c => c.classList.toggle("active", c.dataset.themeId === "custom")); const card = document.querySelector('#theme-grid [data-theme-id="custom"]'); if (card) { card.style.setProperty("--t-accent", a1); card.style.setProperty("--t-accent2", a2); } const a = $("tc-a1"), b = $("tc-a2"); if (a) a.value = a1; if (b) b.value = a2; }
}
document.addEventListener("input", e => {
  const id = e.target && e.target.id;
  if (id === "tc-hue") { const h = Number(e.target.value) || 0; setCustomTheme(hslHex(h, 88, 66), hslHex((h + 38) % 360, 90, 70), false); }
  else if (id === "tc-a1" || id === "tc-a2") setCustomTheme($("tc-a1").value, $("tc-a2").value, false);
});
document.addEventListener("change", e => { const id = e.target && e.target.id; if (id === "tc-hue" || id === "tc-a1" || id === "tc-a2") { renderThemeGrid(); if ($("tab-selfie").classList.contains("active")) renderSelfie(); } });
$("theme-grid").addEventListener("click", e => {
  const card = e.target.closest("[data-theme-id]"); if (!card) return;
  applySiteTheme(card.dataset.themeId);
  try { localStorage.setItem(SITE_THEME_KEY, siteThemeId); } catch (err) {}
  renderThemeGrid();
  if ($("tab-selfie").classList.contains("active")) renderSelfie();
});
$("theme-bases")?.addEventListener("click", e => {
  const b = e.target.closest("[data-site-base]"); if (!b) return;
  siteBaseId = b.dataset.siteBase;
  try { localStorage.setItem(SITE_BASE_KEY, siteBaseId); } catch (err) {}
  applySiteTheme(siteThemeId); renderThemeGrid();
  if ($("tab-selfie").classList.contains("active")) renderSelfie();
});
applySiteTheme(siteThemeId);
renderThemeGrid();

/* ===================== Палитры вкладки «Матрица» ===================== */
const DM_PALETTES = [["Пары «лучший день / заливка»", [
  ["Классика", ["#ff9e64","#7aa2f7"]], ["Лёд", ["#7dcfff","#5a8fc2"]], ["Изумруд", ["#9ece6a","#2f8f4e"]], ["Золото", ["#ffd166","#c2861b"]],
  ["Огонь", ["#ff4d6d","#d9531e"]], ["Аметист", ["#c792ea","#7c4dcc"]], ["Неон", ["#00f5d4","#f15bb5"]], ["Закат", ["#ffd56b","#c06c84"]],
  ["Океан", ["#4cc9f0","#4361ee"]], ["Сакура", ["#ffb3c6","#d07aa0"]], ["Монохром", ["#ffffff","#8c93a3"]], ["Для дальтоников", ["#e69f00","#56b4e9"]],
]], ["Ещё пары", [
  ["Мята", ["#5eead4","#14b8a6"]], ["Лайм", ["#d9f99d","#65a30d"]], ["Рубин", ["#fb7185","#9f1239"]], ["Янтарь", ["#fde68a","#d97706"]],
  ["Индиго", ["#c7d2fe","#4f46e5"]], ["Лаванда", ["#f0abfc","#8b5cf6"]], ["Коралл", ["#ffb4a2","#e5603d"]], ["Ледник", ["#e0f2fe","#38bdf8"]],
  ["Северное сияние", ["#a7f3d0","#7c3aed"]], ["Кофе", ["#f2c48d","#8a5a3b"]], ["Кибер", ["#f15bb5","#00bbf9"]], ["Золото и ночь", ["#ffd166","#3b4a8c"]],
]], ["Контрастные", [
  ["Жёлтый на синем", ["#ffe600","#1d4ed8"]], ["Белый на красном", ["#ffffff","#dc2626"]], ["Оранжевый на бирюзе", ["#fb923c","#0d9488"]], ["Розовый на зелёном", ["#ff4fa3","#16a34a"]],
]]];
BUILTIN_PAL.dm = palMap(DM_PALETTES);
if (!Array.isArray(CUSTOM_PAL.dm)) {
  CUSTOM_PAL.dm = [];
  try { const j = JSON.parse(localStorage.getItem(CUSTOM_PAL_KEY) || "null"); if (Array.isArray(j?.dm)) CUSTOM_PAL.dm = j.dm.filter(x => Array.isArray(x) && Array.isArray(x[1])); } catch (e) {}
}
// «Тема сайта» (по умолчанию): цвета берутся из текущей темы и меняются вместе с ней.
const dmThemeOn = () => DM.pal === "theme" || (!DM.pal && !/^#[0-9a-f]{6}$/i.test(DM.hl || "") && !/^#[0-9a-f]{6}$/i.test(DM.fill || ""));
const dmThemeCols = () => (typeof window.themePalette === "function" ? window.themePalette("dm") : ["#bb9af7", "#7aa2f7"]);
const dmHl = () => dmThemeOn() ? dmThemeCols()[0] : /^#[0-9a-f]{6}$/i.test(DM.hl || "") ? DM.hl : "#ff9e64";
const dmFill = () => dmThemeOn() ? dmThemeCols()[1] : /^#[0-9a-f]{6}$/i.test(DM.fill || "") ? DM.fill : "#7aa2f7";
function renderDmColors(){
  $("dm-colors-content").innerHTML = `<div class="chart-setting-group"><h3>Свои цвета</h3>
      <div class="chart-palette-fields"><div class="chart-setting-field"><label>Лучший результат дня</label><input type="color" data-dm-color="hl" value="${dmHl()}"></div><div class="chart-setting-field"><label>Заливка и столбики</label><input type="color" data-dm-color="fill" value="${dmFill()}"></div></div>
      <p class="hint">Заливка видна при включённой «Тепловой заливке»; столбики над днями окрашиваются всегда.</p></div>
    <div class="chart-setting-group pal-group"><h3>Готовые палитры</h3>${palGridHtml("dm", DM_PALETTES, cols => sameColors(cols, [dmHl(), dmFill()]), "data-dm-pal")}</div>`;
}
$("dm-colors-toggle").onclick = () => {
  const panel = $("dm-colors-panel"), open = !panel.classList.contains("open");
  panel.classList.toggle("open", open); panel.setAttribute("aria-hidden", String(!open)); $("dm-colors-toggle").setAttribute("aria-expanded", String(open));
  if (open) renderDmColors();
};
$("dm-colors-close").onclick = () => { $("dm-colors-panel").classList.remove("open"); $("dm-colors-panel").setAttribute("aria-hidden", "true"); $("dm-colors-toggle").setAttribute("aria-expanded", "false"); };
$("dm-colors-content").addEventListener("input", e => {
  const k = e.target.dataset.dmColor; if (!k) return;
  if (dmThemeOn()) { DM.hl = dmHl(); DM.fill = dmFill(); }
  DM.pal = "custom"; DM[k] = e.target.value; dmSave(); renderDayMatrix();
});
$("dm-colors-content").addEventListener("change", e => { if (e.target.dataset.dmColor) renderDmColors(); });
$("dm-colors-content").addEventListener("click", e => {
  const pal = e.target.closest("[data-dm-pal]"), save = e.target.closest("[data-pal-save]"), del = e.target.closest("[data-pal-del]");
  if (pal) { if (pal.dataset.dmPal === window.THEME_PAL) { DM.pal = "theme"; } else { const [hl, fill] = palColors("dm", pal.dataset.dmPal); DM.pal = "custom"; DM.hl = hl; DM.fill = fill; } dmSave(); renderDayMatrix(); renderDmColors(); }
  else if (save) { if (palSaveFlow("dm", [dmHl(), dmFill()])) renderDmColors(); }
  else if (del) { if (palDeleteFlow(del.dataset.palDel)) renderDmColors(); }
});

/* ===================== Жирный шрифт (выключается в настройках) ===================== */
const NO_BOLD_KEY = "chatstats.noBold.v1";
function applyNoBold(on){ document.body.classList.toggle("no-bold", on); }
try { applyNoBold(localStorage.getItem(NO_BOLD_KEY) === "1"); } catch (e) {}
$("no-bold").checked = document.body.classList.contains("no-bold");
$("no-bold").onchange = () => { applyNoBold($("no-bold").checked); try { localStorage.setItem(NO_BOLD_KEY, $("no-bold").checked ? "1" : "0"); } catch (e) {} };

/* ===================== Скелетоны загрузки ===================== */
function skRows(cols, n = 8){ return Array.from({length:n}, (_, i) => `<tr class="sk-row">${Array.from({length:cols}, (_, c) => `<td><span class="sk" style="width:${c === 1 ? 70 : 34 + ((i * 7 + c * 13) % 46)}%"></span></td>`).join("")}</tr>`).join(""); }
function skPage(tiles = 4, blocks = 1){ return `<div class="tiles">${'<div class="sk sk-tile"></div>'.repeat(tiles)}</div>` + '<div class="sk sk-block"></div>'.repeat(blocks); }

/* ===================== Плавные числа ===================== */
const REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/* animateNumber — см. модуль «Цифры-счётчики» ниже */

/* ===================== Участники: редактирование на сайте ===================== */
const PEOPLE_KEY = "chatstats.people.v1";
function applyPeople(list){
  Object.keys(NAMES).forEach(k => delete NAMES[k]);
  MEMBERSHIP_STARTS.length = 0;
  list.forEach(p => { NAMES[p.pk] = p.name; if (p.joined) MEMBERSHIP_STARTS.push([p.joined, Number(p.pk)]); });
}
function rebuildPersonSelect(){
  const cur = person.value;
  person.innerHTML = Object.entries(NAMES).sort((a, b) => a[1].localeCompare(b[1], "ru")).map(([pk, n]) => `<option value="${escH(pk)}">${escH(n)}</option>`).join("");
  if ([...person.options].some(o => o.value === cur)) person.value = cur;
}
try {
  const saved = JSON.parse(localStorage.getItem(PEOPLE_KEY) || "null");
  if (Array.isArray(saved) && saved.length) { applyPeople(saved.filter(p => p && /^\d+$/.test(String(p.pk)) && p.name).map(p => ({pk:String(p.pk), name:String(p.name), joined:/^\d{4}-\d{2}-\d{2}$/.test(p.joined || "") ? p.joined : ""}))); rebuildPersonSelect(); renderPeople(); }
} catch (e) {}
let peopleDraft = null;
function peopleCurrent(){
  const list = Object.entries(NAMES).map(([pk, name]) => ({pk:String(pk), name, joined:(MEMBERSHIP_STARTS.find(([, id]) => String(id) === String(pk)) || [""])[0], color:getStyle("u", pk).c[0], hidden:isExcludedUser(pk)}));
  // исключённые, которых нет в списке имён (пришли из данных), тоже видны — чтобы их можно было вернуть
  PEOPLE_HIDDEN.forEach(pk => { if (!NAMES[pk]) list.push({pk, name:`ID ${pk}`, joined:"", color:getStyle("u", pk).c[0], hidden:true}); });
  return list;
}
function renderPeopleEditor(){
  if (!peopleDraft) peopleDraft = peopleCurrent().sort((a, b) => a.name.localeCompare(b.name, "ru"));
  $("people-body").innerHTML = peopleDraft.map((p, i) => `<tr data-i="${i}"${p.hidden ? ' class="people-off"' : ""}><td><input type="color" data-pf="color" value="${p.color || "#7aa2f7"}" aria-label="Цвет"></td><td style="text-align:left"><input type="text" data-pf="name" value="${escH(p.name)}" maxlength="40" placeholder="Имя"></td><td><input type="number" data-pf="pk" value="${escH(p.pk)}" min="1" step="1" style="width:110px" placeholder="user_pk"></td><td><input type="date" data-pf="joined" value="${escH(p.joined || "")}"></td><td><label class="people-show" title="Снять, чтобы исключить участника со всего сайта"><input type="checkbox" data-pshow="${i}"${p.hidden ? "" : " checked"}><span>${p.hidden ? "Исключён" : "Показан"}</span></label></td><td><button type="button" class="row-exclude-btn" data-pdel="${i}" title="Удалить участника" aria-label="Удалить участника">×</button></td></tr>`).join("");
}
$("people-body").addEventListener("input", e => {
  const tr = e.target.closest("tr"), f = e.target.dataset.pf; if (!tr || !f) return;
  peopleDraft[+tr.dataset.i][f] = e.target.value.trim();
});
$("people-body").addEventListener("change", e => {
  const c = e.target.closest("[data-pshow]"); if (!c) return;
  const p = peopleDraft[+c.dataset.pshow]; p.hidden = !c.checked;
  const sp = c.parentElement.querySelector("span"); if (sp) sp.textContent = p.hidden ? "Исключён" : "Показан";
  c.closest("tr").classList.toggle("people-off", p.hidden);
  $("people-msg").textContent = "Нажми «Сохранить», чтобы применить";
});
$("people-body").addEventListener("click", e => {
  const d = e.target.closest("[data-pdel]"); if (!d) return;
  peopleDraft.splice(+d.dataset.pdel, 1); renderPeopleEditor();
});
$("people-add").onclick = () => { peopleDraft.unshift({pk:"", name:"", joined:iso(new Date()), color:"#7aa2f7"}); renderPeopleEditor(); $("people-body").querySelector('[data-pf="name"]')?.focus(); };
$("people-find").onclick = () => {
  const src = allRows || rows, known = new Set(peopleDraft.map(p => String(p.pk))), found = new Map();
  src.forEach(x => { const pk = String(x[F.userId] ?? ""); if (/^\d+$/.test(pk) && !known.has(pk) && !found.has(pk)) found.set(pk, String(x[F.name] || `ID ${pk}`)); });
  if (!found.size) { $("people-msg").textContent = src.length ? "Новых участников в загруженных данных нет" : "Сначала открой любую вкладку с данными"; return; }
  found.forEach((name, pk) => peopleDraft.unshift({pk, name, joined:"", color:getStyle("u", pk).c[0]}));
  renderPeopleEditor(); $("people-msg").textContent = `Добавлено из данных: ${found.size}. Проверь имена и сохрани.`;
};
$("people-reset").onclick = () => { peopleDraft = null; renderPeopleEditor(); $("people-msg").textContent = "Изменения отменены"; };
$("people-save").onclick = () => {
  const msg = $("people-msg"), seen = new Set();
  for (const p of peopleDraft) {
    if (!/^\d+$/.test(String(p.pk))) { msg.textContent = `У участника «${p.name || "без имени"}» неверный user_pk`; return; }
    if (!p.name) { msg.textContent = `У user_pk ${p.pk} не указано имя`; return; }
    if (seen.has(String(p.pk))) { msg.textContent = `user_pk ${p.pk} указан дважды`; return; }
    seen.add(String(p.pk));
  }
  // исключённые хранятся отдельно; «ID …» без имени в список имён не попадают
  try { localStorage.setItem(PEOPLE_HIDDEN_KEY, JSON.stringify(peopleDraft.filter(p => p.hidden).map(p => String(p.pk)))); } catch (e) {}
  const list = peopleDraft.filter(p => !(p.hidden && /^ID \d+$/.test(p.name) && !NAMES[p.pk])).map(p => ({pk:String(p.pk), name:p.name, joined:p.joined || ""}));
  peopleDraft.forEach(p => { if (/^#[0-9a-f]{6}$/i.test(p.color || "") && p.color.toLowerCase() !== defColor("u", p.pk).toLowerCase()) STYLE.u[p.pk] = {c:[p.color]}; else delete STYLE.u[p.pk]; });
  saveStyle();
  try { localStorage.setItem(PEOPLE_KEY, JSON.stringify(list)); } catch (e) { msg.textContent = "Не удалось сохранить: " + e.message; return; }
  msg.textContent = "Сохранено. Обновляю страницу…";
  setTimeout(() => location.reload(), 350);
};
$("people-default").onclick = () => {
  if (!confirm("Вернуть исходный список участников из кода? Твои правки имён и дат будут удалены.")) return;
  try { localStorage.removeItem(PEOPLE_KEY); } catch (e) {}
  location.reload();
};

/* ===================== Быстрая история: кэш в браузере ===================== */
const IDB_NAME = "chatstats-cache", IDB_STORE = "kv";
function idbOpen(){ return new Promise((res, rej) => { const r = indexedDB.open(IDB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbDo(mode, fn){ const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, mode), req = fn(tx.objectStore(IDB_STORE)); tx.oncomplete = () => { db.close(); res(req?.result); }; tx.onerror = () => { db.close(); rej(tx.error); }; }); }
const idbGet = k => idbDo("readonly", s => s.get(k));
const idbSet = (k, v) => idbDo("readwrite", s => s.put(v, k));
const idbDel = k => idbDo("readwrite", s => s.delete(k));
// Сохранение большого кэша откладываем до момента, когда браузер свободен (но не дольше 4 с), чтобы не тормозить первую отрисовку.
const whenIdle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, {timeout:4000}) : setTimeout(fn, 1500));
// Кэш истории лежит по годам: ключи history:<год> и history:meta. Старые годы не меняются, поэтому при каждом открытии сайта
// пишется на диск только то, что действительно изменилось (обычно — ничего или текущий год), а не вся история целиком.
const HIST_META_KEY = "history:meta", histYearKey = y => "history:" + y;
let histSigs = {}, histLegacy = false, histMetaStr = "", histSaving = Promise.resolve();
const histYearOf = x => String(x[F.date] ?? "").slice(0, 4);
function histSig(list){
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < list.length; i++) { const x = list[i]; a += Number(g(x, "msgs")) || 0; b += Number(g(x, "voice")) || 0; c += Number(g(x, "stick")) || 0; }
  return list.length + ":" + a + ":" + b + ":" + c;
}
async function histLoad(){
  let meta = null; try { meta = await idbGet(HIST_META_KEY); } catch (e) {}
  if (meta && Array.isArray(meta.years) && meta.years.length && /^\d{4}-\d{2}-\d{2}$/.test(meta.lastDate || "")) {
    const parts = await Promise.all(meta.years.map(y => idbGet(histYearKey(y)).catch(() => null)));
    if (parts.every(Array.isArray)) {
      const rows = []; parts.forEach((pt, i) => { for (let k = 0; k < pt.length; k++) rows.push(pt[k]); parts[i] = null; });
      return {rows, lastDate:meta.lastDate, sigs:meta.sigs || {}, legacy:false, metaStr:meta.years.join(",") + "|" + meta.lastDate};
    }
  }
  let old = null; try { old = await idbGet("history"); } catch (e) {}
  if (old && Array.isArray(old.rows) && old.rows.length && /^\d{4}-\d{2}-\d{2}$/.test(old.lastDate || "")) return {rows:old.rows, lastDate:old.lastDate, sigs:{}, legacy:true};
  return null;
}
function histSave(data, lastDate){
  histSaving = histSaving.then(async () => {
    if (!Array.isArray(data) || !data.length) return;
    const by = new Map();
    for (let i = 0; i < data.length; i++) { const x = data[i], y = histYearOf(x); if (!/^\d{4}$/.test(y)) continue; let a = by.get(y); if (!a) by.set(y, a = []); a.push(x); }
    const years = [...by.keys()].sort(), winYear = String(addDaysIso(lastDate, -4)).slice(0, 4);
    let wrote = 0;
    for (const y of years) {
      if (y < winYear && histSigs[y]) continue; // старый год уже сохранён и не менялся
      const sig = histSig(by.get(y));
      if (histSigs[y] === sig) continue;
      await idbSet(histYearKey(y), by.get(y)); histSigs[y] = sig; wrote++;
    }
    Object.keys(histSigs).forEach(y => { if (!by.has(y)) delete histSigs[y]; });
    const metaStr = years.join(",") + "|" + lastDate;
    if (wrote || histLegacy || histMetaStr !== metaStr) {
      await idbSet(HIST_META_KEY, {v:2, savedAt:Date.now(), lastDate, years, count:data.length, sigs:histSigs});
      histMetaStr = metaStr;
    }
    if (histLegacy) { histLegacy = false; try { await idbDel("history"); } catch (e) {} }
  }).then(() => renderCacheInfo()).catch(() => {});
  return histSaving;
}
getHistory = function(){
  if (allRows) return Promise.resolve(allRows);
  return histP || (histP = (async () => {
    const today = iso(new Date());
    let cached = null; try { cached = await histLoad(); } catch (e) {}
    let data;
    if (cached && cached.rows.length) {
      histSigs = cached.sigs || {}; histLegacy = !!cached.legacy; histMetaStr = cached.metaStr || "";
      internRows(cached.rows);
      // Догружаем только последние дни: три дня назад и позже — данные за них могли обновиться.
      const from = addDaysIso(cached.lastDate, -3);
      const fresh = await fetchAll(from, today);
      data = cached.rows.filter(x => String(x[F.date] ?? "").slice(0, 10) < from);
      cached.rows = null;
      for (let i = 0; i < fresh.length; i++) data.push(fresh[i]);
    } else { histSigs = {}; histLegacy = false; data = await fetchAll("2000-01-01", today); }
    rawHist = data; allRows = ultView(data); stamp();
    let lastDate = ""; for (let i = 0; i < data.length; i++) { const d = String(data[i][F.date] ?? "").slice(0, 10); if (d > lastDate) lastDate = d; }
    lastDate = lastDate || today;
    whenIdle(() => histSave(data, lastDate));
    return allRows;
  })().catch(e => { histP = null; throw e; }));
};
async function renderCacheInfo(){
  const el = $("cache-info"); if (!el) return;
  try {
    const c = await idbGet(HIST_META_KEY);
    el.textContent = c ? `В кэше ${fmt(c.count)} строк по ${sFmtDate(c.lastDate)}, обновлён ${new Date(c.savedAt).toLocaleString("ru-RU")}.` : "Кэш пуст — история загрузится целиком при первом открытии.";
  } catch (e) { el.textContent = "Кэш недоступен в этом браузере."; }
}
$("cache-reset").onclick = async () => {
  try { await idbDo("readwrite", st => st.clear()); } catch (e) {}
  histSigs = {}; histLegacy = false; histMetaStr = "";
  allRows = null; histP = null; rawHist = null;
  $("cache-info").textContent = "Кэш очищен. При следующем открытии вкладки история загрузится заново целиком.";
};
// Марафоны и «Матрица» берут данные из кэшированной истории, если она уже загружена.
const mrRowsBase = mrRows;
mrRows = function(m){ return allRows ? Promise.resolve(allRows) : mrRowsBase(m); };

/* ===================== Клик по имени открывает профиль ===================== */
function openProfile(pk){
  pk = String(pk);
  if (![...person.options].some(o => o.value === pk)) { const o = document.createElement("option"); o.value = pk; o.textContent = NAMES[pk] || `ID ${pk}`; person.appendChild(o); }
  person.value = pk; person.dataset.init = "1";
  document.querySelector('nav button[data-tab="profile"]').click();
  window.scrollTo({top:0, behavior:REDUCED_MOTION ? "auto" : "smooth"});
}
document.addEventListener("click", e => {
  const el = e.target.closest?.("[data-open-profile]");
  if (el) { e.preventDefault(); openProfile(el.dataset.openProfile); return; }
  const cw = e.target.closest?.("[data-compare-with]");
  if (cw) { CMP.mode = "user"; CMP.a = cw.dataset.compareWith; if (CMP.b === CMP.a) CMP.b = ""; cmpSave(); document.querySelector('nav button[data-tab="compare"]').click(); }
});

/* ===================== Настройка графика прогноза (вкладка «Прогноз» и профиль) ===================== */
DEFAULT_TEXT_STYLE.forecast = {titleSize:26, titleColor:"#e8eaf1", subtitleSize:15, subtitleColor:"#8a90a2", labelsSize:14, labelsColor:"#e6e8ee", valuesSize:15, valuesColor:"#e8eaf1", axisSize:14, axisColor:"#c0c6d4", legendSize:14, legendColor:"#c0c6d4"};
const FC_OPT_DEFAULTS = {fact:"#7aa2f7", fcst:"#ff4d6d", prev:"#8b91a1"};
const fcOpts = p => ({...FC_OPT_DEFAULTS, ...(p.fc || {})});
const FC_ARGS = {};
let pFcSettingsOpen = false;
function fcChart(id, ...args){ FC_ARGS[id] = args; return fcChartSvg(...args); }
function fcStyleAll(){
  const p = chartPrefs("forecast");
  ["fc-chart", "p-fc-chart"].forEach(id => {
    const el = $(id); if (!el) return;
    el.style.background = chartBackgroundCss(p); el.style.setProperty("--chart-font-color", p.fontColor || "#e6e8ee");
    applySelfieText(el, "forecast");
  });
}
function rerenderFc(){
  Object.entries(FC_ARGS).forEach(([id, args]) => { const el = $(id); if (el) el.innerHTML = fcChartSvg(...args); });
  fcStyleAll();
}
function renderFcSettings(boxId){
  const box = $(boxId); if (!box) return;
  const p = chartPrefs("forecast"), o = fcOpts(p), mode = p.backgroundMode || "linear", ts = p.textStyle;
  const color = (label, attr, value) => `<div class="chart-setting-field"><label>${escH(label)}</label><input type="color" ${attr} value="${value}" aria-label="${escH(label)}"></div>`;
  box.innerHTML = `<div class="chart-setting-group chart-bg-group"><h3>Фон графика</h3><div class="chart-setting-field"><label>Тип фона</label><select data-fs-bgmode><option value="solid"${mode === "solid" ? " selected" : ""}>Один цвет</option><option value="linear"${mode === "linear" ? " selected" : ""}>Линейный градиент</option><option value="radial"${mode === "radial" ? " selected" : ""}>Радиальный градиент</option></select></div>
      <div class="chart-bg-controls">${color(mode === "solid" ? "Цвет фона" : "Градиент · начало", 'data-fs-app="backgroundStart"', p.backgroundStart)}${mode === "solid" ? "" : color("Градиент · конец", 'data-fs-app="backgroundEnd"', p.backgroundEnd)}</div>
      ${mode === "linear" ? `<div class="chart-setting-field"><label>Угол: <output data-fs-out="angle">${Number(p.backgroundAngle ?? 135)}°</output></label><input type="range" min="0" max="360" step="5" value="${Number(p.backgroundAngle ?? 135)}" data-fs-angle></div>` : ""}</div>
    <div class="chart-setting-group chart-typography-group"><h3>Текст и размеры</h3><div class="chart-setting-field chart-subtitle-toggle chart-sub-inline"><label><input type="checkbox" data-fs-sub${p.showSubtitle !== false ? " checked" : ""}> Показывать подзаголовок</label></div><div class="chart-typography-grid">${TEXT_STYLE_LABELS.filter(([g2]) => g2 !== "labels").map(([g2, label]) => `<div class="chart-typography-row"><span class="chart-setting-series-name">${escH(label)}</span><div class="chart-font-range"><input type="number" inputmode="numeric" class="chart-font-num" min="8" max="48" step="1" value="${Number(ts[g2 + "Size"]) || 14}" data-fs-size="${g2}Size" aria-label="Размер: ${escH(label)}" title="Размер шрифта, px"><span class="chart-font-unit">px</span></div><div class="chart-font-color"><input type="color" data-fs-app="${g2}Color" value="${ts[g2 + "Color"]}"></div></div>`).join("")}</div></div>
    <div class="chart-setting-group"><h3>Линии</h3><div class="chart-palette-fields">${color("Факт", 'data-fs-color="fact"', o.fact)}${color("Прогноз и диапазон", 'data-fs-color="fcst"', o.fcst)}${color("Прошлый период", 'data-fs-color="prev"', o.prev)}</div></div>
    <div class="chart-setting-group pal-group"><h3>Готовые палитры</h3><p class="hint">Первые три цвета палитры: факт, прогноз, прошлый период.</p>${palGridHtml("cat", CAT_PALETTES, cols => sameColors(cols.slice(0, 3), [o.fact, o.fcst, o.prev]), "data-fc-pal")}</div>
    <div class="chart-setting-footer"><button class="mini" type="button" data-fs-reset>Сбросить настройки графика</button></div>`;
}
function refreshFcSettingsPanels(){ document.querySelectorAll(".fc-settings-panel.open .fc-settings-content").forEach(b => renderFcSettings(b.id)); }
function fcSettingsEvent(e, isChange){
  if (!e.target.closest?.(".fc-settings-content")) return;
  const t = e.target, d = t.dataset, p = chartPrefs("forecast");
  let rebuild = false;
  const setOut = (k, v) => t.closest(".fc-settings-content").querySelectorAll(`[data-fs-out="${k}"]`).forEach(o => o.textContent = v);
  if (d.fsBgmode !== undefined) { if (!isChange) return; p.backgroundMode = t.value; rebuild = true; }
  else if (d.fsAngle !== undefined) { p.backgroundAngle = Number(t.value); setOut("angle", `${t.value}°`); }
  else if (d.fsSub !== undefined) { if (!isChange) return; p.showSubtitle = t.checked; }
  else if (d.fsSize) { const v = fontSizeVal(t, isChange); if (v == null) return; p.textStyle = {...p.textStyle, [d.fsSize]:v}; }
  else if (d.fsApp) { if (/Color$/.test(d.fsApp)) p.textStyle = {...p.textStyle, [d.fsApp]:t.value}; else p[d.fsApp] = t.value; }
  else if (d.fsColor) { p.fc = {...fcOpts(p), [d.fsColor]:t.value}; if (isChange) rebuild = true; }
  else return;
  CHART_PREFS.forecast = p; saveChartPrefs(); rerenderFc();
  if (rebuild) refreshFcSettingsPanels();
}
document.addEventListener("input", e => fcSettingsEvent(e, false));
document.addEventListener("change", e => fcSettingsEvent(e, true));
document.addEventListener("click", e => {
  const box = e.target.closest?.(".fc-settings-content"); if (!box) return;
  const pal = e.target.closest("[data-fc-pal]"), save = e.target.closest("[data-pal-save]"), del = e.target.closest("[data-pal-del]");
  if (pal) { const c = palColors("cat", pal.dataset.fcPal), p = chartPrefs("forecast"); p.fc = {fact:c[0], fcst:c[1 % c.length], prev:c[2 % c.length]}; applyPalBg(p, "cat", pal.dataset.fcPal); CHART_PREFS.forecast = p; saveChartPrefs(); rerenderFc(); }
  else if (save) { const o = fcOpts(chartPrefs("forecast")); if (!palSaveFlow("cat", [o.fact, o.fcst, o.prev], prefBg(chartPrefs("forecast")))) return; }
  else if (del) { if (!palDeleteFlow(del.dataset.palDel)) return; }
  else if (e.target.closest("[data-fs-reset]")) { delete CHART_PREFS.forecast; saveChartPrefs(); rerenderFc(); }
  else return;
  refreshFcSettingsPanels();
});
function toggleFcPanel(panelId, contentId, force){
  const panel = $(panelId); if (!panel) return false;
  const open = force === undefined ? !panel.classList.contains("open") : force;
  panel.classList.toggle("open", open); panel.setAttribute("aria-hidden", String(!open));
  if (open) renderFcSettings(contentId);
  return open;
}
$("fc-settings-toggle").onclick = () => toggleFcPanel("fc-settings-panel", "fc-settings-content");
$("fc-settings-close").onclick = () => toggleFcPanel("fc-settings-panel", "fc-settings-content", false);
$("p-out").addEventListener("click", e => {
  if (e.target.closest("#p-fc-settings-toggle")) pFcSettingsOpen = toggleFcPanel("p-fc-settings-panel", "p-fc-settings-content");
  else if (e.target.closest("#p-fc-settings-close")) pFcSettingsOpen = toggleFcPanel("p-fc-settings-panel", "p-fc-settings-content", false);
});

/* ===================== Итоги года: подсчёт в фоновом потоке ===================== */
function yrWorkerMain(){
  let rows = null, K = null, names = {}, VKD = new Set();
  const vkDay = d => VKD.size > 0 && VKD.has(d);
  const MET = ["msgs", "stick", "voice", "video"];
  const dayIdx = v => { const a = v.split("-").map(Number); return Math.round(Date.UTC(a[0], a[1] - 1, a[2]) / 864e5); };
  const val = (x, k) => Number(x[K[k]]) || 0;
  function pick(chat){
    if (chat) return rows.filter(x => x[K.chat] === chat && Number(x[K.chatPk]) !== 0);
    return rows.some(x => Number(x[K.chatPk]) === 0) ? rows.filter(x => Number(x[K.chatPk]) === 0) : rows;
  }
  function stats(src, y, chat, cutoff, today){
    const from = y + "-01-01", lim = cutoff ? y + "-" + cutoff : y + "-12-31";
    const T = {msgs:0, stick:0, voice:0, video:0}, days = new Map(), users = new Map();
    const months = Array.from({length:12}, () => ({msgs:0, stick:0, voice:0, video:0}));
    for (const x of src) {
      const d = String(x[K.date] ?? "").slice(0, 10); if (d < from || d > lim) continue;
      const v = {}; MET.forEach(k => { v[k] = val(x, k); T[k] += v[k]; months[+d.slice(5, 7) - 1][k] += v[k]; });
      const dd = days.get(d) || {msgs:0, stick:0, voice:0, video:0}; MET.forEach(k => dd[k] += v[k]); if (!vkDay(d)) days.set(d, dd);
      const pk = String(x[K.userId] ?? x[K.name]);
      let u = users.get(pk);
      if (!u) { u = {pk, name:names[x[K.userId]] || x[K.name] || "—", msgs:0, stick:0, voice:0, video:0, days:0, best:null}; users.set(pk, u); }
      MET.forEach(k => u[k] += v[k]);
      if (v.msgs > 0 && !vkDay(d)) { u.days++; if (!u.best || v.msgs > u.best.v) u.best = {d, v:v.msgs}; }
    }
    const chats = new Map();
    if (!chat) for (const x of rows) {
      if (Number(x[K.chatPk]) === 0) continue;
      const d = String(x[K.date] ?? "").slice(0, 10); if (d < from || d > lim) continue;
      const k = String(x[K.chatPk] ?? x[K.chat]), c = chats.get(k) || {k, name:String(x[K.chat] || "Чат " + k), msgs:0, stick:0, voice:0, video:0};
      MET.forEach(m => c[m] += val(x, m)); chats.set(k, c);
    }
    const end = lim < today ? lim : today, span = end >= from ? dayIdx(end) - dayIdx(from) + 1 : 0;
    const list = [...users.values()].filter(u => u.msgs + u.stick + u.voice + u.video > 0).sort((a, b) => b.msgs - a.msgs || a.name.localeCompare(b.name, "ru"));
    const activeDays = [...days.values()].filter(d => d.msgs > 0).length;
    return {y, T, days:[...days.entries()], months, list, chats:[...chats.values()].sort((a, b) => b.msgs - a.msgs), activeDays, span, from, lim};
  }
  self.onmessage = e => {
    const m = e.data;
    if (m.type === "rows") { rows = m.rows; K = m.keys; names = m.names; VKD = new Set(m.vk || []); self.postMessage({id:m.id, ok:true}); return; }
    if (m.type === "years") {
      const src = pick(m.chat), out = {};
      for (const [y, cutoff] of m.jobs) out[y + "|" + (cutoff || "")] = stats(src, y, m.chat, cutoff, m.today);
      self.postMessage({id:m.id, result:out});
    }
  };
}
let yrWorker = null, yrWorkerRows = null, yrWorkerSeq = 0, yrWorkerFailed = false;
const yrWorkerPending = new Map();
function yrWorkerGet(){
  if (yrWorker || yrWorkerFailed) return yrWorker;
  try {
    yrWorker = new Worker(URL.createObjectURL(new Blob([`(${yrWorkerMain.toString()})()`], {type:"text/javascript"})));
    yrWorker.onmessage = e => { const done = yrWorkerPending.get(e.data.id); if (done) { yrWorkerPending.delete(e.data.id); done(e.data); } };
    yrWorker.onerror = () => { yrWorkerFailed = true; yrWorker = null; yrWorkerPending.forEach(done => done({error:true})); yrWorkerPending.clear(); };
  } catch (e) { yrWorkerFailed = true; yrWorker = null; }
  return yrWorker;
}
const yrWorkerCall = msg => new Promise(res => { const id = ++yrWorkerSeq; yrWorkerPending.set(id, res); yrWorker.postMessage({...msg, id}); });
async function yrEnsureStats(jobs, chat){
  if (yrCacheSrc !== allRows) { yrCache.clear(); yrCacheSrc = allRows; }
  const need = jobs.filter(([y, c]) => !yrCache.has(`${y}|${chat}|${c || ""}`));
  if (!need.length) return;
  const w = yrWorkerGet();
  if (w) {
    if (yrWorkerRows !== allRows) {
      const sample = allRows.find(x => x) || {};
      MET.forEach(k => g(sample, k));
      const keys = {date:F.date, chat:F.chat, chatPk:F.chatPk, userId:F.userId, name:F.name, msgs:resolved.msgs, stick:resolved.stick, voice:resolved.voice, video:resolved.video};
      const ok = await yrWorkerCall({type:"rows", rows:allRows, keys, names:{...NAMES}, vk:[...VKDAYS]});
      if (!ok.error) yrWorkerRows = allRows;
    }
    if (yrWorkerRows === allRows && yrWorker) {
      const res = await yrWorkerCall({type:"years", jobs:need, chat, today:iso(new Date())});
      if (res.result) {
        Object.entries(res.result).forEach(([key, s]) => {
          const [y, c] = key.split("|");
          yrCache.set(`${y}|${chat}|${c}`, {...s, days:new Map(s.days), users:new Map(s.list.map(u => [u.pk, u]))});
        });
        return;
      }
    }
  }
  need.forEach(([y, c]) => yrStats(y, chat, c)); // запасной путь без фонового потока
}
let yrRenderSeq = 0;
renderYearReview = async function(){
  if (!allRows) return;
  const years = yrYears(), cur = String(new Date().getFullYear()), y = YR.year;
  const cmpY = YR.cmp === "none" ? null : YR.cmp === "prev" ? (years.includes(String(+y - 1)) ? String(+y - 1) : null) : YR.cmp;
  const cutoff = (y === cur || cmpY === cur) && YR.same ? iso(new Date()).slice(5) : null;
  const jobs = [[y, cutoff], ...(cmpY ? [[cmpY, cutoff]] : []), ...years.map(yy => [yy, null])];
  const seq = ++yrRenderSeq;
  if (jobs.some(([yy, c]) => !yrCache.has(`${yy}|${YR.chat}|${c || ""}`))) $("yr-out").innerHTML = `<div class="sk sk-poster"></div>` + skPage(8, 1);
  await yrEnsureStats(jobs, YR.chat);
  if (seq !== yrRenderSeq) return;
  renderYearReviewSync();
};

/* ===================== Сравнение: участники, чаты, месяцы, годы ===================== */
const CMP_KEY = "chatstats.compare.v1";
let CMP = {mode:"user", a:"", b:"", period:"all", chat:"", chA:"", chB:"", mA:"", mB:"", yA:"", yB:"", same:true};
try { const j = JSON.parse(localStorage.getItem(CMP_KEY) || "null"); if (j) CMP = {...CMP, ...j}; } catch (e) {}
if (!["user", "chat", "month", "year"].includes(CMP.mode)) CMP.mode = "user";
const CMP_MODES = [["user", "Участники"], ["chat", "Чаты"], ["month", "Месяцы"], ["year", "Годы"]];
let cmpLast = null;
// Цвета пары в сравнении: свои цвета участников, а если они почти совпадают — второй заменяется на контрастный.
// Используется и в карточке сравнения, и на радарах, чтобы цвета везде совпадали.
function cmpPairColors(cA, cB){
  const cDist = (x, y) => { const p = h => [1, 3, 5].map(i => parseInt(String(h).slice(i, i + 2), 16) || 0); const a = p(x), b = p(y); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  if (/^#[0-9a-f]{6}$/i.test(cA) && /^#[0-9a-f]{6}$/i.test(cB) && cDist(cA, cB) < 90) cB = ["#7aa2f7", "#ff9e64", "#bb9af7", "#9ece6a"].find(c => cDist(cA, c) >= 90) || "#7aa2f7";
  else if (String(cA).toLowerCase() === String(cB).toLowerCase()) cB = "#7aa2f7";
  return [cA, cB];
}
function cmpSave(){ try { localStorage.setItem(CMP_KEY, JSON.stringify(CMP)); } catch (e) {} updateRoute(); }
function cmpRange(){
  const today = iso(new Date());
  if (CMP.period === "365") return [addDaysIso(today, -364), today];
  if (/^\d{4}$/.test(CMP.period)) return [`${CMP.period}-01-01`, `${CMP.period}-12-31` < today ? `${CMP.period}-12-31` : today];
  if (/^\d{4}-\d{2}$/.test(CMP.period)) { const last = cmpMonthLast(CMP.period); return [`${CMP.period}-01`, last < today ? last : today]; }
  return ["0000-00-00", today];
}
const cmpPeriodKind = () => /^\d{4}-\d{2}$/.test(CMP.period) ? "month" : /^\d{4}$/.test(CMP.period) ? "year" : CMP.period === "365" ? "365" : "all";
function cmpPeriodLabel(){ const k = cmpPeriodKind(); return k === "all" ? "за всё время" : k === "365" ? "за последние 365 дней" : k === "year" ? `за ${CMP.period} год` : `за ${MONTHS[+CMP.period.slice(5) - 1].toLowerCase()} ${CMP.period.slice(0, 4)}`; }
const cmpMonthName = m => `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
const cmpMonthLast = m => { const [y, mm] = m.split("-").map(Number); return `${m}-${pad(new Date(Date.UTC(y, mm, 0)).getUTCDate())}`; };
const cmpThemeVar = (n, f) => (getComputedStyle(document.body).getPropertyValue(n) || "").trim() || f;
function cmpExportPrefs(){ return {backgroundMode:"linear", backgroundStart:cmpThemeVar("--panel-2", "#1d212b"), backgroundEnd:cmpThemeVar("--bg", "#0f1117"), backgroundAngle:160, keepTextColors:true}; }
function cmpChatList(){
  const hasT = allRows.some(x => Number(x[F.chatPk]) === 0), tot = new Map();
  (hasT ? allRows.filter(x => Number(x[F.chatPk]) !== 0) : allRows).forEach(x => { const t = x[F.chat]; if (!t) return; const e = tot.get(t) || {t, pk:String(x[F.chatPk] ?? t), v:0}; e.v += Number(g(x, "msgs")) || 0; tot.set(t, e); });
  if (!ULT.on && rawHist) { const u = ultOnlyRows(); if (u.length) tot.set(ULT_NAME, {t:ULT_NAME, pk:ULT_PK, v:u.reduce((s2, x) => s2 + (Number(g(x, "msgs")) || 0), 0)}); }
  return [...tot.values()].sort((a, b) => b.v - a.v);
}
function cmpMonthList(){ return [...new Set(allRows.map(x => String(x[F.date] ?? "").slice(0, 7)).filter(m => /^\d{4}-\d{2}$/.test(m)))].sort().reverse(); }

/* --- Подсчёт --- */
function cmpStats(pk, from, to){
  const daily = new Map(), t = {msgs:0, stick:0, voice:0, video:0}, months = new Map(), chats = new Map();
  chatSrc(CMP.chat).forEach(x => {
    if (String(x[F.userId]) !== pk) return;
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > to) return;
    const v = Number(g(x, "msgs")) || 0;
    MET.forEach(k => t[k] += Number(g(x, k)) || 0);
    if (v) { daily.set(d, (daily.get(d) || 0) + v); months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) || 0) + v); }
  });
  if (!CMP.chat) chatRowsForChart(allRows).forEach(x => {
    if (String(x[F.userId]) !== pk) return;
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > to) return;
    const k = String(x[F.chat] || x[F.chatPk]); chats.set(k, (chats.get(k) || 0) + (Number(g(x, "msgs")) || 0));
  });
  const st = streakStats(daily);
  let selfie = null;
  if (SELFIE.length) {
    const m = selfieModel(), p = m.persons.get(pk), days = m.days.filter(d => d >= from && d <= to);
    selfie = p ? sPersonRange(m, p, days) : {count:0, att:0, elig:0};
  }
  const mrs = MARATHONS.filter(m => m.from >= from && m.to <= to && mrPhase(m).cls === "done");
  const wins = mrs.filter(m => mrResults(m, allRows, "msgs", "").list[0]?.k === pk).length;
  const start = MEMBERSHIP_STARTS.find(([, id]) => String(id) === pk)?.[0];
  return {t, st, daily, months, chats, selfie, wins, mrCount:mrs.length, joinedDays:start ? dateDiffDays(parseDate(start), todayUtc()) : null, start};
}
// Общая сводка по набору строк (чат, месяц, год).
function cmpAgg(src, from, to){
  const t = {msgs:0, stick:0, voice:0, video:0}, daily = new Map(), months = new Map(), users = new Map();
  for (const x of src) {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > to) continue;
    MET.forEach(k => t[k] += Number(g(x, k)) || 0);
    const v = Number(g(x, "msgs")) || 0; if (!v) continue;
    daily.set(d, (daily.get(d) || 0) + v); months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) || 0) + v);
    const pk = String(x[F.userId] ?? x[F.name]); const u = users.get(pk) || {pk, name:who(x), msgs:0}; u.msgs += v; users.set(pk, u);
  }
  const list = [...users.values()].sort((a, b) => b.msgs - a.msgs);
  const today = iso(new Date()), lim = to < today ? to : today;
  const calDays = from > lim ? 0 : dayIdx(lim) - dayIdx(from < "1900-01-01" ? lim : from) + 1;
  return {t, daily, months, users, list, top:list[0] || null, activeUsers:list.length, st:streakStats(daily), calDays, from, to};
}
function cmpRanges(){
  const today = iso(new Date());
  if (CMP.mode === "month") {
    const cur = today.slice(0, 7), cut = CMP.same && (CMP.mA === cur || CMP.mB === cur) ? today.slice(8) : null;
    return [CMP.mA, CMP.mB].map(m => { const last = cmpMonthLast(m); let to = cut ? `${m}-${cut}` : last; if (to > last) to = last; return [`${m}-01`, to < today ? to : today]; });
  }
  if (CMP.mode === "year") {
    const cur = today.slice(0, 4), cut = CMP.same && (CMP.yA === cur || CMP.yB === cur) ? today.slice(5) : null;
    return [CMP.yA, CMP.yB].map(y => { const to = cut ? `${y}-${cut}` : `${y}-12-31`; return [`${y}-01-01`, to < today ? to : today]; });
  }
  const r = cmpRange(); return [r, r];
}

/* --- Модель сравнения --- */
function cmpModel(){
  const mode = CMP.mode, [rA, rB] = cmpRanges();
  let A, B, nA, nB, cA, cB, keyA, keyB, title, scope;
  const chatTxt = CMP.chat ? `чат «${CMP.chat}»` : "все чаты";
  if (mode === "user") {
    A = cmpStats(CMP.a, ...rA); B = cmpStats(CMP.b, ...rB);
    nA = NAMES[CMP.a] || CMP.a; nB = NAMES[CMP.b] || CMP.b; cA = getStyle("u", CMP.a).c[0]; cB = getStyle("u", CMP.b).c[0];
    keyA = CMP.a; keyB = CMP.b; scope = `${cmpPeriodLabel()} · ${chatTxt}`;
  } else if (mode === "chat") {
    const chats = cmpChatList(), ca = chats.find(c => c.t === CMP.chA), cb = chats.find(c => c.t === CMP.chB);
    A = cmpAgg(chatSrc(CMP.chA), ...rA); B = cmpAgg(chatSrc(CMP.chB), ...rB);
    nA = CMP.chA; nB = CMP.chB; cA = getStyle("c", ca?.pk).c[0]; cB = getStyle("c", cb?.pk).c[0]; scope = cmpPeriodLabel();
  } else if (mode === "month") {
    A = cmpAgg(chatSrc(CMP.chat), ...rA); B = cmpAgg(chatSrc(CMP.chat), ...rB);
    nA = cmpMonthName(CMP.mA); nB = cmpMonthName(CMP.mB); keyA = CMP.mA; keyB = CMP.mB; cA = "#7aa2f7"; cB = "#ff9e64";
    const cutTxt = rA[1].slice(8) !== cmpMonthLast(CMP.mA).slice(8) || rB[1].slice(8) !== cmpMonthLast(CMP.mB).slice(8) ? ` · по ${+rA[1].slice(8)}-е число` : "";
    scope = `${chatTxt}${CMP.same ? cutTxt : ""}`;
  } else {
    A = cmpAgg(chatSrc(CMP.chat), ...rA); B = cmpAgg(chatSrc(CMP.chat), ...rB);
    nA = `${CMP.yA} год`; nB = `${CMP.yB} год`; keyA = CMP.yA; keyB = CMP.yB; cA = yearHue(CMP.yA); cB = yearHue(CMP.yB);
    const cut = rA[1].slice(5) !== "12-31" && CMP.same ? ` · по ${yrDayRu(rA[1])}` : "";
    scope = `${chatTxt}${cut}`;
  }
  [cA, cB] = cmpPairColors(cA, cB);
  title = `${nA} и ${nB}`;
  const metrics = [["Сообщения", A.t.msgs, B.t.msgs, fmt, "", "", "сообщений"], ["Стикеры", A.t.stick, B.t.stick, fmt, "", "", "стикеров"], ["Голосовые", A.t.voice, B.t.voice, fmt, "", "", "голосовых"], ["Видеосообщения", A.t.video, B.t.video, fmt, "", "", "видеосообщений"]];
  if (mode === "user") {
    metrics.push(["Активных дней", A.st.activeDays, B.st.activeDays, fmt, "", "", "активных дней"],
      ["В среднем за активный день", A.st.activeDays ? A.t.msgs / A.st.activeDays : 0, B.st.activeDays ? B.t.msgs / B.st.activeDays : 0, fmtR, "", "", "среднего за день"],
      ["Лучший день", A.st.best?.v || 0, B.st.best?.v || 0, fmt, A.st.best ? sFmtDate(A.st.best.d) : "", B.st.best ? sFmtDate(B.st.best.d) : "", "лучшего дня"],
      ["Самая длинная серия дней", A.st.maxStreak, B.st.maxStreak, fmt, "", "", "серии дней"]);
    if (RX_ON && window.__beta) {
      const [rf, rt] = cmpRange(), R = window.__beta.react, ra = R.between(String(CMP.a), String(CMP.b), rf, rt);
      const ta = R.totalsIn(String(CMP.a), rf, rt), tb = R.totalsIn(String(CMP.b), rf, rt);
      metrics.push(["Поставил(а) реакций", ta.given, tb.given, fmt, "", "", "поставленных реакций"], ["Получил(а) реакций", ta.got, tb.got, fmt, "", "", "полученных реакций"],
        ["Реакций друг другу", ra.ab, ra.ba, fmt, "", "", "реакций друг другу"]);
      window.__beta.events.inRange(rf, rt).forEach(ev => {
        const la = window.__beta.events.levelOf(ev.id, CMP.a), lb = window.__beta.events.levelOf(ev.id, CMP.b);
        if (la || lb) metrics.push([`Уровень в событии «${ev.title}»`, la, lb, fmt, la ? ev.rankOf(la) : "", lb ? ev.rankOf(lb) : "", `уровня в событии «${ev.title}»`]);
      });
    }
    if (A.selfie || B.selfie) {
      metrics.push(["Селфи", A.selfie?.count || 0, B.selfie?.count || 0, fmt, "", "", "селфи"]);
      metrics.push(["Посещаемость селфи", Math.round((A.selfie?.att || 0) * 100), Math.round((B.selfie?.att || 0) * 100), v => v + "%", "", "", "посещаемости селфи"]);
    }
    if (A.mrCount) metrics.push(["Победы в марафонах", A.wins, B.wins, fmt, `из ${A.mrCount}`, `из ${B.mrCount}`, "побед в марафонах"]);
    if (CMP.period === "all" && (A.joinedDays != null || B.joinedDays != null)) metrics.push(["Дней в чате", A.joinedDays || 0, B.joinedDays || 0, fmt, A.start ? `с ${sFmtDate(A.start)}` : "", B.start ? `с ${sFmtDate(B.start)}` : "", "стажа"]);
  } else {
    const perDay = mode === "chat";
    metrics.push(["Активных участников", A.activeUsers, B.activeUsers, fmt, "", "", "участников"],
      ["Активных дней", A.st.activeDays, B.st.activeDays, fmt, mode === "chat" ? "" : `из ${A.calDays}`, mode === "chat" ? "" : `из ${B.calDays}`, "активных дней"],
      [perDay ? "В среднем за активный день" : "В среднем за день", perDay ? (A.st.activeDays ? A.t.msgs / A.st.activeDays : 0) : (A.calDays ? A.t.msgs / A.calDays : 0), perDay ? (B.st.activeDays ? B.t.msgs / B.st.activeDays : 0) : (B.calDays ? B.t.msgs / B.calDays : 0), fmtR, "", "", "среднего за день"],
      ["Сообщений на участника", A.activeUsers ? A.t.msgs / A.activeUsers : 0, B.activeUsers ? B.t.msgs / B.activeUsers : 0, fmtR, "", "", "сообщений на участника"],
      ["Лучший день", A.st.best?.v || 0, B.st.best?.v || 0, fmt, A.st.best ? sFmtDate(A.st.best.d) : "", B.st.best ? sFmtDate(B.st.best.d) : "", "лучшего дня"],
      ["Самая длинная серия дней", A.st.maxStreak, B.st.maxStreak, fmt, "", "", "серии дней"],
      ["Результат лидера", A.top?.msgs || 0, B.top?.msgs || 0, fmt, A.top?.name || "", B.top?.name || "", "результата лидера"]);
  }
  let sa = 0, sb = 0; metrics.forEach(([, a, b]) => { if (a > b) sa++; else if (b > a) sb++; });
  // Серия для графика
  let series;
  if (mode === "month") {
    const la = +cmpMonthLast(CMP.mA).slice(8), lb = +cmpMonthLast(CMP.mB).slice(8), n = Math.max(la, lb);
    const val = (S, m, i, last) => { const d = `${m}-${pad(i + 1)}`; return i >= last || d > S.to ? null : (S.daily.get(d) || 0); };
    series = {title:"Сообщения по дням месяца", unitName:"дней", x:Array.from({length:n}, (_, i) => String(i + 1)), tip:i => `${i + 1}-е число`,
      a:Array.from({length:n}, (_, i) => val(A, CMP.mA, i, la)), b:Array.from({length:n}, (_, i) => val(B, CMP.mB, i, lb))};
  } else if (mode === "year") {
    const val = (S, y, i) => { const m = `${y}-${pad(i + 1)}`; return `${m}-01` > S.to ? null : (S.months.get(m) || 0); };
    series = {title:"Сообщения по месяцам", unitName:"месяцев", x:MONTHS_SHORT_RU.slice(), tip:i => MONTHS[i],
      a:Array.from({length:12}, (_, i) => val(A, CMP.yA, i)), b:Array.from({length:12}, (_, i) => val(B, CMP.yB, i))};
  } else if (cmpPeriodKind() === "month") {
    const P = CMP.period, last = +cmpMonthLast(P).slice(8), to = cmpRange()[1];
    const val = (S, i) => { const d = `${P}-${pad(i + 1)}`; return d > to ? null : (S.daily.get(d) || 0); };
    series = {title:"Сообщения по дням", unitName:"дней", x:Array.from({length:last}, (_, i) => String(i + 1)), tip:i => `${i + 1} ${MONTHS_GEN[+P.slice(5) - 1]}`,
      a:Array.from({length:last}, (_, i) => val(A, i)), b:Array.from({length:last}, (_, i) => val(B, i))};
  } else {
    const keys = [...new Set([...A.months.keys(), ...B.months.keys()])].sort(), all = [];
    if (keys.length) for (let k = keys[0]; k <= keys[keys.length - 1];) { all.push(k); const [y, m] = k.split("-").map(Number); k = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; }
    series = {title:"Сообщения по месяцам", unitName:"месяцев", x:all.map(k => MONTHS_SHORT_RU[+k.slice(5) - 1] + (all.length > 12 ? " " + k.slice(2, 4) : "")), tip:i => `${MONTHS[+all[i].slice(5) - 1]} ${all[i].slice(0, 4)}`,
      a:all.map(k => A.months.get(k) || 0), b:all.map(k => B.months.get(k) || 0)};
  }
  let leadA = 0, leadB = 0; series.a.forEach((v, i) => { const w = series.b[i]; if (v == null || w == null) return; if (v > w) leadA++; else if (w > v) leadB++; });
  series.leadA = leadA; series.leadB = leadB;
  // Таблица
  let table;
  if (mode === "user") {
    const rowsT = [...new Set([...A.chats.keys(), ...B.chats.keys()])].map(k => [k, A.chats.get(k) || 0, B.chats.get(k) || 0]).filter(r => r[1] + r[2] > 0).sort((x, y) => (y[1] + y[2]) - (x[1] + x[2]));
    table = {title:"По чатам", head:"Чат", rows:rowsT};
  } else {
    const ids = new Set([...A.users.keys(), ...B.users.keys()]);
    const rowsT = [...ids].map(k => [k, A.users.get(k)?.msgs || 0, B.users.get(k)?.msgs || 0, NAMES[k] || A.users.get(k)?.name || B.users.get(k)?.name || k]).sort((x, y) => (y[1] + y[2]) - (x[1] + x[2])).slice(0, 30);
    table = {title:"По участникам", head:"Участник", rows:rowsT, people:true};
  }
  const m = {mode, A, B, nA, nB, cA, cB, keyA, keyB, metrics, sa, sb, series, table, title, scope};
  m.verdict = cmpVerdict(m);
  return m;
}

/* --- Вывод --- */
function cmpTimes(w, l){
  if (!l) return null;
  const r = w / l, rr = Math.round(r * 10) / 10;
  if (rr >= 2) return `в ${rr.toLocaleString("ru-RU")} ${Number.isInteger(rr) ? wordForm(rr, ["раз", "раза", "раз"]) : "раза"} больше`;
  const pct = (r - 1) * 100;
  return pct < 1 ? "чуть больше" : `на ${Math.round(pct)}% больше`;
}
function cmpVerdict(m){
  const {nA, nB, sa, sb, metrics, mode, series} = m, out = [], total = metrics.length;
  if (sa === sb) out.push(`Ничья: по ${sa} ${wordForm(sa, ["показателю", "показателям", "показателям"])} у каждой стороны${total - sa - sb ? `, ещё ${total - sa - sb} — поровну` : ""}.`);
  else { const w = sa > sb ? nA : nB; out.push(`Победа за «${w}»: ${Math.max(sa, sb)} из ${total} показателей против ${Math.min(sa, sb)}.`); }
  const [, a, b] = metrics[0];
  if (a || b) {
    if (a === b) out.push(`Сообщений поровну — по ${fmt(a)}.`);
    else { const w = a > b ? nA : nB, l = a > b ? nB : nA, hi = Math.max(a, b), lo = Math.min(a, b); out.push(`По сообщениям «${w}» опережает «${l}» на ${fmt(hi - lo)}${lo ? ` (${cmpTimes(hi, lo)})` : ""}: ${fmt(hi)} против ${fmt(lo)}.`); }
  } else out.push("Сообщений за выбранный период нет.");
  const strengths = side => metrics.slice(1).map(([label, x, y, , , , gen]) => { const w = side ? y : x, l = side ? x : y; return {label, gen, w, l, r:l ? w / l : (w ? Infinity : 0)}; })
    .filter(s => s.w > s.l).sort((p, q) => q.r - p.r).slice(0, 3);
  [[0, nA], [1, nB]].forEach(([s, n]) => {
    const list = strengths(s); if (!list.length) return;
    out.push(`Сильные стороны «${n}»: ${list.map(x => `${x.label.toLowerCase()}${x.l ? ` (${cmpTimes(x.w, x.l)})` : ""}`).join(", ")}.`);
  });
  if (series.leadA + series.leadB > 1) {
    const unit = series.unitName;
    out.push(`${unit[0].toUpperCase() + unit.slice(1)}, где больше: «${nA}» — ${series.leadA}, «${nB}» — ${series.leadB}.`);
  }
  if (mode !== "user" && m.A.top && m.B.top) {
    out.push(m.A.top.pk === m.B.top.pk ? `Лидер в обоих случаях — ${NAMES[m.A.top.pk] || m.A.top.name}.` : `Лидеры: ${NAMES[m.A.top.pk] || m.A.top.name} (${nA}) и ${NAMES[m.B.top.pk] || m.B.top.name} (${nB}).`);
  }
  return out;
}

/* --- Графики и картинка --- */
// Гладкая линия через точки без «выбросов» за пределы данных (монотонная кубическая интерполяция).
function smoothLinePath(pts){
  const n = pts.length; if (!n) return "";
  if (n < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const x = pts.map(p => p[0]), y = pts.map(p => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i] || 1));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  let s = `M${x[0].toFixed(1)},${y[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (x[i + 1] - x[i]) / 3;
    s += `C${(x[i] + h).toFixed(1)},${(y[i] + m[i] * h).toFixed(1)} ${(x[i + 1] - h).toFixed(1)},${(y[i + 1] - m[i + 1] * h).toFixed(1)} ${x[i + 1].toFixed(1)},${y[i + 1].toFixed(1)}`;
  }
  return s;
}
let CMP_SMOOTH = false; try { CMP_SMOOTH = localStorage.getItem("chatstats.cmpSmooth.v1") === "1"; } catch (e) {}
function cmpMovAvg(arr){ return arr.map((v, i) => { if (v == null) return v; let t = 0, c = 0; for (let j = i - 1; j <= i + 1; j++) { const x = arr[j]; if (x != null) { t += x; c++; } } return Math.round(t / c); }); }
function cmpLineSvg(s, nA, nB, cA, cB){
  if (CMP_SMOOTH) s = {...s, a:cmpMovAvg(s.a), b:cmpMovAvg(s.b), title:s.title + " (сглажено)"};
  const n = s.x.length;
  if (n < 2) return note("Недостаточно данных для графика");
  const W = 900, H = 380, L = 60, R = 870, T = 64, Bt = 320;
  const vals = [...s.a, ...s.b].filter(v => v != null);
  const {max, step} = niceMax(Math.max(1, ...vals)), sx = i => L + i / (n - 1) * (R - L), sy = v => Bt - v / max * (Bt - T);
  let o = `<text x="${L}" y="32" font-size="19" fill="#e8eaf1">${escH(s.title)}</text>`;
  const legW = [nA, nB].map(t => Math.min(240, 30 + String(t).length * 10));
  let lx = R - legW[0] - legW[1];
  [[cA, nA], [cB, nB]].forEach(([c, nm], i) => { o += `<circle cx="${lx}" cy="27" r="6" fill="${c}"/><text x="${lx + 12}" y="32" font-size="17" fill="#c0c6d4">${escH(nm)}</text>`; lx += legW[i]; });
  for (let v = 0; v <= max + 1e-9; v += step) o += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.07"/><text x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" font-size="16" fill="#8a90a2" text-anchor="end">${yrShortNum(v)}</text>`;
  // Подписи оси идут через равный шаг от первого значения: шаг подбирается по ширине самой длинной подписи, чтобы текст не наезжал.
  const maxLen = s.x.reduce((m, t) => Math.max(m, String(t).length), 1), minGap = Math.max(38, maxLen * 9 + 16);
  const every = Math.max(1, Math.ceil(minGap / ((R - L) / (n - 1))));
  const ticks = []; for (let i = 0; i < n; i += every) ticks.push(i);
  ticks.forEach(i => { o += `<text x="${sx(i).toFixed(1)}" y="${Bt + 22}" font-size="15" fill="#c0c6d4" text-anchor="middle">${escH(s.x[i])}</text>`; });
  o += `<line x1="${L}" y1="${Bt}" x2="${R}" y2="${Bt}" stroke="#dcdcdc" stroke-opacity="0.6" stroke-width="2"/>`;
  const line = (arr, c, nm) => {
    const pts = arr.map((v, i) => v == null ? null : [sx(i), sy(v), v, i]).filter(Boolean);
    if (!pts.length) return "";
    return `<path class="anim-line" pathLength="1" d="${smoothLinePath(pts)}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
      (n <= 40 ? pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${c}"><title>${escH(nm)} · ${escH(s.tip(p[3]))}: ${fmt(p[2])}</title></circle>`).join("") : "");
  };
  o += line(s.b, cB, nB) + line(s.a, cA, nA);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}
function cmpWrap(text, maxChars){
  const words = String(text).split(/\s+/), lines = []; let cur = "";
  words.forEach(w => { if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
  if (cur) lines.push(cur);
  return lines;
}
const cmpFit = (t, max) => { t = String(t); return t.length > max ? t.slice(0, max - 1) + "…" : t; };
function cmpCardSvg(m, av){
  const tx = cmpThemeVar("--text", "#e8eaf1"), mu = cmpThemeVar("--muted", "#8a90a2"), ln = cmpThemeVar("--line", "#272b36");
  const W = 1000, P = 40, rowH = 58;
  let y = 0, o = "";
  // Заголовок
  y = 56; o += `<text x="${P}" y="${y}" font-size="28" font-weight="700" fill="${tx}">Сравнение</text>`;
  o += `<text x="${W - P}" y="${y}" font-size="15" fill="${mu}" text-anchor="end">${escH(cmpFit(m.scope, 70))}</text>`;
  // Герой
  y += 26; const hy = y, hh = 150;
  o += `<rect x="${P}" y="${hy}" width="${W - 2 * P}" height="${hh}" rx="18" fill="#ffffff" fill-opacity="0.035" stroke="${ln}"/>`;
  o += `<rect x="${P}" y="${hy}" width="${(W - 2 * P) / 2}" height="${hh}" rx="18" fill="url(#cmpGa)"/><rect x="${W / 2}" y="${hy}" width="${(W - 2 * P) / 2}" height="${hh}" rx="18" fill="url(#cmpGb)"/>`;
  const AVR = 36, avShift = av ? 2 * AVR + 16 : 0;
  const avDraw = (cx, a, c, n, id) => !a ? "" : `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${hy + hh / 2}" r="${AVR}"/></clipPath></defs><circle cx="${cx}" cy="${hy + hh / 2}" r="${AVR}" fill="${c}"/>` + (a.uri ? `<image href="${a.uri}" x="${cx - AVR}" y="${hy + hh / 2 - AVR}" width="${AVR * 2}" height="${AVR * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : `<text x="${cx}" y="${hy + hh / 2 + 12}" font-size="34" font-weight="700" text-anchor="middle" fill="#10131a">${escH(String(n).replace(/^[«"]/, "").slice(0, 1).toUpperCase())}</text>`) + `<circle cx="${cx}" cy="${hy + hh / 2}" r="${AVR}" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="3"/>`;
  const sideTxt = (x, n, c, s, anchor) => `<text x="${x}" y="${hy + 50}" font-size="24" font-weight="700" fill="${c}" text-anchor="${anchor}">${escH(cmpFit(n, 24))}</text><text x="${x}" y="${hy + 100}" font-size="40" font-weight="700" fill="${tx}" text-anchor="${anchor}">${fmt(s.t.msgs)}</text><text x="${x}" y="${hy + 126}" font-size="14" fill="${mu}" text-anchor="${anchor}">сообщений</text>`;
  o += sideTxt(P + 36 + avShift, m.nA, m.cA, m.A, "start") + sideTxt(W - P - 36 - avShift, m.nB, m.cB, m.B, "end");
  if (av) o += avDraw(P + 36 + AVR, av.a, m.cA, m.nA, "cmpAvA") + avDraw(W - P - 36 - AVR, av.b, m.cB, m.nB, "cmpAvB");
  o += `<text x="${W / 2}" y="${hy + 44}" font-size="15" letter-spacing="4" fill="${mu}" text-anchor="middle">VS</text>`;
  o += `<text x="${W / 2}" y="${hy + 96}" font-size="46" font-weight="700" text-anchor="middle"><tspan fill="${m.cA}">${m.sa}</tspan><tspan fill="${mu}"> : </tspan><tspan fill="${m.cB}">${m.sb}</tspan></text>`;
  o += `<text x="${W / 2}" y="${hy + 124}" font-size="13" fill="${mu}" text-anchor="middle">побед по показателям</text>`;
  y = hy + hh + 22;
  // Показатели
  const cardY = y, cardH = m.metrics.length * rowH + 16;
  o += `<rect x="${P}" y="${cardY}" width="${W - 2 * P}" height="${cardH}" rx="16" fill="#ffffff" fill-opacity="0.03" stroke="${ln}"/>`;
  const vx = 300, bx0 = 330, bx1 = 670, vx2 = 700;
  m.metrics.forEach(([label, a, b, f, subA = "", subB = ""], i) => {
    const ry = cardY + 8 + i * rowH, cy = ry + rowH / 2;
    if (i) o += `<line x1="${P + 16}" y1="${ry}" x2="${W - P - 16}" y2="${ry}" stroke="${ln}"/>`;
    const tot = a + b, pa = tot ? a / tot : .5, mid = bx0 + (bx1 - bx0) * pa;
    o += `<text x="${(bx0 + bx1) / 2}" y="${cy - 9}" font-size="13" fill="${mu}" text-anchor="middle">${escH(label)}</text>`;
    o += `<rect x="${bx0}" y="${cy + 1}" width="${bx1 - bx0}" height="10" rx="5" fill="#ffffff" fill-opacity="0.06"/>`;
    if (tot) o += `<rect x="${bx0}" y="${cy + 1}" width="${(mid - bx0).toFixed(1)}" height="10" fill="${m.cA}"/><rect x="${mid.toFixed(1)}" y="${cy + 1}" width="${(bx1 - mid).toFixed(1)}" height="10" fill="${m.cB}"/>`;
    const val = (x, v, sub, win, anchor) => `<text x="${x}" y="${cy + (sub ? 2 : 8)}" font-size="20" font-weight="${win ? 700 : 400}" fill="${win ? tx : mu}" text-anchor="${anchor}">${escH(f(v))}</text>${sub ? `<text x="${x}" y="${cy + 20}" font-size="12" fill="${mu}" text-anchor="${anchor}">${escH(cmpFit(sub, 26))}</text>` : ""}`;
    o += val(vx, a, subA, a > b, "end") + val(vx2, b, subB, b > a, "start");
  });
  // Прямоугольник со скруглением обрезает полосы
  y = cardY + cardH + 22;
  // Вывод
  const lines = m.verdict.flatMap(t => cmpWrap(t, 92).map((l, j) => ({l, first:j === 0})));
  const vh = 56 + lines.length * 26 + 8;
  o += `<rect x="${P}" y="${y}" width="${W - 2 * P}" height="${vh}" rx="16" fill="#ffffff" fill-opacity="0.03" stroke="${ln}"/>`;
  o += `<rect x="${P}" y="${y + 16}" width="4" height="22" rx="2" fill="url(#cmpAcc)"/><text x="${P + 20}" y="${y + 34}" font-size="19" font-weight="700" fill="${tx}">Вывод</text>`;
  lines.forEach((x, i) => { o += `${x.first ? `<circle cx="${P + 26}" cy="${y + 62 + i * 26}" r="3" fill="${mu}"/>` : ""}<text x="${P + 38}" y="${y + 67 + i * 26}" font-size="16" fill="${tx}">${escH(x.l)}</text>`; });
  y += vh + 30;
  const defs = `<defs><linearGradient id="cmpGa" x1="0" x2="1"><stop offset="0" stop-color="${m.cA}" stop-opacity="0.22"/><stop offset="1" stop-color="${m.cA}" stop-opacity="0"/></linearGradient><linearGradient id="cmpGb" x1="1" x2="0"><stop offset="0" stop-color="${m.cB}" stop-opacity="0.22"/><stop offset="1" stop-color="${m.cB}" stop-opacity="0"/></linearGradient><linearGradient id="cmpAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.cA}"/><stop offset="1" stop-color="${m.cB}"/></linearGradient></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y}" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${defs}${o}</svg>`;
}
async function cmpCardBlob(withAv){
  if (!cmpLast) throw new Error("Нет данных для сравнения");
  let av = null;
  if (withAv && cmpLast.mode === "user") av = {a:{uri:window.AVATAR ? await AVATAR.dataUri(cmpLast.keyA) : null}, b:{uri:window.AVATAR ? await AVATAR.dataUri(cmpLast.keyB) : null}};
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:-10000px;top:0;width:1000px;pointer-events:none";
  box.innerHTML = cmpCardSvg(cmpLast, av); document.body.appendChild(box);
  try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
}

/* --- Фильтры --- */
function cmpFiltersHtml(){
  const seg = `<div class="field"><label>Что сравниваем</label><div class="seg" id="cmp-mode">${CMP_MODES.map(([k, n]) => `<button type="button" data-cmp-mode="${k}" class="${CMP.mode === k ? "active" : ""}">${n}</button>`).join("")}</div></div>`;
  const PAIR = ["cmp-a", "cmp-b", "cmp-chA", "cmp-chB", "cmp-mA", "cmp-mB", "cmp-yA", "cmp-yB"];
  const sel = (id, label, opts, val) => `<div class="field"${PAIR.includes(id) ? " data-fr-keep" : ""}><label for="${id}">${label}</label><select id="${id}" data-cmp-f>${opts.map(([v, t]) => `<option value="${escH(v)}"${String(v) === String(val) ? " selected" : ""}>${escH(t)}</option>`).join("")}</select></div>`;
  const swap = `<div class="field" data-fr-keep><label>&nbsp;</label><button class="mini" id="cmp-swap" type="button" title="Поменять местами">⇄</button></div>`;
  const years = yrYears().slice().reverse();
  const pk = cmpPeriodKind();
  const periodField = `<div class="field"><label>Период</label><div class="seg cmp-pseg" id="cmp-pkind">${[["all", "Всё время"], ["365", "365 дней"], ["year", "Год"], ["month", "Месяц"]].map(([k, n]) => `<button type="button" data-cmp-pk="${k}" class="${pk === k ? "active" : ""}">${n}</button>`).join("")}</div></div>`
    + (pk === "year" ? sel("cmp-period", "Год", years.map(y => [y, `${y} год`]), CMP.period) : pk === "month" ? sel("cmp-period", "Месяц", cmpMonthList().map(m => [m, cmpMonthName(m)]), CMP.period) : "");
  const chatOpts = [["", "Все чаты"], ...cmpChatList().map(c => [c.t, c.t === ULT_NAME ? "⚡ " + c.t : c.t])];
  const sameBox = label => `<label class="checkline"><input type="checkbox" id="cmp-same"${CMP.same ? " checked" : ""}>${label}</label>`;
  if (CMP.mode === "user") {
    const people = Object.entries(NAMES).sort((a, b) => a[1].localeCompare(b[1], "ru"));
    return seg + sel("cmp-a", "Первый участник", people, CMP.a) + swap + sel("cmp-b", "Второй участник", people, CMP.b) + periodField + sel("cmp-chat", "Чат", chatOpts, CMP.chat);
  }
  if (CMP.mode === "chat") {
    const chats = cmpChatList().map(c => [c.t, c.t === ULT_NAME ? "⚡ " + c.t : c.t]);
    return seg + sel("cmp-chA", "Первый чат", chats, CMP.chA) + swap + sel("cmp-chB", "Второй чат", chats, CMP.chB) + periodField;
  }
  if (CMP.mode === "month") {
    const ms = cmpMonthList().map(m => [m, cmpMonthName(m)]);
    return seg + sel("cmp-mA", "Первый месяц", ms, CMP.mA) + swap + sel("cmp-mB", "Второй месяц", ms, CMP.mB) + sel("cmp-chat", "Чат", chatOpts, CMP.chat) + sameBox("Текущий месяц — по сегодняшнее число");
  }
  const ys = years.map(y => [y, `${y} год`]);
  return seg + sel("cmp-yA", "Первый год", ys, CMP.yA) + swap + sel("cmp-yB", "Второй год", ys, CMP.yB) + sel("cmp-chat", "Чат", chatOpts, CMP.chat) + sameBox("Текущий год — по сегодняшнюю дату");
}
function cmpDefaults(){
  const people = Object.entries(NAMES).sort((a, b) => a[1].localeCompare(b[1], "ru"));
  if (!NAMES[CMP.a] || !NAMES[CMP.b] || CMP.a === CMP.b) {
    const tot = new Map(); pick(allRows, "").forEach(x => { const k = String(x[F.userId]); if (NAMES[k]) tot.set(k, (tot.get(k) || 0) + (Number(g(x, "msgs")) || 0)); });
    const ranked = [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    if (!NAMES[CMP.a]) CMP.a = ranked[0] || people[0]?.[0] || "";
    if (!NAMES[CMP.b] || CMP.b === CMP.a) CMP.b = ranked.find(k => k !== CMP.a) || people.find(([k]) => k !== CMP.a)?.[0] || "";
  }
  const chats = cmpChatList().map(c => c.t);
  if (!chats.includes(CMP.chA)) CMP.chA = chats[0] || "";
  if (!chats.includes(CMP.chB) || CMP.chB === CMP.chA) CMP.chB = chats.find(c => c !== CMP.chA) || "";
  if (CMP.chat && !chats.includes(CMP.chat)) CMP.chat = "";
  const ms = cmpMonthList();
  if (!ms.includes(CMP.mA)) CMP.mA = ms[0] || "";
  if (!ms.includes(CMP.mB) || CMP.mB === CMP.mA) CMP.mB = ms.find(m => m !== CMP.mA) || "";
  const ys = yrYears().slice().reverse();
  if (!ys.includes(CMP.yA)) CMP.yA = ys[0] || "";
  if (!ys.includes(CMP.yB) || CMP.yB === CMP.yA) CMP.yB = ys.find(y => y !== CMP.yA) || "";
  if (!["all", "365", ...ys, ...ms].includes(CMP.period)) CMP.period = "all";
}
async function loadCompare(){
  const out = $("cmp-out");
  if (!allRows) out.innerHTML = `<div class="sk sk-poster" style="height:220px"></div>` + skPage(0, 2);
  try { await getHistory(); } catch (e) { out.innerHTML = `<div class="s-empty">Не удалось загрузить данные: ${escH(e.message)}</div>`; return; }
  cmpDefaults(); cmpSave(); renderCompare();
}
function cmpReady(){
  if (CMP.mode === "user") return CMP.a && CMP.b;
  if (CMP.mode === "chat") return CMP.chA && CMP.chB;
  if (CMP.mode === "month") return CMP.mA && CMP.mB;
  return CMP.yA && CMP.yB;
}
function renderCompare(){
  if (!allRows) return;
  $("cmp-filters").innerHTML = cmpFiltersHtml();
  window.__filterDrawer?.rekeep("cmp-filters");
  if (!cmpReady()) { $("cmp-out").innerHTML = `<div class="s-empty">Недостаточно данных: для сравнения нужны два разных варианта.</div>`; cmpLast = null; return; }
  const m = cmpModel(); cmpLast = m;
  const {A, B, nA, nB, cA, cB, metrics, sa, sb} = m;
  const rowsHtml = metrics.map(([label, a, b, f, subA = "", subB = ""]) => {
    const tot = a + b, pa = tot ? a / tot * 100 : 50;
    return `<div class="cmp-row"><div class="cmp-v a${a > b ? " win" : ""}">${f(a)}${subA ? `<small>${escH(subA)}</small>` : ""}</div><div class="cmp-mid"><div class="cmp-label">${escH(label)}</div><div class="cmp-bar"><i class="anim-bar-x" style="width:${pa.toFixed(1)}%;background:${cA}"></i><i style="width:${(100 - pa).toFixed(1)}%;background:${cB}"></i></div></div><div class="cmp-v b${b > a ? " win" : ""}">${f(b)}${subB ? `<small>${escH(subB)}</small>` : ""}</div></div>`;
  }).join("");
  const sideSub = m.mode === "user" || m.mode === "chat" ? `сообщений ${cmpPeriodLabel()}` : "сообщений";
  const side = (key, n, c, s, cls) => `<div class="cmp-side ${cls}" style="--c:${c}"><div class="p-avatar" style="--p-color:${c}${m.mode === "month" ? ";font-size:15px" : ""}">${m.mode === "user" && window.AVATAR && AVATAR.get(key) ? AVATAR.inner(key, String(n).replace(/^[«"]/, "").slice(0, 1).toUpperCase()) : escH(m.mode === "year" ? "’" + String(key).slice(2) : m.mode === "month" ? MONTHS_SHORT_RU[+String(key).slice(5) - 1].replace(/^./, ch => ch.toUpperCase()) : String(n).replace(/^[«"]/, "").slice(0, 1).toUpperCase())}</div><div class="cmp-name${m.mode === "user" ? " pname" : ""}"${m.mode === "user" ? ` data-open-profile="${escH(key)}"` : ""}>${escH(n)}</div><div class="cmp-total">${fmt(s.t.msgs)}</div><div class="cmp-sub">${sideSub}</div></div>`;
  const t = m.table;
  const nameCell = r => t.people ? `<span class="pname" data-open-profile="${escH(r[0])}">${escH(r[3])}</span>` : escH(r[0]);
  const tableHtml = t.rows.length ? `<div class="section-head"><h2>${t.title}</h2><button class="mini copy-btn" type="button" id="cmp-chats-copy">Копировать</button><span class="hint" id="cmp-chats-msg"></span></div>
    <div class="wrap"><table id="cmp-chats-table"><thead><tr><th style="text-align:left">${t.head}</th><th style="color:${cA}">${escH(nA)}</th><th style="color:${cB}">${escH(nB)}</th><th>Разница</th><th style="text-align:left">Впереди</th></tr></thead><tbody>${t.rows.map(r => { const [, a, b] = r; return `<tr><td style="text-align:left">${nameCell(r)}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td>${fmt(Math.abs(a - b))}</td><td style="text-align:left;color:${a === b ? "var(--muted)" : a > b ? cA : cB}">${a === b ? "поровну" : escH(a > b ? nA : nB)}</td></tr>`; }).join("")}</tbody></table></div>` : "";
  $("cmp-out").innerHTML = `<div class="section-head cmp-copy-head"><span class="hint">${escH(m.scope)}</span><button class="mini copy-btn" type="button" id="cmp-card-copy">Копировать</button>${m.mode === "user" ? '<button class="mini copy-btn" type="button" id="cmp-card-copy-av">С аватарками</button>' : ""}<span class="hint" id="cmp-card-msg"></span></div>
    <div class="cmp-hero">${side(m.keyA, nA, cA, A, sa > sb ? "a win" : "a")}<div class="cmp-vs"><span>VS</span><div class="cmp-score"><b style="color:${cA}">${sa}</b> : <b style="color:${cB}">${sb}</b></div><div class="cmp-sub">побед по показателям</div></div>${side(m.keyB, nB, cB, B, sb > sa ? "b win" : "b")}</div>
    <div class="cmp-duels">${rowsHtml}</div>
    <div class="cmp-verdict" style="--ca:${cA};--cb:${cB}"><h3>Вывод</h3><ul>${m.verdict.map(v => `<li>${escH(v)}</li>`).join("")}</ul></div>
    <div class="section-head"><h2>${escH(m.series.title)}</h2><span class="hint">${escH(m.series.unitName[0].toUpperCase() + m.series.unitName.slice(1))} впереди: ${escH(nA)} — ${m.series.leadA}, ${escH(nB)} — ${m.series.leadB}</span><label class="checkline" title="Скользящее среднее по трём точкам"><input type="checkbox" id="cmp-smooth"${CMP_SMOOTH ? " checked" : ""}>Сгладить</label><button class="mini copy-btn" type="button" id="cmp-chart-copy">Копировать</button><span class="hint" id="cmp-chart-msg"></span></div>
    <div class="yr-chart-card"><div class="yr-chart" id="cmp-chart">${cmpLineSvg(m.series, nA, nB, cA, cB)}</div></div>
    ${tableHtml}`;
}
$("cmp-out").addEventListener("click", e => {
  if (e.target.closest("#cmp-card-copy-av")) copyPngToStatus(() => cmpCardBlob(true), $("cmp-card-msg"), "Сравнение с аватарками скопировано");
  else if (e.target.closest("#cmp-card-copy")) copyPngToStatus(() => cmpCardBlob(), $("cmp-card-msg"), "Сравнение скопировано");
  else if (e.target.closest("#cmp-chart-copy")) copyPngToStatus(() => svgToPngBlob($("cmp-chart").querySelector("svg"), YR_EXPORT), $("cmp-chart-msg"), "График скопирован");
  else if (e.target.closest("#cmp-chats-copy") && cmpLast) copyTableImage("cmp-chats-table", `${cmpLast.title}: ${cmpLast.table.title.toLowerCase()} · ${cmpLast.scope}`, "cmp-chats-msg");
});
const CMP_FIELD = {"cmp-a":"a", "cmp-b":"b", "cmp-period":"period", "cmp-chat":"chat", "cmp-chA":"chA", "cmp-chB":"chB", "cmp-mA":"mA", "cmp-mB":"mB", "cmp-yA":"yA", "cmp-yB":"yB"};
function cmpFromFilters(e){ return e.target.closest && e.target.closest('#cmp-filters, .fr-keep[data-for="cmp-filters"]'); }
document.addEventListener("change", e => {
  if (!cmpFromFilters(e)) return;
  const t = e.target;
  if (t.id === "cmp-smooth") { CMP_SMOOTH = t.checked; try { localStorage.setItem("chatstats.cmpSmooth.v1", CMP_SMOOTH ? "1" : "0"); } catch (err) {} renderCompare(); return; }
  if (t.id === "cmp-same") CMP.same = t.checked;
  else if (CMP_FIELD[t.id]) CMP[CMP_FIELD[t.id]] = t.value;
  else return;
  cmpSave(); renderCompare();
});
document.addEventListener("click", e => {
  if (!cmpFromFilters(e)) return;
  const pb = e.target.closest("[data-cmp-pk]");
  if (pb) { const k = pb.dataset.cmpPk, cur = cmpPeriodKind(); if (k !== cur) { CMP.period = k === "year" ? (yrYears().slice(-1)[0] || "all") : k === "month" ? (cmpMonthList()[0] || "all") : k; cmpSave(); renderCompare(); } return; }
  const mb = e.target.closest("[data-cmp-mode]");
  if (mb) { CMP.mode = mb.dataset.cmpMode; cmpDefaults(); cmpSave(); renderCompare(); return; }
  if (e.target.closest("#cmp-swap")) {
    const pairs = {user:["a", "b"], chat:["chA", "chB"], month:["mA", "mB"], year:["yA", "yB"]}[CMP.mode];
    [CMP[pairs[0]], CMP[pairs[1]]] = [CMP[pairs[1]], CMP[pairs[0]]];
    cmpSave(); renderCompare();
  }
});

/* ===================== Визуализация вкладки «Время» ===================== */
const TM_FONT = `font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif"`;
function tmTheme(){ return {tx:cmpThemeVar("--text", "#e8eaf1"), mu:cmpThemeVar("--muted", "#8a90a2"), ln:cmpThemeVar("--line", "#272b36"), acc:cmpThemeVar("--accent", "#7aa2f7"), acc2:cmpThemeVar("--accent-2", "#bb9af7")}; }
const tmYears = d => d / 365.2425;
// Лента участия: полоса от даты прихода до сегодня.
function tmGanttSvg(list){
  const th = tmTheme(), rowsS = [...list].sort((a, b) => a.start - b.start || a.name.localeCompare(b.name, "ru"));
  const W = 1000, L = 190, R = 880, T = 74, rh = 30, n = rowsS.length, H = T + n * rh + 38;
  const today = todayUtc(), y0 = rowsS[0].start.getUTCFullYear(), t0 = Date.UTC(y0, 0, 1), t1 = today.getTime();
  const sx = t => L + (t - t0) / (t1 - t0) * (R - L);
  let o = `<text x="24" y="34" font-size="20" font-weight="700" fill="${th.tx}">Лента участия</text><text x="24" y="56" font-size="16" fill="${th.mu}">От даты прихода до сегодня · всего ${n} ${wordForm(n, ["участник", "участника", "участников"])}</text>`;
  for (let y = y0; y <= today.getUTCFullYear(); y++) {
    const x = sx(Date.UTC(y, 0, 1));
    o += `<line x1="${x.toFixed(1)}" y1="${T - 6}" x2="${x.toFixed(1)}" y2="${H - 26}" stroke="${th.ln}"/><text x="${(x + 4).toFixed(1)}" y="${H - 10}" font-size="15" fill="${th.mu}">${y}</text>`;
  }
  rowsS.forEach((m, i) => {
    const y = T + i * rh, c = getStyle("u", m.id).c[0], x0 = sx(m.start.getTime());
    o += `<text x="${L - 10}" y="${y + 20}" font-size="16" fill="${th.tx}" text-anchor="end">${escH(cmpFit(m.name, 20))}</text>`;
    o += `<rect class="anim-bar-x" x="${x0.toFixed(1)}" y="${y + 7}" width="${Math.max(3, R - x0).toFixed(1)}" height="17" rx="8.5" fill="${c}" fill-opacity="0.85"><title>${escH(m.name)}: с ${formatDateRu(m.start)}, ${fmt(m.days)} ${wordForm(m.days, ["день", "дня", "дней"])} (${durationText(m.parts)})</title></rect>`;
    o += `<text x="${R + 8}" y="${y + 20}" font-size="15" fill="${th.mu}">${fmt(m.days)} дн.</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" ${TM_FONT}>${o}</svg>`;
}
// Сколько нынешних участников пришло в каждом году + рост состава.
function tmJoinsSvg(list){
  const th = tmTheme(), cur = todayUtc().getUTCFullYear(), y0 = Math.min(...list.map(m => m.start.getUTCFullYear()));
  const years = []; for (let y = y0; y <= cur; y++) years.push(y);
  const cnt = years.map(y => list.filter(m => m.start.getUTCFullYear() === y).length);
  let acc = 0; const cum = cnt.map(v => acc += v);
  const W = 620, H = 410, L = 44, R = 590, T = 116, B = 350, n = years.length, bw = Math.min(40, (R - L) / n * .62);
  const {max, step} = niceMax(Math.max(1, ...cnt)), cmax = Math.max(1, acc);
  const sx = i => L + (i + .5) * (R - L) / n, sy = v => B - v / max * (B - T), sc = v => B - v / cmax * (B - T);
  let o = `<text x="24" y="34" font-size="20" font-weight="700" fill="${th.tx}">Когда пришли</text><text x="24" y="56" font-size="16" fill="${th.mu}">Нынешние участники по году прихода</text>`;
  for (let v = 0; v <= max + 1e-9; v += step) o += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.07"/><text x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" font-size="15" fill="${th.mu}" text-anchor="end">${fmt(v)}</text>`;
  years.forEach((y, i) => {
    const h = B - sy(cnt[i]), names = list.filter(m => m.start.getUTCFullYear() === y).map(m => m.name).join(", ");
    o += `<rect class="anim-bar-y" x="${(sx(i) - bw / 2).toFixed(1)}" y="${sy(cnt[i]).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="6" fill="${yearHue(y)}"><title>${y}: ${cnt[i]} ${wordForm(cnt[i], ["участник", "участника", "участников"])}${names ? " — " + escH(names) : ""}</title></rect>`;
    if (cnt[i]) o += `<text x="${sx(i).toFixed(1)}" y="${(sy(cnt[i]) - 8).toFixed(1)}" font-size="17" font-weight="700" fill="${th.tx}" text-anchor="middle">${cnt[i]}</text>`;
    o += `<text x="${sx(i).toFixed(1)}" y="${B + 22}" font-size="15" fill="${th.mu}" text-anchor="middle">${n > 9 ? "’" + String(y).slice(2) : y}</text>`;
  });
  o += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-opacity="0.5" stroke-width="2"/>`;
  o += `<polyline class="anim-line" pathLength="1" points="${cum.map((v, i) => `${sx(i).toFixed(1)},${sc(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${th.acc}" stroke-width="2.5" stroke-dasharray="0" stroke-linejoin="round"/>`;
  o += cum.map((v, i) => `<circle cx="${sx(i).toFixed(1)}" cy="${sc(v).toFixed(1)}" r="3.5" fill="${th.acc}"><title>К концу ${years[i]}: ${v}</title></circle>`).join("");
  o += `<text x="${(sx(n - 1) + 8).toFixed(1)}" y="${(sc(acc) + 4).toFixed(1)}" font-size="16" fill="${th.acc}">${acc}</text>`;
  o += `<rect x="24" y="68" width="12" height="12" rx="3" fill="${yearHue(cur)}"/><text x="42" y="79" font-size="15" fill="${th.mu}">пришли за год</text><circle cx="150" cy="74" r="5" fill="${th.acc}"/><text x="160" y="79" font-size="15" fill="${th.mu}">состав нарастающим итогом</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" ${TM_FONT}>${o}</svg>`;
}
// Распределение по стажу.
const TM_BUCKETS = [["до 1 года", 0, 1], ["1–2 года", 1, 2], ["2–4 года", 2, 4], ["4–6 лет", 4, 6], ["6–8 лет", 6, 8], ["8–10 лет", 8, 10], ["10+ лет", 10, 99]];
function tmTenureSvg(list){
  const th = tmTheme(), W = 620, L = 100, R = 540, T = 80, rh = 38;
  const b = TM_BUCKETS.map(([n, lo, hi]) => ({n, list:list.filter(m => tmYears(m.days) >= lo && tmYears(m.days) < hi)}));
  const max = Math.max(1, ...b.map(x => x.list.length)), H = T + b.length * rh + 80;
  const days = list.map(m => m.days).sort((a, c) => a - c), med = days.length ? (days.length % 2 ? days[days.length >> 1] : (days[days.length / 2 - 1] + days[days.length / 2]) / 2) : 0;
  const avgD = days.length ? days.reduce((s, v) => s + v, 0) / days.length : 0;
  let o = `<text x="24" y="34" font-size="20" font-weight="700" fill="${th.tx}">Стаж участников</text><text x="24" y="56" font-size="16" fill="${th.mu}">Сколько человек в каждой группе по сроку участия</text>`;
  b.forEach((x, i) => {
    const y = T + i * rh, w = x.list.length / max * (R - L), t = i / Math.max(1, b.length - 1);
    const c = pbMix(th.acc, th.acc2, t);
    o += `<text x="${L - 12}" y="${y + 21}" font-size="17" fill="${th.tx}" text-anchor="end">${x.n}</text><rect x="${L}" y="${y + 6}" width="${R - L}" height="20" rx="10" fill="#ffffff" fill-opacity="0.05"/>`;
    if (x.list.length) o += `<rect class="anim-bar-x" x="${L}" y="${y + 6}" width="${Math.max(20, w).toFixed(1)}" height="20" rx="10" fill="${c}"><title>${x.n}: ${escH(x.list.map(m => m.name).join(", "))}</title></rect>`;
    o += `<text x="${R + 14}" y="${y + 21}" font-size="17" font-weight="700" fill="${x.list.length ? th.tx : th.mu}">${x.list.length}</text>`;
  });
  const fy = T + b.length * rh + 34;
  o += `<text x="24" y="${fy}" font-size="17" fill="${th.mu}">Медиана: <tspan fill="${th.tx}" font-weight="700">${fmt(Math.round(med))} дн.</tspan> (≈ ${fmtR(tmYears(med))} г.) · в среднем: <tspan fill="${th.tx}" font-weight="700">${fmt(Math.round(avgD))} дн.</tspan></text><text x="24" y="${fy + 24}" font-size="17" fill="${th.mu}">Суммарный стаж всех участников: <tspan fill="${th.tx}" font-weight="700">${fmt(days.reduce((s, v) => s + v, 0))} дн.</tspan> (≈ ${fmtR(tmYears(days.reduce((s, v) => s + v, 0)))} лет)</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" ${TM_FONT}>${o}</svg>`;
}
// Ближайшие юбилеи на шкале 90 дней.
function tmUpcomingSvg(list){
  const th = tmTheme(), HORIZON = 90;
  const ev = list.flatMap(memberMilestones).filter(e => e.left <= HORIZON).sort((a, b) => a.left - b.left);
  const W = 1000, L = 40, R = 960, AX = 120;
  const sx = d => L + d / HORIZON * (R - L);
  // Раскладка подписей по уровням, чтобы не налезали.
  const tail = e => `${e.label} · ${e.left ? `через ${e.left} дн.` : "сегодня"}`;
  const levels = []; const placed = ev.map(e => {
    const x = sx(e.left), w = Math.max(e.name.length * 9.5, tail(e).length * 8) + 18, end = x > R - 260;
    const a = end ? x - w : x - 4, z = end ? x + 4 : x + w;
    let lv = 0; while (levels[lv] != null && levels[lv] > a) lv++; levels[lv] = z; return {e, x, lv};
  });
  const nl = Math.max(1, levels.length), H = AX + nl * 50 + 34;
  let o = `<text x="24" y="34" font-size="20" font-weight="700" fill="${th.tx}">Юбилеи на ближайшие ${HORIZON} дней</text><text x="24" y="56" font-size="16" fill="${th.mu}">${ev.length ? `${ev.length} ${wordForm(ev.length, ["событие", "события", "событий"])}` : "В ближайшие три месяца юбилеев нет"}</text>`;
  o += `<line x1="${L}" y1="${AX}" x2="${R}" y2="${AX}" stroke="${th.ln}" stroke-width="3" stroke-linecap="round"/>`;
  const today = todayUtc();
  for (let d = 0; d <= HORIZON; d += 15) { const dt = addDaysUtc(today, d); o += `<line x1="${sx(d).toFixed(1)}" y1="${AX - 6}" x2="${sx(d).toFixed(1)}" y2="${AX + 6}" stroke="${th.mu}"/><text x="${sx(d).toFixed(1)}" y="${AX - 14}" font-size="14" fill="${th.mu}" text-anchor="middle">${d ? `${pad(dt.getUTCDate())}.${pad(dt.getUTCMonth() + 1)}` : "сегодня"}</text>`; }
  const halo = `paint-order="stroke" stroke="${cmpThemeVar("--panel", "#171a22")}" stroke-width="6" stroke-linejoin="round"`;
  placed.forEach(({e, x, lv}) => { const c = /год/.test(e.label) ? th.acc2 : th.acc, y = AX + 32 + lv * 50; o += `<line x1="${x.toFixed(1)}" y1="${AX}" x2="${x.toFixed(1)}" y2="${y - 12}" stroke="${c}" stroke-opacity="0.35" stroke-dasharray="3 3"/>`; });
  placed.forEach(({e, x, lv}) => {
    const c = /год/.test(e.label) ? th.acc2 : th.acc, y = AX + 32 + lv * 50;
    o += `<circle cx="${x.toFixed(1)}" cy="${AX}" r="6" fill="${c}"><title>${escH(e.name)} — ${escH(e.label)}, ${formatDateRu(e.date)}</title></circle><circle cx="${x.toFixed(1)}" cy="${y - 12}" r="2.5" fill="${c}"/>`;
    const anchor = x > R - 260 ? "end" : "start", tx2 = anchor === "end" ? x + 4 : x - 4;
    o += `<text ${halo} x="${tx2.toFixed(1)}" y="${y}" font-size="16" font-weight="700" fill="${th.tx}" text-anchor="${anchor}">${escH(e.name)}</text><text ${halo} x="${tx2.toFixed(1)}" y="${y + 17}" font-size="14" fill="${th.mu}" text-anchor="${anchor}">${escH(tail(e))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" ${TM_FONT}>${o}</svg>`;
}
function renderTimeCharts(){
  const box = $("time-charts"); if (!box || !membershipRows) return;
  if (!membershipRows.length) { box.innerHTML = ""; return; }
  const card = (id, svg, wide) => `<div class="yr-chart-card${wide ? " tm-wide" : ""}"><div class="yr-chart" id="${id}">${svg}</div><div class="pbtn"><button class="mini copy-btn" type="button" data-tm-svg="${id}">Копировать</button><span class="hint" id="${id}-msg"></span></div></div>`;
  box.innerHTML = card("tm-gantt", tmGanttSvg(membershipRows), true) + card("tm-joins", tmJoinsSvg(membershipRows)) + card("tm-tenure", tmTenureSvg(membershipRows)) + card("tm-upcoming", tmUpcomingSvg(membershipRows), true);
}
$("time-charts").addEventListener("click", e => {
  const b = e.target.closest("[data-tm-svg]"); if (!b) return;
  copyPngToStatus(() => svgToPngBlob($(b.dataset.tmSvg).querySelector("svg"), cmpExportPrefs()), $(b.dataset.tmSvg + "-msg"), "График скопирован");
});

/* ===================== Мобильная навигация ===================== */
const NAV_MAIN = ["hub", "profile", "stats", "charts"];
(function(){
  const nav = document.querySelector("nav");
  nav.querySelectorAll("button[data-tab]").forEach(b => { if (!NAV_MAIN.includes(b.dataset.tab)) b.classList.add("nav-secondary"); });
  const more = document.createElement("button");
  more.type = "button"; more.className = "nav-more-btn"; more.textContent = "Ещё"; more.setAttribute("aria-haspopup", "true");
  nav.appendChild(more);
  const sheet = document.createElement("div");
  sheet.className = "nav-sheet"; sheet.hidden = true; document.body.appendChild(sheet);
  const fill = () => { sheet.innerHTML = [...nav.querySelectorAll("button.nav-secondary:not(.nav-hidden)")].map(b => `<button type="button" data-go="${b.dataset.tab}" class="${b.classList.contains("active") ? "active" : ""}">${escH(b.textContent)}</button>`).join(""); };
  const sync = () => more.classList.toggle("active", Boolean(nav.querySelector("button.nav-secondary.active")));
  more.addEventListener("click", e => { e.stopPropagation(); fill(); sheet.hidden = !sheet.hidden; });
  sheet.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (!b) return; nav.querySelector(`button[data-tab="${b.dataset.go}"]`).click(); sheet.hidden = true; });
  document.addEventListener("click", e => { if (!sheet.hidden && !sheet.contains(e.target) && e.target !== more) sheet.hidden = true; });
  nav.addEventListener("click", () => setTimeout(sync));
  sync();
})();

/* ===================== Запоминание места: адрес страницы и настройки вида ===================== */
const UI_KEY = "chatstats.ui.v1";
let routeApplying = false, routeLastTab = "";
const currentTab = () => document.querySelector("nav button.active[data-tab]")?.dataset.tab || "participants";
function routeParam(t){
  if (t === "profile") return person.value;
  if (t === "marathons") return mrSelected;
  if (t === "yearreview") return YR.year;
  if (t === "settings") return window.__settingsPane ? window.__settingsPane.get() : (window.__pendingSettingsPane || "");
  if (t === "compare") { if (CMP.mode === "user") return CMP.a && CMP.b ? `${CMP.a}-${CMP.b}` : ""; const pr = {chat:["chA", "chB"], month:["mA", "mB"], year:["yA", "yB"]}[CMP.mode]; return CMP[pr[0]] && CMP[pr[1]] ? `${CMP.mode}~${CMP[pr[0]]}~${CMP[pr[1]]}` : CMP.mode; }
  return "";
}
function uiState(){ return {mode, month:$("month").value, year:$("year").value, cType:$("c-type").value, metric:$("metric").value, entity:chartEntity}; }
function updateRoute(){
  if (routeApplying) return;
  const t = currentTab(), p = routeParam(t), h = `#${t}${p ? "/" + encodeURIComponent(p) : ""}`;
  if (location.hash !== h) { if (routeLastTab && routeLastTab !== t) history.pushState(null, "", h); else history.replaceState(null, "", h); }
  routeLastTab = t;
  try { localStorage.setItem(UI_KEY, JSON.stringify({...uiState(), hash:h})); } catch (e) {}
}
function applyRoute(hash){
  const [tab, raw = ""] = String(hash || "").replace(/^#/, "").split("/"), p = decodeURIComponent(raw);
  const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
  if (!btn) return false;
  routeApplying = true;
  if (tab === "profile" && p && [...person.options].some(o => o.value === p)) { person.value = p; person.dataset.init = "1"; }
  if (tab === "marathons" && p) mrSelected = p;
  if (tab === "yearreview" && /^\d{4}$/.test(p)) YR.year = p;
  if (tab === "compare" && /^\d+-\d+$/.test(p)) { CMP.mode = "user"; [CMP.a, CMP.b] = p.split("-"); }
  else if (tab === "compare" && /^(chat|month|year)(~|$)/.test(p)) { const [md, x, y] = p.split("~"), pr = {chat:["chA", "chB"], month:["mA", "mB"], year:["yA", "yB"]}[md]; CMP.mode = md; if (x && y) { CMP[pr[0]] = x; CMP[pr[1]] = y; } }
  btn.click();
  if (tab === "settings") { if (window.__settingsPane) { if (p) window.__settingsPane.open(p); else window.__settingsPane.close(); } else window.__pendingSettingsPane = p || ""; }
  routeApplying = false;
  routeLastTab = tab;
  updateRoute();
  return true;
}
document.querySelectorAll("nav button[data-tab]").forEach(b => b.addEventListener("click", () => setTimeout(updateRoute)));
[["person", "change"], ["mr-select", "change"], ["yr-year", "change"], ["c-type", "change"], ["metric", "change"], ["month", "change"], ["year", "change"]].forEach(([id, ev]) => $(id)?.addEventListener(ev, () => setTimeout(updateRoute)));
document.querySelectorAll("#mode button, #c-entity button").forEach(b => b.addEventListener("click", () => setTimeout(updateRoute)));
window.addEventListener("hashchange", () => { if (location.hash.slice(1).split("/")[0] !== currentTab() || routeParam(currentTab()) !== decodeURIComponent(location.hash.split("/")[1] || "")) applyRoute(location.hash); });
(function restoreUi(){
  let saved = null; try { saved = JSON.parse(localStorage.getItem(UI_KEY) || "null"); } catch (e) {}
  if (saved) {
    if (saved.cType && [...$("c-type").options].some(o => o.value === saved.cType)) { $("c-type").value = saved.cType; cType = saved.cType; applyChartAppearance(cType); }
    if (saved.metric && [...$("metric").options].some(o => o.value === saved.metric)) $("metric").value = saved.metric;
    if (saved.entity === "chats") document.querySelector('#c-entity button[data-entity="chats"]')?.click();
    if (saved.month) $("month").value = saved.month;
    if (saved.year) $("year").value = saved.year;
    if (saved.mode && saved.mode !== "day") document.querySelector(`#mode button[data-m="${saved.mode}"]`)?.click();
  }
  if (!applyRoute(location.hash) && !(saved?.hash && applyRoute(saved.hash))) { const hb = document.querySelector('nav button[data-tab="hub"]'); if (hb) hb.click(); }
})();
renderCacheInfo();


/* ===================== Сгруппированные вкладки: «Профиль» (+ Достижения) и «Другое» ===================== */
const TAB_GROUPS = {profile:["profile", "achievements"], other:["records", "months", "days", "forecast", "marathons", "time", "yearreview", "chronicle", "birthdays", "usermap", "vk"]};
const GROUP_KEY = "chatstats.tabGroups.v1";
(function(){
  const nav = document.querySelector("nav");
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(GROUP_KEY) || "{}") || {}; } catch (e) {}
  const groupBtn = g => nav.querySelector(`button[data-group="${g}"]`);
  const groupOf = tab => Object.keys(TAB_GROUPS).find(g => TAB_GROUPS[g].includes(tab));
  Object.entries(TAB_GROUPS).forEach(([g, tabs]) => { const b = groupBtn(g); if (b && tabs.includes(saved[g])) b.dataset.tab = saved[g]; });
  const go = tab => {
    const g = groupOf(tab), b = g && groupBtn(g); if (!b) return;
    b.dataset.tab = tab; saved[g] = tab; try { localStorage.setItem(GROUP_KEY, JSON.stringify(saved)); } catch (e) {}
    b.click();
  };
  // Скрытые кнопки разделов (переход по адресу, «Ещё» на телефоне) открывают раздел через кнопку группы.
  nav.querySelectorAll("button.nav-hidden[data-tab]").forEach(b => { b.onclick = () => go(b.dataset.tab); });
  document.addEventListener("click", e => { const s = e.target.closest?.("[data-gtab]"); if (s) { e.preventDefault(); go(s.dataset.gtab); } });
  const sync = () => {
    const sec = document.querySelector(".tab.active"); const tab = sec?.id?.replace(/^tab-/, "");
    const g = groupOf(tab); if (!g) return;
    const b = groupBtn(g); b.dataset.tab = tab;
    nav.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
  };
  nav.addEventListener("click", () => setTimeout(sync));
  sync();
  try { updateRoute(); } catch (e) {}
})();

/* ===================== Подсветка линии при наведении на подпись ===================== */
document.addEventListener("mouseover", e => {
  const it = e.target.closest?.("svg [data-name]"); if (!it) return;
  const svg = it.closest("svg"), name = it.dataset.name;
  if (!svg.querySelector("[data-n]")) return;
  svg.classList.add("dimming");
  svg.querySelectorAll("[data-n]").forEach(x => x.classList.toggle("hl", x.dataset.n === name));
});
document.addEventListener("mouseout", e => {
  const it = e.target.closest?.("svg [data-name]"); if (!it) return;
  if (e.relatedTarget && it.contains(e.relatedTarget)) return;
  const svg = it.closest("svg"); svg.classList.remove("dimming"); svg.querySelectorAll(".hl").forEach(x => x.classList.remove("hl"));
});

/* ===================== Нормированный режим: всего / на активный день / доля ===================== */
const NORM_KEY = "chatstats.norm.v1";
var NORM = "abs";
try { const v = localStorage.getItem(NORM_KEY); if (["abs", "day", "share"].includes(v)) NORM = v; } catch (e) {}
function r1(v){ return Math.round(v * 10) / 10; }
function normSuffix(){ return NORM === "day" ? " · на активный день" : NORM === "share" ? " · доля, %" : ""; }
function fmtN(v){ return fmt(NORM === "day" || NORM === "share" ? r1(v) : v) + (NORM === "share" ? "%" : ""); }
function normMap(map){
  if ((NORM !== "day" && NORM !== "share") || !map) return map;
  const keys = ["msgs", "stick", "voice", "video", ...RX_KEYS], tot = {};
  keys.forEach(k => tot[k] = [...map.values()].reduce((s2, u) => s2 + (Number(u[k]) || 0), 0));
  const out = new Map();
  map.forEach((u, id) => {
    const c = {...u}, days = Math.max(1, u.days ? u.days.size : 1);
    keys.forEach(k => { const v = Number(u[k]) || 0; c[k] = NORM === "day" ? r1(v / days) : (tot[k] ? r1(v / tot[k] * 100) : 0); });
    out.set(id, c);
  });
  return out;
}
function syncNormSeg(){ document.querySelectorAll("#norm-seg button").forEach(b => b.classList.toggle("active", b.dataset.norm === NORM)); }
document.addEventListener("click", e => {
  const b = e.target.closest?.("#norm-seg [data-norm]"); if (!b) return;
  NORM = b.dataset.norm; try { localStorage.setItem(NORM_KEY, NORM); } catch (err) {}
  syncNormSeg();
  try { render(); } catch (err) {}
  try { if ($("tab-chats").classList.contains("active")) renderChatRank(); } catch (err) {}
});
// Значения для столбцов графика «Столбцы» в нормированном режиме.
function normChartList(list, metric){
  if (NORM !== "day" && NORM !== "share") return list;
  if (NORM === "share") { const tot = list.reduce((s2, u) => s2 + u.v, 0); return list.map(u => ({...u, v:tot ? r1(u.v / tot * 100) : 0})).sort((a, b) => b.v - a.v); }
  const src = chartEntity === "chats" ? chartChatRows(cRows()) : cScoped(), days = new Map();
  src.forEach(x => {
    if (!(Number(g(x, metric)) > 0)) return;
    const k = chartEntity === "chats" ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    let s2 = days.get(k); if (!s2) { s2 = new Set(); days.set(k, s2); } s2.add(String(x[F.date] ?? "").slice(0, 10));
  });
  return list.map(u => ({...u, v:r1(u.v / Math.max(1, days.get(String(u.k))?.size || 1))})).sort((a, b) => b.v - a.v);
}

/* Строки «Среднее» и «Медиана» в итогах таблиц убраны (2026.10.30) */
function statRows(){ return ""; }

/* ===================== Гонка ===================== */
var RACE = null, raceRaf = 0, raceSpeed = 1;
try { raceSpeed = Number(localStorage.getItem("chatstats.raceSpeed.v1")) || 1; } catch (e) {}
function raceData(){
  if (cMode() === "day") return {err:"Для гонки выберите период: неделя, месяц, год или все данные"};
  const src = chartEntity === "chats" ? chartChatRows(cRows()) : cScoped();
  const r = cRange(); if (!r) return {err:"Выберите период"};
  const today = iso(new Date());
  let from = r[0]; const to = r[1] < today ? r[1] : today;
  if (cMode() === "all" || from < "1990-01-01") { const ds = src.map(x => String(x[F.date] ?? "").slice(0, 10)).filter(d => d.length === 10).sort(); if (!ds.length) return {err:"Нет данных"}; from = ds[0]; }
  const N = dayIdx(to) - dayIdx(from) + 1;
  if (N < 2) return {err:"Слишком короткий период для гонки"};
  const step = N <= 120 ? 1 : N <= 900 ? 7 : 30, FR = Math.ceil(N / step);
  const metric = $("metric").value, per = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > to) return;
    const k = chartEntity === "chats" ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    if (chartEntity === "users" && (!isVisibleUser(k) || (SEL_ACTIVE && !SEL.has(k)))) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    let e = per.get(k); if (!e) { e = {k, n:chartEntity === "chats" ? String(x[F.chat] || `Чат ${k}`) : who(x), a:new Float64Array(FR)}; per.set(k, e); }
    e.a[Math.floor((dayIdx(d) - dayIdx(from)) / step)] += v;
  });
  const list = [...per.values()];
  if (!list.length) return {err:"Нет данных за выбранный период"};
  list.forEach(e => { let s2 = 0; for (let i = 0; i < FR; i++) { s2 += e.a[i]; e.a[i] = s2; } });
  const topN = Math.min(40, trendTop(10)), cand = new Set();
  for (let i = 0; i < FR && cand.size < 60; i++) list.filter(e => e.a[i] > 0).sort((a, b) => b.a[i] - a.a[i]).slice(0, topN).forEach(e => cand.add(e));
  const labels = Array.from({length:FR}, (_, i) => addDaysIso(from, Math.min(N - 1, (i + 1) * step - 1)));
  return {ents:[...cand], FR, labels, topN, step, from, to};
}
function raceLabel(d, step){
  const y = d.slice(0, 4), cur = String(new Date().getFullYear());
  if (step >= 30) return `${MONTHS[+d.slice(5, 7) - 1]} ${y}`;
  return `${yrDayRu(d)}${y !== cur ? " " + y : ""}`;
}
function raceChart(){
  const D = raceData(); if (D.err) { RACE = null; return note(D.err); }
  const W = 900, T = 100, rh = Math.max(26, Math.min(40, Math.floor(480 / D.topN))), H = T + D.topN * rh + 78;
  const L = Math.min(250, Math.max(130, Math.max(...D.ents.map(e => e.n.length)) * 9.6 + 22)), R = W - 110;
  RACE = {...D, t:REDUCED_MOTION ? D.FR - 1 : 0, playing:!REDUCED_MOTION, y:new Map(), maxV:0, geo:{W, T, rh, H, L, R}};
  let o = head(cPeriodLabel(), sub() + " · накопительно");
  o += `<text id="race-date" x="${W - 24}" y="${T - 22}" text-anchor="end" font-size="30" font-weight="700" fill="#ffffff" fill-opacity=".55"></text>`;
  o += D.ents.map(e => { const c = chartSeriesStyle(chartStyleKind(), e.k).c[0]; return `<g class="race-row" data-k="${escH(e.k)}" transform="translate(0,${H})" opacity="0">${(sv => sv.d + `<rect x="${L}" y="0" height="${rh - 8}" rx="6" width="0" fill="${sv.f}"/>`)(softSvg(c))}<text class="chart-label" x="${L - 10}" y="${((rh - 8) / 2 + 6).toFixed(1)}" text-anchor="end" font-size="18" fill="#e6e8ee">${escH(e.n)}</text><text class="chart-value" x="${L + 8}" y="${((rh - 8) / 2 + 6).toFixed(1)}" font-size="18" fill="#eceef3"></text></g>`; }).join("");
  const sp = [0.5, 1, 2, 4].map(v => `<option value="${v}"${v === raceSpeed ? " selected" : ""}>${String(v)}×</option>`).join("");
  return `<svg id="race-svg" viewBox="0 0 ${W} ${H}" role="img">${o}</svg>
    <div class="race-ctl" data-no-export><button class="mini" type="button" id="race-play" title="Пуск / пауза">${RACE.playing ? "❚❚ Пауза" : "▶ Пуск"}</button><button class="mini" type="button" id="race-restart" title="С начала">⟲</button><input type="range" id="race-pos" min="0" max="${D.FR - 1}" step="0.01" value="${RACE.t}" aria-label="Позиция"><select id="race-speed" aria-label="Скорость">${sp}</select><button class="mini" type="button" id="race-video" title="Скачать гонку видеофайлом">⬇ Видео</button><span class="hint" id="race-video-msg"></span></div>`;
}
function raceMount(){
  cancelAnimationFrame(raceRaf);
  const svg = $("race-svg"); if (!svg || !RACE) return;
  const R0 = RACE, {T, rh, H, L, R} = R0.geo;
  const els = new Map([...svg.querySelectorAll(".race-row")].map(gr => [gr.dataset.k, {gr, rect:gr.querySelector("rect"), val:gr.querySelector(".chart-value"), lab:gr.querySelector(".chart-label")}]));
  const dateEl = $("race-date"), pos = $("race-pos"), play = $("race-play");
  const fps = Math.max(2, R0.FR / 22);
  const updBtn = () => { play.textContent = R0.playing ? "❚❚ Пауза" : "▶ Пуск"; };
  play.onclick = () => { if (!R0.playing && R0.t >= R0.FR - 1) R0.t = 0; R0.playing = !R0.playing; updBtn(); };
  $("race-restart").onclick = () => { R0.t = 0; R0.playing = true; updBtn(); };
  pos.oninput = () => { R0.t = Number(pos.value); R0.playing = false; updBtn(); };
  $("race-speed").onchange = e => { raceSpeed = Number(e.target.value) || 1; try { localStorage.setItem("chatstats.raceSpeed.v1", String(raceSpeed)); } catch (err) {} };
  let last = performance.now(), first = true;
  const draw = () => {
    R0.t = Math.max(0, Math.min(R0.FR - 1, Number(R0.t) || 0));
    const i0 = Math.floor(R0.t), i1 = Math.min(R0.FR - 1, i0 + 1), fr = R0.t - i0;
    const vals = R0.ents.map(e => ({e, v:e.a[i0] + (e.a[i1] - e.a[i0]) * fr})).sort((a, b) => b.v - a.v);
    const mx = Math.max(1, vals[0]?.v || 1);
    R0.maxV = first ? mx : R0.maxV + (mx - R0.maxV) * 0.2;
    vals.forEach((o, rank) => {
      const el = els.get(o.e.k); if (!el) return;
      const show = rank < R0.topN && o.v > 0, target = show ? T + rank * rh : H + 4;
      const cur = R0.y.has(o.e.k) && !first ? R0.y.get(o.e.k) : target, ny = cur + (target - cur) * 0.2;
      R0.y.set(o.e.k, ny);
      const w = Math.max(2, o.v / R0.maxV * (R - L));
      el.gr.setAttribute("transform", `translate(0,${ny.toFixed(1)})`);
      el.gr.setAttribute("opacity", show ? "1" : "0");
      // Пока строка переезжает на другое место, её подпись приглушена — имена при обгоне не накладываются друг на друга.
      const moving = Math.min(1, Math.abs(target - ny) / (rh * .5));
      if (el.lab) el.lab.setAttribute("fill-opacity", (1 - moving * .85).toFixed(2));
      el.val.setAttribute("fill-opacity", (1 - moving * .85).toFixed(2));
      el.rect.setAttribute("width", w.toFixed(1));
      el.val.setAttribute("x", (L + w + 8).toFixed(1));
      el.val.textContent = fmt(Math.round(o.v));
    });
    dateEl.textContent = raceLabel(R0.labels[fr > 0.5 ? i1 : i0], R0.step);
    if (document.activeElement !== pos) pos.value = R0.t;
    first = false;
  };
  const loop = now => {
    if (!svg.isConnected || RACE !== R0) return;
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    if (R0.playing) { R0.t = Math.min(R0.FR - 1, R0.t + dt * fps * raceSpeed); if (R0.t >= R0.FR - 1) { R0.playing = false; updBtn(); } }
    draw();
    raceRaf = requestAnimationFrame(loop);
  };
  draw(); raceRaf = requestAnimationFrame(loop);
}

/* ===================== Кто активен вместе ===================== */
function heatStops(){ const p = chartPrefs("pairs"); return (p.heat && p.heat.c && p.heat.c.length === 3) ? p.heat.c : ["#1f3a5f", "#2f6fb3", "#7ac7ff"]; }
function heatAt(t){ const c = heatStops(); t = Math.max(0, Math.min(1, t)); return t < .5 ? pbMix(c[0], c[1], t * 2) : pbMix(c[1], c[2], (t - .5) * 2); }
function pairsChart(){
  if (chartEntity === "chats") return note("Матрица строится по участникам: переключите «Чаты» на «Участники»");
  const src = cScoped(), metric = $("metric").value, act = new Map(), tot = new Map(), names = new Map();
  src.forEach(x => {
    const k = String(x[F.userId] ?? x[F.name]);
    if (!isVisibleUser(k) || (SEL_ACTIVE && !SEL.has(k))) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    let s2 = act.get(k); if (!s2) { s2 = new Set(); act.set(k, s2); names.set(k, who(x)); }
    s2.add(String(x[F.date] ?? "").slice(0, 10)); tot.set(k, (tot.get(k) || 0) + v);
  });
  const n0 = Math.min(40, trendTop(10));
  const U = [...act.keys()].sort((a, b) => act.get(b).size - act.get(a).size || tot.get(b) - tot.get(a)).slice(0, n0), n = U.length;
  if (n < 2) return note("Нужно минимум два участника с активностью за выбранный период");
  const J = U.map(a => U.map(b => { if (a === b) return null; const A = act.get(a), B = act.get(b); let both = 0; A.forEach(d => { if (B.has(d)) both++; }); const uni = A.size + B.size - both; return {j:uni ? both / uni : 0, both, uni}; }));
  const offs = J.flat().filter(Boolean).map(x => x.j), mx = Math.max(.01, ...offs), mn = Math.min(...offs);
  const W = 900, lw = Math.min(170, Math.max(90, Math.max(...U.map(k => names.get(k).length)) * 9 + 16)), cell = Math.max(22, Math.min(42, Math.floor((W - lw - 40) / n)));
  const x0 = lw + 10, y0 = 96 + Math.min(130, Math.max(...U.map(k => names.get(k).length)) * 6.8 + 20), gw = cell * n;
  let o = head(cPeriodLabel(), `${MLBL[metric]}, кто активен в одни и те же дни · ${n} ${wordForm(n, ["участник", "участника", "участников"])}`);
  U.forEach((k, i) => {
    o += `<text class="chart-label" x="${x0 - 8}" y="${(y0 + i * cell + cell / 2 + 6).toFixed(1)}" text-anchor="end" font-size="16" fill="#e6e8ee">${escH(names.get(k))}</text>`;
    const cx = x0 + i * cell + cell / 2;
    o += `<text class="chart-label" transform="translate(${cx.toFixed(1)},${y0 - 8}) rotate(-50)" font-size="15" fill="#e6e8ee">${escH(names.get(k))}</text>`;
  });
  U.forEach((a, i) => U.forEach((b, j) => {
    const x = x0 + j * cell, y = y0 + i * cell, c = J[i][j];
    if (!c) { o += `<rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="4" fill="#ffffff" fill-opacity=".05"><title>${escH(names.get(a))}: ${act.get(a).size} активных дней</title></rect>${cell >= 30 ? `<text x="${x + cell / 2}" y="${y + cell / 2 + 5}" text-anchor="middle" font-size="12" fill="#ffffff" fill-opacity=".45">${act.get(a).size}</text>` : ""}`; return; }
    const t = mx > mn ? (c.j - mn) / (mx - mn) : 1, col = heatAt(t), lightCell = pbLum(col) > .35;
    o += `<rect x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="4" fill="${col}"><title>${escH(names.get(a))} и ${escH(names.get(b))}: вместе ${c.both} ${wordForm(c.both, ["день", "дня", "дней"])} из ${c.uni} (${Math.round(c.j * 100)}%)</title></rect>`;
    if (cell >= 28) o += `<text x="${x + cell / 2}" y="${y + cell / 2 + 5}" text-anchor="middle" font-size="${cell >= 36 ? 13 : 11}" fill="${lightCell ? "#111" : "#fff"}" pointer-events="none">${Math.round(c.j * 100)}</text>`;
  }));
  const pairs = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push({a:U[i], b:U[j], ...J[i][j]});
  pairs.sort((p, q) => q.j - p.j || q.both - p.both);
  let y = y0 + gw + 44;
  const lgx = x0, lgw = Math.min(260, gw);
  for (let i = 0; i <= 20; i++) o += `<rect x="${(lgx + i * lgw / 21).toFixed(1)}" y="${y - 16}" width="${(lgw / 21 + .5).toFixed(1)}" height="10" fill="${heatAt(i / 20)}"/>`;
  o += `<text class="chart-legend" x="${lgx}" y="${y + 12}" font-size="14" fill="#9aa0b0">${Math.round(mn * 100)}% общих дней</text><text class="chart-legend" x="${lgx + lgw}" y="${y + 12}" text-anchor="end" font-size="14" fill="#9aa0b0">${Math.round(mx * 100)}%</text>`;
  y += 48;
  o += `<text class="chart-subtitle" x="${lgx}" y="${y}" font-size="18" fill="#c0c6d4">Неразлучные пары</text>`;
  pairs.slice(0, 5).forEach((p, i) => { o += `<text class="chart-label" x="${lgx}" y="${y + 28 + i * 26}" font-size="16" fill="#e6e8ee">${i + 1}. ${escH(names.get(p.a))} и ${escH(names.get(p.b))} — ${Math.round(p.j * 100)}% · ${p.both} ${wordForm(p.both, ["общий день", "общих дня", "общих дней"])}</text>`; });
  const rare = pairs.slice(-3).reverse();
  const rx = W / 2 + 20;
  o += `<text class="chart-subtitle" x="${rx}" y="${y}" font-size="18" fill="#c0c6d4">Реже всего пересекаются</text>`;
  rare.forEach((p, i) => { o += `<text class="chart-label" x="${rx}" y="${y + 28 + i * 26}" font-size="16" fill="#e6e8ee">${escH(names.get(p.a))} и ${escH(names.get(p.b))} — ${Math.round(p.j * 100)}%</text>`; });
  const H = y + 28 + 5 * 26 + 10;
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${o}</svg><p class="hint" style="text-align:center;margin:6px 0 0">Число в клетке — доля дней, когда активны оба, от дней, когда активен хотя бы один (индекс Жаккара). На диагонали — активные дни участника.</p>`;
}

/* ===================== Радар в профиле ===================== */
const RADAR_KEY = "chatstats.radarPeriod.v1";
var radarPeriod = "365";
try { const v = localStorage.getItem(RADAR_KEY); if (["365", "year", "all"].includes(v)) radarPeriod = v; } catch (e) {}
const RADAR_AXES = [
  {k:"vol", n:"Объём", f:v => `${fmt(Math.round(v))} сообщ.`, d:"сообщений за период"},
  {k:"inten", n:"Интенсивность", f:v => `${fmtR(v)} в день`, d:"сообщений в активный день"},
  {k:"reg", n:"Регулярность", f:v => `${Math.round(v * 100)}% дней`, d:"дней с сообщениями"},
  {k:"streak", n:"Серии", f:v => `${fmt(v)} ${wordForm(v, ["день", "дня", "дней"])}`, d:"самая длинная серия"},
  {k:"stick", n:"Стикеры", f:v => `${fmtR(v)} на 100`, d:"стикеров на 100 сообщений"},
  {k:"voice", n:"Голосовые", f:v => `${fmtR(v)} на 100`, d:"голосовых на 100 сообщений"},
  {k:"video", n:"Видео", f:v => `${fmtR(v)} на 100`, d:"видеосообщений на 100 сообщений"},
];
function radarStats(){
  const today = iso(new Date());
  const from = radarPeriod === "365" ? addDaysIso(today, -364) : radarPeriod === "year" ? today.slice(0, 4) + "-01-01" : "0000-00-00";
  const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
  const per = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > today) return;
    const k = String(x[F.userId] ?? x[F.name]); if (!isVisibleUser(k)) return;
    let u = per.get(k); if (!u) { u = {k, msgs:0, stick:0, voice:0, video:0, daily:new Map(), first:d}; per.set(k, u); }
    MET.forEach(m => u[m] += Number(g(x, m)) || 0);
    const v = Number(g(x, "msgs")) || 0; if (v) u.daily.set(d, (u.daily.get(d) || 0) + v);
    if (d < u.first) u.first = d;
  });
  const out = [];
  per.forEach(u => {
    const st = streakStats(u.daily); if (st.activeDays < 5) return;
    const joined = MEMBERSHIP_STARTS.find(([, id]) => String(id) === u.k)?.[0];
    const base = joined && /^\d{4}-\d{2}-\d{2}$/.test(joined) ? joined : u.first;
    const start = base > from ? base : from;
    const avail = Math.max(1, dayIdx(today) - dayIdx(start) + 1);
    const m = Math.max(1, u.msgs);
    out.push({k:u.k, vol:u.msgs, inten:u.msgs / st.activeDays, reg:Math.min(1, st.activeDays / avail), streak:st.maxStreak, stick:u.stick / m * 100, voice:u.voice / m * 100, video:u.video / m * 100});
  });
  return out;
}
function radarHtml(pk, pColor){
  const all = radarStats(), me = all.find(x => x.k === String(pk));
  const seg = `<div class="seg" id="p-radar-period">${[["365", "365 дней"], ["year", "Этот год"], ["all", "Всё время"]].map(([k, n]) => `<button type="button" data-rp="${k}" class="${radarPeriod === k ? "active" : ""}">${n}</button>`).join("")}</div>`;
  if (!me || all.length < 3) return `<h2>Профиль активности</h2><div class="p-card">${seg}<p class="hint" style="margin-top:12px">Недостаточно данных: нужно хотя бы 5 активных дней за период.</p></div>`;
  const pct = ax => { const v = me[ax], others = all.filter(x => x.k !== me.k); if (!others.length) return .5; const lo = others.filter(x => x[ax] < v).length, eq = others.filter(x => x[ax] === v).length; return (lo + eq * .5) / others.length; };
  const P = RADAR_AXES.map(a => ({...a, p:pct(a.k), v:me[a.k]}));
  const W = 680, H = 480, cx = W / 2, cy = 244, R = 160, n = P.length;
  const pt = (i, r) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
  let o = "";
  [.25, .5, .75, 1].forEach(f => { o += `<polygon points="${P.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#ffffff" stroke-opacity="${f === 1 ? .22 : .1}"/>`; });
  P.forEach((_, i) => { const [x, y] = pt(i, R); o += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#ffffff" stroke-opacity=".1"/>`; });
  o += `<polygon points="${P.map((_, i) => pt(i, R * .5).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#c0c6d4" stroke-opacity=".75" stroke-width="2" stroke-dasharray="6 5"/>`;
  const shape = P.map((a, i) => pt(i, R * Math.max(.04, a.p)));
  o += `<polygon class="radar-shape" points="${shape.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ")}" fill="${pColor}" fill-opacity=".28" stroke="${pColor}" stroke-width="3" stroke-linejoin="round"/>`;
  shape.forEach(([x, y], i) => { o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${pColor}"><title>${P[i].n}: ${P[i].f(P[i].v)} — выше, чем у ${Math.round(P[i].p * 100)}% участников</title></circle>`; });
  P.forEach((a, i) => {
    const [x, y] = pt(i, R + 30), anchor = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end";
    o += `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${anchor}" font-size="17" font-weight="700" fill="#e8eaf1">${a.n}</text><text x="${x.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="${anchor}" font-size="14" fill="#9aa0b0">${a.f(a.v)}</text>`;
  });
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
  RADAR_LAST = {name:NAMES[pk] || `ID ${pk}`, color:pColor, P, n:all.length - 1, periodLabel:{"365":"за последние 365 дней", year:"за этот год", all:"за всё время"}[radarPeriod]};
  const rows = [...P].sort((a, b) => b.p - a.p).map(a => `<div class="radar-row"><span>${a.n}</span><b>${a.f(a.v)}</b><i><em style="width:${Math.round(a.p * 100)}%;background:${pColor}"></em></i><small>выше, чем у ${Math.round(a.p * 100)}%</small></div>`).join("");
  return `<h2>Профиль активности</h2><div class="p-card radar-card"><div class="radar-head">${seg}<span class="hint">Сравнение с остальными участниками (${all.length - 1}) · пунктир — средний участник</span><button class="mini copy-btn" type="button" data-radar-copy="radar">Копировать</button><button class="mini copy-btn" type="button" data-radar-copy="full">С описанием</button><span class="hint" id="p-radar-msg"></span></div><div class="radar-grid"><div class="radar-svg" id="p-radar">${svg}</div><div class="radar-list">${rows}</div></div></div>`;
}
$("p-out").addEventListener("click", e => {
  const b = e.target.closest("#p-radar-period [data-rp]");
  if (b) { radarPeriod = b.dataset.rp; try { localStorage.setItem(RADAR_KEY, radarPeriod); } catch (err) {} renderProfile(); return; }
});

/* Мини-гистограммы в ячейках убраны (2026.10.30) */
try { localStorage.removeItem("chatstats.expHist.v1"); localStorage.removeItem("chatstats.statRows.v1"); localStorage.removeItem("chatstats.anomalies.v1"); } catch (e) {}
syncNormSeg();

/* ===================== Гонка: экспорт в видео ===================== */
function raceCanvasBg(ctx, W, H, p){
  const a = /^#[0-9a-f]{6}$/i.test(p.backgroundStart || "") ? p.backgroundStart : "#262626";
  const b = /^#[0-9a-f]{6}$/i.test(p.backgroundEnd || "") ? p.backgroundEnd : a;
  let fill = a;
  if (p.backgroundMode === "radial") { const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * .7 / 2 * 1.4); gr.addColorStop(0, a); gr.addColorStop(1, b); fill = gr; }
  else if (p.backgroundMode !== "solid") {
    const ang = Number(p.backgroundAngle ?? 135) * Math.PI / 180, dx = Math.sin(ang), dy = -Math.cos(ang), r = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
    const gr = ctx.createLinearGradient(W / 2 - dx * r, H / 2 - dy * r, W / 2 + dx * r, H / 2 + dy * r); gr.addColorStop(0, a); gr.addColorStop(1, b); fill = gr;
  }
  ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H);
}
function rrect(ctx, x, y, w, h, r){ r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// Покадровый расчёт гонки (та же логика, что на экране, но с фиксированным шагом времени).
function raceSimulator(D){
  const y = new Map(); let maxV = 0, first = true;
  return (t, k) => {
    const i0 = Math.floor(t), i1 = Math.min(D.FR - 1, i0 + 1), fr = t - i0;
    const vals = D.ents.map(e => ({e, v:e.a[i0] + (e.a[i1] - e.a[i0]) * fr})).sort((a, b) => b.v - a.v);
    const mx = Math.max(1, vals[0]?.v || 1);
    maxV = first ? mx : maxV + (mx - maxV) * k;
    const out = vals.map((o, rank) => {
      const show = rank < D.topN && o.v > 0, target = show ? rank : D.topN + .4;
      const cur = y.has(o.e.k) && !first ? y.get(o.e.k) : target, ny = cur + (target - cur) * k;
      y.set(o.e.k, ny); return {e:o.e, v:o.v, row:ny, show};
    });
    first = false;
    return {rows:out, maxV, label:raceLabel(D.labels[fr > .5 ? i1 : i0], D.step)};
  };
}
function raceDrawFrame(ctx, D, st, G, p, titles){
  const {W, H, s, T, rh, L, R} = G, ts = p.textStyle || {};
  const font = `"Samsung Sans","SamsungOne","Segoe UI",system-ui,sans-serif`;
  raceCanvasBg(ctx, W, H, p);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ts.titleColor || "#aaaaaa"; ctx.font = `${Math.round(36 * s)}px ${font}`; ctx.textAlign = "center"; ctx.fillText(titles.title, W / 2, 46 * s);
  if (p.showSubtitle !== false) { ctx.fillStyle = ts.subtitleColor || "#7d8190"; ctx.font = `${Math.round(17 * s)}px ${font}`; ctx.fillText(titles.sub, W / 2, 72 * s); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, T - 4 * s, W, D.topN * rh + 4 * s); ctx.clip();
  st.rows.forEach(r => {
    if (!r.show && r.row > D.topN - .02) return;
    const y = T + r.row * rh, bh = rh - 8 * s, w = Math.max(2 * s, r.v / st.maxV * (R - L));
    ctx.globalAlpha = Math.max(0, Math.min(1, D.topN - r.row));
    ctx.fillStyle = softCanvas(ctx, chartSeriesStyle(chartStyleKind(), r.e.k).c[0], L, L + w); rrect(ctx, L, y, w, bh, 6 * s); ctx.fill();
    ctx.font = `${Math.round(18 * s)}px ${font}`; ctx.textAlign = "right"; ctx.fillStyle = ts.labelsColor || "#e6e8ee"; ctx.fillText(r.e.n, L - 10 * s, y + bh / 2 + 6 * s);
    ctx.textAlign = "left"; ctx.fillStyle = ts.valuesColor || "#eceef3"; ctx.fillText(fmt(Math.round(r.v)), L + w + 8 * s, y + bh / 2 + 6 * s);
  });
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.font = `700 ${Math.round(46 * s)}px ${font}`; ctx.textAlign = "right"; ctx.fillStyle = ts.titleColor || "#ffffff"; ctx.globalAlpha = .28; ctx.fillText(st.label, W - 24 * s, H - 16 * s); ctx.globalAlpha = 1;
}
// Тихая звуковая дорожка: без неё Telegram считает ролик GIF-анимацией.
const QA_RATE = 48000;
async function quietAudioCfg(){
  if (!window.AudioEncoder || !window.AudioData) return null;
  for (const [codec, mux] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) {
    const cfg = {codec, sampleRate:QA_RATE, numberOfChannels:2, bitrate:96000};
    try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) return {cfg, mux}; } catch (e) {}
  }
  return null;
}
async function encodeQuietAudio(muxer, cfg, seconds){
  let fail = null;
  const enc = new AudioEncoder({output:(chunk, meta) => muxer.addAudioChunk(chunk, meta), error:e => { fail = e; }});
  enc.configure(cfg);
  const n = Math.ceil(seconds * QA_RATE), block = 1024;
  let seed = 7; const rnd = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647 - .5; };
  for (let i = 0; i < n; i += block) {
    const len = Math.min(block, n - i), buf = new Float32Array(len * 2);
    for (let k = 0; k < buf.length; k++) buf[k] = rnd() * 0.0006; // около −65 дБ: на слух не слышно
    const ad = new AudioData({format:"f32-planar", sampleRate:QA_RATE, numberOfFrames:len, numberOfChannels:2, timestamp:Math.round(i * 1e6 / QA_RATE), data:buf});
    enc.encode(ad); ad.close();
    if (fail) throw fail;
  }
  await enc.flush(); enc.close();
  if (fail) throw fail;
}
async function raceEncode(canvas, total, fps, drawAt, progress){
  const W = canvas.width, H = canvas.height, bitrate = Math.round(W * H * fps * 0.18);
  if (window.VideoEncoder && window.VideoFrame && window.Mp4Muxer) {
    const aud = await quietAudioCfg();
    for (const withAudio of aud ? [true, false] : [false]) {
      for (const [codec, mux] of [["avc1.640033", "avc"], ["avc1.4d0033", "avc"], ["vp09.00.41.08", "vp9"], ["av01.0.08M.08", "av1"]]) {
        const cfg = {codec, width:W, height:H, bitrate, framerate:fps};
        let ok = false; try { ok = (await VideoEncoder.isConfigSupported(cfg)).supported; } catch (e) {}
        if (!ok) continue;
        try {
          const muxer = new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(), video:{codec:mux, width:W, height:H, frameRate:fps},
            ...(withAudio ? {audio:{codec:aud.mux, numberOfChannels:2, sampleRate:QA_RATE}} : {}), fastStart:"in-memory", firstTimestampBehavior:"offset"});
          let fail = null;
          const enc = new VideoEncoder({output:(chunk, meta) => muxer.addVideoChunk(chunk, meta), error:e => { fail = e; }});
          enc.configure(cfg);
          for (let f = 0; f < total; f++) {
            if (fail) throw fail;
            await drawAt(f);
            const vf = new VideoFrame(canvas, {timestamp:Math.round(f * 1e6 / fps), duration:Math.round(1e6 / fps)});
            enc.encode(vf, {keyFrame:f % (fps * 2) === 0}); vf.close();
            if (enc.encodeQueueSize > 8 || f % 10 === 0) { progress(f / total); await new Promise(r => setTimeout(r, 0)); }
          }
          await enc.flush(); if (fail) throw fail;
          if (withAudio) await encodeQuietAudio(muxer, aud.cfg, total / fps);
          muxer.finalize();
          return {blob:new Blob([muxer.target.buffer], {type:"video/mp4"}), ext:"mp4"};
        } catch (e) { if (!withAudio) throw e; break; } // со звуком не вышло — пробуем без звука
      }
    }
  }
  // Запасной путь: запись в реальном времени (WebM) с тихой дорожкой.
  if (!window.MediaRecorder || !canvas.captureStream) throw new Error("браузер не умеет записывать видео");
  const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0], chunks = [];
  let actx = null;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate), d = buf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() - .5) * 0.0006;
    const src = actx.createBufferSource(), dst = actx.createMediaStreamDestination();
    src.buffer = buf; src.loop = true; src.connect(dst); src.start();
    dst.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  } catch (e) { actx = null; }
  const hasAudio = stream.getAudioTracks().length > 0;
  const mime = (hasAudio ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus"] : []).concat(["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]).find(m => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, {mimeType:mime, videoBitsPerSecond:bitrate});
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise(r => rec.onstop = r);
  rec.start();
  for (let f = 0; f < total; f++) { await drawAt(f); track.requestFrame?.(); progress(f / total); await new Promise(r => setTimeout(r, 1000 / fps)); }
  rec.stop(); await done;
  try { actx?.close(); } catch (e) {}
  return {blob:new Blob(chunks, {type:"video/webm"}), ext:"webm"};
}
async function raceExportVideo(){
  const D = RACE, btn = $("race-video"), msg = $("race-video-msg");
  if (!D || !btn) return;
  btn.disabled = true;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const p = chartPrefs("race"), s = 1920 / D.geo.W;
    const G = {W:1920, H:Math.round(D.geo.H * s / 2) * 2, s, T:D.geo.T * s, rh:D.geo.rh * s, L:D.geo.L * s, R:D.geo.R * s};
    const canvas = document.createElement("canvas"); canvas.width = G.W; canvas.height = G.H;
    const ctx = canvas.getContext("2d");
    const ttl = cPeriodLabel(), dateTitle = /^\d{1,2} [а-я]{3}(?: \d{4})?(?: - \d{1,2} [а-я]{3}(?: \d{4})?)?$/i.test(ttl);
    const titles = {title:dateTitle || window.__TABLO ? ttl : ttl.toUpperCase(), sub:sub() + " · накопительно"};
    const fps = 30, play = Math.max(2, D.FR / 22) * raceSpeed, main = Math.ceil((D.FR - 1) / play * fps), total = main + fps * 2;
    const sim = raceSimulator(D), k = 1 - Math.pow(.8, 60 / fps);
    let last = -1;
    const drawAt = f => { if (f === last) return; last = f; const st = sim(Math.min(D.FR - 1, f / fps * play), k); raceDrawFrame(ctx, D, st, G, p, titles); };
    const res = await raceEncode(canvas, total, fps, drawAt, q => { msg.textContent = `Создаю видео… ${Math.round(q * 100)}%`; });
    const a = document.createElement("a"); a.href = URL.createObjectURL(res.blob);
    a.download = `race_${D.from}_${D.to}.${res.ext}`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    msg.textContent = `Видео готово (${res.ext.toUpperCase()}, ${G.W}×${G.H}, ${Math.round(total / fps)} с)`;
    raceLastVideo = res;
  } catch (e) { msg.textContent = "Не удалось создать видео: " + (e.message || e); }
  finally { btn.disabled = false; }
}
var raceLastVideo = null;
document.addEventListener("click", e => { if (e.target.closest?.("#race-video")) raceExportVideo(); });

/* ===================== Радар: копирование с заголовком ===================== */
var RADAR_LAST = null;
function radarCoreSvg(P, pColor, W, H, cx, cy, R, tx, mu){
  const n = P.length, pt = (i, r) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
  let o = "";
  [.25, .5, .75, 1].forEach(f => { o += `<polygon points="${P.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${tx}" stroke-opacity="${f === 1 ? .22 : .1}"/>`; });
  P.forEach((_, i) => { const [x, y] = pt(i, R); o += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${tx}" stroke-opacity=".1"/>`; });
  o += `<polygon points="${P.map((_, i) => pt(i, R * .5).map(v => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${mu}" stroke-opacity=".85" stroke-width="2" stroke-dasharray="6 5"/>`;
  const shape = P.map((a, i) => pt(i, R * Math.max(.04, a.p)));
  o += `<polygon points="${shape.map(q => q.map(v => v.toFixed(1)).join(",")).join(" ")}" fill="${pColor}" fill-opacity=".28" stroke="${pColor}" stroke-width="3" stroke-linejoin="round"/>`;
  shape.forEach(([x, y]) => { o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${pColor}"/>`; });
  P.forEach((a, i) => {
    const [x, y] = pt(i, R + 30), anchor = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end";
    o += `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${anchor}" font-size="17" font-weight="700" fill="${tx}">${a.n}</text><text x="${x.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="${anchor}" font-size="14" fill="${mu}">${a.f(a.v)}</text>`;
  });
  return o;
}
function radarExportSvg(withList){
  const L = RADAR_LAST; if (!L) return "";
  const tx = cmpThemeVar("--text", "#e8eaf1"), mu = cmpThemeVar("--muted", "#9aa0b0"), ln = cmpThemeVar("--line", "#2c303b");
  const rw = 680, W = withList ? 1220 : rw;
  const lines = [`Как ${L.name} выглядит на фоне остальных участников (${L.n}) · ${L.periodLabel}.`, "Каждая ось — место среди участников: чем дальше от центра, тем выше. Пунктир — средний участник."].flatMap(t => cmpWrap(t, withList ? 130 : 72));
  const top = 96 + lines.length * 22;
  let o = `<rect x="32" y="34" width="6" height="30" rx="3" fill="${L.color}"/><text x="52" y="60" font-size="28" font-weight="700" fill="${tx}">${escH(cmpFit("Профиль активности — " + L.name, withList ? 70 : 40))}</text>`;
  lines.forEach((t, i) => { o += `<text x="52" y="${88 + i * 22}" font-size="15" fill="${mu}">${escH(t)}</text>`; });
  o += `<g transform="translate(0,${top})">${radarCoreSvg(L.P, L.color, rw, 480, rw / 2, 244, 160, tx, mu)}</g>`;
  let H = top + 490;
  if (withList) {
    const x0 = rw + 10, x1 = W - 40, rows = [...L.P].sort((a, b) => b.p - a.p);
    o += `<line x1="${x0 - 16}" y1="${top + 10}" x2="${x0 - 16}" y2="${top + 470}" stroke="${ln}"/>`;
    rows.forEach((a, i) => {
      const y = top + 40 + i * 62;
      o += `<text x="${x0}" y="${y}" font-size="17" fill="${tx}">${a.n}</text><text x="${x1}" y="${y}" font-size="17" font-weight="700" fill="${tx}" text-anchor="end">${a.f(a.v)}</text>`;
      o += `<rect x="${x0}" y="${y + 10}" width="${x1 - x0}" height="9" rx="4.5" fill="${tx}" fill-opacity=".08"/><rect x="${x0}" y="${y + 10}" width="${Math.max(4, (x1 - x0) * a.p).toFixed(1)}" height="9" rx="4.5" fill="${L.color}"/>`;
      o += `<text x="${x0}" y="${y + 38}" font-size="14" fill="${mu}">выше, чем у ${Math.round(a.p * 100)}% · ${escH(a.d)}</text>`;
    });
    H = Math.max(H, top + 40 + rows.length * 62 + 10);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}
async function radarBlob(withList){
  const box = document.createElement("div"); box.style.cssText = "position:fixed;left:-10000px;top:0;width:1300px";
  box.innerHTML = radarExportSvg(withList); document.body.appendChild(box);
  try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
}
document.addEventListener("click", e => {
  const b = e.target.closest?.("[data-radar-copy]"); if (!b) return;
  copyPngToStatus(() => radarBlob(b.dataset.radarCopy === "full"), $("p-radar-msg"), b.dataset.radarCopy === "full" ? "Радар с описанием скопирован" : "Радар скопирован");
});

/* ===================== Общие мелочи ===================== */
function toastMsg(t){
  let el = document.getElementById("cs-toast");
  if (!el) { el = document.createElement("div"); el.id = "cs-toast"; document.body.appendChild(el); }
  el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 4200);
}
const daysWord = n => wordForm(n, ["день", "дня", "дней"]);

/* ===================== Прогноз мест ===================== */
function fcPlacesHtml(list, b, chats){
  if (list.length < 2) return "";
  const today = iso(new Date());
  const cur = [...list].sort((x, y) => y.f.current - x.f.current), fut = [...list].sort((x, y) => y.f.forecast - x.f.forecast);
  const curRank = new Map(cur.map((e, i) => [e.k, i + 1])), futRank = new Map(fut.map((e, i) => [e.k, i + 1]));
  const left = Math.max(0, list[0].f.daysTotal - list[0].f.elapsed);
  const over = [];
  for (const a of cur) for (const z of cur) {
    if (a === z || curRank.get(a.k) >= curRank.get(z.k)) continue;
    const gap = a.f.current - z.f.current, dr = (z.f.rate || 0) - (a.f.rate || 0);
    if (!(dr > 0) || !(z.f.forecast > a.f.forecast)) continue;
    const days = Math.max(1, Math.ceil(gap / dr)); if (days > left + 1) continue;
    over.push({a, z, days, date:addDaysIso(today, days)});
  }
  over.sort((p, q) => p.days - q.days);
  const nm = e => chats ? escH(e.name) : `<span class="pname" data-open-profile="${escH(e.k)}">${escH(e.name)}</span>`;
  const rows = fut.filter(e => curRank.get(e.k) !== futRank.get(e.k)).slice(0, 12).map(e => {
    const c = curRank.get(e.k), f = futRank.get(e.k), d = c - f;
    return `<tr><td>${c}</td><td style="text-align:left">${nm(e)}</td><td><b>${f}</b></td><td class="${d > 0 ? "place-up" : d < 0 ? "place-down" : ""}">${d > 0 ? "↑ " + d : d < 0 ? "↓ " + (-d) : "="}</td><td>${fmt(Math.round(e.f.forecast))}</td><td>${fmtR(e.f.rate || 0)}</td></tr>`;
  }).join("");
  const ov = over.length ? `<ul class="overtakes">${over.slice(0, 8).map(o => `<li><b>${escH(o.z.name)}</b> и <b>${escH(o.a.name)}</b> поменяются местами примерно через ${o.days} ${daysWord(o.days)} <span class="hint">(${yrDayRu(o.date)})</span></li>`).join("")}</ul>` : `<p class="hint">При текущем темпе до конца ${b.label ? "периода" : "периода"} обгонов не ожидается.</p>`;
  return `<div class="section-head"><h2>Прогноз мест</h2><span class="hint">кто поднимется или опустится к концу периода · по темпу последних дней · осталось ${left} ${daysWord(left)}</span></div>
    <div class="fc-places"><div class="wrap"><table id="fc-places-table"><thead><tr><th>Сейчас</th><th style="text-align:left">${chats ? "Чат" : "Участник"}</th><th>Прогноз места</th><th>Изменение</th><th>К концу периода</th><th>Темп в день</th></tr></thead><tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:var(--muted)">При текущем темпе места не изменятся</td></tr>`}</tbody></table></div>
    <div class="fc-over"><h3>Ожидаемые обгоны</h3>${ov}</div></div>`;
}

/* ===================== Тихие участники ===================== */
const QUIET_KEY = "chatstats.quiet.v1";
var QUIET = {on:true, days:5};
try { const j = JSON.parse(localStorage.getItem(QUIET_KEY) || "null"); if (j) QUIET = {on:j.on !== false, days:[3, 5, 7, 14].includes(+j.days) ? +j.days : 5}; } catch (e) {}
function quietList(){
  if (!allRows) return [];
  const today = iso(new Date()), hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
  const per = new Map();
  src.forEach(x => {
    const v = Number(g(x, "msgs")) || 0; if (!v) return;
    const k = String(x[F.userId] ?? x[F.name]); if (!isVisibleUser(k)) return;
    let m = per.get(k); if (!m) { m = new Map(); per.set(k, m); } const d = String(x[F.date] ?? "").slice(0, 10); m.set(d, (m.get(d) || 0) + v);
  });
  const out = [];
  per.forEach((m, k) => {
    const days = [...m.keys()].sort(), last = days[days.length - 1]; if (!last) return;
    const silent = dayIdx(today) - dayIdx(last); if (silent < QUIET.days || silent > 60) return;
    const from = addDaysIso(last, -59), win = days.filter(d => d >= from);
    if (win.length < 12) return;
    const sum = win.reduce((s2, d) => s2 + m.get(d), 0);
    out.push({k, name:NAMES[k] || k, last, silent, share:win.length / 60, perDay:sum / win.length});
  });
  return out.sort((a, b) => b.silent - a.silent);
}
function renderQuiet(){
  const box = $("quiet-box"); if (!box) return;
  if (!QUIET.on) { box.hidden = true; return; }
  if (!allRows) { getHistory().then(renderQuiet).catch(() => {}); box.hidden = true; return; }
  const L = quietList(); box.hidden = !L.length; if (!L.length) { box.innerHTML = ""; return; }
  const wasOpen = box.querySelector("details")?.open ?? false;
  box.innerHTML = `<details class="quiet"${wasOpen ? " open" : ""}><summary>🤫 Тихие участники <b>${L.length}</b><span class="hint">раньше писали регулярно, а сейчас молчат ${QUIET.days}+ ${daysWord(QUIET.days)}</span></summary><div class="quiet-list">${L.map(q => `<div class="quiet-item" style="--qc:${getStyle("u", q.k).c[0]}"><span class="pname" data-open-profile="${escH(q.k)}">${escH(q.name)}</span><b>${q.silent} ${daysWord(q.silent)}</b><small>последнее сообщение ${yrDayRu(q.last)} · раньше ~${fmt(Math.round(q.perDay))} в день, активность ${Math.round(q.share * 100)}% дней</small></div>`).join("")}</div></details>`;
}
(function(){
  const c = $("quiet-on"), s = $("quiet-days"); if (!c || !s) return;
  c.checked = QUIET.on; s.value = String(QUIET.days);
  const save = () => { QUIET = {on:c.checked, days:+s.value}; try { localStorage.setItem(QUIET_KEY, JSON.stringify(QUIET)); } catch (e) {} renderQuiet(); };
  c.onchange = save; s.onchange = save;
})();

/* ===================== Личные цели ===================== */
const GOALS_KEY = "chatstats.goals.v1";
var GOALS = {};
try { const j = JSON.parse(localStorage.getItem(GOALS_KEY) || "null"); if (j && typeof j === "object") GOALS = j; } catch (e) {}
const saveGoals = () => { try { localStorage.setItem(GOALS_KEY, JSON.stringify(GOALS)); } catch (e) {} };
function goalPeriod(kind){
  const today = iso(new Date());
  const start = kind === "year" ? today.slice(0, 4) + "-01-01" : today.slice(0, 7) + "-01";
  const end = kind === "year" ? today.slice(0, 4) + "-12-31" : (() => { const [y, m] = today.split("-").map(Number); return `${today.slice(0, 7)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`; })();
  const total = dayIdx(end) - dayIdx(start) + 1, elapsed = dayIdx(today) - dayIdx(start) + 1;
  return {start, end, total, elapsed, left:total - elapsed + 1, label:kind === "year" ? `${today.slice(0, 4)} год` : `${MONTHS[+today.slice(5, 7) - 1]} ${today.slice(0, 4)}`};
}
function goalValue(pk, kind, metric){
  if (!allRows) return 0;
  const P = goalPeriod(kind), hasTot = allRows.some(x => Number(x[F.chatPk]) === 0);
  let s2 = 0;
  for (const x of allRows) {
    if (hasTot && Number(x[F.chatPk]) !== 0) continue;
    if (String(x[F.userId]) !== String(pk)) continue;
    const d = String(x[F.date] ?? "").slice(0, 10); if (d < P.start || d > P.end) continue;
    s2 += Number(g(x, metric)) || 0;
  }
  return s2;
}
function ringSvg(p, size, color, stroke = 10){
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, p));
  return `<svg class="goal-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(c * v).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
function goalCardHtml(pk, kind, color){
  const G = GOALS[pk]?.[kind], P = goalPeriod(kind), word = kind === "year" ? "год" : "месяц";
  const editing = goalEdit === `${pk}|${kind}`;
  const form = `<div class="goal-form"><select data-goal-metric>${MET.map(m => `<option value="${m}"${(G?.metric || "msgs") === m ? " selected" : ""}>${MLBL[m]}</option>`).join("")}</select><input type="number" min="1" step="1" data-goal-value value="${G?.value || ""}" placeholder="Сколько за ${word}"><button class="mini" type="button" data-goal-save="${kind}">Сохранить</button>${G ? `<button class="mini" type="button" data-goal-del="${kind}">Убрать</button>` : ""}<button class="mini" type="button" data-goal-cancel>Отмена</button></div>`;
  if (!G) return `<div class="goal-card empty"><h3>Цель на ${word}</h3>${editing ? form : `<p class="hint">Цели нет. Поставь, сколько хочешь набрать за ${P.label.toLowerCase()}.</p><button class="mini" type="button" data-goal-edit="${kind}">+ Поставить цель</button>`}</div>`;
  const v = goalValue(pk, kind, G.metric), p = v / G.value, rate = v / Math.max(1, P.elapsed), fc = Math.round(rate * P.total);
  const need = Math.max(0, G.value - v), perDay = P.left > 0 ? need / P.left : 0, done = v >= G.value;
  return `<div class="goal-card${done ? " done" : ""}"><h3>Цель на ${word} · ${escH(P.label)}<button class="mini" type="button" data-goal-edit="${kind}" title="Изменить">✎</button></h3>
    ${editing ? form : `<div class="goal-body"><div class="goal-ringbox">${ringSvg(p, 132, done ? "#9ece6a" : color, 12)}<b>${Math.round(p * 100)}%</b></div>
    <div class="goal-info"><div class="goal-main">${fmt(v)} <span>из ${fmt(G.value)}</span></div><div class="hint">${MLBL[G.metric].toLowerCase()}</div>
    ${done ? `<div class="goal-ok">Цель выполнена 🎉</div>` : `<div>Осталось <b>${fmt(need)}</b> · нужно <b>${fmtR(perDay)}</b> в день</div>`}
    <div class="hint">При текущем темпе к концу: ≈ ${fmt(fc)} ${fc >= G.value ? "✓ успеваешь" : `— не хватит ${fmt(G.value - fc)}`}</div></div></div>`}
  </div>`;
}
var goalEdit = "";
function goalsHtml(pk, color){
  return `<h2>Личные цели</h2><div class="goal-grid" data-goal-pk="${escH(pk)}">${goalCardHtml(pk, "month", color)}${goalCardHtml(pk, "year", color)}</div>`;
}
document.addEventListener("click", e => {
  const box = e.target.closest?.("[data-goal-pk]"); if (!box) return;
  const pk = box.dataset.goalPk;
  const ed = e.target.closest("[data-goal-edit]"), sv = e.target.closest("[data-goal-save]"), dl = e.target.closest("[data-goal-del]"), cc = e.target.closest("[data-goal-cancel]");
  if (ed) { goalEdit = `${pk}|${ed.dataset.goalEdit}`; renderProfile(); return; }
  if (cc) { goalEdit = ""; renderProfile(); return; }
  if (sv) {
    const card = sv.closest(".goal-card"), val = Math.round(Number(card.querySelector("[data-goal-value]").value));
    if (!(val > 0)) { card.querySelector("[data-goal-value]").focus(); return; }
    GOALS[pk] = {...(GOALS[pk] || {}), [sv.dataset.goalSave]:{metric:card.querySelector("[data-goal-metric]").value, value:val}};
    saveGoals(); goalEdit = ""; renderProfile(); try { render(); } catch (err) {} return;
  }
  if (dl) { if (GOALS[pk]) delete GOALS[pk][dl.dataset.goalDel]; saveGoals(); goalEdit = ""; renderProfile(); try { render(); } catch (err) {} }
});
// Маленькое кольцо цели рядом с именем в таблице «Участники».
function goalMini(pk, absU){
  if ($("chat").value) return "";
  const r = range(); if (!r) return "";
  const today = iso(new Date()), kind = mode === "month" && r[0] === today.slice(0, 7) + "-01" ? "month" : mode === "year" && r[0] === today.slice(0, 4) + "-01-01" ? "year" : null;
  const G = kind && GOALS[pk]?.[kind]; if (!G || !absU) return "";
  const v = Number(absU[G.metric]) || 0, p = v / G.value;
  return `<span class="goal-mini" data-no-export="true" title="Цель на ${kind === "year" ? "год" : "месяц"}: ${fmt(v)} из ${fmt(G.value)} (${Math.round(p * 100)}%)">${ringSvg(p, 18, p >= 1 ? "#9ece6a" : getStyle("u", pk).c[0], 3.5)}</span>`;
}

/* ===================== Сезонность ===================== */
/* ===================== «Отклонение от нормы»: тепловая карта участник × неделя ===================== */
// Каждая ячейка — сколько участник писал в неделю (в среднем в день) по сравнению со своей личной нормой:
// средним в день за 8 недель до этой недели. Красное — тише обычного, зелёное — активнее.
const NORM_WEEKS_KEY = "chatstats.normWeeks.v1";
function normChart(){
  if (!allRows) return note("Загружаю историю…");
  const metric = $("metric").value, chat = $("chat").value, chats = chartEntity === "chats";
  const NW = Number($("norm-weeks")?.value) || 16, BASE = 8, BASE_MIN_DAYS = 14;
  const today = iso(new Date()), r = cRange(), end = r && r[1] < today ? r[1] : today;
  // Недели скользящие: последняя — ровно 7 дней по выбранную дату, без неполных недель.
  const firstMon = addDaysIso(end, -(7 * NW - 1)), baseFrom = addDaysIso(firstMon, -7 * BASE);
  const i0 = dayIdx(baseFrom), nDays = dayIdx(end) - i0 + 1;
  const src = chats ? chartChatRows(allRows) : pick(allRows, chat);
  const keyOf = x => chats ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
  const per = new Map(), firstSeen = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10 || d > end) return;
    const k = keyOf(x); if (!chats && (!isVisibleUser(k) || (SEL_ACTIVE && !SEL.has(k)))) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    if (!firstSeen.has(k) || d < firstSeen.get(k)) firstSeen.set(k, d);
    if (d < baseFrom) return;
    let e = per.get(k); if (!e) { e = {k, name:chats ? String(x[F.chat] || `Чат ${k}`) : who(x), a:new Float64Array(nDays)}; per.set(k, e); }
    e.a[dayIdx(d) - i0] += v;
  });
  if (!per.size) return note("Нет данных за выбранный период");
  const sum = (a, from, to) => { let s = 0; for (let i = Math.max(0, from); i <= to; i++) s += a[i]; return s; };
  // Ячейка: факт в день за [from..to] против нормы за 8 недель до from (не раньше первого появления).
  function cell(e, from, to){
    const join = Math.max(0, dayIdx(firstSeen.get(e.k)) - i0), bTo = from - 1, bFrom = Math.max(from - 7 * BASE, join);
    if (to < join) return {kind:"none"};
    const days = to - from + 1, act = sum(e.a, from, to) / days;
    const bDays = bTo - bFrom + 1;
    if (bDays < BASE_MIN_DAYS) return {kind:"new", act};
    const base = sum(e.a, bFrom, bTo) / bDays;
    if (base * 7 < 3) return {kind:"low", act, base};
    return {kind:"ok", act, base, dev:act / base - 1};
  }
  const weeks = Array.from({length:NW}, (_, w) => { const a = addDaysIso(firstMon, 7 * w), b = addDaysIso(a, 6); return {a, b, from:dayIdx(a) - i0, to:dayIdx(b) - i0}; });
  const nowTo = nDays - 1, nowFrom = nowTo - 6;
  const rowsN = [...per.values()].map(e => {
    const cells = weeks.map(w => cell(e, w.from, w.to)), now = cell(e, nowFrom, nowTo);
    let streak = 0; for (let i = cells.length - 1; i >= 0 && cells[i].kind === "ok" && cells[i].dev <= -0.25; i--) streak++;
    return {...e, cells, now, streak};
  }).filter(x => x.cells.some(c => c.kind !== "none"));
  const nowDev = x => x.now.kind === "ok" ? x.now.dev : x.now.kind === "low" ? 9 : 10;
  rowsN.sort((a, b) => nowDev(a) - nowDev(b) || a.name.localeCompare(b.name, "ru"));

  const W = 1100, L = 150, SUMW = 130, T = 128, RH = 30, gap = 3;
  const cw = (W - L - SUMW - 20) / NW, showTxt = cw >= 44;
  const H = T + rowsN.length * RH + 160;
  const pct = d => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(Math.round(d * 100))}%`;
  const fillOf = c => {
    if (c.kind === "low" || c.kind === "new") return "rgba(160,168,190,.13)";
    const d = Math.max(-1, Math.min(1, c.dev)), m = Math.abs(d);
    if (m < 0.1) return "rgba(160,168,190,.18)";
    return d < 0 ? `rgba(247,118,142,${(0.16 + 0.74 * m).toFixed(3)})` : `rgba(118,240,182,${(0.14 + 0.5 * m).toFixed(3)})`;
  };
  const dShort = d => `${+d.slice(8)} ${MONTHS_SHORT_RU[+d.slice(5, 7) - 1]}`;
  let o = head(chats ? "Чаты: отклонение от нормы" : "Отклонение от нормы", `${MLBL[metric]} в день по неделям в сравнении с личной нормой · ${chats ? "все чаты" : chat || "все чаты"} · ${NW} ${wordForm(NW, ["неделя", "недели", "недель"])} по ${dShort(end)}`, W);
  const step = showTxt ? 1 : cw >= 26 ? 2 : 4;
  weeks.forEach((w, i) => { if ((NW - 1 - i) % step) return; o += `<text class="chart-axis" x="${(L + cw * i + cw / 2).toFixed(1)}" y="${T - 12}" text-anchor="middle" font-size="12" fill="#aab0c0">${dShort(w.a)}</text>`; });
  o += `<text class="chart-axis" x="${W - 20 - SUMW / 2 + 4}" y="${T - 12}" text-anchor="middle" font-size="12" fill="#aab0c0">сейчас</text>`;
  rowsN.forEach((x, ri) => {
    const y = T + ri * RH;
    o += `<text class="chart-label" x="${L - 12}" y="${y + RH / 2 + 5}" text-anchor="end" font-size="14" fill="#e6e8ee">${escH(x.name.length > 16 ? x.name.slice(0, 15) + "…" : x.name)}</text>`;
    x.cells.forEach((c, i) => {
      if (c.kind === "none") return;
      const w = weeks[i], cx = L + cw * i;
      const tip = c.kind === "ok" ? `${x.name} · ${dShort(w.a)} — ${dShort(w.b)}: ${fmtR(c.act)} в день, норма ${fmtR(c.base)} → ${pct(c.dev)}`
        : c.kind === "low" ? `${x.name} · ${dShort(w.a)} — ${dShort(w.b)}: ${fmtR(c.act)} в день, норма ${fmtR(c.base)} — слишком мало для сравнения`
        : `${x.name} · ${dShort(w.a)} — ${dShort(w.b)}: ${fmtR(c.act)} в день, история короче двух недель — нормы ещё нет`;
      o += `<rect x="${(cx + gap / 2).toFixed(1)}" y="${y + gap / 2}" width="${(cw - gap).toFixed(1)}" height="${RH - gap}" rx="5" fill="${fillOf(c)}"><title>${escH(tip)}</title></rect>`;
      if (showTxt && c.kind === "ok") o += `<text class="chart-value" x="${(cx + cw / 2).toFixed(1)}" y="${y + RH / 2 + 4}" text-anchor="middle" font-size="12" fill="#e6e8ee" pointer-events="none">${c.dev <= -0.995 ? "0" : pct(c.dev)}</text>`;
      else if (showTxt && c.kind === "new") o += `<text class="chart-value" x="${(cx + cw / 2).toFixed(1)}" y="${y + RH / 2 + 4}" text-anchor="middle" font-size="11" fill="#7d8190" pointer-events="none">нов.</text>`;
    });
    const n = x.now, sx = W - 20 - SUMW;
    if (n.kind === "ok") {
      const col = n.dev <= -0.1 ? "#f7768e" : n.dev >= 0.1 ? "#76F0B6" : "#c0c6d4";
      o += `<rect x="${sx + 8}" y="${y + gap / 2}" width="${SUMW - 8}" height="${RH - gap}" rx="6" fill="${fillOf(n)}" fill-opacity=".9"><title>${escH(`${x.name} · последние 7 дней: ${fmtR(n.act)} в день, норма ${fmtR(n.base)} → ${pct(n.dev)}${x.streak ? ` · ниже нормы ${x.streak} ${wordForm(x.streak, ["неделю", "недели", "недель"])} подряд` : ""}`)}</title></rect>`;
      o += `<text class="norm-now" x="${sx + 8 + (SUMW - 8) / 2}" y="${y + RH / 2 + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="${col}" style="fill:${col}!important" pointer-events="none">${n.dev <= -0.995 ? "молчит" : pct(n.dev)}${x.streak >= 2 ? ` · ${x.streak} нед.` : ""}</text>`;
    } else o += `<text class="chart-value" x="${sx + 8 + (SUMW - 8) / 2}" y="${y + RH / 2 + 5}" text-anchor="middle" font-size="12" fill="#7d8190">${n.kind === "new" ? "новичок" : "мало данных"}</text>`;
  });
  // Легенда: шкала от −100% до +100%
  const ly = T + rowsN.length * RH + 34, lx = L, lw = 360;
  o += `<defs><linearGradient id="normLeg" x1="0" x2="1"><stop offset="0" stop-color="rgba(247,118,142,.9)"/><stop offset=".45" stop-color="rgba(160,168,190,.18)"/><stop offset=".55" stop-color="rgba(160,168,190,.18)"/><stop offset="1" stop-color="rgba(118,240,182,.64)"/></linearGradient></defs>`;
  o += `<rect x="${lx}" y="${ly}" width="${lw}" height="14" rx="7" fill="url(#normLeg)"/>`;
  [["−100%", 0], ["норма", .5], ["+100%", 1]].forEach(([t, p]) => { o += `<text class="chart-legend" x="${lx + lw * p}" y="${ly + 34}" text-anchor="${p === 0 ? "start" : p === 1 ? "end" : "middle"}" font-size="13" fill="#9aa0b0">${t}</text>`; });
  o += `<rect x="${lx + lw + 30}" y="${ly}" width="22" height="14" rx="4" fill="rgba(160,168,190,.13)"/><text class="chart-legend" x="${lx + lw + 60}" y="${ly + 12}" font-size="13" fill="#9aa0b0">мало сообщений или нет истории</text>`;
  const worst = rowsN.filter(x => x.now.kind === "ok" && x.now.dev <= -0.25).slice(0, 4);
  const note1 = worst.length ? `Сильнее всего притихли: ${worst.map(x => `${x.name} ${pct(x.now.dev)}`).join(", ")}.` : chats ? "Сейчас ни один чат заметно не притих." : "Сейчас никто заметно не притих — все в пределах своей нормы.";
  o += `<text class="chart-label" x="${lx}" y="${ly + 72}" font-size="15" fill="#e6e8ee">${escH(note1)}</text>`;
  o += `<text class="chart-legend" x="${lx}" y="${ly + 98}" font-size="13" fill="#7d8190">Норма — среднее в день за 8 недель до каждой недели. «Сейчас» — последние 7 дней.</text>`;
  o += `<text class="chart-legend" x="${lx}" y="${ly + 118}" font-size="13" fill="#7d8190">«N нед.» — сколько недель подряд ниже нормы на 25% и больше. Наведи на клетку, чтобы увидеть числа.</text>`;
  return `<svg class="norm-svg" viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
}

function seasonChart(){
  if (!allRows) return note("Загружаю историю…");
  const metric = $("metric").value, chat = $("chat").value;
  const src = pick(allRows, chat).filter(x => { const k = String(x[F.userId] ?? x[F.name]); return isVisibleUser(k) && (!SEL_ACTIVE || chartEntity === "chats" || SEL.has(k)); });
  const m = new Map(); let first = "9999", last = "0000";
  src.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10) return; const v = Number(g(x, metric)) || 0; if (d < first) first = d; if (d > last) last = d; m.set(d.slice(0, 7), (m.get(d.slice(0, 7)) || 0) + v); });
  if (first === "9999") return note("Нет данных");
  const today = iso(new Date()), r = cRange(), ref = (r && r[1] < today ? r[1] : today).slice(0, 4);
  const dim = (y, mo) => new Date(Date.UTC(+y, mo, 0)).getUTCDate();
  const full = (y, mo) => { const s2 = `${y}-${pad(mo)}-01`, e = `${y}-${pad(mo)}-${pad(dim(y, mo))}`; return s2 >= first && e <= today; };
  const rate = (y, mo) => { const k = `${y}-${pad(mo)}`, s2 = `${k}-01`; if (s2 > today || s2 < first.slice(0, 7) + "-01") return null; const end = `${k}-${pad(dim(y, mo))}`, days = end <= today ? dim(y, mo) : +today.slice(8); if (s2 < first) return null; return (m.get(k) || 0) / Math.max(1, days); };
  const years = [...new Set([...m.keys()].map(k => k.slice(0, 4)))].filter(y => y < ref).sort();
  const rows = Array.from({length:12}, (_, i) => {
    const mo = i + 1, prev = years.filter(y => full(y, mo)).map(y => rate(y, mo)).filter(v => v != null);
    const cur = rate(ref, mo);
    return {mo, cur, avg:prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null, min:prev.length ? Math.min(...prev) : null, max:prev.length ? Math.max(...prev) : null, n:prev.length};
  });
  if (!rows.some(x => x.avg != null)) return note("Для сезонности нужна история хотя бы за один прошлый год");
  const W = 900, L = 70, R = 880, T = 120, B = 440, H = 600, slot = (R - L) / 12;
  const mx = Math.max(1, ...rows.flatMap(x => [x.cur, x.max, x.avg].filter(v => v != null))), {max, step} = niceMax(mx), sy = v => B - v / max * (B - T);
  const st = chartPrefs("season"), c1 = st.seriesColors?.["season:cur"] || "#7aa2f7", c2 = st.seriesColors?.["season:avg"] || "#e0af68";
  const yrs = !years.length ? "" : years.length === 1 ? `${years[0]} год` : `${years[0]}–${years[years.length - 1]}`;
  let o = head(`Сезонность · ${ref}`, `${MLBL[metric]} в день: ${ref} против среднего за ${yrs}${chat ? " · " + chat : ""}`);
  for (let v = 0; v <= max + 1e-9; v += step) o += `<line x1="${L}" y1="${sy(v).toFixed(1)}" x2="${R}" y2="${sy(v).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.07"/><text class="chart-axis" x="${L - 10}" y="${(sy(v) + 5).toFixed(1)}" text-anchor="end" font-size="15" fill="#c0c6d4">${fmtR(v)}</text>`;
  rows.forEach((x, i) => {
    const cx = L + slot * i + slot / 2, bw = slot * .5;
    if (x.min != null) o += `<rect x="${(cx - bw / 2 - 6).toFixed(1)}" y="${sy(x.max).toFixed(1)}" width="${(bw + 12).toFixed(1)}" height="${Math.max(2, sy(x.min) - sy(x.max)).toFixed(1)}" rx="5" fill="${c2}" fill-opacity=".14"><title>${MONTHS[i]}: прошлые годы от ${fmtR(x.min)} до ${fmtR(x.max)} в день</title></rect>`;
    if (x.cur != null) o += `<rect class="anim-bar-y" style="animation-delay:${i * 30}ms" x="${(cx - bw / 2).toFixed(1)}" y="${sy(x.cur).toFixed(1)}" width="${bw.toFixed(1)}" height="${(B - sy(x.cur)).toFixed(1)}" rx="5" fill="${c1}"><title>${MONTHS[i]} ${ref}: ${fmtR(x.cur)} в день</title></rect>`;
    if (x.avg != null) o += `<line x1="${(cx - bw / 2 - 8).toFixed(1)}" y1="${sy(x.avg).toFixed(1)}" x2="${(cx + bw / 2 + 8).toFixed(1)}" y2="${sy(x.avg).toFixed(1)}" stroke="${c2}" stroke-width="4" stroke-linecap="round"><title>${MONTHS[i]}: в среднем ${fmtR(x.avg)} в день (${x.n} ${wordForm(x.n, ["год", "года", "лет"])})</title></line>`;
    if (x.cur != null && x.avg) { const d = Math.round((x.cur - x.avg) / x.avg * 100); o += `<text class="chart-value" x="${cx.toFixed(1)}" y="${(Math.min(sy(x.cur), sy(x.max ?? x.avg)) - 10).toFixed(1)}" text-anchor="middle" font-size="15" fill="${d >= 0 ? "#9ece6a" : "#f7768e"}">${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)}%</text>`; }
    o += `<text class="chart-axis" x="${cx.toFixed(1)}" y="${B + 26}" text-anchor="middle" font-size="16" fill="#c0c6d4">${MONTHS_SHORT_RU[i]}</text>`;
  });
  o += `<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="#dcdcdc" stroke-opacity=".6" stroke-width="2"/>`;
  const av = rows.filter(x => x.avg != null), top = [...av].sort((a, b) => b.avg - a.avg)[0], low = [...av].sort((a, b) => a.avg - b.avg)[0];
  const curM = rows.filter(x => x.cur != null && x.avg).pop();
  const lines = [];
  if (top) lines.push(`Обычно самый активный месяц — ${MONTHS[top.mo - 1].toLowerCase()}, самый тихий — ${MONTHS[low.mo - 1].toLowerCase()}.`);
  if (curM) { const d = Math.round((curM.cur - curM.avg) / curM.avg * 100); lines.push(`${MONTHS[curM.mo - 1]} ${ref}: ${d === 0 ? "как обычно" : `на ${Math.abs(d)}% ${d > 0 ? "активнее" : "тише"} обычного`} (${fmtR(curM.cur)} против ${fmtR(curM.avg)} в день).`); }
  let ly = B + 64, lx = L;
  const leg = (sw, t) => { o += sw(lx) + `<text class="chart-legend" x="${lx + 34}" y="${ly + 2}" font-size="15" fill="#c0c6d4">${escH(t)}</text>`; lx += 34 + t.length * 9.6 + 28; };
  leg(x => `<rect x="${x}" y="${ly - 12}" width="22" height="16" rx="3" fill="${c1}"/>`, ref);
  leg(x => `<line x1="${x}" y1="${ly - 4}" x2="${x + 24}" y2="${ly - 4}" stroke="${c2}" stroke-width="4" stroke-linecap="round"/>`, "среднее прошлых лет");
  leg(x => `<rect x="${x}" y="${ly - 12}" width="24" height="16" rx="3" fill="${c2}" fill-opacity=".22"/>`, "разброс прошлых лет");
  lines.forEach((t, i) => { o += `<text class="chart-label" x="${L}" y="${ly + 44 + i * 28}" font-size="17" fill="#e6e8ee">${escH(t)}</text>`; });
  return `<svg viewBox="0 0 ${W} ${ly + 44 + lines.length * 28}" role="img">${o}</svg>`;
}

/* ===================== Видео для графиков ===================== */
async function svgFrameKit(svg, prefs, outW){
  const vb = svgBaseBox(svg), W = vb.width, H = vb.height;
  let s = outW / W; if (H * s > 2160) s = 2160 / H;
  const CW = Math.round(W * s / 2) * 2, CH = Math.round(H * s / 2) * 2;
  const bgStart = prefs.backgroundStart || "#262626", bgEnd = prefs.backgroundEnd || bgStart;
  let bgDefs = "", bgPaint = bgStart;
  if (prefs.backgroundMode === "radial") { bgDefs = `<radialGradient id="vidBg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${bgStart}"/><stop offset="100%" stop-color="${bgEnd}"/></radialGradient>`; bgPaint = "url(#vidBg)"; }
  else if (prefs.backgroundMode !== "solid") {
    const a = Number(prefs.backgroundAngle ?? 135) * Math.PI / 180, dx = Math.sin(a) / 2, dy = -Math.cos(a) / 2;
    bgDefs = `<linearGradient id="vidBg" x1="${.5 - dx}" y1="${.5 - dy}" x2="${.5 + dx}" y2="${.5 + dy}"><stop offset="0%" stop-color="${bgStart}"/><stop offset="100%" stop-color="${bgEnd}"/></linearGradient>`; bgPaint = "url(#vidBg)";
  }
  const color = prefs.fontColor || chartFontColor;
  const extra = `<defs>${bgDefs}</defs><style>${await fontCss()}${prefs.keepTextColors ? "" : `text,tspan{fill:${color}!important}`}</style><rect width="${W}" height="${H}" fill="${bgPaint}"/>`;
  const c = stripInteractive(svg.cloneNode(true));
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", CW); c.setAttribute("height", CH);
  c.setAttribute("font-family", "'Samsung Sans','SamsungOne','Segoe UI',system-ui,sans-serif");
  c.querySelectorAll(".anim-bar-x,.anim-bar-y").forEach(e => e.classList.remove("anim-bar-x", "anim-bar-y"));
  const render = async ctx => {
    const xml = new XMLSerializer().serializeToString(c).replace(/<svg[^>]*>/, m => m + extra);
    const url = URL.createObjectURL(new Blob([xml], {type:"image/svg+xml"}));
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("не удалось отрисовать кадр")); img.src = url; });
      ctx.clearRect(0, 0, CW, CH); ctx.drawImage(img, 0, 0, CW, CH);
    } finally { URL.revokeObjectURL(url); }
  };
  return {c, W, H, CW, CH, render};
}
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
async function chartExportVideo(){
  const type = currentChartType(), btn = $("c-video"), msg = $("c-msg");
  if (type === "race") { $("race-video")?.click(); return; }
  const svg = document.querySelector("#c-out svg");
  if (!svg) { msg.textContent = "Сейчас нет графика"; return; }
  btn.disabled = true;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const K = await svgFrameKit(svg, chartPrefs(type), 1920), c = K.c;
    const canvas = document.createElement("canvas"); canvas.width = K.CW; canvas.height = K.CH;
    const ctx = canvas.getContext("2d");
    const fps = 30, main = fps * 6, total = main + Math.round(fps * 1.5);
    // Режим 1: календарь и спираль — дни заполняются по порядку.
    const dayEls = [...c.querySelectorAll("[data-day]")], days = [...new Set(dayEls.map(e => e.getAttribute("data-day")))].sort();
    let frameFn;
    if (days.length > 3) {
      const byDay = new Map(); dayEls.forEach(e => { const d = e.getAttribute("data-day"); (byDay.get(d) || byDay.set(d, []).get(d)).push(e); e.setAttribute("opacity", "0"); });
      let shown = 0;
      frameFn = p => { const n = Math.round(p * days.length); for (; shown < n; shown++) byDay.get(days[shown]).forEach(e => e.removeAttribute("opacity")); };
    } else {
      // Режим 2: проявление слева направо. Заголовки, оси и сетка видны сразу.
      const NS = "http://www.w3.org/2000/svg";
      let defs = c.querySelector("defs"); if (!defs) { defs = document.createElementNS(NS, "defs"); c.insertBefore(defs, c.firstChild); }
      const cp = document.createElementNS(NS, "clipPath"); cp.setAttribute("id", "vidReveal"); cp.setAttribute("clipPathUnits", "userSpaceOnUse");
      const cr = document.createElementNS(NS, "rect"); cr.setAttribute("x", "0"); cr.setAttribute("y", "0"); cr.setAttribute("height", String(K.H)); cr.setAttribute("width", "0");
      cp.appendChild(cr); defs.appendChild(cp);
      const keep = e => e.tagName === "defs" || e.tagName === "style" || e.matches?.(".chart-title,.chart-subtitle,.chart-axis") || (e.tagName === "line" && Number(e.getAttribute("stroke-opacity") || 1) < .7);
      [...c.children].forEach(e => { if (!keep(e)) e.setAttribute("clip-path", "url(#vidReveal)"); });
      frameFn = p => cr.setAttribute("width", (K.W * p).toFixed(1));
    }
    const drawAt = async f => { frameFn(f >= main ? 1 : easeIO(f / main)); await K.render(ctx); };
    const res = await raceEncode(canvas, total, fps, drawAt, q => { msg.textContent = `Создаю видео… ${Math.round(q * 100)}%`; });
    const r = cRange() || ["", ""];
    downloadBlob(res.blob, `chart_${type}_${r[0]}_${r[1]}.${res.ext}`);
    msg.textContent = res.ext === "mp4" ? "Видео MP4 сохранено" : "Видео WebM сохранено";
  } catch (e) { msg.textContent = "Не удалось создать видео: " + (e.message || e); }
  finally { btn.disabled = false; }
}
function downloadBlob(blob, name){ const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
$("c-video") && ($("c-video").onclick = chartExportVideo);

/* ===================== Видео-итоги года (1080×1920) ===================== */
const YV_FONT = '"Samsung Sans", "SamsungOne", "Segoe UI", system-ui, sans-serif';
function yvFit(ctx, text, weight, size, maxW){ let s2 = size; do { ctx.font = `${weight} ${s2}px ${YV_FONT}`; if (ctx.measureText(text).width <= maxW) break; s2 -= 2; } while (s2 > 14); return s2; }
function yvSlides(S, C, chatName){
  const slides = [];
  const best = S.months.map((m, i) => ({i, v:m.msgs})).sort((a, b) => b.v - a.v)[0];
  const bestDay = [...S.days.entries()].sort((a, b) => b[1].msgs - a[1].msgs)[0];
  slides.push({kind:"intro"});
  slides.push({kind:"totals"});
  if (S.T.msgs) slides.push({kind:"months", best});
  if (bestDay) slides.push({kind:"day", d:bestDay[0], v:bestDay[1].msgs});
  if (S.list.length) slides.push({kind:"top"});
  const cards = (() => { try {
    const d = document.createElement("div"); d.innerHTML = yrAwards(S, C, null);
    const q = (el, c2) => el.querySelector(c2)?.textContent.trim() || "";
    return [...d.querySelectorAll(".yr-award")].map(el => ({title:q(el, ".yr-award-title"), name:q(el, ".yr-award-name"), value:q(el, ".yr-award-value"), sub:q(el, ".yr-award-sub"), acc:(el.getAttribute("style") || "").match(/--acc:\s*([^;]+)/)?.[1]?.trim()})).filter(x => x.name && x.name !== "—");
  } catch (e) { return []; } })();
  for (let i = 0; i < Math.min(cards.length, 6); i += 3) slides.push({kind:"awards", cards:cards.slice(i, i + 3), part:i / 3 + 1, parts:Math.ceil(Math.min(cards.length, 6) / 3)});
  slides.push({kind:"outro"});
  return slides;
}
function yvDraw(ctx, S, chatName, slides, f, fps){
  const W = 1080, H = 1920, per = Math.round(fps * 3.6), idx = Math.min(slides.length - 1, Math.floor(f / per)), lf = f - idx * per, t = lf / per;
  const acc = yearHue(S.y), sl = slides[idx];
  const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3), grow = ease(lf / (fps * 1.4));
  // Фон
  const g2 = ctx.createLinearGradient(0, 0, W * .4, H); g2.addColorStop(0, "#14161d"); g2.addColorStop(1, "#0b0c10"); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = .22; const rg = ctx.createRadialGradient(W * .85, H * .12, 20, W * .85, H * .12, 900); rg.addColorStop(0, acc); rg.addColorStop(1, "transparent"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  const rg2 = ctx.createRadialGradient(W * .1, H * .92, 20, W * .1, H * .92, 800); rg2.addColorStop(0, acc); rg2.addColorStop(1, "transparent"); ctx.globalAlpha = .12; ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H); ctx.restore();
  // Прогресс-полоски сверху (как в сторис)
  const pw = (W - 80 - (slides.length - 1) * 10) / slides.length;
  slides.forEach((_, i) => { ctx.fillStyle = "rgba(255,255,255,.18)"; rrect(ctx, 40 + i * (pw + 10), 40, pw, 8, 4); ctx.fill(); const q = i < idx ? 1 : i > idx ? 0 : t; if (q) { ctx.fillStyle = "#fff"; rrect(ctx, 40 + i * (pw + 10), 40, pw * q, 8, 4); ctx.fill(); } });
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `600 34px ${YV_FONT}`; ctx.fillText(`Итоги ${S.y}${chatName ? " · " + chatName : ""}`, 60, 120);
  // Переход: появление снизу и затухание в конце слайда
  const inK = ease(lf / (fps * .45)), outK = idx < slides.length - 1 ? Math.max(0, (lf - (per - fps * .35)) / (fps * .35)) : 0;
  ctx.save(); ctx.globalAlpha = inK * (1 - outK); ctx.translate(0, (1 - inK) * 80 - outK * 60);
  const big = (txt, y, size, color = "#fff", weight = 800, align = "center") => { ctx.textAlign = align; ctx.fillStyle = color; yvFit(ctx, txt, weight, size, W - 120); ctx.fillText(txt, align === "center" ? W / 2 : 60, y); };
  const cnt = v => fmt(Math.round(v * grow));
  if (sl.kind === "intro") {
    big("ИТОГИ ГОДА", 640, 64, acc, 800);
    big(String(S.y), 900, 300, "#fff", 900);
    big(chatName || "Все чаты", 1020, 50, "rgba(255,255,255,.75)", 600);
    big(cnt(S.T.msgs), 1300, 150, "#fff", 900);
    big("сообщений за год", 1380, 48, "rgba(255,255,255,.7)", 500);
  } else if (sl.kind === "totals") {
    big("Год в цифрах", 330, 80);
    const items = [["Сообщения", S.T.msgs, "#7aa2f7"], ["Стикеры", S.T.stick, "#bb9af7"], ["Голосовые", S.T.voice, "#e0af68"], ["Видеосообщения", S.T.video, "#f7768e"], ["Активных дней", S.activeDays, "#9ece6a"], ["Участников", S.list.length, "#73daca"]];
    items.forEach(([l, v, c2], i) => {
      const y = 470 + i * 220, k = ease((lf - i * 4) / (fps * .5));
      ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - k) * 60, 0);
      ctx.fillStyle = "rgba(255,255,255,.06)"; rrect(ctx, 60, y, W - 120, 180, 28); ctx.fill();
      ctx.fillStyle = c2; rrect(ctx, 60, y, 14, 180, 7); ctx.fill();
      ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 40px ${YV_FONT}`; ctx.fillText(l, 110, y + 70);
      ctx.fillStyle = "#fff"; ctx.font = `900 76px ${YV_FONT}`; ctx.fillText(cnt(v), 110, y + 150);
      ctx.restore();
    });
  } else if (sl.kind === "months") {
    big("По месяцам", 330, 80);
    big(`Лучший месяц — ${MONTHS[sl.best.i].toLowerCase()}`, 420, 46, acc, 700);
    const mx = Math.max(1, ...S.months.map(m => m.msgs)), L = 90, R = W - 60, B = 1560, Tp = 560, bw = (R - L) / 12;
    S.months.forEach((m, i) => {
      const k = ease((lf - i * 2) / (fps * 1.1)), h = (B - Tp) * m.msgs / mx * k, x = L + i * bw + 8;
      ctx.fillStyle = i === sl.best.i ? acc : "rgba(255,255,255,.28)"; rrect(ctx, x, B - h, bw - 16, Math.max(2, h), 12); ctx.fill();
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 30px ${YV_FONT}`; ctx.fillText(MONTHS_SHORT_RU[i], x + (bw - 16) / 2, B + 50);
      if (i === sl.best.i && m.msgs) { ctx.fillStyle = "#fff"; ctx.font = `800 34px ${YV_FONT}`; ctx.fillText(fmt(Math.round(m.msgs * k)), x + (bw - 16) / 2, B - h - 20); }
    });
  } else if (sl.kind === "day") {
    big("Самый активный день", 560, 70);
    big(yrDayRu(sl.d), 900, 150, acc, 900);
    big(cnt(sl.v), 1180, 190, "#fff", 900);
    big("сообщений за один день", 1270, 48, "rgba(255,255,255,.7)", 500);
    const avg = S.span ? S.T.msgs / S.span : 0;
    if (avg) big(`в ${fmtR(sl.v / avg)} раза больше обычного дня`, 1400, 40, "rgba(255,255,255,.55)", 500);
  } else if (sl.kind === "top") {
    big("Топ-5 участников", 330, 80);
    const top = S.list.slice(0, 5), mx = Math.max(1, top[0].msgs);
    top.forEach((u, i) => {
      const y = 480 + i * 230, k = ease((lf - i * 5) / (fps * 1.1)), c2 = getStyle("u", u.pk).c[0];
      ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.font = `900 64px ${YV_FONT}`; ctx.fillText(String(i + 1), 60, y + 70);
      ctx.fillStyle = "#fff"; yvFit(ctx, u.name, 700, 48, W - 300); ctx.fillText(u.name, 140, y + 50);
      ctx.fillStyle = "rgba(255,255,255,.08)"; rrect(ctx, 140, y + 80, W - 200, 46, 23); ctx.fill();
      ctx.fillStyle = c2; rrect(ctx, 140, y + 80, Math.max(46, (W - 200) * u.msgs / mx * k), 46, 23); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = `700 36px ${YV_FONT}`; ctx.fillText(`${fmt(Math.round(u.msgs * k))} сообщений · ${S.T.msgs ? Math.round(u.msgs / S.T.msgs * 100) : 0}%`, 140, y + 172);
    });
  } else if (sl.kind === "awards") {
    big(sl.parts > 1 ? `Награды года · ${sl.part}/${sl.parts}` : "Награды года", 330, 76);
    sl.cards.forEach((cd, i) => {
      const y = 430 + i * 420, k = ease((lf - i * 6) / (fps * .6));
      ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 50);
      ctx.fillStyle = "rgba(255,255,255,.07)"; rrect(ctx, 60, y, W - 120, 370, 34); ctx.fill();
      ctx.fillStyle = cd.acc || acc; rrect(ctx, 60, y, W - 120, 12, 6); ctx.fill();
      ctx.textAlign = "left"; ctx.fillStyle = cd.acc || acc; ctx.font = `800 44px ${YV_FONT}`; ctx.fillText(`🏆 ${cd.title}`, 100, y + 90);
      ctx.fillStyle = "rgba(255,255,255,.55)"; yvFit(ctx, cd.sub || "", 500, 32, W - 200); ctx.fillText(cd.sub || "", 100, y + 140);
      ctx.fillStyle = "#fff"; yvFit(ctx, cd.name, 900, 72, W - 200); ctx.fillText(cd.name, 100, y + 240);
      ctx.fillStyle = "rgba(255,255,255,.8)"; yvFit(ctx, String(cd.value || ""), 600, 38, W - 200); ctx.fillText(String(cd.value || ""), 100, y + 310);
      ctx.restore();
    });
  } else if (sl.kind === "outro") {
    big("Спасибо за", 760, 80, "rgba(255,255,255,.8)", 700);
    big(`${S.y} год!`, 940, 170, acc, 900);
    big(`${fmt(S.list.length)} участников · ${fmt(S.activeDays)} активных дней`, 1120, 44, "rgba(255,255,255,.7)", 500);
    big("Colony Stats", 1700, 40, "rgba(255,255,255,.4)", 600);
  }
  ctx.restore();
}
async function yrExportVideo(){
  const btn = $("yr-video"), msg = $("yr-video-msg");
  if (!allRows || !btn) return;
  btn.disabled = true;
  const ov = document.createElement("div"); ov.className = "yv-overlay"; ov.innerHTML = `<div class="yv-box"><div class="yv-prog">Готовлю видео…</div></div>`;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const S = yrStats(YR.year, YR.chat, null), years = yrYears(), C = years.includes(String(+YR.year - 1)) ? yrStats(String(+YR.year - 1), YR.chat, null) : null;
    const slides = yvSlides(S, C, YR.chat), fps = 30, per = Math.round(fps * 3.6), total = slides.length * per;
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    ov.querySelector(".yv-box").prepend(canvas); document.body.appendChild(ov);
    const res = await raceEncode(canvas, total, fps, f => yvDraw(ctx, S, YR.chat, slides, f, fps), q => { const t2 = `Создаю видео… ${Math.round(q * 100)}%`; msg.textContent = t2; ov.querySelector(".yv-prog").textContent = t2; });
    downloadBlob(res.blob, `year_${S.y}.${res.ext}`);
    msg.textContent = res.ext === "mp4" ? "Видео MP4 сохранено" : "Видео WebM сохранено";
  } catch (e) { msg.textContent = "Не удалось создать видео: " + (e.message || e); }
  finally { btn.disabled = false; ov.remove(); }
}
$("yr-video") && ($("yr-video").onclick = yrExportVideo);

/* ===================== Цифры-счётчики: от прошлого значения к новому ===================== */
const NUM_MEM = new Map();
function numKey(el){
  const sec = el.closest("section.tab")?.id || "";
  const row = el.closest("tr[data-row-key]");
  if (row) return `${sec}|${row.closest("tbody")?.id}|${row.dataset.rowKey}|${el.cellIndex}`;
  const box = el.closest(".tile, .p-stat, .cmp-card, .goal-card");
  const lbl = box?.querySelector(".lbl, span, h3")?.textContent || "";
  return `${sec}|${el.className}|${lbl}`;
}
function parseNum(txt){
  const m = txt.match(/^([^\d−-]*?)(\d[\d\s  ]*(?:,\d+)?)(\D*)$/);
  if (!m || /^[.:\/]/.test(m[3])) return null;
  const v = Number(m[2].replace(/[\s  ]/g, "").replace(",", "."));
  return isFinite(v) && v <= 1e9 ? {pre:m[1], v, dec:(m[2].split(",")[1] || "").length, post:m[3]} : null;
}
function animateNumber(el, opt = {}){
  if (el.dataset.animated || el.childNodes.length !== 1 || el.firstChild.nodeType !== Node.TEXT_NODE) return;
  const txt = el.textContent, P = parseNum(txt); if (!P) return;
  const key = opt.key || numKey(el), prev = NUM_MEM.get(key); NUM_MEM.set(key, P.v);
  if (REDUCED_MOTION) return;
  const from = prev != null ? prev : opt.fromZero === false ? null : 0;
  if (from == null || from === P.v || (from === 0 && !(P.v > 0))) return;
  const t0 = performance.now(), dur = prev != null ? 600 : 700;
  el.dataset.animated = "1";
  // Итоговое число — чтобы картинка, скопированная во время перехода, получила настоящее значение
  el.dataset.numFinal = txt;
  const step = now => {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    if (k >= 1) { el.textContent = txt; delete el.dataset.numFinal; return; }
    el.textContent = P.pre + (from + (P.v - from) * e).toLocaleString("ru-RU", {minimumFractionDigits:P.dec, maximumFractionDigits:P.dec}) + P.post;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const NUM_SEL = ".tile .num, .p-stat b, .dm-grand, .cmp-total, .cmp-v, .goal-main";
new MutationObserver(records => {
  for (const r of records) for (const n of r.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.matches?.(NUM_SEL)) animateNumber(n);
    n.querySelectorAll?.(NUM_SEL).forEach(e => animateNumber(e));
    // Ячейки таблиц: анимируем только изменение, без отсчёта с нуля при первой загрузке.
    if (n.tagName === "TR" && n.dataset.rowKey) [...n.cells].forEach((c, i) => i && animateNumber(c, {fromZero:false}));
  }
}).__hub(document.querySelector("main"));

/* ===================== Плавные переходы: строки таблиц ===================== */
function flipRows(tbody){
  if (!tbody) return;
  const mem = new Map();
  new MutationObserver(() => {
    const rows = [...tbody.querySelectorAll("tr[data-row-key]")];
    if (!rows.length) return;
    if (!tbody.offsetParent) { mem.clear(); return; }
    const now = new Map(rows.map(r => [r.dataset.rowKey, r.offsetTop]));
    if (!REDUCED_MOTION && mem.size) rows.forEach((r, i) => {
      const o = mem.get(r.dataset.rowKey), n = now.get(r.dataset.rowKey);
      if (o == null) r.animate([{opacity:0}, {opacity:1}], {duration:380, delay:Math.min(i, 12) * 15, easing:"ease-out", fill:"backwards"});
      else if (Math.abs(o - n) > 1) r.animate([{transform:`translateY(${o - n}px)`}, {transform:"none"}], {duration:520, easing:"cubic-bezier(.2,.8,.2,1)"});
    });
    mem.clear(); now.forEach((v, k) => mem.set(k, v));
  }).observe(tbody, {childList:true});
}
["body", "chat-rank-body"].forEach(id => flipRows($(id)));

/* ===================== Плавные переходы: столбцы на графике ===================== */
(function(){
  const out = $("c-out"); if (!out) return;
  let prevSvg = null, prevType = null;
  const keyOf = e => `${e.tagName}|${e.getAttribute("class") || ""}|${e.getAttribute("data-ek")}`;
  new MutationObserver(() => {
    const svg = out.querySelector(":scope > svg, :scope svg");
    if (!svg || svg === prevSvg) return;
    const type = cType;
    if (prevSvg && prevType === type && type === "bars" && !REDUCED_MOTION) {
      const old = new Map(); prevSvg.querySelectorAll("[data-ek]").forEach(e => { const k = keyOf(e); if (!old.has(k)) old.set(k, e); });
      svg.querySelectorAll("[data-ek]").forEach(e => {
        const k = keyOf(e), o = old.get(k); if (!o) return;
        const ox = +o.getAttribute("x") || 0, oy = +o.getAttribute("y") || 0, nx = +e.getAttribute("x") || 0, ny = +e.getAttribute("y") || 0;
        const isBar = e.tagName === "rect" && e.classList.contains("anim-bar-x");
        if (isBar) {
          e.classList.remove("anim-bar-x"); e.style.animationDelay = "";
          const ow = +o.getAttribute("width") || 0, nw = +e.getAttribute("width") || 1;
          e.style.transformBox = "fill-box"; e.style.transformOrigin = "0 50%";
          e.animate([{transform:`translate(${ox - nx}px,${oy - ny}px) scaleX(${Math.max(.001, ow / nw)})`}, {transform:"none"}], {duration:650, easing:"cubic-bezier(.2,.8,.2,1)"});
        } else if (ox !== nx || oy !== ny) e.animate([{transform:`translate(${ox - nx}px,${oy - ny}px)`}, {transform:"none"}], {duration:650, easing:"cubic-bezier(.2,.8,.2,1)"});
        if (e.tagName === "text" && e.classList.contains("chart-value")) {
          const a = parseNum(o.textContent || ""); if (a) NUM_MEM.set("bars|" + k, a.v);
          animateNumber(e, {key:"bars|" + k, fromZero:false});
        }
      });
    } else svg.querySelectorAll("text.chart-value[data-ek]").forEach(e => { const a = parseNum(e.textContent || ""); if (a) NUM_MEM.set("bars|" + keyOf(e), a.v); });
    prevSvg = svg; prevType = type;
  }).observe(out, {childList:true, subtree:true});
})();

/* ===================== Автообновление ===================== */
const LIVE_KEY = "chatstats.live.v1";
var LIVE = false, LIVE_EVERY = 0, LIVE_BUSY = false, liveTimer = null;
try { LIVE_EVERY = [0, 1, 5, 15].includes(+localStorage.getItem(LIVE_KEY)) ? +localStorage.getItem(LIVE_KEY) : 0; } catch (e) {}
function liveRanks(){
  if (!rows || !rows.length) return null;
  const m = aggregateParticipants(rows);
  return new Map([...m.values()].sort((a, b) => b.msgs - a.msgs).map((u, i) => [u.key, {i, name:u.name, v:u.msgs}]));
}
async function liveTick(){
  if (!LIVE_EVERY || LIVE_BUSY || document.hidden) return;
  const tab = activeDataTab();
  LIVE_BUSY = true; $("live-dot")?.classList.add("busy");
  const before = liveRanks();
  try {
    // История: догружаем только последние дни и пересчитываем без сброса экрана.
    if (rawHist) {
      const today = iso(new Date()), last = rawHist.reduce((m, x) => { const d = String(x[F.date] ?? "").slice(0, 10); return d > m ? d : m; }, ""), from = addDaysIso(last || today, -2);
      const fresh = await fetchAll(from, today);
      rawHist = rawHist.filter(x => String(x[F.date] ?? "").slice(0, 10) < from).concat(fresh);
      allRows = ultView(rawHist); histP = Promise.resolve(allRows);
      histSave(rawHist, today);
    }
    LIVE = true;
    if (["participants", "chats", "charts"].includes(tab)) await load();
    else if (tab === "profile") renderProfile();
    else if (tab === "forecast") renderForecast();
    else if (tab === "yearreview") renderYearReviewSync();
    stamp();
    const after = liveRanks();
    if (before && after) {
      const up = [];
      after.forEach((a, k) => { const b = before.get(k); if (b && a.i < b.i) up.push(k); });
      if (up.length) {
        up.forEach(k => document.querySelectorAll(`tr[data-row-key="${CSS.escape(k)}"]`).forEach(r => { r.classList.remove("live-up"); void r.offsetWidth; r.classList.add("live-up"); }));
        const msgs = [];
        up.forEach(k => { const a = after.get(k), b = before.get(k); after.forEach((x, k2) => { const y = before.get(k2); if (k2 !== k && y && y.i < b.i && x.i > a.i) msgs.push(`${a.name} и ${x.name} поменялись местами`); }); });
        if (msgs.length) toastMsg("⚡ " + msgs.slice(0, 3).join(" · ") + (msgs.length > 3 ? ` и ещё ${msgs.length - 3}` : ""));
      }
    }
  } catch (e) { /* тихо: следующая попытка через интервал */ }
  finally { LIVE = false; LIVE_BUSY = false; $("live-dot")?.classList.remove("busy"); }
}
function liveApply(){
  clearInterval(liveTimer); liveTimer = null;
  const dot = $("live-dot"); if (dot) { dot.hidden = !LIVE_EVERY; dot.title = LIVE_EVERY ? `Автообновление каждые ${LIVE_EVERY} мин` : ""; }
  if (LIVE_EVERY) liveTimer = setInterval(liveTick, LIVE_EVERY * 60000);
}
(function(){
  const s = $("live-every"); if (!s) return;
  s.value = String(LIVE_EVERY);
  s.onchange = () => { LIVE_EVERY = +s.value; try { localStorage.setItem(LIVE_KEY, String(LIVE_EVERY)); } catch (e) {} liveApply(); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden && LIVE_EVERY) liveTick(); });
  liveApply();
})();

/* ===================== Новые графики: места, разброс, концентрация, маленькие графики ===================== */
// Всё объявлено через function/var: renderCharts может вызваться раньше, чем исполнится этот блок.
var CHART_HOVER = null;
var CHART_NORM_TYPES = ["bars", "trend", "bump", "multiples"];
var EV_FLAG = "#ffd166", EV_MAR_PAL = ["#9ece6a", "#2ac3de", "#bb9af7", "#ff9e64", "#73daca", "#f7768e"];
function syncChartNormField(type){
  const f = $("f-norm"); if (!f) return;
  // список может быть ещё не задан, если график рисуется в самом начале загрузки
  f.hidden = $("tab-charts").classList.contains("active") && !(CHART_NORM_TYPES || ["bars", "trend", "bump", "multiples"]).includes(type || cType);
}
try { const nw = localStorage.getItem(NORM_WEEKS_KEY); if (nw && $("norm-weeks")?.querySelector(`option[value="${nw}"]`)) $("norm-weeks").value = nw; } catch (e) {}
$("norm-weeks")?.addEventListener("change", () => { try { localStorage.setItem(NORM_WEEKS_KEY, $("norm-weeks").value); } catch (e) {} renderCharts(); });
["bump-mode", "spread-zero", "spread-scale", "mult-scale", "chart-events", "trend-forecast"].forEach(id => { const el = $(id); if (el) el.addEventListener("change", () => renderCharts()); });
document.querySelectorAll("nav button[data-tab]").forEach(b => b.addEventListener("click", () => {
  const f = $("f-norm"); if (f) f.hidden = b.dataset.tab === "charts" && !CHART_NORM_TYPES.includes(cType);
}));

/* ---------- «Выделить»: выбранные линии / строки яркие, остальные затемнены (можно несколько) ---------- */
var CHART_FOCUS = new Set();
try {
  const raw = localStorage.getItem("chatstats.chartFocus.v1") || "";
  if (raw.startsWith("[")) JSON.parse(raw).forEach(n => CHART_FOCUS.add(String(n))); else if (raw) CHART_FOCUS.add(raw); // раньше хранилось одно имя
} catch (e) {}
const saveChartFocus = () => { try { localStorage.setItem("chatstats.chartFocus.v1", JSON.stringify([...CHART_FOCUS])); } catch (e) {} };
function chartFocusOn(names){ return [...CHART_FOCUS].some(n => names.includes(n)); }
function applyChartFocus(){
  const svg = $("c-out")?.querySelector("svg"); if (!svg) return;
  const names = [...new Set([...svg.querySelectorAll("[data-n]")].map(x => x.dataset.n).filter(Boolean))];
  const on = chartFocusOn(names);
  // Инлайн-прозрачность (а не класс), чтобы выделение попадало и в скачанную картинку.
  svg.querySelectorAll("[data-n]").forEach(x => { if (on && !CHART_FOCUS.has(x.dataset.n)) x.style.opacity = ".13"; else x.style.removeProperty("opacity"); });
}
function chartFocusSummary(names){
  const act = names.filter(n => CHART_FOCUS.has(n));
  const sum = $("c-focus-sum"); if (!sum) return;
  sum.textContent = !act.length ? "Никого" : act.length <= 2 ? act.join(", ") : `${act.slice(0, 2).join(", ")} и ещё ${act.length - 2}`;
}
function syncChartFocus(){
  const list = $("c-focus-list"), field = $("c-focus-field"), svg = $("c-out")?.querySelector("svg");
  if (!list || !field) return;
  const names = svg ? [...new Set([...svg.querySelectorAll("[data-n]")].map(x => x.dataset.n).filter(Boolean))] : [];
  field.hidden = names.length < 2;
  const word = cType === "years" || cType === "bumpyears" ? "годы" : chartEntity === "chats" ? "чаты" : "участников";
  $("c-focus").title = `Выделить ${word}: отметь одного или нескольких`;
  // Если выделенных нет на этом графике — выделение не применяется, но запоминается.
  list.innerHTML = names.map(n => `<label><input type="checkbox" value="${escH(n)}"${CHART_FOCUS.has(n) ? " checked" : ""}>${escH(n)}</label>`).join("");
  chartFocusSummary(names);
  if (chartFocusOn(names)) applyChartFocus();
}
$("c-focus-list")?.addEventListener("change", e => {
  const cb = e.target.closest?.("input[type=checkbox]"); if (!cb) return;
  cb.checked ? CHART_FOCUS.add(cb.value) : CHART_FOCUS.delete(cb.value);
  saveChartFocus();
  // Смена выделения не должна заново проигрывать анимацию появления линий.
  $("c-out")?.querySelector("svg")?.classList.add("focus-static");
  applyChartFocus();
  const svg = $("c-out")?.querySelector("svg");
  chartFocusSummary(svg ? [...new Set([...svg.querySelectorAll("[data-n]")].map(x => x.dataset.n).filter(Boolean))] : []);
});
$("c-focus-clear")?.addEventListener("click", e => {
  e.preventDefault(); CHART_FOCUS.clear(); saveChartFocus();
  $("c-focus-list")?.querySelectorAll("input").forEach(i => i.checked = false);
  $("c-out")?.querySelector("svg")?.classList.add("focus-static");
  applyChartFocus(); chartFocusSummary([]);
});

/* ---------- Общие данные: значения по дням для каждого участника или чата ---------- */
function chartDaily(ignoreSel = false){
  const r = cRange(); if (!r) return {err:"Выберите период"};
  const chats = chartEntity === "chats", metric = $("metric").value;
  const src = chats ? chartChatRows(cRows()) : cScoped();
  let dmin = "9999-99-99", dmax = "";
  src.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d.length === 10 && d >= r[0] && d <= r[1]) { if (d < dmin) dmin = d; if (d > dmax) dmax = d; } });
  if (dmin === "9999-99-99") return {err:"Нет данных за выбранный период"};
  // Конец — последний день, за который уже есть данные: иначе в конце графиков «провал» до нуля за ещё не посчитанные дни.
  const todayIso = iso(now), lastIso = dmax && dmax < todayIso ? dmax : todayIso, from = r[0] > dmin ? r[0] : dmin, to = r[1] < lastIso ? r[1] : lastIso;
  const n = dayIdx(to) - dayIdx(from) + 1; if (n < 1) return {err:"Этот период ещё не начался"};
  const d0 = dayIdx(from), ents = new Map();
  src.forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10 || d < from || d > to) return;
    const k = chats ? String(x[F.chatPk] ?? x[F.chat]) : String(x[F.userId] ?? x[F.name]);
    if (!chats && (!isVisibleUser(k) || (!ignoreSel && SEL_ACTIVE && !SEL.has(k)))) return;
    let e = ents.get(k); if (!e) ents.set(k, e = {k, n: chats ? String(x[F.chat] || `Чат ${k}`) : who(x), a:new Float64Array(n), tot:0});
    const v = Number(g(x, metric)) || 0; e.a[dayIdx(d) - d0] += v; e.tot += v;
  });
  const list = [...ents.values()].filter(e => e.tot > 0).sort((a, b) => b.tot - a.tot);
  if (!list.length) return {err:"Нет данных за выбранный период"};
  return {from, to, n, d0, list, metric, chats, date:i => addDaysIso(from, i)};
}
// Деление периода на отрезки: дни, недели или месяцы.
function chartBuckets(from, n, maxBuckets = 40, forceKind = null){
  if (forceKind === "y") {
    // Один столбец — один календарный год (первый и последний годы могут быть неполными).
    const y0 = +from.slice(0, 4), to = addDaysIso(from, n - 1), count = +to.slice(0, 4) - y0 + 1;
    const start = b => { const s = `${y0 + b}-01-01`; return s < from ? from : s; };
    const end = b => b >= count - 1 ? to : `${y0 + b}-12-31`;
    const idx = new Int32Array(n); let yy = y0, next = `${y0 + 1}-01-01`;
    for (let i = 0; i < n; i++) { const d = addDaysIso(from, i); while (d >= next) { yy++; next = `${yy + 1}-01-01`; } idx[i] = yy - y0; }
    const dShort = d => `${+d.slice(8, 10)} ${MONTHS_SHORT_RU[+d.slice(5, 7) - 1]}`;
    const full = b => { const s = start(b), e = end(b), y = y0 + b; return s.slice(5) === "01-01" && e.slice(5) === "12-31" ? `${y} год` : `${y} год (${dShort(s)} — ${dShort(e)})`; };
    return {kind:"y", count, idx, start, end, label:b => String(y0 + b), full, word:"годам"};
  }
  const kind = n <= Math.min(maxBuckets, 45) ? "d" : n <= maxBuckets * 7 ? "w" : "m";
  const d0 = dayIdx(from), y0 = +from.slice(0, 4), m0 = +from.slice(5, 7) - 1;
  const of = i => kind === "d" ? i : kind === "w" ? Math.floor(i / 7) : (() => { const d = addDaysIso(from, i); return (+d.slice(0, 4) - y0) * 12 + (+d.slice(5, 7) - 1 - m0); })();
  const count = of(n - 1) + 1;
  const start = b => kind === "d" ? addDaysIso(from, b) : kind === "w" ? addDaysIso(from, b * 7) : (() => { const t = new Date(Date.UTC(y0, m0 + b, 1)); const s = t.toISOString().slice(0, 10); return s < from ? from : s; })();
  const end = b => b >= count - 1 ? addDaysIso(from, n - 1) : addDaysIso(start(b + 1), -1);
  const dShort = d => `${+d.slice(8, 10)} ${MONTHS_SHORT_RU[+d.slice(5, 7) - 1]}`;
  const label = b => { const s = start(b); return kind === "m" ? (s.slice(5, 7) === "01" || b === 0 ? `${MONTHS_SHORT_RU[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : MONTHS_SHORT_RU[+s.slice(5, 7) - 1]) : dShort(s); };
  const full = b => { const s = start(b), e = end(b); return kind === "d" ? formatDateRu(parseDate(s)) : kind === "w" ? `${dShort(s)} — ${dShort(e)} ${e.slice(0, 4)}` : `${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`; };
  const idx = new Int32Array(n); for (let i = 0; i < n; i++) idx[i] = of(i);
  return {kind, count, idx, start, end, label, full, word: kind === "d" ? "дням" : kind === "w" ? "неделям" : "месяцам"};
}
function bucketSums(a, B){
  const s = new Float64Array(B.count), act = new Int32Array(B.count);
  for (let i = 0; i < a.length; i++) { s[B.idx[i]] += a[i]; if (a[i] > 0) act[B.idx[i]]++; }
  return {s, act};
}
function shortName(n, max = 16){ n = String(n); return n.length > max ? n.slice(0, max - 1) + "…" : n; }
function axisEvery(count, px, need = 64){ return Math.max(1, Math.ceil(need / Math.max(1, px / Math.max(1, count)))); }

/* ---------- События на оси времени: марафоны и хроника ---------- */
function chartEventsFor(from, to, pks){
  const modeE = $("chart-events") && !$("chart-events-field")?.hidden ? $("chart-events").value : "none";
  if (modeE === "none" || !from || !to) return null;
  const bands = (typeof MARATHONS !== "undefined" ? MARATHONS : []).map((m, i) => ({name:m.name, from:m.from > from ? m.from : from, to:m.to < to ? m.to : to, rf:m.from, rt:m.to, color:EV_MAR_PAL[i % EV_MAR_PAL.length]}))
    .filter(b => b.from <= b.to && /^\d{4}-\d{2}-\d{2}$/.test(b.from));
  let flags = [];
  if (modeE === "all" && allRows && window.__chron) {
    try {
      const PR = {chat:0, lead:1, streak:2, rec:3, join:4, ach:5};
      const want = pks ? new Set(pks.map(String)) : null, chats = chartEntity === "chats";
      const ev = window.__chron.chronicle(window.__chron.model())
        .filter(e => e.date >= from && e.date <= to && (e.pk == null || (!chats && (want ? want.has(String(e.pk)) : e.type === "lead"))))
        .sort((a, b) => (PR[a.type] ?? 9) - (PR[b.type] ?? 9) || a.date.localeCompare(b.date));
      const byDay = new Map();
      ev.forEach(e => { let f = byDay.get(e.date); if (!f) { if (byDay.size >= 24) return; byDay.set(e.date, f = {d:e.date, items:[]}); } if (f.items.length < 4) f.items.push(`${e.ic || "•"} ${e.name ? e.name + " — " : ""}${e.text}`); });
      flags = [...byDay.values()].sort((a, b) => a.d.localeCompare(b.d));
    } catch (e) { console.error(e); }
  }
  return {bands, flags};
}
function chartEventNote(evs, d, d2 = d){
  if (!evs) return "";
  let h = "";
  evs.bands.forEach(b => { if (d2 >= b.from && d <= b.to) h += tipRow(`<i style="background:${b.color}"></i>${escH(b.name)}`, `${+b.rf.slice(8)}.${b.rf.slice(5, 7)} — ${+b.rt.slice(8)}.${b.rt.slice(5, 7)}`); });
  evs.flags.filter(x => x.d >= d && x.d <= d2).forEach(f => f.items.forEach(t => { h += `<div class="tr"><em>${escH(t)}</em><span></span></div>`; }));
  return h;
}
// Рисует полосы марафонов и флажки событий. xOf(date) → координата; T..B — высота области.
function chartEventsSvg(evs, xOf, T, B, R, opts = {}){
  if (!evs) return {svg:"", notes:() => ""};
  let o = "";
  const dayW = Math.max(2, opts.dayW || 0);
  evs.bands.forEach(b => {
    const x0 = xOf(b.from), x1 = Math.max(x0 + 3, xOf(b.to) + dayW);
    o += `<rect x="${x0.toFixed(1)}" y="${T}" width="${(x1 - x0).toFixed(1)}" height="${B - T}" fill="${b.color}" fill-opacity=".10" pointer-events="none"/><line x1="${x0.toFixed(1)}" y1="${T}" x2="${x1.toFixed(1)}" y2="${T}" stroke="${b.color}" stroke-width="3" stroke-opacity=".8" pointer-events="none"/>`;
    if (!opts.noLabels && x1 - x0 > 46) o += `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${T + 16}" text-anchor="middle" font-size="12" fill="${b.color}" pointer-events="none">${escH(shortName(b.name.replace(/^Марафон\s*/i, "").replace(/\s*марафон/i, ""), Math.max(4, Math.floor((x1 - x0) / 7))))}</text>`;
  });
  if (!opts.noFlags) evs.flags.forEach(f => {
    const x = xOf(f.d) + dayW / 2;
    o += `<line x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${B}" stroke="${EV_FLAG}" stroke-opacity=".45" stroke-width="1.2" stroke-dasharray="3 4" pointer-events="none"/><path d="M${x.toFixed(1)},${T - 2} l5,-6 l-5,-6 l-5,6 z" fill="${EV_FLAG}" data-tip="${escH(formatDateRu(parseDate(f.d)))}|${escH(f.items.join(" · "))}" style="cursor:help"/>`;
  });
  return {svg:o, notes:d => chartEventNote(evs, d)};
}

/* ---------- График мест (bump chart) ---------- */
function bumpChart(){
  // Места считаются среди всех участников (как в подсказке и таблицах), выбор влияет только на то, кого показывать.
  const D = chartDaily(true); if (D.err) return note(D.err);
  const B = chartBuckets(D.from, D.n, 30);
  if (B.count < 2) return note("Для графика мест нужен период хотя бы из двух дней");
  const cum = $("bump-mode").value !== "each", kindKey = chartStyleKind();
  const vals = D.list.map(e => {
    const {s, act} = bucketSums(e.a, B), v = new Float64Array(B.count), raw = new Float64Array(B.count);
    let cs = 0, ca = 0;
    for (let b = 0; b < B.count; b++) {
      cs += s[b]; ca += act[b];
      const sum = cum ? cs : s[b], days = cum ? ca : act[b];
      raw[b] = sum; v[b] = NORM === "day" ? (days ? sum / days : 0) : sum;
    }
    return {e, v, raw, rk:new Array(B.count).fill(null), fr:null};
  });
  const totals = new Float64Array(B.count);
  for (let b = 0; b < B.count; b++) {
    const order = vals.filter(x => x.v[b] > 0).sort((p, q) => q.v[b] - p.v[b]);
    order.forEach((x, k) => { x.rk[b] = k > 0 && x.v[b] === order[k - 1].v[b] ? order[k - 1].rk[b] : k + 1; });
    vals.forEach(x => totals[b] += x.raw[b]);
  }
  vals.forEach(x => { let act = 0; for (const v of x.e.a) if (v > 0) act++; x.fv = NORM === "day" ? (act ? x.e.tot / act : 0) : x.e.tot; });
  const fo = vals.filter(x => x.fv > 0).sort((p, q) => q.fv - p.fv);
  fo.forEach((x, k) => { x.fr = k > 0 && x.fv === fo[k - 1].fv ? fo[k - 1].fr : k + 1; });
  const pool = (!D.chats && SEL_ACTIVE) ? vals.filter(x => SEL.has(String(x.e.k))) : vals;
  const shownAll = pool.slice().sort((p, q) => (p.fr ?? 1e9) - (q.fr ?? 1e9)).slice(0, trendTop());
  if (!shownAll.length) return note("Нет данных за выбранный период");
  const shown = shownAll.filter(x => !hiddenSeries.has(x.e.n));
  lineSeriesInfo = shownAll.map(x => ({name:x.e.n, color:chartSeriesStyle(kindKey, x.e.k).c[0]}));
  const nShown = shownAll.length;
  let maxSeen = 1; shownAll.forEach(x => x.rk.forEach(r => { if (r && r > maxSeen) maxSeen = r; }));
  const need = Math.max(nShown, ...shownAll.map(x => x.fr || 0));
  const maxRank = Math.min(40, Math.max(need, Math.min(maxSeen, need + 8)));
  const W = 1100, L = 70, Rr = W - 210, T = 104, rowH = Math.max(22, Math.min(44, Math.floor(560 / maxRank))), Bt = T + (maxRank - 1) * rowH;
  const xs = b => L + (B.count === 1 ? 0 : b / (B.count - 1) * (Rr - L)), ys = r => T + (r - 1) * rowH;
  const modeWord = cum ? "накопительно с начала периода" : `за каждый отрезок`;
  let o = head(cPeriodLabel(), `${sub()} · места по ${B.word}, ${modeWord}${NORM === "day" ? ", по среднему за активный день" : ""}`, W);
  for (let r = 1; r <= maxRank; r++) {
    const y = ys(r), medal = ["#ffd166", "#c0c6d4", "#e3a36b"][r - 1];
    o += `<line x1="${L}" y1="${y}" x2="${Rr}" y2="${y}" stroke="#ffffff" stroke-opacity="${r <= 3 ? .09 : .05}" stroke-width="1"/>`;
    if (maxRank <= 24 || r === 1 || r % 5 === 0) o += medal
      ? `<circle cx="${L - 34}" cy="${y}" r="11" fill="${medal}" fill-opacity=".2" stroke="${medal}" stroke-opacity=".7"/><text class="chart-axis" x="${L - 34}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="${medal}">${r}</text>`
      : `<text class="chart-axis" x="${L - 34}" y="${y + 5}" text-anchor="middle" font-size="14" fill="#aab0c0">${r}</text>`;
  }
  const every = axisEvery(B.count, Rr - L, B.kind === "m" ? 58 : 52);
  for (let b = 0; b < B.count; b++) if (b % every === 0 || b === B.count - 1 && (B.count - 1) % every > every / 2)
    o += `<text class="chart-axis" x="${xs(b).toFixed(1)}" y="${Bt + 34}" text-anchor="middle" font-size="14" fill="#aab0c0">${escH(B.label(b))}</text>`;
  const evs = chartEventsFor(D.from, D.to, shownAll.map(x => x.e.k));
  if (evs) {
    const xOfDate = d => { const i = Math.max(0, Math.min(D.n - 1, dayIdx(d) - D.d0)), b = B.idx[i]; return xs(b) - (B.count > 1 ? (Rr - L) / (B.count - 1) / 2 : 0); };
    o += chartEventsSvg({bands:evs.bands, flags:evs.flags}, xOfDate, T - 18, Bt + 14, Rr, {dayW:B.count > 1 ? (Rr - L) / (B.count - 1) : 10}).svg;
  }
  const many = B.count > 36, pr = many ? 3.5 : 6;
  const vfmt = v => NORM === "day" ? fmtR(v) : fmt(Math.round(v));
  const placeWord = cum ? "с начала периода" : (B.kind === "d" ? "за этот день" : B.kind === "w" ? "за эту неделю" : "за этот месяц");
  [...shown].reverse().forEach(x => {
    const rk = x.rk, c = chartSeriesStyle(kindKey, x.e.k).c[0];
    let d = "", prev = null;
    for (let b = 0; b < B.count; b++) {
      const r = rk[b]; if (!r || r > maxRank) { prev = null; continue; }
      const px = xs(b), py = ys(r);
      if (!prev) d += `M${px.toFixed(1)},${py.toFixed(1)}`;
      else { const mx = (prev[0] + px) / 2; d += ` C${mx.toFixed(1)},${prev[1].toFixed(1)} ${mx.toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`; }
      prev = [px, py];
    }
    o += `<path class="anim-line" pathLength="1" data-n="${escH(x.e.n)}" d="${d}" fill="none" stroke="${c}" stroke-width="${many ? 2.6 : 3.4}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".9"/>`;
    for (let b = 0; b < B.count; b++) {
      const r = rk[b]; if (!r || r > maxRank) continue;
      const share = totals[b] ? x.raw[b] / totals[b] : 0;
      const tip = `${x.e.n} · ${B.full(b)}|${r} место ${placeWord} · ${vfmt(x.v[b])}${NORM === "day" ? " в активный день" : ""} · ${pctStr(share)} всех`;
      o += `<circle data-n="${escH(x.e.n)}" cx="${xs(b).toFixed(1)}" cy="${ys(r).toFixed(1)}" r="${pr}" fill="${c}" stroke="#12141b" stroke-width="2" data-tip="${escH(tip)}"/>`;
    }
  });
  const ends = shownAll.map(x => {
    let lb = B.count - 1; while (lb >= 0 && (!x.rk[lb] || x.rk[lb] > maxRank)) lb--;
    return {x, y: lb >= 0 ? ys(x.rk[lb]) : Bt + rowH, lb};
  }).sort((a, b) => a.y - b.y);
  const gap = Math.max(15, Math.min(rowH, 24)); let prevY = -1e9;
  ends.forEach(e => { e.ly = Math.max(e.y, prevY + gap); prevY = e.ly; });
  ends.forEach(e => {
    const c = chartSeriesStyle(kindKey, e.x.e.k).c[0], off = hiddenSeries.has(e.x.e.n);
    const place = e.x.fr ? `${e.x.fr}-е` : "—";
    o += `<g class="lg-item" data-name="${escH(e.x.e.n)}" data-ek="${escH(e.x.e.k)}" opacity="${off ? .35 : 1}" style="cursor:pointer"><rect x="${Rr + 14}" y="${(e.ly - gap / 2).toFixed(1)}" width="190" height="${gap}" fill="transparent"/>`
      + (e.lb >= 0 && !off ? `<path d="M${(xs(e.lb) + pr + 2).toFixed(1)},${e.y.toFixed(1)} L${(Rr + 20).toFixed(1)},${e.ly.toFixed(1)}" stroke="${c}" stroke-opacity=".35" stroke-width="1.2" fill="none"/>` : "")
      + `<circle cx="${Rr + 26}" cy="${e.ly.toFixed(1)}" r="5" fill="${c}"/><text class="chart-legend" x="${Rr + 38}" y="${(e.ly + 5).toFixed(1)}" font-size="15" fill="#f2f3f7">${escH(shortName(e.x.e.n, 15))}<tspan class="chart-value" font-size="13" fill="#9aa0b0"> ${place}</tspan></text></g>`;
  });
  const H = Bt + 70;
  o += `<text class="chart-legend" x="${L - 34}" y="${H - 8}" font-size="13" fill="#7d8190">Справа — место за весь период среди всех ${D.chats ? "чатов" : "участников"}; точки — место ${cum ? "по сумме с начала периода" : "в каждом отрезке"}.<tspan data-no-export="1"> Клик по имени скрывает линию.</tspan></text>`;
  return `<svg class="wide-svg" viewBox="0 0 ${W} ${H}" role="img">${o}</svg>`;
}

/* ---------- Места: месяцы × годы (разновидность «Графика мест») ----------
   По горизонтали — месяцы, по вертикали — годы. В каждой клетке — место этого месяца среди таких же месяцев
   других лет по общей сумме: самый активный октябрь из всех — 1-е место и так далее. Справа — места годов целиком. */
var MONTHS_PL_GEN = ["январей","февралей","мартов","апрелей","маев","июней","июлей","августов","сентябрей","октябрей","ноябрей","декабрей"];
function bumpYearsChart(){
  if (!allRows) return note("Загружаю историю…");
  const metric = $("metric").value, todayIso = iso(now), curMk = todayIso.slice(0, 7);
  const sums = new Map(); let firstM = "9999-99", lastM = "0000-00";
  pick(allRows, $("chat").value).forEach(x => {
    const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10 || d > todayIso) return;
    if (!isVisibleUser(String(x[F.userId] ?? x[F.name]))) return;
    const v = Number(g(x, metric)) || 0; if (!v) return;
    const mk = d.slice(0, 7); if (mk < firstM) firstM = mk; if (mk > lastM) lastM = mk;
    sums.set(mk, (sums.get(mk) || 0) + v);
  });
  if (!sums.size) return note("Нет данных");
  const y0 = +firstM.slice(0, 4), y1 = +lastM.slice(0, 4), years = [];
  for (let y = y0; y <= y1; y++) years.push(y);
  const mkOf = (y, i) => `${y}-${String(i + 1).padStart(2, "0")}`;
  const valid = (y, i) => { const mk = mkOf(y, i); return mk >= firstM && mk <= lastM; };
  // Места: колонка месяца — среди этого же месяца в другие годы; колонка «Год» — годы целиком
  const rankCol = items => { const o = items.filter(t => t.ok).sort((a, b) => b.v - a.v); o.forEach((t, k) => { t.r = k > 0 && t.v === o[k - 1].v ? o[k - 1].r : k + 1; t.n = o.length; t.best = o[0]; t.second = o[1] || null; }); return o; };
  const cells = years.map(y => Array.from({length:12}, (_, i) => ({y, i, ok:valid(y, i), v:sums.get(mkOf(y, i)) || 0, part:mkOf(y, i) === curMk, r:null})));
  const colMax = [];
  for (let i = 0; i < 12; i++) { const col = rankCol(cells.map(row => row[i])); colMax.push(col.length ? col[0].v : 0); }
  const yearCells = years.map((y, yi) => ({y, ok:true, v:cells[yi].reduce((a, c) => a + c.v, 0), part:y === +curMk.slice(0, 4) || y === y0 && firstM.slice(5) !== "01", r:null}));
  rankCol(yearCells); const yMax = Math.max(...yearCells.map(t => t.v), 1);
  const W = 1100, L = 84, gap = 6, sepW = 16, colW = (W - L - 20 - sepW - gap * 12) / 13, cellH = 60, T = 128;
  const cx = i => L + i * (colW + gap) + (i === 12 ? sepW : 0), cy = yi => T + yi * (cellH + gap);
  const medal = ["#ffd166", "#d3d9e6", "#e3a36b"];
  const fillOf = (t, max) => t.r <= 3 && t.n > 1 ? {f:medal[t.r - 1], o:.92, txt:"#14161d", sub:"#3a3d48"} : {f:"#7aa2f7", o:+(.1 + .32 * (max ? t.v / max : 0)).toFixed(3), txt:"#f2f3f7", sub:"#aab0c0"};
  const cell = (t, x, y, max, tip) => {
    const c = fillOf(t, max);
    return `<g data-n="${t.y}" data-tip="${escH(tip)}"><rect x="${x.toFixed(1)}" y="${y}" width="${colW.toFixed(1)}" height="${cellH}" rx="10" fill="${c.f}" fill-opacity="${c.o}"${t.part ? ` stroke="#ffffff" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="5 4"` : ""}/>`
      + `<text x="${(x + colW / 2).toFixed(1)}" y="${y + 31}" text-anchor="middle" font-size="25" font-weight="800" fill="${c.txt}" style="fill:${c.txt} !important">${t.r}</text>`
      + `<text x="${(x + colW / 2).toFixed(1)}" y="${y + 50}" text-anchor="middle" font-size="12.5" font-weight="600" fill="${c.sub}" style="fill:${c.sub} !important">${fmt(Math.round(t.v))}</text></g>`;
  };
  const vs = t => t.r === 1 ? (t.second ? ` · на ${fmt(Math.round(t.v - t.second.v))} больше, чем в ${t.second.y}` : "") : ` · лучший — ${t.best.y} (${fmt(Math.round(t.best.v))})`;
  let o = head("Места месяцев по годам", `${sub()} · место месяца среди таких же месяцев других лет`, W);
  for (let i = 0; i < 13; i++) o += `<text class="chart-axis" x="${(cx(i) + colW / 2).toFixed(1)}" y="${T - 14}" text-anchor="middle" font-size="15" fill="#aab0c0"${i === 12 ? ' font-weight="700"' : ""}>${i === 12 ? "Год" : MONTHS_SHORT_RU[i]}</text>`;
  years.forEach((y, yi) => {
    o += `<text x="${L - 16}" y="${cy(yi) + cellH / 2 + 7}" text-anchor="end" font-size="20" font-weight="700" fill="#e6e8ee" data-n="${y}">${y}</text>`;
    cells[yi].forEach((t, i) => {
      const x = cx(i);
      if (!t.ok) { if (mkOf(y, i) < firstM) o += `<rect x="${x.toFixed(1)}" y="${cy(yi)}" width="${colW.toFixed(1)}" height="${cellH}" rx="10" fill="#ffffff" fill-opacity=".03"/>`; return; }
      o += cell(t, x, cy(yi), colMax[i], `${MONTHS[i]} ${y}${t.part ? " (месяц ещё идёт)" : ""}|${t.r}-е место из ${t.n} ${MONTHS_PL_GEN[i]} · ${fmt(Math.round(t.v))}${vs(t)}`);
    });
    const t = yearCells[yi];
    o += cell(t, cx(12), cy(yi), yMax, `${y} год${t.part ? " (неполный)" : ""}|${t.r}-е место из ${t.n} ${t.n % 10 === 1 && t.n % 100 !== 11 ? "года" : "лет"} · ${fmt(Math.round(t.v))}${vs(t)}`);
  });
  const Bt = cy(years.length) - gap;
  o += `<line x1="${(cx(12) - sepW / 2 - gap / 2).toFixed(1)}" y1="${T - 30}" x2="${(cx(12) - sepW / 2 - gap / 2).toFixed(1)}" y2="${Bt}" stroke="#ffffff" stroke-opacity=".12"/>`;
  o += `<text class="chart-legend" x="${L}" y="${Bt + 30}" font-size="13" fill="#7d8190">Крупная цифра — место месяца среди таких же месяцев других лет, ниже — сумма. Золото, серебро, бронза — 1–3 места.</text>`;
  o += `<text class="chart-legend" x="${L}" y="${Bt + 50}" font-size="13" fill="#7d8190">Пунктир — месяц или год ещё не закончился или посчитан не с начала. «Год» — места годов целиком.</text>`;
  return `<svg class="wide-svg" viewBox="0 0 ${W} ${Bt + 64}" role="img">${o}</svg>`;
}

/* ---------- Лишние настройки графиков: прячем то, что на выбранном графике ничего не меняет ---------- */
function syncUselessChartControls(type){
  const b = document.body;
  // «День» — графикам с линией во времени нужен период хотя бы из нескольких дней
  b.classList.toggle("cs-noday", ["trend", "race", "bump", "multiples"].includes(type));
  // «Сезонность»: важен только год
  b.classList.toggle("cs-yearonly", type === "season");
  // «Доля, %» не меняет места: доля и сумма упорядочивают одинаково
  b.classList.toggle("cs-noshare", type === "bump");
  // «Убрать вышедших» действует только на участников; у чатов в итогах все сообщения
  const hl = $("hide-left-charts")?.closest("label");
  if (hl) hl.hidden = chartEntity === "chats" && type !== "years";
}

/* ---------- Разброс по дням (box plot) ---------- */
function quantile(sorted, q){
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
function spreadChart(){
  const D = chartDaily(); if (D.err) return note(D.err);
  const withZero = !D.chats && $("spread-zero").value === "all", logS = $("spread-scale").value === "log";
  const stats = D.list.slice(0, trendTop(10)).filter(e => !hiddenSeries.has(e.n)).map(e => {
    let first = 0; while (first < D.n && !(e.a[first] > 0)) first++;
    const days = [];
    for (let i = first; i < D.n; i++) if (withZero || e.a[i] > 0) days.push([i, e.a[i]]);
    const v = days.map(d => d[1]).sort((a, b) => a - b);
    const q1 = quantile(v, .25), med = quantile(v, .5), q3 = quantile(v, .75), iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const inside = v.filter(x => x >= loF && x <= hiF);
    const mean = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
    const outl = days.filter(d => d[1] < loF || d[1] > hiF).sort((a, b) => b[1] - a[1]);
    return {e, n:v.length, q1, med, q3, lo:inside.length ? inside[0] : v[0], hi:inside.length ? inside[inside.length - 1] : v[v.length - 1], mean, max:v[v.length - 1], outl, best:days.reduce((m, d) => d[1] > m[1] ? d : m, [0, 0])};
  }).filter(s => s.n > 0).sort((a, b) => b.med - a.med || b.mean - a.mean);
  lineSeriesInfo = D.list.slice(0, trendTop(10)).map(e => ({name:e.n, color:chartSeriesStyle(chartStyleKind(), e.k).c[0]}));
  if (!stats.length) return note("Все строки скрыты — верни их кнопкой «Показать все»");
  const vmax = Math.max(1, ...stats.map(s => s.max));
  const W = 900, LBL = Math.min(190, Math.max(90, Math.max(...stats.map(s => shortName(s.e.n, 18).length)) * 8.6 + 16)), X0 = LBL + 14, X1 = W - 30;
  const rowH = stats.length > 20 ? 26 : 34, T = 112, Bt = T + stats.length * rowH;
  const lsc = axisScale(vmax, 0), dom = logS ? vmax : lsc.max;
  const tf = v => logS ? Math.log1p(v) : v, sx = v => X0 + tf(v) / tf(dom) * (X1 - X0);
  const metricW = MLBL[D.metric].toLowerCase();
  let o = head(cPeriodLabel(), `${sub()} · ${metricW} в день, ${withZero ? "включая дни без активности" : "только активные дни"}${logS ? ", логарифмическая шкала" : ""}`);
  // шкала
  const ticks = logS ? [0, 1, 3, 10, 30, 100, 300, 1000, 3000, 10000, 30000].filter(v => v <= vmax * 1.001) : axisTicks(lsc);
  if (!ticks.includes(0)) ticks.unshift(0);
  ticks.forEach(v => {
    const x = sx(v);
    o += `<line x1="${x.toFixed(1)}" y1="${T - 6}" x2="${x.toFixed(1)}" y2="${Bt}" stroke="#ffffff" stroke-opacity=".06"/><text class="chart-axis" x="${x.toFixed(1)}" y="${Bt + 24}" text-anchor="middle" font-size="14" fill="#aab0c0">${axisLabel(v)}</text>`;
  });
  stats.forEach((s, i) => {
    const y = T + i * rowH + rowH / 2, c = chartSeriesStyle(chartStyleKind(), s.e.k).c[0], bh = Math.min(18, rowH - 10);
    const tip = `${s.e.n}|медиана ${fmtR(s.med)} · среднее ${fmtR(s.mean)} · половина дней от ${fmtR(s.q1)} до ${fmtR(s.q3)} · максимум ${fmt(s.max)} (${formatDateRu(parseDate(D.date(s.best[0])))}) · дней: ${s.n}`;
    o += `<g data-n="${escH(s.e.n)}"><rect x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}" fill="transparent" data-tip="${escH(tip)}"/>`;
    o += `<text class="chart-label" x="${LBL}" y="${y + 5}" text-anchor="end" font-size="16" fill="#e6e8ee" data-tip="${escH(tip)}">${escH(shortName(s.e.n, 18))}</text>`;
    o += `<line x1="${sx(s.lo).toFixed(1)}" y1="${y}" x2="${sx(s.hi).toFixed(1)}" y2="${y}" stroke="${c}" stroke-opacity=".7" stroke-width="2" pointer-events="none"/>`;
    [s.lo, s.hi].forEach(v => { o += `<line x1="${sx(v).toFixed(1)}" y1="${y - bh / 3}" x2="${sx(v).toFixed(1)}" y2="${y + bh / 3}" stroke="${c}" stroke-opacity=".7" stroke-width="2" pointer-events="none"/>`; });
    o += `<rect class="anim-bar-x" style="animation-delay:${i * 30}ms" x="${sx(s.q1).toFixed(1)}" y="${y - bh / 2}" width="${Math.max(3, sx(s.q3) - sx(s.q1)).toFixed(1)}" height="${bh}" rx="4" fill="${c}" fill-opacity=".38" stroke="${c}" stroke-width="1.6" data-tip="${escH(tip)}"/>`;
    o += `<line x1="${sx(s.med).toFixed(1)}" y1="${y - bh / 2}" x2="${sx(s.med).toFixed(1)}" y2="${y + bh / 2}" stroke="#ffffff" stroke-width="2.6" pointer-events="none"/>`;
    const mx = sx(s.mean); o += `<path d="M${mx.toFixed(1)},${y - 5} l5,5 l-5,5 l-5,-5 z" fill="#12141b" stroke="#ffffff" stroke-width="1.5" pointer-events="none"/>`;
    s.outl.slice(0, 80).forEach(([di, v]) => {
      o += `<circle cx="${sx(v).toFixed(1)}" cy="${y}" r="3.2" fill="${c}" fill-opacity=".55" stroke="${c}" data-tip="${escH(`${s.e.n} · ${formatDateRu(parseDate(D.date(di)))}`)}|${escH(`${fmt(v)} — необычный день`)}"/>`;
    });
    o += `<text class="chart-value" x="${Math.min(W - 4, sx(s.hi) + 8).toFixed(1)}" y="${y + 4}" font-size="12" fill="#9aa0b0" text-anchor="${sx(s.hi) > W - 80 ? "end" : "start"}" pointer-events="none">${s.outl.length ? "" : "макс " + fmt(s.max)}</text></g>`;
  });
  // Пояснение
  const ly = Bt + 48;
  o += `<rect x="${X0}" y="${ly - 9}" width="34" height="14" rx="3" fill="#7aa2f7" fill-opacity=".38" stroke="#7aa2f7"/><line x1="${X0 + 15}" y1="${ly - 9}" x2="${X0 + 15}" y2="${ly + 5}" stroke="#fff" stroke-width="2.4"/><text class="chart-legend" x="${X0 + 44}" y="${ly + 3}" font-size="14" fill="#9aa0b0">коробка — половина дней, белая черта — медиана (типичный день)</text>`;
  o += `<path d="M${X0 + 17},${ly + 17} l5,5 l-5,5 l-5,-5 z" fill="#12141b" stroke="#fff" stroke-width="1.5"/><text class="chart-legend" x="${X0 + 44}" y="${ly + 27}" font-size="14" fill="#9aa0b0">ромб — среднее, усы — обычный разброс, точки — необычно активные или тихие дни</text>`;
  o += `<text class="chart-legend" x="${X0}" y="${ly + 52}" font-size="13" fill="#7d8190">Отсортировано по медиане: сверху те, у кого типичный день самый насыщенный.</text><text class="chart-legend" x="${X0}" y="${ly + 70}" font-size="13" fill="#7d8190">Ромб правее белой черты — бывают редкие очень активные дни, которые тянут среднее вверх.</text>`;
  return `<svg viewBox="0 0 ${W} ${ly + 84}" role="img">${o}</svg>`;
}

/* ---------- Концентрация активности (кривая Лоренца и Джини) ---------- */
function giniOf(values){
  const v = values.filter(x => x > 0).sort((a, b) => a - b), n = v.length;
  if (n < 2) return {g:0, n};
  const sum = v.reduce((a, b) => a + b, 0); let acc = 0;
  v.forEach((x, i) => { acc += (i + 1) * x; });
  return {g:(2 * acc) / (n * sum) - (n + 1) / n, n, sum, v};
}
function giniWord(g){ return g < .3 ? "почти поровну" : g < .5 ? "умеренная концентрация" : g < .7 ? "высокая концентрация" : "очень высокая концентрация"; }
/* ---------- «Активность по дням»: столбцы по дням (неделям, месяцам), внутри — доли чатов или участников ----------
   Снизу самый активный, сверху — остальные. Над столбцом итог, в легенде — сумма за период. */
const STACK_CAP = 6;
function stackModel(){
  const D = chartDaily(); if (D.err) return D;
  const B = chartBuckets(D.from, D.n, 31, cMode() === "all" ? "y" : null);
  const top = D.list.slice(0, STACK_CAP), rest = D.list.slice(STACK_CAP);
  const ser = top.map(e => ({k:e.k, n:e.n, kind:chartStyleKind(), s:bucketSums(e.a, B).s, tot:e.tot}));
  if (rest.length) { const s2 = new Float64Array(B.count); rest.forEach(e => { const b = bucketSums(e.a, B).s; for (let i = 0; i < B.count; i++) s2[i] += b[i]; }); ser.push({k:"other", n:`Остальные (${rest.length})`, kind:"special", s:s2, tot:rest.reduce((a, e) => a + e.tot, 0)}); }
  const tot = new Float64Array(B.count); ser.forEach(x => { for (let i = 0; i < B.count; i++) tot[i] += x.s[i]; });
  return {D, B, ser, tot, sum:ser.reduce((a, x) => a + x.tot, 0)};
}
function stackChart(){
  const M = stackModel(); if (M.err) return note(M.err);
  const {D, B, ser, tot, sum} = M, n = B.count;
  const W = 900, L = 36, R = W - 36, T = 128, BOT = 470, gap = n > 20 ? 4 : n > 10 ? 8 : 14, cw = (R - L - gap * (n - 1)) / n, rad = Math.min(14, cw * .12);
  const mx = Math.max(1, ...tot), sy = v => v / mx * (BOT - T - 30), defs = [];
  // общий объём столбца: верх светлее, низ темнее (поверх плоских цветов сегментов)
  const shadeId = "stkShade" + (++gid), otherId = "stkOther" + (++gid);
  defs.push(`<pattern id="${otherId}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#8a90a2" fill-opacity=".16"/><rect width="2.2" height="7" fill="#c0c6d4" fill-opacity=".32"/></pattern>`);
  defs.push(`<linearGradient id="${shadeId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".45" stop-color="#fff" stop-opacity=".04"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>`);
  const who = D.chats ? "по чатам" : "по участникам";
  const per = chartQuick ? (chartQuick === "all" ? "все данные" : `${chartQuick} дней`) : ({day:"день", week:"неделя", month:"месяц", year:"год", all:"все данные"}[mode] || "");
  const dS = d => `${+d.slice(8, 10)} ${MONTHS_SHORT_RU[+d.slice(5, 7) - 1]}${B.kind === "y" ? " " + d.slice(0, 4) : ""}`;
  const sub = [MLBL[D.metric] || "", per, `${dS(D.from)} – ${dS(D.to)}`, `всего ${fmt(Math.round(sum))}`].filter(Boolean).join(" · ") + (!D.chats && $("chat").value ? ` · ${$("chat").value}` : "");
  let o = head(`Активность ${who}`, sub);
  const showVal = cw >= 30, every = axisEvery(n, R - L, 70);
  for (let b = 0; b < n; b++) {
    const x = L + b * (cw + gap), h = sy(tot[b]); if (tot[b] <= 0) { o += `<text class="chart-axis" x="${(x + cw / 2).toFixed(1)}" y="${BOT + 34}" text-anchor="middle" font-size="${n > 14 ? 13 : 17}" fill="#aab0c0">${b % every ? "" : escH(B.label(b))}</text>`; continue; }
    const top = BOT - h, cid = "stk" + (++gid);
    defs.push(`<clipPath id="${cid}"><rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" rx="${rad.toFixed(1)}"/></clipPath>`);
    o += `<g clip-path="url(#${cid})">`;
    let y = BOT;
    ser.forEach(se => {
      const v = se.s[b]; if (!(v > 0)) return;
      const sh = sy(v), fill = se.k === "other" ? `url(#${otherId})` : chartSeriesStyle(se.kind, se.k).c[0]; // плоский цвет; «Остальные» — тихая штриховка, чтобы не забивать названных
      o += `<rect class="anim-bar-y" x="${x.toFixed(1)}" y="${(y - sh).toFixed(1)}" width="${cw.toFixed(1)}" height="${(sh + .5).toFixed(1)}" fill="${fill}" data-ek="${escH(se.k)}" data-tip="${escH(B.full(b))}|${escH(`${se.n}: ${fmt(Math.round(v))} · ${Math.round(v / tot[b] * 100)}% из ${fmt(Math.round(tot[b]))}`)}"/>`;
      y -= sh;
    });
    o += `<rect class="anim-bar-y stk-shade" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#${shadeId})" pointer-events="none"/>`;
    o += `</g>`;
    if (showVal) o += `<text class="chart-value" x="${(x + cw / 2).toFixed(1)}" y="${(top - 12).toFixed(1)}" text-anchor="middle" font-size="${cw >= 70 ? 22 : cw >= 45 ? 17 : 13}" font-weight="700" fill="#eceef3">${fmt(Math.round(tot[b]))}</text>`;
    o += `<text class="chart-axis" x="${(x + cw / 2).toFixed(1)}" y="${BOT + 34}" text-anchor="middle" font-size="${n > 14 ? 13 : 17}" fill="#aab0c0">${b % every ? "" : escH(B.label(b))}</text>`;
  }
  // Легенда: цвет, название и сумма за период — в одну или несколько строк по центру
  const items = ser.map(se => ({se, t:`${se.n} · ${fmt(Math.round(se.tot))}`})), lw = it => 34 + it.t.length * 9.4, lines = [[]];
  let wsum = 0; items.forEach(it => { const w = lw(it) + 26; if (wsum + w > R - L && lines[lines.length - 1].length) { lines.push([]); wsum = 0; } lines[lines.length - 1].push(it); wsum += w; });
  lines.forEach((ln, li) => {
    const tw = ln.reduce((a, it) => a + lw(it) + 26, -26); let x = W / 2 - tw / 2; const y = BOT + 80 + li * 34;
    ln.forEach(it => { const fill = it.se.k === "other" ? `url(#${otherId})` : chartSeriesStyle(it.se.kind, it.se.k).c[0];
      o += `<g data-ek="${escH(it.se.k)}"><rect x="${x.toFixed(1)}" y="${y - 13}" width="24" height="24" rx="6" fill="${fill}"/><text class="chart-legend" x="${(x + 34).toFixed(1)}" y="${y + 6}" font-size="17" fill="#d6d9e2">${escH(it.t)}</text></g>`;
      x += lw(it) + 26; });
  });
  const H = BOT + 80 + lines.length * 34 + 10;
  return `<svg viewBox="0 0 ${W} ${H}" role="img"><defs>${defs.join("")}</defs>${o}</svg>`;
}
function giniChart(){
  const D = chartDaily(true); if (D.err) return note(D.err);
  const totals = D.list.map(e => e.tot), G = giniOf(totals), n = G.n;
  if (n < 2) return note(`Для концентрации нужно хотя бы два ${D.chats ? "чата" : "участника"} с активностью`);
  const cMain = chartSeriesStyle("g", "main").c[0], cTop = chartSeriesStyle("g", "top").c[0];
  const sum = G.sum, desc = [...G.v].reverse(), share = k => desc.slice(0, k).reduce((a, b) => a + b, 0) / sum;
  let half = 0, acc = 0; while (acc < sum / 2) acc += desc[half++];
  const W = 900, who = D.chats ? "чатов" : "участников", mGen = {msgs:"сообщений", stick:"стикеров", voice:"голосовых", video:"видеосообщений", rgive:"поставленных реакций", rgot:"полученных реакций"}[D.metric];
  let o = head(cPeriodLabel(), `${MLBL[D.metric]} · насколько активность сосредоточена у немногих ${who}${!D.chats && $("chat").value ? " · " + $("chat").value : ""}`);
  // Кривая Лоренца
  const PX = 70, PY = 110, PS = 360, sx = f => PX + f * PS, sy = f => PY + PS - f * PS;
  o += `<rect x="${PX}" y="${PY}" width="${PS}" height="${PS}" fill="#ffffff" fill-opacity=".02" stroke="#ffffff" stroke-opacity=".12"/>`;
  [.25, .5, .75].forEach(f => { o += `<line x1="${sx(f)}" y1="${PY}" x2="${sx(f)}" y2="${PY + PS}" stroke="#fff" stroke-opacity=".05"/><line x1="${PX}" y1="${sy(f)}" x2="${PX + PS}" y2="${sy(f)}" stroke="#fff" stroke-opacity=".05"/>`; });
  [0, .5, 1].forEach(f => { o += `<text class="chart-axis" x="${sx(f)}" y="${PY + PS + 22}" text-anchor="middle" font-size="13" fill="#aab0c0">${Math.round(f * 100)}%</text><text class="chart-axis" x="${PX - 8}" y="${sy(f) + 4}" text-anchor="end" font-size="13" fill="#aab0c0">${Math.round(f * 100)}%</text>`; });
  o += `<text class="chart-axis" x="${PX + PS / 2}" y="${PY + PS + 44}" text-anchor="middle" font-size="13" fill="#7d8190">доля ${who} (от самых тихих к самым активным)</text>`;
  o += `<text class="chart-axis" x="${PX - 46}" y="${PY + PS / 2}" text-anchor="middle" font-size="13" fill="#7d8190" transform="rotate(-90 ${PX - 46} ${PY + PS / 2})">доля ${mGen}</text>`;
  const pts = [[0, 0]]; let cs = 0;
  G.v.forEach((x, i) => { cs += x; pts.push([(i + 1) / n, cs / sum]); });
  const path = pts.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ");
  o += `<path d="M${sx(0)},${sy(0)} L${sx(1)},${sy(1)} ${[...pts].reverse().map(p => `L${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ")} Z" fill="${cMain}" fill-opacity=".16" pointer-events="none"/>`;
  o += `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(1)}" y2="${sy(1)}" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="6 5"/><text class="chart-legend" x="${sx(.52)}" y="${sy(.6)}" font-size="12" fill="#9aa0b0" transform="rotate(-45 ${sx(.52)} ${sy(.6)})" text-anchor="middle">все поровну</text>`;
  o += `<path class="anim-line" pathLength="1" d="${path}" fill="none" stroke="${cMain}" stroke-width="3" stroke-linejoin="round"/>`;
  const names = [...D.list].reverse();
  pts.slice(1).forEach((p, i) => { if (n <= 60) o += `<circle cx="${sx(p[0]).toFixed(1)}" cy="${sy(p[1]).toFixed(1)}" r="${n > 30 ? 2.5 : 3.5}" fill="${cMain}" data-tip="${escH(`${names[i].n}`)}|${escH(`${fmt(names[i].tot)} · ${pctStr(names[i].tot / sum)} · вместе с более тихими: ${Math.round(p[0] * 100)}% ${who} дают ${Math.round(p[1] * 100)}%`)}"/>`; });
  // Сводка справа
  const RX = 500;
  o += `<text class="chart-legend" x="${RX}" y="${PY + 14}" font-size="15" fill="#9aa0b0">Индекс Джини</text><text class="chart-value" x="${RX}" y="${PY + 62}" font-size="52" font-weight="700" fill="${cMain}">${G.g.toFixed(2).replace(".", ",")}</text><text class="chart-label" x="${RX + 128}" y="${PY + 58}" font-size="17" fill="#e6e8ee">${escH(giniWord(G.g))}</text>`;
  o += `<text class="chart-legend" x="${RX}" y="${PY + 86}" font-size="13" fill="#7d8190">${D.chats ? "0 — во всех чатах поровну, 1 — всё в одном чате" : "0 — все пишут одинаково, 1 — пишет кто-то один"}</text>`;
  const rows = [["Лидер", share(1), D.list[0].n, 1], ["Топ-3", share(Math.min(3, n)), "", 3], ["Топ-5", share(Math.min(5, n)), "", 5], [`Топ-10%`, share(Math.max(1, Math.round(n * .1))), `${Math.max(1, Math.round(n * .1))} из ${n}`, n >= 10 ? 0 : n]].filter(r => r[3] < n);
  rows.forEach(([lab, f, extra], i) => {
    const y = PY + 128 + i * 46, bw = 300;
    o += `<text class="chart-label" x="${RX}" y="${y}" font-size="15" fill="#e6e8ee">${escH(lab)}${extra ? `<tspan fill="#7d8190" font-size="13"> · ${escH(shortName(extra, 22))}</tspan>` : ""}</text><text class="chart-label" x="${RX + bw}" y="${y}" text-anchor="end" font-size="15" fill="#eceef3">${pctStr(f)}</text>`;
    o += `<rect x="${RX}" y="${y + 8}" width="${bw}" height="8" rx="4" fill="#ffffff" fill-opacity=".07"/><rect class="anim-bar-x" x="${RX}" y="${y + 8}" width="${(bw * f).toFixed(1)}" height="8" rx="4" fill="${i === 1 ? cTop : cMain}"/>`;
  });
  o += `<text class="chart-label" x="${RX}" y="${PY + 330}" font-size="16" fill="#e6e8ee">Половину всех ${mGen} дают</text><text class="chart-value" x="${RX}" y="${PY + 358}" font-size="22" font-weight="700" fill="#eceef3">${half} из ${n} ${who}<tspan font-size="15" font-weight="400" fill="#9aa0b0"> (${pctStr(half / n)})</tspan></text>`;
  // Динамика во времени
  const Bk = chartBuckets(D.from, D.n, 36);
  let H = PY + PS + 70;
  if (Bk.count >= 2) {
    const series = [];
    for (let b = 0; b < Bk.count; b++) {
      const vals = D.list.map(e => { let s = 0; for (let i = 0; i < D.n; i++) if (Bk.idx[i] === b) s += e.a[i]; return s; });
      const gg = giniOf(vals), tot = vals.reduce((a, c) => a + c, 0), top3 = [...vals].sort((a, c) => c - a).slice(0, 3).reduce((a, c) => a + c, 0);
      series.push(gg.n >= 2 ? {b, g:gg.g * 100, t:tot ? top3 / tot * 100 : 0, n:gg.n} : null);
    }
    const TY = H + 20, TH = 190, TL = 70, TR = W - 40;
    const tx = b => TL + b / (Bk.count - 1) * (TR - TL), ty = v => TY + TH - v / 100 * TH;
    o += `<text class="chart-label" x="${TL}" y="${TY - 14}" font-size="16" fill="#e6e8ee">Как менялось по ${Bk.word}</text>`;
    o += `<g class="chart-legend"><circle cx="${TL + 260}" cy="${TY - 19}" r="5" fill="${cMain}"/><text x="${TL + 270}" y="${TY - 14}" font-size="14" fill="#9aa0b0">Джини × 100</text><circle cx="${TL + 380}" cy="${TY - 19}" r="5" fill="${cTop}"/><text x="${TL + 390}" y="${TY - 14}" font-size="14" fill="#9aa0b0">доля топ-3, %</text></g>`;
    [0, 25, 50, 75, 100].forEach(v => { o += `<line x1="${TL}" y1="${ty(v)}" x2="${TR}" y2="${ty(v)}" stroke="#fff" stroke-opacity="${v ? .05 : .15}"/><text class="chart-axis" x="${TL - 8}" y="${ty(v) + 4}" text-anchor="end" font-size="12" fill="#aab0c0">${v}</text>`; });
    const every = axisEvery(Bk.count, TR - TL, 60);
    for (let b = 0; b < Bk.count; b++) if (b % every === 0) o += `<text class="chart-axis" x="${tx(b).toFixed(1)}" y="${TY + TH + 20}" text-anchor="middle" font-size="12" fill="#aab0c0">${escH(Bk.label(b))}</text>`;
    const evs = chartEventsFor(D.from, D.to, null);
    if (evs) o += chartEventsSvg({bands:evs.bands, flags:[]}, d => tx(Bk.idx[Math.max(0, Math.min(D.n - 1, dayIdx(d) - D.d0))]), TY, TY + TH, TR, {noLabels:true}).svg;
    [["g", cMain], ["t", cTop]].forEach(([key, c]) => {
      let d = "", started = false;
      series.forEach((p, b) => { if (!p) { started = false; return; } d += `${started ? "L" : "M"}${tx(b).toFixed(1)},${ty(p[key]).toFixed(1)}`; started = true; });
      o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
      series.forEach((p, b) => { if (p && Bk.count <= 60) o += `<circle cx="${tx(b).toFixed(1)}" cy="${ty(p[key]).toFixed(1)}" r="3.2" fill="${c}" data-tip="${escH(Bk.full(b))}|${escH(`Джини ${(p.g / 100).toFixed(2).replace(".", ",")} · топ-3: ${fmtR(p.t)}% · активных ${who}: ${p.n}`)}"/>`; });
    });
    H = TY + TH + 52;
  }
  o += `<text class="chart-legend" x="70" y="${H}" font-size="13" fill="#7d8190">Чем дальше кривая от диагонали, тем сильнее активность держится на немногих.</text><text class="chart-legend" x="70" y="${H + 18}" font-size="13" fill="#7d8190">Выбор участников здесь не учитывается — считается ${D.chats ? "весь список чатов" : "весь чат (без вышедших, если они скрыты)"}.</text>`;
  return `<svg viewBox="0 0 ${W} ${H + 34}" role="img">${o}</svg>`;
}

/* ---------- Маленькие графики (small multiples) ---------- */
function multiplesChart(){
  const D = chartDaily(); if (D.err) return note(D.err);
  const Bk = chartBuckets(D.from, D.n, 92), kindKey = chartStyleKind();
  if (Bk.count < 2) return note("Для маленьких графиков нужен период хотя бы из двух дней");
  const all = D.list.slice(0, trendTop(12));
  lineSeriesInfo = all.map(e => ({name:e.n, color:chartSeriesStyle(kindKey, e.k).c[0]}));
  const list = all.filter(e => !hiddenSeries.has(e.n));
  if (!list.length) return note("Все графики скрыты — верни их кнопкой «Показать все»");
  // Сумма всех в каждом отрезке — для режима «доля».
  const totAll = new Float64Array(Bk.count); D.list.forEach(e => { for (let i = 0; i < D.n; i++) totAll[Bk.idx[i]] += e.a[i]; });
  const P = list.map(e => {
    const {s, act} = bucketSums(e.a, Bk), v = Array.from(s, (x, b) => NORM === "share" ? (totAll[b] ? x / totAll[b] * 100 : 0) : NORM === "day" ? (act[b] ? x / act[b] : 0) : x);
    const mean = v.reduce((a, b) => a + b, 0) / v.length; let mi = 0; v.forEach((x, b) => { if (x > v[mi]) mi = b; });
    return {e, v, s, act, mean, mi};
  });
  const shared = $("mult-scale").value !== "own", gmax = Math.max(1e-9, ...P.map(p => p.v[p.mi]));
  const W = 1100, cols = list.length >= 9 ? 4 : list.length >= 3 ? 3 : list.length, gapX = 26, gapY = 30, padX = 24;
  const pw = (W - padX * 2 - gapX * (cols - 1)) / cols, ph = cols >= 4 ? 120 : 140, top = 104;
  const rowsN = Math.ceil(list.length / cols);
  const vfmt = v => NORM === "share" ? fmtR(v) + "%" : NORM === "day" ? fmtR(v) : fmt(Math.round(v));
  const normWord = NORM === "share" ? ", доля от всех в отрезке" : NORM === "day" ? ", на активный день" : "";
  let o = head(cPeriodLabel(), `${sub()} · по ${Bk.word}${normWord} · шкала ${shared ? "общая" : "своя у каждого"}`, W);
  const evs = chartEventsFor(D.from, D.to, list.map(e => e.k));
  const meta = [];
  P.forEach((p, i) => {
    const cx = padX + (i % cols) * (pw + gapX), cy = top + Math.floor(i / cols) * (ph + gapY + 26);
    const x0 = cx, x1 = cx + pw, y0 = cy + 26, y1 = cy + 26 + ph - 18, max = shared ? gmax : Math.max(1e-9, p.v[p.mi]);
    const X = b => x0 + b / (Bk.count - 1) * (x1 - x0), Y = v => y1 - v / max * (y1 - y0 - 6);
    const c = chartSeriesStyle(kindKey, p.e.k).c[0];
    o += `<g data-n="${escH(p.e.n)}">`;
    o += `<g class="lg-item" data-name="${escH(p.e.n)}" style="cursor:pointer"><text class="chart-label" x="${x0}" y="${cy + 14}" font-size="15" fill="#f2f3f7" data-ek="${escH(p.e.k)}">${escH(shortName(p.e.n, Math.floor(pw / 10)))}</text></g><text class="chart-value" x="${x1}" y="${cy + 14}" text-anchor="end" font-size="13" fill="#aab0c0">${NORM === "abs" ? fmt(p.e.tot) : "ср. " + vfmt(p.mean)}</text>`;
    o += `<rect x="${x0}" y="${y0}" width="${pw}" height="${y1 - y0}" rx="6" fill="#ffffff" fill-opacity=".025"/>`;
    if (evs) o += chartEventsSvg({bands:evs.bands, flags:[]}, d => X(Bk.idx[Math.max(0, Math.min(D.n - 1, dayIdx(d) - D.d0))]), y0, y1, x1, {noLabels:true}).svg;
    const line = p.v.map((v, b) => `${b ? "L" : "M"}${X(b).toFixed(1)},${Math.max(y0, Y(v)).toFixed(1)}`).join("");
    { const yTop = Math.max(y0, Math.min(...p.v.map(v => Y(v)))), gA = "mlA" + i + "_" + (++softGid), sp = SOFT_GRAD ? softPair(c) : [c, c], gS = "mlS" + i + "_" + softGid;
      o += `<defs><linearGradient id="${gA}" x1="0" y1="${yTop.toFixed(1)}" x2="0" y2="${y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${sp[1]}" stop-opacity=".42"/><stop offset=".45" stop-color="${sp[1]}" stop-opacity=".14"/><stop offset=".85" stop-color="${sp[1]}" stop-opacity="0"/></linearGradient><linearGradient id="${gS}" x1="${x0}" y1="0" x2="${x1}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${sp[0]}"/><stop offset="1" stop-color="${sp[1]}"/></linearGradient></defs>`;
      o += `<path d="${line} L${x1.toFixed(1)},${y1} L${x0.toFixed(1)},${y1} Z" fill="url(#${gA})"/><path data-nl="1" d="${line}" fill="none" stroke="url(#${gS})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`; }
    const my = Y(p.mean); if (my >= y0) o += `<line x1="${x0}" y1="${my.toFixed(1)}" x2="${x1}" y2="${my.toFixed(1)}" stroke="#ffffff" stroke-opacity=".35" stroke-dasharray="3 4"/>`;
    const mxv = p.v[p.mi], mxX = X(p.mi), mxY = Math.max(y0, Y(mxv));
    o += `<circle cx="${mxX.toFixed(1)}" cy="${mxY.toFixed(1)}" r="3.5" fill="${c}" stroke="#12141b" stroke-width="1.5"/><text class="chart-value" x="${Math.min(x1 - 2, Math.max(x0 + 2, mxX)).toFixed(1)}" y="${(mxY - 6).toFixed(1)}" text-anchor="${mxX > x1 - 40 ? "end" : mxX < x0 + 40 ? "start" : "middle"}" font-size="11" fill="#cfd3dc">${vfmt(mxv)}</text>`;
    o += `<text class="chart-axis" x="${x0}" y="${y1 + 14}" font-size="11" fill="#7d8190">${escH(Bk.label(0))}</text><text class="chart-axis" x="${x1}" y="${y1 + 14}" text-anchor="end" font-size="11" fill="#7d8190">${escH(Bk.label(Bk.count - 1))}</text>`;
    o += `</g><rect x="${x0}" y="${y0}" width="${pw}" height="${y1 - y0}" fill="transparent" data-hover="mult" data-i="${i}" style="touch-action:pan-y"/>`;
    meta.push({x0, x1, y0, y1, X, Y, p, c});
  });
  const H = top + rowsN * (ph + gapY + 26) + 20;
  o += `<line id="mxh" x1="0" y1="0" x2="0" y2="0" stroke="#ffffff99" stroke-width="1.2" stroke-dasharray="3 3" visibility="hidden" pointer-events="none"/>`;
  o += `<text class="chart-legend" x="${padX}" y="${H - 6}" font-size="13" fill="#7d8190">Пунктир — среднее, точка — пик. ${shared ? "Общая шкала: высоту можно сравнивать между графиками." : "Своя шкала: видна форма каждого, но высоты между графиками не сравниваются."} <tspan data-no-export="1">Клик по имени скрывает график.</tspan></text>`;
  CHART_HOVER = (t, pt, e) => {
    const m = meta[Number(t.dataset.i)]; if (!m) return;
    const b = Math.max(0, Math.min(Bk.count - 1, Math.round((pt.x - m.x0) / (m.x1 - m.x0) * (Bk.count - 1))));
    const xh = $("mxh"); if (xh) { const x = m.X(b); xh.setAttribute("x1", x); xh.setAttribute("x2", x); xh.setAttribute("y1", m.y0); xh.setAttribute("y2", m.y1); xh.setAttribute("visibility", "visible"); }
    let h = `<b><i style="background:${m.c}"></i>${escH(m.p.e.n)}</b>` + tipRow(Bk.full(b), vfmt(m.p.v[b]));
    if (NORM !== "abs") h += tipRow("Всего", fmt(Math.round(m.p.s[b])));
    if (Bk.kind !== "d") h += tipRow("Активных дней", String(m.p.act[b]));
    h += tipRow("Среднее за отрезок", vfmt(m.p.mean));
    if (evs) h += chartEventNote(evs, Bk.start(b), Bk.end(b));
    showTip(h, e);
  };
  return `<svg class="wide-svg" viewBox="0 0 ${W} ${H}" role="img">${o}</svg>`;
}

