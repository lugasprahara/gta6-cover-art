// Renders screenshots/ from shots.json: serves app/ with serve.ts, drives the
// Playwright-cached headless Chromium over CDP, and captures each ?shot= scene
// as a JPEG inside the gate limits (<=256 KiB, long side <=1280, short >=480).
// Usage: node render-shots.mjs   (run from the repository root)
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const SERVE_PORT = 8091;
const DEBUG_PORT = 9333;
const BASE = `http://127.0.0.1:${SERVE_PORT}`;

const shellDir = execSync('ls -d ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64', { encoding: 'utf8' }).trim().split('\n').pop();
const chrome = join(shellDir, 'chrome-headless-shell');
if (!existsSync(chrome)) throw new Error(`headless shell not found at ${chrome}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`server never came up at ${url}`);
}

/** Minimal CDP client over one WebSocket. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

const server = spawn('node', ['serve.ts', '--port', String(SERVE_PORT)], { cwd: here, stdio: 'pipe' });
const browser = spawn(chrome, [
  '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--password-store=basic', '--use-mock-keychain',
  `--remote-debugging-port=${DEBUG_PORT}`, '--window-size=1280,720', 'about:blank',
], { stdio: 'pipe' });

let failures = 0;
try {
  await waitForHttp(`${BASE}/index.html`);
  await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  for (const shot of shots) {
    const url = `${BASE}/index.html${shot.query}`;
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    await cdp.send('Page.navigate', { url }, sessionId);
    let ready = false;
    for (let i = 0; i < 100; i++) {
      await sleep(300);
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: 'window.__shotReady === true', returnByValue: true,
      }, sessionId);
      if (result?.value) { ready = true; break; }
    }
    if (!ready) {
      console.error(`!! ${shot.name}: __shotReady never fired for ${url}`);
      failures++;
      continue;
    }
    // Confirm the preview canvas actually painted (non-blank pixels).
    const { result: px } = await cdp.send('Runtime.evaluate', {
      expression: `(() => { const c = document.querySelector('#preview'); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let sum = 0; for (let i = 0; i < d.length; i += 997) sum += d[i]; return sum; })()`,
      returnByValue: true,
    }, sessionId);
    if (!px?.value) console.error(`!! ${shot.name}: preview canvas looks blank`);
    // Also confirm the export path produces a real PNG blob.
    const { result: blobSize } = await cdp.send('Runtime.evaluate', {
      expression: `new Promise((res) => document.querySelector('#preview').toBlob((b) => res(b ? b.size : 0), 'image/png'))`,
      awaitPromise: true, returnByValue: true,
    }, sessionId);
    console.log(`${shot.name}: canvas PNG blob ${blobSize?.value ?? '?'} bytes`);
    let quality = 85;
    let file;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality }, sessionId);
      file = Buffer.from(data, 'base64');
      if (file.length <= 262144 || attempt === 2) break;
      quality -= 15;
    }
    writeFileSync(join(here, 'screenshots', shot.name), file);
    console.log(`${shot.name}: ${shot.w}x${shot.h} -> ${file.length} bytes (quality ${quality})`);
  }

  const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown');
  for (const e of exceptions) console.error('PAGE EXCEPTION:', JSON.stringify(e.params.exceptionDetails).slice(0, 500));
  const errors = cdp.events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error');
  for (const e of errors) console.error('CONSOLE ERROR:', JSON.stringify(e.params.args).slice(0, 300));
  ws.close();
} finally {
  browser.kill('SIGKILL');
  server.kill('SIGKILL');
}

// Prune stale screenshots not in shots.json.
for (const name of ['1-cover.jpg', '2-editor.jpg', '3-cover.jpg', '4-cover.jpg']) {
  if (!shots.some((s) => s.name === name)) {
    try { unlinkSync(join(here, 'screenshots', name)); } catch { /* already gone */ }
  }
}
console.log(failures ? `${failures} shot(s) FAILED` : 'all shots rendered');
process.exit(failures ? 1 : 0);
