import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleRoute } from './samples.ts';
test('exact route corners, timing and rotations are deterministic and preserve night geometry', () => {
  const path = [
    [0, 1.7, 0],
    [0, 1.7, -50],
    [50, 1.7, -50],
  ] as const;
  const day = sampleRoute('W1', 'Walk', 'walk', path, [2]);
  assert.deepEqual(day, sampleRoute('W1', 'Walk', 'walk', path, [2]));
  assert.equal(day.length, 100);
  assert.equal(day.duration, 50);
  assert.deepEqual(day.samples.at(-1)?.position, path[2]);
  assert.equal(day.samples[25].seconds, 25);
  assert.ok(day.samples.every((p, i, all) => !i || p.seconds > all[i - 1].seconds));
  assert.deepEqual({ ...day, night: true }.samples, day.samples);
});
