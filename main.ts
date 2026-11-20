// Chrome Coast — gta6-cover-art-01 entry program (Node 22, standard library only).
//
// The product is the static web app in app/ (open app/index.html in a desktop browser, fully
// offline). This program hands the entry in: it copies app/ and screenshots/ into the output
// directory and writes dossier.json there with the vendored make.fun library, byte for byte
// the way the gate rebuilds it. Run it locally with:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed to the dossier builder so an over-limit entry fails here first:
// at most 4 screenshots of 256 KiB each; app/ at most 993 entries and 48 MiB with no path
// over 1000 bytes; the dossier's source text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`chrome-coast: dossier written to ${join(out, 'dossier.json')}`);
