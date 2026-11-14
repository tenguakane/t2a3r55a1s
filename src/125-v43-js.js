
(() => {
  const $q = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, "0"), isoL = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => isoL(new Date()), yday = () => { const t = new Date(); return isoL(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1)); };
  const curMode = () => (typeof mode !== "undefined" ? mode : ($q("#mode button.active")?.dataset.m || "day"));
  const isTodayDay = () => curMode() === "day" && ($q("#day")?.value || "") === today();
  function goYesterday(){
    const q = $q('[data-sq="yday"]');
    if (q) { q.click(); return; }
    const d = $q("#day"); if (!d) return;
    d.value = yday(); d.dispatchEvent(new Event("change", {bubbles:true}));
    const mb = $q('#mode button[data-m="day"]'); if (mb && !mb.classList.contains("active")) mb.click();
  }
  const note = t => { try { if (typeof toastMsg === "function") toastMsg(t); } catch (e) {} };

  /* ---------- Пустые состояния ---------- */
  const EMPTY_RE = /^Нет данных за выбранный период/;
  function decorate(el, isCell){
    if (el.dataset.es) return;
    const txt = el.textContent.trim(); if (!EMPTY_RE.test(txt)) return;
    el.dataset.es = "1"; el.classList.add("empty-state");
    if (isCell) el.closest("tr")?.classList.add("empty-row");
    if (isCell) { const w = el.closest(".wrap"); if (w) el.style.setProperty("--es-w", (w.clientWidth - 2) + "px"); }
    const td = isTodayDay();
    el.innerHTML = `<span class="es-ic" aria-hidden="true">🗓️</span><span class="es-t">${td ? "За сегодня данных пока нет" : "Нет данных за выбранный период"}</span><span class="es-s">${td ? "Статистика за день появляется по мере обновления. Вчерашний день уже посчитан." : "Попробуй выбрать другой период или чат."}</span>${td ? `<button type="button" class="es-btn" data-go-yday>Показать вчера</button>` : ""}`;
  }
  let autoDone = false, userPicked = false;
  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-go-yday]")) { goYesterday(); return; }
    if (e.target.closest?.('[data-sq="today"]')) userPicked = true;
  }, true);
  function scanEmpty(){
    $$("main section.tab.active td[colspan]").forEach(td => decorate(td, true));
    $$("main section.tab.active .note").forEach(n => decorate(n, false));
    // Первый заход: если за сегодня пусто — сразу показываем вчера
    if (!autoDone && !userPicked && isTodayDay()) {
      const sec = $q("main section.tab.active");
      const es = sec && ["tab-stats", "tab-charts"].includes(sec.id) ? [...sec.querySelectorAll(".empty-state [data-go-yday]")].find(b => b.offsetParent) : null;
      const empty = !!es;
      if (empty) { autoDone = true; goYesterday(); note("За сегодня данных пока нет — показано вчера"); }
    }
  }

  /* ---------- Радуга — только у главного блока ---------- */
  function markMain(){
    const sec = $q("main section.tab.active"); if (!sec) return;
    const cand = $$(".wrap, .chart", sec).filter(el => el.offsetParent && (el.matches(".chart") || el.querySelector(":scope > table")) && !el.closest(".chart-settings-panel, details:not([open])"));
    const main = cand[0];
    $$(".tb-main", document).forEach(el => { if (el !== main) el.classList.remove("tb-main"); });
    if (main && !main.classList.contains("tb-main")) main.classList.add("tb-main");
  }

  /* ---------- Длинные пояснения — «Подробнее» ---------- */
  function foldHints(){
    $$("#re-out > p.hint, #ev-out > p.hint").forEach(p => {
      if (p.dataset.fold || p.textContent.length < 150) return;
      p.dataset.fold = "1";
      const txt = p.innerHTML, m = p.textContent.match(/^.*?[.!?](\s|$)/), first = m ? m[0].trim() : p.textContent.slice(0, 80) + "…";
      const d = document.createElement("details"); d.className = "hint-more";
      d.innerHTML = `<summary><span class="hm-first"></span><span class="hm-more">Подробнее</span></summary><p></p>`;
      d.querySelector(".hm-first").textContent = first; d.querySelector("p").innerHTML = txt;
      p.replaceWith(d);
    });
  }

  /* ---------- Телефон: прокручиваемые полоски вкладок ---------- */
  function scrollFade(){
    $$("body.mapp main :is(.group-tabs,.seg)").forEach(el => {
      const sc = el.scrollWidth > el.clientWidth + 2;
      el.classList.toggle("is-scroll", sc);
      el.classList.toggle("at-end", !sc || el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
      if (sc && !el.__fadeBound) { el.__fadeBound = 1; el.addEventListener("scroll", () => el.classList.toggle("at-end", el.scrollLeft + el.clientWidth >= el.scrollWidth - 4), {passive:true}); }
    });
  }

  /* ---------- Контраст приглушённого текста: чуть ближе к основному цвету ---------- */
  let lastMuted = "";
  function lift(){
    const b = document.body; b.style.removeProperty("--muted");
    const cs = getComputedStyle(b), m = cs.getPropertyValue("--muted").trim(), t = cs.getPropertyValue("--text").trim();
    if (!m || !t) return;
    const v = `color-mix(in srgb, ${m} 82%, ${t})`;
    b.style.setProperty("--muted", v); lastMuted = m;
  }

  let raf = 0;
  const run = () => { raf = 0; scanEmpty(); markMain(); foldHints(); scrollFade(); };
  const later = () => { if (!raf) raf = requestAnimationFrame(run); };
  new MutationObserver(later).observe(document.querySelector("main"), {childList:true, subtree:true, attributes:true, attributeFilter:["class", "hidden"]});
  addEventListener("resize", later);
  new MutationObserver(ms => { if (ms.some(m => m.attributeName === "class" || m.attributeName === "data-theme")) lift(); }).observe(document.body, {attributes:true, attributeFilter:["class", "data-theme"]});
  document.addEventListener("click", e => { if (e.target.closest?.("#theme-grid, #theme-bases")) setTimeout(lift, 80); });
  lift(); later();
})();
