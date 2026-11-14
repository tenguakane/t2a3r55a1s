
/* Рамка таблицы следует за прокруткой своей обёртки (иначе она уезжает вместе с содержимым) */
document.addEventListener("scroll", e => {
  const w = e.target; if (!w || !w.classList || !w.classList.contains("wrap")) return;
  w.style.setProperty("--wrap-sl", w.scrollLeft + "px"); w.style.setProperty("--wrap-st", w.scrollTop + "px");
  // Пока таблицу не листали вбок, закреплённые столбцы остаются стеклянными; при прокрутке — плотными, чтобы числа не просвечивали.
  w.classList.toggle("sx", w.scrollLeft > 2);
}, {capture:true, passive:true});
