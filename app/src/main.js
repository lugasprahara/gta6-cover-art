// Chrome Coast entry point: a ?shot= query builds a fixed screenshot scene, anything else
// boots the full cover studio.

import { bootEditor } from './editor.js';
import { runShotIfRequested } from './shots.js';

const params = new URLSearchParams(location.search);

runShotIfRequested(params)
  .then((wasShot) => (wasShot ? null : bootEditor()))
  .catch((err) => {
    console.error(err);
    const status = document.getElementById('status');
    if (status) status.textContent = `Something went wrong: ${err.message}`;
  });
