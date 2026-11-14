
/* ===================== Сравнение радаров участников ===================== */
(function(){
  const PERIODS = [["365", "365 дней"], ["year", "Этот год"], ["all", "Всё время"]];
  const periodText = () => ({"365":"за последние 365 дней", year:"за этот год", all:"за всё время"}[radarPeriod]);
  let LAST = null;

  function model(){
    const all = radarStats();
    const ma = all.find(x => x.k === String(CMP.a)), mb = all.find(x => x.k === String(CMP.b));
    const nA = NAMES[CMP.a] || `ID ${CMP.a}`, nB = NAMES[CMP.b] || `ID ${CMP.b}`;
    const [cA, cB] = cmpPairColors(getStyle("u", CMP.a).c[0], getStyle("u", CMP.b).c[0]);
    if (!ma || !mb || all.length < 3) return {ok:false, nA, nB, missing:[!ma ? nA : "", !mb ? nB : ""].filter(Boolean), n:all.length};
    const pct = (me, ax) => { const v = me[ax], others = all.filter(x => x.k !== me.k); if (!others.length) return .5; const lo = others.filter(x => x[ax] < v).length, eq = others.filter(x => x[ax] === v).length; return (lo + eq * .5) / others.length; };
    const P = RADAR_AXES.map(a => ({...a, va:ma[a.k], vb:mb[a.k], pa:pct(ma, a.k), pb:pct(mb, a.k)}));
    let sa = 0, sb = 0; P.forEach(a => { if (a.va > a.vb) sa++; else if (a.vb > a.va) sb++; });
    return {ok:true, nA, nB, cA, cB, P, sa, sb, n:all.length, period:periodText()};
  }

  // Общая отрисовка двух многоугольников (на экране и в экспорте).
  function core(M, W, H, cx, cy, R, tx, mu, interactive){
    const P = M.P, n = P.length;
    const pt = (i, r) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
    const poly = (f, i2) => P.map((_, i) => pt(i, f(i2 ?? i)).map(v => v.toFixed(1)).join(",")).join(" ");
    let o = "";
    [.25, .5, .75, 1].forEach(f => { o += `<polygon points="${poly(() => R * f)}" fill="none" stroke="${tx}" stroke-opacity="${f === 1 ? .22 : .1}"/>`; });
    P.forEach((_, i) => { const [x, y] = pt(i, R); o += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${tx}" stroke-opacity=".1"/>`; });
    o += `<polygon points="${poly(() => R * .5)}" fill="none" stroke="${mu}" stroke-opacity=".85" stroke-width="2" stroke-dasharray="6 5"/>`;
    [["pa", M.cA, M.nA, "va"], ["pb", M.cB, M.nB, "vb"]].forEach(([pk, c, nm, vk]) => {
      const sh = P.map((a, i) => pt(i, R * Math.max(.04, a[pk])));
      o += `<polygon points="${sh.map(q => q.map(v => v.toFixed(1)).join(",")).join(" ")}" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`;
      sh.forEach(([x, y], i) => { o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${c}">${interactive ? `<title>${escH(nm)} · ${P[i].n}: ${escH(P[i].f(P[i][vk]))} — выше, чем у ${Math.round(P[i][pk] * 100)}% участников</title>` : ""}</circle>`; });
    });
    P.forEach((a, i) => {
      const [x, y] = pt(i, R + 30), anchor = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end";
      o += `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${anchor}" font-size="17" font-weight="700" fill="${tx}">${a.n}</text>`
        + `<text x="${x.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="${anchor}" font-size="14" fill="${mu}"><tspan fill="${M.cA}">${Math.round(a.pa * 100)}%</tspan> · <tspan fill="${M.cB}">${Math.round(a.pb * 100)}%</tspan></text>`;
    });
    return o;
  }

  function legendHtml(M){
    return `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:4px;background:${M.cA};display:inline-block"></i>${escH(M.nA)}</span><span style="display:inline-flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:4px;background:${M.cB};display:inline-block"></i>${escH(M.nB)}</span>`;
  }

  function sectionHtml(M){
    const seg = `<div class="seg" id="cmp-radar-period">${PERIODS.map(([k, n]) => `<button type="button" data-crp="${k}" class="${radarPeriod === k ? "active" : ""}">${n}</button>`).join("")}</div>`;
    const btns = `<button class="mini copy-btn" type="button" data-cmp-radar="copy">Копировать</button><button class="mini copy-btn" type="button" data-cmp-radar="copy-full">С описанием</button><button class="mini" type="button" data-cmp-radar="dl">⬇ Скачать PNG</button><button class="mini" type="button" data-cmp-radar="dl-full">⬇ Скачать с описанием</button><span class="hint" id="cmp-radar-msg"></span>`;
    const head = `<div class="section-head"><h2>Сравнение радаров</h2></div>`;
    if (!M.ok) {
      const why = M.missing && M.missing.length ? `У участника «${M.missing.join("», «")}» недостаточно данных за выбранный период (нужно хотя бы 5 активных дней).` : "Недостаточно участников для сравнения.";
      return `${head}<div class="p-card cmp-radar-card"><div class="cmp-radar-head">${seg}</div><p class="hint" style="margin:6px 0 0">${escH(why)} Попробуйте период «Всё время».</p></div>`;
    }
    LAST = M;
    const W = 680, H = 480;
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${core(M, W, H, W / 2, 244, 160, "#e8eaf1", "#9aa0b0", true)}</svg>`;
    const rows = M.P.map(a => {
      const wa = a.va > a.vb, wb = a.vb > a.va;
      const line = (c, v, p, win) => `<div class="cmp-rr-line${win ? " win" : ""}"><div class="v"><b style="color:${win ? c : ""}">${escH(a.f(v))}</b><em>выше, чем у ${Math.round(p * 100)}%</em></div><div class="bar"><i style="width:${Math.round(p * 100)}%;background:${c}"></i></div></div>`;
      return `<div class="cmp-rr"><div class="cmp-rr-name"><span>${a.n}</span><small>${escH(a.d)}</small></div>${line(M.cA, a.va, a.pa, wa)}${line(M.cB, a.vb, a.pb, wb)}</div>`;
    }).join("");
    return `${head}<div class="p-card cmp-radar-card"><div class="cmp-radar-head">${seg}<span class="hint">Каждая ось — место среди ${M.n} участников · пунктир — средний участник · по всем чатам</span>${btns}</div>
      <div class="cmp-radar-score">${legendHtml(M)}<span>— сильнее по осям: <b style="color:${M.cA}">${M.sa}</b> : <b style="color:${M.cB}">${M.sb}</b> из ${M.P.length}</span></div>
      <div class="cmp-radar-grid"><div class="cmp-radar-svg" id="cmp-radar-svg">${svg}</div><div class="cmp-radar-list">${rows}</div></div></div>`;
  }

  function exportSvg(M, withList){
    const tx = cmpThemeVar("--text", "#e8eaf1"), mu = cmpThemeVar("--muted", "#9aa0b0"), ln = cmpThemeVar("--line", "#2c303b");
    const rw = 680, W = withList ? 1260 : rw;
    const title = `Сравнение радаров — ${M.nA} и ${M.nB}`;
    const lines = [`Место среди участников (${M.n}) ${M.period}. Чем дальше от центра, тем выше. Пунктир — средний участник.`, `Сильнее по осям: ${M.nA} — ${M.sa}, ${M.nB} — ${M.sb} из ${M.P.length}.`].flatMap(t => cmpWrap(t, withList ? 130 : 72));
    const top = 100 + lines.length * 22;
    let o = `<rect x="32" y="34" width="6" height="30" rx="3" fill="${M.cA}"/><rect x="42" y="34" width="6" height="30" rx="3" fill="${M.cB}"/><text x="62" y="60" font-size="28" font-weight="700" fill="${tx}">${escH(cmpFit(title, withList ? 74 : 38))}</text>`;
    lines.forEach((t, i) => { o += `<text x="62" y="${88 + i * 22}" font-size="15" fill="${mu}">${escH(t)}</text>`; });
    // легенда
    const lg = top - 10; o += `<rect x="62" y="${lg - 12}" width="14" height="14" rx="4" fill="${M.cA}"/><text x="84" y="${lg}" font-size="15" fill="${tx}">${escH(cmpFit(M.nA, 18))}</text>`;
    const lx = 84 + Math.min(18, M.nA.length) * 9 + 26; o += `<rect x="${lx}" y="${lg - 12}" width="14" height="14" rx="4" fill="${M.cB}"/><text x="${lx + 22}" y="${lg}" font-size="15" fill="${tx}">${escH(cmpFit(M.nB, 18))}</text>`;
    const y0 = top + 14;
    o += `<g transform="translate(0,${y0})">${core(M, rw, 480, rw / 2, 244, 160, tx, mu, false)}</g>`;
    let H = y0 + 490;
    if (withList) {
      const x0 = rw + 10, x1 = W - 40, rh = 66;
      o += `<line x1="${x0 - 16}" y1="${y0 + 10}" x2="${x0 - 16}" y2="${y0 + 470}" stroke="${ln}"/>`;
      M.P.forEach((a, i) => {
        const y = y0 + 34 + i * rh;
        o += `<text x="${x0}" y="${y}" font-size="17" font-weight="700" fill="${tx}">${a.n}</text><text x="${x1}" y="${y}" font-size="13" fill="${mu}" text-anchor="end">${escH(a.d)}</text>`;
        [[M.cA, a.va, a.pa, a.va > a.vb, 0], [M.cB, a.vb, a.pb, a.vb > a.va, 1]].forEach(([c, v, p, win, k]) => {
          const yy = y + 20 + k * 20, bw = 120, bx = x1 - bw;
          o += `<text x="${x0}" y="${yy}" font-size="15" fill="${win ? c : mu}" font-weight="${win ? 700 : 400}">${escH(a.f(v))}</text>`
            + `<text x="${bx - 10}" y="${yy}" font-size="13" fill="${mu}" text-anchor="end">выше, чем у ${Math.round(p * 100)}%</text>`
            + `<rect x="${bx}" y="${yy - 9}" width="${bw}" height="8" rx="4" fill="${tx}" fill-opacity=".08"/><rect x="${bx}" y="${yy - 9}" width="${Math.max(4, bw * p).toFixed(1)}" height="8" rx="4" fill="${c}"/>`;
        });
      });
      H = Math.max(H, y0 + 34 + M.P.length * rh + 10);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
  }
  async function blob(withList){
    if (!LAST) throw new Error("Нет данных для радара");
    const box = document.createElement("div"); box.style.cssText = "position:fixed;left:-10000px;top:0;width:1400px";
    box.innerHTML = exportSvg(LAST, withList); document.body.appendChild(box);
    try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
  }
  const slug = t => String(t).toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "_").replace(/^_|_$/g, "");
  async function download(withList){
    const msg = $("cmp-radar-msg");
    try {
      if (msg) msg.textContent = "Подготовка…";
      const b = await blob(withList);
      downloadBlob(b, `radar_${slug(LAST.nA)}_vs_${slug(LAST.nB)}_${radarPeriod}${withList ? "_full" : ""}.png`);
      if (msg) msg.textContent = "Файл скачан";
    } catch (e) { if (msg) msg.textContent = "Не удалось скачать: " + (e?.message || e); }
    if (msg) { const c = msg.textContent; setTimeout(() => { if (msg.textContent === c) msg.textContent = ""; }, 4500); }
  }

  let host = null;
  function draw(){
    if (!host) return;
    if (CMP.mode !== "user" || !cmpReady() || !allRows) { host.remove(); host = null; LAST = null; return; }
    host.innerHTML = sectionHtml(model());
  }
  const baseRender = renderCompare;
  renderCompare = function(){
    baseRender.apply(this, arguments);
    const out = $("cmp-out");
    if (!out || CMP.mode !== "user" || !cmpReady() || !allRows) { LAST = null; return; }
    host = document.createElement("div"); host.id = "cmp-radar-host"; host.style.marginTop = "26px";
    out.appendChild(host);
    try { host.innerHTML = sectionHtml(model()); } catch (e) { host.innerHTML = `<p class="hint">Не удалось построить радар: ${escH(e.message || e)}</p>`; }
  };
  $("cmp-out").addEventListener("click", e => {
    const pb = e.target.closest("#cmp-radar-period [data-crp]");
    if (pb) { radarPeriod = pb.dataset.crp; try { localStorage.setItem(RADAR_KEY, radarPeriod); } catch (err) {} draw(); return; }
    const b = e.target.closest("[data-cmp-radar]"); if (!b) return;
    const k = b.dataset.cmpRadar;
    if (k === "copy" || k === "copy-full") copyPngToStatus(() => blob(k === "copy-full"), $("cmp-radar-msg"), k === "copy-full" ? "Радары с описанием скопированы" : "Радары скопированы");
    else download(k === "dl-full");
  });
  if (allRows && document.querySelector("#tab-compare.active")) renderCompare();
})();
