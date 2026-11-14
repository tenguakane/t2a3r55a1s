
/* Схема сохранённых настроек.
   Все настройки лежат в localStorage под ключами «chatstats.*». Здесь — полный перечень ключей (группа, что хранит, устарел ли),
   номер версии схемы и миграции между версиями. Новый ключ в коде нужно записать сюда: автотест сравнивает код с этим перечнем.
   Миграции запускаются при загрузке, до остальных скриптов; они только дополняют и чистят, значения настроек не переписывают.
   Номер версии хранится в самом хранилище (chatstats.schema.v1), поэтому настройки, импортированные из старого экспорта, тоже мигрируют. */
(function(){
  "use strict";
  var P = "chatstats.", VERSION = 2, VKEY = P + "schema.v1";
  var GROUPS = {"look": "Оформление", "layout": "Раскладка", "filters": "Фильтры", "charts": "Графики", "tables": "Таблицы", "tabs": "Вкладки", "data": "Данные", "fx": "Эффекты", "exp": "Эксперименты", "vk": "VK", "svc": "Служебное"};
  /* [ключ без префикса, группа, что хранит, флаг: "L" — устарел и игнорируется кодом, "S" — лежит в sessionStorage] */
  var ROWS = [
    ["achPerson.v1", "tabs", "Участник, выбранный на вкладке «Достижения»", ""],
    ["achView.v1", "tabs", "Вид вкладки «Достижения»", ""],
    ["anomalies.v1", "charts", "Подсветка аномальных дней (убрана 2026.10.30)", "L"],
    ["apiBase.v1", "data", "Адрес API статистики", ""],
    ["avatars.v1", "data", "Аватарки участников, загруженные пользователем", ""],
    ["avatars.ver.v1", "data", "Версия вшитых аватарок, уже слитых в хранилище", ""],
    ["betaApiEvents.v1", "svc", "Адрес API событий бывшей беты (удаляется при запуске)", "L"],
    ["betaApiReact.v1", "svc", "Адрес API реакций бывшей беты (удаляется при запуске)", "L"],
    ["betaRE.v1", "svc", "Переключатель бывшей беты (удаляется при запуске)", "L"],
    ["bio.v1", "tabs", "Дни рождения и города участников", ""],
    ["cardsAvatars.v1", "tables", "Аватарки в карточном виде таблиц", ""],
    ["cardsCols.v1", "tables", "Число столбцов в карточном виде", ""],
    ["cardsColsByTable.v1", "tables", "Число столбцов карточек для отдельных таблиц", ""],
    ["cardsCompact.v1", "tables", "Компактные карточки", ""],
    ["changelogSeen.v1", "svc", "Последний просмотренный выпуск истории обновлений", ""],
    ["chartBackground.end.v1", "charts", "Конец градиента фона графиков", ""],
    ["chartBackground.start.v1", "charts", "Начало градиента фона графиков", ""],
    ["chartBackground.v1", "charts", "Тип фона графиков", ""],
    ["chartChatsOff.v1", "charts", "Чаты, убранные с графиков", ""],
    ["chartFocus.v1", "charts", "Выделенные линии на графиках", ""],
    ["chartFontColor.v1", "charts", "Цвет текста на графиках", ""],
    ["chartQuick.v1", "charts", "Быстрый период графика (убран)", "L"],
    ["trendView.v1", "charts", "Вид линий в «Динамике»: по дням или скользящее среднее", ""],
    ["chartSettingsCollapsed.v1", "charts", "Свёрнутые группы в настройках графика", ""],
    ["chartTypeAppearance.v1", "charts", "Оформление каждого типа графика", ""],
    ["cmpSmooth.v1", "tabs", "Сглаживание на вкладке «Сравнение»", ""],
    ["colorder.v1", "tables", "Порядок столбцов таблиц (перенос столбцов)", ""],
    ["columnWidths.v1", "tables", "Ширина столбцов таблиц", ""],
    ["compactFilters.v1", "filters", "Компактные фильтры", ""],
    ["compare.v1", "tabs", "Выбор на вкладке «Сравнение»", ""],
    ["comparison.v1", "filters", "Сравнение периодов в фильтрах", ""],
    ["customPalettes.v1", "charts", "Свои палитры цветов", ""],
    ["dayMatrix.v1", "tabs", "Настройки матрицы дней", ""],
    ["dsColony.v1", "look", "Оформление «Колония»", ""],
    ["errlog.v1", "svc", "Журнал ошибок страницы", ""],
    ["eventSel.v1", "tabs", "Событие, выбранное на вкладке «События»", ""],
    ["excludedTableRows.v1", "tables", "Строки, скрытые в таблицах", ""],
    ["exp.notes.v1", "exp", "Заметки к точкам графика (эксперимент)", ""],
    ["exp.v1", "exp", "Включённые эксперименты", ""],
    ["expHist.v1", "tables", "Мини-гистограммы в ячейках (убраны 2026.10.30)", "L"],
    ["filterColors.v1", "filters", "Цветные метки фильтров", ""],
    ["filtersHidden.v1", "filters", "Фильтры скрыты", ""],
    ["filtersRight.v1", "filters", "Фильтры в правой шторке на ПК", ""],
    ["filtersRightCollapsed.v1", "filters", "Правая шторка фильтров свёрнута", ""],
    ["filtersV3.v1", "filters", "Прежний вид фильтров (удаляется при запуске)", "L"],
    ["frW.v1", "layout", "Ширина правой шторки", ""],
    ["fresetDone", "svc", "Метка сброса фильтров вкладки", "S"],
    ["fx.v1", "fx", "Включённые эффекты", ""],
    ["fxOnce", "fx", "Эффекты, уже показанные в этом сеансе", "S"],
    ["fxParticles.v1", "fx", "Частицы: вид и сила", ""],
    ["ghcommit.v1", "svc", "Последний известный коммит на GitHub (проверка обновлений)", ""],
    ["glassUi.v1", "look", "Стеклянные панели", ""],
    ["goals.v1", "tabs", "Цели месяца и план", ""],
    ["haptics.v1", "svc", "Вибрация при нажатиях", ""],
    ["heat.v1", "charts", "Настройки календаря-карты", ""],
    ["hiddenCols.v1", "tables", "Скрытые столбцы таблиц", ""],
    ["hideLeft.v1", "filters", "Скрыть левую колонку фильтров", ""],
    ["holo.v1", "fx", "Голографические блики на карточках", ""],
    ["holoText.v1", "fx", "Голографический текст у победителей", ""],
    ["hubSecs.v1", "tabs", "Разделы главной", ""],
    ["hubView.v1", "tabs", "Вид главной", ""],
    ["hubWin.v1", "tabs", "Период на главной", ""],
    ["lang", "look", "Язык интерфейса (прежний ключ)", "L"],
    ["lang.v1", "look", "Язык интерфейса", ""],
    ["live.v1", "data", "Автообновление данных", ""],
    ["marathonSel.v1", "tabs", "Марафон, выбранный на вкладке «Марафоны»", ""],
    ["marathons.v1", "tabs", "Свои марафоны", ""],
    ["me.v1", "look", "Кто «я» среди участников", ""],
    ["mobileV2.v1", "layout", "Мобильная версия в виде приложения", ""],
    ["modernSelect.v1", "look", "Современные выпадающие списки", ""],
    ["mscale.v1", "layout", "Масштаб интерфейса на телефоне", ""],
    ["mzHint.v1", "svc", "Подсказка про двойное касание графика показана", ""],
    ["mzHint2.v1", "svc", "Подсказка про жесты в полноэкранном графике показана", ""],
    ["neonLines.v1", "fx", "Неоновые линии графиков", ""],
    ["noBold.v1", "look", "Без жирного шрифта", ""],
    ["norm.v1", "tabs", "Режим нормирования (всего / на активный день / доля)", ""],
    ["normWeeks.v1", "tabs", "Число недель для сравнения с нормой", ""],
    ["overtake.v1", "data", "Уведомления об обгонах", ""],
    ["pageBg.v1", "look", "Фон страницы", ""],
    ["palBgMode.v1", "charts", "Режим фона в палитрах", ""],
    ["peopleHidden.v1", "data", "Скрытые участники", ""],
    ["people.v1", "data", "Имена и настройки участников", ""],
    ["pinrows.v1", "exp", "Закреплённые строки таблиц", ""],
    ["plan.v1", "tabs", "План на месяц", ""],
    ["quiet.v1", "tabs", "Настройки «Тихих участников»", ""],
    ["raceSpeed.v1", "charts", "Скорость гонки", ""],
    ["radarPeriod.v1", "tabs", "Период радара в профиле", ""],
    ["reactUi.v1", "tabs", "Настройки вкладки «Реакции»", ""],
    ["recView.v1", "tabs", "Вид вкладки «Рекорды»", ""],
    ["schema.v1", "svc", "Версия схемы сохранённых настроек", ""],
    ["sel.active.v1", "data", "Включён ли выбор участников", ""],
    ["sel.v1", "data", "Выбранные участники", ""],
    ["selfieChart.v1", "tabs", "Тип графика на вкладке «Селфи»", ""],
    ["selfieRange.v1", "tabs", "Период на вкладке «Селфи»", ""],
    ["settingsCat.v1", "svc", "Открытый раздел настроек", ""],
    ["showLvl.v1", "look", "Показывать уровни у участников", ""],
    ["sideNav.v1", "layout", "Боковое меню вкладок", ""],
    ["sideNavCollapsed.v1", "layout", "Боковое меню свёрнуто", ""],
    ["sideW.v1", "layout", "Ширина бокового меню", ""],
    ["siteBase.v1", "look", "Основа темы сайта", ""],
    ["siteCustom.v1", "look", "Свои цвета акцента", ""],
    ["siteFont.v1", "look", "Шрифт сайта", ""],
    ["siteTheme.v1", "look", "Тема сайта", ""],
    ["softGrad.v1", "fx", "Мягкие градиенты на графиках", ""],
    ["statRows.v1", "tables", "Строки статистики (убраны 2026.10.30)", "L"],
    ["statRowsToggle.v1", "tables", "Переключатель строк статистики", ""],
    ["statsView.v1", "tabs", "Вид вкладки «Статистика»", ""],
    ["styles.v1", "charts", "Цвета и стили участников, годов и чатов", ""],
    ["tabAnim.v1", "look", "Анимация переключения вкладок (теперь всегда включена)", "L"],
    ["tabFilters.v1", "filters", "Фильтры, запомненные для каждой вкладки", ""],
    ["tabGroups.v1", "layout", "Группы вкладок", ""],
    ["tableBorder.v1", "tables", "Рамка таблиц", ""],
    ["tableBorderExport.v1", "tables", "Рамка таблиц на картинках", ""],
    ["tableCardsDesktop.v1", "tables", "Карточный вид таблиц на ПК", ""],
    ["tableCompact.v1", "tables", "Компактные таблицы", ""],
    ["tableNoBorders.v1", "tables", "Таблицы без рамок", ""],
    ["tableView.desktop.v1", "tables", "Вид таблиц на ПК", ""],
    ["tableView.v1", "tables", "Вид таблиц на телефоне", ""],
    ["tableWidths.v1", "tables", "Ширина таблиц целиком", ""],
    ["tablo.v1", "look", "Стиль «Табло»", ""],
    ["timeView.v1", "tabs", "Вид вкладки «Время»", ""],
    ["trendAppearance.v1", "charts", "Оформление «Динамики», версия 1 (заменена)", "L"],
    ["trendAppearance.v2", "charts", "Оформление «Динамики», версия 2 (заменена)", "L"],
    ["trendAppearance.v3", "charts", "Оформление «Динамики», версия 3 (заменена)", "L"],
    ["trendAppearance.v4", "charts", "Оформление «Динамики»", ""],
    ["ui.v1", "look", "Общие переключатели интерфейса", ""],
    ["ultimate.v1", "data", "Сводный чат «Colony Ultimate»", ""],
    ["vk.data.v1", "vk", "Архив помесячной статистики VK", ""],
    ["vk.map.v1", "vk", "Сопоставление участников VK", ""],
    ["vk.newpk.v1", "vk", "Счётчик новых идентификаторов VK", ""],
    ["vk.on.v1", "vk", "VK включён", ""],
    ["vk.src.v1", "vk", "Источник данных VK", ""],
    ["whoAsked.v1", "svc", "Вопрос «Кто ты?» уже задан", ""],
    ["yearReview.v1", "tabs", "Настройки «Итогов года»", ""],
    ["yearsDays.v1", "charts", "Окно дней на графике «По годам»", ""]
  ];
  var KEYS = {}; ROWS.forEach(function(r){ KEYS[P + r[0]] = {group: r[1], note: r[2], legacy: r[3] === "L", session: r[3] === "S"}; });
  function ls(){ try { return window.localStorage; } catch (e) { return null; } }
  function stored(){ var a = [], s = ls(); if (!s) return a; try { for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k && k.indexOf(P) === 0) a.push(k); } } catch (e) {} return a.sort(); }
  /* Миграции: to — версия, до которой доводят; каждая безопасна при повторном запуске */
  var MIGRATIONS = [
    {to: 2, note: "язык из прежнего ключа; удаление заменённых версий оформления «Динамики»", run: function(s){
      if (!s.getItem(P + "lang.v1") && s.getItem(P + "lang")) s.setItem(P + "lang.v1", s.getItem(P + "lang"));
      if (s.getItem(P + "trendAppearance.v4")) ["v1", "v2", "v3"].forEach(function(v){ s.removeItem(P + "trendAppearance." + v); });
    }}
  ];
  var ran = [];
  (function migrate(){
    var s = ls(); if (!s) return;
    var cur = 1; try { cur = parseInt(s.getItem(VKEY), 10) || 1; } catch (e) {}
    if (cur > VERSION) return;   // настройки из более новой версии сайта не трогаем
    MIGRATIONS.forEach(function(m){
      if (m.to <= cur) return;
      try { m.run(s); ran.push(m.to); } catch (e) { try { window.__errlog && window.__errlog.add("error", "миграция настроек до v" + m.to + ": " + (e && e.message), "schema-boot"); } catch (x) {} }
    });
    try { if (cur < VERSION) s.setItem(VKEY, String(VERSION)); } catch (e) {}
  })();
  window.__schema = {
    version: VERSION, groups: GROUPS, keys: KEYS, migrated: ran,
    has: function(k){ return Object.prototype.hasOwnProperty.call(KEYS, k.indexOf(P) === 0 ? k : P + k); },
    info: function(k){ return KEYS[k.indexOf(P) === 0 ? k : P + k] || null; },
    /* Сохранённые ключи, которых нет в перечне (опечатка в коде или забытая запись) */
    unknown: function(){ return stored().filter(function(k){ return !KEYS[k]; }); },
    /* Устаревшие ключи, которые ещё лежат в хранилище */
    stale: function(){ return stored().filter(function(k){ return KEYS[k] && KEYS[k].legacy; }); },
    purgeStale: function(){ var s = ls(); this.stale().forEach(function(k){ try { s.removeItem(k); } catch (e) {} }); }
  };
})();
