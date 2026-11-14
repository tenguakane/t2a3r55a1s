
(() => {
  const $q = (s, r = document) => r.querySelector(s);
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const nameOf = pk => NAMES[pk] || ("ID " + pk);
  const colorOf = pk => { try { return getStyle("u", pk).c[0]; } catch (e) { return "#7aa2f7"; } };
  const avaHtml = pk => { const l = (nameOf(pk)[0] || "?").toUpperCase(); try { return window.AVATAR ? AVATAR.inner(pk, l) : esc(l); } catch (e) { return esc(l); } };
  const norm = t => String(t).toLowerCase().replace(/ё/g, "е").trim();
  const nav = document.querySelector("nav");
  const vis = pk => typeof isVisibleUser !== "function" || isVisibleUser(pk);
  const people = () => Object.keys(NAMES).filter(vis).sort((a, b) => nameOf(a).localeCompare(nameOf(b), "ru"));
  const toast = t => { try { toastMsg(t); } catch (e) {} };

  /* =========================== Поиск по сайту (/, Ctrl+K) =========================== */
  const SVG_S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16 16"/></svg>';
  const back = document.createElement("div"); back.className = "qs-back"; back.hidden = true;
  back.innerHTML = `<div class="qs-box" role="dialog" aria-label="Поиск по сайту"><label class="qs-in">${SVG_S}<input type="search" id="qs-input" placeholder="Вкладка, участник, месяц, настройка…" autocomplete="off" aria-label="Поиск по сайту"><kbd>Esc</kbd></label><div class="qs-list" id="qs-list" role="listbox"></div></div>`;
  document.body.appendChild(back);
  const inp = $q("#qs-input", back), list = $q("#qs-list", back);
  const MN = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const tabIcon = t => (window.__lineIcon && window.__lineIcon.forTab(t)) || "•";
  function clickTab(t){ const b = nav.querySelector(`button[data-tab="${t}"]:not(.nav-hidden)`) || nav.querySelector(`button[data-tab="${t}"]`); if (b) b.click(); }
  function items(){
    const out = [];
    const seen = new Set();
    nav.querySelectorAll("button[data-tab]").forEach(b => {
      const t = b.dataset.tab, lbl = (b.title || b.textContent || "").trim();
      if (!lbl || seen.has(lbl) || b.dataset.group === "other") return; seen.add(lbl);
      out.push({g:"Вкладки", t:lbl, ic:tabIcon(t), go:() => clickTab(t)});
    });
    [["Топ месяцев", "months"], ["Топ дней", "days"], ["Достижения", "achievements"], ["История обновлений", "hub-log"]].forEach(([l, t]) => { if (!seen.has(l)) out.push({g:"Вкладки", t:l, ic:tabIcon(t === "hub-log" ? "chronicle" : t), go:() => { if (t === "hub-log") { clickTab("hub"); setTimeout(() => $q('#hub-seg [data-hub-view="log"]')?.click(), 60); } else clickTab(t); }}); });
    people().forEach(pk => {
      out.push({g:"Участники", t:nameOf(pk), sub:"профиль", pk, go:() => { const s = $q("#person"); if (s) { s.value = pk; s.dispatchEvent(new Event("change", {bubbles:true})); } clickTab("profile"); }});
      out.push({g:"Участники", t:nameOf(pk), sub:"достижения", pk, extra:true, go:() => { if (window.__openAchievementsOf) window.__openAchievementsOf(pk); }});
      out.push({g:"Участники", t:nameOf(pk), sub:"сравнить со мной", pk, extra:true, go:() => { const me = window.__me?.get(); clickTab("compare"); setTimeout(() => { try { CMP.mode = "user"; CMP.a = me && me !== pk ? me : CMP.a; CMP.b = pk; renderCompare(); } catch (e) {} }, 300); }});
    });
    const sets = [...document.querySelectorAll("#tab-settings .set-menu [data-scat]")];
    sets.forEach(b => out.push({g:"Настройки", t:(b.querySelector("b")?.textContent || b.textContent).trim(), ic:tabIcon("settings"), go:() => { clickTab("settings"); setTimeout(() => b.click(), 80); }}));
    return out;
  }
  function monthItems(q){
    const m = q.match(/^([а-яё]+)\s*(\d{4})?$/i); if (!m) return [];
    const i = MN.findIndex(x => x.startsWith(norm(m[1]))); if (i < 0 || m[1].length < 3) return [];
    const now = new Date(), ys = m[2] ? [m[2]] : [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(String);
    return ys.map(y => ({g:"Месяцы", t:`${MN[i][0].toUpperCase() + MN[i].slice(1)} ${y}`, sub:"статистика месяца", ic:tabIcon("stats"), go:() => {
      clickTab("stats");
      setTimeout(() => { const mi = $q("#month"); if (mi) { mi.value = `${y}-${String(i + 1).padStart(2, "0")}`; mi.dispatchEvent(new Event("change", {bubbles:true})); } $q('#mode button[data-m="month"]')?.click(); }, 120);
    }}));
  }
  let shown = [], sel = 0;
  function render(){
    const q = norm(inp.value);
    let res = items().filter(x => !q ? !x.extra : norm(x.t).includes(q) || (x.sub && norm(x.t + " " + x.sub).includes(q)));
    if (q) { const st = x => norm(x.t).startsWith(q) ? 0 : 1; res.sort((a, b) => (a.g === b.g ? st(a) - st(b) : 0)); res = [...monthItems(q), ...res]; }
    if (!q) res = res.filter(x => x.g !== "Участники" || x.pk === window.__me?.get()).slice(0, 40);
    shown = res.slice(0, 60); sel = 0;
    if (!shown.length) { list.innerHTML = `<div class="qs-empty">Ничего не нашлось. Попробуй имя, «рекорды», «октябрь 2025».</div>`; return; }
    let g = "", h = "";
    shown.forEach((x, i) => {
      if (x.g !== g) { g = x.g; h += `<div class="qs-g">${esc(g)}</div>`; }
      const ic = x.pk ? `<span class="qs-ic p" style="--mc:${colorOf(x.pk)}">${avaHtml(x.pk)}</span>` : `<span class="qs-ic">${x.ic || "•"}</span>`;
      h += `<button type="button" class="qs-it" role="option" data-i="${i}" aria-selected="${i === 0}">${ic}<span>${esc(x.t)}</span>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</button>`;
    });
    list.innerHTML = h;
  }
  const mark = () => list.querySelectorAll(".qs-it").forEach(b => { const on = +b.dataset.i === sel; b.setAttribute("aria-selected", on); if (on) b.scrollIntoView({block:"nearest"}); });
  function openQS(q = ""){ back.hidden = false; inp.value = q; render(); setTimeout(() => inp.focus(), 20); }
  function closeQS(){ back.hidden = true; }
  function run(i){ const x = shown[i]; if (!x) return; closeQS(); try { x.go(); } catch (e) { console.error(e); } }
  window.__quickSearch = openQS;
  inp.addEventListener("input", render);
  inp.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); mark(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
    else if (e.key === "Enter") { e.preventDefault(); run(sel); }
    else if (e.key === "Escape") closeQS();
  });
  list.addEventListener("click", e => { const b = e.target.closest(".qs-it"); if (b) run(+b.dataset.i); });
  back.addEventListener("click", e => { if (e.target === back) closeQS(); });
  document.addEventListener("keydown", e => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "k" || e.key === "K" || e.key === "л" || e.key === "Л") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); back.hidden ? openQS() : closeQS(); }
    else if (e.key === "/" && !typing && back.hidden) { e.preventDefault(); openQS(); }
    else if (e.key === "Escape" && !back.hidden) closeQS();
  });
  // Кнопка в шапке (ПК) и в верхней панели телефона
  const actions = $q("header .top-actions");
  if (actions && !$q("#qs-open")) { const b = document.createElement("button"); b.type = "button"; b.id = "qs-open"; b.className = "qs-btn"; b.title = "Поиск по сайту"; b.innerHTML = `${SVG_S}Поиск <kbd>/</kbd>`; b.onclick = () => openQS(); actions.prepend(b); }
  const addMobile = () => {
    const top = $q("#ma-bar .ma-top"); if (!top || $q("#ma-search-open")) return;
    const b = document.createElement("button"); b.type = "button"; b.id = "ma-search-open"; b.className = "ma-ic"; b.setAttribute("aria-label", "Поиск по сайту"); b.innerHTML = SVG_S; b.onclick = () => openQS();
    const f = $q("#ma-filter", top); f ? top.insertBefore(b, f) : top.appendChild(b);
  };
  addMobile(); new MutationObserver(addMobile).observe(document.body, {childList:true});

  /* =========================== «Кто ты?» при первом входе =========================== */
  const WHO_KEY = "chatstats.whoAsked.v1";
  function askWho(){
    let asked = ""; try { asked = localStorage.getItem(WHO_KEY) || ""; } catch (e) {}
    if (asked || !window.__me || window.__me.get() || typeof allRows === "undefined" || !allRows || $q(".who-back")) return;
    const ppl = people(); if (!ppl.length) return;
    const w = document.createElement("div"); w.className = "who-back";
    w.innerHTML = `<div class="who-box" role="dialog" aria-label="Кто ты?"><h2>Кто ты?</h2><p>Выбери себя — сайт будет выделять тебя во всех таблицах, а в Хабе появится твоя сводка за день. Поменять можно в любой момент.</p><input type="search" placeholder="Найти по имени" aria-label="Найти по имени"><div class="who-list">${ppl.map(pk => `<button type="button" data-who="${esc(pk)}" style="--mc:${colorOf(pk)}"><i>${avaHtml(pk)}</i>${esc(nameOf(pk))}</button>`).join("")}</div><button type="button" class="who-skip">Пропустить — я просто смотрю</button></div>`;
    document.body.appendChild(w);
    const done = () => { try { localStorage.setItem(WHO_KEY, "1"); } catch (e) {} w.remove(); };
    w.querySelector("input").addEventListener("input", e => { const q = norm(e.target.value); w.querySelectorAll("[data-who]").forEach(b => b.hidden = !!q && !norm(b.textContent).includes(q)); });
    w.addEventListener("click", e => {
      const b = e.target.closest("[data-who]");
      if (b) { window.__me.set(b.dataset.who); done(); toast(`Готово: ${nameOf(b.dataset.who)} — это ты`); try { if (typeof window.loadHub === "function" && $q("#tab-hub.active")) window.loadHub(); } catch (err) {} return; }
      if (e.target.closest(".who-skip") || e.target === w) done();
    });
  }
  let tries = 0; const tWho = setInterval(() => { tries++; askWho(); if ($q(".who-back") || tries > 40 || window.__me?.get()) clearInterval(tWho); }, 500);

  /* =========================== Карточка игрока =========================== */
  function stat(pk){
    pk = String(pk);
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows;
    const tot = new Map(), daily = new Map(); let stick = 0, voice = 0, video = 0;
    src.forEach(x => {
      const k = String(x[F.userId] ?? ""), v = Number(g(x, "msgs")) || 0;
      if (vis(k)) tot.set(k, (tot.get(k) || 0) + v);
      if (k !== pk) return;
      const d = String(x[F.date] ?? "").slice(0, 10); if (v) daily.set(d, (daily.get(d) || 0) + v);
      stick += Number(g(x, "stick")) || 0; voice += Number(g(x, "voice")) || 0; video += Number(g(x, "video")) || 0;
    });
    const msgs = tot.get(pk) || 0, place = [...tot.values()].filter(v => v > msgs).length + 1, of = [...tot.values()].filter(v => v > 0).length;
    let st = {}; try { st = streakStats(daily); } catch (e) {}
    const since = (MEMBERSHIP_STARTS.find(([, id]) => String(id) === pk) || [])[0] || [...daily.keys()].sort()[0] || "";
    let ach = []; try { ach = window.__achApi.full(pk).items.filter(x => x.level > 0).sort((a, b) => b.level - a.level || b.pr - a.pr).slice(0, 3); } catch (e) {}
    let rank = null; try { const r = window.__achApi.full(pk); rank = {score:r.score, r:window.__achApi.rank(r.score)}; } catch (e) {}
    let ev = null; try { const E = window.__beta?.events; const live = E?.list().find(e => e.status === "live") || E?.list().slice(-1)[0]; const lv = live ? E.levelOf(live.id, pk) : 0; if (lv) ev = {title:live.title, lv, c1:live.c1, c2:live.c2}; } catch (e) {}
    return {msgs, place, of, stick, voice, video, best:st.best, cur:st.current || 0, max:st.maxStreak || 0, since, ach, rank, ev};
  }
  const loadImg = src => new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  async function drawCard(pk){
    const S = stat(pk), W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d"), cs = getComputedStyle(document.body);
    const acc = cs.getPropertyValue("--accent").trim() || "#7aa2f7", bg = cs.getPropertyValue("--bg").trim() || "#12141b", panel = cs.getPropertyValue("--panel").trim() || "#1a1d26", txt = "#eef0f6", mut = "#9aa1b2", pc = colorOf(pk);
    const font = (w, s) => `${w} ${s}px "Samsung Sans", "Segoe UI", system-ui, sans-serif`;
    try { await document.fonts.load(font(800, 40)); } catch (e) {}
    // фон
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    let gr = c.createRadialGradient(W * .2, H * .12, 0, W * .2, H * .12, W * .9); gr.addColorStop(0, pc + "55"); gr.addColorStop(1, "transparent"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    gr = c.createRadialGradient(W * .95, H * .95, 0, W * .95, H * .95, W * .8); gr.addColorStop(0, acc + "33"); gr.addColorStop(1, "transparent"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    // аватар
    const ax = 90, ay = 110, ar = 120;
    c.save(); c.beginPath(); c.arc(ax + ar, ay + ar, ar + 10, 0, 7); c.fillStyle = pc + "40"; c.fill(); c.beginPath(); c.arc(ax + ar, ay + ar, ar, 0, 7); c.clip();
    c.fillStyle = pc; c.fillRect(ax, ay, ar * 2, ar * 2);
    let img = null; try { img = await loadImg(window.AVATAR ? await AVATAR.dataUri(pk) : ""); } catch (e) {}
    if (img) c.drawImage(img, ax, ay, ar * 2, ar * 2); else { c.fillStyle = "#0b0d12"; c.font = font(800, 120); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText((nameOf(pk)[0] || "?").toUpperCase(), ax + ar, ay + ar + 6); }
    c.restore();
    c.textAlign = "left"; c.textBaseline = "alphabetic";
    c.fillStyle = txt; c.font = font(800, 84); c.fillText(nameOf(pk), 380, 210);
    c.fillStyle = mut; c.font = font(500, 34);
    const fd = d => d ? `${+d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "";
    c.fillText(S.since ? `в чате с ${fd(S.since)}` : "Colony", 382, 262);
    if (S.rank) { c.fillStyle = acc; c.font = font(700, 34); c.fillText(`${S.rank.r[1]} · ${S.rank.score} очков`, 382, 312); }
    // место — главное
    const fmtN = v => (typeof fmt === "function" ? fmt(v) : String(v));
    c.fillStyle = panel + "cc"; rr(c, 70, 410, W - 140, 250, 34); c.fill();
    const medal = S.place === 1 ? "#e8c26a" : S.place === 2 ? "#b9c2d0" : S.place === 3 ? "#d39064" : txt;
    c.fillStyle = medal; c.font = font(800, 190); c.fillText(`${S.place}`, 110, 600);
    const pw = c.measureText(`${S.place}`).width;
    c.fillStyle = mut; c.font = font(600, 40); c.fillText("место", 130 + pw, 520); c.fillText(`из ${S.of} за всё время`, 130 + pw, 574);
    c.textAlign = "right"; c.fillStyle = txt; c.font = font(800, 76); c.fillText(fmtN(S.msgs), W - 110, 540); c.fillStyle = mut; c.font = font(500, 32); c.fillText("сообщений", W - 110, 590); c.textAlign = "left";
    // плитки
    const tiles = [["Лучший день", S.best ? fmtN(S.best.v) : "—", S.best ? fd(S.best.d) : ""], ["Серия сейчас", `${S.cur}`, `рекорд ${S.max} дн.`], ["Стикеры", fmtN(S.stick), `голос. ${fmtN(S.voice)} · видео ${fmtN(S.video)}`]];
    tiles.forEach(([l, v, s], i) => { const x = 70 + i * ((W - 140 + 24) / 3), w = (W - 140 - 48) / 3; c.fillStyle = panel + "cc"; rr(c, x, 690, w, 200, 28); c.fill(); c.fillStyle = mut; c.font = font(500, 30); c.fillText(l, x + 30, 745); c.fillStyle = txt; c.font = font(800, 64); c.fillText(v, x + 30, 825); c.fillStyle = mut; c.font = font(500, 24); c.fillText(s, x + 30, 865); });
    // достижения
    const TC = l => l <= 3 ? "#e3a36b" : l <= 6 ? "#c0c6d4" : l <= 9 ? "#ffd166" : "#67e8f9", ROM = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    c.fillStyle = txt; c.font = font(700, 36); c.fillText("Лучшие достижения", 74, 960);
    S.ach.forEach((x, i) => { const y = 990 + i * 62; c.fillStyle = TC(x.level) + "26"; rr(c, 70, y, W - 140, 52, 16); c.fill(); c.fillStyle = TC(x.level); c.font = font(800, 28); c.fillText(x.a.open ? String(x.level) : ROM[x.level] || x.level, 96, y + 36); c.fillStyle = txt; c.font = font(600, 28); c.fillText(x.a.name, 180, y + 36); c.textAlign = "right"; c.fillStyle = mut; c.font = font(500, 24); c.fillText(x.a.unit ? `${x.a.show(x.v)} ${x.a.unit(x.v)}`.slice(0, 42) : "", W - 96, y + 35); c.textAlign = "left"; });
    if (!S.ach.length) { c.fillStyle = mut; c.font = font(500, 28); c.fillText("Пока без достижений", 74, 1010); }
    // событие и подпись
    const fy = H - 70;
    if (S.ev) { const eg = c.createLinearGradient(70, 0, 520, 0); eg.addColorStop(0, S.ev.c1); eg.addColorStop(1, S.ev.c2); c.fillStyle = eg; rr(c, 70, fy - 46, 12, 52, 6); c.fill(); c.fillStyle = txt; c.font = font(700, 30); c.fillText(`${S.ev.title} · уровень ${S.ev.lv}`, 100, fy - 10); }
    c.textAlign = "right"; c.fillStyle = mut; c.font = font(600, 28); c.fillText("Colony Stats", W - 74, fy - 10);
    return new Promise(r => cv.toBlob(r, "image/png"));
  }
  async function showCard(pk){
    toast("Собираю карточку…");
    const blob = await drawCard(pk); if (!blob) return;
    const url = URL.createObjectURL(blob), p = document.createElement("div"); p.className = "pc-pop";
    p.innerHTML = `<div class="pc-box"><img src="${url}" alt="Карточка игрока ${esc(nameOf(pk))}"><div class="pc-row"><button type="button" data-pc="copy">Копировать</button><button type="button" data-pc="save">Скачать PNG</button>${navigator.share ? `<button type="button" data-pc="share">Поделиться</button>` : ""}<button type="button" data-pc="close">Закрыть</button></div></div>`;
    document.body.appendChild(p);
    const close = () => { p.remove(); URL.revokeObjectURL(url); };
    p.addEventListener("click", async e => {
      const a = e.target.closest("[data-pc]")?.dataset.pc; if (!a) { if (e.target === p) close(); return; }
      if (a === "close") close();
      if (a === "save") { try { downloadBlob(blob, `colony_${nameOf(pk)}.png`); } catch (err) {} }
      if (a === "copy") { try { await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]); toast("Карточка скопирована"); } catch (err) { toast("Не удалось скопировать — скачай PNG"); } }
      if (a === "share") { try { await navigator.share({files:[new File([blob], `colony_${nameOf(pk)}.png`, {type:"image/png"})], title:`${nameOf(pk)} · Colony`}); } catch (err) {} }
    });
  }
  window.__playerCard = showCard;
  function addBtn(){
    const hero = $q("#p-out .p-hero"); if (!hero || hero.querySelector(".pc-open")) return;
    const host = hero.querySelector(".p-cmp-btn")?.parentElement || hero.querySelector(".p-hero-main") || hero;
    const b = document.createElement("button"); b.type = "button"; b.className = "p-cmp-btn pc-open"; b.textContent = "Карточка игрока"; b.title = "Картинка с главным о участнике — скопировать, скачать или переслать";
    b.style.marginLeft = "8px";
    b.onclick = () => { const pk = $q("#person")?.value; if (pk) showCard(pk); };
    const cmp = hero.querySelector(".p-cmp-btn"); cmp ? cmp.after(b) : host.appendChild(b);
  }
  const pOut = $q("#p-out"); if (pOut) new MutationObserver(addBtn).observe(pOut, {childList:true}); addBtn();
})();
