/** Shared highway, settlement, airport, mountain and walking connections. */
import { CITY_CORES } from './geography.ts';
import type { Bridge, RoadClass, Settlement, Vec3 } from './contract.ts';
import type { Lake, Platform, RoadCourse } from './carve.ts';
import { REGION_BOUNDS } from './layout.ts';
import type { Point2 } from './polyline.ts';
import { onAirfield, onOperationalAirfield, type AirfieldPlatforms } from './airfields.ts';
import type { Tunnel } from './tunnels.ts';
import { layRoad, buildRoad, ROAD_STEP, type Ground } from './roads.ts';
import { node, nodeZ, STEP } from './route.ts';
import { around, best, slopeAt } from './sites.ts';
import { joinRoadProfiles } from './junctions.ts';
import { groundSummits } from '../regions/mountains/peaks.ts';
import { FIELD, siteFrame } from '../regions/airport/site.ts';
import { waterSurface, waterFloor } from './water-surface.ts';
import { avenues } from './avenues.ts';
export type Network = {
  courses: RoadCourse[];
  bridges: Bridge[];
  tunnels: Tunnel[];
  viewpoints: Vec3[];
  failedConnections: string[];
};
export function planNetwork(
  ground: Ground,
  settlements: readonly Settlement[],
  lakes: readonly Lake[],
  platform: Platform,
  airfields?: AirfieldPlatforms,
): Network {
  const overRiver = waterSurface(
      ground.rivers.map((c) => c.river),
      lakes,
    ),
    courses: RoadCourse[] = [],
    bridges: Bridge[] = [],
    tunnels: Tunnel[] = [],
    viewpoints: Vec3[] = [],
    failedConnections: string[] = [],
    onNetwork = new Set<number>(),
    find = (id: string) => settlements.find((s) => s.id === id),
    xz = (s: Settlement | Vec3): Point2 =>
      'centre' in s ? [s.centre[0], s.centre[2]] : [s[0], s[2]];
  const keep = (built: ReturnType<typeof layRoad> | null, joinsNetwork = true) => {
    if (!built) return;
    courses.push(built.course);
    bridges.push(...built.bridges);
    tunnels.push(...built.tunnels);
    if (joinsNetwork) for (const [x, , z] of built.course.road.points) onNetwork.add(node(x, z));
  };
  const road = (
    id: string,
    cls: RoadClass,
    from: Point2,
    to: Point2 | 'network',
    joins = true,
    destination?: readonly Vec3[],
  ) => {
    if (to === 'network' && onNetwork.has(node(from[0], from[1]))) return;
    const built = buildRoad(
      id,
      cls,
      from,
      to === 'network'
        ? (index) =>
            onNetwork.has(index) &&
            (id !== 'city-west/road' ||
              (nodeZ(index) > 500 && ground.grid.heights[index] < 80)) &&
            (id !== 'mountains-town/road' ||
              (nodeZ(index) > 0 &&
                ground.grid.heights[index] < find('mountains-town')!.centre[1] + 120))
        : to,
      {
        ...ground,
        wet: (x, z) =>
          ground.wet(x, z) ||
          (!!airfields && onAirfield(airfields, x, z, 60)) ||
          (x > platform.minX - 60 &&
            x < platform.maxX + 60 &&
            z > platform.minZ - 60 &&
            z < platform.maxZ + 60),
      },
      overRiver,
    );
    if (!built) failedConnections.push(id);
    if (built && destination) {
      built.course.road.points = [...built.course.road.points.slice(0, -1), ...destination];
      built.course.bridge = [...built.course.bridge, ...destination.slice(1).map(() => false)];
      built.course.tunnel = [...built.course.tunnel, ...destination.slice(1).map(() => false)];
    }
    keep(built, joins);
  };
  const centreZ = (platform.minZ + platform.maxZ) / 2,
    interchange: Point2 = [platform.maxX + 300, centreZ];
  const ring: Point2[] = [
    find('city'),
    interchange,
    find('coast-town'),
    find('countryside-town'),
    find('city-northeast'),
    find('desert-town'),
  ].flatMap((stop) =>
    !stop ? [] : Array.isArray(stop) ? [stop as Point2] : [xz(stop as Settlement)],
  );
  ring.forEach((stop, index) =>
    road(`highway-${index}`, 'highway', stop, ring[(index + 1) % ring.length]),
  );
  const terminal = siteFrame(REGION_BOUNDS.airport, platform, 0, interchange, -1).world(
    0,
    FIELD.curbside,
  );
  road('airport-access', 'secondary', interchange, [platform.maxX + 100, centreZ], true, [
    [platform.maxX, platform.level, centreZ],
    [terminal[0], platform.level, terminal[1]],
  ]);
  if (airfields) {
    const p = airfields.general;
    road('general-airfield-access', 'secondary', [p.maxX + 100, (p.minZ + p.maxZ) / 2], 'network');
  }
  const resort = find('ski-resort'),
    mountainTown = find('mountains-town');
  if (mountainTown) road('mountains-town/road', 'pass', xz(mountainTown), 'network');
  if (resort && mountainTown) road('pass', 'pass', xz(mountainTown), xz(resort));
  const mountainBounds = REGION_BOUNDS.mountains;
  const summit = groundSummits(
    ground.height,
    mountainBounds,
    (x, z, margin) =>
      !ground.wet(x, z) &&
      x > mountainBounds.minX + margin &&
      x < mountainBounds.maxX - margin &&
      z > mountainBounds.minZ + margin &&
      z < mountainBounds.maxZ - margin,
  )[0];
  if (summit && (resort || mountainTown))
    road('summit-trail', 'dirt', xz((resort || mountainTown)!), xz(summit), false, [summit]);
  for (const s of settlements)
    if (s.kind === 'village' || (s.region === 'city' && (s.kind === 'port' || s.kind === 'town')))
      road(
        `${s.id}/road`,
        'secondary',
        xz(s),
        s.id === 'city-east' ? xz(find('city')!) : 'network',
      );
  for (const city of settlements.filter(
    (s) => s.region === 'city' && (s.kind === 'city' || s.kind === 'town'),
  ))
    avenues(city, ground, (id, path) => keep(layRoad(id, 'avenue', path, ground, overRiver)));
  const villages = settlements.filter((s) => s.kind === 'village' || s.kind === 'resort'),
    linked = new Set<string>();
  for (const v of villages) {
    const nearest = villages
      .filter((o) => o !== v)
      .sort((a, b) => dist(a.centre, v.centre) - dist(b.centre, v.centre))
      .slice(0, 2);
    for (const o of nearest) {
      const key = [v.id, o.id].sort().join('+');
      if (linked.has(key) || dist(o.centre, v.centre) > 8_000) continue;
      linked.add(key);
      road(`trail/${key}`, 'dirt', xz(v), xz(o), false);
    }
    const view = best(ground.grid, around(v.centre[0], v.centre[2], 3_000), (x, z, h) =>
      slopeAt(ground.grid, x, z) < 0.5 && !ground.wet(x, z) ? h : -Infinity,
    );
    if (view && view[1] > v.centre[1] + 50) {
      viewpoints.push(view);
      road(`trail/${v.id}/viewpoint`, 'dirt', xz(v), xz(view), false);
    }
    const beach = best(ground.grid, around(v.centre[0], v.centre[2], 3_000), (x, z, h) =>
      h > 0.5 &&
      h < 3 &&
      [
        [STEP, 0],
        [-STEP, 0],
        [0, STEP],
        [0, -STEP],
      ].some(([dx, dz]) => ground.grid.at(x + dx, z + dz) < 0)
        ? -Math.hypot(x - v.centre[0], z - v.centre[2])
        : -Infinity,
    );
    if (beach) road(`trail/${v.id}/beach`, 'dirt', xz(v), xz(beach), false);
  }
  for (const lake of lakes) {
    const village = [...villages].sort(
        (a, b) => dist(a.centre, [lake.x, 0, lake.z]) - dist(b.centre, [lake.x, 0, lake.z]),
      )[0],
      shore: Point2 = [lake.x + lake.radius + ROAD_STEP, lake.z];
    if (village) road(`trail/${lake.id}`, 'dirt', xz(village), shore, false);
  }
  const joinedTunnels = joinRoadProfiles(
    courses,
    bridges,
    ground.height,
    (x, z) =>
      (airfields && onOperationalAirfield(airfields, x, z)) ||
      settlements.some(
        (site) =>
          CITY_CORES.some((core) => core.id === site.id) &&
          Math.hypot(x - site.centre[0], z - site.centre[2]) < 50,
      )
        ? ground.height(x, z)
        : undefined,
    waterFloor(overRiver),
  );
  return { courses, bridges, tunnels: joinedTunnels, viewpoints, failedConnections };
}
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
