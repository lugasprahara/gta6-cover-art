// Procedural scene panels — every scene is drawn from scratch on canvas, so the app
// fields 5–7 distinct panels per cover with only the two starter photos on disk.
// Each painter fills its rect with a sun-soaked Leonida scene: sky gradient, sun,
// silhouettes and water. Deterministic: all randomness comes from the seeded rng.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sky(ctx, x, y, w, h, p, sunY = 0.42) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, p.skyTop);
  g.addColorStop(0.55, p.skyMid);
  g.addColorStop(1, p.sea);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const sx = x + w * 0.68;
  const sy = y + h * sunY;
  const sr = Math.min(w, h) * 0.16;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.4);
  glow.addColorStop(0, p.sun);
  glow.addColorStop(0.35, p.sun + '55');
  glow.addColorStop(1, p.sun + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = p.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
}

function water(ctx, x, y, w, h, p, rng) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, p.sea);
  g.addColorStop(1, p.skyTop);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let i = 0; i < 14; i++) {
    const wy = y + rng() * h;
    const ww = w * (0.08 + rng() * 0.3);
    ctx.fillRect(x + rng() * w * 0.7, wy, ww, Math.max(2, h * 0.012));
  }
}

function buildingRow(ctx, x, y, w, h, p, rng, base) {
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.06 + rng() * 0.1);
    const bh = h * (0.25 + rng() * 0.55);
    ctx.fillStyle = base;
    ctx.fillRect(bx, y + h - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 214, 130, 0.85)';
    const cols = Math.max(1, Math.floor(bw / (w * 0.02)));
    const rows = Math.max(1, Math.floor(bh / (h * 0.06)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() > 0.45) continue;
        ctx.fillRect(bx + w * 0.008 + c * (w * 0.02), y + h - bh + h * 0.02 + r * (h * 0.06), w * 0.009, h * 0.025);
      }
    }
    bx += bw + w * 0.008;
  }
}

