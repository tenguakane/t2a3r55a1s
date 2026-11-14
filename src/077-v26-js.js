
/* ===================== v26: версия в шапке, строки в «Столбцах», значки в шторке, хаб → достижения, пояснения в настройках ===================== */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const norm = s => String(s || "").replace(/\s+/g, " ").trim();

  /* ---------- 1. Версия — в шапке рядом с названием ---------- */
  (function(){
    const top = document.querySelector("header .top"), h1 = top && top.querySelector("h1"), ver = $("app-ver");
    if (!top || !h1 || !ver || ver.closest(".top-title")) return;
    const wrap = document.createElement("div"); wrap.className = "top-title";
    h1.before(wrap); wrap.append(h1, ver);
  })();

  /* ---------- 9. Цвета для пятен фона: третий и четвёртый — производные от цветов темы ---------- */
  function themeSpots(){
    const cs = getComputedStyle(document.documentElement);
    const a = cs.getPropertyValue("--accent").trim(), b = cs.getPropertyValue("--accent-2").trim();
    const toHsl = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h); if (!m) return null; const n = parseInt(m[1], 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, bb = (n & 255) / 255;
      const mx = Math.max(r, g, bb), mn = Math.min(r, g, bb), l = (mx + mn) / 2; let s = 0, hh = 0;
      if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - bb) / d + (g < bb ? 6 : 0) : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
      return [hh, s, l]; };
    const hsl = (h, s, l) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
    const A = toHsl(a), B = toHsl(b), st = document.body.style;
    if (!A || !B) return;
    // Между цветами темы — соседние оттенки, чтобы фон был в той же гамме, а не в чужих розовых и голубых.
    let mid = (A[0] + B[0]) / 2; if (Math.abs(A[0] - B[0]) > 180) mid += 180;
    st.setProperty("--theme-c3", hsl(mid, Math.max(.5, (A[1] + B[1]) / 2), .58));
    st.setProperty("--theme-c4", hsl(A[0] + 28, Math.max(.45, A[1]), .55));
  }
  themeSpots();
  if (typeof applySiteTheme === "function") {
    const base = applySiteTheme;
    applySiteTheme = function(){ const r = base.apply(this, arguments); try { themeSpots(); } catch (e) {} return r; };
  }

  /* ---------- 3. Меню «Столбцы»: раздел «Строки» ---------- */
  const ENT_NAMES = {participants:"участники", chats:"чаты", recUsers:"участники", recChats:"чаты"};
  const hasExcl = () => typeof EXCLUDED_TABLE_ROWS !== "undefined";
  function tableOfBtn(btn){
    if (!btn) return null;
    const forId = btn.dataset.hcFor || btn.closest(".hc-bar")?.dataset.for;
    return forId ? document.querySelector(`table[data-hc="${forId}"]`) : null;
  }
  // Строки таблицы, которые можно исключить: у каждой есть скрытая кнопка-крестик с ключом и именем.
  function rowsOf(t){
    if (!t || !hasExcl()) return null;
    const btns = [...t.querySelectorAll("[data-exclude-row]")];
    let ent = btns[0]?.dataset.excludeRow || "";
    if (!ent) {
      // Все строки исключены — понимаем таблицу по её id.
      const id = t.id;
      ent = id === "participants-table" ? "participants" : id === "chat-rank-table" ? "chats" : id === "records-table" ? (typeof REC !== "undefined" && REC && REC.entity === "chats" ? "recChats" : "recUsers") : "";
    }
    if (!ent || !EXCLUDED_TABLE_ROWS[ent]) return null;
    const seen = new Set(), list = [];
    btns.forEach(b => { if (b.dataset.excludeRow !== ent) return; const k = String(b.dataset.rowKey ?? ""); if (!k || seen.has(k)) return; seen.add(k); list.push({k, n:b.dataset.rowName || k, on:true}); });
    EXCLUDED_TABLE_ROWS[ent].forEach((n, k) => { if (!seen.has(k)) { seen.add(k); list.push({k, n, on:false}); } });
    if (!list.length) return null;
    list.sort((a, b) => (a.on === b.on ? 0 : a.on ? 1 : -1));
    return {ent, list};
  }
  let rowFind = "";
  function drawRows(pop){
    const btn = document.querySelector('.hc-btn[aria-expanded="true"]'), t = tableOfBtn(btn), info = rowsOf(t);
    let box = pop.querySelector(":scope > .hc-rows");
    if (!info) { if (box) box.remove(); return; }
    const off = info.list.filter(r => !r.on).length;
    const q = rowFind.toLowerCase();
    const items = info.list.filter(r => !q || r.n.toLowerCase().includes(q));
    const html = `<h4>Строки таблицы${off ? `<small>скрыто: ${off}</small>` : ""}</h4>`
      + (info.list.length > 12 ? `<input type="search" class="hc-rfind" placeholder="Найти…" value="${esc(rowFind)}" autocomplete="off">` : "")
      + `<div class="hc-rows-list">${items.map(r => `<label class="hc-ritem${r.on ? "" : " off"}"><input type="checkbox" data-hc-row="${esc(r.k)}" data-hc-rname="${esc(r.n)}" data-hc-ent="${info.ent}"${r.on ? " checked" : ""}><span>${esc(r.n)}</span></label>`).join("") || `<div class="hint" style="padding:6px 8px">Ничего не найдено</div>`}</div>`
      + `<div class="hc-rfoot"><button type="button" data-hc-rows-all="${info.ent}"${off ? "" : " disabled"}>Вернуть все строки</button></div>`;
    const focusFind = document.activeElement && document.activeElement.classList.contains("hc-rfind");
    if (!box) {
      box = document.createElement("div"); box.className = "hc-rows";
      const foot = pop.querySelector(":scope > .hc-foot"), view = pop.querySelector(":scope > .hc-view");
      if (foot) foot.after(box); else if (view) view.before(box); else pop.appendChild(box);
    }
    if (box.__html !== html) { box.innerHTML = html; box.__html = html; }
    if (focusFind) { const f = box.querySelector(".hc-rfind"); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
  }
  function placePop(pop){
    // Меню стало выше — не даём ему уйти за нижний край окна.
    const r = pop.getBoundingClientRect();
    if (r.bottom > innerHeight - 8) pop.style.top = Math.max(8, innerHeight - 8 - r.height) + "px";
  }
  function rowsChanged(ent){
    try { saveExcludedTableRows(); } catch (e) {}
    try { exclRerender(ent); } catch (e) {}
    try { renderExcludedRowsControls(ent); } catch (e) {}
    setTimeout(() => { const p = document.querySelector(".hc-pop"); if (p) { drawRows(p); placePop(p); } badges(); }, 60);
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (!n.classList || !n.classList.contains("hc-pop")) return;
    rowFind = "";
    drawRows(n); requestAnimationFrame(() => placePop(n));
    new MutationObserver(() => { if (!n.querySelector(":scope > .hc-rows")) drawRows(n); }).observe(n, {childList:true});
    n.addEventListener("change", e => {
      const i = e.target; if (!i.dataset || i.dataset.hcRow === undefined) return;
      const ent = i.dataset.hcEnt, k = i.dataset.hcRow; if (!hasExcl() || !EXCLUDED_TABLE_ROWS[ent]) return;
      if (i.checked) EXCLUDED_TABLE_ROWS[ent].delete(k); else EXCLUDED_TABLE_ROWS[ent].set(k, i.dataset.hcRname || k);
      rowsChanged(ent);
    });
    n.addEventListener("click", e => {
      const b = e.target.closest && e.target.closest("[data-hc-rows-all]"); if (!b) return;
      const ent = b.dataset.hcRowsAll; if (!hasExcl() || !EXCLUDED_TABLE_ROWS[ent]) return;
      EXCLUDED_TABLE_ROWS[ent].clear(); rowsChanged(ent);
    });
    n.addEventListener("input", e => { if (e.target.classList.contains("hc-rfind")) { rowFind = e.target.value; drawRows(n); } });
  }))).observe(document.body, {childList:true});
  // Сколько строк скрыто — маленький счётчик на кнопке «Столбцы».
  function badges(){
    document.querySelectorAll(".hc-btn").forEach(b => {
      const info = rowsOf(tableOfBtn(b)), n = info ? info.list.filter(r => !r.on).length : 0;
      let i = b.querySelector(":scope > .hc-rn");
      if (!n) { if (i) i.hidden = true; return; }
      if (!i) { i = document.createElement("i"); i.className = "hc-rn"; b.appendChild(i); }
      i.hidden = false; const txt = "−" + n; if (i.textContent !== txt) i.textContent = txt;
      i.title = `Скрыто строк: ${n}`;
    });
  }
  setInterval(badges, 1500); setTimeout(badges, 800);

  /* ---------- 4. Значки у названий фильтров в шторке ---------- */
  const IC = {
    "Режим":"🗓️", "Дата":"📅", "Месяц":"🈷️", "Год":"📆", "Чат":"💬", "Значения":"🔢", "Параметры":"⚙️", "Количество участников":"👥",
    "Что сравниваем":"⚖️", "Период":"⏱️", "Строки":"📋", "С":"⏮️", "По":"⏭️", "Быстрый выбор":"⚡", "Показатель":"📊", "Участники":"👥",
    "Малоактивные":"💤", "Оформление":"🎨", "Группировать по":"🧩", "Вид графика":"📈", "Шкала цвета":"🌡️", "Места":"🏅", "Дни":"📆",
    "Шкала":"📏", "Шкала графиков":"📏", "События на оси":"📍", "Участники на графике":"👤", "Выделить":"🔦", "Прогноз":"🔮",
    "Потолок оси":"⬆️", "Количество пользователей":"👥", "Участники на карте":"🗺️", "Изображение":"🖼️", "Марафон":"🏁", "Управление":"🛠️",
    "Рекорды":"🏆", "Вид":"👁️", "Сортировка":"↕️", "Порядок":"🔃", "День недели":"📅", "Сравнить с":"⚖️", "Сторис":"🎬", "Участник":"👤",
    "Поиск":"🔍", "База селфи":"📸", "Облако":"☁️", "Сортировка участников":"↕️", "Месяцы":"🗓️", "Итоги":"📜",
    "Убрать вышедших":"🚪", "Отобразить сегодня":"📍", "Сравнивать одинаковый период":"🪞", "Без исключённых":"🚫", "По неделям":"🗂️",
    "Сравнение":"⚖️", "Среднее и медиана":"➗", "Тепловая заливка":"🔥", "Показывать":"👁️"
  };
  const BY_CAT = {period:"⏱️", scope:"🎯", what:"📊", amount:"🔢", look:"🎨", export:"📤", opts:"⚙️", data:"💾"};
  function iconFor(el, text){
    const t = norm(text).replace(/\s*\d+$/, "");
    if (IC[t]) return IC[t];
    const cat = el.closest("[data-fcat]")?.dataset.fcat;
    return BY_CAT[cat] || "";
  }
  function textOf(el){
    // Только собственный текст подписи — без вложенных списков, счётчиков и значков.
    let s = ""; el.childNodes.forEach(n => { if (n.nodeType === 3) s += n.nodeValue; else if (n.nodeType === 1 && n.tagName === "SPAN" && !n.classList.contains("fd-ic") && !n.className) s += n.textContent; });
    return s;
  }
  function decorateDrawer(){
    const body = $("fd-body"); if (!body) return;
    body.querySelectorAll(".field > label, .opt-pop > summary, .filters > .checkline, .opt-pop .checkline, .quick-ranges > .qr-label").forEach(el => {
      if (el.querySelector(":scope > .fd-ic")) return;
      if (!el.dataset.fdRu) el.dataset.fdRu = el.dataset.i18nRu || norm(textOf(el));
      const ic = iconFor(el, el.dataset.fdRu); if (!ic) return;
      const s = document.createElement("i"); s.className = "fd-ic"; s.setAttribute("aria-hidden", "true"); s.textContent = ic;
      if (el.matches(".checkline")) { const inp = el.querySelector(":scope > input"); if (inp) inp.after(s); else el.prepend(s); }
      else el.prepend(s);
    });
  }
  let dT = 0;
  const fdb = $("fd-body");
  if (fdb) new MutationObserver(() => { clearTimeout(dT); dT = setTimeout(decorateDrawer, 40); }).observe(fdb, {childList:true, subtree:true});
  decorateDrawer();

  /* ---------- 5. Шторка сворачивается и разворачивается кнопкой, без выезда по наведению ---------- */
  (function(){
    const dr = $("filter-drawer"); if (!dr) return;
    const tg = dr.querySelector("#fd-toggle"), rail = dr.querySelector("#fd-rail");
    const CHEV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-v26="1"><path d="${d}"/></svg>`;
    const COLLAPSE = CHEV("M9 6l6 6-6 6"), EXPAND = CHEV("M15 6l-6 6 6 6");
    function sync(){
      if (!tg) return;
      const c = document.body.classList.contains("fr-collapsed");
      const want = c ? EXPAND : COLLAPSE, title = c ? "Развернуть фильтры" : "Свернуть фильтры";
      if (tg.dataset.v26 !== (c ? "e" : "c") || !tg.querySelector("[data-v26]")) { tg.innerHTML = want; tg.dataset.v26 = c ? "e" : "c"; }
      if (tg.title !== title) tg.title = title;
      tg.setAttribute("aria-label", title); tg.setAttribute("aria-expanded", c ? "false" : "true"); tg.removeAttribute("aria-pressed");
      if (rail) { rail.title = "Развернуть фильтры"; }
    }
    // Выезд при наведении отключён: класс «подглядывания» сразу снимаем.
    new MutationObserver(() => { if (dr.classList.contains("fr-peek")) dr.classList.remove("fr-peek"); }).observe(dr, {attributes:true, attributeFilter:["class"]});
    new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:["class"]});
    if (tg) new MutationObserver(() => { if (!tg.querySelector("[data-v26]")) { tg.dataset.v26 = ""; sync(); } }).observe(tg, {childList:true});
    sync();
    // Подпись в настройках — про левую панель вкладок; для шторки теперь кнопка.
  })();

  /* ---------- 6. Хаб: клик по свежему достижению — достижения этого участника ---------- */
  function openAchievementsOf(pk){
    pk = String(pk || ""); if (!pk) return false;
    try {
      if (typeof person !== "undefined" && person) {
        if (![...person.options].some(o => o.value === pk)) { const o = document.createElement("option"); o.value = pk; o.textContent = (typeof NAMES !== "undefined" && NAMES[pk]) || `ID ${pk}`; person.appendChild(o); }
        person.value = pk; person.dataset.init = "1";
      }
      localStorage.setItem("chatstats.achPerson.v1", pk);
      const s = $("ach-person"); if (s && [...s.options].some(o => o.value === pk)) s.value = pk;
    } catch (e) {}
    const b = document.querySelector('nav button[data-tab="achievements"]'); if (!b) return false;
    window.__achWant = String(pk);
    b.click();
    setTimeout(() => { try { const s = $("ach-person"); if (s && s.value !== pk && [...s.options].some(o => o.value === pk)) { s.value = pk; s.dispatchEvent(new Event("change", {bubbles:true})); } } catch (e) {} }, 350);
    try { window.scrollTo({top:0, behavior:"smooth"}); } catch (e) { window.scrollTo(0, 0); }
    return true;
  }
  window.__openAchievementsOf = openAchievementsOf;
  document.addEventListener("click", e => {
    const row = e.target.closest && e.target.closest('#tab-hub .hub-ev[data-hub-go="achievements"]'); if (!row) return;
    const pk = row.querySelector("[data-open-profile]")?.dataset.openProfile; if (!pk) return;
    e.preventDefault(); e.stopPropagation();
    openAchievementsOf(pk);
  }, true);
  // Подсказка при наведении на строку достижения.
  function hubTitles(){ document.querySelectorAll('#tab-hub .hub-ev[data-hub-go="achievements"]').forEach(r => { if (!r.title) { const n = r.querySelector(".pname")?.textContent || ""; r.title = n ? `Открыть достижения: ${n}` : "Открыть достижения"; r.style.cursor = "pointer"; } }); }
  const hubOut = document.querySelector("#tab-hub");
  if (hubOut) new MutationObserver(() => hubTitles()).observe(hubOut, {childList:true, subtree:true});

  /* ---------- 10. Пояснения в настройках ---------- */
  const DESC = {
    "Убрать жирный шрифт":"Весь текст сайта, включая заголовки и цифры, станет обычной толщины. Удобно, если жирный кажется слишком плотным.",
    "Мобильная версия в стиле приложения":"На телефоне сайт выглядит как приложение: своя шапка с названием раздела, нижняя панель вкладок, страница «Меню» со всеми разделами, фильтры — в выезжающей шторке. Выключи — будет обычная версия сайта.",
    "Вибрация при нажатиях (Android)":"Короткая вибрация при нажатии на вкладки и переключатели. Работает только на Android, на iPhone браузер вибрацию не поддерживает.",
    "Переливающийся текст у победителей":"Призовые места в таблицах переливаются: 1-е — радугой, 2-е — серебром, 3-е — бронзой. Так же выделяются победитель дуэли, номинанты «Итогов года» и максимальные уровни достижений.",
    "3D-наклон и голографические блики на карточках":"Карточки достижений, профиля, итогов года, сравнения, хаба и тем слегка наклоняются за курсором, по ним скользит блик. У алмазных достижений — радужная голограмма.",
    "Счётчик-табло: цифры в плитках прокручиваются":"Крупные числа в плитках (Хаб, Профиль, Итоги года) при появлении прокручиваются от нуля до нужного значения, как на табло.",
    "Золотой блеск по большим цифрам":"По крупным числам в плитках и рекордах время от времени пробегает золотой отблеск.",
    "Неоновое свечение имени в профиле и сравнении":"Имя участника в шапке профиля и в дуэли на вкладке «Сравнение» светится его цветом.",
    "Огонь у текущей серии":"Рядом с текущей серией активных дней появляется анимированный огонёк — видно, что серия ещё идёт.",
    "Печатная машинка для фактов «Итогов года»":"Интересные факты в «Итогах года» появляются по буквам, будто их печатают.",
    "Бегущая рамка у победителей":"Вокруг карточек и строк с первым местом бежит светящаяся рамка.",
    "Стеклянные подсказки и всплывающие меню":"Подсказки над графиками и выпадающие меню становятся полупрозрачными, с размытием того, что под ними. Работает и без «Стеклянного интерфейса».",
    "Мягкий параллакс-фон в Хабе и Итогах года":"Фон на этих двух страницах слегка смещается при прокрутке — появляется ощущение глубины.",
    "Плавное появление блоков при прокрутке":"Карточки и таблицы плавно проявляются, когда до них доходит прокрутка. Выключи, если хочется видеть всё сразу.",
    "Конфетти: день рождения, новое достижение, победа в дуэли":"В эти моменты по экрану один раз сыплется конфетти.",
    "Салют в «Итогах года» (декабрь и январь)":"В декабре и январе на странице «Итоги года» на фоне запускается салют.",
    "Частицы на фоне (вид выбирается ниже)":"По всему сайту на фоне медленно падают частицы: листья, снег, звёзды и т. п. Вид, количество и размер — в списках ниже.",
    "🥚 Пасхалка в «Профиле»":"Прячет в «Профиле» маленький секрет. Что именно — найди сам.",
    "Пульсирующие плашки годов в «Топ месяцев» и «Топ дней»":"Цветные плашки с годами над этими таблицами мягко пульсируют.",
    "Свечение выделенной линии на графиках":"Линия участника, выбранного в фильтре «Выделить», светится, а остальные приглушаются.",
    "Пульсирующая точка «сейчас» на линиях":"Последняя точка на линейных графиках пульсирует — сразу видно, где «сегодня».",
    "Плавная перестройка столбцов при смене периода":"При смене периода столбики и полоски плавно перетекают в новые значения, а не перерисовываются скачком.",
    "Рамка на скопированных и скачанных картинках":"Таблицы и графики, которые ты копируешь или скачиваешь картинкой, получают ту же переливающуюся рамку, что на сайте. Работает, только если рамка выше включена.",
    "Компактные фильтры: галочки в меню «Параметры»":"Галочки вроде «Убрать вышедших», «Сравнение», «Тепловая заливка» собираются в одно выпадающее меню «Параметры» с числом включённых. Над таблицей становится меньше кнопок.",
    "Современный вид фильтров":"Новое оформление панелей фильтров: скруглённые «капсулы», ползунки вместо квадратных галочек, свои стрелки у списков, единый вид переключателей. Если выключить — вернётся простой вид со стандартными элементами браузера.",
    "Современные выпадающие списки":"Вместо системных выпадающих списков — аккуратное меню с отметкой выбранного пункта и поиском в длинных списках (участники, чаты). Только на компьютере.",
    "Цветные метки у фильтров":"У каждого фильтра появляется тонкая цветная полоска по смыслу: период, чат и кто, что показывать, количество, вид, экспорт. Расшифровка цветов — ниже.",
    "Строки «Среднее» и «Медиана» в итогах таблиц":"Под строкой «Всего» в таблицах «Участники» и «Чаты» добавляются строки со средним и медианным значением по показанным строкам.",
    "Показывать переключатель «Среднее и медиана» над таблицами":"Над таблицами появляется отдельный переключатель, чтобы включать и выключать эти строки прямо там, не заходя в настройки.",
    "Компактные таблицы":"Меньше отступы в ячейках: строки ниже, столбцы уже — на экран помещается больше.",
    "Без линий — только под заголовком":"Внутри таблиц убираются все разделительные линии, остаётся только линия под заголовком. Таблица выглядит легче.",
    "Показывать таблицы карточками на ПК":"Каждая строка таблицы показывается отдельной карточкой. Только на компьютере. Отдельную таблицу можно переключить кнопкой «Карточки» над ней.",
    "Компактные карточки — несколько в ряд":"Карточки меньше и стоят по несколько в ряд: на ПК — сколько поместится, на телефоне — по две.",
    "Стеклянный интерфейс (как в iOS)":"Карточки, таблицы, графики, кнопки и панели становятся полупрозрачными, с размытием цветного фона — как в iOS. Скопированные и скачанные картинки тоже получают стекло. На слабых компьютерах может немного тормозить.",
    "Вкладки слева (только ПК)":"Вкладки переезжают из строки под заголовком в боковую панель слева с иконками. На телефоне остаётся нижняя навигация.",
    "Боковая панель свёрнута и выезжает при наведении (снять — закрепить открытой)":"Левая панель вкладок показывается узкой полоской из иконок и раскрывается, когда наводишь на неё курсор. Сними, чтобы панель всегда была открыта с подписями.",
    "Фильтры справа (только ПК)":"Все фильтры текущей вкладки, а также Ultimate и VK переезжают в шторку справа, по центру остаются только таблица или график. Шторку можно свернуть и развернуть кнопкой в её заголовке. Включает и вкладки слева.",
    "Мини-графики в строках таблиц":"В таблицах «Участники» и «Чаты» появляется столбец «Динамика» — маленький график активности каждого за выбранный период.",
    "Полоски-заливки в ячейках":"В таблицах «Участники» и «Чаты» за числом рисуется полоска: чем больше значение, тем она длиннее. Удобно сравнивать на глаз.",
    "Мини-гистограммы в ячейках всех таблиц":"То же для остальных таблиц сайта (рекорды, топы, марафоны, итоги года и др.): под числом — тонкая полоска, а ячейка подсвечивается тем ярче, чем больше значение.",
    "Подсветка аномальных дней":"Дни, когда сообщений было необычно много или мало по сравнению с привычным уровнем, выделяются цветом. Насколько «необычно» — задаёт «Порог аномалии».",
    "«Тихие участники» на вкладке «Участники»":"Под таблицей «Участники» появляется список тех, кто давно ничего не писал. Сколько дней считать молчанием — выбирается рядом.",
    "Включить Ultimate":"Добавляет в шапку переключатель Ultimate. Когда он включён, отмеченные ниже чаты складываются в один общий чат «Colony Ultimate» во всех таблицах и графиках."
  };
  const FDESC = {
    "fx-season-kind":"Что падает на фоне. «По сезону» меняется само: листопад осенью, снег зимой и т. д.",
    "fx-season-density":"Сколько частиц одновременно на экране. Меньше — спокойнее и легче для слабых компьютеров.",
    "fx-season-size":"Размер частиц на фоне.",
    "tb-style":"Переливающаяся цветная рамка вокруг таблиц и графиков на всех вкладках.",
    "tb-speed":"Как быстро бежит перелив по рамке.",
    "exp-anom-k":"Насколько день должен отличаться от обычного, чтобы считаться аномальным (σ — стандартное отклонение). Меньше число — больше подсвеченных дней.",
    "quiet-days":"Сколько дней подряд без сообщений, чтобы участник попал в «тихие».",
    "live-every":"Как часто сайт сам подгружает новые сообщения, пока вкладка открыта."
  };
  function explain(){
    const tab = $("tab-settings"); if (!tab) return;
    tab.querySelectorAll("label.checkline:not(.set-x)").forEach(l => {
      const inp = l.querySelector(":scope > input"); if (!inp) return;
      const ru = l.dataset.setRu || norm([...l.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(" "));
      l.dataset.setRu = ru;
      const d = DESC[ru] || l.title; if (!d || !ru) return;
      const txt = document.createElement("span"); txt.className = "set-txt";
      const b = document.createElement("b");
      [...l.childNodes].forEach(n => { if (n !== inp) b.appendChild(n); });
      const sm = document.createElement("small"); sm.textContent = d;
      txt.append(b, sm); l.appendChild(txt); l.classList.add("set-x"); l.removeAttribute("title");
    });
    Object.entries(FDESC).forEach(([id, d]) => {
      const el = $(id), f = el && el.closest(".field"); if (!f || f.parentElement.classList.contains("set-frow") || !f.closest("#tab-settings")) return;
      const row = document.createElement("div"); row.className = "set-frow";
      const p = document.createElement("div"); p.className = "set-fdesc"; p.textContent = d;
      f.before(row); row.append(f, p);
    });
  }
  let eT = 0;
  const st = $("tab-settings");
  if (st) new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !(n.classList && (n.classList.contains("set-txt") || n.classList.contains("set-frow")))))) { clearTimeout(eT); eT = setTimeout(explain, 80); } }).observe(st, {childList:true, subtree:true});
  explain(); setTimeout(explain, 600); setTimeout(explain, 2000);
})();
