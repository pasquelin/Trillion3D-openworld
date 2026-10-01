import assert from 'node:assert/strict';
import test from 'node:test';
import type { TerrainPlan } from '../plan/plan.ts';
import { box, prop, SURFACES } from '../props/index.ts';
import { landCoverage } from './coverage.ts';

const plan = {
  height: (x: number, z: number) => (Math.abs(x) < 100 && Math.abs(z) < 100 ? 100 : -10),
  biome: () => ({ owner: 'countryside', weights: { countryside: 1 } }),
  roads: [],
  rivers: [],
  lakes: [],
  airfields: {
    main: { minX: 10000, maxX: 11000, minZ: 10000, maxZ: 13000 },
    general: { minX: 12000, maxX: 13000, minZ: 10000, maxZ: 12000 },
  },
} as unknown as TerrainPlan;

test('coverage uses actual geometry instead of a distant mesh instance origin', () => {
  const near = prop('test', [box(SURFACES.concrete, [2, 2, 2])]),
    far = {
      ...near,
      parts: near.parts.map((part) => ({
        ...part,
        positions: part.positions.map((v, i) => (i % 3 === 0 ? v + 1000 : v)),
      })),
    },
    instance = { prop: 'test', position: [10, 100, 10] as const, yaw: 0 },
    a = landCoverage(plan, [instance], [near]),
    b = landCoverage(plan, [instance], [far]);
  assert.ok(a.within10mFraction > 0);
  assert.equal(b.within10mFraction, 0, 'an empty origin cannot certify geometry coverage');
  assert.equal(b.beyond30mFraction, 1);
});

test('positive-height inland water is excluded from dry exploration coverage', () => {
  const wet = {
      ...plan,
      lakes: [{ id: 'positive-water', x: 0, z: 0, radius: 80, level: 110, depth: 10 }],
    },
    dry = landCoverage(plan, [], []),
    water = landCoverage(wet, [], []);
  assert.ok(water.exceptions.water > dry.exceptions.water);
  assert.ok(water.eligibleCells < dry.eligibleCells);
});
