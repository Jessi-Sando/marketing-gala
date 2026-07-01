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

function renderItem(item) {
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

  return `
    <li class="${classes}">
      <div class="item-tags">${renderTags(item.tags)}</div>
      ${metaHtml}
      <h4 class="item-title">${item.title}</h4>
      ${descHtml}
      ${statsHtml}
    </li>
  `;
}

function renderMonthCard(monthKey, items) {
  if (!items) return "";
  const body = items.length === 0
    ? `<p class="month-card__empty">Sin publicaciones registradas este mes.</p>`
    : `<ul class="item-list">${items.map(renderItem).join("")}</ul>`;
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
      ${MONTH_ORDER.map((m) => renderMonthCard(m, unit.months[m])).join("")}
    </div>
    ${renderPendientesGenerales(unit.pendientesGenerales)}
  `;
}

function setActiveTab(unitId) {
  document.querySelectorAll(".tab").forEach((btn) => {
    const active = btn.dataset.unit === unitId;
    btn.classList.toggle("tab--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  const unit = UNITS.find((u) => u.id === unitId);
  if (unit) {
    renderUnit(unit);
    history.replaceState(null, "", `#${unitId}`);
  }
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
  const fromHash = window.location.hash.replace("#", "");
  const initialUnit = UNITS.find((u) => u.id === fromHash) ? fromHash : UNITS[0].id;
  setActiveTab(initialUnit);
}

init();
