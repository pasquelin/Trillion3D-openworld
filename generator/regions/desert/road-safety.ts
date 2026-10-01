/** Require dry, passable ground along the centre and both shoulders of every oasis road. */
import type { TerrainPlan } from '../../plan/plan.ts';
import { waterSurface } from '../../plan/water-surface.ts';
import type { Build } from './build.ts';
import type { Point } from './geometry2.ts';

export function oasisRoadSafety(b: Build) {
  const water = waterSurface(b.plan.rivers, (b.plan as TerrainPlan).lakes);
  const safe = (a: Point, c: Point, width: number) => {
    const dx = c[0] - a[0],
      dz = c[1] - a[1],
      length = Math.hypot(dx, dz),
      steps = Math.max(1, Math.ceil(length / 5));
    for (const side of [-1, 0, 1]) {
      let previous = 0;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps,
          x = a[0] + dx * t - (side * dz * width) / (2 * (length || 1)),
          z = a[1] + dz * t + (side * dx * width) / (2 * (length || 1)),
          height = b.plan.height(x, z),
          surface = Math.max(0, water(x, z) ?? -Infinity);
        if (height <= surface + 0.1 || (k && Math.abs(height - previous) > (length / steps) * 0.1))
          return false;
        previous = height;
      }
    }
    return true;
  };
  return { safe };
}
