
/* ===================== Карта участников ===================== */
(function(){
  const R = 6371, W = 1200, H = 700;
  const norm = t => String(t || "").toLowerCase().replace(/ё/g, "е").replace(/[-._]/g, " ").replace(/\s+/g, " ").trim();
  const CITY = {
    "кривой рог":[47.9105,33.3918], "алматы":[43.2389,76.8897], "кобрин":[52.2139,24.3564], "астана":[51.1694,71.4491], "санкт петербург":[59.9343,30.3351], "спб":[59.9343,30.3351], "полтава":[49.5883,34.5514],
    "пермь":[58.0105,56.2502], "королев":[55.9226,37.8545], "конаев":[43.8667,77.0667], "sapcote":[52.5416,-1.2866], "женева":[46.2044,6.1432], "одесса":[46.4825,30.7233],
    "москва":[55.7558,37.6173], "киев":[50.4501,30.5234], "харьков":[49.9935,36.2304], "днепр":[48.4647,35.0462], "львов":[49.8397,24.0297], "минск":[53.9006,27.559], "варшава":[52.2297,21.0122],
    "краков":[50.0647,19.945], "лондон":[51.5074,-0.1278], "берлин":[52.52,13.405], "новосибирск":[55.0084,82.9357], "екатеринбург":[56.8389,60.6057], "казань":[55.7887,49.1221], "самара":[53.1959,50.1002],
    "ташкент":[41.2995,69.2401], "тбилиси":[41.7151,44.8271], "ереван":[40.1792,44.4991], "шымкент":[42.3417,69.5901], "караганда":[49.8047,73.1094], "вена":[48.2082,16.3738], "париж":[48.8566,2.3522],
    "прага":[50.0755,14.4378], "рим":[41.9028,12.4964], "мадрид":[40.4168,-3.7038], "стамбул":[41.0082,28.9784], "нью йорк":[40.7128,-74.006], "торонто":[43.6532,-79.3832], "дубай":[25.2048,55.2708],
    "вильнюс":[54.6872,25.2797], "рига":[56.9496,24.1052], "таллин":[59.437,24.7536], "ростов на дону":[47.2357,39.7015], "краснодар":[45.0355,38.9753], "сочи":[43.5855,39.7231], "воронеж":[51.672,39.1843],
    "нижний новгород":[56.2965,43.9361], "челябинск":[55.1644,61.4368], "омск":[54.9885,73.3242], "уфа":[54.7388,55.9721], "бишкек":[42.8746,74.5698], "баку":[40.4093,49.8671], "кишинев":[47.0105,28.8638],
  };
  const CAP = {"украина":[50.4501,30.5234], "россия":[55.7558,37.6173], "беларусь":[53.9006,27.559], "казахстан":[51.1694,71.4491], "польша":[52.2297,21.0122], "англия":[51.5074,-0.1278], "великобритания":[51.5074,-0.1278],
    "швейцария":[46.948,7.4474], "германия":[52.52,13.405], "франция":[48.8566,2.3522], "италия":[41.9028,12.4964], "испания":[40.4168,-3.7038], "чехия":[50.0755,14.4378], "грузия":[41.7151,44.8271], "армения":[40.1792,44.4991],
    "турция":[39.9334,32.8597], "сша":[38.9072,-77.0369], "канада":[45.4215,-75.6972], "узбекистан":[41.2995,69.2401], "литва":[54.6872,25.2797], "латвия":[56.9496,24.1052], "эстония":[59.437,24.7536],
    "молдова":[47.0105,28.8638], "австрия":[48.2082,16.3738], "израиль":[31.7683,35.2137], "оаэ":[24.4539,54.3773], "кыргызстан":[42.8746,74.5698], "азербайджан":[40.4093,49.8671]};
  const EN = {"украина":"Ukraine", "россия":"Russia", "беларусь":"Belarus", "казахстан":"Kazakhstan", "польша":"Poland", "англия":"United Kingdom", "великобритания":"United Kingdom", "швейцария":"Switzerland", "германия":"Germany",
    "франция":"France", "италия":"Italy", "испания":"Spain", "чехия":"Czechia", "грузия":"Georgia", "армения":"Armenia", "турция":"Turkey", "сша":"United States of America", "канада":"Canada", "узбекистан":"Uzbekistan",
    "литва":"Lithuania", "латвия":"Latvia", "эстония":"Estonia", "молдова":"Moldova", "австрия":"Austria", "израиль":"Israel", "оаэ":"United Arab Emirates", "кыргызстан":"Kyrgyzstan", "азербайджан":"Azerbaijan"};
  const PAL = ["#7aa2f7", "#ff9e64", "#9ece6a", "#bb9af7", "#2ac3de", "#f7768e", "#e0af68", "#73daca", "#ff7eb6", "#c0caf5"];

  function parseLL(t){ const n = String(t || "").replace(/[;,]/g, " ").split(/\s+/).filter(Boolean).map(Number); return n.length === 2 && n.every(Number.isFinite) && Math.abs(n[0]) <= 90 && Math.abs(n[1]) <= 180 ? n : null; }
  function coords(b){
    if (b.ll) { const n = parseLL(b.ll); if (n) return {lat:n[0], lon:n[1], src:"manual"}; }
    const c = norm(b.city); if (c) return CITY[c] ? {lat:CITY[c][0], lon:CITY[c][1], src:"city"} : null;
    const k = norm(b.country); return CAP[k] ? {lat:CAP[k][0], lon:CAP[k][1], src:"country"} : null;
  }
  window.BIOGEO = {coords};

  const rad = d => d * Math.PI / 180;
  function dist(a, b){
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon), h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const km = v => `${fmt(Math.round(v))} км`;
  const names = (arr, n = 3) => arr.slice(0, n).join(", ") + (arr.length > n ? ` +${arr.length - n}` : "");

  // ----- модель -----
  const $o = id => $(id) && $(id).checked;
  function model(){
    const approxOn = $o("um-approx"), P = [], missing = [], skipped = [];
    Object.keys(NAMES).forEach(pk => {
      if (!isVisibleUser(pk)) return;
      const b = BIO.get(pk), has = b.city || b.country || b.ll; if (!has) return;
      const c = coords(b);
      if (!c) { missing.push({pk, name:NAMES[pk], b}); return; }
      const approx = c.src === "country";
      if (approx && !approxOn) { skipped.push(NAMES[pk]); return; }
      const key = approx ? "~" + norm(b.country) : (norm(b.city) || `${c.lat.toFixed(3)},${c.lon.toFixed(3)}`);
      P.push({pk, name:NAMES[pk], b, lat:c.lat, lon:c.lon, approx, key, country:b.country || "—", city:b.city || (approx ? b.country + " (столица)" : "Точка")});
    });
    const total = Object.keys(NAMES).filter(isVisibleUser).length;
    const G = new Map();
    P.forEach(p => { const g2 = G.get(p.key) || {key:p.key, name:p.city, country:p.country, lat:p.lat, lon:p.lon, approx:p.approx, members:[]}; g2.members.push(p); G.set(p.key, g2); });
    const groups = [...G.values()];
    const same = (a, b) => a.key === b.key || dist(a, b) < 0.5;
    let far = null, near = null;
    const pairs = [];
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = P[i], b = P[j], d = dist(a, b), sm = same(a, b);
      pairs.push({a, b, d, sm});
      if (!far || d > far.d) far = {a, b, d};
      if (!sm && !a.approx && !b.approx && (!near || d < near.d)) near = {a, b, d};
    }
    // пары городов
    const cp = [];
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) { const a = groups[i], b = groups[j], d = dist(a, b); if (d >= 0.5) cp.push({a, b, d}); }
    const farCities = cp.slice().sort((x, y) => y.d - x.d), nearCities = cp.filter(x => !x.a.approx && !x.b.approx).sort((x, y) => x.d - y.d);
    // центр (среднее по единичным векторам)
    let center = null;
    if (P.length) {
      let x = 0, y = 0, z = 0; P.forEach(p => { x += Math.cos(rad(p.lat)) * Math.cos(rad(p.lon)); y += Math.cos(rad(p.lat)) * Math.sin(rad(p.lon)); z += Math.sin(rad(p.lat)); });
      const hyp = Math.hypot(x, y); center = {lat:Math.atan2(z, hyp) * 180 / Math.PI, lon:Math.atan2(y, x) * 180 / Math.PI};
      const nc = groups.map(g2 => ({g:g2, d:dist(center, g2)})).sort((a, b) => a.d - b.d)[0]; center.nearest = nc;
    }
    // по людям
    const per = P.map(p => {
      const others = P.filter(q => q !== p), ds = others.map(q => ({q, d:dist(p, q), sm:same(p, q)}));
      const nb = ds.filter(x => !x.sm && !p.approx && !x.q.approx).sort((a, b) => a.d - b.d)[0] || null;
      const fb = ds.slice().sort((a, b) => b.d - a.d)[0] || null;
      return {p, nb, fb, avg:ds.length ? ds.reduce((s2, x) => s2 + x.d, 0) / ds.length : 0, toC:center ? dist(p, center) : 0};
    }).sort((a, b) => b.avg - a.avg);
    const diffPairs = pairs.filter(x => !x.sm);
    const avgPair = diffPairs.length ? diffPairs.reduce((s2, x) => s2 + x.d, 0) / diffPairs.length : 0;
    const countries = [...new Set(P.map(p => norm(p.country)))].filter(Boolean);
    const cCount = new Map(); P.forEach(p => cCount.set(norm(p.country), (cCount.get(norm(p.country)) || 0) + 1));
    const cOrder = [...cCount.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const colorOf = c => PAL[Math.max(0, cOrder.indexOf(norm(c))) % PAL.length];
    return {P, groups, far, near, farCities, nearCities, center, per, avgPair, countries, total, missing, skipped, colorOf, cOrder};
  }

  // ----- контуры стран (подгружаются из интернета один раз) -----
  const TOPO_KEY = "chatmap.topo.v1";
  const TOPO_URLS = ["https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json", "https://unpkg.com/world-atlas@2/countries-110m.json"];
  let TOPO;   // undefined — не пробовали, null — не удалось, массив — готово
  let topoLoading = null;
  function decodeTopo(t){
    const obj = t.objects.countries || t.objects[Object.keys(t.objects)[0]];
    const tr = t.transform, sc = tr ? tr.scale : [1, 1], tl = tr ? tr.translate : [0, 0];
    const arcs = t.arcs.map(a => { let x = 0, y = 0; return a.map(pt => { if (tr) { x += pt[0]; y += pt[1]; return [x * sc[0] + tl[0], y * sc[1] + tl[1]]; } return [pt[0], pt[1]]; }); });
    const arc = i => i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
    const ring = idxs => { const pts = []; idxs.forEach(i => { const a = arc(i); pts.push(...(pts.length ? a.slice(1) : a)); }); return pts; };
    const out = [];
    const geoms = obj.type === "GeometryCollection" ? obj.geometries : [obj];
    geoms.forEach(gm => { const polys = gm.type === "Polygon" ? [gm.arcs.map(ring)] : gm.type === "MultiPolygon" ? gm.arcs.map(pl => pl.map(ring)) : []; out.push({name:(gm.properties && gm.properties.name) || "", polys}); });
    return out;
  }
  function loadTopo(){
    if (TOPO !== undefined) return Promise.resolve(TOPO);
    if (topoLoading) return topoLoading;
    topoLoading = (async () => {
      try { const c = localStorage.getItem(TOPO_KEY); if (c) { TOPO = decodeTopo(JSON.parse(c)); return TOPO; } } catch (e) {}
      for (const url of TOPO_URLS) {
        try {
          const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
          const r = await fetch(url, {signal:ctl.signal}); clearTimeout(tm);
          if (!r.ok) continue;
          const txt = await r.text(), j = JSON.parse(txt);
          if (j.type !== "Topology" || !j.objects) continue;
          TOPO = decodeTopo(j); try { localStorage.setItem(TOPO_KEY, txt); } catch (e) {}
          return TOPO;
        } catch (e) {}
      }
      TOPO = null; return TOPO;
    })();
    return topoLoading;
  }

  // ----- рисование -----
  const mercY = lat => Math.log(Math.tan(Math.PI / 4 + rad(Math.max(-85, Math.min(85, lat))) / 2));
  const unMercY = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
  // положение карты: масштаб и сдвиг (в единицах viewBox), колесо — масштаб, перетаскивание — сдвиг
  const VIEW = {k:1, tx:0, ty:0};
  const K_MAX = 60;
  function clampView(v){
    v.k = Math.max(1, Math.min(K_MAX, v.k));
    const lx = (v.k - 1) * W / 2 + W * .2, ly = (v.k - 1) * H / 2 + H * .2;
    v.tx = Math.max(-lx, Math.min(lx, v.tx)); v.ty = Math.max(-ly, Math.min(ly, v.ty));
    return v;
  }
  // масштаб с неподвижной точкой (sx, sy) в координатах viewBox
  function zoomAt(v, f, sx, sy){
    const k2 = Math.max(1, Math.min(K_MAX, v.k * f)), r = k2 / v.k;
    return clampView({k:k2, tx:sx - W / 2 - (sx - W / 2 - v.tx) * r, ty:sy - H / 2 - (sy - H / 2 - v.ty) * r});
  }
  function mapSvg(M){
    const tx = cmpThemeVar("--text", "#e8eaf1"), mu = cmpThemeVar("--muted", "#9aa0b0"), ln = cmpThemeVar("--line", "#2c303b"), bg = cmpThemeVar("--panel", "#171a22");
    const pts = M.groups.map(g2 => g2).concat(M.center ? [M.center] : []);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(p => { const x = rad(p.lon), y = mercY(p.lat); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const minSpan = rad(8); if (x1 - x0 < minSpan) { const c = (x0 + x1) / 2; x0 = c - minSpan / 2; x1 = c + minSpan / 2; } if (y1 - y0 < minSpan * .6) { const c = (y0 + y1) / 2; y0 = c - minSpan * .3; y1 = c + minSpan * .3; }
    const mX = 150, mT = 90, mB = 80, sc = Math.min((W - mX * 2) / (x1 - x0), (H - mT - mB) / (y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, oy = (mT - mB) / 2;
    const pxB = lon => (rad(lon) - cx) * sc + W / 2, pyB = lat => H / 2 + oy - (mercY(lat) - cy) * sc;
    const VW = VIEW, kz = VW.k;
    const px = lon => (pxB(lon) - W / 2) * kz + W / 2 + VW.tx, py = lat => (pyB(lat) - H / 2) * kz + H / 2 + VW.ty;
    const xb0 = (0 - W / 2 - VW.tx) / kz + W / 2, xb1 = (W - W / 2 - VW.tx) / kz + W / 2, yb0 = (0 - H / 2 - VW.ty) / kz + H / 2, yb1 = (H - H / 2 - VW.ty) / kz + H / 2;
    const lonMin = (cx + (xb0 - W / 2) / sc) * 180 / Math.PI, lonMax = (cx + (xb1 - W / 2) / sc) * 180 / Math.PI, latMax = unMercY(cy + (H / 2 + oy - yb0) / sc), latMin = unMercY(cy + (H / 2 + oy - yb1) / sc);
    const span = lonMax - lonMin, step = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20, 30, 45].find(s2 => span / s2 <= 9) || 45;
    let o = `<defs><clipPath id="um-clip"><rect x="0" y="0" width="${W}" height="${H}" rx="14"/></clipPath></defs><g clip-path="url(#um-clip)">`;
    // сетка
    for (let lo = Math.ceil(lonMin / step) * step; lo <= lonMax; lo += step) { const x = px(lo); o += `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${H}" stroke="${tx}" stroke-opacity=".07"/><text x="${(x + 4).toFixed(1)}" y="${H - 8}" font-size="11" fill="${mu}" fill-opacity=".8">${+Math.abs(lo).toFixed(2)}°${lo < 0 ? "з" : "в"}</text>`; }
    for (let la = Math.ceil(latMin / step) * step; la <= latMax; la += step) { const y = py(la); if (y < 14 || y > H - 14) continue; o += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${tx}" stroke-opacity=".07"/><text x="8" y="${(y - 4).toFixed(1)}" font-size="11" fill="${mu}" fill-opacity=".8">${+Math.abs(la).toFixed(2)}°${la < 0 ? "ю" : "с"}</text>`; }
    // контуры стран
    if ($o("um-land") && Array.isArray(TOPO)) {
      const mine = new Map(M.cOrder.map(c => [c, M.colorOf(c)])), enMap = new Map(); M.P.forEach(p => { const e = EN[norm(p.country)]; if (e) enMap.set(e, norm(p.country)); });
      TOPO.forEach(ct => {
        if (ct.name === "Antarctica") return;
        let d = "";
        ct.polys.forEach(pl => pl.forEach(rg => {
          let a = Infinity, b = -Infinity, c2 = Infinity, d2 = -Infinity; const q = rg.map(([lo, la]) => { const X = px(lo), Y = py(la); a = Math.min(a, X); b = Math.max(b, X); c2 = Math.min(c2, Y); d2 = Math.max(d2, Y); return [X, Y]; });
          if (b < -40 || a > W + 40 || d2 < -40 || c2 > H + 40) return;
          d += "M" + q.map(([X, Y]) => X.toFixed(1) + " " + Y.toFixed(1)).join("L") + "Z";
        }));
        if (!d) return;
        const key = enMap.get(ct.name), col = key ? mine.get(key) : null;
        o += `<path d="${d}" fill="${col || tx}" fill-opacity="${col ? .16 : .05}" stroke="${col || tx}" stroke-opacity="${col ? .55 : .2}" stroke-width="${col ? 1.2 : .8}" fill-rule="evenodd"><title>${escH(ct.name)}</title></path>`;
      });
    }
    // линии
    const line = (a, b, col, dash, label) => {
      const X1 = px(a.lon), Y1 = py(a.lat), X2 = px(b.lon), Y2 = py(b.lat), mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2, w = label.length * 7.4 + 16;
      return `<line x1="${X1.toFixed(1)}" y1="${Y1.toFixed(1)}" x2="${X2.toFixed(1)}" y2="${Y2.toFixed(1)}" stroke="${col}" stroke-width="2.6" ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linecap="round" opacity=".95"/><rect x="${(mx - w / 2).toFixed(1)}" y="${(my - 12).toFixed(1)}" width="${w.toFixed(1)}" height="22" rx="11" fill="${bg}" stroke="${col}"/><text x="${mx.toFixed(1)}" y="${(my + 3.5).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${col}">${escH(label)}</text>`;
    };
    const RED = "#f7768e", GREEN = "#76F0B6";
    if (M.far && M.far.a.key !== M.far.b.key) o += line(M.far.a, M.far.b, RED, "8 6", km(M.far.d));
    if (M.near) o += line(M.near.a, M.near.b, GREEN, "", km(M.near.d));
    // маркеры и подписи
    const boxes = [];
    const hit = (b2) => boxes.some(q => b2.x < q.x + q.w && b2.x + b2.w > q.x && b2.y < q.y + q.h && b2.y + b2.h > q.y) || b2.x < 4 || b2.x + b2.w > W - 4 || b2.y < 4 || b2.y + b2.h > H - 4;
    const gs = M.groups.map((g2, gi) => ({g:g2, gi, X:px(g2.lon), Y:py(g2.lat), r:6 + 3 * Math.sqrt(g2.members.length)})).filter(m => m.X > -30 && m.X < W + 30 && m.Y > -30 && m.Y < H + 30).sort((a, b) => b.g.members.length - a.g.members.length);
    gs.forEach(m => boxes.push({x:m.X - m.r, y:m.Y - m.r, w:m.r * 2, h:m.r * 2}));
    gs.forEach(m => {
      const col = M.colorOf(m.g.country), n = m.g.members.length, who = m.g.members.map(p => p.name).join(", ");
      o += m.g.approx ? `<circle data-gi="${m.gi}" style="cursor:pointer" cx="${m.X.toFixed(1)}" cy="${m.Y.toFixed(1)}" r="${m.r}" fill="${col}" fill-opacity=".12" stroke="${col}" stroke-width="2" stroke-dasharray="3 3"><title>${escH(m.g.name)} (приблизительно): ${escH(who)}</title></circle>`
        : `<circle data-gi="${m.gi}" style="cursor:pointer" cx="${m.X.toFixed(1)}" cy="${m.Y.toFixed(1)}" r="${m.r}" fill="${col}" stroke="${bg}" stroke-width="2.5"><title>${escH(m.g.name)}, ${escH(m.g.country)}: ${escH(who)}</title></circle>`;
      if (n > 1) o += `<text x="${m.X.toFixed(1)}" y="${(m.Y + 4.5).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#10131a">${n}</text>`;
    });
    let hiddenLabels = 0;
    if ($o("um-labels")) gs.forEach(m => {
      const members = m.g.members.map(p => p.name), t1 = m.g.approx ? m.g.country : m.g.name, lines = [];
      // чем ближе карта, тем больше имён: при приближении подписываются все участники города
      if (kz >= 2.5 || members.length <= 2) { let cur = ""; members.forEach(nm => { const t = cur ? cur + ", " + nm : nm; if (cur && t.length > 26) { lines.push(cur); cur = nm; } else cur = t; }); if (cur) lines.push(cur); }
      else lines.push(names(members, 2));
      if (lines.length > 10) { lines.length = 9; lines.push("…"); }
      const w = Math.max(t1.length * 9, ...lines.map(t => t.length * 7.4)) + 6, h = 22 + lines.length * 16;
      const cand = [[m.r + 5, -h / 2, "start"], [-m.r - 5 - w, -h / 2, "end"], [-w / 2, -m.r - h - 2, "middle"], [-w / 2, m.r + 3, "middle"], [m.r + 5, -h - 2, "start"], [m.r + 5, 2, "start"], [-m.r - 5 - w, -h - 2, "end"], [-m.r - 5 - w, 2, "end"]];
      let pick = null; for (const c of cand) { const b2 = {x:m.X + c[0], y:m.Y + c[1], w, h}; if (!hit(b2)) { pick = {c, b2}; break; } }
      if (!pick) { hiddenLabels++; return; }
      boxes.push(pick.b2);
      const ax = pick.c[2] === "start" ? pick.b2.x : pick.c[2] === "end" ? pick.b2.x + w : pick.b2.x + w / 2, tc = pick.c[2];
      o += `<text x="${ax.toFixed(1)}" y="${(pick.b2.y + 16).toFixed(1)}" text-anchor="${tc}" font-size="16" font-weight="700" fill="${tx}" paint-order="stroke" stroke="${bg}" stroke-width="4">${escH(t1)}</text>`
        + lines.map((t, i) => `<text x="${ax.toFixed(1)}" y="${(pick.b2.y + 34 + i * 16).toFixed(1)}" text-anchor="${tc}" font-size="13.5" fill="${mu}" paint-order="stroke" stroke="${bg}" stroke-width="3.5">${escH(t)}</text>`).join("");
    });
    // центр
    if (M.center) {
      const X = px(M.center.lon), Y = py(M.center.lat), star = Array.from({length:10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 12; return `${(X + Math.cos(a) * r).toFixed(1)},${(Y + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
      o += `<polygon points="${star}" fill="#ffd166" stroke="${bg}" stroke-width="2"><title>Центр колонии (среднее положение участников): ${M.center.lat.toFixed(2)}, ${M.center.lon.toFixed(2)}</title></polygon>`;
    }
    o += `</g>`;
    if (hiddenLabels) o += `<text x="26" y="84" font-size="13" fill="${mu}">Скрыто подписей: ${hiddenLabels} — приблизьте карту, чтобы увидеть имена</text>`;
    // заголовок и легенда
    o += `<text x="26" y="40" font-size="24" font-weight="700" fill="${tx}">Карта участников</text><text x="26" y="62" font-size="14" fill="${mu}">${M.P.length} ${wordForm(M.P.length, ["участник", "участника", "участников"])} · ${M.groups.length} ${wordForm(M.groups.length, ["город", "города", "городов"])} · ${M.countries.length} ${wordForm(M.countries.length, ["страна", "страны", "стран"])}</text>`;
    let lx = 26; const ly = H - 26;
    M.cOrder.forEach(c => { const nm = (M.P.find(p => norm(p.country) === c) || {}).country || c; o += `<circle cx="${lx + 6}" cy="${ly - 4}" r="6" fill="${M.colorOf(c)}"/><text x="${lx + 18}" y="${ly}" font-size="13" fill="${tx}">${escH(nm)}</text>`; lx += 40 + nm.length * 7.6; });
    const lg = (x, col, dash, t) => `<line x1="${x}" y1="${ly - 4}" x2="${x + 28}" y2="${ly - 4}" stroke="${col}" stroke-width="2.6" ${dash ? `stroke-dasharray="${dash}"` : ""}/><text x="${x + 36}" y="${ly}" font-size="13" fill="${tx}">${t}</text>`;
    o += lg(W - 430, RED, "8 6", "дальше всего") + lg(W - 290, GREEN, "", "ближе всего") + `<polygon points="${Array.from({length:10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.6 : 8; return `${(W - 150 + Math.cos(a) * r).toFixed(1)},${(ly - 4 + Math.sin(a) * r).toFixed(1)}`; }).join(" ")}" fill="#ffd166"/><text x="${W - 136}" y="${ly}" font-size="13" fill="${tx}">центр колонии</text>`;
    return `<svg id="um-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" font-family="Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif">${o}</svg>`;
  }

  // ----- интерактив карты -----
  let umAnim = 0;
  function mapRedraw(){ const box = $("um-map"); if (box && window.__umModel) box.innerHTML = mapSvg(window.__umModel); }
  function mapGo(target, ms){
    cancelAnimationFrame(umAnim);
    if (!ms || (typeof REDUCED_MOTION !== "undefined" && REDUCED_MOTION)) { Object.assign(VIEW, clampView(target)); mapRedraw(); return; }
    const from = {...VIEW}, t0 = performance.now(), tg = clampView({...target});
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      // масштаб интерполируем по логарифму — приближение выглядит ровным
      VIEW.k = Math.exp(Math.log(from.k) + (Math.log(tg.k) - Math.log(from.k)) * e);
      VIEW.tx = from.tx + (tg.tx - from.tx) * e; VIEW.ty = from.ty + (tg.ty - from.ty) * e;
      mapRedraw();
      if (t < 1 && $("um-map")) umAnim = requestAnimationFrame(step);
    };
    umAnim = requestAnimationFrame(step);
  }
  function bindMap(){
    const card = document.querySelector("#tab-usermap .um-card"), box = $("um-map"); if (!card || !box) return;
    const toView = e => { const svg = box.querySelector("svg"), r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    let raf = 0; const later = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mapRedraw(); }); };
    box.addEventListener("wheel", e => {
      e.preventDefault(); cancelAnimationFrame(umAnim);
      const [sx, sy] = toView(e); Object.assign(VIEW, zoomAt(VIEW, Math.exp(-e.deltaY * (e.deltaMode === 1 ? .05 : .0016)), sx, sy)); later();
    }, {passive:false});
    const ptrs = new Map(); let drag = null, pinch = null;
    box.addEventListener("pointerdown", e => {
      cancelAnimationFrame(umAnim); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      if (ptrs.size === 1) drag = {x:e.clientX, y:e.clientY, tx:VIEW.tx, ty:VIEW.ty, moved:false, target:e.target};
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = {d:Math.hypot(a[0] - b[0], a[1] - b[1]), k:VIEW.k}; drag = null; }
    });
    box.addEventListener("pointermove", e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      const svg = box.querySelector("svg"), r = svg.getBoundingClientRect(), ux = W / r.width, uy = H / r.height;
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = ((a[0] + b[0]) / 2 - r.left) * ux, my = ((a[1] + b[1]) / 2 - r.top) * uy;
        Object.assign(VIEW, zoomAt(VIEW, pinch.k * d / Math.max(1, pinch.d) / VIEW.k, mx, my)); later(); return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true; box.classList.add("dragging");
      Object.assign(VIEW, clampView({k:VIEW.k, tx:drag.tx + dx * ux, ty:drag.ty + dy * uy})); later();
    });
    const end = e => {
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (drag && !drag.moved && e.type === "pointerup") {
        // клик по городу — приблизить к нему
        const c = drag.target.closest && drag.target.closest("circle[data-gi]"), M = window.__umModel;
        if (c && M) { const g2 = M.groups[+c.dataset.gi]; if (g2) focusGroup(g2); }
      }
      if (ptrs.size === 0) { drag = null; box.classList.remove("dragging"); }
    };
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
    box.addEventListener("dblclick", e => { const [sx, sy] = toView(e); mapGo(zoomAt(VIEW, e.shiftKey ? .5 : 2, sx, sy), 260); });
    card.querySelector(".um-zoom").addEventListener("click", e => {
      const b = e.target.closest("button[data-umz]"); if (!b) return; const act = b.dataset.umz;
      if (act === "reset") mapGo({k:1, tx:0, ty:0}, 350); else mapGo(zoomAt(VIEW, act === "in" ? 2 : .5, W / 2, H / 2), 260);
    });
  }
  // центр карты на городе с приближением; координаты берём у отрисованного маркера
  function focusGroup(g2){
    const svg = $("um-svg"), c = svg && svg.querySelector(`circle[data-gi="${window.__umModel.groups.indexOf(g2)}"]`); if (!c) return;
    const X = +c.getAttribute("cx"), Y = +c.getAttribute("cy"), k2 = Math.max(VIEW.k * 2.2, 5), r = k2 / VIEW.k;
    // точка (X, Y) должна оказаться в центре
    mapGo({k:k2, tx:-(X - W / 2 - VIEW.tx) * r, ty:-(Y - H / 2 - VIEW.ty) * r}, 380);
  }
  // ----- вкладка -----
  const active = () => document.querySelector("#tab-usermap.active");
  function matrixHtml(M){
    const gs = M.groups.filter(g2 => !g2.approx);
    if (gs.length < 2 || gs.length > 14) return "";
    const all = []; gs.forEach((a, i) => gs.forEach((b, j) => { if (i < j) all.push(dist(a, b)); })); const mx = Math.max(...all);
    const head = gs.map(g2 => `<th title="${escH(g2.name)}">${escH(g2.name.length > 11 ? g2.name.slice(0, 10) + "…" : g2.name)}</th>`).join("");
    const rows = gs.map(a => `<tr><td style="text-align:left;white-space:nowrap">${escH(a.name)}</td>${gs.map(b => { if (a === b) return `<td style="color:var(--muted)">—</td>`; const d = dist(a, b); return `<td style="background:color-mix(in srgb,var(--accent) ${Math.round(d / mx * 38)}%,transparent)">${fmt(Math.round(d))}</td>`; }).join("")}</tr>`).join("");
    return `<h2>Расстояния между городами, км</h2><div class="wrap"><table class="um-matrix"><thead><tr><th style="text-align:left"></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function pairTable(title, list, mark){
    if (!list.length) return `<div><h3>${title}</h3><p class="hint">Недостаточно данных.</p></div>`;
    return `<div><h3>${title}</h3><div class="wrap"><table><thead><tr><th>№</th><th style="text-align:left">Города</th><th>Расстояние</th><th style="text-align:left">Кто</th></tr></thead><tbody>${list.slice(0, 8).map((x, i) => `<tr><td>${i + 1}</td><td style="text-align:left">${escH(x.a.name)} ↔ ${escH(x.b.name)}${x.a.approx || x.b.approx ? " ≈" : ""}</td><td><b style="color:${mark}">${fmt(Math.round(x.d))} км</b></td><td style="text-align:left">${escH(names(x.a.members.map(p => p.name), 3))} — ${escH(names(x.b.members.map(p => p.name), 3))}</td></tr>`).join("")}</tbody></table></div></div>`;
  }
  function render(){
    if (!allRows) return;
    const M = model(); window.__umModel = M;
    const out = $("um-out");
    if (M.P.length < 1) { out.innerHTML = `<div class="s-empty">Нет участников с городом или страной. Добавь данные в «Настройки → Дни рождения и города».</div>`; return; }
    const tile = (lbl, num, pl, acc) => `<div class="tile" style="--tile-accent:${acc}"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${pl}</div></div>`;
    const who = x => `${escH(names([x.a.name], 1))} ↔ ${escH(x.b.name)}`;
    const grp = (a, b) => `${escH(names(a.members.map(p => p.name), 2))} ↔ ${escH(names(b.members.map(p => p.name), 2))}`;
    const ga = M.far ? M.groups.find(g2 => g2.key === M.far.a.key) : null, gb = M.far ? M.groups.find(g2 => g2.key === M.far.b.key) : null;
    const na = M.near ? M.groups.find(g2 => g2.key === M.near.a.key) : null, nb2 = M.near ? M.groups.find(g2 => g2.key === M.near.b.key) : null;
    const tiles = [
      tile("Участников на карте", `${M.P.length} из ${M.total}`, `${M.countries.length} ${wordForm(M.countries.length, ["страна", "страны", "стран"])} · ${M.groups.length} ${wordForm(M.groups.length, ["город", "города", "городов"])}`, "#7aa2f7"),
      M.far ? tile("Дальше всего друг от друга", `${fmt(Math.round(M.far.d))} км`, `${grp(ga, gb)}`, "#f7768e") : "",
      M.near ? tile("Ближе всего (разные города)", `${fmt(Math.round(M.near.d))} км`, `${grp(na, nb2)}`, "#76F0B6") : tile("Ближе всего", "—", "нужны два разных города", "#76F0B6"),
      M.center ? tile("Центр колонии", escH(M.center.nearest.g.name), `ближайший город · ${fmt(Math.round(M.center.nearest.d))} км от центра`, "#ffd166") : "",
      M.avgPair ? tile("Средняя дистанция пары", `${fmt(Math.round(M.avgPair))} км`, "между участниками из разных городов", "#bb9af7") : "",
    ].join("");
    const note = [];
    if (M.missing.length) note.push(`Нет координат: ${escH(M.missing.map(x => `${x.name} (${x.b.city || x.b.country})`).join(", "))} — добавь координаты в «Настройки → Дни рождения и города».`);
    if (M.skipped.length) note.push(`Без города, не на карте: ${escH(M.skipped.join(", "))} — включи «Без города — по столице страны», чтобы показать их приблизительно.`);
    if (M.P.some(p => p.approx)) note.push(`Пунктирные точки и значок ≈ — участник без города, поставлен в столицу страны; в «ближе всего» такие пары не участвуют.`);
    note.push(`Расстояния — по прямой (по поверхности Земли). Участники из одного города в «ближе всего» не считаются.`);
    const personRows = M.per.map(x => `<tr><td style="text-align:left"><span class="pname" data-open-profile="${escH(x.p.pk)}">${escH(x.p.name)}</span></td><td style="text-align:left">${escH(x.p.approx ? x.p.country + " ≈" : x.p.city)}</td><td style="text-align:left">${x.nb ? `${escH(x.nb.q.name)} <span style="color:var(--muted)">· ${escH(x.nb.q.city)}</span>` : "—"}</td><td>${x.nb ? fmt(Math.round(x.nb.d)) : "—"}</td><td style="text-align:left">${x.fb ? `${escH(x.fb.q.name)} <span style="color:var(--muted)">· ${escH(x.fb.q.city)}</span>` : "—"}</td><td>${x.fb ? fmt(Math.round(x.fb.d)) : "—"}</td><td>${fmt(Math.round(x.avg))}</td><td>${fmt(Math.round(x.toC))}</td></tr>`).join("");
    const geoBlock = window.__bdGeoHtml ? window.__bdGeoHtml() : "";
    out.innerHTML = `<div class="tiles" style="margin-bottom:14px">${tiles}</div>
      <div class="um-card"><div class="um-map" id="um-map" data-no-zoom>${mapSvg(M)}</div><div class="um-zoom" data-no-export><button type="button" class="mini" data-umz="in" title="Приблизить">+</button><button type="button" class="mini" data-umz="out" title="Отдалить">−</button><button type="button" class="mini" data-umz="reset" title="Весь мир участников">⟲</button></div><div class="um-hint" data-no-export>Колесо — масштаб · перетаскивание — сдвиг · клик по городу — приблизить</div></div><p class="um-note">${note.join("<br>")}</p>
      ${geoBlock}
      <h2>Самые далёкие и самые близкие</h2><div class="um-two">${pairTable("Дальше всего друг от друга", M.farCities, "#f7768e")}${pairTable("Ближе всего (разные города)", M.nearCities, "#76F0B6")}</div>
      <h2>Кто от кого дальше и ближе</h2><p class="hint">Сначала — самые далёкие от остальных. Расстояния в километрах; «ближайший» — из другого города.</p>
      <div class="wrap"><table id="um-people"><thead><tr><th style="text-align:left">Участник</th><th style="text-align:left">Город</th><th style="text-align:left">Ближайший</th><th>км</th><th style="text-align:left">Самый далёкий</th><th>км</th><th>В среднем до остальных</th><th>До центра</th></tr></thead><tbody>${personRows}</tbody></table></div>
      ${matrixHtml(M)}`;
    bindMap();
    const st = $("um-status");
    if ($o("um-land") && TOPO === null) { st.textContent = "Контуры стран не загрузились (нет доступа к интернету) — карта показана без них. Они подгрузятся при следующем открытии."; st.className = "status"; }
    else { st.textContent = ""; st.className = "status"; }
  }
  window.loadUserMap = async function(){
    if (!allRows) $("um-out").innerHTML = `<div class="sk sk-poster" style="height:260px"></div>` + skPage(2, 2);
    try { await getHistory(); } catch (e) { $("um-status").textContent = "Не удалось загрузить данные: " + e.message; $("um-status").className = "status err"; return; }
    render();
    if ($o("um-land") && TOPO === undefined) loadTopo().then(() => { if (active()) render(); });
  };
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("nav button[data-tab]");
    if (b && b.dataset.tab === "usermap") setTimeout(() => window.loadUserMap(), 0);
  });
  ["um-approx", "um-labels", "um-land"].forEach(id => $(id).addEventListener("change", () => { if (active()) { render(); if (id === "um-land" && $o("um-land") && TOPO === undefined) loadTopo().then(() => { if (active()) render(); }); } }));
  HIDE_LEFT_CONTROLS.push("hide-left-usermap"); $("hide-left-usermap").checked = hideLeft;
  $("hide-left-usermap").addEventListener("change", async e => { await onHideLeftChanged(e.target.checked); if (active()) render(); });
  $("um-settings").addEventListener("click", () => { document.querySelector('nav button[data-tab="settings"]').click(); setTimeout(() => $("bio-table")?.scrollIntoView({behavior:"smooth", block:"start"}), 150); });
  // данные могли измениться в настройках
  document.addEventListener("change", e => { if (e.target.closest && e.target.closest("#bio-body") && active()) render(); });

  async function blob(){
    const svg = $("um-svg"); if (!svg) throw new Error("Нет карты");
    return svgToPngBlob(svg, cmpExportPrefs());
  }
  $("um-copy").addEventListener("click", () => copyPngToStatus(() => blob(), $("um-msg"), "Карта скопирована"));
  $("um-download").addEventListener("click", async () => {
    const msg = $("um-msg");
    try { msg.textContent = "Подготовка…"; downloadBlob(await blob(), "colony_map.png"); msg.textContent = "Файл скачан"; } catch (e) { msg.textContent = "Не удалось скачать: " + (e?.message || e); }
    const c = msg.textContent; setTimeout(() => { if (msg.textContent === c) msg.textContent = ""; }, 4500);
  });
  window.__um = {model, coords, dist, decodeTopo};
})();
