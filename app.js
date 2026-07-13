// Render del dashboard a partir de UNITS (data.js). Panel colaborativo sincronizado con Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCisQKYV9V1nZUIOqYguSgwY8V50HzLMZc",
  authDomain: "planificacion-mkt-gala.firebaseapp.com",
  projectId: "planificacion-mkt-gala",
  storageBucket: "planificacion-mkt-gala.firebasestorage.app",
  messagingSenderId: "432195342946",
  appId: "1:432195342946:web:9f60a12f79f116decbb73b"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const MONTH_LABELS = { junio: "Junio", julio: "Julio", agosto: "Agosto", septiembre: "Septiembre" };
const MONTH_ORDER = ["junio", "julio", "agosto", "septiembre"];

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isValidUrl(value) {
  return typeof value === "string" && /^https?:\/\/\S+/i.test(value.trim());
}

function escapeAttr(value) {
  return String(value).replace(/"/g, "&quot;");
}

// ---------- Panel colaborativo (sincronizado en tiempo real con Firestore) ----------

const PANEL_DEFAULT_STATE = { copy: "", drive: "", tasks: [], terminado: false, publicado: false, pautado: false, sugerencia: "" };

function panelKey(unitId, monthKey, item) {
  return unitId + "::" + monthKey + "::" + slugify(item.title + "-" + (item.meta || ""));
}

let panelCache = {};
let unsubscribePanels = null;

function getPanelState(key) {
  return Object.assign({}, PANEL_DEFAULT_STATE, panelCache[key] || {});
}

function subscribeToUnitPanels(unitId) {
  if (unsubscribePanels) {
    unsubscribePanels();
    unsubscribePanels = null;
  }
  panelCache = {};
  const q = query(collection(db, "panels"), where("unitId", "==", unitId));
  unsubscribePanels = onSnapshot(
    q,
    (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      panelCache = next;
      if (currentUnitId === unitId) {
        if (unitId === "desarrollo") {
          renderDevelopment();
          return;
        }
        const unit = UNITS.find((u) => u.id === unitId);
        if (unit) renderUnit(unit);
      }
    },
    (err) => {
      console.error("Error al sincronizar el panel colaborativo:", err);
    }
  );
}

async function savePanelToFirestore(key, unitId, monthKey, state) {
  await setDoc(
    doc(db, "panels", key),
    Object.assign({}, state, { unitId, monthKey, updatedAt: serverTimestamp() }),
    { merge: true }
  );
}

const TAG_ICONS = {
  pautar: "📣 ",
  "auto-detectado": "🔍 ",
  reel: "🎬 ",
  flyer: "🖼️ ",
  carrusel: "📑 ",
  "planificado-no-publicado": "⏳ "
};

function renderTags(tags) {
  return tags
    .map((tag) => {
      const slug = slugify(tag);
      const isPendiente = slug === "pendiente";
      const isNoPublicado = slug === "planificado-no-publicado";
      const icon = Object.keys(TAG_ICONS).find((key) => slug === key || (key === "pautar" && slug.startsWith("pautar")));
      return `<span class="tag tag--${slug}${isPendiente ? " tag--pendiente" : ""}${isNoPublicado ? " tag--no-publicado" : ""}">${icon ? TAG_ICONS[icon] : ""}${tag}</span>`;
    })
    .join("");
}

function renderItem(unitId, monthKey, item) {
  const isPendiente = item.tags.includes("pendiente");
  const isColaboracion = item.tags.includes("colaboración");
  const isNoPublicado = item.tags.includes("planificado, no publicado");
  const classes = [
    "card-item",
    isPendiente ? "card-item--pendiente" : "",
    isColaboracion ? "card-item--colaboracion" : "",
    isNoPublicado ? "card-item--no-publicado" : "",
    item.highlight ? "card-item--highlight" : ""
  ].filter(Boolean).join(" ");

  const metaHtml = item.meta ? `<div class="item-meta">${item.highlight ? "★ " : ""}${item.meta}</div>` : (item.highlight ? `<div class="item-meta">★</div>` : "");
  const descHtml = item.desc ? `<p class="item-desc">${item.desc}</p>` : "";
  const statsHtml = (typeof item.likes === "number" || typeof item.views === "number")
    ? `<div class="item-stats">${typeof item.likes === "number" ? `<span>❤ ${item.likes}</span>` : ""}${typeof item.views === "number" ? `<span>▶ ${item.views}</span>` : ""}${typeof item.comments === "number" ? `<span>💬 ${item.comments}</span>` : ""}</div>`
    : "";

  const key = panelKey(unitId, monthKey, item);
  const panel = getPanelState(key);
  const taskTotal = (panel.tasks || []).length;
  const taskDone = (panel.tasks || []).filter((t) => t.done).length;
  const badges = [
    panel.terminado ? `<span class="status-badge status-badge--terminado">✓ Terminado</span>` : "",
    panel.publicado ? `<span class="status-badge status-badge--publicado">✓ Publicado</span>` : "",
    panel.pautado ? `<span class="status-badge status-badge--pautado">✓ Pautado</span>` : "",
    taskTotal > 0 ? `<span class="status-badge status-badge--tasks${taskDone === taskTotal ? " status-badge--tasks-complete" : ""}">☑ ${taskDone}/${taskTotal} tareas</span>` : ""
  ].filter(Boolean).join("");
  const badgesHtml = badges ? `<div class="status-badges">${badges}</div>` : "";
  const driveHtml = isValidUrl(panel.drive)
    ? `<a href="${escapeAttr(panel.drive)}" target="_blank" rel="noopener noreferrer" class="item-drive-link">📁 Ver en Drive ↗</a>`
    : "";

  return `
    <li class="${classes}">
      <div class="item-tags">${renderTags(item.tags)}</div>
      ${metaHtml}
      <h4 class="item-title">${item.title}</h4>
      ${descHtml}
      ${statsHtml}
      ${badgesHtml}
      ${driveHtml}
      <button type="button" class="card-item__manage" data-panel-key="${key}" data-panel-unit="${unitId}" data-panel-month="${monthKey}" data-panel-title="${item.title.replace(/"/g, "&quot;")}" data-panel-subtitle="${(item.meta || "").replace(/"/g, "&quot;")}">⚙ Gestionar</button>
    </li>
  `;
}

function renderCardsGrid(unitId, monthKey, items) {
  if (!items || items.length === 0) {
    return `<p class="cards-empty">Sin publicaciones registradas este mes.</p>`;
  }
  return `<ul class="cards-grid">${items.map((item) => renderItem(unitId, monthKey, item)).join("")}</ul>`;
}

function renderMonthTabs(unitId) {
  return `
    <div class="month-tabs" role="tablist" aria-label="Mes">
      ${MONTH_ORDER.map(
        (m) => `<button type="button" class="month-tab${m === currentMonthKey ? " month-tab--active" : ""}" role="tab" aria-selected="${m === currentMonthKey}" data-month="${m}">${MONTH_LABELS[m]}</button>`
      ).join("")}
    </div>
  `;
}

// ---------- Rendimiento por unidad (Facebook + Instagram, orgánico) ----------

const METRICS_DAYS_OPTIONS = [7, 15, 30, 60, 90];
let currentMetricsDays = 30;

function setMetricsDays(days) {
  days = parseInt(days, 10);
  if (days === currentMetricsDays) return;
  currentMetricsDays = days;
  if (currentUnitId && currentUnitId !== "inicio" && currentUnitId !== "desarrollo") {
    const unit = UNITS.find((u) => u.id === currentUnitId);
    if (unit) renderUnit(unit);
  }
}

function unitHasPerformanceHistory(unit) {
  return Boolean(unit.performance && unit.performance.history && unit.performance.history.length > 0);
}

function historyInRange(unit, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  return (unit.performance.history || [])
    .filter((day) => {
      const d = new Date(day.date + "T00:00:00");
      return d >= cutoff && d <= today;
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function computePerformance(unit, days) {
  const days_ = historyInRange(unit, days);
  const sum = (key) => days_.reduce((acc, d) => acc + (typeof d[key] === "number" ? d[key] : 0), 0);
  const latest = days_[days_.length - 1];
  const earliest = days_[0];
  const followersGrowth = latest && earliest && typeof latest.followers === "number" && typeof earliest.followers === "number"
    ? latest.followers - earliest.followers
    : null;
  return {
    days: days_,
    totalViews: sum("views"),
    totalInteractions: sum("interactions"),
    totalReach: sum("reach"),
    totalProfileViews: sum("profileViews"),
    igFollowers: latest ? latest.followers : null,
    fbFollowers: latest ? latest.fbFollowers : null,
    followersGrowth
  };
}

function getTopContent(unit, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const posts = [];
  for (const monthKey of MONTH_ORDER) {
    for (const item of unit.months[monthKey] || []) {
      if (typeof item.likes !== "number") continue;
      const date = parseMetaDate(item.meta);
      if (!date || date < cutoff || date > today) continue;
      posts.push(item);
    }
  }
  return posts
    .sort((a, b) => (b.views || 0) - (a.views || 0) || (b.likes || 0) - (a.likes || 0))
    .slice(0, 5);
}

function renderPerformanceChart(days_) {
  if (days_.length === 0) return "";
  const width = 600;
  const height = 160;
  const padding = 10;
  const maxViews = Math.max(1, ...days_.map((d) => d.views || 0));
  const points = days_.map((d, i) => {
    const x = days_.length === 1 ? width / 2 : padding + (i / (days_.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.views || 0) / maxViews) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = points.join(" ");
  const areaPath = `M${padding},${height - padding} L${points.join(" L")} L${width - padding},${height - padding} Z`;
  const dots = days_
    .map((d, i) => {
      const [x, y] = points[i].split(",");
      return `<circle cx="${x}" cy="${y}" r="3" class="rendimiento-chart__dot"><title>${d.date}: ${(d.views || 0).toLocaleString("es-AR")} visualizaciones</title></circle>`;
    })
    .join("");
  return `
    <div class="rendimiento-chart">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Visualizaciones por día">
        <path d="${areaPath}" class="rendimiento-chart__area"></path>
        <polyline points="${polyline}" class="rendimiento-chart__line"></polyline>
        ${dots}
      </svg>
    </div>
  `;
}

function renderTopContent(unit, days) {
  const top = getTopContent(unit, days);
  if (top.length === 0) return "";
  return `
    <div class="rendimiento-top">
      <h4 class="rendimiento-top__title">Contenido destacado</h4>
      <ul class="rendimiento-top__list">
        ${top
          .map(
            (item) => `
              <li class="rendimiento-top__item">
                <span class="rendimiento-top__meta">${item.meta || ""}</span>
                <span class="rendimiento-top__post-title">${item.title}</span>
                <div class="rendimiento-top__stats">
                  ${typeof item.views === "number" ? `<span>▶ ${item.views.toLocaleString("es-AR")}</span>` : ""}
                  <span>❤ ${item.likes.toLocaleString("es-AR")}</span>
                  ${typeof item.comments === "number" ? `<span>💬 ${item.comments.toLocaleString("es-AR")}</span>` : ""}
                  ${typeof item.shares === "number" ? `<span>↗ ${item.shares.toLocaleString("es-AR")}</span>` : ""}
                </div>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function renderMetrics(unit) {
  const filterHtml = `
    <div class="metrics-filter" role="tablist" aria-label="Rango de días">
      ${METRICS_DAYS_OPTIONS.map(
        (days) => `<button type="button" class="metrics-filter__btn${days === currentMetricsDays ? " metrics-filter__btn--active" : ""}" data-days="${days}">${days} días</button>`
      ).join("")}
    </div>
  `;

  if (!unitHasPerformanceHistory(unit)) {
    return `
      <section class="metrics-section">
        <div class="metrics-header">
          <h3 class="metrics-title">Rendimiento</h3>
          ${filterHtml}
        </div>
        <p class="metrics-empty">Todavía no hay datos de rendimiento — se empieza a acumular desde hoy.</p>
      </section>
    `;
  }

  const p = computePerformance(unit, currentMetricsDays);
  const followersGrowthHtml = p.followersGrowth === null
    ? ""
    : `<span class="rendimiento-followers__growth${p.followersGrowth >= 0 ? " rendimiento-followers__growth--up" : " rendimiento-followers__growth--down"}">${p.followersGrowth >= 0 ? "↑" : "↓"} ${Math.abs(p.followersGrowth).toLocaleString("es-AR")}</span>`;

  return `
    <section class="metrics-section">
      <div class="metrics-header">
        <h3 class="metrics-title">Rendimiento</h3>
        ${filterHtml}
      </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-value">${p.totalViews.toLocaleString("es-AR")}</span>
          <span class="metric-label">▶ Visualizaciones</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">${p.totalInteractions.toLocaleString("es-AR")}</span>
          <span class="metric-label">💬 Interacciones con el contenido</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">${p.totalReach.toLocaleString("es-AR")}</span>
          <span class="metric-label">👁 Alcance</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">${p.totalProfileViews.toLocaleString("es-AR")}</span>
          <span class="metric-label">👤 Visitas al perfil</span>
        </div>
      </div>
      ${renderPerformanceChart(p.days)}
      <div class="rendimiento-followers">
        ${typeof p.igFollowers === "number" ? `<div class="rendimiento-followers__item"><span class="rendimiento-followers__label">Instagram</span><span class="rendimiento-followers__value">${p.igFollowers.toLocaleString("es-AR")}</span>${followersGrowthHtml}</div>` : ""}
        ${typeof p.fbFollowers === "number" ? `<div class="rendimiento-followers__item"><span class="rendimiento-followers__label">Facebook</span><span class="rendimiento-followers__value">${p.fbFollowers.toLocaleString("es-AR")}</span></div>` : ""}
      </div>
      ${renderTopContent(unit, currentMetricsDays)}
    </section>
  `;
}

// ---------- Home: próximas publicaciones ----------

const MONTH_NUM = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

function parseMetaDate(meta) {
  const match = /^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.exec(meta || "");
  if (!match) return null;
  const month = MONTH_NUM[match[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(2026, month, parseInt(match[1], 10));
}

function getUpcomingForUnit(unit, limit) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [];
  for (const monthKey of MONTH_ORDER) {
    for (const item of unit.months[monthKey] || []) {
      if (typeof item.likes === "number") continue; // ya publicado, no es "próxima"
      const date = parseMetaDate(item.meta);
      if (!date || date < today) continue;
      upcoming.push({ item, date });
    }
  }
  upcoming.sort((a, b) => a.date - b.date);
  return upcoming.slice(0, limit).map((u) => u.item);
}

function renderHome() {
  const content = document.getElementById("content");
  document.documentElement.style.setProperty("--accent", "#C9A84C");

  const cardsHtml = UNITS.map((unit) => {
    const upcoming = getUpcomingForUnit(unit, 2);
    const logoHtml = unit.logo ? `<img src="${unit.logo}" alt="${unit.name}" class="home-unit-logo" />` : "";
    const itemsHtml = upcoming.length
      ? upcoming
          .map(
            (item) => `
              <li class="home-alert-item">
                <span class="home-alert-date">${item.meta}</span>
                <span class="home-alert-title">${item.title}</span>
                <div class="home-alert-tags">${renderTags(item.tags)}</div>
              </li>
            `
          )
          .join("")
      : `<li class="home-alert-empty">Sin próximas publicaciones cargadas.</li>`;

    return `
      <div class="home-unit-card" style="--accent:${unit.accent}">
        <div class="home-unit-card__header">
          ${logoHtml}
          <span class="home-unit-card__name">${unit.name}</span>
        </div>
        <ul class="home-alert-list">${itemsHtml}</ul>
      </div>
    `;
  }).join("");

  content.innerHTML = `
    <div class="home-header">
      <h2 class="home-title">Próximas publicaciones</h2>
      <p class="home-subtitle">Las próximas 2 piezas pendientes de cada unidad</p>
    </div>
    <div class="home-grid">${cardsHtml}</div>
  `;
}

function renderInfoBlock(unit) {
  const rows = [];
  if (unit.objective) rows.push(`<div class="info-row"><span class="info-label">Objetivo estratégico</span><p class="info-value info-value--objective">“${unit.objective}”</p></div>`);
  if (unit.pilares) rows.push(`<div class="info-row"><span class="info-label">Pilares de contenido</span><p class="info-value">${unit.pilares}</p></div>`);
  if (unit.channels) rows.push(`<div class="info-row"><span class="info-label">Canales activos</span><p class="info-value">${unit.channels}</p></div>`);
  if (rows.length === 0) return "";
  return `<div class="info-block">${rows.join("")}</div>`;
}

function renderUnit(unit) {
  const content = document.getElementById("content");
  document.documentElement.style.setProperty("--accent", unit.accent);

  const logoHtml = unit.logo ? `<img src="${unit.logo}" alt="${unit.name}" class="unit-logo" />` : "";

  content.innerHTML = `
    <div class="unit-header">
      ${logoHtml}
      <h2 class="unit-title">${unit.name}</h2>
    </div>
    ${renderInfoBlock(unit)}
    ${renderMonthTabs(unit.id)}
    ${renderCardsGrid(unit.id, currentMonthKey, unit.months[currentMonthKey])}
    ${renderMetrics(unit)}
  `;
}

const DEV_MONTH_KEY = "general";

function renderDevelopment() {
  const content = document.getElementById("content");
  document.documentElement.style.setProperty("--accent", "#C9A84C");

  content.innerHTML = `
    <div class="unit-header">
      <h2 class="unit-title">Desarrollo</h2>
    </div>
    ${renderCardsGrid("desarrollo", DEV_MONTH_KEY, DEV_TASKS)}
  `;
}

let currentUnitId = null;
let currentMonthKey = "julio";

function setActiveMonth(monthKey) {
  if (monthKey === currentMonthKey) return;
  currentMonthKey = monthKey;
  if (currentUnitId) {
    const unit = UNITS.find((u) => u.id === currentUnitId);
    if (unit) renderUnit(unit);
  }
}

function setActiveTab(unitId) {
  document.querySelectorAll(".tab").forEach((btn) => {
    const active = btn.dataset.unit === unitId;
    btn.classList.toggle("tab--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  currentUnitId = unitId;

  if (unitId === "inicio") {
    if (unsubscribePanels) {
      unsubscribePanels();
      unsubscribePanels = null;
    }
    renderHome();
    history.replaceState(null, "", "#inicio");
    return;
  }

  if (unitId === "desarrollo") {
    renderDevelopment();
    subscribeToUnitPanels(unitId);
    history.replaceState(null, "", "#desarrollo");
    return;
  }

  const unit = UNITS.find((u) => u.id === unitId);
  if (unit) {
    renderUnit(unit);
    subscribeToUnitPanels(unitId);
    history.replaceState(null, "", `#${unitId}`);
  }
}

// ---------- Modal del panel colaborativo ----------

let activePanelKey = null;
let activePanelUnitId = null;
let activePanelMonthKey = null;
let currentTasks = [];

function renderTaskList() {
  const list = document.getElementById("panel-tasks");
  if (currentTasks.length === 0) {
    list.innerHTML = `<li class="panel-tasks__empty">Todavía no hay tareas cargadas.</li>`;
    return;
  }
  list.innerHTML = currentTasks
    .map(
      (t) => `
        <li class="panel-tasks__item${t.done ? " panel-tasks__item--done" : ""}" data-task-id="${t.id}">
          <label>
            <input type="checkbox" class="panel-tasks__check" data-task-id="${t.id}" ${t.done ? "checked" : ""} />
            <span class="panel-tasks__text">${t.text}</span>
          </label>
          <button type="button" class="panel-tasks__delete" data-task-id="${t.id}" aria-label="Eliminar tarea">✕</button>
        </li>
      `
    )
    .join("");
}

function addTask() {
  const input = document.getElementById("panel-task-input");
  const text = input.value.trim();
  if (!text) return;
  currentTasks.push({ id: String(Date.now()) + Math.random().toString(36).slice(2), text, done: false });
  input.value = "";
  renderTaskList();
}

function updateDriveOpenLink() {
  const input = document.getElementById("panel-drive");
  const link = document.getElementById("panel-drive-open");
  if (isValidUrl(input.value)) {
    link.href = input.value.trim();
    link.hidden = false;
  } else {
    link.hidden = true;
    link.removeAttribute("href");
  }
}

function openPanelModal(key, unitId, monthKey, title, subtitle) {
  const state = getPanelState(key);
  activePanelKey = key;
  activePanelUnitId = unitId;
  activePanelMonthKey = monthKey;
  currentTasks = (state.tasks || []).map((t) => Object.assign({}, t));
  document.getElementById("panel-modal-title").textContent = title;
  document.getElementById("panel-modal-subtitle").textContent = subtitle || "";
  document.getElementById("panel-copy").value = state.copy;
  document.getElementById("panel-drive").value = state.drive;
  updateDriveOpenLink();
  document.getElementById("panel-terminado").checked = state.terminado;
  document.getElementById("panel-publicado").checked = state.publicado;
  document.getElementById("panel-pautado").checked = state.pautado;
  document.getElementById("panel-sugerencia").value = state.sugerencia;
  renderTaskList();
  const errorEl = document.getElementById("panel-modal-error");
  errorEl.hidden = true;
  errorEl.textContent = "";
  document.getElementById("panel-modal").hidden = false;
}

function closePanelModal() {
  document.getElementById("panel-modal").hidden = true;
  activePanelKey = null;
  activePanelUnitId = null;
  activePanelMonthKey = null;
  currentTasks = [];
}

async function savePanelModal() {
  if (!activePanelKey) return;
  const state = {
    copy: document.getElementById("panel-copy").value,
    drive: document.getElementById("panel-drive").value,
    tasks: currentTasks,
    terminado: document.getElementById("panel-terminado").checked,
    publicado: document.getElementById("panel-publicado").checked,
    pautado: document.getElementById("panel-pautado").checked,
    sugerencia: document.getElementById("panel-sugerencia").value
  };
  const saveBtn = document.getElementById("panel-save");
  const errorEl = document.getElementById("panel-modal-error");
  saveBtn.disabled = true;
  saveBtn.textContent = "Guardando...";
  try {
    await savePanelToFirestore(activePanelKey, activePanelUnitId, activePanelMonthKey, state);
    closePanelModal();
  } catch (err) {
    console.error("Error al guardar el panel:", err);
    errorEl.textContent = "No se pudo guardar. Revisá tu conexión e intentá de nuevo.";
    errorEl.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Guardar";
  }
}

function initMonthTabs() {
  document.getElementById("content").addEventListener("click", (e) => {
    const monthBtn = e.target.closest(".month-tab");
    if (monthBtn) {
      setActiveMonth(monthBtn.dataset.month);
      return;
    }
    const metricsBtn = e.target.closest(".metrics-filter__btn");
    if (metricsBtn) {
      setMetricsDays(metricsBtn.dataset.days);
    }
  });
}

function initPanelModal() {
  document.getElementById("content").addEventListener("click", (e) => {
    const btn = e.target.closest(".card-item__manage");
    if (!btn) return;
    openPanelModal(btn.dataset.panelKey, btn.dataset.panelUnit, btn.dataset.panelMonth, btn.dataset.panelTitle, btn.dataset.panelSubtitle);
  });

  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closePanelModal);
  });

  document.getElementById("panel-save").addEventListener("click", savePanelModal);
  document.getElementById("panel-drive").addEventListener("input", updateDriveOpenLink);

  document.getElementById("panel-task-add").addEventListener("click", addTask);
  document.getElementById("panel-task-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  });

  document.getElementById("panel-tasks").addEventListener("click", (e) => {
    const del = e.target.closest(".panel-tasks__delete");
    if (del) {
      currentTasks = currentTasks.filter((t) => t.id !== del.dataset.taskId);
      renderTaskList();
    }
  });

  document.getElementById("panel-tasks").addEventListener("change", (e) => {
    const check = e.target.closest(".panel-tasks__check");
    if (!check) return;
    const task = currentTasks.find((t) => t.id === check.dataset.taskId);
    if (task) task.done = check.checked;
    renderTaskList();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("panel-modal").hidden) closePanelModal();
  });
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  const homeTab = `<button class="tab tab--home" role="tab" data-unit="inicio">Inicio</button>`;
  const unitTabs = UNITS.map(
    (unit) => `<button class="tab" role="tab" data-unit="${unit.id}" style="--tab-accent:${unit.accent}">${unit.name}</button>`
  ).join("");
  const devTab = `<button class="tab" role="tab" data-unit="desarrollo">Desarrollo</button>`;
  tabs.innerHTML = homeTab + unitTabs + devTab;

  tabs.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.unit));
  });
}

function init() {
  renderTabs();
  initMonthTabs();
  initPanelModal();
  const fromHash = window.location.hash.replace("#", "");
  const validIds = ["inicio"].concat(UNITS.map((u) => u.id), ["desarrollo"]);
  const initialUnit = validIds.includes(fromHash) ? fromHash : "inicio";
  setActiveTab(initialUnit);
}

init();
