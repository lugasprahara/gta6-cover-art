// Golden Hour Studio — the cover engine.
// Full-bleed collages tile the whole canvas edge-to-edge (no empty backdrop
// behind floating photos), the display title is rendered OVER the collage in
// chrome-gradient Anton with a neon Pacifico subtitle, every panel can carry
// an editable label, and generated poster furniture (review quote + stars,
// starburst seal, tagline ribbon, credits + barcode footer, edition tag)
// frames the art. Everything is plain Canvas 2D and deterministic.
import { applyGradeToContext } from './grades.js';
import { mulberry32 } from './scenes.js';

/** Layout catalogue: slot count + display name for the thumbnail picker. */
export const LAYOUTS = {
  mosaic: { slots: 7, name: 'Hero mosaic' },
  diagonal: { slots: 5, name: 'Diagonal five' },
  gridSix: { slots: 6, name: 'Six grid' },
  heroThree: { slots: 4, name: 'Hero + three' },
  snapshots: { slots: 4, name: 'Tilted snapshots' },
  fullbleed: { slots: 1, name: 'Full-bleed hero' },
};

/** The four post sizes the app exports, in pixels. */
export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
  '1080x1920': [1080, 1920],
};

const rectPanel = (slot, x, y, w, h) => ({ slot, x, y, w, h, poly: null, angle: 0 });
const polyPanel = (slot, pts) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { slot, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, poly: pts, angle: 0 };
};

/**
 * Panel geometry for a layout at W x H. Panels tile the full canvas; the
 * poster chrome (header, title, footer) is drawn over them afterwards.
 */
export function layoutPanels(layout, w, h) {
  if (layout === 'mosaic') {
    // One dominant hero panel + six satellites of mixed sizes.
    const hx = w * 0.52;
    return [
      rectPanel(0, 0, 0, hx, h),
      rectPanel(1, hx, 0, w - hx, h * 0.38),
      rectPanel(2, hx, h * 0.38, (w - hx) / 2, h * 0.34),
      rectPanel(3, hx + (w - hx) / 2, h * 0.38, (w - hx) / 2, h * 0.34),
      rectPanel(4, hx, h * 0.72, (w - hx) / 3, h * 0.28),
      rectPanel(5, hx + (w - hx) / 3, h * 0.72, (w - hx) / 3, h * 0.28),
      rectPanel(6, hx + ((w - hx) / 3) * 2, h * 0.72, (w - hx) / 3, h * 0.28),
    ];
  }
  if (layout === 'diagonal') {
    // Five vertical bands split by slanted dividers.
    const slant = h * 0.14;
    const panels = [];
    const band = w / 5;
    for (let i = 0; i < 5; i++) {
      const x0 = i * band, x1 = (i + 1) * band;
      const topL = i === 0 ? 0 : x0 + slant * 0.5;
      const topR = i === 4 ? w : x1 + slant * 0.5;
      const botL = i === 0 ? 0 : x0 - slant * 0.5;
      const botR = i === 4 ? w : x1 - slant * 0.5;
      panels.push(polyPanel(i, [[topL, 0], [topR, 0], [botR, h], [botL, h]]));
    }
    return panels;
  }
  if (layout === 'gridSix') {
    const panels = [];
    const cw = w / 3, ch = h / 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) panels.push(rectPanel(r * 3 + c, c * cw, r * ch, cw, ch));
    return panels;
  }
  if (layout === 'heroThree') {
    const heroH = h * 0.64;
    const panels = [rectPanel(0, 0, 0, w, heroH)];
    const cw = w / 3;
    for (let i = 0; i < 3; i++) panels.push(rectPanel(1 + i, i * cw, heroH, cw, h - heroH));
    return panels;
  }
  if (layout === 'snapshots') {
    // Tilted polaroid cards; the backdrop is painted art, not empty gradient.
    const cw = Math.min(w * 0.42, h * 0.34);
    const ch = cw * 1.18;
    const cx = w / 2, cy = h * 0.46;
    const sx = w * 0.235, sy = h * 0.185;
    return [
      { slot: 0, x: cx - sx - cw / 2, y: cy - sy - ch / 2, w: cw, h: ch, poly: null, angle: -0.09 },
      { slot: 1, x: cx + sx - cw / 2, y: cy - sy - ch / 2, w: cw, h: ch, poly: null, angle: 0.08 },
      { slot: 2, x: cx - sx - cw / 2, y: cy + sy - ch / 2, w: cw, h: ch, poly: null, angle: 0.06 },
      { slot: 3, x: cx + sx - cw / 2, y: cy + sy - ch / 2, w: cw, h: ch, poly: null, angle: -0.07 },
    ];
  }
  return [rectPanel(0, 0, 0, w, h)]; // fullbleed
}

