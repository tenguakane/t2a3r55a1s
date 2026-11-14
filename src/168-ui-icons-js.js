
/* Эмодзи в интерфейсе → нарисованные иконки (линия 1.8, как у остальных значков).
   Не трогаем: реакции (их рисует движок iOS-эмодзи), имена участников и названия чатов, поля ввода.
   В списках и выпадающих меню иконку вставить нельзя — там эмодзи просто убираются.
   Эмодзи остаётся в DOM скрытым текстом, чтобы код, читающий textContent, и экспорт таблиц работали как раньше. */
(function(){
  "use strict";
  const LI = window.__lineIcon; if (!LI || !LI.name) return;
  const EMO = /❚❚|(?:\p{Extended_Pictographic}|[🅥★✓✕✖])️?(?:‍\p{Extended_Pictographic}️?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu;
  const EMO1 = new RegExp(EMO.source, "u");
  const DOTS = {"🟡":"#e8b84a", "🟠":"#ee8a3a", "🔴":"#e5484d", "🟢":"#3fb37f", "🔵":"#4c8dff"};
  const TINT = {"🔥":"#ff8a3d", "❤":"#ff5c7c", "💜":"#a78bfa", "💗":"#ff6fa0", "♥":"#ff5c7c", "⭐":"#f2b84b", "🌟":"#f2b84b", "★":"#f2b84b", "👑":"#f2b84b", "🏆":"#f2b84b", "🥇":"#f2b84b", "🏅":"#f2b84b", "💎":"#4fc3e8", "⚠":"#f0a93a", "✅":"#3fb37f", "❌":"#e5484d", "☀":"#f2b84b", "⚡":"#f2c94c", "🎉":"#f08ab4"};
  const SKIP = "script,style,textarea,input,svg,canvas,.ios-emo,#re-out,.rx-emo-scope,.ui-i,[contenteditable=true],[data-no-icons]";
  const ATTRS = ["title", "aria-label", "placeholder"];
  const strip = s => s.replace(EMO, "").replace(/ {2,}/g, " ");

  /* Имена участников и названия чатов с эмодзи остаются как есть */
  let prot = [], protN = -1;
  function protect(){
    try {
      if (typeof allRows === "undefined" || !allRows || allRows.length === protN) return;
      protN = allRows.length;
      const seen = new Set(), out = new Set();
      Object.values(NAMES).forEach(n => { if (EMO1.test(n)) out.add(n); });
      for (const r of allRows) for (const k of [F.name, F.chat]) { const v = r[k]; if (v && !seen.has(v)) { seen.add(v); if (EMO1.test(v)) out.add(v); } }
      prot = [...out];
    } catch (e) {}
  }
  const guarded = v => prot.length && prot.some(x => v.includes(x));

  function make(e){
    const key = e.replace(/️/g, "");
    if (DOTS[key]) { const d = document.createElement("span"); d.className = "ui-dot"; d.style.setProperty("--c", DOTS[key]); d.dataset.e = e; return d; }
    const name = LI.name(key); if (!name) return null;
    const s = LI.svg(name, TINT[key] || "currentColor"); if (!s) return null;
    const el = document.createElement("span"); el.className = "ui-i"; el.dataset.e = e;
    el.innerHTML = s + '<span class="ui-e">' + e + "</span>";
    return el;
  }
  function doText(n){
    const v = n.nodeValue; if (!v || !EMO1.test(v)) return;
    const p = n.parentElement; if (!p || p.closest(SKIP) || guarded(v)) return;
    if (p.closest("select,.msel")) { n.nodeValue = strip(v).replace(/^ +/, ""); return; }
    EMO.lastIndex = 0;
    const frag = document.createDocumentFragment(); let last = 0, any = false, m;
    while ((m = EMO.exec(v))) {
      const el = make(m[0]); if (!el) continue;
      any = true; if (m.index > last) frag.append(v.slice(last, m.index));
      frag.append(el); last = m.index + m[0].length;
    }
    if (!any) return;
    if (last < v.length) frag.append(v.slice(last));
    p.replaceChild(frag, n);
  }
  function doAttrs(el){
    if (!el.getAttribute || el.tagName === "IMG" || el.closest(".ios-emo,#re-out,.rx-emo-scope")) return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && EMO1.test(v) && !guarded(v)) el.setAttribute(a, strip(v).trim()); }
  }
  function walk(root){
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) { if (/^(SCRIPT|STYLE)$/.test(root.tagName)) return; doAttrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const todo = []; let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) { if (EMO1.test(n.nodeValue)) todo.push(n); } else if (n.hasAttribute && (n.hasAttribute("title") || n.hasAttribute("aria-label") || n.hasAttribute("placeholder"))) doAttrs(n); }
    todo.forEach(doText);
  }
  let queue = new Set(), raf = 0;
  const flush = () => { raf = 0; protect(); const q = queue; queue = new Set(); q.forEach(n => { if (n.isConnected) walk(n); }); };
  const push = n => { queue.add(n); if (!raf) raf = requestAnimationFrame(flush); };
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "characterData") { if (EMO1.test(m.target.nodeValue || "")) push(m.target); continue; }
      if (m.type === "attributes") { push(m.target); continue; }
      m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList && (n.classList.contains("ui-i") || n.classList.contains("ui-dot"))) return; push(n); });
    }
  }).observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATTRS});
  protect(); walk(document.body);
  window.__uiIcons = {run:() => { protect(); walk(document.body); }};
})();
