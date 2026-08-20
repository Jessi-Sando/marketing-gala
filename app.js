// Panel de contenido Gala SA — diseño migrado desde el prototipo gala-social-studio.
// Mismas conexiones reales de siempre: Firestore (panel colaborativo + publicaciones
// manuales) y data.js sincronizado por automation/*.py + GitHub Actions.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
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

const MONTH_ORDER = ["junio", "julio", "agosto", "septiembre"];
const MONTH_LABELS = { junio: "Junio", julio: "Julio", agosto: "Agosto", septiembre: "Septiembre", octubre: "Octubre" };
const MONTH_NUM = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
const MONTH_TO_ABBR = { junio: "jun", julio: "jul", agosto: "ago", septiembre: "sep", octubre: "oct" };
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ---------- Sección: Actividades (cronograma de eventos en sala, Casino Gala) ----------
// A diferencia del Calendario (posts de Instagram), esto son eventos físicos en las
// salas — no viene de data.js ni de Firestore, es fijo, definido en la reunión del
// 18-ago-2026. Si el cronograma cambia, se edita este objeto directamente.
const ACT_MONTH_ORDER = ["agosto", "septiembre", "octubre"];
const ACT_TYPE_LABELS = { folklore: "🪕 Folklore", cumbia: "🥁 Cumbia", boxie: "🎮 Jueves Boxie", experiencia: "✨ La Experiencia" };
const CASINO_ACTIVITIES = {
  agosto: [
    { day: 19, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 20, dia: "Jueves", tipo: "boxie", sala: "Sala Güemes" },
    { day: 21, dia: "Viernes", tipo: "cumbia", sala: "Sala Ruta 11" },
    { day: 22, dia: "Sábado", tipo: "experiencia", sala: "Sala Central | Paño" },
    { day: 26, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 27, dia: "Jueves", tipo: "boxie", sala: "Sala Sáenz Peña" },
    { day: 28, dia: "Viernes", tipo: "cumbia", sala: "Sala Barranqueras" }
  ],
  septiembre: [
    { day: 2, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 3, dia: "Jueves", tipo: "boxie", sala: "Sala Güemes" },
    { day: 4, dia: "Viernes", tipo: "cumbia", sala: "Sala Ruta 11" },
    { day: 5, dia: "Sábado", tipo: "experiencia", sala: "Sala Central | Paño" },
    { day: 9, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 10, dia: "Jueves", tipo: "boxie", sala: "Sala Sáenz Peña" },
    { day: 11, dia: "Viernes", tipo: "cumbia", sala: "Sala Barranqueras" },
    { day: 16, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 17, dia: "Jueves", tipo: "boxie", sala: "Sala Güemes" },
    { day: 18, dia: "Viernes", tipo: "cumbia", sala: "Sala Ruta 11" },
    { day: 19, dia: "Sábado", tipo: "experiencia", sala: "Sala Central | Paño" },
    { day: 23, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 24, dia: "Jueves", tipo: "boxie", sala: "Sala Sáenz Peña" },
    { day: 25, dia: "Viernes", tipo: "cumbia", sala: "Sala Barranqueras" },
    { day: 30, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" }
  ],
  octubre: [
    { day: 1, dia: "Jueves", tipo: "boxie", sala: "Sala Güemes" },
    { day: 2, dia: "Viernes", tipo: "cumbia", sala: "Sala Ruta 11" },
    { day: 3, dia: "Sábado", tipo: "experiencia", sala: "Sala Central | Paño" },
    { day: 7, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 8, dia: "Jueves", tipo: "boxie", sala: "Sala Sáenz Peña" },
    { day: 9, dia: "Viernes", tipo: "cumbia", sala: "Sala Barranqueras" },
    { day: 14, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 15, dia: "Jueves", tipo: "boxie", sala: "Sala Güemes" },
    { day: 16, dia: "Viernes", tipo: "cumbia", sala: "Sala Ruta 11" },
    { day: 17, dia: "Sábado", tipo: "experiencia", sala: "Sala Central | Paño" },
    { day: 21, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 22, dia: "Jueves", tipo: "boxie", sala: "Sala Sáenz Peña" },
    { day: 23, dia: "Viernes", tipo: "cumbia", sala: "Sala Barranqueras" },
    { day: 28, dia: "Miércoles", tipo: "folklore", sala: "Sala Central" },
    { day: 29, dia: "Jueves", tipo: "boxie", sala: "Sala Güemes" },
    { day: 30, dia: "Viernes", tipo: "cumbia", sala: "Sala Ruta 11" },
    { day: 31, dia: "Sábado", tipo: "experiencia", sala: "Sala Central | Paño" }
  ]
};

const THUMB_STYLES = {
  reel: { gradient: "linear-gradient(135deg, #3a2a5c, #1c1030)", icon: "🎬" },
  flyer: { gradient: "linear-gradient(135deg, #3a332a, #1c1712)", icon: "🖼️" },
  carrusel: { gradient: "linear-gradient(135deg, #12403a, #0d211d)", icon: "📑" },
  default: { gradient: "linear-gradient(135deg, #5c3414, #2a1608)", icon: "✨" }
};

const STATUS_LABELS = { borrador: "Borrador", listo: "Listo", programado: "Programado", publicado: "Publicado", "no-publicado": "No publicado" };
const PLATFORM_ICONS = { instagram: "📷", facebook: "📘", tiktok: "🎵" };
const PLATFORM_LABELS = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

const SECTIONS = [
  { key: "resumen", label: "Resumen", icon: "📊" },
  { key: "calendario", label: "Calendario", icon: "🗓️" },
  { key: "actividades", label: "Actividades", icon: "🎪" },
  { key: "contenido", label: "Contenido", icon: "🗂️" },
  { key: "ideas", label: "Ideas", icon: "💡" },
  { key: "guiones", label: "Guiones", icon: "✍️" },
  { key: "carruseles", label: "Carruseles", icon: "🎠" },
  { key: "metricas", label: "Métricas", icon: "📈" }
];

// ---------- Utilidades ----------

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(str) {
  return String(str)
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

function fmtNum(n) {
  return (n || 0).toLocaleString("es-AR");
}

function parseMetaDate(meta) {
  const match = /^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.exec(meta || "");
  if (!match) return null;
  const month = MONTH_NUM[match[2].toLowerCase()];
  if (month === undefined) return null;
  return new Date(2026, month, parseInt(match[1], 10));
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------- Panel colaborativo (gestión: copy/Drive/tareas/checks) — Firestore ----------
// Sin cambios respecto al panel de producción: misma colección "panels", misma
// fórmula de panelKey. No tocar sin migrar los documentos ya guardados.

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
      snapshot.forEach((docSnap) => { next[docSnap.id] = docSnap.data(); });
      panelCache = next;
      rerenderCurrentUnit(unitId);
    },
    (err) => console.error("Error al sincronizar el panel colaborativo:", err)
  );
}

async function savePanelToFirestore(key, unitId, monthKey, state) {
  await setDoc(
    doc(db, "panels", key),
    Object.assign({}, state, { unitId, monthKey, updatedAt: serverTimestamp() }),
    { merge: true }
  );
}

// ---------- Publicaciones manuales (creadas desde el calendario) — Firestore ----------
// Nueva colección "posts": cada documento es una publicación completa (datos +
// gestión) creada a mano desde el calendario, visible para todo el equipo en
// tiempo real. Los items que vienen de data.js NO viven acá.

let manualPostsCache = {};
let unsubscribePosts = null;

function subscribeToUnitPosts(unitId) {
  if (unsubscribePosts) {
    unsubscribePosts();
    unsubscribePosts = null;
  }
  manualPostsCache[unitId] = manualPostsCache[unitId] || [];
  const q = query(collection(db, "posts"), where("unitId", "==", unitId));
  unsubscribePosts = onSnapshot(
    q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => list.push(Object.assign({ id: docSnap.id }, docSnap.data())));
      manualPostsCache[unitId] = list;
      rerenderCurrentUnit(unitId);
    },
    (err) => console.error("Error al sincronizar las publicaciones manuales:", err)
  );
}

async function saveManualPost(postId, unitId, fields) {
  await setDoc(
    doc(db, "posts", postId),
    Object.assign({}, fields, { unitId, updatedAt: serverTimestamp() }),
    { merge: true }
  );
}

async function deleteManualPost(postId) {
  await deleteDoc(doc(db, "posts", postId));
}

function rerenderCurrentUnit(unitId) {
  if (currentUnitId !== unitId) return;
  if (unitId === "desarrollo") {
    renderDevelopment();
    return;
  }
  const unit = UNITS.find((u) => u.id === unitId);
  if (unit) renderUnit(unit);
}

// ---------- Datos derivados ----------

function getWrappedDevTasks() {
  return DEV_TASKS.map((t) => Object.assign({}, t, {
    monthKey: DEV_MONTH_KEY,
    platform: t.platform || "instagram",
    _source: "datajs",
    _panelKey: panelKey("desarrollo", DEV_MONTH_KEY, t)
  }));
}

function getAllItems(unit) {
  const items = [];
  for (const monthKey of MONTH_ORDER) {
    for (const item of unit.months[monthKey] || []) {
      items.push(Object.assign({}, item, {
        monthKey,
        platform: item.platform || "instagram",
        _source: "datajs",
        _panelKey: panelKey(unit.id, monthKey, item)
      }));
    }
  }
  const manual = manualPostsCache[unit.id] || [];
  for (const p of manual) {
    items.push(Object.assign({}, p, { _source: "manual", _panelKey: p.id }));
  }
  return items;
}

function getCardItemByKey(unitId, key) {
  if (unitId === "desarrollo") return getWrappedDevTasks().find((i) => i._panelKey === key) || null;
  const unit = UNITS.find((u) => u.id === unitId);
  return unit ? getAllItems(unit).find((i) => i._panelKey === key) || null : null;
}

