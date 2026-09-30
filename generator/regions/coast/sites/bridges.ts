/** Stone bays follow each authored road segment, including its slope and bends. */
import type { Bridge, PropMesh, Vec3 } from '../../../plan/contract.ts';
import { BRIDGE, bridgeBay } from '../props/bridge.ts';
import { yawToward, type Layout } from './layout.ts';

export function bridges(layout: Layout, spans: readonly Bridge[]): PropMesh[] {
  const meshes: PropMesh[] = [];
  for (const span of spans) {
    const road = layout.map.plan.roads.find((r) => r.id === span.road);
    if (!road) continue;
    const nearest = (p: Vec3) =>
      road.points.reduce(
        (best, q, i) =>
          Math.hypot(q[0] - p[0], q[2] - p[2]) <
          Math.hypot(road.points[best][0] - p[0], road.points[best][2] - p[2])
            ? i
            : best,
        0,
      );
    const [start, end] = [nearest(span.from), nearest(span.to)].sort((a, b) => a - b),
      branches = layout.map.plan.roads.filter((candidate) => candidate.id !== road.id),
      side = (p: Vec3, dx: number, dz: number) => {
        const signs = branches.flatMap((branch) => {
          const points = branch.points;
          return points.flatMap((at, k) => {
            if (Math.hypot(at[0] - p[0], at[2] - p[2]) > 0.001) return [];
            return [points[k - 1], points[k + 1]].flatMap((near) => {
              if (!near) return [];
              const cross = dz * (near[0] - p[0]) - dx * (near[2] - p[2]);
              return cross ? [Math.sign(cross)] : [];
            });
          });
        });
        return signs.includes(-1) && signs.includes(1) ? 0 : (signs[0] ?? 2);
      };
    for (let k = start; k < end; k++) {
      const a = road.points[k],
        b = road.points[k + 1],
        dx = b[0] - a[0],
        dz = b[2] - a[2],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dz),
        bays = Math.max(1, Math.ceil(length / BRIDGE.bay)),
        id = `coast-bridge/${span.id}/${k}`,
        sx = span.width / (BRIDGE.width - 1.4),
        sz = length / (bays * BRIDGE.bay);
      const openings = [side(a, dx, dz), side(b, dx, dz)],
        variants = new Map<number, PropMesh>();
      for (let i = 0; i < bays; i++) {
        const t = (i + 0.5) / bays,
          opening =
            t * length < BRIDGE.bay ? openings[0] : (1 - t) * length < BRIDGE.bay ? openings[1] : 2;
        let mesh = variants.get(opening);
        if (!mesh) {
          const base = bridgeBay(opening);
          mesh = {
            id: opening === 2 ? id : `coast-bridge/${span.id}/open${opening}/${k}`,
            parts: base.parts.map((part) => {
              const positions = new Float32Array(part.positions);
              for (let v = 0; v < positions.length; v += 3) {
                positions[v] *= sx;
                positions[v + 2] *= sz;
                positions[v + 1] += (positions[v + 2] * dy) / length;
              }
              return { ...part, positions, normals: undefined };
            }),
          };
          variants.set(opening, mesh);
          layout.register(mesh);
        }
        if (
          layout.place(mesh.id, a[0] + dx * t, a[2] + dz * t, yawToward(dx, dz), {
            y: a[1] + dy * t,
            onRoad: true,
            joinedDeck: true,
            name: `coast/${span.id}/${k}/${i}`,
          }) &&
          !meshes.includes(mesh)
        )
          meshes.push(mesh);
      }
    }
  }
  return meshes;
}
