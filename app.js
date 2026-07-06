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
  carrusel: "📑 "
};

function renderTags(tags) {
  return tags
    .map((tag) => {
      const slug = slugify(tag);
      const isPendiente = slug === "pendiente";
      const icon = Object.keys(TAG_ICONS).find((key) => slug === key || (key === "pautar" && slug.startsWith("pautar")));
      return `<span class="tag tag--${slug}${isPendiente ? " tag--pendiente" : ""}">${icon ? TAG_ICONS[icon] : ""}${tag}</span>`;
    })
    .join("");
}

function renderItem(unitId, monthKey, item) {
  const isPendiente = item.tags.includes("pendiente");
  const isColaboracion = item.tags.includes("colaboración");
  const classes = [
    "card-item",
    isPendiente ? "card-item--pendiente" : "",
    isColaboracion ? "card-item--colaboracion" : "",
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

  return `
    <li class="${classes}">
      <div class="item-tags">${renderTags(item.tags)}</div>
      ${metaHtml}
      <h4 class="item-title">${item.title}</h4>
      ${descHtml}
      ${statsHtml}
      ${badgesHtml}
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
  const unit = UNITS.find((u) => u.id === unitId);
  if (unit) {
    currentUnitId = unitId;
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
    if (!monthBtn) return;
    setActiveMonth(monthBtn.dataset.month);
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
  tabs.innerHTML = UNITS.map(
    (unit) => `<button class="tab" role="tab" data-unit="${unit.id}" style="--tab-accent:${unit.accent}">${unit.name}</button>`
  ).join("");

  tabs.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.unit));
  });
}

function init() {
  renderTabs();
  initMonthTabs();
  initPanelModal();
  const fromHash = window.location.hash.replace("#", "");
  const initialUnit = UNITS.find((u) => u.id === fromHash) ? fromHash : UNITS[0].id;
  setActiveTab(initialUnit);
}

init();
