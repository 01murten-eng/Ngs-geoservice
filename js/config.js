// ЕДИНСТВЕННЫЙ файл, который обычно нужно менять при настройке проекта.
//
// Как подключить свою Google Таблицу вместо локальных CSV:
// 1. Создайте таблицу с двумя листами: "Sites" и "Stages"
//    (структуру колонок см. в README.md и в файлах data/sites.csv,
//    data/stages.csv).
// 2. Файл → "Опубликовать в интернете" → выберите нужный лист →
//    формат "Значения, разделённые запятыми (.csv)" → Опубликовать.
// 3. Скопируйте полученную ссылку и вставьте её ниже вместо примера.
// 4. Замените data/sites.geojson на настоящие границы участков, если
//    состав участков поменяется (свойство site_id каждого полигона
//    должно совпадать со значением site_id в листе Sites).

const CONFIG = {
  // Замените на ссылки вида:
  // "https://docs.google.com/spreadsheets/d/ВАШ_ID/pub?gid=0&single=true&output=csv"
  // когда заведёте Google Таблицу для еженедельного ввода.
  SITES_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRB3ig_Z7TIFA5g9BbuEAnSO1eMs4NyEzTg7bl9nQ2RgUCfrWJnjs02DvXLvaQ94nrAlsAR-qJqGu0u/pub?gid=401547179&single=true&output=csv",
  STAGES_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpGDTyBSlHZWGSiCiwqnEhm3qzVJZm-MR6ztnpJhT4Ghaetrt7LHfE6Y37qO9w4Wegzng5lTX4AzVX/pub?gid=1405351011&single=true&output=csv",

  // Дедлайны актирования — общие для всех участков, меняются редко.
  STAGE_DEADLINES: {
    1: "2026-08-24",
    2: "2026-09-24",
    3: "2026-10-24",
    4: "2026-11-24",
    5: "2026-12-10",
  },

  // Границы участков — загружаются один раз, обновляются вручную при
  // изменении состава участков (не еженедельно).
  BOUNDARIES_URL: "data/sites.geojson",

  // Справочные слои — контур Казахстана и границы областей.
  // Меняются практически никогда, отдельно от еженедельных данных.
  COUNTRY_BOUNDARY_URL: "data/kz_country.geojson",
  REGIONS_BOUNDARY_URL: "data/kz_regions.geojson",

  // Название проекта, показывается в шапке и в заголовке вкладки.
  PROJECT_TITLE:
    "Работы по ДЗЗ при осуществлении различных видов ГСР-50 (ГДП-50, ГГК-50, ГМК-50)",
};
