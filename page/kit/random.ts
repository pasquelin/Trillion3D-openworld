/**
 * The open world's seeded numbers: the same seed gives the same sky and traffic on every run and
 * every machine. Plenty for placing clouds and traffic, never for anything that must be
 * unpredictable. Copied from the Trillion3D example kit, with only what the open world uses.
 */

/** A sequence of numbers in [0, 1) from a seed. */
export type Random = () => number;

/** The open world's sequence (sky and simulation): mulberry32, a counter-based generator with
 *  32 bits of state and one multiply chain per draw. */
export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A value in [0, 1) for integer `index` under `seed`, without walking a sequence. */
export function hash(seed: number, index: number): number {
  let t = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(index | 0, 0x85ebca77)) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x7feb352d);
  t = Math.imul(t ^ (t >>> 15), 0x846ca68b);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

/**
 * Smooth noise in [-1, 1] along one axis: hashed values at whole numbers, joined by a
 * smoothstep, so the curve and its slope are continuous (gusts rise and fall, never jump).
 */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return (hash(seed, i) * (1 - s) + hash(seed, i + 1) * s) * 2 - 1;
}
