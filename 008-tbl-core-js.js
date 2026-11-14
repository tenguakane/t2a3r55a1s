
/* Единый построитель таблиц: описание столбцов → готовая разметка.
   Сортировка, закрепление строк, перенос столбцов, карточный вид на телефоне и копирование картинкой работают по разметке (th/td внутри .wrap),
   поэтому таблица, собранная здесь, получает все эти возможности автоматически.
   window.__tbl.html({
     id: "bd-table",                  // id таблицы (необязательно)
     attrs: {"data-copy-title": ""},  // любые другие атрибуты <table>
     cols: [{h: "Участник",           // заголовок (готовый HTML)
             align: "left",           // выравнивание заголовка и ячеек: "left" | "center"
             tdAlign: "center",       // выравнивание только ячеек (если отличается от заголовка)
             cls: "ev-rank",          // класс ячейки
             style: "color:red",      // дополнительный стиль ячейки
             td: (row, i, rows) => "<содержимое ячейки>"}],
     rows: [...],
     rowClass: (row, i) => "класс",   // null/undefined — без атрибута class; "" — class=""
     rowStyle: (row, i) => "--a:1",   // стиль строки
     wrap: true                       // обернуть в <div class="wrap"> (по умолчанию да)
   }) → строка HTML. Содержимое ячеек и заголовков — готовый HTML: экранировать данные нужно там, где они подставляются. */
(function(){
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const al = a => a === "left" ? "text-align:left" : a === "center" ? "text-align:center" : "";
  const style = (...parts) => { const v = parts.filter(Boolean).join(";"); return v ? ` style="${v}"` : ""; };
  function html(spec){
    const cols = (spec.cols || []).filter(c => c && c.when !== false), rows = spec.rows || [];
    const attrs = (spec.id ? ` id="${esc(spec.id)}"` : "") + Object.keys(spec.attrs || {}).map(k => ` ${k}="${esc(spec.attrs[k])}"`).join("");
    const head = "<tr>" + cols.map(c => `<th${style(al(c.align))}>${c.h}</th>`).join("") + "</tr>";
    const body = rows.map((r, i) => {
      const rc = spec.rowClass ? spec.rowClass(r, i) : null, rs = spec.rowStyle ? spec.rowStyle(r, i) : "";
      return `<tr${rs ? ` style="${rs}"` : ""}${rc == null ? "" : ` class="${esc(rc)}"`}>` + cols.map(c => `<td${c.cls ? ` class="${c.cls}"` : ""}${style(al(c.tdAlign || c.align), c.style)}>${c.td(r, i, rows)}</td>`).join("") + "</tr>";
    }).join("");
    const t = `<table${attrs}><thead>${head}</thead><tbody>${body}</tbody></table>`;
    return spec.wrap === false ? t : `<div class="wrap">${t}</div>`;
  }
  window.__tbl = {html};
})();
