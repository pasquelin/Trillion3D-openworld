/**
 * The global, low-frequency relief of the world (Trillion3D#332), packed into the map's layout: the coast
 * encloses the island with offshore islets, a compact range rises in the north interior, a
 * low desert plateau lies to the west, rolling land fills the rest. Regions refine it; rivers and
 * roads cut it later.
 */
import { WORLD } from './contract.ts';
import { fbm, hash2, nameSeed, ridged, smoothstep } from './noise.ts';
import { enclosingCoast, preserveShore } from './shore.ts';
import { airfieldPlain, mountainEnvelope } from './geography.ts';

/** Depth scale of the continental shelf, metres: the sea a swimmer or a boat sees near shore. */
const SHELF = 80;

export type Island = { x: number; z: number; top: number; radius: number };

export type Relief = {
  /** Height before any region refinement, river or road: metres, highest peak `WORLD.peak`. */
  height(x: number, z: number): number;
  /** Distance to the continent's coastline, positive inland, metres (islands excluded). */
  coast(x: number, z: number): number;
  /** The south coastline's z at a given x. */
  southCoastZ(x: number): number;
  islands: readonly Island[];
};

export function createRelief(seed: number): Relief {
  const s = (name: string) => nameSeed(seed, `relief/${name}`),
    [southSeed, rangeSeed, rollSeed, islandSeed] = ['south', 'range', 'roll', 'islands'].map(s),
    coast = enclosingCoast(southSeed),
    southCoastZ = (x: number) => {
      let low = -500,
        high = WORLD.size / 2;
      for (let k = 0; k < 32; k++) {
        const middle = (low + high) / 2;
        if (coast(x, middle) > 0) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    };
  // Three islands in the sea strip, one per third of the shore, the last off the coast region.
  const islands: Island[] = Array.from({ length: 3 }, (_, index) => {
    const draw = (salt: number) => hash2(islandSeed, index, salt),
      x = -WORLD.size / 2 + (index + 0.3 + 0.5 * draw(0)) * (WORLD.size / 3);
    return {
      x,
      z: southCoastZ(x) + 500 + 400 * draw(1),
      top: 30 + 60 * draw(2),
      radius: 180 + 200 * draw(3),
    };
  });
  const raw = (x: number, z: number) => {
    const c = coast(x, z),
      // One continuous profile through sea level: the shelf rises to 0 m at the coastline and
      // the land keeps rising from there, gently, so a beach can form; a region that wants
      // cliffs raises them in its own refinement.
      shore = c >= 0 ? 40 * (1 - Math.exp(-c / 2_000)) : -SHELF * (1 - Math.exp(c / 500)),
      inland = smoothstep(0, 800, c);
    let height = shore;
    // Each layer is evaluated only where its envelope is non-zero: the sea skips them all.
    if (inland > 0) {
      const mountain = mountainEnvelope(x, z),
        plain = airfieldPlain(x, z),
        plateau = smoothstep(-1_600, -2_400, x) * smoothstep(500, -800, z),
        rolling = 90 + 70 * fbm(rollSeed, x / 1_100, z / 1_100, 4),
        foothills = 220 * Math.sqrt(mountain),
        crest = 1_800 * mountain * (0.5 + 0.5 * ridged(rangeSeed, x / 1_600, z / 1_600, 5));
      const land = (rolling + 70 * plateau + foothills + crest) * (1 - 0.9 * plain);
      height += inland * land;
    }
    for (const island of islands) {
      const d2 = ((x - island.x) ** 2 + (z - island.z) ** 2) / island.radius ** 2;
      if (d2 > 9) continue;
      const bump =
        (island.top + SHELF) * Math.exp(-d2) * (1 + 0.15 * fbm(rollSeed + 3, x / 500, z / 500, 3));
      if (bump - SHELF > height) height = bump - SHELF;
    }
    return preserveShore(-SHELF, height, Math.min(3_750 - Math.abs(x), 3_750 - Math.abs(z)), 200);
  };
  // Normalise on a 100 m grid; a smooth summit ceiling also bounds peaks between samples.
  let highest = 0;
  for (let z = -WORLD.size / 2; z <= WORLD.size / 2; z += 100)
    for (let x = -WORLD.size / 2; x <= WORLD.size / 2; x += 100)
      highest = Math.max(highest, raw(x, z));
  const scale = WORLD.peak / highest;
  const height = (x: number, z: number) => {
    const value = raw(x, z);
    if (value <= 0) return value;
    const scaled = value * scale,
      knee = WORLD.peak * 0.95,
      headroom = WORLD.peak - knee;
    return scaled > knee ? knee + (scaled - knee) / (1 + (scaled - knee) / headroom) : scaled;
  };
  return { height, coast, southCoastZ, islands };
}
