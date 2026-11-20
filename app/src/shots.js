// Golden Hour Studio — fixed scenes for screenshots.
// ?shot=cover shows one exported cover full-frame; ?shot=editor shows the
// studio with a preset loaded. `preset` picks one of the four built-in
// presets (0-3); `size` sets the cover canvas size for a cover scene.
// window.__shotReady is set once the scene has painted.
import { stateFromPreset, PRESETS } from './presets.js';

export async function runShot(shot, query, ctx) {
  const presetIndex = Math.max(0, Math.min(PRESETS.length - 1, Number(query.get('preset') ?? 0) || 0));
  const fresh = stateFromPreset(PRESETS[presetIndex]);
  for (const key of Object.keys(fresh)) ctx.state[key] = fresh[key];
  if (query.get('title')) ctx.state.title = query.get('title');
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = query.get('size') ?? '1920x1080';
    const [w, h] = size.split('x').map(Number);
    if (w > 0 && h > 0) ctx.setExactSize(w, h);
  }
  ctx.syncControls();
  await document.fonts.ready;
  ctx.renderPreview();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
