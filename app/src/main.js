// Vice Coast Cover Lab — wires the editor: photos, layout/grade pickers, lettering,
// panel tray, drag-to-pan and scroll-to-zoom on the preview, undo/redo, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { LAYOUTS, EXPORT_SIZES, layoutRects, renderCover, exportCover } from './cover.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const statusEl = $('status');

/** The whole editable cover, serialised for undo/redo. */
function defaultState() {
  return {
    layout: 'nine',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'vice coast nights',
    caption: 'Boulevard Queen',
    badge: 'LAUNCH WEEK',
    heat: 4,
    grain: true,
    vignette: true,
    halftone: false,
    panels: Array.from({ length: 8 }, (_, i) => ({ photo: i % 2, zoom: 1, ox: 0, oy: 0.5 })),
  };
}

const state = defaultState();
/** Loaded photos: [{ name, img }]; panels reference them by index. */
const photos = [];
let selectedPanel = 0;
let previewSize = [1080, 1080];

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
    ['Boulevard', 'samples/boulevard.jpg'],
    ['Pier', 'samples/pier.jpg'],
  ];
  for (const [name, url] of samples) {
    try {
      photos.push({ name, img: await loadImage(url) });
    } catch {
      // A missing sample just leaves that slot empty; the app still works.
    }
  }
}

function photoImages() { return photos.map((p) => p.img); }

function buildPhotoList() {
  const list = $('photoList');
  list.innerHTML = '';
  photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'photo-thumb' + (state.panels[selectedPanel]?.photo === i ? ' active' : '');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = `${p.name} — click to put it in the selected panel`;
    thumb.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].photo = i;
      buildPhotoList();
      buildPanelTray();
      renderPreview();
    });
    list.appendChild(thumb);
  });
}

// --- Panel tray --------------------------------------------------------------
function visibleSlots() {
  return layoutRects(state.layout, 100, 100).photos.map((r) => r.slot);
}

