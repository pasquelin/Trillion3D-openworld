/**
 * Plants and loose rock over the open desert, until the region's node budget is spent. Where
 * grade permits settlement cacti, succulents, shrubs and boulders grow in clumps; on
 * steeper soil shrubs and tumbleweed hold. Operational strips and roads remain clear.
 */
import { between, hash01 } from '../../props/index.ts';
import type { Build } from './build.ts';

/** Clump members by ground: plain (reg), erg fringe. Relative frequencies by repetition. */
const REG = [
  'desert/cactus-giant',
  'desert/cactus-tall',
  'desert/cactus-young',
  'desert/cactus-young',
  'desert/prickly-pear',
  'desert/agave',
  'desert/agave',
  'desert/barrel-cactus',
  'desert/barrel-cactus',
  'desert/dry-shrub',
  'desert/dry-shrub',
  'desert/dry-shrub',
  'desert/boulder-0',
  'desert/boulder-2',
  'desert/boulder-3',
  'desert/scree-b',
  'desert/outcrop-0',
  'desert/outcrop-1',
  'desert/outcrop-2',
];
const FRINGE = [
  'desert/dry-shrub',
  'desert/dry-shrub',
  'desert/tumbleweed',
  'desert/dead-tree',
  'desert/agave',
];

/** Real dry ownership and local grade determine plants, rather than the former biome rectangle. */
export function scatter(b: Build, target: number) {
  const { minX, minZ, maxX, maxZ } = b.site.bounds;
  for (let x = minX + 9; x < maxX; x += 18)
    for (let z = minZ + 9; z < maxZ; z += 18) {
      if (b.site.instances.length >= target) return;
      const px = x + (hash01(b.seed + 21, x, z) - 0.5) * 6,
        pz = z + (hash01(b.seed + 22, x, z) - 0.5) * 6;
      if (b.plan.biome(px, pz).owner !== 'desert') continue;
      const height = b.plan.height(px, pz),
        grade =
          Math.hypot(
            b.plan.height(px + 5, pz) - b.plan.height(px - 5, pz),
            b.plan.height(px, pz + 5) - b.plan.height(px, pz - 5),
          ) / 10;
      if (height < 1 || grade > 0.7) continue;
      const kind = grade < 0.3 ? REG : FRINGE;
      for (let m = 0; m < 3 && b.site.instances.length < target; m++) {
        const prop = kind[Math.floor(hash01(b.seed + 25, x, z, m) * kind.length)],
          a = hash01(b.seed + 26, x, z, m) * Math.PI * 2,
          radius = m ? between(b.seed + 27, x * 10003 + z + m, 3, 7) : 0,
          size = between(b.seed + 28, x * 10003 + z + m, 0.75, 1.2);
        b.site.place(prop, px + Math.cos(a) * radius, pz + Math.sin(a) * radius, a * 3, {
          scale: size,
        });
      }
    }
}
