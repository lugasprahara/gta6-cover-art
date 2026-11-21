// Fixed scenes for screenshots: ?shot=cover shows one exported cover alone at the
// export size; ?shot=editor shows the full editor with a preset loaded and a photo in.
// window.__shotReady is set once the paint has landed, so the capture script knows
// the frame is real, not mid-paint.

import { presetById, layoutById, EXPORT_SIZES } from './presets.js';
import { loadPhotos } from './library.js';
import { renderCover, ensureFonts } from './render.js';
import { initEditor, briefFromState } from './editor.js';

export async function runShot(shot, query) {
  const preset = presetById(query.get('preset') ?? 'chrome-coast');
  if (shot === 'cover') {
    await ensureFonts();
    const images = await loadPhotos();
    const sizeId = query.get('size') ?? '1920x1080';
    const size = EXPORT_SIZES.find((s) => s.id === sizeId) ?? EXPORT_SIZES[2];
    const brief = {
      title: preset.title, subtitle: preset.subtitle, layout: preset.layout,
      panels: preset.pool.slice(0, layoutById(preset.layout).panels),
      grade: preset.grade, palette: preset.palette, quote: preset.quote,
      tagline: preset.tagline, vol: preset.vol, credits: preset.credits,
    };
    document.body.classList.add('shot-cover');
    const stage = document.getElementById('stage');
    stage.width = size.w;
    stage.height = size.h;
    const cover = renderCover(brief, { grain: 0.7, halftone: 0.5, glow: 0.5, grade: 1 }, images, size.w, size.h);
    stage.getContext('2d').drawImage(cover, 0, 0);
    document.getElementById('size-label').textContent = `${size.label} · exported cover`;
  } else {
    await initEditor(preset.id);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export { briefFromState };
