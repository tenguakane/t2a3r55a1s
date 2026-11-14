
/* ===================== v25: настройки вида таблиц, стекло, перенос кнопок «Столбцы» на ПК ===================== */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const desk = window.matchMedia("(min-width:721px)");

  /* ---------- флаги вида: компактно, без линий, стекло ---------- */
  const FLAGS = {
    compact:{key:"chatstats.tableCompact.v1", cls:"tbl-compact", ids:["set-tbl-compact"]},
    noborders:{key:"chatstats.tableNoBorders.v1", cls:"tbl-noborders", ids:[]},
    glass:{key:"chatstats.glassUi.v1", cls:"glass-ui", ids:["exp-glass"]},
    cardscompact:{key:"chatstats.cardsCompact.v1", cls:"cards-compact", ids:["set-cards-compact"]},
  };
  // «Без линий — только под заголовком» включено всегда
  const isOn = f => f === "noborders" || (!(f === "glass" && window.__TABLO) && lsGet(FLAGS[f].key, "0") === "1");
  function apply(){
    Object.keys(FLAGS).forEach(f => {
      const on = isOn(f), F = FLAGS[f];
      if (document.body.classList.contains(F.cls) !== on) document.body.classList.toggle(F.cls, on);
      F.ids.forEach(id => { const el = $(id); if (el && el.checked !== on) el.checked = on; });
    });
    const dc = $("set-tbl-cards-desk"); if (dc && window.__tableCardsDesktop) dc.checked = window.__tableCardsDesktop.get();
    if (typeof syncLook === "function") syncLook();
    // Графики подстраиваются под ширину: после смены компактности перерисуем.
  }
  function setFlag(f, on){ lsSet(FLAGS[f].key, on ? "1" : "0"); apply(); if (f === "compact") setTimeout(() => { try { dispatchEvent(new Event("resize")); } catch (e) {} }, 60); }
  window.__tableLook = {get:isOn, set:setFlag};

  /* ---------- «Вид таблицы» в правой шторке фильтров ---------- */
  function syncLook(){
    document.querySelectorAll(".fd-look [data-tview]").forEach(i => {
      const v = i.dataset.tview, on = v === "cards" ? !!(window.__tableCardsDesktop && window.__tableCardsDesktop.get()) : isOn(v);
      if (i.checked !== on) i.checked = on;
    });
  }
  window.__fdLook = function(host){
    if (!host) return;
    const tab = document.querySelector("main > .tab.active");
    const hasTables = !!(tab && tab.id !== "tab-settings" && tab.querySelector(".wrap > table, table[data-hc]"));
    const cur = host.querySelector(":scope > .fd-look");
    if (!hasTables) { if (cur) cur.remove(); return; }
    if (cur) { syncLook(); return; }
    const box = document.createElement("div"); box.className = "fd-look";
    box.innerHTML = `<b>Вид таблицы</b>`
      + `<label class="checkline" title="Меньше отступы в ячейках: строки ниже, столбцы уже"><input type="checkbox" data-tview="compact">Компактные таблицы</label>`
      + `<label class="checkline" title="Показывать таблицы карточками. Отдельную таблицу можно переключить кнопкой «Карточки» рядом со «Столбцами»"><input type="checkbox" data-tview="cards">Карточки вместо таблиц</label>`
      + `<label class="checkline" title="Карточки меньше и стоят по несколько в ряд"><input type="checkbox" data-tview="cardscompact">Компактные карточки — несколько в ряд</label>`;
    host.appendChild(box); syncLook();
  };

  /* ---------- пункты в настройках ---------- */
  (function(){
    // «Вид таблиц» — отдельный блок после раздела «Фильтры».
    const legend = $("fcat-legend");
    if (legend && !$("set-tbl-compact")) {
      const h = document.createElement("h2"); h.textContent = "Таблицы";
      const p = document.createElement("p"); p.className = "hint"; p.textContent = "Как выглядят таблицы на всех вкладках. Это же можно переключить в меню «Таблица» у любой таблицы.";
      const box = document.createElement("div"); box.className = "filters";
      box.innerHTML = `<label class="checkline" title="Меньше отступы в ячейках: строки ниже, столбцы уже"><input type="checkbox" id="set-tbl-compact">Компактные таблицы</label>`
        + `<label class="checkline" title="Только для компьютера. Отдельную таблицу можно переключить кнопкой «Карточки» рядом со «Столбцами»"><input type="checkbox" id="set-tbl-cards-desk">Показывать таблицы карточками на ПК</label>`
        + `<label class="checkline" title="Карточки меньше и стоят по несколько в ряд: на ПК — сколько поместится, на телефоне — по две"><input type="checkbox" id="set-cards-compact">Компактные карточки — несколько в ряд</label>`;
      legend.after(h, p, box);
    }
    const side = $("exp-sidenav-icons");
    if (side && !$("exp-glass")) {
      const l = document.createElement("label"); l.className = "checkline";
      l.title = "Карточки, таблицы, графики и панели становятся полупрозрачными, с размытием фона — как в iOS. Скопированные и скачанные картинки тоже получают стекло. На слабых телефонах может немного снизить плавность";
      l.innerHTML = `<input type="checkbox" id="exp-glass">Стеклянный интерфейс (как в iOS)`;
      side.closest("label").before(l);
    }
  })();
  document.addEventListener("change", e => {
    const id = e.target && e.target.id;
    if (id === "set-tbl-compact") setFlag("compact", e.target.checked);
    else if (id === "set-tbl-noborders") setFlag("noborders", e.target.checked);
    else if (id === "exp-glass") setFlag("glass", e.target.checked);
    else if (id === "set-cards-compact") setFlag("cardscompact", e.target.checked);
    else if (id === "set-tbl-cards-desk") { if (window.__tableCardsDesktop) window.__tableCardsDesktop.set(e.target.checked); }
    else if (e.target.dataset && e.target.dataset.tview) {
      const v = e.target.dataset.tview;
      if (v === "compact" || v === "noborders" || v === "cardscompact") setFlag(v, e.target.checked);
      else if (v === "cards" && window.__tableCardsDesktop) { window.__tableCardsDesktop.set(e.target.checked); apply(); }
      syncLook();
    }
  });

  /* ---------- меню «Столбцы»: «Вид таблицы» ---------- */
  function addView(pop){
    if (!pop || pop.querySelector(".hc-view")) return;
    const v = document.createElement("div"); v.className = "hc-view";
    v.innerHTML = `<h4>Вид таблицы</h4>`
      + `<label class="hc-vitem"><input type="checkbox" data-tview="compact"${isOn("compact") ? " checked" : ""}><span>Компактно</span></label>`
      + `<label class="hc-vitem"><input type="checkbox" data-tview="cardscompact"${isOn("cardscompact") ? " checked" : ""}><span>Компактные карточки, несколько в ряд</span></label>`;
    pop.appendChild(v);
  }
  // Меню перерисовывает своё содержимое при каждом изменении — возвращаем блок после каждой перерисовки.
  new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains("hc-pop")) { addView(n); new MutationObserver(() => addView(n)).observe(n, {childList:true}); } })); })
    .observe(document.body, {childList:true});

  /* ---------- Статистика на ПК: «Столбцы» и «Карточки» — в панели фильтров ---------- */
  function placeStatsTools(){
    const hc = $("st-hc"), tv = $("st-tv"), tools = document.querySelector("#tab-stats .st-tools");
    if (!hc || !tools) return;
    if (!hc.querySelector(".st-hc-lbl")) { const s = document.createElement("span"); s.className = "st-hc-lbl"; s.textContent = "Таблица"; const b = hc.querySelector("b"); hc.insertBefore(s, b); }
    if (desk.matches) {
      // Фильтры в правой шторке: кнопки остаются на странице — в строке периода, справа от выбора даты.
      const quick = document.body.classList.contains("filters-right") && $("stats-quick");
      const sec = document.querySelector("#tab-stats .stat-content.active") || document.querySelector("#tab-stats .stat-content");
      const panel = quick || (sec && [...sec.children].find(c => c.classList && c.classList.contains("filters")));
      if (!panel) return;
      let box = panel.querySelector(":scope > .st-desk-tools");
      if (!box) { box = document.createElement("div"); box.className = "st-desk-tools"; box.dataset.noExport = "1"; panel.appendChild(box); }
      document.querySelectorAll(".st-desk-tools").forEach(b => { if (b !== box && !b.querySelector("#st-hc, #st-tv")) b.remove(); });
      if (tv && tv.parentNode !== box) box.appendChild(tv);
      if (hc.parentNode !== box) box.appendChild(hc);
      let cols = $("st-cards-cols");
      if (!cols) {
        const l = document.createElement("label"); l.className = "st-cols"; l.title = "Сколько карточек ставить в один ряд";
        l.innerHTML = `<span>В ряд</span><select id="st-cards-cols" class="no-sheet"><option value="">Авто</option>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}">${n}</option>`).join("")}</select>`;
        cols = l.querySelector("select"); { const stt = statsTable(); cols.value = stt ? colsOf(stt) : ""; }
      }
      if (cols.closest("label").parentNode !== box) box.appendChild(cols.closest("label"));
    } else {
      if (tv && tv.parentNode !== tools) tools.insertBefore(tv, tools.querySelector("#st-hc") || null);
      if (hc.parentNode !== tools) tools.appendChild(hc);
      document.querySelectorAll(".st-desk-tools").forEach(b => { if (!b.children.length) b.remove(); });
    }
  }
  /* ---------- сколько карточек в ряд (на ПК) ---------- */
  const COLS_KEY = "chatstats.cardsCols.v1";
  const cardsCols = () => { const v = lsGet(COLS_KEY, ""); return /^[1-8]$/.test(v) ? v : ""; };
  // На сколько карточки могут выйти за колонку содержимого сайта слева и справа: до краёв окна
  // (с учётом боковых панелей) минус поля по 24 px.
  function cardsBleed(){
    const main = document.querySelector("main"), b = document.body; if (!main) return;
    const cs = getComputedStyle(b), ms = getComputedStyle(main), r = main.getBoundingClientRect();
    const innerL = r.left + parseFloat(ms.paddingLeft || 0), innerR = r.right - parseFloat(ms.paddingRight || 0);
    const minL = parseFloat(cs.paddingLeft || 0) + 24, maxR = document.documentElement.clientWidth - parseFloat(cs.paddingRight || 0) - 24;
    // выход за колонку одинаков слева и справа — тогда карточки стоят ровно по центру содержимого
    const bl0 = Math.max(0, Math.round(innerL - minL)), br0 = Math.max(0, Math.round(maxR - innerR)), bl = Math.min(bl0, br0), br = bl;
    if (b.style.getPropertyValue("--cards-bl") !== bl + "px") b.style.setProperty("--cards-bl", bl + "px");
    if (b.style.getPropertyValue("--cards-br") !== br + "px") b.style.setProperty("--cards-br", br + "px");
  }
  addEventListener("resize", cardsBleed);
  { const mn = document.querySelector("main"); if (mn && window.ResizeObserver) new ResizeObserver(cardsBleed).observe(mn); }
  new MutationObserver(() => setTimeout(cardsBleed, 260)).observe(document.body, {attributes:true, attributeFilter:["class"]});
  cardsBleed();
  // Число карточек в ряд — своё у каждой таблицы (Статистика, Рекорды, Топ месяцев, Марафоны и т. д.).
  const COLS_MAP_KEY = "chatstats.cardsColsByTable.v1";
  let colsMap = {}; try { colsMap = JSON.parse(lsGet(COLS_MAP_KEY, "{}")) || {}; } catch (e) {}
  const tblKey = t => t.dataset.hcKey || t.id || "";
  const colsOf = t => { const v = String(colsMap[tblKey(t)] ?? ""); return /^[1-8]$/.test(v) ? v : (tblKey(t) in colsMap ? "" : cardsCols()); };
  const statsTable = () => [...document.querySelectorAll("#tab-stats table[data-hc]")].find(t => t.offsetParent && !t.closest(".sticky-table-head")) || null;
  const COLS_OPTS = `<option value="">Авто</option>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}">${n}</option>`).join("")}`;
  function applyCols(){
    document.querySelectorAll("main table[data-hc]").forEach(t => {
      // Первый столбец — не «Место/№», а имя, дата, город и т. п.: в карточке он становится заголовком.
      const h0 = t.tHead && t.tHead.rows.length ? t.tHead.rows[t.tHead.rows.length - 1].cells[0] : null;
      const titled = !!h0 && !/^(место|№|#|place|місце|месца|орын)$/i.test(String(h0.dataset.hcName || h0.textContent).replace(/[▲▼△▽↑↓⇅⬍↕]/g, "").trim());
      if (titled !== (t.dataset.cardTitle === "1")) { if (titled) t.dataset.cardTitle = "1"; else delete t.dataset.cardTitle; }
      const v = colsOf(t);
      if (v) { if (t.dataset.cols !== v) t.dataset.cols = v; } else if (t.dataset.cols) delete t.dataset.cols;
      // выбор «В ряд» рядом с кнопкой «Карточки» над каждой таблицей
      const bar = document.querySelector(`.hc-bar[data-for="${t.dataset.hc}"]`);
      if (bar && bar.querySelector(".tv-btn") && !bar.querySelector("select[data-cols-for]")) {
        const l = document.createElement("label"); l.className = "st-cols hc-cols"; l.title = "Сколько карточек ставить в один ряд";
        l.innerHTML = `<span>В ряд</span><select class="no-sheet" data-cols-for="${t.dataset.hc}">${COLS_OPTS}</select>`;
        bar.querySelector(".tv-btn").after(l);
      }
    });
    document.querySelectorAll("select[data-cols-for]").forEach(s => { const t = document.querySelector(`table[data-hc="${s.dataset.colsFor}"]`); const v = t ? colsOf(t) : ""; if (s.value !== v) s.value = v; });
    const st = $("st-cards-cols"), stt = statsTable(); if (st && stt && st.value !== colsOf(stt)) st.value = colsOf(stt);
  }
  document.addEventListener("change", e => {
    const s = e.target; if (!s || s.tagName !== "SELECT") return;
    const t = s.id === "st-cards-cols" ? statsTable() : s.dataset.colsFor ? document.querySelector(`table[data-hc="${s.dataset.colsFor}"]`) : null;
    if (!t) return;
    colsMap[tblKey(t)] = s.value || ""; lsSet(COLS_MAP_KEY, JSON.stringify(colsMap));
    applyCols();
  });
  applyCols(); setInterval(applyCols, 1200);
  let pT = 0; const placeLater = () => { clearTimeout(pT); pT = setTimeout(placeStatsTools, 80); };
  const sn = $("stats-subnav"); if (sn) sn.addEventListener("click", placeLater);
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("nav [data-tab], #ma-tabs button")) placeLater(); });
  if (desk.addEventListener) desk.addEventListener("change", placeLater);
  new MutationObserver(placeLater).observe(document.body, {attributes:true, attributeFilter:["class"]});
  setInterval(() => { if (document.querySelector("#tab-stats.active")) placeStatsTools(); }, 1500);
  const ts = $("tab-stats"); if (ts) new MutationObserver(ms => { if (ms.some(m => m.attributeName === "class")) placeLater(); }).observe(ts, {subtree:true, attributes:true, attributeFilter:["class"]});

  // Стекло: таблицу прокрутили вбок — закреплённому столбцу нужен плотный фон, иначе текст накладывается.
  document.addEventListener("scroll", e => { const w = e.target; if (w && w.classList && w.classList.contains("wrap")) { const on = w.scrollLeft > 0; if (w.classList.contains("glass-hs") !== on) w.classList.toggle("glass-hs", on); } }, true);
  /* ---------- Копирование картинкой со стеклянным эффектом ----------
     Картинка, которую сайт кладёт в буфер, проходит через «стекло»: её фон становится полупрозрачным,
     а под ним — размытые цветные пятна и стеклянная панель с бликом и светлой кромкой. */
  let glassNext = 0;
  // Стекло включено в настройках интерфейса — всё копируется и скачивается со стеклом.
  // Таблицы рисуются со стеклом сразу (см. tableImageBlob) — такую картинку повторно не обрабатываем.
  const glassOn = () => document.body.classList.contains("glass-ui");
  window.__glassWanted = glassOn;
  // Рамка таблиц и графиков на картинках: включена рамка на сайте и не выключена в настройках.
  const TB_EXPORT_KEY = "chatstats.tableBorderExport.v1";
  const frameOn = () => document.body.classList.contains("tb-on") && lsGet(TB_EXPORT_KEY, "1") !== "0";
  const TB_STOPS = {
    rainbow:[["#ff6ad5","#ffd166","#76f0b6","#67e8f9","#a78bfa","#ff6ad5"],"#a78bfa"],
    aurora:[["#76f0b6","#2dd4bf","#67e8f9","#a78bfa","#76f0b6"],"#2dd4bf"],
    sunset:[["#ff7a59","#ffd166","#ff9ecf","#ff6ad5","#ff7a59"],"#ff7a59"],
    ocean:[["#1e66f5","#67e8f9","#2dd4bf","#7aa2f7","#1e66f5"],"#38bdf8"],
    neon:[["#ff2bd6","#00f0ff","#ff2bd6","#00f0ff","#ff2bd6"],"#ff2bd6"],
    fire:[["#ff3d00","#ff9e00","#ffd166","#ff9e00","#ff3d00"],"#ff6a00"],
    gold:[["#8a6a1f","#ffd166","#fff1b0","#e0a526","#8a6a1f"],"#e0a526"],
    silver:[["#6b7486","#dfe6f2","#9aa6bd","#ffffff","#6b7486"],"#9aa6bd"]
  };
  function tbStyle(){ return ["rainbow","aurora","sunset","ocean","neon","fire","gold","silver","accent","comet"].find(x => document.body.classList.contains("tb-" + x)) || ""; }
  function frameGradient(c, style, cx, cy, w, h){
    const cssv = n => (getComputedStyle(document.body).getPropertyValue(n) || "").trim();
    const acc = cssv("--accent") || "#7aa2f7", line = cssv("--line") || "#2c303b";
    const g = typeof c.createConicGradient === "function" ? c.createConicGradient(-Math.PI / 2, cx, cy) : c.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    const n = document.createElement("canvas").getContext("2d"); const norm = v => { n.fillStyle = "#000"; n.fillStyle = v; return n.fillStyle; };
    let glow;
    if (style === "accent") { const soft = "color-mix(in srgb," + acc + " 25%,transparent)"; [[0, soft], [.25, acc], [.5, soft], [.75, acc], [1, soft]].forEach(([o, col]) => g.addColorStop(o, norm(col))); glow = acc; }
    else if (style === "comet") { [[0, line], [.62, line], [.8, acc], [.86, "#ffffff"], [.94, line], [1, line]].forEach(([o, col]) => g.addColorStop(o, norm(col))); glow = acc; }
    else { const [cols, gl] = TB_STOPS[style]; cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); glow = gl; }
    return {grad: g, glow: norm(glow)};
  }
  const rrect = (c, x, y, w, h, r) => { c.beginPath(); if (typeof c.roundRect === "function") c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  // Рамка вокруг таблицы в картинке (вызывается из tableImageBlob). Возвращает true, если нарисовала.
  window.__tbFrameDraw = function(c, x, y, w, h, r){
    if (!frameOn()) return false;
    const style = tbStyle(); if (!style) return false;
    const {grad, glow} = frameGradient(c, style, x + w / 2, y + h / 2, w, h), lw = 1.6;
    c.save();
    // мягкое свечение наружу, как у рамки на сайте
    c.shadowColor = glow; c.shadowBlur = 12; c.globalAlpha = .55; c.strokeStyle = grad; c.lineWidth = lw; rrect(c, x + lw / 2, y + lw / 2, w - lw, h - lw, r); c.stroke();
    c.shadowBlur = 0; c.globalAlpha = 1; c.strokeStyle = grad; c.lineWidth = lw; rrect(c, x + lw / 2, y + lw / 2, w - lw, h - lw, r); c.stroke();
    c.restore();
    return true;
  };
  // Остальные картинки (графики, карточки): рамка по краю самой картинки — у них картинка и есть график.
  // Общая обработка картинки перед копированием или скачиванием: стекло, затем рамка.
  // Общая обработка картинки перед копированием или скачиванием: график (или карточка) ложится
  // на фон страницы с полями со всех сторон; стекло и рамка — по настройкам.
  async function exportPng(blob){
    const done = window.__padRendered;
    if (done && done.size === blob.size && Date.now() - done.t < 15000) return blob;
    return await cardPng(blob);
  }
  // Полупрозрачный фон самой картинки (для стекла): частые тёмные малонасыщенные цвета становятся прозрачнее.
  function glassAlpha(sx, W, H){
    const img = sx.getImageData(0, 0, W, H), d = img.data, hist = new Map();
    for (let i = 0; i < d.length; i += 4 * 7) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (d[i + 3] < 200 || mx - mn > 40 || mx > 120) continue;
      const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
      hist.set(key, (hist.get(key) || 0) + 1);
    }
    const total = [...hist.values()].reduce((a, v) => a + v, 0) || 1;
    const bgs = [...hist.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n / total > .04).slice(0, 4)
      .map(([key]) => [((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4]);
    if (bgs.length) for (let i = 0; i < d.length; i += 4) {
      let best = 1e9;
      for (const c of bgs) { const dr = d[i] - c[0], dg = d[i + 1] - c[1], db = d[i + 2] - c[2], v = dr * dr + dg * dg + db * db; if (v < best) best = v; }
      const t = Math.max(0, Math.min(1, (Math.sqrt(best) - 10) / 46));
      d[i + 3] = Math.round(d[i + 3] * (.2 + .8 * t));
    }
    sx.putImageData(img, 0, 0);
  }
  async function cardPng(blob){
    const bmp = await createImageBitmap(blob);
    const W = bmp.width, H = bmp.height;
    const m = Math.round(Math.max(24, Math.min(90, Math.max(W, H) * .03))), r = Math.round(Math.max(12, m * .55));
    const OW = W + m * 2, OH = H + m * 2, glass = glassOn(), style = frameOn() ? tbStyle() : "";
    const out = document.createElement("canvas"); out.width = OW; out.height = OH;
    const c = out.getContext("2d");
    // Фон вокруг: стекло — пятна за матовым стеклом (или фон страницы, если он выбран), иначе фон страницы или тема
    if (glass) glassBackdrop(c, OW, OH);
    else if (!(typeof window.__pageBgPaint === "function" && window.__pageBgPaint(c, OW, OH))) { c.fillStyle = (getComputedStyle(document.body).getPropertyValue("--bg") || "").trim() || "#0f1117"; c.fillRect(0, 0, OW, OH); }
    let img = bmp;
    if (glass) {
      const src = document.createElement("canvas"); src.width = W; src.height = H;
      const sx = src.getContext("2d"); sx.drawImage(bmp, 0, 0); glassAlpha(sx, W, H); img = src;
    } else {
      // лёгкая тень, чтобы карточка отделялась от фона
      c.save(); c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = m * .6; c.shadowOffsetY = m * .12;
      rrect(c, m, m, W, H, r); c.fillStyle = "#000"; c.fill(); c.restore();
    }
    c.save(); rrect(c, m, m, W, H, r); c.clip();
    if (glass) { c.fillStyle = "rgba(255,255,255,.035)"; c.fillRect(m, m, W, H); }
    c.drawImage(img, m, m, W, H); c.restore();
    if (glass && !style) { c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = Math.max(1, Math.round(W / 1200)); rrect(c, m + .5, m + .5, W - 1, H - 1, r); c.stroke(); }
    if (style) {
      const k = Math.max(1, W / 900), lw = Math.max(2, Math.round(2.2 * k));
      const {grad, glow} = frameGradient(c, style, OW / 2, OH / 2, W, H);
      c.save(); c.shadowColor = glow; c.shadowBlur = 14 * k; c.strokeStyle = grad; c.lineWidth = lw; c.globalAlpha = .55; rrect(c, m - lw / 2, m - lw / 2, W + lw, H + lw, r + lw / 2); c.stroke(); c.restore();
      c.strokeStyle = grad; c.lineWidth = lw; rrect(c, m - lw / 2, m - lw / 2, W + lw, H + lw, r + lw / 2); c.stroke();
    }
    return await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error("Не удалось создать PNG")), "image/png"));
  }
  window.__exportPng = exportPng;
  async function glassify(blob){
    const done = window.__glassRendered;
    if (done && done.size === blob.size && Date.now() - done.t < 15000) return blob;
    const bmp = await createImageBitmap(blob);
    const W = bmp.width, H = bmp.height, k = Math.max(1, W / 1200), pad = Math.round(36 * k);
    const src = document.createElement("canvas"); src.width = W; src.height = H;
    const sx = src.getContext("2d"); sx.drawImage(bmp, 0, 0);
    const img = sx.getImageData(0, 0, W, H), d = img.data;
    // Фоновые цвета картинки — самые частые малонасыщенные тёмные оттенки.
    const hist = new Map();
    for (let i = 0; i < d.length; i += 4 * 7) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (d[i + 3] < 200 || mx - mn > 40 || mx > 120) continue;
      const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
      hist.set(key, (hist.get(key) || 0) + 1);
    }
    const total = [...hist.values()].reduce((a, v) => a + v, 0) || 1;
    const bgs = [...hist.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n / total > .04).slice(0, 4)
      .map(([key]) => [((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4]);
    if (bgs.length) for (let i = 0; i < d.length; i += 4) {
      let best = 1e9;
      for (const c of bgs) { const dr = d[i] - c[0], dg = d[i + 1] - c[1], db = d[i + 2] - c[2], v = dr * dr + dg * dg + db * db; if (v < best) best = v; }
      const t = Math.max(0, Math.min(1, (Math.sqrt(best) - 10) / 46));
      d[i + 3] = Math.round(d[i + 3] * (.2 + .8 * t));
    }
    sx.putImageData(img, 0, 0);
    // Обрезаем пустые поля: справа и снизу у исходной картинки бывает лишний фон (например, когда часть столбцов скрыта).
    // Поля по краям делаем одинаковыми — по самому узкому из них.
    const box = contentBox(d, W, H);
    const m = Math.min(box.x0, box.y0, W - 1 - box.x1, H - 1 - box.y1, Math.round(40 * k));
    const cx0 = Math.max(0, box.x0 - m), cy0 = Math.max(0, box.y0 - m), cx1 = Math.min(W, box.x1 + 1 + m), cy1 = Math.min(H, box.y1 + 1 + m);
    const OW = cx1 - cx0, OH = cy1 - cy0, M = Math.max(OW, OH);
    const out = document.createElement("canvas"); out.width = OW; out.height = OH;
    const c = out.getContext("2d");
    // Одна стеклянная карточка на всю картинку, прямые углы, цветные пятна за матовым стеклом.
    glassBackdrop(c, OW, OH);
    c.drawImage(src, cx0, cy0, OW, OH, 0, 0, OW, OH);
    return await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error("Не удалось создать PNG")), "image/png"));
  }
  // Фон стеклянной картинки: тёмная основа, размытые цветные пятна и матовый слой стекла поверх них.
  function glassBackdrop(c, W, H){
    // Фон страницы «Один цвет» / «Лёгкий градиент»: без цветных пятен, только лёгкий блик стекла
    if (typeof window.__pageBgPaint === "function" && window.__pageBgPaint(c, W, H)) {
      const sh = c.createLinearGradient(0, 0, W * .6, H); sh.addColorStop(0, "rgba(255,255,255,.05)"); sh.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = sh; c.fillRect(0, 0, W, H); return;
    }
    const M = Math.max(W, H), acc = (getComputedStyle(document.body).getPropertyValue("--accent") || "").trim() || "#7aa2f7";
    const tbg = (getComputedStyle(document.body).getPropertyValue("--bg") || "").trim() || "#0d1018";
    const tpanel = (getComputedStyle(document.body).getPropertyValue("--panel") || "").trim() || "#141720";
    c.fillStyle = tbg; c.fillRect(0, 0, W, H);
    const spot = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    c.save(); c.globalAlpha = .55; spot(W * .14, H * .2, M * .45, acc); c.globalAlpha = .4; { const bs = getComputedStyle(document.body), a2 = (bs.getPropertyValue("--accent-2") || "").trim() || "#ff6fb5", c3 = (bs.getPropertyValue("--theme-c3") || "").trim() || "#4fd8ff", c4 = (bs.getPropertyValue("--theme-c4") || "").trim() || "#9b7bff"; spot(W * .9, H * .25, M * .4, a2); spot(W * .6, H * .95, M * .5, c3); c.globalAlpha = .33; spot(W * .3, H * .75, M * .35, c4); } c.restore();
    // матовость: стекло приглушает пятна, как полупрозрачные панели на сайте
    c.save(); c.globalAlpha = .5; c.fillStyle = tpanel; c.fillRect(0, 0, W, H); c.restore();
    const sheen = c.createLinearGradient(0, 0, W * .6, H); sheen.addColorStop(0, "rgba(255,255,255,.07)"); sheen.addColorStop(.5, "rgba(255,255,255,.02)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = sheen; c.fillRect(0, 0, W, H);
  }
  window.__glassBackdrop = glassBackdrop;
  // Границы содержимого: всё, что заметно отличается от цвета углов картинки (фона).
  function contentBox(d, W, H){
    const at = (x, y) => (y * W + x) * 4, c0 = at(0, 0), br = d[c0], bg = d[c0 + 1], bb = d[c0 + 2], ba = d[c0 + 3];
    const differs = i => Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) + Math.abs(d[i + 3] - ba) > 24;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (differs(at(x, y))) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return {x0:0, y0:0, x1:W - 1, y1:H - 1};
    return {x0:Math.max(0, x0 - 1), y0:Math.max(0, y0 - 1), x1:Math.min(W - 1, x1 + 1), y1:Math.min(H - 1, y1 + 1)};
  }
  window.__glassifyPng = glassify;
  (function(){
    const cb = navigator.clipboard; if (!cb || !cb.write || cb.write.__glass) return;
    const orig = cb.write.bind(cb);
    const w = function(items){
      if (typeof ClipboardItem === "undefined") return orig(items);
      const out = [...items].map(it => it && it.types && it.types.includes("image/png") ? new ClipboardItem({"image/png": it.getType("image/png").then(exportPng)}) : it);
      return orig(out);
    };
    w.__glass = true;
    try { cb.write = w; } catch (e) {}
    if (cb.write !== w) { try { Object.defineProperty(cb, "write", {value:w, configurable:true, writable:true}); } catch (e) {} }
  })();
  // Скачивание PNG — с теми же стеклом и рамкой.
  if (typeof downloadBlob === "function" && !downloadBlob.__fx) {
    const origDl = downloadBlob;
    const dl = function(blob, name){
      if (blob && blob.type === "image/png") { exportPng(blob).then(b => origDl(b, name), () => origDl(blob, name)); return; }
      return origDl(blob, name);
    };
    dl.__fx = true;
    window.downloadBlob = dl;
    try { downloadBlob = dl; } catch (e) {}
  }
  // Переключатель в настройках: «Рамка на скопированных и скачанных картинках».
  (function(){
    const sp = $("tb-speed"); if (!sp || $("tb-export")) return;
    const l = document.createElement("label"); l.className = "checkline";
    l.title = "Таблицы и графики, которые ты копируешь или скачиваешь картинкой, получают ту же переливающуюся рамку, что и на сайте";
    l.innerHTML = '<input type="checkbox" id="tb-export">Рамка на скопированных и скачанных картинках';
    sp.closest(".field").after(l);
    const box = $("tb-export"); box.checked = lsGet(TB_EXPORT_KEY, "1") !== "0";
    box.addEventListener("change", () => lsSet(TB_EXPORT_KEY, box.checked ? "1" : "0"));
  })();
  // Кнопки, которые копируют картинку: «Копировать как изображение», «…график», «…топ-10», «…постер» и т. п.
  // Просто «Копировать» на сайте всегда кладёт картинку (графики, сравнение, селфи, время, итоги года, дни рождения);
  // текст копируют только кнопки с уточнением («Копировать настройки», «…ссылку») — их не трогаем.
  const IMG_COPY = /^копировать(\s*$|\s+(как\s+изображение|как\s+картинку|картинку|график|таблицу|топ|все|постер|радар|с\s+описанием|сравнение|с\s+аватарками|карту|результаты|часы|показатели))/i;
  // На других языках подпись кнопки переведена — проверяем исходный русский текст (data-i18n-ru).
  const isImgCopy = b => !!b && b.tagName === "BUTTON" && !b.classList.contains("copy-glass-btn") && IMG_COPY.test((b.dataset.i18nRu || b.textContent || "").replace(/\s+/g, " ").trim()) && !b.closest("#tab-settings, .hc-pop");
  // Кнопки «Со стеклом» убраны: стекло включается настройкой интерфейса и действует на всё копирование.
  function addGlassButtons(){ document.querySelectorAll(".copy-glass-btn").forEach(b => b.remove()); }
  document.addEventListener("click", e => {
    const g = e.target.closest && e.target.closest(".copy-glass-btn");
    if (g) {
      e.preventDefault(); e.stopPropagation();
      if (g.dataset.glassToggle) { g.setAttribute("aria-pressed", g.getAttribute("aria-pressed") === "true" ? "false" : "true"); return; }
      const src = g.__src && g.__src.isConnected ? g.__src : g.previousElementSibling; if (!src) return;
      glassNext = Date.now(); src.click();
      return;
    }
    const b = e.target.closest && e.target.closest("button");
    if (b && isImgCopy(b)) { const t = b.parentElement && b.parentElement.querySelector(':scope > .copy-glass-btn[data-glass-toggle][aria-pressed="true"]'); if (t) glassNext = Date.now(); }
  }, true);
  let gbT = 0; new MutationObserver(() => { clearTimeout(gbT); gbT = setTimeout(addGlassButtons, 150); }).__hub(document.body);
  addGlassButtons();

  apply(); placeStatsTools(); setTimeout(placeStatsTools, 600);
})();
