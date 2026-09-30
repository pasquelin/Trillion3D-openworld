import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Site } from '../regions/countryside/site.ts';
import { dryFootprint } from './dry.ts';
import type { WorldPlan } from './contract.ts';

it('rejects interior and rotated shoreline pockets missed by corner and center checks', () => {
  const height = (x: number, z: number) => (Math.hypot(x - 20, z - 20) < 8 ? -1 : 2);
  const site = new Site(
    { height, roads: [], rivers: [] } as unknown as WorldPlan,
    { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 },
    [],
  );
  assert.equal(site.free({ x: 0, z: 0, hx: 50, hz: 50, yaw: 0 }), false);
  assert.equal(site.free({ x: 0, z: 0, hx: 50, hz: 50, yaw: 0 }, { inWater: true }), true);
  assert.equal(
    dryFootprint(() => 2, 0, 0, 50, 50, Math.PI / 4),
    true,
  );
  assert.equal(
    dryFootprint((x, z) => (x > 20 && z > 20 ? -1 : 2), 0, 0, 50, 50, Math.PI / 4),
    false,
  );
});
