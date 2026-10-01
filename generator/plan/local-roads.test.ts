import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TerrainPlan } from './plan.ts';
import { SURFACE } from './surfaces.ts';
import { flatParts } from './water.ts';

test('local streets contribute asphalt to the terrain tile geometry', () => {
  const plan = { rivers: [], lakes: [], courses: [] } as unknown as TerrainPlan;
  const road = {
    id: 'city/avenue-h0_0',
    class: 'avenue' as const,
    width: 20,
    points: [
      [0, 12, 0],
      [100, 12, 0],
    ] as const,
  };
  const parts = flatParts(plan, 0.2, [road]);
  const asphalt = [...parts.values()].flat().find((part) => part.surface === SURFACE.asphalt);
  assert.ok(asphalt);
  assert.equal(asphalt.indices.length, 6);
  assert.deepEqual(
    asphalt.positions.filter((_, index) => index % 3 === 1),
    [12.2, 12.2, 12.2, 12.2],
  );
});
