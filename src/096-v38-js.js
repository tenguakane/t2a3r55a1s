
(() => {
  const put = () => {
    const L = window.__lineIcon; if (!L) return;
    document.querySelectorAll("#ma-tabs [data-ma]").forEach(b => {
      if (b.querySelector("svg.li")) return;
      const s = L.forTab(b.dataset.ma); if (!s) return;
      const old = b.querySelector("svg"); const t = document.createElement("template"); t.innerHTML = s.trim();
      old ? old.replaceWith(t.content.firstChild) : b.prepend(t.content.firstChild);
    });
  };
  const run = () => { put(); const tabs = document.getElementById("ma-tabs"); if (tabs) new MutationObserver(put).observe(tabs, {childList:true, subtree:true}); else setTimeout(run, 400); };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run) : run();
})();
