// render-shots.mjs — captures Chrome Coast's screenshots with headless Chromium over CDP.
//
//   node render-shots.mjs
//
// Serves app/ on a local port, opens each scene listed in shots.json (the app's own ?shot=
// scenes: real exported covers and the editor with a cover loaded), waits for the page to
// signal window.__shotReady, and saves the captures into screenshots/. If a JPEG comes out
// over the gate's 256 KiB it is re-captured at a lower quality — captures are never edited.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(root, 'app');
const shots = JSON.parse(await readFile(join(root, 'shots.json'), 'utf8'));
const CHROME = process.env.CHROME_BIN
  ?? '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const PORT = 8931;
const CDP_PORT = 9333;
const MAX_BYTES = 262144;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(appDir, path === '/' ? 'index.html' : path);
    if (!file.startsWith(appDir)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${CDP_PORT}`, '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

async function waitForCdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('chromium CDP did not come up');
}

/** Minimal CDP client over the browser websocket, with flattened target sessions. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const wsUrl = await waitForCdp();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(ws);
  await mkdir(join(root, 'screenshots'), { recursive: true });

  for (const shot of shots) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: shot.vw, height: shot.vh, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${shot.query}` }, sessionId);
    let readyFlag = false;
    for (let i = 0; i < 150 && !readyFlag; i++) {
      const r = await cdp.send('Runtime.evaluate',
        { expression: 'window.__shotReady === true', returnByValue: true }, sessionId).catch(() => null);
      readyFlag = Boolean(r?.result?.value);
      if (!readyFlag) await sleep(200);
    }
    if (!readyFlag) throw new Error(`${shot.name}: page never signalled __shotReady`);
    await sleep(250);
    let quality = 86;
    let data = null;
    while (quality >= 40) {
      const shotRes = await cdp.send('Page.captureScreenshot',
        { format: 'jpeg', quality, fromSurface: true }, sessionId);
      data = Buffer.from(shotRes.data, 'base64');
      if (data.length <= MAX_BYTES) break;
      quality -= 14;
    }
    const outPath = join(root, 'screenshots', shot.name);
    await writeFile(outPath, data);
    console.log(`${shot.name}: ${data.length} bytes (jpeg q${quality})`);
    await cdp.send('Target.closeTarget', { targetId });
  }
  ws.close();
} finally {
  chrome.kill('SIGKILL');
  server.close();
}
console.log(existsSync(join(root, 'screenshots', '1-cover.jpg')) ? 'shots done' : 'shots incomplete');
