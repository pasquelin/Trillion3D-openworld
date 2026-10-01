/** Check emitted coastal asphalt against its exact authored road segment, not a span chord. */
import type { Instance, PropMesh, WorldPlan } from '../plan/contract.ts';
import { SURFACES } from '../props/index.ts';
export function auditBridgeDecks(
  plan: WorldPlan,
  meshes: readonly PropMesh[],
  instances: readonly Instance[],
) {
  const catalogue = new Map(meshes.map((mesh) => [mesh.id, mesh]));
  let bays = 0,
    vertices = 0;
  const mismatches: { name: string; difference: number }[] = [];
  for (const instance of instances) {
    if (!instance.prop.startsWith('coast-bridge/')) continue;
    const bridge = plan.bridges.find((b) => instance.prop.startsWith(`coast-bridge/${b.id}/`));
    const road = plan.roads.find((r) => r.id === bridge?.road),
      k = Number(instance.prop.split('/').at(-1));
    if (!road || !catalogue.has(instance.prop))
      throw new Error(`Missing physical bridge source: ${instance.prop}`);
    const a = road.points[k],
      b = road.points[k + 1],
      dx = b[0] - a[0],
      dz = b[2] - a[2],
      length2 = dx * dx + dz * dz,
      co = Math.cos(instance.yaw),
      si = Math.sin(instance.yaw);
    bays++;
    for (const part of catalogue.get(instance.prop)!.parts) {
      if (part.surface !== SURFACES.asphalt) continue;
      for (let v = 0; v < part.positions.length; v += 3) {
        const x = instance.position[0] + part.positions[v] * co + part.positions[v + 2] * si,
          z = instance.position[2] - part.positions[v] * si + part.positions[v + 2] * co,
          t = ((x - a[0]) * dx + (z - a[2]) * dz) / length2,
          difference = instance.position[1] + part.positions[v + 1] - (a[1] + t * (b[1] - a[1]));
        vertices++;
        if (difference > 0.001 || difference < -0.301)
          mismatches.push({ name: instance.name ?? instance.prop, difference });
      }
    }
  }
  return { bays, vertices, deckToleranceM: 0.001, mismatches };
}
