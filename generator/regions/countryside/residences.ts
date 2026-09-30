/** Small residential ribbons and isolated homes reuse the village houses and their foundations. */
import { SegmentIndex } from '../../plan/segments.ts';
import { hash01 } from '../../props/index.ts';
import { onOperationalAirfield } from '../../plan/airfields.ts';
import { isTerrainPlan } from '../../plan/plan.ts';
import { HOUSES } from './houses.ts';
import type { Land } from './land.ts';
import type { Site } from './site.ts';

export function placeResidences(site: Site, land: Land, seed: number, limit = 4_000) {
  const roads = new SegmentIndex(),
    bounds = site.bounds;
  for (const road of site.plan.roads)
    if (road.class !== 'highway' && road.class !== 'dirt')
      for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i - 1],
          b = road.points[i];
        roads.add(a[0], a[2], b[0], b[2], 300);
      }
  let houses = 0;
  // Fifty metre plots, with small deterministic shifts rather than identical rows.
  for (let x = bounds.minX + 25; x < bounds.maxX; x += 50)
    for (let z = bounds.minZ + 25; z < bounds.maxZ; z += 50) {
      if (houses >= limit) return houses;
      const px = x + (hash01(seed, x, z) - 0.5) * 12,
        pz = z + (hash01(seed + 1, x, z) - 0.5) * 12,
        height = site.plan.height(px, pz);
      if (height < 8 || height > 250 || land.forest(px, pz) > 0.15) continue;
      if (isTerrainPlan(site.plan) && onOperationalAirfield(site.plan.airfields, px, pz, 100))
        continue;
      const hits = roads.near(px, pz).sort((a, b) => a.distance - b.distance);
      if (!hits.length || hits[0].distance < 25) continue;
      // Close to access routes, open farmland retains occasional isolated houses.
      if (hits[0].distance > 150 && hash01(seed + 2, x, z) > 0.3) continue;
      const hit = hits[0],
        i = hit.segment,
        rx = roads.ax[i] + hit.t * (roads.bx[i] - roads.ax[i]),
        rz = roads.az[i] + hit.t * (roads.bz[i] - roads.az[i]),
        yaw = Math.atan2(rx - px, rz - pz),
        spec = HOUSES[Math.floor(hash01(seed + 3, x, z) * HOUSES.length)];
      if (
        !site.place(spec.id, px, pz, yaw, {
          seat: 'plinth',
          name: `countryside/rural-house/${x}/${z}`,
        })
      )
        continue;
      houses++;
      site.place('bush-round', px - Math.sin(yaw) * 12, pz - Math.cos(yaw) * 12, yaw);
    }
  return houses;
}
