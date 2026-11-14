
(() => {
  const KEY = "chatstats.tablo.v1", on = !!window.__TABLO;
  document.body.classList.toggle("tablo", on);
  if (on && !document.getElementById("tablo-font")) {
    const l = document.createElement("link"); l.id = "tablo-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap"; document.head.appendChild(l);
  }
  // Переключатель в «Настройки → Оформление» — над «Стилем «Колония»
  const anchor = document.getElementById("theme-grid");
  if (anchor && !document.getElementById("set-tablo")) {
    const box = document.createElement("div"); box.className = "filters";
    box.innerHTML = `<label class="checkline" title="Тихий графит и один акцент, цифры как на табло, цвет только у участников и медалей. Эффекты в этом стиле выключены. Страница перезагрузится"><input type="checkbox" id="set-tablo"${on ? " checked" : ""}>Стиль «Табло»</label><span class="hint">Графит, один акцент, цифры как на табло. Частицы, рамки, блеск, неон и стекло в этом стиле выключены</span>`;
    anchor.after(box);
    box.querySelector("input").addEventListener("change", e => { try { localStorage.setItem(KEY, e.target.checked ? "1" : "0"); } catch (err) {} location.reload(); });
  }
  if (!on) return;
  // Пометка в «Эффектах»: в этом стиле они не показываются
  const fxH = [...document.querySelectorAll("#tab-settings h2")].find(h => h.textContent.trim() === "Эффекты");
  if (fxH && !document.querySelector(".set-tablo-note")) { const n = document.createElement("p"); n.className = "set-tablo-note hint"; n.textContent = "В стиле «Табло» эффекты не показываются. Чтобы они заработали, сними «Стиль «Табло»» в «Оформлении»"; fxH.after(n); }

  /* ---------- Эмодзи → линейные иконки или ничего ---------- */
  const EMO = /(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{2B05}\u{27A1}\u{23F0}-\u{23FA}\u{231A}\u{231B}\u{2194}-\u{21AA}]\u{FE0F}?(?:\u{200D}[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\u{FE0F}?)*)/gu;
  const KEEP = new Set(["✓", "✕", "★", "⚖", "↑", "↓", "→", "←", "↔", "↕"]); // типографские знаки — не эмодзи
  const ico = d => `<svg class="tb-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    "⚙":'<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    "🔔":'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    "🔕":'<path d="M8.7 3A6 6 0 0 1 18 8a21 21 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.7 4.7 0 0 1 .3-2"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
    "⬇":'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "⬆":'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    "📅":'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "🗓":'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "📆":'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "🔍":'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "📋":'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    "🔗":'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    "📲":'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    "📱":'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    "💾":'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    "🔑":'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    "🎬":'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8z"/>',
    "📸":'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    "🔃":'<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    "📤":'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    "👁":'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "🖼":'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    "📊":'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    "📈":'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  };
  const base = e => e.replace(/\u{FE0F}/gu, "");
  const ICON_PARENT = "button,summary,a,.mini,.chip,[role=button]";
  // Содержимое (данные), где эмодзи — это смысл: реакции, ячейки таблиц, подписи на графиках
  const isData = (node, txt) => {
    const p = node.parentElement; if (!p) return true;
    if (p.closest("script,style,textarea,input,select,[contenteditable],[data-keep-emoji],#tab-reactions td,#tab-reactions .rx-emo,.rx-emo,.rx-top,.emo,.lr-emo")) return true;
    const only = !txt.replace(EMO, "").trim();
    if (only && p.closest("td:not([colspan]),svg,.tile .num,.hub-kpi .v,.p-stat b,option")) return true;
    return false;
  };
  function fixNode(n){
    const t = n.nodeValue; if (!t || !EMO.test(t)) { EMO.lastIndex = 0; return; } EMO.lastIndex = 0;
    if (isData(n, t)) return;
    const p = n.parentElement;
    const only = !t.replace(EMO, "").trim();
    if (only) {
      const host = p.closest(ICON_PARENT);
      const m = t.match(EMO) || [], k = base(m[0] || "");
      if (host && ICONS[k] && (host.textContent.replace(EMO, "").trim() || host.childElementCount === 0 || true)) {
        const span = document.createElement("span"); span.className = "tb-ico-wrap"; span.innerHTML = ico(ICONS[k]);
        n.replaceWith(span); return;
      }
      if (host && !host.textContent.replace(EMO, "").trim()) return; // кнопка только из эмодзи без иконки — оставляем, иначе пустая
      n.nodeValue = ""; return;
    }
    const out = t.replace(EMO, m => KEEP.has(base(m)) ? m : (base(m) === "❤" ? "♥︎" : "")).replace(/\s{2,}/g, " ").replace(/^\s+(?=\S)/, s0 => /^\s/.test(t) && !/^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t) ? " " : "");
    if (out !== t) n.nodeValue = out;
  }
  function walk(root){
    if (!root) return;
    if (root.nodeType === 3) { fixNode(root); return; }
    if (root.nodeType !== 1 || root.closest?.("script,style,svg.tb-ico")) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = []; let n;
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(fixNode);
  }
  let q = new Set(), raf = 0;
  // Подпись «Табло»: крупные числа — моноширинные, как на табло (только если внутри действительно число)
  const NUMSEL = ".tile .num,.hub-kpi .v,.p-stat b,.cmp-total,.dm-grand,.ach-hstat b";
  const markNums = root => { if (!root || root.nodeType !== 1) root = root?.parentElement; if (!root) return; const els = root.matches?.(NUMSEL) ? [root] : []; root.querySelectorAll?.(NUMSEL).forEach(e => els.push(e)); const up = root.closest?.(NUMSEL); if (up) els.push(up); els.forEach(e => { const t = e.textContent.trim(); const num = /^[−\-+]?[\d\s .,:%/KM×—–-]+$/.test(t) && /\d/.test(t); if (num) e.setAttribute("data-tb-num", ""); else e.removeAttribute("data-tb-num"); }); };
  const flush = () => { raf = 0; const items = [...q]; q.clear(); items.forEach(walk); items.forEach(markNums); };
  new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") q.add(m.target); else m.addedNodes.forEach(a => q.add(a)); } if (!raf) raf = requestAnimationFrame(flush); })
    .observe(document.body, {childList:true, subtree:true, characterData:true});
  walk(document.body); markNums(document.body);
})();
