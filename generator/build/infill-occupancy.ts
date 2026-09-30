/** Conservative transformed mesh bounds for candidate rejection, never for coverage certification. */
import type { Instance, PropMesh } from '../plan/contract.ts';
type Footprint = { minX: number; maxX: number; minZ: number; maxZ: number; radius: number };
export function propFootprints(meshes: readonly PropMesh[]) {
  const result = new Map<string, Footprint>();
  for (const mesh of meshes) {
    const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, radius: 0 };
    for (const part of mesh.parts)
      for (let k = 0; k < part.positions.length; k += 3) {
        const x = part.positions[k],
          z = part.positions[k + 2];
        box.minX = Math.min(box.minX, x);
        box.maxX = Math.max(box.maxX, x);
        box.minZ = Math.min(box.minZ, z);
        box.maxZ = Math.max(box.maxZ, z);
        box.radius = Math.max(box.radius, Math.hypot(x, z));
      }
    result.set(mesh.id, box);
  }
  return result;
}
export function occupiedCells(
  instances: readonly Instance[],
  boxes: ReadonlyMap<string, Footprint>,
  size: number,
  cell: number,
) {
  const side = Math.ceil(size / cell),
    used = new Uint8Array(side * side);
  for (const { prop, position, scale = 1, yaw = 0 } of instances) {
    const box = boxes.get(prop);
    if (!box || !Number.isFinite(box.minX)) continue;
    const sx = typeof scale === 'number' ? scale : scale[0],
      sz = typeof scale === 'number' ? scale : scale[2],
      c = Math.cos(yaw),
      s = Math.sin(yaw),
      corners = [box.minX, box.maxX].flatMap((x) =>
        [box.minZ, box.maxZ].map((z) => [
          position[0] + x * sx * c + z * sz * s,
          position[2] - x * sx * s + z * sz * c,
        ]),
      ),
      xs = corners.map((p) => p[0]),
      zs = corners.map((p) => p[1]),
      [i0, i1, k0, k1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)].map(
        (v) => Math.min(side - 1, Math.max(0, Math.floor((v + size / 2) / cell))),
      );
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) used[k * side + i] = 1;
  }
  return used;
}
