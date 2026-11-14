
(() => {
  // Предпросмотр: каждому эффекту — маленькая сцена справа в его плитке
  const dots = (n, cols, cls = "pv-dot") => Array.from({length:n}, (_, i) => `<i class="${cls}" style="left:${8 + i * (96 / n)}%;background:${cols[i % cols.length]};animation-delay:${-(i * .37) % 1.8}s"></i>`).join("");
  const sparks = () => Array.from({length:10}, (_, i) => { const a = i / 10 * 6.283; return `<i class="pv-spark" style="--dx:${(Math.cos(a) * 34).toFixed(0)}px;--dy:${(Math.sin(a) * 22).toFixed(0)}px;background:${["#ffd36e", "#ff7ad9", "#6fe3ff"][i % 3]};animation-delay:${(i % 3) * .15}s"></i>`; }).join("");
  const line = (neon) => `<svg viewBox="0 0 100 50" width="96" height="50"><defs><filter id="pvGl${neon ? 1 : 0}"><feGaussianBlur stdDeviation="2.5"/></filter></defs>${neon ? `<path d="M6 44 L6 44 C30 40 50 22 94 8 L94 13 C50 26 30 43 6 45 Z" fill="var(--accent)" filter="url(#pvGl1)" opacity=".9"/><path d="M6 44.5 C30 41 50 23 94 9 L94 12 C50 25 30 43 6 44.6 Z" fill="var(--accent)"/><path d="M40 33 C55 25 70 17 94 10 L94 11.2 C70 18 55 26 40 34Z" fill="#fff" opacity=".7"/>` : `<path d="M6 44 C30 40 50 22 94 8" stroke="var(--accent)" stroke-width="3" fill="none" filter="url(#pvGl0)"/><path d="M6 44 C30 40 50 22 94 8" stroke="var(--accent)" stroke-width="2" fill="none"/>`}</svg>`;
  const PV = {
    "set-soft-grad":`<i class="pv-bar pv-grad" style="top:16px"></i><i class="pv-bar" style="top:34px;background:linear-gradient(90deg,#a8325a,#ff9ab8)"></i>`,
    "set-neon":line(true),
    "set-holo-text":`<span class="pv-holo">1-е</span>`,
    "set-holo":`<i class="pv-card"></i>`,
    odometer:`<span class="pv-odo"><span>0<br>2<br>4<br>6<br>8<br>1&nbsp;204</span></span>`,
    shimmer:`<span class="pv-shimmer">12 840</span>`,
    neon:`<span class="pv-neon">Саша</span>`,
    fire:`<span style="font-size:15px">14</span><span class="pv-fire">🔥</span>`,
    type:`<span class="pv-type">Самый ак…</span>`,
    border:`<i class="pv-border"></i>`,
    glass:`<i class="pv-glass-bg"></i><i class="pv-glass"></i>`,
    parallax:`<i class="pv-par"></i>`,
    confetti:dots(9, ["#ff7ad9", "#ffd36e", "#7cf7c0", "#6fe3ff"]),
    fireworks:sparks(),
    season:dots(7, ["#d39064", "#e8c26a", "#c97b63"]),
    misha:`<span style="font-size:24px">🥚</span>`,
    yearchips:`<span class="pv-chip">2025</span>`,
    glow:line(false),
    pulse:`<i class="pv-pdot"></i>`,
    morph:`<span class="pv-cols"><i></i><i></i><i></i><i></i></span>`,
    "tb-export":`<i class="pv-frame"></i>`,
  };
  function add(){
    document.querySelectorAll('#tab-settings .set-pane[data-cat="fx"] label.checkline').forEach(l => {
      if (l.querySelector(".fx-pv")) return;
      const i = l.querySelector("input"); const k = i && (i.dataset.fx || i.id); const h = k && PV[k]; if (!h) return;
      const d = document.createElement("span"); d.className = "fx-pv"; d.setAttribute("aria-hidden", "true"); d.innerHTML = h; l.appendChild(d);
    });
  }
  add();
  new MutationObserver(add).observe(document.getElementById("tab-settings"), {childList:true, subtree:true});
})();
