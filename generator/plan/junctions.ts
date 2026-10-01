import { boundedProfiles } from './profile-bounds.ts';
import type { Bridge, Vec3 } from './contract.ts';
import type { RoadCourse } from './carve.ts';
import { SegmentIndex } from './segments.ts';
import { boreTunnels } from './tunnels.ts';
import { ribbonSides } from './water.ts';
import { STEP } from './route.ts';

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
  anchor?: (x: number, z: number) => number | undefined,
  bridgeFloor?: (x: number, z: number) => number,
) {
  const junctions = new Set<string>(),
    xy = (p: Vec3) => `${p[0].toFixed(5)}/${p[2].toFixed(5)}`,
    index = new SegmentIndex(),
    segments: { course: RoadCourse; at: number; a: Vec3; b: Vec3 }[] = [];
  for (const course of courses)
    course.road.points.slice(1).forEach((b, k) => {
      if (course.road.class === 'dirt' || course.tunnel[k]) return;
      const a = course.road.points[k];
      // A routed endpoint shares a grid cell with the centreline, rather than an exact vertex.
      index.add(a[0], a[2], b[0], b[2], STEP);
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
    if (!hit) continue;
    const exact = hit.distance < 0.01;
    const target = segments[hit.segment],
      a = target.a,
      b = target.b,
      p: Vec3 = [
        a[0] + (b[0] - a[0]) * hit.t,
        a[1] + (b[1] - a[1]) * hit.t,
        a[2] + (b[2] - a[2]) * hit.t,
      ],
      targetPoints = [...target.course.road.points],
      at = targetPoints.findIndex((q, i) => {
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
    const dx = p[0] - end[0],
      dz = p[2] - end[2],
      length = Math.hypot(dx, dz),
      count = Math.max(1, Math.ceil(length / 2)),
      wetConnector = Array.from({ length: count + 1 }, (_, k) => k / count).some((t) =>
        [-1, 0, 1].some((side) => {
          const x = end[0] + dx * t + (side * dz * course.road.width) / (2 * (length || 1)),
            z = end[2] + dz * t - (side * dx * course.road.width) / (2 * (length || 1));
          return ground(x, z) < 0.5 || (bridgeFloor?.(x, z) ?? 0.5) > 0.5;
        }),
      ),
      deckJoin = !!target.course.bridge[at] || wetConnector;
    junctions.add(xy(p));
    if (exact) points[points.length - 1] = p;
    else points.push(p);
    course.road.points = points;
    if (!exact) course.bridge = [...course.bridge, deckJoin];
    if (deckJoin && !exact)
      bridges.push({
        id: `${course.road.id}/junction-bridge`,
        road: course.road.id,
        from: end,
        to: p,
        width: course.road.width,
      });
    if (!exact) course.tunnel = [...course.tunnel, false];
    // The target's exact junction vertex makes the connector part of its centreline too.
    // Projection onto an existing endpoint already has a junction; a duplicate makes a zero-length edge.
    if (targetPoints.some((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) < 0.0001)) continue;
    targetPoints.splice(at + 1, 0, p);
    target.course.road.points = targetPoints;
    const flags = [...target.course.bridge];
    flags.splice(at, 0, flags[at]);
    target.course.bridge = flags;
    const tunnels = [...target.course.tunnel];
    tunnels.splice(at, 0, false);
    target.course.tunnel = tunnels;
  }
  const ids = new Map<string, number>(),
    height: number[] = [],
    floors: number[] = [],
    anchors: (number | undefined)[] = [],
    links: { to: number; rise: number }[][] = [];
  const node = (p: Vec3, bridge = '') => {
    const position = xy(p),
      key = `${position}/${junctions.has(position) ? '' : bridge}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = height.length;
      ids.set(key, id);
      height.push(p[1]);
      floors.push(bridge ? (bridgeFloor?.(p[0], p[2]) ?? p[1]) : 0.5);
      anchors.push(bridge ? undefined : anchor?.(p[0], p[2]));
      links.push([]);
    } else {
      height[id] = Math.max(height[id], p[1]);
      if (bridge) floors[id] = Math.max(floors[id], bridgeFloor?.(p[0], p[2]) ?? p[1]);
    }
    return id;
  };
  const nodes = courses.map((c) =>
    c.road.points.map((p, i) =>
      node(p, c.road.class === 'dirt' || c.bridge[i] || c.bridge[i - 1] ? c.road.id : ''),
    ),
  );
  courses.forEach((c, k) => {
    const sides = ribbonSides(c.road.points);
    for (let i = 1; i < nodes[k].length; i++) {
      const a = nodes[k][i - 1],
        b = nodes[k][i],
        p = c.road.points[i - 1],
        q = c.road.points[i],
        rise = GRADE[c.road.class] * Math.hypot(p[0] - q[0], p[2] - q[2]);
      if (bridgeFloor && c.bridge[i - 1]) {
        const count = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[2] - q[2]) / 2));
        for (let k = 0; k <= count; k++)
          for (const side of [-1, 0, 1]) {
            const t = k / count,
              floor = bridgeFloor(
                p[0] +
                  t * (q[0] - p[0]) +
                  ((((1 - t) * sides[i - 1][0] + t * sides[i][0]) * c.road.width) / 2) * side,
                p[2] +
                  t * (q[2] - p[2]) +
                  ((((1 - t) * sides[i - 1][1] + t * sides[i][1]) * c.road.width) / 2) * side,
              );
            floors[a] = Math.max(floors[a], floor);
            floors[b] = Math.max(floors[b], floor);
          }
      }
      links[a].push({ to: b, rise });
      links[b].push({ to: a, rise });
    }
  });
  let solved: number[];
  try {
    solved = boundedProfiles(height, links, floors, anchors);
  } catch (error) {
    const ids = [...String(error).matchAll(/(?:node|from) (\d+)/g)].map((m) => Number(m[1]));
    const uses = ids.flatMap((id) =>
      courses.flatMap((course, k) =>
        course.road.points.flatMap((point, i) =>
          nodes[k][i] === id
            ? [
                `${id}:${course.road.id}/${i}@${point[0]},${point[2]} y${point[1]} ground${ground(point[0], point[2])} floor${floors[id]} anchor${anchors[id]} bridge${course.bridge[i]}`,
              ]
            : [],
        ),
      ),
    );
    throw new Error(`${error}; roads ${uses.join(', ')}`, { cause: error });
  }
  courses.forEach(
    (c, k) =>
      (c.road.points = c.road.points.map((p, i): Vec3 => [p[0], solved[nodes[k][i]], p[2]])),
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
