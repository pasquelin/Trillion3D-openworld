import test from 'node:test';
import assert from 'node:assert/strict';
import { waterFloor, waterSurface } from './water-surface.ts';
import { joinRoadProfiles } from './junctions.ts';
import type { RoadCourse } from './carve.ts';

const river = {
  id: 'actual-channel',
  points: [
    [0, 10, -100],
    [0, 10, 100],
  ] as const,
  widths: [10, 10],
};
test('exact water floors exclude broad bank buffers and retain emitted channel level', () => {
  const level = waterSurface([river]);
  assert.equal(level(0, 0), 10);
  assert.equal(level(20, 0), null);
  assert.equal(waterFloor(level)(0, 0), 16);
  assert.equal(waterFloor(level)(20, 0), 0.5);
});
test('a road cut through an initially dry bank still receives actual water clearance', () => {
  const bridge: RoadCourse = {
    road: {
      id: 'crossing',
      class: 'secondary',
      width: 8,
      points: [
        [-25, 5, 0],
        [25, 5, 0],
      ],
    },
    bridge: [true],
    tunnel: [false],
  };
  joinRoadProfiles([bridge], [], () => 13, undefined, waterFloor(waterSurface([river])));
  assert.ok(bridge.road.points.every((p) => p[1] >= 16));
});
test('an anchor outside the emitted water polygon stays at its actual dry height', () => {
  const dry: RoadCourse = {
    road: {
      id: 'dry',
      class: 'secondary',
      width: 8,
      points: [
        [20, 3, -50],
        [20, 3, 50],
      ],
    },
    bridge: [false],
    tunnel: [false],
  };
  joinRoadProfiles(
    [dry],
    [],
    () => 3,
    () => 3,
    waterFloor(waterSurface([river])),
  );
  assert.deepEqual(
    dry.road.points.map((p) => p[1]),
    [3, 3],
  );
});
