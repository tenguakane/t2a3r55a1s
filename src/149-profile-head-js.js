
(() => {
  const $ = id => document.getElementById(id);
  const person = $("person"), top = document.querySelector("header .top-title");
  if (!person || !top) return;
  /* ---------- Участник в шапке: появляется, когда карточка с именем уехала вверх ---------- */
  const chip = document.createElement("div"); chip.id = "hp-chip";
  chip.innerHTML = `<button type="button" class="hp-nav" data-hp="-1" title="Предыдущий участник" aria-label="Предыдущий участник">‹</button>`
    + `<button type="button" class="hp-main" aria-haspopup="listbox" aria-expanded="false" title="Сменить участника"><span class="hp-av"></span><span class="hp-name"></span><span class="hp-caret">▾</span></button>`
    + `<button type="button" class="hp-nav" data-hp="1" title="Следующий участник" aria-label="Следующий участник">›</button>`
    + `<div id="hp-pop" hidden><input type="search" placeholder="Найти участника" autocomplete="off" aria-label="Найти участника"><div class="hp-list" role="listbox"></div></div>`;
  top.appendChild(chip);
  const main = chip.querySelector(".hp-main"), pop = $("hp-pop"), q = pop.querySelector("input"), list = pop.querySelector(".hp-list");
  const opts = () => [...person.options].filter(o => o.value && !o.disabled && !o.hidden);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function fill(){
    const o = person.selectedOptions[0]; if (!o) return;
    chip.querySelector(".hp-name").textContent = o.textContent.trim();
    const av = chip.querySelector(".hp-av"), img = document.querySelector("#p-out .p-hero img");
    av.innerHTML = img && img.src ? `<img class="hp-av" src="${esc(img.src)}" alt="">` : esc((o.textContent.trim()[0] || "?").toUpperCase());
  }
  // Смена участника без прыжка страницы: остаёмся на том же разделе
  function go(v){
    if (!v || v === person.value) return;
    const y = window.scrollY;
    person.value = v; person.dispatchEvent(new Event("change", {bubbles:true}));
    const keep = () => window.scrollTo(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    requestAnimationFrame(() => requestAnimationFrame(keep)); setTimeout(keep, 250); setTimeout(() => { keep(); fill(); }, 700);
  }
  chip.addEventListener("click", e => {
    const nb = e.target.closest(".hp-nav");
    if (nb) { const a = opts(), i = a.findIndex(o => o.value === person.value); if (a.length) go(a[(i + Number(nb.dataset.hp) + a.length) % a.length].value); return; }
    const it = e.target.closest(".hp-item"); if (it) { close(); go(it.dataset.v); return; }
    if (e.target.closest(".hp-main")) pop.hidden ? open() : close();
  });
  let kb = -1;
  function draw(){
    const t = q.value.trim().toLowerCase(), a = opts().filter(o => !t || o.textContent.toLowerCase().includes(t));
    list.innerHTML = a.length ? a.map((o, i) => `<button type="button" role="option" class="hp-item${o.value === person.value ? " cur" : ""}${i === kb ? " kb" : ""}" data-v="${esc(o.value)}" aria-selected="${o.value === person.value}">${esc(o.textContent.trim())}</button>`).join("") : `<div class="hp-empty">Никого не нашлось</div>`;
  }
  function open(){ pop.hidden = false; main.setAttribute("aria-expanded", "true"); q.value = ""; kb = -1; draw(); q.focus(); list.querySelector(".cur")?.scrollIntoView({block:"nearest"}); }
  function close(){ pop.hidden = true; main.setAttribute("aria-expanded", "false"); }
  q.addEventListener("input", () => { kb = -1; draw(); });
  q.addEventListener("keydown", e => {
    const items = [...list.querySelectorAll(".hp-item")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); kb = Math.max(0, Math.min(items.length - 1, kb + (e.key === "ArrowDown" ? 1 : -1))); draw(); list.querySelectorAll(".hp-item")[kb]?.scrollIntoView({block:"nearest"}); }
    else if (e.key === "Enter") { const it = items[kb >= 0 ? kb : 0]; if (it) { close(); go(it.dataset.v); } }
    else if (e.key === "Escape") { close(); main.focus(); }
  });
  document.addEventListener("click", e => { if (!pop.hidden && !chip.contains(e.target)) close(); });
  // Показываем, только пока открыт «Профиль» и карточка с именем ушла под шапку
  let raf = 0;
  function sync(){
    raf = 0;
    const tab = $("tab-profile"), hero = document.querySelector("#p-out .p-hero"), head = document.querySelector("header");
    const show = !!(tab && tab.classList.contains("active") && hero && head && hero.getBoundingClientRect().bottom < head.getBoundingClientRect().bottom + 4);
    if (show !== document.body.classList.contains("hp-show")) {
      document.body.classList.toggle("hp-show", show);
      if (show) { fill(); requestAnimationFrame(() => document.body.classList.add("hp-in")); } else { document.body.classList.remove("hp-in"); close(); }
    }
  }
  const later = () => { if (!raf) raf = requestAnimationFrame(sync); };
  addEventListener("scroll", later, {passive:true}); addEventListener("resize", later);
  document.addEventListener("click", () => setTimeout(later, 60));
  person.addEventListener("change", () => setTimeout(() => { fill(); later(); }, 300));

  /* ---------- Кнопки «Копировать» у таблиц профиля и у «Кто чаще в хронике» ---------- */
  const pOut = $("p-out");
  let t1 = 0;
  const decorateProfile = () => { clearTimeout(t1); t1 = setTimeout(() => {
    try { if (window.__rxCopy && pOut.firstElementChild) window.__rxCopy.decorate(pOut, person.selectedOptions[0]?.textContent.trim() || "Профиль"); } catch (e) {}
    fill();
  }, 120); };
  if (pOut) { new MutationObserver(decorateProfile).observe(pOut, {childList:true}); decorateProfile(); }
  const chOut = $("ch-out");
  const decorateChron = () => {
    if (!chOut) return;
    chOut.querySelectorAll(".hub-card").forEach(card => {
      const h = card.querySelector(":scope > h3"), t = card.querySelector("table");
      if (!h || !t || h.querySelector(".copy-btn")) return;
      const title = h.textContent.trim();
      h.classList.add("ch-copy-h");
      const msg = document.createElement("span"); msg.className = "hint rx-copy-msg"; msg.setAttribute("role", "status");
      const b = document.createElement("button"); b.type = "button"; b.className = "mini copy-btn rx-copy"; b.textContent = "Копировать";
      b.addEventListener("click", () => copyPngToStatus(() => tableImageBlob(t, title), msg, "Скопировано"));
      h.append(msg, b);
    });
  };
  if (chOut) { new MutationObserver(decorateChron).observe(chOut, {childList:true}); decorateChron(); }
  // «Прогноз мест»: своя кнопка «Копировать» в панели над таблицей
  const fcPlaces = () => document.querySelectorAll(".fc-places table[data-hc]").forEach(t => {
    const bar = document.querySelector(`.hc-bar[data-for="${t.dataset.hc}"]`);
    if (!bar || bar.querySelector(".copy-btn")) return;
    const msg = document.createElement("span"); msg.className = "hint rx-copy-msg"; msg.setAttribute("role", "status");
    const b = document.createElement("button"); b.type = "button"; b.className = "mini copy-btn rx-copy"; b.textContent = "Копировать";
    b.addEventListener("click", () => copyPngToStatus(() => tableImageBlob(t, "Прогноз мест"), msg, "Скопировано"));
    bar.prepend(msg, b);
  });
  const fcTab = $("tab-forecast");
  if (fcTab) { let t2 = 0; new MutationObserver(() => { clearTimeout(t2); t2 = setTimeout(fcPlaces, 150); }).observe(fcTab, {childList:true, subtree:true}); fcPlaces(); }

  const D = window.__I18N_DICT;
  if (D) Object.assign(D, {
    "Сменить участника":["Change participant","Змінити учасника","Змяніць удзельніка","Қатысушыны ауыстыру","Changer de participant","Zmień uczestnika"],
    "Предыдущий участник":["Previous participant","Попередній учасник","Папярэдні ўдзельнік","Алдыңғы қатысушы","Participant précédent","Poprzedni uczestnik"],
    "Следующий участник":["Next participant","Наступний учасник","Наступны ўдзельнік","Келесі қатысушы","Participant suivant","Następny uczestnik"],
    "Найти участника":["Find a participant","Знайти учасника","Знайсці ўдзельніка","Қатысушыны табу","Trouver un participant","Znajdź uczestnika"],
    "Никого не нашлось":["No one found","Нікого не знайшлося","Нікога не знайшлося","Ешкім табылмады","Personne trouvé","Nikogo nie znaleziono"],
    "Стикеров, голосовых и видеосообщений пока нет.":["No stickers, voice or video messages yet.","Стікерів, голосових і відеоповідомлень поки немає.","Стыкераў, галасавых і відэапаведамленняў пакуль няма.","Стикерлер, дауыстық және бейнехабарлар әзірге жоқ.","Pas encore d’autocollants, de messages vocaux ou vidéo.","Brak jeszcze naklejek, głosówek i wiadomości wideo."]
  });
})();
