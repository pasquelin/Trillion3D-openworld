import assert from 'node:assert/strict';
import test from 'node:test';
import { createCar } from './car.ts';
import { idleInputs } from './protocol.ts';
import { physicsFixture } from './physics.fixture.ts';

test('car delegates forward, reverse braking and handbrake to the public vehicle once per change', () => {
  const f = physicsFixture(),
    car = createCar(f.world, f.engine, f.built);
  car.place([1, 2, 3], 0);
  car.enable();
  car.drive({ ...idleInputs(), forward: 1 }, true, 1 / 60);
  const count = f.drives.length;
  car.drive({ ...idleInputs(), forward: 1 }, true, 1 / 60);
  assert.equal(f.drives.length, count);
  assert.deepEqual(f.drives.at(-1), { throttle: 1, brake: 0, steer: 0, handbrake: false });
  car.drive({ ...idleInputs(), forward: -1 }, true, 1 / 60);
  assert.deepEqual(f.drives.at(-1), { throttle: 0, brake: 1, steer: 0, handbrake: false });
  car.drive(null, true, 1 / 60);
  assert.equal((f.drives.at(-1) as { handbrake: boolean }).handbrake, true);
  car.dispose();
});
