import type { Object3D } from 'trillion3d-engine';
import { body } from './bodies.ts';
import type { Built } from './models.ts';
import { axisAngle } from './math3.ts';
import type { Inputs } from './protocol.ts';
import type { Engine, PlayWorld } from './types.ts';

/** One public engine vehicle; the engine worker owns its body and all wheel poses. */
export function createCar(world: PlayWorld, engine: Engine, built: Built, mass = 1400) {
  const chassis = body(engine, [1.8, 0.9, 4.4]);
  chassis.name = 'Player car';
  world.scene.remove(built.root);
  chassis.add(built.root as unknown as Object3D);
  const wheels = built.wheels as unknown as Object3D[];
  chassis.add(...wheels);
  // Markers place the car body 0.9 m above the road. Public wheels name their
  // resting centres, unlike the old Jolt suspension attachment anchors.
  for (const wheel of wheels) {
    const size = wheel.localBounds()!.getSize(engine.math.vector3());
    wheel.position.y = size.x / 2 - 0.9;
  }
  const vehicle = engine.vehicle.car(chassis, {
    wheels,
    drive: 'rear',
    torquePerKg: 520 / mass,
    suspensionTravel: 0.3,
  });
  let present = false;
  const held = { throttle: 0, brake: 0, steer: 0, handbrake: true };
  const setInput = (input: typeof held) => {
    if (
      Object.keys(held).some((k) => held[k as keyof typeof held] !== input[k as keyof typeof held])
    ) {
      Object.assign(held, input);
      vehicle.drive(held);
    }
  };
  return {
    body: chassis,
    speed: () => vehicle.speed,
    place(at: readonly number[], yaw: number) {
      chassis.position.set(at[0], at[1], at[2]);
      chassis.quaternion.set(...axisAngle([0, 1, 0], yaw));
      if (!present) {
        world.scene.add(chassis);
        present = true;
      }
      built.root.visible = true;
    },
    enable() {
      if (chassis.physics) return;
      chassis.physics = { type: 'dynamic', mass, ccd: true };
      world.physics.add(vehicle);
      vehicle.drive(held);
    },
    drive(inputs: Inputs | null, asphalt: boolean, dt: number) {
      if (!chassis.physics) return;
      const direction = inputs?.forward ?? 0;
      setInput({
        throttle: Math.max(0, direction) * (asphalt ? 1 : 320 / 520),
        brake: Math.max(0, -direction) * (!asphalt && vehicle.speed < 0.1 ? 320 / 520 : 1),
        steer: inputs?.right ?? 0,
        handbrake: !inputs || inputs.brake,
      });
      if (!asphalt && !world.physics.paused && dt > 0 && !chassis.physics.asleep) {
        const v = chassis.physics.velocity;
        const drag = -0.08 * mass * dt;
        chassis.physics.applyImpulse(v.x * drag, 0, v.z * drag);
      }
    },
    reset() {
      if (chassis.physics) {
        world.physics.remove(vehicle);
        chassis.physics = null;
      }
    },
    dispose() {
      world.physics.remove(vehicle);
      chassis.physics = null;
      world.scene.remove(chassis);
    },
  };
}
