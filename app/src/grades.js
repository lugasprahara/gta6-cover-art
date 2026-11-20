// Golden Hour Studio — cinematic colour grades.
// Each grade is a luminance ramp (deep coloured shadows -> hot highlights) that a
// panel's pixels are mapped through, then mixed back with the original so photos
// still read as photos. `mix` is the grade's full-strength blend; the editor's
// grade-strength slider scales it per cover. No duotone: highlights stay warm and
// skin tones survive because the ramp passes through natural mid-tones.
/** @type {Record<string, {name: string, mix: number, sat: number, stops: Array<[number, [number, number, number]]>}>} */
export const GRADES = {
  sunset: {
    name: 'Sunset Boulevard', mix: 0.55, sat: 1.18,
    stops: [[0, [26, 8, 52]], [0.3, [96, 26, 104]], [0.55, [196, 62, 110]], [0.78, [255, 122, 40]], [1, [255, 216, 110]]],
  },
  neonNight: {
    name: 'Neon Night', mix: 0.58, sat: 1.22,
    stops: [[0, [8, 8, 44]], [0.3, [26, 44, 116]], [0.55, [24, 150, 178]], [0.78, [226, 62, 150]], [1, [255, 178, 226]]],
  },
  goldenHour: {
    name: 'Golden Hour', mix: 0.5, sat: 1.12,
    stops: [[0, [34, 18, 10]], [0.3, [116, 62, 24]], [0.55, [206, 118, 34]], [0.8, [255, 182, 72]], [1, [255, 244, 186]]],
  },
  tropicTeal: {
    name: 'Tropic Teal', mix: 0.52, sat: 1.15,
    stops: [[0, [6, 26, 44]], [0.3, [10, 84, 108]], [0.55, [22, 168, 160]], [0.8, [120, 216, 160]], [1, [240, 252, 210]]],
  },
};

/** Interpolates one grade's ramp at luminance t (0..1) into [r, g, b]. */
export function gradeColorAt(gradeName, t) {
  const stops = GRADES[gradeName].stops;
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      const f = (t - p0) / (p1 - p0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Applies a grade in place to a 2D context's pixels: saturation/contrast shaping,
 * then the luminance ramp mixed at `strength` (0..1 of the grade's own mix).
 */
export function applyGradeToContext(ctx2d, w, h, gradeName, strength) {
  const grade = GRADES[gradeName];
  const mix = grade.mix * Math.max(0, Math.min(1, strength));
  const data = ctx2d.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r0 = px[i], g0 = px[i + 1], b0 = px[i + 2];
    let lum = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255;
    // Gentle S-curve so shadows sink and highlights bloom before the ramp.
    lum = lum * lum * (3 - 2 * lum) * 0.35 + lum * 0.65;
    const [gr, gg, gb] = gradeColorAt(gradeName, lum);
    let r = r0 * (1 - mix) + gr * mix;
    let g = g0 * (1 - mix) + gg * mix;
    let b = b0 * (1 - mix) + gb * mix;
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * grade.sat;
    g = avg + (g - avg) * grade.sat;
    b = avg + (b - avg) * grade.sat;
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx2d.putImageData(data, 0, 0);
}
