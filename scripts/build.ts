/**
 * Builds the page into `dist/`: `index.html`, its words (`i18n/`), its stylesheet (`css/`) and
 * `runtime/` — the engine bundled from its public entry point at the pinned commit (`pnpm
 * engine`), with its workers and codec, the panel kit, the play layer and its physics worker, and
 * Jolt as its package ships it. `dist/assets/<key>/`, the cooked world (`pnpm cook`), is left in
 * place; the page is pointed at the folder of the current key (`cook-key.ts`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { cookKey } from './cook-key.ts';
import { checkoutEngine, ENGINE } from './engine.ts';

const root = resolve(import.meta.dirname, '..'),
  out = resolve(root, 'dist'),
  runtime = resolve(out, 'runtime'),
  browser = resolve(ENGINE, 'packages/sdk-browser/src');

await checkoutEngine();
for (const part of ['runtime', 'css', 'i18n', 'index.html'])
  await rm(resolve(out, part), { recursive: true, force: true });
await mkdir(runtime, { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: {
    engine: resolve(browser, 'index.ts'),
    pageDecodeWorker: resolve(browser, 'page/decode/pageDecodeWorker.ts'),
    pageIntegrationWorker: resolve(browser, 'page/integration/pageIntegrationWorker.ts'),
    kit: 'page/kit/index.ts',
    openworld: 'page/index.ts',
    openworldSim: 'page/play/sim.worker.ts',
  },
  outdir: runtime,
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  supported: { 'template-literal': false },
  logLevel: 'warning',
});
await cp(resolve(browser, 'page/decode/pageCodec.wasm'), resolve(runtime, 'pageCodec.wasm'));
// Jolt finds its WebAssembly beside itself; the physics worker imports it on demand.
for (const file of ['jolt-physics.wasm.js', 'jolt-physics.wasm.wasm'])
  await cp(resolve(root, 'node_modules/jolt-physics/dist', file), resolve(runtime, file));
execFileSync(
  resolve(root, 'node_modules/.bin/tailwindcss'),
  ['-i', 'page/styles.css', '-o', 'dist/css/site.css', '--minify'],
  { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] },
);
await cp(resolve(root, 'page/i18n'), resolve(out, 'i18n'), { recursive: true });
const key = cookKey(),
  page = await readFile(resolve(root, 'page/index.html'), 'utf8');
await writeFile(resolve(out, 'index.html'), page.replace("'./assets/'", `'./assets/${key}/'`));
if (!existsSync(resolve(out, 'assets', key, 'world.json')))
  console.warn(`no cooked world for key ${key}: run \`pnpm cook\` to play the page`);
console.log(`built ${out}`);
