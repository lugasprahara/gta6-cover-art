// The cover renderer for Chrome Coast: full-bleed panel collages, a giant chrome-gradient title
// laid over the art, a label on every panel, and the full set of poster furniture (review-quote
// strip with stars, starburst seal, tagline ribbon, credits footer, barcode, edition tag).
// Rendering is a pure function of the cover document + loaded assets, so the preview, the preset
// thumbnails and the PNG exports all draw the exact same cover.

import { artById } from './library.js';
import { SCENES, MOODS } from './scenes.js';
import { layoutById } from './layouts.js';
import { applyGrade, applyGrain, applyHalftone, applyVignette } from './grades.js';

/** Chrome gradient stops per grade — bright crown, hot band, dark waist, glowing horizon. */
const CHROME = {
  sunset: ['#ffffff', '#ffe9a8', '#ffb63d', '#e2543e', '#57183f', '#ffd76e', '#ff8c42'],
  neon: ['#ffffff', '#c8f4ff', '#3fd9ff', '#2a5cff', '#3b1160', '#ff5ec4', '#8be9ff'],
  golden: ['#ffffff', '#fff3c4', '#ffd76e', '#c97b2d', '#4a2a10', '#ffe9a8', '#ffb63d'],
  teal: ['#ffffff', '#d8fff2', '#3fd9c0', '#0e7d8c', '#06303a', '#bfeee0', '#3fd9c0'],
};

const sceneCache = new Map();

/** Renders a painted scene once per (scene, mood, size) and caches the tile. */
function sceneTile(sceneId, mood, w, h) {
  const key = `${sceneId}|${mood}|${w}x${h}`;
  let tile = sceneCache.get(key);
  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = Math.max(2, Math.round(w));
    tile.height = Math.max(2, Math.round(h));
    SCENES[sceneId].paint(tile.getContext('2d'), tile.width, tile.height, MOODS[mood] ?? MOODS.sunset);
    sceneCache.set(key, tile);
  }
  return tile;
}

function panelPath(ctx, p) {
  ctx.beginPath();
  if (p.poly) {
    ctx.moveTo(p.poly[0][0], p.poly[0][1]);
    for (let i = 1; i < p.poly.length; i++) ctx.lineTo(p.poly[i][0], p.poly[i][1]);
    ctx.closePath();
  } else {
    ctx.rect(p.x, p.y, p.w, p.h);
  }
}

