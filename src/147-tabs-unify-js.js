
/* Переключатель «Таблица | Карточки» поверх прежней кнопки «.tv-btn»: прежняя кнопка скрыта и продолжает работать как раньше
   (хранит режим, меняет таблицу), а новые пункты лишь нажимают её и повторяют её состояние. */
(() => {
  "use strict";
  const LBL = {table: "Таблица", cards: "Карточки"};
  let queued = false;

  function build(btn){
    const seg = document.createElement("div");
    seg.className = "seg tv-seg"; seg.setAttribute("role", "tablist"); seg.setAttribute("aria-label", "Как показывать: таблицей или карточками");
    seg.dataset.noExport = "1";
    seg.innerHTML = `<button type="button" role="tab" data-tv-set="table">${LBL.table}</button><button type="button" role="tab" data-tv-set="cards">${LBL.cards}</button>`;
    seg.addEventListener("click", e => {
      const b = e.target.closest("[data-tv-set]"); if (!b) return;
      if ((btn.dataset.tvMode || "table") !== b.dataset.tvSet) btn.click();
    });
    btn.dataset.tuSeg = "1";
    btn._tuSeg = seg;
    new MutationObserver(() => sync(btn)).observe(btn, {attributes: true, attributeFilter: ["data-tv-mode", "hidden"]});
    btn.before(seg);
    sync(btn);
  }
  function sync(btn){
    const seg = btn._tuSeg; if (!seg) return;
    const mode = btn.dataset.tvMode || "table";
    if (seg.hidden !== btn.hidden) seg.hidden = btn.hidden;
    seg.querySelectorAll("[data-tv-set]").forEach(b => {
      const on = b.dataset.tvSet === mode;
      if (b.classList.contains("active") !== on) b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  function scan(){
    queued = false;
    document.querySelectorAll("main .tv-btn").forEach(btn => {
      if (!btn._tuSeg) build(btn);
      else if (btn.previousElementSibling !== btn._tuSeg) btn.before(btn._tuSeg); // кнопку переставили — переключатель идёт за ней
    });
    // «Таблица» у кнопки настройки таблицы звучала так же, как режим просмотра, — теперь «Столбцы»
    document.querySelectorAll("main .st-hc-lbl").forEach(s => { if (s.textContent === "Таблица") s.textContent = "Столбцы"; });
    document.querySelectorAll("main .hc-bar .hc-btn").forEach(b => b.childNodes.forEach(n => { if (n.nodeType === 3 && n.nodeValue.trim() === "Таблица") n.nodeValue = "Столбцы"; }));
  }
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(scan); } };
  const main = document.querySelector("main");
  if (main) new MutationObserver(later).__hub(main);
  later(); setTimeout(later, 600); setTimeout(later, 2000);

  // «Параметры»: галочки показываются сразу, меню раскрывать не нужно — держим его открытым
  const openOpts = () => document.querySelectorAll("#filter-drawer details.opt-pop").forEach(d => { if (!d.open) d.open = true; });
  const dr = document.getElementById("filter-drawer");
  if (dr) new MutationObserver(openOpts).observe(dr, {childList: true, subtree: true});
  openOpts();

  // «Статистика»: выбор чата живёт в верхней строке, а не в шторке
  let chatHome = null;
  window.__statsChatHome = () => { const f = document.getElementById("f-chat"); if (chatHome && chatHome.parentNode) { if (f) chatHome.replaceWith(f); else chatHome.remove(); } chatHome = null; };
  window.__statsChatMount = () => {
    const f = document.getElementById("f-chat"), q = document.getElementById("stats-quick"), fb = document.getElementById("fd-body");
    if (!f || !q || !fb || chatHome || !fb.contains(f)) return;
    if (!document.getElementById("tab-stats")?.classList.contains("active")) return;
    chatHome = document.createComment("stats-chat"); f.before(chatHome);
    (q.querySelector(".sq-range") || q.querySelector(".sq-date")).after(f);
  };
  window.__statsChatMount();

  // Подпись таблицы встаёт над самой таблицей: ширина и положение — как у таблицы
  const tRO = new ResizeObserver(() => tLater()), tSeen = new WeakSet();
  let tq = 0;
  function tBind(){
    tq = 0;
    document.querySelectorAll("main .table-export-row").forEach(row => {
      let n = row.nextElementSibling;
      while (n && !n.classList.contains("wrap") && (n.matches(".status, .excluded-rows-host, #quiet-box, .hc-bar, [hidden]") || !n.offsetParent)) n = n.nextElementSibling;
      if (!n || !n.classList.contains("wrap") || !n.offsetParent) { if (row.dataset.tw) { row.removeAttribute("data-tw"); row.style.removeProperty("--tw"); } return; }
      if (!tSeen.has(n)) { tSeen.add(n); tRO.observe(n); }
      const px = Math.round(n.getBoundingClientRect().width);
      if (px > 0) { row.style.setProperty("--tw", px + "px"); row.dataset.tw = "1"; }
    });
  }
  function tLater(){ if (!tq) tq = requestAnimationFrame(tBind); }
  if (main) new MutationObserver(tLater).observe(main, {childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"]});
  addEventListener("resize", tLater);
  tLater(); setTimeout(tLater, 600); setTimeout(tLater, 2000);
})();
