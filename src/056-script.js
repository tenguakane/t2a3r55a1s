
/* ===================== Хаб: каталог разделов и свежие события ===================== */
(function(){
  const $h = id => document.getElementById(id);
  const WIN_KEY = "chatstats.hubWin.v1";
  let WIN = 14; try { const v = Number(localStorage.getItem(WIN_KEY)); if ([3, 7, 14, 30].includes(v)) WIN = v; } catch (e) {}
  let FIND = "";
  const MONTHS_G = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const dmy = d => { const a = d.split("-"); return `${+a[2]} ${MONTHS_G[+a[1] - 1]}`; };
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const num = v => Math.round(v).toLocaleString("ru-RU");
  const ago = (d, today) => { const n = dayIdx(today) - dayIdx(d); return n <= 0 ? ["сегодня", true] : n === 1 ? ["вчера", false] : [`${n} дн. назад`, false]; };

  const CATALOG = [
    {cat:"Участники", items:[
      {tab:"profile", ic:"👤", t:"Профиль", d:"Личная карточка: цифры, серии, цели, прогноз и активность участника"},
      {tab:"achievements", ic:"🏅", t:"Достижения", d:"Вкладка профиля: уровни, очки и звания участника по десяти достижениям"},
      {tab:"compare", ic:"⚖️", t:"Сравнение", d:"Дуэль двух участников, чатов, месяцев или лет, в том числе на радаре"},
      {tab:"stats", ic:"📊", t:"Статистика", d:"Топ участников и чатов за выбранный день, неделю, месяц или год"},
      {tab:"daymatrix", ic:"🗓️", t:"Матрица", d:"Участники × дни: таблица активности с тепловой заливкой, сравнением периодов и выбором показателя"},
    ]},
    {cat:"Графики и прогнозы", items:[
      {tab:"charts", ic:"📈", t:"Графики", d:"Динамика, столбцы, гонка, годы, тепловые карты и другие виды"},
      {tab:"forecast", ic:"🔮", t:"Прогноз", d:"Сколько сообщений будет к концу месяца и года, прогноз мест"},
      {tab:"records", ic:"🏆", t:"Рекорды", d:"Максимумы участников и чатов за день, неделю и месяц"},
      {tab:"months", ic:"🥇", t:"Топы", d:"Лучшие месяцы и дни за всё время"},
    ]},
    {cat:"События и сообщество", items:[
      {tab:"chronicle", ic:"📜", t:"Хроника чата", d:"Лента всех событий: достижения, рекорды, смены лидеров, серии и вступления с датами"},
      {tab:"birthdays", ic:"🎂", t:"Дни рождения", d:"Календарь, знаки зодиака, часовые пояса и активность в дни рождения"},
      {tab:"selfie", ic:"📸", t:"Селфи", d:"База селфи-пятниц, отметки, импорт и экспорт"},
      {tab:"marathons", ic:"🏁", t:"Марафоны", d:"Соревнования участников за период, результаты и призёры"},
      {tab:"yearreview", ic:"🎬", t:"Итоги года", d:"Постер года, номинации, участники и видео-итоги"},
      {tab:"time", ic:"⏳", t:"Время в чате", d:"Сколько каждый в чате, лента участия и ближайшие юбилеи"},
    ]},
    {cat:"Карта и данные", items:[
      {tab:"usermap", ic:"🗺️", t:"Карта", d:"Где живут участники, самые далёкие и самые близкие пары, статистика по странам и городам"},
      {tab:"vk", ic:"🅥", t:"VK", d:"Архив сообщений из ВКонтакте: отдельная статистика и объединение с общей"},
      {tab:"settings", ic:"⚙️", t:"Настройки", d:"Тема, участники, аватарки, города и дни рождения, Ultimate, кэш, перенос настроек"},
    ]},
  ];
  const NAV_HIDDEN = ["records", "forecast", "selfie", "marathons", "time", "yearreview", "achievements", "chronicle", "birthdays", "usermap", "vk", "months", "days"];
  function go(tab){
    const b = (NAV_HIDDEN.includes(tab) && document.querySelector(`nav button.nav-hidden[data-tab="${tab}"]`)) || document.querySelector(`nav button[data-tab="${tab}"]`);
    if (b) { b.click(); window.scrollTo({top:0}); }
  }

  /* ---------- данные ---------- */
  let CACHE = null;
  function build(){
    if (CACHE && CACHE.src === allRows) return CACHE;
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
    const users = new Map(), tot = new Map(); let latest = "";
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d || vkDay(d)) return;
      const k = String(x[F.userId] ?? x[F.name]), v = Number(g(x, "msgs")) || 0; if (!v) return;
      let u = users.get(k); if (!u) users.set(k, u = {daily:new Map(), first:d}); u.daily.set(d, (u.daily.get(d) || 0) + v); if (d < u.first) u.first = d;
      tot.set(d, (tot.get(d) || 0) + v); if (d > latest) latest = d;
    });
    CACHE = {src:allRows, users, tot, latest}; return CACHE;
  }
  const sumRange = (m, from, to) => { let s = 0; for (let d = from; d <= to; d = addDaysIso(d, 1)) s += m.get(d) || 0; return s; };
  const pct = (a, b) => b > 0 ? (a - b) / b * 100 : null;
  const trend = p => p == null ? "" : `<b class="${p >= 0 ? "hub-up" : "hub-down"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(1)}%</b>`;

  function kpis(D){
    const L = D.latest; if (!L) return "";
    const prev7 = sumRange(D.tot, addDaysIso(L, -7), addDaysIso(L, -1)) / 7, last = D.tot.get(L) || 0;
    const w1 = sumRange(D.tot, addDaysIso(L, -6), L), w0 = sumRange(D.tot, addDaysIso(L, -13), addDaysIso(L, -7));
    const act = new Set(), per = new Map();
    D.users.forEach((u, pk) => { if (!NAMES[pk] || !isVisibleUser(pk)) return; const v = sumRange(u.daily, addDaysIso(L, -6), L); if (v > 0) { act.add(pk); per.set(pk, v); } });
    const lead = [...per.entries()].sort((a, b) => b[1] - a[1])[0];
    const dayWin = [...D.users.entries()].filter(([pk]) => NAMES[pk] && isVisibleUser(pk)).map(([pk, u]) => [pk, u.daily.get(L) || 0]).sort((a, b) => b[1] - a[1])[0];
    const k = (l, v, sub, c) => `<div class="hub-kpi" style="--k:${c}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${sub}</div></div>`;
    return `<div class="hub-kpis">
      ${k(`Сообщений · ${dmy(L)}`, num(last), `${trend(pct(last, prev7))} к среднему за прошлую неделю (${num(prev7)})`, "#7aa2f7")}
      ${k("За 7 дней", num(w1), `${trend(pct(w1, w0))} к предыдущим 7 дням (${num(w0)})`, "#76F0B6")}
      ${k("Активных за неделю", String(act.size), `из ${[...Object.keys(NAMES)].filter(isVisibleUser).length} в списке`, "#ffd166")}
      ${k("Лидер недели", lead ? `<span class="pname" data-open-profile="${esc(lead[0])}">${esc(NAMES[lead[0]])}</span>` : "—", lead ? `${num(lead[1])} сообщ.${dayWin && dayWin[1] ? ` · ${dmy(L)}: ${esc(NAMES[dayWin[0]])} (${num(dayWin[1])})` : ""}` : "", "#f7768e")}
    </div>`;
  }

  function events(D){
    const L = D.latest, today = iso(new Date()), since = addDaysIso(today, -(WIN - 1)), sinceL = L ? addDaysIso(L, -(WIN - 1)) : since;
    const ev = {bd:[], ach:[], rec:[], misc:[]};
    // дни рождения
    try { (window.__bdApi?.upcoming(30) || []).slice(0, 8).forEach(b => ev.bd.push({tab:"birthdays", ic:b.days === 0 ? "🎉" : "🎂", pk:b.pk, name:b.name, sub:dmy(iso(b.date)), dt:b.days === 0 ? ["сегодня", true] : b.days === 1 ? ["завтра", true] : [`через ${b.days} дн.`, b.days <= 3]})); } catch (e) {}
    // достижения
    try { (window.__achApi?.recent(since) || []).slice(0, 8).forEach(e => ev.ach.push({tab:"achievements", ic:"🏅", pk:e.pk, name:e.personName, text:`«${esc(e.name)}», ур. ${esc(e.label)}`, tc:{bronze:"#e3a36b", silver:"#c0c6d4", gold:"#ffd166", diamond:"#67e8f9"}[e.tier], dt:ago(e.date, today), date:e.date})); } catch (e) {}
    // рекорды
    if (L) {
      const best = [];
      D.users.forEach((u, pk) => {
        if (!NAMES[pk] || !isVisibleUser(pk) || u.first >= sinceL) return;
        let mx = 0, md = ""; u.daily.forEach((v, d) => { if (v > mx || (v === mx && d < md)) { mx = v; md = d; } });
        if (md >= sinceL && mx >= 30) best.push({tab:"records", ic:"🔥", pk, name:NAMES[pk], text:`личный рекорд дня: ${num(mx)} сообщ.`, dt:ago(md, today), date:md});
        const st = streakStats(u.daily);
        if (st.maxStreak >= 14 && st.maxEnd && st.maxEnd >= addDaysIso(L, -1) && addDaysIso(st.maxStart, st.maxStreak - 1) >= sinceL && (st.current === st.maxStreak))
          best.push({tab:"records", ic:"⚡", pk, name:NAMES[pk], text:`рекордная серия: ${st.maxStreak} ${wordForm(st.maxStreak, ["день", "дня", "дней"])} подряд`, dt:ago(st.maxEnd, today), date:st.maxEnd});
      });
      let mx = 0, md = ""; D.tot.forEach((v, d) => { if (v > mx) { mx = v; md = d; } });
      if (md >= sinceL) best.push({tab:"records", ic:"🏆", name:"Чат", text:`рекордный день по сообщениям: ${num(mx)}`, dt:ago(md, today), date:md});
      ev.rec = best.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    }
    // селфи и годовщины
    try {
      const sf = new Map(); SELFIE.forEach(r => { if (r.date >= since && r.date <= today) { const a = sf.get(r.date) || []; a.push(r); sf.set(r.date, a); } });
      [...sf.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4).forEach(([d, a]) => ev.misc.push({tab:"selfie", ic:"📸", name:null, text:a.length > 2 ? `${esc(a.slice(0, 2).map(r => NAMES[r.pk] || r.name).join(", "))} и ещё ${a.length - 2}` : esc(a.map(r => NAMES[r.pk] || r.name).join(", ")), sub:"селфи-пятница", dt:ago(d, today), date:d}));
      const t0 = new Date(); const ann = [];
      MEMBERSHIP_STARTS.forEach(([d, id]) => { const pk = String(id); if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !NAMES[pk] || !isVisibleUser(pk)) return;
        let y = t0.getFullYear(), dt = new Date(y, +d.slice(5, 7) - 1, +d.slice(8)); if (dt < new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) dt = new Date(y + 1, +d.slice(5, 7) - 1, +d.slice(8));
        const days = Math.round((dt - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())) / 864e5), yrs = dt.getFullYear() - +d.slice(0, 4);
        if (days <= 14 && yrs > 0) ann.push({tab:"time", ic:"🎈", pk, name:NAMES[pk], text:`${yrs} ${wordForm(yrs, ["год", "года", "лет"])} в чате`, dt:days === 0 ? ["сегодня", true] : [`через ${days} дн.`, false], days}); });
      ann.sort((a, b) => a.days - b.days).slice(0, 4).forEach(a => ev.misc.push(a));
    } catch (e) {}
    return ev;
  }

  const row = e => `<div class="hub-ev" data-hub-go="${e.tab}"><div class="ic">${e.ic}</div><div class="tx">${e.name ? `<span class="pname" ${e.pk ? `data-open-profile="${esc(e.pk)}"` : ""}>${esc(e.name)}</span> ` : ""}${e.tc ? `<span class="hub-tier" style="--tc:${e.tc}"></span>` : ""}${e.text || ""}${e.sub ? `<small>${esc(e.sub)}</small>` : ""}</div><div class="dt${e.dt[1] ? " today" : ""}">${esc(e.dt[0])}</div></div>`;
  const card = (title, list, tab, empty) => `<div class="hub-card"><h3><span>${title}</span>${tab ? `<button class="mini" type="button" data-hub-go="${tab}">Все →</button>` : ""}</h3>${list.length ? list.map(row).join("") : `<div class="hub-empty">${empty}</div>`}</div>`;

  function tileMeta(D, ev){
    const m = {};
    if (ev.bd.length) m.birthdays = `ближайший: ${ev.bd[0].name} — ${ev.bd[0].dt[0]}`;
    if (ev.ach.length) m.achievements = `за ${WIN} дн. новых уровней: ${ev.ach.length}`;
    if (ev.rec.length) m.records = `за ${WIN} дн. событий: ${ev.rec.length}`;
    const sf = ev.misc.find(e => e.tab === "selfie"); if (sf) m.selfie = `последняя: ${sf.dt[0]}`;
    try { const M = window.__umModel; if (M && M.P) m.usermap = `на карте ${M.P.length} из ${M.total}`; } catch (e) {}
    try { const st = window.__vk && window.__vk.state(); if (st && st.DATA) m.vk = st.ON ? "данные VK добавлены в общую статистику" : "данные загружены, объединение выключено"; } catch (e) {}
    if (D.latest) m.stats = `данные по ${dmy(D.latest)}`;
    return m;
  }
  function catalog(meta){
    const q = FIND.trim().toLowerCase();
    return CATALOG.map(c => {
      const items = c.items.filter(i => !q || (i.t + " " + i.d).toLowerCase().includes(q));
      if (!items.length) return "";
      return `<div class="hub-cat"><h3>${c.cat}</h3><div class="hub-grid">${items.map(i => `<button class="hub-tile" type="button" data-hub-go="${i.tab}"><div class="ic">${i.ic}</div><div><b>${i.t}</b><span class="d">${esc(i.d)}</span>${meta[i.tab === "months" ? "months" : i.tab] ? `<span class="m">${esc(meta[i.tab])}</span>` : ""}</div></button>`).join("")}</div></div>`;
    }).join("") || `<div class="hub-empty">Ничего не найдено по запросу «${esc(FIND)}»</div>`;
  }

  let LASTMETA = {};
  const SECS_KEY = "chatstats.hubSecs.v1";
  let SECS_OPEN = true; try { SECS_OPEN = localStorage.getItem(SECS_KEY) !== "0"; } catch (e) {}
  function render(){
    const out = $h("hub-out"); if (!out) return;
    let D = null, ev = {bd:[], ach:[], rec:[], misc:[]};
    if (allRows) { D = build(); try { ev = events(D); } catch (e) { console.error(e); } }
    const meta = D ? tileMeta(D, ev) : {}; LASTMETA = meta;
    const chips = [3, 7, 14, 30].map(n => `<button class="quick-chip${n === WIN ? " active" : ""}" type="button" data-hub-win="${n}">${n} ${wordForm(n, ["день", "дня", "дней"])}</button>`).join("");
    const keep = document.activeElement && document.activeElement.id === "hub-find";
    out.innerHTML = `<div class="hub-hero"><div><h2>Хаб</h2><p class="hint">Все разделы сайта и то, что случилось недавно</p></div></div>
      ${D ? kpis(D) : `<div class="sk sk-poster" style="height:96px"></div>`}
      <div class="hub-sec"><h2>Свежее</h2><div class="quick-ranges" style="margin:0"><span class="qr-label">Период</span>${chips}</div></div>
      <div class="hub-feed">
        ${card("🎂 Ближайшие дни рождения", ev.bd, "birthdays", "В ближайшие 30 дней дней рождения нет или даты не заполнены")}
        ${card("🏅 Новые достижения", ev.ach, "achievements", `За ${WIN} дн. новых уровней нет`)}
        ${ev.rec.length ? card("🔥 Рекорды", ev.rec, "records", "") : ""}
        ${card("📸 События", ev.misc, "", `За ${WIN} дн. селфи и годовщин нет`)}
      </div>
      <div class="hub-sec"><h2><button type="button" class="hub-fold" id="hub-fold" aria-expanded="${SECS_OPEN}"><i>${SECS_OPEN ? "▾" : "▸"}</i> Разделы</button></h2><div class="hub-find"${SECS_OPEN ? "" : " hidden"}><input type="search" id="hub-find" placeholder="Найти раздел…" value="${esc(FIND)}" autocomplete="off"></div></div>
      <div id="hub-cats"${SECS_OPEN ? "" : " hidden"}>${catalog(meta)}</div>
      <div id="hub-digest"></div>`;
    try { window.hubDigest && window.hubDigest($h("hub-digest")); } catch (e) { console.error(e); }
    if (keep) { const f = $h("hub-find"); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  }
  window.loadHub = async function(){
    if (!allRows) { render(); try { await getHistory(); } catch (e) { const o = $h("hub-out"); if (o) o.insertAdjacentHTML("beforeend", `<p class="status err">Не удалось загрузить данные: ${esc(e.message)}</p>`); return; } }
    render();
  };

  document.addEventListener("click", e => {
    const fo = e.target.closest && e.target.closest("#hub-fold");
    if (fo) { SECS_OPEN = !SECS_OPEN; try { localStorage.setItem(SECS_KEY, SECS_OPEN ? "1" : "0"); } catch (err) {} render(); return; }
    const w = e.target.closest && e.target.closest("[data-hub-win]");
    if (w) { WIN = Number(w.dataset.hubWin); try { localStorage.setItem(WIN_KEY, String(WIN)); } catch (err) {} render(); return; }
    if (e.target.closest && e.target.closest("[data-open-profile]")) return;   // имя ведёт в профиль
    const g2 = e.target.closest && e.target.closest("#tab-hub [data-hub-go]");
    if (g2) go(g2.dataset.hubGo);
  });
  if (document.querySelector("#tab-hub.active")) window.loadHub();
  document.addEventListener("input", e => { if (e.target && e.target.id === "hub-find") { FIND = e.target.value; const c = $h("hub-cats"); if (c) c.innerHTML = catalog(LASTMETA); } });
})();
/* --- Хаб: «История обновлений» --- */
(function(){
  const VIEW_KEY = "chatstats.hubView.v1", SEEN_KEY = "chatstats.changelogSeen.v1";
  const TAGS = {new:"Новое", imp:"Улучшено", fix:"Исправлено", del:"Убрано"};
  const LOG = window.CHANGELOG || [];
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const MG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const dLong = d => `${+d.slice(8)} ${MG[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
  let view = "main", tagF = "", q = "", showAll = false;
  const SHOW_N = 7; // сколько последних версий видно сразу, остальные — под «Посмотреть все»
  try { if (localStorage.getItem(VIEW_KEY) === "log") view = "log"; } catch (e) {}
  const seen = () => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch (e) { return ""; } };
  function syncBadge(){ const b = document.getElementById("hub-log-new"); if (b) b.hidden = !LOG.length || seen() === LOG[0].v; }
  function hl(t){ const s2 = esc(t); if (!q) return s2; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); return s2.replace(re, m => `<mark>${m}</mark>`); }
  function render(){
    const box = document.getElementById("hub-log"); if (!box) return;
    const all = LOG.flatMap(v => v.items), cnt = k => all.filter(i => i.tag === k).length;
    const areas = new Set(all.map(i => i.area));
    let h = `<div class="hub-hero"><div><h2>История обновлений</h2><p class="hint">Что и в какой версии появилось на сайте. Сейчас открыта версия <b>${esc(window.__appVersion || (LOG[0] && LOG[0].v) || "")}</b>.</p></div></div>`;
    h += `<div class="cl-sum"><div><b>${LOG.length}</b><span>${wordForm(LOG.length, ["версия", "версии", "версий"])}</span></div><div><b>${cnt("new")}</b><span>новых возможностей</span></div><div><b>${cnt("imp")}</b><span>улучшений</span></div><div><b>${cnt("fix")}</b><span>исправлений</span></div><div><b>${areas.size}</b><span>${wordForm(areas.size, ["раздел затронут", "раздела затронуто", "разделов затронуто"])}</span></div></div>`;
    h += `<div class="quick-ranges cl-filters"><span class="qr-label">Показать:</span>${[["", "Всё"], ...Object.entries(TAGS)].map(([k, n]) => `<button type="button" class="quick-chip${tagF === k ? " active" : ""}" data-cl-tag="${k}">${n}</button>`).join("")}<input type="search" id="cl-find" placeholder="Поиск по изменениям" value="${esc(q)}" autocomplete="off" style="margin-left:8px;min-width:200px"></div>`;
    const ql = q.toLowerCase();
    const vers = LOG.map((v, idx) => ({v, idx, items:v.items.filter(i => (!tagF || i.tag === tagF) && (!ql || (i.text + " " + i.area + " " + v.title + " " + v.v).toLowerCase().includes(ql)))})).filter(x => x.items.length);
    const limited = !q && !showAll && vers.length > SHOW_N, visVers = limited ? vers.slice(0, SHOW_N) : vers;
    h += vers.length ? `<div class="cl-list">` + visVers.map(({v, idx, items}) => {
      const byArea = new Map(); items.forEach(i => { if (!byArea.has(i.area)) byArea.set(i.area, []); byArea.get(i.area).push(i); });
      return `<div class="cl-ver${idx === 0 ? " cur" : ""}"><div class="cl-head"><h3>${hl(v.title)}</h3><code>${esc(v.v)}</code><span class="d">${dLong(v.date)}</span>${idx === 0 ? `<span class="cur-badge">текущая</span>` : ""}</div>`
        + [...byArea.entries()].map(([a, list]) => `<div class="cl-sec"><h4>${hl(a)}</h4><ul>${list.map(i => `<li><span class="cl-tag ${i.tag}">${TAGS[i.tag] || i.tag}</span>${hl(i.text)}</li>`).join("")}</ul></div>`).join("") + `</div>`;
    }).join("") + `</div>` + (limited ? `<div class="cl-more"><button type="button" class="mini" data-cl-all="1">Посмотреть все <span>(${vers.length})</span></button></div>` : (!q && showAll && vers.length > SHOW_N ? `<div class="cl-more"><button type="button" class="mini" data-cl-all="0">Скрыть старые</button></div>` : "")) : `<div class="s-empty">Ничего не найдено.</div>`;
    box.innerHTML = h;
  }
  function apply(){
    document.querySelectorAll("#hub-seg [data-hub-view]").forEach(b => b.classList.toggle("active", b.dataset.hubView === view));
    const out = document.getElementById("hub-out"), log = document.getElementById("hub-log");
    if (out) out.hidden = view === "log"; if (log) log.hidden = view !== "log";
    if (view === "log") { render(); if (LOG.length) { try { localStorage.setItem(SEEN_KEY, LOG[0].v); } catch (e) {} } }
    syncBadge();
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#hub-seg [data-hub-view]");
    if (b) { view = b.dataset.hubView; try { localStorage.setItem(VIEW_KEY, view); } catch (err) {} apply(); return; }
    const t = e.target.closest && e.target.closest("[data-cl-tag]");
    if (t) { tagF = t.dataset.clTag; render(); return; }
    const all = e.target.closest && e.target.closest("[data-cl-all]");
    if (all) { showAll = all.dataset.clAll === "1"; render(); if (!showAll) document.querySelector("#hub-log .cl-more")?.scrollIntoView({block:"center"}); }
  });
  document.addEventListener("input", e => {
    if (e.target && e.target.id === "cl-find") { q = e.target.value.trim(); const pos = e.target.selectionStart; render(); const f = document.getElementById("cl-find"); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (err) {} } }
  });
  window.__changelog = {open(){ view = "log"; apply(); const b = document.querySelector('nav button[data-tab="hub"]'); if (b) b.click(); }};
  apply();
})();
