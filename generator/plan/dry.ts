/** Sample an oriented footprint at <=25 m spacing, including its center and boundary. */
export function dryFootprint(
  height: (x: number, z: number) => number,
  x: number,
  z: number,
  halfX: number,
  halfZ: number,
  yaw = 0,
) {
  if (height(x, z) <= 0) return false;
  const nx = Math.max(1, Math.ceil((halfX * 2) / 25)),
    nz = Math.max(1, Math.ceil((halfZ * 2) / 25)),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      const dx = (i / nx - 0.5) * halfX * 2,
        dz = (j / nz - 0.5) * halfZ * 2;
      if (height(x + dx * c + dz * s, z - dx * s + dz * c) <= 0) return false;
    }
  return true;
}
