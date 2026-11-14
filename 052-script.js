
/* ===================== Эффекты: переключатели и логика ===================== */
(function(){
  const KEY = "chatstats.fx.v1";
  const LIST = [
    ["odometer", "Счётчик-табло: цифры в плитках прокручиваются"],
    ["shimmer", "Золотой блеск по большим цифрам"],
    ["neon", "Неоновое свечение имени в профиле и сравнении"],
    ["fire", "Огонь у текущей серии"],
    ["type", "Печатная машинка для фактов «Итогов года»"],
    ["border", "Бегущая рамка у победителей"],
    ["glass", "Стеклянные подсказки и всплывающие меню"],
    ["parallax", "Мягкий параллакс-фон в Хабе и Итогах года"],
    ["confetti", "Конфетти: день рождения, новое достижение, победа в дуэли"],
    ["fireworks", "Салют в «Итогах года» (декабрь и январь)"],
    ["season", "Частицы на фоне (вид выбирается ниже)"],
    ["misha", "🥚 Пасхалка в «Профиле»"],
    ["yearchips", "Пульсирующие плашки годов в «Топ месяцев» и «Топ дней»"],
    ["glow", "Свечение выделенной линии на графиках"],
    ["pulse", "Пульсирующая точка «сейчас» на линиях"],
    ["morph", "Плавная перестройка столбцов при смене периода"]
  ];
  let FX = {}; LIST.forEach(([k]) => FX[k] = true);
  try { Object.assign(FX, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  FX.reveal = true; // появление блоков при прокрутке включено всегда
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!window.__TABLO; // в стиле «Табло» эффекты выключены
  window.FX = FX;
  const on = k => FX[k] && !RM;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(FX)); } catch (e) {} };

  // ---------- Настройки ----------
  const box = document.getElementById("fx-list");
  if (box) box.innerHTML = LIST.map(([k, t]) => `<label class="checkline"><input type="checkbox" data-fx="${k}">${t}</label>`).join("");
  function syncBoxes(){ document.querySelectorAll("[data-fx]").forEach(c => { c.checked = !!FX[c.dataset.fx]; }); }
  document.addEventListener("change", e => {
    const k = e.target.dataset && e.target.dataset.fx; if (!k) return;
    FX[k] = e.target.checked; save(); applyAll();
  });
  document.getElementById("fx-all-on")?.addEventListener("click", () => { LIST.forEach(([k]) => FX[k] = true); save(); applyAll(); });
  document.getElementById("fx-all-off")?.addEventListener("click", () => { LIST.forEach(([k]) => FX[k] = false); save(); applyAll(); });
  // Фоновые эффекты: всё, что летает или двигается поверх/позади страницы.
  const BG = ["season", "parallax", "fireworks", "confetti", "misha"];
  const bgAnyOn = () => BG.some(k => FX[k]);
  function syncBgBtn(){ const b = document.getElementById("fx-bg-toggle"); if (b) b.textContent = bgAnyOn() ? "Выключить фоновые эффекты" : "Включить фоновые эффекты"; }
  document.getElementById("fx-bg-toggle")?.addEventListener("click", () => { const v = !bgAnyOn(); BG.forEach(k => FX[k] = v); save(); applyAll(); });

  function applyAll(){
    LIST.forEach(([k]) => document.body.classList.toggle("fx-" + k, !!FX[k] && !RM));
    syncBoxes(); syncBgBtn(); decorate(document); bgSync(); seasonSync();
    if (!FX.confetti && !FX.fireworks) { parts = []; }
  }

  // ---------- Огонь, печатная машинка, блеск: дорисовка элементов ----------
  function decorate(root){
    root.querySelectorAll?.(".streak-card.current .lbl").forEach(l => { if (!l.querySelector(".fx-flame")) l.insertAdjacentHTML("beforeend", `<span class="fx-flame" aria-hidden="true">🔥</span>`); });
    if (on("type")) root.querySelectorAll?.(".yr-facts").forEach(ul => {
      if (ul.dataset.fxTyped) return; ul.dataset.fxTyped = "1";
      let del = .2; [...ul.children].forEach(li => { const n = li.textContent.length; li.style.setProperty("--ty-steps", Math.max(8, Math.min(90, n))); li.style.setProperty("--ty-dur", Math.min(2.2, .4 + n * .025).toFixed(2) + "s"); li.style.setProperty("--ty-del", del.toFixed(2) + "s"); del += Math.min(2.2, .4 + n * .025) * .7; li.classList.add("fx-typing"); });
    });
    root.querySelectorAll?.(".tile .num, .hub-kpi .v").forEach((el, i) => { if (!el.style.getPropertyValue("--sh-d")) el.style.setProperty("--sh-d", (i * .45 % 6).toFixed(2) + "s"); });
    if (on("reveal")) revealScan(root);
  }

  // ---------- Табло: цифры прокручиваются ----------
  // Встраиваемся в существующую анимацию чисел: для плиток рисуем «табло», в таблицах остаётся плавный счёт.
  const ODO_SEL = ".tile .num, .p-stat b, .hub-kpi .v, .cmp-total, .dm-grand";
  function odometer(el){
    if (!on("odometer") || el.dataset.fxOdo || el.childNodes.length !== 1 || el.firstChild.nodeType !== 3) return false;
    const txt = el.textContent; if (!/\d/.test(txt) || txt.length > 16) return false;
    el.dataset.fxOdo = "1";
    const wrap = document.createElement("fx-odo"); wrap.setAttribute("aria-label", txt);
    const digits = [];
    [...txt].forEach((ch, i) => {
      if (/\d/.test(ch)) {
        const d = document.createElement("fx-d");
        const strip = document.createElement("fx-s"); strip.innerHTML = Array.from({length:20}, (_, k) => `<fx-i>${k % 10}</fx-i>`).join("");
        d.appendChild(strip); wrap.appendChild(d); digits.push([strip, +ch, i]);
      } else { const t = document.createElement("fx-t"); t.textContent = ch; wrap.appendChild(t); }
    });
    el.textContent = ""; el.appendChild(wrap); el.classList.add("fx-odo-run");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      digits.forEach(([s, v, i]) => { s.style.setProperty("--odo-dur", (700 + i * 90) + "ms"); s.style.transform = `translateY(-${(10 + v) * 1.15}em)`; });
    }));
    // После прокрутки возвращаем обычный текст — так работают копирование и другие функции сайта.
    setTimeout(() => { if (el.isConnected) { el.textContent = txt; } el.classList.remove("fx-odo-run"); delete el.dataset.fxOdo; }, 900 + digits.length * 90 + 200);
    return true;
  }
  if (typeof animateNumber === "function") {
    const orig = animateNumber;
    window.animateNumber = animateNumber = function(el, opt = {}){
      if (opt.fromZero !== false && el.matches && el.matches(ODO_SEL) && odometer(el)) return;
      return orig(el, opt);
    };
  }
  new MutationObserver(recs => {
    if (!on("odometer")) return;
    recs.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches(".hub-kpi .v")) odometer(n); n.querySelectorAll?.(".hub-kpi .v").forEach(odometer); }));
  }).__hub(document.body);

  // ---------- Появление при прокрутке ----------
  const REVEAL_SEL = "#tab-profile .p-card, #tab-profile .tile, #tab-profile .p-grid2 > *, #tab-yearreview .yr-chart-card, #tab-yearreview .p-card, #tab-yearreview .yr-award, #tab-chronicle .ch-item, #tab-hub .hub-card";
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove("fx-pre"); e.target.classList.add("fx-in"); io.unobserve(e.target); } }), {rootMargin:"0px 0px -6% 0px"}) : null;
  function revealScan(root){
    if (!io) return;
    // Сначала все замеры, потом все записи — иначе раскладка пересчитывается на каждом блоке.
    const els = [...(root.querySelectorAll?.(REVEAL_SEL) || [])].filter(el => !el.dataset.fxRv);
    if (!els.length) return;
    const lim = innerHeight * .92, tops = els.map(el => el.getBoundingClientRect().top);
    els.forEach((el, i) => {
      el.dataset.fxRv = "1";
      if (tops[i] < lim) return; // уже на экране — показываем сразу
      el.classList.add("fx-pre"); io.observe(el);
    });
  }
  let decT = 0;
  new MutationObserver(() => { clearTimeout(decT); decT = setTimeout(() => decorate(document), 80); }).__hub(document.querySelector("main") || document.body);

  // ---------- Параллакс-фон ----------
  const bg = document.createElement("div"); bg.id = "fx-bg"; bg.setAttribute("aria-hidden", "true"); bg.innerHTML = "<i></i><i></i><i></i>"; document.body.prepend(bg);
  function bgSync(){
    const t = document.querySelector("main > .tab.active")?.id;
    document.body.classList.toggle("fx-bg-on", on("parallax") && (t === "tab-hub" || t === "tab-yearreview"));
  }
  document.addEventListener("pointermove", e => {
    if (!document.body.classList.contains("fx-bg-on")) return;
    bg.style.setProperty("--fx-px", ((e.clientX / innerWidth) - .5).toFixed(3));
    bg.style.setProperty("--fx-py", ((e.clientY / innerHeight) - .5).toFixed(3));
  }, {passive:true});
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("nav button,[data-gtab],[data-hub-go]")) setTimeout(() => { bgSync(); fireworksCheck(); }, 120); });

  // ---------- Конфетти и салют ----------
  const cv = document.createElement("canvas"); cv.id = "fx-confetti"; document.body.appendChild(cv);
  const ctx = cv.getContext("2d"); let parts = [], raf = 0;
  const COLORS = ["#ffd166", "#ff6ad5", "#67e8f9", "#a78bfa", "#76f0b6", "#ff9e64", "#7aa2f7"];
  const SEASON_LITE = window.matchMedia("(pointer:coarse)").matches;
  function sizeCv(c){ const d = Math.min(2, devicePixelRatio || 1); c.width = Math.round(innerWidth * d); c.height = Math.round(innerHeight * d); c.getContext("2d").setTransform(d, 0, 0, d, 0, 0); }
  function loop(){
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    parts.forEach(p => {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 40); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.spark) { ctx.beginPath(); ctx.arc(0, 0, p.s, 0, 7); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function burst(x, y, n = 120, spread = 1){
    if (!raf) sizeCv(cv);
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * spread, v = 6 + Math.random() * 8;
      parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, g:.22, drag:.985, rot:Math.random() * 6, vr:(Math.random() - .5) * .3, s:6 + Math.random() * 6, c:COLORS[i % COLORS.length], life:120 + Math.random() * 60}); }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function firework(x, y){
    if (!raf) sizeCv(cv);
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4.5;
      parts.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, g:.05, drag:.975, rot:0, vr:0, s:1.6 + Math.random() * 1.6, c, life:70 + Math.random() * 40, spark:true}); }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  window.__fx = {burst, firework};
  const once = k => { try { const s = JSON.parse(sessionStorage.getItem("chatstats.fxOnce") || "{}"); if (s[k]) return false; s[k] = 1; sessionStorage.setItem("chatstats.fxOnce", JSON.stringify(s)); return true; } catch (e) { return true; } };
  function confettiCheck(){
    if (!on("confetti")) return;
    const t = document.querySelector("main > .tab.active")?.id, today = iso(new Date());
    if (t === "tab-profile" || t === "tab-achievements") {
      const pk = t === "tab-profile" ? (typeof person !== "undefined" ? person.value : "") : document.getElementById("ach-person")?.value;
      if (!pk) return;
      let bd = false, ach = false;
      try { bd = (window.__bdApi?.upcoming(0) || []).some(b => String(b.pk) === String(pk) && b.days === 0); } catch (e) {}
      try { ach = (window.__achApi?.recent(today) || []).some(e => String(e.pk) === String(pk) && e.date === today); } catch (e) {}
      if ((bd || ach) && once(`${t}:${pk}:${today}`)) setTimeout(() => burst(innerWidth / 2, innerHeight * .35, bd ? 180 : 110, 1.1), 350);
    }
    if (t === "tab-compare") {
      const w = document.querySelector("#cmp-out .cmp-side.win");
      if (w && typeof cmpLast !== "undefined" && cmpLast && once(`cmp:${cmpLast.title}:${cmpLast.scope}`)) { const r = w.getBoundingClientRect(); if (r.width) setTimeout(() => burst(r.left + r.width / 2, r.top + 40, 70, .8), 300); }
    }
  }
  function fireworksCheck(){
    if (!on("fireworks")) return;
    const t = document.querySelector("main > .tab.active")?.id, m = new Date().getMonth();
    if (t !== "tab-yearreview" || (m !== 11 && m !== 0) || !once("fireworks:" + iso(new Date()).slice(0, 7))) return;
    let k = 0; const shot = () => { firework(innerWidth * (.2 + Math.random() * .6), innerHeight * (.15 + Math.random() * .3)); if (++k < 7) setTimeout(shot, 380 + Math.random() * 300); };
    setTimeout(shot, 500);
  }
  let cT = 0;
  new MutationObserver(() => { clearTimeout(cT); cT = setTimeout(confettiCheck, 400); }).__hub(document.querySelector("main") || document.body);

  // ---------- Частицы на фоне ----------
  const sc = document.createElement("canvas"); sc.id = "fx-season"; document.body.appendChild(sc);
  const sctx = sc.getContext("2d"); let flakes = [], sraf = 0, sKind = "";
  // смена темы: падающие цифры сразу перекрашиваются в новый цвет
  document.addEventListener("click", e => { if (!e.target.closest?.("#theme-grid, #theme-bases")) return; setTimeout(() => { const ac = (getComputedStyle(document.body).getPropertyValue("--accent") || "").trim(); if (!ac) return; flakes.forEach(f => { if (f.ch && /^\d$/.test(f.ch)) f.c = Math.random() < .5 ? ac : `color-mix(in srgb, ${ac} 55%, #ffffff)`; }); }, 120); });
  const PK_KEY = "chatstats.fxParticles.v1";
  let PK = {kind:"auto", density:"mid", size:"m"};
  try { Object.assign(PK, JSON.parse(localStorage.getItem(PK_KEY) || "{}")); } catch (e) {}
  // Виды частиц: цвета, размер, движение и отрисовка.
  const KINDS = {
    snow:{name:"❄️ Снег", col:["#ffffff"], r:[1, 3.2], vy:[.25, .8], vx:.4},
    blizzard:{name:"🌨 Метель", col:["#ffffff", "#eaf4ff"], r:[.8, 3], vy:[1.4, 3.2], vx:0, blizzard:true, base:110},
    flakes:{name:"✳️ Снежинки-кристаллы", col:["#e8f4ff", "#ffffff", "#cfe6ff"], r:[3, 6], vy:[.2, .6], vx:.3, spin:true},
    petals:{name:"🌸 Лепестки сакуры", col:["#ffc2d9", "#ffd6e8", "#ffb3c6"], r:[3, 6], vy:[.3, .8], vx:.5, spin:true},
    fireflies:{name:"✨ Светлячки", col:["#fff3a0", "#d9ff8a"], r:[1.2, 2.8], vy:[-.15, .15], vx:.25, glow:true},
    leaves:{name:"🍂 Листопад", col:["#e8a04b", "#d9712b", "#f2c14e", "#b5562a"], r:[3, 6], vy:[.35, .9], vx:.5, spin:true},
    stars:{name:"⭐ Мерцающие звёзды", col:["#ffffff", "#fff6d5", "#d5e6ff"], r:[.6, 1.8], vy:[0, 0], vx:0, twinkle:true},
    shooting:{name:"🌠 Звездопад", col:["#ffffff", "#d5e6ff"], r:[1, 1.8], vy:[2.5, 4.5], vx:0, shoot:true},
    rain:{name:"🌧 Дождь", col:["#c9dcf2"], r:[0, 0], vy:[0, 0], vx:0, rain:true, base:150},
    storm:{name:"⛈ Гроза", col:["#c9dcf2"], r:[0, 0], vy:[0, 0], vx:0, rain:true, storm:true, base:190},
    bubbles:{name:"🫧 Пузыри", col:["#9fd8ff", "#c7f0ff", "#b9b3ff"], r:[3, 9], vy:[-.7, -.25], vx:.3, ring:true},
    bokeh:{name:"🔵 Боке", col:["#7aa2f7", "#bb9af7", "#7dcfff", "#ff9ecf", "#ffd166"], r:[18, 58], vy:[-.18, .18], vx:.35, bokeh:true, base:16},
    dust:{name:"🌤 Пылинки в луче", col:["#fff4d6", "#ffe9b0", "#ffffff"], r:[.5, 1.6], vy:[-.08, .12], vx:.12, dust:true, base:80},
    hearts:{name:"💗 Сердечки", col:["#ff6b9d", "#ff9ecf", "#ff4d6d", "#ff85a1", "#e0457b"], r:[7, 32], vy:[-.7, -.2], vx:.4, heart:true, base:30},
    glitter:{name:"💎 Блёстки", col:["#ffd166", "#ffffff", "#67e8f9", "#ff9ecf", "#a78bfa"], r:[1, 2.4], vy:[.15, .45], vx:.3, twinkle:true, diamond:true},
    confetti:{name:"🎊 Конфетти", col:["#ff6b9d", "#ffd166", "#76f0b6", "#7aa2f7", "#bb9af7", "#ff9e64"], r:[3, 6], vy:[.8, 2], vx:.8, confetti:true, base:60},
    coins:{name:"🪙 Золотые монеты", col:["#f6c445", "#ffd977", "#e0a526"], r:[5, 9], vy:[.9, 2], vx:.3, coin:true, base:22},
    embers:{name:"🔥 Искры костра", col:["#fff1b0", "#ffd166", "#ffb347", "#ff7a1a", "#ff5a1f"], r:[1, 2.2], vy:[-2.3, -.8], vx:.6, ember:true, base:70},
    lanterns:{name:"🏮 Небесные фонарики", col:["#ffb347", "#ff9640", "#ffc870"], r:[28, 48], vy:[-.5, -.18], vx:.3, lantern:true, base:11},
    balloons:{name:"🎈 Воздушные шары", col:["#ff6b9d", "#7aa2f7", "#ffd166", "#76f0b6", "#bb9af7"], r:[10, 17], vy:[-.9, -.4], vx:.35, balloon:true, base:12},
    butterflies:{name:"🦋 Бабочки", col:["#ffffff"], r:[10, 16], vy:[-.25, .25], vx:.7, butterfly:true, base:10},
    fluff:{name:"🌼 Пух одуванчика", col:["#f4f1e8", "#ffffff"], r:[2, 3.5], vy:[-.1, .3], vx:.7, fluff:true},
    digits:{name:"🔢 Падающие цифры", col:["#76f0b6", "#7aa2f7"], r:[9, 14], vy:[.6, 1.6], vx:0, digits:true},
    chat:{name:"💬 Сообщения", col:["#ffffff"], r:[9, 15], vy:[-.5, -.2], vx:.3, emoji:["💬", "😂", "👍", "❤️", "🔥", "🎉", "😮"]},
    notes:{name:"🎵 Ноты", col:["#c792ea", "#7dcfff", "#ffd166"], r:[9, 14], vy:[-.5, -.2], vx:.4, glyph:"♪"},
    smoke:{name:"💨 Дым", col:["#b9c1cf", "#cfd5e0", "#a3abba"], r:[26, 58], vy:[-.75, -.3], vx:.3, smoke:true, base:28},
    fog:{name:"🌫 Туман", col:["#c9d2e2", "#aeb8cb", "#dfe6f2"], r:[180, 340], vy:[-.03, .03], vx:.5, fog:true, base:10},
    aurora:{name:"🌌 Северное сияние", col:["#76f0b6", "#67e8f9", "#a78bfa", "#2dd4bf"], r:[0, 0], vy:[0, 0], vx:0, aurora:true, base:4},
    warp:{name:"🚀 Полёт сквозь звёзды", col:["#ffffff", "#d5e6ff", "#fff6d5"], r:[.7, 1.9], vy:[0, 0], vx:0, warp:true, base:140},
    salute:{name:"🎆 Салют", col:["#ffd166", "#ff6ad5", "#67e8f9", "#a78bfa", "#76f0b6", "#ff9e64"], r:[0, 0], vy:[0, 0], vx:0, salute:true, base:1},
    clowns:{name:"🤡 Клоуны", col:["#ffffff"], r:[16, 30], vy:[1, 2.4], vx:.4, emoji:["🤡"], tumble:true, alpha:.95, base:20},
    halloween:{name:"🎃 Хэллоуин", col:["#ffffff"], r:[20, 32], vy:[.5, 1.3], vx:.4, emoji:["🎃", "👻", "🦇", "🕸️", "🍬"], tumble:true, alpha:.85, base:22},
    ghosts:{name:"👻 Призраки", col:["#ffffff"], r:[18, 30], vy:[-.5, -.15], vx:.3, emoji:["👻"], ghost:true, base:10},
    money:{name:"💵 Денежный дождь", col:["#ffffff"], r:[20, 32], vy:[.7, 1.6], vx:.5, emoji:["💵", "💸", "💶", "💰"], tumble:true, flutter:true, alpha:.9, base:20},
    foxes:{name:"🦊 Лисички", col:["#ffffff"], r:[20, 32], vy:[.7, 1.6], vx:.4, emoji:["🦊"], tumble:true, alpha:.92, base:20},
    cats:{name:"🐱 Кошки", col:["#ffffff"], r:[20, 32], vy:[.7, 1.6], vx:.4, emoji:["🐱", "🐈", "😺", "😸", "🐈‍⬛", "😻"], tumble:true, alpha:.92, base:20},
    dogs:{name:"🐶 Собаки", col:["#ffffff"], r:[20, 32], vy:[.7, 1.6], vx:.4, emoji:["🐶", "🐕", "🐩", "🦮", "🐕‍🦺", "🐾"], tumble:true, alpha:.92, base:20},
    pets:{name:"🐾 Лисы, кошки и собаки", col:["#ffffff"], r:[20, 32], vy:[.7, 1.6], vx:.4, emoji:["🦊", "🐱", "🐶", "🐈", "🐕", "🐩", "😺", "🦮"], tumble:true, alpha:.92, base:22},
    avocado:{name:"🥑 Авокадо", col:["#ffffff"], r:[20, 32], vy:[.7, 1.6], vx:.4, emoji:["🥑"], tumble:true, alpha:.92, base:18},
    khinkali:{name:"🥟 Хинкали", col:["#ffffff"], r:[15, 24], vy:[.7, 1.6], vx:.4, khinkali:true, tumble:true, alpha:.95, base:18},
    lava:{name:"🫠 Лавовая лампа", col:["#ff3d6e"], r:[0, 0], vy:[0, 0], vx:0, lava:true, base:1},
    food:{name:"🍕 Вкусный дождь", col:["#ffffff"], r:[20, 32], vy:[.7, 1.7], vx:.4, emoji:["🍕", "🍔", "🍩", "🍟", "🌮", "🍦"], tumble:true, alpha:.9, base:20},
  };
  const DENSITY = {min:.22, low:.5, mid:1, high:1.9, max:3.2};
  // Размер частиц: множитель к радиусу каждой частицы.
  const PSIZE = {xs:.55, s:.78, m:1, l:1.35, xl:1.8};
  const sizeK = () => PSIZE[PK.size] || 1;
  const seasonKind = () => { const m = new Date().getMonth(); return m === 11 || m <= 1 ? "snow" : m <= 4 ? "petals" : m <= 7 ? "fireflies" : "leaves"; };
  const curKind = () => KINDS[PK.kind] ? PK.kind : seasonKind();
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Дождь: у капли есть «глубина» — дальние короче, медленнее и бледнее, ближние длинные, быстрые и разбиваются брызгами.
  let splashes = [], wind = 0, windT = 0, flash = 0, bolt = null, nextBolt = 0;
  function makeDrop(K, initial){
    const z = Math.pow(Math.random(), 1.6), vy = 9 + z * 13;
    return {z, x:Math.random() * (innerWidth + 200) - 100, y:initial ? Math.random() * innerHeight : -40 - Math.random() * innerHeight * .3,
      vy, len:(10 + z * 22) * sizeK(), w:(.5 + z * 1.1) * sizeK(), a:.1 + z * .36, ground:innerHeight * (.82 + Math.random() * .18)};
  }
  function makeFlake(k, initial){
    const K = KINDS[k];
    if (K.rain) return makeDrop(K, initial);
    const f = {x:Math.random() * innerWidth, y:initial ? Math.random() * innerHeight : (K.vy[1] < 0 ? innerHeight + 20 : -20), r:rnd(K.r[0], K.r[1]), vy:rnd(K.vy[0], K.vy[1]), vx:(Math.random() - .5) * K.vx, ph:Math.random() * 6, rot:Math.random() * 6, c:K.col[Math.floor(Math.random() * K.col.length)]};
    if (K.shoot) { f.x = Math.random() * innerWidth * 1.2; f.y = initial ? Math.random() * innerHeight * .5 : -20; f.vx = -f.vy * .8; f.wait = Math.random() * 400; }
    if (K.digits) {
      f.ch = String(Math.floor(Math.random() * 10));
      // цифры — в цвет выбранной темы: часть ярче, часть тише
      const ac = (getComputedStyle(document.body).getPropertyValue("--accent") || "").trim() || "#7aa2f7";
      f.c = Math.random() < .5 ? ac : `color-mix(in srgb, ${ac} 55%, #ffffff)`;
    }
    if (K.emoji) f.ch = K.emoji[Math.floor(Math.random() * K.emoji.length)];
    if (K.blizzard) { f.vx = 1.6 + Math.random() * 2.4; f.vy *= .6 + f.r / 4; }
    if (K.bokeh) { f.a = .05 + Math.random() * .12; f.vx = (Math.random() - .5) * K.vx; }
    if (K.confetti) { f.w = f.r * 1.6; f.h = f.r * .8; f.flip = Math.random() * 6; f.fs = .06 + Math.random() * .1; }
    if (K.coin) { f.spin = Math.random() * 6; f.ss = .05 + Math.random() * .06; }
    if (K.butterfly) { f.vx = (Math.random() < .5 ? -1 : 1) * (.3 + Math.random() * .6); f.flap = Math.random() * 6; f.hue = Math.floor(Math.random() * 360); }
    if (K.lantern) { f.fl = Math.random() * 6; }
    if (K.tumble) f.vr = (Math.random() - .5) * .07;
    if (K.ember) { f.len = 6 + Math.random() * 12; f.w = 1.2 + Math.random() * 1.6; f.tw = Math.random() * 6; }
    if (K.smoke) { f.r0 = f.r; f.a = .14 + Math.random() * .12; if (!initial) f.y = innerHeight + f.r; }
    if (K.fog) { f.y = innerHeight * (.2 + Math.random() * .8); f.vx = (.15 + Math.random() * .35) * (Math.random() < .5 ? -1 : 1); f.a = .09 + Math.random() * .08; }
    if (K.heart) { f.r = K.r[0] + Math.pow(Math.random(), 1.8) * (K.r[1] - K.r[0]); f.vy = -(.22 + Math.random() * .3 + (1 - f.r / K.r[1]) * .35); f.pulse = Math.random() * 6; if (!initial) f.y = innerHeight + f.r * 2; }
    if (sizeK() !== 1) { f.r *= sizeK(); if (f.w) f.w *= sizeK(); if (f.h) f.h *= sizeK(); if (f.len) f.len *= sizeK(); if (f.r0) f.r0 = f.r; }
    if (K.warp) { f.ang = Math.random() * Math.PI * 2; f.d = initial ? Math.random() * Math.hypot(innerWidth, innerHeight) / 2 : 2 + Math.random() * 30; f.sp = .4 + Math.random() * 1.3; }
    return f;
  }
  function drawRain(K){
    windT += .004; const gust = K.storm ? 2.2 : 1; wind = (Math.sin(windT) * .5 + Math.sin(windT * 2.7) * .25 + (K.storm ? .9 : .35)) * gust;
    sctx.lineCap = "round";
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i], vx = wind * (2 + f.z * 2.5);
      f.x += vx; f.y += f.vy;
      const hx = f.x, hy = f.y, tx = f.x - vx / f.vy * f.len, ty = f.y - f.len;
      const g = sctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, "rgba(201,220,242,0)"); g.addColorStop(1, `rgba(214,230,250,${f.a})`);
      sctx.strokeStyle = g; sctx.lineWidth = f.w;
      sctx.beginPath(); sctx.moveTo(tx, ty); sctx.lineTo(hx, hy); sctx.stroke();
      if (f.z > .5 && f.y >= f.ground) {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < n; j++) splashes.push({x:f.x, y:f.ground, vx:(Math.random() - .5) * 2.6 + vx * .2, vy:-(1.2 + Math.random() * 2.2) * f.z, life:1, kind:"drop", r:.6 + f.z * .7});
        splashes.push({x:f.x, y:f.ground, life:1, kind:"ring", w:2 + f.z * 6});
        Object.assign(f, makeDrop(K, false));
      } else if (f.y > innerHeight + 30 || f.x > innerWidth + 120 || f.x < -120) Object.assign(f, makeDrop(K, false));
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      if (s.kind === "drop") {
        s.vy += .18; s.x += s.vx; s.y += s.vy; s.life -= .045;
        sctx.globalAlpha = Math.max(0, s.life) * .55; sctx.fillStyle = "#dbe8f8";
        sctx.beginPath(); sctx.arc(s.x, s.y, s.r, 0, 7); sctx.fill();
      } else {
        s.life -= .05;
        const k = 1 - s.life; sctx.globalAlpha = Math.max(0, s.life) * .35; sctx.strokeStyle = "#dbe8f8"; sctx.lineWidth = .8;
        sctx.beginPath(); sctx.ellipse(s.x, s.y, s.w * (.4 + k * 1.6), s.w * (.12 + k * .4), 0, 0, 7); sctx.stroke();
      }
      if (s.life <= 0) splashes.splice(i, 1);
    }
    sctx.globalAlpha = 1;
    if (splashes.length > 600) splashes.splice(0, splashes.length - 600);
    if (K.storm) drawStorm();
  }
  function boltPath(){
    const pts = [[innerWidth * (.15 + Math.random() * .7), -10]];
    let [x, y] = pts[0]; const end = innerHeight * (.35 + Math.random() * .35);
    while (y < end) { x += (Math.random() - .5) * 70; y += 18 + Math.random() * 32; pts.push([x, y]); }
    const br = [];
    for (let i = 2; i < pts.length - 1; i += 2) if (Math.random() < .55) {
      let [bx, by] = pts[i]; const b = [[bx, by]], dir = Math.random() < .5 ? -1 : 1;
      for (let j = 0; j < 3; j++) { bx += dir * (14 + Math.random() * 30); by += 16 + Math.random() * 24; b.push([bx, by]); }
      br.push(b);
    }
    return {pts, br, life:1};
  }
  function strokePath(p, w, c, a){ sctx.globalAlpha = a; sctx.strokeStyle = c; sctx.lineWidth = w; sctx.beginPath(); p.forEach(([x, y], i) => i ? sctx.lineTo(x, y) : sctx.moveTo(x, y)); sctx.stroke(); }
  function drawStorm(){
    const t = performance.now();
    if (!nextBolt) nextBolt = t + 3000 + Math.random() * 6000;
    if (t > nextBolt) { flash = 1; bolt = Math.random() < .7 ? boltPath() : null; nextBolt = t + 5000 + Math.random() * 9000; }
    if (flash > 0) {
      // двойная вспышка: свет, провал, второй разряд
      const f = flash > .82 ? 1 : flash > .7 ? .25 : flash > .58 ? .8 : flash * .9;
      sctx.globalAlpha = .16 * f; sctx.fillStyle = "#dfe8ff"; sctx.fillRect(0, 0, innerWidth, innerHeight);
      if (bolt && flash > .45) {
        sctx.lineCap = "round"; sctx.lineJoin = "round";
        [bolt.pts, ...bolt.br].forEach((p, i) => { const k = i ? .55 : 1; strokePath(p, 7 * k, "#8fb4ff", .18 * f); strokePath(p, 2.4 * k, "#dce8ff", .7 * f); strokePath(p, 1 * k, "#ffffff", .95 * f); });
      }
      flash -= .035; sctx.globalAlpha = 1;
    }
  }
  // Эмодзи и значки рисуются один раз в маленький холст и дальше просто копируются: так в десятки раз быстрее, чем fillText каждый кадр.
  const spriteCache = new Map();
  // Смайлы рисуются картинками iOS; пока картинка грузится — системным шрифтом, потом спрайт пересоздаётся.
  const isEmo = ch => /\p{Extended_Pictographic}/u.test(ch);
  window.__iosEmoji?.onLoad(() => spriteCache.clear());
  function glyphSprite(ch, px, col){
    px = Math.max(8, Math.round(px / 2) * 2);
    const key = ch + "|" + px + "|" + col; let c = spriteCache.get(key); if (c) return c;
    const d = Math.min(2, devicePixelRatio || 1), sz = Math.ceil(px * 1.5);
    c = document.createElement("canvas"); c.width = c.height = Math.ceil(sz * d); c.__s = sz;
    const x = c.getContext("2d"); x.scale(d, d);
    const im = isEmo(ch) && window.__iosEmoji ? window.__iosEmoji.img(ch) : null;
    if (im) { const w = px * 1.15; x.drawImage(im, (sz - w) / 2, (sz - w) / 2, w, w); }
    else {
      x.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = col || "#fff";
      x.fillText(ch, sz / 2, sz / 2);
    }
    if (spriteCache.size > 400) spriteCache.clear();
    spriteCache.set(key, c); return c;
  }
  function drawAurora(){
    const t = performance.now() / 1000, W = innerWidth, H = innerHeight;
    sctx.globalCompositeOperation = "lighter";
    flakes.forEach((b, i) => {
      const y0 = H * (.05 + i * .08), amp = 34 + i * 14, h = H * (.34 + .06 * i);
      sctx.globalAlpha = .26 + .08 * Math.sin(t * .7 + i * 1.7);
      const g = sctx.createLinearGradient(0, y0 - amp, 0, y0 + h + amp);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.18, b.c); g.addColorStop(.5, b.c + "55"); g.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = g; sctx.beginPath();
      for (let x = 0; x <= W + 24; x += 24) { const y = y0 + Math.sin(x * .004 + t * (.22 + i * .06) + b.ph) * amp + Math.sin(x * .011 - t * .4 + i) * amp * .35; x ? sctx.lineTo(x, y) : sctx.moveTo(x, y); }
      sctx.lineTo(W + 24, y0 + h + amp); sctx.lineTo(0, y0 + h + amp);
      sctx.closePath(); sctx.fill();
    });
    sctx.globalCompositeOperation = "source-over"; sctx.globalAlpha = 1;
  }
  let salRk = [], salSp = [], salNext = 0;
  function drawSalute(K){
    const t = performance.now();
    if (t > salNext) {
      salNext = t + (650 + Math.random() * 1300) / (DENSITY[PK.density] || 1);
      salRk.push({x:innerWidth * (.12 + Math.random() * .76), y:innerHeight + 10, vy:-(9 + Math.random() * 4.5), ty:innerHeight * (.12 + Math.random() * .36), c:K.col[Math.floor(Math.random() * K.col.length)]});
    }
    for (let i = salRk.length - 1; i >= 0; i--) {
      const r = salRk[i]; r.y += r.vy; r.vy *= .985;
      sctx.globalAlpha = .9; sctx.fillStyle = "#fff4d6"; sctx.fillRect(r.x - 1, r.y, 2, 9);
      if (r.y <= r.ty || r.vy > -1.2) {
        const n = 60 + Math.floor(Math.random() * 40), two = Math.random() < .4 ? K.col[Math.floor(Math.random() * K.col.length)] : r.c;
        for (let j = 0; j < n; j++) { const a = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * 4.2; salSp.push({x:r.x, y:r.y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, life:1, c:j % 3 ? r.c : two, s:1.8 + Math.random() * 1.8}); }
        salRk.splice(i, 1);
      }
    }
    for (let i = salSp.length - 1; i >= 0; i--) {
      const p = salSp[i]; p.vy += .045; p.vx *= .978; p.vy *= .978; p.x += p.vx; p.y += p.vy; p.life -= .011;
      if (p.life <= 0) { salSp.splice(i, 1); continue; }
      sctx.globalAlpha = Math.min(1, p.life * 1.4) * (.7 + .3 * Math.random()); sctx.fillStyle = p.c;
      sctx.beginPath(); sctx.arc(p.x, p.y, p.s, 0, 7); sctx.fill();
    }
    sctx.globalAlpha = 1;
  }
  // ---------- Лавовая лампа: «капли» сливаются и разделяются, цвета настраиваются ----------
  const LAVA_PRESETS = {
    classic:{name:"Классика", c:["#ff3d6e", "#ff8a3d", "#ffd166", "#ff5fa2"], bg:"#2a0a1a"},
    ocean:{name:"Океан", c:["#00c2ff", "#3d7bff", "#00e5c0", "#8a5cff"], bg:"#04162b"},
    sunset:{name:"Закат", c:["#ff6b6b", "#ffa94d", "#f06595", "#9775fa"], bg:"#2b0f24"},
    neon:{name:"Неон", c:["#39ff14", "#00f0ff", "#ff00e5", "#fff200"], bg:"#0a0a1a"},
    mint:{name:"Мята", c:["#76f0b6", "#67e8f9", "#a78bfa", "#2dd4bf"], bg:"#071a1a"},
    violet:{name:"Фиолет", c:["#b517ff", "#7a5cff", "#ff5fd2", "#4dd2ff"], bg:"#12062b"},
  };
  function lavaCfg(){
    const L = PK.lava || {}, base = LAVA_PRESETS[L.preset] || LAVA_PRESETS.classic;
    const ok = v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
    const colors = Array.isArray(L.colors) && L.colors.length === 4 && L.colors.every(ok) ? L.colors : base.c;
    return {colors, bg:ok(L.bg) ? L.bg : base.bg, preset:L.preset in LAVA_PRESETS ? L.preset : (L.preset === "custom" ? "custom" : "classic")};
  }
  function lavaSyncUI(){
    const box = document.getElementById("fx-lava-box"); if (!box) return;
    const cfg = lavaCfg(), ps = document.getElementById("fx-lava-preset");
    if (ps && !ps.options.length) ps.innerHTML = Object.entries(LAVA_PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("") + `<option value="custom">Свои цвета</option>`;
    if (ps) ps.value = cfg.preset;
    box.querySelectorAll("input[data-lc]").forEach(i => { i.value = cfg.colors[+i.dataset.lc]; });
    const bg = document.getElementById("fx-lava-bg"); if (bg) bg.value = cfg.bg;
  }
  function lavaSave(){ try { localStorage.setItem(PK_KEY, JSON.stringify(PK)); } catch (err) {} }
  document.addEventListener("input", e => {
    const t = e.target; if (!t.closest || !t.closest("#fx-lava-box")) return;
    const cfg = lavaCfg();
    if (t.dataset.lc !== undefined) { const c = cfg.colors.slice(); c[+t.dataset.lc] = t.value; PK.lava = {preset:"custom", colors:c, bg:cfg.bg}; }
    else if (t.id === "fx-lava-bg") PK.lava = {preset:"custom", colors:cfg.colors, bg:t.value};
    else return;
    const ps = document.getElementById("fx-lava-preset"); if (ps) ps.value = "custom";
    lavaSave();
  });
  document.addEventListener("change", e => {
    if (e.target.id !== "fx-lava-preset") return;
    const v = e.target.value, pr = LAVA_PRESETS[v];
    if (pr) PK.lava = {preset:v, colors:pr.c.slice(), bg:pr.bg}; else PK.lava = {...lavaCfg(), preset:"custom"};
    lavaSave(); lavaSyncUI();
  });
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#fx-lava-reset")) return;
    PK.lava = {preset:"classic", colors:LAVA_PRESETS.classic.c.slice(), bg:LAVA_PRESETS.classic.bg}; lavaSave(); lavaSyncUI();
  });
  let lavaBlobs = null, lavaCv = null, lavaT = 0;
  const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function drawLava(){
    const cfg = lavaCfg(), cols = cfg.colors.map(hex2rgb), mult = DENSITY[PK.density] || 1;
    const lq = innerWidth * innerHeight > 1.6e6 ? 5 : 4, lw = Math.max(96, Math.round(innerWidth / lq)), lh = Math.max(64, Math.round(innerHeight / lq));
    if (!lavaCv) lavaCv = document.createElement("canvas");
    if (lavaCv.width !== lw || lavaCv.height !== lh) { lavaCv.width = lw; lavaCv.height = lh; }
    const n = Math.max(4, Math.min(18, Math.round(8 * mult)));
    if (!lavaBlobs || lavaBlobs.length !== n) lavaBlobs = Array.from({length:n}, (_, i) => ({ph:Math.random() * 6.28, sp:.0014 + Math.random() * .0022, x:.06 + Math.random() * .88, amp:.04 + Math.random() * .1, xs:.0006 + Math.random() * .0011, xp:Math.random() * 6.28, r:.075 + Math.random() * .08, c:i % 4, pu:Math.random() * 6.28}));
    lavaT++;
    const k = sizeK(), bl = lavaBlobs.map(b => {
      const y = .5 + .47 * Math.sin(b.ph + lavaT * b.sp), x = b.x + b.amp * Math.sin(b.xp + lavaT * b.xs);
      const R = b.r * lh * k * (1 + .14 * Math.sin(b.pu + lavaT * .01)) * (1 + .18 * Math.cos(b.ph + lavaT * b.sp));
      return {x:x * lw, y:y * lh, R2:R * R, col:cols[b.c]};
    });
    const img = lavaCv.getContext("2d").createImageData(lw, lh), d = img.data, m = bl.length;
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      let F = 0, r = 0, g = 0, b = 0;
      for (let i = 0; i < m; i++) { const o = bl[i], dx = x - o.x, dy = y - o.y, w = o.R2 / (dx * dx + dy * dy + 1); F += w; r += w * o.col[0]; g += w * o.col[1]; b += w * o.col[2]; }
      if (F < .2) continue;
      const t1 = Math.min(1, Math.max(0, (F - .8) / .45)), t2 = Math.min(1, Math.max(0, (F - .2) / .65));
      const a = (t1 * t1 * (3 - 2 * t1)) * .9 + (t2 * t2 * (3 - 2 * t2)) * .22;
      const br = .88 + .3 * Math.min(1, Math.max(0, (F - 1) / 2)), q = (y * lw + x) * 4;
      d[q] = Math.min(255, r / F * br); d[q + 1] = Math.min(255, g / F * br); d[q + 2] = Math.min(255, b / F * br); d[q + 3] = Math.min(255, a * 255);
    }
    lavaCv.getContext("2d").putImageData(img, 0, 0);
    const [br, bg, bb] = hex2rgb(cfg.bg), gr = sctx.createLinearGradient(0, 0, 0, innerHeight);
    gr.addColorStop(0, `rgba(${br},${bg},${bb},.15)`); gr.addColorStop(1, `rgba(${br},${bg},${bb},.7)`);
    sctx.fillStyle = gr; sctx.fillRect(0, 0, innerWidth, innerHeight);
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = "high";
    sctx.drawImage(lavaCv, 0, 0, innerWidth, innerHeight);
  }
  // Хинкали: тесто с «пучком» складок наверху
  function drawKhinkali(f){
    const r = f.r;
    sctx.rotate(-f.rot); sctx.rotate(Math.sin(f.ph) * .2 + f.rot);
    sctx.lineCap = "round"; sctx.lineJoin = "round";
    const body = () => { sctx.beginPath(); sctx.moveTo(-r * .3, -r * .5); sctx.bezierCurveTo(-r * .95, -r * .4, -r * 1.12, r * .3, -r * .7, r * .78); sctx.bezierCurveTo(-r * .4, r * 1.06, r * .4, r * 1.06, r * .7, r * .78); sctx.bezierCurveTo(r * 1.12, r * .3, r * .95, -r * .4, r * .3, -r * .5); sctx.closePath(); };
    const g = sctx.createRadialGradient(-r * .35, r * .05, r * .1, 0, r * .3, r * 1.2);
    g.addColorStop(0, "#fffaf0"); g.addColorStop(.55, "#f8ecd0"); g.addColorStop(1, "#e2c995");
    body(); sctx.fillStyle = g; sctx.fill(); sctx.lineWidth = Math.max(.8, r * .05); sctx.strokeStyle = "rgba(130,90,45,.6)"; sctx.stroke();
    // складки «кошелька» расходятся от центра верха
    sctx.strokeStyle = "rgba(140,98,50,.6)"; sctx.lineWidth = Math.max(.7, r * .05);
    for (let i = -4; i <= 4; i++) { sctx.beginPath(); sctx.moveTo(i * r * .06, -r * .5); sctx.quadraticCurveTo(i * r * .17, -r * .3, i * r * .2, r * .02 + Math.abs(i) * r * .05); sctx.stroke(); }
    // верхний «узел»
    sctx.fillStyle = "#f2dcae"; sctx.beginPath(); sctx.ellipse(0, -r * .52, r * .3, r * .13, 0, 0, 7); sctx.fill(); sctx.stroke();
    sctx.fillStyle = "#ead09a"; sctx.beginPath(); sctx.arc(0, -r * .66, r * .12, 0, 7); sctx.fill(); sctx.stroke();
    sctx.beginPath(); sctx.moveTo(-r * .06, -r * .7); sctx.quadraticCurveTo(0, -r * .62, r * .06, -r * .68); sctx.stroke();
  }
  function drawHeart(f, K){
    f.pulse += .06;
    const s = f.r * (1 + .07 * Math.sin(f.pulse * 2)) / 16;
    sctx.rotate(Math.sin(f.ph * 1.3) * .22); sctx.scale(s, s);
    sctx.globalAlpha = .42 + .4 * (f.r / K.r[1]);
    sctx.shadowColor = f.c; sctx.shadowBlur = 6 + f.r * .5;
    const g = sctx.createLinearGradient(0, -14, 0, 13); g.addColorStop(0, "#ffd6e4"); g.addColorStop(.4, f.c); g.addColorStop(1, f.c);
    sctx.fillStyle = g; sctx.beginPath();
    sctx.moveTo(0, 12); sctx.bezierCurveTo(-14, 2, -16, -6, -10, -11); sctx.bezierCurveTo(-5, -15, 0, -11, 0, -7);
    sctx.bezierCurveTo(0, -11, 5, -15, 10, -11); sctx.bezierCurveTo(16, -6, 14, 2, 0, 12); sctx.fill();
    sctx.shadowBlur = 0; sctx.globalAlpha *= .55; sctx.fillStyle = "#ffffff"; sctx.beginPath(); sctx.ellipse(-6, -8, 2.6, 1.6, -.6, 0, 7); sctx.fill();
  }
  function drawEmber(f, sway){
    f.tw += .35;
    const ang = Math.atan2(f.vy, f.vx + sway), life = Math.max(0, Math.min(1, f.y / innerHeight)), fl = .55 + .45 * Math.abs(Math.sin(f.tw));
    sctx.rotate(ang);
    sctx.globalAlpha = (.18 + .82 * life) * fl;
    sctx.shadowColor = "#ff8a2a"; sctx.shadowBlur = 7;
    const g = sctx.createLinearGradient(-f.len, 0, f.len * .35, 0);
    g.addColorStop(0, "rgba(255,80,20,0)"); g.addColorStop(.55, f.c); g.addColorStop(1, "#fff8dc");
    sctx.fillStyle = g; sctx.fillRect(-f.len, -f.w / 2, f.len * 1.35, f.w);
  }
  function drawLantern(f){
    const w = f.r, h = f.r * 1.35, fl = .75 + .25 * Math.sin(f.fl);
    sctx.shadowColor = "rgba(255,160,60,.9)"; sctx.shadowBlur = f.r * 1.4 * fl;
    const g = sctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, "rgba(255,120,40,.85)"); g.addColorStop(.6, `rgba(255,190,90,${.8 * fl + .15})`); g.addColorStop(1, "rgba(255,230,160,.95)");
    sctx.fillStyle = g; sctx.globalAlpha = .85;
    sctx.beginPath(); sctx.moveTo(-w * .42, -h / 2); sctx.lineTo(w * .42, -h / 2); sctx.quadraticCurveTo(w * .6, 0, w * .36, h / 2); sctx.lineTo(-w * .36, h / 2); sctx.quadraticCurveTo(-w * .6, 0, -w * .42, -h / 2); sctx.fill();
    sctx.shadowBlur = 0; sctx.strokeStyle = "rgba(150,60,20,.45)"; sctx.lineWidth = Math.max(.6, w * .04); sctx.globalAlpha = .6;
    [-.16, .16].forEach(k => { sctx.beginPath(); sctx.moveTo(w * k * 1.5, -h / 2); sctx.quadraticCurveTo(w * k * 2.2, 0, w * k * 1.3, h / 2); sctx.stroke(); });
    sctx.fillStyle = "#fff3c4"; sctx.globalAlpha = .9 * fl; sctx.beginPath(); sctx.ellipse(0, h * .36, w * .18, h * .1, 0, 0, 7); sctx.fill();
  }
  function drawBalloon(f){
    const r = f.r;
    sctx.globalAlpha = .7; sctx.strokeStyle = "rgba(255,255,255,.45)"; sctx.lineWidth = .8;
    sctx.beginPath(); sctx.moveTo(0, r * 1.2); sctx.bezierCurveTo(r * .3, r * 1.8, -r * .3, r * 2.4, r * .1, r * 3.1); sctx.stroke();
    const g = sctx.createRadialGradient(-r * .35, -r * .45, r * .1, 0, 0, r * 1.3);
    g.addColorStop(0, "#ffffffcc"); g.addColorStop(.25, f.c); g.addColorStop(1, f.c);
    sctx.fillStyle = g; sctx.globalAlpha = .62;
    sctx.beginPath(); sctx.ellipse(0, 0, r * .85, r * 1.05, 0, 0, 7); sctx.fill();
    sctx.beginPath(); sctx.moveTo(-r * .14, r * 1.02); sctx.lineTo(r * .14, r * 1.02); sctx.lineTo(0, r * 1.2); sctx.fill();
  }
  function drawButterfly(f){
    const s = f.r, k = Math.abs(Math.sin(f.flap));
    sctx.rotate(Math.sin(f.ph) * .3 + (f.vx < 0 ? -.2 : .2));
    sctx.globalAlpha = .7;
    const wing = (dir, col) => {
      sctx.save(); sctx.scale(dir * (.25 + k * .75), 1);
      sctx.fillStyle = col;
      sctx.beginPath(); sctx.moveTo(0, 0); sctx.bezierCurveTo(s * .2, -s * .9, s * 1.05, -s * .8, s * .85, -s * .1); sctx.bezierCurveTo(s * .75, s * .2, s * .3, s * .15, 0, 0); sctx.fill();
      sctx.beginPath(); sctx.moveTo(0, 0); sctx.bezierCurveTo(s * .55, s * .1, s * .75, s * .55, s * .4, s * .7); sctx.bezierCurveTo(s * .2, s * .75, s * .05, s * .35, 0, 0); sctx.fill();
      sctx.restore();
    };
    const c1 = `hsl(${f.hue} 85% 68%)`, c2 = `hsl(${(f.hue + 30) % 360} 90% 76%)`;
    wing(1, c1); wing(-1, c2);
    sctx.fillStyle = "#2b2233"; sctx.globalAlpha = .8; sctx.beginPath(); sctx.ellipse(0, s * .05, s * .07, s * .42, 0, 0, 7); sctx.fill();
  }
  // В профиле «Миша А.» на фоне падают клоуны (переключатель «Пасхалка в Профиле» в Эффектах).
  function mishaActive(){
    if (!on("misha") || document.querySelector("main > .tab.active")?.id !== "tab-profile") return false;
    const sel = document.getElementById("person"), o = sel && sel.options[sel.selectedIndex];
    return !!o && (o.value === "106" || /^Миша А\.?$/.test(o.textContent.trim().replace(/\s+/g, " ")));
  }
  let mishaLast = null, mishaT = 0;
  function mishaWatch(){ clearTimeout(mishaT); mishaT = setTimeout(() => { const m = mishaActive(); if (m !== mishaLast) { mishaLast = m; seasonSync(); } }, 150); }
  new MutationObserver(mishaWatch).observe(document.querySelector("main") || document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
  document.addEventListener("change", e => { if (e.target.id === "person") mishaWatch(); });
  function seasonSync(){
    const misha = mishaActive(); mishaLast = misha;
    const want = on("season") || misha;
    const sel = document.getElementById("fx-season-kind"), den = document.getElementById("fx-season-density");
    if (sel && !sel.options.length) sel.innerHTML = `<option value="auto">По сезону (сейчас: ${KINDS[seasonKind()].name})</option>` + Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
    if (sel) sel.value = KINDS[PK.kind] ? PK.kind : "auto";
    if (den) den.value = DENSITY[PK.density] ? PK.density : "mid";
    const szSel = document.getElementById("fx-season-size"); if (szSel) szSel.value = PSIZE[PK.size] ? PK.size : "m";
    { const lb = document.getElementById("fx-lava-box"); if (lb) lb.hidden = curKind() !== "lava"; lavaSyncUI(); }
    if (!want) { cancelAnimationFrame(sraf); sraf = 0; sctx.clearRect(0, 0, sc.width, sc.height); sc.hidden = true; return; }
    sc.hidden = false;
    const k = misha ? "clowns" : curKind();
    if (sraf && sKind === k + PK.density + PK.size) return;
    cancelAnimationFrame(sraf); sKind = k + PK.density + PK.size;
    sizeCv(sc);
    const K = KINDS[k], mult = DENSITY[PK.density] || 1;
    const base = K.base || (K.stars || K.twinkle ? 70 : K.shoot ? 6 : K.digits || K.emoji || K.glyph ? 22 : 46);
    const n = Math.round(Math.min(base * 3.6, base * mult * Math.min(1.4, innerWidth / 1300)));
    flakes = Array.from({length:Math.max(3, n)}, () => makeFlake(k, true));
    splashes = []; flash = 0; bolt = null; nextBolt = 0; salRk = []; salSp = []; salNext = 0; lavaBlobs = null;
    const tick = () => {
      if (document.hidden) { return; }
      // Каждый кадр — с чистого листа: сбрасываем матрицу и режимы и стираем весь холст целиком.
      // Раньше сбой в одной частице оставлял сдвинутую матрицу, стиралась только часть холста,
      // и на телефоне частицы «залипали» и копились на экране.
      const dpr = Math.min(2, devicePixelRatio || 1);
      // Панель адреса на телефоне меняет высоту окна, и событие resize приходит не всегда —
      // тогда нижняя полоса холста не стиралась и частицы оставляли там следы. Подгоняем размер на лету.
      if (sc.width !== Math.round(innerWidth * dpr) || sc.height !== Math.round(innerHeight * dpr)) sizeCv(sc);
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalAlpha = 1; sctx.globalCompositeOperation = "source-over"; sctx.shadowBlur = 0;
      sctx.clearRect(0, 0, sc.width, sc.height);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (K.lava) { drawLava(); return; }
      if (K.rain) { drawRain(K); return; }
      if (K.aurora) { drawAurora(); return; }
      if (K.salute) { drawSalute(K); return; }
      flakes.forEach((f, i) => { try { drawFlake(f, i); } catch (err) { try { sctx.restore(); } catch (e2) {} } });
    };
    const drawFlake = (f, i) => {
        if (K.shoot) {
          if (f.wait > 0) { f.wait--; return; }
          f.x += f.vx; f.y += f.vy;
          if (f.y > innerHeight * .8 || f.x < -40) { flakes[i] = makeFlake(k, false); flakes[i].wait = 120 + Math.random() * 500; return; }
          const g = sctx.createLinearGradient(f.x, f.y, f.x - f.vx * 18, f.y - f.vy * 18);
          g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
          sctx.strokeStyle = g; sctx.lineWidth = f.r; sctx.beginPath(); sctx.moveTo(f.x, f.y); sctx.lineTo(f.x - f.vx * 18, f.y - f.vy * 18); sctx.stroke();
          return;
        }
        if (K.warp) {
          const cx = innerWidth / 2, cy = innerHeight / 2, step = f.sp * (1 + f.d * .022); f.d += step;
          const x = cx + Math.cos(f.ang) * f.d, y = cy + Math.sin(f.ang) * f.d;
          if (x < -30 || x > innerWidth + 30 || y < -30 || y > innerHeight + 30) { flakes[i] = makeFlake(k, false); return; }
          const tl = Math.min(f.d, step * 7);
          sctx.globalAlpha = Math.min(1, f.d / 240) * .9; sctx.strokeStyle = f.c; sctx.lineWidth = f.r * (.5 + f.d / 650); sctx.lineCap = "round";
          sctx.beginPath(); sctx.moveTo(x, y); sctx.lineTo(cx + Math.cos(f.ang) * (f.d - tl), cy + Math.sin(f.ang) * (f.d - tl)); sctx.stroke(); sctx.globalAlpha = 1;
          return;
        }
        f.ph += .015; f.rot += K.spin ? .012 : K.tumble ? f.vr : 0;
        if (K.ember) { f.vx = Math.max(-1.2, Math.min(1.2, f.vx * .96 + (Math.random() - .5) * .22)); if (Math.random() < .004) { Object.assign(f, makeFlake(k, false)); return; } }
        if (K.smoke) { f.r += .1 + f.r * .0008; if (f.y < -f.r || f.r > f.r0 * 4.5) { Object.assign(f, makeFlake(k, false)); return; } }
        const sway = K.digits || K.blizzard || K.coin || K.ember || K.fog ? 0 : K.butterfly ? Math.sin(f.ph * 3) * 1.1 : K.confetti || K.flutter ? Math.sin(f.ph * 4) * 1.2 : K.ghost ? Math.sin(f.ph * .8) * .7 : K.smoke ? Math.sin(f.ph * .7) * .45 : Math.sin(f.ph) * (K.fluff ? .6 : K.lantern || K.balloon ? .35 : .3);
        f.x += f.vx + sway; f.y += f.vy + (K.butterfly ? Math.cos(f.ph * 2.3) * .6 : 0);
        if (K.blizzard) f.x += Math.sin(f.ph * 3 + f.y * .01) * .8;
        if (f.y > innerHeight + 40) { Object.assign(f, makeFlake(k, false)); f.y = -30; }
        if (f.y < -60) { Object.assign(f, makeFlake(k, false)); f.y = innerHeight + 40; }
        const pad = K.fog ? 360 : K.bokeh || K.smoke ? 70 : K.heart || K.emoji ? 40 : 30;
        if (f.x > innerWidth + pad) f.x = -pad; if (f.x < -pad) f.x = innerWidth + pad;
        sctx.save(); sctx.translate(f.x, f.y); sctx.rotate(f.rot); sctx.fillStyle = f.c; sctx.strokeStyle = f.c;
        if (K.twinkle) sctx.globalAlpha = .25 + .6 * Math.abs(Math.sin(f.ph * 2.2));
        else if (K.glow) { sctx.globalAlpha = .35 + .4 * Math.sin(f.ph * 3); sctx.shadowColor = f.c; sctx.shadowBlur = 8; }
        else if (K.dust) sctx.globalAlpha = .18 + .5 * Math.abs(Math.sin(f.ph * 1.3));
        else if (K.ghost) sctx.globalAlpha = .22 + .5 * Math.abs(Math.sin(f.ph * 1.2));
        else sctx.globalAlpha = K.alpha || .55;
        if (K.ember) { sctx.rotate(-f.rot); drawEmber(f, sway); }
        else if (K.heart) { sctx.rotate(-f.rot); drawHeart(f, K); }
        else if (K.smoke) { sctx.rotate(-f.rot); const life = Math.max(0, Math.min(1, f.y / innerHeight)), fade = Math.min(1, (f.r0 * 4.5 - f.r) / (f.r0 * 1.5)); const g = sctx.createRadialGradient(0, 0, 0, 0, 0, f.r); g.addColorStop(0, f.c + "cc"); g.addColorStop(.5, f.c + "55"); g.addColorStop(1, f.c + "00"); sctx.globalAlpha = Math.max(0, f.a * (.35 + life * 1.1) * fade); sctx.fillStyle = g; sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.fill(); }
        else if (K.fog) { sctx.rotate(-f.rot); sctx.scale(1.9, .55); const g = sctx.createRadialGradient(0, 0, 0, 0, 0, f.r); g.addColorStop(0, f.c); g.addColorStop(1, f.c + "00"); sctx.globalAlpha = f.a * (.8 + .2 * Math.sin(f.ph * 1.3)); sctx.fillStyle = g; sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.fill(); }
        else if (K.ring) { sctx.lineWidth = 1.2; sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.stroke(); sctx.globalAlpha *= .6; sctx.beginPath(); sctx.arc(-f.r * .35, -f.r * .35, f.r * .25, 0, 7); sctx.fill(); }
        else if (K.bokeh) { sctx.rotate(-f.rot); const g = sctx.createRadialGradient(0, 0, 0, 0, 0, f.r); g.addColorStop(0, f.c); g.addColorStop(.7, f.c); g.addColorStop(1, "transparent"); sctx.globalAlpha = f.a * (.7 + .3 * Math.sin(f.ph * 1.7)); sctx.fillStyle = g; sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.fill(); }
        else if (K.dust) { sctx.shadowColor = f.c; sctx.shadowBlur = 4; sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.fill(); }
        else if (K.confetti) { f.flip += f.fs; sctx.scale(1, Math.cos(f.flip)); sctx.globalAlpha = .8; sctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); }
        else if (K.coin) { sctx.rotate(-f.rot); f.spin += f.ss; const sx = Math.cos(f.spin); sctx.scale(Math.max(.08, Math.abs(sx)), 1); sctx.globalAlpha = .8; sctx.fillStyle = sx > 0 ? "#f6c445" : "#d99a1e"; sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.fill(); sctx.strokeStyle = "#fff1b0"; sctx.lineWidth = 1; sctx.globalAlpha = .7; sctx.beginPath(); sctx.arc(0, 0, f.r * .68, 0, 7); sctx.stroke(); }
        else if (K.lantern) { sctx.rotate(-f.rot + Math.sin(f.ph * 1.4) * .08); f.fl += .09 + Math.random() * .05; drawLantern(f); }
        else if (K.balloon) { sctx.rotate(-f.rot + Math.sin(f.ph) * .12); drawBalloon(f); }
        else if (K.butterfly) { sctx.rotate(-f.rot); f.flap += .22; drawButterfly(f); }
        else if (K.blizzard) { sctx.rotate(-f.rot); sctx.globalAlpha = .35 + f.r * .12; sctx.beginPath(); sctx.ellipse(0, 0, f.r * 1.8, f.r * .8, Math.atan2(f.vy, f.vx), 0, 7); sctx.fill(); }
        else if (K.diamond) { sctx.beginPath(); sctx.moveTo(0, -f.r * 1.6); sctx.lineTo(f.r, 0); sctx.lineTo(0, f.r * 1.6); sctx.lineTo(-f.r, 0); sctx.closePath(); sctx.fill(); }
        else if (k === "flakes") { sctx.lineWidth = 1; for (let a = 0; a < 6; a++) { sctx.rotate(Math.PI / 3); sctx.beginPath(); sctx.moveTo(0, 0); sctx.lineTo(0, f.r); sctx.moveTo(0, f.r * .6); sctx.lineTo(f.r * .25, f.r * .8); sctx.moveTo(0, f.r * .6); sctx.lineTo(-f.r * .25, f.r * .8); sctx.stroke(); } }
        else if (K.fluff) { sctx.lineWidth = .8; for (let a = 0; a < 8; a++) { sctx.rotate(Math.PI / 4); sctx.beginPath(); sctx.moveTo(0, 0); sctx.lineTo(0, f.r * 1.8); sctx.stroke(); } }
        else if (K.khinkali) { drawKhinkali(f); }
        else if (K.emoji || K.glyph) { if (!K.tumble) sctx.rotate(-f.rot); const sp = glyphSprite(f.ch || K.glyph, f.r * 1.4, f.c); sctx.drawImage(sp, -sp.__s / 2, -sp.__s / 2, sp.__s, sp.__s); }
        else if (K.digits) { sctx.rotate(-f.rot); sctx.textBaseline = "middle"; sctx.font = `${Math.round(f.r * 1.4)}px "Segoe UI Emoji","Apple Color Emoji",system-ui,sans-serif`; sctx.textAlign = "center"; sctx.fillText(f.ch || K.glyph, 0, 0); if (K.digits && Math.random() < .01) f.ch = String(Math.floor(Math.random() * 10)); }
        else if (k === "snow" || k === "stars" || K.glow) { sctx.beginPath(); sctx.arc(0, 0, f.r, 0, 7); sctx.fill(); }
        else { sctx.beginPath(); sctx.ellipse(0, 0, f.r, f.r * .55, 0, 0, 7); sctx.fill(); }
        sctx.restore();
    };
    // На телефонах (сенсорный экран) кадр рисуется через раз, но частицы делают два шага —
    // скорость та же, а нагрузка на видеочип и батарею вдвое меньше.
    let odd = false;
    const loopS = () => { sraf = requestAnimationFrame(loopS); if (SEASON_LITE) { odd = !odd; if (odd) return; tick(); } tick(); };
    sraf = requestAnimationFrame(loopS);
  }
  document.addEventListener("change", e => {
    if (e.target.id === "fx-season-kind") { PK.kind = e.target.value; }
    else if (e.target.id === "fx-season-density") { PK.density = e.target.value; }
    else if (e.target.id === "fx-season-size") { PK.size = e.target.value; }
    else return;
    try { localStorage.setItem(PK_KEY, JSON.stringify(PK)); } catch (err) {}
    if (!FX.season) { FX.season = true; save(); applyAll(); } else seasonSync();
  });
  addEventListener("resize", () => { if (sraf) { cancelAnimationFrame(sraf); sraf = 0; sKind = ""; seasonSync(); } });

  // ---------- Свечение выделенной линии ----------
  function glowDefs(svg){
    if (!svg || svg.querySelector("#fx-glow")) return;
    const d = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    d.setAttribute("data-no-export", "1");
    d.innerHTML = `<filter id="fx-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    svg.prepend(d);
  }
  new MutationObserver(() => {
    const svg = document.querySelector("#c-out > svg"); if (!svg) return;
    glowDefs(svg);
    svg.classList.toggle("fx-has-focus", !!svg.querySelector('[data-n][style*="opacity"]'));
  }).observe(document.getElementById("c-out"), {childList:true, subtree:true, attributes:true, attributeFilter:["style"]});

  // ---------- Плавная перестройка столбцов ----------
  let prevBars = null;
  new MutationObserver(() => {
    const svg = document.querySelector("#c-out > svg");
    const bars = svg ? [...svg.querySelectorAll("rect.anim-bar-x[data-ek]")] : [];
    if (!bars.length) { prevBars = null; return; }
    const now = new Map(bars.map(b => [b.dataset.ek, Number(b.getAttribute("width"))]));
    if (on("morph") && prevBars && prevBars.type === cType) {
      bars.forEach(b => {
        const w0 = prevBars.w.get(b.dataset.ek), w1 = now.get(b.dataset.ek);
        if (w0 == null || !w1) return;
        b.classList.remove("anim-bar-x");
        b.animate([{transform:`scaleX(${(w0 / w1).toFixed(4)})`}, {transform:"scaleX(1)"}], {duration:650, easing:"cubic-bezier(.2,.8,.2,1)"});
        b.style.transformBox = "fill-box"; b.style.transformOrigin = "0 50%";
      });
    }
    prevBars = {type:cType, w:now};
  }).observe(document.getElementById("c-out"), {childList:true});

  applyAll();
})();
