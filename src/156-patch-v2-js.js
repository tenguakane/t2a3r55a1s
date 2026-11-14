
(function(){
  /* Где какой переключатель бесполезен (по текущей вкладке; в «Статистике» — по виду «Участники» / «Чаты») */
  const NO_ULT = new Set(["hub", "reactions", "events", "time", "achievements", "birthdays", "settings"]);
  const NO_LVL = new Set(["hub", "profile", "compare", "charts", "months", "days", "vk", "settings", "chats"]);
  function sync(){
    // Берём реально открытый раздел: «Время» и «Дни рождения» живут в группе «Хаб», и кнопка меню у них не та же, что у раздела.
    const sec = document.querySelector("main > .tab.active"); let v = sec ? sec.id.replace(/^tab-/, "") : "";
    if (v === "stats") { const sc = sec.querySelector(".stat-content.active"); v = sc ? sc.id.replace(/^tab-/, "") : "participants"; }
    const b = document.body, nu = NO_ULT.has(v), nl = NO_LVL.has(v);
    if (b.classList.contains("no-ult") !== nu) b.classList.toggle("no-ult", nu);
    if (b.classList.contains("no-lvl") !== nl) b.classList.toggle("no-lvl", nl);
  }
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(sync, 30); };
  document.addEventListener("click", () => { later(); setTimeout(sync, 300); }, true);
  const nav = document.querySelector("nav"); if (nav) new MutationObserver(later).observe(nav, {attributes:true, attributeFilter:["class"], subtree:true});
  const sub = document.getElementById("stats-subnav"); if (sub) new MutationObserver(later).observe(sub, {attributes:true, attributeFilter:["class"], subtree:true});
  window.addEventListener("hashchange", later);
  sync();

  /* «Копировать» у таблицы прошедших юбилеев */
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest("#copy-milestones-past-image")) { try { copyTableImage("milestone-past-table", "Прошедшие юбилеи участия", "copy-milestones-past-status"); } catch (err) {} }
  });

  /* «Матрица»: «Колонки» (дни / недели / годы) и чипы управляют прежними флажками — вся логика остаётся прежней */
  (function(){
    const $ = id => document.getElementById(id);
    const chips = [...document.querySelectorAll(".dm-chip")], cols = [...document.querySelectorAll("#dm-cols button")];
    if (!chips.length) return;
    function syncDm(){
      chips.forEach(c => { const i = $(c.dataset.for); if (!i) return; c.classList.toggle("on", !!i.checked); c.setAttribute("aria-pressed", String(!!i.checked)); c.disabled = !!i.disabled; });
      const y = !!$("dm-years")?.checked, w = !!$("dm-week")?.checked, yr = !!$("dm-year")?.checked;
      cols.forEach(b => { const k = b.dataset.c; b.classList.toggle("active", k === "years" ? y : k === "weeks" ? (!y && !yr && w) : (!y && !yr && !w)); });
    }
    const later = () => { setTimeout(syncDm, 60); setTimeout(syncDm, 450); };
    chips.forEach(c => c.addEventListener("click", () => { const i = $(c.dataset.for); if (i && !i.disabled) i.click(); syncDm(); }));
    cols.forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.c, years = $("dm-years"), week = $("dm-week");
      if (k === "years") { if (years && !years.checked) years.click(); }
      else {
        if (years && years.checked) years.click();
        setTimeout(() => { if (!week) return; if ((k === "weeks") !== week.checked && !week.disabled) week.click(); syncDm(); }, 350);
      }
      syncDm();
    }));
    document.addEventListener("click", later, true); document.addEventListener("change", later, true);
    setTimeout(syncDm, 800); setTimeout(syncDm, 2500); syncDm();
  })();

  const D = window.__I18N_DICT;
  if (D) Object.assign(D, {
    "Прошедшие юбилеи участия":["Past membership anniversaries","Минулі ювілеї участі","Мінулыя юбілеі ўдзелу","Өткен қатысу мерейтойлары","Anniversaires passés de participation","Minione jubileusze uczestnictwa"],
    "Последние 20 уже наступивших юбилеев: годовщины и круглые значения дней участия.":["The last 20 anniversaries that have already happened: yearly and round-number day milestones.","Останні 20 ювілеїв, що вже настали: річниці та круглі значення днів участі.","Апошнія 20 юбілеяў, якія ўжо надышлі: гадавіны і круглыя значэнні дзён удзелу.","Соңғы 20 өткен мерейтой: жылдықтар мен қатысу күндерінің дөңгелек мәндері.","Les 20 derniers anniversaires déjà passés : anniversaires annuels et jours ronds.","Ostatnie 20 jubileuszy, które już minęły: rocznice i okrągłe liczby dni."],
    "Прошло":["Ago","Минуло","Прайшло","Өтті","Il y a","Minęło"]
  });
})();
