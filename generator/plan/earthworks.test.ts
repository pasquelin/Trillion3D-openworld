import assert from 'node:assert/strict';
import { it } from 'node:test';
import { roadLeveller, type RoadCourse } from './carve.ts';

it('holds pavement height while meeting nearby shoulders continuously', () => {
  const course = (z: number, y: number): RoadCourse => ({
      road: {
        id: `road${z}`,
        class: 'street',
        width: 10,
        points: [
          [-100, y, z],
          [100, y, z],
        ],
      },
      bridge: [false],
      tunnel: [false],
    }),
    level = roadLeveller([course(0, 10), course(30, 100)]);
  assert.equal(level(0, 0, 0), 10);
  assert.equal(level(0, 30, 0), 100);
  for (let z = -45; z <= 75; z += 0.25)
    assert.ok(Math.abs(level(0, z + 0.001, 0) - level(0, z - 0.001, 0)) < 0.05, `step at ${z}`);
  for (const edge of [-5, 5, 25, 35])
    assert.ok(
      Math.abs(level(0, edge + 0.001, 0) - level(0, edge - 0.001, 0)) < 0.05,
      `pavement ${edge}`,
    );
});
