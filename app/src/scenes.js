// Procedurally painted scene panels for Chrome Coast. Every scene is drawn by code onto any rectangle,
// in one of four mood palettes, with a seeded random generator — so a scene renders byte-identically
// every time, on every machine, with no image files and no network.

/** Small deterministic PRNG (mulberry32). Same seed, same stream, forever. */
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The four mood palettes the scenes (and the cover grades) share. */
export const MOODS = {
  sunset: { skyTop: '#24104a', skyMid: '#a8325c', skyLow: '#ff8c42', sun: '#ffd76e', sea: '#46205e', ground: '#1c0f30', neon: '#ff5e7a', light: '#ffe9a8', silhouette: '#170b28' },
  neon: { skyTop: '#05082a', skyMid: '#38105e', skyLow: '#c22a6e', sun: '#8be9ff', sea: '#0e1a4e', ground: '#08081c', neon: '#3fd9ff', light: '#ffd7f0', silhouette: '#05040f' },
  golden: { skyTop: '#4a2a10', skyMid: '#c97b2d', skyLow: '#ffd76e', sun: '#fff3c4', sea: '#8a5426', ground: '#2a1a0c', neon: '#ffb63d', light: '#fff0d0', silhouette: '#201204' },
  teal: { skyTop: '#075a6e', skyMid: '#1f9e8f', skyLow: '#c8f2df', sun: '#fff6d8', sea: '#0a7d8c', ground: '#0b3a42', neon: '#3fd9c0', light: '#eafff6', silhouette: '#062a30' },
};

function skyGradient(ctx, w, h, mood, horizon = 0.72) {
  const g = ctx.createLinearGradient(0, 0, 0, h * horizon);
  g.addColorStop(0, mood.skyTop);
  g.addColorStop(0.55, mood.skyMid);
  g.addColorStop(1, mood.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * horizon + 1);
}

function sunDisc(ctx, x, y, r, mood) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 2.4);
  g.addColorStop(0, mood.sun);
  g.addColorStop(0.35, mood.sun + 'cc');
  g.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  ctx.fillStyle = mood.sun;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A palm silhouette: curved trunk plus a crown of fronds, drawn around base point (x, y). */
export function palmTree(ctx, x, y, height, lean, color, rand) {
  const topX = x + lean * height;
  const topY = y - height;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, height * 0.035);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * height * 0.3, y - height * 0.6, topX, topY);
  ctx.stroke();
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const ang = Math.PI * (0.08 + (0.84 * i) / (fronds - 1)) + (rand() - 0.5) * 0.15;
    const len = height * (0.34 + rand() * 0.12);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY - Math.sin(ang) * len * 0.55 + len * 0.22;
    ctx.lineWidth = Math.max(1.4, height * 0.016);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(ang) * len * 0.6, topY - Math.sin(ang) * len * 0.75, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX, topY, height * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function litWindows(ctx, rand, x, y, w, h, mood, density = 0.16) {
  const cols = Math.max(2, Math.floor(w / 14));
  const rows = Math.max(2, Math.floor(h / 18));
  const cw = w / cols;
  const ch = h / rows;
  ctx.fillStyle = mood.light;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rand() < density) ctx.fillRect(x + i * cw + cw * 0.25, y + j * ch + ch * 0.25, cw * 0.45, ch * 0.45);
    }
  }
}

/** Downtown skyline at dusk: two silhouette layers, lit windows, a water strip with reflections. */
function paintSkyline(ctx, w, h, mood) {
  const rand = rng(1101);
  skyGradient(ctx, w, h, mood, 0.78);
  sunDisc(ctx, w * 0.7, h * 0.52, h * 0.13, mood);
  // Far layer
  ctx.fillStyle = mood.skyMid;
  let x = -w * 0.04;
  while (x < w) {
    const bw = w * (0.05 + rand() * 0.07);
    const bh = h * (0.2 + rand() * 0.22);
    ctx.fillRect(x, h * 0.78 - bh, bw, bh);
    x += bw + w * 0.012;
  }
  // Near layer
  x = -w * 0.02;
  while (x < w) {
    const bw = w * (0.06 + rand() * 0.09);
    const bh = h * (0.3 + rand() * 0.34);
    ctx.fillStyle = mood.silhouette;
    ctx.fillRect(x, h * 0.78 - bh, bw, bh);
    if (rand() < 0.5) ctx.fillRect(x + bw * 0.4, h * 0.78 - bh - h * 0.05, bw * 0.18, h * 0.05); // antenna block
    litWindows(ctx, rand, x + bw * 0.12, h * 0.78 - bh + h * 0.05, bw * 0.76, bh * 0.85, mood, 0.13);
    x += bw + w * 0.008;
  }
  // Water
  ctx.fillStyle = mood.sea;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.fillStyle = mood.sun;
  for (let i = 0; i < 46; i++) {
    const y = h * 0.79 + rand() * h * 0.19;
    const len = w * (0.02 + rand() * 0.09) * (1 - (y / h - 0.78));
    ctx.globalAlpha = 0.12 + rand() * 0.3;
    ctx.fillRect(w * 0.7 - len / 2 + (rand() - 0.5) * w * 0.1, y, len, Math.max(1, h * 0.006));
  }
  ctx.globalAlpha = 1;
}

