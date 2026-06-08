/* ============================================================
   DEMOS — Vision Analyzer & Adversarial Simulator.

   Now powered by the REAL in-browser quantum engine:
   • ⟨Z⟩ feature vectors and entanglement are computed live from
     the actual input pixels via the 4-qubit VQC (quantum.js).
   • Adversarial robustness shows the REAL quantum state fidelity
     |⟨ψ_clean|ψ_attacked⟩|² between clean and perturbed encodings.
   Class-label confidences remain illustrative (modeled from the
   paper) and are labeled as such; everything quantum is real.
   ============================================================ */
import { SIGN_CLASSES, FGSM_CURVE, NOISE_CURVE } from "./data.js";
import { runVQC, fidelity, defaultTheta } from "./quantum.js";
import { drawZ } from "./live.js";
import { drawSign, canvasToAngles } from "./signs.js";

const THETA = defaultTheta(7);
const OPTS = { E1: true, E2: true, E3: true };

function fakeSoftmax(trueClass, peak, sharp) {
  const out = SIGN_CLASSES.map((name) => ({ name, p: name === trueClass ? peak : Math.random() * (1 - peak) * 0.4 }));
  out.forEach((o) => (o.p = Math.pow(o.p, sharp)));
  const sum = out.reduce((s, o) => s + o.p, 0);
  out.forEach((o) => (o.p = o.p / sum));
  return out.sort((a, b) => b.p - a.p).slice(0, 3);
}
function predRows(preds, accent) {
  return preds.map((p, i) => `
    <div class="pred"><span class="pred__name">${p.name}</span>
      <span class="pred__bar"><i style="width:${(p.p * 100).toFixed(1)}%;background:${i === 0 ? accent : "rgba(255,255,255,.25)"}"></i></span>
      <span class="pred__pct mono">${(p.p * 100).toFixed(1)}%</span></div>`).join("");
}

/* =================== ANALYZER =================== */
export function initAnalyzer() {
  const $ = (id) => document.getElementById(id);
  const stage = $("anStage"); if (!stage) return;
  const ctx = stage.getContext("2d", { willReadFrequently: true });
  const zCanvas = $("anZ"), mwEl = $("anMw"), out = $("anResults");
  let trueClass = "Stop", hasImage = false, camStream = null, camTimer = null;

  function quantumReadout() {
    const angles = canvasToAngles(stage);
    const r = runVQC(angles, THETA, OPTS);
    if (zCanvas) drawZ(zCanvas, r.z);
    if (mwEl) mwEl.textContent = r.mw.toFixed(3);
    return r;
  }
  function setSample(name) { trueClass = name; drawSign(ctx, name, stage.width); hasImage = true; out.innerHTML = ""; quantumReadout(); }

  const sampleWrap = $("anSamples");
  ["Stop", "Speed 30", "Yield", "No entry"].forEach((name) => {
    const b = document.createElement("button"); b.className = "chip"; b.textContent = name;
    b.onclick = () => { stopCam(); sampleWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); setSample(name); };
    if (name === "Stop") b.classList.add("on");
    sampleWrap.appendChild(b);
  });
  setSample("Stop");

  $("anFile").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return; stopCam();
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, stage.width, stage.height); ctx.drawImage(img, 0, 0, stage.width, stage.height); hasImage = true; trueClass = SIGN_CLASSES[Math.floor(Math.random() * 4)]; out.innerHTML = ""; quantumReadout(); };
    img.src = URL.createObjectURL(f);
    sampleWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
  });

  /* webcam live mode */
  const camBtn = $("anCam"), video = $("anVideo");
  function stopCam() {
    if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
    if (camTimer) { clearInterval(camTimer); camTimer = null; }
    camBtn.classList.remove("on"); camBtn.textContent = "▶ webcam";
  }
  camBtn.addEventListener("click", async () => {
    if (camStream) { stopCam(); setSample("Stop"); return; }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = camStream; await video.play();
      camBtn.classList.add("on"); camBtn.textContent = "⏹ stop";
      sampleWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      hasImage = true;
      camTimer = setInterval(() => { if (video.readyState >= 2) { ctx.drawImage(video, 0, 0, stage.width, stage.height); quantumReadout(); } }, 120);
    } catch (e) { camBtn.textContent = "blocked"; setTimeout(() => (camBtn.textContent = "▶ webcam"), 1600); }
  });

  $("anRun").addEventListener("click", () => {
    if (!hasImage) return;
    const r = quantumReadout();
    out.innerHTML = `<div class="loading mono">› encoding pixels → 4-qubit VQC → measuring…</div>`;
    setTimeout(() => {
      const classical = fakeSoftmax(trueClass, 0.62, 1.6);
      const hqc = fakeSoftmax(trueClass, 0.93, 2.4);
      out.innerHTML = `
        <div class="vs">
          <div class="vs__card"><h4>Classical CNN <span class="tag tag--res">ResNet-50</span></h4>${predRows(classical, "#ff4d6d")}<p class="vs__conf mono">top-1 ${(classical[0].p * 100).toFixed(1)}%</p></div>
          <div class="vs__card vs__card--ours"><h4>HQC-CNN <span class="tag tag--hqc">Quantum</span></h4>${predRows(hqc, "#2de2e6")}<p class="vs__conf mono">top-1 ${(hqc[0].p * 100).toFixed(1)}%</p></div>
        </div>
        <p class="real-note mono">✓ Quantum features above are REAL — ⟨Z⟩ measured live from your pixels through the VQC (entanglement Q = ${r.mw.toFixed(3)}).</p>
        <p class="sim-note">⚠ Class labels are illustrative (modeled from paper accuracy); wire a backend model for live class output.</p>`;
    }, 600);
  });
}

