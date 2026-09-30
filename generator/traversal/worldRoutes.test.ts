import test from 'node:test';
import assert from 'node:assert/strict';
import { placeWorld } from '../build/world.ts';
import { solidIndex } from '../build/solids.ts';
import { buildTraversal } from './build.ts';
import { nearestRoad, roadIndex } from '../../page/play/roads.ts';

const world = placeWorld(),
  roads = [...world.plan.roads, ...world.placed.flatMap((o) => o.roads)],
  manifest = buildTraversal(world.plan, roads, world.markers, world.city);

test('the generated island exposes every required traversal with no missing connection or landmark', () => {
  assert.deepEqual(manifest.failures, []);
  const required = [
    'W1',
    'D1',
    'N1-W1',
    'N1-D1',
    'D1-port',
    'D1-airport',
    'F1',
    'S1',
    ...['summit', 'roof', 'harbor', 'beach', 'desert', 'woodland'].map((id) => `V1-${id}`),
  ];
  for (const id of required)
    assert.ok(
      manifest.routes.some((r) => r.id === id),
      id,
    );
});
test('night replay preserves exact generated poses and city walking loop respects its chosen distance', () => {
  const walk = manifest.routes.find((r) => r.id === 'W1')!;
  assert.ok(walk.length >= 600 && walk.length <= 900, String(walk.length));
  assert.deepEqual(walk.samples[0].position, walk.samples.at(-1)!.position);
  for (const id of ['W1', 'D1'])
    assert.deepEqual(
      manifest.routes.find((r) => r.id === id)!.samples,
      manifest.routes.find((r) => r.id === `N1-${id}`)!.samples,
    );
  assert.deepEqual(manifest, buildTraversal(world.plan, roads, world.markers, world.city));
});
test('D1 begins with a fixed ten-second 0 km/h stop before road-class driving', () => {
  const drive = manifest.routes.find((r) => r.id === 'D1')!;
  assert.equal(drive.samples[0].seconds, 0);
  assert.equal(drive.samples[1].seconds, 10);
  assert.deepEqual(drive.samples[0].position, drive.samples[1].position);
  assert.equal(drive.samples.at(-1)!.seconds, drive.duration);
});
test('the airport spur reaches the generated terminal curbside on real graded pavement', () => {
  const end = manifest.routes.find((r) => r.id === 'D1-airport')!.samples.at(-1)!.position,
    curbside = roads.filter((r) => r.id === 'airport/curbside'),
    hit = nearestRoad(roadIndex(curbside), end[0], end[2]);
  assert.ok(hit && hit.distance < 0.01);
  assert.ok(Math.abs(world.plan.height(end[0], end[2]) - (end[1] - 1.7)) < 0.01);
});
test('every W1 camera sample has a real upward collision floor within 0.1 m of its feet', () => {
  const walk = manifest.routes.find((r) => r.id === 'W1')!,
    solids = solidIndex(world.solids);
  for (const sample of walk.samples) {
    const [x, y, z] = sample.position,
      feet = y - 1.7,
      terrain = world.plan.height(x, z),
      floors = [
        terrain,
        ...solids
          .over(x, z)
          .filter((h) => h.up)
          .map((h) => h.y),
      ];
    assert.ok(
      floors.some((h) => Math.abs(h - feet) <= 0.1),
      `${x.toFixed(2)},${z.toFixed(2)} floor ${feet.toFixed(3)} candidates ${floors}`,
    );
  }
});
