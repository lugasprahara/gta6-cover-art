// Chrome Coast — gta6-cover-art-01 entry program (Node 22, standard library only).
//
// The product is the offline web app in app/ (serve it with `node serve.ts`, then
// open http://localhost:8080). This program is only the hand-in: it copies app/ and
// screenshots/ into the output directory and writes dossier.json there with the
// vendored make.fun library, exactly the way the gate rebuilds it. Locally:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, handed to the dossier builder so an over-limit entry fails here
// first instead of at submission: at most 4 screenshots of 256 KiB each; app/ at
// most 993 entries and 48 MiB with no path over 1000 bytes; the dossier's source
// text capped at 160 KiB.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  return join(outputDir, 'dossier.json');
}

const written = handIn();
console.log(`chrome-coast: dossier written to ${written}`);
