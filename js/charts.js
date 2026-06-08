/* ============================================================
   CHARTS — Chart.js builders. Chart is loaded as a global via
   <script> in index.html. Each builder destroys any previous
   instance bound to the same canvas id.
   ============================================================ */
import { GTSRB, FGSM_CURVE, NOISE_CURVE, trainingCurves, ABLATION_PLACEMENT } from "./data.js";

const CYAN = "#2de2e6";
const VIOLET = "#b16cff";
const PINK = "#ff4d6d";
const GREEN = "#7ee787";
const AMBER = "#ffc107";
const GRID = "rgba(255,255,255,0.06)";
const TICK = "#7b8194";

const registry = {};
function mount(id, cfg) {
  if (typeof Chart === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  if (registry[id]) registry[id].destroy();
  Chart.defaults.font.family = "'Sora', sans-serif";
  Chart.defaults.color = TICK;
  registry[id] = new Chart(el.getContext("2d"), cfg);
}

const baseScales = (yTitle, yMin, yMax) => ({
  x: { grid: { color: GRID }, ticks: { color: TICK } },
  y: {
    grid: { color: GRID }, ticks: { color: TICK },
    title: { display: !!yTitle, text: yTitle, color: TICK },
    min: yMin, max: yMax,
  },
});
const legend = { labels: { color: "#cdd2dc", usePointStyle: true, boxWidth: 8, padding: 16 } };

/* ---- benchmark: accuracy + robustness grouped bars ---- */
export function chartBenchmark() {
  const labels = GTSRB.map((d) => d.m.replace(" (Ours)", ""));
  const bg = GTSRB.map((d) => (d.ours ? CYAN : "rgba(255,255,255,0.22)"));
  const bg2 = GTSRB.map((d) => (d.ours ? VIOLET : "rgba(255,255,255,0.12)"));
  mount("chartBenchmark", {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Accuracy %", data: GTSRB.map((d) => d.acc), backgroundColor: bg, borderRadius: 4 },
        { label: "FGSM Robustness %", data: GTSRB.map((d) => d.fgsm), backgroundColor: bg2, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend }, scales: baseScales("score", 50, 100),
    },
  });
}

/* ---- parameter efficiency ---- */
export function chartParams() {
  const sorted = [...GTSRB].sort((a, b) => a.pNum - b.pNum);
  mount("chartParams", {
    type: "bar",
    data: {
      labels: sorted.map((d) => d.m.replace(" (Ours)", "")),
      datasets: [{
        label: "Params (M)",
        data: sorted.map((d) => d.pNum),
        backgroundColor: sorted.map((d) => (d.ours ? CYAN : "rgba(255,255,255,0.18)")),
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { type: "logarithmic", grid: { color: GRID }, ticks: { color: TICK } }, y: { grid: { color: GRID }, ticks: { color: TICK } } },
    },
  });
}

/* ---- multi-metric radar ---- */
export function chartRadar() {
  const pick = (m) => GTSRB.find((d) => d.m.startsWith(m));
  const hqc = pick("HQC"), res = pick("ResNet"), vit = pick("ViT");
  const axes = ["Accuracy", "F1", "Noise Rob.", "FGSM", "PGD-20", "Separability"];
  const row = (d) => [d.acc, d.f1, d.rob, d.fgsm, d.pgd, d.sil * 100];
  mount("chartRadar", {
    type: "radar",
    data: {
      labels: axes,
      datasets: [
        { label: "HQC-CNN", data: row(hqc), borderColor: CYAN, backgroundColor: "rgba(45,226,230,0.18)", pointBackgroundColor: CYAN },
        { label: "ResNet-50", data: row(res), borderColor: PINK, backgroundColor: "rgba(255,77,109,0.10)", pointBackgroundColor: PINK },
        { label: "ViT-B/16", data: row(vit), borderColor: AMBER, backgroundColor: "rgba(255,193,7,0.08)", pointBackgroundColor: AMBER },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend },
      scales: { r: { min: 40, max: 100, grid: { color: GRID }, angleLines: { color: GRID }, pointLabels: { color: "#cdd2dc", font: { size: 11 } }, ticks: { color: TICK, backdropColor: "transparent" } } },
    },
  });
}

/* ---- robustness curves ---- */
function curveChart(id, data, xs, xlabel) {
  const ds = (name, color, dash) => ({
    label: name, data: data[name], borderColor: color, backgroundColor: color,
    borderDash: dash || [], tension: 0.3, pointRadius: 2, borderWidth: name === "HQC-CNN" ? 3 : 1.5,
  });
  mount(id, {
    type: "line",
    data: {
      labels: xs,
      datasets: [
        ds("HQC-CNN", CYAN),
        ds("ResNet-50", PINK, [5, 4]),
        ds("ViT-B/16", AMBER, [2, 3]),
        ds("LeNet-5", "rgba(255,255,255,0.4)", [2, 3]),
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend }, scales: { x: { grid: { color: GRID }, ticks: { color: TICK }, title: { display: true, text: xlabel, color: TICK } }, y: baseScales(null, 25, 100).y },
    },
  });
}
export function chartFGSM() { curveChart("chartFGSM", FGSM_CURVE, FGSM_CURVE.eps, "FGSM perturbation ε"); }
export function chartNoise() { curveChart("chartNoise", NOISE_CURVE, NOISE_CURVE.sigma, "Gaussian noise σ"); }

/* ---- training dynamics ---- */
export function chartTraining() {
  const c = trainingCurves();
  mount("chartTrainAcc", {
    type: "line",
    data: {
      labels: c.ep,
      datasets: [
        { label: "HQC-CNN", data: c.hAcc, borderColor: CYAN, borderWidth: 2.5, pointRadius: 0, tension: 0.25 },
        { label: "ResNet-50", data: c.rAcc, borderColor: PINK, borderWidth: 1.6, borderDash: [5, 4], pointRadius: 0, tension: 0.25 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend, annotation: false },
      scales: { x: { grid: { color: GRID }, ticks: { color: TICK, maxTicksLimit: 11 }, title: { display: true, text: "epoch", color: TICK } }, y: baseScales("val accuracy %", 80, 100).y },
    },
  });
  mount("chartTrainLoss", {
    type: "line",
    data: {
      labels: c.ep,
      datasets: [
        { label: "HQC-CNN", data: c.hLoss, borderColor: VIOLET, borderWidth: 2.5, pointRadius: 0, tension: 0.25 },
        { label: "ResNet-50", data: c.rLoss, borderColor: "rgba(255,255,255,0.45)", borderWidth: 1.6, borderDash: [5, 4], pointRadius: 0, tension: 0.25 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend },
      scales: { x: { grid: { color: GRID }, ticks: { color: TICK, maxTicksLimit: 11 }, title: { display: true, text: "epoch", color: TICK } }, y: baseScales("cross-entropy loss", 0, 1.5).y },
    },
  });
}

/* ---- ablation placement bar ---- */
export function chartAblation() {
  mount("chartAblation", {
    type: "bar",
    data: {
      labels: ABLATION_PLACEMENT.map((d) => d.cfg),
      datasets: [{
        label: "Validation Accuracy %",
        data: ABLATION_PLACEMENT.map((d) => d.acc),
        backgroundColor: ABLATION_PLACEMENT.map((d) => (d.ours ? GREEN : "rgba(255,255,255,0.2)")),
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { min: 92, max: 99, grid: { color: GRID }, ticks: { color: TICK } }, y: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 11 } } } },
    },
  });
}
