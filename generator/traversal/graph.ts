import type { Road, Vec3 } from '../plan/contract.ts';
import { SegmentIndex } from '../plan/segments.ts';
import { roadGraph } from '../../page/play/sim/roadGraph.ts';

const GRADES = { highway: 0.06, secondary: 0.08, pass: 0.1, avenue: 0.08, street: 0.1, dirt: 0.25 };
export type Edge = { to: number; distance: number; road: string };
export type TravelGraph = { points: Vec3[]; edges: Edge[][]; rejected: string[] };
const mix = (a: Vec3, b: Vec3, t: number): Vec3 =>
  a.map((v, i) => v + (b[i] - v) * t) as unknown as Vec3;

/** Split actual geometric crossings only when surfaces meet vertically. Overpasses do not join. */
export function travelGraph(roads: readonly Road[], walking = false): TravelGraph {
  const segments: { a: Vec3; b: Vec3; road: string; cuts: number[] }[] = [];
  const index = new SegmentIndex(),
    rejected: string[] = [];
  for (const road of roadGraph(roads).roads) {
    if (!(road.class in GRADES) || (!walking && road.class === 'dirt')) continue;
    const grade = GRADES[road.class as keyof typeof GRADES];
    road.points.slice(1).forEach((b, k) => {
      const a = road.points[k],
        length = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (!length || Math.abs(b[1] - a[1]) / length > grade + 0.001) {
        rejected.push(`${road.id}/${k}: grade`);
        return;
      }
      segments.push({ a, b, road: road.id, cuts: [0, 1] });
      index.add(a[0], a[2], b[0], b[2], length + 1);
    });
  }
  segments.forEach((s, i) => {
    const candidates = index.near((s.a[0] + s.b[0]) / 2, (s.a[2] + s.b[2]) / 2);
    for (const { segment: j } of candidates) {
      if (j <= i) continue;
      const other = segments[j],
        u = [s.b[0] - s.a[0], s.b[2] - s.a[2]],
        v = [other.b[0] - other.a[0], other.b[2] - other.a[2]],
        d = [other.a[0] - s.a[0], other.a[2] - s.a[2]],
        cross = u[0] * v[1] - u[1] * v[0];
      if (Math.abs(cross) < 1e-8) continue;
      const t = (d[0] * v[1] - d[1] * v[0]) / cross,
        q = (d[0] * u[1] - d[1] * u[0]) / cross;
      if (t < 0 || t > 1 || q < 0 || q > 1) continue;
      if (Math.abs(mix(s.a, s.b, t)[1] - mix(other.a, other.b, q)[1]) > 0.2) continue;
      s.cuts.push(t);
      other.cuts.push(q);
    }
  });
  const points: Vec3[] = [],
    edges: Edge[][] = [],
    ids = new Map<string, number>();
  const node = (p: Vec3) => {
    const key = p.map((v) => Math.round(v * 100)).join('/');
    let id = ids.get(key);
    if (id === undefined) {
      id = points.length;
      ids.set(key, id);
      points.push(p);
      edges.push([]);
    }
    return id;
  };
  for (const s of segments) {
    const cuts = [...new Set(s.cuts)].sort((a, b) => a - b);
    for (let k = 1; k < cuts.length; k++) {
      const a = node(mix(s.a, s.b, cuts[k - 1])),
        b = node(mix(s.a, s.b, cuts[k]));
      if (a === b) continue;
      const distance = Math.hypot(...points[a].map((v, i) => v - points[b][i]));
      edges[a].push({ to: b, distance, road: s.road });
      edges[b].push({ to: a, distance, road: s.road });
    }
  }
  return { points, edges, rejected };
}

/** Existing generated network only: this never invents a terrain route between unjoined roads. */
export function graphPath(graph: TravelGraph, from: number, to: number): number[] | null {
  const distances = new Float64Array(graph.points.length).fill(Infinity),
    previous = new Int32Array(graph.points.length).fill(-1),
    pending = new Set<number>();
  distances[from] = 0;
  pending.add(from);
  while (pending.size) {
    let current = -1;
    for (const id of pending) if (current < 0 || distances[id] < distances[current]) current = id;
    pending.delete(current);
    if (current === to) {
      const path = [to];
      while (path[0] !== from) path.unshift(previous[path[0]]);
      return path;
    }
    for (const edge of graph.edges[current]) {
      const distance = distances[current] + edge.distance;
      if (distance >= distances[edge.to]) continue;
      distances[edge.to] = distance;
      previous[edge.to] = current;
      pending.add(edge.to);
    }
  }
  return null;
}
