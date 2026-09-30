/* =========================================================
   ADMIN CHARTS
   Small dependency-free SVG helpers used by the dashboard.
   Everything is drawn from data passed in - nothing is
   generated here. Line charts are measured and redrawn at
   the real container width so labels stay readable and the
   chart never overflows or gets cropped.
========================================================= */

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatCount(value) {
  return Math.round(Number(value) || 0).toLocaleString();
}

export function renderEmpty(message, hint = "") {
  return `
    <div class="dash-empty">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
           stroke-linejoin="round" aria-hidden="true">
        <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />
      </svg>
      <strong>${escapeHtml(message)}</strong>
      ${hint ? `<span>${escapeHtml(hint)}</span>` : ""}
    </div>
  `;
}

/* Integer-friendly "nice" axis: 0..max with at most maxTicks steps. */
function niceScale(maxValue, maxTicks = 4) {
  if (!(maxValue > 0)) return { max: 1, ticks: [0, 1] };

  const rough = maxValue / maxTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const step = Math.max(1, nice * magnitude);
  const max = Math.ceil(maxValue / step) * step;

  const ticks = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);

  return { max, ticks };
}

/* ---------------------------------------------------------
   LINE / AREA CHART
   points: [{ label, value }]
--------------------------------------------------------- */

const observers = new Set();

// Call before a re-render so old observers never outlive their DOM.
export function disposeCharts() {
  observers.forEach((observer) => observer.disconnect());
  observers.clear();
}

