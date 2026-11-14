
/* Мобильная: активная вложенная вкладка (Другое/Топы) прокручивается в видимую область */
(function(){
  const mq = window.matchMedia("(max-width:720px)");
  function center(){ if (!mq.matches) return; document.querySelectorAll(".group-tabs").forEach(g => { const a = g.querySelector("button.active"); if (!a || !g.offsetParent) return; g.scrollLeft = Math.max(0, a.offsetLeft - (g.clientWidth - a.offsetWidth) / 2); }); }
  let cT = 0; // один отложенный запуск на пачку изменений, а не таймер на каждое
  new MutationObserver(() => { if (!cT && mq.matches) cT = setTimeout(() => { cT = 0; center(); }, 30); }).observe(document.body, {attributes:true, subtree:true, attributeFilter:["class"]});
  window.addEventListener("resize", center);
})();
