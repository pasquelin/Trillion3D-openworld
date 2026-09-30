/** Small reproducible source/cook fixture; never deletes or cooks the normal world. */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { writeWorldGltf } from '../generator/gltf/write.ts';
import { appendBuildings } from '../generator/assets/assemble.ts';
import { BUILDING_ASSETS } from '../generator/assets/source.ts';
import { buildWorkload, WORKLOADS, type WorkloadName } from '../generator/workloads/fixture.ts';
import { compileFullCache } from './compiler.ts';
import { pinnedEngine } from './engine.ts';
import type { ClusterManifest } from 'trillion3d-engine';

const name = (process.argv[2] ?? 'one-block') as WorkloadName;
if (!Object.hasOwn(WORKLOADS, name))
  throw new Error(`Expected ${Object.keys(WORKLOADS).join(', ')}`);
const root = resolve(import.meta.dirname, '../dist/workloads', name),
  source = resolve(root, 'source'),
  fixture = buildWorkload(name);
await mkdir(source, { recursive: true });
await writeWorldGltf(source, 'world', {
  meshes: fixture.meshes,
  instances: fixture.instances.filter((i) => !BUILDING_ASSETS.some((a) => a.id === i.prop)),
  lights: [],
});
await appendBuildings(source, fixture.instances);
const hash = createHash('sha256');
let sourceBytes = 0;
for (const file of (await readdir(source)).sort()) {
  const bytes = await readFile(resolve(source, file));
  hash.update(file).update(bytes);
  sourceBytes += bytes.length;
}
const report = {
  ...fixture.report,
  engineCommit: pinnedEngine().commit,
  sourceHash: hash.digest('hex'),
  sourceBytes,
  cookedBytes: null as number | null,
  reload: null as {
    primitives: number;
    compilerInstanceExpandedTriangles: number;
    texturePreviews: number;
  } | null,
};
if (!process.argv.includes('--source-only')) {
  compileFullCache({
    cwd: root,
    source: 'source',
    threads: 2,
    ramMb: 2048,
    simplification: 'qem-endpoints',
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const pointer = JSON.parse(
      await readFile(resolve(root, 'cache/native/full/manifest.json'), 'utf8'),
    ),
    manifestPath = resolve(root, 'cache/native/full', pointer.url),
    cache = dirname(manifestPath),
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  // Runtime-only public entry: source-only/quick gates do not need an engine checkout.
  const { readPagedManifest } = await import(
    new URL('../.engine/packages/sdk-core/src/index.ts', import.meta.url).href
  );
  const loaded: ClusterManifest = await readPagedManifest(
    manifest,
    async (page: { url: string }) => new Uint8Array(await readFile(resolve(cache, page.url))),
  );
  if (!loaded.primitives.length) throw new Error('Cooked fixture reloaded without primitives');
  if (loaded.sourceTriangles !== report.instanceExpandedTriangles)
    throw new Error('Cooked instance-expanded input count differs from the authored fixture');
  report.reload = {
    primitives: loaded.primitives.length,
    compilerInstanceExpandedTriangles: loaded.sourceTriangles,
    texturePreviews: loaded.texturePreviews?.length ?? 0,
  };
  const treeBytes = async (dir: string): Promise<number> => {
    let size = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      size += entry.isDirectory() ? await treeBytes(path) : (await stat(path)).size;
    }
    return size;
  };
  report.cookedBytes = await treeBytes(resolve(root, 'cache'));
  if (report.cookedBytes > report.cacheEnvelopeBytes)
    throw new Error('Fixture exceeds cache envelope');
}
await writeFile(resolve(root, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
