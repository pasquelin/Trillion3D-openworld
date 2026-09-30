/**
 * The cable car from the village to the highest summit: a station at each end facing the
 * other, pylons on the straight line between them each tall enough for the cabins to clear the
 * ground, the two sagging cables as one mesh, and two cabins as `path` movers going round the
 * loop half a turn apart.
 */
import type { Instance, LampLight, MeshPart, Mover, PropMesh, Vec3 } from '../../plan/contract.ts';
import { placeLamps, prop, SURFACES, tube } from '../../props/index.ts';
import { BASEMENT } from './chalet.ts';
import { CABLE_HEIGHT, GAUGE, PYLON_HEIGHTS, SHEAVE, STATION_LAMPS } from './cableway.ts';
import { headingYaw } from './route.ts';
import type { Placer } from './space.ts';

export const CABLE_LINE = 'mountains/cable-line';
/** A cabin hangs 6.5 m under its cable; it clears the ground by 8 m more. */
const CLEARANCE = 14.5;
const SPAN = 380;
const SAG = 0.015;
/** Cabins of a monocable gondola travel at about 6 m/s. */
const SPEED = 6;

/** Places a station near (x, z), its front turned toward (tx, tz); tries a spiral around it. */
function station(placer: Placer, x: number, z: number, tx: number, tz: number, name: string) {
  for (let k = 0; k < 6_000; k++) {
    const r = Math.sqrt(k) * 16.3,
      [sx, sz] = [x + Math.cos(k * 2.4) * r, z + Math.sin(k * 2.4) * r],
      yaw = headingYaw(tx - sx, tz - sz),
      placed = placer.place('mountains/cable-station', sx, sz, {
        seat: 'high',
        basement: BASEMENT,
        yaw,
        name,
      });
    if (placed) return placed;
  }
  return undefined;
}

/** The cable's exit point of a station for the line on side `side` (±1). */
function exit(s: Instance, side: number): Vec3 {
  const [x, y, z] = s.position,
    [fx, fz] = [Math.sin(s.yaw), Math.cos(s.yaw)];
  return [
    x + fx * 6 + fz * side * (GAUGE / 2),
    y + CABLE_HEIGHT,
    z + fz * 6 - fx * side * (GAUGE / 2),
  ];
}

/** `missing`: pylons the ground refused (a road, the lake), so their spans hang unsupported. */
export type Cableway = { lights: LampLight[]; movers: Mover[]; line?: PropMesh; missing: number };

