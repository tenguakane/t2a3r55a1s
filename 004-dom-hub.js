
/* Единый наблюдатель за страницей. Раньше каждый модуль ставил свой MutationObserver на весь документ (их было около тридцати),
   и каждый просыпался на любое изменение — например, на каждый кадр гонки марафона. Теперь наблюдатель один:
   он отбрасывает «шум» (анимацию внутри графиков) и раздаёт остальное подписчикам.
   Подписка: new MutationObserver(cb).__hub(корень)  или  window.__dom.watch(cb, корень). */
(function(){
  "use strict";
  var Native = window.MutationObserver; if (!Native) return;
  var subs = [], started = false;
  function noise(r){
    var t = r.target; if (!t || t.nodeType !== 1 || !t.ownerSVGElement) return false;
    var n = t.tagName; return n === "text" || n === "tspan" || !!(t.closest && t.closest(".race-row"));
  }
  var real = new Native(function(recs){
    if (!subs.length) return;
    var clean = null;
    for (var i = 0; i < recs.length; i++) { if (noise(recs[i])) { if (!clean) clean = recs.slice(0, i); } else if (clean) clean.push(recs[i]); }
    if (clean) recs = clean;
    if (!recs.length) return;
    var list = subs.slice();
    for (var k = 0; k < list.length; k++) {
      var s = list[k], root = s.root, mine = recs;
      if (root && root !== document.body && root !== document.documentElement) { mine = recs.filter(function(r){ return root.contains(r.target); }); if (!mine.length) continue; }
      try { s.fn(mine, s.owner); } catch (e) { setTimeout(function(){ throw e; }, 0); }
    }
  });
  function start(){ if (!started) { started = true; real.observe(document.documentElement, {childList:true, subtree:true}); } }
  function watch(fn, root, owner){ var s = {fn: fn, root: root || null, owner: owner || null}; subs.push(s); start(); return function(){ var i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; }
  function Hubbed(cb){ var o = new Native(cb); o.__cb = cb; return o; }
  Hubbed.prototype = Native.prototype;
  Native.prototype.__hub = function(root){ var self = this; if (!self.__cb || !root) return; if (self.__off) self.__off(); self.__off = watch(self.__cb, root, self); };
  var disc = Native.prototype.disconnect;
  Native.prototype.disconnect = function(){ if (this.__off) { this.__off(); this.__off = null; } return disc.call(this); };
  window.MutationObserver = Hubbed;
  window.__dom = {watch: watch, count: function(){ return subs.length; }};
})();
