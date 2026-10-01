import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturn } from './boundary.ts';

test('deep water offers explicit recovery and cannot overwrite safe ground', () => {
  const recovery = safeReturn(8000, [100, 10, 100]);
  recovery.observe([200, 20, 200], 19.9, true);
  recovery.observe([3000, -5, 3000], -20, true);
  assert.equal(recovery.reason, 'water');
  assert.deepEqual(recovery.returnToGround(), [200, 20, 200]);
  recovery.observe([5000, 1000, 0], null, false);
  assert.equal(recovery.reason, 'envelope');
  assert.deepEqual(recovery.returnToGround(), [200, 20, 200]);
  recovery.dispose();
  assert.equal(recovery.returnToGround(), null);
});
test('airborne and missing collision never become recovery positions', () => {
  const recovery = safeReturn(8000, [0, 2, 0]);
  recovery.observe([100, 2000, 100], 200, false);
  recovery.observe([200, 20, 200], null, true);
  assert.deepEqual(recovery.returnToGround(), [0, 2, 0]);
});
