import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacter, type CharacterWorld } from './character.ts';
import { cameraState, placeCamera } from './camera.ts';
import type { CameraNode } from './types.ts';

function fixture() {
  const position = {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      Object.assign(this, { x, y, z });
    },
  };
  let changes = 0;
  let kind = 'none';
  const controls = {
    get kind() {
      return kind;
    },
    set kind(next: string) {
      changes++;
      kind = next;
    },
    enabled: false,
    eyeHeight: 1.64,
    walkSpeed: 3.5,
    velocity: { x: 0, y: 0, z: -6.5 },
    onGround: true,
  };
  let turn: number[] = [];
  const camera = { position, quaternion: { set: (...q: number[]) => (turn = q) } };
  const world = { controls, camera } as unknown as CharacterWorld;
  return { world, controls, camera, changes: () => changes, turn: () => turn };
}

test('native character activation is idempotent and removes the capsule when entering a vehicle', () => {
  const f = fixture();
  const character = createCharacter(f.world);
  character.active(true);
  character.active(true);
  assert.equal(f.controls.kind, 'character');
  assert.equal(f.controls.enabled, true);
  assert.equal(f.changes(), 1, 'held foot mode must not recreate the character each frame');
  character.active(false);
  assert.equal(f.controls.kind, 'none');
  f.controls.kind = 'vehicle';
  character.dispose();
  assert.equal(f.controls.kind, 'vehicle', 'cleanup does not destroy another mode');
});

test('teleport uses native eye height and reports engine velocity without integrating motion', () => {
  const f = fixture();
  const character = createCharacter(f.world);
  character.active(true);
  character.teleport(25000, 12, -25000, Math.PI / 2);
  assert.equal(f.camera.position.y, 13.64);
  const state = character.read();
  assert.deepEqual(state.position, [25000, 12, -25000]);
  assert.deepEqual(state.velocity, [0, 0, -6.5]);
  assert.equal(state.grounded, true);
  assert.equal(state.running, true);
  assert.ok(Math.abs(f.turn()[1] - Math.SQRT1_2) < 1e-12);
  assert.equal(f.controls.eyeHeight, 1.64);
  assert.equal(f.controls.walkSpeed, 3.5);
  character.dispose();
  assert.equal(f.controls.kind, 'none');
});

test('vehicle camera leaves the native character eye and orientation untouched', () => {
  const f = fixture();
  const character = createCharacter(f.world);
  character.teleport(10, 20, 30, 1, 0.2);
  const before = { ...f.camera.position };
  const turn = [...f.turn()];
  const state = cameraState();
  state.chase = [1, 2, 3];
  placeCamera(
    f.camera as unknown as CameraNode,
    state,
    { mode: 'foot', at: [0, 0, 0], turn: [0, 0, 0, 1], look: { yaw: 0, pitch: 0 }, seat: null },
    1 / 60,
  );
  assert.deepEqual(f.camera.position, before);
  assert.deepEqual(f.turn(), turn);
  assert.equal(state.chase, null);
});
