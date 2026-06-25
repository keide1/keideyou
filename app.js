const STORAGE_KEY = "emotion-city-os-v4-narashino-map-tickets";
const SYNC_KEY = "emotion-city-os-sync-log";
const CITY_NAME = "習志野市";

const sampleTickets = [
  {
    id: "EC-0001",
    place: "津田沼駅 北口ロータリー",
    category: "公園",
    message: "夜になると駅前広場の一部が暗く、段差も見えにくい。高齢者や子供がつまずきそうで不安です。",
    risk: "高",
    status: "未対応",
    createdAt: "2026-06-05 09:18",
    completedAt: "",
    lat: 35.6912,
    lng: 140.0202,
  },
  {
    id: "EC-0002",
    place: "谷津干潟公園 西側歩道",
    category: "道路・歩道",
    message: "雨の日に排水が悪く、歩道に水がたまります。車道へ避ける人が多いです。",
    risk: "中",
    status: "確認中",
    createdAt: "2026-06-05 10:41",
    completedAt: "",
    lat: 35.6742,
    lng: 140.0086,
  },
  {
    id: "EC-0003",
    place: "実籾駅前 通学路",
    category: "防災・避難",
    message: "通学路のブロック塀にひびがあり、地震の時に倒れないか心配です。",
    risk: "高",
    status: "担当課共有",
    createdAt: "2026-06-05 11:07",
    completedAt: "",
    lat: 35.6865,
    lng: 140.0685,
  },
  {
    id: "EC-0004",
    place: "新習志野駅 南口アンダーパス",
    category: "河川・排水",
    message: "短時間の雨で水がたまり、車が減速して渋滞します。冠水しないか心配です。",
    risk: "中",
    status: "未対応",
    createdAt: "2026-06-05 12:24",
    completedAt: "",
    lat: 35.6679,
    lng: 140.0127,
  },
];

let tickets = loadTickets();
let syncLog = loadSyncLog();
let selectedTicketId = tickets[0]?.id;
let activeAdminPage = "tickets";

const form = document.querySelector("#inquiryForm");
const receiptPanel = document.querySelector("#receiptPanel");
const receiptSummary = document.querySelector("#receiptSummary");
const ticketTable = document.querySelector("#ticketTable");
const detailBody = document.querySelector("#detailBody");
const selectedId = document.querySelector("#selectedId");
const seedButton = document.querySelector("#seedButton");
const metricOpen = document.querySelector("#metricOpen");
const metricHigh = document.querySelector("#metricHigh");
const metricDone = document.querySelector("#metricDone");
const metricDepartments = document.querySelector("#metricDepartments");
const navItems = document.querySelectorAll("[data-admin-page]");
const adminSections = document.querySelectorAll("[data-admin-section]");
const adminPageTitle = document.querySelector("#adminPageTitle");
const adminPageLead = document.querySelector("#adminPageLead");
const departmentBoard = document.querySelector("#departmentBoard");
const categoryChart = document.querySelector("#categoryChart");
const riskChart = document.querySelector("#riskChart");
const statusChart = document.querySelector("#statusChart");
const tagCloud = document.querySelector("#tagCloud");
const syncButton = document.querySelector("#syncButton");
const localCount = document.querySelector("#localCount");
const cloudCount = document.querySelector("#cloudCount");
const lastSync = document.querySelector("#lastSync");
const syncLogList = document.querySelector("#syncLog");
const cityMapEl = document.querySelector("#cityMap");
const googleMapFrame = document.querySelector("#googleMapFrame");
const mapTicketPins = document.querySelector("#mapTicketPins");
const fitMapButton = document.querySelector("#fitMapButton");
const focusSelectedButton = document.querySelector("#focusSelectedButton");
const notificationBell = document.querySelector("#notificationBell");
const notificationCount = document.querySelector("#notificationCount");
const notificationPanel = document.querySelector("#notificationPanel");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const ticket = {
      id: nextId(),
      place: data.get("place"),
      category: data.get("category"),
      message: data.get("message"),
      risk: data.get("risk"),
      status: "未対応",
      createdAt: new Date().toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      completedAt: "",
      ...estimateNarashinoPoint(data.get("place")),
    };

    tickets = [ticket, ...tickets];
    selectedTicketId = ticket.id;
    saveTickets();
    renderReceipt(ticket);
    form.reset();
  });
}

