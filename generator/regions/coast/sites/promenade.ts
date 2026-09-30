/** A beach walk follows dry ground and stops at river mouths instead of joining across water. */
import type { Vec3 } from '../../../plan/contract.ts';
import { waterSurface } from '../../../plan/water-surface.ts';
import type { ShoreFrame } from './frame.ts';
import type { Layout } from './layout.ts';

export function promenade(layout: Layout, f: ShoreFrame, half: number, width: number, dry: number) {
  const water = waterSurface(layout.map.plan.rivers),
    chunks: Vec3[][] = [],
    points: Vec3[] = [];
  const drySegment = (a: Vec3, b: Vec3) => {
    const dx = b[0] - a[0],
      dz = b[2] - a[2],
      length = Math.hypot(dx, dz),
      steps = Math.max(1, Math.ceil(length / 10));
    return Array.from({ length: steps + 1 }, (_, k) => k / steps).every((t) =>
      [-1, 0, 1].every((side) => {
        const x = a[0] + t * dx - (dz / (length || 1)) * (width / 2 + 2) * side,
          z = a[2] + t * dz + (dx / (length || 1)) * (width / 2 + 2) * side,
          level = Math.max(0, water(x, z) ?? 0),
          h = layout.map.height(x, z);
        return h > level + 0.1 && a[1] + t * (b[1] - a[1]) > level + 0.1;
      }),
    );
  };
  let chunk: Vec3[] = [];
  for (let u = -half; u <= half; u += 20) {
    const v = f.inland(u, dry);
    if (v === undefined) {
      if (chunk.length) chunks.push(chunk);
      chunk = [];
      continue;
    }
    const [x, z] = f.at(u, v + width / 2 + 2),
      b = layout.map.bounds,
      p: Vec3 = [x, layout.map.height(x, z), z];
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || !drySegment(p, p)) {
      if (chunk.length) chunks.push(chunk);
      chunk = [];
      continue;
    }
    if (chunk.length && !drySegment(chunk.at(-1)!, p)) {
      chunks.push(chunk);
      chunk = [];
    }
    chunk.push(p);
    points.push(p);
  }
  if (chunk.length) chunks.push(chunk);
  chunks
    .filter((c) => c.length > 2)
    .forEach((c, i) =>
      layout.addRoad({
        id: i ? `coast/promenade-${i}` : 'coast/promenade',
        class: 'street',
        width,
        points: c,
      }),
    );
  return points;
}
