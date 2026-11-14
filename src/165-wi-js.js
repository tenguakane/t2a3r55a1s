
/* ===================== Калькулятор «если бы» ===================== */
(function(){
  const host = document.getElementById("wi-card"), tab = document.getElementById("tab-forecast"); if (!host || !tab) return;
  const nf = v => Math.round(v).toLocaleString("ru-RU"), esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const T = window.__tx, MN = {msgs:T("Сообщения"), stick:T("Стикеры"), voice:T("Голосовые"), video:T("Видеосообщения")};
  const PER = {month:T("Этот месяц"), prev:T("Прошлый месяц"), "30":T("Последние 30 дней"), "90":T("Последние 90 дней"), "365":T("Последний год"), all:T("Всё время")};
  const pad = n => String(n).padStart(2, "0"), isoD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const S = {chat:"", metric:"msgs", period:"30", mods:[], ret:false, win:"90", skip:new Set()};
  let ALL = null, titles = [], gen = 0; const RC = new Map();
  const dayN = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
  function periodDays(){ const [lo, hi] = range(); if (S.period === "all") return 0; return dayN(lo, hi); }
  function recs(){
    const key = S.chat + "|" + S.metric; if (RC.has(key)) return RC.get(key);
    const m = new Map();
    for (const x of pick(ALL, S.chat)) { const id = String(x[F.userId] ?? x[F.name]); if (typeof isExcludedUser === "function" && isExcludedUser(x[F.userId])) continue;
      const d = String(x[F.date] ?? "").slice(0, 10), v = Number(g(x, S.metric)) || 0; if (d.length !== 10 || v <= 0) continue;
      let u = m.get(id); if (!u) m.set(id, u = {id, n:who(x), items:[]}); u.items.push([d, v]); }
    RC.set(key, m); return m;
  }
  // Вышедшие: по статусу из API, а если статусов нет — по отсутствию активности больше 60 дней.
  function leavers(){
    const pd = periodDays(); if (!pd) return [];
    const st = typeof userStatuses !== "undefined" && userStatuses.size > 0, lim = isoD(new Date(Date.now() - 60 * 864e5)), out = [];
    recs().forEach(u => {
      const last = u.items.reduce((a, b) => b[0] > a ? b[0] : a, ""), first = u.items.reduce((a, b) => b[0] < a ? b[0] : a, "9999");
      const gone = st ? (typeof isLeftUser === "function" && isLeftUser(u.id)) : last < lim; if (!gone) return;
      const span = S.win === "all" ? dayN(first, last) : Math.min(+S.win, dayN(first, last)), from = isoD(new Date(Date.parse(last) - (span - 1) * 864e5));
      const sum = u.items.reduce((a, [d, v]) => d >= from && d <= last ? a + v : a, 0), pace = sum / Math.max(1, span);
      out.push({id:u.id, n:u.n, last, pace, hyp:pace * pd});
    });
    return out.filter(u => u.hyp > 0).sort((a, b) => b.hyp - a.hyp);
  }
  function range(){
    const now = new Date(), t = isoD(now), y = now.getFullYear(), m = now.getMonth();
    if (S.period === "month") return [isoD(new Date(y, m, 1)), t];
    if (S.period === "prev") return [isoD(new Date(y, m - 1, 1)), isoD(new Date(y, m, 0))];
    if (S.period === "all") return ["0000-00-00", "9999-99-99"];
    return [isoD(new Date(now.getTime() - (+S.period - 1) * 864e5)), t];
  }
  function totals(){
    const [lo, hi] = range(), U = new Map();
    for (const x of pick(ALL, S.chat)) {
      const uid = String(x[F.userId] ?? x[F.name]); if (typeof isExcludedUser === "function" && isExcludedUser(x[F.userId])) continue;
      const d = String(x[F.date] ?? "").slice(0, 10); if (d < lo || d > hi) continue;
      let u = U.get(uid); if (!u) U.set(uid, u = {id:uid, n:who(x), v:0}); u.v += Number(g(x, S.metric)) || 0;
    }
    return [...U.values()].filter(u => u.v > 0);
  }
  const rank = list => { const r = new Map(); list.slice().sort((a, b) => b.v - a.v || a.n.localeCompare(b.n, "ru")).forEach((u, i) => r.set(u.id, i + 1)); return r; };
  async function render(){
    const my = ++gen;
    try { if (!ALL) { ALL = await getHistory(); const hasT = ALL.some(x => Number(x[F.chatPk]) === 0); titles = [...new Set((hasT ? ALL.filter(x => Number(x[F.chatPk]) !== 0) : ALL).map(x => x[F.chat]).filter(Boolean))].sort((a, c) => a.localeCompare(c, "ru")); } }
    catch (err) { host.innerHTML = '<p class="wi-hint">' + T("Не удалось загрузить данные.") + '</p>'; return; }
    if (S.ret && typeof ensureUserMetrics === "function") { try { await ensureUserMetrics(); } catch (err) {} }
    if (my !== gen) return;
    const base = totals(); if (!base.length) { host.innerHTML = '<div class="wi-head"><h3>' + T("Калькулятор «если бы»") + '</h3></div><p class="wi-hint">' + T("За этот период нет данных. Выбери другой период или чат.") + '</p>' + controls(); bind(); return; }
    const byName = base.slice().sort((a, b) => a.n.localeCompare(b.n, "ru"));
    if (!S.mods.length) S.mods.push({u:base.slice().sort((a, b) => b.v - a.v)[0].id, f:-100});
    S.mods.forEach(m => { if (!base.some(u => u.id === m.u)) { const free = base.find(u => !S.mods.some(q => q.u === u.id)); m.u = free ? free.id : base[0].id; } });
    const mods = new Map(S.mods.map(m => [m.u, m.f])), after = base.map(u => ({...u, v:u.v * (1 + (mods.has(u.id) ? mods.get(u.id) : 0) / 100)}));
    const LV = S.ret ? leavers() : [], picked = LV.filter(u => !S.skip.has(u.id)), retIds = new Set(picked.map(u => u.id));
    picked.forEach(u => { const i = after.findIndex(x => x.id === u.id); if (i >= 0) after[i] = {...after[i], v:u.hyp, ret:true}; else after.push({id:u.id, n:u.n, v:u.hyp, ret:true}); });
    const r0 = rank(base), r1 = rank(after), tot0 = base.reduce((s, u) => s + u.v, 0), tot1 = after.reduce((s, u) => s + u.v, 0);
    const lead = l => l.slice().sort((a, b) => b.v - a.v || a.n.localeCompare(b.n, "ru"))[0];
    const l0 = lead(base), l1 = lead(after), pct = tot0 ? (tot1 / tot0 - 1) * 100 : 0;
    let h = `<div class="wi-head"><h3>${T("Калькулятор «если бы»")}</h3></div><p class="wi-hint">${T("Измени активность участников за выбранный период и посмотри, как поменяются места, лидер и общий итог. Ничего не сохраняется в данных.")}</p>` + controls();
    h += `<div class="wi-mods">` + S.mods.map((m, i) => `<div class="wi-mod"><select data-wu="${i}">${byName.map(u => `<option value="${esc(u.id)}"${u.id === m.u ? " selected" : ""}>${esc(u.n)}</option>`).join("")}</select>
      <input type="range" min="-100" max="300" step="5" value="${m.f}" data-wf="${i}"><b data-wv="${i}">${m.f <= -100 ? T("не было") : (m.f > 0 ? "+" : "") + m.f + "%"}</b>
      <span class="wi-chips"><button type="button" class="mini" data-wq="${i}:-100">${T("Без него")}</button><button type="button" class="mini" data-wq="${i}:-50">−50%</button><button type="button" class="mini" data-wq="${i}:50">+50%</button><button type="button" class="mini" data-wq="${i}:100">×2</button></span>
      ${S.mods.length > 1 ? `<button type="button" class="mini" data-wx="${i}" aria-label="${T("Убрать участника")}">×</button>` : ""}</div>`).join("") + `</div>`;
    if (S.mods.length < 4) h += `<button type="button" class="mini" data-wadd>${T("+ Ещё участник")}</button>`;
    h += `<div class="wi-ret"><label class="checkline"><input type="checkbox" data-wret${S.ret ? " checked" : ""}> ${T("Вернуть вышедших участников")}</label>`;
    if (S.ret) {
      h += S.period === "all" ? `<p class="wi-hint">${T("Для периода «Всё время» вышедшие уже учтены в таблице — выбери конкретный период.")}</p>` : `<span class="wi-note">${T("Темп до выхода:")} <select data-wwin>${[["30", T("последние 30 дней")], ["90", T("последние 90 дней")], ["180", T("последние 180 дней")], ["all", T("всё время в чате")]].map(([k, t]) => `<option value="${k}"${k === S.win ? " selected" : ""}>${t}</option>`).join("")}</select></span>`;
      if (S.period !== "all") h += LV.length ? `<div class="wi-chips wi-lv">${LV.slice(0, 24).map(u => `<button type="button" class="mini${S.skip.has(u.id) ? "" : " on"}" data-wlv="${esc(u.id)}" title="${T("Вышел(ла) {1}, темп {2} в день", u.last.split("-").reverse().join("."), nf(u.pace))}">${esc(u.n)} · ${nf(u.hyp)}</button>`).join("")}</div>` : `<p class="wi-hint">${T("Вышедших участников с активностью не нашлось (по статусам из API или, если их нет, по отсутствию активности больше 60 дней).")}</p>`;
    }
    h += `</div>`;
    const sayRet = picked.map(u => `<div>${T("<b>{1}</b> (вышел(ла) {2}, темп {3} в день): за этот период набрал(а) бы ≈ {4} — {5}-е место из {6}", esc(u.n), u.last.split("-").reverse().join("."), nf(u.pace), nf(u.hyp), r1.get(u.id), after.length)}</div>`).join("");
    const say = S.mods.map(m => { const u = base.find(x => x.id === m.u); if (!u) return ""; const a = r0.get(u.id), b = r1.get(u.id), v1 = u.v * (1 + m.f / 100); return `<div><b>${esc(u.n)}</b>: ${m.f <= -100 ? T("если бы не писал(а) вообще") : `${m.f > 0 ? "+" : ""}${m.f}%`} — ${nf(u.v)} → ${nf(v1)}, ${m.f <= -100 ? T("место пропало") : a === b ? T("место то же ({1}-е)", a) : T("{1}-е → {2}-е место", a, b)}</div>`; }).join("");
    h += `<div class="wi-sum"><div class="big">${l0.id === l1.id ? T("Лидер не меняется: {1}", esc(l0.n)) : T("Лидер меняется: {1} → {2}", esc(l0.n), esc(l1.n))}</div><div>${T("{1} в сумме: {2} → <b>{3}</b> ({4})", MN[S.metric], nf(tot0), nf(tot1), (pct >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "%")}</div>${say}${sayRet}</div>`;
    const order = after.slice().sort((a, b) => r1.get(a.id) - r1.get(b.id)), shown = order.filter(u => r1.get(u.id) <= 15 || mods.has(u.id) || retIds.has(u.id));
    h += `<div class="wi-grid"><div class="wi-r h"><span>${T("Место")}</span><span>${T("Участник")}</span><span>${T("Было")}</span><span>${T("Стало")}</span><span>${T("Разница")}</span><span>${T("Места")}</span></div>`;
    shown.forEach(u => { const bu = base.find(x => x.id === u.id), isRet = retIds.has(u.id), b0 = bu ? bu.v : 0, a = r0.get(u.id), b = r1.get(u.id), dm = a === undefined ? 0 : a - b, gone = mods.get(u.id) <= -100;
      h += `<div class="wi-r${mods.has(u.id) || isRet ? " mod" : ""}"><span>${gone ? "—" : b}</span><span title="${esc(u.n)}">${esc(u.n)}${isRet ? " ↩" : ""}</span><span>${nf(b0)}</span><span>${nf(u.v)}</span><span class="${u.v === b0 ? "wi-eq" : u.v > b0 ? "wi-up" : "wi-dn"}">${u.v === b0 ? "—" : (u.v > b0 ? "+" : "−") + nf(Math.abs(u.v - b0))}</span><span class="${dm > 0 ? "wi-up" : dm < 0 ? "wi-dn" : "wi-eq"}">${gone ? "—" : a === undefined ? T("новый") : dm > 0 ? "▲ " + dm : dm < 0 ? "▼ " + Math.abs(dm) : "="}</span></div>`; });
    h += `</div>`; host.innerHTML = h; bind();
  }
  function controls(){
    return `<div class="wi-head" style="margin-top:6px"><select data-wp>${Object.entries(PER).map(([k, t]) => `<option value="${k}"${k === S.period ? " selected" : ""}>${t}</option>`).join("")}</select>
      <select data-wm>${Object.entries(MN).map(([k, t]) => `<option value="${k}"${k === S.metric ? " selected" : ""}>${t}</option>`).join("")}</select>
      <select data-wc><option value="">${T("Все чаты")}</option>${titles.map(t => `<option value="${esc(t)}"${t === S.chat ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`;
  }
  function bind(){
    const q = (s, f) => host.querySelectorAll(s).forEach(f);
    q("[data-wp]", s => s.onchange = () => { S.period = s.value; render(); });
    q("[data-wm]", s => s.onchange = () => { S.metric = s.value; render(); });
    q("[data-wc]", s => s.onchange = () => { S.chat = s.value; S.mods = []; S.skip.clear(); render(); });
    q("[data-wu]", s => s.onchange = () => { S.mods[+s.dataset.wu].u = s.value; render(); });
    q("[data-wf]", s => s.oninput = () => { const i = +s.dataset.wf; S.mods[i].f = +s.value; clearTimeout(bind.t); bind.t = setTimeout(render, 60); const l = host.querySelector(`[data-wv="${i}"]`); if (l) l.textContent = S.mods[i].f <= -100 ? T("не было") : (S.mods[i].f > 0 ? "+" : "") + S.mods[i].f + "%"; });
    q("[data-wq]", b => b.onclick = () => { const [i, f] = b.dataset.wq.split(":").map(Number); S.mods[i].f = f; render(); });
    q("[data-wx]", b => b.onclick = () => { S.mods.splice(+b.dataset.wx, 1); render(); });
    q("[data-wret]", c => c.onchange = () => { S.ret = c.checked; render(); });
    q("[data-wwin]", c => c.onchange = () => { S.win = c.value; render(); });
    q("[data-wlv]", b => b.onclick = () => { const id = b.dataset.wlv; if (S.skip.has(id)) S.skip.delete(id); else S.skip.add(id); render(); });
    q("[data-wadd]", b => b.onclick = () => { S.mods.push({u:"", f:-100}); render(); });
  }
  let started = false;
  const check = () => { if (tab.classList.contains("active") && !started) { started = true; render(); } };
  new MutationObserver(check).observe(tab, {attributes:true, attributeFilter:["class"]}); check();
  document.getElementById("refresh")?.addEventListener("click", () => { if (started) setTimeout(() => { ALL = null; RC.clear(); render(); }, 700); });
})();
