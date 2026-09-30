import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayer } from './player.ts';
import { idleInputs } from './protocol.ts';
import { physicsFixture, flushQueries } from './physics.fixture.ts';
import type { PlayOptions } from './types.ts';
import type { View } from './view.ts';

function fixture() {
  const f = physicsFixture();
  Object.assign(f.world, {
    camera: f.built.root,
    controls: {
      kind: 'none',
      enabled: true,
      eyeHeight: 1.7,
      walkSpeed: 1.4,
      velocity: { x: 0, y: 0, z: 0 },
      onGround: true,
    },
  });
  Object.assign(f.world.physics, { paused: false, error: null });
  const data = {
    markers: [
      { kind: 'teleport', name: 'Start', position: [0, 0, 0], yaw: 1.2, pitch: 0.3 },
      { kind: 'spawn', vehicle: 'car', position: [0, 0, 0], yaw: 0.4 },
      { kind: 'teleport', name: 'Away', position: [1000, 20, 1000], yaw: 2, pitch: -0.2 },
    ],
    roads: [],
  };
  const view = { car: f.built, plane: physicsFixture().built, spawns() {} } as unknown as View;
  const player = createPlayer(
    { world: f.world, engine: f.engine, data } as unknown as PlayOptions,
    view,
  );
  return { ...f, player };
}

test('player waits for native collision without losing marker yaw/pitch, then delegates foot controls', async () => {
  const f = fixture(),
    initial = { ...f.world.camera.quaternion };
  f.player.update(idleInputs(), 1 / 60);
  assert.equal(f.player.loading, true);
  assert.equal(f.world.controls.kind, 'none');
  f.requests[0].resolve({ point: { y: 0 } });
  await flushQueries();
  f.player.update(idleInputs(), 1 / 60);
  assert.equal(f.world.controls.kind, 'character');
  assert.equal(f.player.loading, false);
  assert.deepEqual(f.world.camera.quaternion, initial);
  f.player.dispose();
});

test('entering a car pauses native physics until collision arrives and teleport restores the character', async () => {
  const f = fixture();
  f.player.update(idleInputs(), 1 / 60);
  f.requests[0].resolve({ point: { y: 0 } });
  await flushQueries();
  f.player.update(idleInputs(), 1 / 60);
  f.player.update({ ...idleInputs(), use: 1 }, 1 / 60);
  assert.equal(f.player.mode, 'car');
  assert.equal(f.world.controls.kind, 'none');
  assert.equal(f.world.physics.paused, true);
  f.requests[1].resolve({ point: { y: 0 } });
  await flushQueries();
  f.player.update({ ...idleInputs(), use: 1 }, 1 / 60);
  assert.equal(f.world.physics.paused, false);
  assert.equal(f.player.loading, false);
  f.player.teleport('Away');
  const orientation = { ...f.world.camera.quaternion };
  assert.equal(f.player.mode, 'foot');
  assert.equal(f.player.position()[0], 1000);
  f.player.update({ ...idleInputs(), use: 1 }, 1 / 60);
  // The last car query may still be in flight; it cannot satisfy the new location.
  const pending = f.requests.at(-1)!;
  pending.resolve({ point: { y: 20 } });
  await flushQueries();
  f.player.update({ ...idleInputs(), use: 1 }, 1 / 60);
  f.requests.at(-1)!.resolve({ point: { y: 20 } });
  await flushQueries();
  f.player.update({ ...idleInputs(), use: 1 }, 1 / 60);
  assert.equal(f.world.controls.kind, 'character');
  assert.deepEqual(f.world.camera.quaternion, orientation);
  f.player.dispose();
  assert.equal(f.world.physics.paused, false);
});