/** Marina: moored boats, a thicket of masts and rigging, sun glints on the water. */
function paintMarina(ctx, w, h, mood) {
  const rand = rng(2202);
  skyGradient(ctx, w, h, mood, 0.5);
  sunDisc(ctx, w * 0.24, h * 0.3, h * 0.09, mood);
  ctx.fillStyle = mood.sea;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
  // Distant shore
  ctx.fillStyle = mood.silhouette;
  ctx.fillRect(0, h * 0.47, w, h * 0.035);
  for (let i = 0; i < 5; i++) palmTree(ctx, w * (0.06 + i * 0.2) + rand() * w * 0.05, h * 0.475, h * 0.09, 0.1, mood.silhouette, rand);
  // Boats: hull + mast + rigging, riding in two loose rows on the water
  const boats = 6;
  for (let i = 0; i < boats; i++) {
    const bx = w * (0.06 + (i * 0.88) / boats) + rand() * w * 0.03;
    const by = h * (0.64 + (i % 2) * 0.15) + rand() * h * 0.02;
    const bw = w * (0.1 + rand() * 0.06);
    const mastH = h * (0.24 + rand() * 0.1);
    ctx.strokeStyle = mood.silhouette;
    ctx.lineWidth = Math.max(1.2, w * 0.0035);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by);
    ctx.lineTo(bx + bw * 0.5, by - mastH);
    ctx.moveTo(bx + bw * 0.5, by - mastH);
    ctx.lineTo(bx + bw * 0.06, by);
    ctx.moveTo(bx + bw * 0.5, by - mastH);
    ctx.lineTo(bx + bw * 0.94, by);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? mood.light : mood.neon;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw * 0.82, by + h * 0.045);
    ctx.lineTo(bx + bw * 0.18, by + h * 0.045);
    ctx.closePath();
    ctx.fill();
  }
  // Glints
  ctx.fillStyle = mood.sun;
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = 0.08 + rand() * 0.25;
    ctx.fillRect(rand() * w, h * 0.52 + rand() * h * 0.44, w * (0.01 + rand() * 0.05), Math.max(1, h * 0.005));
  }
  ctx.globalAlpha = 1;
}

/** Highway at night: perspective road, lane dashes and long light trails. */
function paintHighway(ctx, w, h, mood) {
  const rand = rng(3303);
  const horizon = h * 0.42;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, mood.skyTop);
  g.addColorStop(1, mood.skyMid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon + 1);
  // Horizon glow + mini skyline
  ctx.fillStyle = mood.neon;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, horizon - h * 0.02, w, h * 0.02);
  ctx.globalAlpha = 1;
  ctx.fillStyle = mood.silhouette;
  let x = 0;
  while (x < w) {
    const bw = w * (0.03 + rand() * 0.05);
    const bh = h * (0.05 + rand() * 0.1);
    ctx.fillRect(x, horizon - bh, bw, bh);
    x += bw + w * 0.01;
  }
  // Road trapezoid
  const cx = w * 0.5;
  ctx.fillStyle = '#0b0b16';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.06, horizon);
  ctx.lineTo(cx + w * 0.06, horizon);
  ctx.lineTo(w * 1.02, h);
  ctx.lineTo(-w * 0.02, h);
  ctx.closePath();
  ctx.fill();
  // Light trails: white toward viewer on the left lanes, red on the right
  const trail = (side, color, count) => {
    for (let i = 0; i < count; i++) {
      const t0 = rand() * 0.75;
      const lane = (rand() - 0.5) * 0.05;
      const xAt = (t) => cx + (side * (0.012 + lane) + side * t * t * 0.46) * w * (0.25 + t * 0.75);
      const yAt = (t) => horizon + t * t * (h - horizon);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4, h * 0.006 * (0.4 + t0));
      ctx.shadowColor = color;
      ctx.shadowBlur = h * 0.02;
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.beginPath();
      ctx.moveTo(xAt(t0), yAt(t0));
      ctx.quadraticCurveTo(xAt(t0 + 0.14), yAt(t0 + 0.14), xAt(Math.min(1, t0 + 0.3)), yAt(Math.min(1, t0 + 0.3)));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };
  trail(-1, '#ffffff', 7);
  trail(1, '#ff3b30', 7);
  // Lane dashes
  ctx.fillStyle = mood.light;
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    const y = horizon + t * t * (h - horizon);
    const half = w * (0.004 + t * 0.05);
    ctx.globalAlpha = 0.25 + t * 0.6;
    ctx.fillRect(cx - half / 2, y, half, h * 0.012 + t * h * 0.02);
  }
  ctx.globalAlpha = 1;
}

