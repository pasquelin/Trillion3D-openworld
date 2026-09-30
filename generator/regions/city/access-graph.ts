/** Validate city street frontage against the shared traversal graph, with actual height/grade. */
import type { Road } from '../../plan/contract.ts';
import { travelGraph } from '../../traversal/graph.ts';
import { at, type Segment } from './segments.ts';
import type { Site } from './site.ts';

export const segmentId = (s: Segment) => `${s.axis}${s.i},${s.j}`;
export function streetAccessGraph(site: Site, segments: Segment[]) {
  const roads: Road[] = segments.map((s) => ({
    id: segmentId(s),
    class: 'avenue',
    width: site.street,
    points: [0, 0.5, 1].map((t) => {
      const [x, z] = at({ site }, s.axis, s.i, s.j, t * site.pitch, 0);
      return [x, site.plan.height(x, z), z];
    }),
  }));
  const graph = travelGraph([...site.roadList, ...roads]);
  const components = new Int32Array(graph.points.length).fill(-1);
  const roadComponents = new Map<string, Set<number>>();
  let component = 0;
  for (let start = 0; start < components.length; start++) {
    if (components[start] !== -1) continue;
    components[start] = component;
    const queue = [start];
    for (let k = 0; k < queue.length; k++)
      for (const edge of graph.edges[queue[k]]) {
        const found = roadComponents.get(edge.road) ?? new Set<number>();
        found.add(component);
        roadComponents.set(edge.road, found);
        if (components[edge.to] !== -1) continue;
        components[edge.to] = component;
        queue.push(edge.to);
      }
    component++;
  }
  const weights = new Map<number, number>();
  for (const s of segments)
    for (const c of roadComponents.get(segmentId(s)) ?? [])
      weights.set(c, (weights.get(c) ?? 0) + s.sides.filter(Boolean).length);
  const main = [...weights].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  return { roadComponents, main, rejected: graph.rejected };
}
export type StreetAccessGraph = ReturnType<typeof streetAccessGraph>;
