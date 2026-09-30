import type { Object3D } from 'trillion3d-engine';
import type { Engine, PlayWorld } from './types.ts';

/** Queries the engine's streamed collision, never the separate render or gameplay height grids. */
export function groundProbe(world: PlayWorld, engine: Engine) {
  let busy = false,
    disposed = false,
    generation = 0;
  let floor: number | null = null;
  let error: unknown = null;
  let at = [Infinity, Infinity];
  return {
    get error() {
      return error;
    },
    read(x: number, z: number) {
      return Math.hypot(x - at[0], z - at[1]) < 8 ? floor : null;
    },
    reset() {
      generation++;
      error = null;
      floor = null;
      at = [Infinity, Infinity];
    },
    request(x: number, y: number, z: number, ignore?: Object3D) {
      if (busy || disposed) return;
      busy = true;
      const request = generation;
      const ray = engine.math.ray(engine.math.vector3(x, y + 2, z), engine.math.vector3(0, -1, 0));
      world
        .raycast(ray, { exact: true, maxDistance: 20000, ignore })
        .then(
          (hit) => {
            if (disposed || request !== generation) return;
            floor = hit?.point.y ?? null;
            at = [x, z];
            error = null;
          },
          (cause) => {
            if (
              !disposed &&
              request === generation &&
              (cause as { code?: string }).code !== 'PHYSICS_OFF'
            )
              error = cause;
          },
        )
        .finally(() => {
          busy = false;
        });
    },
    dispose() {
      disposed = true;
    },
  };
}