/** Fits `text` in Anton capitals inside maxWidth, shrinking from startSize. */
export function fitAnton(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/**
 * Draws one panel's source into an offscreen canvas at the panel's box size:
 * cover-fit with the panel's zoom/pan (and fractional crop window when the
 * source is a detail crop), then the cinematic grade. Scenes are graded
 * gently so painted art keeps its own palette.
 */
function renderPanelCanvas(panel, source, gradeName, gradeStrength) {
  const tw = Math.max(2, Math.round(panel.w));
  const th = Math.max(2, Math.round(panel.h));
  const tmp = document.createElement('canvas');
  tmp.width = tw; tmp.height = th;
  const tctx = tmp.getContext('2d');
  const img = source.image;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  // Source window: the whole image, or the crop's fractional box inside it.
  const box = source.crop || [0, 0, 1, 1];
  const sw = iw * box[2], sh = ih * box[3];
  const sx = iw * box[0], sy = ih * box[1];
  const zoom = panel.zoom ?? 1;
  const base = Math.max(tw / sw, th / sh) * zoom;
  const pw = sw * base, ph = sh * base;
  const ox = (tw - pw) / 2 + (panel.ox ?? 0) * Math.max(0, (pw - tw) / 2);
  const oy = (th - ph) / 2 + (panel.oy ?? 0) * Math.max(0, (ph - th) / 2);
  tctx.drawImage(img, sx, sy, sw, sh, ox, oy, pw, ph);
  applyGradeToContext(tctx, tw, th, gradeName, source.kind === 'scene' ? gradeStrength * 0.35 : gradeStrength);
  return tmp;
}

/** Panel label: a dark story strip along the panel's foot with the label text. */
function drawPanelLabel(ctx, panel, text) {
  if (!text || !text.trim()) return;
  const label = text.trim().toUpperCase();
  const stripH = Math.max(16, Math.min(panel.h * 0.16, 44));
  if (panel.h < 60 || panel.w < 90) return;
  ctx.save();
  clipPanelPath(ctx, panel);
  const y0 = panel.y + panel.h - stripH;
  const grad = ctx.createLinearGradient(0, y0 - stripH * 0.6, 0, panel.y + panel.h);
  grad.addColorStop(0, 'rgba(10,4,20,0)');
  grad.addColorStop(0.45, 'rgba(10,4,20,0.72)');
  grad.addColorStop(1, 'rgba(10,4,20,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, y0 - stripH * 0.6, panel.w, stripH * 1.6);
  const size = Math.max(10, Math.min(stripH * 0.52, panel.w * 0.055));
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(panel.x + size * 0.7, y0 + stripH * 0.22, size * 0.28, stripH * 0.56);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 3;
  const maxW = panel.w - size * 1.6;
  let shown = label;
  while (ctx.measureText(shown).width > maxW && shown.length > 3) shown = shown.slice(0, -2);
  ctx.fillText(shown, panel.x + size * 1.3, y0 + stripH * 0.52);
  ctx.restore();
}

function clipPanelPath(ctx, panel) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
  } else if (panel.angle) {
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.angle);
    ctx.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  } else {
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
  }
  ctx.clip();
}

