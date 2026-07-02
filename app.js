// Render del dashboard a partir de UNITS (data.js). Sin backend, sin build step.

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

// ---------- Panel colaborativo (prototipo, guardado local en el navegador) ----------

const PANEL_STORAGE_PREFIX = "galaDashboardPanel::";
const PANEL_DEFAULT_STATE = { copy: "", drive: "", terminado: false, publicado: false, pautado: false, sugerencia: "" };

function panelKey(unitId, monthKey, item) {
  return unitId + "::" + monthKey + "::" + slugify(item.title + "-" + (item.meta || ""));
}

function loadPanelState(key) {
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_PREFIX + key);
    return raw ? Object.assign({}, PANEL_DEFAULT_STATE, JSON.parse(raw)) : Object.assign({}, PANEL_DEFAULT_STATE);
  } catch (e) {
    return Object.assign({}, PANEL_DEFAULT_STATE);
  }
}

function savePanelState(key, state) {
  localStorage.setItem(PANEL_STORAGE_PREFIX + key, JSON.stringify(state));
}

function renderTags(tags) {
  return tags
    .map((tag) => {
      const slug = slugify(tag);
      const isPendiente = slug === "pendiente";
      const isPautar = slug.startsWith("pautar");
      return `<span class="tag tag--${slug}${isPendiente ? " tag--pendiente" : ""}">${isPautar ? "📣 " : ""}${tag}</span>`;
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
  const panel = loadPanelState(key);
  const badges = [
    panel.terminado ? `<span class="status-badge status-badge--terminado">✓ Terminado</span>` : "",
    panel.publicado ? `<span class="status-badge status-badge--publicado">✓ Publicado</span>` : "",
    panel.pautado ? `<span class="status-badge status-badge--pautado">✓ Pautado</span>` : ""
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
      <button type="button" class="card-item__manage" data-panel-key="${key}" data-panel-title="${item.title.replace(/"/g, "&quot;")}" data-panel-subtitle="${(item.meta || "").replace(/"/g, "&quot;")}">⚙ Gestionar</button>
    </li>
  `;
}

function renderMonthCard(unitId, monthKey, items) {
  if (!items) return "";
  const body = items.length === 0
    ? `<p class="month-card__empty">Sin publicaciones registradas este mes.</p>`
    : `<ul class="item-list">${items.map((item) => renderItem(unitId, monthKey, item)).join("")}</ul>`;
  return `
    <section class="month-card">
      <h3 class="month-card__label">${MONTH_LABELS[monthKey]}</h3>
      ${body}
    </section>
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

function renderPendientesGenerales(list) {
  if (!list || list.length === 0) return "";
  return `
    <section class="pendientes-generales">
      <h3 class="pendientes-generales__label">Pendientes</h3>
      <ul>
        ${list.map((text) => `<li>${text}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderUnit(unit) {
  const content = document.getElementById("content");
  document.documentElement.style.setProperty("--accent", unit.accent);

  content.innerHTML = `
    <div class="unit-header">
      <h2 class="unit-title">${unit.name}</h2>
      <p class="unit-subtitle">${unit.subtitle}</p>
    </div>
    ${renderInfoBlock(unit)}
    <div class="months-grid">
      ${MONTH_ORDER.map((m) => renderMonthCard(unit.id, m, unit.months[m])).join("")}
    </div>
    ${renderPendientesGenerales(unit.pendientesGenerales)}
  `;
}

let currentUnitId = null;

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
    history.replaceState(null, "", `#${unitId}`);
  }
}

// ---------- Modal del panel colaborativo ----------

let activePanelKey = null;

function openPanelModal(key, title, subtitle) {
  const state = loadPanelState(key);
  activePanelKey = key;
  document.getElementById("panel-modal-title").textContent = title;
  document.getElementById("panel-modal-subtitle").textContent = subtitle || "";
  document.getElementById("panel-copy").value = state.copy;
  document.getElementById("panel-drive").value = state.drive;
  document.getElementById("panel-terminado").checked = state.terminado;
  document.getElementById("panel-publicado").checked = state.publicado;
  document.getElementById("panel-pautado").checked = state.pautado;
  document.getElementById("panel-sugerencia").value = state.sugerencia;
  document.getElementById("panel-modal").hidden = false;
}

function closePanelModal() {
  document.getElementById("panel-modal").hidden = true;
  activePanelKey = null;
}

function savePanelModal() {
  if (!activePanelKey) return;
  savePanelState(activePanelKey, {
    copy: document.getElementById("panel-copy").value,
    drive: document.getElementById("panel-drive").value,
    terminado: document.getElementById("panel-terminado").checked,
    publicado: document.getElementById("panel-publicado").checked,
    pautado: document.getElementById("panel-pautado").checked,
    sugerencia: document.getElementById("panel-sugerencia").value
  });
  closePanelModal();
  if (currentUnitId) {
    const unit = UNITS.find((u) => u.id === currentUnitId);
    if (unit) renderUnit(unit);
  }
}

function initPanelModal() {
  document.getElementById("content").addEventListener("click", (e) => {
    const btn = e.target.closest(".card-item__manage");
    if (!btn) return;
    openPanelModal(btn.dataset.panelKey, btn.dataset.panelTitle, btn.dataset.panelSubtitle);
  });

  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closePanelModal);
  });

  document.getElementById("panel-save").addEventListener("click", savePanelModal);

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
  initPanelModal();
  const fromHash = window.location.hash.replace("#", "");
  const initialUnit = UNITS.find((u) => u.id === fromHash) ? fromHash : UNITS[0].id;
  setActiveTab(initialUnit);
}

init();
