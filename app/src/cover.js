// Vice Coast Cover Lab — the cover engine. Draws every layout, grade and title block
// onto a canvas at any export size, with only the 2D canvas API and vendored fonts.
import { GRADES, gradeColorAt } from './grades.js';

/** Layout catalogue: how many photo panels each layout fills. */
export const LAYOUTS = {
  nine: { slots: 8, name: 'Nine-panel grid' },
  hero: { slots: 4, name: 'Hero + three' },
  fullbleed: { slots: 1, name: 'Full-bleed' },
  snapshots: { slots: 4, name: 'Tilted snapshots' },
};

/** The four post sizes the app exports, in pixels. */
export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
  '1080x1920': [1080, 1920],
};

const GUTTER = (w, h) => Math.max(6, Math.round(Math.min(w, h) * 0.008));

/**
 * Panel geometry for a layout at W x H. Returns { photos: [{slot, x, y, w, h, angle}],
 * title: {x, y, w, h} | null, backdrop: 'grid' | 'plain' | 'sunset' }.
 */
export function layoutRects(layout, w, h) {
  const g = GUTTER(w, h);
  if (layout === 'nine') {
    const cw = (w - g * 4) / 3;
    const ch = (h - g * 4) / 3;
    const cell = (col, row) => ({ x: g + col * (cw + g), y: g + row * (ch + g), w: cw, h: ch });
    const photos = [];
    let slot = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row === 2 && col === 1) continue; // the title block takes the bottom-centre cell
        photos.push({ slot: slot++, ...cell(col, row), angle: 0 });
      }
    }
    return { photos, title: cell(1, 2), backdrop: 'grid' };
  }
  if (layout === 'hero') {
    const stripH = Math.round(h * 0.24);
    const top = h - stripH;
    const heroW = Math.round((w - g * 3) * 0.62);
    const sideW = w - g * 3 - heroW;
    const sideH = (top - g * 4) / 3;
    return {
      photos: [
        { slot: 0, x: g, y: g, w: heroW, h: top - g * 2, angle: 0 },
        { slot: 1, x: g * 2 + heroW, y: g, w: sideW, h: sideH, angle: 0 },
        { slot: 2, x: g * 2 + heroW, y: g * 2 + sideH, w: sideW, h: sideH, angle: 0 },
        { slot: 3, x: g * 2 + heroW, y: g * 3 + sideH * 2, w: sideW, h: sideH, angle: 0 },
      ],
      title: { x: 0, y: top, w, h: stripH },
      backdrop: 'grid',
    };
  }
  if (layout === 'fullbleed') {
    const stripH = Math.round(h * 0.26);
    return {
      photos: [{ slot: 0, x: 0, y: 0, w, h, angle: 0 }],
      title: { x: 0, y: h - stripH, w, h: stripH },
      backdrop: 'plain',
    };
  }
  // snapshots: tilted polaroid cards over a sunset backdrop, title across the top.
  const titleH = Math.round(h * 0.2);
  const areaH = h - titleH;
  const cw = Math.min(w * 0.44, areaH * 0.42);
  const ch = cw * 1.22;
  const cx = w / 2;
  const cy = titleH + areaH / 2;
  const spread = w * 0.24;
  const drop = areaH * 0.16;
  return {
    photos: [
      { slot: 0, x: cx - spread - cw / 2, y: cy - drop - ch / 2, w: cw, h: ch, angle: -0.1 },
      { slot: 1, x: cx + spread - cw / 2, y: cy - drop - ch / 2, w: cw, h: ch, angle: 0.09 },
      { slot: 2, x: cx - spread - cw / 2, y: cy + drop - ch / 2, w: cw, h: ch, angle: 0.07 },
      { slot: 3, x: cx + spread - cw / 2, y: cy + drop - ch / 2, w: cw, h: ch, angle: -0.08 },
    ],
    title: { x: 0, y: 0, w, h: titleH },
    backdrop: 'sunset',
  };
}