export function placeCableway(placer: Placer, from: Vec3, summit: Vec3): Cableway {
  const { plan } = placer,
    low = station(placer, from[0], from[2], summit[0], summit[2], 'mountains/valley-station');
  if (!low) return { lights: [], movers: [], missing: 0 };
  const [dx, dz] = [summit[0] - low.position[0], summit[2] - low.position[2]],
    toward = Math.hypot(dx, dz),
    back = Math.min(120, toward / 4),
    high = station(
      placer,
      summit[0] - (dx / toward) * back,
      summit[2] - (dz / toward) * back,
      low.position[0],
      low.position[2],
      'mountains/summit-station',
    );
  if (!high) return { lights: [], movers: [], missing: 0 };
  const lights = [...placeLamps(STATION_LAMPS, low), ...placeLamps(STATION_LAMPS, high)],
    [a, b] = [exit(low, 1), exit(high, -1)],
    length = Math.hypot(b[0] - a[0], b[2] - a[2]),
    nominal = Math.max(1, Math.ceil(length / SPAN)),
    spans = nominal + 2,
    at = (t: number) => [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t] as const,
    heights = Array.from({ length: spans - 1 }, () => 0),
    stops = [
      0,
      40 / length,
      ...Array.from({ length: nominal - 1 }, (_, i) => (i + 1) / nominal),
      1 - 40 / length,
      1,
    ];
  const yaw = headingYaw(b[0] - a[0], b[2] - a[2]);
  // Settle supports first: shore searches change span lengths and terrain under the cable.
  const supports = heights.map((_, i) => {
    for (let k = 0; k < 39; k++) {
      const shift = k ? Math.ceil(k / 2) * 15 * (k % 2 ? 1 : -1) : 0,
        t = stops[i + 1] + shift / length;
      if (
        t <= stops[i] + (i === 0 ? 20 : 60) / length ||
        t >= stops[i + 2] - (i === spans - 2 ? 20 : 60) / length
      )
        continue;
      const placed = placer.place(`mountains/cable-pylon-${PYLON_HEIGHTS[0]}`, ...at(t), {
        yaw,
        name: `mountains/pylon-${i}`,
      });
      if (placed) {
        stops[i + 1] = t;
        return placed;
      }
    }
    return undefined;
  });
  const missing = supports.filter((p) => !p).length,
    top = (i: number) =>
      i === 0
        ? a[1]
        : i === spans
          ? b[1]
          : (supports[i - 1]?.position[1] ?? plan.height(...at(stops[i]))) +
            PYLON_HEIGHTS[heights[i - 1]] +
            SHEAVE,
    failingSpan = () =>
      Array.from({ length: spans }, (_, i) => i).find((i) => {
        const span = (stops[i + 1] - stops[i]) * length,
          steps = Math.ceil(span / 10);
        return [1, -1].some((side) => {
          const aa = exit(low, side),
            bb = exit(high, -side);
          return Array.from({ length: steps + 1 }, (_, k) => k / steps).some((u) => {
            const t = stops[i] + u * (stops[i + 1] - stops[i]),
              x = aa[0] + (bb[0] - aa[0]) * t,
              z = aa[2] + (bb[2] - aa[2]) * t,
              y = top(i) + (top(i + 1) - top(i)) * u - span * SAG * 4 * u * (1 - u),
              required = Math.min(CLEARANCE, 6.5 + (Math.min(t, 1 - t) * length) / 8);
            return y - plan.height(x, z) < required;
          });
        });
      });
  for (let round = 0; round <= spans * PYLON_HEIGHTS.length; round++) {
    const failing = failingSpan();
    if (failing === undefined) break;
    const raise = [failing, failing + 1].filter(
      (p) => p >= 1 && p < spans && supports[p - 1] && heights[p - 1] + 1 < PYLON_HEIGHTS.length,
    );
    if (!raise.length) throw new Error(`Cable clearance incompatible at span ${failing}`);
    for (const p of raise) {
      heights[p - 1]++;
      supports[p - 1]!.prop = `mountains/cable-pylon-${PYLON_HEIGHTS[heights[p - 1]]}`;
    }
  }
  const lines = [1, -1].map((side) => cable(stops, top, exit(low, side), exit(high, -side)));
  const loop = [...lines[0], ...[...lines[1]].reverse()],
    half = loop.length >> 1;
  const mesh = prop(
    CABLE_LINE,
    lines.map((points): MeshPart =>
      tube(
        SURFACES.darkMetal,
        points.map(([x, y, z]) => [x - low.position[0], y - low.position[1], z - low.position[2]]),
        0.04,
        { segments: 4 },
      ),
    ),
  );
  placer.instances.push({
    prop: CABLE_LINE,
    position: low.position,
    yaw: 0,
    name: 'mountains/cables',
  });
  const mover = (name: string, points: Vec3[]): Mover => ({
    kind: 'path',
    name,
    model: 'mountains/cable-cabin',
    points,
    speed: SPEED,
    loop: true,
  });
  return {
    lights,
    line: mesh,
    missing,
    movers: [
      mover('mountains/cabin-a', loop),
      mover('mountains/cabin-b', [...loop.slice(half), ...loop.slice(0, half)]),
    ],
  };
}

/** One cable from `a` to `b` over the pylon tops at `stops` (0…1), sagging between, every 10 m. */
function cable(stops: readonly number[], top: (i: number) => number, a: Vec3, b: Vec3): Vec3[] {
  const points: Vec3[] = [a],
    length = Math.hypot(b[0] - a[0], b[2] - a[2]);
  for (let i = 0; i + 1 < stops.length; i++) {
    const span = (stops[i + 1] - stops[i]) * length,
      steps = Math.max(2, Math.ceil(span / 10));
    for (let k = 1; k <= steps; k++) {
      const u = k / steps,
        t = stops[i] + (stops[i + 1] - stops[i]) * u,
        y = top(i) + (top(i + 1) - top(i)) * u - span * SAG * 4 * u * (1 - u);
      points.push([a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return points;
}
