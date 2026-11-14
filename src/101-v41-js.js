
(() => {
  // Ширина подписи не зависит от того, свёрнуто меню или закреплено: меряем сам текст.
  const textW = b => { let w = 0; const r = document.createRange();
    b.childNodes.forEach(n => { if (n.nodeType === 3 && n.nodeValue.trim()) { r.selectNodeContents(n); w += r.getBoundingClientRect().width; } else if (n.nodeType === 1 && n.offsetParent !== null && !n.matches("svg, i, .li")) w += n.getBoundingClientRect().width; });
    return w; };
  function need(b){
    const cs = getComputedStyle(b), ic = getComputedStyle(b, "::before");
    const icon = ic.content && ic.content !== "none" ? parseFloat(ic.width) || 18 : 0;
    return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + icon + (icon ? parseFloat(cs.columnGap) || 9 : 0) + textW(b);
  }
  function fit(){
    let all = 0;
    document.querySelectorAll("nav .side-grp:not(.g-set)").forEach(g => {
      let w = 0;
      g.querySelectorAll("button").forEach(b => { if (getComputedStyle(b).display !== "none" && b.textContent.trim()) w = Math.max(w, need(b)); });
      if (!w) return;
      const cs = getComputedStyle(g);
      const full = Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + 4);
      g.style.setProperty("--grp-w", Math.max(120, full) + "px"); all = Math.max(all, full);
    });
    // Закреплённое меню — той же ширины, если её не меняли вручную перетаскиванием края.
    let saved = 0; try { saved = Number(localStorage.getItem("chatstats.sideW.v1")) || 0; } catch (e) {}
    if (!saved && all) document.body.style.setProperty("--side-w-open", Math.max(150, all) + "px");
  }
  let q = 0;
  const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; requestAnimationFrame(fit); }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", later); else later();
  addEventListener("load", later);
  if (document.fonts?.ready) document.fonts.ready.then(later);
  const nav = document.querySelector("nav");
  if (nav) new MutationObserver(later).observe(nav, {childList:true, subtree:true, characterData:true});
  new MutationObserver(later).observe(document.body, {attributes:true, attributeFilter:["class"]});
  document.addEventListener("dblclick", e => { if (e.target.id === "side-resizer") setTimeout(later, 30); });
})();
