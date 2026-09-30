import {
  approach,
  clamp,
  lerp,
  multiply,
  rotate,
  yawPitchRoll,
  headingOf,
  type Q,
} from './math3.ts';
import type { CameraNode, Mode, Vec3 } from './types.ts';

/** Vehicle cameras; the engine's character controller owns the view on foot. */
export type CameraState = {
  chase: [number, number, number] | null;
  cockpit: boolean;
};

export const cameraState = (): CameraState => ({ chase: null, cockpit: false });

export type Frame = {
  mode: Mode;
  at: [number, number, number];
  turn: Q;
  look: { yaw: number; pitch: number };
  seat: Vec3 | null;
};

const CHASE: Record<'car' | 'plane', [number, number, number]> = {
  car: [0, 2.3, 7],
  plane: [0, 5, 20],
};

export function placeCamera(camera: CameraNode, state: CameraState, frame: Frame, dt: number) {
  const { at, look } = frame;
  if (frame.mode === 'foot') {
    state.chase = null;
    return;
  }
  if (state.cockpit && frame.seat) {
    const seat = rotate(frame.turn, frame.seat);
    camera.position.set(at[0] + seat[0], at[1] + seat[1], at[2] + seat[2]);
    camera.quaternion.set(...multiply(frame.turn, yawPitchRoll(look.yaw, look.pitch)));
    return;
  }
  // Behind the vehicle's heading (and, for the plane, its pitch), turned further by the mouse.
  const forward = rotate(frame.turn, [0, 0, -1]);
  const heading = headingOf(forward[0], forward[2]);
  const pitch = frame.mode === 'plane' ? Math.asin(clamp(forward[1], -1, 1)) * 0.6 : 0;
  const orbit = yawPitchRoll(heading + look.yaw, pitch + clamp(look.pitch, -0.5, 1) * 0.5 - 0.12);
  const back = rotate(orbit, CHASE[frame.mode]);
  const wanted: [number, number, number] = [at[0] + back[0], at[1] + back[1], at[2] + back[2]];
  const chase = state.chase ?? wanted;
  const k = approach(dt, 0.08);
  for (let i = 0; i < 3; i++) chase[i] = lerp(chase[i], wanted[i], k);
  state.chase = chase;
  camera.position.set(...chase);
  const aim = [at[0] - chase[0], at[1] + 1 - chase[1], at[2] - chase[2]];
  const length = Math.hypot(aim[0], aim[1], aim[2]) || 1;
  camera.quaternion.set(...yawPitchRoll(headingOf(aim[0], aim[2]), Math.asin(aim[1] / length)));
}
