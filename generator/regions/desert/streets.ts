/**
 * The ground a settlement is laid out on: its site (the flattest ground near the plan's centre)
 * and its streets, which join the region's roads and keep every later prop off them.
 */
import { WORLD, type Road, type Settlement, type Vec3 } from '../../plan/contract.ts';
import type { Build } from './build.ts';
import type { Point } from './geometry2.ts';

/** Candidate grounds ordered by relief range, within `reach` and inside the region. */
export function rankedSites(
  b: Build,
  [hx, hz]: Point,
  reach: number,
  margin: number,
  suitable: (x: number, z: number) => boolean = () => true,
): Point[] {
  const { minX, minZ, maxX, maxZ } = b.site.bounds,
    samples = 4096,
    candidates: Point[] = Array.from({ length: samples }, (_, k) => {
      const r = (reach * k) / samples,
        a = k * 2.39996;
      return [hx + r * Math.cos(a), hz + r * Math.sin(a)];
    });
  // Offset grid catches narrow passable shelves between the spiral's samples.
  for (let x = hx - reach + 5; x <= hx + reach; x += 10)
    for (let z = hz - reach + 5; z <= hz + reach; z += 10) candidates.push([x, z]);
  const ranked: { point: Point; score: number }[] = [];
  for (const [candidateX, candidateZ] of candidates) {
    if (Math.hypot(candidateX - hx, candidateZ - hz) > reach) continue;
    const x = Math.min(maxX - margin, Math.max(minX + margin, candidateX)),
      z = Math.min(maxZ - margin, Math.max(minZ + margin, candidateZ));
    if (
      b.plan.height(x, z) <= WORLD.seaLevel + 2 ||
      b.plan.biome(x, z).owner !== 'desert' ||
      !suitable(x, z)
    )
      continue;
    let lo = Infinity,
      hi = -Infinity;
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++) {
        const h = b.plan.height(x + (i * margin) / 5, z + (j * margin) / 5);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    // Dry land only: a site whose lowest ground is under the sea does not count.
    if (lo > WORLD.seaLevel + 2) ranked.push({ point: [x, z], score: hi - lo });
  }
  if (!ranked.length) throw new Error('No dry footprint for desert settlement streets');
  return ranked
    .sort((a, c) => a.score - c.score)
    .slice(0, 12)
    .map((entry) => entry.point);
}

/** A street on the ground through `points`, added to the region's roads and kept clear. */
export function street(b: Build, id: string, cls: Road['class'], width: number, points: Point[]) {
  const ground = points.flatMap(([x, z], i): Vec3[] => {
    if (!i) return [[x, b.plan.height(x, z), z]];
    const [ax, az] = points[i - 1],
      n = Math.max(1, Math.ceil(Math.hypot(x - ax, z - az) / 5));
    return Array.from({ length: n }, (_, k): Vec3 => {
      const t = (k + 1) / n,
        px = ax + (x - ax) * t,
        pz = az + (z - az) * t;
      return [px, b.plan.height(px, pz), pz];
    });
  });
  const road: Road = {
    id,
    class: cls,
    width,
    points: ground,
  };
  b.roads.push(road);
  b.site.keepClear(road);
  return road;
}

/** The desert's settlements from the plan, the largest first (the town, then villages). */
export const settlementsOf = (b: Build): Settlement[] =>
  b.plan.settlements
    .filter((s) => s.region === 'desert' && s.kind !== 'airport')
    .sort((p, q) => q.radius - p.radius || (p.id < q.id ? -1 : 1));
