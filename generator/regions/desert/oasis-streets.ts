/** A compact street loop follows passable desert ground; two exits serve houses and highway. */
import type { Vec3 } from '../../plan/contract.ts';
import type { Build } from './build.ts';
import type { Point } from './geometry2.ts';
import { oasisRoadSafety } from './road-safety.ts';
import { oasisTrack } from './oasis-track.ts';

export const RING = 25,
  EDGE = 80,
  STREET = 6,
  TRACK = 7;

export type OasisLayout = { angles: [number, number]; route?: Point[]; exit: number };

export function oasisStreets(b: Build, highway?: readonly Vec3[]) {
  const { safe } = oasisRoadSafety(b);
  const polar = (center: Point, r: number, a: number): Point => [
    center[0] + r * Math.cos(a),
    center[1] + r * Math.sin(a),
  ];
  const ring = (center: Point) =>
    Array.from({ length: 41 }, (_, i) => polar(center, RING, (i * Math.PI * 2) / 40));
  const layoutAt = (center: Point, connect: boolean): OasisLayout | undefined => {
    const points = ring(center);
    if (!points.slice(1).every((point, i) => safe(points[i], point, STREET))) return;
    const exits = Array.from({ length: 8 }, (_, k) => k).filter((k) =>
      safe(polar(center, RING, (k * Math.PI) / 4), polar(center, EDGE, (k * Math.PI) / 4), STREET),
    );
    if (exits.length < 2) return;
    let best: { k: number; route: Point[]; distance: number } | undefined;
    if (highway && connect) {
      const nearest = (k: number) => {
        const end = polar(center, EDGE, (k * Math.PI) / 4);
        return Math.min(...highway.map(([x, , z]) => Math.hypot(x - end[0], z - end[1])));
      };
      for (const k of exits.sort((a, c) => nearest(a) - nearest(c)).slice(0, 4)) {
        const end = polar(center, EDGE, (k * Math.PI) / 4);
        const route = oasisTrack(end, highway, b.plan.height, safe, TRACK);
        if (!route) continue;
        const distance = route
          .slice(1)
          .reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]), 0);
        if (!best || distance < best.distance) best = { k, route, distance };
        if (best.distance < 40) break;
      }
      if (!best) return;
    }
    const first = best?.k ?? exits[0],
      second = exits
        .filter((k) => k !== first)
        .sort((a, c) => circularDistance(c, first) - circularDistance(a, first) || a - c)[0];
    return { angles: [first, second], route: best?.route, exit: first };
  };
  return { layoutAt, polar, ring, safe };
}

function circularDistance(a: number, b: number) {
  const d = Math.abs(a - b);
  return Math.min(d, 8 - d);
}
