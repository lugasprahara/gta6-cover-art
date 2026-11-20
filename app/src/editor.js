// The Chrome Coast studio: wires the page — art library, sample covers, layout and grade pickers,
// the per-panel editor, look sliders, undo/redo and PNG export — around the cover renderer.

import { ART_LIBRARY, artById, loadImage } from './library.js';
import { SCENES, MOODS } from './scenes.js';
import { GRADES } from './grades.js';
import { LAYOUTS, layoutById, panelAt } from './layouts.js';
import { PRESETS, SIZES, History, initialState, stateFromPreset } from './state.js';
import { renderCover } from './render.js';

const $ = (id) => document.getElementById(id);

export async function bootEditor(options = {}) {
  const canvas = $('stage');
  const status = $('status');
  const assets = new Map();
  let uploadCount = 0;

  let state = options.presetId
    ? stateFromPreset(PRESETS.find((p) => p.id === options.presetId) ?? PRESETS[0])
    : initialState();
  const history = new History(state);
  let selected = 0;
  let rafPending = false;

  // ---------- rendering ----------
  function render() {
    const size = SIZES.find((s) => s.id === state.sizeId) ?? SIZES[0];
    renderCover(canvas, state, assets, size.w, size.h);
  }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(); });
  }

  function commit() {
    history.push(state);
    syncHistoryButtons();
    scheduleRender();
  }

  // ---------- control sync ----------
  function syncHistoryButtons() {
    $('btnUndo').disabled = !history.canUndo;
    $('btnRedo').disabled = !history.canRedo;
  }

  function syncTextInputs() {
    $('inTitle').value = state.title;
    $('inSubtitle').value = state.subtitle;
    $('inQuote').value = state.quote;
    $('inTagline').value = state.tagline;
    $('inVol').value = state.vol;
    $('selSize').value = state.sizeId;
  }

  function syncPickers() {
    document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('is-on', b.dataset.layout === state.layoutId));
    document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('is-on', b.dataset.grade === state.gradeId));
    document.querySelectorAll('#presetRow button').forEach((b) => b.classList.toggle('is-on', b.dataset.preset === state.presetId));
  }

  function panelCount() {
    return layoutById(state.layoutId).panels(100, 100).length;
  }

  function syncPanelEditor() {
    const tabs = $('panelTabs');
    tabs.innerHTML = '';
    for (let i = 0; i < panelCount(); i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Panel ${i + 1}`;
      b.classList.toggle('is-on', i === selected);
      b.addEventListener('click', () => { selected = i; syncPanelEditor(); });
      tabs.appendChild(b);
    }
    const p = state.panels[selected];
    if (!p) return;
    $('selArt').value = p.artId;
    $('inLabel').value = p.label;
    $('rgZoom').value = p.zoom;
    $('rgPanX').value = p.panX;
    $('rgPanY').value = p.panY;
    $('vZoom').textContent = `${Math.round(p.zoom * 100)}%`;
    $('vPanX').textContent = p.panX.toFixed(2);
    $('vPanY').textContent = p.panY.toFixed(2);
  }

  function syncLook() {
    $('rgGrade').value = state.look.grade;
    $('rgGrain').value = state.look.grain;
    $('rgHalftone').value = state.look.halftone;
    $('rgGlow').value = state.look.glow;
    $('vGrade').textContent = `${Math.round(state.look.grade * 100)}%`;
    $('vGrain').textContent = `${Math.round(state.look.grain * 100)}%`;
    $('vHalftone').textContent = `${Math.round(state.look.halftone * 100)}%`;
    $('vGlow').textContent = `${Math.round(state.look.glow * 100)}%`;
  }

  function syncAll() {
    syncTextInputs();
    syncPickers();
    syncPanelEditor();
    syncLook();
    syncHistoryButtons();
  }

  // ---------- builders for the pickers ----------
  function thumbCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function buildArtLibrary() {
    const lib = $('artLib');
    lib.innerHTML = '';
    for (const entry of ART_LIBRARY) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.art = entry.id;
      const c = thumbCanvas(120, 90);
      const ctx = c.getContext('2d');
      if (entry.kind === 'scene') {
        SCENES[entry.scene].paint(ctx, 120, 90, MOODS.sunset);
      } else {
        const img = entry.kind === 'crop' ? assets.get(entry.photo) : assets.get(entry.id);
        if (img) {
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (entry.kind === 'crop') {
            sx = entry.rect.x * sw; sy = entry.rect.y * sh;
            sw = entry.rect.w * sw; sh = entry.rect.h * sh;
          }
          const scale = Math.max(120 / sw, 90 / sh);
          ctx.drawImage(img, sx, sy, sw, sh, (120 - sw * scale) / 2, (90 - sh * scale) / 2, sw * scale, sh * scale);
        }
      }
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.textContent = entry.name;
      b.append(c, cap);
      b.title = `Put “${entry.name}” in panel ${selected + 1}`;
      b.addEventListener('click', () => {
        state.panels[selected].artId = entry.id;
        commit();
        syncPanelEditor();
      });
      lib.appendChild(b);
    }
  }

  function buildLayouts() {
    const row = $('layoutRow');
    row.innerHTML = '';
    for (const [id, layout] of Object.entries(LAYOUTS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.layout = id;
      const c = thumbCanvas(120, 120);
      const ctx = c.getContext('2d');
      const panels = layout.panels(120, 120);
      panels.forEach((p, i) => {
        ctx.fillStyle = ['#ff8c42', '#3fd9c0', '#ff5e7a', '#ffd76e', '#8be9ff', '#c792ff'][i % 6];
        ctx.beginPath();
        if (p.poly) {
          ctx.moveTo(p.poly[0][0], p.poly[0][1]);
          for (let k = 1; k < p.poly.length; k++) ctx.lineTo(p.poly[k][0], p.poly[k][1]);
          ctx.closePath();
        } else {
          ctx.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
        }
        ctx.fill();
      });
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.textContent = layout.name;
      b.append(c, cap);
      b.addEventListener('click', () => {
        state.layoutId = id;
        selected = Math.min(selected, layout.panels(100, 100).length - 1);
        commit();
        syncPickers();
        syncPanelEditor();
      });
      row.appendChild(b);
    }
  }

  function buildGrades() {
    const row = $('gradeRow');
    row.innerHTML = '';
    for (const [id, grade] of Object.entries(GRADES)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.grade = id;
      const rgb = (a) => `rgb(${a[0]}, ${a[1]}, ${a[2]})`;
      b.style.background = `linear-gradient(90deg, ${rgb(grade.shadows)}, ${rgb(grade.mids)}, ${rgb(grade.highlights)})`;
      b.textContent = grade.name;
      b.addEventListener('click', () => { state.gradeId = id; commit(); syncPickers(); });
      row.appendChild(b);
    }
  }

  function buildPresets() {
    const row = $('presetRow');
    row.innerHTML = '';
    for (const preset of PRESETS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.preset = preset.id;
      const c = thumbCanvas(264, 264);
      renderCover(c, stateFromPreset(preset), assets, 264, 264);
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.textContent = preset.name;
      b.append(c, cap);
      b.addEventListener('click', () => {
        state = stateFromPreset(preset);
        selected = 0;
        commit();
        syncAll();
      });
      row.appendChild(b);
    }
  }

  function buildArtSelect() {
    const sel = $('selArt');
    sel.innerHTML = '';
    for (const entry of ART_LIBRARY) {
      const o = document.createElement('option');
      o.value = entry.id;
      o.textContent = entry.name;
      sel.appendChild(o);
    }
  }

  // ---------- events ----------
  function bindText(id, apply) {
    $(id).addEventListener('input', (e) => { apply(e.target.value); scheduleRender(); });
    $(id).addEventListener('change', commit);
  }
  bindText('inTitle', (v) => { state.title = v; });
  bindText('inSubtitle', (v) => { state.subtitle = v; });
  bindText('inQuote', (v) => { state.quote = v; });
  bindText('inTagline', (v) => { state.tagline = v; });
  bindText('inVol', (v) => { state.vol = v; });
  bindText('inLabel', (v) => { state.panels[selected].label = v; });

  $('selArt').addEventListener('change', (e) => {
    state.panels[selected].artId = e.target.value;
    commit();
  });
  $('selSize').addEventListener('change', (e) => { state.sizeId = e.target.value; commit(); });

  function bindSlider(id, out, apply, format) {
    $(id).addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      apply(v);
      $(out).textContent = format(v);
      scheduleRender();
    });
    $(id).addEventListener('change', commit);
  }
  const pct = (v) => `${Math.round(v * 100)}%`;
  bindSlider('rgZoom', 'vZoom', (v) => { state.panels[selected].zoom = v; }, pct);
  bindSlider('rgPanX', 'vPanX', (v) => { state.panels[selected].panX = v; }, (v) => v.toFixed(2));
  bindSlider('rgPanY', 'vPanY', (v) => { state.panels[selected].panY = v; }, (v) => v.toFixed(2));
  bindSlider('rgGrade', 'vGrade', (v) => { state.look.grade = v; }, pct);
  bindSlider('rgGrain', 'vGrain', (v) => { state.look.grain = v; }, pct);
  bindSlider('rgHalftone', 'vHalftone', (v) => { state.look.halftone = v; }, pct);
  bindSlider('rgGlow', 'vGlow', (v) => { state.look.glow = v; }, pct);

  $('btnUndo').addEventListener('click', () => {
    const prev = history.undo();
    if (prev) { state = prev; selected = Math.min(selected, panelCount() - 1); syncAll(); scheduleRender(); }
  });
  $('btnRedo').addEventListener('click', () => {
    const next = history.redo();
    if (next) { state = next; selected = Math.min(selected, panelCount() - 1); syncAll(); scheduleRender(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) $('btnRedo').click(); else $('btnUndo').click();
    }
  });

  document.querySelectorAll('.step').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.step').forEach((x) => x.classList.toggle('is-on', x === b));
      const target = { photos: 'sec-photos', design: 'sec-design', export: 'sec-export' }[b.dataset.step];
      if (target) $(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Canvas: click selects a panel; dragging repositions that panel's art.
  let drag = null;
  const canvasPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const pos = canvasPos(e);
    const idx = panelAt(layoutById(state.layoutId), canvas.width, canvas.height, pos.x, pos.y);
    if (idx < 0) return;
    selected = idx;
    syncPanelEditor();
    const p = layoutById(state.layoutId).panels(canvas.width, canvas.height)[idx];
    drag = { x: e.clientX, y: e.clientY, panX: state.panels[idx].panX, panY: state.panels[idx].panY, w: p.w, h: p.h, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = ((e.clientX - drag.x) / canvas.getBoundingClientRect().width) * canvas.width;
    const dy = ((e.clientY - drag.y) / canvas.getBoundingClientRect().height) * canvas.height;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    state.panels[selected].panX = Math.max(-1, Math.min(1, drag.panX + (dx / drag.w) * 1.6));
    state.panels[selected].panY = Math.max(-1, Math.min(1, drag.panY + (dy / drag.h) * 1.6));
    $('rgPanX').value = state.panels[selected].panX;
    $('rgPanY').value = state.panels[selected].panY;
    scheduleRender();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) commit();
    drag = null;
  });

  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    uploadCount += 1;
    const id = `upload-${uploadCount}`;
    assets.set(id, img);
    const o = document.createElement('option');
    o.value = id;
    o.textContent = `Your photo ${uploadCount}`;
    $('selArt').appendChild(o);
    state.panels[selected].artId = id;
    status.textContent = `Photo added to panel ${selected + 1}.`;
    commit();
    syncPanelEditor();
  });

  function exportPng(size) {
    const off = document.createElement('canvas');
    renderCover(off, state, assets, size.w, size.h);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `chrome-coast-${(state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${size.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status.textContent = `Saved ${a.download}`;
    }, 'image/png');
  }

  $('btnExport').addEventListener('click', () => {
    exportPng(SIZES.find((s) => s.id === state.sizeId) ?? SIZES[0]);
  });
  $('btnExportAll').addEventListener('click', () => {
    SIZES.forEach((size, i) => setTimeout(() => exportPng(size), i * 350));
  });

  // ---------- boot ----------
  for (const entry of ART_LIBRARY) {
    if (entry.kind === 'photo') assets.set(entry.id, await loadImage(entry.src));
  }
  await Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('40px Pacifico'),
    document.fonts.ready,
  ]);
  buildArtSelect();
  buildArtLibrary();
  buildLayouts();
  buildGrades();
  buildPresets();
  syncAll();
  render();
}
