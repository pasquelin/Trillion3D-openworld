/** Original enclosing island with continuously curved, seeded shores and an outer ocean margin. */
import { fbm, smoothstep } from './noise.ts';

/** Signed inland distance: a warped oval, with no straight biome or shoreline edges. */
export function enclosingCoast(seed: number) {
  return (x: number, z: number) => {
    const wx = x + 150 * fbm(seed, x / 1_800, z / 1_800, 3),
      wz =
        z +
        350 +
        160 * fbm(seed + 1, x / 2_200, z / 2_200, 3) +
        140 * Math.sin(x / 620 + seed * 0.013) +
        65 * Math.sin(x / 235 + z / 950 + seed * 0.031),
      radius = (Math.abs(wx / 3_600) ** 2.8 + Math.abs(wz / 3_200) ** 2.8) ** (1 / 2.8);
    return (1 - radius) * 3_200;
  };
}

/** Fade terrain shaping at sea level; no later platform/refinement/road can reclaim the sea. */
export function preserveShore(base: number, shaped: number, inland = base, band = 0.5) {
  return base + smoothstep(0, band, inland) * (shaped - base);
}
