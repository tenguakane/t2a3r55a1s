
/* ===================== Достижения ===================== */
(function(){
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const TIERS = {none:"#4a5060", bronze:"#e3a36b", silver:"#c0c6d4", gold:"#ffd166", diamond:"#67e8f9"};
  const TIER_NAMES = {bronze:"Бронза (I–III)", silver:"Серебро (IV–VI)", gold:"Золото (VII–IX)", diamond:"Максимум (X)"};
  const openTier = (a, l) => { const t = a.tiers || [20, 50, 100]; return l >= t[2] ? "diamond" : l >= t[1] ? "gold" : l >= t[0] ? "silver" : l >= 1 ? "bronze" : "none"; };
  const tierOfLevel = l => l <= 0 ? "none" : l <= 3 ? "bronze" : l <= 6 ? "silver" : l <= 9 ? "gold" : "diamond";
  const ICONS = {
    chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 7l-3 4h4l-3 4"/>',
    sticker:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/>',
    mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    shield:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    flame:'<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    home:'<path d="M3 11l9-8 9 8v10H3z"/><path d="M9 21v-6h6v6"/>',
    camera:'<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
    heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M19.5 2.5v3M18 4h3"/>',
    star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    wand:'<path d="M4 20 15 9"/><path d="M14 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1z"/><path d="M19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z"/>',
    shuriken:'<path d="M12 2l2 7 7-2-5 5 5 5-7-2-2 7-2-7-7 2 5-5-5-5 7 2z"/><circle cx="12" cy="12" r="1.6"/>',
    column:'<path d="M4 5h16M5 8h14M4 21h16M5 18h14"/><path d="M7 8v10M10.3 8v10M13.7 8v10M17 8v10"/><path d="M6 5c0-1 1-2 2-2h8c1 0 2 1 2 2"/>',
    skull:'<path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.4"/><circle cx="15" cy="11" r="1.4"/><path d="M10 20v-2M14 20v-2"/>',
  };
  const wf = (v, a) => wordForm(v, a);
  const ACH = [
    {id:"spam", name:"Спамер", icon:"chat", desc:"Написать определённое количество сообщений за день", th:[100,250,500,750,1000,1350,1700,2100,2500,3000],
      val:d => d.maxDay, show:v => fmt(Math.round(v)), unit:v => wf(v, ["сообщение", "сообщения", "сообщений"]) + " за день", note:d => d.maxDayDate ? `рекорд: ${formatMetricDate(d.maxDayDate)}` : ""},
    {id:"sticker", name:"Стикероман", icon:"sticker", desc:"Отправить определённое количество стикеров", th:[200,500,1000,1500,2500,3500,5000,6500,8000,10000],
      val:d => d.stick, show:v => fmt(Math.round(v)), unit:v => wf(v, ["стикер", "стикера", "стикеров"]), note:() => "за всё время"},
    {id:"video", name:"Блогер", icon:"video", desc:"Записать определённое количество видеосообщений", th:[50,100,175,250,350,475,600,750,875,1000],
      val:d => d.video, show:v => fmt(Math.round(v)), unit:v => wf(v, ["видеосообщение", "видеосообщения", "видеосообщений"]), note:() => "за всё время"},
    {id:"voice", name:"Болтун", icon:"mic", desc:"Записать определённое количество голосовых сообщений", th:[50,150,300,600,1000,1500,2200,3000,4000,5000],
      val:d => d.voice, show:v => fmt(Math.round(v)), unit:v => wf(v, ["голосовое", "голосовых", "голосовых"]), note:() => "за всё время"},
    {id:"veteran", name:"Ветеран", icon:"shield", desc:"Пробыть в чате определённое количество лет — сколько лет, столько и уровней", open:true, step:1, tiers:[4,7,10], norm:10,
      val:d => d.years, show:v => String(Math.floor(v)), unit:v => wf(Math.floor(v), ["год", "года", "лет"]), note:d => d.since ? `в чате с ${formatMetricDate(d.since)}` : "", fmtTh:t => `${t} ${wf(t, ["год", "года", "лет"])}`},
    {id:"wins", name:"Серия побед", icon:"trophy", desc:"Занять первое место определённое количество дней подряд", th:[3,10,25,50,100,175,250,325,400,500],
      val:d => d.winStreak, show:v => fmt(Math.round(v)), unit:v => wf(v, ["день", "дня", "дней"]) + " на 1-м месте подряд", note:d => d.winStreak ? (d.winStart === d.winEnd ? formatMetricDate(d.winStart) : `${formatMetricDate(d.winStart)} — ${formatMetricDate(d.winEnd)}`) : "первых мест не было"},
    {id:"streak", name:"Непрерывный", icon:"flame", desc:"Общаться определённое количество дней подряд", th:[10,30,75,150,300,500,800,1200,1600,2000],
      val:d => d.maxStreak, show:v => fmt(Math.round(v)), unit:v => wf(v, ["день", "дня", "дней"]) + " подряд", note:d => d.maxStreak ? (d.streakStart === d.streakEnd ? formatMetricDate(d.streakStart) : `${formatMetricDate(d.streakStart)} — ${formatMetricDate(d.streakEnd)}`) : ""},
    {id:"colonist", name:"Колонист", icon:"home", desc:"Написать определённое количество сообщений в целом — сколько тысяч сообщений, такой и уровень", open:true, step:1000, norm:50,
      val:d => d.msgs, show:v => fmt(Math.round(v)), unit:v => wf(v, ["сообщение", "сообщения", "сообщений"]) + " всего", note:() => "+1 ур. за каждую 1 000"},
    {id:"selfie", name:"Модель", icon:"camera", desc:"Сделать определённое количество селфи", th:[1,5,15,30,60,100,175,250,350,500],
      val:d => d.selfie, show:v => fmt(Math.round(v)), unit:v => wf(v, ["селфи", "селфи", "селфи"]), note:() => "по базе селфи"},
    {id:"corpse", name:"Труп", icon:"skull", desc:"Не писать в чат определённое количество дней подряд", th:[30,60,100,150,250,400,550,700,850,1000],
      val:d => d.maxSilence, show:v => fmt(Math.round(v)), unit:v => wf(v, ["день", "дня", "дней"]) + " молчания подряд", note:d => d.curSilence > 1 ? `сейчас молчит ${fmt(d.curSilence)} ${wf(d.curSilence, ["день", "дня", "дней"])}` : ""},
  ];
  // Достижения за реакции (данные — window.__beta.react)
  if (window.__betaOn) ACH.push(
    {id:"rgive", name:"Ценитель", icon:"heart", desc:"Поставить определённое количество реакций", th:[100,300,700,1500,3000,5000,7000,10000,12000,15000],
      val:d => d.reactGiven, show:v => fmt(Math.round(v)), unit:v => wf(v, ["реакция", "реакции", "реакций"]) + " поставлено", note:() => "за всё время"},
    {id:"rgot", name:"Звезда", icon:"star", desc:"Получить определённое количество реакций", th:[100,300,700,1500,3000,5000,7000,10000,12000,15000],
      val:d => d.reactGot, show:v => fmt(Math.round(v)), unit:v => wf(v, ["реакция", "реакции", "реакций"]) + " получено", note:() => "за всё время"});
  const RANKS = [[0, "Новичок", "🌱"], [10, "Житель колонии", "🏠"], [25, "Старожил", "🧭"], [45, "Активист", "⚡"], [65, "Легенда колонии", "👑"], [85, "Бессмертный", "💎"]];
  const rankOf = score => { let r = RANKS[0]; RANKS.forEach(x => { if (score >= x[0]) r = x; }); return r; };

  let BASE = null, CACHE = new Map(), LAST = null;
  function base(){
    if (BASE && BASE.src === allRows && BASE.sel === SELFIE.length) return BASE;
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
    const users = new Map(), dayMax = new Map();
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      const k = String(x[F.userId] ?? x[F.name]);
      let u = users.get(k); if (!u) { u = {k, msgs:0, stick:0, voice:0, video:0, daily:new Map(), first:d}; users.set(k, u); }
      MET.forEach(m => u[m] += Number(g(x, m)) || 0);
      const v = Number(g(x, "msgs")) || 0; if (v) u.daily.set(d, (u.daily.get(d) || 0) + v);
      if (d < u.first) u.first = d;
    });
    users.forEach(u => u.daily.forEach((v, d) => { if (v > (dayMax.get(d) || 0)) dayMax.set(d, v); }));
    CACHE = new Map();
    BASE = {src:allRows, sel:SELFIE.length, users, dayMax};
    return BASE;
  }
  function stats(pk){
    pk = String(pk); const B = base();
    if (CACHE.has(pk)) return CACHE.get(pk);
    const u = B.users.get(pk) || {k:pk, msgs:0, stick:0, voice:0, video:0, daily:new Map(), first:null};
    const today = iso(new Date()), st = streakStats(u.daily);
    let maxDay = 0, maxDayDate = "";
    u.daily.forEach((v, d) => { if (vkDay(d)) return; if (v > maxDay || (v === maxDay && d < maxDayDate)) { maxDay = v; maxDayDate = d; } });
    // дни, когда участник был первым по сообщениям (при равенстве — делит первое место)
    const wins = []; u.daily.forEach((v, d) => { if (v > 0 && !vkDay(d) && v >= (B.dayMax.get(d) || 0)) wins.push(d); });
    wins.sort();
    let run = 0, rs = null, winStreak = 0, winStart = "", winEnd = "", prev = null;
    wins.forEach(d => { if (prev && dayIdx(d) - dayIdx(prev) === 1) run++; else { run = 1; rs = d; } if (run > winStreak) { winStreak = run; winStart = rs; winEnd = d; } prev = d; });
    const joined = MEMBERSHIP_STARTS.find(([, id]) => String(id) === pk)?.[0];
    const since = joined && /^\d{4}-\d{2}-\d{2}$/.test(joined) ? joined : u.first;
    const years = since ? Math.max(0, (dayIdx(today) - dayIdx(since)) / 365.25) : 0;
    const sp = selfieModel().persons.get(pk);
    const d = {pk, msgs:u.msgs, stick:u.stick, voice:u.voice, video:u.video, maxDay, maxDayDate, winStreak, winStart, winEnd,
      maxStreak:st.maxStreak, streakStart:st.maxStart, streakEnd:st.maxEnd, maxSilence:st.maxSilence, curSilence:Math.max(0, (st.sinceLast ?? 0) - 1),
      since, years, selfie:sp ? sp.total : 0, active:u.msgs > 0};
    if (window.__betaOn) { const rt = window.__beta?.react.totals(pk) || {given:0, got:0}; d.reactGiven = rt.given; d.reactGot = rt.got; }
    const items = ACH.map(a => {
      const v = Number(a.val(d)) || 0;
      let level, prevTh, nextTh;
      if (a.open) { level = Math.floor(v / a.step); prevTh = level * a.step; nextTh = (level + 1) * a.step; }
      else { level = a.th.filter(t => v >= t).length; prevTh = level ? a.th[level - 1] : 0; nextTh = level < a.th.length ? a.th[level] : null; }
      const maxed = !a.open && level >= a.th.length;
      const pr = maxed ? 1 : Math.max(0, Math.min(1, (v - prevTh) / ((nextTh - prevTh) || 1)));
      const tier = a.open ? openTier(a, level) : tierOfLevel(level);
      return {a, v, level, prevTh, nextTh, maxed, pr, tier};
    });
    const score = items.reduce((s2, x) => s2 + Math.min(10, x.level), 0);
    const res = {d, items, score, got:items.filter(x => x.level > 0).length, maxCnt:items.filter(x => x.maxed).length};
    CACHE.set(pk, res); return res;
  }

  /* Недавно полученные уровни достижений (дата — день, когда порог был пройден) */
  /* Все полученные уровни считаются один раз (пока не изменились данные, видимость участников или дата),
     а для «с такого-то дня» берётся готовый список — раньше полный пересчёт шёл при каждом переходе по вкладкам. */
  let REC = null;
  function recentAch(sinceIso){
    const today = iso(new Date()), B = base();
    const vis = Object.keys(NAMES).filter(pk => isVisibleUser(pk)).join(",");
    const ms = typeof MEMBERSHIP_STARTS !== "undefined" ? MEMBERSHIP_STARTS.length : 0;
    const vk = typeof VKDAYS !== "undefined" ? VKDAYS.size : 0;
    if (!REC || REC.B !== B || REC.today !== today || REC.vis !== vis || REC.ms !== ms || REC.sel !== SELFIE || REC.sl !== SELFIE.length || REC.vk !== vk) REC = {B, today, vis, ms, vk, sel:SELFIE, sl:SELFIE.length, all:recentAll(today, B)};
    // оставляем самый высокий уровень по каждому (человек, достижение)
    const best = new Map();
    REC.all.forEach(e => { if (e.date < sinceIso) return; const k = e.pk + "|" + e.id, c = best.get(k); if (!c || e.level > c.level) best.set(k, c ? {...e, from:c.from || c.level} : e); });
    return [...best.values()].sort((a, b) => b.date.localeCompare(a.date) || b.level - a.level).map(e => ({...e, personName:NAMES[e.pk]}));
  }
  function recentAll(today, B){
    const sinceIso = "", out = [];
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
    const per = new Map();
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      const k = String(x[F.userId] ?? x[F.name]); let u = per.get(k); if (!u) { u = {msgs:new Map(), stick:new Map(), voice:new Map(), video:new Map()}; per.set(k, u); }
      MET.forEach(m => { const v = Number(g(x, m)) || 0; if (v) u[m].set(d, (u[m].get(d) || 0) + v); });
    });
    const A = id => ACH.find(a => a.id === id);
    const add = (pk, a, level, date) => { if (date >= sinceIso && date <= today && level >= 1) out.push({pk, id:a.id, name:a.name, icon:a.icon, level, label:a.open ? String(level) : ROMAN[level], date, tier:a.open ? openTier(a, level) : tierOfLevel(level)}); };
    const cum = (pk, a, map, step) => {
      let tot = 0, lvl = 0;
      [...map.keys()].sort().forEach(d => {
        tot += map.get(d);
        if (a.open) { const l = Math.floor(tot / a.step); if (l > lvl) { for (let i = lvl + 1; i <= l; i++) add(pk, a, i, d); lvl = l; } }
        else { const l = a.th.filter(t => tot >= t).length; if (l > lvl) { for (let i = lvl + 1; i <= l; i++) add(pk, a, i, d); lvl = l; } }
      });
    };
    const runs = (pk, a, days) => {
      let run = 0, start = null, prev = null;
      const flush = () => { if (run) a.th.forEach((t, i) => { if (run >= t) add(pk, a, i + 1, addDaysIso(start, t - 1)); }); };
      days.forEach(d => { if (prev && dayIdx(d) - dayIdx(prev) === 1) run++; else { flush(); run = 1; start = d; } prev = d; });
      flush();
    };
    per.forEach((u, pk) => {
      if (!NAMES[pk] || !isVisibleUser(pk)) return;
      cum(pk, A("colonist"), u.msgs); cum(pk, A("sticker"), u.stick); cum(pk, A("voice"), u.voice); cum(pk, A("video"), u.video);
      const real = [...u.msgs.keys()].filter(d => !vkDay(d)).sort();
      // рекорд за день
      const sp = A("spam"); let mx = 0;
      real.forEach(d => { const v = u.msgs.get(d); if (v > mx) { sp.th.forEach((t, i) => { if (mx < t && v >= t) add(pk, sp, i + 1, d); }); mx = v; } });
      runs(pk, A("streak"), real);
      runs(pk, A("wins"), real.filter(d => u.msgs.get(d) >= (B.dayMax.get(d) || Infinity)));
      // ветеран
      const joined = MEMBERSHIP_STARTS.find(([, id]) => String(id) === pk)?.[0], first = real[0], since = joined && /^\d{4}-\d{2}-\d{2}$/.test(joined) ? joined : first;
      if (since) { const ny = Math.min(80, Math.floor((dayIdx(today) - dayIdx(since)) / 365.25) + 1); for (let n = 1; n <= ny; n++) add(pk, A("veteran"), n, `${+since.slice(0, 4) + n}${since.slice(4)}`); }
    });
    // селфи
    const sel = A("selfie"), sm = new Map();
    SELFIE.forEach(r => { let m = sm.get(r.pk); if (!m) sm.set(r.pk, m = new Map()); m.set(r.date, (m.get(r.date) || 0) + r.count); });
    sm.forEach((m, pk) => { if (NAMES[pk] && isVisibleUser(pk)) cum(pk, sel, m); });
    // реакции (по дням) и события (уровень засчитывается в день окончания события)
    if (RX_ON && window.__beta) {
      const rg = new Map(), rr = new Map(), put = (M, pk, d, n) => { let m = M.get(pk); if (!m) M.set(pk, m = new Map()); m.set(d, (m.get(d) || 0) + n); };
      window.__beta.react.rows().forEach(x => { put(rg, x.f, x.d, x.n); put(rr, x.t, x.d, x.n); });
      rg.forEach((m, pk) => { if (NAMES[pk] && isVisibleUser(pk)) cum(pk, A("rgive"), m); });
      rr.forEach((m, pk) => { if (NAMES[pk] && isVisibleUser(pk)) cum(pk, A("rgot"), m); });
      const E = window.__beta.events;
      E.list().filter(ev => ev.status === "done").forEach(ev => {
        const a = {id:"ev-" + ev.id, name:ev.ach.name, icon:ev.ach.icon, th:ev.ach.th};
        E.people().forEach(pk => { if (!NAMES[pk] || !isVisibleUser(pk)) return; const l = a.th.filter(t => E.levelOf(ev.id, pk) >= t).length; for (let i = 1; i <= l; i++) add(pk, a, i, ev.end); });
      });
    }
    return out;
  }
  window.__achApi = {recent:recentAch, score:pk => stats(pk).score, full:pk => stats(pk), rank:sc => rankOf(sc)};

  const thText = (a, t) => a.fmtTh ? a.fmtTh(t) : fmt(t);
  const nextText = x => {
    const a = x.a;
    if (x.maxed) return "Максимальный уровень достигнут";
    const left = x.nextTh - x.v, lvlTxt = a.open ? x.level + 1 : ROMAN[x.level + 1];
    return a.id === "veteran" ? `До ур. ${lvlTxt}: ещё ${(left < 1 ? Math.max(1, Math.ceil(left * 12)) + " мес." : left.toFixed(1) + " г.")}` : `До ур. ${lvlTxt}: ещё ${fmt(Math.ceil(left))} (цель ${thText(a, x.nextTh)})`;
  };
  const lvlLabel = x => x.level <= 0 ? "—" : x.a.open ? String(x.level) : ROMAN[x.level];
  const svgIcon = (id, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICONS[id]}</svg>`;

  function pipsHtml(x){
    if (x.a.open) return "";
    return `<div class="ach-pips">${x.a.th.map((t, i) => `<i title="Ур. ${ROMAN[i + 1]} — ${escH(thText(x.a, t))}" style="${i < x.level ? `background:${TIERS[tierOfLevel(i + 1)]}` : ""}"></i>`).join("")}</div>`;
  }
  function cardHtml(x){
    const a = x.a, c = TIERS[x.tier], d = LAST.res.d, note = a.note(d);
    const bar = x.maxed ? "" : `<div class="ach-prog"><i style="width:${Math.round(x.pr * 100)}%"></i></div>`;
    return `<div class="ach-card${x.level <= 0 ? " locked" : ""}${x.maxed ? " max" : ""}" data-tier="${x.level <= 0 ? "none" : x.tier}" style="--tc:${c}" title="${escH(a.desc)}">
      <div class="ach-ico">${svgIcon(a.icon)}</div>
      <div><div class="ach-top"><h3>${a.name}</h3><span class="ach-lvl">${lvlLabel(x)}</span></div>
        <p class="ach-desc">${escH(a.desc)}</p>
        <div class="ach-val"><b>${a.show(x.v)}</b><small>${escH(a.unit(x.v))}${note ? " · " + escH(note) : ""}</small></div>
        ${pipsHtml(x)}${bar}<div class="ach-next">${escH(nextText(x))}</div></div></div>`;
  }
  function heroHtml(res, name, color){
    const r = rankOf(res.score);
    return `<div class="ach-hero" style="--hc:${color}"><div class="ach-avatar">${window.AVATAR ? AVATAR.inner(LAST.pk, String(name).replace(/^[«"]/, "").slice(0, 1).toUpperCase()) : escH(String(name).replace(/^[«"]/, "").slice(0, 1).toUpperCase())}</div>
      <div><div class="ach-hname">${escH(name)}</div><div class="ach-hrank">${r[2]} ${r[1]}</div><div class="ach-score-bar"><i style="width:${Math.min(100, res.score / (ACH.length * 10) * 100)}%"></i></div><div class="ach-score-lbl">Очки: ${res.score} из ${ACH.length * 10} (уровни всех достижений, у «Колониста» максимум 10)</div></div>
      <div class="ach-hstats"><div class="ach-hstat"><b>${res.score}</b><span>очков</span></div><div class="ach-hstat"><b>${res.got}/${ACH.length}</b><span>получено</span></div><div class="ach-hstat"><b>${res.maxCnt}</b><span>максимум</span></div></div></div>`;
  }
  function boardHtml(pk){
    const B = base(), list = [];
    B.users.forEach((u, k) => { if (u.msgs > 0 && isVisibleUser(k)) { const r = stats(k); list.push({k, name:NAMES[k] || `ID ${k}`, score:r.score, got:r.got, mx:r.maxCnt, msgs:u.msgs}); } });
    list.sort((a, b) => b.score - a.score || b.mx - a.mx || b.msgs - a.msgs);
    const top = list.slice(0, 15), idx = list.findIndex(x => x.k === String(pk));
    if (idx >= 15) top.push(list[idx]);
    return `<h2>Рейтинг по достижениям</h2><div class="wrap"><table id="ach-table"><thead><tr><th>Место</th><th style="text-align:left">Участник</th><th>Очки</th><th>Получено</th><th>Максимум</th><th style="text-align:left">Звание</th></tr></thead><tbody>${top.map(x => `<tr${x.k === String(pk) ? ' style="background:var(--accent-bg)"' : ""}><td>${list.indexOf(x) + 1}</td><td style="text-align:left"><span class="pname" data-open-profile="${escH(x.k)}">${escH(x.name)}</span></td><td><b>${x.score}</b></td><td>${x.got}/${ACH.length}</td><td>${x.mx}</td><td style="text-align:left">${rankOf(x.score)[2]} ${rankOf(x.score)[1]}</td></tr>`).join("")}</tbody></table></div>`;
  }

  // ---------- Рендер ----------
  const sel = () => $("ach-person");
  function fillPeople(){
    const s2 = sel(), cur = s2.value;
    const entries = Object.entries(NAMES).sort((a, b) => a[1].localeCompare(b[1], "ru"));
    base().users.forEach((u, k) => { if (!NAMES[k] && u.msgs > 0) entries.push([k, `ID ${k}`]); });
    s2.innerHTML = entries.map(([k, n]) => `<option value="${escH(k)}">${escH(n)}</option>`).join("");
    // Достижения — часть профиля: по умолчанию тот же участник, что открыт в профиле.
    // Переход из Хаба / Хроники к достижениям конкретного человека — главнее участника из Профиля
    const asked = window.__achWant; window.__achWant = "";
    let want = asked && [...s2.options].some(o => o.value === String(asked)) ? String(asked) : (typeof person !== "undefined" && person.value && [...s2.options].some(o => o.value === person.value)) ? person.value : cur;
    try { if (!want) want = localStorage.getItem("chatstats.achPerson.v1") || ""; } catch (e) {}
    if (!want || ![...s2.options].some(o => o.value === want)) want = (typeof person !== "undefined" && person.value) || "";
    if (!want || ![...s2.options].some(o => o.value === want)) {
      let best = null; base().users.forEach(u => { if (!best || u.msgs > best.msgs) best = u; });
      want = best ? best.k : (s2.options[0]?.value || "");
    }
    s2.value = want;
  }
  function render(){
    if (!allRows) return;
    const pk = sel().value; if (!pk) { $("ach-out").innerHTML = `<div class="s-empty">Нет участников для отображения.</div>`; LAST = null; return; }
    const res = stats(pk), name = NAMES[pk] || `ID ${pk}`, color = getStyle("u", pk).c[0];
    LAST = {pk, res, name, color};
    const legend = `<div class="ach-legend">${Object.entries(TIER_NAMES).map(([k, n]) => `<span><i style="background:${TIERS[k]}"></i>${n}</span>`).join("")}<span><i style="background:${TIERS.none}"></i>Не получено</span></div>`;
    let view = "main"; try { view = localStorage.getItem("chatstats.achView.v1") || "main"; } catch (e) {}
    if (!window.__betaOn || !window.__beta) view = "main";
    const seg = window.__betaOn ? `<div class="seg ach-view-seg" role="tablist"><button type="button" data-ach-view="main" class="${view === "main" ? "active" : ""}">Общие</button><button type="button" data-ach-view="events" class="${view === "events" ? "active" : ""}">По событиям</button></div>` : "";
    $("ach-out").innerHTML = heroHtml(res, name, color) + seg + (view === "events" ? eventsAchHtml(pk) + legend : `<div class="ach-grid">${res.items.map(cardHtml).join("")}</div>${legend}` + boardHtml(pk));
  }
  // Достижения по событиям — у каждого события своё, 7 уровней по достигнутому уровню в событии
  function eventsAchHtml(pk){
    const E = window.__beta.events, list = E.list();
    const items = list.map(ev => {
      const v = E.levelOf(ev.id, pk), th = ev.ach.th;
      const level = th.filter(t => v >= t).length, prevTh = level ? th[level - 1] : 0, nextTh = level < th.length ? th[level] : null, maxed = level >= th.length;
      const a = {id:"ev-" + ev.id, name:ev.ach.name, icon:ev.ach.icon, desc:ev.ach.desc, th, show:v2 => v2 ? String(v2) : "—", unit:v2 => v2 ? "уровень в событии" : "не участвовал(а)",
        note:() => `${formatMetricDate(ev.start)} — ${formatMetricDate(ev.end)}${ev.status === "live" ? " · идёт" : ""}`};
      return {a, v, level, prevTh, nextTh, maxed, pr:maxed ? 1 : Math.max(0, Math.min(1, (v - prevTh) / ((nextTh - prevTh) || 1))), tier:tierOfLevel(level)};
    });
    const rows = E.people().map(p2 => ({p:p2, lv:list.map(ev => E.levelOf(ev.id, p2))})).filter(r => r.lv.some(x => x > 0))
      .map(r => ({...r, tiers:r.lv.map((x, i) => list[i].ach.th.filter(t => x >= t).length)})).sort((a, b) => b.tiers.reduce((s2, x) => s2 + x, 0) - a.tiers.reduce((s2, x) => s2 + x, 0) || b.lv.reduce((s2, x) => s2 + x, 0) - a.lv.reduce((s2, x) => s2 + x, 0));
    const cell = (lv, t) => lv ? `<span class="ev-tier" style="--tc:${TIERS[tierOfLevel(t)]}">${t ? ROMAN[t] : "—"}</span> <small class="hint">ур. ${lv}</small>` : `<span class="hint">—</span>`;
    const board = `<h2>Рейтинг по событиям</h2><div class="wrap"><table id="ach-ev-table"><thead><tr><th>Место</th><th style="text-align:left">Участник</th>${list.map(ev => `<th>${escH(ev.ach.name)}</th>`).join("")}<th>Уровней достижений</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td style="text-align:left">${escH(window.__rxName ? window.__rxName(r.p) : (NAMES[r.p] || "ID " + r.p))}</td>${r.lv.map((lv, j) => `<td>${cell(lv, r.tiers[j])}</td>`).join("")}<td><b>${r.tiers.reduce((s2, x) => s2 + x, 0)}</b></td></tr>`).join("")}</tbody></table></div>`;
    return `<div class="ach-grid">${items.map(cardHtml).join("")}</div>` + board;
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-ach-view]"); if (!b) return;
    try { localStorage.setItem("chatstats.achView.v1", b.dataset.achView); } catch (err) {}
    render();
  });
  window.loadAchievements = async function(){
    const st = $("ach-status");
    if (!allRows) $("ach-out").innerHTML = `<div class="sk sk-poster" style="height:130px"></div>` + skPage(4, 2);
    try { await getHistory(); } catch (e) { st.textContent = "Не удалось загрузить данные: " + e.message; st.className = "status err"; return; }
    st.textContent = ""; st.className = "status";
    fillPeople(); render();
  };
  window.renderAchievements = render;
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("nav button[data-tab]");
    if (b && b.dataset.tab === "achievements") setTimeout(() => window.loadAchievements(), 0);
  });
  sel().addEventListener("change", () => {
    const v = sel().value;
    try { localStorage.setItem("chatstats.achPerson.v1", v); } catch (e) {}
    // Возвращаясь в «Профиль», увидим того же участника.
    if (typeof person !== "undefined" && v) { if (![...person.options].some(o => o.value === v)) { const o = document.createElement("option"); o.value = v; o.textContent = NAMES[v] || `ID ${v}`; person.appendChild(o); } person.value = v; }
    render();
  });

  // ---------- Экспорт картинкой ----------
  function wrapLines(t, n){ return cmpWrap(t, n); }
  function exportSvg(){
    const {res, name, color} = LAST, d = res.d;
    const tx = cmpThemeVar("--text", "#e8eaf1"), mu = cmpThemeVar("--muted", "#9aa0b0"), ln = cmpThemeVar("--line", "#2c303b"), pn = cmpThemeVar("--panel", "#171a22");
    const W = 1240, pad = 36, cw = (W - pad * 2 - 16) / 2, ch = 166, gap = 14, r = rankOf(res.score);
    let o = "";
    // шапка
    o += LAST.avData ? `<defs><clipPath id="ach-av-clip"><rect x="${pad}" y="30" width="72" height="72" rx="36"/></clipPath></defs><rect x="${pad}" y="30" width="72" height="72" rx="36" fill="${color}"/><image href="${LAST.avData}" x="${pad}" y="30" width="72" height="72" preserveAspectRatio="xMidYMid slice" clip-path="url(#ach-av-clip)"/>` : `<rect x="${pad}" y="30" width="72" height="72" rx="36" fill="${color}"/><text x="${pad + 36}" y="80" text-anchor="middle" font-size="36" font-weight="700" fill="#10131a">${escH(String(name).replace(/^[«"]/, "").slice(0, 1).toUpperCase())}</text>`;
    o += `<text x="${pad + 92}" y="62" font-size="34" font-weight="700" fill="${tx}">${escH(cmpFit(name, 26))}</text><text x="${pad + 92}" y="92" font-size="18" fill="${mu}">Достижения · ${r[1]} · ${formatMetricDate(iso(new Date()))}</text>`;
    const stat = (x, big, lbl) => `<rect x="${x}" y="34" width="120" height="68" rx="14" fill="${tx}" fill-opacity=".06" stroke="${ln}"/><text x="${x + 60}" y="70" text-anchor="middle" font-size="30" font-weight="700" fill="${tx}">${big}</text><text x="${x + 60}" y="90" text-anchor="middle" font-size="13" fill="${mu}">${lbl}</text>`;
    o += stat(W - pad - 384, res.score, "очков из 100") + stat(W - pad - 256, `${res.got}/${ACH.length}`, "получено") + stat(W - pad - 128, res.maxCnt, "максимум");
    o += `<rect x="${pad}" y="118" width="${W - pad * 2}" height="8" rx="4" fill="${tx}" fill-opacity=".08"/><rect x="${pad}" y="118" width="${Math.max(6, (W - pad * 2) * res.score / 100).toFixed(1)}" height="8" rx="4" fill="${TIERS[tierOfLevel(Math.ceil(res.score / 10))]}"/>`;
    const top = 150;
    res.items.forEach((x, i) => {
      const a = x.a, c = TIERS[x.tier], col = i % 2, row = Math.floor(i / 2), X = pad + col * (cw + 16), Y = top + row * (ch + gap), locked = x.level <= 0;
      o += `<g opacity="${locked ? .62 : 1}"><rect x="${X}" y="${Y}" width="${cw}" height="${ch}" rx="18" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-opacity="${x.maxed ? .95 : .5}" stroke-width="${x.maxed ? 2.5 : 1.5}"/><rect x="${X}" y="${Y + 18}" width="4" height="${ch - 36}" rx="2" fill="${c}"/>`;
      o += `<rect x="${X + 20}" y="${Y + 20}" width="76" height="76" rx="22" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-opacity=".6"/>`;
      o += `<g transform="translate(${X + 36},${Y + 36}) scale(2)" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[a.icon]}</g>`;
      const tx0 = X + 114, tx1 = X + cw - 20;
      o += `<text x="${tx0}" y="${Y + 36}" font-size="22" font-weight="700" fill="${tx}">${a.name}</text>`;
      const lab = lvlLabel(x), lw = Math.max(44, lab.length * 13 + 24);
      o += `<rect x="${tx1 - lw}" y="${Y + 16}" width="${lw}" height="28" rx="14" fill="${locked ? tx : c}" fill-opacity="${locked ? .12 : 1}"/><text x="${tx1 - lw / 2}" y="${Y + 36}" text-anchor="middle" font-size="16" font-weight="700" fill="${locked ? mu : "#10131a"}">${lab}</text>`;
      wrapLines(a.desc, 52).slice(0, 2).forEach((t, k) => { o += `<text x="${tx0}" y="${Y + 58 + k * 17}" font-size="13" fill="${mu}">${escH(t)}</text>`; });
      const nl = Math.min(2, wrapLines(a.desc, 52).length), dy = Y + 58 + nl * 17 + (nl > 1 ? -4 : 8);
      const note = a.note(d);
      o += `<text x="${tx0}" y="${dy + 14}" font-size="22" font-weight="700" fill="${locked ? tx : c}">${escH(a.show(x.v))}</text>`;
      const vw = a.show(x.v).length * 12.5 + 8;
      o += `<text x="${tx0 + vw}" y="${dy + 13}" font-size="13" fill="${mu}">${escH(cmpFit(a.unit(x.v) + (note ? " · " + note : ""), 52))}</text>`;
      const by = Y + ch - 48;
      if (!a.open) {
        const pw = (tx1 - tx0 - 9 * 4) / 10;
        a.th.forEach((t, k) => { o += `<rect x="${(tx0 + k * (pw + 4)).toFixed(1)}" y="${by}" width="${pw.toFixed(1)}" height="8" rx="4" fill="${k < x.level ? TIERS[tierOfLevel(k + 1)] : tx}" fill-opacity="${k < x.level ? 1 : .1}"/>`; });
      } else if (!x.maxed) {
        o += `<rect x="${tx0}" y="${by}" width="${tx1 - tx0}" height="8" rx="4" fill="${tx}" fill-opacity=".1"/><rect x="${tx0}" y="${by}" width="${Math.max(6, (tx1 - tx0) * x.pr).toFixed(1)}" height="8" rx="4" fill="${c}"/>`;
      }
      if (!a.open && !x.maxed) o += `<rect x="${tx0}" y="${by + 12}" width="${tx1 - tx0}" height="3" rx="1.5" fill="${tx}" fill-opacity=".08"/><rect x="${tx0}" y="${by + 12}" width="${Math.max(3, (tx1 - tx0) * x.pr).toFixed(1)}" height="3" rx="1.5" fill="${c}"/>`;
      o += `<text x="${tx0}" y="${by + 34}" font-size="12.5" fill="${mu}">${escH(cmpFit(nextText(x), 58))}</text></g>`;
    });
    const H = top + 5 * (ch + gap) + 24;
    // легенда
    let lx = pad; const ly = H - 8;
    Object.entries(TIER_NAMES).forEach(([k, n]) => { o += `<rect x="${lx}" y="${ly - 11}" width="12" height="12" rx="4" fill="${TIERS[k]}"/><text x="${lx + 18}" y="${ly}" font-size="13" fill="${mu}">${n}</text>`; lx += 40 + n.length * 7.4; });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 18}" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
  }
  async function blob(){
    if (!LAST) throw new Error("Нет данных");
    LAST.avData = window.AVATAR ? await AVATAR.dataUri(LAST.pk) : null;
    const box = document.createElement("div"); box.style.cssText = "position:fixed;left:-10000px;top:0;width:1300px";
    box.innerHTML = exportSvg(); document.body.appendChild(box);
    try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
  }
  $("ach-copy").addEventListener("click", () => copyPngToStatus(() => blob(), $("ach-msg"), "Достижения скопированы"));
  $("ach-download").addEventListener("click", async () => {
    const msg = $("ach-msg");
    try { msg.textContent = "Подготовка…"; const b = await blob(); downloadBlob(b, `achievements_${String(LAST.name).toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "_").replace(/^_|_$/g, "")}.png`); msg.textContent = "Файл скачан"; }
    catch (e) { msg.textContent = "Не удалось скачать: " + (e?.message || e); }
    const c = msg.textContent; setTimeout(() => { if (msg.textContent === c) msg.textContent = ""; }, 4500);
  });
  window.__ach = {stats, ACH, exportSvg};
})();
