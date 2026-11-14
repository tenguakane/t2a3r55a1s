
/* ===================== Эксперименты: интерактивные графики ===================== */
(function(){
  const T = window.__tx;
  const KEY = "chatstats.exp.v1";
  const LIST = [
    {id:"pinrows", t:"Закрепление строк в таблицах", d:"Наведи на строку и нажми на булавку слева: строка поднимется наверх таблицы и останется там при сортировке. Закрепления хранятся в браузере."},
    {id:"colmove", t:"Перемещение столбцов", d:"Потяни за значок ⋮⋮ в заголовке столбца и перенеси его на новое место. Порядок запоминается; двойной клик по значку возвращает исходный порядок."},
    {id:"legend", t:"Клик по легенде: оставить одну линию", d:"Два быстрых клика по названию серии (или клик с Shift) оставляют на графике только её; повторное действие возвращает все линии. Одиночный клик, как и раньше, скрывает и показывает линию."},
    {id:"anime", t:"Режим «Аниме» для графиков", d:"Над линейным графиком появляется кнопка «Аниме»: график рисуется заново слева направо, а рядом бегут дата и значения лидеров. Есть скорость ×1, ×2, ×4."},
    {id:"range", t:"Выделение периода на графике", d:"Shift + перетаскивание по линейному графику — сводка за выбранный отрезок: сумма, среднее, пик, сравнение с предыдущим отрезком."},
    {id:"pins", t:"Закреплённые точки", d:"Клик по линейному графику закрепляет дату. Вторая точка показывает разницу между ними по каждой линии."},
    {id:"drill", t:"Разбор дня по клику", d:"Клик по ячейке календаря открывает панель: итоги дня и кто сколько написал."},
    {id:"export", t:"Экспорт выбранного периода в CSV", d:"В карточке выделения периода (Shift + перетаскивание) появляется кнопка «CSV»."},
    {id:"notes", t:"Заметки к закреплённым точкам", d:"В карточке закреплённых дат появляется поле для заметки. Заметки хранятся в браузере и подставляются при повторном закреплении той же даты."},
  ];
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  const on = id => !!st[id];
  window.EXP = {on, list:LIST};
  const syncBody = () => { document.body.classList.toggle("exp-drill", on("drill")); }; syncBody();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function buildUI(){
    const box = document.getElementById("exp-list"); if (!box) return;
    box.innerHTML = LIST.map(f => `<label class="checkline exp-line" title="${esc(T(f.d))}"><input type="checkbox" data-exp="${f.id}"${on(f.id) ? " checked" : ""}><span><b>${esc(T(f.t))}</b><small>${esc(T(f.d))}</small></span></label>`).join("");
  }
  document.addEventListener("change", e => {
    const i = e.target.closest && e.target.closest("input[data-exp]"); if (!i) return;
    st[i.dataset.exp] = i.checked; save(); closeAll(); syncBody();
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#exp-all-on, #exp-all-off"); if (!b) return;
    LIST.forEach(f => { st[f.id] = b.id === "exp-all-on"; }); save(); buildUI(); closeAll(); syncBody();
  });
  buildUI();

  /* ---------- общее: карточка ---------- */
  let card = null;
  function closeAll(){ clearSel(); clearPins(); if (card) { card.remove(); card = null; } }
  function showCard(html, x, y, cls){
    if (card) card.remove();
    card = document.createElement("div"); card.className = "exp-card " + (cls || ""); card.setAttribute("data-no-export", "1");
    card.innerHTML = `<button type="button" class="exp-x" aria-label="${T("Закрыть")}">×</button>` + html;
    document.body.appendChild(card);
    if (x != null) {
      const w = card.offsetWidth, h = card.offsetHeight;
      card.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px"; card.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + "px";
    }
    return card;
  }
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest(".exp-x")) closeAll(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });
  const svgPt = (svg, e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const xAt = (M, p) => {
    const span = (M.xMax - M.xMin) || 1;
    let x = Math.max(M.xMin, Math.min(M.xMax, Math.round(M.xMin + (p.x - M.L) / M.span * span)));
    if (M.xs && M.xs.length && x <= M.xs[M.xs.length - 1] && !M.series.some(s => s.v.has(x))) x = M.xs.reduce((b, c) => Math.abs(c - x) < Math.abs(b - x) ? c : b, M.xs[0]);
    return x;
  };
  const pxOf = (M, x) => M.L + (x - M.xMin) / ((M.xMax - M.xMin) || 1) * M.span;
  const svgNS = "http://www.w3.org/2000/svg";
  const overlay = (svg, id) => { let g = svg.querySelector("#" + id); if (!g) { g = document.createElementNS(svgNS, "g"); g.id = id; g.setAttribute("data-no-export", "1"); g.setAttribute("pointer-events", "none"); svg.appendChild(g); } return g; };
  const vf = M => M.valFmt || (v => fmt(Math.round(v)));

  /* ---------- 1. Выделение периода ---------- */
  let sel = null;
  function clearSel(){ sel = null; document.querySelectorAll("#exp-sel").forEach(n => n.remove()); }
  function drawSel(){
    if (!sel) return; const M = lineMeta, svg = sel.svg; if (!M || !svg.isConnected) return;
    const g = overlay(svg, "exp-sel"), a = pxOf(M, Math.min(sel.a, sel.b)), b = pxOf(M, Math.max(sel.a, sel.b));
    g.innerHTML = `<rect x="${a}" y="${M.T}" width="${Math.max(2, b - a)}" height="${M.B - M.T}" fill="#7aa2f7" fill-opacity=".16" stroke="#7aa2f7" stroke-opacity=".8" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  }
  document.addEventListener("pointerdown", e => {
    if (!on("range") || !e.shiftKey || e.button !== 0) return;
    const t = e.target; if (!t || t.id !== "hov" || !lineMeta) return;
    e.stopPropagation(); e.preventDefault();
    if (card) { card.remove(); card = null; }
    const svg = t.ownerSVGElement; clearSel();
    const x = xAt(lineMeta, svgPt(svg, e)); sel = {svg, a:x, b:x, e0:e}; drawSel();
    try { t.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);
  document.addEventListener("pointermove", e => {
    if (!sel || !lineMeta) return;
    sel.b = xAt(lineMeta, svgPt(sel.svg, e)); drawSel(); e.stopPropagation();
  }, true);
  document.addEventListener("pointerup", e => {
    if (!sel) return;
    const M = lineMeta; if (!M) { clearSel(); return; }
    const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b); sel.moved = true;
    if (a === b) { clearSel(); return; }
    const f = vf(M), len = b - a + 1, items = M.series.map(s => {
      let sum = 0, n = 0, mx = -Infinity, mxx = a, psum = 0, pn = 0;
      for (let x = a; x <= b; x++) { const v = s.v.get(x); if (v === undefined) continue; sum += v; n++; if (v > mx) { mx = v; mxx = x; } }
      for (let x = a - len; x < a; x++) { const v = s.v.get(x); if (v !== undefined) { psum += v; pn++; } }
      return {s, sum, n, avg:n ? sum / n : 0, mx, mxx, psum, pn};
    }).filter(q => q.n).sort((x, y) => (M.valFmt ? y.avg - x.avg : y.sum - x.sum));
    if (!items.length) { clearSel(); return; }
    const additive = !M.valFmt;
    const rowsH = items.slice(0, 12).map(q => {
      const d = additive && q.pn ? (q.sum - q.psum) / (q.psum || 1) : null;
      return `<div class="exp-r"><span><i style="background:${q.s.c}"></i>${esc(q.s.name)}</span>${additive ? `<span>${fmt(Math.round(q.sum))}</span>` : ""}<span>${f(q.avg)}</span><span title="${esc(M.xLabel(q.mxx))}">${f(q.mx)}</span>${additive ? `<span>${d === null ? "—" : `<span class="${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(d * 100))}%</span>`}</span>` : ""}</div>`;
    }).join("");
    const total = additive ? items.reduce((s2, q) => s2 + q.sum, 0) : null;
    const html = `<h4>${esc(M.xLabel(a))} — ${esc(M.xLabel(b))}</h4><div class="exp-sub">${T.ru ? len + " " + (len === 1 ? "точка" : "точек") : T("Точек: {1}", len)}${additive ? T(" · всего {1}", fmt(Math.round(total))) : ""}${items.length > 12 ? T(" · показаны 12 из {1}", items.length) : ""}</div>
      <div class="exp-grid" style="--expc:${additive ? "72px 64px 56px 62px" : "64px 56px"}"><div class="exp-r exp-h"><span></span>${additive ? "<span>" + T("Сумма") + "</span>" : ""}<span>${T("Среднее")}</span><span title="${T("Максимум за период (дата — в подсказке)")}">${T("Пик")}</span>${additive ? "<span>" + T("К пред.") + "</span>" : ""}</div>${rowsH}</div>
      <div class="exp-actions"><button type="button" class="mini" id="exp-copy">${T("Копировать")}</button>${on("export") ? '<button type="button" class="mini" id="exp-csv">CSV</button>' : ""}<button type="button" class="mini exp-x2">${T("Закрыть")}</button></div>`;
    const r = sel.svg.getBoundingClientRect();
    const c = showCard(html, e.clientX + 14, Math.max(8, e.clientY - 40), "exp-wide");
    c.querySelector(".exp-x2").onclick = closeAll;
    c.querySelector("#exp-copy").onclick = ev => {
      const txt = `${M.xLabel(a)} — ${M.xLabel(b)}\n` + items.map(q => additive ? T("{1}: сумма {2}, среднее {3}, пик {4} ({5})", q.s.name, fmt(Math.round(q.sum)), f(q.avg), f(q.mx), M.xLabel(q.mxx)) : T("{1}: среднее {2}, пик {3} ({4})", q.s.name, f(q.avg), f(q.mx), M.xLabel(q.mxx))).join("\n");
      try { navigator.clipboard.writeText(txt); ev.target.textContent = T("Скопировано"); } catch (err) {}
    };
    const cb = c.querySelector("#exp-csv");
    if (cb) cb.onclick = () => {
      const q = v => '"' + String(v).replace(/"/g, '""') + '"', names = M.series.map(s => s.name);
      let csv = "\ufeff" + [q(T("Дата")), ...names.map(q)].join(";") + "\n";
      for (let x = a; x <= b; x++) csv += [q(M.xLabel(x)), ...M.series.map(s => { const v = s.v.get(x); return v === undefined ? "" : String(v).replace(".", ","); })].join(";") + "\n";
      const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"})), l = document.createElement("a");
      l.href = url; l.download = `period_${a}_${b}.csv`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    };
    sel = null;
  }, true);

  /* ---------- 2. Закреплённые точки ---------- */
  let pins = [];
  function clearPins(){ pins = []; document.querySelectorAll("#exp-pins").forEach(n => n.remove()); }
  function drawPins(svg){
    const M = lineMeta; if (!M) return; const g = overlay(svg, "exp-pins");
    g.innerHTML = pins.map((x, i) => { const px = pxOf(M, x); return `<line x1="${px}" y1="${M.T}" x2="${px}" y2="${M.B}" stroke="#ffd166" stroke-width="2" stroke-dasharray="6 4"/><circle cx="${px}" cy="${M.T}" r="9" fill="#ffd166"/><text x="${px}" y="${M.T + 4.5}" text-anchor="middle" font-size="13" font-weight="800" fill="#1a1a1a">${i + 1}</text>`; }).join("");
  }
  function pinCard(svg, e){
    const M = lineMeta, f = vf(M), [a, b] = pins;
    const val = (s, x) => s.v.get(x);
    const items = M.series.map(s => ({s, v1:val(s, a), v2:b === undefined ? undefined : val(s, b)})).filter(q => q.v1 !== undefined || q.v2 !== undefined).sort((x, y) => (y.v2 ?? y.v1 ?? 0) - (x.v2 ?? x.v1 ?? 0)).slice(0, 12);
    const rowsH = items.map(q => {
      const diff = q.v1 !== undefined && q.v2 !== undefined ? q.v2 - q.v1 : null, pct = diff !== null && q.v1 ? diff / q.v1 : null;
      return `<div class="exp-r"><span><i style="background:${q.s.c}"></i>${esc(q.s.name)}</span><span>${q.v1 === undefined ? "—" : f(q.v1)}</span>${b === undefined ? "" : `<span>${q.v2 === undefined ? "—" : f(q.v2)}</span><span>${diff === null ? "—" : `<span class="${diff >= 0 ? "up" : "down"}">${diff >= 0 ? "+" : "−"}${f(Math.abs(diff))}${pct === null ? "" : ` (${Math.abs(Math.round(pct * 100))}%)`}</span>`}</span>`}</div>`;
    }).join("");
    const r = svg.getBoundingClientRect();
    const c = showCard(`<h4>${esc(M.xLabel(a))}${b === undefined ? "" : ` → ${esc(M.xLabel(b))}`}</h4><div class="exp-sub">${b === undefined ? T("Кликни по второй дате — покажу разницу") : T.ru ? `Между точками: ${Math.abs(b - a)} ${Math.abs(b - a) === 1 ? "шаг" : "шагов"}` : T("Шагов между точками: {1}", Math.abs(b - a))}</div><div class="exp-grid" style="--expc:${b === undefined ? "70px" : "62px 62px 120px"}"><div class="exp-r exp-h"><span></span><span>1</span>${b === undefined ? "" : "<span>2</span><span>" + T("Разница") + "</span>"}</div>${rowsH}</div><div class="exp-actions"><button type="button" class="mini exp-x2">${T("Сбросить")}</button></div>`, null, null, "exp-side");
        if (on("notes")) {
      const NK = "chatstats.exp.notes.v1"; let NT = {}; try { NT = JSON.parse(localStorage.getItem(NK) || "{}") || {}; } catch (err) {}
      const pts = b === undefined ? [a] : [a, b], nb = document.createElement("div"); nb.className = "exp-notes";
      nb.innerHTML = pts.map(x => `<label class="exp-note"><small>📝 ${esc(M.xLabel(x))}</small><input type="text" maxlength="140" placeholder="${T("Заметка к этой дате")}" data-k="${esc(($("c-type") ? $("c-type").value : "") + "|" + M.xLabel(x))}"></label>`).join("");
      nb.querySelectorAll("input").forEach(inp => { inp.value = NT[inp.dataset.k] || ""; inp.oninput = () => { if (inp.value) NT[inp.dataset.k] = inp.value; else delete NT[inp.dataset.k]; try { localStorage.setItem(NK, JSON.stringify(NT)); } catch (err) {} }; });
      const ac = c.querySelector(".exp-actions"); if (ac) ac.before(nb);
    }
    c.querySelector(".exp-x2").onclick = closeAll;
  }
  let down = null;
  document.addEventListener("pointerdown", e => { down = {x:e.clientX, y:e.clientY}; }, true);
  document.addEventListener("click", e => {
    if (!on("pins") || e.shiftKey || !lineMeta) return;
    const t = e.target; if (!t || t.id !== "hov") return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const svg = t.ownerSVGElement, x = xAt(lineMeta, svgPt(svg, e));
    if (pins.length >= 2) pins = [];
    pins.push(x); drawPins(svg); pinCard(svg, e);
  });

  /* ---------- 3. Разбор дня ---------- */
  document.addEventListener("click", e => {
    if (!on("drill")) return;
    const el = e.target.closest && e.target.closest("#c-out [data-day]"); if (!el) return;
    const date = el.dataset.day, d = parseDate(date), wd = T(["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"][d.getUTCDay()]);
    const hist = allRows || rows, chat = $("chat") ? $("chat").value : "";
    const per = new Map(), tot = {msgs:0, stick:0, voice:0, video:0};
    pick(hist, chat).forEach(x => {
      if (String(x[F.date] ?? "").slice(0, 10) !== date) return;
      const k = String(x[F.userId] ?? x[F.name]); if (!isVisibleUser(k)) return;
      let u = per.get(k); if (!u) per.set(k, u = {k, n:who(x), msgs:0, stick:0, voice:0, video:0});
      Object.keys(tot).forEach(m => { const v = Number(g(x, m)) || 0; u[m] += v; tot[m] += v; });
    });
    const metric = $("metric") && tot[$("metric").value] !== undefined ? $("metric").value : "msgs";
    const list = [...per.values()].filter(u => u[metric] > 0).sort((a, b) => b[metric] - a[metric]);
    const max = list.length ? list[0][metric] : 1;
    const html = `<h4>${formatDateRu(d)}, ${wd}</h4><div class="exp-sub">${Object.keys(tot).map(m => `${MLBL[m].toLowerCase()}: <b>${fmt(tot[m])}</b>`).join(" · ")}</div>
      <div class="exp-sub" style="margin-top:10px">${T("Кто писал · {1} ({2})", esc(MLBL[metric].toLowerCase()), list.length)}</div>
      <div class="exp-bars">${list.slice(0, 15).map(u => { let c = "#7aa2f7"; try { c = getStyle("u", u.k).c[0] || c; } catch (err) {} return `<div class="exp-bar"><span>${esc(u.n)}</span><i style="width:${Math.max(3, u[metric] / max * 100).toFixed(0)}%;background:${c}"></i><b>${fmt(u[metric])}</b></div>`; }).join("") || '<div class="exp-sub">' + T("В этот день данных нет") + '</div>'}</div>
      <div class="exp-actions"><button type="button" class="mini exp-x2">${T("Закрыть")}</button></div>`;
    const c = showCard(html, null, null, "exp-side exp-drill"); c.querySelector(".exp-x2").onclick = closeAll;
  });

  /* пересборка графика сбрасывает наложения */
  const co = document.getElementById("c-out");
  if (co) new MutationObserver(() => { if (pins.length || sel) { clearPins(); clearSel(); if (card && !card.classList.contains("exp-drill")) { card.remove(); card = null; } } }).observe(co, {childList:true});
})();
