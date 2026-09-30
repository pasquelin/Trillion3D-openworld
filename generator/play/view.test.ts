import assert from 'node:assert/strict';
import test from 'node:test';
import { readings } from '../../page/play/hud.ts';
import { HINTS, KEYS } from '../../page/play/keys.ts';

test('the HUD reads the mode, speed and altitude, and says when the ground is still loading', () => {
  const base = {
    mode: 'plane' as const,
    speed: 100,
    altitude: 1234.4,
    aboveGround: 1000.2,
    throttle: 0.75,
    stalled: true,
    loading: false,
    prompt: null,
    x: 0,
    z: 0,
    heading: 0,
  };
  assert.deepEqual(readings(base), [
    'Plane · 360 km/h',
    'Altitude 1234 m · 1000 m above ground',
    'Throttle 75 % · STALL',
  ]);
  assert.deepEqual(
    readings({ ...base, mode: 'foot', speed: 1.4, aboveGround: null, loading: true }),
    ['On foot · 5 km/h', 'Loading the ground here…'],
  );
  assert.deepEqual(readings({ ...base, mode: 'car', speed: 25 }), ['Car · 90 km/h']);
});

test('every hint names the key its mode reads', () => {
  assert.equal(KEYS.use, 'KeyE');
  for (const hint of [HINTS.foot, HINTS.car, HINTS.plane]) assert.match(hint, /\bE (get|get in)/);
});