/** Neon motel sign. The lettering lives well inside the sign board with wide margins, so the
 *  words stay whole and readable at any panel size the scene is painted into. */
function paintMotel(ctx, w, h, mood) {
  const rand = rng(4404);
  // Night wall
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#101426');
  g.addColorStop(1, '#1d1030');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Warm windows on the wall
  for (let i = 0; i < 4; i++) {
    const wx = w * (0.06 + i * 0.24);
    ctx.fillStyle = i % 2 ? '#ffb63d' : '#ffd76e';
    ctx.globalAlpha = 0.75;
    ctx.fillRect(wx, h * 0.68, w * 0.11, h * 0.16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = mood.silhouette;
    ctx.fillRect(wx, h * 0.68, w * 0.11, h * 0.02);
  }
  ctx.fillStyle = mood.ground;
  ctx.fillRect(0, h * 0.88, w, h * 0.12);
  // One palm leaning in from the left edge — drawn before the board so the sign stays clean.
  palmTree(ctx, w * 0.045, h * 0.92, h * 0.52, 0.16, mood.silhouette, rand);
  // Sign posts
  ctx.fillStyle = mood.silhouette;
  ctx.fillRect(w * 0.3, h * 0.56, w * 0.025, h * 0.34);
  ctx.fillRect(w * 0.68, h * 0.56, w * 0.025, h * 0.34);
  // The board: centred, generous margins on every side
  const bx = w * 0.13, by = h * 0.14, bw = w * 0.74, bh = h * 0.44;
  ctx.fillStyle = '#0a0e22';
  ctx.strokeStyle = mood.neon;
  ctx.lineWidth = Math.max(2, h * 0.012);
  ctx.shadowColor = mood.neon;
  ctx.shadowBlur = h * 0.045;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, h * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // MOTEL — fitted inside the board with margin to spare
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = bh * 0.42;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText('MOTEL').width > bw * 0.78 && size > 8) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  ctx.fillStyle = mood.light;
  ctx.shadowColor = mood.neon;
  ctx.shadowBlur = h * 0.05;
  ctx.fillText('MOTEL', w / 2, by + bh * 0.38);
  ctx.shadowBlur = 0;
  // VACANCY pill, fully inside the board's lower band
  const pw = bw * 0.44, ph = bh * 0.24, px = w / 2 - pw / 2, py = by + bh * 0.66;
  ctx.strokeStyle = mood.sun;
  ctx.lineWidth = Math.max(1.4, h * 0.007);
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, ph / 2);
  ctx.stroke();
  let vs = ph * 0.52;
  ctx.font = `${vs}px Anton, sans-serif`;
  while (ctx.measureText('VACANCY').width > pw * 0.82 && vs > 6) {
    vs -= 1;
    ctx.font = `${vs}px Anton, sans-serif`;
  }
  ctx.fillStyle = mood.sun;
  ctx.fillText('VACANCY', w / 2, py + ph * 0.54);
}

