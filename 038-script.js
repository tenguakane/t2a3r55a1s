
/* ===================== Копирование блоков как картинки (Дни рождения, Карта) ===================== */
(function(){
  const th = () => ({tx:cmpThemeVar("--text", "#e8eaf1"), mu:cmpThemeVar("--muted", "#9aa0b0"), ln:cmpThemeVar("--line", "#2c303b"), ac:cmpThemeVar("--accent", "#7aa2f7"), pn:cmpThemeVar("--panel", "#171a22")});
  const txt = el => (el ? el.textContent : "").replace(/\s+/g, " ").trim();
  const FF = "Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif";
  const svgDoc = (W, H, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FF}">${body}</svg>`;
  async function toBlob(svgStr, W){
    const box = document.createElement("div"); box.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;pointer-events:none`;
    box.innerHTML = svgStr; document.body.appendChild(box);
    try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
  }
  const head = (c, title, W) => `<rect x="36" y="32" width="6" height="28" rx="3" fill="${c.ac}"/><text x="54" y="55" font-size="26" font-weight="700" fill="${c.tx}">${escH(cmpFit(title, 60))}</text><text x="${W - 36}" y="55" font-size="14" fill="${c.mu}" text-anchor="end">Colony Stats · ${new Date().toLocaleDateString("ru-RU")}</text>`;

  // столбики (месяцы / бодрствование по часам)
  function barsSvg(card, title){
    const c = th(), bars = [...card.querySelectorAll(".mbar")], W = 1000, H = 420, x0 = 50, x1 = W - 50, y0 = 130, y1 = 330, bw = (x1 - x0) / bars.length;
    const note = txt(card.querySelector("p.hint")), parts = [];
    let o = head(c, title, W);
    bars.forEach((b, i) => {
      const hp = parseFloat((b.querySelector(".mbar-col i") || {style:{}}).style.height) || 0, h = Math.max(2, (y1 - y0) * hp / 100), x = x0 + i * bw + bw * .12, w = bw * .76;
      const best = b.classList.contains("bd-best"), cur = b.classList.contains("cur"), col = best ? "#76F0B6" : c.ac;
      o += `<rect x="${x.toFixed(1)}" y="${y0}" width="${w.toFixed(1)}" height="${y1 - y0}" rx="6" fill="${c.tx}" fill-opacity=".05"/><rect x="${x.toFixed(1)}" y="${(y1 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${col}" fill-opacity="${best || cur ? 1 : .78}"/>`;
      const v = txt(b.querySelector(".mbar-v")), l = txt(b.querySelector(".mbar-l"));
      if (v) o += `<text x="${(x + w / 2).toFixed(1)}" y="${(y1 - h - 8).toFixed(1)}" font-size="14" text-anchor="middle" fill="${c.mu}">${escH(v)}</text>`;
      if (l) o += `<text x="${(x + w / 2).toFixed(1)}" y="${y1 + 24}" font-size="14" text-anchor="middle" fill="${cur ? c.ac : c.mu}">${escH(l)}</text>`;
    });
    if (note) o += `<text x="36" y="${H - 28}" font-size="15" fill="${c.tx}">${escH(cmpFit(note, 120))}</text>`;
    return svgDoc(W, H, o);
  }
  // часы участников
  function clocksSvg(host, title){
    const c = th(), cards = [...host.querySelectorAll(".bd-clock")], W = 1240, cols = 3, gap = 14, cw = (W - 72 - gap * (cols - 1)) / cols;
    const items = cards.map(el => {
      const names = [...el.querySelectorAll(".bd-pill")].map(x => txt(x)), lines = [[]]; let wd = 0;
      names.forEach(n => { const w = n.length * 7.4 + 20; if (wd + w > cw - 28 && lines[lines.length - 1].length) { lines.push([]); wd = 0; } lines[lines.length - 1].push([n, w]); wd += w + 6; });
      return {time:txt(el.querySelector(".t span")), icon:txt(el.querySelectorAll(".t span")[1]), city:txt(el.querySelector(".c")), tz:txt(el.querySelector(".p")), lines, night:el.classList.contains("night")};
    });
    let o = head(c, title, W), y = 90, rowH = 0, col = 0, rowStart = y; const pos = [];
    items.forEach((it, i) => { const h = 104 + it.lines.length * 28; if (col === 0) { rowStart = y; rowH = 0; } pos.push({it, x:36 + col * (cw + gap), y:rowStart, h}); rowH = Math.max(rowH, h); col++; if (col === cols) { col = 0; y = rowStart + rowH + gap; } });
    if (col) y = rowStart + rowH + gap;
    // выравниваем высоту в строке
    const rows = new Map(); pos.forEach(p => rows.set(p.y, Math.max(rows.get(p.y) || 0, p.h)));
    pos.forEach(p => {
      const h = rows.get(p.y), {it, x, y: py} = p;
      o += `<rect x="${x}" y="${py}" width="${cw}" height="${h}" rx="14" fill="${it.night ? "#141a2c" : c.tx}" fill-opacity="${it.night ? 1 : .05}" stroke="${it.night ? "#2b3556" : c.ln}"/>`;
      o += `<text x="${x + 16}" y="${py + 38}" font-size="30" font-weight="700" fill="${c.tx}">${escH(it.time)}</text><text x="${x + cw - 16}" y="${py + 36}" font-size="24" text-anchor="end">${escH(it.icon)}</text>`;
      o += `<text x="${x + 16}" y="${py + 62}" font-size="15" fill="${c.tx}">${escH(cmpFit(it.city, 34))}</text><text x="${x + 16}" y="${py + 82}" font-size="13" fill="${c.mu}">${escH(cmpFit(it.tz, 44))}</text>`;
      it.lines.forEach((ln, li) => { let px = x + 16; ln.forEach(([n, w]) => { const yy = py + 94 + li * 28; o += `<rect x="${px}" y="${yy}" width="${w.toFixed(1)}" height="22" rx="11" fill="${c.tx}" fill-opacity=".06" stroke="${c.ln}"/><text x="${(px + w / 2).toFixed(1)}" y="${yy + 15.5}" font-size="13" text-anchor="middle" fill="${c.tx}">${escH(n)}</text>`; px += w + 6; }); });
    });
    return svgDoc(W, y + 20, o);
  }
  function bannerSvg(el){
    const c = th(), W = 1000, H = 120, main = txt(el.querySelector("b")), sub = txt(el.querySelector(".hint")), emo = txt(el.querySelector(".bd-emoji"));
    return svgDoc(W, H, `<rect x="30" y="20" width="${W - 60}" height="80" rx="16" fill="${c.tx}" fill-opacity=".05" stroke="${c.ln}"/><text x="56" y="75" font-size="38">${escH(emo)}</text><text x="112" y="56" font-size="22" font-weight="700" fill="${c.tx}">${escH(cmpFit(main, 64))}</text><text x="112" y="82" font-size="14" fill="${c.mu}">${escH(cmpFit(sub, 100))}</text>`);
  }
  function tilesSvg(host, title){
    const c = th(), tiles = [...host.querySelectorAll(".tile")], W = 1240, cols = Math.min(3, tiles.length) || 1, gap = 14, cw = (W - 72 - gap * (cols - 1)) / cols, ch = 118;
    let o = head(c, title, W);
    tiles.forEach((t, i) => { const x = 36 + (i % cols) * (cw + gap), y = 84 + Math.floor(i / cols) * (ch + gap), ac = (t.getAttribute("style") || "").match(/--tile-accent:\s*([^;]+)/);
      o += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${c.tx}" fill-opacity=".05" stroke="${c.ln}"/><rect x="${x}" y="${y + 14}" width="4" height="${ch - 28}" rx="2" fill="${ac ? ac[1].trim() : c.ac}"/><text x="${x + 22}" y="${y + 30}" font-size="14" fill="${c.mu}">${escH(cmpFit(txt(t.querySelector(".lbl")), 40))}</text><text x="${x + 22}" y="${y + 72}" font-size="34" font-weight="700" fill="${c.tx}">${escH(cmpFit(txt(t.querySelector(".num")), 22))}</text><text x="${x + 22}" y="${y + 98}" font-size="13" fill="${ac ? ac[1].trim() : c.mu}">${escH(cmpFit(txt(t.querySelector(".place")), 52))}</text>`; });
    const rowsN = Math.ceil(tiles.length / cols);
    return svgDoc(W, 84 + rowsN * (ch + gap) + 10, o);
  }

  // ---- кнопки ----
  function findTitle(el, root){
    let n = el;
    while (n && n !== root) {
      let sib = n.previousElementSibling;
      while (sib) { if (/^H[23]$/.test(sib.tagName)) return txt(sib); const h = sib.querySelector(":scope > h2, :scope > h3"); if (h) return txt(h); sib = sib.previousElementSibling; }
      n = n.parentElement;
    }
    return "Статистика";
  }
  function mkRow(btns){
    const row = document.createElement("div"); row.className = "copy-row"; row.dataset.copyRow = "1";
    const msg = document.createElement("span"); msg.className = "hint"; msg.setAttribute("role", "status");
    btns.forEach(([label, fn]) => { const b = document.createElement("button"); b.type = "button"; b.className = "mini copy-btn"; b.textContent = label; b.addEventListener("click", () => copyPngToStatus(fn, msg, "Скопировано")); row.appendChild(b); });
    row.appendChild(msg); return row;
  }
  function decorate(root){
    if (!root) return;
    root.querySelectorAll("table").forEach(t => {
      if (t.dataset.copyDone || t.id === "bd-table" || t.id === "ach-table") return; t.dataset.copyDone = "1";
      const wrap = t.closest(".wrap") || t, title = t.dataset.copyTitle || findTitle(wrap, root);
      wrap.parentNode.insertBefore(mkRow([["Копировать", () => tableImageBlob(t, title)]]), wrap);
    });
    root.querySelectorAll(".mbars").forEach(m => {
      const card = m.closest(".p-card"); if (!card || card.dataset.copyDone || card.closest("#bd-clocks")) return; card.dataset.copyDone = "1";
      const title = txt(card.querySelector("h3")) || "Статистика"; const h = card.querySelector("h3");
      (h || card).insertAdjacentElement(h ? "afterend" : "afterbegin", mkRow([["Копировать", () => toBlob(barsSvg(card, title), 1000)]]));
    });
    const ck = root.querySelector("#bd-clocks");
    if (ck && !ck.dataset.copyDone) {
      ck.dataset.copyDone = "1";
      const wk = ck.querySelector(".p-card");
      if (wk) wk.insertAdjacentElement("beforebegin", mkRow([["Копировать", () => toBlob(barsSvg(wk, "Когда не спят участники"), 1000)]]));
      ck.insertAdjacentElement("beforebegin", mkRow([
        ["Копировать", () => { const h = ck.querySelector(".bd-grid"); if (!h) throw new Error("Нет данных"); return toBlob(clocksSvg(ck, "Сейчас у участников"), 1240); }],
      ]));
    }
    const bn = root.querySelector(".bd-banner");
    if (bn && !bn.dataset.copyDone) {
      bn.dataset.copyDone = "1";
      const b = document.createElement("button"); b.type = "button"; b.className = "mini copy-btn"; b.textContent = "Копировать";
      const msg = document.createElement("span"); msg.className = "hint"; msg.setAttribute("role", "status");
      b.addEventListener("click", () => copyPngToStatus(() => toBlob(bannerSvg(bn), 1000), msg, "Скопировано"));
      bn.appendChild(b); bn.appendChild(msg);
    }
    const tl = root.querySelector(".tiles");
    if (tl && !tl.dataset.copyDone) { tl.dataset.copyDone = "1"; tl.insertAdjacentElement("beforebegin", mkRow([["Копировать", () => toBlob(tilesSvg(tl, "Карта участников · показатели"), 1240)]])); }
  }
  ["bd-out", "um-out"].forEach(id => { const el = $(id); if (!el) return; new MutationObserver(() => decorate(el)).observe(el, {childList:true}); decorate(el); });
  window.__copyimg = {decorate, barsSvg, clocksSvg, tilesSvg, bannerSvg};
})();
