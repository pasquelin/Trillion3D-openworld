/**
 * The river network (Trillion3D#332): three rivers born below the northern crests, routed downhill over the
 * natural relief to the sea. The main river reaches the south coast where the city stands, a
 * second one the shore of the coast region, and a tributary joins the main river from the west. Each
 * course carries a bed profile that only ever descends, so water never climbs.
 */
import { WORLD, type River, type Vec3 } from './contract.ts';
import { chaikin, resample, type Point2 } from './polyline.ts';
import { node, nodeX, nodeZ, route, STEP, type HeightGrid } from './route.ts';

/** Resampling step of a river course, metres. */
const RIVER_STEP = 100;
/**
 * Slope of a bank or a cut, rise over run: the angle of repose of loose soil (about 33°), the
 * steepest slope earth keeps without a wall.
 */
export const REPOSE = Math.tan((33 * Math.PI) / 180);

export type RiverCourse = { river: River; beds: readonly number[]; depths: readonly number[] };

type Window = { minX: number; maxX: number; minZ: number; maxZ: number };

/** The highest grid node in a window that lies below the crests: where a spring rises. */
function spring(
  grid: HeightGrid,
  window: Window,
  allowed: (x: number, z: number) => boolean = () => true,
): Point2 {
  let best: Point2 = [window.minX, window.minZ],
    top = -Infinity;
  for (let z = window.minZ; z <= window.maxZ; z += STEP)
    for (let x = window.minX; x <= window.maxX; x += STEP) {
      const h = grid.at(x, z);
      if (allowed(x, z) && h <= WORLD.peak * 0.65 && h > top) [best, top] = [[x, z], h];
    }
  if (top <= 3) throw new Error('River spring has no dry upland');
  return best;
}

/** Bed, depth and water level along a course: the bed never rises downstream. */
function profile(
  id: string,
  points: readonly Point2[],
  height: (x: number, z: number) => number,
  widths: readonly [number, number],
): RiverCourse {
  const beds: number[] = [],
    depths: number[] = [],
    riverWidths: number[] = [],
    water: Vec3[] = [];
  const cut = points.findIndex(([x, z]) => height(x, z) < 0),
    course = cut > 0 ? points.slice(0, cut + 1) : points;
  course.forEach(([x, z], index) => {
    const along = index / Math.max(1, course.length - 1),
      width = widths[0] + (widths[1] - widths[0]) * along ** 0.7,
      depth = 1.5 + width / 15,
      natural = height(x, z) - depth,
      bed = index ? Math.min(beds[index - 1] - RIVER_STEP * 5e-4, natural) : natural,
      level = index ? Math.min(water[index - 1][1], bed + depth) : bed + depth;
    beds.push(bed);
    depths.push(depth);
    riverWidths.push(width);
    water.push([x, level, z]);
  });
  return { river: { id, points: water, widths: riverWidths }, beds, depths };
}

/**
 * Routes the rivers over `grid` (the natural relief) and profiles them with `height`. `avoid`
 * says where a river may not flow (the airport platform).
 */
export function planRivers(
  grid: HeightGrid,
  height: (x: number, z: number) => number,
  mouths: { south: Point2; east: Point2 },
  avoid: (x: number, z: number) => boolean,
): RiverCourse[] {
  const clear = (x: number, z: number) =>
    [-22, 0, 22].every((dx) => [-22, 0, 22].every((dz) => !avoid(x + dx, z + dz)));
  const clearSegment = (a: Point2, b: Point2) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
    return Array.from({ length: steps + 1 }, (_, k) => k / steps).every((t) =>
      clear(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])),
    );
  };
  const cost = (from: number, to: number, length: number, rise: number) =>
    clearSegment([nodeX(from), nodeZ(from)], [nodeX(to), nodeZ(to)])
      ? length + 40 * Math.max(0, rise)
      : Infinity;
  const trace = (source: Point2, goal: Point2 | ((index: number) => boolean)) => {
    const path = route(grid, source, goal, (from, to, length, rise) =>
      typeof goal === 'function' && grid.heights[to] < 0 && !goal(to)
        ? Infinity
        : cost(from, to, length, rise),
    );
    if (!path) throw new Error(`No river course from ${source.join(', ')}`);
    const rounded = resample(chaikin(path, 3), RIVER_STEP),
      valid = (points: readonly Point2[]) =>
        points.every((p, k) => clear(p[0], p[1]) && (!k || clearSegment(points[k - 1], p)));
    if (valid(rounded)) return rounded;
    const raw = resample(path, RIVER_STEP);
    if (!valid(raw)) throw new Error('River footprint intersects a protected plateau');
    return raw;
  };
  const main = trace(spring(grid, { minX: -2_500, maxX: -1_000, minZ: -3_200, maxZ: -2_500 }), [
      mouths.south[0],
      mouths.south[1],
    ]),
    east = trace(spring(grid, { minX: 2_000, maxX: 3_500, minZ: -3_200, maxZ: -2_500 }), [
      mouths.east[0],
      mouths.east[1],
    ]),
    mainProfile = profile('river-main', main, height, [8, 40]),
    mainNodes = new Set(mainProfile.river.points.map(([x, , z]) => node(x, z))),
    joins = (index: number) => mainNodes.has(index),
    tributary = trace(
      spring(
        grid,
        { minX: -3_000, maxX: -2_000, minZ: -2_800, maxZ: -1_800 },
        (x, z) =>
          clear(x, z) &&
          mainProfile.river.points.every((p) => Math.hypot(x - p[0], z - p[2]) >= 250),
      ),
      joins,
    );
  const end = tributary.at(-1)!;
  const junction = mainProfile.river.points
    .map(([x, , z]): Point2 => [x, z])
    .filter((p) => clearSegment(tributary.at(-2)!, p))
    .sort(
      (a, b) => Math.hypot(a[0] - end[0], a[1] - end[1]) - Math.hypot(b[0] - end[0], b[1] - end[1]),
    )[0];
  if (!junction) throw new Error('No protected tributary junction');
  tributary[tributary.length - 1] = junction;
  return [
    mainProfile,
    profile('river-east', east, height, [6, 25]),
    profile('river-west', tributary, height, [5, 15]),
  ];
}