/** Draws one panel's art (photo, crop, upload or scene) cover-fitted with zoom and pan. */
function drawPanelArt(ctx, p, panelDoc, doc, assets) {
  const entry = artById(panelDoc.artId);
  ctx.save();
  panelPath(ctx, p);
  ctx.clip();
  if ((entry && entry.kind === 'scene') || (!entry && !assets.has(panelDoc.artId))) {
    const sceneId = entry ? entry.scene : 'palms';
    const tile = sceneTile(sceneId, doc.gradeId, p.w, p.h);
    ctx.drawImage(tile, p.x, p.y, p.w, p.h);
  } else {
    const img = entry && entry.kind === 'crop' ? assets.get(entry.photo) : assets.get(panelDoc.artId);
    if (img) {
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (entry && entry.kind === 'crop') {
        sx = entry.rect.x * sw; sy = entry.rect.y * sh;
        sw = entry.rect.w * sw; sh = entry.rect.h * sh;
      }
      const scale = Math.max(p.w / sw, p.h / sh) * (panelDoc.zoom || 1);
      const dw = sw * scale, dh = sh * scale;
      const dx = p.x + (p.w - dw) / 2 + (panelDoc.panX || 0) * Math.max(0, (dw - p.w) / 2);
      const dy = p.y + (p.h - dh) / 2 + (panelDoc.panY || 0) * Math.max(0, (dh - p.h) / 2);
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#241a3e';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  }
  // Soft shade at the panel's foot so its label always reads.
  const shade = ctx.createLinearGradient(0, p.y + p.h * 0.78, 0, p.y + p.h);
  shade.addColorStop(0, 'rgba(8, 4, 16, 0)');
  shade.addColorStop(1, 'rgba(8, 4, 16, 0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.restore();
  // Poster panel borders: heavy dark keyline with a faint inner light line.
  ctx.save();
  panelPath(ctx, p);
  ctx.lineWidth = Math.max(3, ctx.canvas.width * 0.0045);
  ctx.strokeStyle = '#0d0a14';
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.stroke();
  ctx.restore();
}

/** Left edge of a panel at height y — diagonal slices lean, so labels follow the slant. */
function leftEdgeAt(p, y) {
  if (!p.poly) return p.x;
  let best = Infinity;
  for (let i = 0, j = p.poly.length - 1; i < p.poly.length; j = i++) {
    const [xi, yi] = p.poly[i];
    const [xj, yj] = p.poly[j];
    if ((yi <= y && yj >= y) || (yj <= y && yi >= y)) {
      const t = yj === yi ? 0 : (y - yi) / (yj - yi);
      best = Math.min(best, xi + (xj - xi) * t);
    }
  }
  return best === Infinity ? p.x : best;
}

/** Right edge of a panel at height y — the mirror of leftEdgeAt for slanted panels. */
function rightEdgeAt(p, y, w) {
  if (!p.poly) return p.x + p.w;
  let best = -Infinity;
  for (let i = 0, j = p.poly.length - 1; i < p.poly.length; j = i++) {
    const [xi, yi] = p.poly[i];
    const [xj, yj] = p.poly[j];
    if ((yi <= y && yj >= y) || (yj <= y && yi >= y)) {
      const t = yj === yi ? 0 : (y - yi) / (yj - yi);
      best = Math.max(best, xi + (xj - xi) * t);
    }
  }
  return best === -Infinity ? Math.min(w, p.x + p.w) : Math.min(w, best);
}

/**
 * Draws a panel's label chip inside the panel's safe zone: above the credits footer when the
 * panel reaches the bottom of the cover, clear of the title zone, and fitted between the
 * panel's own (possibly slanted) edges at the label's height.
 */
function drawLabel(ctx, p, text, doc, w, h, u, footerH) {
  if (!text || !text.trim()) return;
  const label0 = text.trim().toUpperCase();
  let size = Math.max(13 * u, Math.min(30 * u, p.h * 0.078));
  const panelBottom = p.y + p.h;
  const bottomLimit = panelBottom > h - footerH - 2 ? h - footerH - 8 * u : panelBottom - 8 * u;
  // The width actually available at the label's height, between the panel's two edges there.
  const midY = bottomLimit - size * 0.81;
  const availW = rightEdgeAt(p, midY, w) - leftEdgeAt(p, midY) - 18 * u;
  const maxChipW = Math.max(40 * u, Math.min(p.w - 18 * u, availW));
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.06)}px`; } catch { /* older engines */ }
  while (ctx.measureText(label0).width + size * 1.5 > maxChipW && size > 9 * u) {
    size -= 1;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  // Narrow slices (diagonal covers) get an ellipsis cut rather than a chip that spills
  // across the divider into the next panel.
  let label = label0;
  while (label.length > 3 && ctx.measureText(label).width + size * 1.5 > maxChipW) {
    label = label.slice(0, -2);
  }
  if (label !== label0) label = label.trimEnd() + '…';
  const textW = ctx.measureText(label).width;
  const chipW = textW + size * 1.6;
  const chipH = size * 1.62;
  const chipY = bottomLimit - chipH;
  const chipX = leftEdgeAt(p, chipY + chipH / 2) + 9 * u;
  ctx.save();
  ctx.fillStyle = 'rgba(9, 6, 17, 0.82)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, chipH * 0.24);
  ctx.fill();
  ctx.fillStyle = (MOODS[doc.gradeId] ?? MOODS.sunset).neon;
  ctx.fillRect(chipX + size * 0.32, chipY + chipH * 0.3, size * 0.4, size * 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, chipX + size * 0.95, chipY + chipH * 0.54);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
}

/** Splits a title into one or two lines, whichever sets larger inside the title zone. */
function fitTitle(ctx, title, zone) {
  const words = title.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], size: 0 };
  const measure = (lines, size) => {
    ctx.font = `${size}px Anton, sans-serif`;
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  const fitSize = (lines) => {
    // Budget the subtitle's band (0.54 of the title size) inside the zone too, so the whole
    // block — title lines plus script subtitle — truly fits the capped title zone.
    let size = zone.maxH / (lines.length * 1.04 + 0.54);
    while (size > 8 && measure(lines, size) > zone.maxW) size *= 0.96;
    return size;
  };
  const one = [words.join(' ')];
  const oneSize = fitSize(one);
  let best = { lines: one, size: oneSize };
  if (words.length > 1) {
    let split = 1;
    let bestBalance = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      const b = words.slice(i).join(' ').length;
      if (Math.abs(a - b) < bestBalance) { bestBalance = Math.abs(a - b); split = i; }
    }
    const two = [words.slice(0, split).join(' '), words.slice(split).join(' ')];
    const twoSize = fitSize(two);
    if (twoSize > oneSize * 1.12) best = { lines: two, size: twoSize };
  }
  return best;
}

/** The giant chrome title + neon script subtitle, fitted hard inside the layout's title zone. */
function drawTitle(ctx, doc, w, h, u, glow) {
  const layout = layoutById(doc.layoutId);
  const zone = {
    cx: layout.title.cx * w,
    top: layout.title.top * h,
    maxW: layout.title.maxW * w,
    maxH: layout.title.maxH * h,
  };
  // Soft scrim so the lettering pops off busy photography.
  const scrim = ctx.createRadialGradient(zone.cx, zone.top + zone.maxH * 0.5, 10, zone.cx, zone.top + zone.maxH * 0.5, zone.maxW * 0.62);
  scrim.addColorStop(0, 'rgba(10, 5, 20, 0.34)');
  scrim.addColorStop(1, 'rgba(10, 5, 20, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(zone.cx - zone.maxW * 0.62, zone.top - zone.maxH * 0.2, zone.maxW * 1.24, zone.maxH * 1.4);

  const { lines, size } = fitTitle(ctx, doc.title || '', zone);
  if (!lines.length) return zone.top;
  const subSize = size * 0.36;
  const blockH = lines.length * size * 1.04 + subSize * 1.5;
  const startY = zone.top + Math.max(0, (zone.maxH - blockH) / 2);
  const stops = CHROME[doc.gradeId] ?? CHROME.sunset;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const y = startY + size * 0.92 + i * size * 1.04;
    const grad = ctx.createLinearGradient(0, y - size * 0.92, 0, y + size * 0.18);
    stops.forEach((c, j) => grad.addColorStop(j / (stops.length - 1), c));
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.015)}px`; } catch { /* older engines */ }
    ctx.save();
    ctx.shadowColor = 'rgba(16, 6, 28, 0.55)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = size * 0.055;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.17;
    ctx.strokeStyle = '#150a22';
    ctx.strokeText(line, zone.cx, y);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grad;
    ctx.fillText(line, zone.cx, y);
    ctx.restore();
  });
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  // Neon script subtitle, tucked under the title with a slight tilt.
  if (doc.subtitle && doc.subtitle.trim()) {
    const mood = MOODS[doc.gradeId] ?? MOODS.sunset;
    const subY = startY + lines.length * size * 1.04 + subSize * 1.12;
    ctx.save();
    ctx.translate(zone.cx, subY);
    ctx.rotate(-0.035);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.shadowColor = mood.neon;
    ctx.shadowBlur = 6 + glow * 30 * u;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(doc.subtitle.trim(), 0, 0);
    ctx.fillStyle = mood.neon;
    ctx.globalAlpha = 0.55;
    ctx.fillText(doc.subtitle.trim(), 0, 0);
    ctx.restore();
  }
  return startY + blockH;
}

