
/* ===================== Хроника чата и недельный дайджест ===================== */
(function(){
  const $c = id => document.getElementById(id);
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const num = v => Math.round(v).toLocaleString("ru-RU");
  const MG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MN = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const dm = d => { const a = d.split("-"); return `${+a[2]} ${MG[+a[1] - 1]}`; };
  const dmy = d => `${dm(d)} ${d.slice(0, 4)}`;
  const TYPES = {
    ach:{t:"Достижения", ic:"🏅"}, rec:{t:"Личные рекорды", ic:"🔥"}, chat:{t:"Рекорды чата", ic:"🏆"},
    lead:{t:"Лидеры", ic:"👑"}, streak:{t:"Серии", ic:"⚡"}, join:{t:"Вступления", ic:"👋"}
  };
  const TIERC = {bronze:"#e3a36b", silver:"#c0c6d4", gold:"#ffd166", diamond:"#67e8f9"};

  /* ---------- модель ---------- */
  let CM = null;
  function model(){
    if (CM && CM.src === allRows) return CM;
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
    const users = new Map(), tot = new Map(); let latest = "";
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      const k = String(x[F.userId] ?? x[F.name]);
      let u = users.get(k); if (!u) users.set(k, u = new Map());
      let r = u.get(d); if (!r) u.set(d, r = {m:0, s:0, v:0, o:0});
      const m = Number(g(x, "msgs")) || 0;
      r.m += m; r.s += Number(g(x, "stick")) || 0; r.v += Number(g(x, "voice")) || 0; r.o += Number(g(x, "video")) || 0;
      tot.set(d, (tot.get(d) || 0) + m); if (m && d > latest) latest = d;
    });
    CM = {src:allRows, users, tot, latest, ev:null};
    return CM;
  }
  const vis = pk => NAMES[pk] && isVisibleUser(pk);

  function chronicle(M){
    if (M.ev) return M.ev;
    const ev = [], add = (date, type, pk, text, extra) => ev.push(Object.assign({date, type, pk, name:pk ? NAMES[pk] : null, ic:TYPES[type].ic, text}, extra || {}));
    const days = [...M.tot.keys()].filter(d => M.tot.get(d) > 0).sort();
    if (!days.length) return M.ev = ev;
    const warm = addDaysIso(days[0], 30);
    // вехи чата
    const TH = []; for (let e = 4; e <= 8; e++) [1, 2, 5].forEach(m => TH.push(m * 10 ** e));
    let cum = 0, ti = 0;
    days.forEach(d => { cum += M.tot.get(d); while (ti < TH.length && cum >= TH[ti]) { add(d, "chat", null, `Чат преодолел ${num(TH[ti])} сообщений`, {ic:"🎯"}); ti++; } });
    // рекордные дни чата
    let mx = 0;
    days.forEach(d => { if (vkDay(d)) return; const v = M.tot.get(d); if (v > mx) { if (d >= warm) add(d, "chat", null, `Рекордный день чата: ${num(v)} сообщений`); mx = v; } });
    // месяцы
    const mon = new Map(), monU = new Map(), monLast = new Map();
    M.users.forEach((u, pk) => u.forEach((r, d) => {
      if (!r.m) return; const ym = d.slice(0, 7);
      mon.set(ym, (mon.get(ym) || 0) + r.m); if (!monLast.get(ym) || d > monLast.get(ym)) monLast.set(ym, d);
      if (vis(pk)) { let q = monU.get(ym); if (!q) monU.set(ym, q = new Map()); q.set(pk, (q.get(pk) || 0) + r.m); }
    }));
    const yms = [...mon.keys()].sort(), curYm = M.latest.slice(0, 7);
    let mm = 0, prevWin = null;
    yms.forEach((ym, i) => {
      if (ym === curYm) return;
      const v = mon.get(ym), last = monLast.get(ym), lab = `${MN[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
      if (v > mm) { if (i >= 2) add(last, "chat", null, `Рекордный месяц чата: ${lab} — ${num(v)} сообщений`, {ic:"📅"}); mm = v; }
      const q = monU.get(ym); if (q) { const w = [...q.entries()].sort((a, b) => b[1] - a[1])[0];
        if (prevWin !== null && w[0] !== prevWin && i >= 2) add(last, "lead", w[0], `лидер месяца — ${lab}: ${num(w[1])} сообщений`, {ic:"🥇"});
        prevWin = w[0]; }
    });
    // личные рекорды дня и серии
    const runEv = [];
    M.users.forEach((u, pk) => {
      if (!vis(pk)) return;
      const ds = [...u.keys()].filter(d => u.get(d).m > 0).sort(); if (!ds.length) return;
      const w = addDaysIso(ds[0], 30); let m2 = 0, run = 0, prev = null;
      ds.forEach(d => {
        if (vkDay(d)) { prev = null; run = 0; return; }
        const v = u.get(d).m;
        if (v > m2) { if (d >= w && v >= 50) add(d, "rec", pk, `личный рекорд дня: ${num(v)} ${wordForm(v, ["сообщение", "сообщения", "сообщений"])}`); m2 = v; }
        run = prev && dayIdx(d) - dayIdx(prev) === 1 ? run + 1 : 1; prev = d;
        if (run >= 7) runEv.push({d, pk, run});
      });
    });
    // рекорд серии по всему чату
    runEv.sort((a, b) => a.d.localeCompare(b.d) || a.run - b.run);
    let gmax = 6, last = null;
    runEv.forEach(r => {
      if (r.run <= gmax) return; gmax = r.run;
      if (last && last.pk === r.pk && dayIdx(r.d) - dayIdx(last.date) <= 1) { last.date = r.d; last.text = `рекордная серия чата: ${r.run} ${wordForm(r.run, ["день", "дня", "дней"])} подряд`; return; }
      add(r.d, "streak", r.pk, `рекордная серия чата: ${r.run} ${wordForm(r.run, ["день", "дня", "дней"])} подряд`); last = ev[ev.length - 1];
    });
    // лидер по общему счёту
    const byDay = new Map();
    M.users.forEach((u, pk) => { if (!vis(pk)) return; u.forEach((r, d) => { if (!r.m) return; let a = byDay.get(d); if (!a) byDay.set(d, a = []); a.push([pk, r.m]); }); });
    const cu = new Map(); let leader = null;
    [...byDay.keys()].sort().forEach(d => {
      let cand = null;
      byDay.get(d).forEach(([pk, m]) => { const t = (cu.get(pk) || 0) + m; cu.set(pk, t); if (!cand || t > cu.get(cand)) cand = pk; });
      if (leader === null) { leader = cand; return; }
      if (cand !== leader && cu.get(cand) > cu.get(leader)) { if (d >= warm) add(d, "lead", cand, `новый лидер по общему счёту, опередив ${NAMES[leader]} (${num(cu.get(cand))} сообщений)`, {ic:"👑"}); leader = cand; }
    });
    // вступления
    (MEMBERSHIP_STARTS || []).forEach(([d, id]) => { const pk = String(id); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && vis(pk)) add(d, "join", pk, "вступил(а) в чат"); });
    // достижения
    try {
      (window.__achApi?.recent("0000-01-01") || []).forEach(e => {
        if (e.id === "colonist" && !(e.level === 1 || e.level % 10 === 0)) return;
        if (!vis(e.pk)) return;
        add(e.date, "ach", e.pk, `«${e.name}», ур. ${e.label}`, {tier:e.tier});
      });
    } catch (err) { console.error(err); }
    ev.sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type));
    return M.ev = ev;
  }

  /* ---------- вкладка «Хроника» ---------- */
  const ST = {types:new Set(Object.keys(TYPES)), person:"", year:"", q:"", limit:80};
  const pn = e => e.name ? `<span class="pname" data-open-profile="${esc(e.pk)}">${esc(e.name)}</span> ` : "";
  // одинаковые события одного дня у разных людей («Шиноби, ур. I» у девяти человек) — одной строкой
  function mergeSame(list){
    const out = [], idx = new Map();
    list.forEach(e => {
      if (!e.pk) { out.push(e); return; }
      const k = e.date + "|" + e.type + "|" + e.text, g0 = idx.get(k);
      if (g0) { g0.group.push(e); return; }
      const c = {...e, group:[e]}; idx.set(k, c); out.push(c);
    });
    return out;
  }
  const evRow = e => e.group && e.group.length > 1 ? `<div class="hub-ev"><div class="ic">${e.ic}</div><div class="tx">${e.group.slice(0, 3).map(x => `<span class="pname" data-open-profile="${esc(x.pk)}">${esc(x.name)}</span>`).join(", ")}${e.group.length > 3 ? ` <span class="ch-more" title="${esc(e.group.slice(3).map(x => x.name).join(", "))}">и ещё ${e.group.length - 3}</span>` : ""} · ${e.tier ? `<span class="hub-tier" style="--tc:${TIERC[e.tier] || "#888"}"></span>` : ""}${esc(e.text)}<small>${TYPES[e.type].t} · ${e.group.length} ${wordForm(e.group.length, ["участник", "участника", "участников"])}</small></div><div class="dt">${dm(e.date)}</div></div>` : `<div class="hub-ev"><div class="ic">${e.ic}</div><div class="tx">${pn(e)}${e.tier ? `<span class="hub-tier" style="--tc:${TIERC[e.tier] || "#888"}"></span>` : ""}${esc(e.text)}<small>${TYPES[e.type].t}</small></div><div class="dt">${dm(e.date)}</div></div>`;
  function fillControls(M, evs){
    const sp = $c("ch-person"), sy = $c("ch-year"); if (!sp || !sy) return;
    const names = [...new Set(evs.filter(e => e.pk).map(e => e.pk))].sort((a, b) => NAMES[a].localeCompare(NAMES[b], "ru"));
    const sig = names.join();
    if (sp.dataset.sig !== sig) { sp.innerHTML = `<option value="">Все</option>` + names.map(pk => `<option value="${esc(pk)}">${esc(NAMES[pk])}</option>`).join(""); sp.dataset.sig = sig; }
    sp.value = ST.person;
    const ys = [...new Set(evs.map(e => e.date.slice(0, 4)))].sort().reverse(), sg = ys.join();
    if (sy.dataset.sig !== sg) { sy.innerHTML = `<option value="">Все годы</option>` + ys.map(y => `<option>${y}</option>`).join(""); sy.dataset.sig = sg; }
    sy.value = ST.year;
  }
  function renderChron(){
    const out = $c("ch-out"); if (!out || !allRows) return;
    const M = model(), all = chronicle(M);
    fillControls(M, all);
    const cnt = {}; all.forEach(e => cnt[e.type] = (cnt[e.type] || 0) + 1);
    $c("ch-types").innerHTML = `<span class="qr-label">Показывать</span>` + Object.entries(TYPES).map(([k, v]) => `<button class="quick-chip${ST.types.has(k) ? " active" : ""}" type="button" data-ch-type="${k}">${v.ic} ${v.t} · ${cnt[k] || 0}</button>`).join("");
    const q = ST.q.trim().toLowerCase();
    const list = all.filter(e => ST.types.has(e.type) && (!ST.person || e.pk === ST.person) && (!ST.year || e.date.startsWith(ST.year)) && (!q || ((e.name || "") + " " + e.text).toLowerCase().includes(q)));
    const merged = mergeSame(list);
    // KPI
    const thisY = String(new Date().getFullYear()), byP = new Map();
    all.forEach(e => { if (e.pk) byP.set(e.pk, (byP.get(e.pk) || 0) + 1); });
    const topP = [...byP.entries()].sort((a, b) => b[1] - a[1])[0], lastE = all[0];
    const k = (l, v, s, c) => `<div class="hub-kpi" style="--k:${c}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
    const kp = `<div class="hub-kpis">
      ${k("Событий в хронике", num(all.length), `${all.length ? "с " + dmy(all[all.length - 1].date) : ""}`, "#7aa2f7")}
      ${k(`За ${thisY} год`, num(all.filter(e => e.date.startsWith(thisY)).length), "событий с начала года", "#76F0B6")}
      ${k("Самый заметный", topP ? `<span class="pname" data-open-profile="${esc(topP[0])}">${esc(NAMES[topP[0]])}</span>` : "—", topP ? `${topP[1]} ${wordForm(topP[1], ["событие", "события", "событий"])} в хронике` : "", "#ffd166")}
      ${k("Последнее", lastE ? dm(lastE.date) : "—", lastE ? `${lastE.name ? esc(lastE.name) + ": " : ""}${esc(lastE.text).slice(0, 60)}` : "", "#f7768e")}
    </div>`;
    // по годам
    const yr = new Map(); list.forEach(e => { const y = e.date.slice(0, 4); yr.set(y, (yr.get(y) || 0) + 1); });
    const ymax = Math.max(1, ...yr.values());
    const years = [...yr.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const chart = years.length > 1 ? `<div class="hub-card"><h3><span>События по годам</span></h3>${years.map(([y, n]) => `<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><span style="width:44px;color:var(--muted);font-size:13px">${y}</span><div style="flex:1;height:14px;background:var(--ctrl);border-radius:7px;overflow:hidden"><div style="width:${n / ymax * 100}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2))"></div></div><span style="width:40px;text-align:right;font-variant-numeric:tabular-nums;font-size:13px">${n}</span></div>`).join("")}</div>` : "";
    // таблица по людям
    const pm = new Map();
    list.forEach(e => { if (!e.pk) return; let r = pm.get(e.pk); if (!r) pm.set(e.pk, r = {ach:0, rec:0, lead:0, streak:0, join:0, all:0}); r[e.type] = (r[e.type] || 0) + 1; r.all++; });
    const rows = [...pm.entries()].sort((a, b) => b[1].all - a[1].all).slice(0, 10);
    const table = rows.length ? `<div class="hub-card"><h3><span>Кто чаще в хронике</span></h3><div style="overflow-x:auto"><table style="width:100%;min-width:0"><thead><tr><th style="text-align:left">Участник</th><th title="Достижения">🏅</th><th title="Личные рекорды">🔥</th><th title="Лидерство">👑</th><th title="Серии">⚡</th><th>Всего</th></tr></thead><tbody>${rows.map(([pk, r]) => `<tr><td style="text-align:left"><span class="pname" data-open-profile="${esc(pk)}">${esc(NAMES[pk])}</span></td><td>${r.ach}</td><td>${r.rec}</td><td>${r.lead}</td><td>${r.streak}</td><td><b>${r.all}</b></td></tr>`).join("")}</tbody></table></div></div>` : "";
    // лента
    let html = "", curY = "", curM = "", n = 0;
    const shown = merged.slice(0, ST.limit);
    shown.forEach(e => {
      const y = e.date.slice(0, 4), ym = e.date.slice(0, 7);
      if (ym !== curM) { if (curM) html += `</div>`; curM = ym; if (y !== curY) { curY = y; html += `<h2 class="ch-y">${y}</h2>`; } html += `<div class="hub-card ch-list" style="margin-bottom:12px"><h3><span>${MN[+ym.slice(5) - 1]}</span></h3>`; }
      html += evRow(e);
    });
    if (curM) html += `</div>`;
    out.innerHTML = `${kp}<div class="hub-feed" style="margin:12px 0 4px">${chart}${table}</div><div class="hub-sec"><h2>Лента событий</h2><span class="hint">${num(list.length)} ${wordForm(list.length, ["событие", "события", "событий"])}${merged.length < list.length ? ` · одинаковые за день объединены` : ""}</span></div>${html || `<div class="hub-empty">По выбранным фильтрам событий нет</div>`}${merged.length > ST.limit ? `<p style="text-align:center"><button class="mini" id="ch-more" type="button">Показать ещё (${Math.min(80, merged.length - ST.limit)})</button></p>` : ""}`;
    $c("ch-status").textContent = "";
  }
  window.loadChronicle = async function(){
    const st = $c("ch-status");
    if (!allRows) { if (st) st.textContent = "Загружаю данные…"; try { await getHistory(); } catch (e) { if (st) st.textContent = "Не удалось загрузить данные: " + e.message; return; } }
    renderChron();
  };
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-ch-type]");
    if (t) { const k = t.dataset.chType; ST.types.has(k) ? ST.types.delete(k) : ST.types.add(k); ST.limit = 80; renderChron(); return; }
    if (e.target.id === "ch-more") { ST.limit += 80; renderChron(); }
  });
  document.addEventListener("change", e => {
    if (e.target.id === "ch-person") { ST.person = e.target.value; ST.limit = 80; renderChron(); }
    if (e.target.id === "ch-year") { ST.year = e.target.value; ST.limit = 80; renderChron(); }
  });
  document.addEventListener("input", e => { if (e.target.id === "ch-q") { ST.q = e.target.value; ST.limit = 80; renderChron(); const q = $c("ch-q"); q.focus(); } });
  const tabEl = $c("tab-chronicle");
  if (tabEl) { new MutationObserver(() => { if (tabEl.classList.contains("active")) window.loadChronicle(); }).observe(tabEl, {attributes:true, attributeFilter:["class"]}); if (tabEl.classList.contains("active")) window.loadChronicle(); }

  /* ---------- недельный дайджест ---------- */
  let DG_END = "last";
  function weekOptions(L){
    const a = L.split("-").map(Number), dow = (new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay() + 6) % 7;   // 0 = пн
    let end = addDaysIso(L, -(dow + 1));   // воскресенье перед текущей неделей
    const opts = [["last", `Последние 7 дней (до ${dm(L)})`]];
    if (dow === 6) opts.push([L, `Неделя ${dm(addDaysIso(L, -6))} – ${dm(L)}`]);
    for (let i = 0; i < 8; i++, end = addDaysIso(end, -7)) opts.push([end, `Неделя ${dm(addDaysIso(end, -6))} – ${dm(end)}`]);
    return opts;
  }
  function digest(endSel){
    const M = model(), L = M.latest; if (!L) return null;
    const end = endSel === "last" ? L : endSel, from = addDaysIso(end, -6), pf = addDaysIso(end, -13), pt = addDaysIso(end, -7);
    const days = []; let tot = 0, prev = 0;
    for (let i = 0; i < 7; i++) { const d = addDaysIso(from, i), v = M.tot.get(d) || 0; days.push({d, m:v}); tot += v; }
    for (let d = pf; d <= pt; d = addDaysIso(d, 1)) prev += M.tot.get(d) || 0;
    let st = 0, vo = 0, vi = 0; const per = new Map();
    M.users.forEach((u, pk) => {
      let m = 0, p = 0;
      for (let d = from; d <= end; d = addDaysIso(d, 1)) { const r = u.get(d); if (r) { m += r.m; st += r.s; vo += r.v; vi += r.o; } }
      for (let d = pf; d <= pt; d = addDaysIso(d, 1)) { const r = u.get(d); if (r) p += r.m; }
      if (vis(pk) && (m || p)) per.set(pk, {pk, m, p});
    });
    const list = [...per.values()].filter(x => x.m > 0).sort((a, b) => b.m - a.m);
    const riser = [...per.values()].filter(x => x.m >= 20).sort((a, b) => (b.m - b.p) - (a.m - a.p))[0];
    const act = days.filter(x => x.d <= L);
    const busy = act.reduce((a, b) => b.m > a.m ? b : a, act[0] || {d:from, m:0}), quiet = act.reduce((a, b) => b.m < a.m ? b : a, act[0] || {d:from, m:0});
    const events = chronicle(M).filter(e => e.date >= from && e.date <= end && e.type !== "join").slice(0, 6);
    let bd = [];
    try { if (end >= addDaysIso(iso(new Date()), -1)) bd = (window.__bdApi?.upcoming(7) || []).slice(0, 4); } catch (e) {}
    return {from, end, days, tot, prev, st, vo, vi, list, riser, busy, quiet, events, bd, active:list.length, L};
  }
  const trendTxt = (a, b) => b > 0 ? `${a >= b ? "▲" : "▼"} ${Math.abs((a - b) / b * 100).toFixed(1)}% к прошлой неделе (${num(b)})` : "";
  const WS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const wdOf = d => { const a = d.split("-").map(Number); return (new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay() + 6) % 7; };

  function digestHtml(D){
    const mx = Math.max(1, ...D.days.map(x => x.m)), tmx = Math.max(1, D.list[0]?.m || 1);
    const bars = D.days.map(x => `<div style="flex:1;text-align:center;min-width:0"><div style="height:90px;display:flex;align-items:flex-end;justify-content:center"><div title="${num(x.m)}" style="width:70%;height:${Math.max(3, x.m / mx * 100)}%;border-radius:6px 6px 2px 2px;background:${x === D.busy ? "var(--accent)" : "var(--ctrl)"}"></div></div><div style="font-size:12px;color:var(--muted);margin-top:4px">${WS[wdOf(x.d)]}</div><div style="font-size:12px;font-variant-numeric:tabular-nums">${num(x.m)}</div></div>`).join("");
    const top = D.list.slice(0, 5).map((u, i) => `<div style="margin:7px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><span>${i + 1}. <span class="pname" data-open-profile="${esc(u.pk)}">${esc(NAMES[u.pk])}</span></span><b style="font-variant-numeric:tabular-nums">${num(u.m)}</b></div><div style="height:8px;border-radius:4px;background:var(--ctrl);margin-top:3px;overflow:hidden"><div style="width:${u.m / tmx * 100}%;height:100%;background:${getStyle("u", u.pk).c[0]}"></div></div></div>`).join("") || `<div class="hub-empty">Нет данных за этот период</div>`;
    const facts = [
      `Стикеров <b>${num(D.st)}</b> · голосовых <b>${num(D.vo)}</b> · кружков <b>${num(D.vi)}</b>`,
      D.busy.m ? `Самый активный день — <b>${WS[wdOf(D.busy.d)]}, ${dm(D.busy.d)}</b>: ${num(D.busy.m)}` : "",
      D.quiet.d !== D.busy.d ? `Самый тихий — <b>${WS[wdOf(D.quiet.d)]}, ${dm(D.quiet.d)}</b>: ${num(D.quiet.m)}` : "",
      D.riser && D.riser.m > D.riser.p ? `Прорыв недели — <span class="pname" data-open-profile="${esc(D.riser.pk)}">${esc(NAMES[D.riser.pk])}</span>: +${num(D.riser.m - D.riser.p)} к прошлой неделе` : ""
    ].filter(Boolean).map(t => `<div style="margin:6px 0;font-size:14px">${t}</div>`).join("");
    const evs = D.events.map(evRow).join(""), bds = D.bd.map(b => `<div class="hub-ev"><div class="ic">${b.days === 0 ? "🎉" : "🎂"}</div><div class="tx"><span class="pname" data-open-profile="${esc(b.pk)}">${esc(b.name)}</span> — день рождения</div><div class="dt">${b.days === 0 ? "сегодня" : b.days === 1 ? "завтра" : `через ${b.days} дн.`}</div></div>`).join("");
    return `<div class="hub-kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="hub-kpi" style="--k:#7aa2f7"><div class="l">Сообщений за неделю</div><div class="v">${num(D.tot)}</div><div class="s">${D.prev ? `<b class="${D.tot >= D.prev ? "hub-up" : "hub-down"}">${trendTxt(D.tot, D.prev)}</b>` : "нет данных за прошлую неделю"}</div></div>
        <div class="hub-kpi" style="--k:#76F0B6"><div class="l">Среднее в день</div><div class="v">${num(D.tot / 7)}</div><div class="s">${D.prev ? `в прошлую: ${num(D.prev / 7)}` : ""}</div></div>
        <div class="hub-kpi" style="--k:#ffd166"><div class="l">Активных участников</div><div class="v">${D.active}</div><div class="s">${D.list[0] ? `лидер: <span class="pname" data-open-profile="${esc(D.list[0].pk)}">${esc(NAMES[D.list[0].pk])}</span> (${num(D.list[0].m)})` : ""}</div></div>
      </div>
      <div class="hub-feed" style="margin-top:12px">
        <div class="hub-card"><h3><span>По дням</span></h3><div style="display:flex;gap:4px">${bars}</div></div>
        <div class="hub-card"><h3><span>Топ недели</span></h3>${top}</div>
        <div class="hub-card"><h3><span>Коротко</span></h3>${facts}</div>
        <div class="hub-card"><h3><span>Что произошло</span></h3>${evs || `<div class="hub-empty">Новых рекордов и достижений нет</div>`}${bds}</div>
      </div>`;
  }

  /* картинка 1080×1620 */
  function drawDigest(ctx, D){
    const W = 1080, H = 1620, acc = "#7aa2f7";
    const bg = ctx.createLinearGradient(0, 0, W * .5, H); bg.addColorStop(0, "#14161d"); bg.addColorStop(1, "#0b0c10"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * .9, 80, 10, W * .9, 80, 800); rg.addColorStop(0, acc + "55"); rg.addColorStop(1, "transparent"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    const T = (t, x, y, size, color, weight = 700, align = "left", maxW = W - 120) => { ctx.textAlign = align; ctx.fillStyle = color; yvFit(ctx, t, weight, size, maxW); ctx.fillText(t, x, y); };
    T("ИТОГИ НЕДЕЛИ", 60, 110, 38, acc, 800);
    T(`${dm(D.from)} – ${dmy(D.end)}`, 60, 175, 56, "#fff", 800);
    T(num(D.tot), 60, 330, 150, "#fff", 900, "left", 640);
    T(wordForm(D.tot, ["сообщение", "сообщения", "сообщений"]), 60, 385, 38, "rgba(255,255,255,.7)", 500);
    if (D.prev) { const up = D.tot >= D.prev; T(`${up ? "▲" : "▼"} ${Math.abs((D.tot - D.prev) / D.prev * 100).toFixed(1)}%`, W - 60, 300, 64, up ? "#76F0B6" : "#f7768e", 800, "right", 340); T("к прошлой неделе", W - 60, 345, 30, "rgba(255,255,255,.6)", 500, "right", 340); }
    // по дням
    const mx = Math.max(1, ...D.days.map(x => x.m)), bx = 60, bw = (W - 120) / 7, B = 640, Tp = 460;
    D.days.forEach((x, i) => {
      const h = Math.max(6, (B - Tp) * x.m / mx), cx = bx + i * bw;
      ctx.fillStyle = x === D.busy ? acc : "rgba(255,255,255,.22)"; rrect(ctx, cx + 14, B - h, bw - 28, h, 10); ctx.fill();
      T(WS[wdOf(x.d)], cx + bw / 2, B + 38, 28, "rgba(255,255,255,.7)", 600, "center", bw);
      T(num(x.m), cx + bw / 2, B - h - 12, 26, x === D.busy ? "#fff" : "rgba(255,255,255,.7)", 700, "center", bw);
    });
    // топ-5
    T("Топ недели", 60, 760, 44, "#fff", 800);
    const tmx = Math.max(1, D.list[0]?.m || 1);
    D.list.slice(0, 5).forEach((u, i) => {
      const y = 800 + i * 98;
      T(`${i + 1}. ${NAMES[u.pk]}`, 60, y + 38, 36, "#fff", 700, "left", 700); T(num(u.m), W - 60, y + 38, 36, "#fff", 800, "right", 260);
      ctx.fillStyle = "rgba(255,255,255,.1)"; rrect(ctx, 60, y + 52, W - 120, 18, 9); ctx.fill();
      ctx.fillStyle = softCanvas(ctx, getStyle("u", u.pk).c[0], 60, 60 + Math.max(18, (W - 120) * u.m / tmx)); rrect(ctx, 60, y + 52, Math.max(18, (W - 120) * u.m / tmx), 18, 9); ctx.fill();
    });
    // факты
    let y = 1340; const lines = [];
    lines.push(`Активных: ${D.active} · стикеров ${num(D.st)} · голосовых ${num(D.vo)} · кружков ${num(D.vi)}`);
    if (D.busy.m) lines.push(`Самый активный день: ${WS[wdOf(D.busy.d)]}, ${dm(D.busy.d)} — ${num(D.busy.m)}`);
    if (D.riser && D.riser.m > D.riser.p) lines.push(`Прорыв недели: ${NAMES[D.riser.pk]} (+${num(D.riser.m - D.riser.p)})`);
    D.events.slice(0, 2).forEach(e => lines.push(`${e.ic} ${e.name ? e.name + ": " : ""}${e.text}`));
    lines.slice(0, 5).forEach(t => { T(t, 60, y, 31, "rgba(255,255,255,.82)", 500, "left", W - 120); y += 50; });
    T("Colony Stats", W - 60, H - 40, 28, "rgba(255,255,255,.35)", 600, "right");
  }
  async function digestCanvas(D){
    if (document.fonts?.ready) await document.fonts.ready;
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1620; drawDigest(c.getContext("2d"), D); return c;
  }

  window.hubDigest = function(el){
    if (!el) return;
    if (!allRows) { el.innerHTML = ""; return; }
    const M = model(); if (!M.latest) { el.innerHTML = ""; return; }
    const opts = weekOptions(M.latest); if (!opts.some(o => o[0] === DG_END)) DG_END = "last";
    const D = digest(DG_END);
    el.innerHTML = `<div class="hub-sec"><h2>Недельный дайджест</h2><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="dg-week" aria-label="Неделя">${opts.map(([v, l]) => `<option value="${v}"${v === DG_END ? " selected" : ""}>${esc(l)}</option>`).join("")}</select><button class="mini" id="dg-png" type="button">⬇ Скачать PNG</button><button class="mini" id="dg-copy" type="button">Копировать</button><span class="hint" id="dg-msg" role="status"></span></div></div>${digestHtml(D)}`;
  };
  document.addEventListener("change", e => { if (e.target.id === "dg-week") { DG_END = e.target.value; window.hubDigest($c("hub-digest")); } });
  document.addEventListener("click", async e => {
    const id = e.target.id; if (id !== "dg-png" && id !== "dg-copy") return;
    const msg = $c("dg-msg"), D = digest(DG_END); if (!D) return;
    try {
      const c = await digestCanvas(D), blob = await new Promise(r => c.toBlob(r, "image/png"));
      if (id === "dg-png") { downloadBlob(blob, `digest_${D.end}.png`); msg.textContent = "PNG сохранён"; }
      else { await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]); msg.textContent = "Скопировано"; }
    } catch (err) { msg.textContent = "Не удалось: " + (err.message || err); }
  });
  window.__chron = {model, chronicle, digest, drawDigest, weekOptions};
})();
