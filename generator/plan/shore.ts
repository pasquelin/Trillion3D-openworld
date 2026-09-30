/** Original design: 7.2 × 6 km rounded island, 700 m corners, >=250 m outer ocean. */
import { fbm, smoothstep } from './noise.ts';

/** Signed inland distance: the southern bay varies, all other shores enclose the relief. */
export function enclosingCoast(seed: number) {
  return (x: number, z: number) => {
    const dx = Math.abs(x) - 2_900,
      dz = Math.abs(z + 500) - 2_300,
      rounded = 700 - Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) - Math.min(Math.max(dx, dz), 0),
      south = 2_500 + 120 * fbm(seed, x / 2_500, 0.5, 3) - z;
    return Math.min(rounded, south);
  };
}

/** Fade terrain shaping at sea level; no later platform/refinement/road can reclaim the sea. */
export function preserveShore(base: number, shaped: number, inland = base, band = 0.5) {
  return base + smoothstep(0, band, inland) * (shaped - base);
}
