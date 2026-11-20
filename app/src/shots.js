// Screenshot scenes for Chrome Coast, driven by render-shots.mjs over CDP.
//   ?shot=cover&preset=<id>&size=<W>x<H>  — the exported cover alone, edge to edge
//   ?shot=editor&preset=<id>              — the full studio with that cover loaded
// Either way the page sets window.__shotReady once the cover is really painted.

import { ART_LIBRARY, loadImage } from './library.js';
import { PRESETS, stateFromPreset, SIZES } from './state.js';
import { renderCover } from './render.js';
import { bootEditor } from './editor.js';

async function loadAssets() {
  const assets = new Map();
  for (const entry of ART_LIBRARY) {
    if (entry.kind === 'photo') assets.set(entry.id, await loadImage(entry.src));
  }
  return assets;
}

async function loadFonts() {
  await Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('40px Pacifico'),
    document.fonts.ready,
  ]);
}

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Runs the requested screenshot scene. Returns true when a shot param was present. */
export async function runShotIfRequested(params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const preset = PRESETS.find((p) => p.id === params.get('preset')) ?? PRESETS[0];

  if (shot === 'editor') {
    await bootEditor({ presetId: preset.id });
    ready();
    return true;
  }

  // Cover-only: hide the studio, size the canvas to the export, fit it to the viewport.
  document.body.classList.add('shot-cover');
  const sizeParam = params.get('size') ?? '1080x1080';
  const size = SIZES.find((s) => s.id === sizeParam) ?? SIZES[0];
  const doc = stateFromPreset(preset);
  const assets = await loadAssets();
  await loadFonts();
  const canvas = document.getElementById('stage');
  renderCover(canvas, doc, assets, size.w, size.h);
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  ready();
  return true;
}
