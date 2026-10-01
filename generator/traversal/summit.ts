import type { Marker, Road, Vec3 } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { graphPath, travelGraph } from './graph.ts';
import { sampleRoute } from './samples.ts';

/** Summit access is authored by the existing terrain road planner, then proved on its surfaces. */
export function summitAccess(
  plan: TerrainPlan,
  roads: readonly Road[],
  markers: readonly Marker[],
) {
  const trail = plan.roads.find((r) => r.id === 'summit-trail'),
    marker = markers.find((m) => m.kind === 'teleport' && /summit-viewpoint/.test(m.name));
  if (!trail || !marker)
    return { routes: [], failures: ['Summit: missing authored trail or viewpoint'] };
  const graph = travelGraph(roads, true),
    pick = (p: Vec3) =>
      graph.points.findIndex(
        (q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 0.05 && Math.abs(q[1] - p[1]) < 0.2,
      ),
    from = pick(trail.points[0]),
    to = pick(trail.points.at(-1)!);
  const route = from >= 0 && to >= 0 ? graphPath(graph, from, to) : null;
  if (!route) return { routes: [], failures: ['Summit: disconnected or over-grade trail'] };
  const path = route.map((i) => graph.points[i]),
    end = path.at(-1)!,
    goal: Vec3 = [
      marker.position[0],
      plan.height(marker.position[0], marker.position[2]),
      marker.position[2],
    ],
    gap = Math.hypot(end[0] - goal[0], end[2] - goal[2]);
  if (gap > 100)
    return { routes: [], failures: [`Summit: viewpoint is ${gap.toFixed(1)} m beyond trail`] };
  const n = Math.max(1, Math.ceil(gap / 2));
  for (let k = 1; k <= n; k++) {
    const x = end[0] + ((goal[0] - end[0]) * k) / n,
      z = end[2] + ((goal[2] - end[2]) * k) / n,
      p: Vec3 = [x, plan.height(x, z), z],
      previous = path.at(-1)!;
    const length = Math.hypot(p[0] - previous[0], p[2] - previous[2]);
    if (p[1] < 0.5 || (length > 0.01 && Math.abs(p[1] - previous[1]) / length > 0.35))
      return { routes: [], failures: ['Summit: final viewpoint approach exceeds walking grade'] };
    path.push(p);
  }
  return {
    routes: [
      sampleRoute(
        'S1',
        'Summit trail',
        'walk',
        path.map(([x, y, z]): Vec3 => [x, y + 1.7, z]),
        [1.4],
      ),
    ],
    failures: [],
  };
}
