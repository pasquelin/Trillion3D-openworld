/** Sample an oriented footprint at bounded spacing, including its center and boundary. */
export function dryFootprint(
  height: (x: number, z: number) => number,
  x: number,
  z: number,
  halfX: number,
  halfZ: number,
  yaw = 0,
  spacing = 25,
) {
  if (!Number.isFinite(spacing) || spacing <= 0) throw new Error('Invalid footprint spacing');
  const dry = (x: number, z: number) => {
    const h = height(x, z);
    return Number.isFinite(h) && h > 0;
  };
  if (!dry(x, z)) return false;
  const nx = Math.max(1, Math.ceil((halfX * 2) / spacing)),
    nz = Math.max(1, Math.ceil((halfZ * 2) / spacing)),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= nz; j++) {
      const dx = (i / nx - 0.5) * halfX * 2,
        dz = (j / nz - 0.5) * halfZ * 2;
      if (!dry(x + dx * c + dz * s, z - dx * s + dz * c)) return false;
    }
  return true;
}
