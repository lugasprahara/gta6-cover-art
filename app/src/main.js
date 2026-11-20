// Golden Hour Studio — wires the editor: the photo/scene pool, preset and
// layout pickers (with visual thumbnails), grade + look sliders, the
// per-panel editor (art source, label, drag, zoom), undo/redo and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { LAYOUTS, EXPORT_SIZES, layoutPanels, renderCover, exportCover } from './cover.js';
import { GRADES } from './grades.js';
import { DETAIL_CROPS, SCENES, renderSceneCanvas } from './scenes.js';
import { PRESETS, blankState, stateFromPreset, sourceCatalogue } from './presets.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const statusEl = $('status');

const state = blankState();
/** Loaded photos: [{ name, key, img }]; panels reference sources by key. */
const photos = [];
/** Pre-rendered scene canvases, keyed by scene id. */
const sceneCanvases = {};
let selectedPanel = 0;

// --- Sources -----------------------------------------------------------------
/** Builds the source map the cover engine draws from: key -> {kind, image, crop}. */
function buildSources() {
  const sources = {};
  photos.forEach((p, i) => { sources[`photo:${i}`] = { kind: 'photo', image: p.img, crop: null }; });
  for (const [key, crop] of Object.entries(DETAIL_CROPS)) {
    const idx = photos.findIndex((p) => p.key === crop.photo);
    if (idx >= 0) sources[key] = { kind: 'crop', image: photos[idx].img, crop: crop.box };
  }
  for (const key of Object.keys(SCENES)) {
    if (!sceneCanvases[key]) sceneCanvases[key] = renderSceneCanvas(key, 720, 720);
    sources[key] = { kind: 'scene', image: sceneCanvases[key], crop: null };
  }
  return sources;
}
let sources = {};

// --- Undo / redo -------------------------------------------------------------
const undoStack = [];
const redoStack = [];
function snapshot() { return JSON.stringify(state); }
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function restore(json) {
  const next = JSON.parse(json);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  syncControls();
  renderPreview();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
}
function syncUndoButtons() {
  $('undoBtn').disabled = !undoStack.length;
  $('redoBtn').disabled = !redoStack.length;
}

// --- Photos ------------------------------------------------------------------
/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamplePhotos() {
  const samples = [
    ['Boulevard', 'boulevard', 'samples/boulevard.jpg'],
    ['Pier', 'pier', 'samples/pier.jpg'],
  ];
  for (const [name, key, url] of samples) {
    try {
      photos.push({ name, key, img: await loadImage(url) });
    } catch {
      // A missing sample just leaves its panels empty; the app still works.
    }
  }
}

/** A small thumbnail canvas for a crop or scene pool entry. */
function poolThumb(sourceKey) {
  const thumb = document.createElement('canvas');
  thumb.width = 60; thumb.height = 60;
  thumb.className = 'photo-thumb';
  const tctx = thumb.getContext('2d');
  const src = sources[sourceKey];
  if (!src) return thumb;
  const img = src.image;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const box = src.crop || [0, 0, 1, 1];
  tctx.drawImage(img, iw * box[0], ih * box[1], iw * box[2], ih * box[3], 0, 0, 60, 60);
  return thumb;
}

function buildPhotoPool() {
  const list = $('photoList');
  list.innerHTML = '';
  const addLabel = (text) => {
    const el = document.createElement('span');
    el.className = 'pool-label';
    el.textContent = text;
    list.appendChild(el);
  };
  const addThumb = (node, key, name) => {
    node.title = `${name} — click to put it in the selected panel`;
    if (state.panels[selectedPanel]?.source === key) node.classList.add('active');
    node.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].source = key;
      buildPhotoPool();
      buildPanelTray();
      renderPreview();
    });
    list.appendChild(node);
  };
  addLabel('Photos');
  photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'photo-thumb';
    thumb.src = p.img.src;
    thumb.alt = p.name;
    addThumb(thumb, `photo:${i}`, p.name);
  });
  addLabel('Detail crops');
  for (const [key, crop] of Object.entries(DETAIL_CROPS)) addThumb(poolThumb(key), key, crop.name);
  addLabel('Painted scenes');
  for (const [key, scene] of Object.entries(SCENES)) addThumb(poolThumb(key), key, scene.name);
}

