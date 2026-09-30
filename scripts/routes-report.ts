/** Source observations and exact camera workloads; no renderer timing or vehicle acceptance. */
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { placeWorld } from '../generator/build/world.ts';
import { solidIndex } from '../generator/build/solids.ts';
import { buildTraversal } from '../generator/traversal/build.ts';
import { cookKey } from './cook-key.ts';
import { pinnedEngine } from './engine.ts';
const { plan, placed, markers, city, solids, meshes } = placeWorld();
const manifest = buildTraversal(
  plan,
  [...plan.roads, ...placed.flatMap((o) => o.roads)],
  markers,
  city,
);
manifest.contentHash = cookKey();
manifest.enginePin = pinnedEngine().commit;
const collision = solidIndex(solids),
  walk = manifest.routes.find((route) => route.id === 'W1'),
  floorErrors = (walk?.samples ?? []).map(({ position: [x, y, z] }) =>
    Math.min(
      Math.abs(plan.height(x, z) - (y - 1.7)),
      ...collision
        .over(x, z)
        .filter((hit) => hit.up)
        .map((hit) => Math.abs(hit.y - (y - 1.7))),
    ),
  ),
  maxFloorError = floorErrors.length ? Math.max(...floorErrors) : null,
  ramps = meshes.filter((mesh) => mesh.id.startsWith('traversal/crossing-'));
if (maxFloorError !== null && maxFloorError > 0.1)
  manifest.failures.push(`W1: collision floor error ${maxFloorError.toFixed(4)} m`);
const encoded = JSON.stringify(
  {
    ...manifest,
    sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    observations: {
      walkMaxCollisionFloorError: maxFloorError,
      walkCollisionRampCount: ramps.length,
      walkCollisionRampTriangles: ramps.reduce(
        (sum, mesh) => sum + mesh.parts.reduce((count, part) => count + part.indices.length / 3, 0),
        0,
      ),
    },
  },
  null,
  2,
);
if (process.argv[2]) await writeFile(process.argv[2], encoded);
else console.log(encoded);
if (manifest.failures.length) process.exitCode = 1;
