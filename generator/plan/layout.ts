/** Shared organic land ownership. Bounds are sampling envelopes, never painted biome edges. */
import { WORLD, type Bounds, type RegionName } from './contract.ts';
import { AIRFIELD_AREAS, CITY_CORES, HARBOUR_SITE, mountainEnvelope } from './geography.ts';
import { nameSeed, smoothstep } from './noise.ts';
import { enclosingCoast } from './shore.ts';
import { airportInfluence } from './airfields.ts';

const HALF = WORLD.size / 2,
  whole: Bounds = { minX: -HALF, minZ: -HALF, maxX: HALF, maxZ: HALF },
  defaultCoast = enclosingCoast(nameSeed(nameSeed(WORLD.seed, 'relief'), 'relief/south'));

/** The regions in a fixed order; arrays of weights follow it. */
export const REGIONS: readonly RegionName[] = [
  'mountains',
  'city',
  'airport',
  'desert',
  'countryside',
  'coast',
];

/** Overlapping envelopes allow generators to reach every curved ownership boundary. */
export const REGION_BOUNDS: Record<RegionName, Bounds> = {
  mountains: { ...whole, maxZ: 500 },
  city: whole,
  airport: whole,
  desert: { ...whole, maxX: -1_300, maxZ: 900 },
  countryside: whole,
  coast: whole,
};

/** Regional transition distance, metres. Airport geometry itself retains exact clearances. */
const BAND = 400;

/** Smooth land weights, including rural ground between centres and around the whole massif. */
export function landWeights(
  x: number,
  z: number,
  out = new Float64Array(REGIONS.length),
  coast: (x: number, z: number) => number = defaultCoast,
) {
  const airport = airportInfluence(AIRFIELD_AREAS, x, z, BAND),
    city =
      1 -
      CITY_CORES.reduce(
        (remaining, core) =>
          remaining * (1 - smoothstep(1.5, 0.7, Math.hypot(x - core.x, z - core.z) / core.radius)),
        1 -
          smoothstep(
            1.5,
            0.7,
            Math.hypot(x - HARBOUR_SITE.x, z - HARBOUR_SITE.z) / HARBOUR_SITE.radius,
          ),
      ),
    mountains = smoothstep(0.08, 0.4, mountainEnvelope(x, z)),
    desert = smoothstep(1.3, 0.6, Math.hypot((x + 2_850) / 800, (z + 1_100) / 1_500)),
    shore = smoothstep(650, 100, coast(x, z));
  let remaining = 1;
  for (const [index, mask] of [
    [2, airport],
    [1, city],
    [0, mountains],
    [3, desert],
    [5, shore],
  ]) {
    out[index] = remaining * mask;
    remaining *= 1 - mask;
  }
  out[4] = remaining;
  return out;
}
