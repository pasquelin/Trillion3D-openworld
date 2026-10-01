/** Baked camera flight between real fields, following southern lowlands with bounded climb/descent. */
import type { Marker, Road, Vec3 } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { sampleRoute } from './samples.ts';
const GRADE = 0.08;

export function airfieldFlight(
  plan: TerrainPlan,
  roads: readonly Road[],
  markers: readonly Marker[],
) {
  const departure = markers.find(
      (m): m is Extract<Marker, { kind: 'teleport' }> =>
        m.kind === 'teleport' && m.name === 'Airport — runway threshold',
    ),
    arrival = markers.find(
      (m): m is Extract<Marker, { kind: 'teleport' }> =>
        m.kind === 'teleport' && m.name === 'airport/general/landing',
    ),
    main = roads.find((r) => r.id === 'airport/runway-1'),
    general = roads.find((r) => r.id === 'airport/general/runway');
  if (!departure || !arrival || !main || !general)
    return { routes: [], failures: ['F2: missing distinct physical airfields'] };
  const a = departure.position,
    b = arrival.position,
    direction = (yaw: number) => [-Math.sin(yaw), -Math.cos(yaw)],
    d = direction(departure.yaw),
    e = direction(arrival.yaw),
    corners = [
      [a[0], a[2]],
      [a[0] + d[0] * 1600, a[2] + d[1] * 1600],
      [-800, 2300],
      [1600, 2600],
      [2800, 1700],
      [b[0] - e[0] * 2200, b[2] - e[1] * 2200],
      [b[0], b[2]],
    ],
    points: [number, number][] = [[a[0], a[2]]],
    distances = [0];
  for (let k = 1; k < corners.length; k++) {
    const start = corners[k - 1],
      end = corners[k],
      length = Math.hypot(end[0] - start[0], end[1] - start[1]),
      n = Math.ceil(length / 20);
    for (let i = 1; i <= n; i++) {
      points.push([
        start[0] + ((end[0] - start[0]) * i) / n,
        start[1] + ((end[1] - start[1]) * i) / n,
      ]);
      distances.push(distances.at(-1)! + length / n);
    }
  }
  const total = distances.at(-1)!,
    height = points.map(([x, z], k) => {
      const clearance = Math.min(
        100,
        1.7 + Math.max(0, distances[k] - 300) * GRADE,
        1.7 + Math.max(0, total - distances[k] - 150) * 0.02,
      );
      return plan.height(x, z) + clearance;
    });
  height[0] = a[1];
  height[height.length - 1] = b[1];
  for (let k = 1; k < height.length; k++)
    height[k] = Math.max(height[k], height[k - 1] - GRADE * (distances[k] - distances[k - 1]));
  for (let k = height.length - 2; k >= 0; k--)
    height[k] = Math.max(height[k], height[k + 1] - GRADE * (distances[k + 1] - distances[k]));
  if (Math.abs(height[0] - a[1]) > 1e-6 || Math.abs(height.at(-1)! - b[1]) > 1e-6)
    return {
      routes: [],
      failures: [
        `F2: runway approach incompatible with bounded flight grade: departure ${height[0]}/${a[1]}, arrival ${height.at(-1)}/${b[1]}`,
      ],
    };
  const path = points.map(([x, z], k): Vec3 => [x, height[k], z]);
  if (path.some(([x, y, z]) => Math.abs(x) > 4000 || Math.abs(z) > 4000 || y > 3200))
    return { routes: [], failures: ['F2: source flight exceeds playable envelope'] };
  const route = sampleRoute('F2', 'Main airport → northeast airfield', 'flight', path, [70]);
  route.samples[0].yaw = departure.yaw;
  route.samples.at(-1)!.yaw = arrival.yaw;
  route.camera = { fov: 75, far: 60_000 };
  return { routes: [route], failures: [] };
}
