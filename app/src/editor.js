// Chrome Coast editor — wires the 3-step workflow: pick a preset (photos + caption),
// tune the layout, panels and look, then export PNGs. The preview is always a real
// render of the current brief at the chosen export size.

import { PRESETS, LAYOUTS, EXPORT_SIZES, presetById, layoutById } from './presets.js';
import { loadPhotos, CROPS, PHOTOS } from './library.js';
import { SCENES, mulberry32 } from './scenes.js';
import { renderCover, layoutRects, drawLayoutThumb, ensureFonts } from './render.js';

const $ = (sel) => document.querySelector(sel);

export function briefFromState(state) {
  const preset = presetById(state.presetId);
  const layout = layoutById(state.layoutId);
  return {
    title: state.title,
    subtitle: state.subtitle,
    layout: layout.id,
    panels: state.panels.slice(0, layout.panels),
    grade: preset.grade,
    palette: preset.palette,
    quote: preset.quote,
    tagline: preset.tagline,
    vol: preset.vol,
    credits: preset.credits,
  };
}

function stateFromPreset(preset) {
  return {
    presetId: preset.id,
    layoutId: preset.layout,
    title: preset.title,
    subtitle: preset.subtitle,
    panels: preset.pool.map((p) => ({ ...p })),
    look: { grain: 0.7, halftone: 0.5, glow: 0.5, grade: 1 },
    sizeId: '1080x1080',
    selected: 0,
  };
}

function download(canvas, name) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

