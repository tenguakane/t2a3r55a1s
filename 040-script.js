
/* ===================== VK: архив помесячной статистики ===================== */
(function(){
  const DATA_KEY = "chatstats.vk.data.v1", ON_KEY = "chatstats.vk.on.v1", MAP_KEY = "chatstats.vk.map.v1", PK_KEY = "chatstats.vk.newpk.v1";
  const NEW0 = 9000001, VKCHAT = 900001, VKCHAT_TITLE = "ВКонтакте", UNKNOWN = "Неизвестные";
  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const SRC_KEY = "chatstats.vk.src.v1", BAKED = window.__BAKED && window.__BAKED.vk && Array.isArray(window.__BAKED.vk.recs) ? window.__BAKED.vk : null;
  let DATA = rd(DATA_KEY, null);
  let VK_OPEN = null, VK_ALL = false;
  if (!DATA || !Array.isArray(DATA.recs)) DATA = null;
  if (DATA && BAKED && rd(SRC_KEY, "") !== "user") DATA = null;   // старая загрузка без отметки — берём встроенные данные
  if (!DATA && BAKED) DATA = JSON.parse(JSON.stringify(BAKED));
  let ON = !!rd(ON_KEY, false) && !!DATA, MAP = rd(MAP_KEY, {}) || {}, NEWPK = rd(PK_KEY, {}) || {}, vkVer = 0;
  const MN_S = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const MN_F = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const ymLabel = ym => `${MN_S[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
  const ymFull = ym => `${MN_F[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
  const nm = t => String(t || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
  const isVkPk = pk => Number(pk) >= NEW0;

  // ---------- сопоставление имён ----------
  const baseNames = () => Object.entries(NAMES).filter(([pk]) => !isVkPk(pk));
  function defaultPk(name){ const f = baseNames().find(([, n]) => nm(n) === nm(name)); return f ? f[0] : "new"; }
  function newPk(name){
    if (NEWPK[name]) return NEWPK[name];
    NEWPK[name] = Math.max(NEW0 - 1, ...Object.values(NEWPK).map(Number)) + 1; wr(PK_KEY, NEWPK); return NEWPK[name];
  }
  function resolve(name){
    const m = MAP[name] || {};
    let target = m.pk !== undefined && (m.pk === "new" || NAMES[m.pk] !== undefined) ? m.pk : defaultPk(name);
    const skip = m.skip !== undefined ? !!m.skip : name === UNKNOWN;
    return target === "new" ? {pk:newPk(name), isNew:true, skip} : {pk:String(target), isNew:false, skip};
  }

  // ---------- разбор xlsx без библиотек ----------
  async function inflateRaw(u8){
    if (typeof DecompressionStream === "undefined") throw new Error("Браузер не поддерживает распаковку; открой файл в современном Chrome/Edge/Firefox/Safari");
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function unzip(buf){
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("Это не xlsx-файл");
    const n = dv.getUint16(e + 10, true); let off = dv.getUint32(e + 16, true); const files = new Map();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csz = dv.getUint32(off + 20, true), nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lo = dv.getUint32(off + 42, true);
      files.set(new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nl)), {method, csz, lo}); off += 46 + nl + el + cl;
    }
    const get = async name => {
      const f = files.get(name); if (!f) return null;
      const nl = dv.getUint16(f.lo + 26, true), el = dv.getUint16(f.lo + 28, true), st = f.lo + 30 + nl + el, data = u8.subarray(st, st + f.csz);
      return new TextDecoder().decode(f.method === 0 ? data : await inflateRaw(data));
    };
    return {files, get};
  }
  const xml = t => new DOMParser().parseFromString(t, "application/xml");
  const colIdx = L => L.split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const dirOf = p => p.slice(0, p.lastIndexOf("/") + 1);
  const joinPath = (base, rel) => { if (rel.startsWith("/")) return rel.slice(1); const parts = (base + rel).split("/"), out = []; parts.forEach(x => { if (x === "..") out.pop(); else if (x && x !== ".") out.push(x); }); return out.join("/"); };
  function readSheet(doc, sst){
    const rows = new Map();
    for (const c of doc.getElementsByTagName("c")) {
      const r = c.getAttribute("r"), t = c.getAttribute("t"), m = r && r.match(/^([A-Z]+)(\d+)$/); if (!m) continue;
      let v = null;
      if (t === "inlineStr") v = [...c.getElementsByTagName("t")].map(x => x.textContent).join("");
      else { const ve = c.getElementsByTagName("v")[0]; if (!ve) continue; v = ve.textContent; if (t === "s") v = sst[+v]; else if (t === "str" || t === "e") v = String(v); else if (t === "b") v = v === "1"; else v = Number(v); }
      const row = rows.get(+m[2]) || new Map(); row.set(colIdx(m[1]), v); rows.set(+m[2], row);
    }
    return rows;
  }
  async function readXlsx(buf){
    const z = await unzip(buf);
    const wbT = await z.get("xl/workbook.xml"); if (!wbT) throw new Error("Не найден xl/workbook.xml — это точно xlsx?");
    const wb = xml(wbT), relsT = await z.get("xl/_rels/workbook.xml.rels"), rels = new Map();
    if (relsT) for (const r of xml(relsT).getElementsByTagName("Relationship")) rels.set(r.getAttribute("Id"), joinPath("xl/", r.getAttribute("Target")));
    const sheets = [...wb.getElementsByTagName("sheet")].map(x => ({name:x.getAttribute("name"), path:rels.get(x.getAttribute("r:id")) || null})).filter(x => x.path);
    const sstT = await z.get("xl/sharedStrings.xml"), sst = sstT ? [...xml(sstT).getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join("")) : [];
    // таблица «Вк»
    let pickSheet = null, ref = null;
    for (const sh of sheets) {
      const relP = dirOf(sh.path) + "_rels/" + sh.path.slice(sh.path.lastIndexOf("/") + 1) + ".rels", rt = await z.get(relP); if (!rt) continue;
      for (const r of xml(rt).getElementsByTagName("Relationship")) {
        if (!/table/i.test(r.getAttribute("Type") || "")) continue;
        const tt = await z.get(joinPath(dirOf(sh.path), r.getAttribute("Target"))); if (!tt) continue;
        const tn = xml(tt).documentElement, names = [tn.getAttribute("name"), tn.getAttribute("displayName")].map(nm);
        if (names.includes("вк") || names.includes("vk")) { pickSheet = sh; ref = tn.getAttribute("ref"); }
      }
    }
    if (!pickSheet) pickSheet = sheets.find(x => nm(x.name) === "лист1") || sheets[0];
    if (!pickSheet) throw new Error("В файле нет листов");
    const rows = readSheet(xml(await z.get(pickSheet.path)), sst);
    let r0 = 1, r1 = Math.max(...rows.keys()), c0 = 0, c1 = 20;
    if (ref) { const m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/); if (m) { c0 = colIdx(m[1]); r0 = +m[2]; c1 = colIdx(m[3]); r1 = +m[4]; } }
    const table = []; for (let r = r0; r <= r1; r++) { const row = rows.get(r), out = []; for (let c = c0; c <= c1; c++) out.push(row ? (row.has(c) ? row.get(c) : null) : null); table.push(out); }
    return {table, sheet:pickSheet.name, hasTable:!!ref};
  }
  function readCsv(text){
    const sep = [";", "\t", ","].map(s => [s, (text.split("\n")[0] || "").split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const table = text.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim()).map(l => l.split(sep).map(c => { c = c.trim().replace(/^"|"$/g, ""); return c !== "" && !isNaN(Number(c.replace(",", "."))) && /^[\d\s.,-]+$/.test(c) ? Number(c.replace(/\s/g, "").replace(",", ".")) : c; }));
    return {table, sheet:"CSV", hasTable:false};
  }
  function toYm(v){
    if (typeof v === "number" && Number.isFinite(v)) { if (v < 20000 || v > 80000) return null; const d = new Date(Math.round((v - 25569) * 86400000)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; }
    const t = String(v == null ? "" : v).trim(); let m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, "0")}`;
    if ((m = t.match(/^\d{1,2}\.(\d{1,2})\.(\d{4})/))) return `${m[2]}-${m[1].padStart(2, "0")}`;
    if ((m = t.match(/^(\d{1,2})\.(\d{4})$/))) return `${m[2]}-${m[1].padStart(2, "0")}`;
    return null;
  }
  function tableToData(res, fileName){
    const T = res.table; if (T.length < 2) throw new Error("В таблице нет строк");
    const head = T[0].map(h => nm(h)), find = (re, d) => { const i = head.findIndex(h => re.test(h)); return i >= 0 ? i : d; };
    const cM = find(/меся|дата|date|month/, 0), cN = find(/имя|участ|name|автор/, 1), cV = find(/данн|сообщ|count|value|кол/, 2);
    const agg = new Map(), skipped = []; let dups = 0;
    T.slice(1).forEach(row => {
      const name = row[cN] == null ? "" : String(row[cN]).trim(), n = Number(row[cV]);
      if (!name && row[cM] == null && (row[cV] == null || row[cV] === "")) return;
      if (!name || !Number.isFinite(n)) return;
      const ym = toYm(row[cM]); if (!ym) { skipped.push([name, n]); return; }
      const k = ym + "|" + name; if (agg.has(k)) dups++;
      agg.set(k, (agg.get(k) || 0) + n);
    });
    if (!agg.size) throw new Error("Не нашёл строки «месяц — имя — данные». Проверь колонки: Месяц, Имя, Данные");
    const recs = [...agg.entries()].map(([k, n]) => { const [ym, name] = k.split("|"); return [ym, name, n]; }).sort((a, b) => a[0].localeCompare(b[0]) || b[2] - a[2]);
    return {name:fileName, at:Date.now(), sheet:res.sheet, recs, skipped, dups};
  }

  // ---------- подмешивание в общую статистику ----------
  const memo = new WeakMap();
  function included(){
    const out = [];
    if (!DATA) return out;
    const agg = new Map();
    DATA.recs.forEach(([ym, name, n]) => { const r = resolve(name); if (r.skip) return; const k = ym + "|" + r.pk; const e = agg.get(k) || {ym, pk:String(r.pk), name:r.isNew ? name : (NAMES[r.pk] || name), n:0}; e.n += n; agg.set(k, e); });
    return [...agg.values()];
  }
  function augment(arr){
    if (!ON || !DATA || !Array.isArray(arr)) return arr;
    const c = memo.get(arr); if (c && c.v === vkVer) return c.out;
    const sample = arr.find(x => x && typeof x === "object") || {};
    const pk = (k, def) => resolved[k] || [].concat(F[k]).find(n => sample[n] !== undefined) || def;
    const mk = pk("msgs", "messages_count"), sk = pk("stick", "sticker_count"), vk = pk("voice", "voice_count"), dk = pk("video", "video_note_count");
    const tot = arr.find(x => Number(x[F.chatPk]) === 0), inc = included(), add = [];
    inc.forEach(e => {
      const base = {[F.date]:e.ym + "-01", [F.userId]:Number(e.pk), [F.name]:e.name, [mk]:e.n, [sk]:0, [vk]:0, [dk]:0};
      add.push({...base, [F.chat]:VKCHAT_TITLE, [F.chatPk]:VKCHAT});
      if (tot) add.push({...base, [F.chat]:tot[F.chat], [F.chatPk]:0});
    });
    const out = arr.concat(add); memo.set(arr, {v:vkVer, out}); return out;
  }
  window.__vkAugment = augment;
  let registered = new Map();
  function sync(){
    VKDAYS.clear();
    const want = new Map();
    if (ON && DATA) {
      included().forEach(e => { VKDAYS.add(e.ym + "-01"); if (isVkPk(e.pk)) { const w = want.get(e.pk); if (!w) want.set(e.pk, {name:e.name, first:e.ym}); else if (e.ym < w.first) w.first = e.ym; } });
    }
    const saved = new Set((rd("chatstats.people.v1", []) || []).map(p => String(p.pk)));
    registered.forEach((v, pk) => { if (!want.has(pk) && !saved.has(pk)) { delete NAMES[pk]; const i = MEMBERSHIP_STARTS.findIndex(([, id]) => String(id) === pk); if (i >= 0) MEMBERSHIP_STARTS.splice(i, 1); } });
    want.forEach((v, pk) => { if (!(pk in NAMES)) { NAMES[pk] = v.name; if (!MEMBERSHIP_STARTS.some(([, id]) => String(id) === pk)) MEMBERSHIP_STARTS.push([v.first + "-01", Number(pk)]); } });
    registered = want;
    try { rebuildPersonSelect(); } catch (e) {}
    const b = $("vk-toggle");
    if (b) { b.classList.toggle("on", ON); b.setAttribute("aria-pressed", String(ON)); b.title = DATA ? `Добавить данные VK в общую статистику (${fmt(DATA.recs.length)} записей, ${new Set(DATA.recs.map(r => r[1])).size} имён)` : "Загрузите файл на вкладке «Другое → VK»"; }
  }
  async function apply(){ vkVer++; sync(); if (typeof ultApply === "function") await ultApply(); if (active()) render(); }
  const active = () => document.querySelector("#tab-vk.active");
  sync();

  // ---------- модель вкладки ----------
  function model(){
    const hideSkip = $("vk-hide-skip").checked, E = new Map();
    DATA.recs.forEach(([ym, name, n]) => {
      const r = resolve(name); if (hideSkip && r.skip) return;
      const key = r.isNew ? "n:" + name : "p:" + r.pk; let e = E.get(key);
      if (!e) { e = {key, label:r.isNew ? name : (NAMES[r.pk] || name), pk:r.pk, isNew:r.isNew, skip:r.skip, msgs:0, months:new Map(), names:new Set()}; E.set(key, e); }
      e.names.add(name); e.skip = e.skip && r.skip; e.msgs += n; e.months.set(ym, (e.months.get(ym) || 0) + n);
    });
    const all = [...E.values()].sort((a, b) => b.msgs - a.msgs), sel = $("vk-person").value, list = sel ? all.filter(e => e.key === sel) : all;
    const yms = [...new Set(list.flatMap(e => [...e.months.keys()]))].sort();
    const months = [];
    if (yms.length) { let [y, m] = yms[0].split("-").map(Number); const [y1, m1] = yms[yms.length - 1].split("-").map(Number); while (y < y1 || (y === y1 && m <= m1)) { months.push(`${y}-${String(m).padStart(2, "0")}`); if (++m > 12) { m = 1; y++; } } }
    const mrows = months.map(ym => { let v = 0, parts = 0, lead = null; list.forEach(e => { const x = e.months.get(ym) || 0; if (x > 0) { v += x; parts++; if (!lead || x > lead.v) lead = {e, v:x}; } }); return {ym, v, parts, lead}; });
    const yrs = new Map(); mrows.forEach(r => { const y = r.ym.slice(0, 4), a = yrs.get(y) || {y, v:0, act:0, best:null, ppl:new Map()}; a.v += r.v; if (r.v > 0) { a.act++; if (!a.best || r.v > a.best.v) a.best = r; } yrs.set(y, a); });
    list.forEach(e => e.months.forEach((x, ym) => { const a = yrs.get(ym.slice(0, 4)); if (a && x > 0) a.ppl.set(e.key, (a.ppl.get(e.key) || 0) + x); }));
    const years = [...yrs.values()].sort((a, b) => a.y.localeCompare(b.y)).map(a => { const top = [...a.ppl.entries()].sort((x, y) => y[1] - x[1])[0]; return {...a, parts:a.ppl.size, lead:top ? {e:E.get(top[0]), v:top[1]} : null}; });
    const total = list.reduce((s2, e) => s2 + e.msgs, 0), totalAll = all.reduce((s2, e) => s2 + e.msgs, 0);
    return {all, list, mrows, years, total, totalAll, sel};
  }

  // ---------- графики ----------
  const th = () => ({tx:cmpThemeVar("--text", "#e8eaf1"), mu:cmpThemeVar("--muted", "#9aa0b0"), ln:cmpThemeVar("--line", "#2c303b"), ac:cmpThemeVar("--accent", "#7aa2f7")});
  const FF = "Samsung Sans, SamsungOne, Segoe UI, system-ui, sans-serif";
  function niceMax(v){ if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function frame(c, W, H, title, sub, padL, padT, padB, mx){
    let o = ""; if (title) o += `<rect x="30" y="26" width="6" height="26" rx="3" fill="${c.ac}"/><text x="46" y="48" font-size="24" font-weight="700" fill="${c.tx}">${escH(title)}</text>${sub ? `<text x="${W - 30}" y="48" font-size="14" fill="${c.mu}" text-anchor="end">${escH(sub)}</text>` : ""}`;
    const y1 = H - padB, y0 = padT;
    for (let i = 0; i <= 4; i++) { const y = y1 - (y1 - y0) * i / 4; o += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - 24}" y2="${y.toFixed(1)}" stroke="${c.tx}" stroke-opacity="${i ? .08 : .25}"/><text x="${padL - 8}" y="${(y + 4).toFixed(1)}" font-size="12" fill="${c.mu}" text-anchor="end">${escH(fmt(Math.round(mx * i / 4)))}</text>`; }
    return o;
  }
  function monthsSvg(M, title){
    const c = th(), W = 1100, H = title ? 380 : 320, padL = 70, padT = title ? 80 : 24, padB = 44, N = M.mrows.length, mx = niceMax(Math.max(...M.mrows.map(r => r.v), 1));
    const y1 = H - padB, y0 = padT, bw = (W - padL - 24) / Math.max(1, N);
    let o = frame(c, W, H, title, M.sel ? M.list[0].label : "Все участники", padL, padT, padB, mx);
    M.mrows.forEach((r, i) => {
      const x = padL + i * bw, h = (y1 - y0) * r.v / mx, col = yearHue(+r.ym.slice(0, 4));
      if (r.v > 0) o += `<rect x="${(x + bw * .1).toFixed(1)}" y="${(y1 - h).toFixed(1)}" width="${Math.max(1, bw * .8).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="${Math.min(4, bw * .3).toFixed(1)}" fill="${col}"><title>${escH(ymFull(r.ym))}: ${escH(fmt(r.v))}</title></rect>`;
      if (r.ym.endsWith("-01") || i === 0) o += `<line x1="${x.toFixed(1)}" y1="${y1}" x2="${x.toFixed(1)}" y2="${y1 + 6}" stroke="${c.mu}"/><text x="${(x + 3).toFixed(1)}" y="${y1 + 22}" font-size="13" fill="${c.mu}">${r.ym.slice(0, 4)}</text>`;
    });
    const best = M.mrows.reduce((a, r) => !a || r.v > a.v ? r : a, null);
    if (best && best.v > 0) { const i = M.mrows.indexOf(best), x = padL + i * bw + bw / 2; o += `<text x="${Math.min(W - 60, Math.max(padL + 40, x)).toFixed(1)}" y="${(y1 - (y1 - y0) * best.v / mx - 8).toFixed(1)}" font-size="13" font-weight="700" fill="${c.tx}" text-anchor="middle">${escH(fmt(best.v))} · ${escH(ymLabel(best.ym))}</text>`; }
    return `<svg id="vk-svg-months" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FF}">${o}</svg>`;
  }
  function yearsSvg(M, title){
    const c = th(), W = 1100, H = title ? 400 : 340, padL = 70, padT = title ? 90 : 36, padB = 60, N = M.years.length, mx = niceMax(Math.max(...M.years.map(r => r.v), 1));
    const y1 = H - padB, y0 = padT, bw = (W - padL - 24) / Math.max(1, N);
    let o = frame(c, W, H, title, M.sel ? M.list[0].label : "Все участники", padL, padT, padB, mx);
    M.years.forEach((r, i) => {
      const x = padL + i * bw, h = (y1 - y0) * r.v / mx, col = yearHue(+r.y), w = Math.min(110, bw * .7), x0 = x + (bw - w) / 2;
      o += `<rect x="${x0.toFixed(1)}" y="${(y1 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="8" fill="${col}"><title>${r.y}: ${escH(fmt(r.v))}</title></rect><text x="${(x + bw / 2).toFixed(1)}" y="${(y1 - h - 8).toFixed(1)}" font-size="14" font-weight="700" fill="${c.tx}" text-anchor="middle">${escH(fmt(r.v))}</text><text x="${(x + bw / 2).toFixed(1)}" y="${y1 + 22}" font-size="15" fill="${c.tx}" text-anchor="middle">${r.y}</text><text x="${(x + bw / 2).toFixed(1)}" y="${y1 + 40}" font-size="12" fill="${c.mu}" text-anchor="middle">${r.act} ${wordForm(r.act, ["мес.", "мес.", "мес."])}</text>`;
    });
    return `<svg id="vk-svg-years" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FF}">${o}</svg>`;
  }

  // ---------- вкладка ----------
  const pct = (a, b) => b ? (a / b * 100).toFixed(1) + "%" : "—";
  const who = e => e ? escH(e.label) : "—";
  function fillSelects(M){
    const ps = $("vk-person"), cur = ps.value;
    ps.innerHTML = `<option value="">Все</option>` + M.all.map(e => `<option value="${escH(e.key)}">${escH(e.label)} · ${fmt(e.msgs)}</option>`).join("");
    ps.value = [...ps.options].some(o => o.value === cur) ? cur : "";
  }
  function fillYears(M){
    const ys = $("vk-year"), cur = ys.value; ys.innerHTML = `<option value="">Все годы</option>` + M.years.map(y => `<option value="${y.y}">${y.y}</option>`).join(""); ys.value = M.years.some(y => y.y === cur) ? cur : "";
  }
  function mappingHtml(){
    const names = new Map(); DATA.recs.forEach(([ym, name, n]) => { const e = names.get(name) || {name, n:0, first:ym, last:ym}; e.n += n; if (ym < e.first) e.first = ym; if (ym > e.last) e.last = ym; names.set(name, e); });
    const base = baseNames().sort((a, b) => a[1].localeCompare(b[1], "ru"));
    const rows = [...names.values()].sort((a, b) => b.n - a.n).map(e => {
      const r = resolve(e.name), cur = r.isNew ? "new" : String(r.pk);
      const opts = `<option value="new"${cur === "new" ? " selected" : ""}>Новый участник (VK)</option>` + base.map(([pk, n]) => `<option value="${escH(pk)}"${cur === pk ? " selected" : ""}>${escH(n)}</option>`).join("");
      const badge = r.skip ? `<span class="vk-badge skip">не учитывается</span>` : r.isNew ? `<span class="vk-badge new">новый</span>` : `<span class="vk-badge">${escH(NAMES[r.pk] || "")}</span>`;
      return `<tr class="${r.skip ? "off" : ""}"><td style="text-align:left">${escH(e.name)}</td><td>${fmt(e.n)}</td><td>${ymLabel(e.first)} — ${ymLabel(e.last)}</td><td style="text-align:left"><select data-vk-map="${escH(e.name)}">${opts}</select></td><td><input type="checkbox" data-vk-inc="${escH(e.name)}"${r.skip ? "" : " checked"} aria-label="Учитывать"></td><td style="text-align:left">${badge}</td></tr>`;
    }).join("");
    const nNew = [...names.keys()].filter(n => { const r = resolve(n); return r.isNew && !r.skip; }).length;
    return `<h2>Сопоставление имён</h2><p class="hint">У VK нет user_pk, поэтому имена сопоставляются по совпадению. Совпавшие добавляются к существующим участникам, остальные становятся новыми (сейчас новых и учитываемых: ${nNew}). Любое имя можно привязать к другому участнику или отключить — тогда оно не попадёт в общую статистику (в этой вкладке всё равно видно). «${UNKNOWN}» по умолчанию отключены.</p><div class="wrap vk-map"><table data-copy-done="1" id="vk-map-table"><thead><tr><th style="text-align:left">Имя в VK</th><th>Сообщений</th><th>Период</th><th style="text-align:left">Участник в статистике</th><th>Учитывать</th><th style="text-align:left">Статус</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function render(){
    const out = $("vk-out"), st = $("vk-status");
    if (!DATA) {
      $("vk-clear").hidden = true; ["vk-person", "vk-year", "vk-sort", "vk-hide-skip"].forEach(id => $(id).closest(".field, label") && ($(id).closest(".field, label").hidden = true));
      out.innerHTML = `<div class="vk-drop" id="vk-drop"><b>Загрузите файл с архивом VK</b>Перетащите сюда xlsx (лист «Лист1», таблица «Вк»: колонки Месяц, Имя, Данные) или нажмите «Загрузить файл».<br>Файл разбирается прямо в браузере и никуда не отправляется.</div>`;
      st.textContent = ""; return;
    }
    $("vk-clear").hidden = false; ["vk-person", "vk-year", "vk-sort", "vk-hide-skip"].forEach(id => $(id).closest(".field, label") && ($(id).closest(".field, label").hidden = false));
    const M = model(); window.__vkModel = M; fillSelects(M); fillYears(M);
    const M2 = model(), hasMon = M2.mrows.length;
    const yearSel = $("vk-year").value, sort = $("vk-sort").value;
    const first = M2.mrows.find(r => r.v > 0), last = [...M2.mrows].reverse().find(r => r.v > 0), activeM = M2.mrows.filter(r => r.v > 0), best = activeM.reduce((a, r) => !a || r.v > a.v ? r : a, null);
    const lead = M2.sel ? null : M2.list[0];
    const tile = (l, n, p, acc) => `<div class="tile" style="--tile-accent:${acc}"><div class="lbl">${l}</div><div class="num">${n}</div><div class="place">${p}</div></div>`;
    const tiles = `<div class="tiles" style="margin-bottom:14px">${[
      tile("Сообщений в VK", fmt(M2.total), M2.sel ? `${pct(M2.total, M2.totalAll)} от всех в VK` : `${fmt(DATA.recs.length)} записей из файла`, "#7aa2f7"),
      first ? tile("Период", `<span style="font-size:24px;line-height:1.3;display:block">${ymLabel(first.ym)} — ${ymLabel(last.ym)}</span>`, `${activeM.length} ${wordForm(activeM.length, ["месяц", "месяца", "месяцев"])} с данными`, "#ff9e64") : "",
      M2.sel ? tile("Активных месяцев", String(activeM.length), `из ${M2.mrows.length} в периоде`, "#bb9af7") : tile("Участников", String(M2.list.filter(e => e.msgs > 0).length), `${M2.list.filter(e => e.isNew).length} без пары в общей статистике`, "#bb9af7"),
      best ? tile("Лучший месяц", fmt(best.v), escH(ymFull(best.ym)), "#76F0B6") : "",
      activeM.length ? tile("В среднем за месяц", fmt(Math.round(M2.total / activeM.length)), "по месяцам с данными", "#2ac3de") : "",
      lead ? tile("Больше всех", escH(lead.label), `${fmt(lead.msgs)} · ${pct(lead.msgs, M2.total)}`, "#f7768e") : "",
    ].join("")}</div>`;
    const days = DATA.skipped && DATA.skipped.length ? `Пропущено строк без месяца: ${DATA.skipped.length} (${DATA.skipped.slice(0, 3).map(([n, v]) => `${n}: ${fmt(v)}`).join(", ")}${DATA.skipped.length > 3 ? "…" : ""}).` : "";
    st.textContent = `Файл: ${DATA.baked ? DATA.name + " (встроенный в сайт)" : DATA.name} · загружен ${new Date(DATA.at).toLocaleDateString("ru-RU")} · ${ON ? "данные VK добавлены в общую статистику" : "в общую статистику не добавлены — включите переключатель VK в шапке"}. ${days}${DATA.dups ? ` Склеено дублей (месяц + имя): ${DATA.dups}.` : ""}`;
    st.className = "status";
    const chartRow = id => `<div class="copy-row" data-copy-row="1"><button class="mini copy-btn" type="button" data-vk-copy="${id}">Копировать</button><button class="mini" type="button" data-vk-dl="${id}">⬇ PNG</button><span class="hint" data-vk-msg="${id}" role="status"></span></div>`;
    let mr = M2.mrows.filter(r => !yearSel || r.ym.startsWith(yearSel)); const maxV = Math.max(...mr.map(r => r.v), 0);
    mr = mr.map((r, i, a) => ({...r, prev:(a[i - 1] || {}).v})); if (sort === "msgs") mr.sort((a, b) => b.v - a.v);
    const vkGroup = !yearSel && sort !== "msgs" && new Set(mr.map(r => r.ym.slice(0, 4))).size > 1;
    const vkYears = [...new Set(mr.map(r => r.ym.slice(0, 4)))].sort(), vkLast = vkYears[vkYears.length - 1];
    const vkOpen = y => VK_ALL || (VK_OPEN ? VK_OPEN.has(y) : y === vkLast);
    const mrowsFlat = mr.map((r, i) => { const d = r.prev ? (r.v - r.prev) / r.prev * 100 : null; return `<tr><td>${i + 1}</td><td style="text-align:left">${escH(ymFull(r.ym))}</td><td>${fmt(r.v)}</td><td>${r.parts || "—"}</td><td style="text-align:left">${r.lead ? `${who(r.lead.e)} · ${fmt(r.lead.v)}` : "—"}</td><td>${r.lead ? pct(r.lead.v, r.v) : "—"}</td><td style="${d == null ? "" : `color:${d >= 0 ? "#76F0B6" : "#f7768e"}`}">${d == null || !isFinite(d) ? "—" : (d >= 0 ? "+" : "") + d.toFixed(0) + "%"}</td></tr>`; }).join("");
    const mrows = !vkGroup ? mrowsFlat : (() => {
      const parts = mrowsFlat.split("</tr>").filter(x => x.trim()).map(x => x + "</tr>");
      let o = "", curY = null;
      mr.forEach((r, i) => {
        const y = r.ym.slice(0, 4), open = vkOpen(y);
        if (y !== curY) { curY = y; const ys = mr.filter(x => x.ym.startsWith(y)), tot = ys.reduce((a, x) => a + x.v, 0);
          o += `<tr class="vk-yh${open ? " open" : ""}" data-vk-year="${y}" tabindex="0" role="button" aria-expanded="${open}"><td colspan="7" style="text-align:left"><b><i>${open ? "▾" : "▸"}</i> ${y}</b><span class="hint"> · ${ys.length} ${wordForm(ys.length, ["месяц", "месяца", "месяцев"])} · ${fmt(tot)} сообщ.</span></td></tr>`; }
        o += open ? parts[i] : "";
      });
      return o;
    })();
    const yrows = M2.years.map(y => `<tr><td style="text-align:left">${y.y}</td><td>${fmt(y.v)}</td><td>${y.act ? fmt(Math.round(y.v / y.act)) : "—"}</td><td>${y.act}</td><td>${y.parts}</td><td style="text-align:left">${y.lead ? `${who(y.lead.e)} · ${fmt(y.lead.v)}` : "—"}</td><td style="text-align:left">${y.best ? `${escH(ymFull(y.best.ym))} · ${fmt(y.best.v)}` : "—"}</td></tr>`).join("");
    const prow = M2.list.map((e, i) => { const ms = [...e.months.entries()].filter(([, v]) => v > 0).sort((a, b) => a[0].localeCompare(b[0])), bm = [...ms].sort((a, b) => b[1] - a[1])[0], r = [...e.names][0] && resolve([...e.names][0]);
      return `<tr><td>${i + 1}</td><td style="text-align:left">${escH(e.label)}${e.names.size > 1 || (e.names.size === 1 && nm([...e.names][0]) !== nm(e.label)) ? ` <span class="hint">(${escH([...e.names].join(", "))})</span>` : ""}</td><td>${fmt(e.msgs)}</td><td>${pct(e.msgs, M2.total)}</td><td>${ms.length ? ymLabel(ms[0][0]) : "—"}</td><td>${ms.length ? ymLabel(ms[ms.length - 1][0]) : "—"}</td><td>${ms.length}</td><td style="text-align:left">${bm ? `${escH(ymLabel(bm[0]))} · ${fmt(bm[1])}` : "—"}</td><td style="text-align:left">${e.skip ? `<span class="vk-badge skip">не учитывается</span>` : e.isNew ? `<span class="vk-badge new">новый</span>` : `<span class="vk-badge">существующий</span>`}</td></tr>`; }).join("");
    const acc = /^#[0-9a-f]{6}$/i.test(th().ac) ? th().ac : "#7aa2f7", yrsList = M2.years.map(y => y.y), hmMax = Math.max(1, ...M2.list.flatMap(e => yrsList.map(y => [...e.months.entries()].filter(([m]) => m.startsWith(y)).reduce((s2, [, v]) => s2 + v, 0))));
    const heat = !M2.sel && M2.list.length > 1 ? `<h2>Участники по годам</h2><div class="wrap vk-heat"><table><thead><tr><th style="text-align:left">Участник</th>${yrsList.map(y => `<th>${y}</th>`).join("")}<th>Всего</th></tr></thead><tbody>${M2.list.map(e => `<tr><td style="text-align:left">${escH(e.label)}</td>${yrsList.map(y => { const v = [...e.months.entries()].filter(([m]) => m.startsWith(y)).reduce((s2, [, x]) => s2 + x, 0); const a = v ? Math.round(Math.sqrt(v / hmMax) * 60) / 100 : 0; return `<td class="hm" style="background:${v ? hexA(acc, a) : "transparent"}">${v ? fmt(v) : ""}</td>`; }).join("")}<td><b>${fmt(e.msgs)}</b></td></tr>`).join("")}</tbody></table></div>` : "";
    out.innerHTML = `${tiles}
      <h2>По месяцам</h2><div class="vk-card">${monthsSvg(M2)}</div>${chartRow("months")}
      ${vkGroup ? `<div class="copy-row" data-no-export="true"><button class="mini" type="button" data-vk-yall="1">Развернуть все годы</button><button class="mini" type="button" data-vk-yall="0">Свернуть, кроме последнего</button><span class="hint">Годы в таблице можно раскрывать по клику</span></div>` : ""}
      <div class="wrap"><table id="vk-months-table" data-copy-title="VK: по месяцам${yearSel ? " · " + yearSel : ""}"><thead><tr><th>№</th><th style="text-align:left">Месяц</th><th>Сообщений</th><th>Участников</th><th style="text-align:left">Больше всех</th><th>Доля лидера</th><th>К пред. месяцу</th></tr></thead><tbody>${mrows || `<tr><td colspan="7" style="text-align:center;color:var(--muted)">Нет данных</td></tr>`}</tbody></table></div>
      <h2>По годам</h2><div class="vk-card">${yearsSvg(M2)}</div>${chartRow("years")}
      <div class="wrap"><table data-copy-title="VK: по годам"><thead><tr><th style="text-align:left">Год</th><th>Сообщений</th><th>В среднем за месяц</th><th>Активных месяцев</th><th>Участников</th><th style="text-align:left">Больше всех</th><th style="text-align:left">Лучший месяц</th></tr></thead><tbody>${yrows}</tbody></table></div>
      ${M2.sel ? "" : `<h2>Участники</h2><div class="wrap"><table data-copy-title="VK: участники"><thead><tr><th>№</th><th style="text-align:left">Участник</th><th>Сообщений</th><th>Доля</th><th>Первый месяц</th><th>Последний месяц</th><th>Активных месяцев</th><th style="text-align:left">Лучший месяц</th><th style="text-align:left">В общей статистике</th></tr></thead><tbody>${prow}</tbody></table></div>`}
      ${heat}
      <p class="vk-note">Данные VK — по месяцам, поэтому в общей статистике они ложатся на 1-е число месяца: в дневных рекордах, сериях и «лучшем дне» такие даты не учитываются, а в месячных и годовых графиках, итогах, профилях и сравнениях — учитываются.</p>
      ${mappingHtml()}`;
  }
  window.loadVk = async function(){ render(); };
  document.addEventListener("click", e => {
    const h = e.target.closest && e.target.closest("tr.vk-yh"), all = e.target.closest && e.target.closest("[data-vk-yall]");
    if (!h && !all) return;
    if (all) { VK_ALL = all.dataset.vkYall === "1"; VK_OPEN = null; }
    else {
      const open = VK_ALL ? [...document.querySelectorAll("tr.vk-yh")].map(r => r.dataset.vkYear) : [...document.querySelectorAll("tr.vk-yh.open")].map(r => r.dataset.vkYear);
      VK_ALL = false; VK_OPEN = new Set(open);
      VK_OPEN.has(h.dataset.vkYear) ? VK_OPEN.delete(h.dataset.vkYear) : VK_OPEN.add(h.dataset.vkYear);
    }
    render();
  });
  document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("tr.vk-yh")) { e.preventDefault(); e.target.click(); } });

  // ---------- события ----------
  async function loadFile(file){
    const msg = $("vk-msg"); if (!file) return;
    try {
      msg.textContent = "Читаю файл…";
      const res = /\.csv$/i.test(file.name) ? readCsv(await file.text()) : await readXlsx(await file.arrayBuffer());
      DATA = tableToData(res, file.name); wr(DATA_KEY, DATA); wr(SRC_KEY, "user");
      msg.textContent = `Загружено: ${fmt(DATA.recs.length)} записей`;
      if (ON) await apply(); else { vkVer++; sync(); render(); }
    } catch (e) { msg.textContent = "Не удалось загрузить: " + (e && e.message || e); }
    setTimeout(() => { if ($("vk-msg").textContent.startsWith("Загружено")) $("vk-msg").textContent = ""; }, 6000);
  }
  $("vk-pick").addEventListener("click", () => $("vk-file").click());
  $("vk-file").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; loadFile(f); });
  $("vk-clear").addEventListener("click", async () => {
    if (!confirm(BAKED ? "Вернуть встроенные данные VK? Загруженный вами файл будет убран из этого браузера." : "Удалить загруженные данные VK? Сопоставление имён сохранится.")) return;
    const was = ON; DATA = BAKED ? JSON.parse(JSON.stringify(BAKED)) : null; ON = ON && !!DATA; try { localStorage.removeItem(DATA_KEY); localStorage.removeItem(SRC_KEY); } catch (e) {} if (!DATA) wr(ON_KEY, false);
    vkVer++; sync(); if (was && typeof ultApply === "function") await ultApply(); render();
  });
  const tab = $("tab-vk");
  ["dragenter", "dragover"].forEach(ev => tab.addEventListener(ev, e => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) { e.preventDefault(); $("vk-drop")?.classList.add("over"); } }));
  tab.addEventListener("dragleave", () => $("vk-drop")?.classList.remove("over"));
  tab.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); $("vk-drop")?.classList.remove("over"); loadFile(e.dataTransfer.files[0]); } });
  $("vk-toggle").addEventListener("click", async () => {
    if (!DATA) { document.querySelector('nav button[data-tab="vk"]').click(); setTimeout(() => { $("vk-msg").textContent = "Сначала загрузите файл с данными VK"; }, 50); return; }
    ON = !ON; wr(ON_KEY, ON); await apply();
  });
  ["vk-person", "vk-year", "vk-sort", "vk-hide-skip"].forEach(id => $(id).addEventListener("change", () => { if (DATA) render(); }));
  $("vk-out").addEventListener("change", async e => {
    const t = e.target, name = t.dataset.vkMap ?? t.dataset.vkInc; if (name === undefined) return;
    const m = MAP[name] || (MAP[name] = {});
    if (t.dataset.vkMap !== undefined) { if (t.value === defaultPk(name)) delete m.pk; else m.pk = t.value; }
    else { if (!t.checked === (name === UNKNOWN)) delete m.skip; else m.skip = !t.checked; }
    if (!Object.keys(m).length) delete MAP[name];
    wr(MAP_KEY, MAP);
    if (ON) await apply(); else { vkVer++; sync(); render(); }
  });
  async function chartBlob(id){
    const M = model(), svg = id === "years" ? yearsSvg(M, `VK · по годам`) : monthsSvg(M, `VK · по месяцам`);
    const box = document.createElement("div"); box.style.cssText = "position:fixed;left:-10000px;top:0;width:1100px;pointer-events:none"; box.innerHTML = svg; document.body.appendChild(box);
    try { return await svgToPngBlob(box.querySelector("svg"), cmpExportPrefs()); } finally { box.remove(); }
  }
  $("vk-out").addEventListener("click", async e => {
    const c = e.target.closest("[data-vk-copy]"), d = e.target.closest("[data-vk-dl]"), id = (c || d)?.dataset.vkCopy || (c || d)?.dataset.vkDl; if (!id) return;
    const msg = $("vk-out").querySelector(`[data-vk-msg="${id}"]`);
    if (c) { copyPngToStatus(() => chartBlob(id), msg, "График скопирован"); return; }
    try { msg.textContent = "Подготовка…"; downloadBlob(await chartBlob(id), `vk_${id}.png`); msg.textContent = "Файл скачан"; } catch (err) { msg.textContent = "Не удалось: " + (err && err.message || err); }
    setTimeout(() => { msg.textContent = ""; }, 4500);
  });
  new MutationObserver(() => { try { window.__copyimg && __copyimg.decorate($("vk-out")); } catch (e) {} }).observe($("vk-out"), {childList:true});
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest('nav button[data-tab="vk"]'); if (b) setTimeout(() => window.loadVk(), 0); });
  window.__vk = {readXlsx, tableToData, augment, resolve, model, state:() => ({ON, DATA, MAP, NEWPK})};
})();
