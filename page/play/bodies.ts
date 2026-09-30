import type { Mesh, PhysicsOption } from 'trillion3d-engine';
import type { Engine, Node3 } from './types.ts';

/** A collision-only mesh. Its material draws nothing; the physics still receives its poses. */
export function body(engine: Engine, size: readonly number[]): Mesh {
  return engine.object.mesh(
    engine.geometry.box(size[0], size[1], size[2]),
    engine.material.meshStandard({ transparent: true, opacity: 0 }),
  ) as unknown as Mesh;
}

/** Fixed traffic collision pool, attached to the already-interpolated visual roots. */
export function trafficPhysics(engine: Engine, roots: readonly Node3[]) {
  const boxes = roots.map((root) => {
    const box = body(engine, [1.8, 1.4, 4.4]);
    box.position.y = 0.7;
    root.add(box);
    return box;
  });
  const last = roots.map(() => [Infinity, Infinity, Infinity]);
  const options: PhysicsOption = { type: 'kinematic' };
  return {
    update() {
      roots.forEach((root, i) => {
        const p = root.position,
          before = last[i];
        const jumped = Math.hypot(p.x - before[0], p.y - before[1], p.z - before[2]) > 20;
        // Recycled cars teleport instead of sweeping a kinematic body across the world.
        if (root.visible && (!boxes[i].physics || jumped)) boxes[i].physics = options;
        before[0] = p.x;
        before[1] = p.y;
        before[2] = p.z;
        if (!root.visible && boxes[i].physics) boxes[i].physics = null;
      });
    },
    dispose() {
      roots.forEach((root, i) => {
        boxes[i].physics = null;
        root.remove(boxes[i]);
      });
    },
  };
}