/** Draws one panel (photo/scene/crop or empty slot) with its frame and label. */
export function drawCoverPanel(ctx, panel, panelState, source, state) {
  ctx.save();
  if (panel.angle) {
    // Polaroid: white card slightly larger than the picture, soft shadow.
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.angle);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fdfdf8';
    const pad = Math.max(6, panel.w * 0.035);
    ctx.fillRect(-panel.w / 2 - pad, -panel.h / 2 - pad, panel.w + pad * 2, panel.h + pad * 2.6);
    ctx.shadowBlur = 0;
    ctx.translate(-panel.x - panel.w / 2, -panel.y - panel.h / 2);
  }
  if (source) {
    const tmp = renderPanelCanvas(panel, source, state.grade, state.gradeStrength ?? 1);
    ctx.save();
    clipPanelPath(ctx, panel);
    ctx.drawImage(tmp, panel.x, panel.y, panel.w, panel.h);
    ctx.restore();
  } else {
    ctx.save();
    clipPanelPath(ctx, panel);
    ctx.fillStyle = '#2a1440';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = '#c9aede';
    ctx.font = `${Math.max(13, panel.w * 0.06)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+ add art', panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.restore();
  }
  // Frame: thick ink edge following the panel shape.
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
  } else if (panel.angle) {
    // Already framed by the polaroid card.
  } else {
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
  }
  if (panel.poly || !panel.angle) {
    ctx.lineWidth = Math.max(3, Math.min(panel.w, panel.h) * 0.014);
    ctx.strokeStyle = '#12081f';
    ctx.stroke();
  }
  ctx.restore();
  if (!panel.angle) drawPanelLabel(ctx, panel, panelState?.label);
  else if (panelState?.label) {
    // Polaroid caption handwritten under the picture.
    ctx.save();
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.angle);
    ctx.font = `${Math.max(12, panel.w * 0.075)}px Pacifico, cursive`;
    ctx.fillStyle = '#2b1030';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(panelState.label, 0, panel.h / 2 + panel.w * 0.055);
    ctx.restore();
  }
}

/** Star row as text, e.g. ★★★★☆. */
export function starRow(heat) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < heat ? '★' : '☆';
  return s;
}

/** Header strip: review quote + star row on the left, edition tag on the right. */
export function drawReviewHeaderStrip(ctx, w, h, state) {
  const stripH = Math.max(30, h * 0.062);
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 20, 0.82)';
  ctx.fillRect(0, 0, w, stripH);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(0, stripH - 2, w, 2);
  const size = Math.max(12, stripH * 0.4);
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffc93c';
  ctx.textAlign = 'left';
  const stars = starRow(state.heat);
  ctx.fillText(stars, size * 0.8, stripH / 2 + 1);
  const starsW = ctx.measureText(stars).width;
  ctx.font = `italic 600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  const quote = `“${(state.quote || '').trim()}”`;
  if (state.quote) ctx.fillText(quote, size * 1.4 + starsW, stripH / 2 + 1);
  ctx.font = `700 ${size * 0.92}px Anton, sans-serif`;
  ctx.fillStyle = '#ff5da2';
  ctx.textAlign = 'right';
  ctx.fillText((state.edition || '').trim().toUpperCase(), w - size * 0.8, stripH / 2 + 1);
  ctx.restore();
  return stripH;
}

/** A spiky starburst seal with two lines of microcopy. */
export function drawStarburstSeal(ctx, cx, cy, radius, text, sub) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
  grad.addColorStop(0, '#ffe9a8');
  grad.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = radius * 0.25;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.strokeStyle = '#7a1e0e';
  ctx.stroke();
  ctx.fillStyle = '#5e1503';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = (text || '').trim().toUpperCase().split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  ctx.font = `${Math.max(9, radius * 0.3)}px Anton, sans-serif`;
  ctx.fillText(line1, 0, line2 ? -radius * 0.18 : 0);
  if (line2) ctx.fillText(line2, 0, radius * 0.16);
  if (sub) {
    ctx.font = `700 ${Math.max(8, radius * 0.2)}px system-ui, sans-serif`;
    ctx.fillText(sub, 0, radius * 0.44);
  }
  ctx.restore();
}

