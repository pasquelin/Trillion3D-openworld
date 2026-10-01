/** Connected partial parcels in blocks cut by the authored roads. */
import { dryFootprint } from './dry-footprint.ts';
import { corners, polylineDistance, turn, type Obb } from './frame.ts';
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

/** A frontage must follow a continuous, already emitted road along its grid edge. */
function hasStreet(placer: Placer, i: number, j: number, axis: 'h' | 'v') {
  const id = `city/avenue-${axis}${i}_${j}`;
  if (placer.roads.some((road) => road.id === id)) return true;
  const site = placer.site;
  const samples = [0.25, 0.75].map((fraction) =>
    gridPoint(
      site,
      axis === 'h'
        ? [(i + fraction) * site.pitch, j * site.pitch]
        : [i * site.pitch, (j + fraction) * site.pitch],
    ),
  );
  return site.roadList.some((road) =>
    samples.every((sample) => polylineDistance(sample, road.points) <= road.width / 2 + 1),
  );
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
          return Math.abs(u) <= block.half[0] && Math.abs(v) <= block.half[1];
        });
      const horizontal = [hasStreet(placer, i, j, 'h'), hasStreet(placer, i, j + 1, 'h')],
        vertical = [hasStreet(placer, i, j, 'v'), hasStreet(placer, i + 1, j, 'v')],
        useHorizontal = horizontal.filter(Boolean).length >= vertical.filter(Boolean).length,
        edges = useHorizontal ? horizontal : vertical;
      // Two fronts flank a four-metre service passage; their second row uses the
      // ten-metre passage behind the street-facing row. Each group reaches its existing street.
      for (let edge = 0; edge < 2; edge++) {
        if (!edges[edge]) continue;
        const sign = edge ? 1 : -1;
        for (const setback of [38, 15])
          for (const along of [-23, 23]) {
            const [u, v] = useHorizontal ? [along, sign * setback] : [sign * setback, along];
            const [x, z] = gridPoint(site, [
              (i + 0.5) * site.pitch + u,
              (j + 0.5) * site.pitch + v,
            ]);
            const yaw = site.yaw + (useHorizontal ? 0 : Math.PI / 2);
            const box: Obb = { centre: [x, z], half: TERRACE_HALF, yaw };
            if (!inside(box)) continue;
            const base = level(placer, box, FOUNDATION - KERB);
            if (base !== undefined)
              placer.place(
                'city/terrace',
                [x, base + KERB, z],
                yaw + (sign > 0 ? Math.PI : 0),
                'solid',
                RANK.structure,
                box,
                { support: base + KERB - FOUNDATION },
              );
          }
        const [x, z] = gridPoint(site, [
          (i + 0.5) * site.pitch + (useHorizontal ? 0 : sign * 47),
          (j + 0.5) * site.pitch + (useHorizontal ? sign * 47 : 0),
        ]);
        const tree: Obb = { centre: [x, z], half: [2, 2], yaw: site.yaw };
        if (!inside(tree)) continue;
        const ground = level(placer, tree, 1.5);
        if (ground !== undefined)
          placer.place('tree-oak-large', [x, ground, z], site.yaw, 'solid', RANK.garden, tree, {
            scale: [1.5, 1.25, 1.5],
          });
      }
    }
}
