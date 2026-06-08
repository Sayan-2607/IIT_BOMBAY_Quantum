/* ============================================================
   LAB — the live Quantum Perception Lab. A real VQC runs every
   frame on the chosen input (sample sign, uploaded image or
   live webcam), with interactive trainable parameters, the
   real quantum kernel similarity grid and live telemetry.
   ============================================================ */
import { LiveEngine } from "./live.js";
import { runVQC, fidelity, defaultTheta } from "./quantum.js";
import { SAMPLE_SIGNS, drawSign, signToAngles, canvasToAngles } from "./signs.js";

let engine = null;
let started = false;

export function initLab() {
  if (started) { engine && engine.start(); return; }
  started = true;
  engine = new LiveEngine();

  const $ = (id) => document.getElementById(id);
  const stage = $("labStage");
  const sctx = stage.getContext("2d", { willReadFrequently: true });

  engine.attach({
    state: $("labStatevector"),
    bloch: [$("labBloch0"), $("labBloch1"), $("labBloch2"), $("labBloch3")],
    gauge: $("labGauge"),
    z: $("labZ"),
  });

  /* ---------- telemetry ---------- */
  const tele = $("labTele");
  engine.onResult = (r) => {
    let max = 0, mi = 0;
    for (let i = 0; i < r.probs.length; i++) if (r.probs[i] > max) { max = r.probs[i]; mi = i; }
    let purity = 0; for (const p of r.probs) purity += p * p;
    tele.innerHTML = `
      <div><span>dominant basis</span><b class="mono">|${mi.toString(2).padStart(4, "0")}⟩ ${(max * 100).toFixed(1)}%</b></div>
      <div><span>entanglement Q</span><b class="mono">${r.mw.toFixed(3)}</b></div>
      <div><span>state purity Σp²</span><b class="mono">${purity.toFixed(3)}</b></div>
      <div><span>⟨Z⟩ vector</span><b class="mono">[${r.z.map((v) => v.toFixed(2)).join(", ")}]</b></div>`;
  };

  /* ---------- encoding sources ---------- */
  let currentSign = "Stop";
  const showSign = (name) => { currentSign = name; drawSign(sctx, name, stage.width); engine.setSource(null); engine.setEnc(signToAngles(name)); };

  // sample chips
  const chipWrap = $("labSamples");
  SAMPLE_SIGNS.forEach((name) => {
    const b = document.createElement("button");
    b.className = "chip" + (name === "Stop" ? " on" : "");
    b.textContent = name;
    b.onclick = () => { chipWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); stopCam(); showSign(name); };
    chipWrap.appendChild(b);
  });
  showSign("Stop");

  // upload
  $("labFile").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    stopCam();
    const img = new Image();
    img.onload = () => { sctx.clearRect(0, 0, stage.width, stage.height); sctx.drawImage(img, 0, 0, stage.width, stage.height); engine.setSource(null); engine.setEnc(canvasToAngles(stage)); chipWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on")); };
    img.src = URL.createObjectURL(f);
  });

  // webcam
  let stream = null, raf = null;
  const video = $("labVideo");
  const grab = document.createElement("canvas"); grab.width = grab.height = 64;
  const gctx = grab.getContext("2d", { willReadFrequently: true });
  const camBtn = $("labCam");

  function camLoop() {
    if (!stream) return;
    if (video.readyState >= 2) {
      gctx.drawImage(video, 0, 0, 64, 64);
      sctx.drawImage(video, 0, 0, stage.width, stage.height);
    }
    raf = requestAnimationFrame(camLoop);
  }
  function stopCam() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (raf) cancelAnimationFrame(raf);
    camBtn.classList.remove("on"); camBtn.textContent = "▶ live webcam";
    engine.setSource(null);
  }
  camBtn.addEventListener("click", async () => {
    if (stream) { stopCam(); showSign(currentSign); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream; await video.play();
      camBtn.classList.add("on"); camBtn.textContent = "⏹ stop webcam";
      chipWrap.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      camLoop();
      engine.setSource(() => canvasToAngles(grab)); // real pixels -> real angles, every frame
    } catch (err) {
      camBtn.textContent = "webcam blocked";
      setTimeout(() => (camBtn.textContent = "▶ live webcam"), 1800);
    }
  });

  /* ---------- trainable parameter sliders ---------- */
  const thetaWrap = $("labThetas");
  const layerNames = ["ℓ1", "ℓ2", "ℓ3"];
  function buildSliders() {
    thetaWrap.innerHTML = "";
    for (let l = 0; l < 3; l++) {
      const grp = document.createElement("div"); grp.className = "theta-group";
      grp.innerHTML = `<span class="theta-tag mono">${layerNames[l]}</span>`;
      for (let q = 0; q < 4; q++) {
        for (let g = 0; g < 2; g++) {
          const idx = (l * 4 + q) * 2 + g;
          const s = document.createElement("input");
          s.type = "range"; s.min = "-3.14"; s.max = "3.14"; s.step = "0.01";
          s.value = engine.theta[idx]; s.className = "theta-slider";
          s.title = `${g ? "Rz" : "Ry"} θ q${q}`;
          s.oninput = () => { engine.theta[idx] = +s.value; refreshKernel(); };
          grp.appendChild(s);
        }
      }
      thetaWrap.appendChild(grp);
    }
  }
  buildSliders();

  $("labRandom").onclick = () => { engine.setTheta(defaultTheta(Math.floor(Math.random() * 9999))); buildSliders(); refreshKernel(); };
  $("labReset").onclick = () => { engine.setTheta(defaultTheta(7)); buildSliders(); refreshKernel(); };

  /* ---------- entanglement toggles ---------- */
  document.querySelectorAll("#view-lab [data-lab-ent]").forEach((btn) => {
    btn.onclick = () => {
      const k = btn.dataset.labEnt;
      const v = !engine.opts[k]; engine.setOpt(k, v);
      btn.classList.toggle("off", !v); refreshKernel();
    };
  });

  /* ---------- real quantum-kernel similarity grid ---------- */
  const kernelHost = $("labKernel");
  function refreshKernel() {
    const states = SAMPLE_SIGNS.map((n) => runVQC(signToAngles(n), engine.theta, engine.opts).state);
    let html = `<table class="kernel"><thead><tr><th></th>${SAMPLE_SIGNS.map((n) => `<th>${n.slice(0, 6)}</th>`).join("")}</tr></thead><tbody>`;
    for (let i = 0; i < states.length; i++) {
      html += `<tr><th>${SAMPLE_SIGNS[i].slice(0, 6)}</th>`;
      for (let j = 0; j < states.length; j++) {
        const k = fidelity(states[i], states[j]);
        const hue = 190 + k * 80; // cyan->violet by similarity
        html += `<td style="background:hsla(${hue},80%,55%,${0.12 + k * 0.8})" title="${k.toFixed(3)}">${k.toFixed(2)}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    kernelHost.innerHTML = html;
  }
  refreshKernel();

  engine.start();

  // pause webcam/loop when leaving the view (handled by app via stopLab)
  initLab._stop = () => { stopCam(); engine.stop(); };
}

export function stopLab() { if (initLab._stop) initLab._stop(); }