/** Deterministic barcode bars from a seed string. */
export function drawBarcode(ctx, x, y, w, h, seedText) {
  const rnd = mulberry32([...seedText].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 13));
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 3, w + 8, h + 6);
  ctx.fillStyle = '#111111';
  let cx = x;
  while (cx < x + w - 2) {
    const bw = 1 + Math.floor(rnd() * 4);
    if (rnd() > 0.42) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(rnd() * 2);
  }
  ctx.restore();
}

/** Footer strip: production credits microcopy + barcode. */
export function drawCreditsFooter(ctx, w, h, state) {
  const stripH = Math.max(26, h * 0.05);
  const y = h - stripH;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
  ctx.fillRect(0, y, w, stripH);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(0, y, w, 2);
  const size = Math.max(10, stripH * 0.36);
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((state.credits || '').trim().toUpperCase(), size * 0.8, y + stripH / 2 + 1);
  drawBarcode(ctx, w - Math.max(64, w * 0.075) - size * 0.8, y + stripH * 0.22, Math.max(64, w * 0.075), stripH * 0.52, state.credits || 'GHS');
  ctx.restore();
  return stripH;
}

/**
 * The display title OVER the collage: chrome/sunset gradient Anton with a
 * thick ink outline and drop shadow, neon script subtitle tucked beneath,
 * starburst seal at its shoulder and the tagline ribbon under everything.
 */
export function drawChromeTitleOverArt(ctx, w, h, state) {
  const title = (state.title || 'UNTITLED').trim().toUpperCase();
  const cx = w / 2;
  ctx.save();
  ctx.textAlign = 'center';
  // Soft scrim behind the title zone so lettering pops over busy panels.
  const zoneH = h * 0.3;
  const scrim = ctx.createLinearGradient(0, h - zoneH, 0, h);
  scrim.addColorStop(0, 'rgba(10,4,20,0)');
  scrim.addColorStop(0.55, 'rgba(10,4,20,0.42)');
  scrim.addColorStop(1, 'rgba(10,4,20,0.66)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - zoneH, w, zoneH);

  const startSize = Math.min(h * 0.17, w * 0.3);
  const size = fitAnton(ctx, title, w * 0.93, startSize);
  const titleY = h * 0.8;
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.07;
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = '#14081f';
  ctx.strokeText(title, cx, titleY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const grad = ctx.createLinearGradient(0, titleY - size * 0.55, 0, titleY + size * 0.55);
  grad.addColorStop(0, '#fff7ae');
  grad.addColorStop(0.32, '#ffc93c');
  grad.addColorStop(0.55, '#ff7a1a');
  grad.addColorStop(0.78, '#ff2e88');
  grad.addColorStop(1, '#b832ff');
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, titleY);
  // Chrome sheen: a thin white pass clipped to the top of the glyphs.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.rect(0, titleY - size * 0.55, w, size * 0.34);
  ctx.clip();
  ctx.fillText(title, cx, titleY);
  ctx.restore();

  ctx.restore();

  // Seal overlapping the title's top-right.
  const sealR = Math.max(34, Math.min(w, h) * 0.082);
  drawStarburstSeal(ctx, w - sealR * 1.25, titleY - size * 0.78, sealR, state.seal, '★ ★ ★');

  // Tagline ribbon pinned just above the footer.
  const ribbonH = Math.max(22, h * 0.036);
  const ribbonY = h - Math.max(26, h * 0.05) - ribbonH - 4;
  if ((state.tagline || '').trim()) {
    ctx.save();
    const rg = ctx.createLinearGradient(0, 0, w, 0);
    rg.addColorStop(0, '#ff2e88');
    rg.addColorStop(0.5, '#ff7a1a');
    rg.addColorStop(1, '#ffc93c');
    ctx.fillStyle = rg;
    ctx.fillRect(0, ribbonY, w, ribbonH);
    ctx.font = `${Math.max(11, ribbonH * 0.52)}px Anton, sans-serif`;
    ctx.fillStyle = '#1c0b33';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.tagline.trim().toUpperCase(), cx, ribbonY + ribbonH / 2 + 1);
    ctx.restore();
  }

  // Neon script subtitle drawn LAST, tucked over the title's lower edge and
  // the ribbon's top edge so it always stays readable.
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(14, size * 0.32);
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    const subW = ctx.measureText(subtitle).width;
    ctx.translate(Math.min(w - subW / 2 - 14, cx + w * 0.17), titleY + size * 0.58);
    ctx.rotate(-0.045);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff8fc0';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * (0.35 + (state.glow ?? 0.6) * 0.8);
    ctx.fillText(subtitle, 0, 0);
    ctx.restore();
  }
}

