
/* Переливающийся текст у победителей: включается в Настройках → «Эффекты» */
(function(){
  const KEY = "chatstats.holoText.v1";
  let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (e) {}
  const apply = () => { document.body.classList.toggle("holo-text-on", on && !window.__TABLO); const c = document.getElementById("set-holo-text"); if (c) c.checked = on; };
  document.addEventListener("change", e => { if (e.target.id === "set-holo-text") { on = e.target.checked; try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (err) {} apply(); } });
  apply();
})();
