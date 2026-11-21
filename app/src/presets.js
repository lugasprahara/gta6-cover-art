// Chrome Coast presets — four distinct cover briefs. Each preset is a full brief:
// a title, a neon script subtitle, a layout, a palette, a cinematic grade and a pool
// of panels (starter photos, runtime detail crops of them, procedural scene panels).
// The editor picks the first N panels of the pool for the chosen layout.

export const PRESETS = [
  {
    id: 'chrome-coast',
    name: 'Chrome Coast',
    title: 'CHROME\nCOAST',
    subtitle: 'vice city nights',
    layout: 'hero-mosaic',
    quote: '"The coast has never looked this good."',
    tagline: 'ONE COAST · NO RULES · COMING SOON',
    vol: 'VOL. 01 — LEONIDA',
    credits: 'A CHROME COAST PRODUCTION · LEONIDA FILMS · SUMMER 2026',
    palette: { skyTop: '#2b1055', skyMid: '#7597de', sun: '#ffd166', sea: '#ff7e5f' },
    grade: { shadow: '#3b0f54', mid: '#c94b7c', highlight: '#ffc46b', tint: '#ff8a3d', strength: 0.55 },
    pool: [
      { src: 'pier', label: 'THE DRIVER', sub: 'OCEAN DRIVE · 6:42 PM' },
      { src: 'boulevard', label: 'THE CLOSER', sub: 'DOWNTOWN · 7:04 PM' },
      { src: 'scene:skyline', label: 'THE CITY', sub: 'LEONIDA · GOLDEN HOUR' },
      { src: 'scene:marina', label: 'THE HARBOUR', sub: 'BAYWATCH · NOON' },
      { src: 'crop:pier:reel', label: 'THE CATCH', sub: 'PIER 9 · FIRST LIGHT' },
      { src: 'scene:palms', label: 'PALM ROW', sub: 'SUNSET STRIP · 5:58 PM' },
    ],
  },
  {
    id: 'golden-mile',
    name: 'Golden Mile',
    title: 'GOLDEN\nMILE',
    subtitle: 'one coast · no rules',
    layout: 'diagonal',
    quote: '"Pure sunshine, cut with chrome."',
    tagline: 'SUN · SAND · CHROME · COMING SOON',
    vol: 'VOL. 02 — SUNSET STRIP',
    credits: 'GOLDEN MILE PICTURES · SHOT ON LEONIDA BOULEVARD · 2026',
    palette: { skyTop: '#7a2e0e', skyMid: '#ff9e57', sun: '#ffe9a3', sea: '#2ec4b6' },
    grade: { shadow: '#4a1d0d', mid: '#e07a3f', highlight: '#ffe08a', tint: '#ffb347', strength: 0.6 },
    pool: [
      { src: 'boulevard', label: 'THE QUEEN', sub: 'BOULEVARD · 6:15 PM' },
      { src: 'scene:highway', label: 'THE GETAWAY', sub: 'I-95 · DUSK' },
      { src: 'scene:beachtower', label: 'THE LOOKOUT', sub: 'VICE BEACH · NOON' },
      { src: 'crop:pier:faces', label: 'THE CREW', sub: 'PIER 9 · GOLDEN HOUR' },
      { src: 'scene:palms', label: 'PALM ROW', sub: 'OCEAN DRIVE · 5:40 PM' },
    ],
  },
  {
    id: 'neon-tide',
    name: 'Neon Tide',
    title: 'NEON\nTIDE',
    subtitle: 'salt & sirens',
    layout: 'six-grid',
    quote: '"Neon after dark, salt in the air."',
    tagline: 'SALT · SIRENS · NEON · COMING SOON',
    vol: 'VOL. 03 — NEON TIDE',
    credits: 'NEON TIDE STUDIO · LEONIDA AFTER DARK · A 2026 POSTER',
    palette: { skyTop: '#12082e', skyMid: '#ff2e88', sun: '#7df9ff', sea: '#0affc2' },
    grade: { shadow: '#1c0b3d', mid: '#d63384', highlight: '#8ef6ff', tint: '#ff5ea8', strength: 0.5 },
    pool: [
      { src: 'pier', label: 'THE DRIVER', sub: 'OCEAN DRIVE · 9:12 PM' },
      { src: 'boulevard', label: 'THE FIXER', sub: 'NEON ROW · 10:04 PM' },
      { src: 'scene:motel', label: 'THE MOTEL', sub: 'ROUTE 27 · 11:47 PM' },
      { src: 'scene:skyline', label: 'THE CITY', sub: 'LEONIDA · BLUE HOUR' },
      { src: 'crop:boulevard:mirror', label: 'THE MIRROR', sub: 'PARKED · 8:30 PM' },
      { src: 'scene:marina', label: 'THE HARBOUR', sub: 'NIGHT TIDE · 12:05 AM' },
    ],
  },
  {
    id: 'pier-royale',
    name: 'Pier Royale',
    title: 'PIER\nROYALE',
    subtitle: 'gone fishing',
    layout: 'hero-story',
    quote: '"The biggest catch wears a crown."',
    tagline: 'FISH · CHROME · GOLD · COMING SOON',
    vol: 'VOL. 04 — PIER 9',
    credits: 'PIER ROYALE CLUB · LEONIDA PIER · EST. 2026',
    palette: { skyTop: '#274b8f', skyMid: '#ff9d76', sun: '#fff3b0', sea: '#3aa7a3' },
    grade: { shadow: '#16324f', mid: '#e07856', highlight: '#ffe9a8', tint: '#ff9e6d', strength: 0.55 },
    pool: [
      { src: 'pier', label: 'THE ANGLER', sub: 'PIER 9 · FIRST LIGHT' },
      { src: 'scene:sunsetsea', label: 'THE TIDE', sub: 'OPEN WATER · 6:02 AM' },
      { src: 'crop:pier:reel', label: 'THE CATCH', sub: 'REEL IN · 6:40 AM' },
      { src: 'scene:beachtower', label: 'THE LOOKOUT', sub: 'VICE BEACH · 7:15 AM' },
      { src: 'crop:boulevard:street', label: 'THE WALK', sub: 'BOARDWALK · 8:00 AM' },
    ],
  },
];

export const LAYOUTS = [
  { id: 'hero-mosaic', name: 'Hero mosaic', panels: 4 },
  { id: 'diagonal', name: 'Diagonal trio', panels: 3 },
  { id: 'six-grid', name: 'Six grid', panels: 6 },
  { id: 'hero-story', name: 'Hero story', panels: 4 },
];

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Landscape · 1920 × 1080', w: 1920, h: 1080 },
  { id: '1080x1920', label: 'Story · 1080 × 1920', w: 1080, h: 1920 },
];

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
