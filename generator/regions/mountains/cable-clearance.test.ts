/** Final emitted cable paths must clear the actual composed terrain, including moved supports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../../plan/plan.ts';
import { REGIONS } from '../index.ts';
import { mountainsRegion } from './index.ts';

for (const seed of [332, 333])
  test(`the settled cable and cabin path clears terrain for seed ${seed}`, () => {
    const plan = createPlan(seed, REGIONS),
      output = mountainsRegion.generate(plan),
      cabin = output.movers.find((m) => m.name === 'mountains/cabin-a');
    assert.ok(cabin && cabin.kind === 'path', 'both physical stations and cabin exist');
    const stations = output.instances.filter((i) => i.name?.endsWith('-station'));
    assert.equal(stations.length, 2);
    for (let i = 1; i < cabin.points.length; i++) {
      const a = cabin.points[i - 1],
        b = cabin.points[i],
        steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 10));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps,
          x = a[0] + t * (b[0] - a[0]),
          z = a[2] + t * (b[2] - a[2]),
          y = a[1] + t * (b[1] - a[1]),
          nearStation = stations.some((s) => Math.hypot(x - s.position[0], z - s.position[2]) < 70);
        assert.ok(
          y - plan.height(x, z) >= (nearStation ? 6.5 : 14.5) - 0.1,
          `cable clearance at ${x},${z}: ${y - plan.height(x, z)}`,
        );
      }
    }
  });
