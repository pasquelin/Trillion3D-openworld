import type { Marker, Road, Vec3 } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { graphPath, travelGraph, type TravelGraph } from './graph.ts';
import { sampleRoute } from './samples.ts';
import type { ReplayRoute } from './types.ts';

const nearest = (graph: TravelGraph, p: Vec3, radius: number) => {
  let best = -1,
    distance = radius;
  graph.points.forEach((v, k) => {
    const d = Math.hypot(v[0] - p[0], v[1] - p[1], v[2] - p[2]);
    if (d < distance) {
      best = k;
      distance = d;
    }
  });
  return best;
};
export function drivingRoutes(plan: TerrainPlan, roads: readonly Road[]) {
  const graph = travelGraph(roads),
    failures: string[] = [],
    points: Vec3[] = [];
  const speeds: number[] = [];
  const classes = new Map(roads.map((r) => [r.id, r.class]));
  const order = ['city', 'desert-town', 'mountains-town', 'countryside-town', 'coast-town'];
  const interchange = plan.roads.find((r) => r.id === 'airport-access')?.points[0];
  const stops = order.map((id) => {
    const at = plan.settlements.find((s) => s.id === id)?.centre;
    if (!at) failures.push(`D1: missing ${id}`);
    return at;
  });
  if (!interchange) failures.push('D1: missing airport interchange');
  stops.push(interchange, stops[0]);
  for (let k = 1; k < stops.length; k++) {
    if (!stops[k - 1] || !stops[k]) continue;
    const from = nearest(graph, stops[k - 1]!, 150),
      to = nearest(graph, stops[k]!, 150);
    const path = from >= 0 && to >= 0 ? graphPath(graph, from, to) : null;
    if (!path) {
      failures.push(`D1: disconnected ${k - 1} → ${k}`);
      continue;
    }
    for (let j = 1; j < path.length; j++) {
      const edge = graph.edges[path[j - 1]].find((e) => e.to === path[j])!;
      speeds.push(
        (classes.get(edge.road) === 'highway'
          ? 90
          : classes.get(edge.road) === 'secondary'
            ? 60
            : 30) / 3.6,
      );
    }
    points.push(...path.slice(points.length ? 1 : 0).map((id) => graph.points[id]));
  }
  const routes: ReplayRoute[] = [];
  if (!failures.some((f) => f.startsWith('D1:'))) {
    const raised = points.map(([x, y, z]): Vec3 => [x, y + 1.7, z]);
    routes.push(sampleRoute('D1', 'Island drive', 'drive', raised, speeds));
    routes.push({ ...routes[0], id: 'N1-D1', name: 'Island drive at night', night: true });
  }
  for (const id of ['port', 'airport']) {
    const targetRoad = plan.roads.find(
      (r) => r.id === (id === 'port' ? 'port/road' : 'airport-access'),
    );
    if (!targetRoad) {
      failures.push(`D1: missing ${id} spur`);
      continue;
    }
    const from = nearest(graph, stops[0]!, 150),
      to = nearest(graph, targetRoad.points.at(-1)!, 1);
    const path = from >= 0 && to >= 0 ? graphPath(graph, from, to) : null;
    if (!path) failures.push(`D1: disconnected ${id} spur`);
    else
      routes.push(
        sampleRoute(
          `D1-${id}`,
          `${id} access`,
          'drive',
          path.map((i): Vec3 => [graph.points[i][0], graph.points[i][1] + 1.7, graph.points[i][2]]),
          [30 / 3.6],
        ),
      );
  }
  return { routes, failures, rejectedRoadSegments: graph.rejected };
}

export function vistas(markers: readonly Marker[]) {
  const groups = [
    ['summit', /summit-viewpoint/],
    ['roof', /roof|rooftop/i],
    ['harbor', /harbour|harbor|port/i],
    ['beach', /beach/],
    ['desert', /mesa-sunset/],
    ['woodland', /countryside\/village|countryside\/.*overlook/],
  ] as const;
  const routes: ReplayRoute[] = [],
    failures: string[] = [];
  for (const [id, pattern] of groups) {
    const marker = markers.find((m) => m.kind === 'teleport' && pattern.test(m.name));
    if (!marker || marker.kind !== 'teleport') {
      failures.push(`V1: missing ${id}`);
      continue;
    }
    const pose = {
      seconds: 0,
      position: marker.position,
      yaw: marker.yaw,
      pitch: marker.pitch ?? 0,
    };
    routes.push({
      id: `V1-${id}`,
      name: `${id} vista`,
      kind: 'vista',
      night: false,
      length: 0,
      duration: 60,
      samples: [pose, { ...pose, seconds: 60 }],
    });
  }
  return { routes, failures };
}

export function flightRoute(plan: TerrainPlan, markers: readonly Marker[]) {
  const airport = markers.find((m) => m.kind === 'teleport' && /terminal/i.test(m.name));
  const summit = markers.find((m) => m.kind === 'teleport' && /summit-viewpoint/.test(m.name));
  const beach = markers.find((m) => m.kind === 'teleport' && /beach/.test(m.name));
  const city = plan.settlements.find((s) => s.id === 'city');
  if (!airport || !summit || !beach || !city)
    return { routes: [], failures: ['F1: missing landmark'] };
  const above = (p: Vec3, clearance: number): Vec3 => [
    p[0],
    Math.max(p[1], plan.height(p[0], p[2])) + clearance,
    p[2],
  ];
  const corners = [
    above(airport.position, 300),
    above(city.centre, 300),
    above(summit.position, 800),
    above(beach.position, 300),
    above(airport.position, 300),
  ];
  const path: Vec3[] = [airport.position];
  for (let k = 1; k < corners.length; k++) {
    const a = corners[k - 1],
      b = corners[k],
      n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 25);
    for (let i = 0; i < n; i++) {
      const t = i / n,
        x = a[0] + (b[0] - a[0]) * t,
        z = a[2] + (b[2] - a[2]) * t;
      path.push([x, Math.max(a[1] + (b[1] - a[1]) * t, plan.height(x, z) + 300), z]);
    }
  }
  path.push(corners.at(-1)!, airport.position);
  return {
    routes: [sampleRoute('F1', 'Island flight', 'flight', path, [40, 100, 160])],
    failures: [],
  };
}
