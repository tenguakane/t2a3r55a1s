
/* Шрифт сайта (Настройки → Шрифт): применяется до отрисовки, чтобы не мигал */
(function(){
  var F = window.SITE_FONTS = {
    samsung:{css:'"Samsung Sans","SamsungOne"'},
    system:{css:'"Segoe UI Variable Text","Segoe UI",-apple-system,BlinkMacSystemFont,"SF Pro Text",Roboto'},
    inter:{css:'"Inter"', g:"Inter:wght@400;500;600;700"},
    manrope:{css:'"Manrope"', g:"Manrope:wght@400;500;600;700"},
    golos:{css:'"Golos Text"', g:"Golos+Text:wght@400;500;600;700"},
    onest:{css:'"Onest"', g:"Onest:wght@400;500;600;700"},
    rubik:{css:'"Rubik"', g:"Rubik:wght@400;500;600;700"},
    montserrat:{css:'"Montserrat"', g:"Montserrat:wght@400;500;600;700"},
    nunito:{css:'"Nunito"', g:"Nunito:wght@400;500;600;700"},
    roboto:{css:'"Roboto"', g:"Roboto:wght@400;500;700"},
    opensans:{css:'"Open Sans"', g:"Open+Sans:wght@400;500;600;700"},
    ptsans:{css:'"PT Sans"', g:"PT+Sans:wght@400;700"},
    jost:{css:'"Jost"', g:"Jost:wght@400;500;600;700"},
    comfortaa:{css:'"Comfortaa"', g:"Comfortaa:wght@400;500;600;700"},
    unbounded:{css:'"Unbounded"', g:"Unbounded:wght@400;500;600;700"},
    jetbrains:{css:'"JetBrains Mono"', g:"JetBrains+Mono:wght@400;500;600;700"}
  };
  var TAIL = ',"Segoe UI",system-ui,-apple-system,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';
  window.applySiteFont = function(id){
    var f = F[id] ? id : "samsung", d = F[f], root = document.documentElement;
    root.style.setProperty("--site-font", d.css + TAIL);
    root.dataset.siteFont = f;
    if (d.g && !document.getElementById("gf-" + f)) {
      var l = document.createElement("link"); l.rel = "stylesheet"; l.id = "gf-" + f;
      l.href = "https://fonts.googleapis.com/css2?family=" + d.g + "&display=swap";
      document.head.appendChild(l);
    }
    return f;
  };
  var saved = "samsung"; try { saved = localStorage.getItem("chatstats.siteFont.v1") || "samsung"; } catch (e) {}
  window.applySiteFont(saved);
})();
