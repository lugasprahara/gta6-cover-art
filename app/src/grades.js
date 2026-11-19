// Vice City sunset grades: each grade is a colour ramp a photo's luminance is mapped
// through, mixed back with the original photo so faces stay readable.
/** @type {Record<string, {name: string, mix: number, posterize: boolean, stops: Array<[number, [number, number, number]]>}>} */
export const GRADES = {
  sunset: {
    name: 'Vice Sunset', mix: 0.52, posterize: false,
    stops: [[0, [22, 6, 46]], [0.35, [110, 24, 96]], [0.62, [224, 52, 96]], [0.85, [255, 122, 26]], [1, [255, 210, 60]]],
  },
  neon: {
    name: 'Neon Night', mix: 0.58, posterize: false,
    stops: [[0, [6, 10, 38]], [0.35, [20, 60, 110]], [0.6, [30, 190, 190]], [0.82, [255, 46, 136]], [1, [255, 150, 220]]],
  },
  golden: {
    name: 'Golden Hour', mix: 0.46, posterize: false,
    stops: [[0, [30, 16, 8]], [0.35, [110, 60, 20]], [0.62, [210, 120, 30]], [0.85, [255, 180, 60]], [1, [255, 240, 170]]],
  },
  candy: {
    name: 'Candy Pop', mix: 0.6, posterize: false,
    stops: [[0, [40, 4, 60]], [0.35, [150, 20, 120]], [0.6, [255, 60, 140]], [0.82, [255, 140, 60]], [1, [255, 240, 90]]],
  },
  dusk: {
    name: 'Teal Dusk', mix: 0.55, posterize: false,
    stops: [[0, [4, 14, 34]], [0.35, [14, 70, 110]], [0.62, [24, 170, 180]], [0.85, [120, 200, 220]], [1, [230, 250, 250]]],
  },
  ink: {
    name: 'Inked Poster', mix: 0.85, posterize: true,
    stops: [[0, [16, 6, 32]], [0.3, [90, 20, 90]], [0.55, [210, 60, 110]], [0.8, [255, 150, 60]], [1, [255, 240, 190]]],
  },
};

/** Interpolates one grade's ramp at luminance t (0..1) into [r, g, b]. */
export function gradeColorAt(grade, t) {
  const stops = GRADES[grade].stops;
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
