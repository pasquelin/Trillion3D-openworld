import type { Settlement } from './contract.ts';
import type { Point2 } from './polyline.ts';
import { REGION_BOUNDS, REGIONS, landWeights } from './layout.ts';
import { ROAD_STEP, type Ground } from './roads.ts';
const AVENUE = 500;

/**
 * The city's avenues: a grid of straight lines through its footprint, cut where they meet the sea
 * or leave the city's rectangle.
 */
export function avenues(
  city: Settlement,
  ground: Ground,
  lay: (id: string, path: Point2[]) => void,
) {
  const b = REGION_BOUNDS.city,
    inside = (x: number, z: number) =>
      x > b.minX &&
      x < b.maxX &&
      z > b.minZ &&
      z < b.maxZ &&
      landWeights(x, z)[REGIONS.indexOf('city')] > 0.5,
    [cx, , cz] = city.centre,
    r = city.radius,
    lines = Math.floor(r / AVENUE);
  for (const axis of [0, 1])
    for (let k = -lines; k <= lines; k++) {
      let run: Point2[] = [],
        part = 0;
      const flush = () => {
        if (run.length * ROAD_STEP >= AVENUE)
          lay(
            `avenue-${city.id === 'city' ? '' : `${city.id}-`}${axis ? 'z' : 'x'}${k}-${part++}`,
            run,
          );
        run = [];
      };
      const half = Math.sqrt(Math.max(0, r * r - (k * AVENUE) ** 2));
      for (let s = -half; s <= half; s += ROAD_STEP) {
        const [x, z] = axis ? [cx + s, cz + k * AVENUE] : [cx + k * AVENUE, cz + s];
        if (ground.wet(x, z) || !inside(x, z)) flush();
        else run.push([x, z]);
      }
      flush();
    }
}
