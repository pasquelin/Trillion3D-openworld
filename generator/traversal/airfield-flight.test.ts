import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from '../plan/plan.ts';
import { REGIONS } from '../regions/index.ts';
import { layout } from '../regions/airport/index.ts';
import { airfieldFlight } from './airfield-flight.ts';
for (const seed of [332, 333])
  test(`A-to-B source flight has distinct real endpoints and bounded climb/descent, seed ${seed}`, () => {
    const plan = createPlan(seed, REGIONS),
      airport = layout(plan),
      result = airfieldFlight(plan, airport.output.roads, airport.output.markers);
    assert.deepEqual(result.failures, []);
    const flight = result.routes[0];
    assert.ok(flight.length > 4000 && flight.length < 25000);
    assert.deepEqual(result, airfieldFlight(plan, airport.output.roads, airport.output.markers));
    for (const [k, pose] of flight.samples.entries()) {
      const [x, y, z] = pose.position;
      assert.ok(y >= plan.height(x, z) + 1.6, JSON.stringify(pose));
      assert.ok(Math.abs(x) <= 4000 && Math.abs(z) <= 4000 && y <= 3200);
      if (k) {
        const previous = flight.samples[k - 1].position;
        assert.ok(
          Math.abs(y - previous[1]) <= 0.08001 * Math.hypot(x - previous[0], z - previous[2]),
        );
        assert.ok(pose.seconds > flight.samples[k - 1].seconds);
      }
    }
  });
