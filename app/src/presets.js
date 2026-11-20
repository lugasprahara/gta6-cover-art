// Golden Hour Studio — built-in cover presets and the panel-source catalogue.
// Four ready-made covers, each with its own title, cast of panels, layout and
// grade, so the studio (and its screenshots) show real range: a golden mosaic,
// a neon diagonal, a pier story and a teal grid. A panel's `source` is a key
// into the source catalogue the editor builds: `photo:<sample-or-user-index>`,
// a DETAIL_CROPS key, or a SCENES key.

/** Every source a panel can show, in pool order: photos, crops, then scenes. */
export function sourceCatalogue(photoNames) {
  const entries = [];
  photoNames.forEach((name, i) => entries.push({ key: `photo:${i}`, name, kind: 'photo' }));
  entries.push(
    { key: 'crop-shades', name: 'Shades portrait (crop)', kind: 'crop' },
    { key: 'crop-mirror', name: 'Mirror & door (crop)', kind: 'crop' },
    { key: 'crop-reel', name: 'Reel close-up (crop)', kind: 'crop' },
    { key: 'crop-hands', name: 'Hands on the rod (crop)', kind: 'crop' },
    { key: 'scene-skyline', name: 'Sunset skyline (art)', kind: 'scene' },
    { key: 'scene-marina', name: 'Marina masts (art)', kind: 'scene' },
    { key: 'scene-highway', name: 'Highway trails (art)', kind: 'scene' },
    { key: 'scene-motel', name: 'Neon motel (art)', kind: 'scene' },
    { key: 'scene-lifeguard', name: 'Lifeguard tower (art)', kind: 'scene' },
    { key: 'scene-palms', name: 'Palm boulevard (art)', kind: 'scene' },
  );
  return entries;
}

const panel = (source, label, zoom = 1, ox = 0, oy = 0) => ({ source, label, zoom, ox, oy });

/** The four built-in presets. Panels are listed in layout slot order. */
export const PRESETS = [
  {
    name: 'Palm Heat — golden mosaic',
    layout: 'mosaic', grade: 'goldenHour',
    title: 'PALM HEAT', subtitle: 'golden coast nights', caption: 'One coast, no brakes',
    quote: 'A sun-drenched thrill ride', tagline: 'ONE COAST · NO RULES · COMING SOON',
    credits: 'GOLDEN HOUR STUDIO PRESENTS · A COVER IN SEVEN FRAMES',
    edition: 'VOL. 01 — LAUNCH WEEK', seal: "HOT SUMMER '26", heat: 5,
    panels: [
      panel('photo:0', 'THE DRIVER', 1.05, 0, 0.1),
      panel('scene-skyline', 'DOWNTOWN · 7:04 PM · GOLD RUSH'),
      panel('crop-mirror', 'THE GETAWAY'),
      panel('scene-marina', 'THE HARBOUR'),
      panel('scene-palms', 'THE STRIP'),
      panel('crop-shades', 'THE LOOK'),
      panel('scene-highway', 'THE ESCAPE'),
    ],
  },
  {
    name: 'Neon Tide — diagonal nights',
    layout: 'diagonal', grade: 'neonNight',
    title: 'NEON TIDE', subtitle: 'after dark, we ride', caption: 'Wet streets, bright sins',
    quote: 'Pure neon adrenaline', tagline: 'AFTER DARK · ALL GAS · NO SLEEP',
    credits: 'GOLDEN HOUR STUDIO PRESENTS · A COVER IN FIVE FRAMES',
    edition: 'VOL. 02 — NIGHT SHIFT', seal: 'AFTER DARK', heat: 4,
    panels: [
      panel('photo:0', 'THE WHEEL', 1.1, 0, 0.05),
      panel('scene-motel', 'OCEAN AVE · 1:12 AM · TROUBLE'),
      panel('scene-highway', 'THE CHASE'),
      panel('photo:1', 'THE NIGHT OWL', 1.05, 0, 0),
      panel('scene-palms', 'THE STRIP · 2:40 AM'),
    ],
  },
  {
    name: 'Pier Royale — hero story',
    layout: 'heroThree', grade: 'sunset',
    title: 'PIER ROYALE', subtitle: 'last cast at dusk', caption: 'The big one is still out there',
    quote: 'A small-town legend', tagline: 'ONE ROD · ONE LEGEND · ONE SUNSET',
    credits: 'GOLDEN HOUR STUDIO PRESENTS · A COVER IN FOUR FRAMES',
    edition: 'VOL. 03 — PIER STORIES', seal: 'EST. 2026', heat: 5,
    panels: [
      panel('photo:1', 'THE ANGLER', 1.02, 0, 0.08),
      panel('crop-reel', 'THE CATCH'),
      panel('crop-hands', 'THE CRAFT'),
      panel('scene-lifeguard', 'THE WATCH · 6:42 PM'),
    ],
  },
  {
    name: 'Velvet Hour — teal grid',
    layout: 'gridSix', grade: 'tropicTeal',
    title: 'VELVET HOUR', subtitle: 'salt in the air', caption: 'Every frame a postcard',
    quote: 'Impossibly pretty trouble', tagline: 'SALT · SUN · SIRENS · REPEAT',
    credits: 'GOLDEN HOUR STUDIO PRESENTS · A COVER IN SIX FRAMES',
    edition: 'VOL. 04 — POSTCARD SET', seal: 'ORIGINAL COVER ART', heat: 4,
    panels: [
      panel('photo:0', 'THE DRIVER', 1.05, 0, 0.1),
      panel('scene-lifeguard', 'BAYWATCH · NOON'),
      panel('photo:1', 'THE ANGLER', 1.05, 0, 0.05),
      panel('scene-marina', 'THE HARBOUR · DUSK'),
      panel('crop-mirror', 'THE GETAWAY'),
      panel('crop-reel', 'THE CATCH'),
    ],
  },
];

/** A blank starting state (preset 0 applied by the editor on boot). */
export function blankState() {
  return {
    layout: 'mosaic', grade: 'goldenHour',
    title: 'PALM HEAT', subtitle: 'golden coast nights', caption: 'One coast, no brakes',
    quote: 'A sun-drenched thrill ride', tagline: 'ONE COAST · NO RULES · COMING SOON',
    credits: 'GOLDEN HOUR STUDIO PRESENTS', edition: 'VOL. 01 — LAUNCH WEEK',
    seal: "HOT SUMMER '26", heat: 5,
    gradeStrength: 1, grain: 0.5, halftone: 0.35, glow: 0.6,
    panels: Array.from({ length: 9 }, () => panel('photo:0', '')),
  };
}

/** Deep-copies a preset into a full editable state. */
export function stateFromPreset(preset) {
  const state = blankState();
  for (const key of ['layout', 'grade', 'title', 'subtitle', 'caption', 'quote', 'tagline', 'credits', 'edition', 'seal', 'heat']) {
    state[key] = preset[key];
  }
  preset.panels.forEach((p, i) => { state.panels[i] = { ...p }; });
  return state;
}