function deriveStatus(item) {
  if (item.status) return item.status;
  if (typeof item.likes === "number") return "publicado";
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  if (tags.includes("planificado, no publicado")) return "no-publicado";
  const hasDate = Boolean(parseMetaDate(item.meta));
  const isPautar = tags.some((t) => t.startsWith("pautar"));
  const isPendiente = tags.includes("pendiente") || !item.desc;
  if (isPendiente) return "borrador";
  if (hasDate && isPautar) return "programado";
  if (hasDate) return "listo";
  return "borrador";
}

function thumbFor(item) {
  const tags = item.tags || [];
  const key = ["reel", "flyer", "carrusel"].find((k) => tags.includes(k));
  return THUMB_STYLES[key] || THUMB_STYLES.default;
}

function renderTags(tags) {
  return (tags || [])
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join("");
}

// ---------- Estado global ----------

let currentUnitId = null;
let currentSection = "resumen";
let currentContentFilter = "todos";
let currentCalMonth = "julio";
let currentActMonth = "agosto";

// ---------- Sección: Resumen ----------

function renderInfoBlock(unit) {
  const rows = [];
  if (unit.objective) rows.push(`<div class="info-row"><span class="info-label">Objetivo estratégico</span><p class="info-value info-value--objective">"${unit.objective}"</p></div>`);
  if (unit.pilares) rows.push(`<div class="info-row"><span class="info-label">Pilares de contenido</span><p class="info-value">${unit.pilares}</p></div>`);
  if (unit.channels) rows.push(`<div class="info-row"><span class="info-label">Canales activos</span><p class="info-value">${unit.channels}</p></div>`);
  if (rows.length === 0) return "";
  return `<div class="info-block">${rows.join("")}</div>`;
}

function renderMiniChart(history, big) {
  if (!history || history.length === 0) return "";
  const width = 560, height = big ? 220 : 120, pad = 10;
  const max = Math.max(1, ...history.map((d) => d.views || 0));
  const pts = history.map((d, i) => {
    const x = history.length === 1 ? width / 2 : pad + (i / (history.length - 1)) * (width - pad * 2);
    const y = height - pad - ((d.views || 0) / max) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `M${pad},${height - pad} L${pts.join(" L")} L${width - pad},${height - pad} Z`;
  const dots = big
    ? history.map((d, i) => {
        const [x, y] = pts[i].split(",");
        return `<circle cx="${x}" cy="${y}" r="3.5" class="mini-chart__dot"><title>${d.date}: ${(d.views || 0).toLocaleString("es-AR")} vistas</title></circle>`;
      }).join("")
    : "";
  return `
    <div class="mini-chart${big ? " mini-chart--big" : ""}">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <path d="${area}" class="mini-chart__area"></path>
        <polyline points="${pts.join(" ")}" class="mini-chart__line" data-animate-line></polyline>
        ${dots}
      </svg>
    </div>
  `;
}

function renderResumen(unit) {
  const items = getAllItems(unit);
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const thisWeek = items.filter((i) => {
    const d = parseMetaDate(i.meta);
    return d && d >= weekStart && d <= weekEnd;
  });

  const published = items.filter((i) => typeof i.likes === "number");
  const best = [...published]
    .sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))
    .slice(0, 3);

  const history = (unit.performance && unit.performance.history) || [];
  const totalViews = history.reduce((a, d) => a + (d.views || 0), 0);
  const totalFollowers = history.length ? history[history.length - 1].followers : null;

  return `
    <div class="section-block">
      ${renderInfoBlock(unit)}
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-card__value">${thisWeek.length}</span>
          <span class="kpi-card__label">Posts esta semana</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value">${published.length}</span>
          <span class="kpi-card__label">Publicados (total)</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value">${totalViews ? fmtNum(totalViews) : "—"}</span>
          <span class="kpi-card__label">Visualizaciones (30 días)</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__value">${totalFollowers !== null ? fmtNum(totalFollowers) : "—"}</span>
          <span class="kpi-card__label">Seguidores Instagram</span>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Crecimiento y visualizaciones</h3>
        ${history.length
          ? renderMiniChart(history)
          : `<p class="empty-note">Todavía no hay historial de rendimiento acumulado para esta unidad.</p>`
        }
      </div>

      <div class="panel">
        <h3 class="panel__title">Mejores publicaciones</h3>
        ${best.length
          ? `<ul class="best-list">${best.map((item) => `
              <li class="best-list__item">
                <div class="best-list__thumb" style="${item.image ? "" : `background:${thumbFor(item).gradient}`}">
                  ${item.image
                    ? `<img src="${escapeAttr(item.image)}" alt="" class="best-list__thumb-img" loading="lazy" />`
                    : `<span class="best-list__icon">${thumbFor(item).icon}</span>`}
                </div>
                <div class="best-list__body">
                  <span class="best-list__title">${item.title}</span>
                  <span class="best-list__meta">${item.meta || ""}</span>
                </div>
                <div class="best-list__stats">
                  ${typeof item.views === "number" ? `<span>▶ ${fmtNum(item.views)}</span>` : ""}
                  <span>❤ ${fmtNum(item.likes)}</span>
                </div>
              </li>
            `).join("")}</ul>`
          : `<p class="empty-note">Todavía no hay publicaciones con datos reales para esta unidad.</p>`
        }
      </div>
    </div>
  `;
}

// ---------- Sección: Calendario ----------

function getDayPosts(unit, monthKey, monthIdx, day) {
  const basePosts = (unit.months[monthKey] || [])
    .map((item) => {
      const date = parseMetaDate(item.meta);
      if (!date || date.getMonth() !== monthIdx || date.getDate() !== day) return null;
      return Object.assign({}, item, {
        monthKey,
        platform: item.platform || "instagram",
        _source: "datajs",
        _key: panelKey(unit.id, monthKey, item)
      });
    })
    .filter(Boolean);
  const manualPosts = (manualPostsCache[unit.id] || [])
    .filter((p) => {
      if (p.monthKey !== monthKey) return false;
      const date = parseMetaDate(p.meta);
      return date && date.getMonth() === monthIdx && date.getDate() === day;
    })
    .map((p) => Object.assign({}, p, { _source: "manual", _key: p.id }));
  return [...basePosts, ...manualPosts];
}

function isDayComplete(dayPosts) {
  return dayPosts.length > 0 && dayPosts.every((p) => deriveStatus(p) === "programado" || deriveStatus(p) === "publicado");
}

function renderCalendario(unit) {
  const monthIdx = MONTH_NUM[MONTH_TO_ABBR[currentCalMonth]];
  const firstDay = new Date(2026, monthIdx, 1);
  const daysInMonth = new Date(2026, monthIdx + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const totalCells = leadingBlanks + daysInMonth;
  const weekRows = Math.ceil(totalCells / 7);

  let cells = "";
  for (let i = 0; i < leadingBlanks; i++) cells += `<div class="cal-cell cal-cell--blank"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = getDayPosts(unit, currentCalMonth, monthIdx, day);
    const isToday = (() => {
      const t = new Date();
      return t.getFullYear() === 2026 && t.getMonth() === monthIdx && t.getDate() === day;
    })();
    const isEmpty = dayPosts.length === 0;
    const isComplete = isDayComplete(dayPosts);
    const cls = [
      "cal-cell",
      isToday ? "cal-cell--today" : "",
      isEmpty ? "cal-cell--empty" : "",
      isComplete ? "cal-cell--complete" : ""
    ].filter(Boolean).join(" ");
    cells += `
      <button type="button" class="${cls}" data-cal-day="${day}">
        <span class="cal-cell__day">${day}</span>
        <div class="cal-cell__posts">
          ${dayPosts.slice(0, 3).map((p) => `
            <span class="cal-post-chip" title="${p.title}">
              <span class="cal-post-chip__thumb" style="${p.image ? `background-image:url('${escapeAttr(p.image)}')` : `background:${thumbFor(p).gradient}`}">${p.image ? "" : thumbFor(p).icon}</span>
              <span class="cal-post-chip__title">${p.title}</span>
              <span class="cal-post-chip__platform">${PLATFORM_ICONS[p.platform] || PLATFORM_ICONS.instagram}</span>
            </span>
          `).join("")}
          ${dayPosts.length > 3 ? `<span class="cal-chip cal-chip--more">+${dayPosts.length - 3} más</span>` : ""}
        </div>
      </button>
    `;
  }

  return `
    <div class="cal-fullscreen">
      <div class="cal-month-nav">
        <button type="button" class="cal-nav-arrow" id="cal-prev-month" ${currentCalMonth === MONTH_ORDER[0] ? "disabled" : ""}>‹</button>
        <h3 class="cal-month-nav__label">${MONTH_LABELS[currentCalMonth]} <span class="cal-month-nav__year">2026</span></h3>
        <button type="button" class="cal-nav-arrow" id="cal-next-month" ${currentCalMonth === MONTH_ORDER[MONTH_ORDER.length - 1] ? "disabled" : ""}>›</button>
      </div>
      <div class="cal-grid" style="grid-template-rows: auto repeat(${weekRows}, 1fr)">
        ${WEEKDAY_LABELS.map((w) => `<div class="cal-weekday">${w}</div>`).join("")}
        ${cells}
      </div>
    </div>
  `;
}

// ---------- Sección: Actividades ----------

function renderActividades(unit) {
  if (unit.id !== "casino-gala") {
    return `
      <div class="section-block">
        <div class="panel">
          <h3 class="panel__title">Actividades</h3>
          <p class="empty-note">Todavía no hay un cronograma de actividades cargado para esta unidad.</p>
        </div>
      </div>
    `;
  }

  const monthIdx = MONTH_NUM[MONTH_TO_ABBR[currentActMonth]];
  const daysInMonth = new Date(2026, monthIdx + 1, 0).getDate();
  const firstDay = new Date(2026, monthIdx, 1);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const totalCells = leadingBlanks + daysInMonth;
  const weekRows = Math.ceil(totalCells / 7);
  const monthActivities = CASINO_ACTIVITIES[currentActMonth] || [];

  let cells = "";
  for (let i = 0; i < leadingBlanks; i++) cells += `<div class="cal-cell cal-cell--blank"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const act = monthActivities.find((a) => a.day === day);
    const isToday = (() => {
      const t = new Date();
      return t.getFullYear() === 2026 && t.getMonth() === monthIdx && t.getDate() === day;
    })();
    const cls = [
      "cal-cell",
      "cal-cell--static",
      !act ? "cal-cell--empty" : "",
      isToday ? "cal-cell--today" : ""
    ].filter(Boolean).join(" ");
    cells += `
      <div class="${cls}">
        <span class="cal-cell__day">${day}</span>
        ${act ? `
          <div class="act-chip act-chip--${act.tipo}">
            <span class="act-chip__title">${ACT_TYPE_LABELS[act.tipo]}</span>
            <span class="act-chip__sala">${act.sala}</span>
          </div>
        ` : ""}
      </div>
    `;
  }

  return `
    <div class="cal-fullscreen">
      <div class="cal-month-nav">
        <button type="button" class="cal-nav-arrow" id="act-prev-month" ${currentActMonth === ACT_MONTH_ORDER[0] ? "disabled" : ""}>‹</button>
        <h3 class="cal-month-nav__label">${MONTH_LABELS[currentActMonth]} <span class="cal-month-nav__year">2026</span></h3>
        <button type="button" class="cal-nav-arrow" id="act-next-month" ${currentActMonth === ACT_MONTH_ORDER[ACT_MONTH_ORDER.length - 1] ? "disabled" : ""}>›</button>
      </div>
      <div class="act-legend">
        ${Object.entries(ACT_TYPE_LABELS).map(([tipo, label]) => `<span class="act-legend__item act-legend__item--${tipo}">${label}</span>`).join("")}
      </div>
      <div class="cal-grid" style="grid-template-rows: auto repeat(${weekRows}, 1fr)">
        ${WEEKDAY_LABELS.map((w) => `<div class="cal-weekday">${w}</div>`).join("")}
        ${cells}
      </div>
    </div>
  `;
}

