// Cover layouts for Chrome Coast. Each layout tiles the whole canvas edge-to-edge (full-bleed —
// no empty background anywhere) and declares a title zone with a hard height cap, so the giant
// chrome title can overlap the art like a real GTA poster while never swallowing the bottom row
// of panels or their labels.

/** A panel is {x, y, w, h} in cover pixels; diagonal panels also carry a clip polygon `poly`. */
function rect(x, y, w, h) {
  return { x, y, w, h, poly: null };
}

function mosaicPanels(w, h) {
  return [
    rect(0, 0, w * 0.58, h * 0.66),            // hero, top-left
    rect(0, h * 0.66, w * 0.58, h * 0.34),     // wide satellite under the hero
    rect(w * 0.58, 0, w * 0.42, h * 0.44),     // right column: one tall + two stacked —
    rect(w * 0.58, h * 0.44, w * 0.42, h * 0.28), // the tall one's label lands below the title zone
    rect(w * 0.58, h * 0.72, w * 0.42, h * 0.28),
  ];
}

function storyPanels(w, h) {
  const bottomY = h * 0.6;
  const bw = w / 4;
  return [
    rect(0, 0, w, h * 0.6),                    // full-width hero on top
    rect(0, bottomY, bw, h * 0.4),
    rect(bw, bottomY, bw, h * 0.4),
    rect(bw * 2, bottomY, bw, h * 0.4),
    rect(bw * 3, bottomY, bw, h * 0.4),
  ];
}

function diagonalPanels(w, h) {
  // Five vertical slices; every divider leans by the same slant, like a slash through the poster.
  const slant = w * 0.055;
  const cuts = [0, 0.3, 0.48, 0.68, 0.84, 1];
  const bx = (i, y) => cuts[i] * w + (y / h - 0.5) * slant;
  const panels = [];
  for (let i = 0; i < 5; i++) {
    const x0 = Math.min(bx(i, 0), bx(i, h));
    const x1 = Math.max(bx(i + 1, 0), bx(i + 1, h));
    panels.push({
      x: x0, y: 0, w: x1 - x0, h,
      poly: [[bx(i, 0), 0], [bx(i + 1, 0), 0], [bx(i + 1, h), h], [bx(i, h), h]],
    });
  }
  return panels;
}

function gridPanels(w, h) {
  const panels = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      panels.push(rect((c * w) / 3, (r * h) / 2, w / 3, h / 2));
    }
  }
  return panels;
}

/**
 * Layout registry. `title` is the zone the display title must fit inside:
 * {cx, top, maxW, maxH} as fractions of the canvas. The caps are the fix for covers whose
 * title buried the lower panels — the renderer shrinks the title until it fits its zone.
 */
export const LAYOUTS = {
  mosaic: {
    name: 'Hero mosaic',
    panels: mosaicPanels,
    title: { cx: 0.44, top: 0.09, maxW: 0.88, maxH: 0.3 },
  },
  story: {
    name: 'Hero story',
    panels: storyPanels,
    title: { cx: 0.5, top: 0.295, maxW: 0.9, maxH: 0.25 },
  },
  diagonal: {
    name: 'Diagonal five',
    panels: diagonalPanels,
    title: { cx: 0.5, top: 0.12, maxW: 0.92, maxH: 0.24 },
  },
  grid: {
    name: 'Six grid',
    panels: gridPanels,
    title: { cx: 0.5, top: 0.1, maxW: 0.94, maxH: 0.225 },
  },
};

/** Looks up a layout by id, falling back to the hero mosaic. */
export function layoutById(id) {
  return LAYOUTS[id] ?? LAYOUTS.mosaic;
}

/** Point-in-panel test that understands diagonal clip polygons. */
export function panelAt(layout, w, h, px, py) {
  const panels = layout.panels(w, h);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.poly) {
      if (pointInPoly(px, py, p.poly)) return i;
    } else if (px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h) {
      return i;
    }
  }
  return -1;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
