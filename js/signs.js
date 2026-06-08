/* ============================================================
   SIGNS — procedural traffic signs drawn to canvas, plus a
   helper that turns any canvas into the 8 real encoding angles.
   ============================================================ */
import { imageToAngles } from "./quantum.js";

export const SAMPLE_SIGNS = ["Stop", "Speed 30", "Speed 70", "Yield", "No entry", "Turn left"];

export function drawSign(ctx, type, size) {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0e0e1d"; ctx.fillRect(0, 0, size, size);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  if (type === "Stop") {
    ctx.fillStyle = "#d32f2f"; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i + Math.PI / 8;
      const x = c + Math.cos(a) * c * 0.82, y = c + Math.sin(a) * c * 0.82;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `bold ${size * 0.22}px Sora`;
    ctx.fillText("STOP", c, c);
  } else if (type === "Yield") {
    ctx.fillStyle = "#fff"; ctx.beginPath();
    ctx.moveTo(c, size * 0.9); ctx.lineTo(size * 0.1, size * 0.18); ctx.lineTo(size * 0.9, size * 0.18);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = size * 0.07; ctx.strokeStyle = "#d32f2f"; ctx.stroke();
  } else if (type.startsWith("Speed")) {
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(c, c, c * 0.82, 0, 7); ctx.fill();
    ctx.lineWidth = size * 0.09; ctx.strokeStyle = "#d32f2f"; ctx.beginPath(); ctx.arc(c, c, c * 0.78, 0, 7); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.font = `bold ${size * 0.3}px Sora`;
    ctx.fillText(type.replace(/\D/g, ""), c, c);
  } else if (type === "No entry") {
    ctx.fillStyle = "#d32f2f"; ctx.beginPath(); ctx.arc(c, c, c * 0.82, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(c - c * 0.5, c - c * 0.12, c, c * 0.24);
  } else { // Turn left
    ctx.fillStyle = "#1565c0"; ctx.beginPath(); ctx.arc(c, c, c * 0.82, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = size * 0.08;
    ctx.beginPath(); ctx.moveTo(c + c * 0.32, c); ctx.lineTo(c - c * 0.12, c); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath();
    ctx.moveTo(c - c * 0.38, c); ctx.lineTo(c - c * 0.04, c - c * 0.26); ctx.lineTo(c - c * 0.04, c + c * 0.26);
    ctx.closePath(); ctx.fill();
  }
}

let _off;
export function signToAngles(type, size = 64) {
  if (!_off) { _off = document.createElement("canvas"); }
  _off.width = _off.height = size;
  const ctx = _off.getContext("2d", { willReadFrequently: true });
  drawSign(ctx, type, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  return imageToAngles(d, size, size);
}

export function canvasToAngles(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return imageToAngles(d, canvas.width, canvas.height);
}
