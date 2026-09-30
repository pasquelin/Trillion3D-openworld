import { posed } from '../movers.ts';
import { BLOCK, H } from '../protocol.ts';
import type { Sim } from './core.ts';

/** Crowd snapshots use world coordinates; engine physics handles its own precision. */
export function writeSnapshot(sim: Sim, out: Float32Array) {
  const { layout } = sim;
  const origin = { x: 0, z: 0 };
  out.fill(0);
  out[H.time] = sim.time;
  out[H.stepMs] = sim.stepMs;
  let active = 0;
  for (const [i, car] of sim.flow.cars.entries()) {
    // An idle slot says so with a braking value of −1.
    if (!car.active) {
      out[layout.traffic + i * BLOCK.traffic + 4] = -1;
      continue;
    }
    active++;
    out.set(
      [car.x - origin.x, car.y, car.z - origin.z, car.yaw, car.braking ? 1 : 0],
      layout.traffic + i * BLOCK.traffic,
    );
  }
  out[H.traffic] = active;
  active = 0;
  for (const [i, person] of sim.people.people.entries()) {
    const at = layout.pedestrians + i * BLOCK.pedestrian;
    if (!person.active) {
      out[at + 5] = -1;
      continue;
    }
    active++;
    out.set(
      [person.x - origin.x, person.y, person.z - origin.z, person.yaw, person.phase, person.gait],
      at,
    );
  }
  out[H.pedestrians] = active;
  sim.moving.forEach((moving, i) =>
    posed(moving, sim.time, out, layout.movers + i * BLOCK.mover, origin.x, origin.z),
  );
}
