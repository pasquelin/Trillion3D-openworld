/** Report original design values separately from generated output; never cooks assets. */
import { placeWorld } from '../generator/build/world.ts';
import { islandCensus } from '../generator/plan/island.ts';
import { WORLD } from '../generator/plan/contract.ts';
import { cookKey } from './cook-key.ts';

const seed = Number(process.argv[2] ?? WORLD.seed),
  world = placeWorld(seed),
  plan = world.plan;
console.log(
  JSON.stringify(
    {
      seed,
      cookKey: cookKey(),
      designLandKm2: 42,
      toleranceKm2: 3,
      measurement: 'Areas and dry connectivity are approximate cell-center samples on a 25 m grid.',
      ...islandCensus(plan),
      shoreProfiles: ['north', 'south', 'west', 'east'].flatMap((edge) => {
        const horizontal = edge === 'west' || edge === 'east',
          sign = edge === 'north' || edge === 'west' ? -1 : 1,
          along = horizontal ? [-3000, -2000, -500, 1000, 2000] : [-3000, -1500, 0, 1500, 3000];
        return along.map((value) => {
          let low = 0,
            high = WORLD.size / 2;
          const at = (distance: number): [number, number] =>
            horizontal ? [sign * distance, value] : [value, -500 + sign * distance];
          for (let k = 0; k < 32; k++) {
            const mid = (low + high) / 2;
            if (plan.relief.coast(...at(mid)) > 0) low = mid;
            else high = mid;
          }
          const distance = (low + high) / 2,
            [x, z] = at(distance);
          return {
            edge,
            x,
            z,
            heights: [-100, -25, 0, 25, 100].map((offset) => plan.height(...at(distance + offset))),
          };
        });
      }),
      settlements: plan.settlements.map(({ id, centre }) => ({ id, centre })),
      failedConnections: plan.failedConnections,
      roads: plan.roads.map(({ id, points }) => ({ id, points: points.length })),
      placements: world.instances.length,
      markers: world.markers.map(({ name, position }) => ({ name, position })),
    },
    null,
    2,
  ),
);
