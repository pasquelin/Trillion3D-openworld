/** Three tiny compiled scenes to exercise regional loading without cooking the island. */
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { writeWorldGltf } from '../generator/gltf/write.ts';
import { box, plane } from '../generator/props/shapes.ts';
import type { Surface } from '../generator/plan/contract.ts';
import { compileFullCache } from './compiler.ts';
import { checkoutEngine, ENGINE } from './engine.ts';

const out = resolve(import.meta.dirname, '../dist/regional-prototype');
const sourceOnly = process.argv.includes('--source-only');
async function bytes(path: string): Promise<number> {
  const info = await stat(path);
  if (info.isFile()) return info.size;
  return (
    await Promise.all((await readdir(path)).map((item) => bytes(resolve(path, item))))
  ).reduce((sum, size) => sum + size, 0);
}
const color = (name: string, rgb: [number, number, number]): Surface => ({
  name,
  color: [...rgb, 1],
  metalness: 0,
  roughness: 1,
});
const scenes = [
  {
    id: 'proxy',
    mesh: { id: 'ground', parts: [plane(color('ground', [0.24, 0.3, 0.22]), 8000, 8000)] },
    positions: [[0, 0, 0]],
  },
  {
    id: 'west',
    mesh: { id: 'west-tower', parts: [box(color('west', [0.9, 0.23, 0.1]), [80, 160, 80])] },
    positions: [
      [-550, 0, -120],
      [-350, 0, 100],
    ],
  },
  {
    id: 'east',
    mesh: { id: 'east-tower', parts: [box(color('east', [0.12, 0.55, 0.9]), [80, 190, 80])] },
    positions: [
      [350, 0, 100],
      [550, 0, -120],
    ],
  },
] as const;
if (!sourceOnly) await checkoutEngine();
await rm(out, { recursive: true, force: true });
for (const scene of scenes) {
  const folder = resolve(out, scene.id);
  await mkdir(folder, { recursive: true });
  await writeWorldGltf(resolve(folder, 'source'), 'world', {
    meshes: [scene.mesh],
    instances: scene.positions.map((position, i) => ({
      prop: scene.mesh.id,
      position,
      yaw: 0,
      name: `${scene.id}-${i}`,
    })),
    lights: [],
  });
  if (!sourceOnly) {
    compileFullCache({
      cwd: folder,
      source: 'source',
      threads: 2,
      ramMb: 1024,
      simplification: 'none',
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    console.log(
      `${scene.id}: ${((await bytes(resolve(folder, 'cache'))) / 2 ** 20).toFixed(3)} MiB cache`,
    );
  } else
    console.log(
      `${scene.id}: ${((await bytes(resolve(folder, 'source'))) / 2 ** 20).toFixed(3)} MiB source`,
    );
}
if (sourceOnly) process.exit(0);
const browser = resolve(ENGINE, 'packages/sdk-browser/src');
await build({
  entryPoints: {
    engine: resolve(browser, 'index.ts'),
    pageDecodeWorker: resolve(browser, 'page/decode/pageDecodeWorker.ts'),
    pageIntegrationWorker: resolve(browser, 'page/integration/pageIntegrationWorker.ts'),
    physicsWorker: resolve(browser, 'physics/physicsWorker.ts'),
  },
  outdir: out,
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  supported: { 'template-literal': false },
});
await cp(resolve(browser, 'page/decode/pageCodec.wasm'), resolve(out, 'pageCodec.wasm'));
for (const file of ['joltPhysics.wasm', 'joltPhysicsThreads.wasm'])
  await cp(resolve(browser, 'physics', file), resolve(out, file));
await writeFile(
  resolve(out, 'index.html'),
  await readFile(resolve(import.meta.dirname, '../page/regional-prototype.html')),
);
