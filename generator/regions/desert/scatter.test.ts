import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorldPlan } from '../../plan/contract.ts';
import { desertProps, footprints } from './catalog.ts';
import { Site } from './site.ts';
import { scatter } from './scatter.ts';
import type { Build } from './build.ts';

for (const seed of [332, 333])
  test(`new dry desert ownership is populated without wet or runway plants, seed ${seed}`, () => {
    const plan = {
        seed,
        roads: [
          {
            id: 'access',
            class: 'secondary',
            width: 10,
            points: [
              [0, 100, -250],
              [0, 100, 250],
            ],
          },
        ],
        rivers: [],
        height: (x: number) => (x < -150 ? -5 : x > 180 ? 100 + (x - 180) * 4 : 100),
        biome: (x: number, z: number) => ({
          owner: Math.hypot(x - 90, z) < 45 ? 'airport' : 'desert',
          weights: {},
        }),
      } as unknown as WorldPlan,
      needs = footprints(desertProps(seed)),
      bounds = { minX: -250, maxX: 250, minZ: -250, maxZ: 250 },
      generate = () => {
        const site = new Site(plan, bounds, needs),
          build = {
            plan,
            site,
            seed,
            props: [],
            lights: [],
            markers: [],
            movers: [],
            roads: [],
          } satisfies Build;
        scatter(build, 400);
        return site.instances;
      },
      instances = generate();
    assert.ok(
      instances.length > 80,
      `${instances.length}: old authored sand/rock rectangles must not empty the new biome`,
    );
    assert.ok(instances.length <= 400);
    assert.deepEqual(instances, generate());
    for (const i of instances) {
      assert.ok(plan.height(i.position[0], i.position[2]) > 0);
      assert.equal(plan.biome(i.position[0], i.position[2]).owner, 'desert');
      assert.ok(Math.abs(i.position[0]) > 5, 'actual road corridor remains clear');
      assert.ok(i.position[0] < 190, 'steep cliff faces are not vegetation targets');
    }
  });
