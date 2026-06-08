/* ============================================================
   CIRCUIT — renders the 4-qubit depth-3 VQC (Fig 2) as SVG.
   Hadamard init → Ry/Rz data encoding → 3 variational layers
   with asymmetric CNOT entanglement → Pauli-Z measurement.
   ============================================================ */
import { CIRCUIT } from "./data.js";

const Q = CIRCUIT.qubits;
const WIRE_GAP = 60;
const TOP = 46;
const LABEL_X = 64;
const COL0 = 104;
const COLW = 56;
const BOX = 38;

function y(q) { return TOP + q * WIRE_GAP; }

/** build the column plan based on which entanglement layers are active */
function plan(opts) {
  const cols = [];
  cols.push({ type: "gate", label: "H", cls: "g-h", qubits: [0, 1, 2, 3] });
  cols.push({ type: "gate", label: "Ry", sub: "f", cls: "g-enc", qubits: [0, 1, 2, 3] });
  cols.push({ type: "gate", label: "Rz", sub: "f", cls: "g-enc", qubits: [0, 1, 2, 3] });

  const layers = [
    { key: "E1", show: opts.E1, pairs: CIRCUIT.entangle.E1, tag: "ℓ1" },
    { key: "E2", show: opts.E2, pairs: CIRCUIT.entangle.E2, tag: "ℓ2" },
    { key: "E3", show: opts.E3, pairs: CIRCUIT.entangle.E3, tag: "ℓ3" },
  ];

  layers.forEach((L, i) => {
    cols.push({ type: "gate", label: "Ry", sub: "θ" + (i + 1), cls: "g-var", qubits: [0, 1, 2, 3] });
    cols.push({ type: "gate", label: "Rz", sub: "θ" + (i + 1), cls: "g-var", qubits: [0, 1, 2, 3] });
    if (L.show) {
      L.pairs.forEach((pair) => cols.push({ type: "cnot", pair }));
    }
  });

  cols.push({ type: "measure", qubits: [0, 1, 2, 3] });
  return cols;
}

export function buildCircuit(opts = { E1: true, E2: true, E3: true }) {
  const cols = plan(opts);
  const width = COL0 + cols.length * COLW + 30;
  const height = TOP + (Q - 1) * WIRE_GAP + 60;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" class="circuit-svg">`;

  // wires
  for (let q = 0; q < Q; q++) {
    svg += `<line class="wire" x1="${LABEL_X + 14}" y1="${y(q)}" x2="${width - 20}" y2="${y(q)}"/>`;
    svg += `<text class="qlabel" x="${LABEL_X}" y="${y(q) + 5}" text-anchor="end">|q${q}⟩</text>`;
  }

  // columns
  cols.forEach((col, ci) => {
    const cx = COL0 + ci * COLW + COLW / 2;

    if (col.type === "gate") {
      col.qubits.forEach((q) => {
        const cy = y(q);
        svg += `<g class="gate ${col.cls}">`;
        svg += `<rect x="${cx - BOX / 2}" y="${cy - 17}" width="${BOX}" height="34" rx="5"/>`;
        if (col.sub) {
          svg += `<text class="gtxt" x="${cx}" y="${cy - 1}" text-anchor="middle">${col.label}</text>`;
          svg += `<text class="gsub" x="${cx}" y="${cy + 11}" text-anchor="middle">${col.sub}<tspan dy="3" font-size="7">${q}</tspan></text>`;
        } else {
          svg += `<text class="gtxt" x="${cx}" y="${cy + 4}" text-anchor="middle">${col.label}</text>`;
        }
        svg += `</g>`;
      });
    }

    else if (col.type === "cnot") {
      const [ctrl, tgt] = col.pair;
      const y1 = y(ctrl), y2 = y(tgt);
      svg += `<g class="cnot">`;
      svg += `<line class="cnot-link" x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}"/>`;
      svg += `<circle class="ctrl" cx="${cx}" cy="${y1}" r="5"/>`;
      svg += `<circle class="targ" cx="${cx}" cy="${y2}" r="11"/>`;
      svg += `<line class="tplus" x1="${cx - 11}" y1="${y2}" x2="${cx + 11}" y2="${y2}"/>`;
      svg += `<line class="tplus" x1="${cx}" y1="${y2 - 11}" x2="${cx}" y2="${y2 + 11}"/>`;
      svg += `</g>`;
    }

    else if (col.type === "measure") {
      col.qubits.forEach((q) => {
        const cy = y(q);
        svg += `<g class="gate g-meas">`;
        svg += `<rect x="${cx - BOX / 2}" y="${cy - 17}" width="${BOX}" height="34" rx="5"/>`;
        svg += `<path class="meter" d="M ${cx - 9} ${cy + 6} A 9 9 0 0 1 ${cx + 9} ${cy + 6}"/>`;
        svg += `<line class="meter" x1="${cx}" y1="${cy + 6}" x2="${cx + 7}" y2="${cy - 6}"/>`;
        svg += `</g>`;
      });
    }
  });

  // phase band labels under the circuit
  svg += `<text class="band" x="${COL0 + COLW}" y="${height - 16}" text-anchor="middle">encode</text>`;
  svg += `</svg>`;
  return svg;
}
