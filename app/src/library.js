// The built-in art library for Chrome Coast: two starter photos, detail crops derived from those
// photos at runtime, and six procedurally painted scenes (./scenes.js). Everything is local and
// deterministic — a cover can field five to seven distinct panels without repeating a photo.

/** Crop rectangles are fractions of the source photo (x, y, w, h). */
export const ART_LIBRARY = [
  { id: 'photo-boulevard', kind: 'photo', name: 'The Driver · photo', src: 'samples/boulevard.jpg' },
  { id: 'photo-pier', kind: 'photo', name: 'The Angler · photo', src: 'samples/pier.jpg' },
  // Detail crops of the pier photo: the reel and the hands on the rod read as their own panels.
  { id: 'crop-reel', kind: 'crop', name: 'The Catch · reel crop', photo: 'photo-pier', rect: { x: 0.66, y: 0.52, w: 0.34, h: 0.36 } },
  { id: 'crop-hands', kind: 'crop', name: 'The Grip · hands crop', photo: 'photo-pier', rect: { x: 0.5, y: 0.64, w: 0.38, h: 0.34 } },
  // Detail crops of the boulevard photo: chrome mirror on the red door, and the sunset sky.
  { id: 'crop-mirror', kind: 'crop', name: 'The Getaway · mirror crop', photo: 'photo-boulevard', rect: { x: 0.0, y: 0.6, w: 0.36, h: 0.4 } },
  { id: 'crop-sky', kind: 'crop', name: 'Golden Hour · sky crop', photo: 'photo-boulevard', rect: { x: 0.0, y: 0.0, w: 0.38, h: 0.42 } },
  // Painted scenes.
  { id: 'scene-skyline', kind: 'scene', name: 'Downtown · skyline scene', scene: 'skyline' },
  { id: 'scene-marina', kind: 'scene', name: 'The Marina · scene', scene: 'marina' },
  { id: 'scene-highway', kind: 'scene', name: 'Light Trails · highway scene', scene: 'highway' },
  { id: 'scene-motel', kind: 'scene', name: 'The Motel · neon scene', scene: 'motel' },
  { id: 'scene-tower', kind: 'scene', name: 'The Lookout · tower scene', scene: 'tower' },
  { id: 'scene-palms', kind: 'scene', name: 'The Strip · palms scene', scene: 'palms' },
];

const byId = new Map(ART_LIBRARY.map((a) => [a.id, a]));

/** Looks up a library entry by id (undefined when unknown). */
export function artById(id) {
  return byId.get(id);
}

/** Loads an image from a URL inside app/, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}
