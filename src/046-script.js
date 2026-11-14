
/* ===================== Экспериментально: вкладки слева (только ПК) ===================== */
(function(){
  const KEY = "chatstats.sideNav.v1", KEY_C = "chatstats.sideNavCollapsed.v1";
  const nav = document.querySelector("nav"); if (!nav) return;
  const ICONS = {hub:"🧭", profile:"👤", stats:"📊", compare:"⚖️", daymatrix:"🗓️", charts:"📈", settings:"⚙️", records:"🏆", months:"🥇", days:"📆", forecast:"🔮",
    marathons:"🏁", time:"⏳", yearreview:"🎬", achievements:"🏅", chronicle:"📜", birthdays:"🎂", selfie:"📸", usermap:"🗺️", vk:"🅥"};
  const MAIN = ["hub", "profile", "stats", "compare", "daymatrix", "charts"];
  const OTHER = ["records", "months", "days", "forecast", "marathons", "time", "yearreview", "chronicle", "birthdays", "selfie", "usermap", "vk"];
  const btns = [...nav.querySelectorAll("button[data-tab]")];
  btns.forEach(b => {
    const tab = b.dataset.tab, grp = b.dataset.group;
    const label = b.textContent.trim();
    b.dataset.ic = ICONS[grp === "profile" ? "profile" : tab] || "•";
    if (!b.title) b.title = label;
    // Дубликаты для внутренних переходов и сама кнопка «Другое» в боковом режиме не показываются.
    const skip = grp === "other" || (b.classList.contains("nav-hidden") && (tab === "profile" || tab === "achievements"));
    b.classList.toggle("side-skip", skip);
    const ord = grp === "profile" ? MAIN.indexOf("profile") : MAIN.includes(tab) && !b.classList.contains("nav-hidden") ? MAIN.indexOf(tab) : OTHER.includes(tab) ? 20 + OTHER.indexOf(tab) : tab === "settings" ? 90 : 50;
    b.style.order = String(ord + 2);
  });
  const toggle = document.createElement("button");
  toggle.type = "button"; toggle.className = "side-toggle"; toggle.style.order = "0";
  toggle.innerHTML = `<span>Навигация</span><i aria-hidden="true"></i>`;
  const sep1 = document.createElement("div"); sep1.className = "side-sep"; sep1.textContent = "Другое"; sep1.style.order = "19";
  const sep2 = document.createElement("div"); sep2.className = "side-sep"; sep2.textContent = "Сервис"; sep2.style.order = "89";
  nav.prepend(toggle); nav.append(sep1, sep2);
  const PIN_ON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M15.5 3.2a1 1 0 0 1 1.4 0l3.9 3.9a1 1 0 0 1 0 1.4l-1.6 1.6a1 1 0 0 1-1.1.2l-.9-.4-3.2 3.2.3 2.4a1 1 0 0 1-.3.8l-1 1a1 1 0 0 1-1.4 0L8.4 14.1 4.7 17.8a.9.9 0 0 1-1.3-1.3l3.7-3.7-3.2-3.2a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 .8-.3l2.4.3 3.2-3.2-.4-.9a1 1 0 0 1 .2-1.1z"/></svg>`;
  const PIN_OFF = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M15.5 3.2a1 1 0 0 1 1.4 0l3.9 3.9a1 1 0 0 1 0 1.4l-1.6 1.6a1 1 0 0 1-1.1.2l-.9-.4-3.2 3.2.3 2.4a1 1 0 0 1-.3.8l-1 1a1 1 0 0 1-1.4 0L8.4 14.1 4.7 17.8M7.1 12.8l-3.2-3.2a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 .8-.3l2.4.3 3.2-3.2-.4-.9a1 1 0 0 1 .2-1.1z"/></svg>`;
  const isOn = () => document.body.classList.contains("side-nav");
  function sync(){
    if (!isOn()) return;
    const act = nav.querySelector("button.active[data-tab]");
    let target = act;
    if (act && act.dataset.group === "other") target = nav.querySelector(`button.nav-hidden[data-tab="${act.dataset.tab}"]`) || act;
    nav.querySelectorAll("button[data-tab]").forEach(b => { const on = b === target; if (b.classList.contains("side-active") !== on) b.classList.toggle("side-active", on); });
  }
  function apply(on, collapsed){
    document.body.classList.toggle("side-nav", on);
    document.body.classList.toggle("side-collapsed", on && collapsed);
    // Закреплена — панель всегда открыта и сдвигает страницу; не закреплена — узкая полоска иконок, выезжает при наведении.
    toggle.querySelector("i").innerHTML = collapsed ? PIN_OFF : PIN_ON;
    toggle.title = collapsed ? "Закрепить панель открытой" : "Открепить: панель свернётся и будет выезжать при наведении";
    toggle.setAttribute("aria-pressed", collapsed ? "false" : "true");
    toggle.classList.toggle("pinned", !collapsed);
    const c = document.getElementById("exp-sidenav-icons"); if (c) c.checked = collapsed;
    sync();
    // Графики подстраиваются под ширину области: перерисуем при смене раскладки.
    setTimeout(() => { try { window.dispatchEvent(new Event("resize")); } catch (e) {} }, 250);
  }
  let on = false, collapsed = false;
  // Вкладки слева на ПК включены всегда; запоминается только, свёрнута ли панель.
  on = true;
  try { collapsed = localStorage.getItem(KEY_C) === "1"; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, "1"); localStorage.setItem(KEY_C, collapsed ? "1" : "0"); } catch (e) {} };
  toggle.addEventListener("click", e => { e.stopPropagation(); collapsed = !collapsed; save(); apply(on, collapsed); });
  document.getElementById("exp-sidenav-icons")?.addEventListener("change", e => { collapsed = e.target.checked; save(); apply(on, collapsed); });
  new MutationObserver(() => sync()).observe(nav, {subtree:true, attributes:true, attributeFilter:["class", "data-tab"]});
  apply(on, collapsed);
})();