if (seedButton) {
  seedButton.addEventListener("click", () => {
    const index = tickets.length % sampleTickets.length;
    const base = sampleTickets[index];
    const ticket = {
      ...base,
      id: nextId(),
      status: "未対応",
      createdAt: new Date().toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      completedAt: "",
      lat: base.lat,
      lng: base.lng,
    };
    tickets = [ticket, ...tickets];
    selectedTicketId = ticket.id;
    saveTickets();
    renderAll();
  });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    activeAdminPage = item.dataset.adminPage;
    renderAdminShell();
  });
});

if (syncButton) {
  syncButton.addEventListener("click", () => {
    const anonymousCount = tickets.length;
    const doneCount = tickets.filter((ticket) => ticket.status === "完了").length;
    const now = new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    syncLog = [
      `${now} 匿名統計 ${anonymousCount}件を同期、完了案件 ${doneCount}件を反映`,
      ...syncLog,
    ].slice(0, 6);
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncLog));
    renderSync();
  });
}

if (fitMapButton) {
  fitMapButton.addEventListener("click", () => focusFirstPendingTicket());
}

if (focusSelectedButton) {
  focusSelectedButton.addEventListener("click", () => focusSelectedOnMap());
}

if (notificationBell && notificationPanel) {
  notificationBell.addEventListener("click", () => {
    notificationPanel.hidden = !notificationPanel.hidden;
    renderNotifications();
  });
}

function loadTickets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return sampleTickets;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeTicket) : sampleTickets;
  } catch {
    return sampleTickets;
  }
}

function loadSyncLog() {
  const raw = localStorage.getItem(SYNC_KEY);
  if (!raw) return ["システム起動: ローカルDBを確認しました"];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : ["システム起動: ローカルDBを確認しました"];
  } catch {
    return ["システム起動: ローカルDBを確認しました"];
  }
}

function normalizeTicket(ticket) {
  return {
    id: ticket.id || nextId(),
    place: ticket.place || "場所未入力",
    category: ticket.category || "その他",
    message: ticket.message || "",
    risk: ticket.risk || "中",
    status: ticket.status || "未対応",
    createdAt: ticket.createdAt || "",
    completedAt: ticket.completedAt || "",
    lat: Number.isFinite(Number(ticket.lat)) ? Number(ticket.lat) : estimateNarashinoPoint(ticket.place).lat,
    lng: Number.isFinite(Number(ticket.lng)) ? Number(ticket.lng) : estimateNarashinoPoint(ticket.place).lng,
  };
}

function saveTickets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function nextId() {
  const max = tickets.reduce((value, ticket) => {
    const number = Number(String(ticket.id).replace("EC-", ""));
    return Number.isFinite(number) ? Math.max(value, number) : value;
  }, 0);
  return `EC-${String(max + 1).padStart(4, "0")}`;
}

