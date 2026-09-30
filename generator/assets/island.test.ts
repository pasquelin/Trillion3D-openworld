import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { WorldPlan } from '../plan/contract.ts';
import { islandBuildings } from './island.ts';
import { BUILDING_ASSETS } from './source.ts';
import { overlaps, corners, turn, type Obb } from '../regions/city/frame.ts';
import { prop } from '../props/transform.ts';
import { box, plane } from '../props/shapes.ts';
import { SURFACES } from '../props/surfaces.ts';

function flatPlan(height = 20): WorldPlan {
  const region = {
    bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 },
    seed: 332,
    budget: { triangles: 100_000, nodes: 1000 },
  };
  return {
    seed: 332,
    height: () => height,
    biome: () => ({ owner: 'city', weights: { city: 1 } }),
    regions: {
      city: region,
      airport: region,
      mountains: region,
      desert: region,
      coast: region,
      countryside: region,
    },
    roads: [
      {
        id: 'avenue',
        class: 'avenue',
        width: 20,
        points: [
          [-500, 20, 0],
          [500, 20, 0],
        ],
      },
    ],
    rivers: [],
    bridges: [],
    settlements: [
      { id: 'test-city', kind: 'city', region: 'city', centre: [0, 20, 0], radius: 600 },
    ],
    subSeed: () => 332,
  };
}

test('supplemental CC0 civic lots stay dry and clear of placed objects, streets and each other', () => {
  const plan = flatPlan(),
    obstacle = prop('test-building', [box(SURFACES.concrete, [80, 20, 80])]),
    instances = [{ prop: obstacle.id, position: [60, 20, 60] as const, yaw: 0 }],
    result = islandBuildings(plan, [obstacle], instances, plan.roads),
    blocked: Obb = { centre: [60, 60], half: [40, 40], yaw: 0 };
  assert.equal(result.buildings.length, BUILDING_ASSETS.length);
  for (const building of result.buildings) {
    assert.equal(building.class, 'civic');
    assert.equal(
      building.height,
      BUILDING_ASSETS.find((a) => a.id === building.asset)!.normalizedBoundsMetres.max[1],
    );
    assert.ok(!overlaps(building.footprint, blocked));
    assert.ok(
      corners(building.footprint).every(([x, z]) => plan.height(x, z) > 1 && Math.abs(z) > 12),
    );
    assert.ok(building.instance.position[1] > 20);
  }
  assert.ok(!overlaps(result.buildings[0].footprint, result.buildings[1].footprint));
  assert.deepEqual(islandBuildings(plan, [obstacle], instances, plan.roads), result);
});

test('no fit is a named failure rather than silent missing content or buildings in water', () => {
  const plan = flatPlan(-1);
  assert.throws(() => islandBuildings(plan, [], [], plan.roads), /No clear dry civic lot/);
});

test('ocean below dry land does not block the whole city through its broad source bounds', () => {
  const plan = flatPlan(),
    sea = prop('test-ocean', [plane(SURFACES.glass, 8000, 8000)]);
  assert.equal(
    islandBuildings(plan, [sea], [{ prop: sea.id, position: [0, 0, 0], yaw: 0 }], plan.roads)
      .buildings.length,
    2,
  );
});

test('positive-height pond inside a civic footprint rejects a lot with dry center and corners', () => {
  const plan = flatPlan(),
    initial = islandBuildings(plan, [], [], plan.roads).buildings[0].footprint;
  const offset = turn([initial.half[0] * 0.6, initial.half[1] * 0.2], initial.yaw);
  const pond = {
    id: 'interior-pond',
    x: initial.centre[0] + offset[0],
    z: initial.centre[1] + offset[1],
    radius: 1.25,
    level: 21,
    depth: 1,
  };
  assert.ok(
    [initial.centre, ...corners(initial)].every(
      ([x, z]) => Math.hypot(x - pond.x, z - pond.z) > pond.radius,
    ),
  );
  assert.ok(plan.height(pond.x, pond.z) > 0);
  Object.assign(plan, { natural: plan.height, lakes: [pond], tunnels: [] });
  const result = islandBuildings(plan, [], [], plan.roads);
  assert.notDeepEqual(result.buildings[0].footprint, initial);
});
