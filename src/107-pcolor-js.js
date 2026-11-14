
(function(){
  if (typeof getStyle !== "function") return;
  let t = 0;
  function paintNames(){
    document.querySelectorAll(".pname[data-open-profile]").forEach(el => {
      const pk = el.dataset.openProfile; let c = "";
      try { c = getStyle("u", pk).c[0]; } catch (e) {}
      if (!c) return;
      if (el.dataset.pc !== c) { el.dataset.pc = c; el.style.setProperty("--p-color", c); }
    });
  }
  const later = () => { clearTimeout(t); t = setTimeout(paintNames, 150); };
  try { new MutationObserver(later).__hub(document.querySelector("main") || document.body); } catch (e) { new MutationObserver(later).observe(document.body, {childList:true, subtree:true}); }
  document.addEventListener("change", later);
  window.__paintNames = paintNames; paintNames();
})();