// ---------- Panel lateral: lista del día + editor unificado ----------
// Fusiona el antiguo modal de gestión (copy/Drive/tareas/checks/sugerencia)
// con el panel de día del prototipo (título/desc/plataforma/formato/estado).
// Para items de data.js, los "datos del post" son de solo lectura (el
// contenido real lo define el sync o la edición manual de data.js); para
// publicaciones manuales (Firestore, colección "posts"), todo es editable.

let editorPanelState = null;
// { mode:"day-list", unitId, monthKey, monthIdx, day }
// { mode:"editor", unitId, monthKey, monthIdx, day, item, isNew, cameFromDayList }
let currentTasks = [];

function dayLabelFor(day, monthKey) {
  return `${day} de ${MONTH_LABELS[monthKey].toLowerCase()}`;
}

function closeEditorPanel() {
  editorPanelState = null;
  currentTasks = [];
  const root = document.getElementById("day-panel-root");
  if (root) root.innerHTML = "";
}

function gestionSourceFor(item) {
  if (!item) return Object.assign({}, PANEL_DEFAULT_STATE);
  if (item._source === "manual") return Object.assign({}, PANEL_DEFAULT_STATE, item);
  return getPanelState(item._panelKey || item._key);
}

function refreshUnderEditor() {
  if (!currentUnitId) return;
  if (currentUnitId === "desarrollo") { renderDevelopment(); return; }
  const unit = UNITS.find((u) => u.id === currentUnitId);
  if (unit) renderUnit(unit);
}

function openDayList(unitId, monthKey, monthIdx, day) {
  editorPanelState = { mode: "day-list", unitId, monthKey, monthIdx, day };
  renderEditorPanel();
}

function openEditorFromCard(unitId, monthKey, item) {
  editorPanelState = { mode: "editor", unitId, monthKey, item, isNew: false, cameFromDayList: false };
  currentTasks = (gestionSourceFor(item).tasks || []).map((t) => Object.assign({}, t));
  renderEditorPanel();
}

function openEditorForDayPost(item) {
  editorPanelState = Object.assign({}, editorPanelState, { mode: "editor", item, isNew: false, cameFromDayList: true });
  currentTasks = (gestionSourceFor(item).tasks || []).map((t) => Object.assign({}, t));
  renderEditorPanel();
}

function openEditorNewForDay() {
  editorPanelState = Object.assign({}, editorPanelState, { mode: "editor", item: null, isNew: true, cameFromDayList: true });
  currentTasks = [];
  renderEditorPanel();
}

function backToDayList() {
  editorPanelState = { mode: "day-list", unitId: editorPanelState.unitId, monthKey: editorPanelState.monthKey, monthIdx: editorPanelState.monthIdx, day: editorPanelState.day };
  currentTasks = [];
  renderEditorPanel();
}

function renderTaskListHtml() {
  if (currentTasks.length === 0) {
    return `<li class="panel-tasks__empty">Todavía no hay tareas cargadas.</li>`;
  }
  return currentTasks.map((t) => `
    <li class="panel-tasks__item${t.done ? " panel-tasks__item--done" : ""}" data-task-id="${t.id}">
      <label>
        <input type="checkbox" class="panel-tasks__check" data-task-id="${t.id}" ${t.done ? "checked" : ""} />
        <span class="panel-tasks__text">${t.text}</span>
      </label>
      <button type="button" class="panel-tasks__delete" data-task-id="${t.id}" aria-label="Eliminar tarea">✕</button>
    </li>
  `).join("");
}

