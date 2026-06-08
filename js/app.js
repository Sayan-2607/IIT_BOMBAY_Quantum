/* ============================================================
   APP — view router + content rendering + lazy module init.
   ============================================================ */
import {
  HEADLINE, GTSRB, LISA, ABLATION_ENTANGLE, COMPUTE, HYPERPARAMS, PIPELINE,
} from "./data.js";
import { initHero } from "./hero.js";
import { buildCircuit } from "./circuit.js";
import { initFeatures } from "./features.js";
import { initAnalyzer, initAdversarial } from "./demos.js";
import { initLab, stopLab } from "./lab.js";
import { initIBMQ, stopIBMQ } from "./ibmq.js";
import { initLanding, startTour, maybeAutoTour } from "./landing.js";
import * as Charts from "./charts.js";

/* ---------- boot loader ---------- */
window.addEventListener("DOMContentLoaded", () => {
  initHero(document.getElementById("heroCanvas"));
  renderHeadline();
  renderBenchmarkTable();
  renderLisaTable();
  renderEntangleTable();
  renderComputeTable();
  renderHyperTable();
  renderPipeline();
  initCircuit();
  setupNav();
  setTimeout(() => document.getElementById("loader").classList.add("done"), 600);
  // open default view (behind the landing cover)
  showView("overview");
  // public front-door landing + first-visit tour
  initLanding(() => maybeAutoTour());
  const tb = document.getElementById("tourBtn");
  if (tb) tb.onclick = startTour;
});

/* ---------- navigation / view switching ---------- */
const initialised = {};
let currentView = null;
function showView(id) {
  if (currentView === "lab" && id !== "lab") stopLab();   // release webcam + rAF
  if (currentView === "ibmq" && id !== "ibmq") stopIBMQ(); // pause job stream
  currentView = id;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + id));
  document.querySelectorAll(".side-nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === id));
  document.getElementById("main").scrollTop = 0;

  // lazy init heavy content per view
  if (!initialised[id]) {
    initialised[id] = true;
    requestAnimationFrame(() => lazyInit(id));
  }
  // charts must (re)size when their container becomes visible
  requestAnimationFrame(() => lazyInit(id, true));
}

function lazyInit(id, reflowOnly) {
  switch (id) {
    case "overview": Charts.chartBenchmark(); break;
    case "analyzer": if (!reflowOnly) initAnalyzer(); break;
    case "adversarial":
      if (!reflowOnly) initAdversarial();
      Charts.chartFGSM(); Charts.chartNoise(); break;
    case "features": if (!reflowOnly) initFeatures(document.getElementById("fxClassical"), document.getElementById("fxHybrid")); break;
    case "circuit": break;
    case "lab": initLab(); break;
    case "ibmq": initIBMQ(); break;
    case "benchmark": Charts.chartParams(); Charts.chartRadar(); break;
    case "research": Charts.chartTraining(); Charts.chartAblation(); break;
  }
}

function setupNav() {
  document.querySelectorAll("[data-view]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showView(a.dataset.view);
      document.getElementById("sidebar").classList.remove("open");
    });
  });
  document.getElementById("burger").addEventListener("click", () =>
    document.getElementById("sidebar").classList.toggle("open"));
}

/* ---------- headline metrics ---------- */
function renderHeadline() {
  const stats = [
    { v: HEADLINE.acc + "%", l: "GTSRB Top-1 Accuracy", d: "+" + HEADLINE.accDelta + "% vs ResNet-50" },
    { v: "+" + HEADLINE.fgsmDelta + "%", l: "FGSM Robustness", d: HEADLINE.fgsm + "% @ ε=0.10" },
    { v: "+" + HEADLINE.noiseDelta + "%", l: "Gaussian-Noise Robustness", d: HEADLINE.noise + "% @ σ=0.15" },
    { v: "−" + HEADLINE.paramDelta + "%", l: "Parameters vs ResNet-50", d: HEADLINE.params + "M total" },
    { v: "+" + HEADLINE.silDelta + "%", l: "Feature Separability", d: "Silhouette " + HEADLINE.sil },
    { v: HEADLINE.qParams, l: "Quantum Parameters", d: HEADLINE.qubits + " qubits · depth " + HEADLINE.depth },
  ];
  document.getElementById("statGrid").innerHTML = stats.map((s) => `
    <div class="stat reveal">
      <div class="stat__v">${s.v}</div>
      <div class="stat__l">${s.l}</div>
      <div class="stat__d mono">${s.d}</div>
    </div>`).join("");
}

