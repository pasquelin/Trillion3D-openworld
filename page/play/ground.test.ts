import assert from 'node:assert/strict';
import test from 'node:test';
import { groundProbe } from './ground.ts';
import { flushQueries, physicsFixture } from './physics.fixture.ts';

test('ground probes ignore the vehicle, bound requests, and discard pre-teleport callbacks', async () => {
  const f = physicsFixture();
  const probe = groundProbe(f.world, f.engine);
  const own = {} as Parameters<typeof probe.request>[3];
  probe.request(1, 2, 3, own);
  probe.request(1, 2, 3, own);
  assert.equal(f.requests.length, 1);
  assert.equal((f.requests[0].options as { ignore: unknown }).ignore, own);
  probe.reset();
  f.requests[0].reject(new Error('old location failed'));
  await flushQueries();
  assert.equal(probe.error, null);
  assert.equal(probe.read(1, 3), null);
  probe.request(100, 2, 300);
  f.requests[1].resolve({ point: { y: 4 } });
  await flushQueries();
  assert.equal(probe.read(100, 300), 4);
  assert.equal(probe.read(1, 3), null);
  probe.dispose();
  probe.request(100, 2, 300);
  assert.equal(f.requests.length, 2);
});

test('a session still loading retries without poisoning readiness', async () => {
  const f = physicsFixture(),
    probe = groundProbe(f.world, f.engine);
  probe.request(0, 0, 0);
  f.requests[0].reject({ code: 'PHYSICS_OFF' });
  await flushQueries();
  assert.equal(probe.error, null);
  probe.request(0, 0, 0);
  f.requests[1].resolve(null);
  await flushQueries();
  assert.equal(probe.read(0, 0), null);
});