/** Lifeguard tower on an empty beach: platform, cross braces, umbrella, long shadows. */
function paintTower(ctx, w, h, mood) {
  const rand = rng(5505);
  skyGradient(ctx, w, h, mood, 0.55);
  sunDisc(ctx, w * 0.8, h * 0.24, h * 0.08, mood);
  ctx.fillStyle = mood.sea;
  ctx.fillRect(0, h * 0.5, w, h * 0.2);
  ctx.fillStyle = mood.sun;
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.1 + rand() * 0.25;
    ctx.fillRect(rand() * w, h * 0.51 + rand() * h * 0.17, w * (0.015 + rand() * 0.05), Math.max(1, h * 0.005));
  }
  ctx.globalAlpha = 1;
  // Sand
  const sg = ctx.createLinearGradient(0, h * 0.68, 0, h);
  sg.addColorStop(0, mood.skyLow);
  sg.addColorStop(1, mood.ground);
  ctx.fillStyle = sg;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  // Tower
  const tx = w * 0.36, tw = w * 0.3, deckY = h * 0.52, legBase = h * 0.9;
  ctx.strokeStyle = mood.silhouette;
  ctx.lineWidth = Math.max(2, w * 0.012);
  const leg = (x0, x1) => { ctx.beginPath(); ctx.moveTo(x0, legBase); ctx.lineTo(x1, deckY); ctx.stroke(); };
  leg(tx + tw * 0.08, tx + tw * 0.22);
  leg(tx + tw * 0.92, tx + tw * 0.78);
  ctx.lineWidth = Math.max(1.4, w * 0.007);
  ctx.beginPath();
  ctx.moveTo(tx + tw * 0.1, legBase - (legBase - deckY) * 0.3);
  ctx.lineTo(tx + tw * 0.86, deckY + (legBase - deckY) * 0.25);
  ctx.moveTo(tx + tw * 0.9, legBase - (legBase - deckY) * 0.3);
  ctx.lineTo(tx + tw * 0.14, deckY + (legBase - deckY) * 0.25);
  ctx.stroke();
  // Hut + roof
  ctx.fillStyle = mood.light;
  ctx.fillRect(tx, deckY - h * 0.13, tw, h * 0.13);
  ctx.fillStyle = mood.neon;
  ctx.beginPath();
  ctx.moveTo(tx - tw * 0.1, deckY - h * 0.13);
  ctx.lineTo(tx + tw * 0.5, deckY - h * 0.24);
  ctx.lineTo(tx + tw * 1.1, deckY - h * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mood.silhouette;
  ctx.fillRect(tx + tw * 0.38, deckY - h * 0.1, tw * 0.24, h * 0.1); // doorway
  // Umbrella + shadow
  ctx.strokeStyle = mood.silhouette;
  ctx.lineWidth = Math.max(1.6, w * 0.008);
  ctx.beginPath();
  ctx.moveTo(w * 0.78, h * 0.9);
  ctx.lineTo(w * 0.8, h * 0.66);
  ctx.stroke();
  ctx.fillStyle = mood.neon;
  ctx.beginPath();
  ctx.moveTo(w * 0.66, h * 0.68);
  ctx.quadraticCurveTo(w * 0.8, h * 0.56, w * 0.94, h * 0.68);
  ctx.quadraticCurveTo(w * 0.8, h * 0.63, w * 0.66, h * 0.68);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 8, 30, 0.3)';
  ctx.beginPath();
  ctx.ellipse(w * 0.52, h * 0.93, w * 0.3, h * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Palm boulevard: a road running to a low sun, palms marching down both sides. */
function paintPalms(ctx, w, h, mood) {
  const rand = rng(6606);
  skyGradient(ctx, w, h, mood, 0.62);
  sunDisc(ctx, w * 0.5, h * 0.55, h * 0.11, mood);
  // Ground + road
  ctx.fillStyle = mood.ground;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = '#14101f';
  ctx.beginPath();
  ctx.moveTo(w * 0.44, h * 0.62);
  ctx.lineTo(w * 0.56, h * 0.62);
  ctx.lineTo(w * 0.86, h);
  ctx.lineTo(w * 0.14, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mood.light;
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const y = h * 0.63 + t * t * h * 0.36;
    ctx.globalAlpha = 0.3 + t * 0.6;
    ctx.fillRect(w * 0.5 - w * (0.002 + t * 0.008), y, w * (0.004 + t * 0.016), h * (0.008 + t * 0.02));
  }
  ctx.globalAlpha = 1;
  // Palm rows in perspective
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const y = h * (0.64 + t * 0.34);
    const ph = h * (0.1 + t * 0.3);
    palmTree(ctx, w * (0.4 - t * 0.3), y, ph, -0.12, mood.silhouette, rand);
    palmTree(ctx, w * (0.6 + t * 0.3), y, ph, 0.12, mood.silhouette, rand);
  }
}

/** The scene registry: id → display name + painter. */
export const SCENES = {
  skyline: { name: 'Downtown skyline', paint: paintSkyline },
  marina: { name: 'The marina', paint: paintMarina },
  highway: { name: 'Highway light trails', paint: paintHighway },
  motel: { name: 'Neon motel sign', paint: paintMotel },
  tower: { name: 'Beach lifeguard tower', paint: paintTower },
  palms: { name: 'Palm boulevard', paint: paintPalms },
};
