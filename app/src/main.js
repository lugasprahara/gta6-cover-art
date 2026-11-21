// Chrome Coast — boots the cover-art studio. With ?shot=cover or ?shot=editor the
// page sets up a fixed screenshot scene instead of the interactive editor.
import { initEditor } from './editor.js';
import { runShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params).catch((err) => {
    document.getElementById('status').textContent = `Shot failed: ${err.message}`;
  });
} else {
  initEditor().catch((err) => {
    document.getElementById('status').textContent = `Could not start: ${err.message}`;
  });
}