/* =================== ADVERSARIAL =================== */
export function initAdversarial() {
  const $ = (id) => document.getElementById(id);
  const stage = $("advStage"); if (!stage) return;
  const ctx = stage.getContext("2d", { willReadFrequently: true });
  const S = stage.width;
  const attackSel = $("advAttack"), slider = $("advEps"), epsLabel = $("advEpsVal"), readout = $("advReadout"), sampleWrap = $("advSamples");

  const clean = document.createElement("canvas"); clean.width = clean.height = S;
  const cctx = clean.getContext("2d", { willReadFrequently: true });
  let cleanAngles = null, cleanState = null;

  function setBase(name) {
    drawSign(cctx, name, S);
    cleanAngles = canvasToAngles(clean);
    cleanState = runVQC(cleanAngles, THETA, OPTS).state;
    apply();
  }
  ["Stop", "Speed 30", "Yield"].forEach((name) => {
    const b = document.createElement("button"); b.className = "chip"; b.textContent = name;
    b.onclick = () => { sampleWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); setBase(name); };
    if (name === "Stop") b.classList.add("on");
    sampleWrap.appendChild(b);
  });

  const interp = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + t * (ys[i] - ys[i - 1]); }
    return ys[ys.length - 1];
  };
  function curveAcc(model) {
    const eps = +slider.value;
    if (attackSel.value === "Gaussian") return interp(NOISE_CURVE.sigma, NOISE_CURVE[model], eps * 0.5 / 0.30);
    return interp(FGSM_CURVE.eps, FGSM_CURVE[model], eps);
  }

  function apply() {
    const eps = +slider.value, attack = attackSel.value;
    epsLabel.textContent = (attack === "Gaussian" ? "σ " : "ε ") + eps.toFixed(2);
    ctx.clearRect(0, 0, S, S); ctx.drawImage(clean, 0, 0);

    if (attack === "Gaussian" || attack === "FGSM" || attack === "PGD") {
      const mag = eps * (attack === "Gaussian" ? 360 : 240);
      const im = ctx.getImageData(0, 0, S, S), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * mag; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      ctx.putImageData(im, 0, 0);
    } else if (attack === "Occlusion") {
      ctx.fillStyle = "rgba(8,8,18,0.95)"; const oh = eps / 0.30 * S * 0.55; ctx.fillRect(0, S - oh, S, oh);
    } else if (attack === "Patch") {
      const ps = eps / 0.30 * S * 0.42;
      for (let i = 0; i < 80; i++) { ctx.fillStyle = `hsl(${Math.random() * 360},90%,55%)`; ctx.fillRect(S * 0.55 + Math.random() * ps - ps / 2, S * 0.1 + Math.random() * ps, ps / 8, ps / 8); }
    }

    // REAL quantum feature fidelity between clean & attacked encodings
    const attackedState = runVQC(canvasToAngles(stage), THETA, OPTS).state;
    const fid = fidelity(cleanState, attackedState);

    const cl = curveAcc("ResNet-50"), hq = curveAcc("HQC-CNN");
    const fooled = cl < 70;
    readout.innerHTML = `
      <div class="adv-fid">
        <div class="adv-fid__head"><span>Quantum Feature Fidelity</span><b class="mono ${fid > 0.6 ? "good" : "bad"}">${(fid * 100).toFixed(1)}%</b></div>
        <div class="adv-bar big"><i style="width:${fid * 100}%;background:linear-gradient(90deg,#2de2e6,#b16cff)"></i></div>
        <p class="mono tiny">|⟨ψ_clean|ψ_attacked⟩|² — computed live from the real VQC state</p>
      </div>
      <div class="adv-metric"><span class="adv-metric__label">Classical CNN (ResNet-50)</span><div class="adv-bar"><i style="width:${cl}%;background:#ff4d6d"></i></div><span class="mono ${cl < 70 ? "bad" : ""}">${cl.toFixed(1)}% acc</span></div>
      <div class="adv-metric"><span class="adv-metric__label">HQC-CNN (Quantum)</span><div class="adv-bar"><i style="width:${hq}%;background:#2de2e6"></i></div><span class="mono good">${hq.toFixed(1)}% acc</span></div>
      <div class="adv-verdict ${fooled ? "danger" : "safe"}">${fooled ? `⚠ Classical model degraded below 70%. Quantum advantage: <b>+${(hq - cl).toFixed(1)}%</b>.` : `Quantum advantage at this level: <b>+${(hq - cl).toFixed(1)}%</b>.`}</div>
      <p class="sim-note">Image perturbation & feature fidelity are real; accuracy % is modeled from the paper's robustness curves.</p>`;
  }

  attackSel.addEventListener("change", apply);
  slider.addEventListener("input", apply);
  setBase("Stop");
}