function analyze(ticket) {
  const text = `${ticket.place} ${ticket.category} ${ticket.message}`;
  const hasAny = (words) => words.some((word) => text.includes(word));
  const evaluations = [
    evaluateAxis(text, "immediacy", "切迫性", 5, [
      { words: ["今", "すぐ", "倒れそう", "崩れそう", "漏電", "冠水して", "浸水して", "陥没", "通れない"], points: 5 },
      { words: ["危", "事故", "けが", "転倒", "怖"], points: 2 },
    ]),
    evaluateAxis(text, "damage", "被害の大きさ", 5, [
      { words: ["倒壊", "崩れ", "陥没", "冠水", "漏電", "ブロック塀", "ひび", "亀裂"], points: 4 },
      { words: ["段差", "滑", "水たまり", "暗", "見えにくい"], points: 2 },
    ]),
    evaluateAxis(text, "exposure", "人の多さ・弱者", 5, [
      { words: ["通学路", "学校", "保育", "子供", "高齢者", "駅前", "ロータリー"], points: 3 },
      { words: ["歩道", "公園", "交差点", "人が多い"], points: 2 },
    ]),
    evaluateAxis(text, "traffic", "交通影響", 4, [
      { words: ["車道", "交差点", "アンダーパス", "渋滞", "減速", "避ける"], points: 3 },
      { words: ["歩道", "駅", "ロータリー"], points: 1 },
    ]),
    evaluateAxis(text, "repeatability", "再発性・悪化", 3, [
      { words: ["毎日", "いつも", "短時間の雨", "雨の日", "夜になると"], points: 2 },
      { words: ["心配", "不安"], points: 1 },
    ]),
  ];
  const categoryWeights = {
    "防災・避難": 3,
    "河川・排水": 2,
    "道路・歩道": 2,
    街灯: 1,
    公園: 1,
    その他: 0,
  };
  const evaluationResults = evaluations;
  const categoryScore = categoryWeights[ticket.category] || 0;
  const score = evaluationResults.reduce((sum, item) => sum + item.value, 0) + categoryScore;
  const riskFlags = {
    immediateDanger: hasAny(["倒れそう", "崩れそう", "漏電", "冠水して", "浸水して", "陥没", "通れない"]),
    vulnerableTraffic: hasAny(["子供", "高齢者", "通学路", "学校"]) && hasAny(["車道", "交差点", "歩道", "駅前"]),
    structuralPublic: hasAny(["ひび", "亀裂", "ブロック塀", "倒壊", "崩れ"]) && hasAny(["通学路", "学校", "公園", "歩道", "駅前"]),
    discomfortOnly: !hasAny(["ひび", "亀裂", "倒れ", "崩れ", "陥没", "冠水", "漏電", "車道", "通学路", "子供", "高齢者", "転倒", "事故"]) && hasAny(["不安", "心配", "暗"]),
  };
  const priority = decidePriority(score, riskFlags);
  const verdict = priority >= 5
    ? "緊急対応"
    : priority === 4
      ? "早期対応"
      : priority === 3
        ? "通常確認"
        : priority === 2
          ? "経過観察"
          : "低優先";
  const departmentMap = {
    "道路・歩道": "道路維持課",
    街灯: "防犯交通課",
    公園: "公園緑地課",
    "河川・排水": "河川下水道課",
    "防災・避難": "危機管理課",
    その他: "市民相談課",
  };
  const tags = [
    ticket.category,
    priority >= 4 ? "即時確認" : "通常確認",
    text.includes("高齢者") || text.includes("子供") ? "要配慮者" : "生活環境",
    text.includes("雨") || text.includes("排水") ? "天候影響" : "平常時",
  ];

  return {
    priority,
    department: departmentMap[ticket.category] || "市民相談課",
    score,
    categoryScore,
    evaluations: evaluationResults,
    verdict,
    riskFlags,
    matchedSignals: evaluationResults.filter((item) => item.value > 0).map((item) => item.label),
    tags,
    summary: `${ticket.place}で「${ticket.category}」に関する投稿です。AIは切迫性・被害規模・人の多さ・交通影響・再発性を分けて評価し、優先度${priority}（${verdict}）と判定しました。`,
    action: recommendedAction(priority),
  };
}

function renderReceipt(ticket) {
  const result = analyze(ticket);
  if (!receiptPanel || !receiptSummary) return;
  receiptPanel.hidden = false;
  receiptSummary.innerHTML = `
    <dt>受付番号</dt><dd>${ticket.id}</dd>
    <dt>AI判定</dt><dd>優先度 ${result.priority} / 5 / ${result.department}</dd>
    <dt>体感</dt><dd>住民入力 ${ticket.risk}（AI判定とは別枠）</dd>
    <dt>次の対応</dt><dd>${result.action}</dd>
  `;
}

function renderAll() {
  renderAdminShell();
  renderCityMap();
  renderTable();
  renderDetail();
  renderMetrics();
  renderNotifications();
  renderDepartments();
  renderAnalytics();
  renderSync();
}

