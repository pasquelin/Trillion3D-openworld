import assert from 'node:assert/strict';
import test from 'node:test';
import { createFlight } from './flight.ts';
import { idleInputs } from './protocol.ts';
import { flushQueries, physicsFixture } from './physics.fixture.ts';

const airborne = () => {
  const f = physicsFixture(),
    flight = createFlight(f.world, f.engine, f.built);
  flight.place([0, 100, 0], 0);
  Object.assign(flight.state!, { speed: 60, throttle: 0.5, onGround: false });
  return { ...f, flight };
};

test('flight waits for streamed ground and sweeps every accepted displacement', async () => {
  const f = airborne();
  f.flight.step(idleInputs(), 1 / 60);
  assert.deepEqual(f.flight.state!.position, [0, 100, 0]);
  f.requests[0].resolve({ point: { y: 0 } });
  await flushQueries();
  assert.equal(f.requests.length, 2);
  assert.ok((f.requests[1].options as { shape: unknown }).shape);
  f.requests[1].resolve({ distance: 0.1 });
  await flushQueries();
  assert.deepEqual(f.flight.state!.position, [0, 100, 0]);
  assert.equal(f.flight.state!.speed, 0);
});

test('flight retains bounded elapsed time while asynchronous queries are pending', async () => {
  const f = airborne();
  f.flight.step(idleInputs(), 1 / 60);
  for (let i = 0; i < 3; i++) f.flight.step(idleInputs(), 1 / 60);
  assert.equal(f.requests.length, 1);
  f.requests[0].resolve({ point: { y: 0 } });
  await flushQueries();
  f.requests[1].resolve(null);
  await flushQueries();
  const first = f.flight.state!.position[2];
  f.flight.step(idleInputs(), 1 / 60);
  f.requests[2].resolve({ point: { y: 0 } });
  await flushQueries();
  f.requests[3].resolve(null);
  await flushQueries();
  assert.ok(f.flight.state!.position[2] < first - 3.5);
});

test('flight ignores old errors and movements after a respawn or leaving the aircraft', async () => {
  const f = airborne();
  f.flight.step(idleInputs(), 1 / 60);
  f.flight.place([10, 100, 20], 0);
  f.requests[0].reject(new Error('old request'));
  await flushQueries();
  assert.equal(f.flight.error, null);
  f.flight.step(idleInputs(), 1 / 60);
  f.flight.stop();
  f.requests[1].resolve({ point: { y: 0 } });
  await flushQueries();
  assert.deepEqual(f.flight.state!.position, [10, 100, 20]);
  f.flight.dispose();
});
