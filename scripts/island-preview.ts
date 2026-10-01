/** Cook a separate, small view of the generated island around the downtown marker. */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { placeWorld } from '../generator/build/world.ts';
import { terrainTiles } from '../generator/plan/tiles.ts';
import { WORLD, type Instance } from '../generator/plan/contract.ts';
import { REGIONS } from '../generator/regions/index.ts';
import { islandBuildings } from '../generator/assets/island.ts';
import { appendBuildings } from '../generator/assets/assemble.ts';
import { BUILDING_ASSETS } from '../generator/assets/source.ts';
import { partBounds } from '../generator/props/geometry.ts';
import { writeWorldGltf } from '../generator/gltf/write.ts';
import { compileFullCache } from './compiler.ts';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist/island-preview');
const started = performance.now();
const { plan, placed, meshes, instances, markers } = placeWorld();
const camera = markers.find(
  (marker) => marker.kind === 'teleport' && marker.name === 'city/downtown',
);
if (!camera || camera.kind !== 'teleport')
  throw new Error('No downtown marker in generated island');

// Two by two kilometres around downtown, with enough room for buildings at the edge.
const tiles = WORLD.size / WORLD.tile;
const tileAt = (position: number) => Math.floor((position + WORLD.size / 2) / WORLD.tile);
const first = (position: number) => Math.max(0, Math.min(tiles - 2, tileAt(position) - 1));
const minTx = first(camera.position[0]);
const minTz = first(camera.position[2]);
const window = { minTx, minTz, maxTx: minTx + 1, maxTz: minTz + 1 };
const terrain = terrainTiles(plan, REGIONS, window);
const margin = 120;
const within = (position: readonly number[]) =>
  position[0] >= minTx * WORLD.tile - WORLD.size / 2 - margin &&
  position[0] <= (minTx + 2) * WORLD.tile - WORLD.size / 2 + margin &&
  position[2] >= minTz * WORLD.tile - WORLD.size / 2 - margin &&
  position[2] <= (minTz + 2) * WORLD.tile - WORLD.size / 2 + margin;
const roads = [...plan.roads, ...placed.flatMap((region) => region.roads)];
const imported = islandBuildings(plan, meshes, instances, roads);
const selected = [...instances, ...imported.instances].filter((item) => within(item.position));
const tower = selected.find((item) => item.name === 'city/tower-round-310-0');
const distant = selected.find((item) => item.name === 'city/tower-diagrid-200-0');
const skyline = selected.find((item) => item.name === 'city/tower-twist-160-1');
const vantage = selected.find((item) => item.name === 'city/street-lamp-4');
const towerMesh = meshes.find((mesh) => mesh.id === tower?.prop);
if (!tower || !towerMesh || !distant || !skyline || !vantage)
  throw new Error('Preview tower landmarks are missing');
const [, towerMax] = partBounds(towerMesh.parts);
const assetIds = new Set(BUILDING_ASSETS.map((asset) => asset.id));
const generated = selected.filter((item) => !assetIds.has(item.prop));
const used = new Set(generated.map((item) => item.prop));
const allMeshes = [...meshes, ...imported.foundations];
const selectedMeshes = allMeshes.filter((mesh) => used.has(mesh.id));
const selectedLights = placed
  .flatMap((region) => region.lights)
  .filter((lamp) => within(lamp.position));
const source = resolve(out, 'source');

await rm(out, { recursive: true, force: true });
await mkdir(source, { recursive: true });
await writeWorldGltf(source, 'world', {
  meshes: [...terrain.meshes, ...selectedMeshes],
  instances: [...terrain.instances, ...generated] as Instance[],
  lights: selectedLights,
  images: terrain.textures,
});
if (selected.some((item) => assetIds.has(item.prop))) await appendBuildings(source, selected);
await writeFile(
  resolve(out, 'preview.json'),
  JSON.stringify({
    label: 'Generated island — downtown subset (2 × 2 km)',
    camera,
    window,
    terrainTiles: terrain.instances.length,
    objects: selected.length,
    importedBuildings: selected.filter((item) => assetIds.has(item.prop)).length,
    views: {
      neighborhood: {
        label: 'Neighborhood',
        position: [camera.position[0], camera.position[1] + 25, camera.position[2] + 90],
        target: [camera.position[0], camera.position[1] + 9, camera.position[2] - 80],
        far: 800,
      },
      towers: {
        label: 'Downtown towers',
        position: [vantage.position[0], vantage.position[1] + 48, vantage.position[2]],
        target: [skyline.position[0], skyline.position[1] + 80, skyline.position[2]],
        far: 800,
      },
      aerial: {
        label: 'Tower rooftop',
        position: [tower.position[0], tower.position[1] + towerMax[1] + 18, tower.position[2]],
        target: [distant.position[0], distant.position[1] + 20, distant.position[2]],
        far: 800,
      },
      district: {
        label: 'Rooftop district',
        position: [tower.position[0], tower.position[1] + towerMax[1] + 18, tower.position[2]],
        target: [vantage.position[0], vantage.position[1] + 10, vantage.position[2]],
        far: 800,
      },
    },
  }),
);
await cp(resolve(root, 'page/island-preview.html'), resolve(root, 'dist/island-preview.html'));
console.log(`Preview source ready in ${((performance.now() - started) / 1000).toFixed(1)} s`);
if (!process.argv.includes('--source-only')) {
  compileFullCache({
    cwd: out,
    source: 'source',
    threads: 2,
    ramMb: 2048,
    simplification: 'qem-endpoints',
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  console.log(`Preview cache ready in ${((performance.now() - started) / 1000).toFixed(1)} s`);
}
