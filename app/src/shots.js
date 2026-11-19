// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone, full-frame. `size` picks the export size for a
// cover scene, `layout` / `grade` / `photo` / `caption` / `title` set the scene.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, ctx) {
  const { state, photos } = ctx;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('caption')) state.caption = query.get('caption');
  if (query.get('badge')) state.badge = query.get('badge');
  if (query.get('heat')) state.heat = Number(query.get('heat')) || 4;
  if (query.get('halftone') === '1') state.halftone = true;
  const photoName = query.get('photo');
  const photosParam = query.get('photos');
  if (photosParam) {
    // photos=boulevard,pier assigns the named samples across the panels in turn.
    const names = photosParam.split(',').map((s) => s.trim().toLowerCase());
    state.panels.forEach((p, i) => {
      const idx = photos.findIndex((x) => x.name.toLowerCase() === names[i % names.length]);
      if (idx >= 0) p.photo = idx;
    });
  } else if (photoName) {
    const idx = photos.findIndex((p) => p.name.toLowerCase() === photoName.toLowerCase());
    if (idx >= 0) state.panels.forEach((p) => { p.photo = idx; });
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = query.get('size') ?? '1920x1080';
    const [w, h] = size.split('x').map(Number);
    if (w > 0 && h > 0) ctx.setExactSize(w, h);
  }
  ctx.syncControls();
  await document.fonts.ready;
  ctx.renderPreview();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
