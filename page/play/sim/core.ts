import { movingWorld } from '../movers.ts';
import { layout, type SimLimits, type SimWorld } from '../protocol.ts';
import { crowd, stepCrowd } from './pedestrians.ts';
import { roadGraph } from './roadGraph.ts';
import { stepTraffic, traffic } from './traffic.ts';

/** Bounded traffic and crowd gameplay. World.physics owns every physical body on the page. */
export function createSim(world: SimWorld, limits: SimLimits) {
  const moving = movingWorld(world.movers, world.roads);
  return {
    layout: layout(limits, moving.length),
    moving,
    graph: roadGraph(world.roads),
    flow: traffic(limits.traffic, world.seed, Math.min(limits.radius, 1500)),
    people: crowd(limits.pedestrians, world.seed, 350, world.settlements, world.roads),
    focus: { x: 0, z: 0, vx: 0, vz: 0 },
    time: 0,
    stepMs: 0,
  };
}
export type Sim = ReturnType<typeof createSim>;

export function step(sim: Sim, dt: number) {
  const started = performance.now();
  const { x, z } = sim.focus;
  stepTraffic(
    sim.graph,
    sim.flow,
    x,
    z,
    [sim.focus, ...sim.people.people.filter((p) => p.active)],
    dt,
  );
  const cars = sim.flow.cars
    .filter((car) => car.active)
    .map((car) => ({
      x: car.x,
      z: car.z,
      vx: -Math.sin(car.yaw) * car.speed,
      vz: -Math.cos(car.yaw) * car.speed,
    }));
  cars.push(sim.focus);
  stepCrowd(sim.people, x, z, cars, dt);
  sim.time += dt;
  sim.stepMs = performance.now() - started;
}
