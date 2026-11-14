
/* ===================== Экспериментально: фильтры в правой шторке (только ПК) ===================== */
(function(){
  const KEY = "chatstats.filtersRight.v1", KEY_C = "chatstats.filtersRightCollapsed.v1";
  const mq = window.matchMedia("(min-width:721px)");
  const FD_PIN_ON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M15.5 3.2a1 1 0 0 1 1.4 0l3.9 3.9a1 1 0 0 1 0 1.4l-1.6 1.6a1 1 0 0 1-1.1.2l-.9-.4-3.2 3.2.3 2.4a1 1 0 0 1-.3.8l-1 1a1 1 0 0 1-1.4 0L8.4 14.1 4.7 17.8a.9.9 0 0 1-1.3-1.3l3.7-3.7-3.2-3.2a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 .8-.3l2.4.3 3.2-3.2-.4-.9a1 1 0 0 1 .2-1.1z"/></svg>`;
  const FD_PIN_OFF = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M15.5 3.2a1 1 0 0 1 1.4 0l3.9 3.9a1 1 0 0 1 0 1.4l-1.6 1.6a1 1 0 0 1-1.1.2l-.9-.4-3.2 3.2.3 2.4a1 1 0 0 1-.3.8l-1 1a1 1 0 0 1-1.4 0L8.4 14.1 4.7 17.8M7.1 12.8l-3.2-3.2a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 .8-.3l2.4.3 3.2-3.2-.4-.9a1 1 0 0 1 .2-1.1z"/></svg>`;
  const dr = document.createElement("aside");
  dr.id = "filter-drawer"; dr.setAttribute("aria-label", "Фильтры");
  dr.innerHTML = `<div class="fd-head"><span>Фильтры</span><button type="button" id="fd-toggle" title="Свернуть шторку">»</button></div><div class="fd-top" id="fd-top"></div><div id="fd-body"></div><div class="fd-rail" id="fd-rail" title="Развернуть фильтры">⚙ Фильтры</div>`;
  document.body.appendChild(dr);
  const body = dr.querySelector("#fd-body"), top = dr.querySelector("#fd-top");
  const moved = []; // [узел, метка-место]
  const seen = new WeakSet(); // панели, которые шторка уже забирала
  // Фильтры справа на ПК включены всегда; запоминается только, свёрнута ли шторка.
  const on = true; let collapsed = false;
  try { collapsed = localStorage.getItem(KEY_C) === "1"; } catch (e) {}
  const active = () => on && mq.matches;
  function park(node, dest){ const mark = document.createComment("fd"); node.before(mark); moved.push([node, mark]); dest.appendChild(node); }
  // Выбор участника (Профиль), пара для сравнения и кнопки копирования остаются на странице: поля помечены data-fr-keep.
  const holders = new Map(); // id блока фильтров → контейнер на странице
  function keepOut(node, mark){
    // Кнопки копирования — не фильтры: они тоже остаются на странице.
    const keep = node.querySelectorAll("[data-fr-keep], .table-export-actions"); if (!keep.length) return;
    let h = holders.get(node);
    if (!h) { h = document.createElement("div"); h.className = "filters fr-keep"; h.dataset.for = node.id || ""; mark.before(h); holders.set(node, h); }
    keep.forEach(el => { const m = document.createComment("fdk"); el.before(m); moved.push([el, m]); h.appendChild(el); });
  }
  function rekeep(id){
    const node = document.getElementById(id); if (!node) return;
    const h = holders.get(node); if (!h) return;
    // старые поля уже заменены перерисовкой — убираем их и забираем новые
    for (let i = moved.length - 1; i >= 0; i--) if (moved[i][0].parentNode === h) moved.splice(i, 1);
    h.textContent = "";
    const entry = moved.find(([n]) => n === node); if (entry) keepOut(node, entry[1]);
  }
  function restore(){
    try { window.__statsChatHome && window.__statsChatHome(); } catch (e) {}
    body.querySelectorAll(":scope > .fd-look").forEach(n => n.remove());
    while (moved.length) { const [node, mark] = moved.pop(); if (mark.parentNode) mark.replaceWith(node); }
    holders.forEach(h => h.remove()); holders.clear();
    body.dataset.tab = "";
  }
  function candidates(){
    const out = [];
    document.querySelectorAll("main > .tab.active, main .tab.active .stat-content.active").forEach(sec => {
      sec.querySelectorAll(":scope > .filters:not(.fr-keep)").forEach(f => out.push(f));
    });
    const sh = document.getElementById("shared");
    if (sh && !sh.hidden) sh.querySelectorAll(":scope > .filters:not(.fr-keep)").forEach(f => { if (!f.hidden) out.unshift(f); });
    ["c-quick", "ch-types"].forEach(id => { const q = document.getElementById(id); if (q && q.closest(".tab.active")) out.push(q); });
    return [...new Set(out)];
  }
  function mount(){
    restore();
    document.body.classList.remove("fr-boot");
    const onSettings = document.querySelector("main > .tab.active")?.id === "tab-settings";
    document.body.classList.toggle("fr-settings", active() && onSettings);
    if (!active() || onSettings) return;
    candidates().forEach(n => { seen.add(n); park(n, body); keepOut(n, moved[moved.length - 1][1]); });
    body.dataset.tab = typeof activeDataTab === "function" ? activeDataTab() : "";
    try { window.__statsChatMount && window.__statsChatMount(); } catch (e) {}
    ["ult-toggle", "vk-toggle", "lvl-toggle"].forEach(id => { const b = document.getElementById(id); if (b && b.parentNode !== top) park(b, top); });
    // «Вид таблицы» в шторку больше не добавляется: те же настройки есть в меню «Столбцы» у каждой таблицы.
  }
  function apply(){
    const act = active();
    document.body.classList.toggle("filters-right", act);
    document.body.classList.toggle("fr-collapsed", act && collapsed);
    // Булавка: закреплена — шторка открыта и сдвигает страницу; откреплена — узкая полоска, выезжает при наведении.
    const tg = dr.querySelector("#fd-toggle");
    tg.innerHTML = collapsed ? FD_PIN_OFF : FD_PIN_ON;
    tg.title = collapsed ? "Закрепить шторку открытой" : "Открепить: шторка свернётся и будет выезжать при наведении";
    tg.classList.toggle("pinned", !collapsed); tg.setAttribute("aria-pressed", collapsed ? "false" : "true");
    if (!collapsed) dr.classList.remove("fr-peek");
    if (act) mount(); else { restore(); document.body.classList.remove("fr-boot"); }
    setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} }, 250);
  }
  const save = () => { try { localStorage.setItem(KEY, on ? "1" : "0"); localStorage.setItem(KEY_C, collapsed ? "1" : "0"); } catch (e) {} };
  // Перед сменой вкладки возвращаем фильтры на место (до того, как сайт запомнит их состояние), потом забираем фильтры новой вкладки.
  window.addEventListener("click", e => {
    if (!active()) return;
    const t = e.target.closest && e.target.closest("nav button, .nav-sheet button, [data-gtab], #stats-subnav [data-stats-view], [data-hub-go], [data-open-profile]");
    if (!t) return;
    document.body.classList.add("fr-boot"); // старые фильтры не мелькают по центру, пока идёт перенос
    restore();
    setTimeout(mount, 60);
  }, true);
  window.addEventListener("popstate", () => { if (active()) { restore(); setTimeout(mount, 80); } });
  dr.querySelector("#fd-toggle").addEventListener("click", () => { collapsed = !collapsed; save(); apply(); });
  // Выезд при наведении. Пока открыт выпадающий список из шторки, она не сворачивается.
  // Сворачиваем по реальному положению курсора: как только он ушёл левее шторки и не стоит
  // на всплывающем меню из неё — через мгновение шторка уезжает. Открытые внутри меню закрываем.
  let peekT = 0;
  const POPS = ".msel-pop, .hc-pop, .ss, .opt-list, .pop";
  const overPopup = t => { const p = t && t.closest && t.closest(POPS); return !!p && !dr.contains(p); };
  function peekClose(){
    clearTimeout(peekT); peekT = 0;
    dr.querySelectorAll("details[open]").forEach(d => d.removeAttribute("open"));
    dr.classList.remove("fr-peek");
  }
  dr.addEventListener("mouseenter", () => { clearTimeout(peekT); peekT = 0; if (collapsed && active()) dr.classList.add("fr-peek"); });
  document.addEventListener("pointermove", e => {
    if (!dr.classList.contains("fr-peek")) return;
    const outside = e.clientX < dr.getBoundingClientRect().left - 2 && !overPopup(e.target);
    if (outside) { if (!peekT) peekT = setTimeout(peekClose, 240); }
    else if (peekT) { clearTimeout(peekT); peekT = 0; }
  }, {passive:true});
  document.documentElement.addEventListener("mouseleave", () => { if (dr.classList.contains("fr-peek") && !peekT) peekT = setTimeout(peekClose, 400); });
  dr.querySelector("#fd-rail").addEventListener("click", () => { collapsed = false; save(); apply(); });
  mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
  // Перерисовка вкладки может создать новые панели фильтров — они сразу переезжают в шторку,
  // а не остаются «лишними кнопками» по центру до следующего обновления.
  // Подхватываются только по-настоящему новые панели (которых шторка ещё не видела), и не чаще 3 раз за 2 секунды —
  // так шторка никогда не зациклится, перекладывая один и тот же блок.
  let moRaf = 0; const hits = [];
  const mainEl = document.querySelector("main");
  if (mainEl) new MutationObserver(() => {
    if (moRaf || !active()) return;
    moRaf = requestAnimationFrame(() => {
      moRaf = 0;
      if (!active() || document.querySelector("main > .tab.active")?.id === "tab-settings") return;
      const fresh = candidates().filter(n => !dr.contains(n) && !seen.has(n)); if (!fresh.length) return;
      const now = Date.now(); while (hits.length && now - hits[0] > 2000) hits.shift(); if (hits.length >= 3) return; hits.push(now);
      mount();
    });
  }).observe(mainEl, {childList:true, subtree:true});
  window.__filterDrawer = {mount, restore, apply, rekeep};
  setTimeout(apply, 0);
})();
