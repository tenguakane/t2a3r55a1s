
/* ===================== 3D-наклон и голографические блики на карточках (v2) ===================== */
(function(){
  const KEY = "chatstats.holo.v1";
  // Где и как: max — наклон в градусах, kind — материал (rainbow — радужная фольга, gold — золото, metal — металл, foil — лёгкая фольга).
  const TARGETS = [
    {sel:'.ach-card:not(.locked)[data-tier="diamond"]', kind:"rainbow", max:14},
    {sel:'.ach-card:not(.locked)[data-tier="gold"]', kind:"gold", max:12},
    {sel:'.ach-card:not(.locked)[data-tier="silver"], .ach-card:not(.locked)[data-tier="bronze"]', kind:"metal", max:11},
    {sel:".yr-poster", kind:"rainbow", max:4, persp:1800, ra:.22, scale:1.004},
    {sel:".bd-banner", kind:"gold", max:4, persp:1400, scale:1.006},
    {sel:".yr-pod", kind:"metal", max:10},
    {sel:".hub-kpi", kind:"foil", max:8},
    {sel:".tile", kind:"foil", max:8},
    {sel:".theme-card", kind:"metal", max:12},
  ];
  const ALL = TARGETS.map(t => t.sel).join(",");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let on = true;
  try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  const cfgOf = el => TARGETS.find(t => el.matches(t.sel));
  const st = new Map(); // карточка → состояние {tx, ty, th — цель; x, y, h — текущее}
  let cur = null, raf = 0;
  function prep(el, cfg){
    if (el.classList.contains("holo-on")) return;
    el.classList.add("holo-on", "holo-k-" + cfg.kind);
    ["holo-fx", "holo-glare", "holo-rim"].forEach(c => {
      if (el.querySelector(":scope > ." + c)) return;
      const s = document.createElement("span"); s.className = c; s.setAttribute("aria-hidden", "true"); s.dataset.noExport = "1"; el.appendChild(s);
    });
    if (cfg.persp) el.style.setProperty("--hp", cfg.persp + "px");
    if (cfg.ra) el.style.setProperty("--ra", cfg.ra);
    const cs = getComputedStyle(el), c = cs.getPropertyValue("--tc") || cs.getPropertyValue("--p-color") || cs.getPropertyValue("--c");
    if (c.trim()) el.style.setProperty("--holo-c", c.trim());
  }
  function stateOf(el, cfg){
    let s = st.get(el);
    if (!s) { s = {cfg, tx:.5, ty:.5, th:0, x:.5, y:.5, h:0}; st.set(el, s); }
    return s;
  }
  const VARS = ["--rx", "--ry", "--mx", "--my", "--mxn", "--myn", "--hi", "--sx", "--sy", "--ang", "--hsc"];
  function write(el, s){
    const m = s.cfg.max * (s.k || 1), h = s.h, dx = s.x - .5, dy = s.y - .5, sc = s.cfg.scale || 1.025;
    const p = el.style;
    p.setProperty("--rx", (-dy * m * h).toFixed(2) + "deg");
    p.setProperty("--ry", (dx * m * h).toFixed(2) + "deg");
    p.setProperty("--mx", (s.x * 100).toFixed(1) + "%"); p.setProperty("--my", (s.y * 100).toFixed(1) + "%");
    p.setProperty("--mxn", s.x.toFixed(3)); p.setProperty("--myn", s.y.toFixed(3));
    p.setProperty("--hi", h.toFixed(3));
    p.setProperty("--sx", (dx * 2 * h).toFixed(3)); p.setProperty("--sy", (dy * 2 * h).toFixed(3));
    p.setProperty("--ang", (Math.atan2(dy, dx) * 180 / Math.PI + 90).toFixed(1) + "deg");
    p.setProperty("--hsc", (1 + (sc - 1) * h).toFixed(4));
  }
  function tick(){
    raf = 0;
    let live = false;
    st.forEach((s, el) => {
      if (!el.isConnected) { st.delete(el); return; }
      const k = s.th > 0 ? .18 : .1;
      s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
      s.h += (s.th - s.h) * (s.th > s.h ? .16 : .1);
      const still = Math.abs(s.tx - s.x) < .001 && Math.abs(s.ty - s.y) < .001 && Math.abs(s.th - s.h) < .004;
      if (still) { s.x = s.tx; s.y = s.ty; s.h = s.th; }
      if (still && s.th === 0) { el.classList.remove("holo-active"); VARS.forEach(v => el.style.removeProperty(v)); st.delete(el); return; }
      write(el, s);
      if (!still) live = true;
    });
    if (live) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function aim(el, px, py, power, k){
    const cfg = cfgOf(el); if (!cfg) return;
    prep(el, cfg);
    const s = stateOf(el, cfg);
    s.tx = px; s.ty = py; s.th = power; s.k = k || 1;
    el.classList.add("holo-active");
    kick();
  }
  function release(el){ const s = el && st.get(el); if (!s) return; s.tx = .5; s.ty = .5; s.th = 0; kick(); }
  document.addEventListener("pointermove", e => {
    if (!on || reduce.matches || e.pointerType === "touch") return;
    const el = e.target.closest ? e.target.closest(ALL) : null;
    if (el !== cur) { release(cur); cur = el; }
    if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    aim(el, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), 1);
  }, {passive:true});
  document.addEventListener("pointerleave", () => { release(cur); cur = null; });
  document.addEventListener("scroll", () => { if (cur) { release(cur); cur = null; } }, {passive:true, capture:true});
  // Телефон: наклон по гироскопу для карточек на экране.
  let gyroAsked = false, gyroOn = false;
  function onOrient(ev){
    if (!on || reduce.matches || ev.gamma == null) return;
    const px = Math.min(1, Math.max(0, .5 + ev.gamma / 50)), py = Math.min(1, Math.max(0, .5 + (ev.beta - 45) / 50));
    const vh = innerHeight;
    document.querySelectorAll(".tab.active " + TARGETS.map(t => t.sel).join(", .tab.active ")).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) { release(el); return; }
      aim(el, px, py, .8, .7);
    });
  }
  function startGyro(){
    if (gyroOn || !window.DeviceOrientationEvent || !matchMedia("(pointer:coarse)").matches) return;
    const go = () => { gyroOn = true; addEventListener("deviceorientation", onOrient, {passive:true}); };
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      if (gyroAsked) return; gyroAsked = true;
      DeviceOrientationEvent.requestPermission().then(r => { if (r === "granted") go(); }).catch(() => {});
    } else go();
  }
  document.addEventListener("touchend", () => { if (on) startGyro(); }, {passive:true, once:false});
  function apply(){
    const c = document.getElementById("set-holo"); if (c) c.checked = on;
    if (!on) { st.forEach((s, el) => release(el)); cur = null; }
  }
  document.addEventListener("change", e => { if (e.target.id === "set-holo") { on = e.target.checked; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {} apply(); } });
  apply();
})();