function buildPanelTray() {
  const tray = $('panelTray');
  tray.innerHTML = '';
  for (const slot of visibleSlots()) {
    const chip = document.createElement('div');
    chip.className = 'panel-chip' + (slot === selectedPanel ? ' selected' : '');
    const label = document.createElement('span');
    label.textContent = `Panel ${slot + 1}`;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${slot + 1}`);
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— empty —';
    select.appendChild(none);
    photos.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = p.name;
      select.appendChild(opt);
    });
    const current = state.panels[slot].photo;
    select.value = current == null ? '' : String(current);
    select.addEventListener('change', () => {
      pushHistory();
      state.panels[slot].photo = select.value === '' ? null : Number(select.value);
      buildPhotoList();
      renderPreview();
    });
    chip.addEventListener('click', (e) => {
      if (e.target === select) return;
      selectedPanel = slot;
      buildPanelTray();
      buildPhotoList();
      syncSliders();
    });
    chip.append(label, select);
    tray.appendChild(chip);
  }
}

// --- Rendering ---------------------------------------------------------------
function setPreviewSize(w, h) {
  previewSize = [w, h];
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
    renderCover(canvas, state, photoImages());
  });
}

// --- Controls ----------------------------------------------------------------
function syncControls() {
  document.querySelectorAll('#layoutPicker button').forEach((b) =>
    b.classList.toggle('picked', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradePicker button').forEach((b) =>
    b.classList.toggle('picked', b.dataset.grade === state.grade));
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('captionInput').value = state.caption;
  $('badgeInput').value = state.badge;
  document.querySelectorAll('#heatStars button').forEach((b) =>
    b.classList.toggle('lit', Number(b.dataset.heat) <= state.heat));
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  $('halftoneToggle').checked = state.halftone;
  buildPanelTray();
  buildPhotoList();
  syncSliders();
}

function syncSliders() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  $('zoomSlider').value = String(Math.round((panel.zoom ?? 1) * 100));
  $('panXSlider').value = String(Math.round((panel.ox ?? 0) * 100));
  $('panYSlider').value = String(Math.round((panel.oy ?? 0) * 100));
}

function bindControls() {
  $('layoutPicker').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-layout]');
    if (!btn || btn.dataset.layout === state.layout) return;
    pushHistory();
    state.layout = btn.dataset.layout;
    if (!visibleSlots().includes(selectedPanel)) selectedPanel = visibleSlots()[0];
    syncControls();
    renderPreview();
  });
  $('gradePicker').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn || btn.dataset.grade === state.grade) return;
    pushHistory();
    state.grade = btn.dataset.grade;
    syncControls();
    renderPreview();
  });
  const textInputs = [['titleInput', 'title'], ['subtitleInput', 'subtitle'], ['captionInput', 'caption'], ['badgeInput', 'badge']];
  for (const [id, key] of textInputs) {
    $(id).addEventListener('focus', () => pushHistory());
    $(id).addEventListener('input', () => { state[key] = $(id).value; renderPreview(); });
  }
  $('heatStars').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-heat]');
    if (!btn) return;
    pushHistory();
    state.heat = Number(btn.dataset.heat);
    syncControls();
    renderPreview();
  });
  for (const [id, key] of [['grainToggle', 'grain'], ['vignetteToggle', 'vignette'], ['halftoneToggle', 'halftone']]) {
    $(id).addEventListener('change', () => {
      pushHistory();
      state[key] = $(id).checked;
      renderPreview();
    });
  }
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
    const layouts = Object.keys(LAYOUTS);
    const grades = Object.keys(GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    state.heat = 3 + Math.floor(Math.random() * 3);
    const titles = ['NEON SHORE', 'PIER PRESSURE', 'NIGHT SHIFT', 'BOULEVARD KINGS', 'SUNSET STRIP'];
    state.title = titles[Math.floor(Math.random() * titles.length)];
    state.panels.forEach((p) => {
      p.photo = photos.length ? Math.floor(Math.random() * photos.length) : null;
      p.zoom = 1 + Math.random() * 0.6;
      p.ox = (Math.random() - 0.5) * 0.8;
      p.oy = (Math.random() - 0.5) * 0.8;
    });
    if (!visibleSlots().includes(selectedPanel)) selectedPanel = visibleSlots()[0];
    syncControls();
    renderPreview();
  });
  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      try {
        const img = await loadImage(URL.createObjectURL(file));
        photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
      } catch { /* unreadable file: skip it */ }
    }
    e.target.value = '';
    if (files.length) {
      pushHistory();
      state.panels[selectedPanel].photo = photos.length - 1;
      buildPhotoList();
      buildPanelTray();
      renderPreview();
      statusEl.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added — click a thumbnail to place it.`;
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
function panelAt(x, y) {
  const geo = layoutRects(state.layout, canvas.width, canvas.height);
  for (const r of geo.photos) {
    // Hit-test against the unrotated box (rotation is small, a few degrees).
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.slot;
  }
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
    buildPhotoList();
    syncSliders();
    dragging = true;
    dragPushed = false;
    last = p;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const p = canvasPoint(e);
    const panel = state.panels[selectedPanel];
    const geo = layoutRects(state.layout, canvas.width, canvas.height);
    const rect = geo.photos.find((r) => r.slot === selectedPanel);
    if (!rect) return;
    if (!dragPushed) { pushHistory(); dragPushed = true; }
    panel.ox = Math.max(-1, Math.min(1, (panel.ox ?? 0) + ((p.x - last.x) / rect.w) * 2));
    panel.oy = Math.max(-1, Math.min(1, (panel.oy ?? 0) + ((p.y - last.y) / rect.h) * 2));
    last = p;
    syncSliders();
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
    if (slot === selectedPanel) syncSliders();
    renderPreview();
  }, { passive: false });
}

// --- Export ------------------------------------------------------------------
function downloadCanvas(coverCanvas, w, h) {
  return new Promise((resolve) => {
    coverCanvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-coast-cover-${w}x${h}.png`;
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
  const coverCanvas = exportCover(state, photoImages(), w, h);
  await downloadCanvas(coverCanvas, w, h);
  statusEl.textContent = `Saved vice-coast-cover-${w}x${h}.png`;
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
  await document.fonts.ready;
  syncControls();
  renderPreview();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, {
      state,
      photos,
      setPreviewSize,
      setExactSize(w, h) { canvas.width = w; canvas.height = h; },
      renderPreview,
      syncControls,
    });
  }
}

boot();
