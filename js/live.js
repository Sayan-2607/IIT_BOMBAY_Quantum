/* ============================================================
   LIVE — real-time visualization of the quantum state.
   Renders the live 16-amplitude statevector, four Bloch
   vectors, the entanglement gauge and ⟨Z⟩ outputs, all driven
   by an rAF loop that re-runs the real VQC each frame.
   ============================================================ */
import { runVQC, defaultTheta, DIM, N } from "./quantum.js";

const CYAN = "#2de2e6", VIOLET = "#b16cff", PINK = "#ff4d6d", DIM_C = "#565c75";

function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, r.width) * dpr;
  canvas.height = Math.max(1, r.height) * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

function phaseColor(re, im) {
  const hue = (Math.atan2(im, re) * 180 / Math.PI + 360) % 360;
  return `hsl(${hue.toFixed(0)},85%,62%)`;
}

/* ---- statevector: 16 bars, height=prob, colour=phase ---- */
export function drawStatevector(canvas, st) {
  const { ctx, w, h } = fit(canvas);
  ctx.clearRect(0, 0, w, h);
  const pad = 18, bw = (w - pad * 2) / DIM;
  const base = h - 24;
  let max = 0; const p = new Float64Array(DIM);
  for (let i = 0; i < DIM; i++) { p[i] = st.re[i] ** 2 + st.im[i] ** 2; if (p[i] > max) max = p[i]; }
  max = Math.max(max, 0.06);
  for (let i = 0; i < DIM; i++) {
    const bh = (p[i] / max) * (base - 14);
    const x = pad + i * bw;
    ctx.fillStyle = p[i] > 1e-4 ? phaseColor(st.re[i], st.im[i]) : "rgba(255,255,255,.08)";
    ctx.fillRect(x + 1, base - bh, bw - 2, bh);
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,.32)";
      ctx.font = "8px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(i.toString(2).padStart(N, "0"), x + bw / 2, h - 8);
    }
  }
}

/* ---- Bloch vector (single qubit) ---- */
export function drawBloch(canvas, b, az, label) {
  const { ctx, w, h } = fit(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 + 2, R = Math.min(w, h) / 2 - 8;
  const proj = (x, y, z) => [cx + R * (x * Math.cos(az) - y * Math.sin(az)),
                             cy - R * z * 0.9 + R * 0.3 * (x * Math.sin(az) + y * Math.cos(az))];

  ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.3, 0, 0, 7); ctx.stroke();
  // axes
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  const [zx1, zy1] = proj(0, 0, 1), [zx2, zy2] = proj(0, 0, -1);
  ctx.beginPath(); ctx.moveTo(zx1, zy1); ctx.lineTo(zx2, zy2); ctx.stroke();

  // vector
  const [vx, vy] = proj(b.x, b.y, b.z);
  const mag = Math.min(1, Math.hypot(b.x, b.y, b.z));
  const grad = ctx.createLinearGradient(cx, cy, vx, vy);
  grad.addColorStop(0, VIOLET); grad.addColorStop(1, CYAN);
  ctx.strokeStyle = grad; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx, vy); ctx.stroke();
  ctx.fillStyle = CYAN; ctx.beginPath(); ctx.arc(vx, vy, 3.4, 0, 7); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
  ctx.fillText(label, cx, h - 2);
  ctx.fillStyle = CYAN; ctx.fillText("|r|=" + mag.toFixed(2), cx, 10);
}

/* ---- entanglement gauge (semicircle) ---- */
export function drawGauge(canvas, q) {
  const { ctx, w, h } = fit(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h - 8, R = Math.min(w / 2 - 8, h - 16);
  ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI); ctx.stroke();
  const a = Math.PI + Math.max(0, Math.min(1, q)) * Math.PI;
  const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
  g.addColorStop(0, CYAN); g.addColorStop(1, VIOLET);
  ctx.strokeStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, a); ctx.stroke();
  ctx.fillStyle = "#eef0f6"; ctx.font = "700 22px Space Grotesk"; ctx.textAlign = "center";
  ctx.fillText(q.toFixed(3), cx, cy - 8);
  ctx.fillStyle = DIM_C; ctx.font = "9px JetBrains Mono";
  ctx.fillText("MW ENTANGLEMENT Q", cx, cy + 8);
}

/* ---- ⟨Z⟩ output bars ---- */
export function drawZ(canvas, z) {
  const { ctx, w, h } = fit(canvas);
  ctx.clearRect(0, 0, w, h);
  const rowH = h / N, mid = w / 2;
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, h); ctx.stroke();
  z.forEach((v, q) => {
    const cy = q * rowH + rowH / 2;
    const len = v * (w / 2 - 30);
    ctx.fillStyle = v >= 0 ? CYAN : PINK;
    ctx.fillRect(mid, cy - 7, len, 14);
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = "9px JetBrains Mono";
    ctx.textAlign = v >= 0 ? "end" : "start";
    ctx.fillText(`⟨Z${q}⟩ ${v >= 0 ? "+" : ""}${v.toFixed(3)}`, v >= 0 ? mid - 4 : mid + 4, cy + 3);
  });
}

/* ============================================================
   LiveEngine — owns enc/theta/opts and an rAF loop. Attach
   widgets; optionally provide a per-frame encoding source
   (e.g. webcam) via setSource.
   ============================================================ */
export class LiveEngine {
  constructor() {
    this.enc = [0.4, -0.6, 1.0, -0.3, 0.5, 0.2, -0.8, 0.35];
    this.theta = defaultTheta(7);
    this.opts = { E1: true, E2: true, E3: true };
    this.widgets = {};
    this.source = null;
    this.az = 0;
    this.running = false;
    this.onResult = null;
    this._raf = null;
  }
  attach(w) { this.widgets = { ...this.widgets, ...w }; return this; }
  setSource(fn) { this.source = fn; }
  setEnc(a) { this.enc = a.slice(); }
  setTheta(t) { this.theta = t.slice(); }
  setOpt(k, v) { this.opts[k] = v; }

  step() {
    if (this.source) { const a = this.source(); if (a) this.enc = a; }
    const r = runVQC(this.enc, this.theta, this.opts);
    this.az += 0.012;
    const W = this.widgets;
    if (W.state) drawStatevector(W.state, r.state);
    if (W.bloch) W.bloch.forEach((c, q) => drawBloch(c, r.bloch[q], this.az, "q" + q));
    if (W.gauge) drawGauge(W.gauge, r.mw);
    if (W.z) drawZ(W.z, r.z);
    if (this.onResult) this.onResult(r);
  }
  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => { if (!this.running) return; this.step(); this._raf = requestAnimationFrame(loop); };
    loop();
  }
  stop() { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); }
}
