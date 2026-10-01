/** Curved urban earthworks give shared street blocks buildable ground without biome rectangles. */
import { CITY_CORES } from './geography.ts';
import { lerp, smoothstep } from './noise.ts';

type Height = (x: number, z: number) => number;

/** Each core's level is the mean dry natural ground beneath its inner neighbourhood. */
export function urbanGround(height: Height) {
  const plains = CITY_CORES.map((core) => {
    let sum = 0,
      count = 0;
    for (let dx = -core.radius / 2; dx <= core.radius / 2; dx += 100)
      for (let dz = -core.radius / 2; dz <= core.radius / 2; dz += 100) {
        const h = height(core.x + dx, core.z + dz);
        if (h > 3) {
          sum += h;
          count++;
        }
      }
    if (!count) throw new Error(`${core.id}: no dry urban ground`);
    return { ...core, level: sum / count };
  });
  return (x: number, z: number, natural: number) => {
    let shaped = natural;
    for (const plain of plains) {
      const distance = Math.hypot(x - plain.x, z - plain.z),
        weight = smoothstep(plain.radius * 1.8, plain.radius * 1.1, distance);
      shaped = lerp(shaped, plain.level, weight);
    }
    return shaped;
  };
}

/** Keep routed water outside the fully levelled urban plateau and its bank clearance. */
export const urbanPlateau = (x: number, z: number, margin = 0) =>
  CITY_CORES.some((core) => Math.hypot(x - core.x, z - core.z) < core.radius * 1.1 + margin);
