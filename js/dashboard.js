// Панель показателей, список участков и график динамики.

function renderStats(sites) {
  const total = sites.length;
  const byStatus = { plan: 0, progress: 0, done: 0, problem: 0 };
  let sumPct = 0;
  sites.forEach((s) => {
    byStatus[s.current.status]++;
    sumPct += s.current.percent;
  });
  const avg = total ? Math.round(sumPct / total) : 0;

  const ngsCount = sites.filter((s) => s.executorType === "НГС").length;
  const subCount = total - ngsCount;

  const el = document.getElementById("stats");
  el.innerHTML = `
    <table class="stats-table">
      <caption>Сводка на сегодня — ${total} участков (НГС ${ngsCount}, подрядчики ${subCount})</caption>
      <thead>
        <tr>
          <th>Среднее выполнение</th>
          <th>Завершено</th>
          <th>В работе</th>
          <th>Не начато</th>
          <th>Проблемные</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${avg}%</td>
          <td class="done">${byStatus.done}</td>
          <td class="progress">${byStatus.progress}</td>
          <td class="plan">${byStatus.plan}</td>
          <td class="problem">${byStatus.problem}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderFilters(sites, onFilter) {
  const counts = { all: sites.length, plan: 0, progress: 0, done: 0, problem: 0 };
  sites.forEach((s) => counts[s.current.status]++);

  const items = [
    ["all", "Все"],
    ["progress", "В работе"],
    ["problem", "Проблемные"],
    ["done", "Завершено"],
    ["plan", "Не начато"],
  ];

  const el = document.getElementById("filters");
  el.innerHTML = items
    .map(
      ([key, label]) =>
        `<button class="filter-btn${key === "all" ? " active" : ""}" data-filter="${key}">${label} (${counts[key]})</button>`
    )
    .join("");

  el.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onFilter(btn.dataset.filter);
    });
  });
}

function renderSiteList(sites, onSiteClick) {
  document.getElementById("site-count").textContent = sites.length;
  const sorted = [...sites].sort((a, b) => a.current.percent - b.current.percent);

  const el = document.getElementById("site-list");
  el.innerHTML = sorted
    .map((s) => {
      const exec =
        s.executorType === "НГС" ? `НГС — ${s.executorName}` : s.executorName || "Подрядчик";
      return `
        <button class="site-row" data-id="${s.id}">
          <div class="site-row__top">
            <span><span class="dot ${s.current.status}"></span>${s.name}</span>
            <span class="site-row__pct">${s.current.percent}%</span>
          </div>
          <div class="site-row__exec">${exec}</div>
          <div class="site-row__bar">
            <div class="site-row__bar-fill" style="width:${s.current.percent}%; background:${STATUS_COLOR[s.current.status]}"></div>
          </div>
        </button>
      `;
    })
    .join("");

  el.querySelectorAll(".site-row").forEach((row) => {
    row.addEventListener("click", () => onSiteClick(row.dataset.id));
  });
}

const STAGE_ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

function renderStageOverview(sites) {
  const el = document.getElementById("stages-overview");
  const rows = [1, 2, 3, 4, 5].map((stageNum) => {
    const counts = { accepted: 0, submitted: 0, overdue: 0, not_started: 0 };
    sites.forEach((s) => {
      const st = s.stages.find((x) => x.stage === stageNum);
      if (st) counts[st.status]++;
    });
    const total = sites.length || 1;
    const deadline = CONFIG.STAGE_DEADLINES[stageNum];
    const segments = ["accepted", "submitted", "overdue", "not_started"]
      .filter((k) => counts[k] > 0)
      .map(
        (k) =>
          `<div class="stage-bar__seg" style="width:${(counts[k] / total) * 100}%; background:${STAGE_COLOR[k]}" title="${STAGE_STATUS_LABEL[k]}: ${counts[k]}"></div>`
      )
      .join("");
    return `
      <div class="stage-row">
        <div class="stage-row__label">
          <span>Этап ${STAGE_ROMAN[stageNum]}</span>
          <span class="stage-row__deadline">до ${formatDate(deadline)}</span>
        </div>
        <div class="stage-bar">${segments}</div>
        <div class="stage-row__counts">
          <span style="color:${STAGE_COLOR.accepted}">${counts.accepted} актировано</span>
          <span style="color:${STAGE_COLOR.submitted}">${counts.submitted} на актировании</span>
          <span style="color:${STAGE_COLOR.overdue}">${counts.overdue} просрочено</span>
        </div>
      </div>
    `;
  });
  el.innerHTML = rows.join("");
}

function renderTrendChart(sites) {
  // Динамика: доля выполненного проекта (по актированным этапам) на каждую
  // дату подписания акта. Каждый актированный этап участка = его вклад в
  // общий % (100% / 5 этапов / число участков).
  const total = sites.length || 1;
  const events = [];
  sites.forEach((s) => {
    s.stages.forEach((st) => {
      if (st.status === "accepted" && st.actDate) {
        events.push(st.actDate);
      }
    });
  });
  events.sort();

  const perAcceptedStage = 100 / 5 / total;
  const dates = [...new Set(events)];
  let running = 0;
  const avgs = dates.map((d) => {
    const countOnDate = events.filter((e) => e === d).length;
    running += countOnDate * perAcceptedStage;
    return Math.round(running * 10) / 10;
  });

  const ctx = document.getElementById("trend-chart");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: dates.map(formatDate),
      datasets: [
        {
          label: "Выполнено по проекту, %",
          data: avgs,
          borderColor: "#b8860b",
          backgroundColor: "rgba(184,134,11,0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: "#b8860b",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#5b584e", callback: (v) => v + "%" },
          grid: { color: "#ded9cc" },
        },
        x: {
          ticks: { color: "#5b584e" },
          grid: { display: false },
        },
      },
    },
  });
}
