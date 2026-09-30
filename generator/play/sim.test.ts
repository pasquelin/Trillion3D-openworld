import assert from 'node:assert/strict';
import test from 'node:test';
import { H, STEP } from '../../page/play/protocol.ts';
import { createSim, step } from '../../page/play/sim/core.ts';
import { writeSnapshot } from '../../page/play/sim/snapshot.ts';
import { fixtureWorld, LIMITS } from './fixture.ts';

test('the crowd worker keeps fixed pools and finite world-coordinate snapshots across teleports', () => {
  const sim = createSim(fixtureWorld(), LIMITS);
  const out = new Float32Array(sim.layout.length);
  for (const at of [0, 2000, -2000, 0]) {
    sim.focus = { x: at, z: at, vx: 20, vz: 0 };
    for (let i = 0; i < 120; i++) step(sim, STEP);
    writeSnapshot(sim, out);
    assert.ok(out.every(Number.isFinite));
    assert.equal(sim.flow.cars.length, LIMITS.traffic);
    assert.equal(sim.people.people.length, LIMITS.pedestrians);
    assert.ok(out[H.traffic] <= LIMITS.traffic);
    assert.ok(out[H.pedestrians] <= LIMITS.pedestrians);
  }
});
