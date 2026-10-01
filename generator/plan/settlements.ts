/**
 * The settlements of the world (Trillion3D#332): the city at the main river's mouth, its port, the airport
 * on its platform, a town per region, villages on the flattest land around seeded spots, a ski
 * resort high in the mountains and a small port on the largest island.
 */
import { WORLD, type RegionName, type Settlement, type Vec3 } from './contract.ts';
import type { Platform } from './carve.ts';
import { REGION_BOUNDS, REGIONS, landWeights } from './layout.ts';
import { CITY_CORES, HARBOUR_SITE } from './geography.ts';
import type { Island } from './relief.ts';
import type { Ground } from './roads.ts';
import { best, RADIUS, seededSpot, settle, slopeAt } from './sites.ts';

/** Villages per region: a design of how busy each land is, not a measurement. */
const VILLAGES: Partial<Record<RegionName, number>> = {
  countryside: 7,
  mountains: 3,
  coast: 3,
  desert: 2,
};
/** Where each region's town is sought: a spot, searched within 1.2 km for flat dry land. */
const TOWNS: Partial<Record<RegionName, [number, number]>> = {
  countryside: [1_000, 500],
  desert: [-3_300, -1_100],
  coast: [2_800, 2_000],
  mountains: [-2_500, -2_100],
};

export function planSettlements(
  ground: Ground,
  seed: number,
  mouth: readonly [number, number],
  platform: Platform,
  islands: readonly Island[],
  mainland: (x: number, z: number) => boolean = () => true,
): Settlement[] {
  const out: Settlement[] = [],
    add = (id: string, kind: Settlement['kind'], region: RegionName, centre: Vec3) =>
      out.push({ id, kind, region, centre, radius: RADIUS[kind] });
  const spaced = (x: number, z: number, h: number) =>
    h > 3 &&
    !ground.wet(x, z) &&
    mainland(x, z) &&
    out.every((s) => Math.hypot(s.centre[0] - x, s.centre[2] - z) > s.radius + 300);
  const at = (x: number, z: number): Vec3 => [x, ground.height(x, z), z];
  const owner = (x: number, z: number) => {
    const weights = landWeights(x, z);
    return REGIONS[weights.indexOf(Math.max(...weights))];
  };
  for (const core of CITY_CORES) {
    const centre = settle(
      ground.grid,
      [core.x, core.z],
      350,
      REGION_BOUNDS.city,
      core.radius,
      (x, z, h) => h > 3 && !ground.wet(x, z) && owner(x, z) === 'city',
    );
    if (!centre) throw new Error(`No dry site for ${core.id}`);
    out.push({
      id: core.id,
      kind: core.primary ? 'city' : 'town',
      region: 'city',
      centre,
      radius: core.radius,
    });
  }
  const portX = HARBOUR_SITE.x,
    port = best(
      ground.grid,
      { minX: portX - 500, maxX: portX + 500, minZ: mouth[1] - 2_000, maxZ: mouth[1] + 500 },
      (x, z, h) => (h > 2 ? z : -Infinity),
    );
  if (port) add('port', 'port', 'city', port);
  add(
    'airport',
    'airport',
    'airport',
    at((platform.minX + platform.maxX) / 2, (platform.minZ + platform.maxZ) / 2),
  );
  for (const [region, spot] of Object.entries(TOWNS) as [RegionName, [number, number]][]) {
    const centre = settle(
      ground.grid,
      spot,
      region === 'desert' ? 100 : 1_200,
      REGION_BOUNDS[region],
      region === 'desert' ? 500 : RADIUS.town,
      (x, z, h) =>
        (region === 'desert'
          ? h > 3 &&
            !ground.wet(x, z) &&
            mainland(x, z) &&
            out.every(
              (s) =>
                Math.hypot(s.centre[0] - x, s.centre[2] - z) >
                (s.id === 'city-west' ? s.radius : s.id === 'airport' ? 1_200 : s.radius + 300),
            )
          : spaced(x, z, h)) &&
        owner(x, z) === region &&
        (region !== 'mountains' || h > 350) &&
        (region !== 'desert' || h < 200) &&
        h < (region === 'mountains' ? 500 : WORLD.peak * 0.75),
    );
    if (centre) add(`${region}-town`, 'town', region, centre);
  }
  const resort = best(ground.grid, REGION_BOUNDS.mountains, (x, z, h) =>
    spaced(x, z, h) && owner(x, z) === 'mountains'
      ? -Math.abs(h - WORLD.peak * 0.75) / 100 - slopeAt(ground.grid, x, z) * 20
      : -Infinity,
  );
  if (resort) add('ski-resort', 'resort', 'mountains', resort);
  for (const [region, count] of Object.entries(VILLAGES) as [RegionName, number][])
    for (let index = 0; index < count; index++) {
      const spot = seededSpot(ground.grid, seed, region, index),
        centre = settle(
          ground.grid,
          spot,
          1_500,
          REGION_BOUNDS[region],
          RADIUS.village,
          (x, z, h) => spaced(x, z, h) && owner(x, z) === region && h < 1_600,
        );
      if (centre) add(`${region}-village-${index}`, 'village', region, centre);
    }
  // The island port stands on the largest island inside the coast region.
  const coast = REGION_BOUNDS.coast,
    island = islands
      .filter((i) => i.x > 0 && i.x - i.radius > coast.minX && i.z > coast.minZ && i.z < coast.maxZ)
      .sort((a, b) => b.radius * b.top - a.radius * a.top)[0],
    islandPort =
      island &&
      settle(
        ground.grid,
        [island.x, island.z],
        500,
        coast,
        RADIUS.port,
        (x, z, h) => h < 12 && Math.hypot(x - island.x, z - island.z) < island.radius * 1.5,
      );
  if (islandPort) add('island-port', 'port', 'coast', islandPort);
  return out;
}