function star(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Review-quote strip across the very top: quote on the left, five stars on the right. */
function drawQuoteStrip(ctx, doc, w, u) {
  const qh = Math.max(30 * u, w * 0.045);
  ctx.fillStyle = 'rgba(9, 6, 17, 0.9)';
  ctx.fillRect(0, 0, w, qh);
  ctx.fillStyle = '#ffb63d';
  ctx.fillRect(0, qh - 2, w, 2);
  const mood = MOODS[doc.gradeId] ?? MOODS.sunset;
  // Stars
  const starR = qh * 0.3;
  for (let i = 0; i < 5; i++) star(ctx, w - (5 - i) * starR * 2.3 - 10 * u, qh / 2, starR, '#ffb63d');
  // Quote (shrinks / truncates to the space left of the stars)
  let size = qh * 0.4;
  ctx.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`;
  try { ctx.letterSpacing = '0.5px'; } catch { /* older engines */ }
  const maxW = w - 5 * starR * 2.3 - 44 * u;
  let quote = (doc.quote || '').trim();
  while (quote.length > 4 && ctx.measureText(quote).width > maxW) quote = quote.slice(0, -2);
  if (quote !== (doc.quote || '').trim()) quote = quote.trimEnd() + '…”';
  ctx.fillStyle = '#f4eefc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(quote, 14 * u, qh / 2 + 1);
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  return qh;
}

/** Edition tag (VOL.) hanging under the quote strip on the left edge. */
function drawVolTag(ctx, doc, w, topY, u) {
  const text = (doc.vol || '').trim().toUpperCase();
  if (!text) return;
  let size = 15 * u;
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const tw2 = tw + 22 * u;
  const th = size * 1.9;
  ctx.save();
  ctx.translate(12 * u, topY + 10 * u);
  ctx.rotate(-0.03);
  ctx.fillStyle = 'rgba(9, 6, 17, 0.88)';
  ctx.strokeStyle = '#ffb63d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(0, 0, tw2, th, 5 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd76e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tw2 / 2, th * 0.56);
  ctx.restore();
}

/** Starburst seal: ORIGINAL COVER ART · EST · 2026, parked at the title zone's lower right. */
function drawSeal(ctx, doc, w, h, u, cy) {
  const cx = w - 76 * u;
  const r = 50 * u;
  const safeCy = Math.min(Math.max(cy, r + 40 * u), h * 0.66);
  ctx.save();
  ctx.translate(cx, safeCy);
  ctx.rotate(-0.16);
  const grad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
  grad.addColorStop(0, '#ffe9a8');
  grad.addColorStop(1, '#ff8c42');
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const rad = i % 2 ? r * 0.84 : r;
    const ang = (i * Math.PI) / 16;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.rotate(0.16);
  ctx.fillStyle = '#160a24';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${13.5 * u}px Anton, sans-serif`;
  ctx.fillText('ORIGINAL', 0, -r * 0.3);
  ctx.fillText('COVER ART', 0, -r * 0.02);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${10.5 * u}px Anton, sans-serif`;
  ctx.fillText('EST · 2026', 0, r * 0.3);
  ctx.restore();
}

/** Tagline ribbon: an angled hot strip under the title, left side. */
function drawRibbon(ctx, doc, w, u, y) {
  const text = (doc.tagline || '').trim().toUpperCase();
  if (!text) return;
  const rh = 30 * u;
  ctx.save();
  ctx.translate(0, y);
  ctx.rotate(-0.021);
  // Size the strip to its text (capped) so it never reaches across neighbouring labels.
  let size = 16.5 * u;
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = '1px'; } catch { /* older engines */ }
  while (ctx.measureText(text).width > w * 0.6 && size > 9 * u) {
    size -= 0.5;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const stripW = Math.min(w * 0.72, ctx.measureText(text).width + 44 * u);
  const grad = ctx.createLinearGradient(0, 0, stripW, 0);
  grad.addColorStop(0, '#ffb63d');
  grad.addColorStop(1, '#ff5e7a');
  ctx.fillStyle = grad;
  ctx.fillRect(-12, 0, stripW + 12, rh);
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 16 * u, rh * 0.56);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
}

/** Production-credits footer bar with a barcode at its right end. */
function drawCredits(ctx, doc, w, h, u) {
  const fh = Math.max(32 * u, h * 0.04);
  const y = h - fh;
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, y, w, fh);
  ctx.fillStyle = '#ffb63d';
  ctx.fillRect(0, y, w, 2);
  const cast = doc.panels
    .map((p) => (p.label || '').split('·')[0].trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');
  let credits = `A CHROME COAST STUDIO PRODUCTION · “${(doc.title || '').toUpperCase()}” · STARRING ${cast} · SHOT ON LOCATION IN SAN SOLANO · © 2026`;
  let size = fh * 0.3;
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = '0.8px'; } catch { /* older engines */ }
  const maxW = w - 150 * u;
  // Trim whole credit clauses (at the ' · ' joints) so the line never ends mid-word.
  while (credits.length > 8 && ctx.measureText(credits).width > maxW) {
    const cut = credits.lastIndexOf(' · ');
    if (cut < 8) break;
    credits = credits.slice(0, cut);
  }
  ctx.fillStyle = 'rgba(244, 238, 252, 0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(credits, (w - 118 * u) / 2, y + fh * 0.54);
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  // Barcode: fixed seeded bar pattern + microtext.
  const bx = w - 112 * u;
  const bw = 96 * u;
  const bh = fh * 0.58;
  const by = y + fh * 0.14;
  let rngState = 4242;
  const next = () => { rngState = (rngState * 1103515245 + 12345) & 0x7fffffff; return rngState / 0x7fffffff; };
  ctx.fillStyle = '#f4eefc';
  let x = bx;
  while (x < bx + bw - 3) {
    const barW = (0.8 + next() * 2.6) * u;
    if (next() > 0.32) ctx.fillRect(x, by, barW, bh);
    x += barW + (0.8 + next() * 1.6) * u;
  }
  ctx.font = `${8.5 * u}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('CC · 2026 · SAN SOLANO', bx + bw / 2, y + fh * 0.88);
  return fh;
}

/**
 * Renders the whole cover onto `canvas` at (w, h).
 * `assets` is a Map of artId -> HTMLImageElement for photos and user uploads.
 */
export function renderCover(canvas, doc, assets, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const u = w / 1080;
  const layout = layoutById(doc.layoutId);
  const panels = layout.panels(w, h);
  const footerH = Math.max(32 * u, h * 0.04);

  // 1 · The collage, full-bleed.
  panels.forEach((p, i) => {
    const panelDoc = doc.panels[i] ?? doc.panels[doc.panels.length - 1];
    drawPanelArt(ctx, p, panelDoc, doc, assets);
  });

  // 2 · The cinematic grade over the art only — lettering and furniture stay crisp.
  applyGrade(canvas, doc.gradeId, doc.look?.grade ?? 0.85);

  // 3 · Panel labels, each inside its safe zone.
  panels.forEach((p, i) => {
    const panelDoc = doc.panels[i];
    if (panelDoc) drawLabel(ctx, p, panelDoc.label, doc, w, h, u, footerH);
  });

  // 4 · Furniture: quote strip, title block, ribbon + seal row, VOL tag, credits + barcode.
  const stripH = drawQuoteStrip(ctx, doc, w, u);
  const titleBottom = drawTitle(ctx, doc, w, h, u, doc.look?.glow ?? 0.6);
  drawRibbon(ctx, doc, w, u, titleBottom + 14 * u);
  drawSeal(ctx, doc, w, h, u, titleBottom + 62 * u);
  drawVolTag(ctx, doc, w, stripH, u);
  drawCredits(ctx, doc, w, h, u);

  // 5 · Print finishing over everything.
  applyHalftone(canvas, doc.look?.halftone ?? 0);
  applyGrain(canvas, doc.look?.grain ?? 0);
  applyVignette(canvas, 0.42);
}
