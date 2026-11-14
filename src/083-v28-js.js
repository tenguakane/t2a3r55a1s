
/* ===================== v28: «Копировать» в строке фильтров «Статистики», выбор шрифта сайта ===================== */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- Кнопка «Копировать» справа в строке фильтров ---------- */
  const quick = $("stats-quick");
  if (quick) {
    const slot = document.createElement("div");
    slot.className = "st-copy-slot"; slot.dataset.noExport = "1"; slot.hidden = true;
    quick.appendChild(slot);
    const IDS = {"tab-participants":"copy-participants-image", "tab-chats":"copy-chats-image"};
    const marks = new Map();
    const mq = window.matchMedia("(min-width:721px)");
    const on = () => mq.matches && document.body.classList.contains("filters-right");
    function sync(){
      const act = document.querySelector("#tab-stats .stat-content.active")?.id, enabled = on();
      Object.entries(IDS).forEach(([sec, id]) => {
        const box = $(id)?.closest(".table-export-actions"); if (!box) return;
        const want = enabled && sec === act;
        if (want && box.parentNode !== slot) {
          const m = document.createComment("st-copy"); box.before(m); marks.set(box, m); slot.appendChild(box);
        } else if (!want && box.parentNode === slot) {
          const m = marks.get(box); marks.delete(box);
          if (m && m.parentNode) m.replaceWith(box); else box.remove();
        }
      });
      const vis = !!slot.children.length;
      if (slot.hidden === vis) slot.hidden = !vis;
    }
    let q = 0;
    const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; sync(); }); };
    const main = document.querySelector("main");
    if (main) new MutationObserver(ms => { if (ms.some(m => m.target !== slot && !slot.contains(m.target))) later(); }).observe(main, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
    new MutationObserver(later).observe(document.body, {attributes:true, attributeFilter:["class"]});
    mq.addEventListener?.("change", later);
    sync(); setTimeout(sync, 300); setTimeout(sync, 1200);
  }

  /* ---------- Шрифт сайта ---------- */
  const KEY = "chatstats.siteFont.v1";
  const sel = $("site-font");
  if (sel && typeof window.applySiteFont === "function") {
    sel.value = document.documentElement.dataset.siteFont || "samsung";
    sel.addEventListener("change", () => {
      const f = window.applySiteFont(sel.value);
      try { if (f === "samsung") localStorage.removeItem(KEY); else localStorage.setItem(KEY, f); } catch (e) {}
      // Ширина столбцов и подписи графиков зависят от шрифта — даём сайту пересчитать раскладку.
      const kick = () => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(kick, 60)); else setTimeout(kick, 400);
    });
  }

  /* ---------- Переводы новых подписей ---------- */
  const D = window.__I18N_DICT;
  if (D) Object.assign(D, {
    "Реакции":["Reactions","Реакції","Рэакцыі","Реакциялар","Réactions","Reakcje"],
    "События":["Events","Події","Падзеі","Оқиғалар","Événements","Wydarzenia"],
    "Топы":["Tops","Топи","Топы","Топтар","Tops","Topy"],
    "Реакции и события (бета)":["Reactions and events (beta)","Реакції та події (бета)","Рэакцыі і падзеі (бэта)","Реакциялар мен оқиғалар (бета)","Réactions et événements (bêta)","Reakcje i wydarzenia (beta)"],
    "Общие":["General","Загальні","Агульныя","Жалпы","Générales","Ogólne"],
    "По событиям":["By events","За подіями","Па падзеях","Оқиғалар бойынша","Par événement","Według wydarzeń"],
    "Топ-10":["Top 10","Топ-10","Топ-10","Топ-10","Top 10","Top 10"],
    "Топ-20":["Top 20","Топ-20","Топ-20","Топ-20","Top 20","Top 20"],
    "Копировать топ-10":["Copy top 10","Копіювати топ-10","Капіяваць топ-10","Топ-10 көшіру","Copier le top 10","Kopiuj top 10"],
    "Копировать топ-20":["Copy top 20","Копіювати топ-20","Капіяваць топ-20","Топ-20 көшіру","Copier le top 20","Kopiuj top 20"],
    "Лёгкий градиент в цветах участников":["Soft gradient in member colors","Легкий градієнт у кольорах учасників","Лёгкі градыент у колерах удзельнікаў","Қатысушы түстеріндегі жеңіл градиент","Dégradé léger dans les couleurs des membres","Delikatny gradient w kolorach uczestników"],
    "Настройка таблицы":["Table settings","Налаштування таблиці","Налады табліцы","Кесте баптауы","Réglages du tableau","Ustawienia tabeli"],
    "Настройка таблицы: вид, столбцы и строки":["Table settings: view, columns and rows","Налаштування таблиці: вигляд, стовпці й рядки","Налады табліцы: выгляд, слупкі і радкі","Кесте баптауы: көрініс, бағандар мен жолдар","Réglages du tableau : vue, colonnes et lignes","Ustawienia tabeli: widok, kolumny i wiersze"],
    "Посмотреть все":["Show all","Переглянути всі","Паглядзець усе","Барлығын көру","Tout afficher","Pokaż wszystkie"],
    "Скрыть старые":["Hide older","Сховати старі","Схаваць старыя","Ескілерін жасыру","Masquer les anciennes","Ukryj starsze"],
    "Плавное появление блоков при смене вкладки":["Smooth block appearance when switching tabs","Плавна поява блоків під час зміни вкладки","Плаўнае з'яўленне блокаў пры змене ўкладкі","Қойынды ауысқанда блоктардың біртіндеп пайда болуы","Apparition fluide des blocs au changement d'onglet","Płynne pojawianie się bloków przy zmianie karty"],
    "Шрифт сайта":["Site font","Шрифт сайту","Шрыфт сайта","Сайт қарпі","Police du site","Czcionka strony"],
    "Samsung Sans — по умолчанию":["Samsung Sans — default","Samsung Sans — за замовчуванням","Samsung Sans — па змаўчанні","Samsung Sans — әдепкі","Samsung Sans — par défaut","Samsung Sans — domyślna"],
    "Системный (Segoe UI / SF)":["System (Segoe UI / SF)","Системний (Segoe UI / SF)","Сістэмны (Segoe UI / SF)","Жүйелік (Segoe UI / SF)","Système (Segoe UI / SF)","Systemowa (Segoe UI / SF)"],
    "Каким шрифтом написан весь сайт: текст, таблицы, кнопки и графики. Samsung Sans встроен в страницу, остальные подгружаются из Google Fonts при выборе.":["The font used across the whole site: text, tables, buttons and charts. Samsung Sans is built into the page; the others load from Google Fonts when chosen.","Яким шрифтом написаний увесь сайт: текст, таблиці, кнопки й графіки. Samsung Sans вбудований у сторінку, інші завантажуються з Google Fonts під час вибору.","Якім шрыфтам напісаны ўвесь сайт: тэкст, табліцы, кнопкі і графікі. Samsung Sans убудаваны ў старонку, астатнія падгружаюцца з Google Fonts пры выбары.","Бүкіл сайттың қарпі: мәтін, кестелер, батырмалар мен графиктер. Samsung Sans бетке енгізілген, қалғандары таңдағанда Google Fonts-тан жүктеледі.","La police de tout le site : texte, tableaux, boutons et graphiques. Samsung Sans est intégrée à la page, les autres se chargent depuis Google Fonts.","Czcionka całej strony: tekst, tabele, przyciski i wykresy. Samsung Sans jest wbudowana w stronę, pozostałe ładują się z Google Fonts po wybraniu."]
  });
})();
