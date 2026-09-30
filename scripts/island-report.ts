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
      shoreProfiles: [-3000, -1500, 0, 1500, 3000].map((x) => {
        const z = plan.relief.southCoastZ(x);
        return {
          x,
          z,
          heights: [-100, -25, 0, 25, 100].map((offset) => plan.height(x, z + offset)),
        };
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