function renderAdminShell() {
  if (!navItems.length || !adminSections.length) return;
  const copy = {
    tickets: [`${CITY_NAME}の問い合わせ対応を整理する`, "AIが要約・優先度・担当課を整理し、対応完了まで地図と一覧で追跡します。"],
    sharing: [`${CITY_NAME}庁内で部署横断共有する`, "担当課ごとに案件を束ね、複数課で見るべき不安を見逃さないようにします。"],
    analytics: [`${CITY_NAME}の住民不安を分析する`, "カテゴリ、AI優先度、完了状況から都市課題の偏りを把握します。"],
    sync: [`${CITY_NAME}のローカルとクラウドを分けて運用する`, "個人情報は庁内に残し、匿名統計だけをクラウドへ同期します。"],
  };
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.adminPage === activeAdminPage));
  adminSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.adminSection === activeAdminPage);
  });
  if (adminPageTitle && adminPageLead) {
    adminPageTitle.textContent = copy[activeAdminPage][0];
    adminPageLead.textContent = copy[activeAdminPage][1];
  }
}

function renderCityMap() {
  if (!cityMapEl || !googleMapFrame) return;
  const selected = tickets.find((item) => item.id === selectedTicketId) || tickets[0];
  if (!selected) return;
  googleMapFrame.src = googleMapsEmbedUrl(selected);

  if (!mapTicketPins) return;
  mapTicketPins.innerHTML = tickets
    .map((ticket) => {
      const result = analyze(ticket);
      return `
        <button type="button" data-map-ticket="${ticket.id}" class="${ticket.id === selectedTicketId ? "active" : ""}">
          <span class="priority ${priorityClass(result.priority)}">${result.priority}</span>
          <div>
            <b>${ticket.place}</b>
            <small>${ticket.status} / ${ticket.lat.toFixed(4)}, ${ticket.lng.toFixed(4)}</small>
          </div>
        </button>
      `;
    })
    .join("");
  mapTicketPins.querySelectorAll("[data-map-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTicketId = button.dataset.mapTicket;
      renderCityMap();
      renderTable();
      renderDetail();
    });
  });
}

function googleMapsEmbedUrl(ticket) {
  const query = encodeURIComponent(`${ticket.lat},${ticket.lng}`);
  return `https://www.google.com/maps?q=${query}&z=18&output=embed`;
}

function focusFirstPendingTicket() {
  const pending = tickets
    .filter((ticket) => ticket.status !== "完了")
    .sort((a, b) => analyze(b).priority - analyze(a).priority);
  selectedTicketId = (pending[0] || tickets[0])?.id;
  renderCityMap();
  renderTable();
  renderDetail();
}

function focusSelectedOnMap() {
  const ticket = tickets.find((item) => item.id === selectedTicketId) || tickets[0];
  if (!ticket) return;
  if (googleMapFrame) googleMapFrame.src = googleMapsEmbedUrl(ticket);
  renderCityMap();
}

function renderTable() {
  if (!ticketTable) return;
  ticketTable.innerHTML = "";
  tickets.forEach((ticket) => {
    const result = analyze(ticket);
    const row = document.createElement("tr");
    row.classList.toggle("active-row", ticket.id === selectedTicketId);
    row.classList.toggle("done-row", ticket.status === "完了");
    row.innerHTML = `
      <td><span class="priority ${priorityClass(result.priority)}">${result.priority}</span></td>
      <td>${ticket.category}</td>
      <td>${ticket.place}</td>
      <td>${result.department}</td>
      <td><span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span></td>
    `;
    row.addEventListener("click", () => {
      selectedTicketId = ticket.id;
      renderCityMap();
      renderTable();
      renderDetail();
    });
    ticketTable.appendChild(row);
  });
}

