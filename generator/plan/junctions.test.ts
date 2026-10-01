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

test('a fixed low urban junction permits mountain cuts without sacrificing a real bridge', () => {
  const land = course('land', [
      [0, 10, 0],
      [250, 500, 0],
      [500, 500, 0],
      [1000, 40, 0],
      [2000, 10, 0],
    ]),
    bridge = course('bridge', [
      [1000, 40, 0],
      [1100, 40, 0],
    ]);
  bridge.bridge = [true];
  joinRoadProfiles(
    [land, bridge],
    [],
    (x) => (x > 150 && x < 700 ? 500 : 10),
    (x) => (x === 2000 ? 10 : undefined),
  );
  assert.equal(land.road.points.at(-1)![1], 10);
  assert.ok(land.road.points[1][1] <= 150);
  assert.equal(bridge.road.points[0][1], 40);
  assert.ok(land.tunnel.some(Boolean));
});

test('physical channel clearance allows a high dry-bank profile to meet a low urban anchor', () => {
  const road = course('bank', [
    [0, 100, 0],
    [100, 100, 0],
    [200, 10, 0],
    [500, 10, 0],
  ]);
  road.bridge = [true, false, false];
  joinRoadProfiles(
    [road],
    [],
    () => 2,
    (x) => (x === 500 ? 10 : undefined),
    (x) => (x === 0 ? 6 : 0.5),
  );
  assert.equal(road.road.points.at(-1)![1], 10);
  assert.ok(road.road.points[0][1] >= 6);
  assert.ok(road.road.points[1][1] < 100);
  for (let i = 1; i < road.road.points.length; i++) {
    const a = road.road.points[i - 1],
      b = road.road.points[i];
    assert.ok(Math.abs(a[1] - b[1]) <= 0.080001 * Math.hypot(a[0] - b[0], a[2] - b[2]));
  }
});

test('dry bridge endpoints retain clearance over a wet channel between vertices', () => {
  const road = course('channel', [
    [0, 20, 0],
    [50, 20, 0],
    [500, 12, 0],
  ]);
  road.bridge = [true, false];
  joinRoadProfiles(
    [road],
    [],
    (x) => (x > 15 && x < 35 ? 0 : 20),
    (x) => (x === 500 ? 12 : undefined),
    (x) => (x > 15 && x < 35 ? 16 : 0.5),
  );
  assert.ok(road.road.points[0][1] >= 16);
  assert.ok(road.road.points[1][1] >= 16);
  assert.equal(road.road.points.at(-1)![1], 12);
});
test('a routed spur joins a real bridge deck with its own physical clearance-bearing span', () => {
  const main = course('main', [
      [-100, 16, 0],
      [100, 16, 0],
    ]),
    spur = course('village/road', [
      [0, 16, -100],
      [0, 16, -10],
    ]);
  main.bridge = [true];
  const spans: Bridge[] = [
    { id: 'main-span', road: 'main', from: main.road.points[0], to: main.road.points[1], width: 8 },
  ];
  joinRoadProfiles(
    [main, spur],
    spans,
    () => -1,
    undefined,
    () => 16,
  );
  assert.deepEqual(spur.road.points.at(-1), main.road.points[1]);
  assert.equal(spur.bridge.at(-1), true);
  assert.equal(main.bridge.length, 2);
  assert.ok(main.bridge.every(Boolean));
  assert.ok(spans.some((s) => s.road === spur.road.id && s.to[0] === 0 && s.to[2] === 0));
  assert.ok([...main.road.points, ...spur.road.points].every((p) => p[1] >= 16));
});
