
/* ===================== Цветные метки фильтров ===================== */
(function(){
  const KEY = "chatstats.filterColors.v1";
  const RULES = [
    ["amount", /^участники на карте/],
    ["period", /^(режим|дата$|месяц|месяцы|год$|с$|по$|быстрый выбор|период|итоги|начало|конец|сторис|обновлять)/],
    ["scope", /^(выделить|чат$|группировать|строки|участник$|участники на графике|рекорды|что сравниваем|сравнить|марафон|добавить|поиск)/],
    ["what", /^(показатель|вид|значения|места|прогноз|события|сортировка|порядок|дни)/],
    ["amount", /^(количество|участники|чаты|топ|малоактивные|шкала|потолок|порог|тихий)/],
    ["look", /^(оформление|цвет|форма|тип фона|заливка|лучший результат)/],
    ["export", /^(изображение|экспорт|копировать)/],
    ["data", /^(импорт|база|адрес|управление|название|дата внесения)/],
  ];
  let on = true;
  try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  const catOf = t => { t = String(t || "").trim().toLowerCase(); for (const [c, re] of RULES) if (re.test(t)) return c; return ""; };
  function tag(root){
    (root || document).querySelectorAll(".filters .field:not([data-fcat])").forEach(f => {
      const lab = f.querySelector(":scope > label"); const c = catOf(lab ? lab.textContent : "") || (f.querySelector(".seg") ? "what" : "");
      if (c) f.dataset.fcat = c;
    });
    (root || document).querySelectorAll(".filters .checkline:not([data-fcat])").forEach(l => { l.dataset.fcat = "opts"; });
    (root || document).querySelectorAll(".filters .opt-pop:not([data-fcat])").forEach(p => { p.dataset.fcat = "opts"; });
    (root || document).querySelectorAll(".filters .table-export-actions:not([data-fcat])").forEach(p => { p.dataset.fcat = "export"; });
  }
  function apply(){
    document.body.classList.toggle("filter-colors", on && !window.__TABLO);
    const c = document.getElementById("set-filter-colors"); if (c) c.checked = on;
    const lg = document.getElementById("fcat-legend"); if (lg) lg.hidden = !on;
    if (on) tag();
  }
  document.addEventListener("change", e => { if (e.target.id === "set-filter-colors") { on = e.target.checked; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {} apply(); } });
  // Фильтры, которые дорисовываются позже (профиль, марафоны, селфи…), тоже получают метки.
  let t = 0;
  new MutationObserver(() => { if (!on) return; clearTimeout(t); t = setTimeout(() => tag(), 120); }).__hub(document.body);
  apply();
})();
