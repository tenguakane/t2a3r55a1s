
/* ===================== Мобильная версия в стиле приложения ===================== */
(function(){
  const KEY = "chatstats.mobileV2.v1";
  const mq = matchMedia("(max-width:720px)");
  let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  const nav = document.querySelector("nav");
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    hub:svg('<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5h4.5v-6h4v6h4.5V9"/>'),
    profile:svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>'),
    stats:svg('<path d="M4 20.5h16"/><rect x="5" y="11" width="3.4" height="7" rx="1"/><rect x="10.3" y="5" width="3.4" height="13" rx="1"/><rect x="15.6" y="8.5" width="3.4" height="9.5" rx="1"/>'),
    charts:svg('<path d="M3.5 17.5 9 12l4 3.5 7.5-8"/><path d="M15.5 7.5h5v5"/>'),
    menu:svg('<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>'),
    filter:svg('<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>'),
    refresh:svg('<path d="M20 11.5A8 8 0 1 0 17.7 17"/><path d="M20 5v6.5h-6.5"/>'),
    freset:svg('<path d="M4 6h10"/><path d="M7 12h6"/><path d="M10 18h3"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>'),
    exit:svg('<path d="M12 3.5v8"/><path d="M6.6 6.6a7.6 7.6 0 1 0 10.8 0"/>'),
    search:svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
    logo:svg('<path d="M5 19V11"/><path d="M12 19V5"/><path d="M19 19v-6"/>'),
  };
  const TABS = [["hub", "Хаб"], ["profile", "Профиль"], ["stats", "Статистика"], ["charts", "Графики"], ["menu", "Меню"]];
  const META = {
    hub:["🧭", "#5e8bff"], profile:["👤", "#4cb3ff"], stats:["📊", "#34c759"], compare:["⚖️", "#ff9f0a"], daymatrix:["🗓️", "#5ac8fa"], charts:["📈", "#af52de"],
    records:["🏆", "#ffb340"], months:["📅", "#ff6482"], days:["📆", "#ff453a"], forecast:["🔮", "#bf5af2"], marathons:["🏁", "#30b0c7"], time:["⏳", "#a2845e"],
    yearreview:["🎬", "#ff375f"], achievements:["🏅", "#ffcc00"], chronicle:["📜", "#8e8e93"], birthdays:["🎂", "#ff2d55"], selfie:["📸", "#64d2ff"], usermap:["🗺️", "#32d74b"], vk:["🅥", "#0a84ff"], settings:["⚙️", "#8e8e93"]
  };
  const GROUPS = [["Основное", ["hub", "profile", "stats", "compare", "daymatrix", "charts"]], ["Разделы", ["records", "months", "days", "forecast", "marathons", "time", "yearreview", "achievements", "chronicle", "birthdays", "selfie", "usermap", "vk"]]];

  // ---------- разметка ----------
  const bar = document.createElement("div"); bar.id = "ma-bar";
  bar.innerHTML = `<div class="ma-top"><div class="ma-title" id="ma-title"></div><button type="button" class="ma-ic" id="ma-filter" aria-label="Фильтры">${I.filter}<i class="ma-dot" hidden></i></button><button type="button" class="ma-ic" id="ma-freset" aria-label="Сбросить фильтры" title="Сбросить фильтры этой вкладки" hidden>${I.freset}</button><button type="button" class="ma-ic" id="ma-refresh" aria-label="Обновить данные">${I.refresh}</button><button type="button" class="ma-ic" id="ma-exit" aria-label="Выйти из приложения" title="Выйти из приложения">${I.exit}</button></div><div class="ma-sum" id="ma-sum" hidden></div>`;
  document.body.prepend(bar);
  const tabs = document.createElement("div"); tabs.id = "ma-tabs"; tabs.setAttribute("role", "tablist");
  tabs.innerHTML = TABS.map(([k, l]) => `<button type="button" data-ma="${k}" role="tab">${I[k]}<span>${l}</span></button>`).join("");
  document.body.appendChild(tabs);
  const menu = document.createElement("div"); menu.id = "ma-menu"; menu.setAttribute("aria-label", "Меню");
  document.body.appendChild(menu);
  const fs = document.createElement("div"); fs.id = "ma-fsheet";
  fs.innerHTML = `<div class="ma-bd"></div><div class="ma-panel" role="dialog" aria-modal="true" aria-label="Фильтры"><div class="ma-grip" aria-hidden="true"></div><div class="ma-fhead"><b>Фильтры</b><button type="button" class="ma-done">Готово</button></div><div class="ma-fbody"></div></div>`;
  document.body.appendChild(fs);
  const fbody = fs.querySelector(".ma-fbody"), fpanel = fs.querySelector(".ma-panel");

  // ---------- вкладки сайта ----------
  const active = () => on && mq.matches;
  const curTab = () => (document.querySelector("main > .tab.active")?.id || "").replace(/^tab-/, "");
  function btnFor(tab){
    const all = [...nav.querySelectorAll(`button[data-tab="${tab}"]`)];
    return all.find(b => !b.classList.contains("nav-hidden") && b.dataset.group !== "other") || all.find(b => b.classList.contains("nav-hidden")) || all[0];
  }
  function labelFor(tab){
    const b = [...nav.querySelectorAll(`button[data-tab="${tab}"]`)].find(x => x.dataset.group !== "other");
    return b ? b.textContent.trim() : tab;
  }
  function go(tab){ const b = btnFor(tab); if (b) b.click(); closeMenu(); scrollTo({top:0}); setTimeout(sync, 30); }

  // ---------- меню ----------
  let menuOpen = false;
  const row = (inner, attrs, cls) => `<button type="button" class="ma-row ${cls || ""}" ${attrs}>${inner}</button>`;
  const ico = t => `<i class="ma-ico" style="--c:${META[t]?.[1] || "#7aa2f7"}" aria-hidden="true">${META[t]?.[0] || "•"}</i>`;
  function renderMenu(q){
    q = (q || "").trim().toLowerCase().replace(/ё/g, "е");
    const cur = curTab(), match = s => !q || s.toLowerCase().replace(/ё/g, "е").includes(q);
    let html = "";
    if (!q) {
      const vm = (document.querySelector(".app-ver")?.textContent || "").match(/\d{4}\.\d{2}\.\d{2}-\d+/), ver = vm ? "Версия " + vm[0] : "";
      html += `<div class="ma-app"><div class="ma-logo">${I.logo}</div><div><b>Colony Stats</b><span>${esc(ver || "")}</span></div></div>`;
      const ult = $("ult-toggle"), vk = $("vk-toggle");
      const sw = (el, t, c, icon) => el ? row(`<i class="ma-ico" style="--c:${c}" aria-hidden="true">${icon}</i><span class="ma-txt"><span>${t}</span><i class="ma-sw" aria-hidden="true"></i></span>`, `data-ma-sw="${el.id}" role="switch" aria-checked="${el.classList.contains("on")}"`, el.classList.contains("on") ? "on" : "") : "";
      html += `<div class="ma-gt">Данные</div><div class="ma-grp">${document.body.classList.contains("no-ult") ? "" : sw(ult, "Colony Ultimate", "#5856d6", "🔗")}${sw(vk, "Данные VK", "#0a84ff", "🅥")}${row(`<i class="ma-ico" style="--c:#34c759" aria-hidden="true">⟳</i><span class="ma-txt"><span>Обновить данные</span><span class="ma-chev">›</span></span>`, `data-ma-refresh="1"`)}</div>`;
    }
    let any = !q;
    GROUPS.forEach(([title, list]) => {
      const items = list.filter(t => btnFor(t) && match(labelFor(t)));
      if (!items.length) return; any = true;
      html += `<div class="ma-gt">${title}</div><div class="ma-grp">` + items.map(t => row(`${ico(t)}<span class="ma-txt"><span>${esc(labelFor(t))}</span><span class="ma-chev">›</span></span>`, `data-ma-go="${t}"`, t === cur ? "cur" : "")).join("") + `</div>`;
    });
    if (match("Настройки") && btnFor("settings")) { any = true; html += `<div class="ma-gt">Сервис</div><div class="ma-grp">${row(`${ico("settings")}<span class="ma-txt"><span>Настройки</span><span class="ma-chev">›</span></span>`, `data-ma-go="settings"`, cur === "settings" ? "cur" : "")}</div>`; }
    if (!any) html += `<div class="ma-empty">Ничего не найдено</div>`;
    return html;
  }
  function fillMenu(){
    const q = menu.querySelector(".ma-search input")?.value || "";
    const list = menu.querySelector(".ma-list");
    if (!list) {
      menu.innerHTML = `<div class="ma-h">Меню</div><label class="ma-search">${I.search}<input type="search" placeholder="Поиск по разделам" aria-label="Поиск по разделам"></label><div class="ma-list"></div>`;
      menu.querySelector("input").addEventListener("input", () => { menu.querySelector(".ma-list").innerHTML = renderMenu(menu.querySelector("input").value); });
    }
    menu.querySelector(".ma-list").innerHTML = renderMenu(q);
  }
  function openMenu(){ menuOpen = true; const s = menu.querySelector("input"); if (s) s.value = ""; fillMenu(); menu.classList.add("open"); menu.scrollTop = 0; sync(); }
  function closeMenu(){ if (!menuOpen) return; menuOpen = false; menu.classList.remove("open"); sync(); }
  menu.addEventListener("click", e => {
    const g = e.target.closest("[data-ma-go]"); if (g) { go(g.dataset.maGo); return; }
    const s = e.target.closest("[data-ma-sw]"); if (s) { $(s.dataset.maSw)?.click(); setTimeout(fillMenu, 80); return; }
    if (e.target.closest("[data-ma-refresh]")) { refresh(); closeMenu(); }
  });

  // ---------- нижняя панель ----------
  const MAIN = ["hub", "profile", "stats", "charts"];
  tabs.addEventListener("click", e => {
    const b = e.target.closest("[data-ma]"); if (!b) return;
    const k = b.dataset.ma;
    if (k === "menu") { menuOpen ? closeMenu() : openMenu(); return; }
    if (!menuOpen && curTab() === k) { scrollTo({top:0, behavior:"smooth"}); return; }
    go(k);
  });

  // ---------- фильтры: шторка и сводка ----------
  let moved = [];
  function panels(){
    const t = document.querySelector("main > .tab.active"); if (!t || t.id === "tab-settings") return [];
    const sh = $("shared");
    const cand = [...(sh ? sh.querySelectorAll(":scope > .filters") : []), ...t.querySelectorAll(":scope > .filters, .stat-content > .filters")];
    return cand.filter(f => !f.hidden && f.parentElement && f.parentElement.getClientRects().length && f.children.length && !f.closest("[hidden]"));
  }
  const shown = el => !el.hidden && getComputedStyle(el).display !== "none" && !el.classList.contains("filters-user-hidden-x");
  function valOf(f){
    const s = f.querySelector("select"); if (s && s.options.length) return (s.options[s.selectedIndex]?.textContent || "").trim();
    const i = f.querySelector("input:not([type=checkbox]):not([type=hidden]):not([type=search])");
    if (i && i.value && shown(i)) { if (i.type === "date") return i.value.split("-").reverse().join("."); if (i.type === "month") { const [y, m] = i.value.split("-"); return `${m}.${y}`; } return i.value; }
    const a = f.querySelector(".seg button.active"); if (a) return a.textContent.trim();
    return "";
  }
  function summary(){
    const out = [];
    panels().forEach(p => [...p.children].forEach(c => {
      if (!shown(c)) return;
      if (c.classList.contains("field")) { const v = valOf(c); if (v) out.push(v); }
      else if (c.classList.contains("seg")) { const a = c.querySelector("button.active"); if (a) out.push(a.textContent.trim()); }
      else if (c.classList.contains("checkline")) { const cb = c.querySelector("input[type=checkbox]"); if (cb && cb.checked) out.push(c.textContent.trim()); }
    }));
    return out.filter(Boolean).slice(0, 8);
  }
  function renderSummary(){
    const ps = panels(), sum = $("ma-sum"), fb = $("ma-filter");
    fb.hidden = !ps.length;
    if (!ps.length) { sum.hidden = true; sum.innerHTML = ""; return; }
    const vals = summary();
    sum.hidden = false;
    const qb = document.getElementById("dm-today-years"), qx = qb && ps.some(p => p.contains(qb)) ? `<button type="button" class="ma-chip ma-today${qb.classList.contains("active") ? " on" : ""}" data-ma-today="1">${qb.innerHTML}</button>` : "";
    sum.innerHTML = `<button type="button" class="ma-chip first" data-ma-open="1">${I.filter}Фильтры</button>` + qx + vals.map(v => `<button type="button" class="ma-chip" data-ma-open="1">${esc(v.length > 28 ? v.slice(0, 27) + "…" : v)}</button>`).join("");
  }
  function openFilters(){
    const ps = panels(); if (!ps.length) return;
    closeMenu();
    moved = ps.map(p => {
      const mk = document.createComment("ma-filters"); p.before(mk);
      const det = [...p.querySelectorAll("details.opt-pop")].map(d => [d, d.open]);
      det.forEach(([d]) => d.open = true);
      return {p, mk, det};
    });
    fbody.innerHTML = "";
    moved.forEach(({p}) => fbody.appendChild(p));
    fs.classList.add("open"); document.documentElement.style.overflow = "hidden";
  }
  function closeFilters(){
    if (!fs.classList.contains("open")) return;
    moved.forEach(({p, mk, det}) => { mk.parentNode ? mk.replaceWith(p) : null; det.forEach(([d, o]) => d.open = o); });
    moved = []; fs.classList.remove("open"); document.documentElement.style.overflow = "";
    renderSummary();
  }
  $("ma-filter").addEventListener("click", openFilters);
  bar.addEventListener("click", e => { if (e.target.closest("[data-ma-open]")) openFilters(); });
  fs.addEventListener("click", e => { if (e.target.closest(".ma-bd") || e.target.closest(".ma-done")) closeFilters(); });
  let y0 = null, dy = 0;
  fpanel.addEventListener("touchstart", e => { if (fbody.scrollTop > 0 && !e.target.closest(".ma-grip,.ma-fhead")) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, {passive:true});
  fpanel.addEventListener("touchmove", e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); fpanel.style.transform = dy ? `translateY(${dy}px)` : ""; }, {passive:true});
  fpanel.addEventListener("touchend", () => { if (y0 == null) return; fpanel.style.transform = ""; if (dy > 90) closeFilters(); y0 = null; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeFilters(); closeMenu(); } });

  // ---------- обновление ----------
  function refresh(){ const r = $("refresh"); if (!r) return; const b = $("ma-refresh"); b.classList.add("spin"); r.click(); setTimeout(() => b.classList.remove("spin"), 1200); }
  $("ma-refresh").addEventListener("click", refresh);

  // ---------- сброс фильтров ----------
  // Где сбрасывать нечего (или фильтр — это выбор участника), кнопку не показываем.
  const NO_RESET = ["hub", "profile", "achievements", "marathons", "settings"];
  const canReset = () => !NO_RESET.includes(curTab()) && panels().length > 0;
  const lsGetJ = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const lsSetJ = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function resetFilters(){
    if (!canReset()) return;
    const tab = curTab(), key = typeof activeDataTab === "function" ? activeDataTab() : tab;
    closeFilters();
    window.__tabFilters?.reset(key);
    // Общий период, тип и показатель графика хранятся отдельно — убираем их, адрес вкладки оставляем.
    if (["stats", "charts"].includes(tab)) { const u = lsGetJ(UI_KEY); if (u) lsSetJ(UI_KEY, tab === "charts" ? {hash:u.hash} : {cType:u.cType, metric:u.metric, entity:u.entity, hash:u.hash}); }
    if (tab === "charts") { lsSetJ(CHART_QUICK_KEY, null); lsSetJ("chatstats.chartFocus.v1", null); }
    // Сравнение: оставляем, кого с кем сравниваем; период, чат и «по сегодняшнее число» — по умолчанию.
    if (tab === "compare") { const c = lsGetJ(CMP_KEY) || {}; ["period", "chat", "same"].forEach(k => delete c[k]); lsSetJ(CMP_KEY, c); }
    if (tab === "yearreview") { lsSetJ(YR_KEY, null); try { history.replaceState(null, "", "#yearreview"); } catch (e) {} }
    if (tab === "daymatrix") { const d = lsGetJ(DM_KEY); lsSetJ(DM_KEY, d && d.sort ? {sort:d.sort} : null); }
    if (tab === "selfie") lsSetJ("chatstats.selfieRange.v1", null);
    try { sessionStorage.setItem("chatstats.fresetDone", "1"); } catch (e) {}
    $("ma-freset").classList.add("spin");
    setTimeout(() => location.reload(), 120);
  }
  $("ma-freset").addEventListener("click", resetFilters);
  try { if (sessionStorage.getItem("chatstats.fresetDone")) { sessionStorage.removeItem("chatstats.fresetDone"); setTimeout(() => { try { toastMsg("Фильтры вкладки сброшены"); } catch (e) {} }, 900); } } catch (e) {}

  // ---------- выход из приложения ----------
  // Закрыть себя страница может не всегда: браузер разрешает это только окну без истории переходов.
  // Если закрыться не вышло — подсказываем, как выйти.
  function exitApp(){
    const app = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    try { window.close(); } catch (e) {}
    setTimeout(() => {
      if (document.hidden || window.closed) return;
      try { toastMsg(app ? "Телефон не даёт приложению закрыться самому — смахни его в списке открытых приложений или нажми «Назад» несколько раз" : "Браузер не даёт сайту закрыть вкладку — закрой её вручную"); } catch (e) {}
    }, 350);
  }
  $("ma-exit").addEventListener("click", exitApp);

  // ---------- синхронизация ----------
  function sync(){
    if (!active()) return;
    const cur = curTab();
    const key = menuOpen ? "menu" : MAIN.includes(cur) ? cur : cur === "achievements" ? "profile" : "menu";
    tabs.querySelectorAll("[data-ma]").forEach(b => { const o = b.dataset.ma === key; b.classList.toggle("on", o); b.setAttribute("aria-selected", String(o)); });
    $("ma-title").textContent = labelFor(cur === "achievements" ? "achievements" : cur) || "Colony Stats";
    $("ma-freset").hidden = !canReset();
    if (!fs.classList.contains("open")) renderSummary();
  }
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(sync, 120); };
  new MutationObserver(later).observe(document.querySelector("main"), {subtree:true, attributes:true, attributeFilter:["class", "hidden"], childList:true});
  const sh = $("shared"); if (sh) new MutationObserver(later).observe(sh, {subtree:true, attributes:true, attributeFilter:["class", "hidden", "value"], childList:true});
  document.addEventListener("change", later); document.addEventListener("input", later);
  ["ult-toggle", "vk-toggle"].forEach(id => { const el = $(id); if (el) new MutationObserver(() => { if (menuOpen) fillMenu(); }).observe(el, {attributes:true, attributeFilter:["class"]}); });

  function apply(){
    document.body.classList.toggle("mapp", on);
    const c = $("set-m2"); if (c) c.checked = on;
    if (!active()) { closeFilters(); closeMenu(); }
    sync();
  }
  document.addEventListener("change", e => { if (e.target.id === "set-m2") { on = e.target.checked; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {} apply(); } });
  mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
  apply();
})();
