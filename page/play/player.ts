import { createCar } from './car.ts';
import { createCharacter } from './character.ts';
import { createFlight } from './flight.ts';
import { groundProbe } from './ground.ts';
import { AIRCRAFT } from './sim/flight.ts';
import { headingOf, rotate, type Q } from './math3.ts';
import { REACH, spawnsOf, type Inputs } from './protocol.ts';
import { onAsphalt, roadIndex } from './roads.ts';
import type { Mode, PlayOptions } from './types.ts';
import type { View } from './view.ts';

/** Modes share one World physics session. The character is removed while a vehicle is driven. */
export function createPlayer(options: PlayOptions, view: View) {
  const { world, engine, data } = options;
  world.controls.kind = 'none';
  const foot = createCharacter(world);
  const car = createCar(world, engine, view.car, options.models?.car?.mass);
  const plane = createFlight(world, engine, view.plane);
  const ground = groundProbe(world, engine);
  const surface = roadIndex(
    data.roads.filter((r) => r.class !== 'runway' && r.class !== 'taxiway'),
  );
  let mode: Mode = 'foot',
    carSpawn = -1,
    planeSpawn = -1,
    used = 0;
  let waiting = true;
  const previousPaused = world.physics.paused;
  const carPosition = (): [number, number, number] => [
    car.body.position.x,
    car.body.position.y,
    car.body.position.z,
  ];
  const position = (): [number, number, number] =>
    mode === 'car'
      ? carPosition()
      : mode === 'plane' && plane.state
        ? [...plane.state.position]
        : foot.read().position;
  const orientation = (): Q => {
    if (mode === 'plane' && plane.state) return plane.state.orientation;
    const q = mode === 'car' ? car.body.quaternion : world.camera.quaternion;
    return [q.x, q.y, q.z, q.w];
  };
  function putFoot(at: readonly number[], yaw = 0, pitch = 0) {
    foot.active(false);
    mode = 'foot';
    waiting = true;
    ground.reset();
    foot.teleport(at[0], at[1], at[2], yaw, pitch);
  }
  function leave() {
    plane.stop();
    const at = position(),
      q = orientation();
    const offset = rotate(q, [mode === 'car' ? -2.5 : -7, 0, 0]);
    const forward = rotate(q, [0, 0, -1]);
    if (mode === 'plane' && !plane.state?.onGround) {
      plane.clear();
      planeSpawn = -1;
    }
    putFoot([at[0] + offset[0], at[1], at[2] + offset[2]], headingOf(forward[0], forward[2]));
  }
  function use() {
    if (mode !== 'foot') {
      if (mode === 'car' || (plane.state?.onGround && plane.state.speed < 3)) leave();
      return;
    }
    const [x, , z] = position();
    for (const kind of ['car', 'plane'] as const) {
      const own = kind === 'car' ? carSpawn >= 0 && carPosition() : plane.state?.position;
      const close = own && Math.hypot(own[0] - x, own[2] - z) < REACH[kind];
      const markers = spawnsOf(data.markers, kind);
      const spawn = markers.findIndex(
        (m, i) =>
          i !== (kind === 'car' ? carSpawn : planeSpawn) &&
          Math.hypot(m.position[0] - x, m.position[2] - z) < REACH[kind],
      );
      if (!close && spawn < 0) continue;
      foot.active(false);
      mode = kind;
      ground.reset();
      if (!close) {
        const marker = markers[spawn],
          [mx, my, mz] = marker.position;
        if (kind === 'car') {
          car.reset();
          car.place([mx, my + 0.9, mz], marker.yaw);
          carSpawn = spawn;
        } else {
          plane.place([mx, my + AIRCRAFT.gear, mz], marker.yaw);
          planeSpawn = spawn;
        }
      }
      return;
    }
  }
  const initial = data.markers.find((m) => m.kind === 'teleport') ?? data.markers[0];
  putFoot(
    initial?.position ?? [0, 0, 0],
    initial && 'yaw' in initial ? initial.yaw : 0,
    initial && 'pitch' in initial ? (initial.pitch ?? 0) : 0,
  );
  return {
    get mode() {
      return mode;
    },
    get error() {
      return world.physics.error ?? plane.error ?? ground.error;
    },
    position,
    orientation,
    get loading() {
      return waiting;
    },
    get floor() {
      const p = position();
      return ground.read(p[0], p[2]);
    },
    get flight() {
      return plane.state;
    },
    get speed() {
      return mode === 'car'
        ? Math.abs(car.speed())
        : mode === 'plane'
          ? (plane.state?.speed ?? 0)
          : Math.hypot(...foot.read().velocity);
    },
    prompt() {
      if (mode !== 'foot') return null;
      const at = position();
      for (const kind of ['car', 'plane'] as const) {
        const own = kind === 'car' ? carSpawn >= 0 && carPosition() : plane.state?.position;
        if (own && Math.hypot(own[0] - at[0], own[2] - at[2]) < REACH[kind])
          return kind === 'car' ? 'E — drive the car' : 'E — fly the plane';
        if (
          spawnsOf(data.markers, kind).some(
            (m) => Math.hypot(m.position[0] - at[0], m.position[2] - at[2]) < REACH[kind],
          )
        )
          return kind === 'car' ? 'E — drive the car' : 'E — fly the plane';
      }
      return null;
    },
    update(input: Inputs, dt: number) {
      if (input.use !== used) use();
      used = input.use;
      const at = position();
      const floor = ground.read(at[0], at[2]);
      if (mode !== 'foot' || (waiting && floor === null))
        ground.request(
          ...at,
          mode === 'car' ? car.body : mode === 'plane' ? plane.body : undefined,
        );
      if (mode === 'foot' && waiting && floor !== null) {
        world.camera.position.y += Math.max(0, floor + 0.05 - at[1]);
        foot.active(true);
        waiting = false;
      } else if (mode !== 'foot') waiting = floor === null;
      const pause = previousPaused || (mode === 'car' && waiting);
      if (world.physics.paused !== pause) world.physics.paused = pause;
      if (carSpawn >= 0) {
        if (mode === 'car' && floor !== null) car.enable();
        car.drive(
          mode === 'car' && !waiting ? input : null,
          onAsphalt(surface, ...([car.body.position.x, car.body.position.z] as [number, number])),
          dt,
        );
      }
      if (mode === 'plane' && !waiting) plane.step(input, dt);
      view.spawns(carSpawn, planeSpawn);
    },
    teleport(name: string) {
      const marker = data.markers.find((m) => m.kind === 'teleport' && m.name === name);
      if (!marker || marker.kind !== 'teleport') return;
      if (mode !== 'foot') leave();
      putFoot(marker.position, marker.yaw, marker.pitch ?? 0);
    },
    dispose() {
      ground.dispose();
      plane.dispose();
      car.dispose();
      foot.dispose();
      world.physics.paused = previousPaused;
    },
  };
}
