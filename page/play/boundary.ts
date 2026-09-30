import type { Vec3 } from './types.ts';

/** Recovery is an explicit action. Tracking a safe spot never moves or clamps the player. */
export function safeReturn(size: number, initial: Vec3, seaLevel = 0, maxAltitude = 3200) {
  let safe: Vec3 = [...initial];
  let reason: 'water' | 'envelope' | null = null;
  let disposed = false;
  return {
    observe(at: Vec3, floor: number | null, grounded: boolean) {
      if (disposed) return;
      reason =
        Math.abs(at[0]) > size / 2 || Math.abs(at[2]) > size / 2 || at[1] > maxAltitude
          ? 'envelope'
          : floor !== null && floor < seaLevel - 1 && at[1] < seaLevel + 1
            ? 'water'
            : null;
      if (
        !reason &&
        grounded &&
        floor !== null &&
        floor > seaLevel + 0.5 &&
        Math.abs(at[0]) < size / 2 - 250 &&
        Math.abs(at[2]) < size / 2 - 250
      )
        safe = [at[0], floor + 0.1, at[2]];
    },
    get reason() {
      return reason;
    },
    returnToGround() {
      return disposed ? null : ([...safe] as Vec3);
    },
    dispose() {
      disposed = true;
    },
  };
}
