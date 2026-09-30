import test from 'node:test';
import assert from 'node:assert/strict';
import { joinRoadProfiles } from './junctions.ts';
import type { RoadCourse } from './carve.ts';
import type { Bridge, Vec3 } from './contract.ts';
const course = (id: string, points: Vec3[]): RoadCourse => ({
  road: { id, class: 'secondary', width: 8, points },
  bridge: points.slice(1).map(() => false),
  tunnel: points.slice(1).map(() => false),
});
test('a second spur reads bridge flags after the first spur splits the target road', () => {
  const main = course('main', [
      [0, 8, 0],
      [100, 16, 0],
      [200, 16, 0],
    ]),
    first = course('first/road', [
      [50, 8, -100],
      [50, 8, -10],
    ]),
    second = course('second/road', [
      [150, 16, -100],
      [150, 16, -10],
    ]),
    spans: Bridge[] = [];
  main.bridge = [false, true];
  joinRoadProfiles(
    [main, first, second],
    spans,
    () => 3,
    undefined,
    () => 16,
  );
  assert.deepEqual(main.bridge, [false, false, true, true]);
  assert.equal(first.bridge.at(-1), false);
  assert.equal(second.bridge.at(-1), true);
  assert.ok(spans.some((span) => span.road === 'second/road'));
});
