/** Grounded date-palm patches around an oasis, on the shared forest stand grid. */
import { hash01, STAND_SIDE } from '../../props/index.ts';
import { standOffsets } from '../stands.ts';
import type { Build } from './build.ts';
import { GROVE } from './catalog.ts';
import type { Point } from './geometry2.ts';

const GARDENS = 180;

/** Require a level, unoccupied patch beyond the planned radial streets. */
export function groveSite(b: Build, [cx, cz]: Point, edge: number): boolean {
  const outer = edge + GARDENS,
    first = (v: number) => Math.floor((v - outer) / STAND_SIDE);
  for (let i = first(cx); (i - 0.5) * STAND_SIDE < cx + outer; i++)
    for (let j = first(cz); (j - 0.5) * STAND_SIDE < cz + outer; j++) {
      const x = (i + 0.5) * STAND_SIDE,
        z = (j + 0.5) * STAND_SIDE,
        r = Math.hypot(x - cx, z - cz);
      if (r <= edge + STAND_SIDE || r >= outer - STAND_SIDE) continue;
      if (b.site.canPlace(GROVE, x, z, 0)) return true;
    }
  return false;
}

/** Palm groves on the patch-grid squares inside the garden ring, a quarter turn each at random. */
export function groves(b: Build, seed: number, [cx, cz]: Point, edge: number, ring: number) {
  const outer = edge + GARDENS,
    first = (v: number) => Math.floor((v - outer) / STAND_SIDE);
  let placed = 0;
  for (let i = first(cx); (i - 0.5) * STAND_SIDE < cx + outer; i++)
    for (let j = first(cz); (j - 0.5) * STAND_SIDE < cz + outer; j++) {
      const [x, z] = [(i + 0.5) * STAND_SIDE, (j + 0.5) * STAND_SIDE],
        r = Math.hypot(x - cx, z - cz);
      if (r < ring + STAND_SIDE || r > outer) continue;
      const grove = b.site.place(
        GROVE,
        x,
        z,
        (Math.floor(hash01(seed + 5, i, j) * 4) * Math.PI) / 2,
      );
      if (grove) {
        placed++;
        grove.position = [
          x,
          Math.min(
            grove.position[1],
            ...standOffsets.map(([dx, dz]) => b.plan.height(x + dx, z + dz)),
          ),
          z,
        ];
      }
    }
  return placed;
}
