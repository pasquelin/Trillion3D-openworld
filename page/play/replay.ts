import type { ReplayRoute } from '../../generator/traversal/types.ts';
import { clamp, yawPitchRoll } from './math3.ts';
import type { PlayWorld } from './types.ts';

/** Renderer replay owns only the camera. Native character/vehicle acceptance is separate. */
export function cameraReplay(world: PlayWorld, applyTime: (night: boolean) => void) {
  let disposed = false;
  let route: ReplayRoute | null = null,
    elapsed = 0,
    sample = 0;
  let pose: {
    position: [number, number, number];
    quaternion: [number, number, number, number];
  } | null = null;
  let previous: {
    kind: PlayWorld['controls']['kind'];
    enabled: boolean;
    paused: boolean;
    fov: number;
    far: number;
  } | null = null;
  const stop = () => {
    route = null;
    if (!previous) return;
    if (pose) {
      world.camera.position.set(...pose.position);
      world.camera.quaternion.set(...pose.quaternion);
      pose = null;
    }
    world.controls.kind = previous.kind;
    world.controls.enabled = previous.enabled;
    world.physics.paused = previous.paused;
    world.camera.fov = previous.fov;
    world.camera.far = previous.far;
    previous = null;
  };
  return {
    start(next: ReplayRoute) {
      if (disposed) throw new Error('Replay disposed');
      stop();
      if (!next.samples.length) throw new Error('Replay has no samples');
      const p = world.camera.position,
        q = world.camera.quaternion;
      pose = { position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w] };
      previous = {
        kind: world.controls.kind,
        enabled: world.controls.enabled,
        paused: world.physics.paused,
        fov: world.camera.fov,
        far: world.camera.far,
      };
      world.controls.kind = 'none';
      world.controls.enabled = false;
      world.physics.paused = true;
      if (next.camera) {
        world.camera.fov = next.camera.fov;
        world.camera.far = Math.max(previous.far, next.camera.far);
      }
      route = next;
      elapsed = 0;
      sample = 0;
      applyTime(next.night);
    },
    get active() {
      return route !== null;
    },
    get state() {
      return route ? { id: route.id, seconds: elapsed, duration: route.duration } : null;
    },
    update(delta: number) {
      if (!route) return;
      elapsed = Math.min(route.duration, elapsed + Math.max(0, delta));
      while (sample + 1 < route.samples.length && route.samples[sample + 1].seconds <= elapsed)
        sample++;
      const a = route.samples[sample],
        b = route.samples[Math.min(sample + 1, route.samples.length - 1)],
        t =
          b.seconds > a.seconds ? clamp((elapsed - a.seconds) / (b.seconds - a.seconds), 0, 1) : 0;
      world.camera.position.set(
        ...(a.position.map((v, i) => v + (b.position[i] - v) * t) as [number, number, number]),
      );
      const yaw = a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * t;
      world.camera.quaternion.set(...yawPitchRoll(yaw, a.pitch + (b.pitch - a.pitch) * t, 0));
      world.invalidate();
    },
    stop,
    dispose() {
      stop();
      disposed = true;
    },
  };
}
