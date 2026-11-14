
(() => {
  // Плитки «Частицы» и «Рамка»: текст слева, предпросмотр справа
  const dots = n => Array.from({length:n}, (_, i) => `<i class="pv-dot" style="left:${8 + i * (96 / n)}%;background:${["#d39064", "#e8c26a", "#c97b63", "#e6e2c3"][i % 4]};animation-delay:${-(i * .37) % 1.8}s"></i>`).join("");
  const PV = {"tb-style":`<i class="pv-tb"></i>`, "tb-speed":`<i class="pv-tb"></i>`, "fx-season-kind":dots(8), "fx-season-density":dots(12), "fx-season-size":dots(6)};
  function wrap(){
    document.querySelectorAll("#tab-settings .set-pane .filters > .set-frow").forEach(r => {
      if (r.querySelector(":scope > .fx-pv") || r.parentElement.closest(".set-frow")) return;
      const id = r.querySelector("select, input")?.id || "";
      const key = Object.keys(PV).find(k => id.startsWith(k));
      if (key) { const d = document.createElement("span"); d.className = "fx-pv"; d.setAttribute("aria-hidden", "true"); d.innerHTML = PV[key]; r.appendChild(d); }
    });
  }
  wrap(); new MutationObserver(wrap).observe(document.getElementById("tab-settings"), {childList:true, subtree:true});
  const sp = document.getElementById("tb-speed");
  const syncSp = () => { const v = sp?.value || ""; const k = /slow|медл/i.test(v) ? .5 : /fast|быстр/i.test(v) ? 2 : 1; document.documentElement.style.setProperty("--pv-sp", k); };
  sp?.addEventListener("change", syncSp); syncSp();
})();
