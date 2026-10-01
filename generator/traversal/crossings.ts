import type { Instance, PropMesh, Vec3 } from '../plan/contract.ts';
import { surface } from '../props/index.ts';

/** A narrow authored ramp makes the saved foot path an actual collision surface. */
export function crossingRamp(id: string, path: readonly Vec3[]) {
  const positions: number[] = [],
    indices: number[] = [];
  const a = path[0],
    b = path.at(-1)!,
    length = Math.hypot(b[0] - a[0], b[2] - a[2]),
    nx = -(b[2] - a[2]) / length,
    nz = (b[0] - a[0]) / length;
  for (const p of path)
    for (const side of [-1, 1])
      positions.push(
        p[0] + nx * side * 0.9 - a[0],
        p[1] - a[1] + 0.025,
        p[2] + nz * side * 0.9 - a[2],
      );
  for (let k = 1; k < path.length; k++) {
    const i = (k - 1) * 2;
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }
  const mesh: PropMesh = {
    id,
    collision: 'exact',
    parts: [
      {
        surface: surface('walkway concrete', [0.49, 0.48, 0.46], 0, 0.94),
        positions: new Float32Array(positions),
        indices: new Uint32Array(indices),
      },
    ],
  };
  const instance: Instance = { prop: id, position: a, yaw: 0, name: id };
  return { mesh, instance };
}

/** Crossings descend to the real road rather than interpolating a floating camera between blocks. */
export function crossingPath(a: Vec3, b: Vec3, height: (x: number, z: number) => number): Vec3[] {
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]),
    points: Vec3[] = [];
  const n = Math.ceil(length);
  for (let k = 0; k <= n; k++) {
    const t = k / n,
      x = a[0] + (b[0] - a[0]) * t,
      z = a[2] + (b[2] - a[2]) * t;
    const ramp = Math.max(a[1] - t * length * 0.25, b[1] - (1 - t) * length * 0.25);
    points.push([x, Math.max(height(x, z), ramp), z]);
  }
  // Carry actual pavement support across the approach at the same physical ramp grade.
  for (let k = 1; k <= n; k++)
    points[k] = [
      points[k][0],
      Math.max(points[k][1], points[k - 1][1] - (length / n) * 0.25),
      points[k][2],
    ];
  for (let k = n - 1; k >= 0; k--)
    points[k] = [
      points[k][0],
      Math.max(points[k][1], points[k + 1][1] - (length / n) * 0.25),
      points[k][2],
    ];
  return points;
}
