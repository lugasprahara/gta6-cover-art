// Cinematic colour grades and print-style finishing for Chrome Coast covers.
// A grade is a luminance gradient map (deep coloured shadows -> hot mids -> glowing highlights)
// blended over the painted/photographed art, plus a saturation lift. Finishing adds seeded grain,
// a halftone dot screen and a vignette — all deterministic, all computed in the browser.

import { rng } from './scenes.js';

/** Grade definitions: shadow / mid / highlight colours the luminance ramp runs through. */
export const GRADES = {
  sunset: { name: 'Sunset chrome', shadows: [38, 16, 74], mids: [226, 84, 62], highlights: [255, 215, 110] },
  neon: { name: 'Neon night', shadows: [8, 10, 52], mids: [198, 42, 110], highlights: [139, 233, 255] },
  golden: { name: 'Golden hour', shadows: [46, 27, 10], mids: [201, 123, 45], highlights: [255, 236, 176] },
  teal: { name: 'Tropic teal', shadows: [5, 44, 54], mids: [31, 158, 143], highlights: [234, 255, 246] },
};

function rampColor(grade, t) {
  const [a, b] = t < 0.5 ? [grade.shadows, grade.mids] : [grade.mids, grade.highlights];
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/**
 * Applies the gradient-map grade to a whole canvas in place.
 * strength 0 leaves the art untouched; 1 is the full cinematic look.
 */
export function applyGrade(canvas, gradeId, strength) {
  if (strength <= 0.01) return;
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) lut[i] = rampColor(grade, i / 255);
  const mapMix = strength * 0.62;
  const sat = 1 + strength * 0.28;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    const mc = lut[lum];
    let nr = r + (mc[0] - r) * mapMix;
    let ng = g + (mc[1] - g) * mapMix;
    let nb = b + (mc[2] - b) * mapMix;
    const grey = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = grey + (nr - grey) * sat;
    ng = grey + (ng - grey) * sat;
    nb = grey + (nb - grey) * sat;
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  ctx.putImageData(img, 0, 0);
}

/** Seeded film grain: the same noise every render, so exports never shimmer between runs. */
export function applyGrain(canvas, strength) {
  if (strength <= 0.01) return;
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const rand = rng(987654321);
  const amp = strength * 26;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 2 * amp;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Halftone dot screen sampled from the cover's own luminance — bigger dots in the shadows. */
export function applyHalftone(canvas, strength) {
  if (strength <= 0.01) return;
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  const cell = Math.max(4, Math.round(w / 160));
  const sw = Math.ceil(w / cell);
  const sh = Math.ceil(h / cell);
  const probe = document.createElement('canvas');
  probe.width = sw; probe.height = sh;
  const pctx = probe.getContext('2d');
  pctx.drawImage(canvas, 0, 0, sw, sh);
  const data = pctx.getImageData(0, 0, sw, sh).data;
  ctx.save();
  ctx.fillStyle = 'rgba(14, 6, 26, 0.8)';
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const r = (1 - lum) * cell * 0.6 * strength;
      if (r < 0.45) continue;
      ctx.beginPath();
      ctx.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Soft dark vignette so the poster's edges fall away and the centre pops. */
export function applyVignette(canvas, strength = 0.5) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.42, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.72, 'rgba(238,232,248,1)');
  g.addColorStop(1, 'rgba(118,104,148,1)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = strength;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
