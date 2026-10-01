import type { Settlement, Vec3 } from '../../plan/contract.ts';
import { between, hash01 } from '../../props/index.ts';
import { facing, placeLit, teleport, type Build } from './build.ts';
import type { Point } from './geometry2.ts';
import { corners } from './site.ts';
import { EDGE, oasisStreets, RING, STREET, TRACK } from './oasis-streets.ts';
import { groveSite, groves } from './oasis-groves.ts';
import { rankedSites, street } from './streets.ts';

type Plan = { edge: number; palms: number; lanterns: number; civic: boolean };
const TOWN: Plan = { edge: EDGE, palms: 30, lanterns: 12, civic: true };
const VILLAGE: Plan = { edge: EDGE, palms: 20, lanterns: 8, civic: false };

const HOUSES = [
  'desert/house-small',
  'desert/house-long',
  'desert/house-tall',
  'desert/house-tower',
  'desert/house-white',
  'desert/house-wide',
];

/** One settlement; the town (`civic`) also joins `highway` by a dirt track. */
export function oasis(b: Build, home: Settlement, highway?: readonly Vec3[]) {
  const layout = home.kind === 'town' ? TOWN : VILLAGE,
    { edge } = layout,
    name = `desert/${home.id}`,
    seed = b.plan.subSeed(name),
    streets = oasisStreets(b, layout.civic ? highway : undefined),
    suitable = (x: number, z: number) =>
      b.site.canPlace('desert/pool', x, z, 0) &&
      groveSite(b, [x, z], edge) &&
      !!streets.layoutAt([x, z], false),
    sites = rankedSites(
      b,
      [home.centre[0], home.centre[2]],
      Math.min(home.radius, 400),
      edge + 60,
      suitable,
    );
  let chosen: { at: Point; roads: NonNullable<ReturnType<typeof streets.layoutAt>> } | undefined;
  for (const at of sites) {
    const roads = streets.layoutAt(at, true);
    if (roads) {
      chosen = { at, roads };
      break;
    }
  }
  if (!chosen) throw new Error(`${name}: no passable track from pool to highway`);
  const {
    at: [cx, cz],
    roads: roadLayout,
  } = chosen;
  if (!b.site.place('desert/pool', cx, cz, 0, { name: `${name}/pool` }))
    throw new Error(`${name}: no grounded pool on passable dry streets`);
  const polar = (r: number, a: number): Point => [cx + r * Math.cos(a), cz + r * Math.sin(a)],
    toward = (roadLayout.exit * Math.PI) / 4;
  for (let i = 0; i < layout.palms; i++) {
    const a = between(seed, i, 0, Math.PI * 2),
      palm = i % 3 ? 'tree-palm-large' : 'tree-palm-small';
    b.site.place(palm, ...polar(between(seed + 1, i, RING + 10, RING + 19), a), a * 3);
    b.site.place('desert/reeds', ...polar(between(seed + 2, i, 14, 19), a + 0.05), a);
  }
  street(b, `${name}/ring`, 'street', STREET, streets.ring([cx, cz]));
  for (const [i, k] of roadLayout.angles.entries()) {
    const a = (k * Math.PI) / 4;
    street(b, `${name}/street-${i}`, 'street', STREET, [polar(RING, a), polar(edge, a)]);
  }
  if (roadLayout.route) track(b, name, roadLayout.route);
  const hall = layout.civic ? civic(b, name, [cx, cz], polar, toward) : undefined;
  // Lanterns along the ring, their brackets over the street.
  for (let i = 0; i < layout.lanterns; i++) {
    const a = toward + ((i + 0.5) / layout.lanterns) * Math.PI * 2;
    placeLit(
      b,
      'desert/lantern-post',
      ...polar(RING + 4.5, a),
      Math.atan2(Math.sin(a), -Math.cos(a)),
    );
  }
  if (!groves(b, seed, [cx, cz], edge, RING)) throw new Error(`${name}: no grounded palm grove`);
  houses(b, seed, [cx, cz], edge, polar);
  if (hall) teleport(b, 'desert/oasis', ...polar(44, toward - Math.PI * 0.75), hall, -0.02);
}

/** A dirt track from the town's edge to the highway, dust on its middle. */
function track(b: Build, name: string, points: Point[]) {
  street(b, `${name}/track`, 'dirt', TRACK, points);
  const [mx, mz] = points[points.length >> 1];
  b.markers.push({
    kind: 'emitter',
    effect: 'road-dust',
    name: `${name}/track-dust`,
    position: [mx, b.plan.height(mx, mz), mz],
    radius: 80,
  });
}

/** The town's hall on one quarter, its market kept open on the opposite one. */
function civic(
  b: Build,
  name: string,
  [cx, cz]: Point,
  polar: (r: number, a: number) => Point,
  toward: number,
) {
  const hallAt = polar(62, toward + Math.PI * 0.25),
    market = toward + Math.PI * 1.25;
  placeLit(b, 'desert/domed-hall', ...hallAt, facing(cx - hallAt[0], cz - hallAt[1]), {
    name: `${name}/hall`,
  });
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++) {
      const [x, z] = polar(48 + i * 9, market + (j - 1) * 0.09);
      b.site.place(
        j % 2 ? 'desert/stall-fruit' : 'desert/stall-spice',
        x,
        z,
        facing(cx - x, cz - z),
      );
    }
  const square = { minX: -30, maxX: 30, minZ: -22, maxZ: 22, plinth: 0, sink: 0 };
  b.site.claim(corners(square, ...polar(62, market), market));
  return hallAt;
}

/** Houses on rings between the ring street and the edge, fronts toward the pool, and wells. */
function houses(
  b: Build,
  seed: number,
  [cx, cz]: Point,
  edge: number,
  polar: (r: number, a: number) => Point,
) {
  for (let r = 43, ring = 0; r < edge; r += 18, ring++)
    for (let a = 0, k = 0; a < Math.PI * 2; k++) {
      const roll = hash01(seed + 11, ring, k),
        big = r > 60 && roll > 0.8,
        manor = roll > 0.93 ? 'desert/courtyard-manor' : 'desert/courtyard-house',
        prop = big ? manor : HOUSES[Math.floor(roll * 1.25 * HOUSES.length) % HOUSES.length],
        [x, z] = polar(r, a);
      b.site.place(prop, x, z, facing(cx - x, cz - z), { clearance: 1.5 });
      a += (big ? 30 : 13) / r;
    }
  for (let i = 0; i < 4; i++) {
    const at = polar(between(seed + 12, i, 42, edge - 12), between(seed + 13, i, 0, 6.28));
    b.site.place('desert/well', ...at, 0);
  }
}
