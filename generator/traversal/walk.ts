import type { buildCity } from '../regions/city/index.ts';
import { Occupancy, segmentBox, turn, type Obb } from '../regions/city/frame.ts';
import type { Vec3 } from '../plan/contract.ts';
import { crossingPath, crossingRamp } from './crossings.ts';
import { sampleRoute } from './samples.ts';
import { solidColliders } from '../build/colliders.ts';
import { solidIndex } from '../build/solids.ts';

type City = ReturnType<typeof buildCity>;
/** Outer perimeter of three contiguous blocks. Internal boundaries never cut through buildings. */
export function walkingRoutes(city: City) {
  const pavement = solidIndex(
    solidColliders(
      city.output.props.filter((p) => p.id.startsWith('city/block-')),
      city.output.instances.filter((p) => p.prop.startsWith('city/block-')),
    ),
  );
  const support = (x: number, z: number) =>
    Math.max(
      city.site.plan.height(x, z),
      ...[-0.6, 0, 0.6].flatMap((dx) =>
        [-0.6, 0, 0.6].flatMap((dz) =>
          pavement
            .over(x + dx, z + dz)
            .filter((p) => p.up)
            .map((p) => p.y),
        ),
      ),
    );
  const loops = new Map(
    city.report.districts.flatMap((d) =>
      d.sidewalkLoops.map((loop) => [loop.cellId, { ...loop, district: d.id }] as const),
    ),
  );
  const solids = new Occupancy<Obb>(125);
  for (const item of city.kept)
    if (item.kind === 'solid' && item.box) solids.add(item.box, item.box);
  const neighbors = (id: string) => {
    const [i, j] = id.split(',').map(Number);
    return [`${i - 1},${j}`, `${i + 1},${j}`, `${i},${j - 1}`, `${i},${j + 1}`].filter((k) =>
      loops.has(k),
    );
  };
  const seen = new Set<string>();
  const rejected: string[] = [];
  for (const first of loops.keys())
    for (const middle of neighbors(first))
      for (const last of neighbors(middle)) {
        const ids = [first, middle, last],
          signature = [...ids].sort().join(';');
        if (seen.has(signature)) continue;
        seen.add(signature);
        if (
          new Set(ids.map((id) => loops.get(id)!.district)).size !== 3 ||
          ids.some((id) => !['suburb', 'midrise', 'downtown'].includes(loops.get(id)!.district))
        )
          continue;
        const edges: { from: string; to: string; a: Vec3; b: Vec3 }[] = [];
        for (const id of ids) {
          const [i, j] = id.split(',').map(Number),
            loop = loops.get(id)!;
          const corners = [`${i},${j}`, `${i + 1},${j}`, `${i + 1},${j + 1}`, `${i},${j + 1}`],
            across = [`${i},${j - 1}`, `${i + 1},${j}`, `${i},${j + 1}`, `${i - 1},${j}`];
          for (let k = 0; k < 4; k++)
            if (!ids.includes(across[k]))
              edges.push({
                from: corners[k],
                to: corners[(k + 1) % 4],
                a: loop.points[k],
                b: loop.points[(k + 1) % 4],
              });
        }
        const ordered = [edges[0]];
        while (ordered.length < edges.length) {
          const next = edges.find((e) => e.from === ordered.at(-1)!.to && !ordered.includes(e));
          if (!next) break;
          ordered.push(next);
        }
        if (ordered.length !== edges.length || ordered.at(-1)!.to !== ordered[0].from) continue;
        const path: Vec3[] = [],
          ramps: ReturnType<typeof crossingRamp>[] = [];
        let clear = true;
        for (let k = 0; k < ordered.length; k++) {
          const edge = ordered[k],
            next = ordered[(k + 1) % ordered.length];
          path.push(edge.a, edge.b);
          if (Math.hypot(edge.b[0] - next.a[0], edge.b[2] - next.a[2]) > 0.01) {
            const delta = turn([next.a[0] - edge.b[0], next.a[2] - edge.b[2]], -city.site.yaw);
            const joins: Vec3[] = [edge.b];
            if (Math.abs(delta[0]) > 0.1 && Math.abs(delta[1]) > 0.1) {
              const center = [(edge.b[0] + next.a[0]) / 2, (edge.b[2] + next.a[2]) / 2];
              for (const side of [edge, next]) {
                const p = side === edge ? edge.b : next.a,
                  dx = side.b[0] - side.a[0],
                  dz = side.b[2] - side.a[2],
                  length2 = dx * dx + dz * dz,
                  t = ((center[0] - p[0]) * dx + (center[1] - p[2]) * dz) / length2,
                  x = p[0] + dx * t,
                  z = p[2] + dz * t;
                joins.push([x, city.site.plan.height(x, z), z]);
              }
            }
            joins.push(next.a);
            const crossing: Vec3[] = [];
            for (let j = 1; j < joins.length; j++)
              crossing.push(
                ...crossingPath(joins[j - 1], joins[j], (x, z) => support(x, z)).slice(
                  j === 1 ? 0 : 1,
                ),
              );
            if (
              crossing.some(
                (p, i) =>
                  i > 0 &&
                  Math.abs(p[1] - crossing[i - 1][1]) /
                    Math.hypot(p[0] - crossing[i - 1][0], p[2] - crossing[i - 1][2]) >
                    0.251,
              )
            ) {
              rejected.push(`W1: ${signature} crossing grade`);
              clear = false;
              break;
            }
            path.push(...crossing.slice(1, -1));
            ramps.push(crossingRamp(`traversal/crossing-${ramps.length}`, crossing));
          }
        }
        path.push(path[0]);
        if (!clear) continue;
        for (let k = 1; k < path.length; k++) {
          const a = path[k - 1],
            b = path[k],
            distance = Math.hypot(b[0] - a[0], b[2] - a[2]);
          if (distance < 0.01) continue;
          if (solids.hits(segmentBox([a[0], a[2]], [b[0], b[2]], 0.6)).length) {
            rejected.push(`W1: ${signature} solid at ${a[0].toFixed(1)},${a[2].toFixed(1)}`);
            clear = false;
            break;
          }
          for (let t = 0; t <= 1; t += 1 / Math.ceil(distance / 2))
            if (city.site.plan.height(a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t) < 0.5)
              clear = false;
        }
        if (!clear) continue;
        const eyes = path.map(([x, y, z]): Vec3 => [x, y + 1.725, z]),
          route = sampleRoute('W1', 'City neighborhoods walk', 'walk', eyes, [1.4]);
        if (route.length < 600 || route.length > 900) {
          rejected.push(`W1: ${signature} length ${route.length.toFixed(1)}`);
          continue;
        }
        return {
          routes: [
            route,
            { ...route, id: 'N1-W1', name: 'City neighborhoods at night', night: true },
          ],
          failures: [],
          ramps,
        };
      }
  return {
    routes: [],
    failures: ['W1: no dry, clear 600–900 m loop through all three neighborhoods', ...rejected],
    ramps: [],
  };
}
