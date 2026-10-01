/** Exact emitted aquatic triangles provide levels even when initial banks hide their surface. */
import type { River, Vec3 } from './contract.ts';
import type { Lake } from './carve.ts';
import { aquaticParts } from './water.ts';
import { SegmentIndex } from './segments.ts';
import { tileOrigin } from './tileGrid.ts';

type Triangle = readonly [Vec3, Vec3, Vec3];
const interpolate = (triangle: Triangle, x: number, z: number) => {
  const [a, b, c] = triangle,
    det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(det) < 1e-8) return undefined;
  const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det,
    v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det;
  return u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7
    ? u * a[1] + v * b[1] + (1 - u - v) * c[1]
    : undefined;
};
export function waterSurface(rivers: readonly River[], lakes: readonly Lake[] = []) {
  const triangles: Triangle[] = [],
    index = new SegmentIndex();
  for (const [key, parts] of aquaticParts(rivers, lakes)) {
    const [tx, tz] = key.split('_').map(Number);
    for (const part of parts) {
      for (let k = 0; k < part.indices.length; k += 3) {
        const triangle = part.indices
            .slice(k, k + 3)
            .map(
              (i) =>
                [
                  part.positions[i * 3] + tileOrigin(tx),
                  part.positions[i * 3 + 1],
                  part.positions[i * 3 + 2] + tileOrigin(tz),
                ] as Vec3,
            ) as unknown as Triangle,
          x = triangle.reduce((s, p) => s + p[0], 0) / 3,
          z = triangle.reduce((s, p) => s + p[2], 0) / 3,
          radius = Math.max(...triangle.map((p) => Math.hypot(p[0] - x, p[2] - z)));
        triangles.push(triangle);
        index.add(x, z, x, z, radius);
      }
    }
  }
  return (x: number, z: number): number | null => {
    const levels = index
      .near(x, z)
      .map((h) => interpolate(triangles[h.segment], x, z))
      .filter((h): h is number => h !== undefined);
    return levels.length ? Math.max(...levels) : null;
  };
}

/** Physical water needs six metres of deck clearance; broad dry-bank buffers impose no floor. */
export const waterFloor =
  (level: (x: number, z: number) => number | null) => (x: number, z: number) => {
    const water = level(x, z);
    return water === null ? 0.5 : water + 6;
  };
