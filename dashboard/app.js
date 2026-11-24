const audio = document.querySelector("#audio");
const timeline = document.querySelector("#timeline");
const crowdCanvas = document.querySelector("#crowdChart");
const detailCanvas = document.querySelector("#detailChart");

let motion = null;
let peaks = null;
let stats = [];
let events = [];
let participantIds = [];
let selectedId = null;
let duration = 120;
let crowdRms = [];
let currentTime = 0;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(field.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field !== "" || row.length) { row.push(field.trim()); rows.push(row); }
  return rows;
}

function csvObjects(text) {
  const rows = parseCsv(text);
  const headers = rows.shift();
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.text();
}

function parseTimeIndex(value) {
  if (!value) return null;
  if (value.includes(" ")) {
    const date = new Date(value.replace(" ", "T") + "Z");
    if (!Number.isNaN(date.valueOf())) return date.valueOf() / 1000;
  }
  const clock = value.match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
  if (clock) {
    const hours = Number(clock[1] || 0);
    const minutes = Number(clock[2]);
    const seconds = Number(clock[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function secondsLabel(value) {
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function parseStatsTime(value) {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

async function loadData() {
  try {
    const [motionText, peakText, statsText, eventText] = await Promise.all([
      fetchText("../final_clapping_section/final_section_motion.csv"),
      fetchText("../final_clapping_section/final_section_peaks.csv"),
      fetchText("../final_clapping_section/final_section_stats.csv"),
      fetchText("../final_clapping_section/final_stage_events.csv")
    ]);

    const motionRows = parseCsv(motionText);
    const headers = motionRows.shift();
    participantIds = headers.slice(1).filter(Boolean);
    motion = motionRows.map(row => {
      const rawTime = parseTimeIndex(row[0]);
      const values = {};
      headers.slice(1).forEach((id, i) => {
        const value = row[i + 1];
        values[id] = value === "" ? null : Number(value);
      });
      return { time: rawTime, values };
    });

    const firstTime = motion[0]?.time;
    if (Number.isFinite(firstTime)) {
      motion.forEach(row => row.time = row.time - firstTime);
    }
    duration = Math.max(motion[motion.length - 1]?.time ?? 0, 120);
    timeline.max = duration;
    timeline.value = 0;
    document.querySelector("#totalTime").textContent = secondsLabel(duration);

    peaks = csvObjects(peakText);
    stats = csvObjects(statsText);
    events = csvObjects(eventText).map(row => ({
      time: Number(row.TIME),
      label: row.LABEL
    }));

    calculateCrowdRms();
    renderMetrics();
    renderParticipants();
    renderEvents();
    renderChart(crowdCanvas, crowdRms, "#e55e3d", true);
    renderDetail();
    setLoadStatus(true);
  } catch (error) {
    setLoadStatus(false, error.message);
  }
}

function setLoadStatus(ready, message = "") {
  const status = document.querySelector(".status");
  status.classList.toggle("ready", ready);
  document.querySelector("#loadStatus").textContent = ready ? "Data ready" : message;
}

function calculateCrowdRms() {
  const binSize = 0.25;
  const bins = new Map();
  motion.forEach(row => {
    const time = row.time ?? 0;
    const bin = Math.floor(time / binSize) * binSize;
    const energies = Object.values(row.values).filter(value => Number.isFinite(value)).map(value => value * value);
    if (!energies.length) return;
    const rms = Math.sqrt(energies.reduce((sum, value) => sum + value, 0) / energies.length);
    const aggregate = bins.get(bin) ?? { sum: 0, count: 0 };
    aggregate.sum += rms;
    aggregate.count++;
    bins.set(bin, aggregate);
  });
  crowdRms = [...bins.entries()].sort((a, b) => a[0] - b[0])
    .map(([time, aggregate]) => ({ time, rms: aggregate.sum / aggregate.count }));
}

function getParticipantStats(id) {
  return stats.find(row => row.index === id);
}

function renderMetrics() {
  const validStats = stats.filter(row => row.start_time);
  document.querySelector("#participantCount").textContent = participantIds.length;
  document.querySelector("#clapperCount").textContent = validStats.length;
  document.querySelector("#duration").textContent = `${duration.toFixed(0)} s`;
  document.querySelector("#eventCount").textContent = events.length;
}

function renderParticipants() {
  const list = document.querySelector("#participantList");
  const search = document.querySelector("#participantSearch");
  const query = search.value.trim().toLowerCase();
  const ranked = participantIds.map(id => {
    const row = getParticipantStats(id);
    return { id, rms: row?.avr_rms ? Number(row.avr_rms) : 0 };
  }).sort((a, b) => b.rms - a.rms)
    .filter(item => item.id.toLowerCase().includes(query));

  list.replaceChildren();
  ranked.slice(0, 77).forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "participant-row" + (item.id === selectedId ? " active" : "");
    button.innerHTML = `<span class="participant-id">${item.id}</span><span class="participant-rms">${item.rms.toFixed(1)}</span>`;
    button.addEventListener("click", () => selectParticipant(item.id));
    list.appendChild(button);
  });
}

function selectParticipant(id) {
  selectedId = id;
  document.querySelector("#selectedTitle").textContent = id;
  renderParticipants();
  renderDetail();
  renderStats();
}

function renderStats() {
  const box = document.querySelector("#statsList");
  if (!selectedId) {
    box.innerHTML = `
      <div><dt>Start</dt><dd>--</dd></div>
      <div><dt>End</dt><dd>--</dd></div>
      <div><dt>Duration</dt><dd>--</dd></div>
      <div><dt>Median interval</dt><dd>--</dd></div>`;
    return;
  }
  const row = getParticipantStats(selectedId);
  const start = parseStatsTime(row?.start_time);
  const end = parseStatsTime(row?.end_time);
  box.innerHTML = `
    <div><dt>Start</dt><dd>${row?.start_time ? secondsLabel(start) : "--"}</dd></div>
    <div><dt>End</dt><dd>${row?.end_time ? secondsLabel(end) : "--"}</dd></div>
    <div><dt>Duration</dt><dd>${row?.duration ? `${Number(row.duration).toFixed(1)} s` : "--"}</dd></div>
    <div><dt>Median interval</dt><dd>${row?.median_interclap_interval ? `${Number(row.median_interclap_interval).toFixed(2)} s` : "--"}</dd></div>`;
}

function renderEvents() {
  const labels = document.querySelector("#eventLabels");
  labels.replaceChildren();
  events.forEach(event => {
    const button = document.createElement("button");
    button.textContent = event.label;
    button.style.left = `${Math.max(0, Math.min(100, event.time / duration * 100))}%`;
    button.addEventListener("click", () => seek(event.time));
    labels.appendChild(button);
  });

  const table = document.querySelector("#eventTable");
  table.replaceChildren();
  events.forEach(event => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "event";
    item.innerHTML = `<span class="event-time">${secondsLabel(event.time)}</span><span class="event-name">${event.label}</span>`;
    item.addEventListener("click", () => seek(event.time));
    table.appendChild(item);
  });
}

function seek(time) {
  const target = Math.max(0, Math.min(duration, time));
  if (audio.readyState > 0) audio.currentTime = target;
  timeline.value = target;
  currentTime = target;
  updateTimeDisplay();
  drawCurrentMarkers();
}

function updateTimeDisplay() {
  document.querySelector("#currentTime").textContent = secondsLabel(currentTime);
  timeline.value = currentTime;
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = canvas.clientHeight || 260;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width: cssWidth, height: cssHeight };
}

function renderChart(canvas, series, color, hasEvents = false, peakPoints = []) {
  const { context, width, height } = setupCanvas(canvas);
  const padding = { left: 42, right: 12, top: 10, bottom: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.clearRect(0, 0, width, height);

  const maxValue = Math.max(...series.map(point => point.rms ?? point.value ?? 0), 1);
  context.strokeStyle = "#dad6ca";
  context.lineWidth = 1;
  context.fillStyle = "#69736e";
  context.font = "10px Segoe UI";
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + plotHeight * i / 4;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  context.beginPath();
  series.forEach((point, i) => {
    const x = padding.left + (point.time / duration) * plotWidth;
    const value = point.rms ?? point.value ?? 0;
    const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
    if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#69736e";
  for (let i = 0; i <= 6; i++) {
    const value = duration * i / 6;
    const x = padding.left + plotWidth * i / 6;
    context.fillText(secondsLabel(value), x - 18, height - 5);
  }

  if (hasEvents) {
    context.save();
    context.setLineDash([3, 4]);
    context.strokeStyle = "#bcae84";
    events.forEach(event => {
      const x = padding.left + event.time / duration * plotWidth;
      context.beginPath();
      context.moveTo(x, padding.top);
      context.lineTo(x, height - padding.bottom);
      context.stroke();
    });
    context.restore();
  }

  peakPoints.forEach(point => {
    const x = padding.left + point.time / duration * plotWidth;
    const value = point.value;
    const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
    context.beginPath();
    context.arc(x, y, 2.5, 0, Math.PI * 2);
    context.fillStyle = "#e7bd62";
    context.fill();
  });

  canvas._chart = { padding, plotWidth, plotHeight };
  drawCurrentMarkers();
}

function renderDetail() {
  if (selectedId) {
    const series = motion.map(row => ({
      time: row.time,
      value: row.values[selectedId]
    })).filter(point => Number.isFinite(point.value));
    const selectedPeaks = peaks.map(row => ({
      time: parseTimeIndex(row.index),
      value: row[selectedId] === "" ? null : Number(row[selectedId])
    })).filter(point => Number.isFinite(point.time) && Number.isFinite(point.value));
    renderChart(detailCanvas, series.map(point => ({ time: point.time, rms: point.value })), "#2f725d", false, selectedPeaks);
  } else {
    renderChart(detailCanvas, crowdRms.map(point => ({ time: point.time, rms: point.rms })), "#2f725d", false);
  }
  renderStats();
}

function drawCurrentMarkers() {
  [crowdCanvas, detailCanvas].forEach(canvas => {
    if (!canvas._chart) return;
    const context = canvas.getContext("2d");
    const { padding, plotWidth, plotHeight } = canvas._chart;
    const x = padding.left + currentTime / duration * plotWidth;
    context.save();
    context.strokeStyle = "#18201d";
    context.lineWidth = 1;
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, padding.top + plotHeight);
    context.stroke();
    context.restore();
  });
}

audio.addEventListener("timeupdate", () => {
  currentTime = audio.currentTime;
  updateTimeDisplay();
});
audio.addEventListener("loadedmetadata", () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    timeline.max = Math.min(duration, audio.duration);
  }
});

timeline.addEventListener("input", () => seek(Number(timeline.value)));
document.querySelector("#clearSelection").addEventListener("click", () => {
  selectedId = null;
  document.querySelector("#selectedTitle").textContent = "Entire crowd";
  renderParticipants();
  renderDetail();
});
document.querySelector("#participantSearch").addEventListener("input", renderParticipants);
window.addEventListener("resize", () => {
  renderChart(crowdCanvas, crowdRms, "#e55e3d", true);
  renderDetail();
});

let lastRedraw = 0;
function animate() {
  const now = performance.now();
  if (now - lastRedraw > 250) {
    lastRedraw = now;
    if (!audio.paused) {
      renderChart(crowdCanvas, crowdRms, "#e55e3d", true);
      renderDetail();
    }
  }
  requestAnimationFrame(animate);
}

loadData();
requestAnimationFrame(animate);
