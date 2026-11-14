
/* Версия сайта и проверка обновлений на GitHub */
(function(){
  const APP_VERSION = (window.CHANGELOG && CHANGELOG[0] && CHANGELOG[0].v) || "2026.10.22-3", APP_BUILT = (window.CHANGELOG && CHANGELOG[0] && CHANGELOG[0].date) || "2026-10-22";
  const LOADED = Date.now(), KEY = "chatstats.ghcommit.v1";
  const $ = id => document.getElementById(id);
  const isGh = /\.github\.io$/i.test(location.hostname);
  const owner = location.hostname.split(".")[0], repo = location.pathname.split("/").filter(Boolean)[0] || (owner + ".github.io");
  const fmtD = d => d.toLocaleString("ru-RU", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
  async function latest(force){
    if (!isGh) return null;
    try { const c = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (c && !force && Date.now() - c.t < 600000) return c.v; } catch (e) {}
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {headers:{Accept:"application/vnd.github+json"}});
    if (!r.ok) throw new Error("GitHub ответил " + r.status);
    const j = (await r.json())[0]; if (!j) throw new Error("нет коммитов");
    const v = {sha:String(j.sha).slice(0, 7), date:j.commit.committer.date, msg:String(j.commit.message || "").split("\n")[0].slice(0, 90)};
    try { sessionStorage.setItem(KEY, JSON.stringify({t:Date.now(), v})); } catch (e) {}
    return v;
  }
  async function refresh(force){
    const base = `Версия ${APP_VERSION}`, lines = [`<b>${base}</b> · сборка от ${APP_BUILT.split("-").reverse().join(".")}`];
    let newer = false, text = base;
    if (isGh) {
      try {
        const v = await latest(force), d = new Date(v.date);
        lines.push(`На GitHub обновлено: <b>${fmtD(d)}</b> · <code>${v.sha}</code>${v.msg ? " · " + v.msg.replace(/</g, "&lt;") : ""}`);
        if (d.getTime() > LOADED + 60000) { newer = true; lines.push("<b style='color:#ffd166'>Вышла новая версия — обновите страницу.</b>"); text += " · есть обновление"; if ($("app-ver")) $("app-ver").title = `На GitHub обновлено: ${fmtD(d)}`; }
      } catch (e) { lines.push("GitHub недоступен: " + String(e.message || e).replace(/</g, "&lt;")); }
    } else lines.push("Страница открыта не с GitHub Pages — сравнение с репозиторием недоступно.");
    if ($("about-lines")) $("about-lines").innerHTML = lines.join("<br>");
    if ($("app-ver-text")) $("app-ver-text").textContent = text;
    if ($("app-ver")) $("app-ver").classList.toggle("new", newer);
    if ($("app-ver-reload")) $("app-ver-reload").hidden = !newer;
  }
  const hardReload = () => { try { sessionStorage.removeItem(KEY); } catch (e) {} const u = new URL(location.href); u.searchParams.set("v", Date.now()); location.replace(u.toString()); };
  $("app-ver-reload") && $("app-ver-reload").addEventListener("click", hardReload);
  $("about-check") && $("about-check").addEventListener("click", () => { $("about-lines").textContent = "Проверяю…"; refresh(true); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(false); });
  window.__appVersion = APP_VERSION;
  refresh(false);
})();