// --- Panel tray --------------------------------------------------------------
function visibleSlots() {
  return layoutPanels(state.layout, 100, 100).map((r) => r.slot);
}

function buildPanelTray() {
  const tray = $('panelTray');
  tray.innerHTML = '';
  const catalogue = sourceCatalogue(photos.map((p) => p.name));
  for (const slot of visibleSlots()) {
    const chip = document.createElement('div');
    chip.className = 'panel-chip' + (slot === selectedPanel ? ' selected' : '');
    const label = document.createElement('span');
    label.textContent = `Panel ${slot + 1}`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Art for panel ${slot + 1}`);
    for (const entry of catalogue) {
      const opt = document.createElement('option');
      opt.value = entry.key;
      opt.textContent = entry.name;
      select.appendChild(opt);
    }
    select.value = state.panels[slot].source;
    select.addEventListener('change', () => {
      pushHistory();
      state.panels[slot].source = select.value;
      selectedPanel = slot;
      buildPhotoPool();
      buildPanelTray();
      syncPanelEditor();
      renderPreview();
    });
    chip.addEventListener('click', (e) => {
      if (e.target === select) return;
      selectedPanel = slot;
      buildPanelTray();
      buildPhotoPool();
      syncPanelEditor();
    });
    chip.append(label, select);
    tray.appendChild(chip);
  }
}

// --- Layout thumbnails ---------------------------------------------------------
/** Draws a miniature of a layout's panel shapes onto a small canvas. */
function drawLayoutThumbnail(cv, layout) {
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);
  const hues = ['#ff7a1a', '#ff2e88', '#ffc93c', '#19b5a6', '#7ce7ff', '#b832ff', '#ff5d3c'];
  for (const p of layoutPanels(layout, w, h)) {
    ctx.beginPath();
    if (p.poly) {
      p.poly.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
    } else {
      ctx.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    }
    ctx.fillStyle = hues[p.slot % hues.length];
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function buildLayoutPicker() {
  const picker = $('layoutPicker');
  picker.innerHTML = '';
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-thumb' + (state.layout === key ? ' picked' : '');
    btn.dataset.layout = key;
    const cv = document.createElement('canvas');
    cv.width = 132; cv.height = 96;
    drawLayoutThumbnail(cv, key);
    const cap = document.createElement('span');
    cap.textContent = layout.name;
    btn.append(cv, cap);
    btn.addEventListener('click', () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      if (!visibleSlots().includes(selectedPanel)) selectedPanel = visibleSlots()[0];
      syncControls();
      renderPreview();
    });
    picker.appendChild(btn);
  }
}

function buildPresetPicker() {
  const picker = $('presetPicker');
  picker.innerHTML = '';
  PRESETS.forEach((preset, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      pushHistory();
      const fresh = stateFromPreset(preset);
      Object.keys(state).forEach((k) => delete state[k]);
      Object.assign(state, fresh);
      selectedPanel = 0;
      syncControls();
      renderPreview();
      statusEl.textContent = `Preset loaded: ${preset.name}. Make it yours, then export.`;
    });
    picker.appendChild(btn);
  });
}

// --- Rendering ---------------------------------------------------------------
function setPreviewSize(w, h) {
  const scale = 900 / Math.max(w, h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
}

let renderQueued = false;
function renderPreview() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderCover(canvas, state, sources);
  });
}

// --- Controls ----------------------------------------------------------------
const TEXT_FIELDS = [
  ['titleInput', 'title'], ['subtitleInput', 'subtitle'], ['captionInput', 'caption'],
  ['quoteInput', 'quote'], ['taglineInput', 'tagline'], ['creditsInput', 'credits'],
  ['editionInput', 'edition'], ['sealInput', 'seal'],
];
const LOOK_SLIDERS = [
  ['gradeStrengthSlider', 'gradeStrength'], ['grainSlider', 'grain'],
  ['halftoneSlider', 'halftone'], ['glowSlider', 'glow'],
];

function syncPanelEditor() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  $('panelLabelInput').value = panel.label ?? '';
  $('zoomSlider').value = String(Math.round((panel.zoom ?? 1) * 100));
  $('panXSlider').value = String(Math.round((panel.ox ?? 0) * 100));
  $('panYSlider').value = String(Math.round((panel.oy ?? 0) * 100));
}

function syncControls() {
  document.querySelectorAll('#gradePicker button').forEach((b) =>
    b.classList.toggle('picked', b.dataset.grade === state.grade));
  for (const [id, key] of TEXT_FIELDS) $(id).value = state[key];
  for (const [id, key] of LOOK_SLIDERS) $(id).value = String(Math.round((state[key] ?? 0) * 100));
  document.querySelectorAll('#heatStars button').forEach((b) =>
    b.classList.toggle('lit', Number(b.dataset.heat) <= state.heat));
  buildLayoutPicker();
  buildPanelTray();
  buildPhotoPool();
  syncPanelEditor();
}

function bindControls() {
  buildPresetPicker();
  $('gradePicker').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn || btn.dataset.grade === state.grade) return;
    pushHistory();
    state.grade = btn.dataset.grade;
    syncControls();
    renderPreview();
  });
  for (const [id, key] of TEXT_FIELDS) {
    $(id).addEventListener('focus', () => pushHistory());
    $(id).addEventListener('input', () => { state[key] = $(id).value; renderPreview(); });
  }
  for (const [id, key] of LOOK_SLIDERS) {
    $(id).addEventListener('change', () => pushHistory());
    $(id).addEventListener('input', () => {
      state[key] = Number($(id).value) / 100;
      renderPreview();
    });
  }
  $('heatStars').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-heat]');
    if (!btn) return;
    pushHistory();
    state.heat = Number(btn.dataset.heat);
    syncControls();
    renderPreview();
  });
  $('panelLabelInput').addEventListener('focus', () => pushHistory());
  $('panelLabelInput').addEventListener('input', () => {
    state.panels[selectedPanel].label = $('panelLabelInput').value;
    renderPreview();
  });
  $('zoomSlider').addEventListener('input', () => {
    state.panels[selectedPanel].zoom = Number($('zoomSlider').value) / 100;
    renderPreview();
  });
  $('panXSlider').addEventListener('input', () => {
    state.panels[selectedPanel].ox = Number($('panXSlider').value) / 100;
    renderPreview();
  });
  $('panYSlider').addEventListener('input', () => {
    state.panels[selectedPanel].oy = Number($('panYSlider').value) / 100;
    renderPreview();
  });
  for (const id of ['zoomSlider', 'panXSlider', 'panYSlider']) {
    $(id).addEventListener('change', pushHistory);
  }
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  $('shuffleBtn').addEventListener('click', () => {
    pushHistory();
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    const fresh = stateFromPreset(preset);
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    state.layout = Object.keys(LAYOUTS)[Math.floor(Math.random() * Object.keys(LAYOUTS).length)];
    state.grade = Object.keys(GRADES)[Math.floor(Math.random() * Object.keys(GRADES).length)];
    if (!visibleSlots().includes(selectedPanel)) selectedPanel = visibleSlots()[0];
    syncControls();
    renderPreview();
  });
  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      try {
        const img = await loadImage(URL.createObjectURL(file));
        photos.push({ name: file.name.replace(/\.[^.]+$/, ''), key: `user${photos.length}`, img });
      } catch { /* unreadable file: skip it */ }
    }
    e.target.value = '';
    if (files.length) {
      pushHistory();
      sources = buildSources();
      state.panels[selectedPanel].source = `photo:${photos.length - 1}`;
      buildPhotoPool();
      buildPanelTray();
      renderPreview();
      statusEl.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added — click a thumbnail to place it in a panel.`;
    }
  });
}

