
/* ===================== Реакции и события =====================
   Данные — снимок API colony-taras.com, вшитый в файл (блок #colony-rx-data выше):
   • /api/v1/reactions — кто и кому ставил реакции. Ранняя история (source: historical_state) известна только как
     «кто → кому»: без даты и вида реакции. Живая часть (source: live) совпадает с /reactions/daily и берётся оттуда;
   • /api/v1/reactions/daily — реакции по дням: дата, кто, кому, смайл, количество;
   • /api/v1/events, /api/v1/events/{id}/levels, /api/v1/event-progress — события, их уровни и прогресс участников.
   Если сайт открыт через сервер статистики и тот пропускает эти адреса, дневные реакции и события догружаются свежими;
   не получилось — молча остаётся снимок.
   В API участники — по telegram_user_id, на сайте — по user_pk. Сопоставление: столбец Telegram ID в истории (если есть) →
   совпадение имени из истории → таблица TG_PK ниже. Кого сопоставить не удалось, показываются под именем из Telegram. */
(() => {
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k) || ""; if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { return ""; } };
  // ключи бывшей беты (переключатель и адреса API) больше не нужны
  ["chatstats.betaRE.v1", "chatstats.betaApiReact.v1", "chatstats.betaApiEvents.v1"].forEach(k => ls(k, ""));

  /* ---------- Вшитые данные ---------- */
  let DATA = {generated_at:"", users:{}, hist:[], daily:[], events:[], progress:[]};
  try { DATA = Object.assign(DATA, JSON.parse(document.getElementById("colony-rx-data")?.textContent || "{}")); } catch (e) {}
  let VER = 0, LIVE_AT = "";

  // telegram_user_id → user_pk — проверено владельцем сайта (30.10.2026). Это сопоставление главнее автоматического.
  const TG_PK = {
    282489954:2,    // Danil Lebedev → Данил
    983725251:89,   // anastasiia.h Стейси → Настя (по указанию владельца 08.11.2026; раньше было 11 → Анастасия)
    457274349:14,   // Алиса 💜 → Алиса
    480247162:16,   // Есет
    526673962:17,   // Александра Градская → Саша
    930906071:19,   // Ivan Sergeev → Ваня
    676243725:20,   // Влада Шибаева → Влада
    544966106:27,   // Mariia → Маша
    354940148:28,   // Ягор → Егор
    94031322:46,    // Лекса
    6891603349:55,  // влад shnape → Влад
    1356218071:60,  // Gonnor → Гоннор
    110077035:64,   // Tishina → Тишина
    6504207841:100, // Horacy Czopek → Жопек
    6674389741:107, // Альона → Алёна
    708596307:108,  // Пан Евджений → Евджений
    347549926:3,    // 𝚊𝚞𝚐𝚞𝚜𝚝 @aug_b → Дима
    7928795272:69,  // Lisa Чан @ginseng_de_mai → Женя
    600274098:5,    // tata ruw → Наташа
    585731542:66,   // Валентность @kindlylyly → Валик
    8880257555:106, // Golden Ambient @fate_write → Миша А.
    660579527:1,    // Quandale Dingle @ervionn → Артём
    1648306748:26,  // Dol @DolWolf19 → Серёга
    392234812:9,    // Tom @Tom_Reynold → Ярик
    943222377:7,    // AveTatty @AveTaric → Адлет
    421699274:76,   // Diloroff @VanDerLord1092 → Миша О.
    679271589:105,  // Vanzha @babyteef → Ульяна
  };
  // Неизвестные аккаунты без имени — в расчётах не участвуют
  const TG_IGNORE = new Set(["5072796396", "5752602790", "6314372730"]);

  const AR = () => (typeof allRows !== "undefined" ? allRows : null);
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const isoD = d => d.toISOString().slice(0, 10);
  const today = () => isoD(new Date());
  const dI = d => Math.floor(Date.parse(d + "T00:00:00Z") / 864e5);
  const fmtN = v => (typeof fmt === "function" ? fmt(v) : String(v));
  const fd = d => (typeof formatMetricDate === "function" ? formatMetricDate(d) : d);
  const wf2 = (n, f) => (typeof wordForm === "function" ? wordForm(n, f) : f[2]);
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const norm = s => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const tgName = id => { const u = DATA.users[id]; if (!u) return ""; const [un, fn, ln] = u; return [fn, ln].filter(Boolean).join(" ").trim() || (un ? "@" + un : ""); };

  /* ---------- Сопоставление telegram_user_id → user_pk ---------- */
  let MAP = null;
  function tgMap(){
    const rowsA = AR();
    if (MAP && MAP.src === rowsA && MAP.ver === VER) return MAP.m;
    const m = new Map(), used = new Set(), ids = Object.keys(DATA.users);
    const set = (tg, pk) => { if (m.has(tg) || used.has(pk)) return; m.set(tg, pk); used.add(pk); };
    if (rowsA && rowsA.length) {
      const byCol = new Map(), byName = new Map();
      const addName = (n, pk) => { n = norm(n); if (!n) return; let s = byName.get(n); if (!s) byName.set(n, s = new Set()); s.add(pk); };
      const seen = new Set();
      rowsA.forEach(x => {
        const pk = String(x[F.userId] ?? ""); if (!pk) return;
        for (const k of ["telegram_user_id", "tg_user_id", "telegram_id", "tg_id"]) if (x[k] != null && x[k] !== "") byCol.set(String(x[k]), pk);
        const fn = x[F.name], sk = pk + "|" + fn; if (seen.has(sk)) return; seen.add(sk);
        addName(fn, pk); if (x.last_name) addName([fn, x.last_name].join(" "), pk);
      });
      ids.forEach(tg => { if (byCol.has(tg)) set(tg, byCol.get(tg)); });
      Object.entries(TG_PK).forEach(([tg, pk]) => set(tg, String(pk)));
      ids.forEach(tg => {
        const u = DATA.users[tg]; if (!u || m.has(tg)) return;
        for (const n of [[u[1], u[2]].filter(Boolean).join(" "), u[1]]) { const s = byName.get(norm(n)); if (s && s.size === 1) { set(tg, [...s][0]); break; } }
      });
    }
    Object.entries(TG_PK).forEach(([tg, pk]) => set(tg, String(pk)));
    MAP = {src:rowsA, ver:VER, m};
    return m;
  }
  const keyOf = id => { id = String(id ?? ""); if (!id || id === "0" || TG_IGNORE.has(id)) return ""; return tgMap().get(id) || "tg" + id; };
  const isTg = k => /^tg\d+$/.test(String(k));
  const nm = pk => NAMES[pk] || (isTg(pk) ? tgName(pk.slice(2)) : "") || `ID ${isTg(pk) ? pk.slice(2) : pk}`;
  const pn = pk => isTg(pk) ? `<span title="Нет в списке участников сайта">${esc(nm(pk))}</span>` : `<span class="pname" data-open-profile="${esc(pk)}">${esc(nm(pk))}</span>`;
  const col = pk => { if (isTg(pk)) return `hsl(${hash(pk) % 360} 55% 62%)`; try { return getStyle("u", pk).c[0]; } catch (e) { return "#7aa2f7"; } };
  const grad = c => { try { if (window.SOFT_GRAD) { const [a, z] = softPair(c); return `linear-gradient(90deg,${a},${z})`; } } catch (e) {} return c; };
  window.__rxName = nm;

  /* ---------- Участники и их «вес» — из истории сообщений ---------- */
  let PEOPLE = null;
  function people(){
    if (PEOPLE && PEOPLE.src === AR()) return PEOPLE.list;
    const w = new Map();
    (AR() || []).forEach(x => { const k = String(x[F.userId] ?? ""); if (!k || !NAMES[k]) return; w.set(k, (w.get(k) || 0) + (Number(g(x, "msgs")) || 0)); });
    if (!w.size) Object.keys(NAMES).forEach(k => w.set(String(k), 1));
    const list = [...w.entries()].filter(([k]) => typeof isVisibleUser !== "function" || isVisibleUser(k)).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({pk:k, w:v}));
    PEOPLE = {src:AR(), list};
    return list;
  }

  /* ---------- Реакции ----------
     Строка: {d:дата или "" (ранняя история), f:кто, t:кому или "" (неизвестно), e:смайл или "", n:сколько} */
  let RXC = null;
  function rxAll(){
    const m = tgMap();
    if (RXC && RXC.m === m && RXC.ver === VER) return RXC.rows;
    const rows = [];
    DATA.hist.forEach(([f, t, n]) => { const a = keyOf(f); if (a) rows.push({d:"", f:a, t:keyOf(t), e:"", n:Number(n) || 1}); });
    DATA.daily.forEach(([d, f, t, e, n, c]) => { const a = keyOf(f); if (a) rows.push({d:String(d).slice(0, 10), f:a, t:keyOf(t), e:e || "", n:Number(n) || 1, c:c || ""}); });
    RXC = {m, ver:VER, rows};
    return rows;
  }
  const SINCE = () => DATA.daily.reduce((a, x) => (!a || x[0] < a ? x[0] : a), "");
  const undatedTotal = () => DATA.hist.reduce((s, x) => s + (Number(x[2]) || 0), 0);
  // Показатели rgive/rgot для строк истории. Каждая строка сама находит свои реакции, без полной истории:
  // строка «все чаты» (chat_pk 0) — все реакции участника за день, строка чата — реакции в этом чате,
  // Colony Ultimate — сумма по входящим в него чатам. Строки VK реакций не получают.
  let CELL = null;
  const chatKey = t => norm(t);
  function cellIndex(){
    const rx = rxAll();
    if (CELL && CELL.rx === rx) return CELL;
    const du = new Map(), dc = new Map();
    const put = (M, k, kind, n) => { let a = M.get(k); if (!a) M.set(k, a = {rgive:0, rgot:0}); a[kind] += n; };
    rx.forEach(x => {
      if (!x.d) return;
      put(du, x.d + "|" + x.f, "rgive", x.n); if (x.t) put(du, x.d + "|" + x.t, "rgot", x.n);
      const c = chatKey(x.c); if (!c) return;
      put(dc, x.d + "|" + x.f + "|" + c, "rgive", x.n); if (x.t) put(dc, x.d + "|" + x.t + "|" + c, "rgot", x.n);
    });
    // для Ultimate: какие чаты встречаются у реакций
    const chats = new Map(); rx.forEach(x => { if (x.c) chats.set(chatKey(x.c), x.c); });
    return CELL = {rx, du, dc, chats};
  }
  window.__betaReactCell = (x, k) => {
    const C = cellIndex(), base = String(x[F.date] ?? "").slice(0, 10) + "|" + String(x[F.userId] ?? ""), pk = x[F.chatPk];
    if (Number(pk) === 0) return C.du.get(base)?.[k] || 0;
    if (typeof isUltPk === "function" && isUltPk(pk)) {
      let s = 0; C.chats.forEach((title, ck) => { if (typeof ultIsMember === "function" && ultIsMember(title)) s += C.dc.get(base + "|" + ck)?.[k] || 0; }); return s;
    }
    return C.dc.get(base + "|" + chatKey(x[F.chat]))?.[k] || 0;
  };
  // Ранние реакции без даты попадают только в выборки без начальной даты («за всё время»)
  const inR = (x, from, to) => x.d ? ((!from || x.d >= from) && (!to || x.d <= to)) : !from;
  const react = {
    range(from, to){ const given = new Map(), got = new Map(), emo = new Map(); let total = 0;
      rxAll().forEach(x => { if (!inR(x, from, to)) return; total += x.n; given.set(x.f, (given.get(x.f) || 0) + x.n); if (x.t) got.set(x.t, (got.get(x.t) || 0) + x.n); if (x.e) emo.set(x.e, (emo.get(x.e) || 0) + x.n); });
      return {total, given, got, emo, topEmoji:[...emo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ""}; },
    between(a, b, from, to){ let ab = 0, ba = 0; rxAll().forEach(x => { if (!inR(x, from, to)) return; if (x.f === a && x.t === b) ab += x.n; else if (x.f === b && x.t === a) ba += x.n; }); return {ab, ba}; },
    totalsIn(pk, from, to){ let given = 0, got = 0; rxAll().forEach(x => { if (!inR(x, from, to)) return; if (x.f === pk) given += x.n; if (x.t === pk) got += x.n; }); return {given, got}; },
    rows:rxAll,
    totals(pk){ pk = String(pk); let given = 0, got = 0; rxAll().forEach(x => { if (x.f === pk) given += x.n; if (x.t === pk) got += x.n; }); return {given, got}; },
    since:SINCE
  };

  /* ---------- События ---------- */
  // Оформление по id события в API; уровни и звания приходят из API
  const EV_META = {
    4:{c1:"#7a1f2b", c2:"#f2c14e", icon:"wand", ach:{name:"Волшебник", icon:"wand"}},
    1:{c1:"#c2410c", c2:"#fb923c", icon:"shuriken", ach:{name:"Шиноби", icon:"shuriken"}},
    3:{c1:"#1d4ed8", c2:"#a5f3fc", icon:"column", ach:{name:"Гречка", icon:"column"}},
  };
  const EV_TH = [10, 15, 20, 25, 30, 35, 40];
  let EVENTS = [];
  function buildEvents(){
    EVENTS = (DATA.events || []).slice().sort((a, b) => String(a.start).localeCompare(String(b.start))).map(e => {
      const meta = EV_META[e.id] || {c1:"#6366f1", c2:"#c4b5fd", icon:"column", ach:{name:e.title, icon:"star"}};
      const levels = (e.levels || []).slice().sort((a, b) => a[0] - b[0]);
      return {id:String(e.id), title:e.title, start:e.start, end:e.end, apiStatus:e.status, c1:meta.c1, c2:meta.c2, icon:meta.icon,
        ach:{name:meta.ach.name, icon:meta.ach.icon, desc:`Достигнуть уровня в событии «${e.title}»`, th:EV_TH},
        ranks:levels.map(([o, n]) => [o, n]), levels};
    });
  }
  buildEvents();
  const EV_ICON = {
    wand:'<path d="M4 20 15 9"/><path d="M14 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1z"/><path d="M19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z"/>',
    shuriken:'<path d="M12 2l2 7 7-2-5 5 5 5-7-2-2 7-2-7-7 2 5-5-5-5 7 2z"/><circle cx="12" cy="12" r="1.6"/>',
    column:'<path d="M4 5h16M5 8h14M4 21h16M5 18h14"/><path d="M7 8v10M10.3 8v10M13.7 8v10M17 8v10"/>'};
  const evSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${EV_ICON[k] || ""}</svg>`;
  let EVC = null;
  function evLevels(){
    const m = tgMap();
    if (EVC && EVC.m === m && EVC.ver === VER) return EVC.lv;
    const lv = new Map();
    (DATA.progress || []).forEach(([id, tg, level, xp]) => { const k = keyOf(tg); if (!k) return; id = String(id); if (!lv.has(id)) lv.set(id, new Map()); lv.get(id).set(k, {level:Number(level) || 0, xp:Number(xp) || 0}); });
    EVC = {m, ver:VER, lv};
    return lv;
  }
  const statusOf = ev => { const t = today(); return t < ev.start ? "soon" : t > ev.end ? "done" : "live"; };
  const rankName = (ev, level) => { let n = ev.ranks?.[0]?.[1] || ""; (ev.ranks || []).forEach(([l, name]) => { if (level >= l) n = name; }); return n; };
  // Прогресс до следующего уровня: доля пройденного внутри текущего уровня и сколько опыта осталось
  const levelProg = (ev, level, xp) => {
    const L = ev.levels || [], cur = L.find(l => l[0] === level), nxt = L.find(l => l[0] === level + 1);
    if (!cur || !nxt) return {pct:100, left:0, next:0};
    const span = (nxt[2] - cur[2]) || 1;
    return {pct:Math.max(0, Math.min(100, (xp - cur[2]) / span * 100)), left:Math.max(0, nxt[2] - xp), next:nxt[0]};
  };
  const levelByXp = (ev, xp) => { let l = 1; (ev.levels || []).forEach(([o, , min]) => { if (xp >= min) l = o; }); return l; };
  const events = {
    list:() => EVENTS.map(ev => ({...ev, status:statusOf(ev)})),
    levelOf:(id, pk) => evLevels().get(String(id))?.get(String(pk))?.level || 0,
    // уровень с запасным поиском: если аккаунт Telegram не сопоставлен с участником сайта, но его имя однозначно совпадает с именем участника
    levelOfLoose:(id, pk) => {
      const m = evLevels().get(String(id)); if (!m) return 0;
      const d = m.get(String(pk))?.level || 0; if (d) return d;
      const want = norm(NAMES[pk] || ""); if (!want) return 0;
      let hit = 0, cnt = 0;
      m.forEach((v, k) => { if (!isTg(k)) return; const n = norm(tgName(k.slice(2))); if (n && (n === want || n.split(" ")[0] === want)) { hit = v.level; cnt++; } });
      return cnt === 1 ? hit : 0;
    },
    people:() => { const s = new Set(people().map(p => p.pk)); evLevels().forEach(m => m.forEach((v, k) => { if (typeof isVisibleUser !== "function" || isVisibleUser(k)) s.add(k); })); return [...s]; },
    inRange(from, to){
      return EVENTS.filter(ev => ev.start <= to && ev.end >= from && ev.start <= today()).map(ev => {
        const m = evLevels().get(ev.id) || new Map(), lead = [...m.entries()].filter(([k]) => typeof isVisibleUser !== "function" || isVisibleUser(k)).sort((a, b) => b[1].xp - a[1].xp)[0];
        return {...ev, status:statusOf(ev), leader:lead ? {pk:lead[0], level:lead[1].level} : null, rank:lead ? rankName(ev, lead[1].level) : "", rankOf:l => rankName(ev, l)};
      });
    }
  };
  window.__beta = {react, events, name:nm};

  /* ---------- Свежие данные через сервер статистики (если он пропускает эти адреса) ---------- */
  async function getJson(path){
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
    try { const r = await fetch(new URL(path, CONFIG.BASE_URL), {cache:"no-store", signal:ctl.signal}); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
    finally { clearTimeout(tm); }
  }
  async function getAll(path){
    const items = []; let cur = null, guard = 0;
    do { const j = await getJson(path + (path.includes("?") ? "&" : "?") + "limit=500" + (cur ? "&cursor=" + encodeURIComponent(cur) : "")); if (!Array.isArray(j?.items)) throw new Error("неожиданный ответ"); items.push(...j.items); cur = j.next_cursor; } while (cur && ++guard < 100);
    return items;
  }
  const addUser = u => { if (!u || !(u.telegram_user_id > 0)) return 0; DATA.users[String(u.telegram_user_id)] = [u.username || "", u.first_name || "", u.last_name || ""]; return u.telegram_user_id; };
  let LIVE_P = null, LIVE_ERR = "", LIVE_TRY = "";
  const errText = (what, e) => { const m = String(e?.message || e || ""); return `${what}: ${/404/.test(m) ? "сервер статистики не пропускает этот адрес (404)" : /40[13]/.test(m) ? "сервер отказал в доступе (" + m.replace(/\D+/g, "") + ")" : /abort/i.test(m) ? "сервер не ответил за 20 секунд" : /fetch|network/i.test(m) ? "нет связи с сервером статистики" : m}`; };
  function refreshLive(force){
    if (force) LIVE_P = null;
    if (LIVE_P || typeof CONFIG === "undefined" || !CONFIG.BASE_URL) return LIVE_P;
    LIVE_TRY = "1";
    return LIVE_P = (async () => {
      let changed = false; const errs = [];
      try {
        const items = await getAll("/api/v1/reactions/daily"), m = new Map();
        items.forEach(x => {
          const f = addUser(x.giver); if (!f) return;
          const t = x.receiver_unknown ? 0 : addUser(x.receiver), e = x.reaction?.emoji || "", k = [x.stat_date, f, t, e, x.chat_title || ""].join("\u0001");
          m.set(k, (m.get(k) || 0) + (Number(x.reaction_count) || 1));
        });
        if (m.size) { DATA.daily = [...m.entries()].map(([k, n]) => { const [d, f, t, e, c] = k.split("\u0001"); return [d, +f, +t, e, n, c]; }); changed = true; }
      } catch (e) { errs.push(errText("Реакции", e)); }
      try {
        const evs = await getAll("/api/v1/events"), prog = await getAll("/api/v1/event-progress");
        const full = await Promise.all(evs.map(async e => {
          const lv = (await getJson(`/api/v1/events/${e.id}/levels`)).items || [];
          return {id:e.id, title:e.title, status:e.status, start:e.start_date, end:e.end_date, levels:lv.map(l => [l.order, l.name, l.min_experience])};
        }));
        if (full.length) {
          DATA.events = full;
          DATA.progress = prog.map(x => { if (!DATA.users[String(x.telegram_user_id)]) DATA.users[String(x.telegram_user_id)] = ["", "", ""]; return [x.event_id, x.telegram_user_id, x.level?.order || 0, x.experience || 0]; });
          buildEvents(); changed = true;
        }
      } catch (e) { errs.push(errText("События", e)); }
      LIVE_ERR = errs.join(" · "); LIVE_TRY = "";
      if (changed) { LIVE_AT = new Date().toISOString(); VER++; }
      rerender();
    })();
  }

  /* ---------- Профиль участника: реакции и события ---------- */
  window.__beta.profileHtml = (pk, color) => {
    pk = String(pk);
    const t = today(), P = [["Сегодня", t, t], ["Этот месяц", t.slice(0, 7) + "-01", t], ["Этот год", t.slice(0, 4) + "-01-01", t], ["За всё время", "", ""]];
    const place = (m, v) => { if (!v) return "—"; let better = 0, n = 0; m.forEach((x, k) => { if (typeof isVisibleUser === "function" && !isVisibleUser(k)) return; if (x > 0) n++; if (x > v) better++; }); return `${better + 1} из ${n}`; };
    // Периоды без реакций не занимают строку — они перечислены под таблицей
    const rxEmpty = [];
    const rowsT = P.map(([l, f, to]) => { const R = react.range(f, to), gv = R.given.get(pk) || 0, gt = R.got.get(pk) || 0;
      if (!gv && !gt) { rxEmpty.push(l); return ""; }
      return `<tr><td style="text-align:left">${l}</td><td><b>${fmtN(gv)}</b> <small class="hint">${place(R.given, gv)}</small></td><td><b>${fmtN(gt)}</b> <small class="hint">${place(R.got, gt)}</small></td></tr>`; }).join("");
    const rxEmptyNote = rxEmpty.length ? `<p class="hint re-prof-empty">${rxEmpty.map((l, i) => i ? l.charAt(0).toLowerCase() + l.slice(1) : l).join(", ")} — реакций не было.</p>` : "";
    const toM = new Map(), fromM = new Map(), emo = new Map();
    rxAll().forEach(x => { if (x.f === pk) { if (x.t) toM.set(x.t, (toM.get(x.t) || 0) + x.n); if (x.e) emo.set(x.e, (emo.get(x.e) || 0) + x.n); } if (x.t === pk) fromM.set(x.f, (fromM.get(x.f) || 0) + x.n); });
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    const L = evLevels();
    const evCards = EVENTS.filter(ev => ev.start <= t).map(ev => {
      const m = L.get(ev.id) || new Map(), me = m.get(pk), st = statusOf(ev);
      const order = [...m.entries()].sort((a, b) => b[1].xp - a[1].xp), pl = order.findIndex(([k]) => k === pk) + 1, tl = me ? ev.ach.th.filter(x => me.level >= x).length : 0;
      const ROM = ["—", "I", "II", "III", "IV", "V", "VI", "VII"], TC = l => l <= 0 ? "#4a5060" : l <= 3 ? "#e3a36b" : l <= 6 ? "#c0c6d4" : "#ffd166";
      return `<div class="ev-card" data-ev-open="${esc(ev.id)}" style="--ec1:${ev.c1};--ec2:${ev.c2}"><h3>${evSvg(ev.icon)}${esc(ev.title)}</h3><p class="hint">${fd(ev.start)} — ${fd(ev.end)}${st === "live" ? " · идёт" : ""}</p>
        ${me && st === "live" ? (() => { const fc = forecastEvent(ev)?.list.find(x => x.k === pk); return fc ? `<div class="ev-meta"><span>Прогноз к концу: <b>ур. ${fc.end}</b> · ${fc.place}-е место</span></div>` : ""; })() : ""}${me ? `<div class="ev-meta"><span>Уровень: <b>${me.level}</b></span><span>${esc(rankName(ev, me.level))}</span></div><div class="ev-meta"><span>Место: <b>${pl}</b> из ${m.size}</span><span>«${esc(ev.ach.name)}»: <span class="ev-tier" style="--tc:${TC(tl)}">${ROM[tl]}</span></span></div>` : `<div class="ev-meta"><span>Не участвовал(а)</span></div>`}</div>`;
    }).join("");
    const since = SINCE();
    return `<div class="rx-emo-scope"><h2>Реакции ${dataNote()}</h2>
      ${rowsT ? `<div class="wrap"><table class="re-prof"><thead><tr><th style="text-align:left">Период</th><th>Поставил(а)</th><th>Получил(а)</th></tr></thead><tbody>${rowsT}</tbody></table></div>` : ""}${rxEmptyNote}
      ${since && undatedTotal() ? `<p class="hint re-prof-note">Даты реакций записываются с ${fd(since)}; более ранние реакции входят только в «За всё время».</p>` : ""}
      <div class="bx-grid">
        <div class="bx-card"><h3>Кому ставит реакции</h3><p class="hint">Топ-5 за всё время</p>${bars(top(toM, 5).map(([k, v]) => ({lbl:esc(nm(k)), v, c:col(k)})), {empty:"Реакций не ставил(а)"})}</div>
        <div class="bx-card"><h3>Кто ставит реакции</h3><p class="hint">Топ-5 за всё время</p>${bars(top(fromM, 5).map(([k, v]) => ({lbl:esc(nm(k)), v, c:col(k)})), {empty:"Реакций не получал(а)"})}</div>
        <div class="bx-card"><h3>Любимые реакции</h3><p class="hint">Что ставит чаще всего${since ? ` (с ${fd(since)})` : ""}</p>${bars(top(emo, 5).map(([e, v]) => ({lbl:e, v, bg:grad(color || col(pk))})), {emo:true})}</div>
      </div>
      </div><h2>События ${dataNote()}</h2><div class="ev-timeline">${evCards}</div>`;
  };
  document.addEventListener("click", e => {
    const c = e.target.closest?.("[data-ev-open]"); if (!c) return;
    EVSEL = c.dataset.evOpen; ls("chatstats.eventSel.v1", EVSEL); nav.querySelector('button[data-tab="events"]')?.click();
  });

  /* ---------- Навигация: «Топы», Селфи/Время/ДР в Хабе, новые вкладки ---------- */
  const nav = document.querySelector("nav");
  const HUB_SUB = ["time", "birthdays"], TOPS = ["months", "days"];
  const hideBtns = () => {
    nav.querySelectorAll("button[data-tab]").forEach(b => {
      const t = b.dataset.tab;
      if (b.classList.contains("nav-hidden") && (t === "days" || HUB_SUB.includes(t))) b.classList.add("beta-hide");
      if (b.classList.contains("nav-hidden") && t === "months") { b.textContent = "Топы"; b.title = "Топы"; b.dataset.betaTops = "1"; }
      if (t === "reactions") b.style.order = "17";
      if (t === "events") b.style.order = "18";
      // «Селфи» — отдельная вкладка на главной панели, между «Событиями» и «Рекордами»
      if (t === "selfie") {
        b.style.order = "19"; b.classList.remove("nav-hidden", "beta-hide", "side-skip"); b.classList.add("selfie-main");
        // Своего обработчика у кнопки нет (раньше её открывала группа «Другое») — открываем вкладку через кнопку группы и подсвечиваем «Селфи»
        b.onclick = () => {
          const g = nav.querySelector('button[data-group="other"]'); if (!g) return;
          const prev = g.dataset.tab; g.dataset.tab = "selfie"; g.click();
          const mark = () => { nav.querySelectorAll("button.active, button.side-active").forEach(x => { if (x !== b) x.classList.remove("active", "side-active"); }); b.classList.add("active"); if (document.body.classList.contains("side-nav")) b.classList.add("side-active"); };
          mark(); setTimeout(() => { g.dataset.tab = prev && prev !== "selfie" ? prev : "records"; mark(); }, 30); setTimeout(mark, 150);
          try { history.replaceState(null, "", "#selfie"); } catch (e) {}
        };
      }
    });
  };
  hideBtns();
  // В переключателях «Другое» (верхнее меню): одна кнопка «Топы», без перенесённых в Хаб
  document.querySelectorAll('.seg.group-tabs[data-group-seg="other"]').forEach(seg => {
    seg.querySelectorAll("button[data-gtab]").forEach(b => { const t = b.dataset.gtab; if (t === "days" || t === "selfie" || HUB_SUB.includes(t)) b.classList.add("beta-hide"); if (t === "months") { b.textContent = "Топы"; b.dataset.betaTops = "1"; } });
    const sec = seg.closest("section.tab");
    if (sec && (HUB_SUB.includes(sec.id.slice(4)) || sec.id === "tab-selfie")) seg.classList.add("beta-hide");
    if (sec && TOPS.includes(sec.id.slice(4))) { const b = seg.querySelector('[data-beta-tops]'); if (b) b.classList.add("active"); }
  });
  // «Топ месяцев | Топ дней» внутри вкладки «Топы»
  TOPS.forEach(t => {
    const sec = document.getElementById("tab-" + t); if (!sec || sec.querySelector(".tops-seg")) return;
    const seg = document.createElement("div"); seg.className = "seg group-tabs tops-seg";
    seg.innerHTML = TOPS.map(x => `<button type="button" data-gtab="${x}" class="${x === t ? "active" : ""}">${x === "months" ? "Топ месяцев" : "Топ дней"}</button>`).join("");
    const after = sec.querySelector(':scope > .seg.group-tabs[data-group-seg="other"]');
    after ? after.after(seg) : sec.prepend(seg);
  });
  // Хаб: Хаб | Селфи | Время | Дни рождения | История обновлений
  const hubSeg = document.getElementById("hub-seg");
  if (hubSeg && !hubSeg.querySelector("[data-gtab]")) {
    const log = hubSeg.querySelector('[data-hub-view="log"]');
    HUB_SUB.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.dataset.gtab = t; b.textContent = {selfie:"Селфи", time:"Время", birthdays:"Дни рождения"}[t]; hubSeg.insertBefore(b, log); });
  }
  HUB_SUB.forEach(t => {
    const sec = document.getElementById("tab-" + t); if (!sec || sec.querySelector(".hubsub-seg")) return;
    const seg = document.createElement("div"); seg.className = "seg group-tabs hubsub-seg";
    seg.innerHTML = `<button type="button" data-hub-jump="main">Хаб</button>` + HUB_SUB.map(x => `<button type="button" data-gtab="${x}" class="${x === t ? "active" : ""}">${{selfie:"Селфи", time:"Время", birthdays:"Дни рождения"}[x]}</button>`).join("") + `<button type="button" data-hub-jump="log">История обновлений</button>`;
    sec.prepend(seg);
  });
  document.addEventListener("click", e => {
    const j = e.target.closest?.("[data-hub-jump]"); if (!j) return;
    const hb = nav.querySelector('button[data-tab="hub"]:not(.nav-hidden)') || nav.querySelector('button[data-tab="hub"]');
    hb?.click(); setTimeout(() => document.querySelector(`#hub-seg [data-hub-view="${j.dataset.hubJump}"]`)?.click(), 30);
  });
  // Подсветка: на Селфи/Времени/ДР — «Хаб», на Топах — «Топы»
  const curTab = () => document.querySelector("main > section.tab.active")?.id.slice(4) || "";
  function syncNav(){
    const t = curTab();
    const hub = nav.querySelector('button[data-tab="hub"]:not(.nav-hidden)'), tops = nav.querySelector("button[data-beta-tops]");
    if (HUB_SUB.includes(t) && hub) {
      nav.querySelectorAll("button.active").forEach(b => { if (b !== hub) b.classList.remove("active"); });
      hub.classList.add("active");
      nav.querySelectorAll("button.side-active").forEach(b => { if (b !== hub) b.classList.remove("side-active"); });
      if (document.body.classList.contains("side-nav")) hub.classList.add("side-active");
    }
    if (TOPS.includes(t) && tops && document.body.classList.contains("side-nav")) {
      nav.querySelectorAll("button.side-active").forEach(b => { if (b !== tops) b.classList.remove("side-active"); });
      tops.classList.add("side-active");
    }
    if (hubSeg) hubSeg.querySelectorAll("[data-gtab]").forEach(b => b.classList.remove("active"));
  }
  const later = () => { setTimeout(syncNav, 20); setTimeout(syncNav, 120); };
  document.addEventListener("click", later);
  new MutationObserver(later).observe(document.querySelector("main"), {attributes:true, subtree:true, attributeFilter:["class"], attributeOldValue:false});
  later();

  /* ---------- Телефон: меню ---------- */
  const maMenu = document.getElementById("ma-menu");
  function fixMenu(){
    if (!maMenu) return;
    maMenu.querySelectorAll("[data-ma-go]").forEach(r => {
      const t = r.dataset.maGo;
      if (t === "days" || HUB_SUB.includes(t)) r.hidden = true;
      if (t === "months") { const sp = r.querySelector(".ma-txt > span"); if (sp && sp.lastChild && sp.lastChild.nodeValue !== "Топы") { if (sp.lastChild.nodeType === 3) sp.lastChild.nodeValue = "Топы"; else sp.append("Топы"); } }
    });
    const first = maMenu.querySelector('[data-ma-go="records"]');
    if (first && !maMenu.querySelector('[data-ma-go="reactions"]')) {
      const sf = maMenu.querySelector('[data-ma-go="selfie"]'); if (sf) first.before(sf);
      ["reactions", "events"].forEach(t => {
        const c = first.cloneNode(true); c.dataset.maGo = t; c.classList.remove("cur");
        const ic = c.querySelector(".ma-ico"); if (ic) { ic.innerHTML = window.__lineIcon?.forTab(t) || "•"; ic.style.setProperty("--c", t === "reactions" ? "#ff375f" : "#bf5af2"); }
        const sp = c.querySelector(".ma-txt > span"); if (sp) sp.innerHTML = (sp.querySelector(".li-lead")?.outerHTML || "") + (t === "reactions" ? "Реакции" : "События");
        (sf || first).before(c);
      });
    }
  }
  if (maMenu) new MutationObserver(() => { if (!maMenu.__fx) { maMenu.__fx = 1; fixMenu(); maMenu.__fx = 0; } }).observe(maMenu, {childList:true, subtree:true});
  document.addEventListener("click", e => { const r = e.target.closest?.('#ma-menu [data-ma-go="reactions"], #ma-menu [data-ma-go="events"]'); if (r) { e.stopPropagation(); nav.querySelector(`button[data-tab="${r.dataset.maGo}"]`)?.click(); document.getElementById("ma-menu")?.classList.remove("open"); } }, true);

  /* ---------- Общие куски разметки ---------- */
  const tile = (lbl, num, place) => `<div class="tile"><div class="lbl">${esc(lbl)}</div><div class="num">${num}</div><div class="place">${place || ""}</div></div>`;
  const bars = (list, opt = {}) => {
    if (!list.length) return `<div class="bx-empty">${esc(opt.empty || "Нет данных")}</div>`;
    const mx = Math.max(...list.map(x => x.v)) || 1;
    return `<div class="bx-list">${list.map(x => `<div class="bx-row${opt.emo ? " emo" : ""}" title="${esc(x.title || "")}"><span>${x.lbl}</span><div class="bx-bar"><i style="width:${(x.v / mx * 100).toFixed(1)}%;background:${x.bg || grad(x.c || "#7aa2f7")}"></i></div><b>${fmtN(x.v)}</b></div>`).join("")}</div>`;
  };
  const dataNote = () => {
    const d = LIVE_AT || DATA.generated_at, dt = new Date(d); if (!d || isNaN(dt)) return "";
    const s = dt.toLocaleString("ru-RU", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
    const tip = LIVE_TRY ? "Загружаю свежие данные…" : LIVE_ERR ? "Свежие данные не загрузились — " + LIVE_ERR + ". Нажми, чтобы попробовать ещё раз" : LIVE_AT ? "Загружено с сервера статистики. Нажми, чтобы обновить" : "Снимок, встроенный в сайт. Нажми, чтобы загрузить свежие данные";
    return `<button type="button" class="rx-badge rx-refresh${LIVE_ERR && !LIVE_AT ? " err" : ""}" data-rx-refresh title="${esc(tip)}">${LIVE_TRY ? "обновляю…" : `${LIVE_AT ? "обновлено" : "данные на"} ${s}`} <span aria-hidden="true">⟳</span></button>${LIVE_ERR && !LIVE_TRY ? `<span class="rx-err">${esc(LIVE_ERR)}</span>` : ""}`;
  };
  const loading = id => { const o = document.getElementById(id); if (o) o.innerHTML = `<div class="sk sk-poster" style="height:120px"></div>`; };

  /* ---------- Копирование картинкой: таблицы, плитки и графики на «Реакциях» и «Событиях» ---------- */
  const CPY = (() => {
    const th = () => ({tx:cmpThemeVar("--text", "#e8eaf1"), mu:cmpThemeVar("--muted", "#9aa0b0"), ln:cmpThemeVar("--line", "#2c303b"), ac:cmpThemeVar("--accent", "#7aa2f7")});
    const txt = el => (el ? el.textContent : "").replace(/\s+/g, " ").trim();
    const fit = (t, n) => (typeof cmpFit === "function" ? cmpFit(t, n) : String(t).slice(0, n));
    const FF = "Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif";
    const doc = (W, H, body, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FF}"><defs>${defs}</defs>${body}</svg>`;
    const head = (c, title, W, sub) => `<text x="36" y="56" font-size="26" font-weight="700" fill="${c.tx}">${esc(fit(title, 54))}</text><text x="${W - 36}" y="56" font-size="14" fill="${c.mu}" text-anchor="end">Colony Stats · ${new Date().toLocaleDateString("ru-RU")}</text>` + (sub ? `<text x="36" y="84" font-size="15" fill="${c.mu}">${esc(fit(sub, 115))}</text>` : "");
    async function blob(svgStr, W){
      const box = document.createElement("div"); box.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;pointer-events:none`;
      box.innerHTML = svgStr; document.body.appendChild(box);
      try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
    }
    // Смайл iOS как data-URL для SVG (внешние картинки в экспортируемом SVG не грузятся)
    const emoCache = new Map();
    async function emoData(e){
      if (emoCache.has(e)) return emoCache.get(e);
      let url = null; const im = new Image(); im.crossOrigin = "anonymous";
      const v = window.__iosEmoji?.variants(e) || [];
      for (const name of v) { try { im.src = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/" + name + ".png"; await im.decode(); const c = document.createElement("canvas"); c.width = c.height = 64; c.getContext("2d").drawImage(im, 0, 0, 64, 64); url = c.toDataURL("image/png"); break; } catch (err) {} }
      emoCache.set(e, url); return url;
    }
    // Цвета полоски: из вычисленного фона (градиент → две точки)
    function colorsOf(el, fb){
      const cs = getComputedStyle(el), bg = cs.backgroundImage + " " + cs.backgroundColor;
      const conv = c => { const k = c.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i); return k ? `rgb(${Math.round(k[1] * 255)},${Math.round(k[2] * 255)},${Math.round(k[3] * 255)})` : c; };
      const list = (bg.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b|color\(srgb[^)]*\)|hsla?\([^)]*\)/gi) || []).map(conv).filter(c => !/rgba\([^)]*,\s*0\)$/.test(c));
      return list.length ? [list[0], list[list.length - 1]] : [fb, fb];
    }
    // Карточка с горизонтальными полосками (.bx-list)
    async function hbars(card){
      const c = th(), title = txt(card.querySelector("h3")), sub = txt(card.querySelector(".hint")), rows = [...card.querySelectorAll(".bx-row")];
      if (!rows.length) throw new Error("Нет данных");
      const onlyEmo = rows.every(r => r.querySelector(":scope > span img.ios-emo"));
      const W = 1000, top = sub ? 112 : 92, rh = 38, H = top + rows.length * rh + 30, bx = onlyEmo ? 96 : 330, bw = W - bx - 130;
      let o = head(c, title, W, sub), defs = "";
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], lab = r.querySelector(":scope > span"), bar = r.querySelector(".bx-bar > i"), y = top + i * rh;
        const pct = Math.max(0, Math.min(100, parseFloat(bar?.style.width) || 0)), [c1, c2] = colorsOf(bar, c.ac), em = lab?.querySelector("img.ios-emo");
        if (em) { const d = await emoData(em.alt); o += d ? `<image href="${d}" x="${bx - 44}" y="${y - 2}" width="28" height="28"/>` : `<text x="${bx - 16}" y="${y + 20}" font-size="22" text-anchor="end">${esc(em.alt)}</text>`; }
        else o += `<text x="${bx - 16}" y="${y + 19}" font-size="15" text-anchor="end" fill="${c.tx}">${esc(fit(txt(lab), 34))}</text>`;
        defs += `<linearGradient id="cg${i}" x1="0" x2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
        o += `<rect x="${bx}" y="${y + 5}" width="${bw}" height="16" rx="8" fill="${c.tx}" fill-opacity=".06"/><rect x="${bx}" y="${y + 5}" width="${Math.max(4, bw * pct / 100).toFixed(1)}" height="16" rx="8" fill="url(#cg${i})"/>`;
        o += `<text x="${W - 36}" y="${y + 19}" font-size="15" font-weight="700" text-anchor="end" fill="${c.tx}">${esc(txt(r.querySelector("b")))}</text>`;
      }
      return blob(doc(W, H, o, defs), W);
    }
    // Карточка со столбиками (.re-hours)
    function cols(card){
      const c = th(), title = txt(card.querySelector("h3")), sub = txt(card.querySelector(".hint")), items = [...card.querySelectorAll(".re-hours > div")];
      if (!items.length) throw new Error("Нет данных");
      const W = 1000, H = 440, x0 = 50, x1 = W - 50, y0 = sub ? 130 : 110, y1 = H - 60, bw = (x1 - x0) / items.length;
      let o = head(c, title, W, sub);
      items.forEach((d, i) => {
        const hp = parseFloat(d.querySelector("i")?.style.height) || 0, h = Math.max(2, (y1 - y0) * hp / 100), w = Math.min(bw * .72, 64), x = x0 + i * bw + (bw - w) / 2;
        const val = (d.title.match(/([\d\s ]+)$/) || [])[1]?.trim() || "", l = txt(d.querySelector("small"));
        o += `<rect x="${x.toFixed(1)}" y="${(y1 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${c.ac}" fill-opacity=".85"/>`;
        if (val && items.length <= 40) o += `<text x="${(x + w / 2).toFixed(1)}" y="${(y1 - h - 7).toFixed(1)}" font-size="12.5" text-anchor="middle" fill="${c.mu}">${esc(val)}</text>`;
        if (l) o += `<text x="${(x + w / 2).toFixed(1)}" y="${y1 + 24}" font-size="13" text-anchor="middle" fill="${c.mu}">${esc(l)}</text>`;
      });
      return blob(doc(W, H, o), W);
    }
    // Плитки: смайлы-картинки превращаются в текст, остальное рисует общий модуль сайта
    function tiles(host, title){
      const cl = host.cloneNode(true); cl.querySelectorAll("img.ios-emo").forEach(im => im.replaceWith(document.createTextNode(im.alt)));
      if (!window.__copyimg?.tilesSvg) throw new Error("Копирование плиток недоступно");
      return blob(window.__copyimg.tilesSvg(cl, title), 1240);
    }
    function btn(label, fn){
      const b = document.createElement("button"); b.type = "button"; b.className = "mini copy-btn rx-copy"; b.textContent = label;
      const msg = document.createElement("span"); msg.className = "hint rx-copy-msg"; msg.setAttribute("role", "status");
      b.addEventListener("click", () => copyPngToStatus(fn, msg, "Скопировано"));
      const f = document.createDocumentFragment(); f.append(msg, b); return f;
    }
    // Строка заголовка: h2/h3 и кнопка справа, на одной линии
    function headOf(h){
      if (h.parentElement?.classList.contains("rx-head")) return h.parentElement;
      const w = document.createElement("div"); w.className = "rx-head" + (h.tagName === "H3" ? " rx-head-3" : ""); h.before(w); w.appendChild(h); return w;
    }
    const prevHeading = el => { let n = el.previousElementSibling; while (n) { if (n.tagName === "H2") return n; if (n.classList.contains("rx-head")) return n.querySelector("h2"); if (!n.matches("p.hint, .hc-bar, .rx-copy-row")) return null; n = n.previousElementSibling; } return null; };
    // Заголовок без значка «данные на …»; если таблица во вложенном блоке — ищем заголовок у родителя
    const cleanT = t => t.replace(/\s*данные на\s.*$/i, "").trim();
    const titleBefore = el => { for (let up = 0, cur = el; up < 3 && cur && cur.id !== "p-out"; up++, cur = cur.parentElement) { let n = cur.previousElementSibling; while (n) { if (n.tagName === "H2") return cleanT(txt(n)); const h = n.classList?.contains("rx-head") && n.querySelector("h2"); if (h) return cleanT(txt(h)); n = n.previousElementSibling; } } return ""; };
    // Кнопка таблицы переезжает в панель «Карточки / Таблица» над ней, как только та появится
    const pending = new Set();
    function placeTableBtns(){
      [...pending].forEach(x => {
        const [w, frag] = x;
        if (!w.isConnected) { pending.delete(x); return; }
        const bar = w.previousElementSibling;
        if (bar?.classList.contains("hc-bar")) { bar.prepend(frag); w.__rxBtn = true; pending.delete(x); }
      });
    }
    new MutationObserver(() => { if (pending.size) placeTableBtns(); }).__hub(document.querySelector("main") || document.body);
    function decorate(out, base){
      out.querySelectorAll(".wrap > table").forEach(t => {
        const w = t.parentElement; if (w.__rxBtn || [...pending].some(x => x[0] === w)) return;
        const h = titleBefore(w), title = !h ? base : (h.includes(base) || /Все события/.test(h) ? h : `${h} · ${base}`);
        pending.add([w, btn("Копировать", () => tableImageBlob(t, title))]);
      });
      placeTableBtns();
      // если панели над таблицей так и не появилось — кнопка встаёт в строку заголовка
      setTimeout(() => [...pending].forEach(x => { const [w, frag] = x; if (!w.isConnected || w.__rxBtn) return; const h = prevHeading(w); if (h) { headOf(h).appendChild(frag); w.__rxBtn = true; pending.delete(x); } }), 1200);
      out.querySelectorAll(".tiles").forEach(tl => {
        if (tl.__rxBtn) return; tl.__rxBtn = true;
        const h = prevHeading(tl), title = h ? cleanT(txt(h)) : base;
        const f = btn("Копировать", () => tiles(tl, title === "Сводка" || (out.id === "p-out" && !title.includes(base)) ? `${title} · ${base}` : title));
        if (h) headOf(h).appendChild(f); else { const r = document.createElement("div"); r.className = "rx-head rx-head-solo"; r.appendChild(f); tl.before(r); }
      });
      out.querySelectorAll(".bx-card").forEach(card => {
        if (card.__rxBtn) return;
        const fn = card.querySelector(".re-hours") ? () => cols(card) : card.querySelector(".bx-row") ? () => hbars(card) : null;
        const h3 = card.querySelector(":scope > h3"); if (!fn || !h3) return; card.__rxBtn = true;
        headOf(h3).appendChild(btn("Копировать", fn));
      });
    }
    return {decorate};
  })();
  window.__rxCopy = CPY;

  /* ---------- Вкладка «Реакции» ---------- */
  const RS = {per:"all", pk:"", sort:"given"};
  try { Object.assign(RS, JSON.parse(ls("chatstats.reactUi.v1") || "{}")); } catch (e) {}
  const PERIODS = [["7", "7 дней"], ["30", "30 дней"], ["90", "90 дней"], ["365", "Год"], ["all", "Всё время"]];
  const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  function renderReactions(){
    const out = document.getElementById("re-out"); if (!out) return;
    const all = rxAll(), t = today(), from = RS.per === "all" ? "" : isoD(new Date(Date.parse(t + "T00:00:00Z") - (Number(RS.per) - 1) * 864e5));
    const rows = from ? all.filter(x => x.d && x.d >= from && x.d <= t) : all;
    const days = new Set(rows.filter(x => x.d).map(x => x.d)).size || 1;
    const given = new Map(), givenD = new Map(), got = new Map(), emo = new Map(), pair = new Map(), byDay = new Map(), byWd = new Array(7).fill(0), favE = new Map();
    let total = 0, totalD = 0, totalE = 0;
    rows.forEach(x => {
      total += x.n;
      given.set(x.f, (given.get(x.f) || 0) + x.n);
      if (x.t) { got.set(x.t, (got.get(x.t) || 0) + x.n); const pk = x.f + ">" + x.t; pair.set(pk, (pair.get(pk) || 0) + x.n); }
      if (x.e) { totalE += x.n; emo.set(x.e, (emo.get(x.e) || 0) + x.n); let m = favE.get(x.f); if (!m) favE.set(x.f, m = new Map()); m.set(x.e, (m.get(x.e) || 0) + x.n); }
      if (x.d) { totalD += x.n; givenD.set(x.f, (givenD.get(x.f) || 0) + x.n); byDay.set(x.d, (byDay.get(x.d) || 0) + x.n); byWd[(new Date(x.d + "T00:00:00Z").getUTCDay() + 6) % 7] += x.n; }
    });
    const since = SINCE(), undated = total - totalD;
    const ppl = [...new Set([...given.keys(), ...got.keys()])].filter(k => typeof isVisibleUser !== "function" || isVisibleUser(k));
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    const gTop = top(given, 1)[0], rTop = top(got, 1)[0], eTop = top(emo, 1)[0];
    const fav = k => top(favE.get(k) || new Map(), 1)[0]?.[0] || "—";
    if (!RS.pk || !ppl.includes(RS.pk)) RS.pk = gTop ? gTop[0] : (ppl[0] || "");
    const save = () => ls("chatstats.reactUi.v1", JSON.stringify(RS));

    // таблица
    const sortKey = {given:k => given.get(k) || 0, got:k => got.get(k) || 0, bal:k => (got.get(k) || 0) - (given.get(k) || 0)}[RS.sort] || (k => given.get(k) || 0);
    const list = ppl.slice().sort((a, b) => sortKey(b) - sortKey(a));
    const th = (k, l) => `<th data-re-sort="${k}" style="cursor:pointer"${RS.sort === k ? ' class="sorted"' : ""}>${l}${RS.sort === k ? " ↓" : ""}</th>`;
    const table = `<div class="wrap"><table id="re-table"><thead><tr><th>Место</th><th>Участник</th>${th("given", "Поставил(а)")}${th("got", "Получил(а)")}${th("bal", "Баланс")}<th title="${since ? `По дням с ${fd(since)}` : ""}">В день</th><th>Любимая реакция</th></tr></thead><tbody>${list.map((k, i) => {
      const gv = given.get(k) || 0, gt = got.get(k) || 0, b = gt - gv;
      return `<tr><td>${i + 1}</td><td>${pn(k)}</td><td>${fmtN(gv)}</td><td>${fmtN(gt)}</td><td style="color:${b > 0 ? "#4ade80" : b < 0 ? "#f87171" : "inherit"}">${b > 0 ? "+" : ""}${fmtN(b)}</td><td>${((givenD.get(k) || 0) / days).toFixed(1).replace(".", ",")}</td><td style="font-size:18px">${fav(k)}</td></tr>`;
    }).join("")}</tbody></table></div>`;

    // по дням и дням недели (у реакций есть только дата, без времени)
    const peakD = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    const colBars = (arr, lab, tip) => { const mx = Math.max(...arr.map(x => x.v)) || 1; return `<div class="re-hours">${arr.map((x, i) => `<div title="${esc(tip(x))}"><i style="height:${(x.v / mx * 100).toFixed(1)}%"></i><small>${lab(x, i)}</small></div>`).join("")}</div>`; };
    const tl = (() => {
      const ds = [...byDay.keys()].sort(); if (!ds.length) return {title:"По дням", hint:"", html:`<div class="bx-empty">Нет данных</div>`};
      const span = dI(ds[ds.length - 1]) - dI(ds[0]) + 1;
      if (span <= 92) {
        const arr = []; for (let k = dI(ds[0]); k <= dI(ds[ds.length - 1]); k++) { const d = isoD(new Date(k * 864e5)); arr.push({d, v:byDay.get(d) || 0}); }
        const step = Math.max(1, Math.ceil(arr.length / 10));
        return {title:"По дням", hint:"Сколько реакций поставили в каждый день периода", html:colBars(arr, (x, i) => i % step === 0 ? x.d.slice(8) + "." + x.d.slice(5, 7) : "", x => `${fd(x.d)} — ${fmtN(x.v)}`)};
      }
      const MN = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"], m = new Map();
      byDay.forEach((v, d) => m.set(d.slice(0, 7), (m.get(d.slice(0, 7)) || 0) + v));
      const arr = [...m.entries()].sort().map(([k, v]) => ({k, v})), step = Math.max(1, Math.ceil(arr.length / 12));
      return {title:"По месяцам", hint:"Сколько реакций поставили за каждый месяц", html:colBars(arr, (x, i) => i % step === 0 ? MN[+x.k.slice(5) - 1] + (x.k.slice(5) === "01" || i === 0 ? " " + x.k.slice(2, 4) : "") : "", x => `${MN[+x.k.slice(5) - 1]} ${x.k.slice(0, 4)} — ${fmtN(x.v)}`)};
    })();
    const wdCnt = new Array(7).fill(0); byDay.forEach((v, d) => { wdCnt[(new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7]++; });
    const wdHtml = days < 14 ? `<div class="hub-empty">Пока мало данных: по дням недели сравнивать можно, когда наберётся хотя бы две недели (сейчас дней с реакциями: ${fmtN(days)}).</div>` : colBars(byWd.map((v, i) => ({v:wdCnt[i] ? Math.round(v / wdCnt[i]) : 0, i})), x => WD[x.i], x => `${WD[x.i]} — в среднем ${fmtN(x.v)} в день`);

    // лично
    const me = RS.pk, toM = new Map(), fromM = new Map();
    rows.forEach(x => { if (x.f === me && x.t) toM.set(x.t, (toM.get(x.t) || 0) + x.n); if (x.t === me) fromM.set(x.f, (fromM.get(x.f) || 0) + x.n); });
    const mine = (m) => top(m, 10).map(([k, v]) => ({lbl:esc(nm(k)), v, c:col(k)}));
    let mutual = null; toM.forEach((v, k) => { const back = fromM.get(k) || 0, s = Math.min(v, back); if (!mutual || s > mutual.s) mutual = {k, s, v, back}; });
    const opts = ppl.slice().sort((a, b) => nm(a).localeCompare(nm(b), "ru")).map(k => `<option value="${esc(k)}"${k === me ? " selected" : ""}>${esc(nm(k))}</option>`).join("");
    const meE = top(favE.get(me) || new Map(), 6).map(([e, v]) => ({lbl:e, v, bg:grad(col(me))}));

    out.innerHTML = `
      <div class="bx-head"><h2>Реакции ${dataNote()}</h2>
        <div class="seg" role="tablist">${PERIODS.map(([k, l]) => `<button type="button" data-re-per="${k}" class="${RS.per === k ? "active" : ""}">${l}</button>`).join("")}</div></div>
      ${since ? `<p class="hint">${undated && !from ? `Дата и смайл реакции записываются с ${fd(since)}. Ещё ${fmtN(undated)} ${wf2(undated, ["реакция", "реакции", "реакций"])} из более ранней истории известны только как «кто → кому»: они входят в таблицу, пары и «Лично», но не в графики по дням и любимые смайлы.` : `Реакции с датой есть с ${fd(since)}${undatedTotal() ? ` — более ранние ${fmtN(undatedTotal())} без даты видны в «Всё время»` : ""}.`}</p>` : ""}
      <h2>Сводка</h2>
      <div class="tiles">
        ${tile("Всего реакций", fmtN(total), undated && !from ? `${fmtN(totalD)} — с ${fd(since)}` : `≈ ${fmtN(Math.round(totalD / days))} в день`)}
        ${tile("Ставит больше всех", gTop ? esc(nm(gTop[0])) : "—", gTop ? `${fmtN(gTop[1])} ${wf2(gTop[1], ["реакция", "реакции", "реакций"])}` : "")}
        ${tile("Получает больше всех", rTop ? esc(nm(rTop[0])) : "—", rTop ? `${fmtN(rTop[1])} ${wf2(rTop[1], ["реакция", "реакции", "реакций"])}` : "")}
        ${tile("Любимая реакция чата", eTop ? `<span style="font-size:36px">${eTop[0]}</span>` : "—", eTop ? `${Math.round(eTop[1] / (totalE || 1) * 100)}% реакций со смайлом` : "")}
        ${tile("Самый активный день", peakD ? fd(peakD[0]) : "—", peakD ? `${fmtN(peakD[1])} ${wf2(peakD[1], ["реакция", "реакции", "реакций"])}` : "")}
      </div>
      <h2>Кто сколько ставит и получает</h2>
      <p class="hint">Баланс — сколько реакций человек получил минус сколько поставил сам. Нажми на заголовок столбца, чтобы отсортировать.</p>
      ${table}
      <h2>Лично</h2>
      <div class="re-person"><label class="hint" for="re-pk">Участник</label><select id="re-pk">${opts}</select></div>
      ${mutual && mutual.s ? `<div class="re-mutual"><span>Самая взаимная пара: <b>${esc(nm(me))}</b> ⇄ <b>${esc(nm(mutual.k))}</b> — ${fmtN(mutual.v)} и ${fmtN(mutual.back)}</span><span>Поставил(а): <b>${fmtN(given.get(me) || 0)}</b></span><span>Получил(а): <b>${fmtN(got.get(me) || 0)}</b></span></div>` : ""}
      <div class="bx-grid">
        <div class="bx-card"><h3>Кому ${esc(nm(me))} ставит реакции</h3><p class="hint">Топ-10 за выбранный период</p>${bars(mine(toM), {empty:"Реакций не ставил(а)"})}</div>
        <div class="bx-card"><h3>Кто ставит реакции ${esc(nm(me))}</h3><p class="hint">Топ-10 за выбранный период</p>${bars(mine(fromM), {empty:"Реакций не получал(а)"})}</div>
        <div class="bx-card"><h3>Любимые реакции ${esc(nm(me))}</h3><p class="hint">Какие смайлы ставит чаще всего${since ? ` (с ${fd(since)})` : ""}</p>${bars(meE, {emo:true})}</div>
      </div>
      <h2>Когда ставят реакции</h2>
      <div class="bx-grid">
        <div class="bx-card"><h3>${tl.title}</h3><p class="hint">${tl.hint}</p>${tl.html}</div>
        <div class="bx-card"><h3>По дням недели</h3><p class="hint">Сколько реакций в среднем ставят в каждый день недели</p>${wdHtml}</div>
      </div>
      <h2>Реакции и пары</h2>
      <div class="bx-grid">
        <div class="bx-card"><h3>Популярные реакции</h3><p class="hint">Сколько раз поставили каждую${since ? ` (с ${fd(since)})` : ""}</p>${bars(top(emo, 12).map(([e, v]) => ({lbl:e, v, bg:"linear-gradient(90deg,color-mix(in srgb,var(--accent) 70%,#000),color-mix(in srgb,var(--accent) 80%,#fff))"})), {emo:true})}</div>
        <div class="bx-card"><h3>Самые частые пары</h3><p class="hint">Кто → кому ставит больше всего</p>${bars(top(pair, 10).map(([k, v]) => { const [a, b] = k.split(">"); return {lbl:`${esc(nm(a))} → ${esc(nm(b))}`, v, c:col(a)}; }))}</div>
      </div>`;
    out.querySelector("#re-pk")?.addEventListener("change", e => { RS.pk = e.target.value; save(); renderReactions(); });
    CPY.decorate(out, "Реакции");
    save();
  }
  document.addEventListener("click", e => {
    const p = e.target.closest?.("[data-re-per]"); if (p) { RS.per = p.dataset.rePer; renderReactions(); return; }
    const s = e.target.closest?.("[data-re-sort]"); if (s) { RS.sort = s.dataset.reSort; renderReactions(); }
  });

  /* ---------- Прогноз для идущего события: до какого уровня каждый дойдёт с текущим темпом ----------
     Темп считается так же, как его считает бот события:
     • берутся сообщения участника за последние 28 и 56 полных дней (до вчера включительно, дни без сообщений — нули);
     • темп = 0,7 × среднее за 28 дней + 0,3 × среднее за 56 дней (сообщений в день);
     • кто за последние 28 дней не написал ни одного сообщения, считается выбывшим: его опыт дальше не растёт.
     Опыт к концу = текущий опыт + темп × оставшиеся дни (с остатком сегодняшнего дня). В событии засчитываются не все чаты,
     поэтому темп переводится в опыт по личному соотношению «опыт с начала события / сообщения с начала события».
     Если истории сообщений участника нет (он не сопоставлен с участником сайта), темп берётся из опыта события: опыт / прошедшие дни.
     Вершина — порог высшего уровня события из API. Диапазон — прогноз только по 28-дневному и только по 56-дневному темпу.
     Как и у бота, прогноз предполагает сохранение темпа и не учитывает случайные всплески и спады. */
  function forecastEvent(ev){
    if (statusOf(ev) !== "live") return null;
    const m = evLevels().get(ev.id) || new Map(); if (!m.size) return null;
    const t = today(), total = dI(ev.end) - dI(ev.start) + 1, done = Math.max(1, Math.min(total, dI(t) - dI(ev.start) + 1));
    const now = new Date(), dayLeft = 1 - (now.getHours() * 60 + now.getMinutes()) / 1440;
    const left = total - done, rem = left + dayLeft;
    const lvOf = xp => ev.levels?.length ? levelByXp(ev, xp) : 1;
    const top = ev.levels?.length ? ev.levels[ev.levels.length - 1] : null, topXp = top ? top[2] : Infinity, topLv = top ? top[0] : 0;
    // сообщения по дням из истории: окна 28 и 56 дней до вчера, и с начала события
    const day = n => isoD(new Date(Date.parse(t + "T00:00:00Z") - n * 864e5)), y1 = day(1), w28 = day(28), w56 = day(56);
    const rowsA = AR() || [], hasTot = rowsA.some(x => Number(x[F.chatPk]) === 0), s28 = new Map(), s56 = new Map(), since = new Map(), seen = new Set();
    rowsA.forEach(x => {
      if (hasTot && Number(x[F.chatPk]) !== 0) return;
      const d = String(x[F.date] ?? "").slice(0, 10), u = String(x[F.userId] ?? ""); if (!u) return;
      seen.add(u);
      const v = Number(g(x, "msgs")) || 0; if (!v) return;
      if (d >= w56 && d <= y1) { s56.set(u, (s56.get(u) || 0) + v); if (d >= w28) s28.set(u, (s28.get(u) || 0) + v); }
      if (d >= ev.start && d <= t) since.set(u, (since.get(u) || 0) + v);
    });
    const list = [...m.entries()].filter(([k]) => typeof isVisibleUser !== "function" || isVisibleUser(k)).map(([k, v]) => {
      let a28, a56, kx = 1, src = "msgs";
      if (seen.has(k)) {
        a28 = (s28.get(k) || 0) / 28; a56 = (s56.get(k) || 0) / 56;
        const sn = since.get(k) || 0; kx = sn > 0 ? Math.max(.25, Math.min(4, v.xp / sn)) : 1;
      } else { a28 = a56 = v.xp / done; src = "xp"; kx = 1; }
      const active = a28 > 0, rate = active ? .7 * a28 + .3 * a56 : 0;
      const xpAt = r => v.xp + r * kx * rem;
      const xpEnd = xpAt(rate), lv = Math.max(v.level, lvOf(xpEnd));
      const lA = Math.max(v.level, lvOf(xpAt(active ? a28 : 0))), lB = Math.max(v.level, lvOf(xpAt(active ? a56 : 0)));
      return {k, now:v.level, xp:v.xp, end:lv, lo:Math.min(lA, lB, lv), hi:Math.max(lA, lB, lv), xpEnd:Math.round(xpEnd), rate, xpRate:rate * kx, a28, a56, src, active,
        trend:a56 > 0 ? a28 / a56 : (a28 > 0 ? 1.5 : 1), top:xpEnd >= topXp};
    });
    const nowRank = new Map([...list].sort((a, b) => b.xp - a.xp).map((x, i) => [x.k, i + 1]));
    list.sort((a, b) => b.xpEnd - a.xpEnd || b.xp - a.xp);
    list.forEach((x, i) => { x.place = i + 1; x.was = nowRank.get(x.k); });
    return {list, left, rem, total, done, topXp, topLv, topName:top ? top[1] : "", topN:list.filter(x => x.top).length};
  }
  window.__beta.events.forecast = id => { const ev = EVENTS.find(e => e.id === id); return ev ? forecastEvent(ev) : null; };

  /* ---------- Вкладка «События» ---------- */
  let EVSEL = ls("chatstats.eventSel.v1");
  function renderEvents(){
    const out = document.getElementById("ev-out"); if (!out) return;
    const L = evLevels(), list = events.list(), t = today();
    if (!list.some(ev => ev.id === EVSEL)) EVSEL = (list.find(ev => ev.status === "live") || list[list.length - 1])?.id || "";
    const cards = list.map(ev => {
      const m = L.get(ev.id) || new Map(), tot = dI(ev.end) - dI(ev.start) + 1, done = Math.max(0, Math.min(tot, dI(t) - dI(ev.start) + 1));
      const lead = [...m.entries()].sort((a, b) => b[1].xp - a[1].xp)[0];
      const st = ev.status === "live" ? `<span class="ev-st live">● идёт · осталось ${fmtN(tot - done)} ${wf2(tot - done, ["день", "дня", "дней"])}</span>` : ev.status === "done" ? `<span class="ev-st">завершено</span>` : `<span class="ev-st">скоро</span>`;
      return `<div class="ev-card${ev.id === EVSEL ? " on" : ""}" data-ev="${esc(ev.id)}" style="--ec1:${ev.c1};--ec2:${ev.c2}" role="button" tabindex="0">
        <h3>${evSvg(ev.icon)}${esc(ev.title)}</h3><p class="hint">${fd(ev.start)} — ${fd(ev.end)} · ${fmtN(tot)} ${wf2(tot, ["день", "дня", "дней"])}</p>
        ${st}${ev.status === "live" ? `<div class="ev-prog"><i style="width:${(done / tot * 100).toFixed(1)}%"></i></div>` : ""}
        <div class="ev-meta"><span>Участников: <b>${fmtN(m.size)}</b></span>${lead ? `<span>Лидер: <b>${esc(nm(lead[0]))}</b> · ур. ${lead[1].level}</span>` : ""}</div></div>`;
    }).join("");
    const ev = list.find(x => x.id === EVSEL);
    let body = "";
    if (ev) {
      const m = L.get(ev.id) || new Map();
      const rows = [...m.entries()].filter(([k]) => typeof isVisibleUser !== "function" || isVisibleUser(k)).sort((a, b) => b[1].xp - a[1].xp || b[1].level - a[1].level);
      const avg = rows.length ? rows.reduce((s, [, v]) => s + v.level, 0) / rows.length : 0, mx = rows[0]?.[1].level || 0;
      const th = ev.ach.th, ROM = ["—", "I", "II", "III", "IV", "V", "VI", "VII"], TC = l => l <= 0 ? "#4a5060" : l <= 3 ? "#e3a36b" : l <= 6 ? "#c0c6d4" : "#ffd166";
      const dist = (ev.ranks || []).map(([l, name], i) => { const hi = ev.ranks[i + 1]?.[0] ?? Infinity; return {lbl:`${esc(name)} <small class="hint">ур. ${l}${hi === Infinity ? "+" : hi - 1 > l ? "–" + (hi - 1) : ""}</small>`, v:rows.filter(([, v]) => v.level >= l && v.level < hi).length, bg:`linear-gradient(90deg,${ev.c1},${ev.c2})`}; }).filter(x => x.v > 0);
      const tiers = th.map((t2, i) => ({lbl:`Ур. ${ROM[i + 1]} <small class="hint">${t2}+</small>`, v:rows.filter(([, v]) => v.level >= t2).length, bg:`linear-gradient(90deg,${TC(i + 1)}88,${TC(i + 1)})`}));
      body = `
        <h2>Сводка — ${esc(ev.title)}</h2>
        <div class="tiles">
          ${tile("Участников", fmtN(rows.length), ev.status === "live" ? "набирают опыт прямо сейчас" : "дошли до конца события")}
          ${tile("Средний уровень", avg.toFixed(1).replace(".", ","), "")}
          ${tile("Максимальный уровень", String(mx), rows[0] ? esc(nm(rows[0][0])) + " · " + esc(rankName(ev, mx)) : "")}
          ${tile(`Достижение «${esc(ev.ach.name)}»`, fmtN(rows.filter(([, v]) => v.level >= th[0]).length), `получили · максимум (ур. ${th[th.length - 1]}+): ${fmtN(rows.filter(([, v]) => v.level >= th[th.length - 1]).length)}`)}
        </div>
        <h2>Уровни участников — ${esc(ev.title)}</h2>
        <div class="wrap"><table id="ev-table"><thead><tr><th>Место</th><th>Участник</th><th>Уровень</th><th>Звание</th><th>Опыт</th><th>«${esc(ev.ach.name)}»</th></tr></thead><tbody>${rows.map(([k, v], i) => {
          const tl = th.filter(x => v.level >= x).length;
          return `<tr style="--ec1:${ev.c1};--ec2:${ev.c2}"><td>${i + 1}</td><td>${pn(k)}</td><td><span class="ev-lv"${(pg => pg.next ? ` title="До ур. ${pg.next}: ${fmtN(pg.left)} опыта (${pg.pct.toFixed(0)}% уровня пройдено)"` : ` title="Максимальный уровень"`)(levelProg(ev, v.level, v.xp))}><b>${v.level}</b><i><em style="width:${levelProg(ev, v.level, v.xp).pct.toFixed(1)}%"></em></i></span></td><td class="ev-rank">${esc(rankName(ev, v.level))}</td><td>${fmtN(v.xp)}</td><td><span class="ev-tier" style="--tc:${TC(tl)}">${ROM[tl]}</span></td></tr>`;
        }).join("")}</tbody></table></div>
        <div class="bx-grid">
          <div class="bx-card"><h3>Сколько людей на каждом звании</h3><p class="hint">Звания события по уровням</p>${bars(dist)}</div>
          <div class="bx-card"><h3>Уровни достижения «${esc(ev.ach.name)}»</h3><p class="hint">Сколько участников дошли до каждого уровня</p>${bars(tiers)}</div>
        </div>${ev.status !== "done" || !(ev.levels || []).length ? "" : `
        <h2>Все титулы события</h2><p class="hint">Полный перечень титулов события «${esc(ev.title)}»: с какого опыта выдаётся, сколько участников дошли до него и на ком событие остановилось.</p>
        ${__tbl.html({id:"ev-titles-table", rows:ev.levels.map(([o, name, minXp]) => ({o, name, minXp, reached:rows.filter(([, v]) => v.level >= o).length, holders:rows.filter(([, v]) => v.level === o).map(([k]) => pn(k)).join(", ")})),
          rowStyle:() => `--ec1:${ev.c1};--ec2:${ev.c2}`, rowClass:r => r.reached ? null : "ev-title-empty",
          cols:[{h:"Ур.", td:r => r.o}, {h:"Титул", cls:"ev-rank", style:"color:var(--text)", td:r => esc(r.name)}, {h:"Опыт от", td:r => fmtN(r.minXp)}, {h:"Дошли", td:r => r.reached ? fmtN(r.reached) : '<span class="hint">—</span>'}, {h:"Закончили на нём", tdAlign:"left", td:r => r.holders || '<span class="hint">—</span>'}]})}`}`;
      const FC = forecastEvent(ev);
      if (FC) {
        const thE = ev.ach.th, tierOf = l => thE.filter(x => l >= x).length, mxE = Math.max(40, ...FC.list.map(x => x.hi));
        const move = x => { const d = x.was - x.place; return d > 0 ? `<span style="color:#4ade80">▲ ${d}</span>` : d < 0 ? `<span style="color:#f87171">▼ ${-d}</span>` : `<span class="hint">—</span>`; };
        const r1 = v => (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
        const trend = x => {
          if (!x.active) return `<span class="hint" title="За последние 28 дней сообщений нет — бот не считает участника активным">не пишет</span>`;
          const tip = x.src === "xp" ? "Истории сообщений нет — темп взят из опыта события" : `0,7 × ${r1(x.a28)} (28 дней) + 0,3 × ${r1(x.a56)} (56 дней)`;
          const arrow = x.trend >= 1.15 ? ` <span style="color:#4ade80" title="последние 4 недели пишет активнее, чем за 8">↗</span>` : x.trend <= .85 ? ` <span style="color:#f87171" title="последние 4 недели пишет меньше, чем за 8">↘</span>` : "";
          return `<span title="${esc(tip)}">${r1(x.rate)}${x.src === "xp" ? "*" : ""}</span>${arrow}`;
        };
        const w = FC.list[0], newTiers = FC.list.filter(x => tierOf(x.end) > tierOf(x.now)).length, hasXpSrc = FC.list.some(x => x.src === "xp");
        body += `<h2>Прогноз на конец события</h2>
          <p class="hint">До ${fd(ev.end)} осталось ${fmtN(FC.left)} ${wf2(FC.left, ["день", "дня", "дней"])}. Темп считается как у бота: 0,7 × среднее число сообщений в день за последние 28 дней + 0,3 × среднее за 56 дней. С этим темпом опыт растёт до конца события; кто 28 дней не писал, остаётся на текущем уровне. Диапазон — прогноз только по 28-дневному и только по 56-дневному темпу.${hasXpSrc ? " * — истории сообщений нет, темп взят из опыта события." : ""}</p>
          <div class="tiles">
            ${tile("Ожидаемый победитель", w ? esc(nm(w.k)) : "—", w ? `ур. ${w.end} · ${fmtN(w.xpEnd)} опыта` : "")}
            ${tile("Средний уровень в конце", (FC.list.reduce((a, x) => a + x.end, 0) / (FC.list.length || 1)).toFixed(1).replace(".", ","), `сейчас ${(FC.list.reduce((a, x) => a + x.now, 0) / (FC.list.length || 1)).toFixed(1).replace(".", ",")}`)}
            ${tile(`Новый уровень «${esc(ev.ach.name)}»`, fmtN(newTiers), "участников поднимут уровень достижения")}
            ${tile(`Дойдут до вершины`, fmtN(FC.topN), FC.topLv ? `ур. ${FC.topLv} «${esc(FC.topName)}» — от ${fmtN(FC.topXp)} опыта` : "")}
          </div>
          ${__tbl.html({id:"ev-fc-table", rows:FC.list, rowStyle:() => `--ec1:${ev.c1};--ec2:${ev.c2}`,
            cols:[{h:"Место в конце", td:x => x.place}, {h:"Участник", td:x => pn(x.k)}, {h:"Сейчас", td:x => x.now},
              {h:"Прогноз уровня", td:x => `<span class="ev-lv"><b>${x.end}</b><i style="position:relative"><em style="width:${(x.end / mxE * 100).toFixed(1)}%;opacity:.45"></em><em style="position:absolute;inset:0 auto 0 0;width:${(x.now / mxE * 100).toFixed(1)}%"></em></i></span>`},
              {h:"Диапазон", cls:"ev-rank", td:x => x.lo === x.hi ? x.end : `${x.lo}–${x.hi}`},
              {h:"Опыт к концу", td:x => `${fmtN(x.xpEnd)}${x.top ? ` <small style="color:#ffd166" title="Прогноз не ниже порога вершины">★</small>` : ""}`},
              {h:"Звание в конце", cls:"ev-rank", td:x => esc(rankName(ev, x.end))},
              {h:`«${esc(ev.ach.name)}» в конце`, td:x => { const tl = tierOf(x.end), TC = l => l <= 0 ? "#4a5060" : l <= 3 ? "#e3a36b" : l <= 6 ? "#c0c6d4" : "#ffd166", ROM = ["—", "I", "II", "III", "IV", "V", "VI", "VII"]; return `<span class="ev-tier" style="--tc:${TC(tl)}">${ROM[tl]}</span>${tl > tierOf(x.now) ? ` <small style="color:#4ade80">+${tl - tierOf(x.now)}</small>` : ""}`; }},
              {h:"Место", td:x => move(x)}, {h:"Сообщ. в день", td:x => trend(x)}]})}`;
      }
    }
    // сводная по всем событиям
    const ppl = events.people().filter(k => list.some(e2 => (L.get(e2.id) || new Map()).has(k)));
    const sum = k => list.reduce((s, e2) => s + ((L.get(e2.id) || new Map()).get(k)?.level || 0), 0);
    const all = `<h2>Все события вместе</h2><p class="hint">Уровни каждого участника во всех событиях и сумма уровней.</p>
      <div class="wrap"><table id="ev-all-table"><thead><tr><th>Место</th><th>Участник</th>${list.map(e2 => `<th>${esc(e2.title)}</th>`).join("")}<th>Сумма уровней</th></tr></thead><tbody>${ppl.sort((a, b) => sum(b) - sum(a)).map((k, i) => `<tr><td>${i + 1}</td><td>${pn(k)}</td>${list.map(e2 => { const v = (L.get(e2.id) || new Map()).get(k); return `<td>${v ? v.level : '<span class="hint">—</span>'}</td>`; }).join("")}<td><b>${sum(k)}</b></td></tr>`).join("")}</tbody></table></div>`;
    out.innerHTML = `<div class="bx-head"><h2>События ${dataNote()}</h2></div>
      <p class="hint">Тематические события бота: за сообщения начисляется опыт, с ним растёт уровень, у каждого уровня — своё звание. Нажми на событие, чтобы посмотреть его участников.</p>
      <div class="ev-timeline">${cards}</div>${body}${all}`;
    CPY.decorate(out, ev ? ev.title : "События");
  }
  document.addEventListener("click", e => {
    const c = e.target.closest?.("[data-ev]"); if (!c) return;
    EVSEL = c.dataset.ev; ls("chatstats.eventSel.v1", EVSEL); renderEvents();
  });
  document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches?.("[data-ev]")) e.target.click(); });

  /* ---------- Загрузка при открытии вкладки ---------- */
  async function open(t){
    const id = t === "reactions" ? "re-out" : "ev-out", o = document.getElementById(id);
    if (!AR() && o && !o.children.length) loading(id);
    try { await getHistory(); } catch (e) { if (o) o.innerHTML = `<p class="status err">Не удалось загрузить данные: ${esc(e.message)}</p>`; return; }
    t === "reactions" ? renderReactions() : renderEvents();
    refreshLive();
  }
  function rerender(){
    const t = curTab();
    CELL = null; PEOPLE = null;
    try { if (t === "stats" && typeof render === "function") render(); if (t === "charts" && typeof renderCharts === "function") renderCharts(); } catch (e) {}
    if (t === "reactions") renderReactions();
    if (t === "events") renderEvents();
    if (t === "achievements" && window.renderAchievements) window.renderAchievements();
  }
  let lastT = "";
  new MutationObserver(() => { const t = curTab(); if (t !== lastT) { lastT = t; if (t === "reactions" || t === "events") open(t); } }).observe(document.querySelector("main"), {attributes:true, subtree:true, attributeFilter:["class"]});
  if (curTab() === "reactions" || curTab() === "events") open(curTab());
  // свежие дневные реакции и события — сразу при загрузке, чтобы их видели и остальные вкладки
  refreshLive();
  document.addEventListener("click", e => { if (e.target.closest?.("[data-rx-refresh]") && !LIVE_TRY) { refreshLive(true); rerender(); } });
})();
