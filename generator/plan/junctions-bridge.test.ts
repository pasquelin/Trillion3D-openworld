import test from 'node:test';
import assert from 'node:assert/strict';
import { joinRoadProfiles } from './junctions.ts';
import { graphPath, travelGraph } from '../traversal/graph.ts';
import type { RoadCourse } from './carve.ts';
import type { Bridge, Vec3 } from './contract.ts';
const course = (id: string, points: Vec3[]): RoadCourse => ({
  road: { id, class: 'secondary', width: 8, points },
  bridge: points.slice(1).map(() => false),
  tunnel: points.slice(1).map(() => false),
});
test('an exact spur endpoint splits the target interior and shares its graded junction', () => {
  const main = course('main', [
      [-100, 10, 0],
      [100, 26, 0],
    ]),
    spur = course('spur/road', [
      [0, 40, -100],
      [0, 40, 0],
    ]);
  joinRoadProfiles([main, spur], [], () => 3);
  assert.equal(main.road.points.length, 3);
  assert.equal(spur.road.points.length, 2);
  assert.deepEqual(spur.road.points.at(-1), main.road.points[1]);
  const graph = travelGraph([main.road, spur.road]);
  assert.ok(graphPath(graph, 0, graph.points.length - 1));
});
test('positive-height water beneath a connector requires a bridge and rejects a lower fixed bank', () => {
  const main = course('main', [
      [-100, 5, 0],
      [100, 5, 0],
    ]),
    spur = course('spur/road', [
      [0, 12, -100],
      [0, 12, -10],
    ]);
  assert.throws(
    () =>
      joinRoadProfiles(
        [main, spur],
        [],
        () => 12,
        (_, z) => (z === 0 ? 5 : undefined),
        (_, z) => (z >= -6 && z <= -4 ? 16 : 0.5),
      ),
    /grade anchors incompatible/,
  );
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
    (x) => (x >= 100 ? 16 : 0.5),
  );
  assert.deepEqual(main.bridge, [false, false, true, true]);
  assert.equal(first.bridge.at(-1), false);
  assert.equal(second.bridge.at(-1), true);
  assert.ok(spans.some((span) => span.road === 'second/road'));
});