// --- Canvas interaction: click to select a panel, drag to pan, scroll to zoom --
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
function pointInPanel(x, y, p) {
  if (p.poly) {
    let inside = false;
    for (let i = 0, j = p.poly.length - 1; i < p.poly.length; j = i++) {
      const [xi, yi] = p.poly[i];
      const [xj, yj] = p.poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
}
function panelAt(x, y) {
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  for (const p of panels) if (pointInPanel(x, y, p)) return p.slot;
  return null;
}
function bindCanvas() {
  let dragging = false;
  let last = null;
  let dragPushed = false;
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const slot = panelAt(p.x, p.y);
    if (slot == null) return;
    selectedPanel = slot;
    buildPanelTray();
    buildPhotoPool();
    syncPanelEditor();
    dragging = true;
    dragPushed = false;
    last = p;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const p = canvasPoint(e);
    const panel = state.panels[selectedPanel];
    const rect = layoutPanels(state.layout, canvas.width, canvas.height).find((r) => r.slot === selectedPanel);
    if (!rect) return;
    if (!dragPushed) { pushHistory(); dragPushed = true; }
    panel.ox = Math.max(-1, Math.min(1, (panel.ox ?? 0) + ((p.x - last.x) / rect.w) * 2));
    panel.oy = Math.max(-1, Math.min(1, (panel.oy ?? 0) + ((p.y - last.y) / rect.h) * 2));
    last = p;
    syncPanelEditor();
    renderPreview();
  });
  const endDrag = () => { dragging = false; last = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    const p = canvasPoint(e);
    const slot = panelAt(p.x, p.y);
    if (slot == null) return;
    e.preventDefault();
    const panel = state.panels[slot];
    panel.zoom = Math.max(1, Math.min(3, (panel.zoom ?? 1) * (1 - e.deltaY * 0.001)));
    if (slot === selectedPanel) syncPanelEditor();
    renderPreview();
  }, { passive: false });
}