/* ---------- tables ---------- */
function cell(v, ours) { return `<td class="${ours ? "ours" : ""}">${v}</td>`; }

function renderBenchmarkTable() {
  const rows = GTSRB.map((d) => `
    <tr class="${d.ours ? "row-ours" : ""}">
      <td class="lead-cell">${d.m}</td>
      ${cell(d.acc, d.ours)}${cell(d.f1)}${cell(d.params)}
      ${cell(d.rob)}${cell(d.fgsm)}${cell(d.pgd)}${cell(d.sil)}
    </tr>`).join("");
  document.getElementById("benchTable").innerHTML = `
    <thead><tr><th>Method</th><th>Acc %</th><th>F1 %</th><th>Params</th><th>Noise %</th><th>FGSM %</th><th>PGD-20 %</th><th>Silhouette</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderLisaTable() {
  const rows = LISA.map((d) => `
    <tr class="${d.ours ? "row-ours" : ""}">
      <td class="lead-cell">${d.m}</td>${cell(d.acc, d.ours)}${cell(d.f1)}${cell(d.rob)}${cell(d.fgsm)}
    </tr>`).join("");
  document.getElementById("lisaTable").innerHTML = `
    <thead><tr><th>Method</th><th>Acc %</th><th>F1 %</th><th>Noise %</th><th>FGSM %</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderEntangleTable() {
  const rows = ABLATION_ENTANGLE.map((d) => `
    <tr class="${d.ours ? "row-ours" : ""}">
      <td class="lead-cell">${d.p}</td>${cell(d.q.toFixed(2), d.ours)}${cell(d.expr.toFixed(3))}${cell(d.acc)}${cell(d.rob)}
    </tr>`).join("");
  document.getElementById("entangleTable").innerHTML = `
    <thead><tr><th>Entanglement</th><th>MW Q̄</th><th>ε_expr</th><th>Acc %</th><th>Robust %</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderComputeTable() {
  const rows = COMPUTE.map((d) => `
    <tr class="${d.ours ? "row-ours" : ""}">
      <td class="lead-cell">${d.c}</td>${cell(d.params, d.ours)}${cell(d.flops)}${cell(d.train)}${cell(d.infer)}
    </tr>`).join("");
  document.getElementById("computeTable").innerHTML = `
    <thead><tr><th>Component</th><th>Params</th><th>FLOPs</th><th>Train/ep</th><th>Inference</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderHyperTable() {
  let last = "";
  const rows = HYPERPARAMS.map(([cat, k, v]) => {
    const head = cat !== last ? `<tr class="cat-row"><td colspan="2">${cat}</td></tr>` : "";
    last = cat;
    return head + `<tr><td class="hp-key">${k}</td><td class="mono hp-val">${v}</td></tr>`;
  }).join("");
  document.getElementById("hyperTable").innerHTML = `<tbody>${rows}</tbody>`;
}

/* ---------- architecture pipeline (Fig 1) ---------- */
function renderPipeline() {
  const stage = (arr, cls) => arr.map((s) => `
    <div class="pl-node ${cls}">
      <span class="pl-node__l">${s.l}</span>
      <span class="pl-node__d mono">${s.d}</span>
      ${s.branch ? `<span class="pl-branch mono">↳ ${s.branch}</span>` : ""}
    </div>`).join(`<span class="pl-arrow">→</span>`);
  document.getElementById("pipeline").innerHTML = `
    <div class="pl-group">
      <span class="pl-tag cfe">Classical Feature Extraction</span>
      <div class="pl-row">${stage(PIPELINE.cfe, "n-cfe")}</div>
    </div>
    <div class="pl-group">
      <span class="pl-tag qcm">Quantum Convolutional Module</span>
      <div class="pl-row">${stage(PIPELINE.qcm, "n-qcm")}</div>
    </div>
    <div class="pl-group">
      <span class="pl-tag hch">Hybrid Classification Head</span>
      <div class="pl-row">${stage(PIPELINE.hch, "n-hch")}</div>
    </div>`;
}

/* ---------- circuit + controls ---------- */
function initCircuit() {
  const opts = { E1: true, E2: true, E3: true };
  const host = document.getElementById("circuitHost");
  const render = () => { host.innerHTML = buildCircuit(opts); };
  render();
  document.querySelectorAll("[data-ent]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.ent;
      opts[key] = !opts[key];
      btn.classList.toggle("off", !opts[key]);
      render();
    });
  });
}
