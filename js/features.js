/* ============================================================
   FEATURES — t-SNE style scatter showing class separability.
   Classical (Silhouette 0.412) vs Hybrid (0.681). Synthetic
   clusters tuned to the paper's separability gap (Fig 5).
   ============================================================ */

const PALETTE = [
  "45,226,230", "177,108,255", "255,77,109", "126,231,135",
  "255,193,7", "0,180,216", "244,114,182", "163,230,53",
  "251,146,60", "129,140,248",
];
const CLASSES = 10;
const PER = 34;

function rng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function makeClusters(spread, separation, seed) {
  const r = rng(seed);
  const pts = [];
  for (let c = 0; c < CLASSES; c++) {
    const ang = (c / CLASSES) * Math.PI * 2;
    const cx = 0.5 + Math.cos(ang) * separation;
    const cy = 0.5 + Math.sin(ang) * separation;
    for (let i = 0; i < PER; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * spread;
      pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad, c });
    }
  }
  return pts;
}

function draw(canvas, pts) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = r.width, h = r.height;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = 18;
  pts.forEach((p) => {
    const x = pad + p.x * (w - pad * 2);
    const y = pad + p.y * (h - pad * 2);
    ctx.fillStyle = `rgba(${PALETTE[p.c]},0.8)`;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function initFeatures(classicalCanvas, hybridCanvas) {
  // classical: wide spread, low separation -> overlap (Sil 0.412)
  const classical = makeClusters(0.20, 0.20, 7);
  // hybrid: tight clusters, strong separation (Sil 0.681)
  const hybrid = makeClusters(0.055, 0.34, 7);
  draw(classicalCanvas, classical);
  draw(hybridCanvas, hybrid);

  window.addEventListener("resize", () => {
    draw(classicalCanvas, classical);
    draw(hybridCanvas, hybrid);
  });
}
