/* ============================================================
   HERO — canvas animation of an entangled qubit field.
   Pure canvas, no dependencies. Quantum spectral palette.
   ============================================================ */

export function initHero(canvas) {
  const ctx = canvas.getContext("2d");
  let w, h, dpr;
  const COL_CYAN = "45,226,230";
  const COL_VIOLET = "177,108,255";
  const COL_PINK = "255,77,109";

  const NODES = 46;
  const nodes = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    nodes.length = 0;
    for (let i = 0; i < NODES; i++) {
      const palette = Math.random();
      const col = palette > 0.66 ? COL_VIOLET : palette > 0.3 ? COL_CYAN : COL_PINK;
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.4 + Math.random() * 2.2,
        col,
        phase: Math.random() * Math.PI * 2,
        spin: 0.4 + Math.random() * 1.4,
      });
    }
  }

  const pointer = { x: -999, y: -999 };
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  canvas.addEventListener("pointerleave", () => { pointer.x = pointer.y = -999; });

  let t = 0;
  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);

    // entanglement links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 150) {
          const o = (1 - d / 150) * 0.5;
          const pulse = 0.6 + 0.4 * Math.sin(t * 2 + (i + j));
          ctx.strokeStyle = `rgba(${a.col},${(o * pulse).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes + superposition rings
    nodes.forEach((n) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;

      // pointer repulsion (interactive)
      const pdx = n.x - pointer.x, pdy = n.y - pointer.y;
      const pd = Math.hypot(pdx, pdy);
      if (pd < 120) {
        n.x += (pdx / pd) * (120 - pd) * 0.02;
        n.y += (pdy / pd) * (120 - pd) * 0.02;
      }

      const ring = n.r + 5 + 3 * Math.sin(t * n.spin + n.phase);
      ctx.strokeStyle = `rgba(${n.col},0.28)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, ring, 0, Math.PI * 2);
      ctx.stroke();

      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
      g.addColorStop(0, `rgba(${n.col},1)`);
      g.addColorStop(1, `rgba(${n.col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  resize(); seed();
  window.addEventListener("resize", () => { resize(); seed(); });
  frame();
}