function renderDetail() {
  if (!detailBody || !selectedId) return;
  const ticket = tickets.find((item) => item.id === selectedTicketId) || tickets[0];
  if (!ticket) return;
  const result = analyze(ticket);
  selectedId.textContent = ticket.id;
  const isDone = ticket.status === "完了";
  detailBody.innerHTML = `
    <div class="detail-status-line">
      <span class="priority ${priorityClass(result.priority)}">優先度 ${result.priority} / 5</span>
      <span class="verdict-pill">${result.verdict}</span>
      <span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span>
    </div>
    <div>
      <h3>要約</h3>
      <p>${result.summary}</p>
    </div>
    <div class="ai-reason-box">
      <h3>AI判定根拠</h3>
      <p>複数評価の合計スコア ${result.score} から5段階で算出 / 住民の体感不安度 ${ticket.risk} は参考として保持</p>
      <div class="evaluation-list">
        ${result.evaluations
          .map((item) => `
            <div class="evaluation-row">
              <span>${item.label}</span>
              <div><i style="width:${Math.round((item.value / item.max) * 100)}%"></i></div>
              <b>${item.value}/${item.max}</b>
            </div>
          `)
          .join("")}
        <div class="evaluation-row category-row">
          <span>カテゴリ補正</span>
          <div><i style="width:${Math.round((result.categoryScore / 3) * 100)}%"></i></div>
          <b>${result.categoryScore}/3</b>
        </div>
      </div>
      <p class="judge-note">${judgeReason(result)}</p>
      <div class="tag-row">
        ${(result.matchedSignals.length ? result.matchedSignals : ["明確な危険語は少ない"])
          .map((signal) => `<span>${signal}</span>`)
          .join("")}
      </div>
    </div>
    <div>
      <h3>住民投稿</h3>
      <p>${ticket.message}</p>
    </div>
    <div class="tag-row">
      ${result.tags.map((tag) => `<span>${tag}</span>`).join("")}
    </div>
    <div>
      <h3>推奨アクション</h3>
      <p>${isDone ? "対応完了済みです。必要に応じて完了記録を確認してください。" : result.action}</p>
    </div>
    <div class="ticket-meta">
      <span>受付: ${ticket.createdAt || "記録なし"}</span>
      <span>完了: ${ticket.completedAt || "未完了"}</span>
    </div>
    <div class="detail-actions">
      <button id="completeTicketButton" class="complete-action" type="button">${isDone ? "未対応に戻す" : "対応を完了にする"}</button>
      <button id="shareTicketButton" type="button">担当課共有にする</button>
      <button id="confirmTicketButton" type="button">確認中にする</button>
    </div>
  `;

  document.querySelector("#completeTicketButton")?.addEventListener("click", () => {
    updateTicket(ticket.id, {
      status: isDone ? "未対応" : "完了",
      completedAt: isDone ? "" : new Date().toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  });
  document.querySelector("#shareTicketButton")?.addEventListener("click", () => updateTicket(ticket.id, { status: "担当課共有" }));
  document.querySelector("#confirmTicketButton")?.addEventListener("click", () => updateTicket(ticket.id, { status: "確認中" }));
}

function updateTicket(id, patch) {
  tickets = tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket));
  saveTickets();
  renderAll();
}

function renderMetrics() {
  if (!metricOpen || !metricHigh || !metricDone || !metricDepartments) return;
  const departments = new Set(tickets.map((ticket) => analyze(ticket).department));
  metricOpen.textContent = tickets.filter((ticket) => ticket.status !== "完了").length;
  metricHigh.textContent = tickets.filter((ticket) => analyze(ticket).priority >= 4 && ticket.status !== "完了").length;
  metricDone.textContent = tickets.filter((ticket) => ticket.status === "完了").length;
  metricDepartments.textContent = departments.size;
}

function renderNotifications() {
  if (!notificationCount || !notificationPanel) return;
  const pending = tickets
    .filter((ticket) => ticket.status !== "完了")
    .sort((a, b) => analyze(b).priority - analyze(a).priority);
  notificationCount.textContent = pending.length;
  notificationCount.hidden = pending.length === 0;
  notificationPanel.innerHTML = `
    <div class="notification-head">
      <strong>問い合わせ通知</strong>
      <span>${pending.length}件</span>
    </div>
    ${
      pending.length
        ? `<ul>${pending
            .slice(0, 8)
            .map((ticket) => {
              const result = analyze(ticket);
              return `
                <li>
                  <button type="button" data-notification-ticket="${ticket.id}">
                    <span class="priority ${priorityClass(result.priority)}">${result.priority}</span>
                    <div>
                      <b>${ticket.place}</b>
                      <small>${ticket.category}・${ticket.status}</small>
                    </div>
                  </button>
                </li>
              `;
            })
            .join("")}</ul>`
        : `<p>未完了の通知はありません。</p>`
    }
  `;
  notificationPanel.querySelectorAll("[data-notification-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTicketId = button.dataset.notificationTicket;
      activeAdminPage = "tickets";
      notificationPanel.hidden = true;
      renderAll();
      focusSelectedOnMap();
    });
  });
}

