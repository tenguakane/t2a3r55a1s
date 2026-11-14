
/* ===================== План на месяц: сколько нужно в день, успеваем ли ===================== */
(function(){
  const host = document.getElementById("plan-card"), tab = document.getElementById("tab-forecast"); if (!host || !tab) return;
  const KEY = "chatstats.plan.v1"; let PL = {}; try { PL = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(PL)); } catch (e) {} };
  const T = window.__tx, nf = v => Math.round(v).toLocaleString("ru-RU"), esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const MN = {msgs:T("Сообщения"), stick:T("Стикеры"), voice:T("Голосовые"), video:T("Видеосообщения")}, MG = {msgs:T("сообщений"), stick:T("стикеров"), voice:T("голосовых"), video:T("видеосообщений")};
  const MONTHS = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"].map(m => T(m));
  const pad = n => String(n).padStart(2, "0"), todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const shiftM = (ym, k) => { let y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return `${y}-${pad(m + 1)}`; };
  let ym = todayIso().slice(0, 7), titles = null, ALL = null, cache = new Map(), draft = {metric:"msgs", chat:""}, gen = 0;
  const dayMap = (chat, metric) => {
    const key = chat + "|" + metric; if (cache.has(key)) return cache.get(key);
    const m = new Map(); for (const x of pick(ALL, chat)) { if (typeof isExcludedUser === "function" && isExcludedUser(x[F.userId])) continue; const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10) continue; m.set(d, (m.get(d) || 0) + (Number(g(x, metric)) || 0)); }
    cache.set(key, m); return m;
  };
  const mtCache = new Map();
  function monthTotals(map, key){ if (mtCache.has(key)) return mtCache.get(key); const m = new Map(); map.forEach((v, d) => { const k = d.slice(0, 7); m.set(k, (m.get(k) || 0) + v); }); mtCache.set(key, m); return m; }
  const MONTHS_GEN = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const monthTotal = (map, k) => { let s = 0; const dim = new Date(+k.slice(0, 4), +k.slice(5, 7), 0).getDate(); for (let d = 1; d <= dim; d++) s += map.get(`${k}-${pad(d)}`) || 0; return s; };
  async function ensure(){
    if (ALL) return; ALL = await getHistory(); const hasT = ALL.some(x => Number(x[F.chatPk]) === 0);
    titles = [...new Set((hasT ? ALL.filter(x => Number(x[F.chatPk]) !== 0) : ALL).map(x => x[F.chat]).filter(Boolean))].sort((a, c) => a.localeCompare(c, "ru"));
  }
  async function render(){
    const my = ++gen;
    try { await ensure(); } catch (err) { host.innerHTML = '<p class="plan-hint">' + T("Не удалось загрузить данные для плана.") + '</p>'; return; }
    if (my !== gen) return;
    const plan = PL[ym], metric = plan ? plan.metric : draft.metric, chat = plan ? plan.chat || "" : draft.chat, map = dayMap(chat, metric);
    const today = todayIso(), cur = today.slice(0, 7), isCur = ym === cur, isPast = ym < cur, dim = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
    const day = isCur ? +today.slice(8) : isPast ? dim + 1 : 0, v = d => map.get(`${ym}-${pad(d)}`) || 0;
    let sumY = 0; for (let d = 1; d < Math.min(day, dim + 1); d++) sumY += v(d);
    const tv = isCur ? v(day) : 0, total = isPast ? sumY : sumY + tv;
    let p14 = 0; { const base = new Date(); base.setHours(12); for (let i = 1; i <= 14; i++) { const d = new Date(base.getTime() - i * 864e5); p14 += map.get(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) || 0; } p14 /= 14; }
    const left = isCur ? dim - day + 1 : isPast ? 0 : dim, prev = monthTotal(map, shiftM(ym, -1));
    const MT = monthTotals(map, chat + "|" + metric), mnum = ym.slice(5, 7), mname = MONTHS[+mnum - 1], others = [...MT].filter(([k, t]) => k !== ym && t > 0);
    const same = others.filter(([k]) => k.slice(5, 7) === mnum).sort((a, b) => b[1] - a[1]), ever = others.slice().sort((a, b) => b[1] - a[1]);
    const rankOf = (val, list) => 1 + list.filter(([, t]) => t > val).length;
    const opts = Object.entries(MN).map(([k, t]) => `<option value="${k}"${k === metric ? " selected" : ""}>${t}</option>`).join("");
    const copts = `<option value="">${T("Все чаты")}</option>` + titles.map(t => `<option value="${esc(t)}"${t === chat ? " selected" : ""}>${esc(t)}</option>`).join("");
    let h = `<div class="plan-head"><h3>${T("План на месяц")}</h3><span class="plan-month"><button type="button" class="mini" data-pm="-1" aria-label="${T("Предыдущий месяц")}">‹</button>${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}<button type="button" class="mini" data-pm="1" aria-label="${T("Следующий месяц")}">›</button></span><select data-pf="metric">${opts}</select><select data-pf="chat">${copts}</select></div>
      <div class="plan-set"><input type="text" inputmode="numeric" data-pg placeholder="${T("Цель на месяц")}" value="${plan ? nf(plan.goal) : ""}"><button type="button" class="mini" data-psave>${plan ? T("Обновить план") : T("Поставить план")}</button>`;
    if (prev > 0) h += [[1, T("как в прошлом месяце")], [1.1, "+10%"], [1.25, "+25%"]].map(([k, l]) => `<button type="button" class="mini plan-chip" data-pq="${Math.round(prev * k)}" title="${T("Прошлый месяц: {1}", nf(prev))}">${l} · ${nf(prev * k)}</button>`).join("");
    if (same.length) h += `<button type="button" class="mini plan-chip plan-rec" data-pq="${Math.round(same[0][1]) + 1}" title="${T("Рекорд среди всех месяцев «{1}»: {2} — {3}. Цель на единицу выше.", mname, same[0][0].slice(0, 4), nf(same[0][1]))}">🏆 ${T("Лучший {1}", mname)} · ${nf(same[0][1] + 1)}</button>`;
    if (ever.length) h += `<button type="button" class="mini plan-chip plan-rec" data-pq="${Math.round(ever[0][1]) + 1}" title="${T("Лучший месяц за всё время: {1} {2} — {3}. Цель на единицу выше.", MONTHS[+ever[0][0].slice(5, 7) - 1], ever[0][0].slice(0, 4), nf(ever[0][1]))}">🏆 ${T("Лучший месяц за всё время")} · ${nf(ever[0][1] + 1)}</button>`;
    if (plan) h += `<button type="button" class="mini" data-pdel>${T("Убрать план")}</button>`;
    h += `</div>`;
    if (!plan) { h += `<p class="plan-hint">${T("Поставь цель на месяц — покажу, сколько нужно писать в день и успеваем ли мы.")}${prev > 0 ? " " + T("В прошлом месяце было {1} {2}.", nf(prev), MG[metric]) : ""}</p>`; host.innerHTML = h; bind(); return; }
    const goal = plan.goal, pct = total / goal * 100;
    const need = left > 0 ? Math.max(0, (isCur ? goal - sumY : goal)) / left : 0;
    const proj = isPast ? total : isCur ? sumY + Math.max(tv, p14) + p14 * (dim - day) : p14 * dim;
    const ideal = isCur ? goal * (day - 1) / dim : 0, ahead = sumY - ideal;
    let cls = "info", label = "", say = "";
    if (isPast) { cls = total >= goal ? "ok" : "bad"; label = total >= goal ? T("✅ План выполнен") : T("❌ План не выполнен"); say = total >= goal ? T("Набрано {1} из {2} — на {3} больше цели.", nf(total), nf(goal), nf(total - goal)) : T("Набрано {1} из {2} — не хватило {3}.", nf(total), nf(goal), nf(goal - total)); }
    else if (isCur) {
      if (total >= goal) { cls = "ok"; label = T("🎉 План выполнен"); say = T("Цель {1} уже достигнута, ещё и на {2} больше.", nf(goal), nf(total - goal)); }
      else if (proj >= goal) { cls = proj >= goal * 1.03 ? "ok" : "warn"; label = proj >= goal * 1.03 ? T("✅ Успеваем") : T("🟡 Успеваем, но впритык"); say = T("Нужно в среднем <b>{1}</b> {2} в день, сейчас пишем {3} — запас {4} в день. Итог при таком темпе ≈ {5}.", nf(need), MG[metric], nf(p14), nf(p14 - need), nf(proj)); }
      else { cls = proj >= goal * .93 ? "warn" : "bad"; label = proj >= goal * .93 ? T("🟠 Почти успеваем") : T("🔴 Не успеваем"); say = T("Нужно в среднем <b>{1}</b> {2} в день, а сейчас пишем {3} — не хватает {4} в день: нужно писать на {5}% больше. При таком темпе выйдет ≈ {6} из {7}.", nf(need), MG[metric], nf(p14), nf(need - p14), nf((need / (p14 || 1) - 1) * 100), nf(proj), nf(goal)); }
    } else { label = T("📅 Месяц ещё не начался"); say = T("Чтобы набрать {1}, нужно писать в среднем <b>{2}</b> {3} в день. Сейчас пишем {4} в день.", nf(goal), nf(need), MG[metric], nf(p14)); }
    let cmp = "";
    if (same.length) { const rg = rankOf(goal, same), rp = rankOf(proj, same), tot = same.length + 1, b0 = same[0], ordn = n => n === 1 ? T("рекорд") : T("{1}-е место", n);
      cmp = `<div class="plan-say plan-cmp">${T("Среди всех месяцев «{1}» ({2}): лучший — {3}, {4}.", mname, tot, b0[0].slice(0, 4), nf(b0[1]))} ${isPast ? T("Этот месяц с результатом {1} — {2}.", nf(total), ordn(rankOf(total, same))) : T("Цель {1} — это {2}; при текущем темпе (≈ {3}) выйдет {4}.", nf(goal), rg === 1 ? "<b>" + T("новый рекорд") + "</b>" : "<b>" + T("{1}-е место", rg) + "</b>", nf(proj), rp === 1 ? "<b>" + T("рекорд") + "</b>" : T("{1}-е место", rp))}</div>`; }
    h += `<div class="plan-pill ${cls}">${label}</div><div class="plan-say">${say}</div>${cmp}`;
    h += `<div class="plan-bar" title="${T("{1}% плана", pct.toFixed(1))}">${`<i style="width:${Math.min(100, pct).toFixed(1)}%"></i>`}${isCur ? `<u style="left:${Math.min(100, (day - 1) / dim * 100).toFixed(1)}%" title="${T("Где должны быть по графику")}"></u>` : ""}</div>`;
    h += `<div class="plan-grid"><div><small>${T("Цель")}</small><b>${nf(goal)}</b><em>${MN[metric].toLowerCase()}${chat ? ", " + esc(chat) : ""}</em></div>
      <div><small>${T("Набрано")}</small><b>${nf(total)}</b><em>${T("{1}% плана", pct.toFixed(0))}</em></div>
      <div><small>${T("Осталось")}</small><b>${nf(Math.max(0, goal - total))}</b><em>${left ? (T.ru ? left + " " + (left === 1 ? "день" : left < 5 ? "дня" : "дней") : T("{1} дн.", left)) + (isCur ? " " + T("(с сегодняшним)") : "") : "—"}</em></div>
      <div class="${left ? "hot" : ""}"><small>${T("Нужно в день")}</small><b>${left ? nf(need) : "—"}</b><em>${isCur && tv ? T("сегодня уже {1} ({2}%)", nf(tv), need ? Math.round(tv / need * 100) : 0) : "&nbsp;"}</em></div>
      <div><small>${T("Сейчас пишем в день")}</small><b>${nf(p14)}</b><em>${T("среднее за 14 дней")}</em></div>
      <div><small>${T("Прогноз итога")}</small><b>${nf(proj)}</b><em>${isCur ? (ahead >= 0 ? T("опережаем график на {1}", nf(Math.abs(ahead))) : T("отстаём от графика на {1}", nf(Math.abs(ahead)))) : "&nbsp;"}</em></div></div>`;
    // график
    const W = 900, X0 = 54, X1 = 890, mx = Math.max(goal, proj, total, 1) * 1.06, px = d => X0 + (d - 1) / Math.max(1, dim - 1) * (X1 - X0), py = y => 200 - y / mx * 176;
    let s = ""; for (let t = 0; t <= 4; t++) { const y = py(mx * t / 4); s += `<line x1="${X0}" x2="${X1}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${X0 - 6}" y="${y + 4}" text-anchor="end" class="plan-t">${nf(mx * t / 4)}</text>`; }
    s += `<line x1="${X0}" x2="${X1}" y1="${py(goal)}" y2="${py(goal)}" stroke="#ffd60a" stroke-dasharray="5 4" stroke-opacity=".8"/><text x="${X1}" y="${py(goal) - 5}" text-anchor="end" class="plan-t" fill="#ffd60a" style="fill:#ffd60a">${T("цель")}</text>`;
    s += `<polyline fill="none" stroke="#8e8e93" stroke-dasharray="3 4" stroke-width="1.6" points="${px(1)},${py(goal / dim)} ${px(dim)},${py(goal)}"/>`;
    const upTo = isPast ? dim : isCur ? day : 0; let c = 0, pts = []; for (let d = 1; d <= upTo; d++) { c += v(d); pts.push(`${px(d).toFixed(1)},${py(c).toFixed(1)}`); }
    if (pts.length) s += `<polyline fill="none" stroke="#5e8bff" stroke-width="2.6" stroke-linejoin="round" points="${pts.join(" ")}"/>`;
    if (!isPast) { const d0 = isCur ? day : 1, y0 = isCur ? c : 0; s += `<polyline fill="none" stroke="#ff9f0a" stroke-dasharray="6 4" stroke-width="2" points="${px(d0)},${py(y0)} ${px(dim)},${py(proj)}"/>`; }
    if (isCur) s += `<line x1="${px(day)}" x2="${px(day)}" y1="24" y2="200" stroke="var(--muted)" stroke-dasharray="2 3"/>`;
    for (let t = 0; t < 6; t++) { const d = Math.round(1 + t * (dim - 1) / 5); s += `<text x="${px(d)}" y="220" text-anchor="${t === 0 ? "start" : t === 5 ? "end" : "middle"}" class="plan-t">${d}</text>`; }
    h += `<svg class="plan-svg" viewBox="0 0 ${W} 230" data-no-zoom><title>${T("План и факт по дням месяца")}</title>${s}</svg><p class="plan-hint">${T("Синяя линия — набрано, серый пунктир — равномерный план, оранжевый — прогноз при текущем темпе, жёлтая — цель.")}</p>`;
    host.innerHTML = h; bind();
  }
  function bind(){
    const q = s => host.querySelector(s);
    host.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { ym = shiftM(ym, +b.dataset.pm); render(); });
    host.querySelectorAll("[data-pf]").forEach(s => s.onchange = () => { const k = s.dataset.pf; if (PL[ym]) { PL[ym][k] = s.value; save(); } else draft[k] = s.value; render(); });
    const inp = q("[data-pg]"), go = v => { const n = Number(String(v).replace(/[\s ,]/g, "")); if (!isFinite(n) || n <= 0) { inp.focus(); inp.style.outline = "2px solid #ff453a"; return; } PL[ym] = {goal:Math.round(n), metric:PL[ym] ? PL[ym].metric : draft.metric, chat:PL[ym] ? PL[ym].chat : draft.chat}; save(); render(); };
    if (inp) { inp.onkeydown = e => { if (e.key === "Enter") go(inp.value); e.stopPropagation(); }; q("[data-psave]").onclick = () => go(inp.value); }
    host.querySelectorAll("[data-pq]").forEach(b => b.onclick = () => go(b.dataset.pq));
    const del = q("[data-pdel]"); if (del) del.onclick = () => { delete PL[ym]; save(); render(); };
  }
  let started = false;
  const check = () => { if (tab.classList.contains("active") && !started) { started = true; render(); } };
  new MutationObserver(check).observe(tab, {attributes:true, attributeFilter:["class"]}); check();
  document.getElementById("refresh")?.addEventListener("click", () => { if (started) setTimeout(() => { ALL = null; cache.clear(); mtCache.clear(); render(); }, 700); });
})();
