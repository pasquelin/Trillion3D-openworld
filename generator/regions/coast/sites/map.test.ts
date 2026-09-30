import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorldPlan } from '../../../plan/contract.ts';
import { coastMap } from './map.ts';

test('a mainland surrounded by sea retains mainland shores and separate islet shores', () => {
  const plan = {
    height: (x: number, z: number) =>
      Math.hypot(x, z) < 250 || Math.hypot(x - 400, z - 350) < 60 ? 2 : -2,
    biome: () => ({ owner: 'coast', weights: { coast: 1 } }),
  } as unknown as WorldPlan;
  const map = coastMap(plan, { minX: -600, maxX: 600, minZ: -600, maxZ: 600 });
  assert.ok(map.shores.some((shore) => !shore.island));
  assert.ok(map.shores.some((shore) => shore.island));
  assert.ok(map.shores.filter((shore) => !shore.island).every((s) => Math.hypot(s.x, s.z) < 250));
});