/** Deterministic film grain tile (seeded, so exports never shimmer). */
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 200; grainTile.height = 200;
  const gctx = grainTile.getContext('2d');
  const data = gctx.createImageData(200, 200);
  const rnd = mulberry32(20261120);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  gctx.putImageData(data, 0, 0);
  return grainTile;
}

/** Halftone dot tile used as a print-texture overlay. */
let halftoneTile = null;
function getHalftoneTile() {
  if (halftoneTile) return halftoneTile;
  halftoneTile = document.createElement('canvas');
  halftoneTile.width = 14; halftoneTile.height = 14;
  const hctx = halftoneTile.getContext('2d');
  hctx.fillStyle = '#000000';
  hctx.beginPath(); hctx.arc(3.5, 3.5, 1.7, 0, Math.PI * 2); hctx.fill();
  hctx.beginPath(); hctx.arc(10.5, 10.5, 1.7, 0, Math.PI * 2); hctx.fill();
  return halftoneTile;
}

/** Finishing passes: halftone print texture, film grain, vignette. */
export function applyFinishPasses(ctx, w, h, state) {
  if ((state.halftone ?? 0) > 0.01) {
    ctx.save();
    ctx.globalAlpha = state.halftone * 0.16;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getHalftoneTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if ((state.grain ?? 0) > 0.01) {
    ctx.save();
    ctx.globalAlpha = state.grain * 0.4;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,4,20,0.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders the whole cover onto `canvas` from `state`; `sources` maps a
 * panel's source key to { kind, image, crop } (built by the editor).
 */
export function renderCover(canvas, state, sources) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);
  if (state.layout === 'snapshots' && sources['scene-palms']) {
    // Painted palm backdrop behind the polaroids — still full-bleed art.
    const bg = document.createElement('canvas');
    bg.width = w; bg.height = h;
    const bctx = bg.getContext('2d');
    const img = sources['scene-palms'].image;
    bctx.drawImage(img, 0, 0, w, h);
    ctx.drawImage(bg, 0, 0);
    ctx.fillStyle = 'rgba(18,8,31,0.25)';
    ctx.fillRect(0, 0, w, h);
  }
  const panels = layoutPanels(state.layout, w, h);
  for (const panel of panels) {
    const panelState = state.panels[panel.slot];
    const source = panelState ? sources[panelState.source] : null;
    drawCoverPanel(ctx, panel, panelState, source, state);
  }
  applyFinishPasses(ctx, w, h, state);
  drawReviewHeaderStrip(ctx, w, h, state);
  drawChromeTitleOverArt(ctx, w, h, state);
  drawCreditsFooter(ctx, w, h, state);
}

/** Renders a fresh cover canvas at W x H and returns it (PNG export). */
export function exportCover(state, sources, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  renderCover(canvas, state, sources);
  return canvas;
}
