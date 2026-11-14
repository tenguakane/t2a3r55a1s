
(function(){
  /* Топы: почти пустые колонки реакций скрываются, под таблицей — переключатель */
  function prune(tableId){
    const t = document.getElementById(tableId); if (!t || !t.tHead || !t.tBodies[0]) return;
    const ths = [...t.tHead.rows[0].cells], rows = [...t.tBodies[0].rows].filter(r => r.cells.length === ths.length);
    let empty = false;
    ths.forEach((th, i) => {
      if (!th.classList.contains("rx-th")) return;
      const nz = rows.filter(r => !r.cells[i].classList.contains("zero")).length;
      const poor = rows.length >= 5 && nz / rows.length < 0.1;
      if (poor) empty = true;
      const hide = poor && !t.dataset.rxShow;
      th.classList.toggle("rx-empty-col", hide);
      rows.forEach(r => r.cells[i].classList.toggle("rx-empty-col", hide));
    });
    const wrap = t.closest(".wrap"); if (!wrap) return;
    let note = wrap.nextElementSibling && wrap.nextElementSibling.classList.contains("rx-note") ? wrap.nextElementSibling : null;
    if (!empty) { if (note) note.remove(); return; }
    if (!note) { note = document.createElement("p"); note.className = "hint rx-note"; wrap.insertAdjacentElement("afterend", note); }
    const shown = !!t.dataset.rxShow;
    note.innerHTML = (shown ? "Колонки реакций почти пустые — реакции учитываются недавно. " : "Колонки реакций скрыты: данных по ним почти нет. ") + `<button type="button" class="mini" data-rx-toggle="${tableId}">${shown ? "Скрыть колонки" : "Показать колонки"}</button>`;
  }
  ["months-table:m-body", "days-table:d-body"].forEach(p => {
    const [tid, bid] = p.split(":"), body = document.getElementById(bid); if (!body) return;
    new MutationObserver(() => prune(tid)).observe(body, {childList:true}); prune(tid);
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-rx-toggle]"); if (!b) return;
    const t = document.getElementById(b.dataset.rxToggle); if (!t) return;
    if (t.dataset.rxShow) delete t.dataset.rxShow; else t.dataset.rxShow = "1";
    prune(b.dataset.rxToggle);
  });

  /* Карточки: аватарки участников (переключатель рядом с «В ряд»; попадают и на картинку при копировании) */
  (function(){
    const KEY = "chatstats.cardsAvatars.v1";
    let on = false; try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}
    const apply = () => { document.body.classList.toggle("cards-avatars", on); document.querySelectorAll(".hc-av input").forEach(i => { i.checked = on; }); };
    function bars(){
      document.querySelectorAll(".hc-bar, .st-desk-tools").forEach(b => {
        if (b.querySelector(".hc-av") || !b.querySelector(".tv-btn, #st-tv")) return;
        { const id = b.dataset.for || (b.querySelector("#st-tv") ? "participants-table" : ""), t = id ? (document.querySelector(`table[data-hc="${id}"]`) || document.getElementById(id)) : null; if (t && !t.querySelector(".pname[data-open-profile], tr[data-row-key]")) return; }
        const l = document.createElement("label"); l.className = "checkline hc-av"; l.innerHTML = '<input type="checkbox"><span>Аватарки</span>';
        l.querySelector("input").checked = on; b.appendChild(l);
      });
    }
    function decorate(){
      if (!on || !window.AVATAR) return;
      document.querySelectorAll("table.tv-cards > tbody > tr:not([data-av-done])").forEach(tr => {
        tr.dataset.avDone = "1";
        const pe = tr.querySelector(".pname[data-open-profile]"), pk = pe ? pe.dataset.openProfile : (tr.dataset.rowKey || "");
        if (!pk || !(pk in NAMES)) return;
        const host = pe ? (pe.closest(".row-name-with-action") || pe.parentNode) : (tr.cells[1] || tr.cells[0]);
        const sp = document.createElement("span"); sp.className = "card-av"; sp.dataset.noExport = "1"; sp.setAttribute("aria-hidden", "true");
        let c = ""; try { c = getStyle("u", pk).c[0]; } catch (e) {} if (c) sp.style.setProperty("--p-color", c);
        sp.innerHTML = window.AVATAR.inner(pk, (NAMES[pk][0] || "?").toUpperCase());
        host.insertBefore(sp, host.firstChild);
      });
    }
    document.addEventListener("change", e => {
      if (!e.target.matches || !e.target.matches(".hc-av input")) return;
      on = e.target.checked; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {}
      apply(); if (on) { document.querySelectorAll("table.tv-cards > tbody > tr[data-av-done]").forEach(r => { if (!r.querySelector(".card-av")) delete r.dataset.avDone; }); decorate(); }
    });
    let t = 0; const later = () => { clearTimeout(t); t = setTimeout(() => { bars(); decorate(); }, 120); };
    new MutationObserver(later).__hub(document.querySelector("main") || document.body);
    setInterval(() => { bars(); decorate(); }, 1500);
    apply(); bars(); decorate();
  })();

  /* Уровень участника в событии — рядом с именем (в таблицах и карточках; попадает и на картинку при копировании) */
  (function(){
    const KEY = "chatstats.showLvl.v1";
    let on = false; try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}
    const apply = () => { document.body.classList.toggle("show-lvl", on); const b = document.getElementById("lvl-toggle"); if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); } };
    function evs(){
      const E = window.__beta && window.__beta.events; if (!E) return [];
      const all = E.list().filter(e => e.status !== "soon"), live = all.filter(e => e.status === "live");
      if (live.length) return live.slice(0, 2);
      return all.sort((a, b) => String(b.end).localeCompare(String(a.end))).slice(0, 1);
    }
    // цвета — как у достижений события: уровни 1–3 бронза, 4–6 серебро, 7–9 золото, 10 — алмаз (по порогам достижения)
    const lvlColor = (ev, l) => { const th = (ev.ach && ev.ach.th) || [10, 15, 20, 25, 30, 35, 40], n = th.filter(t => l >= t).length; return n <= 0 ? "#8b93a7" : n <= 3 ? "#e3a36b" : n <= 6 ? "#c0c6d4" : n <= 9 ? "#ffd166" : "#67e8f9"; };
    function clear(){ document.querySelectorAll(".lvl-chip").forEach(c => c.remove()); }
    function decorate(){
      if (!on) return;
      const E = window.__beta && window.__beta.events, list = evs(); if (!E || !list.length) return;
      document.querySelectorAll("main table").forEach(t => {
        if (t.querySelector(".ev-lv")) return;
        t.querySelectorAll(".pname[data-open-profile]").forEach(pe => {
          const nx = pe.nextElementSibling; if (nx && nx.classList.contains("lvl-chip")) return;
          const pk = pe.dataset.openProfile, parts = [];
          list.forEach(ev => { const l = (E.levelOfLoose || E.levelOf)(ev.id, pk); if (l > 0) parts.push({ev, l}); });
          if (!parts.length) return;
          let anchor = pe;
          parts.forEach(x => {
            const sp = document.createElement("span"); sp.className = "lvl-chip";
            sp.style.setProperty("--ec", lvlColor(x.ev, x.l));
            sp.title = `«${x.ev.title}» — уровень ${x.l}${x.ev.rankOf ? " · " + x.ev.rankOf(x.l) : ""}`;
            sp.textContent = "ур. " + x.l;
            anchor.after(sp); anchor = sp;
          });
        });
      });
    }
    document.addEventListener("click", e => {
      const b = e.target.closest && e.target.closest("#lvl-toggle"); if (!b) return;
      on = !on; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {}
      apply(); if (on) decorate(); else clear();
      if (window.__cardsFit) setTimeout(window.__cardsFit, 50);
    });
    let t = 0; const later = () => { clearTimeout(t); t = setTimeout(() => { apply(); decorate(); }, 150); };
    new MutationObserver(later).__hub(document.querySelector("main") || document.body);
    setInterval(() => { apply(); decorate(); }, 1800);
    apply(); apply(); decorate();
  })();

  /* Карточки: ширина по содержимому — без пустого места, когда показателей мало */
  (function(){
    const cvs = document.createElement("canvas").getContext("2d");
    const w = (t, font) => { cvs.font = font; return cvs.measureText(t).width; };
    function fit(){
      document.querySelectorAll("table.tv-cards").forEach(t => {
        if (!t.getClientRects().length) return;
        const rows = [...t.tBodies].flatMap(b => [...b.rows]).concat(t.tFoot ? [...t.tFoot.rows] : []).filter(r => r.getClientRects().length && !(r.cells.length === 1 && r.cells[0].colSpan > 1));
        if (!rows.length) return;
        const ff = getComputedStyle(t).fontFamily || "sans-serif", av = document.body.classList.contains("cards-avatars");
        let nMax = 0, cellMax = 64, nameMax = 0;
        rows.forEach(r => {
          const cs = [...r.cells], ms = cs.slice(2).filter(c => c.getClientRects().length);
          nMax = Math.max(nMax, ms.length);
          ms.forEach(c => { const v = [...c.childNodes].map(n => n.textContent.trim()).filter(Boolean).join(" "); cellMax = Math.max(cellMax, Math.ceil(Math.max(w(c.dataset.label || "", `500 11px ${ff}`), w(v, `600 14px ${ff}`))) + 4); });
          const nm = (cs[1] || cs[0]); const pe = nm && nm.querySelector(".pname"); const nt = nm ? (pe ? pe.textContent : nm.textContent).trim() : "";
          nameMax = Math.max(nameMax, Math.ceil(w(nt, `600 15.5px ${ff}`)) + (nm && nm.querySelector(".row-name-with-action") ? 40 : 0));
        });
        const byMetrics = nMax ? 28 + nMax * cellMax + (nMax - 1) * 10 : 0, byName = 28 + 38 + nameMax + (av ? 46 : 0) + 16;
        const cw = Math.round(Math.max(240, Math.min(520, byMetrics), Math.min(900, byName)));
        t.classList.add("cw-nowrap");
        let cw2 = cw; t.style.removeProperty("--nfs");
        const overflow = () => { let over = 0, room = 1e9; rows.forEach(r => { const nm = r.cells[1] || r.cells[0]; if (!nm || !nm.getClientRects().length) return; const pe = nm.querySelector(".pname") || nm; const nr = nm.getBoundingClientRect(); let ex = Math.max(nm.scrollWidth - nm.clientWidth, pe.scrollWidth - pe.clientWidth); const lastR = [...nm.querySelectorAll("*")].reduce((m2, e) => Math.max(m2, e.getBoundingClientRect().right), 0); if (lastR) ex = Math.max(ex, Math.ceil(lastR - nr.right + parseFloat(getComputedStyle(nm).paddingRight || 0))); if (ex > over) { over = ex; room = nm.clientWidth; } }); return {over, room}; };
        for (let i = 0; i < 4; i++) {
          if (t.style.getPropertyValue("--cw") !== cw2 + "px") t.style.setProperty("--cw", cw2 + "px");
          const o = overflow(); if (o.over <= 1 || cw2 >= 900) break;
          cw2 = Math.min(900, cw2 + Math.ceil(o.over) + 6);
        }
        // карточки фиксированной ширины («В ряд» 3+ или узкий экран): имя целиком — уменьшаем шрифт имени, но не мельче 11px
        let fs = 15.5;
        for (let i = 0; i < 5; i++) {
          const o = overflow(); if (o.over <= 1 || fs <= 11) break;
          fs = Math.max(11, Math.floor(fs * o.room / (o.room + o.over) * 10) / 10 - .1); t.style.setProperty("--nfs", fs + "px");
        }
      });
    }
    let tt = 0; const later = () => { clearTimeout(tt); tt = setTimeout(fit, 160); };
    new MutationObserver(later).__hub(document.querySelector("main") || document.body);
    document.addEventListener("change", later); document.addEventListener("click", later);
    window.addEventListener("resize", later); setInterval(fit, 2000); fit();
    window.__cardsFit = fit;
  })();

  /* переводы новых надписей */
  const D = window.__I18N_DICT; if (!D) return;
  Object.assign(D, {
    "С описанием":["With description","З описом","З апісаннем","Сипаттамасымен","Avec description","Z opisem"],
    "С аватарками":["With avatars","З аватарками","З аватарамі","Аватарлармен","Avec avatars","Z awatarami"],
    "Сгладить":["Smooth","Згладити","Згладзіць","Тегістеу","Lisser","Wygładź"],
    "Рекорд за":["Record for","Рекорд за","Рэкорд за","Рекорд","Record sur","Rekord za"],
    "Неделю":["Week","Тиждень","Тыдзень","Апта","Semaine","Tydzień"],
    "Держится":["Held for","Тримається","Трымаецца","Сақталуда","Tient depuis","Utrzymuje się"],
    "Развернуть все годы":["Expand all years","Розгорнути всі роки","Разгарнуць усе гады","Барлық жылдарды ашу","Tout déplier","Rozwiń wszystkie lata"],
    "Показать колонки":["Show columns","Показати колонки","Паказаць калонкі","Бағандарды көрсету","Afficher les colonnes","Pokaż kolumny"],
    "Скрыть колонки":["Hide columns","Сховати колонки","Схаваць калонкі","Бағандарды жасыру","Masquer les colonnes","Ukryj kolumny"],
    "Только ближайшие":["Nearest only","Лише найближчі","Толькі бліжэйшыя","Тек жақындары","Seulement les prochains","Tylko najbliższe"],
    "Уровень":["Level","Рівень","Узровень","Деңгей","Niveau","Poziom"],
    "Гонка по дням":["Race by day","Перегони по днях","Гонка па днях","Күн бойынша жарыс","Course jour par jour","Wyścig dzień po dniu"],
    "Место по сообщениям · последние 12 месяцев":["Rank by messages · last 12 months","Місце за повідомленнями · останні 12 місяців","Месца па паведамленнях · апошнія 12 месяцаў","Хабарламалар бойынша орын · соңғы 12 ай","Rang par messages · 12 derniers mois","Miejsce wg wiadomości · ostatnie 12 miesięcy"]
  });
})();
