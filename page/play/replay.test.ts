import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraReplay } from './replay.ts';
import type { PlayWorld } from './types.ts';
import { sampleRoute } from '../../generator/traversal/samples.ts';
const vector = (values: number[]) => ({
  x: values[0],
  y: values[1],
  z: values[2],
  w: values[3],
  set(...v: number[]) {
    [this.x, this.y, this.z, this.w] = v;
  },
});
test('replay owns camera while active and restores pose/control/physics after stop and dispose', () => {
  const world = {
    camera: { position: vector([2, 3, 4]), quaternion: vector([0, 0, 0, 1]) },
    controls: { kind: 'character', enabled: true },
    physics: { paused: false },
    invalidate() {},
  } as unknown as PlayWorld;
  let night = false;
  const replay = cameraReplay(world, (on) => (night = on));
  replay.start(
    sampleRoute(
      'N1',
      'Night',
      'walk',
      [
        [0, 2, 0],
        [10, 2, 0],
      ],
      [2],
      true,
    ),
  );
  replay.update(2);
  assert.equal(night, true);
  assert.equal(world.camera.position.x, 4);
  assert.equal(world.physics.paused, true);
  replay.stop();
  assert.equal(world.camera.position.x, 2);
  assert.equal(world.controls.kind, 'character');
  assert.equal(world.physics.paused, false);
  replay.dispose();
  assert.equal(replay.active, false);
  assert.throws(
    () =>
      replay.start(
        sampleRoute(
          'W1',
          'Walk',
          'walk',
          [
            [0, 0, 0],
            [1, 0, 0],
          ],
          [1],
        ),
      ),
    /disposed/,
  );
});
