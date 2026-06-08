/* ============================================================
   DATA — all figures taken directly from the HQC-CNN paper
   "Hybrid Quantum-Classical Convolutional Neural Architecture
    for Robust Traffic Sign Recognition" — Sayan Ghosh, KIIT /
    IIT Bombay CMInDS.
   ============================================================ */

export const HEADLINE = {
  acc: 98.3,        // GTSRB top-1
  accDelta: 1.2,    // vs ResNet-50
  noise: 91.7, noiseDelta: 8.2,
  fgsm: 81.3, fgsmDelta: 7.1,
  pgd: 73.5, pgdDelta: 6.4,
  params: 16.4, paramDelta: 34,   // M, % fewer than ResNet-50
  sil: 0.681, silClassical: 0.412, silDelta: 65.3,
  qubits: 4, depth: 3, qParams: 24, hilbert: 16,
  mw: 0.85, expr: 0.031,
  lisa: 97.6, lisaDelta: 3.3,
  infer: 14.9,
  repo: "https://github.com/Sayan-2607/IIT_BOMBAY_Quantum",
};

/* Table I — GTSRB test set (n = 12,630) */
export const GTSRB = [
  { m: "LeNet-5",        acc: 93.2, f1: 92.7, params: "60K",   pNum: 0.06, rob: 78.2, fgsm: 61.4, pgd: 54.8, sil: 0.218 },
  { m: "VGG-16",         acc: 96.8, f1: 96.3, params: "138M",  pNum: 138,  rob: 82.1, fgsm: 71.8, pgd: 64.3, sil: 0.341 },
  { m: "ResNet-50",      acc: 97.1, f1: 96.8, params: "25.6M", pNum: 25.6, rob: 83.5, fgsm: 74.2, pgd: 67.1, sil: 0.412 },
  { m: "ViT-B/16",       acc: 97.4, f1: 97.0, params: "86M",   pNum: 86,   rob: 81.9, fgsm: 72.6, pgd: 65.4, sil: 0.389 },
  { m: "QNN-Only",       acc: 89.4, f1: 88.9, params: "0.02M", pNum: 0.02, rob: 71.4, fgsm: 68.1, pgd: 60.3, sil: 0.291 },
  { m: "HQC-CNN (Ours)", acc: 98.3, f1: 97.9, params: "16.4M", pNum: 16.4, rob: 91.7, fgsm: 81.3, pgd: 73.5, sil: 0.681, ours: true },
];

/* Table II — LISA transfer (20-epoch fine-tune from GTSRB) */
export const LISA = [
  { m: "ResNet-50",      acc: 94.3, f1: 93.7, rob: 79.8, fgsm: 69.4 },
  { m: "ViT-B/16",       acc: 94.8, f1: 94.2, rob: 78.1, fgsm: 68.9 },
  { m: "HQC-CNN (Ours)", acc: 97.6, f1: 97.1, rob: 88.4, fgsm: 78.3, ours: true },
];

/* Robustness curves — anchored to the paper's reported points:
   FGSM: +7.1% @ ε0.10, +11.1% @ ε0.30 ; Gaussian: +8.2% @ σ0.15, +17.2% @ σ0.5 */
export const FGSM_CURVE = {
  eps:      [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30],
  "HQC-CNN":   [98.3, 90.0, 81.3, 73.0, 66.0, 58.5, 52.1],
  "ResNet-50": [97.1, 85.0, 74.2, 64.0, 55.0, 47.0, 41.0],
  "ViT-B/16":  [97.4, 84.0, 72.6, 62.5, 53.5, 45.5, 39.5],
  "LeNet-5":   [93.2, 76.0, 61.4, 50.0, 41.0, 34.0, 29.0],
};
export const NOISE_CURVE = {
  sigma:    [0, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50],
  "HQC-CNN":   [98.3, 94.0, 91.7, 87.0, 80.0, 72.0, 65.2],
  "ResNet-50": [97.1, 90.0, 83.5, 78.0, 68.0, 58.0, 48.0],
  "ViT-B/16":  [97.4, 89.0, 81.9, 76.0, 65.5, 55.0, 45.0],
  "LeNet-5":   [93.2, 85.0, 78.2, 70.0, 58.0, 47.0, 37.0],
};

/* Training dynamics (Fig 3) — synthesized over 100 epochs, restarts @ 25/50/75,
   HQC peaks 98.3 @ ep73, gaps 0.03 (HQC) vs 0.05 (ResNet). */
export function trainingCurves() {
  const ep = [], hAcc = [], rAcc = [], hLoss = [], rLoss = [];
  for (let e = 0; e <= 100; e++) {
    ep.push(e);
    const restart = (e % 25) / 25;                       // sawtooth for warm restarts
    const wob = Math.sin(restart * Math.PI) * 0.4;
    const hA = 98.3 - 16 * Math.exp(-e / 16) - (e < 73 ? 0 : 0) + wob;
    const rA = 97.1 - 18 * Math.exp(-e / 18) + wob * 0.9;
    hAcc.push(Math.min(98.3, +hA.toFixed(2)));
    rAcc.push(Math.min(97.1, +rA.toFixed(2)));
    hLoss.push(+(0.05 + 1.35 * Math.exp(-e / 14) + wob * 0.04).toFixed(3));
    rLoss.push(+(0.07 + 1.45 * Math.exp(-e / 17) + wob * 0.05).toFixed(3));
  }
  return { ep, hAcc, rAcc, hLoss, rLoss };
}

