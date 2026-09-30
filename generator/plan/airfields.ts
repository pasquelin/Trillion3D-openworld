/** Real airfield earthworks: two level platforms, shared by relief, roads and physical runways. */
import type { Bounds } from './contract.ts';
import type { Platform } from './carve.ts';
import { AIRFIELD_AREAS } from './geography.ts';
import { STEP, type HeightGrid } from './route.ts';
import { lerp, smoothstep } from './noise.ts';

export type AirfieldPlatforms = Record<'main' | 'general', Platform>;

/** A 900 m runway with separate parallel taxiway and 150 m clear approach ends. */
export const GENERAL_FIELD = { length: 900, width: 23, overrun: 150, taxiwayWidth: 12 } as const;

/** Mean dry ground under an authored reservation; refuse water rather than reclaiming it. */
export function platformAt(grid: HeightGrid, area: Bounds, name: string): Platform {
  let sum = 0,
    count = 0;
  for (let z = area.minZ; z <= area.maxZ; z += STEP)
    for (let x = area.minX; x <= area.maxX; x += STEP) {
      const height = grid.at(x, z);
      if (height < 2) throw new Error(`${name}: reserved platform reaches water at ${x},${z}`);
      const fields = {
        main: { ...AIRFIELD_AREAS.main, level: 0 },
        general: { ...AIRFIELD_AREAS.general, level: 0 },
      };
      if (onOperationalAirfield(fields, x, z)) {
        sum += height;
        count++;
      }
    }
  if (!count) throw new Error(`${name}: no operational ground samples`);
  return { ...area, level: Math.max(sum / count, 8) };
}

export const generalPlatform = (grid: HeightGrid) =>
  platformAt(grid, AIRFIELD_AREAS.general, 'general airfield');

/** Actual operational pads, distinct from their larger obstacle/river reservation. */
const outside = (area: Bounds, x: number, z: number, pad: number) =>
  x < area.minX - pad || x > area.maxX + pad || z < area.minZ - pad || z > area.maxZ + pad;

function mainDistances(main: Bounds, x: number, z: number) {
  const centreZ = (main.minZ + main.maxZ) / 2,
    originX = main.maxX - 330,
    capsule = (cx: number, halfLength: number, radius: number) =>
      Math.hypot(x - cx, Math.max(0, Math.abs(z - centreZ) - halfLength)) - radius;
  return [
    capsule(originX - 900, 1_570, 80),
    capsule(originX - 450, 1_570, 80),
    capsule(originX - 675, 1_230, 35),
    capsule(originX - 270, 1_230, 50),
    // Apron, freight, terminal and car park share a compact rounded central pad.
    Math.hypot(
      Math.max(0, Math.abs(x - (originX + 15)) - 305),
      Math.max(0, Math.abs(z - centreZ) - 650),
    ) - 35,
    // Maintenance and freight aprons follow their actual authored paved footprints.
    ...[-1_085, 1_130].map(
      (offset) =>
        Math.hypot(
          Math.max(0, Math.abs(x - (originX - 180)) - 100),
          Math.max(0, Math.abs(z - centreZ - offset) - 330),
        ) - 25,
    ),
    ...[-1_230, 0, 1_230].map(
      (offset) =>
        Math.hypot(Math.max(0, Math.abs(x - (originX - 585)) - 315), z - centreZ - offset) - 25,
    ),
  ];
}

function generalDistances(general: Bounds, x: number, z: number) {
  const gz = (general.minZ + general.maxZ) / 2,
    gx = general.minX + 85,
    runway = Math.hypot(x - gx, Math.max(0, Math.abs(z - gz) - 600)) - 45,
    taxi = Math.hypot(x - gx - 55, Math.max(0, Math.abs(z - gz) - 500)) - 30,
    pad =
      Math.hypot(
        Math.max(0, Math.abs(x - (general.maxX - 85)) - 90),
        Math.max(0, Math.abs(z - gz) - 200),
      ) - 25;
  return [runway, taxi, pad];
}

/** Keep plants and residential plots away from real strips, pads and approach ends. */
export function onOperationalAirfield(fields: AirfieldPlatforms, x: number, z: number, margin = 0) {
  return (
    Math.min(...mainDistances(fields.main, x, z), ...generalDistances(fields.general, x, z)) <=
    margin
  );
}

const union = (distances: number[], band: number) =>
  1 - distances.reduce((rest, d) => rest * smoothstep(0, band, d), 1);

/** Organic regional ownership follows the useful field, not its rectangular reservation. */
export function airportInfluence(
  fields: Record<'main' | 'general', Bounds>,
  x: number,
  z: number,
  band: number,
  generalFactor = 1,
) {
  const main = outside(fields.main, x, z, band + 100)
      ? 0
      : union(mainDistances(fields.main, x, z), band),
    general = outside(fields.general, x, z, band + 100)
      ? 0
      : union(generalDistances(fields.general, x, z), band);
  return main + general * generalFactor * (1 - main);
}

/** Smooth cut/fill union preserves exact runway levels without flattening either reservation. */
export function levelAirfields(airfields: AirfieldPlatforms) {
  return (x: number, z: number, height: number) => {
    const main = outside(airfields.main, x, z, 550)
      ? height
      : lerp(
          height,
          airfields.main.level,
          union(
            // Small remote aprons have 300 m shoulders; the runway/campus blend stays 450 m.
            mainDistances(airfields.main, x, z).map((d, i) => (i === 5 || i === 6 ? d * 1.5 : d)),
            450,
          ),
        );
    return lerp(
      main,
      airfields.general.level,
      union(generalDistances(airfields.general, x, z), 250),
    );
  };
}

/** Conservative routing reservation; vegetation uses the narrower operational mask above. */
export const onAirfield = (fields: AirfieldPlatforms, x: number, z: number, margin = 0) =>
  Object.values(fields).some(
    (p) => x > p.minX - margin && x < p.maxX + margin && z > p.minZ - margin && z < p.maxZ + margin,
  );
