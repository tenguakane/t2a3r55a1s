
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-es-reset]"); if (!b) return;
  const mob = document.getElementById("ma-freset");
  if (mob && mob.offsetParent) { mob.click(); return; }
  const none = document.getElementById("p-none"); if (none) none.click();
  const q = document.querySelector("#c-quick .quick-chip.active"); if (q) q.click();
});
