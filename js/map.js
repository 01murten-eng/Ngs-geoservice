// Инициализация карты и отрисовка участков.

const STATUS_COLOR = {
  plan: "#6e6a63",
  progress: "#a8632c",
  done: "#3f7d6e",
  problem: "#8c3223",
};

const STAGE_COLOR = {
  not_started: "#cec8b9",
  submitted: "#a8632c",
  accepted: "#3f7d6e",
  overdue: "#8c3223",
};

let leafletMap = null;
let siteLayers = {}; // site_id -> layer
let activeFilter = "all";

function initMap() {
  leafletMap = L.map("map", { zoomControl: true, attributionControl: true });
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
      maxZoom: 16,
    }
  ).addTo(leafletMap);
  return leafletMap;
}

function currentStageInfo(site) {
  const next = site.stages.find((s) => s.status !== "accepted");
  if (!next) return { label: "Все этапы закрыты", overdue: false };
  const overdue = next.status === "overdue";
  return {
    label: `Этап ${STAGE_ROMAN[next.stage]} — до ${formatDate(next.deadline)}`,
    overdue,
  };
}

function popupHtml(site) {
  const c = site.current;
  const execLine =
    site.executorType === "НГС"
      ? `НГС — ${site.executorName}`
      : `Подрядчик — ${site.executorName}`;
  const stageInfo = currentStageInfo(site);
  return `
    <div class="popup">
      <h3>${site.name}</h3>
      <dl>
        <dt>Исполнитель</dt><dd style="font-family:var(--font-sans)">${execLine}</dd>
        ${site.region ? `<dt>Область</dt><dd style="font-family:var(--font-sans)">${site.region}</dd>` : ""}
        <dt>Статус</dt><dd>${STATUS_LABEL[c.status]}</dd>
        <dt>Выполнено</dt><dd>${c.percent}%</dd>
        <dt>Текущий этап</dt><dd style="color:${stageInfo.overdue ? "var(--problem)" : "inherit"}">${stageInfo.label}</dd>
        <dt>Площадь</dt><dd>${site.plannedArea || "—"} км²</dd>
        <dt>Примечание</dt><dd style="font-family:var(--font-sans)">${site.note || "—"}</dd>
      </dl>
      ${c.comment ? `<p class="popup-comment">${c.comment}</p>` : ""}
      <div class="popup-stages">
        ${site.stages
          .map(
            (s) =>
              `<span class="stage-chip" style="background:${STAGE_COLOR[s.status]}" title="Этап ${s.stage} — ${STAGE_STATUS_LABEL[s.status]}${s.status !== "accepted" ? " (" + s.percent + "%)" : ""}${s.deadline ? ", дедлайн " + formatDate(s.deadline) : ""}">${s.stage}</span>`
          )
          .join("")}
      </div>
      ${(() => {
        const withReport = [...site.stages].reverse().find((s) => s.status === "accepted" && s.reportLink);
        return withReport
          ? `<a href="${withReport.reportLink}" target="_blank" rel="noopener">Открыть отчёт по этапу ${withReport.stage}</a>`
          : "";
      })()}
      ${site.tzLink ? `<a href="${site.tzLink}" target="_blank" rel="noopener">Открыть ТЗ участка</a>` : ""}
    </div>
  `;
}

function renderAdminLayers(countryGeo, regionsGeo) {
  L.geoJSON(regionsGeo, {
    style: {
      color: "#5b564f",
      weight: 1,
      fill: false,
      interactive: false,
    },
  }).addTo(leafletMap);

  L.geoJSON(countryGeo, {
    style: {
      color: "#857e73",
      weight: 2,
      fill: false,
      interactive: false,
    },
  }).addTo(leafletMap);
}

function renderMap(sites, boundaries, onSiteClick) {
  const byId = Object.fromEntries(sites.map((s) => [s.id, s]));
  siteLayers = {};

  const geoLayer = L.geoJSON(boundaries, {
    style: (feature) => {
      const site = byId[feature.properties.site_id];
      const status = site ? site.current.status : "plan";
      return {
        color: STATUS_COLOR[status],
        weight: 1.5,
        fillColor: STATUS_COLOR[status],
        fillOpacity: 0.35,
      };
    },
    onEachFeature: (feature, layer) => {
      const site = byId[feature.properties.site_id];
      if (!site) return;
      siteLayers[site.id] = layer;
      layer.bindPopup(popupHtml(site));
      layer.on("click", () => onSiteClick && onSiteClick(site.id));
      layer.on("mouseover", () => layer.setStyle({ weight: 3, fillOpacity: 0.55 }));
      layer.on("mouseout", () => applyFilterStyle(site, layer));
    },
  }).addTo(leafletMap);

  leafletMap.fitBounds(geoLayer.getBounds(), { padding: [24, 24] });
  return geoLayer;
}

function applyFilterStyle(site, layer) {
  const matches = activeFilter === "all" || site.current.status === activeFilter;
  layer.setStyle({
    weight: 1.5,
    fillOpacity: matches ? 0.35 : 0.06,
    opacity: matches ? 1 : 0.25,
  });
}

function setMapFilter(sites, filterKey) {
  activeFilter = filterKey;
  sites.forEach((site) => {
    const layer = siteLayers[site.id];
    if (layer) applyFilterStyle(site, layer);
  });
}

function focusSite(siteId) {
  const layer = siteLayers[siteId];
  if (!layer) return;
  leafletMap.fitBounds(layer.getBounds(), { maxZoom: 9, padding: [40, 40] });
  layer.openPopup();
}

function renderLegend() {
  const el = document.getElementById("legend");
  el.innerHTML = Object.entries(STATUS_LABEL)
    .map(
      ([key, label]) =>
        `<div class="legend__row"><span class="legend__swatch" style="background:${STATUS_COLOR[key]}"></span>${label}</div>`
    )
    .join("");
}