// --- Export ------------------------------------------------------------------
function downloadCanvas(coverCanvas, w, h) {
  return new Promise((resolve) => {
    coverCanvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `golden-hour-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}
async function exportSize(key) {
  const [w, h] = EXPORT_SIZES[key];
  setPreviewSize(w, h);
  renderPreview();
  const coverCanvas = exportCover(state, sources, w, h);
  await downloadCanvas(coverCanvas, w, h);
  statusEl.textContent = `Saved golden-hour-cover-${w}x${h}.png`;
}
function bindExport() {
  document.querySelectorAll('.export-btn').forEach((btn) => {
    btn.addEventListener('click', () => exportSize(btn.dataset.size));
  });
  $('exportAllBtn').addEventListener('click', async () => {
    statusEl.textContent = 'Exporting all four sizes…';
    for (const key of Object.keys(EXPORT_SIZES)) {
      await exportSize(key);
      await new Promise((r) => setTimeout(r, 250));
    }
    statusEl.textContent = 'Saved all four sizes.';
  });
}

// --- Boot --------------------------------------------------------------------
async function boot() {
  setPreviewSize(1080, 1080);
  bindControls();
  bindCanvas();
  bindExport();
  syncUndoButtons();
  await loadSamplePhotos();
  sources = buildSources();
  const fresh = stateFromPreset(PRESETS[0]);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh);
  await document.fonts.ready;
  syncControls();
  renderPreview();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, {
      state,
      setPreviewSize,
      setExactSize(w, h) { canvas.width = w; canvas.height = h; },
      renderPreview,
      syncControls,
    });
  }
}

boot();
