// Golden Hour Studio — built-in panel art that needs no photo at all.
// Two kinds of extra sources let a cover field 5-7 distinct panels offline:
//  * SCENES: small painted vistas drawn with plain canvas paths (deterministic,
//    seeded) — skyline, marina, highway light trails, neon motel, lifeguard
//    tower, palm boulevard.
//  * CROPS: tight detail crops of the two starter photos (a fishing-reel
//    close-up, a car door and mirror, working hands), framed at runtime from
//    fixed fractional windows so they read as different pictures, not repeats.

/** Detail crops of the starter photos: { photo: sample key, box: [x, y, w, h] fractions }. */
export const DETAIL_CROPS = {
  'crop-reel': { name: 'Reel close-up', photo: 'pier', box: [0.30, 0.34, 0.42, 0.42] },
  'crop-hands': { name: 'Hands on the rod', photo: 'pier', box: [0.08, 0.10, 0.46, 0.46] },
  'crop-mirror': { name: 'Mirror & door', photo: 'boulevard', box: [0.52, 0.38, 0.46, 0.44] },
  'crop-shades': { name: 'Shades portrait', photo: 'boulevard', box: [0.06, 0.02, 0.44, 0.48] },
};

/** Seeded RNG so every scene paints identically on every machine and export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyGradient(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintSunsetSkyline(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [[0, '#2b0f4d'], [0.45, '#a3236b'], [0.75, '#ff7a1a'], [1, '#ffc93c']]);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(w * 0.7, h * 0.52, Math.min(w, h) * 0.16, 0, Math.PI * 2); ctx.fill();
  // Tower silhouettes with lit windows.
  let x = -w * 0.04;
  while (x < w) {
    const bw = w * (0.08 + rnd() * 0.12);
    const bh = h * (0.3 + rnd() * 0.42);
    ctx.fillStyle = '#1c0b33';
    ctx.fillRect(x, h - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 201, 60, 0.9)';
    for (let wy = h - bh + 6; wy < h - 8; wy += 11) {
      for (let wx = x + 4; wx < x + bw - 4; wx += 9) {
        if (rnd() > 0.55) ctx.fillRect(wx, wy, 4, 5);
      }
    }
    x += bw + w * 0.015;
  }
  ctx.fillStyle = '#12081f'; ctx.fillRect(0, h - 3, w, 3);
}

function paintMarinaMasts(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [[0, '#123a5e'], [0.4, '#2b7ea6'], [0.62, '#f2a65a'], [1, '#ffd98a']]);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.6, Math.min(w, h) * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0d2c47'; ctx.fillRect(0, h * 0.66, w, h * 0.34);
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = h * (0.69 + rnd() * 0.24);
    ctx.beginPath(); ctx.moveTo(rnd() * w, y); ctx.lineTo(rnd() * w, y); ctx.stroke();
  }
  // Sailboat masts and hulls, centred so any panel crop keeps a boat in frame.
  for (let i = 0; i < 6; i++) {
    const bx = w * (0.14 + i * 0.145) + rnd() * 8;
    const by = h * 0.66;
    const mh = h * (0.3 + rnd() * 0.18);
    ctx.strokeStyle = '#0a1c30'; ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - mh); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath(); ctx.moveTo(bx, by - mh); ctx.lineTo(bx, by - 6); ctx.lineTo(bx + w * 0.07, by - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a1c30';
    ctx.beginPath(); ctx.moveTo(bx - w * 0.06, by); ctx.lineTo(bx + w * 0.08, by); ctx.lineTo(bx + w * 0.05, by + h * 0.05); ctx.lineTo(bx - w * 0.03, by + h * 0.05); ctx.closePath(); ctx.fill();
  }
}

function paintHighwayTrails(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [[0, '#070418'], [0.6, '#1b0f3a'], [1, '#33124d']]);
  ctx.fillStyle = '#0a0618'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
  // Light trails sweeping toward a vanishing point.
  const vx = w * 0.52, vy = h * 0.62;
  const trails = [['#ffcf5c', 0.9], ['#ff5d3c', 0.8], ['#7ce7ff', 0.75], ['#ffffff', 0.6]];
  trails.forEach(([color, alpha], ti) => {
    ctx.strokeStyle = color; ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(2, h * 0.012) * (1 + ti * 0.3);
    for (let i = 0; i < 3; i++) {
      const startX = (ti % 2 ? -0.1 : 1.1) * w + rnd() * 20;
      const startY = h * (0.78 + ti * 0.05 + i * 0.02);
      ctx.beginPath(); ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(w * (0.3 + rnd() * 0.4), h * 0.7, vx + (rnd() - 0.5) * 30, vy);
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
  // Distant towers.
  ctx.fillStyle = '#120826';
  for (let i = 0; i < 7; i++) {
    const bw = w * (0.06 + rnd() * 0.08), bh = h * (0.2 + rnd() * 0.3);
    ctx.fillRect(i * w * 0.15, vy - bh, bw, bh);
  }
}

function paintNeonMotel(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [[0, '#0b1030'], [0.7, '#233064'], [1, '#3a2a5e']]);
  ctx.fillStyle = '#141b38'; ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.fillStyle = '#1d2650'; ctx.fillRect(w * 0.08, h * 0.3, w * 0.84, h * 0.3);
  // Room doors and glowing windows.
  for (let i = 0; i < 5; i++) {
    const dx = w * (0.13 + i * 0.16);
    ctx.fillStyle = i % 2 ? '#ffb84d' : '#67e8f9';
    ctx.fillRect(dx, h * 0.38, w * 0.07, h * 0.2);
    ctx.fillStyle = '#0b1030'; ctx.fillRect(dx + w * 0.055, h * 0.47, 3, 3);
  }
  // The sign: a glowing rounded board with script lettering, kept compact
  // and high so a narrow panel crop still reads as a motel, not a text scrap.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.17);
  ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 26;
  ctx.fillStyle = '#2a0f2e';
  ctx.beginPath(); ctx.roundRect(-w * 0.21, -h * 0.07, w * 0.42, h * 0.14, h * 0.07); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ff5da2'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-w * 0.21, -h * 0.07, w * 0.42, h * 0.14, h * 0.07); ctx.stroke();
  ctx.fillStyle = '#ffd7ec';
  ctx.font = `${Math.round(h * 0.075)}px Pacifico, cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Starlite Motel', 0, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 46, 136, 0.16)'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
  void rnd;
}

function paintLifeguardTower(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [[0, '#7fd4f2'], [0.5, '#bfeaf7'], [0.72, '#ffe9b8'], [1, '#ffd98a']]);
  ctx.fillStyle = '#2aa7a0'; ctx.fillRect(0, h * 0.52, w, h * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 10; i++) ctx.fillRect(rnd() * w, h * (0.54 + rnd() * 0.1), w * 0.06, 2);
  ctx.fillStyle = '#f7e3ae'; ctx.fillRect(0, h * 0.68, w, h * 0.32);
  // Tower: legs, ramp, hut with a striped roof.
  const cx = w * 0.5, base = h * 0.92, top = h * 0.34;
  ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = Math.max(4, w * 0.014);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.13, base); ctx.lineTo(cx - w * 0.05, top + h * 0.2);
  ctx.moveTo(cx + w * 0.13, base); ctx.lineTo(cx + w * 0.05, top + h * 0.2);
  ctx.moveTo(cx - w * 0.2, base); ctx.lineTo(cx - w * 0.05, top + h * 0.24);
  ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - w * 0.11, top + h * 0.08, w * 0.22, h * 0.15);
  ctx.fillStyle = '#19b5a6'; ctx.fillRect(cx - w * 0.07, top + h * 0.11, w * 0.14, h * 0.07);
  ctx.fillStyle = '#ff5d3c';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, top + h * 0.08); ctx.lineTo(cx + w * 0.15, top + h * 0.08);
  ctx.lineTo(cx + w * 0.09, top); ctx.lineTo(cx - w * 0.09, top);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(h * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('BAYWATCH · TOWER 6', cx, top + h * 0.29);
}

function paintPalmBoulevard(ctx, w, h, rnd) {
  skyGradient(ctx, w, h, [[0, '#3a1c71'], [0.5, '#d76d77'], [0.8, '#ffaf7b'], [1, '#ffd98a']]);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.62, Math.min(w, h) * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#40255e'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 3; ctx.setLineDash([18, 14]);
  ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.5, h * 0.64); ctx.stroke();
  ctx.setLineDash([]);
  // Two rows of palms converging on the sun.
  const palm = (x, y, s, flip) => {
    ctx.strokeStyle = '#1c0b33'; ctx.lineWidth = Math.max(3, 6 * s);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + flip * 8 * s, y - 40 * s, x + flip * 14 * s, y - 74 * s); ctx.stroke();
    ctx.lineWidth = Math.max(2, 4 * s);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.08 + i * 0.17);
      ctx.beginPath();
      ctx.moveTo(x + flip * 14 * s, y - 74 * s);
      ctx.quadraticCurveTo(
        x + flip * 14 * s + Math.cos(a) * 26 * s * flip, y - 74 * s - Math.sin(a) * 20 * s - 6 * s,
        x + flip * 14 * s + Math.cos(a) * 44 * s * flip, y - 74 * s - Math.sin(a) * 26 * s + 12 * s);
      ctx.stroke();
    }
  };
  for (let i = 0; i < 4; i++) {
    const t = i / 4, s = 1.15 - t * 0.65;
    palm(w * (0.3 - t * 0.2), h * (0.98 - t * 0.3), s, 1);
    palm(w * (0.7 + t * 0.2), h * (0.98 - t * 0.3), s, -1);
  }
  void rnd;
}

/** Scene catalogue: id -> { name, paint }. */
export const SCENES = {
  'scene-skyline': { name: 'Sunset skyline', paint: paintSunsetSkyline },
  'scene-marina': { name: 'Marina masts', paint: paintMarinaMasts },
  'scene-highway': { name: 'Highway trails', paint: paintHighwayTrails },
  'scene-motel': { name: 'Neon motel', paint: paintNeonMotel },
  'scene-lifeguard': { name: 'Lifeguard tower', paint: paintLifeguardTower },
  'scene-palms': { name: 'Palm boulevard', paint: paintPalmBoulevard },
};

/** Paints a scene onto a fresh offscreen canvas at w x h and returns it. */
export function renderSceneCanvas(sceneId, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d');
  const seed = [...sceneId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  SCENES[sceneId].paint(ctx, canvas.width, canvas.height, mulberry32(seed));
  return canvas;
}
