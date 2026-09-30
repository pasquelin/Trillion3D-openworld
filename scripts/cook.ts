/**
 * Generates the open world and compiles it into one cache, under `dist/assets/<key>/` (ignored by
 * git, rebuilt on demand; the key is `cook-key.ts`'s): `source/` (glTF),
 * `cache/`, `heights/` and `colliders/` for the physics, `world.json` and `vehicles.json` for
 * the page. `--source-only` skips the compiler. Same seed, same bytes.
 */
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { availableParallelism, totalmem } from 'node:os';
import { dirname, resolve } from 'node:path';
import { buildWorld } from '../generator/build/world.ts';
import { tileColliders } from '../generator/build/colliders.ts';
import { collisionMeshPath, encodeCollisionMesh } from '../page/play/collision.ts';
import { writeWorldGltf } from '../generator/gltf/write.ts';
import { writeHeights } from '../generator/plan/heights.ts';
import { VEHICLE_SPECS } from '../generator/props/vehicles.ts';
import { compileFullCache } from './compiler.ts';
import { islandBuildings } from '../generator/assets/island.ts';
import { appendBuildings } from '../generator/assets/assemble.ts';
import { BUILDING_ASSETS } from '../generator/assets/source.ts';
import { cookKey } from './cook-key.ts';

const assets = resolve(import.meta.dirname, '../dist/assets'),
  out = resolve(assets, cookKey());

const started = performance.now(),
  lap = (label: string) =>
    console.log(`${label}: ${((performance.now() - started) / 1000).toFixed(1)} s`);

// One cook at a time: an older key's folder goes with the rest.
await rm(assets, { recursive: true, force: true });
const { plan, terrain, objects, solids, data } = buildWorld();
const imported = islandBuildings(plan, objects.meshes, objects.instances, data.roads);
lap('world built');
const source = resolve(out, 'source');
// One glTF: the compiler reads exactly one per source folder.
const written = await writeWorldGltf(source, 'world', {
  meshes: [...terrain.meshes, ...objects.meshes, ...imported.foundations],
  instances: [
    ...terrain.instances,
    ...objects.instances,
    ...imported.instances.filter((i) => imported.foundations.some((f) => f.id === i.prop)),
  ],
  lights: objects.lights,
  images: terrain.textures,
});
await appendBuildings(source, imported.instances);
await writeFile(resolve(out, 'imported-buildings.json'), JSON.stringify(imported.buildings));
const sourceBytes = (
    await Promise.all(
      (await readdir(source)).map(async (file) => (await stat(resolve(source, file))).size),
    )
  ).reduce((a, b) => a + b, 0),
  sourceTriangles =
    written.triangles + BUILDING_ASSETS.reduce((sum, asset) => sum + asset.indexedTriangles, 0);
lap('sources written');
await writeHeights(out, plan, data.heightSamples);
const colliders = tileColliders(solids.placed, data.size, data.tile);
await mkdir(resolve(out, 'colliders'), { recursive: true });
let [triangles, bytes] = [0, 0];
for (const [id, mesh] of solids.shapes) {
  const file = resolve(out, 'colliders', collisionMeshPath(id)),
    encoded = encodeCollisionMesh(mesh);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, encoded);
  triangles += mesh.indices.length / 3;
  bytes += encoded.byteLength;
}
console.log(
  `collision meshes: ${solids.shapes.size} props, ${triangles} triangles, ${bytes} bytes`,
);
// Every tile gets its file, empty or not: the physics worker asks for each one it streams.
const tiles = data.size / data.tile;
for (let tx = 0; tx < tiles; tx++)
  for (let tz = 0; tz < tiles; tz++) {
    const key = `${tx}_${tz}`;
    await writeFile(
      resolve(out, 'colliders', `${key}.json`),
      JSON.stringify(colliders.get(key) ?? []),
    );
  }
await writeFile(resolve(out, 'world.json'), JSON.stringify(data));
await writeFile(resolve(out, 'vehicles.json'), JSON.stringify(VEHICLE_SPECS));
lap('physics and page data written');
const { stats } = terrain;
console.log(
  `${written.gltf}: ${sourceTriangles} unique source triangles, ${written.nodes + imported.buildings.length} nodes, ${sourceBytes} bytes`,
  `\nterrain: ${stats.triangles} triangles, threshold ${stats.threshold.toFixed(3)} m, land edge`,
  `mean ${stats.landEdge.mean.toFixed(1)} m, max ${stats.landEdge.max.toFixed(1)} m;`,
  `${stats.textureSize}² texels a tile (${stats.texelsPerMetre.toFixed(3)} per metre),`,
  `${stats.textureBytes} bytes of textures at most`,
);

if (!process.argv.includes('--source-only')) {
  const threads = Math.min(64, availableParallelism());
  compileFullCache({
    cwd: out,
    source: 'source',
    threads,
    ramMb: Math.floor(totalmem() / 2 ** 21),
    simplification: 'qem-endpoints',
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  await rm(resolve(out, 'cache/native/.lock'), { recursive: true, force: true });
  lap(`compiled on ${threads} threads`);
}
