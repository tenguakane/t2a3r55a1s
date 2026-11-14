
/* ===================== Графики: таймлайн по всей истории с мини-картой ===================== */
(function(){
  const card = document.getElementById("tl-card"), tab = document.getElementById("tab-charts"); if (!card || !tab) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const nf = v => Math.round(v).toLocaleString("ru-RU");
  const T = window.__tx, MON = T.ru ? ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"] : ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"].map(m => T(m));
  const ML = {msgs:T("Сообщения"), stick:T("Стикеры"), voice:T("Голосовые"), video:T("Видеосообщения")};
  const fd = d => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
  let D = null, chat = "", titles = null, gen = 0;
  async function prep(chat){
    const arr = pick(await getHistory(), chat || "");
    const rec = [], dayM = new Map();
    for (const x of arr) {
      const uid = x[F.userId]; if (typeof isExcludedUser === "function" && isExcludedUser(uid)) continue;
      const d = String(x[F.date] ?? "").slice(0, 10); if (d.length !== 10) continue;
      const m = {msgs:Number(g(x, "msgs")) || 0, stick:Number(g(x, "stick")) || 0, voice:Number(g(x, "voice")) || 0, video:Number(g(x, "video")) || 0};
      rec.push({d, u:String(uid ?? x[F.name]), n:who(x), m});
      let a = dayM.get(d); if (!a) dayM.set(d, a = {msgs:0, stick:0, voice:0, video:0});
      for (const k in m) a[k] += m[k];
    }
    if (!rec.length) return null;
    const keys = [...dayM.keys()].sort(), DS = [], t0 = Date.parse(keys[0] + "T00:00:00Z"), t1 = Date.parse(keys[keys.length - 1] + "T00:00:00Z");
    for (let t = t0; t <= t1; t += 864e5) DS.push(new Date(t).toISOString().slice(0, 10));
    const ser = {}, pre = {};
    for (const k in ML) {
      ser[k] = DS.map(d => (dayM.get(d) || {})[k] || 0);
      const p = new Float64Array(DS.length + 1); ser[k].forEach((v, i) => p[i + 1] = p[i] + v); pre[k] = p;
    }
    const wd = DS.map(d => (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7);
    return {rec, DS, ser, pre, wd};
  }

  /* ---------- 1. Таймлайн с мини-картой ---------- */
  function brushCard(box, chatOpts, onChat){
    const S = {k:"msgs", a:Math.max(0, D.DS.length - 365), b:D.DS.length - 1};
    box.innerHTML = `<div class="tl-head"><h3>${T("Таймлайн по всей истории")}</h3><select data-r="c" title="${T("Чат")}">${chatOpts}</select><select data-r="k">${Object.entries(ML).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
      <p class="tl-hint">${T("Потяни рамку на мини-карте или её края. Колесо мыши над большим графиком — масштаб.")}</p>
      <div class="tl-stats" data-r="st"></div>
      <svg data-r="main" data-no-zoom viewBox="0 0 900 230" class="tl-svg"></svg>
      <svg data-r="mini" data-no-zoom viewBox="0 0 900 56" class="tl-svg tl-mini"></svg>`;
    const main = box.querySelector('[data-r="main"]'), mini = box.querySelector('[data-r="mini"]'), st = box.querySelector('[data-r="st"]');
    const N = D.DS.length, MIN = 14, X0 = 46, X1 = 890;
    function bucketize(a, b, k){
      const n = b - a + 1, bs = n <= 150 ? 1 : n <= 900 ? 7 : 30, out = [];
      for (let i = a; i <= b; i += bs) { const j = Math.min(b, i + bs - 1); out.push({i, j, v:(D.pre[k][j + 1] - D.pre[k][i]) / (j - i + 1)}); }
      return {out, bs};
    }
    function drawMain(){
      const {out, bs} = bucketize(S.a, S.b, S.k), mx = Math.max(1, ...out.map(o => o.v)) * 1.08;
      const px = i => X0 + (out.length < 2 ? 0 : (i / (out.length - 1)) * (X1 - X0)), py = v => 200 - (v / mx) * 178;
      let h = "";
      for (let t = 0; t <= 4; t++) { const v = mx * t / 4, y = py(v); h += `<line x1="${X0}" x2="${X1}" y1="${y}" y2="${y}" class="tl-grid"/><text x="${X0 - 6}" y="${y + 4}" text-anchor="end" class="tl-t">${nf(v)}</text>`; }
      const pts = out.map((o, i) => `${px(i).toFixed(1)},${py(o.v).toFixed(1)}`);
      h += `<path d="M${px(0)},200 L${pts.join(" L")} L${px(out.length - 1)},200Z" class="tl-area"/><polyline points="${pts.join(" ")}" class="tl-line"/>`;
      const lab = 6; for (let t = 0; t < lab; t++) { const i = Math.round(t * (out.length - 1) / (lab - 1)), d = D.DS[out[i].i]; h += `<text x="${px(i)}" y="222" text-anchor="${t === 0 ? "start" : t === lab - 1 ? "end" : "middle"}" class="tl-t">${bs >= 7 || S.b - S.a > 200 ? MON[+d.slice(5, 7) - 1] + " " + d.slice(2, 4) : d.slice(8, 10) + "." + d.slice(5, 7)}</text>`; }
      h += `<line id="lb-x" y1="22" y2="200" class="tl-cross" style="display:none"/><circle id="lb-c" r="4" class="tl-dot" style="display:none"/><rect id="lb-h" x="${X0}" y="0" width="${X1 - X0}" height="200" fill="transparent"/>`;
      main.innerHTML = h;
      const hv = main.querySelector("#lb-h"), cx = main.querySelector("#lb-x"), cc = main.querySelector("#lb-c");
      hv.onmousemove = e => {
        const r = main.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 900, i = Math.max(0, Math.min(out.length - 1, Math.round((x - X0) / (X1 - X0) * (out.length - 1)))), o = out[i];
        cx.setAttribute("x1", px(i)); cx.setAttribute("x2", px(i)); cx.style.display = ""; cc.setAttribute("cx", px(i)); cc.setAttribute("cy", py(o.v)); cc.style.display = "";
        const d1 = D.DS[o.i], d2 = D.DS[o.j];
        tip(e, `<b>${o.i === o.j ? fd(d1) : fd(d1) + " – " + fd(d2)}</b><br>${bs > 1 ? T("{1} в день в среднем", nf(o.v)) : nf(o.v) + " " + ML[S.k].toLowerCase()}`);
      };
      hv.onmouseleave = () => { cx.style.display = "none"; cc.style.display = "none"; tip(); };
      if (!main._tc) { main._tc = 1;
        const ptr = new Map(); let pz = null;
        main.addEventListener("pointerdown", e => { if (e.pointerType === "mouse") return; ptr.set(e.pointerId, e.clientX); try { main.setPointerCapture(e.pointerId); } catch (err) {} pz = {a:S.a, b:S.b, x:e.clientX, d:null}; });
        main.addEventListener("pointermove", e => {
          if (!pz || !ptr.has(e.pointerId)) return; ptr.set(e.pointerId, e.clientX);
          const n0 = pz.b - pz.a + 1;
          if (ptr.size >= 2) { const xs = [...ptr.values()], d = Math.abs(xs[0] - xs[1]); if (pz.d === null) { pz.d = Math.max(8, d); pz.a0 = S.a; pz.b0 = S.b; return; }
            const nn = Math.max(MIN, Math.min(N, Math.round((pz.b0 - pz.a0 + 1) * pz.d / Math.max(8, d)))), c = (pz.a0 + pz.b0) / 2; let a = Math.round(c - nn / 2); a = Math.max(0, Math.min(N - nn, a)); S.a = a; S.b = a + nn - 1; }
          else { const r = main.getBoundingClientRect(), dd = Math.round(-(e.clientX - pz.x) / r.width * 900 / (X1 - X0) * n0); let a = Math.max(0, Math.min(N - n0, pz.a + dd)); S.a = a; S.b = a + n0 - 1; }
          draw();
        });
        const up = e => { ptr.delete(e.pointerId); if (!ptr.size) pz = null; else if (pz) { pz.a = S.a; pz.b = S.b; pz.x = [...ptr.values()][0]; pz.d = null; } };
        main.addEventListener("pointerup", up); main.addEventListener("pointercancel", up);
      }
      hv.onwheel = e => {
        e.preventDefault(); const r = main.getBoundingClientRect(), f = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * 900 - X0) / (X1 - X0)));
        const n = S.b - S.a + 1, nn = Math.max(MIN, Math.min(N, Math.round(n * (e.deltaY > 0 ? 1.25 : .8)))), c = S.a + f * n;
        let a = Math.round(c - f * nn); a = Math.max(0, Math.min(N - nn, a)); S.a = a; S.b = a + nn - 1; draw();
      };
    }
    function drawMini(){
      const bs = Math.ceil(N / 180), pts = []; let mx = 1;
      for (let i = 0; i < N; i += bs) { const j = Math.min(N - 1, i + bs - 1), v = (D.pre[S.k][j + 1] - D.pre[S.k][i]) / (j - i + 1); pts.push(v); if (v > mx) mx = v; }
      const px = i => X0 + (i / Math.max(1, pts.length - 1)) * (X1 - X0), py = v => 50 - (v / mx) * 42;
      const xa = X0 + S.a / (N - 1) * (X1 - X0), xb = X0 + S.b / (N - 1) * (X1 - X0);
      mini.innerHTML = `<path d="M${px(0)},50 L${pts.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" L")} L${px(pts.length - 1)},50Z" class="tl-area tl-area2"/>
        <rect x="${X0}" y="2" width="${Math.max(0, xa - X0)}" height="50" class="tl-dim"/><rect x="${xb}" y="2" width="${Math.max(0, X1 - xb)}" height="50" class="tl-dim"/>
        <rect data-m="m" x="${xa}" y="2" width="${Math.max(6, xb - xa)}" height="50" class="tl-win"/>
        <rect data-m="l" x="${xa - 4}" y="2" width="8" height="50" class="tl-hd"/><rect data-m="r" x="${xb - 4}" y="2" width="8" height="50" class="tl-hd"/>`;
    }
    function stats(){
      const n = S.b - S.a + 1, sum = D.pre[S.k][S.b + 1] - D.pre[S.k][S.a]; let pk = S.a;
      for (let i = S.a; i <= S.b; i++) if (D.ser[S.k][i] > D.ser[S.k][pk]) pk = i;
      st.innerHTML = `<div><small>${T("Период")}</small><b>${fd(D.DS[S.a])} – ${fd(D.DS[S.b])}</b></div><div><small>${T("Всего")}</small><b>${nf(sum)}</b></div><div><small>${T("В день")}</small><b>${nf(sum / n)}</b></div><div><small>${T("Пик")}</small><b title="${fd(D.DS[pk])}">${nf(D.ser[S.k][pk])} · ${fd(D.DS[pk]).slice(0, 5)}</b></div>`;
    }
    function draw(){ drawMain(); drawMini(); stats(); }
    box.querySelector('[data-r="k"]').onchange = e => { S.k = e.target.value; draw(); };
    box.querySelector('[data-r="c"]').onchange = e => onChat(e.target.value);
    let drag = null;
    mini.addEventListener("pointerdown", e => {
      const r = mini.getBoundingClientRect(), f = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * 900 - X0) / (X1 - X0))), i = Math.round(f * (N - 1)), m = e.target.dataset.m;
      if (m) drag = {m, i, a:S.a, b:S.b};
      else { const n = S.b - S.a + 1; let a = Math.max(0, Math.min(N - n, i - Math.round(n / 2))); S.a = a; S.b = a + n - 1; draw(); drag = {m:"m", i, a:S.a, b:S.b}; }
      mini.setPointerCapture(e.pointerId); e.preventDefault();
    });
    mini.addEventListener("pointermove", e => {
      if (!drag) return; const r = mini.getBoundingClientRect(), f = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width * 900 - X0) / (X1 - X0))), i = Math.round(f * (N - 1)), dd = i - drag.i;
      if (drag.m === "l") S.a = Math.max(0, Math.min(drag.b - MIN + 1, drag.a + dd));
      else if (drag.m === "r") S.b = Math.min(N - 1, Math.max(drag.a + MIN - 1, drag.b + dd));
      else { const n = drag.b - drag.a; let a = Math.max(0, Math.min(N - 1 - n, drag.a + dd)); S.a = a; S.b = a + n; }
      draw();
    });
    mini.tabIndex = 0; mini.setAttribute("aria-label", T("Окно таймлайна: стрелки — сдвиг, плюс и минус — масштаб"));
    mini.addEventListener("keydown", e => {
      const n = S.b - S.a + 1, st2 = Math.max(1, Math.round(n * .1)); let a = S.a, b = S.b, ok = true;
      if (e.key === "ArrowLeft") { a -= st2; b -= st2; } else if (e.key === "ArrowRight") { a += st2; b += st2; }
      else if (e.key === "+" || e.key === "=") { const c = Math.max(MIN, Math.round(n * .8)), m = (a + b) / 2; a = Math.round(m - c / 2); b = a + c - 1; }
      else if (e.key === "-") { const c = Math.min(N, Math.round(n * 1.25)), m = (a + b) / 2; a = Math.round(m - c / 2); b = a + c - 1; }
      else if (e.key === "Home") { b -= a; a = 0; } else if (e.key === "End") { a += N - 1 - b; b = N - 1; } else ok = false;
      if (!ok) return; e.preventDefault(); const len = b - a; if (a < 0) { a = 0; b = len; } if (b > N - 1) { b = N - 1; a = Math.max(0, b - len); } S.a = a; S.b = b; draw(); mini.focus();
    });
    const end = () => { drag = null; }; mini.addEventListener("pointerup", end); mini.addEventListener("pointercancel", end);
    draw();
  }

  /* ---------- тултип ---------- */
  let tp = null;
  function tip(e, html){
    if (!e) { if (tp) tp.style.display = "none"; return; }
    if (!tp) { tp = document.createElement("div"); tp.className = "tl-tip"; tp.setAttribute("data-no-export", "1"); document.body.appendChild(tp); }
    tp.innerHTML = html; tp.style.display = "block";
    const w = tp.offsetWidth, x = e.clientX + 14 + w > innerWidth ? e.clientX - w - 14 : e.clientX + 14;
    tp.style.left = x + "px"; tp.style.top = Math.max(8, e.clientY - 12) + "px";
  }

  async function render(){
    const my = ++gen;
    try {
      if (!titles) { const all = await getHistory(), hasT = all.some(x => Number(x[F.chatPk]) === 0); titles = [...new Set((hasT ? all.filter(x => Number(x[F.chatPk]) !== 0) : all).map(x => x[F.chat]).filter(Boolean))].sort((a, c) => a.localeCompare(c, "ru")); }
      D = await prep(chat); if (my !== gen) return;
      if (!D) { card.innerHTML = '<p class="tl-hint">' + T("Нет данных для таймлайна.") + '</p>'; return; }
      const opts = `<option value="">${T("Все чаты")}</option>` + titles.map(t => `<option value="${esc(t)}"${t === chat ? " selected" : ""}>${esc(t)}</option>`).join("");
      card.innerHTML = ""; const box = document.createElement("div"); card.appendChild(box);
      brushCard(box, opts, c => { chat = c; render(); });
    } catch (err) { card.innerHTML = '<p class="tl-hint">' + T("Не удалось загрузить таймлайн: ") + esc(err && err.message || err) + '</p>'; }
  }
  /* Таймлайн — один из видов графика: выбирается в списке «Вид графика» */
  const typeSel = document.getElementById("c-type");
  let started = false;
  const check = () => {
    const on = !!typeSel && typeSel.value === "timeline";
    tab.classList.toggle("tl-on", on);
    const q = document.getElementById("c-quick"); if (q) { if (on) q.style.setProperty("display", "none", "important"); else q.style.removeProperty("display"); }
    if (on && tab.classList.contains("active") && !started) { started = true; render(); }
  };
  new MutationObserver(check).observe(tab, {attributes:true, attributeFilter:["class"]});
  typeSel && typeSel.addEventListener("change", check); check();
  document.getElementById("refresh")?.addEventListener("click", () => { if (started) setTimeout(() => { titles = null; render(); }, 600); });
})();
