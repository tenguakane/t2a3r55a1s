
/* ===================== Палитра «Тема сайта»: матрица и графики в цветах текущей темы ===================== */
(function(){
  const NAME = "Тема сайта", GROUP = "По теме сайта";
  window.THEME_PAL = NAME;
  const css = n => { try { return getComputedStyle(document.body).getPropertyValue(n).trim(); } catch (e) { return ""; } };
  const hex = (v, d) => /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d;
  const toHsl = h => { let [r, g, b] = pbRgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let s = 0, hh = 0;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
    return [hh, s, l]; };
  const fromHsl = (h, s, l) => { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return pbHex([r, g, b].map(v => (v + m) * 255)); };
  const rot = (h, deg) => { const [a, s, l] = toHsl(h); return fromHsl(a + deg, Math.max(s, .45), Math.min(Math.max(l, .55), .72)); };
  function theme(){
    return {a:hex(css("--accent"), "#7aa2f7"), b:hex(css("--accent-2"), "#bb9af7"), panel:hex(css("--panel"), "#171a22"), panel2:hex(css("--panel-2"), "#1d212b"),
      bg:hex(css("--bg"), "#0f1117"), text:hex(css("--text"), "#e8eaf1"), line:hex(css("--line"), "#2c303b")};
  }
  function themePalette(kind){
    const t = theme();
    if (kind === "seq") return [pbMix(t.panel, t.a, .2), pbMix(t.panel, t.a, .55), t.a, pbMix(t.a, "#ffffff", .45), pbMix(t.a, "#ffffff", .82)]; // тёмный → цвет темы → почти белый: «больше» всегда ярче
    if (kind === "pair") return [t.a, t.b];
    if (kind === "dm") return [t.b, t.a];
    const out = [t.a, t.b, rot(t.a, 150), rot(t.b, 150), rot(t.a, 70), rot(t.b, 70), rot(t.a, 220), rot(t.b, 220)];
    return out.filter((c, i) => out.indexOf(c) === i);
  }
  window.themePalette = themePalette;

  // Палитра «Тема сайта» — первой группой во всех сетках палитр.
  const baseGrid = palGridHtml;
  palGridHtml = function(kind, groups, isActive, attr){
    const html = baseGrid(kind, groups, isActive, attr);
    const cols = themePalette(kind);
    const btn = `<div class="pal-group-title">${escH(GROUP)}</div><div class="pal-item"><button type="button" class="pal-btn${isActive(cols) ? " active" : ""}" ${attr}="${escH(NAME)}" title="${escH(NAME)}"><span class="pal-strip" style="background:${palStrip(kind === "dm" ? "cat" : kind, cols)}"></span><span class="pal-name">${escH(NAME)}</span></button></div>`;
    return html.replace(`<div class="pal-grid">`, `<div class="pal-grid">` + btn);
  };
  const baseColors = palColors;
  palColors = function(kind, name){ return name === NAME ? themePalette(kind) : baseColors(kind, name); };
  const baseSpec = palBgSpec;
  palBgSpec = function(kind, name){
    if (name !== NAME) return baseSpec(kind, name);
    const t = theme();
    return {mode:"linear", solid:t.panel, start:t.panel2, end:t.bg, angle:160};
  };

  // Графики по умолчанию — в цветах темы (если фон и тепловые цвета не задавались вручную).
  let hasLegacyBg = false, hasLegacyHeat = false;
  try { hasLegacyBg = !!(localStorage.getItem(CHART_BG_START_KEY) || localStorage.getItem(CHART_BG_KEY)); hasLegacyHeat = !!localStorage.getItem("chatstats.heat.v1"); } catch (e) {}
  function themeDefaults(){
    const t = theme();
    return {backgroundStart:t.panel2, backgroundEnd:t.bg, backgroundAngle:160, fontColor:t.text, heat:{z:pbMix(t.panel, t.text, .07), c:themePalette("seq")}};
  }
  // Старые значения по умолчанию (серый фон, розовая тепловая шкала) переводим на тему один раз.
  let prevDef = hasLegacyBg || hasLegacyHeat ? null : {backgroundStart:"#262626", backgroundEnd:"#262626", heat:{c:["#4a2a45", "#a8325a", "#ff4d6d"]}}, prevPal = {};
  const same = (x, y) => String(x || "").toLowerCase() === String(y || "").toLowerCase();
  function applyDefaults(){
    const d = themeDefaults();
    if (!hasLegacyBg) { BASE_CHART_APPEARANCE.backgroundStart = d.backgroundStart; BASE_CHART_APPEARANCE.backgroundEnd = d.backgroundEnd; BASE_CHART_APPEARANCE.backgroundAngle = d.backgroundAngle; BASE_CHART_APPEARANCE.fontColor = d.fontColor; }
    if (!hasLegacyHeat) BASE_CHART_APPEARANCE.heat = {z:d.heat.z, c:[...d.heat.c]};
    return d;
  }
  // При смене темы всё, что было окрашено «по теме», перекрашивается в новые цвета.
  function followTheme(){
    const d = applyDefaults(), pal = {seq:themePalette("seq"), cat:themePalette("cat"), pair:themePalette("pair")};
    let changed = false;
    const swap = (v, kind) => { const old = prevPal[kind] || []; const i = old.findIndex(c => same(c, v)); return i >= 0 ? pal[kind][i % pal[kind].length] : v; };
    Object.values(CHART_PREFS || {}).forEach(p => {
      if (!p || typeof p !== "object") return;
      if (prevDef) {
        if (same(p.backgroundStart, prevDef.backgroundStart) && same(p.backgroundEnd, prevDef.backgroundEnd)) { p.backgroundStart = d.backgroundStart; p.backgroundEnd = d.backgroundEnd; changed = true; }
        if (p.heat && Array.isArray(p.heat.c) && p.heat.c.every((c, i) => same(c, prevDef.heat.c[i]))) { p.heat = {z:d.heat.z, c:[...d.heat.c]}; changed = true; }
      }
      if (!p.themePal) return;
      const k = p.themePal;
      if (k === "seq" && p.heat) p.heat = {...p.heat, c:[...pal.seq]};
      if (p.seriesColors) Object.keys(p.seriesColors).forEach(key => { p.seriesColors[key] = swap(p.seriesColors[key], "cat"); });
      if (Array.isArray(p.customBands)) p.customBands = p.customBands.map(b => ({...b, color:swap(b.color, "cat")}));
      if (p.selfie) { const s = p.selfie; ["did", "miss"].forEach(x => { if (s[x]) s[x] = swap(s[x], "pair"); }); ["bar", "avg"].forEach(x => { if (s[x]) s[x] = swap(s[x], "cat"); }); }
      try { applyPalBg(p, k, NAME); } catch (e) {}
      changed = true;
    });
    if (changed) try { saveChartPrefs(); } catch (e) {}
    prevDef = d; prevPal = pal;
  }
  // Отмечаем графики, к которым применили «Тему сайта», — они будут следовать за темой.
  [["chart-settings-content", () => currentChartType()], ["s-settings-content", () => (typeof sChartType === "function" ? sChartType() : null)]].forEach(([id, typeOf]) => {
    const box = document.getElementById(id); if (!box) return;
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-pal-seq],[data-pal-cat],[data-pal-pair]"); if (!b) return;
      const type = typeOf(); if (!type || !CHART_PREFS[type]) return;
      const kind = b.hasAttribute("data-pal-seq") ? "seq" : b.hasAttribute("data-pal-pair") ? "pair" : "cat";
      const name = b.getAttribute(`data-pal-${kind}`);
      if (name === NAME) CHART_PREFS[type].themePal = kind; else delete CHART_PREFS[type].themePal;
      try { saveChartPrefs(); } catch (err) {}
    });
  });
  followTheme();
  const rerender = () => {
    try { if (document.getElementById("tab-daymatrix")?.classList.contains("active")) renderDayMatrix(); } catch (e) {}
    try { if (document.getElementById("tab-charts")?.classList.contains("active")) { applyChartAppearance(); renderCharts(); } } catch (e) {}
    try { if (document.getElementById("tab-selfie")?.classList.contains("active")) renderSelfieChart(); } catch (e) {}
    try { if (document.getElementById("dm-colors-panel")?.classList.contains("open")) renderDmColors(); } catch (e) {}
  };
  const baseApply = applySiteTheme;
  applySiteTheme = function(id){ const r = baseApply.apply(this, arguments); followTheme(); rerender(); return r; };
  try { if (document.getElementById("tab-charts")?.classList.contains("active")) { applyChartAppearance(); renderCharts(); } } catch (e) {}
})();
