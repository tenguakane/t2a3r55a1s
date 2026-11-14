
/* Десятичные дроби на сайте — всегда с точкой */
(function(){
  const base = Number.prototype.toLocaleString;
  // Форматтеры запоминаются: создавать новый на каждое число — самое медленное место при выводе больших таблиц.
  const NF = new Map();
  Number.prototype.toLocaleString = function(loc, opt){
    let r;
    if (loc === undefined || typeof loc === "string") {
      const k = (loc || "") + "|" + (opt === undefined ? "" : JSON.stringify(opt));
      let f = NF.get(k);
      if (!f) { try { f = new Intl.NumberFormat(loc, opt); } catch (e) { f = null; } NF.set(k, f); }
      r = f ? f.format(this) : base.call(this, loc, opt);
    } else r = base.call(this, loc, opt);
    return typeof r === "string" && (loc === undefined || /^ru/i.test(String(loc))) ? r.replace(/(\d),(?=\d)/g, "$1.") : r;
  };
})();
