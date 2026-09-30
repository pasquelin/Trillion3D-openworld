/** A cell-centered 25 m census of composed terrain and four-neighbour dry components. */
import { createHash } from 'node:crypto';
import { WORLD, type WorldPlan } from './contract.ts';

export function islandCensus(plan: Pick<WorldPlan, 'height'>) {
  const step = 25,
    side = WORLD.size / step,
    dry = new Uint8Array(side * side),
    half = WORLD.size / 2,
    hash = createHash('sha256');
  let land = 0,
    borderDry = 0,
    highest = -Infinity;
  for (let j = 0; j < side; j++)
    for (let i = 0; i < side; i++) {
      const x = -half + (i + 0.5) * step,
        z = -half + (j + 0.5) * step,
        h = plan.height(x, z);
      if (!Number.isFinite(h)) throw new Error(`Nonfinite terrain at ${x}, ${z}`);
      hash.update(`${h},`);
      highest = Math.max(highest, h);
      if (h <= WORLD.seaLevel) continue;
      dry[j * side + i] = 1;
      land++;
      if (Math.max(Math.abs(x), Math.abs(z)) >= half - 250) borderDry++;
    }
  const components: number[] = [];
  for (let start = 0; start < dry.length; start++) {
    if (!dry[start]) continue;
    const queue = [start];
    dry[start] = 0;
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head],
        x = at % side;
      for (const next of [x > 0 ? at - 1 : -1, x + 1 < side ? at + 1 : -1, at - side, at + side]) {
        if (next < 0 || next >= dry.length || !dry[next]) continue;
        dry[next] = 0;
        queue.push(next);
      }
    }
    components.push((queue.length * step ** 2) / 1e6);
  }
  return {
    gridMetres: step,
    measuredLandKm2: (land * step ** 2) / 1e6,
    borderDry,
    highestMetres: highest,
    componentsKm2: components.sort((a, b) => b - a),
    digest: hash.digest('hex'),
  };
}
