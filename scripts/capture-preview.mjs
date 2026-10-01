/** Capture the cooked island subset after WebGL2 has drawn resident pages. */
/* global process, setTimeout, fetch, WebSocket, Buffer, console */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const at = arg.indexOf('=');
  if (!arg.startsWith('--') || at < 0) throw Error(`Expected --name=value: ${arg}`);
  return [arg.slice(2, at), arg.slice(at + 1)];
}));
const url = args.url ?? 'http://127.0.0.1:4181/island-preview.html';
const output = args.out;
if (!output || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url))
  throw Error('Set --out=DIR and a local --url=http://127.0.0.1:PORT/');
const timeoutMs = Math.min(600_000, Number(args.timeout ?? 600_000));
if (!Number.isFinite(timeoutMs) || timeoutMs < 30_000) throw Error('Invalid timeout');
const settleMs = Math.min(30_000, Number(args.settle ?? 3_000));
if (!Number.isFinite(settleMs) || settleMs < 0) throw Error('Invalid settle delay');
await mkdir(output, { recursive: true });
const profile = join(output, `chrome-profile-${process.pid}`);
const child = spawn('/usr/bin/chromium', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
  '--disable-background-networking', '--no-proxy-server', '--disable-webgpu',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let log = '';
child.stderr.on('data', (chunk) => { log += chunk.toString(); });
let socket;
let id = 0;
const pending = new Map();
const events = [];
const deadline = Date.now() + timeoutMs;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bounded = async (promise, ms, label) => Promise.race([
  promise, pause(ms).then(() => { throw Error(`${label} timed out after ${ms} ms`); }),
]);
const call = (method, params = {}, timeout = 20_000) => bounded(new Promise((resolve, reject) => {
  const key = ++id;
  pending.set(key, { resolve, reject });
  socket.send(JSON.stringify({ id: key, method, params }));
}), timeout, method);
const evaluate = async (expression) => {
  const reply = await call('Runtime.evaluate', { expression, returnByValue: true });
  if (reply.exceptionDetails) throw Error(reply.exceptionDetails.text);
  return reply.result.value;
};

try {
  const match = await bounded((async () => {
    while (Date.now() < deadline) {
      const found = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (found) return found[1];
      if (child.exitCode !== null) throw Error(`Chromium exited ${child.exitCode}`);
      await pause(100);
    }
    throw Error('Chromium DevTools did not start');
  })(), 20_000, 'Chromium startup');
  const origin = match.replace('ws:', 'http:').split('/devtools/')[0];
  const targets = await bounded(fetch(`${origin}/json/list`).then((r) => r.json()), 5_000, 'DevTools discovery');
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw Error('No Chromium page target');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await bounded(new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  }), 5_000, 'DevTools socket');
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return events.push(message);
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task?.reject(Error(message.error.message));
    else task?.resolve(message.result);
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 960, height: 540, deviceScaleFactor: 1, mobile: false,
  });
  await call('Page.navigate', { url });
  let evidence;
  while (Date.now() < deadline - 15_000) {
    evidence = await evaluate(`(() => {
      const capture = window.islandPreview;
      const frame = capture?.frame?.();
      return {
        status: document.querySelector('#status')?.textContent,
        ready: !!capture,
        renderer: capture?.world.renderer,
        frames: capture?.frames?.() ?? 0,
        residentPages: frame?.residentPages ?? null,
        selectedTriangles: frame?.selectedTriangles ?? null,
        webgl2: !!document.querySelector('#view')?.getContext('webgl2'),
        viewport: [innerWidth, innerHeight],
      };
    })()`);
    if (evidence.ready && evidence.status?.includes('objects') &&
        evidence.residentPages > 0 && evidence.selectedTriangles > 0) break;
    if (evidence.status?.startsWith('Preview failed:')) throw Error(evidence.status);
    await pause(1000);
  }
  await writeFile(join(output, 'preflight.json'), JSON.stringify(evidence, null, 2));
  const drawn = evidence?.ready && evidence.residentPages > 0 && evidence.selectedTriangles > 0;
  let pixel = null;
  try {
    pixel = await evaluate(`(() => {
      const canvas = document.querySelector('#view');
      const gl = canvas?.getContext('webgl2');
      if (!gl) return null;
      const rgba = new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2),
        1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      return { rgba: [...rgba], error: gl.getError(), size: [canvas.width, canvas.height] };
    })()`);
  } catch (error) { pixel = { error: String(error) }; }
  await pause(settleMs);
  let png = null;
  try {
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 180_000);
    png = Buffer.from(screenshot.data, 'base64');
  } catch (error) { console.error(`Screenshot unavailable: ${error}`); }
  const exceptions = events.filter((event) => event.method === 'Runtime.exceptionThrown')
    .map((event) => event.params.exceptionDetails.text);
  const responses = events.filter((event) => event.method === 'Network.responseReceived')
    .map((event) => ({ url: event.params.response.url, status: event.params.response.status }));
  const failures = events.filter((event) => event.method === 'Network.loadingFailed')
    .map((event) => ({ requestId: event.params.requestId, error: event.params.errorText }));
  const valid = drawn && evidence.renderer === 'webgl2' && evidence.webgl2 &&
    exceptions.length === 0 && failures.length === 0 && png && png.length > 20_000;
  const result = {
    valid: !!valid, url, evidence, pixel, screenshotBytes: png?.length ?? 0,
    screenshotSha256: png ? createHash('sha256').update(png).digest('hex') : null,
    exceptions, responses: responses.length,
    httpErrors: responses.filter((response) => response.status >= 400), failures,
    performance: 'unavailable; this is a software-rendered visual and loading smoke test',
  };
  await writeFile(join(output, 'capture.json'), JSON.stringify(result, null, 2));
  if (png) await writeFile(join(output, valid ? 'island-preview.png' : 'diagnostic.png'), png);
  if (!valid) throw Error(`3D render not verified: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result));
} catch (error) {
  await writeFile(join(output, 'failure.txt'), String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  socket?.close();
  child.kill('SIGTERM');
  await writeFile(join(output, 'chromium.log'), log);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
