import { client } from './client.ts';
import { cameraState, placeCamera } from './camera.ts';
import { trafficPhysics } from './bodies.ts';
import { hud as createHud } from './hud.ts';
import { input as createInput } from './input.ts';
import { KEYS, readInputs, type Look } from './keys.ts';
import { approach, clamp, headingOf, rotate } from './math3.ts';
import { movingWorld } from './movers.ts';
import { H, layout, type SimWorld } from './protocol.ts';
import { createPlayer } from './player.ts';
import { DEFAULT_MODELS } from './specs.ts';
import type { Mode, PlayOptions } from './types.ts';
import { view as createView } from './view.ts';

/** Engine physics owns the player and collisions; the crowd worker sends bounded visual pools. */
export function createPlay(options: PlayOptions) {
  const { world, engine, data } = options;
  const previousPhysics = { enabled: world.physics.enabled, range: world.physics.simulationRange };
  world.physics.simulationRange = options.radius ?? 2500;
  world.physics.enabled = true;
  const models = { ...DEFAULT_MODELS, ...options.models };
  const limits = {
    radius: options.radius ?? 2500,
    traffic: options.traffic ?? 40,
    pedestrians: options.pedestrians ?? 60,
  };
  const moving = movingWorld(data.movers, data.roads);
  const shape = layout(limits, moving.length);
  const simWorld: SimWorld = {
    ...data,
    car: { wheels: models.car.anchors?.wheels ?? [], mass: models.car.mass },
  };
  const sim = client(
    options.urls?.worker ?? new URL('./openworldSim.js', import.meta.url).href,
    { world: simWorld, limits },
    shape.length,
  );
  const scene = createView(engine, world.scene, models, shape, limits, moving, data.markers);
  const traffic = trafficPhysics(
    engine,
    scene.traffic.map((built) => built.root),
  );
  const player = createPlayer({ ...options, models }, scene);
  let mode: Mode = 'foot';
  const keys = createInput(world.canvas, () => mode !== 'foot');
  const hud = createHud(data.roads, data.size);
  const look: Look = { yaw: 0, pitch: 0 };
  const camera = cameraState();
  let views = 0,
    idle = 0,
    disposed = false;
  let lastPosition: readonly number[] | null = null;
  let resolveReady: () => void = () => {},
    rejectReady: (error: unknown) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void sim.ready.catch(rejectReady);
  const timeout = setTimeout(
    () => rejectReady(new Error('Physics collision did not become ready within 30 seconds')),
    30000,
  );
  const unhook = world.beforeFrame(({ delta }) => {
    const dt = Math.min(delta, 1 / 15);
    const mouse = keys.take();
    look.yaw -= mouse.dx * 0.0022;
    look.pitch = clamp(look.pitch - mouse.dy * 0.0022, -1.5, 1.5);
    idle = mouse.dx || mouse.dy ? 0 : idle + dt;
    if (mode !== 'foot' && idle > 1.5 && !camera.cockpit) {
      const ease = 1 - approach(dt, 0.4);
      look.yaw *= ease;
      look.pitch *= ease;
    }
    if (keys.presses(KEYS.view) !== views) {
      views = keys.presses(KEYS.view);
      camera.cockpit = !camera.cockpit;
    }
    player.update(readInputs(keys, mode, look), dt);
    if (player.error) rejectReady(player.error);
    if (!player.loading && sim.received()) {
      clearTimeout(timeout);
      resolveReady();
    }
    if (mode !== player.mode) {
      mode = player.mode;
      look.yaw = look.pitch = 0;
    }
    const at = player.position(),
      turn = player.orientation();
    sim.send({
      type: 'focus',
      x: at[0],
      z: at[2],
      vx: lastPosition && dt > 0 ? clamp((at[0] - lastPosition[0]) / dt, -300, 300) : 0,
      vz: lastPosition && dt > 0 ? clamp((at[2] - lastPosition[2]) / dt, -300, 300) : 0,
    });
    lastPosition = at;
    if (sim.received()) scene.update(sim, sim.blend(), dt);
    traffic.update();
    placeCamera(
      world.camera,
      camera,
      {
        mode,
        at,
        turn,
        look,
        seat: (mode === 'car' ? models.car : models.plane).anchors?.eye ?? null,
      },
      dt,
    );
    const forward = rotate(turn, [0, 0, -1]);
    hud.update({
      mode,
      speed: player.speed,
      altitude: at[1],
      aboveGround: player.floor === null ? null : at[1] - player.floor,
      throttle: player.flight?.throttle ?? 0,
      stalled: player.flight?.stalled ?? false,
      loading: player.loading,
      prompt: player.prompt(),
      x: at[0],
      z: at[2],
      heading: headingOf(forward[0], forward[2]),
    });
    world.invalidate();
  });
  return {
    ready,
    get mode() {
      return mode;
    },
    teleports: data.markers.flatMap((m) => (m.kind === 'teleport' ? [m.name] : [])),
    teleport: (name: string) => player.teleport(name),
    set night(on: boolean) {
      scene.night(on);
    },
    get state() {
      return {
        mode,
        stepMs: world.physics.stats.stepMs,
        bodies: world.physics.stats.bodies,
        traffic: sim.next[H.traffic],
        pedestrians: sim.next[H.pedestrians],
        missingModels: scene.missing,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timeout);
      rejectReady(new Error('Play disposed before becoming ready'));
      unhook();
      sim.dispose();
      keys.dispose();
      hud.dispose();
      traffic.dispose();
      player.dispose();
      scene.dispose();
      world.physics.enabled = previousPhysics.enabled;
      world.physics.simulationRange = previousPhysics.range;
    },
  };
}
export type Play = ReturnType<typeof createPlay>;