function palm(ctx, x, y, s, lean, p) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = '#3a2417';
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.55, s * 0.16, -s * 0.95);
  ctx.stroke();
  ctx.translate(s * 0.16, -s * 0.95);
  ctx.fillStyle = '#1d5c33';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(s * 0.28, 0, s * 0.34, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#7a4a21';
  ctx.beginPath();
  ctx.arc(0, s * 0.03, s * 0.07, 0, Math.PI * 2);
  ctx.arc(s * 0.09, s * 0.06, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const SCENES = {
  skyline(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h, p, 0.5);
    buildingRow(ctx, x, y + h * 0.1, w, h * 0.9, p, rng, '#1c0f2e');
    ctx.fillStyle = 'rgba(28,15,46,0.55)';
    ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
  },

  marina(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h * 0.55, p, 0.55);
    water(ctx, x, y + h * 0.55, w, h * 0.45, p, rng);
    for (let i = 0; i < 3; i++) {
      const bx = x + w * (0.12 + i * 0.32);
      const by = y + h * (0.58 + rng() * 0.1);
      const bw = w * 0.2;
      ctx.fillStyle = '#f5efe0';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw * 0.86, by + h * 0.07);
      ctx.lineTo(bx + bw * 0.14, by + h * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2b1a33';
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.5, by);
      ctx.lineTo(bx + bw * 0.5, by - h * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.5, by - h * 0.2);
      ctx.lineTo(bx + bw * 0.5, by - h * 0.02);
      ctx.lineTo(bx + bw * 0.78, by - h * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  },

  highway(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h, p, 0.4);
    ctx.fillStyle = '#241a2e';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.36, y + h * 0.52);
    ctx.lineTo(x + w * 0.64, y + h * 0.52);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const cy = y + h * (0.54 + t * 0.44);
      const cw = w * (0.008 + t * 0.026);
      ctx.fillRect(x + w * 0.5 - cw / 2, cy, cw, h * 0.05);
    }
    palm(ctx, x + w * 0.08, y + h * 0.98, h * 0.3, -0.08, p);
    palm(ctx, x + w * 0.92, y + h * 0.98, h * 0.26, 0.1, p);
    ctx.fillStyle = '#ff5e7a';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.52, w * 0.05, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  palms(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h, p, 0.35);
    ctx.fillStyle = '#e8b04b';
    ctx.fillRect(x, y + h * 0.86, w, h * 0.14);
    palm(ctx, x + w * 0.2, y + h * 0.9, h * 0.62, -0.12, p);
    palm(ctx, x + w * 0.55, y + h * 0.92, h * 0.72, 0.06, p);
    palm(ctx, x + w * 0.85, y + h * 0.9, h * 0.5, 0.14, p);
  },

  beachtower(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h * 0.6, p, 0.45);
    ctx.fillStyle = '#e8b04b';
    ctx.fillRect(x, y + h * 0.45, w, h * 0.17);
    water(ctx, x, y + h * 0.62, w, h * 0.38, p, rng);
    const tx = x + w * 0.5;
    const ty = y + h * 0.62;
    ctx.strokeStyle = '#f5efe0';
    ctx.lineWidth = Math.max(3, w * 0.012);
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.1, y + h * 0.98);
    ctx.lineTo(tx - w * 0.05, ty);
    ctx.moveTo(tx + w * 0.1, y + h * 0.98);
    ctx.lineTo(tx + w * 0.05, ty);
    ctx.moveTo(tx - w * 0.08, ty + h * 0.12);
    ctx.lineTo(tx + w * 0.08, ty + h * 0.12);
    ctx.stroke();
    ctx.fillStyle = '#ff5e7a';
    ctx.fillRect(tx - w * 0.14, ty - h * 0.14, w * 0.28, h * 0.14);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.17, ty - h * 0.14);
    ctx.lineTo(tx + w * 0.17, ty - h * 0.14);
    ctx.lineTo(tx, ty - h * 0.22);
    ctx.closePath();
    ctx.fill();
    // Beach umbrella on the sand, clear of the ribbon and the panel's label zone.
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = Math.max(2, w * 0.008);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.82, y + h * 0.52);
    ctx.lineTo(x + w * 0.82, y + h * 0.62);
    ctx.stroke();
    ctx.fillStyle = '#ff5e7a';
    ctx.beginPath();
    ctx.arc(x + w * 0.82, y + h * 0.52, w * 0.1, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.82, y + h * 0.52);
    ctx.arc(x + w * 0.82, y + h * 0.52, w * 0.1, Math.PI * 1.25, Math.PI * 1.75);
    ctx.closePath();
    ctx.fill();
  },

  motel(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h * 0.5, p, 0.6);
    ctx.fillStyle = '#241533';
    ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
    ctx.fillStyle = '#3d2350';
    ctx.fillRect(x, y + h * 0.42, w, h * 0.16);
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 8; i++) {
      if (rng() > 0.5) continue;
      ctx.fillRect(x + w * (0.05 + i * 0.12), y + h * 0.46, w * 0.06, h * 0.08);
    }
    // Neon sign sits low in the sky, clear of the panel's top label chip.
    ctx.save();
    ctx.translate(x + w * 0.5, y + h * 0.3);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#ff2e88';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = h * 0.06;
    ctx.fillRect(-w * 0.3, -h * 0.05, w * 0.6, h * 0.1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(h * 0.07)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOTEL', 0, 0);
    ctx.restore();
    water(ctx, x, y + h * 0.86, w, h * 0.14, p, rng);
  },

  sunsetsea(ctx, x, y, w, h, rng, p) {
    sky(ctx, x, y, w, h * 0.62, p, 0.62);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 5; i++) {
      const cy = y + h * (0.12 + rng() * 0.3);
      ctx.beginPath();
      ctx.ellipse(x + w * rng(), cy, w * (0.1 + rng() * 0.16), h * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    water(ctx, x, y + h * 0.62, w, h * 0.38, p, rng);
    ctx.fillStyle = '#1c0f2e';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.98);
    ctx.lineTo(x + w * 0.3, y + h * 0.86);
    ctx.lineTo(x + w * 0.55, y + h * 0.98);
    ctx.closePath();
    ctx.fill();
  },
};

export const SCENE_NAMES = Object.keys(SCENES);