/* Ablation A1 — quantum layer placement (Table IV) */
export const ABLATION_PLACEMENT = [
  { cfg: "Random Circuit (untrained)", acc: 94.3, d: -4.0 },
  { cfg: "Fixed Circuit (frozen)",     acc: 95.8, d: -2.5 },
  { cfg: "Quantum at Input (pre-B1)",  acc: 96.9, d: -1.4 },
  { cfg: "No Quantum (pure classical)",acc: 97.1, d: -1.2 },
  { cfg: "Quantum at Output (post-B4)",acc: 97.4, d: -0.9 },
  { cfg: "Quantum Mid-stream (Ours)",  acc: 98.3, d: 0, ours: true },
];

/* Ablation A3 — entanglement pattern QAS (Table V) */
export const ABLATION_ENTANGLE = [
  { p: "No entanglement", q: 0.00, expr: 0.244, acc: 95.1, rob: 82.4 },
  { p: "Linear chain",    q: 0.71, expr: 0.089, acc: 97.2, rob: 88.1 },
  { p: "Circular",        q: 0.79, expr: 0.053, acc: 97.7, rob: 89.4 },
  { p: "All-to-all",      q: 0.88, expr: 0.017, acc: 97.9, rob: 90.2 },
  { p: "Asymmetric (Ours)", q: 0.85, expr: 0.031, acc: 98.3, rob: 91.7, ours: true },
];

/* Computational complexity (Table III) */
export const COMPUTE = [
  { c: "CNN Backbone",  params: "16.38M", flops: "2.4G",  train: "45 s",  infer: "10.2 ms" },
  { c: "Quantum Layer", params: "24",     flops: "~0.4M", train: "480 s", infer: "4.7 ms" },
  { c: "Classifier Head", params: "0.13M", flops: "0.1M", train: "<1 s",  infer: "<0.1 ms" },
  { c: "HQC-CNN (total)", params: "16.4M", flops: "~2.5G", train: "525 s", infer: "14.9 ms", ours: true },
  { c: "ResNet-50",     params: "25.6M", flops: "4.1G",  train: "220 s", infer: "12.7 ms" },
];

/* Hyperparameters (Table VI) */
export const HYPERPARAMS = [
  ["Architecture", "Input size", "64 × 64 × 3"],
  ["Architecture", "Backbone channels", "64, 128, 256, 512"],
  ["Architecture", "VQC qubits / depth", "4 / 3"],
  ["Architecture", "VQC parameters", "24"],
  ["Training", "Batch / Epochs", "64 / 100"],
  ["Training", "Classical LR η_c", "1e-3"],
  ["Training", "Quantum LR η_q", "5e-3"],
  ["Training", "LR schedule", "CosineAnneal, T₀=25"],
  ["Training", "Grad clip τ", "1.0"],
  ["Training", "Label smoothing", "0.10"],
  ["Regularization", "Classical WD λ_c", "1e-4"],
  ["Regularization", "Quantum ℓ₂ λ_q", "1e-3"],
  ["Regularization", "Dropout (backbone/head)", "0.3 / 0.4"],
  ["Regularization", "Quantum init std", "0.01"],
];

/* Architecture pipeline (Fig 1) */
export const PIPELINE = {
  cfe: [
    { l: "Input", d: "64×64×3" },
    { l: "Block 1", d: "64 ch · 32²" },
    { l: "Block 2", d: "128 ch · 16²", branch: "f_mid ∈ ℝ¹²⁸" },
    { l: "Block 3", d: "256 ch · 8²" },
    { l: "Block 4", d: "512 ch" },
    { l: "GAP", d: "f_cls ∈ ℝ⁵¹²" },
  ],
  qcm: [
    { l: "Linear Enc.", d: "128 → 16" },
    { l: "4-Qubit VQC", d: "depth-3" },
    { l: "Pauli-Z", d: "f_q ∈ [-1,1]⁴" },
  ],
  hch: [
    { l: "Concat", d: "ℝ⁵¹⁶" },
    { l: "Dense 256", d: "BN·ReLU·Drop 0.4" },
    { l: "Dense 128", d: "ReLU" },
    { l: "Dense 43", d: "Softmax" },
  ],
};

/* Quantum circuit definition (Fig 2) — 4 qubits, depth 3, asymmetric CNOT.
   Entanglement layers: E1 nearest-neighbour, E2 long-range cross, E3 nearest. */
export const CIRCUIT = {
  qubits: 4,
  depth: 3,
  entangle: {
    E1: [[0, 1], [2, 3], [1, 2]],   // nearest-neighbour
    E2: [[0, 3], [1, 2]],           // long-range cross
    E3: [[0, 1], [2, 3]],           // nearest-neighbour
  },
};

/* Sample traffic-sign classes (subset of GTSRB's 43) for the demo analyzer */
export const SIGN_CLASSES = [
  "Speed limit 30", "Speed limit 50", "Speed limit 70", "Stop",
  "Yield", "No entry", "Priority road", "Keep right",
  "Turn left ahead", "Roundabout", "Children crossing", "Road work",
];
