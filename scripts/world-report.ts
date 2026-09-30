/** Actual world placement census and map inputs; contains no render-time performance inference. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { placeWorld } from '../generator/build/world.ts';
import { landCoverage } from '../generator/build/coverage.ts';
import { triangleCount } from '../generator/props/index.ts';
import { cookKey } from './cook-key.ts';
import { REGIONS } from '../generator/regions/index.ts';

const seed = Number(process.argv.find((a) => a.startsWith('--seed='))?.slice(7) ?? 332),
  out = resolve(process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'dist/world-report');
if (!Number.isSafeInteger(seed)) throw new Error('Expected an integer --seed');
const sourceKey = cookKey(),
  started = performance.now(),
  world = placeWorld(seed),
  roads = world.placed.flatMap((region) => region.roads),
  coverage = landCoverage(world.plan, world.instances, world.meshes, roads),
  pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')),
  heights = Array.from({ length: 201 }, (_, z) =>
    Array.from({ length: 201 }, (_, x) => world.plan.height(-4000 + x * 40, -4000 + z * 40)),
  ),
  payload = {
    seed,
    sourceCookKey: sourceKey,
    engineCommit: pkg.trillion3d.commit,
    coverage,
    initialEmptyCells: world.fill.empty,
    initialEligibleCells: world.fill.land,
    infillInstances: world.fill.instances.length,
    ruralHouses: world.instances.filter((i) => i.name?.startsWith('countryside/rural-house/'))
      .length,
    regionalNodes: Object.entries(world.plan.regions).map(([name, region]) => {
      const original = world.placed[REGIONS.findIndex((region) => region.name === name)];
      return {
        name,
        limit: region.budget.nodes,
        placed: original ? original.instances.length + original.movers.length : null,
        infill: world.fill.instances.filter((i) => i.name?.startsWith(`fill/${name}/`)).length,
      };
    }),
    nodes: world.instances.length + world.placed.reduce((n, p) => n + p.movers.length, 0),
    uniqueMeshTriangles: world.meshes.reduce((n, p) => n + triangleCount(p), 0),
    geometryBufferBytes: world.meshes.reduce(
      (n, p) =>
        n +
        p.parts.reduce(
          (n, part) =>
            n +
            part.positions.byteLength +
            part.indices.byteLength +
            (part.normals?.byteLength ?? 0) +
            (part.uvs?.byteLength ?? 0),
          0,
        ),
      0,
    ),
    computationSeconds: (performance.now() - started) / 1000,
    peakRssKiB: process.resourceUsage().maxRSS,
    maxTerrainAltitude40mSample: Math.max(...heights.flat()),
    note: 'Placement source census; cache size and GPU performance require their separate build/runtime checks',
  },
  contentHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if (sourceKey !== cookKey())
  throw new Error('Source changed during census; rerun on a stable tree');
await mkdir(out, { recursive: true });
await writeFile(
  resolve(out, 'world-census.json'),
  JSON.stringify({ ...payload, contentHash }, null, 2) + '\n',
);
await writeFile(
  resolve(out, 'world-map-input.json'),
  JSON.stringify({
    heights,
    roads: [...world.plan.roads, ...roads],
    rivers: world.plan.rivers,
    lakes: world.plan.lakes,
    airfields: world.plan.airfields,
    settlements: world.plan.settlements,
    markers: world.markers,
    instances: world.instances,
  }) + '\n',
);
console.log(JSON.stringify({ ...payload, contentHash }, null, 2));
