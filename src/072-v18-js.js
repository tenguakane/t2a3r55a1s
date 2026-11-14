
/* ===================== v18: «Я», «Сегодня», быстрый просмотр, горячие клавиши, шторки, карточки, вибрация, приложение, обгоны ===================== */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const qs = (s, r) => (r || document).querySelector(s), qsa = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const num = v => Number(v || 0).toLocaleString("ru-RU");
  const pad2 = n => String(n).padStart(2, "0");
  const isoD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayIso = () => isoD(new Date());
  const addD = (d, n) => { const [y, m, dd] = d.split("-").map(Number), t = new Date(y, m - 1, dd + n); return isoD(t); };
  const MG = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const dLong = d => `${+d.slice(8)} ${MG[+d.slice(5, 7) - 1]}`;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const mobile = window.matchMedia("(max-width:720px)");
  const nameOf = pk => (typeof NAMES !== "undefined" && NAMES[pk]) || `ID ${pk}`;
  const colorOf = pk => { try { return getStyle("u", pk).c[0] || "var(--accent)"; } catch (e) { return "var(--accent)"; } };
  const visible = pk => { try { return !!NAMES[pk] && (typeof isVisibleUser !== "function" || isVisibleUser(pk)); } catch (e) { return true; } };
  const ava = pk => { const l = (nameOf(pk)[0] || "?").toUpperCase(); try { return window.AVATAR ? AVATAR.inner(pk, l) : esc(l); } catch (e) { return esc(l); } };
  const vib = p => { try { if (window.__haptics && window.__haptics.on()) navigator.vibrate(p); } catch (e) {} };

  /* ---------- «Я» ---------- */
  const ME_KEY = "chatstats.me.v1";
  const meSubs = [];
  const ME = window.__me = {
    get(){ return lsGet(ME_KEY, ""); },
    set(pk){ lsSet(ME_KEY, pk ? String(pk) : null); meSubs.forEach(f => { try { f(); } catch (e) {} }); },
    on(f){ meSubs.push(f); }
  };

  /* ---------- данные по дням из полной истории ---------- */
  let DS = null;
  function dayStats(){
    if (typeof allRows === "undefined" || !allRows) return null;
    if (DS && DS.src === allRows) return DS;
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
    const users = new Map(), tot = new Map(); let latest = "";
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      try { if (typeof vkDay === "function" && vkDay(d)) return; } catch (e) {}
      const k = String(x[F.userId] ?? x[F.name]), v = Number(g(x, "msgs")) || 0; if (!v) return;
      let u = users.get(k); if (!u) users.set(k, u = {daily:new Map(), total:0});
      u.daily.set(d, (u.daily.get(d) || 0) + v); u.total += v;
      tot.set(d, (tot.get(d) || 0) + v); if (d > latest) latest = d;
    });
    DS = {src:allRows, users, tot, latest}; return DS;
  }
  const sumRange = (m, from, to) => { let s = 0; m.forEach((v, d) => { if (d >= from && d <= to) s += v; }); return s; };
  function rankOn(D, from, to, me){
    const list = [];
    D.users.forEach((u, pk) => { if (!visible(pk)) return; const v = sumRange(u.daily, from, to); if (v > 0 || pk === me) list.push({pk, v}); });
    list.sort((a, b) => b.v - a.v || nameOf(a.pk).localeCompare(nameOf(b.pk), "ru"));
    return list;
  }
  // Подгружаем последние дни, не перекачивая всю историю.
  async function refreshRecent(){
    const today = todayIso();
    if (typeof allRows === "undefined" || !allRows) { await getHistory(); DS = null; return; }
    let last = ""; (typeof rawHist !== "undefined" && rawHist ? rawHist : allRows).forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d > last) last = d; });
    const from = addD(last || today, -2), fresh = await fetchAll(from, today);
    if (typeof rawHist !== "undefined" && rawHist) {
      rawHist = rawHist.filter(x => String(x[F.date] ?? "").slice(0, 10) < from).concat(fresh);
      allRows = ultView(rawHist);
      try { histSave(rawHist, today); } catch (e) {}
    } else allRows = allRows.filter(x => String(x[F.date] ?? "").slice(0, 10) < from).concat(ultView(fresh));
    try { histP = Promise.resolve(allRows); } catch (e) {}
    DS = null;
    try { stamp(); } catch (e) {}
  }

  /* ---------- выделение себя во всех таблицах ---------- */
  let markT = 0;
  function mark(){
    markT = 0;
    const me = ME.get();
    qsa(".is-me-row").forEach(r => { if (!me || r.dataset.meKey !== me) r.classList.remove("is-me-row"); });
    qsa(".pname.is-me").forEach(p => { if (p.dataset.openProfile !== me) p.classList.remove("is-me"); });
    qsa("main tbody tr").forEach(tr => {
      const pk = rowPk(tr); if (!pk) return;
      if (!tr.classList.contains("qv-able")) tr.classList.add("qv-able");
      if (me && pk === me && !tr.classList.contains("is-me-row")) { tr.classList.add("is-me-row"); tr.dataset.meKey = me; }
    });
    if (me) qsa(`[data-open-profile="${CSS.escape(me)}"]`).forEach(p => { if (!p.classList.contains("is-me")) p.classList.add("is-me"); });
  }
  function rowPk(tr){
    if (!tr || tr.closest("#tab-settings, .sticky-table-head")) return "";
    if (tr.dataset.rowEntity === "participants" && tr.dataset.rowKey) return tr.dataset.rowKey;
    const p = tr.querySelector("[data-open-profile]"); return p ? p.dataset.openProfile : "";
  }
  const markLater = () => { if (!markT) markT = setTimeout(mark, 120); };
  ME.on(mark);

  /* ---------- понятная ошибка вместо красной строки ---------- */
  function cardify(el){
    if (!el || !el.classList || !el.classList.contains("status") || !el.classList.contains("err")) return;
    if (el.querySelector(".st-card")) return;
    const raw = el.textContent.trim(); if (!raw) return;
    const net = /failed to fetch|networkerror|load failed|нет связи|localhost|start\.bat|502|прокси/i.test(raw);
    const key = /ключ|401|403/i.test(raw);
    const title = key ? "Сервер не принял ключ" : net ? "Нет связи с сервером данных" : "Не удалось загрузить данные";
    const text = key ? "Проверь файл api_key.txt рядом с server.py и перезапусти start.bat."
      : net ? "Сайт не смог получить свежие данные. Проверь, что запущен start.bat (или сервер доступен из интернета) и что в настройках указан верный адрес сервера."
      : "Попробуй ещё раз через минуту. Если ошибка повторяется — открой подробности.";
    const upd = ($("upd")?.textContent || "").trim();
    el.innerHTML = `<div class="st-card" role="alert"><div class="ic" aria-hidden="true">${net ? "📡" : key ? "🔑" : "⚠️"}</div><div><b>${title}</b><p>${esc(text)}${upd ? ` ${esc(upd)}.` : ""}</p>
      <div class="acts"><button type="button" class="pri" data-st-retry>Повторить</button>${net ? `<button type="button" data-st-server>Адрес сервера</button>` : ""}</div>
      <details><summary>Подробности</summary>${esc(raw)}</details></div></div>`;
  }
  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-st-retry]")) { vib(10); const tab = qs("main > .tab.active"); if (tab && tab.id === "tab-hub" && window.loadHub) window.loadHub(); else $("refresh")?.click(); }
    else if (e.target.closest?.("[data-st-server]")) {
      qs('nav button[data-tab="settings"]')?.click();
      setTimeout(() => { try { window.__settingsCats?.show("data"); } catch (err) {} const i = $("api-base"); if (i) { i.scrollIntoView({block:"center"}); i.focus(); } }, 80);
    }
  });

  /* ---------- Хаб: «Сегодня» и выбор себя ---------- */
  let hubBusy = false;
  function hubWidget(){
    const out = $("hub-out"); if (!out) return;
    const hero = qs(".hub-hero", out); if (!hero) return;
    let box = $("me-today");
    if (!box) { box = document.createElement("div"); box.id = "me-today"; box.className = "me-today"; hero.after(box); }
    const D = dayStats();
    if (!D) { box.innerHTML = `<div class="mt-card"><div class="sk" style="height:120px"></div></div><div class="mt-card"><div class="sk" style="height:120px"></div></div>`; return; }
    const me = ME.get(), today = todayIso(), L = D.tot.has(today) ? today : (D.latest || today), isToday = L === today;
    const dayList = rankOn(D, L, L, me), monthList = rankOn(D, L.slice(0, 8) + "01", L, me);
    const yday = addD(L, -1), totL = D.tot.get(L) || 0, totY = D.tot.get(yday) || 0;
    const notifyOn = window.__overtake && window.__overtake.on();
    const head = (t, extra = "") => `<div class="mt-h">${isToday ? `<i class="live" aria-hidden="true"></i>` : ""}<span>${t}</span><span class="sp"></span>${extra}</div>`;
    let left;
    if (!me || !D.users.has(me) && !NAMES[me]) {
      const people = [...D.users.entries()].filter(([pk]) => visible(pk)).map(([pk, u]) => [pk, sumRange(u.daily, addD(L, -29), L)]).sort((a, b) => b[1] - a[1]).slice(0, 40);
      left = `<div class="mt-card mt-pick">${head("Кто ты?")}<p>Выбери себя — и сайт будет выделять тебя во всех таблицах, а здесь появится твоя сводка за день. Можно включить уведомления, когда тебя обгоняют.</p>
        <div class="mt-chips">${people.map(([pk]) => `<button type="button" data-me-pick="${esc(pk)}" style="--mc:${colorOf(pk)}"><i>${ava(pk)}</i>${esc(nameOf(pk))}</button>`).join("")}</div></div>`;
    } else {
      const u = D.users.get(me), dIdx = dayList.findIndex(x => x.pk === me), mIdx = monthList.findIndex(x => x.pk === me);
      const dv = u ? u.daily.get(L) || 0 : 0, mv = mIdx >= 0 ? monthList[mIdx].v : 0;
      let streak = 0; try { streak = u ? streakStats(u.daily).current : 0; } catch (e) {}
      const above = dIdx > 0 ? dayList[dIdx - 1] : null, below = dIdx >= 0 && dIdx < dayList.length - 1 ? dayList[dIdx + 1] : null;
      const gap = above ? `До ${dIdx}-го места (${esc(nameOf(above.pk))}) — <b>${num(above.v - dv + 1)}</b> ${wordForm(above.v - dv + 1, ["сообщение","сообщения","сообщений"])}.` : dv > 0 ? `<b>Ты лидер дня!</b>` : `Сегодня ты ещё не писал(а).`;
      const lead = below && dv > 0 ? ` Отрыв от ${esc(nameOf(below.pk))}: <b>${num(dv - below.v)}</b>.` : "";
      left = `<div class="mt-card me" style="--mc:${colorOf(me)}">${head(isToday ? `Ты сегодня · ${dLong(L)}` : `Ты · ${dLong(L)}`, `<button type="button" data-me-notify class="${notifyOn ? "on" : ""}" title="Уведомлять, когда тебя обгоняют или ты обгоняешь">${notifyOn ? "🔔 Обгоны" : "🔕 Обгоны"}</button>`)}
        <div class="mt-who"><div class="mt-ava">${ava(me)}</div><div><b>${esc(nameOf(me))}</b><span>${streak ? `серия ${streak} ${wordForm(streak, ["день","дня","дней"])} подряд 🔥` : "серии сейчас нет"}</span></div></div>
        <div class="mt-nums">
          <div class="mt-num"><div class="l">За день</div><div class="v">${num(dv)}</div><div class="s">${dIdx >= 0 && dv > 0 ? `${dIdx + 1}-е место из ${dayList.filter(x => x.v > 0).length}` : "—"}</div></div>
          <div class="mt-num"><div class="l">За месяц</div><div class="v">${num(mv)}</div><div class="s">${mIdx >= 0 && mv > 0 ? `${mIdx + 1}-е место` : "—"}</div></div>
          <div class="mt-num"><div class="l">Вчера</div><div class="v">${num(u ? u.daily.get(yday) || 0 : 0)}</div><div class="s">${dLong(yday)}</div></div>
        </div>
        <div class="mt-gap">${gap}${lead}</div>
        <div class="mt-acts"><button type="button" data-open-profile="${esc(me)}">Мой профиль</button><button type="button" data-me-qv="${esc(me)}">Быстрый просмотр</button><button type="button" data-me-change>Это не я</button>${window.__pwa && window.__pwa.can() ? `<button type="button" data-pwa-install>📲 Установить приложение</button>` : ""}</div></div>`;
    }
    const top = dayList.filter(x => x.v > 0).slice(0, 5);
    const meIn = me && top.some(x => x.pk === me), meRow = me && !meIn ? dayList.find(x => x.pk === me) : null;
    const rowH = (x, i) => `<div class="mt-row${x.pk === me ? " me" : ""}" data-me-qv="${esc(x.pk)}"><i>${i + 1}</i><span class="mt-mini" style="--mc:${colorOf(x.pk)}">${ava(x.pk)}</span><span class="n">${esc(nameOf(x.pk))}</span><span class="c">${num(x.v)}</span></div>`;
    const right = `<div class="mt-card">${head(isToday ? `Чат сегодня · ${dLong(L)}` : `Чат · ${dLong(L)} (свежее пока нет)`, `<button type="button" data-me-refresh>${hubBusy ? "Обновляю…" : "Обновить"}</button>`)}
      <div class="mt-total"><b>${num(totL)}</b><span>сообщений${totY ? ` · вчера ${num(totY)}` : ""}</span></div>
      <div class="mt-top">${top.length ? top.map(rowH).join("") : `<div class="hub-empty">Пока никто не писал</div>`}${meRow ? `<div class="mt-row me" data-me-qv="${esc(me)}"><i>${dayList.indexOf(meRow) + 1}</i><span class="mt-mini" style="--mc:${colorOf(me)}">${ava(me)}</span><span class="n">${esc(nameOf(me))}</span><span class="c">${num(meRow.v)}</span></div>` : ""}</div></div>`;
    box.innerHTML = left + right;
    mark();
  }
  document.addEventListener("click", async e => {
    const t = e.target.closest?.("[data-me-pick],[data-me-change],[data-me-refresh],[data-me-notify],[data-me-qv],[data-pwa-install]"); if (!t) return;
    if (t.hasAttribute("data-me-pick")) { vib(12); ME.set(t.dataset.mePick); hubWidget(); toastMsg(`Готово: ${nameOf(t.dataset.mePick)} — это ты. Теперь ты выделен(а) во всех таблицах.`); }
    else if (t.hasAttribute("data-me-change")) { ME.set(""); hubWidget(); }
    else if (t.hasAttribute("data-me-qv")) { e.preventDefault(); openQV(t.dataset.meQv); }
    else if (t.hasAttribute("data-me-notify")) { await window.__overtake.toggle(); hubWidget(); }
    else if (t.hasAttribute("data-pwa-install")) window.__pwa.install();
    else if (t.hasAttribute("data-me-refresh")) {
      if (hubBusy) return; hubBusy = true; hubWidget();
      try { await refreshRecent(); } catch (err) { toastMsg("Не удалось обновить: " + (err.message || err)); }
      hubBusy = false; if (window.loadHub) window.loadHub(); else hubWidget();
    }
  });

  /* ---------- быстрый просмотр участника ---------- */
  let qvEl = null, qvBack = null;
  function closeQV(){ qvEl?.remove(); qvBack?.remove(); qvEl = qvBack = null; }
  function spark(vals){
    const W = 300, H = 70, max = Math.max(1, ...vals), step = W / Math.max(1, vals.length - 1);
    const pts = vals.map((v, i) => [i * step, H - 4 - (v / max) * (H - 10)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const qg = "qvg" + Math.random().toString(36).slice(2, 8);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${qg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--mc)" stop-opacity=".45"/><stop offset=".8" style="stop-color:var(--mc)" stop-opacity="0"/></linearGradient></defs><path d="${line} L${W} ${H} L0 ${H}Z" fill="url(#${qg})"/><path d="${line}" fill="none" stroke="var(--mc)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }
  async function openQV(pk){
    pk = String(pk); closeQV(); vib(10);
    qvBack = document.createElement("div"); qvBack.className = "qv-back"; qvBack.addEventListener("click", closeQV);
    qvEl = document.createElement("aside"); qvEl.className = "qv"; qvEl.setAttribute("role", "dialog"); qvEl.setAttribute("aria-label", "Быстрый просмотр: " + nameOf(pk));
    qvEl.style.setProperty("--mc", colorOf(pk));
    qvEl.innerHTML = `<div class="qv-head"><div class="mt-ava">${ava(pk)}</div><div><b>${esc(nameOf(pk))}</b><span class="qv-sub">Загружаю…</span></div><button type="button" class="qv-x" aria-label="Закрыть">✕</button></div><div class="qv-body"><div class="sk" style="height:200px;border-radius:14px"></div></div>`;
    document.body.append(qvBack, qvEl);
    qvEl.querySelector(".qv-x").addEventListener("click", closeQV);
    let D = dayStats();
    if (!D) { try { await getHistory(); D = dayStats(); } catch (e) { if (qvEl) qvEl.querySelector(".qv-body").innerHTML = `<p class="status err">${esc(e.message || e)}</p>`; return; } }
    if (!qvEl || !D) return;
    const u = D.users.get(pk) || {daily:new Map(), total:0}, L = D.latest || todayIso(), me = ME.get();
    const m0 = L.slice(0, 8) + "01", mList = rankOn(D, m0, L, pk), mIdx = mList.findIndex(x => x.pk === pk), dList = rankOn(D, L, L, pk), dIdx = dList.findIndex(x => x.pk === pk);
    const d30 = []; for (let i = 29; i >= 0; i--) d30.push(u.daily.get(addD(L, -i)) || 0);
    let st = {current:0, maxStreak:0, activeDays:u.daily.size, best:null}; try { st = streakStats(u.daily); } catch (e) {}
    const days = u.daily.size, first = [...u.daily.keys()].sort()[0];
    qvEl.querySelector(".qv-sub").textContent = first ? `в чате с ${dLong(first)} ${first.slice(0, 4)} · ${num(days)} ${wordForm(days, ["активный день","активных дня","активных дней"])}` : "нет сообщений";
    qvEl.querySelector(".qv-body").innerHTML = `<div class="mt-nums">
        <div class="mt-num"><div class="l">${L === todayIso() ? "Сегодня" : dLong(L)}</div><div class="v">${num(u.daily.get(L) || 0)}</div><div class="s">${dIdx >= 0 && (u.daily.get(L) || 0) ? `${dIdx + 1}-е место` : "—"}</div></div>
        <div class="mt-num"><div class="l">За месяц</div><div class="v">${num(mIdx >= 0 ? mList[mIdx].v : 0)}</div><div class="s">${mIdx >= 0 && mList[mIdx].v ? `${mIdx + 1}-е место` : "—"}</div></div>
        <div class="mt-num"><div class="l">За 7 дней</div><div class="v">${num(sumRange(u.daily, addD(L, -6), L))}</div><div class="s">${num(Math.round(sumRange(u.daily, addD(L, -6), L) / 7))} в день</div></div>
      </div>
      <div class="qv-spark"><div class="l"><span>Последние 30 дней</span><span>всего ${num(d30.reduce((a, b) => a + b, 0))}</span></div>${spark(d30)}</div>
      <ul class="qv-list">
        <li><span>Всего сообщений</span><b>${num(u.total)}</b></li>
        <li><span>Текущая серия</span><b>${st.current ? `${st.current} ${wordForm(st.current, ["день","дня","дней"])}` : "нет"}</b></li>
        <li><span>Лучшая серия</span><b>${st.maxStreak ? `${st.maxStreak} ${wordForm(st.maxStreak, ["день","дня","дней"])}` : "—"}</b></li>
        ${st.best ? `<li><span>Рекорд за день</span><b>${num(st.best.v)} · ${dLong(st.best.d)} ${st.best.d.slice(0, 4)}</b></li>` : ""}
      </ul>`;
    const acts = document.createElement("div"); acts.className = "qv-acts";
    acts.innerHTML = `<button type="button" class="pri" data-qv-profile>Открыть профиль</button>${me && me !== pk ? `<button type="button" data-qv-cmp>Сравнить со мной</button>` : ""}${!me ? `<button type="button" data-qv-me>Это я</button>` : ""}`;
    qvEl.appendChild(acts);
    acts.addEventListener("click", e => {
      if (e.target.closest("[data-qv-profile]")) { closeQV(); openProfile(pk); }
      else if (e.target.closest("[data-qv-me]")) { ME.set(pk); closeQV(); toastMsg(`${nameOf(pk)} — это ты`); try { hubWidget(); } catch (err) {} }
      else if (e.target.closest("[data-qv-cmp]")) { closeQV(); try { CMP.mode = "user"; CMP.a = me; CMP.b = pk; cmpSave(); } catch (err) {} qs('nav button[data-tab="compare"]')?.click(); }
    });
  }
  window.__quickView = openQV;
  document.addEventListener("click", e => {
    const tr = e.target.closest?.("main tbody tr"); if (!tr) return;
    if (e.target.closest("a, button, input, select, textarea, label, summary, details, [data-open-profile], .row-exclude-btn, .column-resize-handle, .table-outer-resize-handle")) return;
    if (window.getSelection && String(window.getSelection()).length) return; // выделяли текст — не мешаем
    // В «Матрице» у ячейки с числом своё окошко подробностей — боковую карточку не открываем (по имени — открываем).
    if (tr.closest(".dm-table") && !e.target.closest(".dm-name, .dm-no")) return;
    const pk = rowPk(tr); if (!pk) return;
    openQV(pk);
  });

  /* ---------- горячие клавиши ---------- */
  let helpEl = null;
  function help(){
    if (helpEl) { helpEl.remove(); helpEl = null; return; }
    helpEl = document.createElement("div"); helpEl.className = "hk-help";
    const K = (k, t) => `<li><span>${t}</span><span>${k}</span></li>`;
    helpEl.innerHTML = `<div class="hk-box" role="dialog" aria-label="Горячие клавиши"><h3>⌨️ Горячие клавиши</h3><ul>
      ${K("<kbd>←</kbd> <kbd>→</kbd>", "Предыдущий / следующий день, неделя, месяц или год")}
      ${K("<kbd>T</kbd>", "Сегодня: свежие данные в «Статистике»")}
      ${K("<kbd>1</kbd>…<kbd>9</kbd>", "Перейти на вкладку по порядку")}
      ${K("<kbd>H</kbd>", "Хаб")}
      ${K("<kbd>M</kbd>", "Мой профиль")}
      ${K("<kbd>F</kbd>", "Показать или скрыть фильтры")}
      ${K("<kbd>/</kbd>", "Поиск на странице")}
      ${K("<kbd>Esc</kbd>", "Закрыть окно")}
      ${K("<kbd>?</kbd>", "Эта подсказка")}</ul></div>`;
    helpEl.addEventListener("click", e => { if (e.target === helpEl) { helpEl.remove(); helpEl = null; } });
    document.body.appendChild(helpEl);
  }
  function shift(dir){
    if (typeof mode === "undefined" || mode === "all") return false;
    const fire = el => el.dispatchEvent(new Event("change", {bubbles:true}));
    if (mode === "range" && typeof RANGE_SEL !== "undefined" && RANGE_SEL) { const n = Math.round((Date.parse(RANGE_SEL.to) - Date.parse(RANGE_SEL.from)) / 864e5) + 1; window.__statsRange.set(addD(RANGE_SEL.from, dir * n), addD(RANGE_SEL.to, dir * n)); }
    else if (mode === "day" || mode === "week") { const d = $("day"); if (!d) return false; d.value = addD(d.value || todayIso(), dir * (mode === "week" ? 7 : 1)); fire(d); }
    else if (mode === "month") { const m = $("month"); if (!m || !m.value) return false; const [y, mo] = m.value.split("-").map(Number), t = new Date(y, mo - 1 + dir, 1); m.value = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`; fire(m); }
    else if (mode === "year") { const y = $("year"); if (!y) return false; y.value = String((+y.value || new Date().getFullYear()) + dir); fire(y); }
    return true;
  }
  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "Escape") { if (helpEl) { helpEl.remove(); helpEl = null; } closeQV(); closeSheet(); return; }
    if (qs(".hc-pop, .ss, .s-cloud-dlg")) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const tab = qs("main > .tab.active")?.id || "";
    if (k === "?" || (k === "/" && e.shiftKey)) { e.preventDefault(); help(); return; }
    if ((k === "ArrowLeft" || k === "ArrowRight") && /tab-(stats|charts)$/.test(tab)) { if (shift(k === "ArrowLeft" ? -1 : 1)) e.preventDefault(); return; }
    if (k === "t" || k === "е") { e.preventDefault(); if (tab !== "tab-stats") qs('nav button[data-tab="stats"]')?.click(); setTimeout(() => $("st-today")?.click(), 30); return; }
    if (k === "h" || k === "р") { qs('nav button[data-tab="hub"]')?.click(); return; }
    if (k === "m" || k === "ь") { const me = ME.get(); if (me) openProfile(me); else { qs('nav button[data-tab="hub"]')?.click(); toastMsg("Сначала выбери себя в Хабе"); } return; }
    if (k === "f" || k === "а") { if (document.body.classList.contains("filters-right")) $("fd-toggle")?.click(); else $("filters-visibility-toggle")?.click(); return; }
    if (k === "/") { const i = qsa("main > .tab.active input[type=search], main > .tab.active input[type=text]").find(x => x.offsetParent); if (i) { e.preventDefault(); i.focus(); i.select?.(); } return; }
    if (/^[1-9]$/.test(k)) { const b = qsa("header nav button[data-tab], nav button[data-tab]").filter((x, i, a) => x.offsetParent && a.indexOf(x) === i)[+k - 1]; if (b) { e.preventDefault(); b.click(); } }
  });

  /* ---------- шторка вместо выпадающих списков (телефон) ---------- */
  let ssEl = null, ssBack = null;
  function closeSheet(){ ssEl?.remove(); ssBack?.remove(); ssEl = ssBack = null; }
  function labelFor(sel){
    const f = sel.closest(".field"), l = (sel.id && qs(`label[for="${CSS.escape(sel.id)}"]`)) || (f && qs(":scope > label", f));
    return (l && l.textContent.trim()) || sel.getAttribute("aria-label") || sel.title || "Выбор";
  }
  function openSheet(sel){
    closeSheet(); vib(8);
    const opts = [...sel.options], many = opts.length > 12;
    ssBack = document.createElement("div"); ssBack.className = "ss-back"; ssBack.addEventListener("click", closeSheet);
    ssEl = document.createElement("div"); ssEl.className = "ss"; ssEl.setAttribute("role", "dialog"); ssEl.setAttribute("aria-label", labelFor(sel));
    const CK = `<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
    const list = () => {
      const q = (ssEl.querySelector(".ss-find input")?.value || "").trim().toLowerCase();
      let h = "", lastG = null;
      opts.forEach((o, i) => {
        if (o.hidden) return;
        if (q && !o.textContent.toLowerCase().includes(q)) return;
        const gName = o.parentElement && o.parentElement.tagName === "OPTGROUP" ? o.parentElement.label : null;
        if (gName !== lastG && gName) h += `<div class="ss-grp">${esc(gName)}</div>`;
        lastG = gName;
        h += `<button type="button" class="ss-opt${o.selected ? " on" : ""}" data-i="${i}"${o.disabled ? " disabled" : ""}><span>${esc(o.textContent)}</span>${CK}</button>`;
      });
      ssEl.querySelector(".ss-list").innerHTML = h || `<div class="ss-empty">Ничего не найдено</div>`;
    };
    ssEl.innerHTML = `<div class="ss-head"><b>${esc(labelFor(sel))}</b><button type="button" data-ss-close>Готово</button></div>${many ? `<div class="ss-find"><input type="search" placeholder="Поиск" autocomplete="off"></div>` : ""}<div class="ss-list"></div>`;
    document.body.append(ssBack, ssEl);
    list();
    ssEl.querySelector("[data-ss-close]").addEventListener("click", closeSheet);
    ssEl.querySelector(".ss-find input")?.addEventListener("input", list);
    ssEl.querySelector(".ss-list").addEventListener("click", e => {
      const b = e.target.closest(".ss-opt"); if (!b || b.disabled) return;
      const o = opts[+b.dataset.i]; if (!o) return;
      if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event("input", {bubbles:true})); sel.dispatchEvent(new Event("change", {bubbles:true})); }
      vib(10); closeSheet();
    });
    const on = ssEl.querySelector(".ss-opt.on"); if (on) on.scrollIntoView({block:"center"});
  }
  const sheetsOn = () => mobile.matches && document.body.classList.contains("sel-sheets");
  function syncSheets(){ document.body.classList.toggle("sel-sheets", mobile.matches); }
  if (mobile.addEventListener) mobile.addEventListener("change", syncSheets); syncSheets();
  document.addEventListener("click", e => {
    if (!sheetsOn() || e.defaultPrevented) return;
    const t = e.target; if (!t || !t.closest || t.closest(".ss, .ss-back, .hc-pop")) return;
    let sel = null;
    if (t.tagName === "SELECT") sel = t;
    else if (t.tagName === "LABEL" && t.htmlFor) { const x = $(t.htmlFor); if (x && x.tagName === "SELECT") sel = x; }
    if (!sel) {
      if (t.closest("button, a, input, textarea, label.checkline, summary")) return;
      const box = t.closest(".field") || t;
      const cands = qsa("select:not([multiple]):not(.no-sheet)", box).filter(s => s.offsetParent && !s.disabled);
      sel = cands.find(s => { const r = s.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; })
        || (box.classList && box.classList.contains("field") && cands.length === 1 ? cands[0] : null);
    }
    if (!sel || sel.multiple || sel.disabled || sel.classList.contains("no-sheet")) return;
    e.preventDefault(); e.stopPropagation(); openSheet(sel);
  }, true);

  /* ---------- карточки вместо широких таблиц (телефон) ---------- */
  const TV_KEY = "chatstats.tableView.v1", AUTO = {};
  let TV = {}; try { TV = JSON.parse(lsGet(TV_KEY, "{}")) || {}; } catch (e) {}
  // На ПК свой выбор вида: по умолчанию таблица, карточки — по кнопке у таблицы или для всех сразу в настройках.
  const TVD_KEY = "chatstats.tableView.desktop.v1", TVD_ALL_KEY = "chatstats.tableCardsDesktop.v1";
  let TVD = {}; try { TVD = JSON.parse(lsGet(TVD_KEY, "{}")) || {}; } catch (e) {}
  const deskAll = () => lsGet(TVD_ALL_KEY, "0") === "1";
  const deskView = t => TVD[keyT(t)] || (deskAll() ? "cards" : "table");
  window.__tableCardsDesktop = {get: deskAll, set(v){ lsSet(TVD_ALL_KEY, v ? "1" : "0"); TVD = {}; lsSet(TVD_KEY, "{}"); tvScan(); }};
  const ICON_CARDS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="6.5" rx="2"/><rect x="4" y="13.5" width="16" height="6.5" rx="2"/></svg>`;
  const ICON_TABLE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M4 9.5h16M4 14.5h16M10 9.5v10"/></svg>`;
  const keyT = t => t.dataset.hcKey || t.id || "";
  function viewOf(t){
    const k = keyT(t);
    if (TV[k]) return TV[k];
    if (!AUTO[k]) {
      const w = t.closest(".wrap"); if (!w || !t.tBodies[0] || !t.tBodies[0].rows.length) return "table";
      if (t.classList.contains("tv-cards")) return "cards";
      AUTO[k] = w.scrollWidth > w.clientWidth + 8 || t.id === "participants-table" || t.id === "chat-rank-table" ? "cards" : "table";
    }
    return AUTO[k];
  }
  function cols(t){ const r = t.tHead && t.tHead.rows[t.tHead.rows.length - 1]; return r ? [...r.cells].map(c => String(c.dataset.hcName || c.textContent).replace(/[▲▼△▽↑↓⇅⬍↕]/g, "").replace(/\s+/g, " ").trim()) : []; }
  const SHORT = {"Видеосообщения":"Кружки","Видеосообщений":"Кружки","Голосовые сообщения":"Голосовые","Пересланные":"Пересл.","Пересланных":"Пересл.","Активных дней":"Дней",
    "Сообщения":"Сообщ.","Голосовые":"Голос.","Поставил(а) реакций":"Поставил","Получил(а) реакций":"Получил","Поставил ❤️":"Поставил","Получил ❤️":"Получил","Поставлено ❤️":"Поставлено","Получено ❤️":"Получено","Поставил(а)":"Поставил","Получил(а)":"Получил","Любимая реакция":"Любимая","Достижение":"Дост.","Стикеры":"Стикер."};
  function labelRows(t){
    const names = cols(t);
    qsa(":scope > :is(tbody,tfoot) > tr", t).forEach(tr => { let col = 0; [...tr.cells].forEach(c => { const span = Number(c.dataset.hcCs || c.colSpan) || 1; if (span === 1 && !c.dataset.hcCs) { const n = names[col] && (SHORT[names[col]] || names[col]); if (n && c.dataset.label !== n) c.dataset.label = n; } col += span; }); });
  }
  let tvT = 0;
  function tvScan(){
    tvT = 0;
    const on = mobile.matches;
    qsa("main table[data-hc]").forEach(t => {
      if (!tvVisible(t)) return; // таблицы скрытых вкладок обработаем, когда их откроют
      const cards = on ? viewOf(t) === "cards" : deskView(t) === "cards";
      if (t.classList.contains("tv-cards") !== cards) {
        t.classList.toggle("tv-cards", cards);
        const w = t.closest(".wrap");
        if (cards) {
          // Снимаем ширину, заданную перетаскиванием краёв таблицы, — иначе карточки жмутся в узкую колонку по центру.
          ["width", "min-width", "max-width", "margin-left", "margin-right"].forEach(p => t.style.removeProperty(p));
          if (w) ["width", "max-width", "margin-left", "margin-right"].forEach(p => w.style.removeProperty(p));
        } else if (typeof applySavedTableOuterWidth === "function") { try { applySavedTableOuterWidth(t); } catch (e) {} }
      }
      if (cards) labelRows(t);
      // кнопка переключения в строке «Столбцы»
      const bar = qs(`.hc-bar[data-for="${t.dataset.hc}"]`);
      if (bar) {
        let b = qs(".tv-btn", bar);
        if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "tv-btn"; bar.insertBefore(b, bar.firstChild); }
        tvBtn(b, t.dataset.hc, cards);
      }
    });
    const st = $("st-tv"), vt = stTable();
    if (st) { if (st.hidden !== !vt) st.hidden = !vt; if (vt) tvBtn(st, vt.dataset.hc, vt.classList.contains("tv-cards")); }
  }
  // Кнопку перерисовываем только при изменении: иначе каждая запись вызывает наблюдатель, тот — новый tvScan, и так по кругу.
  function tvBtn(b, hc, cards){
    if (b.dataset.tvFor !== hc) b.dataset.tvFor = hc;
    const mode = cards ? "cards" : "table";
    if (b.dataset.tvMode !== mode) { b.dataset.tvMode = mode; b.innerHTML = cards ? ICON_TABLE : ICON_CARDS; b.title = cards ? "Показать таблицей" : "Показать карточками"; }
  }
  function stTable(){ return qsa("#tab-stats table[data-hc]").find(t => tvVisible(t) && t.offsetParent) || null; }
  const tvLater = () => { if (!tvT) tvT = setTimeout(tvScan, 90); };
  // Видна ли таблица: проверка по разметке, без замеров раскладки.
  function tvVisible(t){ return !t.closest("main > .tab:not(.active), .stat-content:not(.active), [hidden]"); }
  // Открыли другую вкладку или раздел — обрабатываем таблицы, которые стали видны.
  { const m = qs("main"); if (m) new MutationObserver(ms => { if (ms.some(r => r.attributeName === "hidden" || (r.target.classList && (r.target.classList.contains("tab") || r.target.classList.contains("stat-content"))))) tvLater(); })
      .observe(m, {subtree:true, attributes:true, attributeFilter:["class", "hidden"]}); }
  document.addEventListener("click", e => {
    const b = e.target.closest?.(".tv-btn"); if (!b) return;
    const t = qs(`table[data-hc="${b.dataset.tvFor}"]`); if (!t) return;
    const k = keyT(t), next = t.classList.contains("tv-cards") ? "table" : "cards";
    if (mobile.matches) { TV[k] = next; lsSet(TV_KEY, JSON.stringify(TV)); } else { TVD[k] = next; lsSet(TVD_KEY, JSON.stringify(TVD)); }
    vib(10); tvScan();
  });
  (function(){ const tools = qs("#tab-stats .st-tools"); if (tools && !$("st-tv")) { const b = document.createElement("button"); b.type = "button"; b.id = "st-tv"; b.className = "tv-btn"; tools.insertBefore(b, $("st-hc")); } })();
  if (mobile.addEventListener) mobile.addEventListener("change", tvScan);

  /* ---------- вибрация при нажатиях (Android) ---------- */
  const HAP_KEY = "chatstats.haptics.v1";
  window.__haptics = {on(){ return "vibrate" in navigator && lsGet(HAP_KEY, "1") === "1"; }};
  document.addEventListener("click", e => {
    if (e.pointerType && e.pointerType !== "touch") return;
    if (!window.matchMedia("(pointer:coarse)").matches) return;
    if (e.target.closest?.("nav button, #ma-tabs button, .seg button, .group-tabs button, .stat-subnav button, .quick-chip, .checkline, .st-today, [data-ma], .ma-row, .hc-btn")) vib(8);
  }, true);
  (function(){
    if (!("vibrate" in navigator)) return;
    const host = $("set-mobile-box") || $("no-bold")?.closest(".filters"); if (!host || $("set-haptics")) return;
    const l = document.createElement("label"); l.className = "checkline"; l.title = "Короткая вибрация при нажатии на вкладки и переключатели. Работает на Android";
    l.innerHTML = `<input type="checkbox" id="set-haptics">Вибрация при нажатиях (Android)`;
    host.appendChild(l);
    const c = $("set-haptics"); c.checked = lsGet(HAP_KEY, "1") === "1";
    c.addEventListener("change", () => { lsSet(HAP_KEY, c.checked ? "1" : "0"); if (c.checked) vib(15); });
  })();

  /* ---------- установка как приложение ---------- */
  let deferred = null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  window.__pwa = {
    can(){ return !standalone && (!!deferred || isIOS); },
    async install(){
      if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; try { hubWidget(); } catch (e) {} return; }
      if (isIOS) toastMsg("В Safari нажми «Поделиться» ⬆️ → «На экран „Домой“»");
    },
    reg: null
  };
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; try { hubWidget(); } catch (err) {} syncAbout(); });
  addEventListener("appinstalled", () => { deferred = null; toastMsg("Приложение установлено 🎉"); });
  if (/^https?:$/.test(location.protocol)) {
    if (!qs('link[rel="manifest"]')) { const l = document.createElement("link"); l.rel = "manifest"; l.href = "manifest.webmanifest"; document.head.appendChild(l); }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", {updateViaCache:"none"}).then(r => { window.__pwa.reg = r; try { r.update(); } catch (e) {} }).catch(() => {});
  }
  function syncAbout(){
    const box = $("about-box"); if (!box) return;
    let w = $("pwa-about");
    if (!w) { w = document.createElement("div"); w.id = "pwa-about"; w.className = "pbtn"; w.style.marginTop = "8px"; box.appendChild(w); }
    w.innerHTML = standalone ? `<span class="hint">Сайт открыт как приложение ✓</span>`
      : window.__pwa.can() ? `<button class="mini" type="button" data-pwa-install>📲 Установить как приложение</button>${isIOS ? `<span class="pwa-hint">В Safari: «Поделиться» → «На экран „Домой“»</span>` : ""}`
      : `<span class="pwa-hint">Установка доступна, когда сайт открыт по адресу http(s):// в Chrome, Edge или Safari, а рядом с ним лежат файлы manifest.webmanifest и sw.js.</span>`;
  }
  syncAbout();

  /* ---------- уведомления об обгонах ---------- */
  const OT_KEY = "chatstats.overtake.v1";
  let snap = null, otTimer = null;
  async function notify(title, body){
    vib([20, 40, 20]);
    if (!document.hidden) { toastMsg(`${title} ${body}`); return; }
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const opt = {body, tag:"overtake", renotify:true, icon:"icon-192.png", badge:"icon-192.png"};
    try { const r = window.__pwa.reg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration()); if (r) { await r.showNotification(title, opt); return; } } catch (e) {}
    try { new Notification(title, opt); } catch (e) {}
  }
  function ranksFrom(rows2, from, to){
    const hasTot = rows2.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? rows2.filter(x => Number(x[F.chatPk]) === 0) : rows2, m = new Map();
    src.forEach(x => { const d = String(x[F.date] ?? "").slice(0, 10); if (d < from || d > to) return; const k = String(x[F.userId] ?? x[F.name]); if (!visible(k)) return; m.set(k, (m.get(k) || 0) + (Number(g(x, "msgs")) || 0)); });
    const list = [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    return new Map(list.map(([k, v], i) => [k, {i, v}]));
  }
  async function otTick(){
    const me = ME.get(); if (!window.__overtake.on() || !me) return;
    const today = todayIso(), m0 = today.slice(0, 8) + "01";
    let raw; try { raw = await fetchAll(m0, today); } catch (e) { return; }
    const now = {date:today, day:ranksFrom(raw, today, today), month:ranksFrom(raw, m0, today)};
    if (snap) {
      const msgs = [];
      [["day", "за сегодня"], ["month", "за месяц"]].forEach(([s, label]) => {
        if (snap.date !== today && s === "day") return;
        if (s === "month" && snap.date.slice(0, 7) !== today.slice(0, 7)) return;
        const A = snap[s], B = now[s], ma = A.get(me), mb = B.get(me); if (!mb) return;
        B.forEach((b, k) => {
          if (k === me) return; const a = A.get(k);
          const wasBelow = !a || (ma && a.i > ma.i), nowAbove = b.i < mb.i;
          const wasAbove = a && (!ma || a.i < ma.i), nowBelow = b.i > mb.i;
          if (wasBelow && nowAbove && ma) msgs.push({bad:true, t:`${nameOf(k)} обогнал(а) тебя ${label}`, b:`Теперь ты ${mb.i + 1}-й: ${num(mb.v)} против ${num(b.v)}.`});
          else if (wasAbove && nowBelow) msgs.push({bad:false, t:`Обгон ${label}! Ты теперь выше, чем ${nameOf(k)} 🎉`, b:`Теперь ты ${mb.i + 1}-й: ${num(mb.v)} против ${num(b.v)}.`});
        });
      });
      if (msgs.length) { const m = msgs.find(x => x.bad) || msgs[0]; notify(m.bad ? "🏁 " + m.t : m.t, m.b + (msgs.length > 1 ? ` И ещё ${msgs.length - 1} ${wordForm(msgs.length - 1, ["обгон","обгона","обгонов"])}.` : "")); }
    }
    snap = now;
  }
  window.__overtake = {
    on(){ return lsGet(OT_KEY, "0") === "1"; },
    async toggle(){
      const v = !this.on(); lsSet(OT_KEY, v ? "1" : "0");
      if (v) {
        if ("Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch (e) {} }
        const perm = "Notification" in window ? Notification.permission : "unsupported";
        toastMsg(perm === "granted" ? "🔔 Уведомлю, когда тебя обгонят или ты обгонишь кого-то" : "🔔 Буду сообщать об обгонах, пока сайт открыт. Системные уведомления не разрешены в браузере");
        snap = null; otTick(); start();
      } else { clearInterval(otTimer); otTimer = null; toastMsg("🔕 Уведомления об обгонах выключены"); }
    }
  };
  function start(){ clearInterval(otTimer); if (window.__overtake.on()) otTimer = setInterval(otTick, 3 * 60000); }
  start(); if (window.__overtake.on()) setTimeout(otTick, 4000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && window.__overtake.on()) otTick(); });

  /* ---------- общий наблюдатель ---------- */
  const main = qs("main");
  if (main) new MutationObserver(ms => {
    let hub = false, structural = false;
    for (const m of ms) {
      if (m.type === "childList") structural = true;
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!t) continue;
      if (t.closest && t.closest(".st-card, #me-today, .qv, .ss")) continue;
      const st = t.closest && t.closest(".status"); if (st) cardify(st);
      m.addedNodes && m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.classList?.contains("status")) cardify(n); n.querySelectorAll?.(".status.err").forEach(cardify); } });
      if (t.id === "hub-out" || (t.closest && t.closest("#hub-out") && !t.closest("#me-today"))) hub = true;
    }
    if (hub && !$("me-today")) hubWidget();
    if (structural) { markLater(); tvLater(); }
  }).observe(main, {childList:true, subtree:true, characterData:true});
  qsa(".status.err").forEach(cardify);
  // Профиль по умолчанию открывается на себе.
  try { const me = ME.get(), p = $("person"); if (me && p && [...p.options].some(o => o.value === me) && !/person|pk=/.test(location.hash + location.search)) { p.value = me; } } catch (e) {}
  setInterval(() => { if (qs("#tab-hub.active") && !document.hidden) hubWidget(); }, 60000);
  if ($("hub-out") && qs(".hub-hero")) hubWidget();
  mark(); tvScan();
})();
