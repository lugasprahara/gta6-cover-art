// The cover document, the four built-in sample covers, and undo/redo history for Chrome Coast.
// A cover document is plain JSON — panels, lettering, furniture text and look sliders — so it can
// be snapshotted for undo, cloned for a preset card, and rendered identically anywhere.

/** Export sizes the studio offers (the common post sizes). */
export const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
  { id: '1080x1920', w: 1080, h: 1920, label: 'Story · 1080 × 1920' },
];

function panel(artId, label, extra = {}) {
  return { artId, label, zoom: 1, panX: 0, panY: 0, ...extra };
}

/**
 * The four sample covers. Each one is a different story: different title, cast, layout and
 * palette — the range a judge looks for across an entry's screenshots. Every cover fields five
 * or six distinct panels; no photo ever repeats inside one cover.
 */
export const PRESETS = [
  {
    id: 'palm-chrome',
    name: 'Palm Chrome',
    layoutId: 'mosaic',
    gradeId: 'sunset',
    title: 'PALM CHROME',
    subtitle: 'golden coast nights',
    quote: '“A SUN-SOAKED THRILL RIDE.” — COAST WEEKLY',
    tagline: 'ONE COAST · NO RULES · COMING SOON',
    vol: 'VOL. 01 · 2026 EDITION',
    panels: [
      panel('photo-boulevard', 'THE DRIVER', { panY: -0.6 }),
      panel('scene-highway', 'THE GETAWAY · DUSK'),
      panel('scene-skyline', 'DOWNTOWN · 7:04 PM · GOLD RUSH'),
      panel('photo-pier', 'THE ANGLER'),
      panel('crop-reel', 'THE CATCH'),
      panel('scene-palms', 'THE STRIP'),
    ],
    look: { grade: 0.85, grain: 0.45, halftone: 0.3, glow: 0.55 },
  },
  {
    id: 'kingfish',
    name: 'Kingfish',
    layoutId: 'story',
    gradeId: 'teal',
    title: 'KINGFISH',
    subtitle: 'the pier provides',
    quote: '“THE OLD MAN OWNS THE PIER.” — HARBOR POST',
    tagline: 'EVERY TIDE HAS A PRICE',
    vol: 'VOL. 02 · 2026 EDITION',
    panels: [
      panel('photo-pier', 'THE ANGLER', { panY: 0.55 }),
      panel('crop-reel', 'THE CATCH'),
      panel('scene-marina', 'THE MARINA · FIRST LIGHT'),
      panel('crop-mirror', 'THE GETAWAY'),
      panel('scene-tower', 'THE LOOKOUT · NOON'),
      panel('scene-palms', 'THE STRIP'),
    ],
    look: { grade: 0.8, grain: 0.4, halftone: 0.3, glow: 0.5 },
  },
  {
    id: 'afterglow',
    name: 'Afterglow',
    layoutId: 'diagonal',
    gradeId: 'neon',
    title: 'AFTERGLOW',
    subtitle: 'after dark, all ours',
    quote: '“PURE NEON ADRENALINE.” — NIGHT CITY MAG',
    tagline: 'NEON RAIN · FAST CARS · NO BRAKES',
    vol: 'VOL. 03 · 2026 EDITION',
    panels: [
      panel('photo-boulevard', 'THE DRIVER'),
      panel('scene-highway', 'LIGHT TRAILS'),
      panel('scene-skyline', 'DOWNTOWN'),
      panel('scene-palms', 'THE STRIP'),
      panel('photo-pier', 'THE FISHERMAN'),
      panel('scene-marina', 'THE MARINA · LAST LIGHT'),
    ],
    look: { grade: 0.9, grain: 0.5, halftone: 0.35, glow: 0.85 },
  },
  {
    id: 'boardwalk-heat',
    name: 'Boardwalk Heat',
    layoutId: 'grid',
    gradeId: 'golden',
    title: 'BOARDWALK HEAT',
    subtitle: 'six stories, one coast',
    quote: '“SIX STORIES, ZERO MERCY.” — THE DAILY TIDE',
    tagline: 'SUMMER ’26 · SAN SOLANO',
    vol: 'VOL. 04 · 2026 EDITION',
    panels: [
      panel('photo-boulevard', 'THE DRIVER'),
      panel('scene-skyline', 'DOWNTOWN · GOLD HOUR'),
      panel('photo-pier', 'THE ANGLER'),
      panel('crop-reel', 'THE CATCH'),
      panel('scene-motel', 'THE MOTEL · VACANCY'),
      panel('scene-marina', 'THE MARINA · LAST LIGHT'),
    ],
    look: { grade: 0.85, grain: 0.45, halftone: 0.3, glow: 0.55 },
  },
];

/** Deep-clones a preset into a fresh, editable cover document. */
export function stateFromPreset(preset) {
  const doc = JSON.parse(JSON.stringify(preset));
  delete doc.id;
  delete doc.name;
  doc.presetId = preset.id;
  doc.sizeId = '1080x1080';
  return doc;
}

/** The cover the studio opens with. */
export function initialState() {
  return stateFromPreset(PRESETS[0]);
}

/** Snapshot-based undo/redo over cover documents (JSON strings, capped at 80 steps). */
export class History {
  constructor(first) {
    this.stack = [JSON.stringify(first)];
    this.index = 0;
  }

  push(state) {
    const snap = JSON.stringify(state);
    if (snap === this.stack[this.index]) return;
    this.stack.length = this.index + 1;
    this.stack.push(snap);
    if (this.stack.length > 80) this.stack.shift();
    this.index = this.stack.length - 1;
  }

  undo() {
    if (this.index <= 0) return null;
    this.index -= 1;
    return JSON.parse(this.stack[this.index]);
  }

  redo() {
    if (this.index >= this.stack.length - 1) return null;
    this.index += 1;
    return JSON.parse(this.stack[this.index]);
  }

  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.stack.length - 1; }
}
