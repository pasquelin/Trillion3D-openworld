/** Shared authored geographic frame for the continuous island, in metres (+Z south). */
import type { Bounds } from './contract.ts';

/** Five original urban centres; builders search nearby dry ground rather than copying a map. */
export const CITY_CORES = [
  { id: 'city', x: -200, z: 1_600, radius: 1_050, primary: true },
  { id: 'city-west', x: -3_000, z: -650, radius: 450, primary: false },
  { id: 'city-interior', x: -100, z: -600, radius: 550, primary: false },
  { id: 'city-northeast', x: 1_750, z: -1_100, radius: 500, primary: false },
  { id: 'city-east', x: 2_250, z: 850, radius: 500, primary: false },
] as const;

export const HARBOUR_SITE = { x: 1_350, z: 2_450, radius: 700 } as const;

/** Compact airfield reservations include runway overruns; buildings remain on the east side. */
export const AIRFIELD_AREAS: Record<'main' | 'general', Bounds> = {
  main: { minX: -2_450, maxX: -1_100, minZ: -1_400, maxZ: 1_900 },
  general: { minX: 2_900, maxX: 3_300, minZ: -1_550, maxZ: -350 },
};

/** A broad curved massif with foothills, without any rectangular altitude cutoff. */
export function mountainEnvelope(x: number, z: number): number {
  const ridge = -2_250 + 250 * Math.sin((x + 700) / 1_300),
    west = Math.exp(-(((x + 850) / 1_650) ** 2 + ((z - ridge) / 1_000) ** 2)),
    east = 0.58 * Math.exp(-(((x - 1_500) / 900) ** 2 + ((z + 2_100) / 850) ** 2));
  return west + east - west * east;
}
