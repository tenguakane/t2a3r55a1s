
/* ===================== Языки интерфейса: ru (по умолчанию), uk, be, kk, en ===================== */
(function(){
  const KEY = "chatstats.lang.v1";
  const LANGS = [
    {k:"ru", n:"Русский", f:"🇷🇺"},
    {k:"uk", n:"Українська", f:"🇺🇦"},
    {k:"be", n:"Беларуская", f:"🇧🇾"},
    {k:"kk", n:"Қазақша", f:"🇰🇿"},
    {k:"en", n:"English", f:"🇬🇧"},
    {k:"fr", n:"Français", f:"🇫🇷"},
    {k:"pl", n:"Polski", f:"🇵🇱"},
  ];
  let lang = "ru";
  try { const s = localStorage.getItem(KEY); if (LANGS.some(l => l.k === s)) lang = s; } catch (e) {}
  const LI = {en:0, uk:1, be:2, kk:3, fr:4, pl:5}[lang];
  window.__lang = {get:() => lang, list:LANGS, set:(k) => { if (!LANGS.some(l => l.k === k) || k === lang) return; try { localStorage.setItem(KEY, k); } catch (e) {} location.reload(); }};

  /* ---------- Выбор языка в настройках («Оформление») ---------- */
  const UI = {
    h:   ["🌐 Язык", "🌐 Language", "🌐 Мова", "🌐 Мова", "🌐 Тіл", "🌐 Langue", "🌐 Język"],
    l:   ["Язык сайта", "Site language", "Мова сайту", "Мова сайта", "Сайт тілі", "Langue du site", "Język strony"],
    d:   ["Перевод интерфейса. Имена участников, названия чатов и история обновлений остаются как есть. После выбора страница перезагрузится.",
          "Interface translation. Member names, chat titles and the update history stay as they are. The page reloads after you choose.",
          "Переклад інтерфейсу. Імена учасників, назви чатів та історія оновлень залишаються як є. Після вибору сторінка перезавантажиться.",
          "Пераклад інтэрфейсу. Імёны ўдзельнікаў, назвы чатаў і гісторыя абнаўленняў застаюцца як ёсць. Пасля выбару старонка перазагрузіцца.",
          "Интерфейс аудармасы. Қатысушылар аттары, чат атаулары және жаңартулар тарихы өзгеріссіз қалады. Таңдағаннан кейін бет қайта жүктеледі.",
          "Traduction de l'interface. Les noms des membres, les titres des chats et l'historique des mises à jour restent tels quels. La page se recharge après le choix.",
          "Tłumaczenie interfejsu. Imiona uczestników, nazwy czatów i historia aktualizacji pozostają bez zmian. Po wyborze strona się przeładuje."],
  };
  const ui = k => UI[k][LI === undefined ? 0 : LI + 1];
  function mountPicker(){
    if (document.getElementById("lang-select")) return;
    const pane = document.querySelector('#tab-settings .set-pane[data-cat="look"]') || document.getElementById("tab-settings");
    if (!pane) return;
    const wrap = document.createElement("div"); wrap.id = "lang-box"; wrap.setAttribute("translate", "no"); wrap.className = "notranslate";
    wrap.innerHTML = `<h2>${ui("h")}</h2><div class="filters"><div class="field"><label for="lang-select">${ui("l")}</label><select id="lang-select">${LANGS.map(l => `<option value="${l.k}"${l.k === lang ? " selected" : ""}>${l.f} ${l.n}</option>`).join("")}</select></div><span class="hint">${ui("d")}</span></div>`;
    const back = pane.querySelector(":scope > .set-back");
    if (back) back.after(wrap); else pane.prepend(wrap);
    wrap.querySelector("select").addEventListener("change", e => window.__lang.set(e.target.value));
  }
  const mountSoon = () => { mountPicker(); setTimeout(mountPicker, 300); setTimeout(mountPicker, 1500); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountSoon); else mountSoon();

  if (lang === "ru") return;
  document.documentElement.lang = lang;

  /* ---------- Словарь ---------- */
  let DICT = window.__I18N_DICT || {}; delete window.__I18N_DICT;
  if (lang !== "ru") { try { DICT = Object.assign(JSON.parse(document.getElementById("i18n-data").textContent || "{}"), DICT); } catch (e) {} }
  const PLURALS = window.__I18N_PLURALS || []; delete window.__I18N_PLURALS;
  const CY = /[А-Яа-яЁё]/;
  const norm = s => s.replace(/\s+/g, " ").trim();
  const EXACT = new Map(), TPL = [];
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [ru, tr] of Object.entries(DICT)) {
    const t = tr[LI]; if (t == null) continue;
    if (!/\{\d+\}/.test(ru)) { EXACT.set(ru, t); continue; }
    // Соседние подстановки {2}{3} неразличимы в тексте — склеиваем их в одну.
    let k = ru, out = t, m;
    while ((m = /\{(\d+)\}\{(\d+)\}/.exec(k))) {
      const pair = m[0], a = m[1];
      if (!out.includes(pair)) { k = null; break; }
      k = k.replace(pair, `{${a}}`); out = out.split(pair).join(`{${a}}`);
    }
    if (!k) continue;
    addTpl(k, out);
    // Часть с подстановкой по краю часто стоит в отдельном теге (<b>40%</b> к среднему…) — регистрируем и «хвост».
    const f = /^\{(\d+)\} /.exec(k), l = / \{(\d+)\}$/.exec(k);
    if (f && out.startsWith(f[0]) && /[А-Яа-яЁё]/.test(k.slice(f[0].length))) addTpl(k.slice(f[0].length), out.slice(f[0].length));
    if (l && out.endsWith(l[0]) && /[А-Яа-яЁё]/.test(k.slice(0, -l[0].length))) addTpl(k.slice(0, -l[0].length), out.slice(0, -l[0].length));
  }
  function addTpl(k, out){
    if (!/\{\d+\}/.test(k)) { if (!EXACT.has(k)) EXACT.set(k, out); return; }
    const order = [];
    const src = "^" + k.split(/(\{\d+\})/).map(p => { const mm = /^\{(\d+)\}$/.exec(p); if (mm) { order.push(mm[1]); return "(.+?)"; } return escRe(p); }).join("") + "$";
    const lits = k.split(/\{\d+\}/).filter(Boolean).sort((a, b) => b.length - a.length);
    TPL.push({re:new RegExp(src), order, out, lit:lits[0] || "", len:k.replace(/\{\d+\}/g, "").length});
  }
  TPL.sort((a, b) => b.len - a.len);
  // Формы слов после чисел: русская форма → [ед., мн.2–4, мн.5+]
  const PLF = new Map();
  PLURALS.forEach(f => f.forEach(w => { if (!PLF.has(w)) PLF.set(w, f); }));
  const ruIdx = n => { n = Math.abs(n); if (n % 1) return 1; const a = n % 100, b = a % 10; if (a > 10 && a < 20) return 2; if (b > 1 && b < 5) return 1; if (b === 1) return 0; return 2; };
  function pluralPick(n, forms){
    if (lang === "kk") return T(forms[0]);
    if (lang === "en") return T(forms[Math.abs(n) === 1 ? 0 : 2]);
    if (lang === "fr") return T(forms[Math.abs(n) < 2 ? 0 : 2]);
    if (lang === "pl") { const a = Math.abs(n); if (a % 1) return T(forms[1]); const b = a % 10, c = a % 100; return T(forms[a === 1 ? 0 : (b > 1 && b < 5 && !(c > 11 && c < 15)) ? 1 : 2]); }
    return T(forms[ruIdx(n)]);
  }
  // Месяцы, дни недели и сокращения — пословная замена там, где целой фразы нет в словаре.
  const WORDS = new Map();
  const W = (ru, en, uk, be, kk, fr, pl) => WORDS.set(ru, [en, uk, be, kk, fr, pl][LI]);
  [["января","January","січня","студзеня","қаңтар","janvier","stycznia"],["февраля","February","лютого","лютага","ақпан","février","lutego"],["марта","March","березня","сакавіка","наурыз","mars","marca"],["апреля","April","квітня","красавіка","сәуір","avril","kwietnia"],["мая","May","травня","мая","мамыр","mai","maja"],["июня","June","червня","чэрвеня","маусым","juin","czerwca"],["июля","July","липня","ліпеня","шілде","juillet","lipca"],["августа","August","серпня","жніўня","тамыз","août","sierpnia"],["сентября","September","вересня","верасня","қыркүйек","septembre","września"],["октября","October","жовтня","кастрычніка","қазан","octobre","października"],["ноября","November","листопада","лістапада","қараша","novembre","listopada"],["декабря","December","грудня","снежня","желтоқсан","décembre","grudnia"],
   ["январь","January","січень","студзень","қаңтар","janvier","styczeń"],["февраль","February","лютий","люты","ақпан","février","luty"],["март","March","березень","сакавік","наурыз","mars","marzec"],["апрель","April","квітень","красавік","сәуір","avril","kwiecień"],["май","May","травень","травень","мамыр","mai","maj"],["июнь","June","червень","чэрвень","маусым","juin","czerwiec"],["июль","July","липень","ліпень","шілде","juillet","lipiec"],["август","August","серпень","жнівень","тамыз","août","sierpień"],["сентябрь","September","вересень","верасень","қыркүйек","septembre","wrzesień"],["октябрь","October","жовтень","кастрычнік","қазан","octobre","październik"],["ноябрь","November","листопад","лістапад","қараша","novembre","listopad"],["декабрь","December","грудень","снежань","желтоқсан","décembre","grudzień"],
   ["Январь","January","Січень","Студзень","Қаңтар","Janvier","Styczeń"],["Февраль","February","Лютий","Люты","Ақпан","Février","Luty"],["Март","March","Березень","Сакавік","Наурыз","Mars","Marzec"],["Апрель","April","Квітень","Красавік","Сәуір","Avril","Kwiecień"],["Май","May","Травень","Травень","Мамыр","Mai","Maj"],["Июнь","June","Червень","Чэрвень","Маусым","Juin","Czerwiec"],["Июль","July","Липень","Ліпень","Шілде","Juillet","Lipiec"],["Август","August","Серпень","Жнівень","Тамыз","Août","Sierpień"],["Сентябрь","September","Вересень","Верасень","Қыркүйек","Septembre","Wrzesień"],["Октябрь","October","Жовтень","Кастрычнік","Қазан","Octobre","Październik"],["Ноябрь","November","Листопад","Лістапад","Қараша","Novembre","Listopad"],["Декабрь","December","Грудень","Снежань","Желтоқсан","Décembre","Grudzień"],
   ["янв","Jan","січ","студз","қаң","janv","sty"],["фев","Feb","лют","лют","ақп","févr","lut"],["мар","Mar","бер","сак","нау","mars","mar"],["апр","Apr","квіт","крас","сәу","avr","kwi"],["июн","Jun","черв","чэрв","мау","juin","cze"],["июл","Jul","лип","ліп","шіл","juil","lip"],["авг","Aug","серп","жн","там","août","sie"],["сен","Sep","вер","вер","қыр","sept","wrz"],["сент","Sep","вер","вер","қыр","sept","wrz"],["окт","Oct","жовт","кастр","қаз","oct","paź"],["ноя","Nov","лист","ліст","қар","nov","lis"],["нояб","Nov","лист","ліст","қар","nov","lis"],["дек","Dec","груд","снеж","жел","déc","gru"],
   ["Янв","Jan","Січ","Студз","Қаң","Janv","Sty"],["Фев","Feb","Лют","Лют","Ақп","Févr","Lut"],["Мар","Mar","Бер","Сак","Нау","Mars","Mar"],["Апр","Apr","Квіт","Крас","Сәу","Avr","Kwi"],["Июн","Jun","Черв","Чэрв","Мау","Juin","Cze"],["Июл","Jul","Лип","Ліп","Шіл","Juil","Lip"],["Авг","Aug","Серп","Жн","Там","Août","Sie"],["Сен","Sep","Вер","Вер","Қыр","Sept","Wrz"],["Окт","Oct","Жовт","Кастр","Қаз","Oct","Paź"],["Ноя","Nov","Лист","Ліст","Қар","Nov","Lis"],["Дек","Dec","Груд","Снеж","Жел","Déc","Gru"],
   ["понедельник","Monday","понеділок","панядзелак","дүйсенбі","lundi","poniedziałek"],["вторник","Tuesday","вівторок","аўторак","сейсенбі","mardi","wtorek"],["среда","Wednesday","середа","серада","сәрсенбі","mercredi","środa"],["четверг","Thursday","четвер","чацвер","бейсенбі","jeudi","czwartek"],["пятница","Friday","п'ятниця","пятніца","жұма","vendredi","piątek"],["суббота","Saturday","субота","субота","сенбі","samedi","sobota"],["воскресенье","Sunday","неділя","нядзеля","жексенбі","dimanche","niedziela"],
   ["Понедельник","Monday","Понеділок","Панядзелак","Дүйсенбі","Lundi","Poniedziałek"],["Вторник","Tuesday","Вівторок","Аўторак","Сейсенбі","Mardi","Wtorek"],["Среда","Wednesday","Середа","Серада","Сәрсенбі","Mercredi","Środa"],["Четверг","Thursday","Четвер","Чацвер","Бейсенбі","Jeudi","Czwartek"],["Пятница","Friday","П'ятниця","Пятніца","Жұма","Vendredi","Piątek"],["Суббота","Saturday","Субота","Субота","Сенбі","Samedi","Sobota"],["Воскресенье","Sunday","Неділя","Нядзеля","Жексенбі","Dimanche","Niedziela"],
   ["пн","Mon","пн","пн","дс","lu","pn"],["вт","Tue","вт","аў","сс","ma","wt"],["ср","Wed","ср","ср","ср","me","śr"],["чт","Thu","чт","чц","бс","je","cz"],["пт","Fri","пт","пт","жм","ve","pt"],["сб","Sat","сб","сб","сн","sa","so"],["вс","Sun","нд","нд","жс","di","nd"],
   ["Пн","Mon","Пн","Пн","Дс","Lu","Pn"],["Вт","Tue","Вт","Аў","Сс","Ma","Wt"],["Ср","Wed","Ср","Ср","Ср","Me","Śr"],["Чт","Thu","Чт","Чц","Бс","Je","Cz"],["Пт","Fri","Пт","Пт","Жм","Ve","Pt"],["Сб","Sat","Сб","Сб","Сн","Sa","So"],["Вс","Sun","Нд","Нд","Жс","Di","Nd"],
   ["г","","р","г","ж","","r"],["сегодня","today","сьогодні","сёння","бүгін","aujourd'hui","dziś"],["вчера","yesterday","учора","учора","кеше","hier","wczoraj"],["Сегодня","Today","Сьогодні","Сёння","Бүгін","Aujourd'hui","Dzisiaj"],["Вчера","Yesterday","Учора","Учора","Кеше","Hier","Wczoraj"],
   ["нед","wk","тиж","тыдз","апта","sem","tyg"],["мес","mo","міс","мес","ай","mois","mies"],["дн","d","дн","дз","күн","j","dn"],["ч","h","год","гадз","сағ","h","godz"],["мин","min","хв","хв","мин","min","min"],["с","s","с","с","с","s","s"],["сообщ","msgs","повід","пав","хабар","msg","wiad"],["ур","lvl","рів","узр","деңг","niv","poz"],["место","place","місце","месца","орын","place","miejsce"],["из","of","з","з","/","sur","z"],["и","and","і","і","және","et","i"],["по","to","по","па","дейін","au","do"],["за","for","за","за","—","—","za"],
  ["всего","total","усього","усяго","барлығы","au total","łącznie"],["молчания","of silence","мовчання","маўчання","үнсіздік","de silence","milczenia"],["поставлено","given","поставлено","пастаўлена","қойылған","données","oddanych"],["получено","received","отримано","атрымана","алынған","reçues","otrzymanych"],["подряд","in a row","поспіль","запар","қатарынан","d'affilée","z rzędu"],["назад","ago","тому","таму","бұрын","plus tôt","temu"],
  ].forEach(r => W(...r));
  const WORD_RE = /[А-Яа-яЁё]+/g;
  function wordPass(s){
    // заменяем только если ВСЕ кириллические слова известны — иначе оставляем как есть (это, скорее всего, имя)
    const ws = s.match(WORD_RE) || [];
    if (!ws.length || !ws.every(w => WORDS.has(w))) return null;
    let out = s.replace(WORD_RE, w => WORDS.get(w));
    if (lang === "en" || lang === "fr") out = out.replace(/(\d{4}) \.(?=\s|$)/g, "$1").replace(/(\d{4})\s+\.$/, "$1");
    return out.replace(/\s{2,}/g, " ");
  }
  const SEPS = [" · ", " — ", " – ", " | ", ": ", "; ", ", ", " / ", " → ", " ← ", " ("];
  // Ключи с двоеточием в конце работают и без него: «Ошибка:» → «Ошибка».
  EXACT.delete("г.");
  for (const [k, v] of [...EXACT]) { if (/[:：]$/.test(k) && !EXACT.has(k.slice(0, -1).trim())) EXACT.set(k.slice(0, -1).trim(), v.replace(/\s*[:：]$/, "")); }
  const cache = new Map();
  const misses = new Set(); window.__i18nMisses = misses;
  let MISS = 0; const busy = new Set();
  const LATIN = lang === "en" || lang === "fr" || lang === "pl";
  const cyrLen = s => (s.match(/[А-Яа-яЁё]/g) || []).length;
  const isNum = v => /^[+−-]?[\d\s .,]+%?$/.test(v.trim());
  const numOf = v => parseFloat(v.replace(/[\s ]/g, "").replace(",", ".")) || 0;
  function fillTpl(p, m, depth){
    const g = {}; p.order.forEach((id, i) => { g[id] = m[i + 1]; });
    const ids = p.order;
    return p.out.replace(/\{(\d+)\}/g, (_, id) => {
      const v = g[id]; if (v == null) return "";
      const j = ids.indexOf(id), prev = j > 0 ? g[ids[j - 1]] : null;
      if (PLF.has(v.trim()) && prev != null && isNum(prev)) return pluralPick(numOf(prev), PLF.get(v.trim()));
      if (depth < 5) return tr(v, depth + 1);
      MISS += cyrLen(v); return v;
    });
  }
  // Каждая стратегия даёт кандидата; берём первый без непереведённых кусков, иначе — с наименьшим остатком.
  function core(s, depth){
    if (!CY.test(s)) return s;
    let t = EXACT.get(s); if (t !== undefined) return t;
    let best = null, bestMiss = Infinity;
    const consider = fn => {
      const saved = MISS; MISS = 0; let r;
      try { r = fn(); } catch (e) { r = null; }
      // Для языков на латинице остаток считаем прямо по кириллице в результате — это точнее счётчика.
      const mm = LATIN && typeof r === "string" ? cyrLen(r) : MISS; MISS = saved;
      if (r == null || r === s) return false;
      if (mm < bestMiss) { best = r; bestMiss = mm; }
      return mm === 0;
    };
    let tried = 0;
    for (const p of TPL) {
      if (p.lit && !s.includes(p.lit)) continue;
      const m = p.re.exec(s); if (!m) continue;
      if (consider(() => fillTpl(p, m, depth))) return best;
      if (++tried >= 6) break;
    }
    // «Гречка» / «Волшебник»: — слово в кавычках: переводим внутри и ставим кавычки языка
    const qm = /^«([^«»]+)»([:;,.!?]?)$/.exec(s);
    if (qm && lang !== "ru") {
      const Q = {en:["“", "”"], fr:["« ", " »"], pl:["„", "”"]}[lang] || ["«", "»"];
      if (consider(() => Q[0] + tr(qm[1], depth + 1) + Q[1] + qm[2])) return best;
    }
    // символы по краям: «⚙ », « ↓», «:», «…»
    const pm = /^([^0-9A-Za-zА-Яа-яЁё«„"(\[]*)(.*?)([^0-9A-Za-zА-Яа-яЁё»“")\].]*)$/.exec(s);
    if (pm && (pm[1] || pm[3]) && pm[2]) { if (consider(() => pm[1] + tr(pm[2], depth + 1) + pm[3])) return best; }
    // «3 дня назад» → «3 days ago», «il y a 3 jours»: слово «назад» ставится по правилам языка
    const ag = /^(.+?)\s+назад$/.exec(s);
    if (ag && lang !== "ru") {
      const A = {en:["", " ago"], uk:["", " тому"], be:["", " таму"], kk:["", " бұрын"], fr:["il y a ", ""], pl:["", " temu"]}[lang];
      if (A && consider(() => A[0] + tr(ag[1], depth + 1) + A[1])) return best;
    }
    // число + слово: «5 дней», «12 сообщений за неделю»
    const nm = /^([+−-]?\d[\d\s .,]*?%?)\s+([^\d].*)$/.exec(s);
    if (nm) {
      const rest = nm[2];
      if (PLF.has(rest)) return nm[1] + " " + pluralPick(numOf(nm[1]), PLF.get(rest));
      if (consider(() => nm[1] + " " + tr(rest, depth + 1))) return best;
    }
    // слово + число: «макс 72», «Неделя 43»
    const wn = /^(.*?[^\d\s])\s+([+−-]?\d[\d\s .,]*%?)$/.exec(s);
    if (wn) { if (consider(() => tr(wn[1], depth + 1) + " " + wn[2])) return best; }
    // начало строки — известная фраза до конца предложения
    for (let i = s.length - 1; i > 3; i--) {
      if (s[i] !== " " || !/[.!?…:]/.test(s[i - 1])) continue;
      const head = EXACT.get(s.slice(0, i)); if (head === undefined) continue;
      if (consider(() => head + " " + tr(s.slice(i + 1), depth + 1))) return best;
      break;
    }
    // «фраза (пояснение)»
    const pr = /^(.+?)\s*\(([^()]+)\)([.,;:!?]?)$/.exec(s);
    if (pr) { if (consider(() => tr(pr[1], depth + 1) + " (" + tr(pr[2], depth + 1) + ")" + pr[3])) return best; }
    // предложения по отдельности
    const sent = s.split(/(?<=[.!?…])\s+(?=[A-ZА-ЯЁ0-9«])/);
    if (sent.length > 1) { if (consider(() => sent.map(x => tr(x, depth + 1)).join(" "))) return best; }
    // составная строка: переводим части
    for (const sep of SEPS) {
      if (!s.includes(sep)) continue;
      const parts = s.split(sep);
      const ok = consider(() => parts.map(p => { const lead = p.match(/^\s*/)[0], trail = p.match(/\s*$/)[0], c = p.trim(); return c ? lead + tr(c, depth + 1) + trail : p; }).join(sep));
      if (ok) return best;
      if (best !== null) break;
    }
    if (consider(() => wordPass(s))) return best;
    // Регистр: «последние 26 пятниц» ↔ «Последние 26 пятниц», «ИТОГИ ГОДА»
    const c0 = s.charAt(0);
    if (/[а-яё]/.test(c0)) { if (consider(() => { const r = tr(c0.toUpperCase() + s.slice(1), depth + 1); return r === c0.toUpperCase() + s.slice(1) ? null : (lang === "en" && /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Fridays)\b/.test(r) ? r : r.charAt(0).toLowerCase() + r.slice(1)); })) return best; }
    else if (/[А-ЯЁ]/.test(c0) && s.length > 1) {
      if (s.length > 2 && s === s.toUpperCase() && /[А-ЯЁ]{2}/.test(s)) { if (consider(() => { const low = c0 + s.slice(1).toLowerCase(), r = tr(low, depth + 1); return r === low ? null : r.toUpperCase(); })) return best; }
      else if (consider(() => { const low = c0.toLowerCase() + s.slice(1), r = tr(low, depth + 1); return r === low ? null : r.charAt(0).toUpperCase() + r.slice(1); })) return best;
    }
    if (depth === 0) misses.add(s);
    if (best !== null) { MISS += bestMiss; return best; }
    return s;
  }
  function tr(s, depth = 0){
    if (!s || !CY.test(s)) return s;
    let e = cache.get(s);
    if (e === undefined) {
      if (busy.has(s) || depth > 8) { MISS += cyrLen(s); return s; }
      busy.add(s);
      const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], n = norm(s);
      const saved = MISS; MISS = 0;
      let c = n ? lead + core(n, depth) + trail : s;
      if ((lang === "en" || lang === "fr") && c !== s) c = c.replace(/(\d{4}) \.(?=$|[\s,;)])/g, "$1");
      const mm = c === s ? cyrLen(s) : MISS;
      MISS = saved; busy.delete(s);
      if (cache.size > 30000) cache.clear();
      e = [c, mm]; cache.set(s, e);
    }
    MISS += e[1];
    return e[0];
  }
  const T = s => tr(String(s));
  window.__t = T;

  /* ---------- Склонение после чисел: wordForm отдаёт слово на выбранном языке ---------- */
  function hookWordForm(){
    if (typeof window.wordForm !== "function") return;
    if (window.wordForm.__i18n && (typeof window.cmpWrap !== "function" || window.cmpWrap.__i18n)) return;
    const nf = function(value, forms){ return pluralPick(Number(value) || 0, forms); };
    nf.__i18n = true;
    try { window.wordForm = nf; } catch (e) {}
    // Перенос строк в картинках (вывод сравнения и т. п.): сначала переводим целую фразу, потом режем на строки.
    if (typeof window.cmpWrap === "function" && !window.cmpWrap.__i18n) { const ow = window.cmpWrap, nw = function(text, n){ return ow(typeof text === "string" ? T(text) : text, n); }; nw.__i18n = true; try { window.cmpWrap = nw; } catch (e) {} }
  }
  hookWordForm();

  /* ---------- Текст на canvas (графики, картинки таблиц, постеры) ---------- */
  ["CanvasRenderingContext2D", "OffscreenCanvasRenderingContext2D"].forEach(n => {
    const P = window[n] && window[n].prototype; if (!P) return;
    ["fillText", "strokeText", "measureText"].forEach(fn => {
      const orig = P[fn]; if (typeof orig !== "function") return;
      P[fn] = function(text, ...rest){ return orig.call(this, (typeof text === "string" && CY.test(text)) ? T(text) : text, ...rest); };
    });
  });
  ["alert", "confirm", "prompt"].forEach(fn => {
    const orig = window[fn]; if (typeof orig !== "function") return;
    window[fn] = function(msg, ...rest){ return orig.call(window, typeof msg === "string" ? T(msg) : msg, ...rest); };
  });

  /* ---------- Подписи из CSS (content:"…") ---------- */
  try {
    const q = v => JSON.stringify(T(v));
    const st = document.createElement("style"); st.id = "i18n-css";
    st.textContent = `html body #fd-body:empty::before{content:${q("У этой вкладки нет фильтров")}!important}
html body .tv-btn[data-tv-mode="table"]::after{content:${q("Карточки")}!important}
html body .tv-btn[data-tv-mode="cards"]::after{content:${q("Таблица")}!important}
html body #s-days-table.tv-cards > tbody > tr > td:nth-child(2)::before{content:${q("Селфи всего")}!important}
html body #s-days-table.tv-cards > tbody > tr > td.s-miss:empty::after{content:${q("все сделали")}!important}`;
    document.head.appendChild(st);
  } catch (e) {}

  /* ---------- Картинки из SVG: текст переводится и в том, что ещё не попало на страницу ---------- */
  function trTree(root){
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = root;
    do {
      if (n.nodeType === 3) { const pe = n.parentNode; if (pe && /^(style|script)$/i.test(pe.nodeName)) continue; if (CY.test(n.nodeValue)) n.nodeValue = T(n.nodeValue); }
      else if (n.nodeType === 1 && n.getAttribute) for (const a of ["title", "aria-label"]) { const v = n.getAttribute(a); if (v && CY.test(v)) n.setAttribute(a, T(v)); }
    } while ((n = tw.nextNode()));
  }
  try {
    const XS = XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString = function(node){
      try { if (node && node.nodeType === 1 && CY.test(node.textContent || "")) { const c = node.cloneNode(true); trTree(c); return XS.call(this, c); } } catch (e) {}
      return XS.call(this, node);
    };
  } catch (e) {}

  /* ---------- Перевод DOM ---------- */
  const ATTRS = ["title", "placeholder", "aria-label", "data-copy-title", "alt"];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT)$/;
  const done = new WeakMap();
  const skipEl = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { if (SKIP.test(e.tagName) || e.isContentEditable || e.getAttribute && (e.getAttribute("translate") === "no" || /(^|[\s-])(ava|avatar|p-avatar|mt-ava|mt-mini|who-ava)(\s|$|-)/.test(e.getAttribute("class") || ""))) return true; } return false; };
  function doText(node){
    const v = node.nodeValue; if (!v || !CY.test(v)) return;
    if (done.get(node) === v) return;
    const p = node.parentElement; if (!p || skipEl(p)) return;
    // Кнопкам запоминаем исходную русскую подпись: по ней сайт узнаёт, например, кнопки копирования картинкой.
    const btn = p.closest("button");
    if (btn) { const raw = btn.textContent; if (CY.test(raw) && raw !== btn.__i18nOut) btn.dataset.i18nRu = raw.replace(/\s+/g, " ").trim(); }
    const t = T(v);
    done.set(node, t);
    if (t !== v) node.nodeValue = t;
    if (btn) btn.__i18nOut = btn.textContent;
  }
  function doAttrs(el){
    if (!el.getAttribute) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a); if (!v || !CY.test(v)) continue;
      const t = T(v); if (t !== v) el.setAttribute(a, t);
    }
    if (el.tagName === "INPUT" && /^(button|submit|reset)$/i.test(el.type) && CY.test(el.value)) el.value = T(el.value);
  }
  function walk(root){
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (SKIP.test(root.tagName)) return; doAttrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  let queue = new Set(), scheduled = false;
  function flush(){ scheduled = false; const q = queue; queue = new Set(); q.forEach(n => { if (n.isConnected) walk(n); }); }
  const obs = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === "characterData") { doText(m.target); continue; }
      if (m.type === "attributes") { doAttrs(m.target); continue; }
      m.addedNodes.forEach(n => { if (n.nodeType === 3) doText(n); else if (n.nodeType === 1) walk(n); });
    }
  });
  function start(){
    hookWordForm();
    walk(document.documentElement);
    if (document.title && CY.test(document.title)) document.title = T(document.title);
    obs.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS});
  }
  start();
  window.addEventListener("load", hookWordForm);
})();
