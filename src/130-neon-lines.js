
/* ===================== Эксперимент: неоновые линии =====================
   Все линейные графики сайта: тонкая светлая сердцевина, цветное свечение вокруг,
   линия проявляется из прозрачности в начале и ярко светится на конце (точка или наконечник).
   Пунктирные линии (сравнение, прогноз) — тоже светятся, но тише. Выключается в «Настройки → Эффекты». */
window.NEON_ON = (() => { if (window.__TABLO) return false; try { return localStorage.getItem("chatstats.neonLines.v1") === "1"; } catch (e) { return false; } })();
(() => {
  const NS = "http://www.w3.org/2000/svg";
  let uid = 0;
  const SEL = ":is(path,polyline).anim-line, path[data-neon], path[data-nl]";
  function defsOf(svg){ let d = svg.querySelector(":scope > defs"); if (!d) { d = document.createElementNS(NS, "defs"); svg.prepend(d); } return d; }
  function filters(svg){
    if (svg.__neonF) return svg.__neonF;
    const d = defsOf(svg), id = "nf" + (++uid);
    const f = document.createElementNS(NS, "filter");
    f.id = id; f.setAttribute("x", "-30%"); f.setAttribute("y", "-60%"); f.setAttribute("width", "160%"); f.setAttribute("height", "220%");
    f.innerHTML = '<feGaussianBlur stdDeviation="6"/>';
    const f2 = document.createElementNS(NS, "filter");
    f2.id = id + "s"; f2.setAttribute("x", "-30%"); f2.setAttribute("y", "-60%"); f2.setAttribute("width", "160%"); f2.setAttribute("height", "220%");
    f2.innerHTML = '<feGaussianBlur stdDeviation="2"/>';
    d.append(f, f2);
    return svg.__neonF = {wide:id, soft:id + "s"};
  }
  function colorOf(el){
    const st = el.getAttribute("stroke") || "";
    if (/^url\(/.test(st)) { const g = el.ownerSVGElement?.querySelector(st.slice(4, -1).replace(/["']/g, "")); const stops = g ? [...g.querySelectorAll("stop")] : []; return stops.length ? stops[stops.length - 1].getAttribute("stop-color") : "#7aa2f7"; }
    return st || "#7aa2f7";
  }
  function apply(svg){
    const els = [...svg.querySelectorAll(SEL)].filter(el => !el.dataset.neonDone && !el.closest("defs, [data-no-export]") && el.getAttribute("fill") !== el.getAttribute("stroke"));
    if (!els.length) return;
    const F = filters(svg), D = defsOf(svg);
    els.forEach(el => {
      let bb; try { bb = el.getBBox(); } catch (e) { return; }
      if (!bb || bb.width < 8) return; // график ещё скрыт — обработаем, когда станет видимым
      el.dataset.neonDone = "1";
      const dash = el.getAttribute("stroke-dasharray"), c = colorOf(el), w = Math.max(1.2, Math.min(3, (Number(el.getAttribute("stroke-width")) || 2) * .55));
      const op = Number(el.getAttribute("stroke-opacity") || 1);
      // проявление из прозрачности слева направо
      const mid = "nm" + (++uid), gid = mid + "g";
      const lg = document.createElementNS(NS, "linearGradient");
      lg.id = gid; lg.setAttribute("gradientUnits", "userSpaceOnUse");
      lg.setAttribute("x1", bb.x); lg.setAttribute("x2", bb.x + bb.width); lg.setAttribute("y1", 0); lg.setAttribute("y2", 0);
      lg.innerHTML = '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".28" stop-color="#fff" stop-opacity=".55"/><stop offset=".75" stop-color="#fff" stop-opacity="1"/>';
      const mk = document.createElementNS(NS, "mask");
      mk.id = mid; mk.setAttribute("maskUnits", "userSpaceOnUse"); mk.setAttribute("x", bb.x - 40); mk.setAttribute("y", bb.y - 40); mk.setAttribute("width", bb.width + 80); mk.setAttribute("height", bb.height + 80);
      mk.innerHTML = `<rect x="${bb.x - 40}" y="${bb.y - 40}" width="${bb.width + 80}" height="${bb.height + 80}" fill="url(#${gid})"/>`;
      D.append(lg, mk);
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "neon-l"); g.setAttribute("mask", `url(#${mid})`);
      for (const a of ["data-n", "data-ek", "style"]) if (el.hasAttribute(a)) g.setAttribute(a, el.getAttribute(a));
      const layer = (stroke, width, opacity, filter) => {
        const l = el.cloneNode(false);
        ["class", "data-n", "data-ek", "style", "data-neon", "data-neon-c", "data-nl", "pathLength"].forEach(a => l.removeAttribute(a));
        l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", width); l.setAttribute("stroke-opacity", (opacity * op).toFixed(2)); l.setAttribute("fill", "none");
        l.setAttribute("stroke-linecap", "round"); l.setAttribute("stroke-linejoin", "round");
        if (filter) l.setAttribute("filter", `url(#${filter})`);
        if (dash) l.setAttribute("stroke-dasharray", dash);
        return l;
      };
      g.append(layer(c, w * 5, dash ? .35 : .55, F.wide), layer(c, w * 2.2, dash ? .5 : .85, F.soft), layer(c, w * 1.3, 1), layer(`color-mix(in srgb, ${c} 35%, #ffffff)`, Math.max(.8, w * .55), dash ? .6 : .95));
      el.style.display = "none";
      el.after(g);
      // яркий конец линии
      if (!dash) {
        let L = 0; try { L = el.getTotalLength(); } catch (e) {}
        if (L > 0) {
          const pt = el.getPointAtLength(L), dot = document.createElementNS(NS, "g");
          dot.setAttribute("class", "neon-tip"); for (const a of ["data-n"]) if (el.hasAttribute(a)) dot.setAttribute(a, el.getAttribute(a));
          dot.innerHTML = `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(w * 4).toFixed(1)}" fill="${c}" opacity=".5" filter="url(#${F.wide})"/><circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(w * 1.6).toFixed(1)}" fill="color-mix(in srgb, ${c} 30%, #ffffff)"/>`;
          g.after(dot);
        }
      }
    });
    svg.querySelectorAll("polygon[data-neon-head]:not([data-neon-done])").forEach(h => { h.dataset.neonDone = "1"; h.setAttribute("filter", `url(#${F.soft})`); });
    svg.classList.add("neon-on");
  }
  // «Динамика» и «По годам» во вкладке «Графики» остаются обычными
  const skip = svg => svg.closest("#c-out") && typeof cType !== "undefined" && (cType === "trend" || cType === "years");
  const scan = () => { if (!window.NEON_ON) return; document.querySelectorAll("main svg").forEach(svg => { if (!skip(svg) && svg.querySelector(SEL)) apply(svg); }); };
  let raf = 0; const later = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setTimeout(scan, 30); }); };
  new MutationObserver(later).observe(document.querySelector("main"), {childList:true, subtree:true, attributes:true, attributeFilter:["open", "hidden", "class"]});
  addEventListener("scroll", later, {passive:true});
  const rerender = () => {
    try { renderCharts(); } catch (e) {}
    const t = document.querySelector("main > section.tab.active")?.id;
    try { if (t === "tab-profile") renderProfile(); if (t === "tab-compare") renderCompare(); if (t === "tab-yearreview") renderYearReviewSync(); if (t === "tab-forecast" && typeof loadForecast === "function") loadForecast(); } catch (e) {}
  };
  const cb = document.getElementById("set-neon");
  if (cb) { cb.checked = window.NEON_ON; cb.addEventListener("change", () => { window.NEON_ON = cb.checked; try { localStorage.setItem("chatstats.neonLines.v1", cb.checked ? "1" : "0"); } catch (e) {} rerender(); }); }
  later();
})();
