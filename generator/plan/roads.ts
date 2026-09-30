/**
 * How one road is laid (Trillion3D#332): routed over the ground under a grade limit, rounded, resampled,
 * given a surface profile smoother than the land, lifted onto bridges where it crosses a river
 * and bored through ridges where the ground stands high over it.
 */
import type { Bridge, RoadClass, Vec3 } from './contract.ts';
import type { RoadCourse } from './carve.ts';
import { chaikin, limitGrade, resample, smooth, type Point2 } from './polyline.ts';
import type { RiverCourse } from './rivers.ts';
import { boreTunnels, type Tunnel } from './tunnels.ts';
import { nodeX, nodeZ, route, type HeightGrid } from './route.ts';
import { ribbonSides } from './water.ts';
/**
 * Width (metres), steepest grade and profile smoothing (samples each side) per class: the
 * geometry road standards give each kind of road (two lanes each way for a highway, a single
 * track for a trail). A design table, not a measurement.
 */
const ROAD_STYLE: Record<RoadClass, { width: number; grade: number; smoothing: number }> = {
  highway: { width: 14, grade: 0.06, smoothing: 6 },
  secondary: { width: 8, grade: 0.08, smoothing: 3 },
  pass: { width: 7, grade: 0.1, smoothing: 2 },
  avenue: { width: 20, grade: 0.08, smoothing: 4 },
  street: { width: 10, grade: 0.1, smoothing: 2 },
  dirt: { width: 3, grade: 0.25, smoothing: 1 },
  runway: { width: 60, grade: 0.01, smoothing: 8 },
  taxiway: { width: 23, grade: 0.015, smoothing: 4 },
};
/** Resampling step of a road, metres. */
export const ROAD_STEP = 50;
/** Clearance of a bridge deck over the water, metres. */
const CLEARANCE = 6;

export type Ground = {
  grid: HeightGrid;
  height(x: number, z: number): number;
  /** Open water a road may not cross: the sea and the lakes. */
  wet(x: number, z: number): boolean;
  rivers: readonly RiverCourse[];
};
/**
 * The cost of one move for a road class. A `strict` road never climbs a move steeper than its
 * grade, so on a mountainside the cheapest path is the one real roads take: long traverses
 * joined by hairpins, the switchbacks of a pass. A lenient one pays steeply for it instead.
 * Open water is never crossed.
 */
function roadCost(ground: Ground, cls: RoadClass, strict: boolean) {
  const { grade } = ROAD_STYLE[cls];
  return (from: number, to: number, length: number, rise: number) => {
    const steep = Math.abs(rise) / length / grade;
    if (strict && steep > 1) return Infinity;
    const ax = nodeX(from),
      az = nodeZ(from),
      bx = nodeX(to),
      bz = nodeZ(to),
      samples = Math.ceil(length / 25);
    for (let k = 1; k <= samples; k++)
      if (ground.wet(ax + ((bx - ax) * k) / samples, az + ((bz - az) * k) / samples))
        return Infinity;
    return length * (1 + steep ** 4);
  };
}

/** A road from a routed path: rounded, resampled, profiled, bridged. */
export function layRoad(
  id: string,
  cls: RoadClass,
  path: readonly Point2[],
  ground: Ground,
  overRiver: (x: number, z: number) => number | null,
): { course: RoadCourse; bridges: Bridge[]; tunnels: Tunnel[] } {
  const style = ROAD_STYLE[cls];
  const rounded = resample(chaikin(path, 2), ROAD_STEP),
    dry = rounded.every(([x, z], k) => {
      if (ground.wet(x, z)) return false;
      if (!k) return true;
      const [ax, az] = rounded[k - 1],
        samples = Math.ceil(Math.hypot(x - ax, z - az) / 10);
      for (let i = 1; i < samples; i++)
        if (ground.wet(ax + ((x - ax) * i) / samples, az + ((z - az) * i) / samples)) return false;
      return true;
    }),
    points = dry
      ? rounded
      : path.flatMap(([x, z], k) => {
          if (!k) return [[x, z] as Point2];
          const [ax, az] = path[k - 1],
            n = Math.ceil(Math.hypot(x - ax, z - az) / ROAD_STEP);
          return Array.from({ length: n }, (_, i): Point2 => [
            ax + ((x - ax) * (i + 1)) / n,
            az + ((z - az) * (i + 1)) / n,
          ]);
        });
  // A paved road holds its grade on cuts and fills; a trail follows the land. A road surface
  // never dips below the shore: where it grazes a bay it stands on a causeway.
  const land = smooth(
      points.map(([x, z]) => ground.height(x, z)),
      style.smoothing,
    ),
    profile = (cls === 'dirt' ? land : limitGrade(land, points, style.grade)).map((y) =>
      Math.max(y, 1),
    ),
    water = points.map(([x, z]) => overRiver(x, z)),
    sides = ribbonSides(points.map(([x, z]) => [x, 0, z])),
    // Narrow channels between dry routing vertices still require real bridge geometry.
    bridge = points.slice(1).map((b, at) => {
      const a = points[at],
        steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
      return Array.from({ length: steps + 1 }, (_, k) => k / steps).some((t) =>
        [-1, 0, 1].some(
          (side) =>
            overRiver(
              a[0] +
                t * (b[0] - a[0]) +
                ((((1 - t) * sides[at][0] + t * sides[at + 1][0]) * style.width) / 2) * side,
              a[1] +
                t * (b[1] - a[1]) +
                ((((1 - t) * sides[at][1] + t * sides[at + 1][1]) * style.width) / 2) * side,
            ) !== null,
        ),
      );
    }),
    bridges: Bridge[] = [];
  for (let at = 0; at < bridge.length; at++) {
    if (!bridge[at] || (at > 0 && bridge[at - 1])) continue;
    let end = at;
    while (end + 1 < bridge.length && bridge[end + 1]) end++;
    // The deck runs straight between its abutments, arched (a half sine) just enough to
    // clear the water everywhere under it, so it never steps.
    const [from, to] = [at, end + 1],
      span = (k: number) =>
        profile[from] + ((profile[to] - profile[from]) * (k - from)) / (to - from),
      arch = (k: number) => Math.sin((Math.PI * (k - from)) / (to - from));
    let rise = 0;
    for (let k = from + 1; k < to; k++)
      if (water[k] !== null) rise = Math.max(rise, (water[k]! + CLEARANCE - span(k)) / arch(k));
    for (let k = from + 1; k < to; k++) profile[k] = span(k) + rise * arch(k);
    const point = (k: number): Vec3 => [points[k][0], profile[k], points[k][1]];
    bridges.push({
      id: `${id}/bridge-${bridges.length}`,
      road: id,
      from: point(from),
      to: point(to),
      width: style.width,
    });
  }
  const road = {
    id,
    class: cls,
    width: style.width,
    points: points.map(([x, z], k): Vec3 => [x, profile[k], z]),
  };
  const { tunnel, tunnels } = boreTunnels(road, ground.height, bridge);
  return { course: { road, bridge, tunnel }, bridges, tunnels };
}

/** Routes then lays a road; `null` when no route exists. */
export function buildRoad(
  id: string,
  cls: RoadClass,
  from: Point2,
  to: Point2 | ((index: number) => boolean),
  ground: Ground,
  overRiver: (x: number, z: number) => number | null,
) {
  const path =
    route(ground.grid, from, to, roadCost(ground, cls, true)) ??
    route(ground.grid, from, to, roadCost(ground, cls, false));
  return path && path.length > 1 ? layRoad(id, cls, path, ground, overRiver) : null;
}
