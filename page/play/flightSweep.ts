import { rotate } from './math3.ts';
import { AIRCRAFT, type Aircraft } from './sim/flight.ts';

const HALF = [5.5, 0.65, 4] as const;
const RADIUS = Math.hypot(...HALF);
// Maximum bank-induced yaw is g * sqrt(maxLiftRatio) / stallSpeed.
const MAX_RATE =
  AIRCRAFT.pitchRate +
  AIRCRAFT.rollRate +
  1.5 * AIRCRAFT.yawRate +
  (AIRCRAFT.gravity * Math.sqrt(2.5)) / AIRCRAFT.stall +
  0.6;

/** The public sweep is axis-aligned: enclose oriented wings and the curved fixed-step path. */
export function flightSweep(start: Aircraft, steps: readonly Aircraft[]) {
  const end = steps.at(-1)!;
  const half = [0, 0, 0];
  const samples = [start, ...steps];
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i],
      q = sample.orientation;
    const axes = [
      rotate(q, [HALF[0], 0, 0]),
      rotate(q, [0, HALF[1], 0]),
      rotate(q, [0, 0, HALF[2]]),
    ];
    for (let k = 0; k < 3; k++) {
      const chord = start.position[k] + ((end.position[k] - start.position[k]) * i) / steps.length;
      const bend = Math.abs(sample.position[k] - chord);
      half[k] = Math.max(half[k], bend + axes.reduce((sum, axis) => sum + Math.abs(axis[k]), 0));
    }
  }
  // A point can move by at most radius * angularSpeed * dt between samples.
  const margin = (RADIUS * MAX_RATE) / 60;
  return { x: half[0] + margin, y: half[1] + margin, z: half[2] + margin };
}
