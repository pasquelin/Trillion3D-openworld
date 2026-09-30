import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorldPlan } from '../../plan/contract.ts';
import { boatSpawn } from './boat-spawn.ts';
import { Occupancy } from './frame.ts';
import { Placer, RANK } from './placement.ts';
import type { Site } from './site.ts';

const harbour = (height: (x: number, z: number) => number) =>
  new Placer({
    plan: { height, biome: () => ({ owner: 'city' }) } as unknown as WorldPlan,
    city: { id: 'city' },
    bounds: { minX: 0, maxX: 1000, minZ: -100, maxZ: 100 },
    roads: new Occupancy<string>(100),
  } as Site);

test('a harbour boat leaves an inland quay root and keeps its full hull clear of the quay', () => {
  const placer = harbour((x) => (x < 200 ? 0.1 : -20));
  placer.place('quay', [230, 0, 0], 0, 'flat', RANK.structure, {
    centre: [230, 0],
    half: [20, 30],
    yaw: 0,
  });
  const spawn = boatSpawn(placer, (a, b) => [a, b], [1, 0]);
  assert.ok(spawn);
  assert.ok(spawn.position[0] >= 270, JSON.stringify(spawn));
  assert.equal(spawn.position[1], 0);
});

test('a harbour without finite deep open water cannot author a stranded boat spawn', () => {
  for (const height of [() => 0.1, () => -0.1, () => NaN])
    assert.equal(
      boatSpawn(harbour(height), (a, b) => [a, b], [1, 0]),
      undefined,
    );
});
