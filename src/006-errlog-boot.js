
/* Журнал ошибок: последние 50 ошибок страницы (window.onerror и необработанные промисы) — в localStorage, чтобы их можно было скопировать из «Настроек» */
(function(){
  "use strict";
  var KEY = "chatstats.errlog.v1", MAX = 50, list = [], timer = 0;
  try { var raw = localStorage.getItem(KEY); if (raw) { var a = JSON.parse(raw); if (Array.isArray(a)) list = a.slice(-MAX); } } catch (e) {}
  function flush(){ timer = 0; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function tabId(){ try { var t = document.querySelector(".tab.active"); return t ? String(t.id || "").replace(/^tab-/, "") : ""; } catch (e) { return ""; } }
  function add(kind, msg, where, stack){
    msg = String(msg == null ? "" : msg).slice(0, 300);
    var last = list[list.length - 1];
    if (last && last.m === msg && last.k === kind && last.w === where) { last.n = (last.n || 1) + 1; last.t = new Date().toISOString(); }
    else { list.push({t: new Date().toISOString(), k: kind, m: msg, w: where || "", s: String(stack || "").split("\n").slice(0, 4).join("\n").slice(0, 500), tab: tabId(), v: window.__appVersion || "", n: 1}); if (list.length > MAX) list.splice(0, list.length - MAX); }
    if (!timer) timer = setTimeout(flush, 500);
  }
  window.addEventListener("error", function(e){
    if (e && e.target && e.target !== window && e.target.tagName) return;   // ошибки загрузки картинок и шрифтов сюда не пишем
    add("error", e && e.message, e && e.filename ? String(e.filename).replace(/^.*\//, "") + ":" + (e.lineno || 0) + ":" + (e.colno || 0) : (e && e.lineno ? "строка " + e.lineno : ""), e && e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", function(e){
    var r = e && e.reason; add("promise", r && r.message ? r.message : r, "", r && r.stack);
  });
  function header(){
    var lang = ""; try { lang = (window.__lang && window.__lang.get && window.__lang.get()) || localStorage.getItem("chatstats.lang.v1") || "ru"; } catch (e) {}
    return ["Colony Stats " + (window.__appVersion || "?"), "Язык: " + lang, "Экран: " + innerWidth + "×" + innerHeight + " (x" + (window.devicePixelRatio || 1) + ")", "Браузер: " + navigator.userAgent, "Записей: " + list.length].join("\n");
  }
  window.__errlog = {
    list: function(){ return list.slice(); },
    clear: function(){ list = []; flush(); },
    text: function(){
      if (!list.length) return header() + "\nОшибок нет.";
      return header() + "\n\n" + list.map(function(x, i){ return (i + 1) + ". " + x.t.replace("T", " ").slice(0, 19) + " · вкладка: " + (x.tab || "—") + " · " + x.k + (x.n > 1 ? " ×" + x.n : "") + "\n   " + x.m + (x.w ? "\n   " + x.w : "") + (x.s ? "\n" + x.s.replace(/^/gm, "   ") : ""); }).join("\n\n");
    },
    add: add
  };
})();
