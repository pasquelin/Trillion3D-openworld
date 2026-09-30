/** Whole footprints reject sea and river-bank crossings, including water between corners. */
import { Occupancy, segmentBox, xz, type Obb } from './frame.ts';
import { groundUnder, type Site } from './site.ts';

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
  return !rivers.hits(box).length && groundUnder(site, box, 10).every((h) => h > 0.5);
}
