
(() => {
  const KEY = "chatstats.pageBg.v1", $ = id => document.getElementById(id);
  const MODES = ["blobs", "solid", "grad"], ANGLES = ["180", "135", "90"];
  let st = {mode:"blobs", c1:"", c2:"", ang:"180"};
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  if (!MODES.includes(st.mode)) st.mode = "blobs";
  if (!ANGLES.includes(String(st.ang))) st.ang = "180";
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const hexRe = /^#[0-9a-f]{6}$/i;
  // Любой цвет темы → #rrggbb (через canvas), смешивание двух цветов
  const nctx = document.createElement("canvas").getContext("2d");
  const toHex = (c, fb) => { try { nctx.fillStyle = "#000"; nctx.fillStyle = c; const v = String(nctx.fillStyle); if (hexRe.test(v)) return v; const n = (v.match(/[\d.]+/g) || []).map(Number); if (n.length >= 3) return "#" + n.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, "0")).join(""); } catch (e) {} return fb; };
  const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join(""); };
  const cssv = n => (getComputedStyle(document.body).getPropertyValue(n) || "").trim();
  const themeBg = () => toHex(cssv("--bg") || "#0f1117", "#0f1117");
  const themeC2 = () => mix(themeBg(), toHex(cssv("--accent") || "#7aa2f7", "#7aa2f7"), .16);
  const c1 = () => hexRe.test(st.c1) ? st.c1 : themeBg();
  const c2 = () => hexRe.test(st.c2) ? st.c2 : themeC2();
  const on = () => !window.__TABLO && st.mode !== "blobs";
  const paintCss = () => st.mode === "grad" ? `linear-gradient(${st.ang}deg, ${c1()}, ${c2()})` : c1();
  // Фон картинок (таблицы, стеклянные картинки): тот же цвет или градиент, что у страницы
  window.__pageBgPaint = function(ctx, W, H){
    if (!on()) return false;
    if (st.mode === "grad") {
      const a = Number(st.ang) * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
      const gr = ctx.createLinearGradient(W / 2 - dx * len, H / 2 - dy * len, W / 2 + dx * len, H / 2 + dy * len);
      gr.addColorStop(0, c1()); gr.addColorStop(1, c2()); ctx.fillStyle = gr;
    } else ctx.fillStyle = c1();
    ctx.fillRect(0, 0, W, H);
    return true;
  };
  let varsEl = null;
  function apply(){
    const act = on();
    document.body.classList.toggle("pbg-on", act);
    if (!varsEl) { varsEl = document.createElement("style"); varsEl.id = "page-bg-vars"; document.head.appendChild(varsEl); }
    const css = act ? `:root{--pbg:${paintCss()};--pbg-base:${c1()}}` : "";
    if (varsEl.textContent !== css) varsEl.textContent = css;
    syncUi();
  }
  function syncUi(){
    const box = $("pbg-box"); if (!box) return;
    box.hidden = !!window.__TABLO;
    $("pbg-mode").value = st.mode;
    const m = st.mode;
    $("pbg-c1-f").hidden = m === "blobs"; $("pbg-c2-f").hidden = m !== "grad"; $("pbg-ang-f").hidden = m !== "grad";
    $("pbg-reset").hidden = m === "blobs"; $("pbg-prev").hidden = m === "blobs";
    $("pbg-c1").value = c1(); $("pbg-c2").value = c2(); $("pbg-ang").value = String(st.ang);
    $("pbg-c1-l").textContent = m === "grad" ? "Первый цвет" : "Цвет";
    $("pbg-prev").style.background = paintCss();
  }
  // Блок в «Настройки → Оформление» — сразу под темами
  const anchor = $("theme-grid");
  if (anchor && !$("pbg-box")) {
    const box = document.createElement("div"); box.className = "filters"; box.id = "pbg-box";
    box.innerHTML = `<div class="pbg-row">
      <div class="field"><label for="pbg-mode">Фон страницы</label><select id="pbg-mode"><option value="blobs">Цветные пятна</option><option value="solid">Один цвет</option><option value="grad">Лёгкий градиент</option></select></div>
      <div class="field" id="pbg-c1-f"><label for="pbg-c1" id="pbg-c1-l">Цвет</label><input type="color" id="pbg-c1"></div>
      <div class="field" id="pbg-c2-f"><label for="pbg-c2">Второй цвет</label><input type="color" id="pbg-c2"></div>
      <div class="field" id="pbg-ang-f"><label for="pbg-ang">Направление</label><select id="pbg-ang"><option value="180">Сверху вниз</option><option value="135">По диагонали</option><option value="90">Слева направо</option></select></div>
      <span class="pbg-prev" id="pbg-prev" aria-hidden="true"></span>
      <button class="mini" type="button" id="pbg-reset" title="Взять цвета из текущей темы">Цвета темы</button>
      <p class="hint">«Один цвет» и «Лёгкий градиент» убирают цветные пятна со страницы, а скопированные и скачанные таблицы получают такой же фон. В стиле «Табло» фон свой.</p>
    </div>`;
    anchor.after(box);
    $("pbg-mode").addEventListener("change", e => { st.mode = e.target.value; save(); apply(); });
    $("pbg-c1").addEventListener("input", e => { st.c1 = e.target.value; save(); apply(); });
    $("pbg-c2").addEventListener("input", e => { st.c2 = e.target.value; save(); apply(); });
    $("pbg-ang").addEventListener("change", e => { st.ang = e.target.value; save(); apply(); });
    $("pbg-reset").addEventListener("click", () => { st.c1 = ""; st.c2 = ""; save(); apply(); });
  }
  apply();
  // Цвета «из темы» следуют за сменой темы
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(apply, 60); };
  new MutationObserver(later).observe(document.documentElement, {attributes:true, attributeFilter:["style", "class", "data-theme"]});
  new MutationObserver(later).observe(document.body, {attributes:true, attributeFilter:["style"]});

  /* ---------- Переводы ---------- */
  const D = window.__I18N_DICT;
  if (D) Object.assign(D, {
    "Фон страницы":["Page background","Тло сторінки","Фон старонкі","Бет фоны","Arrière-plan de la page","Tło strony"],
    "Цветные пятна":["Colour blobs","Кольорові плями","Каляровыя плямы","Түсті дақтар","Taches de couleur","Kolorowe plamy"],
    "Один цвет":["Single colour","Один колір","Адзін колер","Бір түс","Une seule couleur","Jeden kolor"],
    "Лёгкий градиент":["Soft gradient","Легкий градієнт","Лёгкі градыент","Жеңіл градиент","Dégradé léger","Lekki gradient"],
    "Цвет":["Colour","Колір","Колер","Түс","Couleur","Kolor"],
    "Первый цвет":["First colour","Перший колір","Першы колер","Бірінші түс","Première couleur","Pierwszy kolor"],
    "Второй цвет":["Second colour","Другий колір","Другі колер","Екінші түс","Deuxième couleur","Drugi kolor"],
    "Направление":["Direction","Напрямок","Кірунак","Бағыт","Direction","Kierunek"],
    "Сверху вниз":["Top to bottom","Згори донизу","Зверху ўніз","Жоғарыдан төменге","De haut en bas","Z góry na dół"],
    "По диагонали":["Diagonal","По діагоналі","Па дыяганалі","Диагональ бойынша","En diagonale","Po przekątnej"],
    "Слева направо":["Left to right","Зліва направо","Злева направа","Солдан оңға","De gauche à droite","Od lewej do prawej"],
    "Цвета темы":["Theme colours","Кольори теми","Колеры тэмы","Тақырып түстері","Couleurs du thème","Kolory motywu"],
    "Места: месяцы × годы":["Places: months × years","Місця: місяці × роки","Месцы: месяцы × гады","Орындар: айлар × жылдар","Places : mois × années","Miejsca: miesiące × lata"],
    "Накопительно с начала года":["Cumulative since the start of the year","Накопичувально з початку року","Назапашвальна з пачатку года","Жыл басынан жинақтап","Cumulé depuis le début de l’année","Narastająco od początku roku"],
    "За каждый месяц":["For each month","За кожен місяць","За кожны месяц","Әр ай үшін","Pour chaque mois","Za każdy miesiąc"],
    "Места по месяцам":["Places by month","Місця за місяцями","Месцы па месяцах","Айлар бойынша орындар","Places par mois","Miejsca według miesięcy"],
    "Места за каждый месяц":["Places for each month","Місця за кожен місяць","Месцы за кожны месяц","Әр айдағы орындар","Places pour chaque mois","Miejsca za każdy miesiąc"]
  });
})();
