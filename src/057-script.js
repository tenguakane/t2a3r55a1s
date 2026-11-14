
/* ===================== Видео-итоги участника (1080×1920) ===================== */
(function(){
  const $v = id => document.getElementById(id);
  const WD = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"], WD_S = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const cleanDay = d => !vkDay(d);
  const periodOf = v => v === "all" ? {from:"0000-01-01", to:"9999-12-31", label:"за всё время", year:null} : {from:v + "-01-01", to:v + "-12-31", label:v, year:v};

  function perUser(){
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows, m = new Map();
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      const k = String(x[F.userId] ?? x[F.name]); let u = m.get(k); if (!u) m.set(k, u = new Map());
      let r = u.get(d); if (!r) u.set(d, r = {m:0, s:0, v:0, o:0});
      r.m += Number(g(x, "msgs")) || 0; r.s += Number(g(x, "stick")) || 0; r.v += Number(g(x, "voice")) || 0; r.o += Number(g(x, "video")) || 0;
    });
    return m;
  }
  function stats(pk, per){
    pk = String(pk); const all = perUser(), me = all.get(pk); if (!me) return null;
    const inP = d => d >= per.from && d <= per.to;
    const T = {m:0, s:0, v:0, o:0}, days = new Map(), months = new Array(12).fill(0), years = new Map(), wd = new Array(7).fill(0);
    me.forEach((r, d) => {
      if (!inP(d)) return;
      T.m += r.m; T.s += r.s; T.v += r.v; T.o += r.o;
      years.set(d.slice(0, 4), (years.get(d.slice(0, 4)) || 0) + r.m);
      months[+d.slice(5, 7) - 1] += r.m;
      if (cleanDay(d) && r.m > 0) { days.set(d, r.m); const a = d.split("-").map(Number); wd[(new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay() + 6) % 7] += r.m; }
    });
    if (!T.m) return null;
    // лучший день и серия
    let best = null; days.forEach((v, d) => { if (!best || v > best.v) best = {d, v}; });
    const act = [...days.keys()].sort(); let run = 0, prev = null, start = null, longest = {n:0, a:"", b:""};
    act.forEach(d => { if (prev && dayIdx(d) - dayIdx(prev) === 1) run++; else { run = 1; start = d; } if (run > longest.n) longest = {n:run, a:start, b:d}; prev = d; });
    // место среди участников, победы по дням
    const totals = [], dayMax = new Map();
    all.forEach((u, k) => { if (!NAMES[k] || !isVisibleUser(k)) return; let t = 0; u.forEach((r, d) => { if (inP(d)) { t += r.m; if (cleanDay(d) && r.m > (dayMax.get(d) || 0)) dayMax.set(d, r.m); } }); if (t > 0) totals.push({pk:k, name:NAMES[k], v:t}); });
    totals.sort((a, b) => b.v - a.v);
    const place = totals.findIndex(x => x.pk === pk) + 1, sum = totals.reduce((a, x) => a + x.v, 0), avg = totals.length ? sum / totals.length : 0;
    let wins = 0; days.forEach((v, d) => { if (v >= (dayMax.get(d) || Infinity)) wins++; });
    const sel = SELFIE.filter(r => r.pk === pk && inP(r.date)).reduce((a, r) => a + r.count, 0);
    const joined = MEMBERSHIP_STARTS.find(([, id]) => String(id) === pk)?.[0], first = [...me.keys()].sort()[0], since = joined && /^\d{4}-\d{2}-\d{2}$/.test(joined) ? joined : first;
    // достижения
    let ach = null;
    try {
      const A = window.__achApi, full = A.full(pk), rk = A.rank(full.score);
      const gained = per.year ? A.recent(per.from).filter(e => e.pk === pk && e.date <= per.to) : [];
      const top = full.items.filter(x => x.level > 0).sort((a, b) => b.level / (b.a.norm || 10) - a.level / (a.a.norm || 10) || b.level - a.level);
      ach = {score:full.score, rank:rk, gained, top, got:full.got};
    } catch (e) {}
    return {pk, name:NAMES[pk] || pk, per, T, activeDays:days.size, months, years:[...years.entries()].sort(), wd, best, longest, place, count:totals.length, share:sum ? T.m / sum * 100 : 0, avg, totals, wins, sel, since, ach};
  }

  function slides(S){
    const a = [{k:"intro"}, {k:"totals"}];
    if (S.place) a.push({k:"place"});
    if (S.per.year ? S.months.some(v => v > 0) : S.years.length > 1) a.push({k:"chart"});
    if (S.best) a.push({k:"day"});
    if (S.longest.n >= 2) a.push({k:"streak"});
    if (S.wd.some(v => v > 0)) a.push({k:"weekday"});
    a.push({k:"facts"});
    if (S.ach && (S.ach.gained.length || S.ach.top.length)) a.push({k:"ach"});
    a.push({k:"outro"});
    return a;
  }

  const TIERC = {bronze:"#e3a36b", silver:"#c0c6d4", gold:"#ffd166", diamond:"#67e8f9", none:"#4a5060"};
  function draw(ctx, S, sl, f, fps, av){
    const W = 1080, H = 1920, per = Math.round(fps * 3.6), idx = Math.min(sl.length - 1, Math.floor(f / per)), lf = f - idx * per, t = lf / per, cur = sl[idx];
    const acc = getStyle("u", S.pk).c[0];
    const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3), grow = ease(lf / (fps * 1.4));
    const g2 = ctx.createLinearGradient(0, 0, W * .4, H); g2.addColorStop(0, "#14161d"); g2.addColorStop(1, "#0b0c10"); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = .24; const rg = ctx.createRadialGradient(W * .85, H * .12, 20, W * .85, H * .12, 900); rg.addColorStop(0, acc); rg.addColorStop(1, "transparent"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    const rg2 = ctx.createRadialGradient(W * .1, H * .92, 20, W * .1, H * .92, 800); rg2.addColorStop(0, acc); rg2.addColorStop(1, "transparent"); ctx.globalAlpha = .12; ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = (W - 80 - (sl.length - 1) * 10) / sl.length;
    sl.forEach((_, i) => { ctx.fillStyle = "rgba(255,255,255,.18)"; rrect(ctx, 40 + i * (pw + 10), 40, pw, 8, 4); ctx.fill(); const q = i < idx ? 1 : i > idx ? 0 : t; if (q) { ctx.fillStyle = "#fff"; rrect(ctx, 40 + i * (pw + 10), 40, pw * q, 8, 4); ctx.fill(); } });
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `600 34px ${YV_FONT}`; ctx.fillText(`${S.name} · ${S.per.label}`, 60, 120);
    const inK = ease(lf / (fps * .45)), outK = idx < sl.length - 1 ? Math.max(0, (lf - (per - fps * .35)) / (fps * .35)) : 0;
    ctx.save(); ctx.globalAlpha = inK * (1 - outK); ctx.translate(0, (1 - inK) * 80 - outK * 60);
    const big = (txt, y, size, color = "#fff", weight = 800, align = "center") => { ctx.textAlign = align; ctx.fillStyle = color; yvFit(ctx, txt, weight, size, W - 120); ctx.fillText(txt, align === "center" ? W / 2 : 60, y); };
    const cnt = v => fmt(Math.round(v * grow));
    const w = (n, forms) => wordForm(n, forms);
    if (cur.k === "intro") {
      const cx = W / 2, cy = 560, r = 190;
      ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.fillStyle = acc + "55"; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = acc; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      if (av) { const k = Math.max(r * 2 / av.width, r * 2 / av.height); ctx.drawImage(av, cx - av.width * k / 2, cy - av.height * k / 2, av.width * k, av.height * k); }
      else { ctx.fillStyle = "#0b0c10"; ctx.font = `900 220px ${YV_FONT}`; ctx.textAlign = "center"; ctx.fillText(S.name.slice(0, 1).toUpperCase(), cx, cy + 76); }
      ctx.restore();
      big("ИТОГИ УЧАСТНИКА", 880, 56, acc, 800);
      big(S.name, 1030, 130, "#fff", 900);
      big(S.per.year ? `${S.per.year} год` : "за всё время", 1110, 52, "rgba(255,255,255,.75)", 600);
      if (S.ach) big(`${S.ach.rank[2]} ${S.ach.rank[1]}`, 1230, 56, "#ffd166", 700);
      big(cnt(S.T.m), 1520, 150, "#fff", 900);
      big(w(S.T.m, ["сообщение", "сообщения", "сообщений"]), 1600, 48, "rgba(255,255,255,.7)", 500);
    } else if (cur.k === "totals") {
      big("В цифрах", 330, 80);
      const items = [["Сообщения", S.T.m, "#7aa2f7"], ["Стикеры", S.T.s, "#bb9af7"], ["Голосовые", S.T.v, "#e0af68"], ["Видеосообщения", S.T.o, "#f7768e"], ["Активных дней", S.activeDays, "#9ece6a"]];
      items.forEach(([l, v, c2], i) => {
        const y = 470 + i * 220, k = ease((lf - i * 4) / (fps * .5));
        ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - k) * 60, 0);
        ctx.fillStyle = "rgba(255,255,255,.06)"; rrect(ctx, 60, y, W - 120, 180, 28); ctx.fill(); ctx.fillStyle = c2; rrect(ctx, 60, y, 14, 180, 7); ctx.fill();
        ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 40px ${YV_FONT}`; ctx.fillText(l, 110, y + 70); ctx.fillStyle = "#fff"; ctx.font = `900 76px ${YV_FONT}`; ctx.fillText(cnt(v), 110, y + 150); ctx.restore();
      });
    } else if (cur.k === "place") {
      big("Место в чате", 330, 80);
      big(`${S.place}`, 760, 330, acc, 900);
      big(`из ${S.count} ${w(S.count, ["участника", "участников", "участников"])}`, 860, 56, "rgba(255,255,255,.8)", 600);
      big(`${S.share >= 10 ? Math.round(S.share) : fmtR(S.share)}% всех сообщений`, 960, 56, "#fff", 700);
      const rows = S.totals.slice(0, 3); if (S.place > 3) rows.push(S.totals[S.place - 1]);
      const mx = Math.max(1, S.totals[0].v);
      rows.forEach((u, i) => {
        const y = 1080 + i * 180, k = ease((lf - i * 5) / (fps * 1.1)), me = u.pk === S.pk, c2 = me ? acc : "rgba(255,255,255,.35)", rank = S.totals.indexOf(u) + 1;
        ctx.textAlign = "left"; ctx.fillStyle = me ? "#fff" : "rgba(255,255,255,.55)"; ctx.font = `800 40px ${YV_FONT}`; ctx.fillText(`${rank}. ${u.name}`, 70, y + 40);
        ctx.textAlign = "right"; ctx.fillText(fmt(Math.round(u.v * k)), W - 70, y + 40);
        ctx.fillStyle = "rgba(255,255,255,.08)"; rrect(ctx, 70, y + 62, W - 140, 38, 19); ctx.fill(); ctx.fillStyle = c2; rrect(ctx, 70, y + 62, Math.max(38, (W - 140) * u.v / mx * k), 38, 19); ctx.fill();
      });
    } else if (cur.k === "chart") {
      const data = S.per.year ? S.months.map((v, i) => [MONTHS_SHORT_RU[i], v]) : S.years.map(([y, v]) => [y.slice(2) === y ? y : "’" + y.slice(2), v]);
      let bi = 0; data.forEach((d, i) => { if (d[1] > data[bi][1]) bi = i; });
      big(S.per.year ? "По месяцам" : "По годам", 330, 80);
      big(S.per.year ? `Лучший месяц — ${MONTHS[bi].toLowerCase()}` : `Лучший год — 20${data[bi][0].slice(1)}`, 420, 46, acc, 700);
      const mx = Math.max(1, ...data.map(d => d[1])), L = 80, R = W - 60, B = 1560, Tp = 560, bw = (R - L) / data.length, gap = Math.min(16, bw * .25);
      data.forEach((d, i) => {
        const k = ease((lf - i * 2) / (fps * 1.1)), h = (B - Tp) * d[1] / mx * k, x = L + i * bw + gap / 2;
        ctx.fillStyle = i === bi ? acc : "rgba(255,255,255,.28)"; rrect(ctx, x, B - h, bw - gap, Math.max(2, h), Math.min(12, (bw - gap) / 2)); ctx.fill();
        ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `600 ${data.length > 8 ? 28 : 34}px ${YV_FONT}`; ctx.fillText(d[0], x + (bw - gap) / 2, B + 50);
        if (i === bi && d[1]) { ctx.fillStyle = "#fff"; ctx.font = `800 36px ${YV_FONT}`; ctx.fillText(fmt(Math.round(d[1] * k)), x + (bw - gap) / 2, B - h - 20); }
      });
    } else if (cur.k === "day") {
      big("Самый активный день", 560, 70);
      big(`${yrDayRu(S.best.d)}${S.per.year ? "" : " " + S.best.d.slice(0, 4)}`, 900, 140, acc, 900);
      big(cnt(S.best.v), 1180, 190, "#fff", 900);
      big("сообщений за один день", 1270, 48, "rgba(255,255,255,.7)", 500);
      const avg = S.activeDays ? S.T.m / S.activeDays : 0; if (avg) big(`в ${fmtR(S.best.v / avg)} раза больше обычного дня`, 1400, 40, "rgba(255,255,255,.55)", 500);
    } else if (cur.k === "streak") {
      big("Самая длинная серия", 560, 70);
      big(cnt(S.longest.n), 960, 330, acc, 900);
      big(`${w(S.longest.n, ["день", "дня", "дней"])} подряд`, 1060, 64, "#fff", 700);
      big(`${yrDayRu(S.longest.a)} — ${yrDayRu(S.longest.b)}${S.per.year ? "" : " " + S.longest.b.slice(0, 4)}`, 1170, 44, "rgba(255,255,255,.65)", 500);
    } else if (cur.k === "weekday") {
      let bi = 0; S.wd.forEach((v, i) => { if (v > S.wd[bi]) bi = i; });
      big("Любимый день недели", 330, 76);
      big(WD[bi], 460, 90, acc, 900);
      const mx = Math.max(1, ...S.wd), L = 90, R = W - 60, B = 1500, Tp = 620, bw = (R - L) / 7;
      S.wd.forEach((v, i) => {
        const k = ease((lf - i * 3) / (fps * 1.1)), h = (B - Tp) * v / mx * k, x = L + i * bw + 8;
        ctx.fillStyle = i === bi ? acc : "rgba(255,255,255,.28)"; rrect(ctx, x, B - h, bw - 16, Math.max(2, h), 14); ctx.fill();
        ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = `700 36px ${YV_FONT}`; ctx.fillText(WD_S[i], x + (bw - 16) / 2, B + 56);
        if (i === bi) { ctx.fillStyle = "#fff"; ctx.font = `800 34px ${YV_FONT}`; ctx.fillText(Math.round(S.T.m ? v / S.wd.reduce((a, b) => a + b, 0) * 100 : 0) + "%", x + (bw - 16) / 2, B - h - 20); }
      });
    } else if (cur.k === "facts") {
      big("Ещё немного", 330, 80);
      const facts = [];
      facts.push([`${fmtR(S.activeDays ? S.T.m / S.activeDays : 0)}`, "сообщений в активный день"]);
      if (S.avg) facts.push([`×${fmtR(S.T.m / S.avg)}`, "к среднему участнику"]);
      if (S.wins) facts.push([fmt(S.wins), `${w(S.wins, ["день", "дня", "дней"])} на 1-м месте`]);
      if (S.sel) facts.push([fmt(S.sel), `${w(S.sel, ["селфи", "селфи", "селфи"])}`]);
      if (S.since) { const y = (dayIdx(iso(new Date())) - dayIdx(S.since)) / 365.25; facts.push([y >= 1 ? fmtR(y) : String(Math.max(1, Math.round(y * 12))), y >= 1 ? "лет в чате" : "мес. в чате"]); }
      facts.slice(0, 5).forEach(([v, l], i) => {
        const y = 440 + i * 225, k = ease((lf - i * 5) / (fps * .5));
        ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - k) * 60, 0);
        ctx.fillStyle = "rgba(255,255,255,.06)"; rrect(ctx, 60, y, W - 120, 190, 28); ctx.fill(); ctx.fillStyle = acc; rrect(ctx, 60, y, 14, 190, 7); ctx.fill();
        ctx.textAlign = "left"; ctx.fillStyle = "#fff"; yvFit(ctx, v, 900, 92, 420); ctx.fillText(v, 110, y + 125);
        ctx.fillStyle = "rgba(255,255,255,.75)"; yvFit(ctx, l, 600, 40, 480); ctx.fillText(l, 560, y + 112); ctx.restore();
      });
    } else if (cur.k === "ach") {
      const list = S.per.year && S.ach.gained.length ? S.ach.gained.map(e => ({n:e.name, lv:e.label, tier:e.tier, sub:`получено ${yrDayRu(e.date)}`})) : S.ach.top.map(x => ({n:x.a.name, lv:x.a.open ? String(x.level) : (["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][x.level] || String(x.level)), tier:x.tier, sub:x.a.desc}));
      big(S.per.year && S.ach.gained.length ? "Достижения года" : "Достижения", 330, 80);
      big(`${S.ach.score} очков · ${S.ach.rank[1]}`, 420, 44, "#ffd166", 700);
      list.slice(0, 4).forEach((e, i) => {
        const y = 520 + i * 300, k = ease((lf - i * 6) / (fps * .6)), c2 = TIERC[e.tier] || acc;
        ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 50);
        ctx.fillStyle = "rgba(255,255,255,.07)"; rrect(ctx, 60, y, W - 120, 260, 30); ctx.fill(); ctx.fillStyle = c2; rrect(ctx, 60, y, 14, 260, 7); ctx.fill();
        ctx.textAlign = "left"; ctx.fillStyle = "#fff"; yvFit(ctx, e.n, 900, 62, W - 420); ctx.fillText(e.n, 110, y + 100);
        ctx.fillStyle = "rgba(255,255,255,.6)"; yvFit(ctx, e.sub || "", 500, 32, W - 260); ctx.fillText(e.sub || "", 110, y + 170);
        ctx.textAlign = "right"; ctx.fillStyle = c2; ctx.font = `900 100px ${YV_FONT}`; ctx.fillText(e.lv, W - 100, y + 150); ctx.restore();
      });
    } else if (cur.k === "outro") {
      big("Спасибо", 760, 90, "rgba(255,255,255,.8)", 700);
      big(S.name, 940, 150, acc, 900);
      big(`${fmt(S.T.m)} ${w(S.T.m, ["сообщение", "сообщения", "сообщений"])} · ${fmt(S.activeDays)} активных дней`, 1120, 42, "rgba(255,255,255,.7)", 500);
      big("Colony Stats", 1700, 40, "rgba(255,255,255,.4)", 600);
    }
    ctx.restore();
  }

  async function loadAvatar(pk){
    try { const u = window.AVATAR ? await AVATAR.dataUri(pk) : null; if (!u) return null; return await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; }); } catch (e) { return null; }
  }
  async function exportVideo(){
    const btn = $v("pv-video"), msg = $v("pv-msg"), pk = $v("person").value;
    if (!allRows || !pk) { msg.textContent = "Данные ещё не загружены"; return; }
    const S = stats(pk, periodOf($v("pv-period").value));
    if (!S) { msg.textContent = "У участника нет данных за этот период"; return; }
    btn.disabled = true; msg.textContent = "Готовлю видео…";
    const ov = document.createElement("div"); ov.className = "yv-overlay"; ov.innerHTML = `<div class="yv-box"><div class="yv-prog">Готовлю видео…</div></div>`;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const av = await loadAvatar(pk), sl = slides(S), fps = 30, per = Math.round(fps * 3.6), total = sl.length * per;
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920; const ctx = canvas.getContext("2d");
      ov.querySelector(".yv-box").prepend(canvas); document.body.appendChild(ov);
      const res = await raceEncode(canvas, total, fps, f => draw(ctx, S, sl, f, fps, av), q => { const t2 = `Создаю видео… ${Math.round(q * 100)}%`; msg.textContent = t2; ov.querySelector(".yv-prog").textContent = t2; });
      downloadBlob(res.blob, `person_${String(S.name).replace(/[^\wА-Яа-яЁё-]+/g, "_")}_${S.per.year || "all"}.${res.ext}`);
      msg.textContent = res.ext === "mp4" ? "Видео MP4 сохранено" : "Видео WebM сохранено";
    } catch (e) { msg.textContent = "Не удалось создать видео: " + (e.message || e); }
    finally { btn.disabled = false; ov.remove(); }
  }

  function fillPeriods(){
    const sel = $v("pv-period"), pk = $v("person")?.value; if (!sel || !allRows || !pk) return;
    const ys = new Set(); const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0);
    allRows.forEach(x => { if (hasTot && Number(x[F.chatPk]) !== 0) return; if (String(x[F.userId] ?? x[F.name]) === String(pk) && (Number(g(x, "msgs")) || 0) > 0) ys.add(String(x[F.date]).slice(0, 4)); });
    const cur = sel.value, opts = ["all", ...[...ys].sort().reverse()];
    if (sel.dataset.sig === opts.join() && sel.dataset.pk === String(pk)) return;
    sel.innerHTML = opts.map(o => `<option value="${o}">${o === "all" ? "За всё время" : o + " год"}</option>`).join(""); sel.dataset.sig = opts.join(); sel.dataset.pk = String(pk);
    sel.value = opts.includes(cur) ? cur : "all";
  }
  $v("pv-video").addEventListener("click", exportVideo);
  $v("person").addEventListener("change", () => setTimeout(fillPeriods, 50));
  $v("pv-period").addEventListener("focus", fillPeriods); $v("pv-period").addEventListener("mousedown", fillPeriods);
  setInterval(() => { if (document.querySelector("#tab-profile.active")) fillPeriods(); }, 1500);
  window.__pv = {stats, slides, draw, periodOf, loadAvatar};
})();
