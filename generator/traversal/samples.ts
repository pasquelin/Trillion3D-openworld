import type { Vec3 } from '../plan/contract.ts';
import type { Pose, ReplayRoute } from './types.ts';

/** Exact one-second replay poses, plus each corner. Speed schedules are renderer workloads. */
export function sampleRoute(
  id: string,
  name: string,
  kind: ReplayRoute['kind'],
  points: readonly Vec3[],
  speeds: readonly number[],
  night = false,
): ReplayRoute {
  let seconds = 0,
    length = 0;
  const samples: Pose[] = [];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1],
      b = points[k],
      distance = Math.hypot(...a.map((v, i) => b[i] - v)),
      speed = speeds[(k - 1) % speeds.length];
    if (speed <= 0) throw new Error('Moving segments require a positive speed');
    const duration = distance / speed,
      yaw = Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])),
      pitch = Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2]));
    for (let t = 0; t < duration; t += 1)
      samples.push({
        seconds: seconds + t,
        position: a.map((v, i) => v + ((b[i] - v) * t) / duration) as unknown as Vec3,
        yaw,
        pitch,
      });
    seconds += duration;
    length += distance;
  }
  const last = samples.at(-1);
  if (points.length)
    samples.push({
      seconds,
      position: points.at(-1)!,
      yaw: last?.yaw ?? 0,
      pitch: last?.pitch ?? 0,
    });
  return { id, name, kind, night, length, duration: seconds, samples };
}
