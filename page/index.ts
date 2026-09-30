/**
 * The open world's play layer, served as `runtime/openworld.js`: walking, driving and flying
 * through the engine's public World physics. A separate bounded worker
 * (`runtime/openworldSim.js`) advances traffic and pedestrians. The page passes
 * its engine families in, so the bundle contains no second engine instance.
 *
 * ```js
 * const play = createPlay({ world, engine: { geometry, material, object, light, math, vehicle }, data });
 * await play.ready;
 * ```
 */
export { createPlay, type Play } from './play/play.ts';
export { DEFAULT_MODELS } from './play/specs.ts';
export type { ColliderInstance, CollisionMesh } from './play/collision.ts';
export type {
  Engine,
  Mode,
  ModelPart,
  ModelSpec,
  PlayOptions,
  PlayWorld,
  Wheel,
} from './play/types.ts';
export * from './sky/index.ts';
