#!/usr/bin/env node
/* Colony Stats — автотесты.
   Запуск:  node run.js [путь к index.html]        (по умолчанию ../index.html)
            node run.js index.html --snap папка    (дополнительно сохранить снимки всех вкладок)
   Нужны: Node 18+, Python 3, Playwright (npm i playwright && npx playwright install chromium).
   Тесты поднимают mock-server.py с синтетическими данными, сайт в интернет не ходит. */
const {chromium} = require("playwright");
const {spawn} = require("child_process");
const path = require("path"), fs = require("fs");

const args = process.argv.slice(2);
const snapIdx = args.indexOf("--snap");
const SNAP = snapIdx >= 0 ? path.resolve(args[snapIdx + 1] || "snaps") : null;
const HTML = path.resolve(args.find((a, i) => !a.startsWith("--") && i !== (snapIdx >= 0 ? snapIdx + 1 : -1)) || path.join(__dirname, "..", "index.html"));
const PORT = 8790 + Math.floor(Math.random() * 100), URL = `http://127.0.0.1:${PORT}/`;
const LANGS = ["ru", "en", "uk", "be", "kk", "fr", "pl"];
const results = [];
const ok = (name, pass, info = "") => { results.push({name, pass, info}); console.log(`${pass ? "  ok  " : " FAIL "} ${name}${info ? " — " + info : ""}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newPage(browser, opts = {}, ls = {}) {
  const ctx = await browser.newContext(Object.assign({viewport: {width: 1440, height: 900}, reducedMotion: "reduce"}, opts));
  const page = await ctx.newPage(); page.__errs = [];
  page.on("pageerror", e => page.__errs.push(e.message));
  await page.addInitScript(extra => {
    localStorage.setItem("chatstats.whoAsked.v1", "1"); localStorage.setItem("chatstats.tablo.v1", "0");
    for (const k in extra) localStorage.setItem(k, extra[k]);
  }, ls);
  await page.goto(URL); await page.waitForTimeout(3000);
  return page;
}
const tabsOf = page => page.evaluate(() => [...new Set([...document.querySelectorAll("nav button[data-tab]")].map(b => b.dataset.tab))]);
const go = async (page, t, wait = 900) => { await page.evaluate(t => { const b = document.querySelector(`nav button[data-tab="${t}"]`); b && b.click(); }, t); await page.waitForTimeout(wait); };

(async () => {
  if (!fs.existsSync(HTML)) { console.error("Не найден файл: " + HTML); process.exit(2); }
  const srv = spawn(process.platform === "win32" ? "python" : "python3", [path.join(__dirname, "mock-server.py"), HTML, String(PORT)], {stdio: "ignore"});
  await sleep(2500);
  const browser = await chromium.launch();
  try {
    /* 1. Ошибки JS на каждой вкладке (ПК) */
    { const p = await newPage(browser); const tabs = await tabsOf(p);
      for (const t of tabs) await go(p, t);
      ok("ПК: нет ошибок JS на всех вкладках", p.__errs.length === 0, p.__errs.slice(0, 3).join(" | "));
      /* 2. Сортировка по клику на заголовок */
      await go(p, "months", 1500);
      const col = () => p.evaluate(() => [...document.querySelectorAll("#months-table tbody tr")].map(r => +r.cells[2].textContent.replace(/\D/g, "")));
      const th = '#months-table th[data-gs-i="2"]';
      if (await p.$(th)) {
        await p.click(th, {position: {x: 30, y: 10}}); await p.click(th, {position: {x: 30, y: 10}}); const asc = await col();
        ok("Сортировка: клик по заголовку сортирует столбец", asc.every((v, i) => !i || asc[i - 1] <= v));
        await p.click(th, {position: {x: 30, y: 10}});
      } else ok("Сортировка: заголовки кликабельны", false, "нет th[data-gs-i]");
      /* 3. Сортировка переживает перерисовку таблицы */
      if (await p.$(th)) {
        await p.click(th, {position: {x: 30, y: 10}}); await p.click(th, {position: {x: 30, y: 10}});
        await go(p, "days", 800); await go(p, "months", 1500); const again = await col();
        ok("Сортировка сохраняется после перерисовки", again.every((v, i) => !i || again[i - 1] <= v));
      }
      /* 4. Страница не шире окна на ПК */
      for (const W of [1280, 1024]) { await p.setViewportSize({width: W, height: 800}); const bad = [];
        for (const t of tabs) { await go(p, t, 500); const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > W) bad.push(`${t}:${w}`); }
        ok(`ПК ${W}px: нет горизонтальной прокрутки`, !bad.length, bad.join(", ")); }
      if (SNAP) { fs.mkdirSync(SNAP, {recursive: true}); await p.setViewportSize({width: 1440, height: 900});
        for (const t of tabs) { await go(p, t, 1800); await p.screenshot({path: path.join(SNAP, `pc_${t}.png`), fullPage: true}); } }
      await p.context().close(); }

    /* 5. Телефон: ошибки, переполнение, размеры кнопок */
    for (const W of [390, 320]) {
      const p = await newPage(browser, {viewport: {width: W, height: 780}, isMobile: true, hasTouch: true});
      const tabs = await tabsOf(p), over = [], small = [];
      for (const t of tabs) { await go(p, t);
        const r = await p.evaluate(() => { const tab = document.querySelector(".tab.active");
          const sm = [...tab.querySelectorAll("button,select,.chip")].filter(e => e.offsetParent && !e.closest("svg,.sticky-table-head,table") && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 30).map(e => e.textContent.trim().slice(0, 14));
          return [document.documentElement.scrollWidth, [...new Set(sm)]]; });
        if (r[0] > W) over.push(`${t}:${r[0]}`); if (r[1].length) small.push(`${t}: ${r[1].slice(0, 3).join(", ")}`);
        if (SNAP && W === 390) await p.screenshot({path: path.join(SNAP, `m_${t}.png`), fullPage: true}); }
      ok(`Телефон ${W}px: нет ошибок JS`, p.__errs.length === 0, p.__errs.slice(0, 3).join(" | "));
      ok(`Телефон ${W}px: страница не шире экрана`, !over.length, over.join(", "));
      if (W === 390) ok("Телефон: кнопки не ниже 30 px", !small.length, small.slice(0, 4).join(" · "));
      await p.context().close(); }

    /* 5б. Телефон: живой график на весь экран (подсказка под пальцем, масштаб двумя пальцами, сброс, список серий) */
    { const p = await newPage(browser, {viewport: {width: 390, height: 780}, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
      await go(p, "charts", 1200);
      await p.evaluate(() => { const e = document.getElementById("c-type"); e.value = "trend"; e.dispatchEvent(new Event("change", {bubbles: true})); }); await p.waitForTimeout(1000);
      await p.evaluate(() => { const b = document.querySelector('#c-quick button[data-q="90"]'); b && b.click(); }); await p.waitForTimeout(2200);
      const opened = await p.evaluate(() => { window.__mz.openBest(); return !!(window.__mz.live && window.__mz.live.M); }); await p.waitForTimeout(500);
      ok("Живой график: открывается и подключён к данным", opened);
      if (opened) {
        const box = await p.evaluate(() => { const r = document.querySelector("#mz-view .mz-stage > svg").getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; });
        await p.touchscreen.tap(box.x + box.w / 2, box.y + box.h / 2); await p.waitForTimeout(250);
        const tip = await p.evaluate(() => { const t = document.querySelector("#mz-view .mz-tip"); return t.style.display === "block" && /\d/.test(t.textContent); });
        ok("Живой график: касание показывает подсказку с числами", tip);
        const cdp = await p.context().newCDPSession(p), cx = box.x + box.w / 2, cy = box.y + box.h / 2, tp = (id, x, y) => ({x, y, id});
        await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [tp(1, cx - 30, cy), tp(2, cx + 30, cy)]});
        for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [tp(1, cx - 30 - i * 14, cy), tp(2, cx + 30 + i * 14, cy)]});
        await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []}); await p.waitForTimeout(250);
        const k1 = await p.evaluate(() => window.__mz.live.k);
        ok("Живой график: масштаб двумя пальцами", k1 > 2, "k = " + k1.toFixed(2));
        await p.click('#mz-view .mz-btn[data-z="reset"]'); await p.waitForTimeout(150);
        ok("Живой график: кнопка сброса масштаба", (await p.evaluate(() => window.__mz.live.k)) === 1);
        const chip = await p.$("#mz-view .mz-chip");
        if (chip) { await chip.click(); await p.waitForTimeout(150);
          ok("Живой график: серию можно скрыть в списке", (await p.evaluate(() => document.querySelectorAll("#mz-view .mz-chip:not(.on)").length)) === 1); }
        await p.evaluate(() => window.__mz.close());
      }
      /* столбцы: подсказка по касанию и закрытие без ошибок */
      await p.evaluate(() => { const e = document.getElementById("c-type"); e.value = "bars"; e.dispatchEvent(new Event("change", {bubbles: true})); }); await p.waitForTimeout(1500);
      await p.evaluate(() => { const s = window.__mz.best(); s && window.__mz.open(s); }); await p.waitForTimeout(400); await p.evaluate(() => window.__mz.close());
      ok("Живой график: нет ошибок JS", p.__errs.length === 0, p.__errs.slice(0, 2).join(" | "));
      await p.context().close(); }

    /* 5д. Дизайн-пакет: вид линий, оси, выходные, прореживание, цвет участника, пустое состояние, шкала размеров */
    { const p = await newPage(browser);
      await go(p, "charts", 1200);
      await p.evaluate(() => { const e = document.getElementById("c-type"); e.value = "trend"; e.dispatchEvent(new Event("change", {bubbles: true})); }); await p.waitForTimeout(1000);
      await p.evaluate(() => { const b = document.querySelector('#c-quick button[data-q="90"]'); b && b.click(); }); await p.waitForTimeout(2200);
      const vis = await p.evaluate(() => { const f = document.getElementById("trend-view-field"); return !!f && !f.hidden; });
      ok("Вид линий: поле видно в «Динамике»", vis);
      const cum = await p.evaluate(() => ({paths: document.querySelectorAll("#c-out svg path[data-n]").length, grid: document.querySelectorAll("#c-out .chart-grid").length, wk: document.querySelectorAll("#c-out .chart-weekends rect").length, axis: [...document.querySelectorAll("#c-out text.chart-axis")].map(t => t.textContent).join("|")}));
      ok("Оси: сетка нарисована", cum.grid >= 2, "линий сетки: " + cum.grid);
      ok("Оси: выходные подсвечены на периоде в 90 дней", cum.wk >= 10, "полос: " + cum.wk);
      ok("Оси: нет «K» и десятичной точки в подписях", !/\dK\b|\d\.\d/.test(cum.axis), cum.axis.slice(0, 80));
      for (const v of ["day", "ma7"]) {
        await p.selectOption("#trend-view", v); await p.waitForTimeout(1500);
        const r = await p.evaluate(() => { const M = lineMeta; const s = M && M.series[0]; const vals = s ? [...s.v.values()] : []; return {n: vals.length, mono: vals.every((x, i) => i === 0 || x >= vals[i - 1] - 1e-9), st: (document.querySelector("#c-out .note, #c-out .st, #c-out h3") || {}).textContent || "", sub: document.getElementById("c-out").textContent}; });
        ok("Вид линий «" + v + "»: ряд построен и это не накопление", r.n > 20 && !r.mono, "точек: " + r.n);
        ok("Вид линий «" + v + "»: подзаголовок называет режим", v === "day" ? /по дням/.test(r.sub) : /скользящее среднее/.test(r.sub));
      }
      const ma = await p.evaluate(() => { const M = lineMeta, s = M.series[0], xs = [...s.v.keys()].sort((a, b) => a - b); const d = a => a.slice(1).reduce((q, v, i) => q + Math.abs(v - a[i]), 0); return d(xs.map(x => s.v.get(x))); });
      await p.selectOption("#trend-view", "day"); await p.waitForTimeout(1200);
      const dd = await p.evaluate(() => { const M = lineMeta, s = M.series[0], xs = [...s.v.keys()].sort((a, b) => a - b); const d = a => a.slice(1).reduce((q, v, i) => q + Math.abs(v - a[i]), 0); return d(xs.map(x => s.v.get(x))); });
      ok("Скользящее среднее: линия заметно ровнее дневной", ma < dd * 0.75, ma.toFixed(0) + " против " + dd.toFixed(0));
      await p.selectOption("#trend-view", "cum"); await p.waitForTimeout(800);
      /* прореживание: синтетический ряд на 2000 точек */
      const th = await p.evaluate(() => { const pts = Array.from({length: 2000}, (_, i) => [i + 1, Math.sin(i / 20) * 100 + (i === 777 ? 500 : 0)]); const o = thin(pts, 300); return {n: o.length, first: o[0][0], last: o[o.length - 1][0], max: Math.max(...o.map(q => q[1])), sorted: o.every((q, i) => i === 0 || q[0] >= o[i - 1][0])}; });
      ok("Прореживание: точек не больше лимита, края и пик сохранены", th.n <= 300 && th.first === 1 && th.last === 2000 && th.max > 550 && th.sorted, JSON.stringify(th));
      ok("Подписи оси: тысячи читаются как «1,2 тыс.»", await p.evaluate(() => axisLabel(1200) === "1,2\u00a0тыс." && axisLabel(2500000) === "2,5\u00a0млн" && axisLabel(40) === "40"));
      ok("Вид линий: нет ошибок JS", p.__errs.length === 0, p.__errs.slice(0, 2).join(" | "));
      /* цвет участника */
      await go(p, "stats", 900);
      const dots = await p.evaluate(() => { const el = [...document.querySelectorAll(".pname[data-open-profile]")]; const bad = el.filter(e => { const pk = e.dataset.openProfile; return e.dataset.pc !== getStyle("u", pk).c[0]; }); return {n: el.length, bad: bad.length}; });
      ok("Цвет участника: точка у каждого имени совпадает с цветом линии", dots.n > 0 && dots.bad === 0, JSON.stringify(dots));
      /* пустое состояние */
      const es = await p.evaluate(() => { const d = document.createElement("div"); d.innerHTML = note("Нет данных за выбранный период"); return {btn: !!d.querySelector("[data-es-reset]"), cls: d.firstChild.className}; });
      ok("Пустое состояние: пояснение и кнопка «Сбросить фильтры»", es.btn && /note/.test(es.cls));
      /* шкала размеров */
      const sc = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return ["--sp-1","--sp-2","--sp-3","--sp-4","--sp-5","--r-s","--r-m","--r-l","--h-s","--h-m","--h-l"].map(k => cs.getPropertyValue(k).trim()); });
      ok("Шкала размеров: переменные заданы", sc.every(Boolean), sc.join(" "));
      await p.context().close(); }

    /* 5в. Журнал ошибок: ловит ошибку и отклонённый промис, переживает перезагрузку, показывается в настройках */
    { const p = await newPage(browser);
      await p.evaluate(() => { setTimeout(() => { throw new Error("тестовая ошибка журнала"); }, 0); Promise.reject(new Error("тестовый промис журнала")); });
      await p.waitForTimeout(900);
      const n1 = await p.evaluate(() => window.__errlog ? window.__errlog.list().length : -1);
      ok("Журнал ошибок: записывает ошибку и отклонённый промис", n1 === 2, "записей: " + n1);
      await p.reload(); await p.waitForTimeout(2500); await go(p, "settings", 900);
      const r = await p.evaluate(() => { const L = window.__errlog; return {n: L.list().length, txt: L.text(), sum: (document.getElementById("errlog-sum") || {}).textContent, has: !!document.getElementById("errlog-copy")}; });
      ok("Журнал ошибок: сохраняется после перезагрузки и виден в настройках", r.n === 2 && r.has && /2/.test(r.sum || ""), r.sum);
      ok("Журнал ошибок: текст для копирования содержит версию и сообщения", /Colony Stats/.test(r.txt) && /тестовая ошибка журнала/.test(r.txt) && /тестовый промис журнала/.test(r.txt));
      await p.evaluate(() => document.getElementById("errlog-clear").click()); await p.waitForTimeout(200);
      ok("Журнал ошибок: очистка", (await p.evaluate(() => window.__errlog.list().length)) === 0);
      await p.context().close(); }

    /* 5г. Схема настроек: каждый ключ из кода описан, миграции работают, лишних ключей нет */
    { const code = fs.readFileSync(HTML, "utf8");
      const used = [...new Set([...code.matchAll(/["'`](chatstats\.[A-Za-z0-9_.\-]+)["'`]/g)].map(m => m[1]))];
      const p = await newPage(browser, {}, {"chatstats.lang": "en", "chatstats.trendAppearance.v4": "{}", "chatstats.trendAppearance.v1": "{}", "chatstats.trendAppearance.v3": "{}"});
      const sc = await p.evaluate(() => ({ver: window.__schema && window.__schema.version, keys: window.__schema ? Object.keys(window.__schema.keys) : [], lang: localStorage.getItem("chatstats.lang.v1"), v1: localStorage.getItem("chatstats.trendAppearance.v1"), v3: localStorage.getItem("chatstats.trendAppearance.v3"), v4: localStorage.getItem("chatstats.trendAppearance.v4"), schema: localStorage.getItem("chatstats.schema.v1")}));
      const missing = used.filter(k => !sc.keys.includes(k));
      ok("Схема настроек: все ключи chatstats.* из кода описаны", missing.length === 0, missing.slice(0, 6).join(", "));
      ok("Схема настроек: миграция до v" + sc.ver, sc.schema === String(sc.ver) && sc.lang === "en" && sc.v1 === null && sc.v3 === null && sc.v4 === "{}", JSON.stringify({schema: sc.schema, lang: sc.lang, v1: sc.v1, v3: sc.v3, v4: sc.v4}));
      for (const t of await tabsOf(p)) await go(p, t, 400);
      const unk = await p.evaluate(() => window.__schema.unknown());
      ok("Схема настроек: после обхода вкладок нет неописанных ключей", unk.length === 0, unk.join(", "));
      await p.context().close(); }

    /* 6. Языки: на каждой вкладке нет непереведённого текста (названия событий, имена и города — данные, не интерфейс) */
    const AGO = {en: ["3 days ago", "1 day ago"], uk: ["3 дні тому", "1 день тому"], be: ["3 дні таму", "1 дзень таму"], kk: ["3 күн бұрын", "1 күн бұрын"], fr: ["il y a 3 jours", "il y a 1 jour"], pl: ["3 dni temu", "1 dzień temu"]};
    for (const L of LANGS.slice(1)) {
      const p = await newPage(browser, {}, {"chatstats.lang.v1": L, "chatstats.lang": L});
      const bad = [];
      for (const t of await tabsOf(p)) { await go(p, t, 1000);
        const miss = await p.evaluate(() => (window.__i18nMissing ? window.__i18nMissing() : []).slice(0, 5));
        if (miss.length) bad.push(`${t}: ${miss.slice(0, 2).join(" | ")}`); }
      ok(`Язык ${L}: нет ошибок JS`, p.__errs.length === 0, p.__errs.slice(0, 2).join(" | "));
      ok(`Язык ${L}: все вкладки переведены`, bad.length === 0, bad.length ? `${bad.length} вкладок, например: ${bad.slice(0, 2).join(" ; ")}` : "");
      const ago = await p.evaluate(() => ["3 дня назад", "1 день назад"].map(x => window.__t(x)));
      ok(`Язык ${L}: «N дней назад» по правилам языка`, ago[0] === AGO[L][0] && ago[1] === AGO[L][1], ago.join(" / "));
      await p.context().close(); }

    /* 7. Эксперименты включаются без ошибок */
    { const p = await newPage(browser, {}, {"chatstats.exp.v1": JSON.stringify({pinrows: true, colmove: true, legend: true, anime: true, range: true, pins: true, drill: true, export: true, notes: true})});
      for (const t of await tabsOf(p)) await go(p, t, 600);
      ok("Все эксперименты включены: нет ошибок JS", p.__errs.length === 0, p.__errs.slice(0, 3).join(" | "));
      await p.context().close(); }
  } catch (e) { ok("Тесты дошли до конца", false, String(e).slice(0, 300)); }
  await browser.close(); srv.kill();
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length} из ${results.length} проверок пройдено${failed.length ? ", не пройдено: " + failed.length : ""}.`);
  process.exit(failed.length ? 1 : 0);
})();
