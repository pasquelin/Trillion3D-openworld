/** Road access and a clear 1.2 m sidewalk circuit from actual accepted street segments. */
import type { Vec3 } from '../../plan/contract.ts';
import { overlaps, segmentBox, turn, type Xz } from './frame.ts';
import { gridPoint, key, type Cell } from './grid.ts';
import { KERB } from './ground-props.ts';
import type { Item } from './placement.ts';
import { at, type Segment } from './segments.ts';
import type { Site } from './site.ts';
import { segmentId, type StreetAccessGraph } from './access-graph.ts';

export function districtAccess(
  site: Site,
  blocks: Cell[],
  segments: Segment[],
  kept: Item[],
  network: StreetAccessGraph,
) {
  const ids = new Set(blocks.map((c) => key(c.i, c.j)));
  const adjoining = segments.filter((s) => s.sides.some((c) => c && ids.has(key(c.i, c.j))));
  const connections = adjoining
    .filter(
      (s) =>
        network.roadComponents.get(segmentId(s))?.has(network.main!) &&
        s.sides.some((c) => c && !ids.has(key(c.i, c.j))),
    )
    .map((s) => ({
      id: `${s.axis}${s.i},${s.j}`,
      position: at({ site }, s.axis, s.i, s.j, site.pitch / 2, 0),
    }));
  const edges = new Set(adjoining.map((s) => `${s.axis}${s.i},${s.j}`));
  const sidewalkLoops: { cellId: string; points: Vec3[] }[] = [];
  for (const cell of blocks) {
    if (
      ![
        `h${cell.i},${cell.j}`,
        `h${cell.i},${cell.j + 1}`,
        `v${cell.i},${cell.j}`,
        `v${cell.i + 1},${cell.j}`,
      ].every((e) => edges.has(e))
    )
      continue;
    const half = site.block / 2 - 4.3;
    const points: Xz[] = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
      [-half, -half],
    ].map(([u, v]) => {
      const [x, z] = turn([u, v], site.yaw);
      return [cell.box.centre[0] + x, cell.box.centre[1] + z];
    });
    const blocked = points.slice(1).some((p, k) => {
      const lane = segmentBox(points[k], p, 0.6);
      return kept.some((i) => i.kind === 'solid' && i.box && overlaps(lane, i.box));
    });
    if (!blocked) {
      sidewalkLoops.push({
        cellId: key(cell.i, cell.j),
        points: points.map(([x, z]) => [x, cell.base + KERB, z]),
      });
    }
  }
  const reached = new Set<number>();
  for (const s of adjoining)
    for (const c of network.roadComponents.get(segmentId(s)) ?? []) reached.add(c);
  return {
    roadConnections: connections,
    roadConnectedComponents: reached.size,
    rejectedRoadSegments: network.rejected,
    sidewalkLoop: sidewalkLoops[0]?.points ?? null,
    sidewalkLoops,
    sidewalkWidthM: 1.2,
    center: blocks.length
      ? gridPoint(site, [(blocks[0].i + 0.5) * site.pitch, (blocks[0].j + 0.5) * site.pitch])
      : null,
  };
}
