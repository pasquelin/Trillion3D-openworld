import type { Bridge, Vec3 } from './contract.ts';
import type { RoadCourse } from './carve.ts';
import { SegmentIndex } from './segments.ts';
import { boreTunnels } from './tunnels.ts';

const GRADE = {
  highway: 0.06,
  secondary: 0.08,
  pass: 0.1,
  avenue: 0.08,
  street: 0.1,
  dirt: 0.25,
  runway: 0.01,
  taxiway: 0.015,
};
/** Reconcile authored junction surfaces before terrain earthworks. This changes actual road geometry. */
export function joinRoadProfiles(
  courses: RoadCourse[],
  bridges: Bridge[],
  ground: (x: number, z: number) => number,
) {
  const index = new SegmentIndex(),
    segments: { course: RoadCourse; at: number; a: Vec3; b: Vec3 }[] = [];
  for (const course of courses)
    course.road.points.slice(1).forEach((b, k) => {
      if (course.road.class === 'dirt' || course.bridge[k] || course.tunnel[k]) return;
      const a = course.road.points[k];
      index.add(a[0], a[2], b[0], b[2], 35);
      segments.push({ course, at: k, a, b });
    });
  // Routed-to-network grid cells may end beside a rounded centreline. Add a real dry connector.
  for (const course of courses) {
    if (!course.road.id.endsWith('/road')) continue;
    const points = [...course.road.points],
      end = points.at(-1)!;
    const hit = index
      .near(end[0], end[2])
      .filter((h) => segments[h.segment].course !== course)
      .sort((a, b) => a.distance - b.distance)[0];
    if (!hit || hit.distance < 0.01) continue;
    const target = segments[hit.segment],
      a = target.a,
      b = target.b,
      p: Vec3 = [
        a[0] + (b[0] - a[0]) * hit.t,
        a[1] + (b[1] - a[1]) * hit.t,
        a[2] + (b[2] - a[2]) * hit.t,
      ];
    if (
      Array.from({ length: 8 }, (_, k) =>
        ground(end[0] + ((p[0] - end[0]) * k) / 7, end[2] + ((p[2] - end[2]) * k) / 7),
      ).some((y) => y < 0.5)
    )
      continue;
    points.push(p);
    course.road.points = points;
    course.bridge = [...course.bridge, false];
    course.tunnel = [...course.tunnel, false];
    // The target's exact junction vertex makes the connector part of its centreline too.
    const targetPoints = [...target.course.road.points];
    const at = targetPoints.findIndex((q, i) => {
      const r = targetPoints[i + 1];
      return (
        r &&
        Math.abs(
          Math.hypot(q[0] - p[0], q[2] - p[2]) +
            Math.hypot(r[0] - p[0], r[2] - p[2]) -
            Math.hypot(r[0] - q[0], r[2] - q[2]),
        ) < 0.0001
      );
    });
    if (at < 0) throw new Error('Connector target lost its authored segment');
    targetPoints.splice(at + 1, 0, p);
    target.course.road.points = targetPoints;
    const flags = [...target.course.bridge];
    flags.splice(at, 0, false);
    target.course.bridge = flags;
    const tunnels = [...target.course.tunnel];
    tunnels.splice(at, 0, false);
    target.course.tunnel = tunnels;
  }
  const ids = new Map<string, number>(),
    height: number[] = [],
    links: { to: number; rise: number }[][] = [];
  const node = (p: Vec3, bridge = '') => {
    const key = `${p[0].toFixed(5)}/${p[2].toFixed(5)}/${bridge}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = height.length;
      ids.set(key, id);
      height.push(p[1]);
      links.push([]);
    } else height[id] = Math.max(height[id], p[1]);
    return id;
  };
  const nodes = courses.map((c) =>
    c.road.points.map((p, i) =>
      node(p, c.road.class === 'dirt' || c.bridge[i] || c.bridge[i - 1] ? c.road.id : ''),
    ),
  );
  courses.forEach((c, k) => {
    for (let i = 1; i < nodes[k].length; i++) {
      const a = nodes[k][i - 1],
        b = nodes[k][i],
        p = c.road.points[i - 1],
        q = c.road.points[i],
        rise = GRADE[c.road.class] * Math.hypot(p[0] - q[0], p[2] - q[2]);
      links[a].push({ to: b, rise });
      links[b].push({ to: a, rise });
    }
  });
  // Minimal upward grade envelope: bridge clearance is never reduced to remove a slope violation.
  const pending = [...height.keys()],
    queued = new Set(pending);
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const a = pending[cursor];
    queued.delete(a);
    for (const { to, rise } of links[a])
      if (height[to] + 1e-8 < height[a] - rise) {
        height[to] = height[a] - rise;
        if (!queued.has(to)) {
          queued.add(to);
          pending.push(to);
        }
      }
  }
  courses.forEach(
    (c, k) =>
      (c.road.points = c.road.points.map((p, i): Vec3 => [p[0], height[nodes[k][i]], p[2]])),
  );
  for (const bridge of bridges) {
    const points = courses.find((c) => c.road.id === bridge.road)!.road.points;
    bridge.from = points.find((p) => p[0] === bridge.from[0] && p[2] === bridge.from[2])!;
    bridge.to = points.find((p) => p[0] === bridge.to[0] && p[2] === bridge.to[2])!;
  }
  return courses.flatMap((c) => {
    const result = boreTunnels(c.road, ground, c.bridge);
    c.tunnel = result.tunnel;
    return result.tunnels;
  });
}