function renderPostEditor(state) {
  const { item, isNew } = state;
  const isManual = isNew || item._source === "manual";
  const gestion = gestionSourceFor(item);
  const format = isNew ? "flyer" : (["reel", "flyer", "carrusel"].find((k) => (item.tags || []).includes(k)) || "flyer");
  const status = isNew ? "borrador" : deriveStatus(item);
  const platform = isNew ? "instagram" : (item.platform || "instagram");
  const title = isNew ? "" : item.title;
  const desc = isNew ? "" : (item.desc || "");
  const meta = isNew ? "" : (item.meta || "");
  const canDelete = isManual && !isNew;
  const headerLabel = isNew ? "Nueva publicación" : (isManual ? "Editar publicación" : item.title);

  return `
    <div class="day-panel-backdrop" id="day-panel-backdrop"></div>
    <aside class="day-panel">
      <div class="day-panel__header">
        <h3>${headerLabel}</h3>
        <button type="button" class="day-panel__close" id="day-panel-close" aria-label="Cerrar">✕</button>
      </div>
      <form class="day-panel__form" id="editor-form">
        <div class="editor-section">
          <span class="editor-section__label">Datos del post</span>
          <label class="day-panel__field">
            <span>Título</span>
            <input type="text" id="ed-title" value="${escapeAttr(title)}" ${isManual ? "" : "readonly"} required />
          </label>
          <label class="day-panel__field">
            <span>Descripción</span>
            <textarea id="ed-desc" rows="2" ${isManual ? "" : "readonly"}>${desc}</textarea>
          </label>
          <div class="day-panel__field-row">
            <label class="day-panel__field">
              <span>Red social</span>
              <select id="ed-platform" ${isManual ? "" : "disabled"}>
                ${Object.keys(PLATFORM_LABELS).map((k) => `<option value="${k}"${platform === k ? " selected" : ""}>${PLATFORM_LABELS[k]}</option>`).join("")}
              </select>
            </label>
            <label class="day-panel__field">
              <span>Formato</span>
              <select id="ed-format" ${isManual ? "" : "disabled"}>
                ${["reel", "flyer", "carrusel"].map((f) => `<option value="${f}"${format === f ? " selected" : ""}>${THUMB_STYLES[f].icon} ${f}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="day-panel__field-row">
            <label class="day-panel__field">
              <span>Estado</span>
              <select id="ed-status" ${isManual ? "" : "disabled"}>
                ${Object.keys(STATUS_LABELS).map((s) => `<option value="${s}"${status === s ? " selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}
              </select>
            </label>
            <label class="day-panel__field">
              <span>Fecha</span>
              <input type="text" id="ed-meta" value="${escapeAttr(meta)}" placeholder="ej. 15 jul" ${isManual ? "" : "readonly"} />
            </label>
          </div>
          ${!isManual ? `<p class="empty-note">Esta publicación viene de la sincronización automática o de data.js — el contenido se edita ahí.</p>` : ""}
        </div>

        <div class="editor-section">
          <span class="editor-section__label">Gestión</span>
          <label class="day-panel__field">
            <span>Copy</span>
            <textarea id="ed-copy" rows="3" placeholder="Texto del caption...">${gestion.copy}</textarea>
          </label>
          <label class="day-panel__field">
            <span>Enlace de Drive</span>
            <div class="panel-drive-row">
              <input type="url" id="ed-drive" placeholder="https://drive.google.com/..." value="${escapeAttr(gestion.drive)}" />
              <a href="${isValidUrl(gestion.drive) ? escapeAttr(gestion.drive) : "#"}" id="ed-drive-open" class="panel-drive-open" target="_blank" rel="noopener noreferrer" ${isValidUrl(gestion.drive) ? "" : "hidden"}>Abrir ↗</a>
            </div>
          </label>
          <div class="day-panel__field">
            <span>Lista de tareas</span>
            <ul id="ed-tasks" class="panel-tasks">${renderTaskListHtml()}</ul>
            <div class="panel-tasks__add">
              <input type="text" id="ed-task-input" placeholder="Nueva tarea..." />
              <button type="button" id="ed-task-add" class="panel-btn">+ Agregar</button>
            </div>
          </div>
          <div class="panel-checks">
            <label><input type="checkbox" id="ed-terminado" ${gestion.terminado ? "checked" : ""} /> Terminado</label>
            <label><input type="checkbox" id="ed-publicado" ${gestion.publicado ? "checked" : ""} /> Publicado</label>
            <label><input type="checkbox" id="ed-pautado" ${gestion.pautado ? "checked" : ""} /> Pautado</label>
          </div>
          <label class="day-panel__field">
            <span>Sugerencia de historia</span>
            <textarea id="ed-sugerencia" rows="2" placeholder="Idea para historia...">${gestion.sugerencia}</textarea>
          </label>
        </div>

        <p class="panel-modal__error" id="ed-error" hidden></p>
        <div class="day-panel__form-actions">
          ${canDelete ? `<button type="button" class="day-panel__delete" id="ed-delete">Eliminar</button>` : "<span></span>"}
          <div class="day-panel__form-actions-right">
            <button type="button" class="day-panel__cancel" id="ed-cancel">Cancelar</button>
            <button type="submit" class="day-panel__save" id="ed-save">Guardar</button>
          </div>
        </div>
      </form>
    </aside>
  `;
}

function renderEditorPanel() {
  const root = document.getElementById("day-panel-root");
  if (!root) return;
  if (!editorPanelState) { root.innerHTML = ""; return; }

  if (editorPanelState.mode === "day-list") {
    const { unitId, monthKey, monthIdx, day } = editorPanelState;
    const unit = UNITS.find((u) => u.id === unitId);
    const posts = unit ? getDayPosts(unit, monthKey, monthIdx, day) : [];
    root.innerHTML = `
      <div class="day-panel-backdrop" id="day-panel-backdrop"></div>
      <aside class="day-panel">
        <div class="day-panel__header">
          <h3>${dayLabelFor(day, monthKey)}</h3>
          <button type="button" class="day-panel__close" id="day-panel-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="day-panel__posts">
          ${posts.length ? posts.map((p) => `
            <div class="day-panel__post-row">
              <span class="day-panel__post-thumb" style="${p.image ? `background-image:url('${escapeAttr(p.image)}')` : `background:${thumbFor(p).gradient}`}">${p.image ? "" : thumbFor(p).icon}</span>
              <div class="day-panel__post-body">
                <span class="day-panel__post-title">${p.title}</span>
                <span class="day-panel__post-meta">${PLATFORM_ICONS[p.platform] || "📷"} ${PLATFORM_LABELS[p.platform] || "Instagram"} · ${STATUS_LABELS[deriveStatus(p)] || deriveStatus(p)}</span>
              </div>
              <button type="button" class="day-panel__edit-btn" data-edit-key="${p._key}">Gestionar</button>
            </div>
          `).join("") : `<p class="empty-note">Todavía no hay posts este día.</p>`}
        </div>
        <button type="button" class="day-panel__new-btn" id="day-panel-new">+ Nuevo post</button>
      </aside>
    `;
    return;
  }

  root.innerHTML = renderPostEditor(editorPanelState);
}

async function saveEditor() {
  if (!editorPanelState || editorPanelState.mode !== "editor") return;
  const { unitId, monthKey, item, isNew } = editorPanelState;
  const isManual = isNew || item._source === "manual";

  const gestionFields = {
    copy: document.getElementById("ed-copy").value,
    drive: document.getElementById("ed-drive").value,
    tasks: currentTasks,
    terminado: document.getElementById("ed-terminado").checked,
    publicado: document.getElementById("ed-publicado").checked,
    pautado: document.getElementById("ed-pautado").checked,
    sugerencia: document.getElementById("ed-sugerencia").value
  };

  const saveBtn = document.getElementById("ed-save");
  const errorEl = document.getElementById("ed-error");
  saveBtn.disabled = true;
  saveBtn.textContent = "Guardando...";
  try {
    if (isManual) {
      const title = document.getElementById("ed-title").value.trim();
      if (!title) throw new Error("El título es obligatorio.");
      const format = document.getElementById("ed-format").value;
      const datosFields = {
        title,
        desc: document.getElementById("ed-desc").value.trim(),
        platform: document.getElementById("ed-platform").value,
        tags: [format],
        meta: document.getElementById("ed-meta").value.trim(),
        status: document.getElementById("ed-status").value,
        monthKey
      };
      const postId = isNew ? `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : item.id;
      await saveManualPost(postId, unitId, Object.assign({}, datosFields, gestionFields));
    } else {
      await savePanelToFirestore(item._panelKey, unitId, monthKey, gestionFields);
    }
    closeEditorPanel();
    refreshUnderEditor();
  } catch (err) {
    console.error("Error al guardar:", err);
    errorEl.textContent = err.message || "No se pudo guardar. Revisá tu conexión e intentá de nuevo.";
    errorEl.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Guardar";
  }
}

async function deleteEditorPost() {
  if (!editorPanelState || !editorPanelState.item) return;
  const btn = document.getElementById("ed-delete");
  if (btn) { btn.disabled = true; btn.textContent = "Eliminando..."; }
  try {
    await deleteManualPost(editorPanelState.item.id);
    closeEditorPanel();
    refreshUnderEditor();
  } catch (err) {
    console.error("Error al eliminar:", err);
    const errorEl = document.getElementById("ed-error");
    if (errorEl) { errorEl.textContent = "No se pudo eliminar. Probá de nuevo."; errorEl.hidden = false; }
    if (btn) { btn.disabled = false; btn.textContent = "Eliminar"; }
  }
}

function initEditorPanelEvents() {
  const root = document.getElementById("day-panel-root");

  root.addEventListener("click", (e) => {
    if (!editorPanelState) return;

    if (e.target.id === "day-panel-backdrop" || e.target.id === "day-panel-close") {
      closeEditorPanel();
      return;
    }
    if (e.target.id === "day-panel-new") {
      openEditorNewForDay();
      return;
    }
    const editBtn = e.target.closest(".day-panel__edit-btn");
    if (editBtn) {
      const unit = UNITS.find((u) => u.id === editorPanelState.unitId);
      const posts = unit ? getDayPosts(unit, editorPanelState.monthKey, editorPanelState.monthIdx, editorPanelState.day) : [];
      const post = posts.find((p) => p._key === editBtn.dataset.editKey);
      if (post) openEditorForDayPost(post);
      return;
    }
    if (e.target.id === "ed-cancel") {
      if (editorPanelState.cameFromDayList) backToDayList();
      else closeEditorPanel();
      return;
    }
    if (e.target.id === "ed-delete") {
      deleteEditorPost();
      return;
    }
    const taskDel = e.target.closest(".panel-tasks__delete");
    if (taskDel) {
      currentTasks = currentTasks.filter((t) => t.id !== taskDel.dataset.taskId);
      const list = document.getElementById("ed-tasks");
      if (list) list.innerHTML = renderTaskListHtml();
      return;
    }
    if (e.target.id === "ed-task-add") {
      const input = document.getElementById("ed-task-input");
      const text = input.value.trim();
      if (!text) return;
      currentTasks.push({ id: String(Date.now()) + Math.random().toString(36).slice(2), text, done: false });
      input.value = "";
      const list = document.getElementById("ed-tasks");
      if (list) list.innerHTML = renderTaskListHtml();
      return;
    }
  });

  root.addEventListener("change", (e) => {
    const check = e.target.closest(".panel-tasks__check");
    if (!check) return;
    const task = currentTasks.find((t) => t.id === check.dataset.taskId);
    if (task) task.done = check.checked;
    const list = document.getElementById("ed-tasks");
    if (list) list.innerHTML = renderTaskListHtml();
  });

  root.addEventListener("input", (e) => {
    if (e.target.id === "ed-drive") {
      const link = document.getElementById("ed-drive-open");
      if (isValidUrl(e.target.value)) {
        link.href = e.target.value.trim();
        link.hidden = false;
      } else {
        link.hidden = true;
        link.removeAttribute("href");
      }
    }
  });

  root.addEventListener("keydown", (e) => {
    if (e.target.id === "ed-task-input" && e.key === "Enter") {
      e.preventDefault();
      document.getElementById("ed-task-add").click();
    }
  });

  root.addEventListener("submit", (e) => {
    if (e.target.id === "editor-form") {
      e.preventDefault();
      saveEditor();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editorPanelState) closeEditorPanel();
  });
}

// ---------- Sección: Contenido ----------

const CONTENT_FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "borrador", label: "Borrador", color: "var(--status-borrador)" },
  { key: "listo", label: "Listo", color: "var(--status-listo)" },
  { key: "programado", label: "Programado", color: "var(--status-programado)" },
  { key: "publicado", label: "Publicado", color: "var(--status-publicado)" },
  { key: "no-publicado", label: "No publicado", color: "var(--status-no-publicado)" }
];

function renderCard(item) {
  const status = deriveStatus(item);
  const thumb = thumbFor(item);
  const dateLabel = item.meta || "Sin fecha";
  const descHtml = item.desc ? `<p class="post-card__desc">${item.desc}</p>` : "";
  const gestion = gestionSourceFor(item);
  const taskTotal = (gestion.tasks || []).length;
  const taskDone = (gestion.tasks || []).filter((t) => t.done).length;
  const badges = [
    gestion.terminado ? `<span class="status-badge status-badge--terminado">✓ Terminado</span>` : "",
    gestion.publicado ? `<span class="status-badge status-badge--publicado">✓ Publicado</span>` : "",
    gestion.pautado ? `<span class="status-badge status-badge--pautado">✓ Pautado</span>` : "",
    taskTotal > 0 ? `<span class="status-badge status-badge--tasks${taskDone === taskTotal ? " status-badge--tasks-complete" : ""}">☑ ${taskDone}/${taskTotal}</span>` : ""
  ].filter(Boolean).join("");
  const badgesHtml = badges ? `<div class="status-badges">${badges}</div>` : "";
  const driveHtml = isValidUrl(gestion.drive)
    ? `<a href="${escapeAttr(gestion.drive)}" target="_blank" rel="noopener noreferrer" class="item-drive-link">📁 Ver en Drive ↗</a>`
    : "";
  const isColaboracion = (item.tags || []).includes("colaboración");
  const cardClasses = [
    "post-card",
    item.highlight ? "post-card--highlight" : "",
    isColaboracion ? "post-card--colaboracion" : "",
    status === "no-publicado" ? "post-card--no-publicado" : ""
  ].filter(Boolean).join(" ");

  const thumbInner = item.image
    ? `<img src="${escapeAttr(item.image)}" alt="" class="post-card__thumb-img" loading="lazy" />`
    : `<span class="post-card__thumb-icon">${thumb.icon}</span>`;

  return `
    <li class="${cardClasses}" data-item-key="${item._panelKey}">
      <div class="post-card__thumb" style="${item.image ? "" : `background:${thumb.gradient}`}">
        ${thumbInner}
        <span class="post-card__badge post-card__platform">${PLATFORM_ICONS[item.platform] || "📷"} ${PLATFORM_LABELS[item.platform] || "Instagram"}</span>
        <span class="post-card__badge post-card__status" style="background:var(--status-${status})">${STATUS_LABELS[status] || status}</span>
      </div>
      <div class="post-card__body" style="border-top-color:var(--status-${status})">
        <h3 class="post-card__title">${item.title}</h3>
        <div class="post-card__meta">📅 ${dateLabel}</div>
        ${descHtml}
        ${badgesHtml}
        ${driveHtml}
      </div>
    </li>
  `;
}

function renderCardGrid(items, emptyText) {
  if (!items.length) return `<p class="cards-empty">${emptyText}</p>`;
  return `<ul class="card-grid">${items.map(renderCard).join("")}</ul>`;
}

function renderContenido(unit) {
  const allItems = getAllItems(unit);
  const counts = { todos: allItems.length };
  allItems.forEach((i) => { const s = deriveStatus(i); counts[s] = (counts[s] || 0) + 1; });

  let items = currentContentFilter === "todos" ? allItems : allItems.filter((i) => deriveStatus(i) === currentContentFilter);
  items = [...items].sort((a, b) => {
    const da = parseMetaDate(a.meta), db = parseMetaDate(b.meta);
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return 0;
  });

  return `
    <div class="section-block">
      <div class="filters">
        ${CONTENT_FILTERS.map((f) => `
          <button type="button" class="filter-chip${f.key === currentContentFilter ? " filter-chip--active" : ""}" data-filter="${f.key}">
            ${f.color ? `<span class="filter-chip__dot" style="background:${f.color}"></span>` : ""}
            ${f.label} · ${counts[f.key] || 0}
          </button>
        `).join("")}
      </div>
      ${renderCardGrid(items, "No hay publicaciones con este filtro.")}
    </div>
  `;
}

// ---------- Sección: Ideas ----------

function analysisKey(unitId) {
  return `gala-panel:ideas-analysis:${unitId}`;
}

function loadAnalysis(unitId) {
  try {
    return JSON.parse(localStorage.getItem(analysisKey(unitId)) || "null");
  } catch {
    return null;
  }
}

function saveAnalysis(unitId, data) {
  localStorage.setItem(analysisKey(unitId), JSON.stringify(data));
}

let ideasAnalysisState = { generating: false, error: null };

const IDEAS_ANALYSIS_SYSTEM_PROMPT = `Sos un especialista en redes sociales que analiza el rendimiento real de una unidad de negocio de hotelería, gastronomía y entretenimiento en Argentina, y le da recomendaciones a la persona que gestiona el contenido.

Te dan el objetivo estratégico, los pilares de contenido y una lista de las publicaciones ya realizadas con sus estadísticas reales (likes, visualizaciones, comentarios). Con eso:
1. Identificá 2-4 patrones concretos de qué está funcionando (comparando formatos, temas o ganchos entre sí, citando siempre los números reales que respaldan cada observación). Si todavía no hay suficientes datos, decilo honestamente en vez de inventar un patrón.
2. Proponé 3-5 ideas de contenido NUEVAS y concretas (nada genérico) para probar, basadas en lo que ya funcionó y en los pilares de contenido de la unidad.

Tono: directo, profesional, como un colega de marketing que ya miró los números. Nada de lenguaje corporativo genérico.

Devolvé SOLO un JSON válido (sin texto antes ni después, sin bloques de código markdown, sin backticks), con exactamente esta forma:
{
  "insights": ["observación 1 con números reales", "observación 2", "..."],
  "contentIdeas": ["idea concreta 1", "idea concreta 2", "..."]
}`;

function buildIdeasContext(unit) {
  const items = getAllItems(unit);
  const published = items.filter((i) => typeof i.likes === "number");
  const top = [...published]
    .sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))
    .slice(0, 10);
  const lines = top.map((i) => {
    const format = ["reel", "flyer", "carrusel"].find((k) => (i.tags || []).includes(k)) || "otro";
    const stats = [`likes: ${i.likes}`];
    if (typeof i.views === "number") stats.push(`views: ${i.views}`);
    if (typeof i.comments === "number") stats.push(`comments: ${i.comments}`);
    return `- [${format}] "${i.title}" (${i.meta || "sin fecha"}) — ${stats.join(", ")}`;
  }).join("\n");
  return {
    publishedCount: published.length,
    topPostsText: lines || "Todavía no hay publicaciones con datos reales para esta unidad."
  };
}

async function callAnthropicIdeas(unit) {
  const apiKey = loadApiKey();
  const ctx = buildIdeasContext(unit);
  const userContent = `Unidad de negocio: ${unit.name}
Objetivo estratégico: ${unit.objective || ""}
Pilares de contenido: ${unit.pilares || ""}

Publicaciones ya realizadas (ordenadas por rendimiento):
${ctx.topPostsText}

Total de publicaciones con datos reales: ${ctx.publishedCount}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: IDEAS_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = (errBody && errBody.error && errBody.error.message) || `Error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error("Respuesta vacía de la API.");

  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.insights) || !Array.isArray(parsed.contentIdeas)) {
    throw new Error("La respuesta no tiene el formato esperado.");
  }
  return parsed;
}

async function handleGenerateIdeasAnalysis(unit) {
  ideasAnalysisState.generating = true;
  ideasAnalysisState.error = null;
  renderUnit(unit);

  try {
    const result = await callAnthropicIdeas(unit);
    saveAnalysis(unit.id, Object.assign({}, result, { generatedAt: Date.now() }));
  } catch (err) {
    ideasAnalysisState.error = err.message || "No se pudo generar el análisis. Revisá tu clave de API y probá de nuevo.";
  }
  ideasAnalysisState.generating = false;
  renderUnit(unit);
}

function ideasKey(unitId) {
  return `gala-panel:ideas:${unitId}`;
}

function loadIdeas(unitId) {
  try {
    return JSON.parse(localStorage.getItem(ideasKey(unitId)) || "[]");
  } catch {
    return [];
  }
}

function saveIdeas(unitId, ideas) {
  localStorage.setItem(ideasKey(unitId), JSON.stringify(ideas));
}

function renderIdeas(unit) {
  const ideas = loadIdeas(unit.id);
  const apiKey = loadApiKey();
  const analysis = loadAnalysis(unit.id);

  return `
    <div class="section-block">
      ${renderApiKeyPanel(apiKey)}

      <div class="panel">
        <div class="panel__title-row">
          <h3 class="panel__title">Especialista automático de RRSS</h3>
          ${analysis ? `<span class="preview-badge">🤖 Analizado el ${new Date(analysis.generatedAt).toLocaleDateString("es-AR")}</span>` : ""}
        </div>
        ${analysis ? `
          <h4 class="rec-group__title">📊 Qué está funcionando</h4>
          <ul class="rec-list">
            ${analysis.insights.map((r) => `<li class="rec-list__item"><span class="rec-list__icon">🤖</span><span>${r}</span></li>`).join("")}
          </ul>
          <h4 class="rec-group__title">💡 Ideas de contenido para probar</h4>
          <ul class="rec-list">
            ${analysis.contentIdeas.map((r) => `<li class="rec-list__item rec-list__item--idea"><span class="rec-list__icon">✏️</span><span>${r}</span></li>`).join("")}
          </ul>
        ` : `<p class="empty-note">${apiKey ? `Todavía no generaste un análisis para ${unit.name}.` : "Configurá tu clave de Anthropic arriba para poder generar el análisis."}</p>`}
        ${ideasAnalysisState.error ? `<p class="guion-error">${ideasAnalysisState.error}</p>` : ""}
        <button type="button" class="guion-generate-btn" id="ideas-analysis-btn" ${ideasAnalysisState.generating || !apiKey ? "disabled" : ""}>
          ${ideasAnalysisState.generating ? "Analizando..." : (analysis ? "🔄 Actualizar análisis" : "✨ Generar análisis")}
        </button>
      </div>

      <div class="panel">
        <h3 class="panel__title">Ideas rápidas</h3>
        <div class="idea-form">
          <textarea id="idea-input" class="idea-input" rows="2" placeholder="Anotá una idea para un futuro posteo..."></textarea>
          <button type="button" id="idea-add" class="idea-add-btn">+ Guardar idea</button>
        </div>
        <ul class="idea-list">
          ${ideas.length
            ? ideas.map((idea) => `
                <li class="idea-list__item" data-idea-id="${idea.id}">
                  <span>${idea.text}</span>
                  <button type="button" class="idea-delete" data-idea-id="${idea.id}" aria-label="Eliminar idea">✕</button>
                </li>
              `).join("")
            : `<li class="empty-note">Todavía no guardaste ninguna idea para ${unit.name}.</li>`
          }
        </ul>
      </div>
    </div>
  `;
}

// ---------- Sección: Guiones (generador con IA) ----------

const ANTHROPIC_KEY_STORAGE = "gala-panel:anthropic-key";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

function loadApiKey() {
  return localStorage.getItem(ANTHROPIC_KEY_STORAGE) || "";
}

function saveApiKey(key) {
  if (key) localStorage.setItem(ANTHROPIC_KEY_STORAGE, key);
  else localStorage.removeItem(ANTHROPIC_KEY_STORAGE);
}

function guionesLibraryKey(unitId) {
  return `gala-panel:guiones:${unitId}`;
}

function loadGuiones(unitId) {
  try {
    return JSON.parse(localStorage.getItem(guionesLibraryKey(unitId)) || "[]");
  } catch {
    return [];
  }
}

function saveGuiones(unitId, list) {
  localStorage.setItem(guionesLibraryKey(unitId), JSON.stringify(list));
}

let guionState = { generating: false, result: null, error: null, topic: "" };
let guionExpandedId = null;

const GUION_SYSTEM_PROMPT = `Sos un guionista experto en contenido para redes sociales (Instagram, Facebook, TikTok) de negocios de hotelería, gastronomía y entretenimiento en Argentina.
Te dan un tema y el contexto de una unidad de negocio específica. Generá un guion completo para un video corto de esa unidad.

Tono: profesional pero cercano, como si le hablaras a un amigo. Nada de lenguaje corporativo, acartonado o genérico. Usá "vos" (español rioplatense).

Devolvé SOLO un JSON válido (sin texto antes ni después, sin bloques de código markdown, sin backticks), con exactamente esta forma:
{
  "gancho": "las primeras 1-2 frases que enganchan en los primeros 3 segundos",
  "puntosClave": ["punto 1 a desarrollar", "punto 2", "punto 3"],
  "cierre": "cierre con llamada a la acción clara y específica",
  "duracionSugerida": "ej. 15-30 segundos",
  "formatoSugerido": "reel corto | video largo | historia",
  "justificacionFormato": "por qué ese formato es el más indicado para este tema, en una frase"
}`;

async function callAnthropic(unit, topic) {
  const apiKey = loadApiKey();
  const userContent = `Unidad de negocio: ${unit.name}
Objetivo estratégico: ${unit.objective || ""}
Pilares de contenido: ${unit.pilares || ""}

Tema del video: ${topic}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: GUION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = (errBody && errBody.error && errBody.error.message) || `Error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error("Respuesta vacía de la API.");

  let cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

async function handleGenerateScript(unit) {
  const input = document.getElementById("guion-topic-input");
  const topic = input ? input.value.trim() : "";
  if (!topic) return;

  guionState.topic = topic;
  guionState.generating = true;
  guionState.error = null;
  guionState.result = null;
  renderUnit(unit);

  try {
    const result = await callAnthropic(unit, topic);
    guionState.result = Object.assign({}, result, { topic });
  } catch (err) {
    guionState.error = err.message || "No se pudo generar el guion. Revisá tu clave de API y probá de nuevo.";
  }
  guionState.generating = false;
  renderUnit(unit);
}

function renderGuionBlock(icon, label, content) {
  return `
    <div class="guion-block">
      <span class="guion-block__label">${icon} ${label}</span>
      ${content}
    </div>
  `;
}

function renderGuionResult(result) {
  return `
    <div class="panel guion-result">
      <div class="guion-result__format-row">
        <span class="guion-result__format-badge">${result.formatoSugerido}</span>
        <span class="guion-result__duration">⏱ ${result.duracionSugerida}</span>
      </div>
      ${result.justificacionFormato ? `<p class="guion-result__justification">${result.justificacionFormato}</p>` : ""}
      ${renderGuionBlock("🪝", "Gancho", `<p class="guion-block__text">${result.gancho}</p>`)}
      ${renderGuionBlock("📋", "Puntos clave", `<ul class="guion-block__list">${(result.puntosClave || []).map((p) => `<li>${p}</li>`).join("")}</ul>`)}
      ${renderGuionBlock("🎯", "Cierre / llamada a la acción", `<p class="guion-block__text">${result.cierre}</p>`)}
      <button type="button" class="guion-save-btn" id="guion-save-btn">+ Guardar en biblioteca</button>
    </div>
  `;
}

function renderApiKeyPanel(apiKey) {
  return `
    <div class="panel guion-apikey-panel">
      ${apiKey ? `
        <div class="guion-apikey-status">
          <span>🔑 Clave de Anthropic configurada</span>
          <button type="button" class="guion-apikey-change" id="guion-apikey-change">Cambiar</button>
        </div>
      ` : `
        <h3 class="panel__title">Conectar tu clave de Anthropic</h3>
        <p class="empty-note">Se guarda solo en este navegador, nunca se sube al repositorio. Conseguila en console.anthropic.com.</p>
        <div class="guion-apikey-form">
          <input type="password" id="guion-apikey-input" placeholder="sk-ant-..." />
          <button type="button" class="guion-save-btn" id="guion-apikey-save">Guardar clave</button>
        </div>
      `}
    </div>
  `;
}

function renderGuiones(unit) {
  const apiKey = loadApiKey();
  const library = loadGuiones(unit.id);

  return `
    <div class="section-block">
      ${renderApiKeyPanel(apiKey)}

      <div class="panel">
        <h3 class="panel__title">Generar guion nuevo</h3>
        <textarea id="guion-topic-input" class="idea-input" rows="2" placeholder="¿De qué tema querés que hable el video?">${guionState.topic}</textarea>
        <button type="button" class="guion-generate-btn" id="guion-generate-btn" ${guionState.generating || !apiKey ? "disabled" : ""}>
          ${guionState.generating ? "Generando..." : "✨ Generar guion"}
        </button>
        ${!apiKey ? `<p class="empty-note">Configurá tu clave de Anthropic arriba para poder generar guiones.</p>` : ""}
        ${guionState.error ? `<p class="guion-error">${guionState.error}</p>` : ""}
      </div>

      ${guionState.result ? renderGuionResult(guionState.result) : ""}

      <div class="panel">
        <h3 class="panel__title">Biblioteca de guiones</h3>
        ${library.length ? `
          <ul class="guion-library">
            ${library.map((g) => `
              <li class="guion-library__item">
                <div class="guion-library__header" data-toggle-guion="${g.id}">
                  <div class="guion-library__header-text">
                    <span class="guion-library__topic">${g.topic}</span>
                    <span class="guion-library__meta">${g.formatoSugerido} · ${g.duracionSugerida}</span>
                  </div>
                  <button type="button" class="guion-library__delete" data-delete-guion="${g.id}" aria-label="Eliminar">✕</button>
                </div>
                ${guionExpandedId === g.id ? `
                  <div class="guion-library__body">
                    ${renderGuionBlock("🪝", "Gancho", `<p class="guion-block__text">${g.gancho}</p>`)}
                    ${renderGuionBlock("📋", "Puntos clave", `<ul class="guion-block__list">${(g.puntosClave || []).map((p) => `<li>${p}</li>`).join("")}</ul>`)}
                    ${renderGuionBlock("🎯", "Cierre", `<p class="guion-block__text">${g.cierre}</p>`)}
                  </div>
                ` : ""}
              </li>
            `).join("")}
          </ul>
        ` : `<p class="empty-note">Todavía no guardaste ningún guion para ${unit.name}.</p>`}
      </div>
    </div>
  `;
}

// ---------- Sección: Carruseles (generador visual con IA) ----------

const CAROUSEL_STYLES = [
  { key: "clasico", label: "Gala Clásico", swatch: "linear-gradient(135deg, #1c1712, #ff7a1a)" },
  { key: "editorial", label: "Claro Editorial", swatch: "linear-gradient(135deg, #f5eee3, #c4571a)" },
  { key: "vibrante", label: "Vibrante", swatch: "linear-gradient(135deg, #ff7a1a, #6c1f8f)" }
];

let carruselState = { generating: false, error: null, topic: "", slides: null, style: "clasico" };

const CARRUSEL_SYSTEM_PROMPT = `Sos un experto en contenido para carruseles de Instagram de negocios de hotelería, gastronomía y entretenimiento en Argentina.
Te dan un tema y el contexto de una unidad de negocio. Generá el texto completo para un carrusel de Instagram de entre 5 y 7 filminas sobre ese tema.

Tono: profesional pero cercano, como si le hablaras a un amigo. Usá "vos" (español rioplatense). Los textos deben ser CORTOS y de alto impacto visual (no párrafos largos): pensalos para que se lean en 2-3 segundos por filmina.

Estructura:
- Filmina 1: el gancho que detiene el scroll.
- Filminas del medio: desarrollo del contenido, una idea por filmina.
- Última filmina: cierre con llamada a la acción clara.

Devolvé SOLO un JSON válido (sin texto antes ni después, sin bloques de código markdown, sin backticks), con exactamente esta forma:
{
  "slides": [
    { "type": "gancho", "title": "título corto de la filmina 1", "body": "texto de apoyo breve, puede ser vacío" },
    { "type": "desarrollo", "title": "...", "body": "..." },
    { "type": "cierre", "title": "...", "body": "llamada a la acción" }
  ]
}`;

async function callAnthropicCarrusel(unit, topic) {
  const apiKey = loadApiKey();
  const userContent = `Unidad de negocio: ${unit.name}
Objetivo estratégico: ${unit.objective || ""}
Pilares de contenido: ${unit.pilares || ""}

Tema del carrusel: ${topic}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1536,
      system: CARRUSEL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const msg = (errBody && errBody.error && errBody.error.message) || `Error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error("Respuesta vacía de la API.");

  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.slides) || !parsed.slides.length) throw new Error("La respuesta no trajo filminas.");
  return parsed.slides.map((s, i) => ({ id: `slide-${i}`, type: s.type || "desarrollo", title: s.title || "", body: s.body || "" }));
}

async function handleGenerateCarrusel(unit) {
  const input = document.getElementById("carrusel-topic-input");
  const topic = input ? input.value.trim() : "";
  if (!topic) return;

  carruselState.topic = topic;
  carruselState.generating = true;
  carruselState.error = null;
  carruselState.slides = null;
  renderUnit(unit);

  try {
    carruselState.slides = await callAnthropicCarrusel(unit, topic);
  } catch (err) {
    carruselState.error = err.message || "No se pudo generar el carrusel. Revisá tu clave de API y probá de nuevo.";
  }
  carruselState.generating = false;
  renderUnit(unit);
}

async function handleDownloadCarrusel() {
  const btn = document.getElementById("carrusel-download-btn");
  if (!btn || typeof html2canvas === "undefined" || typeof JSZip === "undefined") return;
  const slideEls = Array.from(document.querySelectorAll(".carousel-slide"));
  if (!slideEls.length) return;

  btn.disabled = true;
  btn.textContent = "Generando imágenes...";
  try {
    const zip = new JSZip();
    for (let i = 0; i < slideEls.length; i++) {
      const canvas = await html2canvas(slideEls[i], { scale: 2, backgroundColor: null });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      zip.file(`filmina-${i + 1}.png`, blob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carrusel-${slugify(carruselState.topic || "sin-titulo")}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    carruselState.error = "No se pudieron generar las imágenes para descargar.";
    const unit = UNITS.find((u) => u.id === currentUnitId);
    if (unit) renderUnit(unit);
    return;
  }
  btn.disabled = false;
  btn.textContent = "⬇ Descargar todo (.zip)";
}

function renderCarouselSlide(slide, index, total, style) {
  return `
    <div class="carousel-slide carousel-slide--${style} carousel-slide--${slide.type}" data-slide-id="${slide.id}">
      <span class="carousel-slide__index">${index + 1}/${total}</span>
      <div class="carousel-slide__content">
        <h4 class="carousel-slide__title" contenteditable="true" data-slide-field="title" data-slide-id="${slide.id}">${slide.title}</h4>
        ${slide.body ? `<p class="carousel-slide__body" contenteditable="true" data-slide-field="body" data-slide-id="${slide.id}">${slide.body}</p>` : ""}
      </div>
    </div>
  `;
}

function renderCarruseles(unit) {
  const apiKey = loadApiKey();

  return `
    <div class="section-block">
      ${renderApiKeyPanel(apiKey)}

      <div class="panel">
        <h3 class="panel__title">Generar carrusel nuevo</h3>
        <textarea id="carrusel-topic-input" class="idea-input" rows="2" placeholder="¿De qué tema querés que hable el carrusel?">${carruselState.topic}</textarea>
        <button type="button" class="guion-generate-btn" id="carrusel-generate-btn" ${carruselState.generating || !apiKey ? "disabled" : ""}>
          ${carruselState.generating ? "Generando..." : "✨ Generar carrusel"}
        </button>
        ${!apiKey ? `<p class="empty-note">Configurá tu clave de Anthropic arriba para poder generar carruseles.</p>` : ""}
        ${carruselState.error ? `<p class="guion-error">${carruselState.error}</p>` : ""}
      </div>

      ${carruselState.slides ? `
        <div class="panel">
          <div class="panel__title-row">
            <h3 class="panel__title">Estilo visual</h3>
          </div>
          <div class="carousel-style-picker">
            ${CAROUSEL_STYLES.map((s) => `
              <button type="button" class="carousel-style-btn${carruselState.style === s.key ? " carousel-style-btn--active" : ""}" data-carrusel-style="${s.key}">
                <span class="carousel-style-btn__swatch" style="background:${s.swatch}"></span>
                ${s.label}
              </button>
            `).join("")}
          </div>

          <div class="carousel-preview">
            ${carruselState.slides.map((s, i) => renderCarouselSlide(s, i, carruselState.slides.length, carruselState.style)).join("")}
          </div>

          <p class="empty-note">Tocá cualquier texto de las filminas para editarlo antes de descargar.</p>
          <button type="button" class="guion-save-btn" id="carrusel-download-btn">⬇ Descargar todo (.zip)</button>
        </div>
      ` : ""}
    </div>
  `;
}

// ---------- Sección: Métricas ----------

function computeTrend(current, previous) {
  if (previous === null || previous === undefined) return { dir: null, pct: null };
  if (previous === 0) {
    if (current === 0) return { dir: null, pct: null };
    return { dir: "up", pct: null };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return { dir: null, pct: 0 };
  return { dir: pct > 0 ? "up" : "down", pct };
}

function renderTrendBadge(trend) {
  if (!trend || trend.dir === null) {
    return `<span class="trend-badge trend-badge--flat">— sin datos previos</span>`;
  }
  const arrow = trend.dir === "up" ? "▲" : "▼";
  const cls = trend.dir === "up" ? "trend-badge--up" : "trend-badge--down";
  const pctLabel = trend.pct !== null ? ` ${Math.abs(trend.pct).toFixed(0)}%` : "";
  return `<span class="trend-badge ${cls}">${arrow}${pctLabel}</span>`;
}

function heroCard(label, rawValue, trend, delayMs) {
  return `
    <div class="hero-card" style="animation-delay:${delayMs}ms">
      <span class="hero-card__label">${label}</span>
      <span class="hero-card__value" data-countup data-target="${rawValue}">0</span>
      ${renderTrendBadge(trend)}
    </div>
  `;
}

function renderBarChart(bars) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return `
    <div class="bar-chart">
      ${bars.map((b, i) => `
        <div class="bar-chart__col">
          <span class="bar-chart__value">${b.connected ? fmtNum(b.value) : "No conectado"}</span>
          <div class="bar-chart__track">
            <div class="bar-chart__fill${b.connected ? "" : " bar-chart__fill--disconnected"}" data-bar-target="${b.connected ? (b.value / max) * 100 : 6}" style="transition-delay:${i * 120 + 200}ms"></div>
          </div>
          <span class="bar-chart__label">${b.icon} ${b.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMetricas(unit) {
  const history = (unit.performance && unit.performance.history) || [];
  const items = getAllItems(unit);

  if (!history.length) {
    return `<div class="section-block"><p class="empty-note">Todavía no hay métricas acumuladas de cuenta para esta unidad — se van a ir completando con la sincronización diaria.</p></div>`;
  }

  const last = history[history.length - 1];
  const half = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, half);
  const secondHalf = history.slice(half);
  const avgOf = (arr, key) => (arr.length ? arr.reduce((a, d) => a + (d[key] || 0), 0) / arr.length : null);

  const totalFollowers = (last.followers || 0) + (last.fbFollowers || 0);
  const followersDelta = history.reduce((a, d) => a + (d.followersDelta || 0), 0);
  const followersTrend = followersDelta === 0 ? { dir: null, pct: null } : { dir: followersDelta > 0 ? "up" : "down", pct: null };

  const avgInteractions = Math.round(avgOf(history, "interactions") || 0);
  const interactionsTrend = history.length >= 4
    ? computeTrend(avgOf(secondHalf, "interactions"), avgOf(firstHalf, "interactions"))
    : { dir: null, pct: null };

  const now = new Date();
  const sameMonth = (d, ref) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let viewsThisMonth = 0, viewsPrevMonth = 0;
  history.forEach((d) => {
    const dt = new Date(d.date + "T00:00:00");
    if (sameMonth(dt, now)) viewsThisMonth += d.views || 0;
    else if (sameMonth(dt, prevMonthRef)) viewsPrevMonth += d.views || 0;
  });
  const viewsTrend = computeTrend(viewsThisMonth, viewsPrevMonth || null);

  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const published = items.filter((i) => typeof i.likes === "number");
  const recentPublished = published.filter((i) => { const d = parseMetaDate(i.meta); return d && d >= weekAgo; });
  const pool = recentPublished.length ? recentPublished : published;
  const bestPost = [...pool].sort((a, b) => (b.views || b.likes || 0) - (a.views || a.likes || 0))[0];
  const bestPostLabel = recentPublished.length ? "Mejor post de la semana" : "Mejor post (histórico)";

  const heroCards = [
    heroCard("Seguidores totales", totalFollowers, followersTrend, 0),
    heroCard("Interacción promedio / día", avgInteractions, interactionsTrend, 70),
    heroCard("Visualizaciones del mes", viewsThisMonth, viewsTrend, 140)
  ].join("");

  const bestPostCard = bestPost ? `
    <div class="hero-card hero-card--post" style="animation-delay:210ms">
      <span class="hero-card__label">${bestPostLabel}</span>
      <span class="hero-card__value" data-countup data-target="${bestPost.views || bestPost.likes}">0</span>
      <span class="hero-card__post-title">${thumbFor(bestPost).icon} ${bestPost.title}</span>
    </div>
  ` : `
    <div class="hero-card hero-card--post" style="animation-delay:210ms">
      <span class="hero-card__label">${bestPostLabel}</span>
      <span class="hero-card__post-title">Todavía no hay publicaciones con datos reales.</span>
    </div>
  `;

  const fbConnected = history.some((d) => typeof d.fbInteractions === "number");
  const fbInteractionsTotal = history.reduce((a, d) => a + (d.fbInteractions || 0), 0);

  const bars = [
    { label: "Instagram", icon: "📷", value: avgOf(history, "interactions") ? Math.round(history.reduce((a, d) => a + (d.interactions || 0), 0)) : 0, connected: true },
    { label: "Facebook", icon: "📘", value: fbInteractionsTotal, connected: fbConnected },
    { label: "TikTok", icon: "🎵", value: 0, connected: false }
  ];

  return `
    <div class="section-block">
      <div class="hero-grid">
        ${heroCards}
        ${bestPostCard}
      </div>

      <div class="panel">
        <h3 class="panel__title">Crecimiento — últimos ${history.length} día${history.length === 1 ? "" : "s"}</h3>
        ${renderMiniChart(history, true)}
      </div>

      <div class="panel">
        <h3 class="panel__title">Rendimiento por red</h3>
        ${renderBarChart(bars)}
      </div>
    </div>
  `;
}

// setTimeout (no requestAnimationFrame): rAF se pausa en pestañas en segundo
// plano o sin foco, dejando la animación "trabada"; setTimeout a ~60fps es
// igual de fluido y más robusto.
function animateMetricas() {
  const FRAME_MS = 16;

  document.querySelectorAll("[data-countup]").forEach((el) => {
    const target = parseFloat(el.dataset.target) || 0;
    const duration = 900;
    const start = Date.now();
    function tick() {
      const progress = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = fmtNum(Math.round(target * eased));
      if (progress < 1) setTimeout(tick, FRAME_MS);
    }
    tick();
  });

  const line = document.querySelector("[data-animate-line]");
  if (line) {
    const length = line.getTotalLength();
    line.style.transition = "none";
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(length);
    setTimeout(() => {
      line.style.transition = "stroke-dashoffset 1.1s ease";
      line.style.strokeDashoffset = "0";
    }, FRAME_MS);
  }

  document.querySelectorAll("[data-bar-target]").forEach((el) => {
    const target = parseFloat(el.dataset.barTarget) || 0;
    setTimeout(() => { el.style.height = `${target}%`; }, FRAME_MS);
  });
}

// ---------- Home: próximas publicaciones ----------

function getUpcomingForUnit(unit, limit) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [];
  for (const monthKey of MONTH_ORDER) {
    for (const item of unit.months[monthKey] || []) {
      if (typeof item.likes === "number") continue;
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
  content.classList.remove("main--full");

  const cardsHtml = UNITS.map((unit) => {
    const upcoming = getUpcomingForUnit(unit, 2);
    const logoHtml = unit.logo ? `<img src="${unit.logo}" alt="${unit.name}" class="home-unit-logo" />` : "";
    const itemsHtml = upcoming.length
      ? upcoming.map((item) => `
          <li class="home-alert-item">
            <span class="home-alert-date">${item.meta}</span>
            <span class="home-alert-title">${item.title}</span>
            <div class="home-alert-tags">${renderTags(item.tags)}</div>
          </li>
        `).join("")
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

// ---------- Desarrollo (tareas internas fijas) ----------

const DEV_MONTH_KEY = "general";

function renderDevelopment() {
  const content = document.getElementById("content");
  content.classList.remove("main--full");

  content.innerHTML = `
    <div class="unit-header">
      <h2 class="unit-header__name">Desarrollo</h2>
    </div>
    <div class="section-block">
      ${renderCardGrid(getWrappedDevTasks(), "Sin tareas registradas.")}
    </div>
  `;
}

// ---------- Render principal por unidad ----------

function renderSectionNav() {
  return `
    <div class="section-nav" role="tablist" aria-label="Secciones">
      ${SECTIONS.map((s) => `
        <button type="button" class="section-tab${s.key === currentSection ? " section-tab--active" : ""}" data-section="${s.key}">
          <span>${s.icon}</span> ${s.label}
        </button>
      `).join("")}
    </div>
  `;
}

function renderUnit(unit) {
  const content = document.getElementById("content");
  const logoHtml = unit.logo ? `<img src="${unit.logo}" alt="${unit.name}" class="unit-header__logo" />` : "";

  let sectionHtml = "";
  if (currentSection === "resumen") sectionHtml = renderResumen(unit);
  else if (currentSection === "calendario") sectionHtml = renderCalendario(unit);
  else if (currentSection === "actividades") sectionHtml = renderActividades(unit);
  else if (currentSection === "contenido") sectionHtml = renderContenido(unit);
  else if (currentSection === "ideas") sectionHtml = renderIdeas(unit);
  else if (currentSection === "guiones") sectionHtml = renderGuiones(unit);
  else if (currentSection === "carruseles") sectionHtml = renderCarruseles(unit);
  else if (currentSection === "metricas") sectionHtml = renderMetricas(unit);

  content.classList.toggle("main--full", currentSection === "calendario" || currentSection === "actividades");

  content.innerHTML = `
    <div class="unit-header">
      ${logoHtml}
      <div>
        <h2 class="unit-header__name">${unit.name}</h2>
        <div class="unit-header__sub">Instagram · Facebook</div>
      </div>
    </div>
    ${renderSectionNav()}
    ${sectionHtml}
  `;

  if (currentSection === "metricas" || currentSection === "resumen") {
    setTimeout(animateMetricas, 16);
  }
}

function setSection(section) {
  currentSection = section;
  currentContentFilter = "todos";
  guionState = { generating: false, result: null, error: null, topic: "" };
  guionExpandedId = null;
  carruselState = { generating: false, error: null, topic: "", slides: null, style: carruselState.style };
  closeEditorPanel();
  const unit = UNITS.find((u) => u.id === currentUnitId);
  if (unit) renderUnit(unit);
}

function setActiveTab(unitId) {
  document.querySelectorAll(".tab").forEach((btn) => {
    const active = btn.dataset.unit === unitId;
    btn.classList.toggle("tab--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  currentUnitId = unitId;
  closeEditorPanel();

  if (unitId === "inicio") {
    if (unsubscribePanels) { unsubscribePanels(); unsubscribePanels = null; }
    if (unsubscribePosts) { unsubscribePosts(); unsubscribePosts = null; }
    renderHome();
    history.replaceState(null, "", "#inicio");
    return;
  }

  if (unitId === "desarrollo") {
    if (unsubscribePosts) { unsubscribePosts(); unsubscribePosts = null; }
    renderDevelopment();
    subscribeToUnitPanels(unitId);
    history.replaceState(null, "", "#desarrollo");
    return;
  }

  const unit = UNITS.find((u) => u.id === unitId);
  if (unit) {
    currentSection = "resumen";
    currentContentFilter = "todos";
    guionState = { generating: false, result: null, error: null, topic: "" };
    guionExpandedId = null;
    carruselState = { generating: false, error: null, topic: "", slides: null, style: carruselState.style };
    ideasAnalysisState = { generating: false, error: null };
    renderUnit(unit);
    subscribeToUnitPanels(unitId);
    subscribeToUnitPosts(unitId);
    history.replaceState(null, "", `#${unitId}`);
  }
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

function initContentEvents() {
  document.getElementById("content").addEventListener("click", (e) => {
    const sectionBtn = e.target.closest(".section-tab");
    if (sectionBtn) {
      setSection(sectionBtn.dataset.section);
      return;
    }
    const filterChip = e.target.closest(".filter-chip");
    if (filterChip) {
      currentContentFilter = filterChip.dataset.filter;
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    if (e.target.id === "cal-prev-month" || e.target.id === "cal-next-month") {
      const idx = MONTH_ORDER.indexOf(currentCalMonth);
      const nextIdx = e.target.id === "cal-prev-month" ? idx - 1 : idx + 1;
      if (nextIdx >= 0 && nextIdx < MONTH_ORDER.length) {
        currentCalMonth = MONTH_ORDER[nextIdx];
        const unit = UNITS.find((u) => u.id === currentUnitId);
        if (unit) renderUnit(unit);
      }
      return;
    }
    if (e.target.id === "act-prev-month" || e.target.id === "act-next-month") {
      const idx = ACT_MONTH_ORDER.indexOf(currentActMonth);
      const nextIdx = e.target.id === "act-prev-month" ? idx - 1 : idx + 1;
      if (nextIdx >= 0 && nextIdx < ACT_MONTH_ORDER.length) {
        currentActMonth = ACT_MONTH_ORDER[nextIdx];
        const unit = UNITS.find((u) => u.id === currentUnitId);
        if (unit) renderUnit(unit);
      }
      return;
    }
    const calDayBtn = e.target.closest("[data-cal-day]");
    if (calDayBtn) {
      const monthIdx = MONTH_NUM[MONTH_TO_ABBR[currentCalMonth]];
      openDayList(currentUnitId, currentCalMonth, monthIdx, parseInt(calDayBtn.dataset.calDay, 10));
      return;
    }
    const postCard = e.target.closest(".post-card[data-item-key]");
    if (postCard) {
      const item = getCardItemByKey(currentUnitId, postCard.dataset.itemKey);
      if (item) openEditorFromCard(currentUnitId, item.monthKey, item);
      return;
    }
    const ideaAddBtn = e.target.closest("#idea-add");
    if (ideaAddBtn) {
      const input = document.getElementById("idea-input");
      const text = input.value.trim();
      if (!text) return;
      const ideas = loadIdeas(currentUnitId);
      ideas.unshift({ id: String(Date.now()), text });
      saveIdeas(currentUnitId, ideas);
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    const ideaDeleteBtn = e.target.closest(".idea-delete");
    if (ideaDeleteBtn) {
      const ideas = loadIdeas(currentUnitId).filter((i) => i.id !== ideaDeleteBtn.dataset.ideaId);
      saveIdeas(currentUnitId, ideas);
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    if (e.target.id === "ideas-analysis-btn") {
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) handleGenerateIdeasAnalysis(unit);
      return;
    }
    if (e.target.id === "guion-apikey-save") {
      const input = document.getElementById("guion-apikey-input");
      const key = input ? input.value.trim() : "";
      if (!key) return;
      saveApiKey(key);
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    if (e.target.id === "guion-apikey-change") {
      saveApiKey("");
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    if (e.target.id === "guion-generate-btn") {
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) handleGenerateScript(unit);
      return;
    }
    if (e.target.id === "guion-save-btn") {
      const list = loadGuiones(currentUnitId);
      list.unshift(Object.assign({}, guionState.result, { id: `guion-${Date.now()}` }));
      saveGuiones(currentUnitId, list);
      guionState = { generating: false, result: null, error: null, topic: "" };
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    const deleteGuionBtn = e.target.closest("[data-delete-guion]");
    if (deleteGuionBtn) {
      const list = loadGuiones(currentUnitId).filter((g) => g.id !== deleteGuionBtn.dataset.deleteGuion);
      saveGuiones(currentUnitId, list);
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    const toggleGuionBtn = e.target.closest("[data-toggle-guion]");
    if (toggleGuionBtn) {
      const id = toggleGuionBtn.dataset.toggleGuion;
      guionExpandedId = guionExpandedId === id ? null : id;
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    if (e.target.id === "carrusel-generate-btn") {
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) handleGenerateCarrusel(unit);
      return;
    }
    const styleBtn = e.target.closest("[data-carrusel-style]");
    if (styleBtn) {
      carruselState.style = styleBtn.dataset.carruselStyle;
      const unit = UNITS.find((u) => u.id === currentUnitId);
      if (unit) renderUnit(unit);
      return;
    }
    if (e.target.id === "carrusel-download-btn") {
      handleDownloadCarrusel();
    }
  });

  document.getElementById("content").addEventListener("input", (e) => {
    if (e.target.id === "guion-topic-input") {
      guionState.topic = e.target.value;
      return;
    }
    if (e.target.id === "carrusel-topic-input") {
      carruselState.topic = e.target.value;
      return;
    }
    const slideField = e.target.closest("[data-slide-field]");
    if (slideField && carruselState.slides) {
      const slide = carruselState.slides.find((s) => s.id === slideField.dataset.slideId);
      if (slide) slide[slideField.dataset.slideField] = e.target.textContent;
    }
  });
}

function init() {
  renderTabs();
  initContentEvents();
  initEditorPanelEvents();
  const fromHash = window.location.hash.replace("#", "");
  const validIds = ["inicio"].concat(UNITS.map((u) => u.id), ["desarrollo"]);
  const initialUnit = validIds.includes(fromHash) ? fromHash : "inicio";
  setActiveTab(initialUnit);
}

init();
