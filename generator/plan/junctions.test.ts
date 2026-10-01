import test from 'node:test';
import assert from 'node:assert/strict';
import { joinRoadProfiles } from './junctions.ts';
import type { RoadCourse } from './carve.ts';
import type { Vec3, Bridge } from './contract.ts';
const course = (id: string, points: Vec3[]): RoadCourse => ({
  road: { id, class: 'secondary', width: 8, points },
  bridge: points.slice(1).map(() => false),
  tunnel: points.slice(1).map(() => false),
});
test('a connector sharing an existing target endpoint never inserts a zero-length segment', () => {
  const main = course('main', [
      [0, 5, 0],
      [100, 5, 0],
    ]),
    spur = course('port/road', [
      [100, 5, -100],
      [100, 5, -10],
    ]);
  joinRoadProfiles([main, spur], [], () => 3);
  assert.equal(main.road.points.length, 2);
  assert.deepEqual(spur.road.points.at(-1), main.road.points.at(-1));
  assert.equal(main.bridge.length, main.road.points.length - 1);
});
test('junctions alter authored geometry to one height and preserve road grade across approach', () => {
  const a = course('a', [
      [0, 2, 0],
      [100, 10, 0],
    ]),
    b = course('b', [
      [100, 25, 0],
      [300, 25, 0],
    ]);
  joinRoadProfiles([a, b], [], () => 2);
  assert.equal(a.road.points[1][1], b.road.points[0][1]);
  assert.ok(Math.abs(a.road.points[1][1] - a.road.points[0][1]) <= 8.000001);
});
test('a network-grid endpoint gains a real connector and target centreline junction', () => {
  const main = course('main', [
      [0, 5, 0],
      [200, 5, 0],
    ]),
    spur = course('port/road', [
      [100, 5, -100],
      [100, 5, -10],
    ]);
  joinRoadProfiles([main, spur], [], () => 3);
  assert.deepEqual(spur.road.points.at(-1), [100, 5, 0]);
  assert.deepEqual(main.road.points[1], [100, 5, 0]);
  assert.equal(main.bridge.length, main.road.points.length - 1);
});
test('grade conditioning raises bridge approaches without lowering clearance', () => {
  const bridge = course('bridge', [
    [0, 2, 0],
    [50, 12, 0],
    [100, 2, 0],
  ]);
  bridge.bridge = [true, true];
  const spans: Bridge[] = [
    {
      id: 'span',
      road: 'bridge',
      from: bridge.road.points[0],
      to: bridge.road.points[2],
      width: 8,
    },
  ];
  joinRoadProfiles([bridge], spans, () => 0);
  assert.equal(bridge.road.points[1][1], 12);
  assert.ok(bridge.road.points[0][1] >= 8);
  assert.deepEqual(spans[0].from, bridge.road.points[0]);
});
test('a port endpoint half a routing grid cell from the highway gains an authored dry junction', () => {
  const main = course('highway-0', [
      [0, 6, 0],
      [200, 6, 0],
    ]),
    spur = course('port/road', [
      [100, 4, -100],
      [100, 4, -50],
    ]);
  joinRoadProfiles([main, spur], [], () => 3);
  assert.deepEqual(spur.road.points.at(-1), [100, 6, 0]);
  assert.deepEqual(main.road.points[1], [100, 6, 0]);
});
