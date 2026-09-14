// Точка входа: загружает данные и связывает карту с дашбордом.

async function main() {
  document.title = CONFIG.PROJECT_TITLE;
  initMap();
  renderLegend();

  try {
    const [countryGeo, regionsGeo] = await Promise.all([
      fetch(CONFIG.COUNTRY_BOUNDARY_URL).then((r) => r.json()),
      fetch(CONFIG.REGIONS_BOUNDARY_URL).then((r) => r.json()),
    ]);
    renderAdminLayers(countryGeo, regionsGeo);
  } catch (err) {
    console.warn("Не удалось загрузить справочные административные границы", err);
  }

  let sites, boundaries, latestDate;
  try {
    ({ sites, boundaries, latestDate } = await loadAllData());
  } catch (err) {
    document.getElementById("stats").innerHTML =
      '<p style="padding:16px;color:#b5543c">Не удалось загрузить данные. Проверьте ссылки в js/config.js.</p>';
    console.error(err);
    return;
  }

  document.getElementById("report-date").textContent = formatDate(latestDate);

  renderStats(sites);
  renderFilters(sites, (filterKey) => setMapFilter(sites, filterKey));
  renderSiteList(sites, (siteId) => focusSite(siteId));
  renderMap(sites, boundaries, (siteId) => focusSite(siteId));
  renderStageOverview(sites);
  const trendChart = renderTrendChart(sites);

  const toggle = document.querySelector(".dashboard-toggle");
  if (toggle) {
    toggle.addEventListener("toggle", () => {
      if (toggle.open) trendChart.resize();
    });
  }
}

main();
