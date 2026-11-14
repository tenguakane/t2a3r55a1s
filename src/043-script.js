
(function(){
  const K = "chatstats.apiBase.v1", inp = document.getElementById("api-base"); if (!inp) return;
  let cur = ""; try { cur = localStorage.getItem(K) || ""; } catch (e) {}
  inp.value = cur;
  document.getElementById("api-base-now").textContent = "Сейчас: " + CONFIG.BASE_URL;
  document.getElementById("api-base-save").addEventListener("click", () => {
    let v = inp.value.trim();
    if (v && !/^https?:\/\//i.test(v)) v = "http://" + v;
    try { v ? localStorage.setItem(K, v.replace(/\/+$/, "")) : localStorage.removeItem(K); } catch (e) {}
    location.reload();
  });
})();