/** Fits `text` in Anton capitals inside maxWidth, shrinking from startSize. Returns the size. */
export function fitAnton(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Maps one panel photo through the grade ramp, honouring zoom and pan. */
export function drawGradedPhoto(ctx, img, rect, panel, gradeName) {
  const grade = GRADES[gradeName];
  const tmp = document.createElement('canvas');
  const tw = Math.max(2, Math.round(rect.w));
  const th = Math.max(2, Math.round(rect.h));
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext('2d');
  // Cover-fit the photo into the panel, zoomed and panned by the panel's settings.
  const zoom = panel.zoom ?? 1;
  const base = Math.max(tw / img.naturalWidth, th / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  // Pan spans the full overflow: ox/oy of +/-1 shows the photo's far edge.
  const ox = (tw - pw) / 2 + (panel.ox ?? 0) * Math.max(0, (pw - tw) / 2);
  const oy = (th - ph) / 2 + (panel.oy ?? 0) * Math.max(0, (ph - th) / 2);
  tctx.drawImage(img, ox, oy, pw, ph);
  // Gradient-map the pixels: luminance -> grade ramp, mixed with the original.
  const data = tctx.getImageData(0, 0, tw, th);
  const px = data.data;
  const mix = grade.mix;
  const posterize = grade.posterize;
  for (let i = 0; i < px.length; i += 4) {
    let lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    if (posterize) lum = Math.round(lum * 4) / 4;
    const [r, g, b] = gradeColorAt(gradeName, lum);
    px[i] = px[i] * (1 - mix) + r * mix;
    px[i + 1] = px[i + 1] * (1 - mix) + g * mix;
    px[i + 2] = px[i + 2] * (1 - mix) + b * mix;
  }
  tctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(rect.angle ?? 0);
  ctx.drawImage(tmp, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
  // Inked poster frame: thick black edge, thin white inner line.
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.strokeStyle = '#12081f';
  ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.lineWidth = Math.max(1, rect.w * 0.003);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  const inset = Math.max(4, rect.w * 0.014);
  ctx.strokeRect(-rect.w / 2 + inset, -rect.h / 2 + inset, rect.w - inset * 2, rect.h - inset * 2);
  ctx.restore();
}

/** Draws an empty panel slot (no photo assigned yet). */
export function drawEmptyPanel(ctx, rect) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(rect.angle ?? 0);
  ctx.fillStyle = '#2a1440';
  ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  ctx.strokeStyle = '#5b3a75';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.strokeRect(-rect.w / 2 + 4, -rect.h / 2 + 4, rect.w - 8, rect.h - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = '#c9aede';
  ctx.font = `${Math.max(14, rect.w * 0.07)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+ add a photo', 0, 0);
  ctx.restore();
}

/** A pre-rendered film-grain tile, made once and reused for every cover. */
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 220;
  grainTile.height = 220;
  const gctx = grainTile.getContext('2d');
  const data = gctx.createImageData(220, 220);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 42;
  }
  gctx.putImageData(data, 0, 0);
  return grainTile;
}

/** A pre-rendered halftone dot tile for title blocks. */
let halftoneTile = null;
function getHalftoneTile() {
  if (halftoneTile) return halftoneTile;
  halftoneTile = document.createElement('canvas');
  halftoneTile.width = 48;
  halftoneTile.height = 48;
  const hctx = halftoneTile.getContext('2d');
  hctx.fillStyle = 'rgba(255, 201, 60, 0.16)';
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      hctx.beginPath();
      hctx.arc(6 + x * 12, 6 + y * 12, 1.2 + ((x + y) % 3) * 0.9, 0, Math.PI * 2);
      hctx.fill();
    }
  }
  return halftoneTile;
}

/**
 * The title block: sunset-gradient Anton title, neon Pacifico subtitle, caption,
 * star heat meter and badge ribbon, centred in `rect`.
 */
export function drawTitleBlock(ctx, rect, state) {
  const { x, y, w, h } = rect;
  ctx.save();
  // Backdrop: deep violet, halftone dots when asked, sunset wash along the top edge.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(x, y, w, h);
  if (state.halftone) {
    ctx.fillStyle = ctx.createPattern(getHalftoneTile(), 'repeat');
    ctx.fillRect(x, y, w, h);
  }
  const wash = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  wash.addColorStop(0, 'rgba(255, 122, 26, 0.28)');
  wash.addColorStop(1, 'rgba(255, 122, 26, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);

  const title = (state.title || 'NEON SHORE').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const caption = (state.caption || '').trim();
  const cx = x + w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title: Anton capitals filled with a sunset gradient.
  const titleSize = fitAnton(ctx, title, w * 0.92, Math.min(h * 0.42, w * 0.24));
  const grad = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
  grad.addColorStop(0, '#ffc93c');
  grad.addColorStop(0.5, '#ff7a1a');
  grad.addColorStop(1, '#ff2e88');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = titleSize * 0.12;
  ctx.shadowOffsetY = titleSize * 0.04;
  const titleY = y + h * 0.3;
  ctx.fillText(title, cx, titleY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Script subtitle in neon pink, glowing.
  if (subtitle) {
    const subSize = Math.max(12, Math.min(h * 0.16, titleSize * 0.42));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ff5da2';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(subtitle, cx, y + h * 0.56);
    ctx.shadowBlur = 0;
  }

  // Caption in small white capitals.
  if (caption) {
    const capSize = Math.max(11, Math.min(h * 0.11, w * 0.045));
    ctx.font = `700 ${capSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption.toUpperCase(), cx, y + h * 0.74);
  }

  // Star heat meter + badge ribbon along the foot.
  const starSize = Math.max(12, Math.min(h * 0.13, w * 0.06));
  const footY = y + h * 0.9;
  ctx.font = `${starSize}px system-ui, sans-serif`;
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < state.heat ? '★' : '☆';
  const starsW = ctx.measureText(stars).width;
  const badge = (state.badge || '').trim().toUpperCase();
  let badgeW = 0;
  let badgeFont = '';
  if (badge) {
    const badgeSize = Math.max(10, starSize * 0.62);
    badgeFont = `700 ${badgeSize}px system-ui, sans-serif`;
    ctx.font = badgeFont;
    badgeW = ctx.measureText(badge).width + badgeSize * 1.6;
  }
  const gap = w * 0.03;
  const totalW = starsW + (badge ? gap + badgeW : 0);
  let drawX = cx - totalW / 2;
  ctx.font = `${starSize}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffc93c';
  ctx.shadowColor = 'rgba(255, 201, 60, 0.7)';
  ctx.shadowBlur = starSize * 0.25;
  ctx.fillText(stars, drawX + starsW / 2, footY);
  ctx.shadowBlur = 0;
  if (badge) {
    const bx = drawX + starsW + gap;
    const bh = starSize * 1.15;
    const by = footY - bh / 2;
    const pill = ctx.createLinearGradient(bx, by, bx + badgeW, by);
    pill.addColorStop(0, '#ffc93c');
    pill.addColorStop(1, '#ff2e88');
    ctx.fillStyle = pill;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, bh, bh / 2);
    ctx.fill();
    ctx.font = badgeFont;
    ctx.fillStyle = '#160a24';
    ctx.fillText(badge, bx + badgeW / 2, footY);
  }
  ctx.restore();
}

/** Paints the sunset backdrop used by the snapshots layout. */
export function drawSunsetBackdrop(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b0f4d');
  sky.addColorStop(0.45, '#a3236b');
  sky.addColorStop(0.75, '#ff7a1a');
  sky.addColorStop(1, '#ffc93c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Low sun.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.42, Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders the whole cover onto `canvas` (at its own width/height) from `state`
 * and the loaded `photos` (array of images, indexed by panel.photo).
 */
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const geo = layoutRects(state.layout, w, h);

  // Backdrop.
  if (geo.backdrop === 'sunset') drawSunsetBackdrop(ctx, w, h);
  else {
    ctx.fillStyle = '#12081f';
    ctx.fillRect(0, 0, w, h);
  }

  // Photos, then the title block on top.
  for (const rect of geo.photos) {
    const panel = state.panels[rect.slot];
    const img = panel && panel.photo != null ? photos[panel.photo] : null;
    if (img) drawGradedPhoto(ctx, img, rect, panel, state.grade);
    else drawEmptyPanel(ctx, rect);
  }
  if (geo.title) drawTitleBlock(ctx, geo.title, state);

  // Full-bleed scrim so the title stays readable over the photo.
  if (state.layout === 'fullbleed' && geo.title) {
    // (title block already painted its own dark backdrop; nothing more needed)
  }

  // Finish: grain and vignette over everything.
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10, 4, 20, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Renders a fresh cover canvas at W x H and returns it (used for PNG export). */
export function exportCover(state, photos, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, state, photos);
  return canvas;
}
