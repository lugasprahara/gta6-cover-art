// Photo library — the two starter photos plus runtime detail crops cut from them.
// A crop is a fraction rect of its source photo, so one photo yields several distinct
// panels (a face, a reel close-up, a mirror, a street) without any new files.
// Nothing here needs the network: the photos live in app/samples/.

export const PHOTOS = {
  pier: { file: 'samples/pier.jpg', label: 'Pier photo' },
  boulevard: { file: 'samples/boulevard.jpg', label: 'Boulevard photo' },
};

// Detail crops, as fractions of the source photo. Chosen to land on real content:
// the pier photo is square, the boulevard photo is a tall portrait.
export const CROPS = {
  'pier:reel': { photo: 'pier', rect: { x: 0.02, y: 0.6, w: 0.6, h: 0.4 } },
  'pier:faces': { photo: 'pier', rect: { x: 0.12, y: 0.05, w: 0.76, h: 0.55 } },
  'pier:harbour': { photo: 'pier', rect: { x: 0.55, y: 0.45, w: 0.45, h: 0.55 } },
  'boulevard:mirror': { photo: 'boulevard', rect: { x: 0.5, y: 0.08, w: 0.5, h: 0.42 } },
  'boulevard:street': { photo: 'boulevard', rect: { x: 0, y: 0.55, w: 1, h: 0.45 } },
  'boulevard:portrait': { photo: 'boulevard', rect: { x: 0.08, y: 0.05, w: 0.84, h: 0.6 } },
};

/** Loads both starter photos once; resolves to { pier, boulevard } image elements. */
export function loadPhotos() {
  const entries = Object.entries(PHOTOS).map(([key, { file }]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => reject(new Error(`could not load ${file}`));
    img.src = file;
  }));
  return Promise.all(entries).then((pairs) => Object.fromEntries(pairs));
}

/** cover-fit draw of an image (or a crop rect of it) into a target rect. */
export function drawCoverFit(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  const scale = Math.max(dw / sw, dh / sh);
  const pw = sw * scale;
  const ph = sh * scale;
  ctx.drawImage(img, sx, sy, sw, sh, dx + (dw - pw) / 2, dy + (dh - ph) / 2, pw, ph);
}
