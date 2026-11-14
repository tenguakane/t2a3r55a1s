
(function(){
  "use strict";
  /* ---------- Набор иконок: 24×24, линия 1.8, скруглённые концы ---------- */
  const P = {
    home:["M3 10.5 12 3l9 7.5","M5 9v11h5v-6h4v6h5V9"],
    react:["M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z","M19.5 2.5v3","M18 4h3"],
    levelup:["M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z","M8.5 12.5 12 9l3.5 3.5","M8.5 16.5 12 13l3.5 3.5"],
    tops:["M8 21h8","M12 17v4","M7 4h10v5a5 5 0 0 1-10 0z","M10.5 8.5 12 7v5"],
    compass:["c:12 12 9","M15.5 8.5 13.3 13.3 8.5 15.5 10.7 10.7z"],
    user:["c:12 8 4","M4 21c.8-3.9 4.2-6.5 8-6.5s7.2 2.6 8 6.5"],
    users:["c:9 8 3.5","M2.5 20c.6-3.4 3.3-5.6 6.5-5.6s5.9 2.2 6.5 5.6","M16 4.6a3.5 3.5 0 0 1 0 6.8","M18.4 14.6c1.7.7 2.8 2.6 3.1 5.4"],
    bars:["M3 20h18","M6 20v-8","M12 20V5","M18 20v-5"],
    trend:["M3 17l6-6 4 4 8-8","M15 7h6v6"],
    scale:["M12 3v17","M7 20h10","M5 7h14","M5 7l-3 7a3.2 3.2 0 0 0 6 0z","M19 7l-3 7a3.2 3.2 0 0 0 6 0z"],
    grid:["r:3 3 18 18 3","M3 9h18","M3 15h18","M9 3v18","M15 3v18"],
    calendar:["r:3 5 18 16 2.5","M3 10h18","M8 3v4","M16 3v4"],
    caldays:["r:3 5 18 16 2.5","M3 10h18","M8 3v4","M16 3v4","M8 14h.01","M12 14h.01","M16 14h.01","M8 17.5h.01","M12 17.5h.01"],
    gear:["c:12 12 3","M12 2.5v2.6","M12 18.9v2.6","M21.5 12h-2.6","M5.1 12H2.5","M18.7 5.3l-1.8 1.8","M7.1 16.9l-1.8 1.8","M18.7 18.7l-1.8-1.8","M7.1 7.1 5.3 5.3","c:12 12 6.9"],
    trophy:["M8 4h8v5.5a4 4 0 0 1-8 0z","M8 6H5a3 3 0 0 0 3.2 4","M16 6h3a3 3 0 0 1-3.2 4","M12 13.5V17","M8 21h8","M9.5 17h5v4h-5z"],
    medal:["M7.5 3 10 9.5","M16.5 3 14 9.5","c:12 15 5.5","M12 12.6v4.8"],
    sparkles:["M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1l-1.7-4.6-4.6-1.7 4.6-1.7z","M18.5 14.5l.8 2.1 2.2.9-2.2.8-.8 2.2-.9-2.2-2.1-.8 2.1-.9z"],
    flag:["M5 21V4","M5 4h12.5l-2.3 4 2.3 4H5"],
    hourglass:["M6.5 3h11","M6.5 21h11","M8 3v3.3a4 4 0 0 0 1.4 3L12 12l2.6-2.7a4 4 0 0 0 1.4-3V3","M8 21v-3.3a4 4 0 0 1 1.4-3L12 12l2.6 2.7a4 4 0 0 1 1.4 3V21"],
    film:["r:3 7 18 14 2.5","M3 11h18","M7.5 7l2 4","M12.5 7l2 4","M17.5 7l2 4"],
    list:["M9 6h12","M9 12h12","M9 18h12","M4 6h.01","M4 12h.01","M4 18h.01"],
    cake:["M4 21h16","M5.5 21v-7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v7","M5.5 16.2c1.3.9 2.6.9 3.9 0s2.6-.9 3.9 0 2.6.9 3.9 0","M12 12V8.5","M12 6.2c-.9-.6-.9-1.8 0-3 .9 1.2.9 2.4 0 3z"],
    camera:["r:3 7 18 13 2.5","M8.5 7l1.6-3h3.8l1.6 3","c:12 13.5 3.6"],
    map:["M9 4 3 6.2v13.6L9 18l6 2 6-2.2V4.2L15 6z","M9 4v14","M15 6v14"],
    vk:["r:3 3 18 18 5","M8 8.5l4 8 4-8"],
    palette:["M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.6 0-1.3-1-1.6-1-2.7 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z","M7.5 11.5h.01","M10 7.5h.01","M14.5 7.5h.01"],
    phone:["r:7 2.5 10 19 2.5","M11 18h2"],
    sliders:["M4 6h9","M17 6h3","M4 12h3","M11 12h9","M4 18h11","M19 18h1","c:15 6 2","c:9 12 2","c:17 18 2"],
    database:["e:12 5.5 8 3","M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13","M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
    info:["c:12 12 9","M12 11v6","M12 7.6h.01"],
    flame:["M12 3c.8 3.4 5 5.3 5 10.2a5 5 0 0 1-10 0c0-2.4 1.3-3.5 1.9-5.4 1 1.3 1.8 1.9 2.5 1.9C11.2 7.6 11.7 5.3 12 3z"],
    chat:["M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.6A8.5 8.5 0 1 1 20.5 12z"],
    bell:["M6 9.5a6 6 0 0 1 12 0c0 5.5 2.3 7 2.3 7H3.7S6 15 6 9.5z","M10 20a2 2 0 0 0 4 0"],
    belloff:["M6 9.5a6 6 0 0 1 12 0c0 5.5 2.3 7 2.3 7H3.7S6 15 6 9.5z","M10 20a2 2 0 0 0 4 0","M3 3l18 18"],
    download:["M12 3.5v11","M7 10l5 5 5-5","M4 20h16"],
    upload:["M12 15V4","M7 9l5-5 5 5","M4 20h16"],
    target:["c:12 12 9","c:12 12 5","c:12 12 1.2"],
    clock:["c:12 13 8","M12 9v4l2.6 2","M10 2.5h4"],
    search:["c:11 11 7","M20.5 20.5l-4.5-4.5"],
    eye:["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z","c:12 12 3"],
    sort:["M7 4v16","M3.5 7.5 7 4l3.5 3.5","M17 20V4","M13.5 16.5 17 20l3.5-3.5"],
    refresh:["M20 11.5a8 8 0 1 0-2.3 5.6","M20 4.5v7h-7"],
    image:["r:3 4 18 16 2.5","c:9 10 2","M21 16.5l-5-5-9.5 8.5"],
    wrench:["M14.5 6.5a4.2 4.2 0 0 0 5 5.6L21 13.6 13.6 21l-1.5-1.5a4.2 4.2 0 0 0-5.6-5L4 12 11 5l2.5 1.5z"],
    pin:["M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z","c:12 9 2.5"],
    sleep:["M4 6h6l-6 7h6","M14 12.5h5l-5 6h5"],
    door:["M4 21h16","M6 21V4.5A1.5 1.5 0 0 1 7.5 3H15v18","M15 5.5l4 1V21","M12 12.5h.01"],
    ban:["c:12 12 9","M5.7 5.7l12.6 12.6"],
    cloud:["M7 19a5 5 0 0 1-.7-9.9A6 6 0 0 1 17.8 9 4.5 4.5 0 0 1 17.5 19z"],
    hash:["M4 9h16","M4 15h16","M10 3 8 21","M16 3l-2 18"],
    bolt:["M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z"],
    thermo:["M14 14.6V5a2 2 0 0 0-4 0v9.6a4 4 0 1 0 4 0z"],
    ruler:["M3.5 16.5 16.5 3.5l4 4-13 13z","M7.5 12.5l2 2","M10.5 9.5l2 2","M13.5 6.5l2 2"],
    torch:["M8 2.5h8l-1.2 6H9.2z","M9.2 8.5 10 21.5h4l.8-13","M12 12.5v2"],
    up:["M12 20V4","M5.5 10.5 12 4l6.5 6.5"],
    puzzle:["r:4 4 7 7 1.5","r:13 4 7 7 1.5","r:4 13 7 7 1.5","r:13 13 7 7 1.5"],
    copy:["r:8.5 8.5 12.5 12.5 2.5","M15.5 8.5V5.5A2.5 2.5 0 0 0 13 3H5.5A2.5 2.5 0 0 0 3 5.5V13a2.5 2.5 0 0 0 2.5 2.5h3"],
    folder:["M3 7a2 2 0 0 1 2-2h4.2l2 2.2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
    divide:["M5 12h14","M12 7h.01","M12 17h.01"],
    prev:["M18.5 5.5 9 12l9.5 6.5z","M5.5 5.5v13"],
    next:["M5.5 5.5 15 12l-9.5 6.5z","M18.5 5.5v13"],
    link:["M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1","M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1"],
    balloon:["M12 15.5c-3.4 0-6-2.9-6-6.3a6 6 0 0 1 12 0c0 3.4-2.6 6.3-6 6.3z","M11 17.5l1-2 1 2z","M12 17.5c0 1.6-1.6 2.2-1.6 4"],
    party:["M4 20.5 9 6l9 9z","M14 4.5l.5-2","M18 8l2.5-1","M19.5 3.5h.01","M16.5 11l2.5.5"],
    filter:["M4 5h16l-6.2 7.4V19l-3.6 1.8v-8.4z"],
    star:["M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"],
    heart:["M12 20s-8-4.9-8-10.6A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8 2.8C20 15.1 12 20 12 20z"],
    mic:["r:9 3 6 11 3","M5.5 11a6.5 6.5 0 0 0 13 0","M12 17.5V21"],
    video:["r:3 6.5 13 11 2.5","M16 10.5l5-3v9l-5-3z"],
    sticker:["M20 13.5V6.5A2.5 2.5 0 0 0 17.5 4h-11A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h7z","M13.5 20v-4a2.5 2.5 0 0 1 2.5-2.5h4","M9 10h.01","M15 10h.01"],
    lock:["r:5 10.5 14 10 2.5","M8 10.5V7.5a4 4 0 0 1 8 0v3"],
    gift:["r:3.5 8 17 4 1","M5 12v8.5h14V12","M12 8v12.5","M12 8C10.5 4 7 4.5 7.5 6.5S12 8 12 8zm0 0c1.5-4 5-3.5 4.5-1.5S12 8 12 8z"],
    rocket:["M12 15.5 8.5 12c1.5-4.5 4.8-8 10.5-8.5-.5 5.7-4 9-8.5 10.5z","M8.5 12 5 11.5l2.5-3.5h3","M12 15.5l.5 3.5 3.5-2.5v-3","M5.5 18.5c.5-1.5 1.5-2 2.5-1.5s.5 2-1 2.5-2 .5-1.5-1z"],
    trash:["M4 7h16","M9.5 7V4.5h5V7","M6 7l1 13.5h10L18 7"],
    check:["M4.5 12.5l5 5 10-10"],
    swap:["M4 8h14","M14.5 4.5 18 8l-3.5 3.5","M20 16H6","M9.5 12.5 6 16l3.5 3.5"],
    flask:["M9.5 3.5h5","M10.5 3.5v6L5 19a1.6 1.6 0 0 0 1.4 2.5h11.2A1.6 1.6 0 0 0 19 19l-5.5-9.5v-6","M7.5 15h9"],
    globe:["c:12 12 9","M3 12h18","M12 3c3.2 3 3.2 15 0 18","M12 3c-3.2 3-3.2 15 0 18"],
    key:["c:8 15 4","M11 12l9-9","M17 6l3 3","M14.5 8.5l2 2"],
    egg:["M12 3c-4 0-7 6.5-7 11a7 7 0 0 0 14 0c0-4.5-3-11-7-11z","M8.5 14.5a3.5 3.5 0 0 0 3 3"],
    crown:["M4 8l4 4 4-7 4 7 4-4-1.5 11h-13z","M6.5 21h11"],
    hand:["M8 12V6.5a1.5 1.5 0 0 1 3 0V11","M11 10.5V5a1.5 1.5 0 0 1 3 0v6","M14 10V6.5a1.5 1.5 0 0 1 3 0V13","M8 12l-1.5-1.5a1.5 1.5 0 0 0-2.3 1.9l2.8 5.6A5 5 0 0 0 11.5 21h1A5 5 0 0 0 17 16v-3"],
    warn:["M12 4 2.8 19.5h18.4z","M12 10v4.5","M12 17.2h.01"],
    moon:["M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"],
    sun:["c:12 12 4","M12 2.5v2","M12 19.5v2","M2.5 12h2","M19.5 12h2","M5.3 5.3l1.4 1.4","M17.3 17.3l1.4 1.4","M18.7 5.3l-1.4 1.4","M6.7 17.3l-1.4 1.4"],
    gem:["M6.5 4h11l3.5 5-9 11L3 9z","M3 9h18","M9 4l3 5 3-5","M12 20 9 9","M12 20l3-11"],
    sprout:["M12 21v-9","M12 12C12 8 9 6 4.5 6 4.5 10 7 12 12 12z","M12 14c0-3 2.5-5 7.5-5 0 4-3 6-7.5 5z"],
    x:["M6 6l12 12","M18 6 6 18"],
    pen:["M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z","M14.5 6.5l3 3"],
    pause:["M8.5 5.5v13","M15.5 5.5v13"],
    play:["M7 4.5v15l12-7.5z"],
    menu:["M4 7h16","M4 12h16","M4 17h16"],
    keyboard:["r:2.5 6.5 19 11 2","M6.5 10.5h.01","M10 10.5h.01","M13.5 10.5h.01","M17 10.5h.01","M7.5 14.5h9"],
    antenna:["M12 13v8","M8 21h8","M7.5 6.5a6.5 6.5 0 0 0 0 9","M16.5 6.5a6.5 6.5 0 0 1 0 9","M4.5 4a10.5 10.5 0 0 0 0 14","M19.5 4a10.5 10.5 0 0 1 0 14","c:12 11 1.5"],
    money:["r:2.5 6.5 19 11 2","c:12 12 2.8","M6 12h.01","M18 12h.01"],
    note:["M9 18V6l10-2v12","c:6.5 18 2.5","c:16.5 16 2.5"],
    zAri:["M12 20V9","M12 9C12 4 5 3 5 8","M12 9c0-5 7-6 7-1"],
    zTau:["c:12 15 5","M5 4a7 6 0 0 0 14 0"],
    zGem:["M5.5 4.5c4 2 9 2 13 0","M5.5 19.5c4-2 9-2 13 0","M9.5 6v12","M14.5 6v12"],
    zCan:["c:8 9 2.3","M10.3 9c3-4 8-2.5 9 1","c:16 15 2.3","M13.7 15c-3 4-8 2.5-9-1"],
    zLeo:["c:8 15 3","M11 15V8.5a3.5 3.5 0 0 1 7 0c0 4-2 6.5-1.5 9.5a2 2 0 0 0 3.5 1"],
    zVir:["M4.5 6v11","M4.5 8a3 3 0 0 1 6 0v9","M10.5 8a3 3 0 0 1 6 0v9","M16.5 11c3 0 4 2 4 4.5S18 20 15.5 18.5"],
    zLib:["M4 19h16","M4 14.5h4a5 5 0 1 1 8 0h4"],
    zSco:["M4.5 6v11","M4.5 8a3 3 0 0 1 6 0v9","M10.5 8a3 3 0 0 1 6 0v9c0 2 1 3 3 2","M17 19.5l3 .5-.5-3"],
    zSag:["M5 19 19 5","M11 5h8v8","M7.5 11.5l5 5"],
    zCap:["M4.5 5.5 8 12V6.5","M8 12c1-3 3-5 5.5-5S17 9 17 12v3","c:17.5 17.2 2.6"],
    zAqu:["M3.5 9.5l3-3 3 3 3-3 3 3 3-3 2.5 3","M3.5 17l3-3 3 3 3-3 3 3 3-3 2.5 3"],
    zPis:["M6 4a8 8 0 0 1 0 16","M18 4a8 8 0 0 0 0 16","M5 12h14"],
  };
  // Эмодзи → иконка (вариационный селектор U+FE0F отбрасывается)
  const E = {"🧭":"compass","🏠":"home","👤":"user","👥":"users","📊":"bars","📈":"trend","📉":"trend","⚖":"scale","🗓":"grid","📅":"calendar","📆":"caldays","🈷":"calendar","⚙":"gear","🏆":"trophy","🥇":"medal","🏅":"medal","🎖":"medal","🔮":"sparkles","✨":"sparkles","🏁":"flag","⏳":"hourglass","⌛":"hourglass","🎬":"film","📜":"list","📋":"list","🎂":"cake","📸":"camera","📷":"camera","🗺":"map","🅥":"vk","🎨":"palette","📱":"phone","🎛":"sliders","🗄":"database","💾":"database","ℹ":"info","🔥":"flame","💬":"chat","🔔":"bell","🔕":"belloff","⬇":"download","📥":"download","📤":"upload","🎯":"target","⏱":"clock","🕐":"clock","🔍":"search","👁":"eye","↕":"sort","🔃":"sort","⟳":"refresh","🔄":"refresh","🖼":"image","🛠":"wrench","🔧":"wrench","📍":"pin","💤":"sleep","🚪":"door","🚫":"ban","☁":"cloud","🔢":"hash","⚡":"bolt","🌡":"thermo","📏":"ruler","🔦":"torch","⬆":"up","🧩":"puzzle","🪞":"copy","🗂":"folder","📁":"folder","➗":"divide","⏮":"prev","⏭":"next","🔗":"link","🎈":"balloon","🎉":"party","🥳":"party","⭐":"star","🌟":"star","❤":"heart","🎤":"mic","🎙":"mic","🎥":"video","📹":"video","🖼️":"image","🔒":"lock","🎁":"gift","🚀":"rocket","🗑":"trash","✅":"check","🔀":"swap","📲":"phone","🧪":"flask","🌐":"globe","🔑":"key","🥚":"egg","👑":"crown","👋":"hand","⚠":"warn","🌙":"moon","☀":"sun","💎":"gem","🌱":"sprout","✕":"x","✖":"x","❌":"x","✓":"check","✔":"check","📝":"pen","✎":"pen","❚❚":"pause","▶":"play","★":"star","☰":"menu","⌨":"keyboard","📡":"antenna","💵":"money","💶":"money","💰":"money","💸":"money","💜":"heart","💗":"heart","♥":"heart","🎵":"note","♪":"note","♈":"zAri","♉":"zTau","♊":"zGem","♋":"zCan","♌":"zLeo","♍":"zVir","♎":"zLib","♏":"zSco","♐":"zSag","♑":"zCap","♒":"zAqu","♓":"zPis"};
  const TAB = {reactions:"react", events:"levelup", hub:"home", profile:"user", stats:"bars", compare:"scale", daymatrix:"grid", charts:"trend", settings:"gear", records:"trophy", months:"medal", days:"caldays", forecast:"sparkles", marathons:"flag", time:"hourglass", yearreview:"film", achievements:"medal", chronicle:"list", birthdays:"cake", selfie:"camera", usermap:"map", vk:"vk", menu:"grid"};
  const shape = (s, stroke) => {
    if (s.startsWith("c:")) { const [cx, cy, r] = s.slice(2).split(" "); return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`; }
    if (s.startsWith("e:")) { const [cx, cy, rx, ry] = s.slice(2).split(" "); return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`; }
    if (s.startsWith("r:")) { const [x, y, w, h, rx] = s.slice(2).split(" "); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 0}"/>`; }
    return `<path d="${s}"/>`;
  };
  const svgOf = (name, color = "currentColor") => P[name] ? `<svg class="li" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name].map(shape).join("")}</svg>` : "";
  const maskOf = name => `url("data:image/svg+xml,${encodeURIComponent(svgOf(name, "#000").replace('class="li" ', 'xmlns="http://www.w3.org/2000/svg" '))}")`;
  const keyOf = t => { t = String(t || "").replace(/️/g, "").trim(); return E[t] || null; };
  window.__lineIcon = {svg:svgOf, mask:maskOf, forEmoji:t => { const k = keyOf(t); return k ? svgOf(k) : ""; }, name:keyOf, forTab:t => svgOf(TAB[t] || "")};
  document.documentElement.style.setProperty("--li-filter", maskOf("filter"));

  /* ---------- Боковые вкладки: иконка по вкладке ---------- */
  const nav = document.querySelector("header nav") || document.querySelector("nav");
  function navIcons(){ nav?.querySelectorAll("button[data-tab]").forEach(b => { const k = TAB[b.dataset.group === "profile" ? "profile" : b.dataset.tab]; if (k && !b.style.getPropertyValue("--li")) b.style.setProperty("--li", maskOf(k)); }); }

  /* ---------- Левая панель: раскладываем по трём блокам ---------- */
  if (nav) {
    const mk = cls => { const d = document.createElement("div"); d.className = "side-grp " + cls; return d; };
    const g1 = mk("g-main"), g2 = mk("g-other"), g3 = mk("g-set");
    g1.style.order = "0"; g2.style.order = "1"; g3.style.order = "2";
    const place = el => {
      if (!el || el.nodeType !== 1 || el.classList.contains("side-grp")) return;
      const ord = Number(el.style.order || 50);
      const dest = el.classList.contains("side-toggle") || ord <= 10 ? g1 : (el.dataset && el.dataset.tab === "settings") || ord >= 85 ? g3 : g2;
      if (el.parentElement !== dest) dest.appendChild(el);
    };
    const arrange = () => { [...nav.children].forEach(place); if (!g1.parentElement) nav.append(g1, g2, g3); };
    arrange(); navIcons();
    // Порядок кнопок внутри блока — по их order (он задан раньше для бокового режима).
    new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && n.parentElement === nav && !n.classList.contains("side-grp")))) { arrange(); navIcons(); } }).observe(nav, {childList:true});
  }

  /* ---------- Замена эмодзи на линейные иконки в значках и заголовках ---------- */
  const ICON_BOX = ".hub-tile .ic, .hub-ev .ic, .ch-ev .ic, .hub-card .ic, .ma-ico, .set-tabs button > i, .fd-ic, .ach-ico";
  const LEAD = ".hub-card h3 > span, .mt-h button, .hub-kpi .lbl, .set-txt > b, #ma-menu .ma-txt > span";
  const LEAD_RE = /^(\p{Extended_Pictographic}|[🅥ℹ⟳↕⬇⬆⏮⏭⏱⌛⚙⚖⚡☁❤⭐])️?\s*/u;
  function swapBox(el){
    if (el.querySelector("svg.li")) return;
    const t = el.textContent; if (!t || t.length > 4) return;
    const go = el.closest("[data-ma-go]")?.dataset.maGo;
    const s = (go && window.__lineIcon.forTab(go)) || window.__lineIcon.forEmoji(t); if (s) el.innerHTML = s;
  }
  function swapLead(el){
    const n = el.firstChild; if (!n || n.nodeType !== 3) return;
    const m = LEAD_RE.exec(n.nodeValue); if (!m) return;
    const s = window.__lineIcon.forEmoji(m[1]); if (!s) return;
    n.nodeValue = n.nodeValue.slice(m[0].length);
    const w = document.createElement("span"); w.className = "li-lead"; w.innerHTML = s; el.insertBefore(w, n);
  }
  function pass(root){
    const r = root && root.querySelectorAll ? root : document;
    r.querySelectorAll(ICON_BOX).forEach(swapBox);
    r.querySelectorAll(LEAD).forEach(swapLead);
    if (r.matches && r.matches(ICON_BOX)) swapBox(r);
  }
  let q = 0;
  const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; pass(document); }); };
  new MutationObserver(ms => { if (ms.some(m => m.addedNodes.length)) later(); }).__hub(document.body);
  pass(document);
})();
