
/* ===================== Смайлы в стиле iOS =====================
   Картинки Apple-эмодзи из пакета emoji-datasource-apple (jsdelivr). Используются в фоновых частицах
   и в реакциях. Нет сети или картинки — остаётся обычный системный смайл. */
(() => {
  const CDN = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/";
  const RE = /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
  // Имена файлов: коды символов через дефис; у части смайлов нужен или не нужен вариант-селектор FE0F.
  function variants(e){
    const cps = [...e].map(c => c.codePointAt(0).toString(16));
    const full = cps.join("-"), bare = cps.filter(h => h !== "fe0f").join("-"), out = [full, bare];
    const withSel = []; cps.filter(h => h !== "fe0f").forEach((h, i, a) => { withSel.push(h); if (parseInt(h, 16) < 0x3000 && h !== "200d" && (a[i + 1] === "200d" || i === a.length - 1)) withSel.push("fe0f"); });
    out.push(withSel.join("-"));
    return [...new Set(out)];
  }
  const imgs = new Map(), listeners = new Set();
  // Картинка для холста: загружается один раз; пока не готова — null.
  function img(e){
    let r = imgs.get(e);
    if (!r) {
      const v = variants(e); r = {el:new Image(), i:0, ok:false, dead:false};
      r.el.crossOrigin = "anonymous"; r.el.decoding = "async";
      r.el.onload = () => { r.ok = true; listeners.forEach(f => { try { f(e); } catch (err) {} }); };
      r.el.onerror = () => { if (++r.i < v.length) r.el.src = CDN + v[r.i] + ".png"; else r.dead = true; };
      r.el.src = CDN + v[0] + ".png"; imgs.set(e, r);
    }
    return r.ok ? r.el : null;
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  // Разметка для страницы: <img> с запасными именами файлов и возвратом к тексту при неудаче.
  function html(e){
    const v = variants(e);
    return `<img class="ios-emo" alt="${esc(e)}" draggable="false" crossorigin="anonymous" src="${CDN + v[0]}.png" data-v="${v.join(",")}" data-vi="0" onerror="__iosEmoji.fail(this)">`;
  }
  function fail(el){
    const v = (el.dataset.v || "").split(","), i = Number(el.dataset.vi || 0) + 1;
    if (i < v.length) { el.dataset.vi = String(i); el.src = CDN + v[i] + ".png"; }
    else el.replaceWith(document.createTextNode(el.alt));
  }
  // Замена смайлов в текстовых узлах внутри блока (поля ввода, списки и SVG не трогаются).
  const SKIP = "script,style,textarea,input,select,option,svg,.ios-emo,[data-no-emo]";
  function apply(root){
    if (!root || root.nodeType !== 1) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode:n => { RE.lastIndex = 0; return n.parentElement && !n.parentElement.closest(SKIP) && RE.test(n.nodeValue) ? 1 : 2; }});
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(n => {
      const t = n.nodeValue, frag = document.createDocumentFragment(); let last = 0; RE.lastIndex = 0; let m;
      while ((m = RE.exec(t))) {
        if (m.index > last) frag.append(t.slice(last, m.index));
        const tpl = document.createElement("template"); tpl.innerHTML = html(m[0]); frag.append(tpl.content);
        last = m.index + m[0].length;
      }
      if (last < t.length) frag.append(t.slice(last));
      n.replaceWith(frag);
    });
  }
  window.__iosEmoji = {img, html, fail, apply, onLoad:f => listeners.add(f), variants};
  // Блоки с реакциями: вкладка «Реакции», реакции в профиле, «Любимая реакция» в таблицах.
  const SCOPES = "#re-out, .rx-emo-scope";
  let q = new Set(), raf = 0;
  new MutationObserver(ms => {
    ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 3) n = n.parentElement; if (!n || n.nodeType !== 1) return;
      const s = n.closest(SCOPES); if (s) q.add(s); else n.querySelectorAll?.(SCOPES).forEach(x => q.add(x));
    }));
    if (q.size && !raf) raf = requestAnimationFrame(() => { raf = 0; const l = [...q]; q = new Set(); l.forEach(apply); });
  }).observe(document.documentElement, {childList:true, subtree:true});
})();
