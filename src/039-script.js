
/* Клик по заголовку страницы или вкладке — наверх */
(function(){
  const up = () => { try { window.scrollTo({top:0, behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); } catch (e) { window.scrollTo(0, 0); } };
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("header h1, nav button[data-tab], .group-tabs button");
    if (t) up();
  });
  const h = document.querySelector("header h1"); if (h) { h.style.cursor = "pointer"; h.title = "Наверх"; }
})();
