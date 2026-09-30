import type { World } from 'trillion3d-engine';
import { yawPitchRoll } from './math3.ts';

/** Only public engine controls; the engine owns input, stepping, contacts and the eye. */
export type CharacterWorld = {
  camera: Pick<World['camera'], 'position' | 'quaternion'>;
  controls: Pick<
    World['controls'],
    'kind' | 'enabled' | 'velocity' | 'onGround' | 'eyeHeight' | 'walkSpeed'
  >;
};

/** A native character sharing the world's physics with vehicles and streamed colliders. */
export function createCharacter(world: CharacterWorld) {
  const { controls, camera } = world;
  let active = false;
  return {
    /** Switching out removes the capsule, so it cannot push the vehicle from inside it. */
    active(on: boolean) {
      if (active === on) return;
      active = on;
      if (on) {
        controls.kind = 'character';
        controls.enabled = true;
      } else if (controls.kind === 'character') controls.kind = 'none';
    },
    /** Feet coordinates; the controller observes the camera pose on its next update. */
    teleport(x: number, y: number, z: number, yaw = 0, pitch = 0) {
      camera.position.set(x, y + controls.eyeHeight, z);
      camera.quaternion.set(...yawPitchRoll(yaw, pitch));
    },
    read() {
      const velocity = controls.velocity;
      const position = camera.position;
      return {
        // This is the rendered anchor, including the native eye's bob and landing dip.
        position: [position.x, position.y - controls.eyeHeight, position.z] as [
          number,
          number,
          number,
        ],
        velocity: [velocity.x, velocity.y, velocity.z] as [number, number, number],
        grounded: controls.onGround,
        running: Math.hypot(velocity.x, velocity.z) > controls.walkSpeed,
      };
    },
    dispose() {
      if (active && controls.kind === 'character') controls.kind = 'none';
      active = false;
    },
  };
}
