
/* ===================== Дни рождения и города ===================== */
(function(){
  const KEY = "chatstats.bio.v1";
  const DEF = {
    "3":{bd:"01-08",city:"Кривой Рог",country:"Украина"}, "7":{bd:"01-18",city:"Алматы",country:"Казахстан"},
    "106":{bd:"02-14",city:"Кобрин",country:"Беларусь"}, "16":{bd:"03-13",city:"Астана",country:"Казахстан"},
    "14":{bd:"03-13",city:"Санкт-Петербург",country:"Россия"}, "89":{bd:"03-22",city:"Полтава",country:"Украина"},
    "28":{bd:"05-03",country:"Польша"}, "69":{bd:"05-08",city:"Кривой Рог",country:"Украина"},
    "55":{bd:"05-17",city:"Подольск",country:"Россия",ll:"55.42, 37.54"}, "17":{bd:"05-25",city:"Пермь",country:"Россия"},
    "76":{bd:"06-14",country:"Украина"}, "66":{bd:"06-27",city:"Кривой Рог",country:"Украина"},
    "26":{bd:"07-19",country:"Украина"}, "27":{bd:"07-20",city:"Sapcote",country:"Англия"},
    "60":{bd:"07-31",city:"Конаев",country:"Казахстан"}, "2":{bd:"08-15",city:"Санкт-Петербург",country:"Россия"},
    "1":{bd:"09-12",city:"Кривой Рог",country:"Украина"}, "107":{bd:"09-19",city:"Кривой Рог",country:"Украина"},
    "20":{bd:"09-28",country:"Россия"}, "9":{bd:"10-18",country:"Украина"},
    "46":{bd:"11-05",city:"Королёв",country:"Россия"}, "5":{bd:"11-09",city:"Женева",country:"Швейцария"},
    "19":{bd:"12-07",city:"Санкт-Петербург",country:"Россия"}, "108":{country:"Украина"},
    "100":{country:"Польша"}, "105":{city:"Одесса",country:"Украина"},
  };
  const norm = t => String(t || "").toLowerCase().replace(/ё/g, "е").replace(/[-._]/g, " ").replace(/\s+/g, " ").trim();
  const tzOk = t => { try { new Intl.DateTimeFormat("ru-RU", {timeZone:t}); return true; } catch (e) { return false; } };
  const KYIV = tzOk("Europe/Kyiv") ? "Europe/Kyiv" : "Europe/Kiev";
  const CITY_TZ = {"кривой рог":KYIV, "алматы":"Asia/Almaty", "кобрин":"Europe/Minsk", "астана":"Asia/Almaty", "санкт петербург":"Europe/Moscow", "полтава":KYIV, "пермь":"Asia/Yekaterinburg", "королев":"Europe/Moscow", "конаев":"Asia/Almaty", "sapcote":"Europe/London", "женева":"Europe/Zurich", "одесса":KYIV, "москва":"Europe/Moscow", "киев":KYIV, "харьков":KYIV, "днепр":KYIV, "львов":KYIV, "минск":"Europe/Minsk", "варшава":"Europe/Warsaw", "краков":"Europe/Warsaw", "лондон":"Europe/London", "берлин":"Europe/Berlin", "новосибирск":"Asia/Novosibirsk", "екатеринбург":"Asia/Yekaterinburg"};
  const COUNTRY_TZ = {"украина":KYIV, "россия":"Europe/Moscow", "беларусь":"Europe/Minsk", "казахстан":"Asia/Almaty", "польша":"Europe/Warsaw", "англия":"Europe/London", "великобритания":"Europe/London", "швейцария":"Europe/Zurich", "германия":"Europe/Berlin", "франция":"Europe/Paris", "италия":"Europe/Rome", "испания":"Europe/Madrid", "чехия":"Europe/Prague", "грузия":"Asia/Tbilisi", "армения":"Asia/Yerevan", "турция":"Europe/Istanbul", "сша":"America/New_York", "канада":"America/Toronto", "узбекистан":"Asia/Tashkent", "литва":"Europe/Vilnius", "латвия":"Europe/Riga", "эстония":"Europe/Tallinn"};
  const MG = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const MN = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const MS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const ZOD = [["Козерог","♑","12-22"],["Водолей","♒","01-20"],["Рыбы","♓","02-19"],["Овен","♈","03-21"],["Телец","♉","04-20"],["Близнецы","♊","05-21"],["Рак","♋","06-21"],["Лев","♌","07-23"],["Дева","♍","08-23"],["Весы","♎","09-23"],["Скорпион","♏","10-23"],["Стрелец","♐","11-22"]];
  const zodiac = bd => { if (bd >= "12-22" || bd < "01-20") return ZOD[0]; let r = ZOD[1]; ZOD.slice(1).forEach(z => { if (bd >= z[2]) r = z; }); return r; };

  let STORE = {};
  try { STORE = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { STORE = {}; }
  if (typeof STORE !== "object" || Array.isArray(STORE)) STORE = {};
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(STORE)); } catch (e) {} };
  const cleanBd = v => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v || "") ? v : "";
  const entry = pk => { const e = STORE[pk] || DEF[pk]; return e ? {bd:cleanBd(e.bd), city:String(e.city || "").trim(), country:String(e.country || "").trim(), tz:String(e.tz || "").trim(), ll:String(e.ll || "").trim()} : {bd:"", city:"", country:"", tz:"", ll:""}; };
  const has = b => !!(b.bd || b.city || b.country);
  const tzOf = b => (b.tz && tzOk(b.tz)) ? b.tz : (CITY_TZ[norm(b.city)] || COUNTRY_TZ[norm(b.country)] || "");
  const nameOf = pk => NAMES[pk] || `ID ${pk}`;
  const fmtBd = bd => bd ? `${+bd.slice(3)} ${MG[+bd.slice(0, 2) - 1]}` : "";
  const place = b => [b.city, b.country].filter(Boolean).join(", ");
  const r1 = v => (Math.round(v * 10) / 10).toLocaleString("ru-RU");
  const leap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const mk = (y, m, d) => (m === 2 && d === 29 && !leap(y)) ? new Date(y, 2, 1) : new Date(y, m - 1, d);
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function nextOcc(m, d, now){ const t0 = startOfDay(now); let dt = mk(t0.getFullYear(), m, d); if (dt < t0) dt = mk(t0.getFullYear() + 1, m, d); return {date:dt, days:Math.round((dt - t0) / 864e5)}; }
  const dayWord = n => wordForm(n, ["день", "дня", "дней"]);
  const inDays = n => n === 0 ? "сегодня" : n === 1 ? "завтра" : `через ${n} ${dayWord(n)}`;
  function tzOffset(tz, d){
    const p = {}; new Intl.DateTimeFormat("en-US", {timeZone:tz, hourCycle:"h23", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit"}).formatToParts(d).forEach(x => p[x.type] = x.value);
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  }
  const viewerTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || KYIV; } catch (e) { return KYIV; } };
  const timeIn = (tz, d) => new Intl.DateTimeFormat("ru-RU", {timeZone:tz, hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).format(d);
  const hourIn = (tz, d) => Math.floor((((tzOffset(tz, d) + d.getUTCHours() * 60 + d.getUTCMinutes()) % 1440) + 1440) % 1440 / 60);
  const diffText = (tz, d) => { const df = tzOffset(tz, d) - tzOffset(viewerTz(), d); if (!df) return "то же время, что у вас"; const h = Math.abs(df) / 60; return `${df > 0 ? "+" : "−"}${Number.isInteger(h) ? h : r1(h)} ч от вас`; };
  const cityTzLabel = tz => tz.split("/").pop().replace(/_/g, " ");

  window.BIO = {get:pk => entry(String(pk)), tz:pk => tzOf(entry(String(pk))), has:pk => has(entry(String(pk)))};

  // ----- активность по дням (по всем чатам) -----
  let DAILY = null;
  function daily(){
    if (DAILY && DAILY.src === allRows) return DAILY;
    const hasTot = allRows.some(x => Number(x[F.chatPk]) === 0), src = hasTot ? allRows.filter(x => Number(x[F.chatPk]) === 0) : allRows, users = new Map();
    src.forEach(x => {
      const d = String(x[F.date] ?? "").slice(0, 10); if (!d) return;
      const k = String(x[F.userId] ?? x[F.name]); let u = users.get(k); if (!u) { u = {msgs:0, daily:new Map(), first:d}; users.set(k, u); }
      const v = Number(g(x, "msgs")) || 0; u.msgs += v; if (v) u.daily.set(d, (u.daily.get(d) || 0) + v); if (d < u.first) u.first = d;
    });
    DAILY = {src:allRows, users}; return DAILY;
  }
  function bdActivity(pk, bd){
    const u = daily().users.get(String(pk)); if (!u || !bd) return null;
    const [m, d] = [+bd.slice(0, 2), +bd.slice(3)], today = iso(new Date()), y0 = +u.first.slice(0, 4), y1 = +today.slice(0, 4);
    let sum = 0, n = 0, best = null;
    for (let y = y0; y <= y1; y++) {
      if (m === 2 && d === 29 && !leap(y)) continue;
      const ds = `${y}-${pad(m)}-${pad(d)}`; if (ds < u.first || ds > today) continue;
      const v = u.daily.get(ds) || 0; sum += v; n++; if (!best || v > best.v) best = {v, y};
    }
    if (!n) return null;
    const span = Math.max(1, dayIdx(today) - dayIdx(u.first) + 1), normal = u.msgs / span, avg = sum / n;
    return {sum, n, avg, normal, ratio:normal ? avg / normal : 0, best};
  }

  // ----- профиль -----
  window.bioProfileHtml = function(pk, color){
    const b = entry(String(pk)), now = new Date(), tile = (lbl, num, pl, acc) => `<div class="tile" style="--tile-accent:${acc}"><div class="lbl">${lbl}</div><div class="num">${num}</div><div class="place">${pl}</div></div>`;
    if (!has(b)) return `<p class="hint" style="margin:10px 0 0">День рождения и город не указаны — их можно добавить в «Настройки → Дни рождения и города».</p>`;
    const t = [];
    if (b.bd) {
      const o = nextOcc(+b.bd.slice(0, 2), +b.bd.slice(3), now), z = zodiac(b.bd);
      t.push(tile("День рождения 🎂", fmtBd(b.bd), `${o.days === 0 ? "сегодня! 🎉" : inDays(o.days)} · ${z[1]} ${z[0]}`, "#ffd166"));
    }
    if (b.city || b.country) t.push(tile("Город и страна", escH(b.city || b.country), escH(b.city ? (b.country || "") : "город не указан") || "&nbsp;", "#7aa2f7"));
    const tz = tzOf(b);
    if (tz) { const h = hourIn(tz, now); t.push(tile("Местное время", timeIn(tz, now), `${h >= 7 && h < 22 ? "☀️ день" : "🌙 ночь"} · ${diffText(tz, now)}`, "#76F0B6")); }
    const a = b.bd ? bdActivity(pk, b.bd) : null;
    if (a && a.n) t.push(tile("В день рождения", `${a.ratio ? "×" + r1(a.ratio) : "—"}`, `${fmt(Math.round(a.avg))} сообщ. в среднем · ${a.n} ${wordForm(a.n, ["раз", "раза", "раз"])}`, "#bb9af7"));
    return `<h2>О участнике</h2><div class="tiles">${t.join("")}</div>`;
  };

  // ----- вкладка «Дни рождения» -----
  const active = () => document.querySelector("#tab-birthdays.active");
  function geoHtml(P){
    const D = daily().users, agg = (keyFn) => { const m = new Map(); P.forEach(x => { const k = keyFn(x); if (!k) return; const e = m.get(k) || {k, n:0, msgs:0, names:[]}; e.n++; e.msgs += (D.get(x.pk)?.msgs || 0); e.names.push(x.name); m.set(k, e); }); return [...m.values()].sort((a, b) => b.msgs - a.msgs); };
    const aggTable = (title, rows2, col) => { const tot = rows2.reduce((s2, x) => s2 + x.msgs, 0); return rows2.length ? `<div class="wrap"><table data-copy-title="${col === "Страна" ? "Сообщения по странам" : "Сообщения по городам"}"><thead><tr><th style="text-align:left">${col}</th><th>Участников</th><th>Сообщений</th><th>На участника</th><th>Доля</th><th style="text-align:left">Кто</th></tr></thead><tbody>${rows2.map(x => `<tr><td style="text-align:left">${escH(x.k)}</td><td>${x.n}</td><td>${fmt(x.msgs)}</td><td>${fmt(Math.round(x.msgs / x.n))}</td><td>${tot ? r1(x.msgs / tot * 100) : 0}%</td><td style="text-align:left">${escH(x.names.join(", "))}</td></tr>`).join("")}</tbody></table></div>` : ""; };
    const byCountry = agg(x => x.country), byCity = agg(x => x.city);
    const geo = (byCountry.length || byCity.length) ? `<h2>Страны и города</h2><p class="hint">Сообщения участников за всё время — по стране и городу проживания.</p>${aggTable("", byCountry, "Страна")}<div style="height:12px"></div>${aggTable("", byCity, "Город")}` : "";
    return geo;
  }
  window.__bdGeoHtml = () => geoHtml(people());
  window.__bdApi = {
    upcoming(maxDays){
      const now = new Date(), out = [];
      people().forEach(x => { if (!x.bd) return; const o = nextOcc(+x.bd.slice(0, 2), +x.bd.slice(3), now); if (o.days <= maxDays) out.push({pk:x.pk, name:x.name, bd:x.bd, days:o.days, date:o.date}); });
      return out.sort((a, b) => a.days - b.days);
    }
  };
  function people(){
    const out = [];
    Object.keys(NAMES).forEach(pk => { const b = entry(pk); if (has(b) && isVisibleUser(pk)) out.push({pk, name:nameOf(pk), ...b, tzn:tzOf(b)}); });
    return out;
  }
  let LASTP = [];
  function clocksHtml(P){
    const now = new Date(), groups = new Map();
    P.filter(x => x.tzn).forEach(x => { const g2 = groups.get(x.tzn) || {tz:x.tzn, cities:new Set(), names:[]}; g2.cities.add(x.city || x.country); g2.names.push(x.name); groups.set(x.tzn, g2); });
    const list = [...groups.values()].sort((a, b) => tzOffset(a.tz, now) - tzOffset(b.tz, now));
    if (!list.length) return `<p class="hint">Нет участников с городом или страной.</p>`;
    const cards = list.map(g2 => { const h = hourIn(g2.tz, now), night = !(h >= 7 && h < 22);
      return `<div class="bd-clock${night ? " night" : ""}"><div class="t"><span>${timeIn(g2.tz, now)}</span><span>${night ? "🌙" : "☀️"}</span></div><div class="c">${escH([...g2.cities].join(", "))}</div><div class="p">${escH(cityTzLabel(g2.tz))} · ${diffText(g2.tz, now)}</div><div>${g2.names.map(n => `<span class="bd-pill">${escH(n)}</span>`).join("")}</div></div>`; }).join("");
    // сколько участников не спит в каждый час (по времени зрителя)
    const vtz = viewerTz(), vo = tzOffset(vtz, now), tzs = P.filter(x => x.tzn).map(x => tzOffset(x.tzn, now));
    const awake = Array.from({length:24}, (_, H) => tzs.filter(o => { const lh = Math.floor((((H * 60 + (o - vo)) % 1440) + 1440) % 1440 / 60); return lh >= 9 && lh < 23; }).length);
    const mx = Math.max(...awake), best = awake.map((v, H) => v === mx ? H : -1).filter(H => H >= 0);
    const runs = []; best.forEach(H => { const l = runs[runs.length - 1]; if (l && l[1] === H - 1) l[1] = H; else runs.push([H, H]); });
    const bars = awake.map((v, H) => `<div class="mbar${v === mx ? " bd-best" : ""}" title="${pad(H)}:00 — не спят ${v} из ${tzs.length}"><span class="mbar-v">${v}</span><div class="mbar-col"><i style="height:${mx ? v / mx * 100 : 0}%;background:var(--accent)"></i></div><span class="mbar-l">${H % 3 === 0 ? pad(H) : ""}</span></div>`).join("");
    return `<div class="bd-grid">${cards}</div>
      <div class="p-card" style="margin-top:12px"><h3>Когда не спят больше всего (бодрствование 09:00–23:00 по местному времени) · ваше время ${escH(cityTzLabel(vtz))}</h3><div class="mbars bd-bars">${bars}</div>
      <p class="hint" style="margin:10px 0 0">Лучшее окно для общего созвона: <b>${runs.map(r => `${pad(r[0])}:00–${pad(r[1] + 1)}:00`).join(", ")}</b> — не спят ${mx} из ${tzs.length}.</p></div>`;
  }
  function render(){
    if (!allRows) return;
    const now = new Date(), P = people(); LASTP = P;
    const withBd = P.filter(x => x.bd).map(x => ({...x, ...nextOcc(+x.bd.slice(0, 2), +x.bd.slice(3), now), z:zodiac(x.bd)})).sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, "ru"));
    const total = Object.keys(NAMES).filter(isVisibleUser).length;
    let banner = "";
    if (withBd.length) {
      const today = withBd.filter(x => x.days === 0), nxt = today.length ? today : withBd.filter(x => x.days === withBd[0].days);
      const month = withBd.filter(x => x.days > 0 && x.days <= 30).length;
      banner = `<div class="bd-banner" style="--bc:${today.length ? "#ffd166" : "var(--accent)"}"><div class="bd-emoji">${today.length ? "🎉" : "🎂"}</div><div><b>${today.length ? `Сегодня день рождения: ${escH(nxt.map(x => x.name).join(", "))}!` : `Ближайший день рождения: ${escH(nxt.map(x => x.name).join(", "))} — ${inDays(nxt[0].days)} (${fmtBd(nxt[0].bd)})`}</b><div class="hint">В ближайшие 30 дней: ${month} ${wordForm(month, ["день рождения", "дня рождения", "дней рождения"])} · данные о дате рождения есть у ${withBd.length} из ${total} участников</div></div></div>`;
    }
    const upTable = withBd.length ? `<div class="section-head"><h2>Ближайшие дни рождения</h2><button class="mini copy-btn" type="button" id="bd-copy">Копировать</button><span class="hint" id="bd-copy-msg"></span></div>` + __tbl.html({id:"bd-table", rows:withBd,
      rowClass:x => x.days === 0 ? "bd-today" : x.days <= 7 ? "bd-soon" : "",
      cols:[{h:"№", td:(x, i) => i + 1}, {h:"Участник", align:"left", td:x => `<span class="pname" data-open-profile="${escH(x.pk)}">${escH(x.name)}</span>`}, {h:"Дата", td:x => fmtBd(x.bd)}, {h:"Дней до", td:x => x.days === 0 ? "🎉 сегодня" : x.days}, {h:"Знак", td:x => `${x.z[1]} ${x.z[0]}`}, {h:"Город", align:"left", td:x => escH(place(x) || "—")}]}) : `<div class="s-empty">Нет данных о днях рождения — добавь их в «Настройки → Дни рождения и города».</div>`;
    // по месяцам и знакам
    const perM = Array(12).fill(0); withBd.forEach(x => perM[+x.bd.slice(0, 2) - 1]++);
    const mmax = Math.max(1, ...perM), curM = now.getMonth();
    const mbars = perM.map((v, i) => `<div class="mbar${i === curM ? " cur" : ""}" title="${MN[i]}: ${withBd.filter(x => +x.bd.slice(0, 2) === i + 1).map(x => x.name).join(", ") || "—"}"><span class="mbar-v">${v || ""}</span><div class="mbar-col"><i style="height:${v / mmax * 100}%;background:var(--accent)"></i></div><span class="mbar-l">${MS[i]}</span></div>`).join("");
    const zs = ZOD.map(z => ({z, who:withBd.filter(x => x.z[0] === z[0]).map(x => x.name)})).filter(x => x.who.length).sort((a, b) => b.who.length - a.who.length);
    const zodTable = zs.length ? __tbl.html({attrs:{"data-copy-title":"Знаки зодиака"}, rows:zs,
      cols:[{h:"Знак", align:"left", td:x => `${x.z[1]} ${x.z[0]}`}, {h:"Участников", td:x => x.who.length}, {h:"Кто", align:"left", td:x => escH(x.who.join(", "))}]}) : "";
    const monthsBlock = withBd.length ? `<h2>По месяцам и знакам зодиака</h2><div class="p-grid2"><div class="p-card"><h3>Дни рождения по месяцам</h3><div class="mbars bd-bars">${mbars}</div></div><div>${zodTable}</div></div>` : "";
    // страны и города
    // активность в день рождения
    const act = withBd.map(x => ({x, a:bdActivity(x.pk, x.bd)})).filter(r => r.a && r.a.n).sort((a, b) => b.a.ratio - a.a.ratio);
    let actHtml = "";
    if (act.length) {
      const avgRatio = act.reduce((s2, r) => s2 + r.a.ratio, 0) / act.length, rec = act.slice().sort((a, b) => b.a.best.v - a.a.best.v)[0];
      actHtml = `<h2>Пишут ли больше в день рождения?</h2><p class="hint">Среднее число сообщений в день рождения против обычного дня того же человека (со дня первого сообщения). Коэффициент ×1 — как обычно. В среднем по чату: <b>×${r1(avgRatio)}</b>. Рекорд: ${escH(rec.x.name)} — ${fmt(rec.a.best.v)} ${wordForm(rec.a.best.v, ["сообщение", "сообщения", "сообщений"])} в день рождения ${rec.a.best.y} года.</p>
        ${__tbl.html({id:"bd-act-table", rows:act,
          cols:[{h:"№", td:(r, i) => i + 1}, {h:"Участник", align:"left", td:r => escH(r.x.name)}, {h:"Дата", td:r => fmtBd(r.x.bd)}, {h:"Дней рождения в данных", td:r => r.a.n}, {h:"В среднем за ДР", td:r => fmt(Math.round(r.a.avg))}, {h:"Обычный день", td:r => r1(r.a.normal)}, {h:"Во сколько раз", td:r => `<b style="color:${r.a.ratio >= 1 ? "#76F0B6" : "#f7768e"}">×${r1(r.a.ratio)}</b>`}]})}`;
    }
    // «Ближайшие годовщины» живут на вкладке «Время»
    const annHtml = "";
    const navL = [[upTable ? "bd-up-h" : "", "Ближайшие"], [monthsBlock ? "bd-mon-h" : "", "Месяцы и знаки"], [actHtml ? "bd-act-h" : "", "Активность в ДР"], ["bd-now-h", "Сейчас у участников"], [annHtml ? "bd-ann-h" : "", "Годовщины"]].filter(x => x[0]);
    const navH = `<div class="series-chips" id="bd-nav" style="margin:0 0 18px"><span class="hint">К разделу:</span>${navL.map(x => `<button class="chip" type="button" data-bd-go="${x[0]}">${x[1]}</button>`).join("")}</div>`;
    const idh = (h, id) => h.replace("<h2>", `<h2 id="${id}">`);
    $("bd-out").innerHTML = `${banner}${navH}${upTable ? idh(upTable, "bd-up-h") : ""}${monthsBlock ? idh(monthsBlock, "bd-mon-h") : ""}${actHtml ? idh(actHtml, "bd-act-h") : ""}<h2 id="bd-now-h">Сейчас у участников</h2><div id="bd-clocks">${clocksHtml(P)}</div>${annHtml ? idh(annHtml, "bd-ann-h") : ""}`;
  }
  window.loadBirthdays = async function(){
    const st = $("bd-status");
    if (!allRows) $("bd-out").innerHTML = `<div class="sk sk-poster" style="height:110px"></div>` + skPage(3, 2);
    try { await getHistory(); } catch (e) { st.textContent = "Не удалось загрузить данные: " + e.message; st.className = "status err"; return; }
    st.textContent = ""; st.className = "status"; render();
  };
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("nav button[data-tab]");
    if (b && b.dataset.tab === "birthdays") setTimeout(() => window.loadBirthdays(), 0);
    const go = e.target.closest && e.target.closest("[data-bd-go]"); if (go) { const t = document.getElementById(go.dataset.bdGo); if (t) t.scrollIntoView({behavior:"smooth", block:"start"}); }
    if (e.target.closest && e.target.closest("#bd-copy")) copyTableImage("bd-table", "Ближайшие дни рождения", "bd-copy-msg");
    if (e.target.closest && e.target.closest("#bd-open-settings")) { document.querySelector('nav button[data-tab="settings"]').click(); setTimeout(() => $("bio-table")?.scrollIntoView({behavior:"smooth", block:"start"}), 150); }
  });
  setInterval(() => { if (active() && !document.hidden && $("bd-clocks")) $("bd-clocks").innerHTML = clocksHtml(LASTP); }, 30000);

  // «Убрать вышедших» для этой вкладки
  HIDE_LEFT_CONTROLS.push("hide-left-birthdays");
  $("hide-left-birthdays").checked = hideLeft;
  $("hide-left-birthdays").addEventListener("change", async e => { await onHideLeftChanged(e.target.checked); if (active()) render(); });

  // ICS
  $("bd-ics").addEventListener("click", () => {
    const now = new Date(), list = Object.keys(NAMES).map(pk => ({pk, n:nameOf(pk), b:entry(pk)})).filter(x => x.b.bd);
    if (!list.length) { $("bd-msg").textContent = "Нет дат рождения"; return; }
    const esc = t => String(t).replace(/([,;\\])/g, "\\$1"), ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const ev = list.map(x => { const o = nextOcc(+x.b.bd.slice(0, 2), +x.b.bd.slice(3), now), nd = new Date(o.date.getFullYear(), o.date.getMonth(), o.date.getDate() + 1);
      return ["BEGIN:VEVENT", `UID:bday-${x.pk}@chatstats`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(o.date)}`, `DTEND;VALUE=DATE:${ymd(nd)}`, "RRULE:FREQ=YEARLY", `SUMMARY:🎂 День рождения: ${esc(x.n)}`, x.b.city || x.b.country ? `DESCRIPTION:${esc(place(x.b))}` : "", "TRANSP:TRANSPARENT", "END:VEVENT"].filter(Boolean).join("\r\n"); });
    const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ChatStats//Birthdays//RU", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Дни рождения Colony", ...ev, "END:VCALENDAR"].join("\r\n");
    downloadBlob(new Blob([text], {type:"text/calendar;charset=utf-8"}), "colony_birthdays.ics");
    $("bd-msg").textContent = `Календарь скачан: ${list.length}`; setTimeout(() => { $("bd-msg").textContent = ""; }, 4500);
  });

  // ----- настройки -----
  function llPlaceholder(b){ const c = window.BIOGEO && window.BIOGEO.coords(b); if (!c && (b.city || b.country) && !b.ll) return "нет в базе — впиши: 50.45, 30.52"; return c && !b.ll ? `авто: ${c.lat.toFixed(2)}, ${c.lon.toFixed(2)}${c.src === "country" ? " (столица)" : ""}` : "широта, долгота"; }
  function settingsRow(pk){
    const b = entry(pk), m = b.bd ? +b.bd.slice(0, 2) : 0, d = b.bd ? +b.bd.slice(3) : 0, tz = tzOf(b), custom = pk in STORE;
    return `<tr data-bio-pk="${escH(pk)}" class="${custom ? "bio-custom" : ""}"><td style="text-align:left">${escH(nameOf(pk))}</td>
      <td><div class="bio-bd"><select data-bf="day" aria-label="День"><option value="">—</option>${Array.from({length:31}, (_, i) => `<option value="${i + 1}"${d === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select><select data-bf="month" aria-label="Месяц"><option value="">—</option>${MN.map((n, i) => `<option value="${i + 1}"${m === i + 1 ? " selected" : ""}>${n}</option>`).join("")}</select></div></td>
      <td><input data-bf="city" value="${escH(b.city)}" placeholder="Город"></td><td><input data-bf="country" value="${escH(b.country)}" list="bio-countries" placeholder="Страна"></td>
      <td><input data-bf="tz" value="${escH(b.tz)}" placeholder="${escH(tz ? "авто: " + tz : "авто")}"></td>
      <td><input data-bf="ll" value="${escH(b.ll)}" placeholder="${escH(llPlaceholder(b))}"></td>
      <td>${custom ? `<button class="mini" type="button" data-bio-reset="${escH(pk)}" title="${DEF[pk] ? "Вернуть исходные данные" : "Очистить"}">↺</button>` : ""}</td></tr>`;
  }
  function renderSettings2(){
    const body = $("bio-body"); if (!body) return;
    const countries = new Set([...Object.values(DEF).map(x => x.country), ...Object.values(STORE).map(x => x.country), "Украина", "Россия", "Беларусь", "Казахстан", "Польша", "Германия", "Грузия"].filter(Boolean));
    $("bio-countries").innerHTML = [...countries].sort((a, b) => a.localeCompare(b, "ru")).map(c => `<option value="${escH(c)}">`).join("");
    const only = $("bio-only-empty").checked;
    const pks = Object.keys(NAMES).sort((a, b) => NAMES[a].localeCompare(NAMES[b], "ru")).filter(pk => !only || !entry(pk).bd || !(entry(pk).city || entry(pk).country));
    body.innerHTML = pks.map(settingsRow).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--muted)">У всех участников всё заполнено</td></tr>`;
    const all = Object.keys(NAMES); $("bio-msg").textContent = `Дата рождения: ${all.filter(pk => entry(pk).bd).length} из ${all.length} · город или страна: ${all.filter(pk => entry(pk).city || entry(pk).country).length} из ${all.length}`;
  }
  function saveRow(tr){
    const pk = tr.dataset.bioPk, v = k => tr.querySelector(`[data-bf="${k}"]`).value.trim();
    let day = +v("day"), month = +v("month"), bd = "";
    if (day && month) { const maxd = new Date(2024, month, 0).getDate(); if (day > maxd) { day = maxd; tr.querySelector('[data-bf="day"]').value = String(day); } bd = `${pad(month)}-${pad(day)}`; }
    let tz = v("tz"); if (tz && !tzOk(tz)) { tz = ""; tr.querySelector('[data-bf="tz"]').value = ""; $("bio-msg").textContent = "Неизвестный часовой пояс — формат Continent/City, например Europe/Berlin."; }
    let ll = v("ll");
    if (ll) {
      const nums = ll.replace(/[;,]/g, " ").split(/\s+/).filter(Boolean).map(Number);
      if (nums.length === 2 && nums.every(Number.isFinite) && Math.abs(nums[0]) <= 90 && Math.abs(nums[1]) <= 180) ll = `${+nums[0].toFixed(4)}, ${+nums[1].toFixed(4)}`;
      else { ll = ""; $("bio-msg").textContent = "Координаты: два числа через запятую — широта, долгота (например, 47.91, 33.39)."; }
      tr.querySelector('[data-bf="ll"]').value = ll;
    }
    const e = {bd, city:v("city"), country:v("country"), tz, ll}, def = DEF[pk] || {};
    const same = (e.bd === (def.bd || "")) && (e.city === (def.city || "")) && (e.country === (def.country || "")) && !e.tz && !e.ll;
    if (same) delete STORE[pk]; else if (!e.bd && !e.city && !e.country && !e.tz && !e.ll && !DEF[pk]) delete STORE[pk]; else STORE[pk] = e;
    persist(); refresh(pk);
  }
  function refresh(pk){
    const tr = $("bio-body")?.querySelector(`[data-bio-pk="${CSS.escape(pk)}"]`);
    if (tr) { tr.classList.toggle("bio-custom", pk in STORE); const last = tr.lastElementChild, hasBtn = !!last.querySelector("button"); if ((pk in STORE) !== hasBtn) last.innerHTML = pk in STORE ? `<button class="mini" type="button" data-bio-reset="${escH(pk)}" title="${DEF[pk] ? "Вернуть исходные данные" : "Очистить"}">↺</button>` : ""; const llI = tr.querySelector('[data-bf="ll"]'); if (llI) llI.placeholder = llPlaceholder(entry(pk)); const t = tr.querySelector('[data-bf="tz"]'), tz = tzOf(entry(pk)); t.placeholder = tz ? "авто: " + tz : "авто"; }
    const all = Object.keys(NAMES); $("bio-msg").textContent = `Сохранено · дата рождения: ${all.filter(k => entry(k).bd).length} из ${all.length} · город или страна: ${all.filter(k => entry(k).city || entry(k).country).length} из ${all.length}`;
    if (active()) render();
    if ($("tab-profile").classList.contains("active") && typeof renderProfile === "function") renderProfile();
  }
  $("bio-body")?.addEventListener("change", e => { const tr = e.target.closest("tr[data-bio-pk]"); if (tr) saveRow(tr); });
  $("bio-body")?.addEventListener("click", e => { const b = e.target.closest("[data-bio-reset]"); if (!b) return; try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (err) {} delete STORE[b.dataset.bioReset]; persist(); renderSettings2(); refresh(b.dataset.bioReset); });
  $("bio-only-empty").addEventListener("change", renderSettings2);
  $("bio-reset-all").addEventListener("click", () => { if (!Object.keys(STORE).length) { $("bio-msg").textContent = "Нечего возвращать: всё исходное."; return; } if (!confirm("Вернуть исходные данные? Все ваши правки дней рождения и городов будут сброшены.")) return; STORE = {}; persist(); renderSettings2(); if (active()) render(); });
  const baseRS = renderSettings;
  renderSettings = function(){ baseRS.apply(this, arguments); renderSettings2(); };
  renderSettings2();
  window.__bio = {entry, tzOf, DEF, zodiac, nextOcc};
})();
