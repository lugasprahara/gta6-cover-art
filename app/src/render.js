// Chrome Coast cover engine — draws a full GTA-style poster onto any canvas.
// Layouts tile panels edge-to-edge (full bleed); every panel carries a label chip in
// its safe top zone; a giant chrome-gradient title is laid OVER the art with a neon
// script subtitle; poster furniture (quote + stars, starburst seal, tagline ribbon,
// credits footer, barcode, VOL tag) finishes the poster. All randomness is seeded
// from the brief, so the same brief always renders the same cover.

import { SCENES, mulberry32 } from './scenes.js';
import { CROPS, drawCoverFit } from './library.js';

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 60px Pacifico'),
      document.fonts.load('700 20px "Arial Narrow"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts if a face fails to load; the cover still renders.
  }
}

function fitFont(ctx, text, family, weight, start, maxWidth, min) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function star(ctx, cx, cy, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Panel rects for a layout, in pixels. Panels are full-bleed with a hairline gap. */
export function layoutRects(layout, count, W, H) {
  const gap = Math.max(2, Math.round(Math.min(W, H) * 0.004));
  const inset = (r) => ({ x: r.x + gap / 2, y: r.y + gap / 2, w: r.w - gap, h: r.h - gap });
  const rects = [];
  if (layout === 'hero-mosaic') {
    if (W >= H) {
      rects.push({ x: 0, y: 0, w: W * 0.62, h: H });
      for (let i = 0; i < 3; i++) rects.push({ x: W * 0.62, y: (H / 3) * i, w: W * 0.38, h: H / 3 });
    } else {
      rects.push({ x: 0, y: 0, w: W, h: H * 0.55 });
      for (let i = 0; i < 3; i++) rects.push({ x: (W / 3) * i, y: H * 0.55, w: W / 3, h: H * 0.45 });
    }
  } else if (layout === 'diagonal') {
    // Three slanted slices; the clip is applied by the painter, rects are the bboxes.
    if (W >= H) {
      const s = W / 3;
      for (let i = 0; i < 3; i++) rects.push({ x: s * i, y: 0, w: s, h: H, slant: H * 0.12 });
    } else {
      const s = H / 3;
      for (let i = 0; i < 3; i++) rects.push({ x: 0, y: s * i, w: W, h: s, slant: W * 0.12 });
    }
  } else if (layout === 'six-grid') {
    if (W >= H) {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) rects.push({ x: (W / 3) * c, y: (H / 2) * r, w: W / 3, h: H / 2 });
    } else {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) rects.push({ x: (W / 2) * c, y: (H / 3) * r, w: W / 2, h: H / 3 });
    }
  } else {
    // hero-story: big hero on top, three panels along the foot.
    rects.push({ x: 0, y: 0, w: W, h: H * 0.58 });
    for (let i = 0; i < 3; i++) rects.push({ x: (W / 3) * i, y: H * 0.58, w: W / 3, h: H * 0.42 });
  }
  return rects.slice(0, count).map(inset);
}

function clipRect(ctx, r) {
  ctx.beginPath();
  if (r.slant !== undefined) {
    const s = r.slant;
    if (r.w > r.h) {
      ctx.moveTo(r.x, r.y + s);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.lineTo(r.x + r.w, r.y + r.h - s);
      ctx.lineTo(r.x, r.y + r.h);
    } else {
      ctx.moveTo(r.x + s, r.y);
      ctx.lineTo(r.x + r.w, r.y);
      ctx.lineTo(r.x + r.w - s, r.y + r.h);
      ctx.lineTo(r.x, r.y + r.h);
    }
  } else {
    ctx.rect(r.x, r.y, r.w, r.h);
  }
  ctx.closePath();
  ctx.clip();
}