export async function initEditor(initialPresetId) {
  await ensureFonts();
  const images = await loadPhotos();
  let state = stateFromPreset(presetById(initialPresetId ?? 'chrome-coast'));
  let renderQueued = false;

  const stage = $('#stage');
  const status = $('#status');

  function currentSize() {
    return EXPORT_SIZES.find((s) => s.id === state.sizeId) ?? EXPORT_SIZES[0];
  }

  function renderPreview() {
    const size = currentSize();
    const cover = renderCover(briefFromState(state), state.look, images, size.w, size.h);
    stage.width = size.w;
    stage.height = size.h;
    const ctx = stage.getContext('2d');
    ctx.drawImage(cover, 0, 0);
    const layout = layoutById(state.layoutId);
    $('#size-label').textContent = `${size.label} · ${layout.panels} panels`;
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderPreview();
    });
  }

  function renderPresetThumbs() {
    document.querySelectorAll('.preset-card').forEach((card) => {
      const preset = presetById(card.dataset.preset);
      const canvas = card.querySelector('canvas');
      const brief = {
        title: preset.title, subtitle: preset.subtitle, layout: preset.layout,
        panels: preset.pool.slice(0, layoutById(preset.layout).panels),
        grade: preset.grade, palette: preset.palette, quote: preset.quote,
        tagline: preset.tagline, vol: preset.vol, credits: preset.credits,
      };
      const thumb = renderCover(brief, { grain: 0.6, halftone: 0.4, glow: 0.4, grade: 1 }, images, 360, 270);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(thumb, 0, 0, canvas.width, canvas.height);
    });
  }

  function renderLayoutThumbs() {
    document.querySelectorAll('.layout-btn').forEach((btn) => {
      const preset = presetById(state.presetId);
      drawLayoutThumb(btn.querySelector('canvas'), btn.dataset.layout, preset.palette);
    });
  }

  function renderPool() {
    const pool = $('#pool');
    pool.innerHTML = '';
    const addThumb = (src, label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pool-item';
      btn.title = label;
      const c = document.createElement('canvas');
      c.width = 96; c.height = 72;
      const ctx = c.getContext('2d');
      if (src.startsWith('scene:')) {
        const painter = SCENES[src.slice(6)];
        painter(ctx, 0, 0, 96, 72, mulberry32(42), presetById(state.presetId).palette);
      } else if (src.startsWith('crop:')) {
        const crop = CROPS[src.slice(5)];
        const img = images[crop.photo];
        const sx = img.naturalWidth * crop.rect.x;
        const sy = img.naturalHeight * crop.rect.y;
        const sw = img.naturalWidth * crop.rect.w;
        const sh = img.naturalHeight * crop.rect.h;
        const scale = Math.max(96 / sw, 72 / sh);
        ctx.drawImage(img, sx, sy, sw, sh, (96 - sw * scale) / 2, (72 - sh * scale) / 2, sw * scale, sh * scale);
      } else {
        const img = images[src];
        const scale = Math.max(96 / img.naturalWidth, 72 / img.naturalHeight);
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
          (96 - img.naturalWidth * scale) / 2, (72 - img.naturalHeight * scale) / 2,
          img.naturalWidth * scale, img.naturalHeight * scale);
      }
      btn.appendChild(c);
      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);
      btn.addEventListener('click', () => {
        state.panels[state.selected] = { ...state.panels[state.selected], src };
        renderPanelList();
        queueRender();
      });
      pool.appendChild(btn);
    };
    Object.keys(PHOTOS).forEach((key) => addThumb(key, PHOTOS[key].label));
    Object.keys(CROPS).forEach((key) => addThumb(`crop:${key}`, `Crop · ${key.split(':')[1]}`));
    Object.keys(SCENES).forEach((key) => addThumb(`scene:${key}`, `Scene · ${key}`));
  }

  function renderPanelList() {
    const list = $('#panel-list');
    list.innerHTML = '';
    state.panels.forEach((panel, i) => {
      const row = document.createElement('div');
      row.className = `panel-row${i === state.selected ? ' selected' : ''}`;
      row.innerHTML = `<strong>${i + 1}. ${panel.src}</strong>`;
      const label = document.createElement('input');
      label.type = 'text';
      label.value = panel.label;
      label.maxLength = 24;
      label.setAttribute('aria-label', `Panel ${i + 1} label`);
      label.addEventListener('input', () => { panel.label = label.value.toUpperCase(); queueRender(); });
      const sub = document.createElement('input');
      sub.type = 'text';
      sub.value = panel.sub;
      sub.maxLength = 40;
      sub.setAttribute('aria-label', `Panel ${i + 1} caption`);
      sub.addEventListener('input', () => { panel.sub = sub.value.toUpperCase(); queueRender(); });
      row.appendChild(label);
      row.appendChild(sub);
      row.addEventListener('click', (e) => {
        if (e.target === row || e.target.tagName === 'STRONG') {
          state.selected = i;
          renderPanelList();
        }
      });
      list.appendChild(row);
    });
  }

  // Preset cards.
  const presetWrap = $('#presets');
  PRESETS.forEach((preset) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preset-card';
    card.dataset.preset = preset.id;
    card.innerHTML = `<canvas width="360" height="270"></canvas><span>${preset.name}</span>`;
    card.addEventListener('click', () => {
      const look = state.look;
      const sizeId = state.sizeId;
      state = stateFromPreset(preset);
      state.look = look;
      state.sizeId = sizeId;
      document.querySelectorAll('.preset-card').forEach((c) => c.classList.toggle('active', c === card));
      syncControls();
      renderPanelList();
      renderLayoutThumbs();
      queueRender();
    });
    presetWrap.appendChild(card);
  });

  // Layout buttons.
  const layoutWrap = $('#layouts');
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = layout.id;
    btn.innerHTML = `<canvas width="120" height="80"></canvas><span>${layout.name}</span>`;
    btn.addEventListener('click', () => {
      state.layoutId = layout.id;
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b === btn));
      queueRender();
    });
    layoutWrap.appendChild(btn);
  });

  // Export size buttons.
  const sizeWrap = $('#sizes');
  EXPORT_SIZES.forEach((size) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn';
    btn.dataset.size = size.id;
    btn.textContent = size.label;
    btn.addEventListener('click', () => {
      state.sizeId = size.id;
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b === btn));
      queueRender();
    });
    sizeWrap.appendChild(btn);
  });

  function syncControls() {
    $('#title').value = state.title.replace('\n', ' / ');
    $('#subtitle').value = state.subtitle;
    document.querySelectorAll('.preset-card').forEach((c) => c.classList.toggle('active', c.dataset.preset === state.presetId));
    document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layoutId));
    document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === state.sizeId));
    for (const [key, el] of [['grain', '#grain'], ['halftone', '#halftone'], ['glow', '#glow'], ['grade', '#grade']]) {
      $(el).value = String(Math.round(state.look[key] * 100));
    }
  }

  $('#title').addEventListener('input', (e) => {
    const words = e.target.value.toUpperCase().split(/\s+/).filter(Boolean);
    const half = Math.ceil(words.length / 2);
    state.title = `${words.slice(0, half).join(' ')}\n${words.slice(half).join(' ')}`.trim();
    queueRender();
  });
  $('#subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; queueRender(); });
  for (const key of ['grain', 'halftone', 'glow', 'grade']) {
    $(`#${key}`).addEventListener('input', (e) => {
      state.look[key] = Number(e.target.value) / 100;
      queueRender();
    });
  }

  $('#export').addEventListener('click', async () => {
    const size = currentSize();
    const cover = renderCover(briefFromState(state), state.look, images, size.w, size.h);
    await download(cover, `chrome-coast-${size.id}.png`);
    status.textContent = `Saved chrome-coast-${size.id}.png`;
  });
  $('#export-all').addEventListener('click', async () => {
    for (const size of EXPORT_SIZES) {
      const cover = renderCover(briefFromState(state), state.look, images, size.w, size.h);
      await download(cover, `chrome-coast-${size.id}.png`);
    }
    status.textContent = 'Saved all 4 PNG sizes.';
  });

  stage.addEventListener('click', (e) => {
    const rect = stage.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * stage.width;
    const py = ((e.clientY - rect.top) / rect.height) * stage.height;
    const size = currentSize();
    const rects = layoutRects(state.layoutId, state.panels.length, size.w, size.h);
    const hit = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    if (hit >= 0) {
      state.selected = hit;
      renderPanelList();
    }
  });

  syncControls();
  renderPresetThumbs();
  renderLayoutThumbs();
  renderPool();
  renderPanelList();
  renderPreview();
  window.__shotReady = true;
  return { state, images, renderPreview };
}
