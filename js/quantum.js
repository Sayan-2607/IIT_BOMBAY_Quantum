/* ============================================================
   QUANTUM — a real 4-qubit statevector simulator running in the
   browser. Not a mock: gates are applied as actual complex
   matrix operations on a 2^4 = 16-amplitude state, and all
   outputs (⟨Z⟩, Bloch vectors, Meyer–Wallach entanglement,
   quantum kernel) are computed from that state.

   Qubit q ↔ bit q of the basis index (q=0 least-significant).
   ============================================================ */

export const N = 4;
export const DIM = 1 << N; // 16

/* ---- state container: parallel real/imag arrays ---- */
export function zeroState() {
  const re = new Float64Array(DIM);
  const im = new Float64Array(DIM);
  re[0] = 1; // |0000>
  return { re, im };
}

/* apply a single-qubit 2x2 complex gate [[a,b],[c,d]] to qubit q */
function apply1(st, q, a, b, c, d) {
  const { re, im } = st;
  const bit = 1 << q;
  for (let i = 0; i < DIM; i++) {
    if (i & bit) continue;          // process each pair once (bit==0 partner)
    const j = i | bit;
    const r0 = re[i], i0 = im[i], r1 = re[j], i1 = im[j];
    // new0 = a*c0 + b*c1
    re[i] = a.r * r0 - a.i * i0 + b.r * r1 - b.i * i1;
    im[i] = a.r * i0 + a.i * r0 + b.r * i1 + b.i * r1;
    // new1 = c*c0 + d*c1
    re[j] = c.r * r0 - c.i * i0 + d.r * r1 - d.i * i1;
    im[j] = c.r * i0 + c.i * r0 + d.r * i1 + d.i * r1;
  }
}
const C = (r, i = 0) => ({ r, i });

export function H(st, q) {
  const s = 1 / Math.SQRT2;
  apply1(st, q, C(s), C(s), C(s), C(-s));
}
export function RY(st, q, t) {
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  apply1(st, q, C(c), C(-s), C(s), C(c));
}
export function RZ(st, q, t) {
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  apply1(st, q, C(c, -s), C(0), C(0), C(c, s));
}
export function RX(st, q, t) {
  const c = Math.cos(t / 2), s = Math.sin(t / 2);
  apply1(st, q, C(c), C(0, -s), C(0, -s), C(c));
}
/* CNOT: flip target t when control c is |1> */
export function CNOT(st, c, t) {
  const { re, im } = st;
  const bc = 1 << c, bt = 1 << t;
  for (let i = 0; i < DIM; i++) {
    if ((i & bc) && !(i & bt)) {
      const j = i | bt;
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
}

/* ---- observables ---- */
export function probs(st) {
  const p = new Float64Array(DIM);
  for (let i = 0; i < DIM; i++) p[i] = st.re[i] * st.re[i] + st.im[i] * st.im[i];
  return p;
}
/* ⟨Z_q⟩ = Σ p_i · (+1 if bit q = 0 else -1) */
export function expectZ(st, q) {
  const bit = 1 << q; let e = 0;
  for (let i = 0; i < DIM; i++) {
    const p = st.re[i] * st.re[i] + st.im[i] * st.im[i];
    e += (i & bit) ? -p : p;
  }
  return e;
}
/* per-qubit Bloch vector (⟨X⟩,⟨Y⟩,⟨Z⟩) */
export function bloch(st, q) {
  const { re, im } = st; const bit = 1 << q;
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < DIM; i++) {
    const p = re[i] * re[i] + im[i] * im[i];
    z += (i & bit) ? -p : p;
    if (!(i & bit)) {
      const j = i | bit;
      // conj(c_i) * c_j
      const pr = re[i] * re[j] + im[i] * im[j];   // Re
      const pi = re[i] * im[j] - im[i] * re[j];   // Im
      x += 2 * pr;
      y += 2 * pi;
    }
  }
  return { x, y, z };
}
/* Meyer–Wallach entanglement (purity form), Q ∈ [0,1].
   Q = 1 - (1/n) Σ_q (⟨X⟩²+⟨Y⟩²+⟨Z⟩²).  0 = product, 1 = maximal. */
export function meyerWallach(st) {
  let s = 0;
  for (let q = 0; q < N; q++) {
    const b = bloch(st, q);
    s += b.x * b.x + b.y * b.y + b.z * b.z;
  }
  return 1 - s / N;
}
/* fidelity |⟨a|b⟩|² between two states (the quantum kernel) */
export function fidelity(a, b) {
  let re = 0, im = 0;
  for (let i = 0; i < DIM; i++) {
    re += a.re[i] * b.re[i] + a.im[i] * b.im[i];   // conj(a)·b real part
    im += a.re[i] * b.im[i] - a.im[i] * b.re[i];   // imag part
  }
  return re * re + im * im;
}

/* ============================================================
   VQC — the paper's circuit (Listing 1 / Fig 2).
   enc: 8 angles (RY: 0..3, RZ: 4..7).  theta: 24 params
   indexed theta[(layer*4 + qubit)*2 + {0:RY,1:RZ}].
   ============================================================ */
export const ENTANGLE = {
  E1: [[0, 1], [2, 3], [1, 2]],
  E2: [[0, 3], [1, 2]],
  E3: [[0, 1], [2, 3]],
};

export function runVQC(enc, theta, opts = { E1: true, E2: true, E3: true }) {
  const st = zeroState();
  // encoding
  for (let q = 0; q < N; q++) {
    H(st, q);
    RY(st, q, enc[q]);
    RZ(st, q, enc[q + N]);
  }
  // variational layers
  const layers = [
    { key: "E1", pairs: ENTANGLE.E1 },
    { key: "E2", pairs: ENTANGLE.E2 },
    { key: "E3", pairs: ENTANGLE.E3 },
  ];
  layers.forEach((L, l) => {
    for (let q = 0; q < N; q++) {
      RY(st, q, theta[(l * N + q) * 2]);
      RZ(st, q, theta[(l * N + q) * 2 + 1]);
    }
    if (opts[L.key]) L.pairs.forEach(([a, b]) => CNOT(st, a, b));
  });
  const z = [expectZ(st, 0), expectZ(st, 1), expectZ(st, 2), expectZ(st, 3)];
  const bl = [bloch(st, 0), bloch(st, 1), bloch(st, 2), bloch(st, 3)];
  return { state: st, z, bloch: bl, mw: meyerWallach(st), probs: probs(st) };
}

/* default trained-ish parameters (near-zero init like the paper) */
export function defaultTheta(seed = 1) {
  let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: N * 3 * 2 }, () => (r() - 0.5) * 1.2);
}

/* ---- map image pixels -> 8 encoding angles in [-π, π] (REAL features) ---- */
export function imageToAngles(imgData, w, h) {
  // 8 region means over a 4x2 grid of luminance, tanh-bounded to [-π,π]
  const cols = 4, rows = 2;
  const sums = new Float64Array(cols * rows);
  const counts = new Float64Array(cols * rows);
  const d = imgData;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const cx = Math.min(cols - 1, (x * cols / w) | 0);
      const cy = Math.min(rows - 1, (y * rows / h) | 0);
      const idx = cy * cols + cx;
      sums[idx] += lum; counts[idx]++;
    }
  }
  const angles = [];
  for (let k = 0; k < 8; k++) {
    const mean = counts[k] ? sums[k] / counts[k] : 0;
    angles.push(Math.tanh((mean - 0.5) * 4) * Math.PI);
  }
  return angles;
}
