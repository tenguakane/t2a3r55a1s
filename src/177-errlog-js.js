
/* Журнал ошибок в «Настройках → Перенос и версия»: счётчик, список, кнопки «Скопировать» и «Очистить» */
(function(){
  "use strict";
  const T = window.__tx || (s => s);
  T.add && T.add({
    "Журнал ошибок":["Error log","Журнал помилок","Журнал памылак","Қателер журналы","Journal des erreurs","Dziennik błędów"],
    "Скопировать журнал":["Copy log","Скопіювати журнал","Скапіяваць журнал","Журналды көшіру","Copier le journal","Skopiuj dziennik"],
    "Очистить журнал":["Clear log","Очистити журнал","Ачысціць журнал","Журналды тазалау","Vider le journal","Wyczyść dziennik"],
    "Ошибок не было":["No errors so far","Помилок не було","Памылак не было","Қателер болған жоқ","Aucune erreur","Brak błędów"],
    "Записей: {1}":["Entries: {1}","Записів: {1}","Запісаў: {1}","Жазбалар: {1}","Entrées : {1}","Wpisów: {1}"],
    "Журнал скопирован":["Log copied","Журнал скопійовано","Журнал скапіяваны","Журнал көшірілді","Journal copié","Skopiowano dziennik"],
    "Журнал очищен":["Log cleared","Журнал очищено","Журнал ачышчаны","Журнал тазаланды","Journal vidé","Wyczyszczono dziennik"],
    "Не удалось скопировать — выделите текст в списке вручную":["Could not copy — select the text in the list manually","Не вдалося скопіювати — виділіть текст у списку вручну","Не ўдалося скапіяваць — вылучыце тэкст у спісе ўручную","Көшіру мүмкін болмады — тізімдегі мәтінді қолмен таңдаңыз","Copie impossible — sélectionnez le texte de la liste à la main","Nie udało się skopiować — zaznacz tekst na liście ręcznie"],
    "Если что-то сломалось, нажмите «Скопировать журнал» и отправьте текст разработчику. Данные чата в журнал не попадают.":["If something breaks, press “Copy log” and send the text to the developer. Chat data is not stored in the log.","Якщо щось зламалося, натисніть «Скопіювати журнал» і надішліть текст розробникові. Дані чату в журнал не потрапляють.","Калі штосьці зламалася, націсніце «Скапіяваць журнал» і адпраўце тэкст распрацоўшчыку. Даныя чата ў журнал не трапляюць.","Бірдеңе бұзылса, «Журналды көшіру» түймесін басып, мәтінді әзірлеушіге жіберіңіз. Чат деректері журналға түспейді.","En cas de problème, appuyez sur « Copier le journal » et envoyez le texte au développeur. Les données du chat ne sont pas enregistrées dans le journal.","Jeśli coś się zepsuje, naciśnij „Skopiuj dziennik” i wyślij tekst deweloperowi. Dane czatu nie trafiają do dziennika."]
  });
  const L = () => (window.__errlog || {list: () => [], clear(){}, text: () => ""});
  const esc = t => String(t).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  function render(){
    const sum = document.getElementById("errlog-sum"), pre = document.getElementById("errlog-list"); if (!sum || !pre) return;
    const a = L().list();
    sum.textContent = a.length ? T("Записей: {1}", a.length) : T("Ошибок не было");
    pre.hidden = !a.length; pre.textContent = a.length ? L().text() : "";
    const clr = document.getElementById("errlog-clear"); if (clr) clr.disabled = !a.length;
  }
  function toast(m){ try { if (typeof toastMsg === "function") toastMsg(m); } catch (e) {} }
  async function copy(){
    const text = L().text();
    try { await navigator.clipboard.writeText(text); toast(T("Журнал скопирован")); return; } catch (e) {}
    try {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove();
      toast(ok ? T("Журнал скопирован") : T("Не удалось скопировать — выделите текст в списке вручную"));
      if (!ok) { const pre = document.getElementById("errlog-list"); if (pre) pre.hidden = false; }
    } catch (e) { toast(T("Не удалось скопировать — выделите текст в списке вручную")); }
  }
  function ui(){
    const rs = document.getElementById("settings-reset"); if (!rs || document.getElementById("errlog-box")) return !!rs;
    const host = rs.closest(".field"); if (!host) return true;
    const f = document.createElement("div"); f.className = "field"; f.id = "errlog-box";
    f.innerHTML = `<label>${T("Журнал ошибок")}</label><div class="pbtn"><button class="mini" id="errlog-copy" type="button">${T("Скопировать журнал")}</button><button class="mini" id="errlog-clear" type="button">${T("Очистить журнал")}</button></div><span class="hint" id="errlog-sum"></span><pre id="errlog-list" class="errlog-list" data-no-i18n translate="no" hidden tabindex="0"></pre><span class="hint">${T("Если что-то сломалось, нажмите «Скопировать журнал» и отправьте текст разработчику. Данные чата в журнал не попадают.")}</span>`;
    host.after(f);
    document.getElementById("errlog-copy").addEventListener("click", copy);
    document.getElementById("errlog-clear").addEventListener("click", () => { L().clear(); render(); toast(T("Журнал очищен")); });
    render();
    return true;
  }
  let n = 0; (function wait(){ if (ui() || ++n > 40) return; setTimeout(wait, 250); })();
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("nav button[data-tab='settings'], .set-tabs button")) setTimeout(render, 80); });
})();
