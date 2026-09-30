/** One shared organic lake outline for its basin, water mesh, erosion and shoreline placement. */
export type LakeShore = { yaw: number; ratio: number; phase: number };
type Outline = { radius: number; shore?: LakeShore };

export function lakeRadiusAt(lake: Outline, angle: number) {
  if (!lake.shore) return lake.radius;
  const { yaw, ratio, phase } = lake.shore,
    a = angle - yaw,
    ellipse = 1 / Math.hypot(Math.cos(a), Math.sin(a) / ratio),
    bays = 0.82 + 0.1 * Math.sin(3 * a + phase) + 0.06 * Math.sin(5 * a - phase);
  return lake.radius * ellipse * bays;
}

/** Normalized radial distance: the same `radius` threshold works for circular legacy lakes. */
export function lakeDistance(lake: Outline & { x: number; z: number }, x: number, z: number) {
  const dx = x - lake.x,
    dz = z - lake.z,
    radius = lakeRadiusAt(lake, Math.atan2(dz, dx));
  return (Math.hypot(dx, dz) * lake.radius) / radius;
}
