import test from 'node:test';
import assert from 'node:assert/strict';
import { crossingPath, crossingRamp } from './crossings.ts';
import { solidColliders } from '../build/colliders.ts';
import { solidIndex } from '../build/solids.ts';
test('authored crossings hold a 25% approach and compile to the same upward collision floor', () => {
  const path = crossingPath([0, 2, 0], [30, 3, 0], () => 0),
    ramp = crossingRamp('traversal/test', path);
  for (let k = 1; k < path.length; k++)
    assert.ok(Math.abs(path[k][1] - path[k - 1][1]) <= 0.250001);
  const solids = solidColliders([ramp.mesh], [ramp.instance]),
    index = solidIndex(solids);
  assert.ok(solids.shapes.has(ramp.mesh.id));
  for (const p of path.slice(1, -1))
    assert.ok(
      index.over(p[0], p[2]).some((hit) => hit.up && Math.abs(hit.y - (p[1] + 0.025)) < 0.0001),
    );
});
