/** Each centre aligns only to its own authored avenues; all cores share 125 m blocks. */
import type { Road, Settlement } from '../../plan/contract.ts';
import { sidewaysOf, turn, type Xz } from './frame.ts';

/** The pitch a grid aims for: a 100 m block and a 20 m street (a design value, not a measure). */
const AIM = 125;

/**
 * The grid shares the plan's avenue lines: its pitch divides their spacing, its lines pass
 * through theirs, and its streets take their width. With no avenues, it aims at `AIM`.
 */
export function gridOf(roads: readonly Road[], city: Settlement, yaw: number) {
  const avenues = coreAvenues(roads, city),
    street = avenues[0]?.width ?? 20,
    lines: [number[], number[]] = [[], []];
  for (const road of avenues)
    for (let i = 0; i + 1 < road.points.length; i++) {
      const [a, b] = [road.points[i], road.points[i + 1]],
        along = turn([b[0] - a[0], b[2] - a[2]], -yaw),
        at = turn([a[0] - city.centre[0], a[2] - city.centre[2]], -yaw);
      // A line along the grid's Z sits at a fixed u; one along its X at a fixed v.
      if (Math.abs(along[0]) < 1e-3 * Math.abs(along[1])) lines[0].push(Math.round(at[0]));
      if (Math.abs(along[1]) < 1e-3 * Math.abs(along[0])) lines[1].push(Math.round(at[1]));
    }
  const spacings = lines.flatMap((offsets) => {
    const sorted = [...new Set(offsets)].sort((p, q) => p - q);
    return sorted
      .slice(1)
      .map((v, k) => v - sorted[k])
      .filter((d) => d > street);
  });
  const spacing = spacings.length ? Math.min(...spacings) : AIM,
    pitch = spacing / Math.max(1, Math.round(spacing / AIM)),
    shift = lines.map((offsets) =>
      offsets.length ? ((Math.min(...offsets) % pitch) + pitch) % pitch : 0,
    ),
    [ox, oz] = turn([shift[0], shift[1]], yaw);
  return {
    origin: [city.centre[0] + ox, city.centre[2] + oz] as Xz,
    pitch,
    street,
    block: pitch - street,
  };
}

/**
 * The grid follows the plan's longest avenue through the city, so plan avenues and local streets
 * run parallel; with none, it follows the axes.
 */
export function gridYaw(roads: readonly Road[], city: Settlement): number {
  let best = 0,
    yaw = 0;
  for (const road of coreAvenues(roads, city)) {
    for (let i = 0; i + 1 < road.points.length; i++) {
      const [a, b] = [road.points[i], road.points[i + 1]],
        inCity = Math.hypot(a[0] - city.centre[0], a[2] - city.centre[2]) < city.radius,
        length = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (inCity && length > best) [best, yaw] = [length, sidewaysOf([b[0] - a[0], b[2] - a[2]])];
    }
  }
  // A grid is the same every quarter turn: keep the yaw within ±45°.
  return yaw - Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2);
}

function coreAvenues(roads: readonly Road[], city: Settlement) {
  const prefix = city.id === 'city' ? 'avenue-' : `avenue-${city.id}-`;
  return roads.filter(
    (r) =>
      r.class === 'avenue' &&
      r.id.startsWith(prefix) &&
      (city.id !== 'city' || !r.id.startsWith('avenue-city-')),
  );
}
