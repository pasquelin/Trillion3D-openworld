import type { Mesh } from 'trillion3d-engine';
import { body } from './bodies.ts';
import { flightSweep } from './flightSweep.ts';
import type { Built } from './models.ts';
import type { Inputs } from './protocol.ts';
import { aircraft, fly, type Aircraft } from './sim/flight.ts';
import type { Engine, PlayWorld } from './types.ts';

/** Arcade lift/thrust are gameplay; every accepted movement is swept through engine physics. */
export function createFlight(world: PlayWorld, engine: Engine, built: Built) {
  const collider: Mesh = body(engine, [1.2, 1.3, 8]);
  built.root.add(collider);
  let plane: Aircraft | null = null;
  let pending = false,
    generation = 0,
    disposed = false;
  let error: unknown = null;
  let owed = 0;
  const pose = () => {
    if (!plane) return;
    built.root.position.set(...plane.position);
    built.root.quaternion.set(...plane.orientation);
  };
  return {
    body: collider,
    get state() {
      return plane;
    },
    get error() {
      return error;
    },
    get waiting() {
      return pending;
    },
    place(position: [number, number, number], heading: number) {
      generation++;
      error = null;
      owed = 0;
      plane = aircraft(position, heading);
      built.root.visible = true;
      collider.physics = { type: 'kinematic' };
      pose();
    },
    step(input: Inputs, dt: number) {
      if (!plane || disposed) return;
      owed = Math.min(owed + dt, 4 / 60);
      if (pending || owed < 1 / 60) return;
      const steps = Math.floor(owed * 60);
      owed -= steps / 60;
      pending = true;
      const request = generation;
      const start = plane;
      const candidate: Aircraft = {
        ...start,
        position: [...start.position],
        orientation: [...start.orientation],
      };
      const down = engine.math.ray(
        engine.math.vector3(...start.position),
        engine.math.vector3(0, -1, 0),
      );
      void world
        .raycast(down, { exact: true, ignore: collider, maxDistance: 20000 })
        .then(async (floor) => {
          if (!floor || request !== generation || disposed) return;
          const path: Aircraft[] = [];
          for (let i = 0; i < steps; i++) {
            fly(candidate, input, 1 / 60, () => floor.point.y);
            path.push({
              ...candidate,
              position: [...candidate.position],
              orientation: [...candidate.orientation],
            });
          }
          const from = engine.math.vector3(...start.position);
          const direction = engine.math.vector3(...candidate.position).sub(from);
          const distance = direction.length();
          const hit =
            distance > 1e-6
              ? await world.raycast(engine.math.ray(from, direction.normalize()), {
                  shape: { type: 'box', halfExtents: flightSweep(start, path) },
                  ignore: collider,
                  maxDistance: distance,
                })
              : null;
          if (request !== generation || disposed) return;
          if (hit) {
            start.speed = 0;
            start.sink = 0;
          } else {
            plane = candidate;
            pose();
          }
          error = null;
        })
        .catch((cause) => {
          if (!disposed && request === generation) error = cause;
        })
        .finally(() => {
          pending = false;
        });
    },
    stop() {
      generation++;
      owed = 0;
      error = null;
    },
    clear() {
      generation++;
      error = null;
      owed = 0;
      plane = null;
      collider.physics = null;
      built.root.visible = false;
    },
    dispose() {
      disposed = true;
      collider.physics = null;
      built.root.remove(collider);
    },
  };
}
