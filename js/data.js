// Загрузка исходных данных и сборка единой модели по участкам.
// Источник состояния участка — статусы 5 этапов актирования (data/stages.csv).

const STATUS_LABEL = {
  plan: "План",
  progress: "В работе",
  done: "Завершено",
  problem: "Проблема",
};

const STATUS_KEY = {
  "план": "plan",
  "в работе": "progress",
  "завершено": "done",
  "проблема": "problem",
};

const STAGE_STATUS_KEY = {
  "не начат": "not_started",
  "подготовлен": "submitted",
  "актирован": "accepted",
};

const STAGE_STATUS_LABEL = {
  not_started: "Не начат",
  submitted: "На актировании",
  accepted: "Актирован",
  overdue: "Просрочен",
};

function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: reject,
    });
  });
}

async function loadAllData() {
  const [sitesRows, stagesRows, boundaries] = await Promise.all([
    fetchCsv(CONFIG.SITES_CSV_URL),
    fetchCsv(CONFIG.STAGES_CSV_URL),
    fetch(CONFIG.BOUNDARIES_URL).then((r) => r.json()),
  ]);

  const stagesBySite = {};
  const today = new Date().toISOString().slice(0, 10);
  stagesRows.forEach((row) => {
    const id = (row.site_id || "").trim();
    if (!id) return;
    const stage = Number(row.stage);
    let status = STAGE_STATUS_KEY[row.status] || "not_started";
    const deadline = CONFIG.STAGE_DEADLINES[stage];
    if (status !== "accepted" && deadline && today > deadline) {
      status = "overdue";
    }
    if (!stagesBySite[id]) stagesBySite[id] = [];
    const manualPercent = Math.max(0, Math.min(100, Number(row.percent) || 0));
    stagesBySite[id].push({
      stage,
      status,
      deadline,
      actDate: row.act_date || "",
      comment: row.comment || "",
      reportLink: row.report_link || "",
      percent: status === "accepted" ? 100 : manualPercent,
    });
  });
  Object.values(stagesBySite).forEach((list) => list.sort((a, b) => a.stage - b.stage));

  // Текущее состояние участка выводится из статусов и % его 5 этапов.
  function deriveCurrent(stages, statusOverride) {
    const accepted = stages.filter((s) => s.status === "accepted").length;
    const hasOverdue = stages.some((s) => s.status === "overdue");
    const hasSubmitted = stages.some((s) => s.status === "submitted");
    const percent = stages.length
      ? Math.round(stages.reduce((sum, s) => sum + s.percent, 0) / stages.length)
      : 0;
    let status = "plan";
    if (hasOverdue) status = "problem";
    else if (stages.length && accepted === stages.length) status = "done";
    else if (accepted > 0 || hasSubmitted) status = "progress";
    if (statusOverride) status = statusOverride;
    const withComment = [...stages].reverse().find((s) => s.comment);
    return { percent, status, comment: withComment ? withComment.comment : "" };
  }

  const sites = sitesRows
    .filter((row) => row.site_id)
    .map((row) => {
      const id = row.site_id.trim();
      const stages = stagesBySite[id] || [];
      const statusOverride = STATUS_KEY[(row.status_override || "").trim().toLowerCase()];
      return {
        id,
        name: row.name || id,
        executorType: row.executor_type || "",
        executorName: row.executor_name || "",
        region: row.region || "",
        plannedArea: Number(row.planned_area_km2) || 0,
        plannedStart: row.planned_start || "",
        plannedEnd: row.planned_end || "",
        tzLink: row.tz_link || "",
        note: row.note || "",
        stages,
        current: deriveCurrent(stages, statusOverride),
      };
    });

  // Отчётная дата — самая свежая дата подписания акта среди всех участков.
  const actDates = Object.values(stagesBySite)
    .flat()
    .map((s) => s.actDate)
    .filter(Boolean)
    .sort();
  const latestDate = actDates.length ? actDates[actDates.length - 1] : null;

  return { sites, boundaries, latestDate };
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
