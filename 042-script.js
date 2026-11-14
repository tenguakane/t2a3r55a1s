
/* «К разделу» — быстрые переходы на вкладках с несколькими блоками */
(function(){
  const TABS = ["profile","compare","usermap","marathons","time","forecast","selfie","yearreview","records","achievements"];
  const MIN = 3;
  function build(tab){
    if (!tab.classList.contains("active") || tab.querySelector("#bd-nav")) return;
    const hs = [...tab.querySelectorAll("h2")].filter(h => h.offsetParent && !h.closest(".chart-settings-panel, [data-no-export], .series-chips, #sec-nav, details:not([open])") && h.textContent.trim());
    let nav = tab.querySelector(":scope > .sec-nav, :scope > .tbar > .sec-nav");
    if (hs.length < MIN) { if (nav) nav.remove(); return; }
    const sig = hs.map(h => h.textContent.trim()).join("|");
    hs.forEach((h, i) => { if (!h.id || h.id.startsWith("sec-")) h.id = `sec-${tab.id}-${i}`; });
    { const gt0 = tab.querySelector(":scope > .group-tabs"); if (nav && gt0 && !nav.parentElement.classList.contains("tbar") && nav.previousElementSibling !== gt0) gt0.after(nav); }
    if (nav && nav.dataset.sig === sig && hs.every(h => document.getElementById(h.id) === h)) return;
    if (!nav) { nav = document.createElement("div"); nav.className = "series-chips sec-nav"; const gt = tab.querySelector(":scope > .group-tabs"); tab.insertBefore(nav, gt ? gt.nextSibling : tab.firstChild); }
    nav.dataset.sig = sig;
    const esc = t => t.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    nav.innerHTML = '<span class="hint">К разделу:</span>' + hs.map(h => { const t = h.textContent.trim(); return `<button class="chip" type="button" data-sec-go="${h.id}" title="${esc(t)}">${esc(t.length > 30 ? t.slice(0, 29) + "…" : t)}</button>`; }).join("");
  }
  let timer = 0;
  function run(){ TABS.forEach(id => { const t = document.getElementById("tab-" + id); if (t) build(t); }); }
  const sched = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
  new MutationObserver(m => { if (m.some(x => !(x.target.closest && x.target.closest(".sec-nav")))) sched(); }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-sec-go]"); if (!b) return;
    const t = document.getElementById(b.dataset.secGo); if (t) t.scrollIntoView({behavior:"smooth", block:"start"});
  });
  sched();
})();
