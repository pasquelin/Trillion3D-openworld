/** Source observations and exact camera workloads; no renderer timing or vehicle acceptance. */
import { writeFile } from 'node:fs/promises';
import { placeWorld } from '../generator/build/world.ts';
import { buildTraversal } from '../generator/traversal/build.ts';
import { cookKey } from './cook-key.ts';
import { pinnedEngine } from './engine.ts';
const { plan, placed, markers, city } = placeWorld();
const manifest = buildTraversal(
  plan,
  [...plan.roads, ...placed.flatMap((o) => o.roads)],
  markers,
  city,
);
manifest.contentHash = cookKey();
manifest.enginePin = pinnedEngine().commit;
const encoded = JSON.stringify(manifest, null, 2);
if (process.argv[2]) await writeFile(process.argv[2], encoded);
else console.log(encoded);
if (manifest.failures.length) process.exitCode = 1;
