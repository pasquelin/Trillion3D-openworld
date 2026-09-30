/** Capture the cooked application's actual canvas through Chromium DevTools. */
/* global process, setTimeout, fetch, WebSocket, Buffer, console */
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const at = arg.indexOf('=');
    if (!arg.startsWith('--') || at < 0) throw Error(`Expected --name=value: ${arg}`);
    return [arg.slice(2, at), arg.slice(at + 1)];
  }),
);
const url = args.url ?? 'http://127.0.0.1:4180/';
const output = args.out;
if (!output || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url))
  throw Error('Set --out=DIR and a local --url=http://127.0.0.1:PORT/');
const route = args.route ?? 'V1-summit';
const timeoutMs = Math.min(180_000, Number(args.timeout ?? 90_000));
const waitMs = Math.min(45_000, Number(args.wait ?? 10_000));
await mkdir(output, { recursive: true });
const profile = join(output, `chrome-profile-${process.pid}`);
const child = spawn(
  '/usr/bin/chromium',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--disable-background-networking',
    '--no-proxy-server',
    '--disable-webgpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let log = '';
child.stderr.on('data', (chunk) => {
  log += chunk.toString();
});
let socket;
let id = 0;
const pending = new Map();
const events = [];
const deadline = Date.now() + timeoutMs;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bounded = async (promise, ms, label) =>
  Promise.race([
    promise,
    pause(ms).then(() => {
      throw Error(`${label} timed out after ${ms} ms`);
    }),
  ]);
const call = (method, params = {}) =>
  bounded(
    new Promise((resolve, reject) => {
      const key = ++id;
      pending.set(key, { resolve, reject });
      socket.send(JSON.stringify({ id: key, method, params }));
    }),
    10_000,
    method,
  );
const evaluate = async (expression) => {
  const reply = await call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (reply.exceptionDetails) throw Error(reply.exceptionDetails.text);
  return reply.result.value;
};

try {
  const match = await bounded(
    (async () => {
      while (Date.now() < deadline) {
        const found = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (found) return found[1];
        if (child.exitCode !== null) throw Error(`Chromium exited ${child.exitCode}`);
        await pause(100);
      }
      throw Error('Chromium DevTools did not start');
    })(),
    Math.min(20_000, timeoutMs),
    'Chromium startup',
  );
  const origin = match.replace('ws:', 'http:').split('/devtools/')[0];
  const targets = await bounded(
    fetch(`${origin}/json/list`).then((r) => r.json()),
    5_000,
    'DevTools discovery',
  );
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw Error('No Chromium page target');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await bounded(
    new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    }),
    5_000,
    'DevTools socket',
  );
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
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call('Page.navigate', { url });
  let status;
  while (Date.now() < deadline) {
    status = await evaluate(`({loaded: !document.querySelector('#loading'),
      step: document.querySelector('#step')?.textContent,
      route: !!document.querySelector('select[aria-label="Island route"]'),
      output: [...document.querySelectorAll('output')].map(x=>x.textContent).join(' '),
      canvas: !!document.querySelector('canvas#view')})`);
    if (status.loaded && status.route && status.output?.includes('selected triangles')) break;
    await pause(1000);
  }
  if (!status?.loaded || !status.route)
    throw Error(`Application did not become ready: ${JSON.stringify(status)}`);
  const selected = await evaluate(`(() => {
    const choice = document.querySelector('select[aria-label="Island route"]');
    const option = [...choice.options].find(x => x.value === ${JSON.stringify(route)});
    if (!option) return {available: [...choice.options].map(x => x.value)};
    choice.value = option.value;
    [...document.querySelectorAll('button')].find(x => x.textContent === 'Replay route')?.click();
    return {selected: option.value, name: option.textContent};
  })()`);
  if (!selected.selected) throw Error(`Route unavailable: ${JSON.stringify(selected)}`);
  await pause(waitMs);
  const evidence = await evaluate(`(() => {
    const output = [...document.querySelectorAll('output')].map(x => x.textContent).join(' ');
    const digits = (output.match(/selected triangles ([\\d,]+)/) || [])[1] || '0';
    return {selectedTriangles: Number(digits.replaceAll(',', '')),
      loading: !!document.querySelector('#loading'),
      route: document.querySelector('select[aria-label="Island route"]')?.value,
      webgl2: !!document.querySelector('canvas#view')?.getContext('webgl2'),
      userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight]};
  })()`);
  const failures = events.filter((event) => event.method === 'Runtime.exceptionThrown');
  const screenshot = await call('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const png = Buffer.from(screenshot.data, 'base64');
  const valid =
    evidence.webgl2 &&
    evidence.selectedTriangles > 0 &&
    !evidence.loading &&
    failures.length === 0 &&
    png.length > 20_000;
  const result = {
    valid,
    url,
    route: selected,
    evidence,
    screenshotBytes: png.length,
    screenshotSha256: createHash('sha256').update(png).digest('hex'),
    exceptions: failures.map((event) => event.params.exceptionDetails.text),
    backend: 'WebGL2 SwiftShader requested; WebGL2 canvas context verified',
    performance: 'unavailable; this is a software visual/loading smoke test',
  };
  await writeFile(join(output, 'capture.json'), JSON.stringify(result, null, 2));
  if (!valid) throw Error(`3D render not verified: ${JSON.stringify(result)}`);
  await writeFile(join(output, `${route}.png`), png);
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