function renderDepartments() {
  if (!departmentBoard) return;
  const groups = groupBy(tickets, (ticket) => analyze(ticket).department);
  departmentBoard.innerHTML = Object.entries(groups)
    .map(([department, items]) => {
      const open = items.filter((ticket) => ticket.status !== "完了");
      return `
        <article class="department-card">
          <div class="department-card-head">
            <div>
              <h3>${department}</h3>
              <p>未完了 ${open.length}件 / 全${items.length}件</p>
            </div>
            <span>${open.length ? "要確認" : "完了"}</span>
          </div>
          <ul>
            ${items
              .slice(0, 4)
              .map((ticket) => {
                const result = analyze(ticket);
                return `
                  <li>
                    <button type="button" data-select-ticket="${ticket.id}">
                      <b>${ticket.place}</b>
                      <small>優先度${result.priority}・${ticket.status}</small>
                    </button>
                  </li>
                `;
              })
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");

  departmentBoard.querySelectorAll("[data-select-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTicketId = button.dataset.selectTicket;
      activeAdminPage = "tickets";
      renderAll();
    });
  });
}

function renderAnalytics() {
  if (!categoryChart || !riskChart || !statusChart || !tagCloud) return;
  renderBarChart(categoryChart, countBy(tickets, (ticket) => ticket.category));
  renderRiskChart();
  renderStatusCards();
  renderTagCloud();
}

function renderBarChart(container, counts) {
  const max = Math.max(1, ...Object.values(counts));
  container.innerHTML = Object.entries(counts)
    .map(([label, value]) => `
      <div class="bar-row">
        <span>${label}</span>
        <div><i style="width:${Math.round((value / max) * 100)}%"></i></div>
        <b>${value}</b>
      </div>
    `)
    .join("");
}

function renderRiskChart() {
  const counts = countBy(tickets, (ticket) => analyze(ticket).priority);
  const total = Math.max(1, tickets.length);
  riskChart.innerHTML = [5, 4, 3, 2, 1]
    .map((risk) => {
      const value = counts[risk] || 0;
      return `
        <article>
          <span class="priority ${priorityClass(risk)}">${risk}</span>
          <strong>${value}件</strong>
          <div><i style="width:${Math.round((value / total) * 100)}%"></i></div>
        </article>
      `;
    })
    .join("");
}

function renderStatusCards() {
  const counts = countBy(tickets, (ticket) => ticket.status);
  statusChart.innerHTML = ["未対応", "確認中", "担当課共有", "完了"]
    .map((status) => `
      <article>
        <span class="status-pill ${statusClass(status)}">${status}</span>
        <strong>${counts[status] || 0}</strong>
      </article>
    `)
    .join("");
}

function renderTagCloud() {
  const tags = tickets.flatMap((ticket) => analyze(ticket).tags);
  const counts = countBy(tags, (tag) => tag);
  tagCloud.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, value]) => `<span>${tag}<b>${value}</b></span>`)
    .join("");
}

function renderSync() {
  if (!localCount || !cloudCount || !lastSync || !syncLogList) return;
  localCount.textContent = `${tickets.length}件`;
  cloudCount.textContent = `${tickets.length}件`;
  lastSync.textContent = syncLog[0]?.startsWith("システム起動") ? "未実行" : syncLog[0]?.split(" 匿名統計")[0] || "未実行";
  syncLogList.innerHTML = syncLog.map((log) => `<li>${log}</li>`).join("");
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function priorityClass(priority) {
  if (priority >= 5) return "p5";
  if (priority === 4) return "p4";
  if (priority === 3) return "p3";
  if (priority === 2) return "p2";
  return "p1";
}

function estimateNarashinoPoint(place) {
  const text = String(place || "");
  const knownPlaces = [
    { keys: ["津田沼駅", "津田沼"], lat: 35.6914, lng: 140.0203 },
    { keys: ["新津田沼"], lat: 35.6905, lng: 140.0237 },
    { keys: ["京成津田沼"], lat: 35.6834, lng: 140.0242 },
    { keys: ["谷津干潟"], lat: 35.6741, lng: 140.0059 },
    { keys: ["谷津駅", "谷津"], lat: 35.6851, lng: 140.0077 },
    { keys: ["実籾駅", "実籾"], lat: 35.6868, lng: 140.0691 },
    { keys: ["新習志野駅", "新習志野"], lat: 35.6675, lng: 140.0127 },
    { keys: ["京成大久保", "大久保"], lat: 35.6859, lng: 140.0495 },
    { keys: ["幕張本郷"], lat: 35.6728, lng: 140.0425 },
    { keys: ["市役所", "鷺沼"], lat: 35.6812, lng: 140.0265 },
    { keys: ["香澄"], lat: 35.6609, lng: 140.0178 },
    { keys: ["袖ケ浦", "袖ヶ浦"], lat: 35.6701, lng: 140.0197 },
    { keys: ["秋津"], lat: 35.6652, lng: 140.0082 },
    { keys: ["茜浜"], lat: 35.6538, lng: 140.0194 },
    { keys: ["東習志野"], lat: 35.6981, lng: 140.0663 },
    { keys: ["藤崎"], lat: 35.6891, lng: 140.0346 },
    { keys: ["屋敷"], lat: 35.6798, lng: 140.0419 },
    { keys: ["泉町"], lat: 35.6915, lng: 140.0537 },
    { keys: ["本大久保"], lat: 35.6847, lng: 140.0428 },
    { keys: ["花咲"], lat: 35.6761, lng: 140.0473 },
  ];
  const match = knownPlaces.find((entry) => entry.keys.some((key) => text.includes(key)));
  if (match) return { lat: match.lat, lng: match.lng };
  const hash = Array.from(text || "narashino").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    lat: 35.6811 + ((hash % 19) - 9) * 0.001,
    lng: 140.0266 + ((hash % 21) - 10) * 0.0014,
  };
}

function evaluateAxis(text, key, label, max, rules) {
  const raw = rules.reduce((sum, rule) => {
    return sum + (rule.words.some((word) => text.includes(word)) ? rule.points : 0);
  }, 0);
  return {
    key,
    label,
    max,
    value: Math.min(max, raw),
  };
}

function decidePriority(score, flags) {
  if (flags.immediateDanger || flags.structuralPublic) return 5;
  if (flags.vulnerableTraffic) return 4;
  let priority = score >= 14 ? 5 : score >= 10 ? 4 : score >= 6 ? 3 : score >= 3 ? 2 : 1;
  if (flags.discomfortOnly) priority = Math.min(priority, 3);
  return priority;
}

function recommendedAction(priority) {
  if (priority >= 5) return "即日確認。危険箇所の一時封鎖・注意喚起・担当課への緊急共有を検討";
  if (priority === 4) return "24時間以内に現地確認。必要に応じて注意喚起と補修予定化";
  if (priority === 3) return "3営業日以内に確認し、類似投稿や過去対応履歴と統合して判断";
  if (priority === 2) return "通常巡回時に確認。再発投稿が増えた場合は優先度を引き上げ";
  return "記録として保存。追加投稿や写真が届いた場合に再評価";
}

function judgeReason(result) {
  const flags = result.riskFlags;
  if (flags.immediateDanger) return "即時危険を示す語があるため、点数に関係なく最上位にしています。";
  if (flags.structuralPublic) return "構造破損と公共利用地点が重なっているため、重大事故の予防として最上位にしています。";
  if (flags.vulnerableTraffic) return "子供・高齢者などの要配慮者と交通/歩行リスクが重なっているため、早期対応にしています。";
  if (flags.discomfortOnly) return "不安表現のみで具体的な事故兆候が少ないため、過大評価を抑えています。";
  return "複数評価の合計点から、通常の基準で優先度を算出しています。";
}

function statusClass(status) {
  if (status === "完了") return "done";
  if (status === "確認中") return "checking";
  if (status === "担当課共有") return "shared";
  return "open";
}

renderAll();
