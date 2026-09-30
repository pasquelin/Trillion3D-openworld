/** Keep every oasis road surface above the exact emitted sea, lake and river water. */
import type { Vec3 } from '../../plan/contract.ts';
import type { TerrainPlan } from '../../plan/plan.ts';
import { waterSurface } from '../../plan/water-surface.ts';
import { hash01 } from '../../props/index.ts';
import type { Build } from './build.ts';
import type { Point } from './geometry2.ts';
import { nearest } from './streets.ts';

export function oasisRoadSafety(
  b: Build,
  edge: number,
  civic: boolean,
  highway: readonly Vec3[] | undefined,
  seed: number,
  ringRadius: number,
  streetWidth: number,
) {
  const water = waterSurface(b.plan.rivers, (b.plan as TerrainPlan).lakes);
  const clear = (a: Point, c: Point, width: number) => {
    const dx = c[0] - a[0],
      dz = c[1] - a[1],
      length = Math.hypot(dx, dz),
      steps = Math.max(1, Math.ceil(length / 5));
    return Array.from({ length: steps + 1 }, (_, k) => k / steps).every((t) =>
      [-1, 0, 1].every((side) => {
        const x = a[0] + dx * t - (side * dz * width) / (2 * (length || 1)),
          z = a[1] + dz * t + (side * dx * width) / (2 * (length || 1)),
          surface = Math.max(0, water(x, z) ?? -Infinity);
        return b.plan.height(x, z) > surface + 0.1;
      }),
    );
  };
  const suitable = (x: number, z: number) => {
    const join = civic && highway ? nearest(highway, [x, z], 8000) : undefined,
      toward = join ? Math.atan2(join[1] - z, join[0] - x) : hash01(seed, 7) * Math.PI * 2,
      polar = (r: number, a: number): Point => [x + r * Math.cos(a), z + r * Math.sin(a)],
      ring = Array.from({ length: 41 }, (_, i) =>
        polar(ringRadius, toward + (i / 40) * Math.PI * 2),
      );
    return (
      ring.slice(1).every((p, i) => clear(ring[i], p, streetWidth)) &&
      [0, 1, 2, 3].every((k) => {
        const a = toward + (k * Math.PI) / 2;
        return clear(polar(ringRadius, a), polar(edge, a), streetWidth);
      })
    );
  };
  return { clear, suitable };
}
