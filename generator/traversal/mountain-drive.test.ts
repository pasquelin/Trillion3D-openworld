/** The lowland ring reaches the mountain stop through its authored graded pass. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../plan/plan.ts';
import { REGIONS } from '../regions/index.ts';
import { drivingRoutes } from './routes.ts';

for (const seed of [332, 333])
  test(`D1 reaches the real mountain pass checkpoint for seed ${seed}`, () => {
    const plan = createPlan(seed, REGIONS),
      result = drivingRoutes(plan, plan.roads),
      town = plan.settlements.find((s) => s.id === 'mountains-town')!,
      pass = plan.roads.find((r) => r.id === 'mountains-town/road')!;
    assert.ok(pass && pass.class === 'pass');
    assert.deepEqual(result.failures, []);
    const drive = result.routes.find((r) => r.id === 'D1')!;
    assert.ok(
      drive.samples.some(
        (s) => Math.hypot(s.position[0] - town.centre[0], s.position[2] - town.centre[2]) < 150,
      ),
      'the route visits the mountain stop',
    );
    assert.ok(
      drive.samples.some((s) =>
        pass.points.some(
          (p) =>
            Math.hypot(s.position[0] - p[0], s.position[1] - 1.7 - p[1], s.position[2] - p[2]) <
            0.1,
        ),
      ),
      'the route uses the physical pass deck',
    );
  });
