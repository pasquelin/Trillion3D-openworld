/** Derived city bounds, avenues, coast and dry terrain from the composed world plan. */
import type { Bounds, Road, Settlement, Vec3, WorldPlan } from '../../plan/contract.ts';
import { gridOf, gridYaw } from './alignment.ts';
import { isTerrainPlan } from '../../plan/plan.ts';
import { Occupancy, polylineDistance, segmentBox, turn, xz, type Obb, type Xz } from './frame.ts';

export type Site = {
  plan: WorldPlan;
  bounds: Bounds;
  city: Settlement;
  /** Where the harbour looks for the sea from: the port, else the city centre. */
  port: Xz;
  yaw: number;
  /** A grid line crossing, the distance between lines, the street width and the block between. */
  origin: Xz;
  pitch: number;
  street: number;
  block: number;
  /** The plan's roads near the city, as rectangles, keyed by road id. */
  roads: Occupancy<string>;
  roadList: readonly Road[];
};

/** How far a sample must be from a river's edge to count as dry land, metres. */
const RIVER_BANK = 15;

export function readSite(plan: WorldPlan, selected?: Settlement): Site {
  const { bounds } = plan.regions.city;
  const inside = (p: Vec3) =>
    p[0] >= bounds.minX && p[0] <= bounds.maxX && p[2] >= bounds.minZ && p[2] <= bounds.maxZ;
  const city =
    selected ??
    plan.settlements.find((s) => s.kind === 'city' && s.region === 'city') ??
    plan.settlements.find((s) => s.region === 'city' && inside(s.centre));
  if (!city) throw new Error('city: the plan places no settlement in the city region');
  const near = (road: Road) =>
    road.points.some(
      (p) => Math.hypot(p[0] - city.centre[0], p[2] - city.centre[2]) < city.radius * 1.6,
    );
  const roadList = plan.roads.filter(near),
    roads = new Occupancy<string>(CELL);
  for (const road of roadList)
    for (let i = 0; i + 1 < road.points.length; i++)
      roads.add(segmentBox(xz(road.points[i]), xz(road.points[i + 1]), road.width / 2), road.id);
  const port = plan.settlements.find((s) => s.kind === 'port' && s.region === 'city') ?? city,
    yaw = gridYaw(roadList, city);
  return {
    plan,
    bounds,
    city,
    port: xz(port.centre),
    yaw,
    ...gridOf(roadList, city, yaw),
    roads,
    roadList,
  };
}

/** Hash-grid cell of the site's lookups, metres: about one block. */
export const CELL = 120;

/** Dry land clears the sea, inland lakes and river banks. */
export function dry(site: Site, [x, z]: Xz): boolean {
  if (site.plan.height(x, z) <= 0.5) return false;
  if (
    isTerrainPlan(site.plan) &&
    site.plan.lakes.some((l) => Math.hypot(x - l.x, z - l.z) <= l.radius)
  )
    return false;
  for (const river of site.plan.rivers) {
    const widest = Math.max(...river.widths);
    if (polylineDistance([x, z], river.points) < widest / 2 + RIVER_BANK) return false;
  }
  return true;
}

export const inBounds = (site: Site, [x, z]: Xz, margin = 0) =>
  ['city', 'sea'].includes(site.plan.biome(x, z).owner) &&
  x >= site.bounds.minX + margin &&
  x <= site.bounds.maxX - margin &&
  z >= site.bounds.minZ + margin &&
  z <= site.bounds.maxZ - margin;

/** Ground heights on a grid over the rectangle, edges included, at most `step` metres apart. */
export function groundUnder(site: Site, box: Obb, step = Infinity): number[] {
  const samples: number[] = [],
    [nu, nv] = box.half.map((h) => Math.max(2, Math.ceil((2 * h) / step)));
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const [x, z] = turn(
        [((2 * i) / nu - 1) * box.half[0], ((2 * j) / nv - 1) * box.half[1]],
        box.yaw,
      );
      samples.push(site.plan.height(box.centre[0] + x, box.centre[1] + z));
    }
  return samples;
}

const SHORE_SCALE = 250;

const HEADINGS = 16;
/**
 * The coasts at the port, best first, along HEADINGS even headings: the sea lies down the ground's
 * slope there, so the first looks along that slope and the others fan out from it, nearest first
 * (a packed coast need not face the slope). Along each, every point where dry ground drops below 0 m is a coast,
 * nearest first, unless its water is a river or no open sea lies 600 m further out.
 */
export function findCoasts(site: Site): { point: Xz; out: Xz }[] {
  const [x0, z0] = site.port,
    h = site.plan.height,
    e = SHORE_SCALE,
    slope = Math.atan2(h(x0, z0 - e) - h(x0, z0 + e), h(x0 - e, z0) - h(x0 + e, z0));
  return Array.from({ length: HEADINGS }, (_, k) => {
    const turn = slope + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ((2 * Math.PI) / HEADINGS),
      out: Xz = [Math.cos(turn), Math.sin(turn)],
      coasts: { point: Xz; out: Xz }[] = [];
    for (let d = -2 * e, land = false; d < site.city.radius; d += 10) {
      const point: Xz = [x0 + out[0] * d, z0 + out[1] * d],
        sea = h(...point) <= 0,
        shore = land && sea && inBounds(site, point, 400);
      land = !sea;
      if (!shore) continue;
      const far: Xz = [point[0] + out[0] * 600, point[1] + out[1] * 600],
        river = site.plan.rivers.some(
          (r) => polylineDistance(point, r.points) < Math.max(...r.widths) * 2,
        );
      if (h(...far) < 0 && !river) coasts.push({ point, out });
    }
    return coasts;
  }).flat();
}
