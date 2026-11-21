// Captures Chrome Coast's screenshots with headless Chromium over CDP.
//
//   node render-shots.mjs
//
// Serves app/ on a throwaway local port, opens each scene from shots.json (the
// app's own ?shot= scenes: real exported covers and the editor with a cover
// loaded), waits for the page to signal window.__shotReady, then saves a JPEG
// into screenshots/. A capture over the 256 KiB gate is retried at lower JPEG
// quality — captures are never edited after the fact.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const APP_DIR = join(HERE, 'app');
const SHOT_LIST = JSON.parse(await readFile(join(HERE, 'shots.json'), 'utf8'));
const CHROME_BIN = process.env.CHROME_BIN
  ?? '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const HTTP_PORT = 8941;
const DEBUG_PORT = 9343;
const BYTE_CAP = 262144;

const CONTENT = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fileServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${HTTP_PORT}`);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const body = await readFile(join(APP_DIR, rel));
    res.writeHead(200, { 'content-type': CONTENT[extname(rel)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => fileServer.listen(HTTP_PORT, '127.0.0.1', resolve));

const browser = spawn(CHROME_BIN, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${DEBUG_PORT}`, '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });

async function debuggerUrl() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* browser still starting */ }
    await delay(250);
  }
  throw new Error('chromium did not open its debugging port');
}

// Tiny JSON-RPC client over one browser websocket; each tab gets a flat session.
function makeClient(ws) {
  let nextId = 0;
  const waiting = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  return {
    call(method, params = {}, sessionId) {
      const id = ++nextId;
      const frame = { id, method, params };
      if (sessionId) frame.sessionId = sessionId;
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        ws.send(JSON.stringify(frame));
      });
    },
  };
}

async function captureOne(client, shot) {
  const { targetId } = await client.call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.call('Target.attachToTarget', { targetId, flatten: true });
  try {
    await client.call('Page.enable', {}, sessionId);
    await client.call('Emulation.setDeviceMetricsOverride',
      { width: shot.vw, height: shot.vh, deviceScaleFactor: 1, mobile: false }, sessionId);
    await client.call('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/${shot.query}` }, sessionId);
    let ready = false;
    for (let i = 0; i < 150 && !ready; i++) {
      const check = await client.call('Runtime.evaluate',
        { expression: 'window.__shotReady === true', returnByValue: true }, sessionId).catch(() => null);
      ready = Boolean(check?.result?.value);
      if (!ready) await delay(200);
    }
    if (!ready) throw new Error(`${shot.name}: page never signalled ready`);
    await delay(300);
    let quality = 88;
    let bytes = null;
    while (quality >= 40) {
      const snap = await client.call('Page.captureScreenshot',
        { format: 'jpeg', quality, fromSurface: true }, sessionId);
      bytes = Buffer.from(snap.data, 'base64');
      if (bytes.length <= BYTE_CAP) break;
      quality -= 12;
    }
    await writeFile(join(HERE, 'screenshots', shot.name), bytes);
    console.log(`${shot.name}: ${bytes.length} bytes (jpeg q${quality})`);
  } finally {
    await client.call('Target.closeTarget', { targetId }).catch(() => {});
  }
}

try {
  const ws = new WebSocket(await debuggerUrl());
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const client = makeClient(ws);
  await mkdir(join(HERE, 'screenshots'), { recursive: true });
  for (const shot of SHOT_LIST) await captureOne(client, shot);
  ws.close();
  console.log('shots done');
} finally {
  browser.kill('SIGKILL');
  fileServer.close();
}
