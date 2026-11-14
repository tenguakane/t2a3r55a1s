
/* Масштаб на телефоне: страница раскладывается на более широкий «виртуальный» экран, а браузер ужимает её целиком */
(function(){
  var KEY = "chatstats.mscale.v1", BASE = "width=device-width, initial-scale=1, viewport-fit=cover";
  function devW(){ var a = screen.width || 0, b = screen.height || 0, land = false; try { land = matchMedia("(orientation:landscape)").matches; } catch (e) {} return land ? Math.max(a, b) : Math.min(a, b); }
  function isPhone(){ return Math.min(screen.width || 9999, screen.height || 9999) <= 720 && (navigator.maxTouchPoints || 0) > 0; }
  function get(){ var v = 1; try { v = parseFloat(localStorage.getItem(KEY) || "1"); } catch (e) {} return v >= 0.7 && v < 1 ? v : 1; }
  function apply(){
    var m = document.querySelector('meta[name="viewport"]'); if (!m) return;
    var s = get(), w = devW();
    m.setAttribute("content", s < 1 && isPhone() && w ? "width=" + Math.round(w / s) + ", initial-scale=" + s + ", viewport-fit=cover" : BASE);
  }
  window.__mscale = {get: get, set: function(v){ try { v >= 1 ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, String(v)); } catch (e) {} apply(); }, apply: apply, isPhone: isPhone};
  apply();
  window.addEventListener("orientationchange", function(){ setTimeout(apply, 60); });
})();