function drawLine(container, points, options) {
  const { ariaLabel, unit } = options;

  const width = Math.max(Math.round(container.clientWidth), 240);
  const height = width < 460 ? 210 : 250;
  const pad = { top: 16, right: 16, bottom: 30, left: 38 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const values = points.map((point) => Number(point.value) || 0);
  const scale = niceScale(Math.max(...values, 0));

  const x = (index) =>
    points.length === 1
      ? pad.left + plotW / 2
      : pad.left + (index / (points.length - 1)) * plotW;
  const y = (value) => pad.top + plotH - (value / scale.max) * plotH;

  const coords = values.map((value, index) => [x(index), y(value)]);
  const line = coords
    .map(
      ([px, py], index) =>
        `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`,
    )
    .join(" ");
  const area =
    `${line} L${coords[coords.length - 1][0].toFixed(1)} ${pad.top + plotH}` +
    ` L${coords[0][0].toFixed(1)} ${pad.top + plotH} Z`;

  const grid = scale.ticks
    .map(
      (tick) => `
        <line class="dash-gridline" x1="${pad.left}" x2="${width - pad.right}"
              y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" />
        <text class="dash-axis" x="${pad.left - 8}" y="${(y(tick) + 4).toFixed(1)}"
              text-anchor="end">${formatCount(tick)}</text>`,
    )
    .join("");

  const maxLabels = Math.max(2, Math.floor(plotW / 64));
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));
  const xLabels = points
    .map((point, index) =>
      index % labelStep === 0
        ? `<text class="dash-axis" x="${x(index).toFixed(1)}" y="${height - 8}"
                 text-anchor="middle">${escapeHtml(point.label)}</text>`
        : "",
    )
    .join("");

  const showDots = points.length <= 14;
  const dots = showDots
    ? coords
        .map(
          ([px, py]) =>
            `<circle class="dash-dot" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" />`,
        )
        .join("")
    : "";

  container.innerHTML = `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}"
         role="img" aria-label="${escapeHtml(ariaLabel)}">
      <defs>
        <linearGradient id="dashTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#21a879" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#21a879" stop-opacity="0.01" />
        </linearGradient>
      </defs>
      ${grid}
      <path class="dash-area" d="${area}" />
      <path class="dash-line" d="${line}" fill="none" pathLength="1" />
      ${dots}
      ${xLabels}
      <line class="dash-guide" x1="0" x2="0" y1="${pad.top}" y2="${pad.top + plotH}" hidden />
      <circle class="dash-dot is-active" r="5" hidden />
      <rect class="dash-hit" x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="transparent" />
    </svg>
    <div class="dash-tooltip" role="status" hidden></div>
  `;

  const svg = container.querySelector("svg");
  const guide = svg.querySelector(".dash-guide");
  const activeDot = svg.querySelector(".dash-dot.is-active");
  const tooltip = container.querySelector(".dash-tooltip");
  const hit = svg.querySelector(".dash-hit");

  const hide = () => {
    guide.setAttribute("hidden", "");
    activeDot.setAttribute("hidden", "");
    tooltip.hidden = true;
  };

  hit.addEventListener("pointermove", (event) => {
    const box = svg.getBoundingClientRect();
    const scaleX = width / box.width;
    const px = (event.clientX - box.left) * scaleX;

    let nearest = 0;
    let best = Infinity;
    coords.forEach(([cx], index) => {
      const distance = Math.abs(cx - px);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });

    const [cx, cy] = coords[nearest];
    guide.setAttribute("x1", cx);
    guide.setAttribute("x2", cx);
    guide.removeAttribute("hidden");
    activeDot.setAttribute("cx", cx);
    activeDot.setAttribute("cy", cy);
    activeDot.removeAttribute("hidden");

    tooltip.innerHTML =
      `<strong>${formatCount(values[nearest])}</strong> ${escapeHtml(unit)}` +
      `<span>${escapeHtml(points[nearest].tooltipLabel || points[nearest].label)}</span>`;
    tooltip.hidden = false;

    const left = Math.min(
      Math.max((cx / width) * box.width, 60),
      box.width - 60,
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${(cy / height) * box.height}px`;
  });

  hit.addEventListener("pointerleave", hide);
}

export function mountLineChart(container, points, options = {}) {
  if (!container || !Array.isArray(points) || !points.length) return;

  let lastWidth = 0;
  const redraw = () => {
    const width = Math.round(container.clientWidth);
    if (!width || width === lastWidth) return;
    lastWidth = width;
    drawLine(container, points, {
      ariaLabel: options.ariaLabel || "Trend chart",
      unit: options.unit || "",
    });
  };

  redraw();

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(redraw);
    observer.observe(container);
    observers.add(observer);
  }
}

/* ---------------------------------------------------------
   DONUT
   items: [{ label, value }]
--------------------------------------------------------- */

export function renderDonut(
  items,
  { centerLabel = "Total", ariaLabel = "Distribution" } = {},
) {
  const rows = (items || [])
    .map((item) => ({
      label: String(item.label),
      value: Number(item.value) || 0,
    }))
    .filter((item) => item.value > 0);

  const total = rows.reduce((sum, item) => sum + item.value, 0);
  if (!total) return "";

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = rows
    .map((item, index) => {
      const length = (item.value / total) * circumference;
      const gap = rows.length > 1 ? 2 : 0;
      const segment = `
        <circle class="dash-donut-seg seg-${index % 6}" cx="80" cy="80" r="${radius}"
                stroke-dasharray="${Math.max(length - gap, 0.5).toFixed(2)} ${(circumference - length + gap).toFixed(2)}"
              stroke-dashoffset="${(-offset).toFixed(2)}"
              style="--dash-segment-offset:${(-offset).toFixed(2)};animation-delay:${index * 70}ms">
          <title>${escapeHtml(item.label)}: ${formatCount(item.value)}</title>
        </circle>`;
      offset += length;
      return segment;
    })
    .join("");

  const legend = rows
    .map(
      (item, index) => `
        <li>
          <span class="dash-swatch seg-${index % 6}"></span>
          <span class="dash-legend-label">${escapeHtml(item.label)}</span>
          <strong>${formatCount(item.value)}</strong>
          <em>${Math.round((item.value / total) * 100)}%</em>
        </li>`,
    )
    .join("");

  return `
    <div class="dash-donut">
      <svg viewBox="0 0 160 160" role="img" aria-label="${escapeHtml(ariaLabel)}">
        <circle class="dash-donut-track" cx="80" cy="80" r="${radius}" />
        <g transform="rotate(-90 80 80)">${segments}</g>
        <text class="dash-donut-total" x="80" y="80" text-anchor="middle">${formatCount(total)}</text>
        <text class="dash-donut-caption" x="80" y="98" text-anchor="middle">${escapeHtml(centerLabel)}</text>
      </svg>
      <ul class="dash-legend">${legend}</ul>
    </div>
  `;
}

/* ---------------------------------------------------------
   HORIZONTAL BARS
   items: [{ label, value }]
--------------------------------------------------------- */

export function renderBars(items) {
  const rows = (items || [])
    .map((item) => ({
      label: String(item.label),
      value: Number(item.value) || 0,
    }))
    .filter((item) => item.value > 0);

  if (!rows.length) return "";

  const max = Math.max(...rows.map((item) => item.value));

  return `
    <ul class="dash-bars">
      ${rows
        .map(
          (item) => `
            <li>
              <div class="dash-bar-head">
                <span title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
                <strong>${formatCount(item.value)}</strong>
              </div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill" style="width:${Math.max((item.value / max) * 100, 4).toFixed(1)}%"></div>
              </div>
            </li>`,
        )
        .join("")}
    </ul>
  `;
}
