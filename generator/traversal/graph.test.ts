import test from 'node:test';
import assert from 'node:assert/strict';
import { graphPath, travelGraph } from './graph.ts';
import type { Road, Vec3 } from '../plan/contract.ts';
const road = (id: string, points: Vec3[], cls: Road['class'] = 'street'): Road => ({
  id,
  points,
  class: cls,
  width: 8,
});
const node = (g: ReturnType<typeof travelGraph>, x: number, z: number) =>
  g.points.findIndex((p) => p[0] === x && p[2] === z);
test('at-grade crossing splits both road segments; a bridge above it cannot join', () => {
  const roads = [
    road('east', [
      [-100, 2, 0],
      [100, 2, 0],
    ]),
    road('south', [
      [0, 2, -100],
      [0, 2, 100],
    ]),
  ];
  let g = travelGraph(roads);
  assert.ok(graphPath(g, node(g, -100, 0), node(g, 0, 100)));
  g = travelGraph([
    roads[0],
    road('bridge', [
      [0, 12, -100],
      [0, 12, 100],
    ]),
  ]);
  assert.equal(graphPath(g, node(g, -100, 0), node(g, 0, 100)), null);
});
test('near endpoints, steep segments and runways never fabricate a public junction', () => {
  const g = travelGraph([
    road('a', [
      [0, 2, 0],
      [100, 2, 0],
    ]),
    road('b', [
      [103, 2, 0],
      [200, 2, 0],
    ]),
    road('steep', [
      [100, 2, 0],
      [150, 22, 0],
    ]),
    road(
      'runway',
      [
        [100, 2, 0],
        [103, 2, 0],
      ],
      'runway',
    ),
  ]);
  assert.equal(graphPath(g, node(g, 0, 0), node(g, 200, 0)), null);
  assert.deepEqual(g.rejected, ['steep/0: grade']);
});
test('same-level collinear overlap splits at shared geometric endpoints', () => {
  const g = travelGraph([
    road('a', [
      [0, 2, 0],
      [100, 2, 0],
    ]),
    road('b', [
      [50, 2.05, 0],
      [150, 2.05, 0],
    ]),
  ]);
  assert.ok(graphPath(g, node(g, 0, 0), node(g, 150, 0)));
});
