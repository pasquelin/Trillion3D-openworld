/** Audit authored road decks against the exact aquatic triangles, not a coarse map raster. */
import type { Road, Vec3 } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { ribbonSides } from '../plan/water.ts';
import { waterSurface } from '../plan/water-surface.ts';

const onSpan = (x: number, z: number, span: { from: Vec3; to: Vec3; width: number }) => {
  const [a, b] = [span.from, span.to],
    dx = b[0] - a[0],
    dz = b[2] - a[2],
    t = ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1);
  return (
    t >= -0.01 &&
    t <= 1.01 &&
    Math.hypot(x - a[0] - t * dx, z - a[2] - t * dz) <= span.width / 2 + 1
  );
};

export function auditRoadWater(plan: TerrainPlan, roads: readonly Road[]) {
  const level = waterSurface(plan.rivers, plan.lakes);
  let samples = 0,
    wetSamples = 0,
    bridgeSamples = 0,
    coveredTunnelSamples = 0;
  const submerged: {
      road: string;
      segment: number;
      position: Vec3;
      water: number;
      ground: number;
    }[] = [],
    crossings = new Set<string>();
  for (const road of roads) {
    const sides = ribbonSides(road.points);
    for (let i = 1; i < road.points.length; i++) {
      const [a, b] = [road.points[i - 1], road.points[i]],
        dx = b[0] - a[0],
        dz = b[2] - a[2],
        length = Math.hypot(dx, dz),
        steps = Math.max(1, Math.ceil(length / 10));
      for (let k = 0; k <= steps; k++)
        for (const side of [-1, 0, 1]) {
          const t = k / steps,
            x =
              a[0] +
              t * dx +
              ((((1 - t) * sides[i - 1][0] + t * sides[i][0]) * road.width) / 2) * side,
            z =
              a[2] +
              t * dz +
              ((((1 - t) * sides[i - 1][1] + t * sides[i][1]) * road.width) / 2) * side,
            deck = a[1] + t * (b[1] - a[1]),
            ground = plan.height(x, z),
            water = Math.max(0, level(x, z) ?? -Infinity);
          samples++;
          if (ground >= water + 0.01) continue;
          wetSamples++;
          crossings.add(road.id);
          const bridge = plan.bridges.some((s) => s.road === road.id && onSpan(x, z, s)),
            tunnel =
              plan.tunnels.some((s) => s.road === road.id && onSpan(x, z, s)) && ground - deck >= 8;
          if (bridge) bridgeSamples++;
          if (tunnel) coveredTunnelSamples++;
          if (!tunnel && deck < water + 6 - 1e-5)
            submerged.push({
              road: road.id,
              segment: i - 1,
              position: [x, deck, z],
              water,
              ground,
            });
        }
    }
  }
  return {
    sampleSpacingM: 10,
    samples,
    wetSamples,
    bridgeSamples,
    coveredTunnelSamples,
    waterCrossingRoadIds: [...crossings].sort(),
    submerged,
  };
}
