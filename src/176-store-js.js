
/* Единая точка доступа к настройкам. Все настройки сайта лежат в localStorage под ключами «chatstats.*»
   (экспорт и импорт уже работают по этому префиксу), история сообщений — в IndexedDB. Новому коду — пользоваться window.__store. */
(function(){
  "use strict";
  const P = "chatstats.", T = window.__tx || (s => s);
  const keys = () => { const a = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(P)) a.push(k); } } catch (e) {} return a.sort(); };
  const full = k => k.startsWith(P) ? k : P + k;
  const S = {
    get(k, def){ try { const v = localStorage.getItem(full(k)); return v == null ? def : v; } catch (e) { return def; } },
    set(k, v){ try { localStorage.setItem(full(k), String(v)); return true; } catch (e) { return false; } },
    getJSON(k, def){ try { const v = localStorage.getItem(full(k)); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    setJSON(k, v){ try { localStorage.setItem(full(k), JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove(k){ try { localStorage.removeItem(full(k)); } catch (e) {} },
    keys,
    info(k){ return window.__schema ? window.__schema.info(full(k)) : null; },
    unknown(){ return window.__schema ? window.__schema.unknown() : []; },
    bytes(){ let n = 0; try { keys().forEach(k => { n += k.length + (localStorage.getItem(k) || "").length; }); } catch (e) {} return n * 2; },
    resetAll(){ keys().forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); }
  };
  window.__store = S;
  function ui(){
    const imp = document.getElementById("settings-import"); if (!imp || document.getElementById("settings-reset")) return !!imp;
    const field = imp.closest(".field"); if (!field) return true;
    const f = document.createElement("div"); f.className = "field";
    f.innerHTML = `<label>${T("Сброс")}</label><div class="pbtn"><button class="mini" id="settings-reset" type="button">${T("Сбросить все настройки")}</button></div><span class="hint" id="settings-usage"></span>`;
    field.after(f);
    const usage = () => { const el = document.getElementById("settings-usage"); if (el) el.textContent = T("Сохранено настроек: {1} · {2} КБ", keys().length, Math.max(1, Math.round(S.bytes() / 1024))); };
    usage();
    document.getElementById("settings-reset").addEventListener("click", () => {
      if (!confirm(T("Сбросить все настройки сайта? Тема, фильтры, закрепления и остальное вернутся к исходным. Данные и кэш истории не затрагиваются."))) return;
      S.resetAll(); location.reload();
    });
    return true;
  }
  let n = 0; (function wait(){ if (ui() || ++n > 40) return; setTimeout(wait, 250); })();
})();