function paintPanel(ctx, rect, panel, images, rng, palette) {
  ctx.save();
  clipRect(ctx, rect);
  const { x, y, w, h } = rect;
  if (panel.src.startsWith('scene:')) {
    const name = panel.src.slice(6);
    const painter = SCENES[name] ?? SCENES.skyline;
    painter(ctx, x, y, w, h, rng, palette);
  } else if (panel.src.startsWith('crop:')) {
    const crop = CROPS[panel.src.slice(5)];
    const img = images[crop.photo];
    drawCoverFit(ctx, img, img.naturalWidth * crop.rect.x, img.naturalHeight * crop.rect.y,
      img.naturalWidth * crop.rect.w, img.naturalHeight * crop.rect.h, x, y, w, h);
  } else {
    const img = images[panel.src];
    if (img) drawCoverFit(ctx, img, 0, 0, img.naturalWidth, img.naturalHeight, x, y, w, h);
    else { ctx.fillStyle = palette.skyMid; ctx.fillRect(x, y, w, h); }
  }
  // Warm wash so photos and scenes share one cinematic grade.
  ctx.fillStyle = 'rgba(255, 122, 60, 0.07)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Label chip for one panel. Drawn AFTER the title and furniture so no label is
// ever crushed behind them: the chip floats legibly over the art. Top-edge panels
// sit below the header strip; diagonal slices centre the chip where the slant
// leaves full room, so no chip crosses a slice edge.
function drawLabelChip(ctx, rect, panel, headerH, coverH) {
  const { x, y, w, h } = rect;
  const pad = Math.max(8, Math.min(w, h) * 0.045);
  // Size follows the panel's smaller side, capped so a hero panel never gets a
  // billboard-sized chip; shrink further until the whole chip fits the panel.
  let labelSize = Math.min(Math.max(14, Math.min(w, h) * 0.085), coverH * 0.05);
  let labelW = 0;
  let subW = 0;
  let subSize = 0;
  const measure = () => {
    ctx.font = `400 ${labelSize}px Anton`;
    labelW = ctx.measureText(panel.label).width;
    subSize = Math.max(9, Math.round(labelSize * 0.42));
    ctx.font = `700 ${subSize}px "Arial Narrow", sans-serif`;
    subW = ctx.measureText(panel.sub).width;
  };
  measure();
  while (labelSize > 10 && Math.max(labelW, subW) > w - pad * 2.4) {
    labelSize -= 2;
    measure();
  }
  const chipW = Math.max(labelW, subW) + pad * 1.6;
  const chipH = labelSize + subSize + pad * 1.5;
  let chipX = x + pad;
  let chipY = y + pad + (y <= 1 ? headerH : 0);
  if (rect.slant !== undefined) {
    // Diagonal slice: centre the chip where the slant leaves full room.
    chipX = x + (w - chipW) / 2;
    chipY = y + h * 0.12;
  } else if (y > coverH * 0.45) {
    // Bottom-row panel: anchor the chip just above the tagline ribbon, clear of
    // the title band — never crushed behind the title.
    const ribbonTop = coverH - Math.max(30, coverH * 0.055) - Math.max(24, coverH * 0.042);
    chipY = ribbonTop - pad - chipH;
  }
  ctx.fillStyle = 'rgba(12, 6, 24, 0.82)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, Math.max(4, pad * 0.4));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${labelSize}px Anton`;
  ctx.fillText(panel.label, chipX + pad * 0.8, chipY + pad + labelSize * 1.02);
  ctx.fillStyle = '#ffd166';
  ctx.font = `700 ${subSize}px "Arial Narrow", sans-serif`;
  ctx.fillText(panel.sub, chipX + pad * 0.8, chipY + pad + labelSize + subSize * 1.25);
}

function grainCanvas(seed, size = 140) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const rng = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function applyGrade(ctx, W, H, grade, look) {
  const s = grade.strength * (look.grade ?? 1);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, grade.highlight);
  g.addColorStop(0.5, grade.mid);
  g.addColorStop(1, grade.shadow);
  ctx.save();
  ctx.globalAlpha = 0.34 * s;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.22 * s;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Vignette: darkened corners keep the eye on the title.
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(10,4,20,${0.32 * s})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function applyTexture(ctx, W, H, look, seed) {
  if (look.grain > 0) {
    const noise = grainCanvas(seed);
    const pat = ctx.createPattern(noise, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.1 * look.grain;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (look.halftone > 0) {
    const step = Math.max(9, Math.round(Math.min(W, H) * 0.012));
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.1 * look.halftone})`;
    for (let yy = step / 2; yy < H; yy += step) {
      for (let xx = step / 2; xx < W; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, Math.max(1, step * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawChromeTitle(ctx, W, H, title, subtitle, look) {
  const lines = title.split('\n').map((t) => t.trim()).filter(Boolean);
  // Title band sits above the bottom-row label zone (chips anchor above the
  // ribbon), so the title never eats a panel label.
  const bandTop = H * 0.46;
  const bandBottom = H * 0.72;
  const lineH = (bandBottom - bandTop) / (lines.length + 0.55);
  let size = Math.min(lineH * 0.94, H * 0.17);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const line of lines) {
    size = Math.min(size, fitFont(ctx, line, 'Anton', 400, size, W * 0.94, 20));
  }
  const totalH = lines.length * lineH;
  const top = bandTop + (bandBottom - bandTop - totalH) / 2;
  ctx.save();
  ctx.translate(W / 2, top + totalH / 2);
  ctx.transform(1, 0, -0.07, 1, 0, 0);
  ctx.translate(-W / 2, -(top + totalH / 2));
  ctx.shadowColor = 'rgba(10, 2, 24, 0.85)';
  ctx.shadowBlur = size * 0.16 + look.glow * size * 0.22;
  ctx.shadowOffsetY = size * 0.07;
  lines.forEach((line, i) => {
    const cy = top + lineH * (i + 0.5);
    // Full chrome range on every line, so no line comes out washed pale.
    const chrome = ctx.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
    chrome.addColorStop(0, '#ffffff');
    chrome.addColorStop(0.22, '#fff3c4');
    chrome.addColorStop(0.38, '#ffc46b');
    chrome.addColorStop(0.52, '#ff7a59');
    chrome.addColorStop(0.68, '#ff4d8d');
    chrome.addColorStop(0.85, '#a55eea');
    chrome.addColorStop(1, '#4d7cfe');
    ctx.font = `400 ${size}px Anton`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeText(line, W / 2, cy);
    ctx.fillStyle = chrome;
    ctx.fillText(line, W / 2, cy);
  });
  ctx.restore();
  // Neon script subtitle tucked under the title.
  const subSize = fitFont(ctx, subtitle, 'Pacifico', 400, Math.min(H * 0.055, W * 0.05), W * 0.8, 14);
  ctx.save();
  ctx.font = `400 ${subSize}px Pacifico`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = subSize * 0.7 + look.glow * subSize * 0.8;
  ctx.fillStyle = '#ffe9f4';
  ctx.fillText(subtitle, W / 2, top + totalH + subSize * 0.9);
  ctx.restore();
}

function drawFurniture(ctx, W, H, brief) {
  const headerH = Math.max(30, H * 0.05);
  // Header strip: VOL tag left, quote centre, five stars right.
  ctx.fillStyle = 'rgba(10, 4, 20, 0.72)';
  ctx.fillRect(0, 0, W, headerH);
  const volSize = Math.max(11, headerH * 0.34);
  ctx.font = `400 ${volSize}px Anton`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(brief.vol, W * 0.02, headerH / 2);
  const quoteX = W * 0.02 + ctx.measureText(brief.vol).width + W * 0.03;
  const quoteSize0 = Math.max(10, headerH * 0.3);
  const starR = Math.max(6, headerH * 0.26);
  const starsW = 5 * starR * 2.4 + W * 0.02;
  let quoteSize = quoteSize0;
  ctx.font = `italic 700 ${quoteSize}px Georgia, serif`;
  while (quoteSize > 9 && quoteX + ctx.measureText(brief.quote).width > W - starsW - W * 0.01) {
    quoteSize -= 1;
    ctx.font = `italic 700 ${quoteSize}px Georgia, serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(brief.quote, quoteX, headerH / 2);
  for (let i = 0; i < 5; i++) {
    star(ctx, W - W * 0.02 - starR - i * (starR * 2.4), headerH / 2, starR, '#ffd166');
  }
  // Starburst seal, top-right of the art, just under the header.
  const sealR = Math.min(W, H) * 0.085;
  const sx = W - sealR * 1.25;
  const sy = headerH + sealR * 1.35;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-0.2);
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? sealR : sealR * 0.78;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const sealGrad = ctx.createLinearGradient(-sealR, -sealR, sealR, sealR);
  sealGrad.addColorStop(0, '#ffd166');
  sealGrad.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = sealGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, sealR * 0.04);
  ctx.strokeStyle = '#160a24';
  ctx.stroke();
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sealSize = Math.max(9, sealR * 0.2);
  ctx.font = `400 ${sealSize}px Anton`;
  ctx.fillText('ORIGINAL', 0, -sealR * 0.28);
  ctx.fillText('COVER ART', 0, sealR * 0.02);
  ctx.font = `700 ${Math.max(8, sealR * 0.13)}px "Arial Narrow", sans-serif`;
  ctx.fillText('★ EST. 2026 ★', 0, sealR * 0.36);
  ctx.restore();
  // Tagline ribbon above the footer.
  const ribbonH = Math.max(24, H * 0.042);
  const ribbonY = H - Math.max(30, H * 0.055) - ribbonH;
  const ribbonGrad = ctx.createLinearGradient(0, ribbonY, W, ribbonY);
  ribbonGrad.addColorStop(0, '#ff5e3a');
  ribbonGrad.addColorStop(0.5, '#ff2e88');
  ribbonGrad.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = ribbonGrad;
  ctx.fillRect(0, ribbonY, W, ribbonH);
  const ribbonSize = Math.max(11, ribbonH * 0.52);
  ctx.font = `400 ${ribbonSize}px Anton`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(brief.tagline, W / 2, ribbonY + ribbonH / 2);
  // Credits footer with barcode.
  const footH = H - ribbonY - ribbonH;
  ctx.fillStyle = 'rgba(8, 3, 16, 0.88)';
  ctx.fillRect(0, ribbonY + ribbonH, W, footH);
  const credSize = Math.max(9, footH * 0.34);
  ctx.font = `700 ${credSize}px "Arial Narrow", sans-serif`;
  ctx.fillStyle = '#cfc4e8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(brief.credits, W * 0.02, ribbonY + ribbonH + footH / 2, W * 0.62);
  // Deterministic barcode from the title's hash.
  const rng = mulberry32(hashString(brief.title + brief.vol));
  let bx = W * 0.86;
  const barTop = ribbonY + ribbonH + footH * 0.2;
  const barH = footH * 0.6;
  ctx.fillStyle = '#ffffff';
  while (bx < W * 0.985) {
    const bw = 1 + Math.floor(rng() * 4) * (W / 1080);
    if (rng() > 0.4) ctx.fillRect(bx, barTop, Math.max(1.5, bw), barH);
    bx += Math.max(2.5, bw) + (W / 1080);
  }
  // Thin poster frame.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

/**
 * Renders a cover brief onto a fresh canvas of W x H.
 * brief: { title, subtitle, layout, panels, grade, palette, quote, tagline, vol, credits }
 * look: { grain 0..1, halftone 0..1, glow 0..1, grade 0..1 }
 */
export function renderCover(brief, look, images, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const seed = hashString(`${brief.title}|${brief.layout}|${W}x${H}`);
  const rng = mulberry32(seed);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(brief.layout, brief.panels.length, W, H);
  rects.forEach((rect, i) => {
    paintPanel(ctx, rect, brief.panels[i], images, mulberry32(seed + i * 7919), brief.palette);
  });
  applyGrade(ctx, W, H, brief.grade, look);
  applyTexture(ctx, W, H, look, seed);
  drawChromeTitle(ctx, W, H, brief.title, brief.subtitle, look);
  drawFurniture(ctx, W, H, brief);
  // Labels last: every panel label stays fully legible, never crushed behind
  // the title, the ribbon or the footer.
  const headerH = Math.max(30, H * 0.05);
  rects.forEach((rect, i) => drawLabelChip(ctx, rect, brief.panels[i], headerH, H));
  return canvas;
}

/** Small layout thumbnail: coloured blocks in the layout's arrangement. */
export function drawLayoutThumb(canvas, layoutId, palette) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(layoutId, 6, W, H);
  const cols = ['#ff7a59', '#ffc46b', '#ff4d8d', '#a55eea', '#4d7cfe', '#2ec4b6'];
  rects.forEach((r, i) => {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(r.x, r.y, r.w, r.h);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}
