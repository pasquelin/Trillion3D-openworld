/** Small, individually checked plots on cells cut by an authored diagonal avenue. */
import { dryFootprint } from './dry-footprint.ts';
import { corners, sidewaysOf, turn, type Obb } from './frame.ts';
import { gridPoint, key, type Cell } from './grid.ts';
import { KERB } from './ground-props.ts';
import { RANK, TOUCH, type Placer } from './placement.ts';
import { groundUnder, inBounds } from './site.ts';
import { TERRACE_HALF } from './terrace.ts';
import { FOUNDATION } from './tower-kit.ts';

/** Terrain under one candidate must fit its buried foundation or a tree's root. */
function level(placer: Placer, box: Obb, limit: number) {
  if (!dryFootprint(placer.site, box)) return undefined;
  const heights = groundUnder(placer.site, box, 8);
  const low = Math.min(...heights),
    high = Math.max(...heights);
  return high - low <= limit ? (high + low) / 2 : undefined;
}

export function fillAvenueGaps(placer: Placer, cells: Map<string, Cell>) {
  const site = placer.site,
    reach = Math.ceil(site.city.radius / site.pitch) + 2;
  for (let i = -reach; i < reach; i++)
    for (let j = -reach; j < reach; j++) {
      if (cells.has(key(i, j))) continue;
      const centre = gridPoint(site, [(i + 0.5) * site.pitch, (j + 0.5) * site.pitch]),
        block: Obb = { centre, half: [site.block / 2, site.block / 2], yaw: site.yaw },
        d = Math.hypot(centre[0] - site.city.centre[0], centre[1] - site.city.centre[2]);
      if (
        d > site.city.radius * 0.9 ||
        !inBounds(site, centre, site.pitch / 2) ||
        !site.roads.hits(block, TOUCH).length
      )
        continue;
      const inside = (box: Obb) =>
        corners(box).every((p) => {
          const [u, v] = turn([p[0] - centre[0], p[1] - centre[1]], -site.yaw);
          // A frontage may continue a few metres across a grid seam. Complete footprints
          // still pass the placer's road, water and building checks.
          return Math.abs(u) <= block.half[0] + 8 && Math.abs(v) <= block.half[1] + 8;
        });
      // Sample the actual avenue centerline every 46 m. A 6 m setback leaves a walkable verge;
      // each row faces the road, and neighbouring 42 m terraces leave a 4 m passage.
      for (const road of site.roadList)
        for (let segment = 1; segment < road.points.length; segment++) {
          const a = road.points[segment - 1],
            b = road.points[segment],
            dx = b[0] - a[0],
            dz = b[2] - a[2],
            length = Math.hypot(dx, dz);
          if (!length) continue;
          const tangent: [number, number] = [dx / length, dz / length],
            normal: [number, number] = [-tangent[1], tangent[0]],
            yaw = sidewaysOf(tangent),
            setback = road.width / 2 + 6 + TERRACE_HALF[1];
          for (let distance = 23; distance < length; distance += 46)
            for (const side of [-1, 1]) {
              const x = a[0] + tangent[0] * distance + normal[0] * side * setback,
                z = a[2] + tangent[1] * distance + normal[1] * side * setback,
                box: Obb = { centre: [x, z], half: TERRACE_HALF, yaw };
              if (inside(box)) {
                const base = level(placer, box, FOUNDATION - KERB);
                if (base !== undefined)
                  placer.place(
                    'city/terrace',
                    [x, base + KERB, z],
                    yaw + (side > 0 ? Math.PI : 0),
                    'solid',
                    RANK.structure,
                    box,
                    { support: base + KERB - FOUNDATION },
                  );
              }
              // Mature oaks mark alternate passages on the road verge, with broad crowns
              // but only one tree node per 92 m on each side.
              if (Math.round((distance - 23) / 46) % 2) continue;
              const along = distance + 23,
                offset = road.width / 2 + 4,
                tx = a[0] + tangent[0] * along + normal[0] * side * offset,
                tz = a[2] + tangent[1] * along + normal[1] * side * offset,
                tree: Obb = { centre: [tx, tz], half: [2, 2], yaw: site.yaw };
              if (along >= length || !inside(tree)) continue;
              const ground = level(placer, tree, 1.5);
              if (ground !== undefined)
                placer.place(
                  'tree-oak-large',
                  [tx, ground, tz],
                  site.yaw,
                  'solid',
                  RANK.garden,
                  tree,
                  { scale: [1.5, 1.25, 1.5] },
                );
            }
        }
    }
}
