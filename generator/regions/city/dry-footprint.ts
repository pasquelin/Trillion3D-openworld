/** City footprints additionally keep away from river banks and inland lakes. */
import { Occupancy, segmentBox, turn, xz, type Obb } from './frame.ts';
import type { Site } from './site.ts';
import { dryFootprint as drySeaFootprint } from '../../plan/dry.ts';
import { isTerrainPlan } from '../../plan/plan.ts';

const banks = new WeakMap<Site, Occupancy<boolean>>();
export function dryFootprint(site: Site, box: Obb) {
  let rivers = banks.get(site);
  if (!rivers) {
    rivers = new Occupancy<boolean>(120);
    for (const river of site.plan.rivers) {
      const width = Math.max(...river.widths) / 2 + 15;
      for (let k = 1; k < river.points.length; k++)
        rivers.add(segmentBox(xz(river.points[k - 1]), xz(river.points[k]), width), true);
    }
    banks.set(site, rivers);
  }
  if (rivers.hits(box).length) return false;
  if (isTerrainPlan(site.plan))
    for (const lake of site.plan.lakes) {
      const [x, z] = turn([lake.x - box.centre[0], lake.z - box.centre[1]], -box.yaw);
      const dx = Math.max(0, Math.abs(x) - box.half[0]);
      const dz = Math.max(0, Math.abs(z) - box.half[1]);
      if (Math.hypot(dx, dz) <= lake.radius) return false;
    }
  return drySeaFootprint(
    (x, z) => site.plan.height(x, z) - 0.5,
    box.centre[0],
    box.centre[1],
    box.half[0],
    box.half[1],
    box.yaw,
  );
}
