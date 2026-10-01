/** A shared downtown frontage: shops below compact offices, with an open rear service lane. */
import type { PropMesh } from '../../plan/contract.ts';
import { box, prop, transform } from '../../props/index.ts';
import { edgesOf, punchedWall, rectangle } from './facade.ts';
import { CITY } from './surfaces.ts';
import { FOUNDATION } from './tower-kit.ts';
import { footprint, inCell, type Cell } from './grid.ts';
import { KERB } from './ground-props.ts';
import { RANK, type Placer } from './placement.ts';

export const STREETWALL_HALF = [44, 8] as const;
const WIDTH = STREETWALL_HALF[0] * 2;
const DEPTH = STREETWALL_HALF[1] * 2;
const SHOP = 4.2;
const FLOOR = 3.2;
const FLOORS = 6;

export function downtownStreetwall(seed: number): PropMesh {
  const longFaces = edgesOf(rectangle(WIDTH, DEPTH)).filter((edge) => edge.length === WIDTH);
  return prop('city/downtown-streetwall', [
    transform(box(CITY.stone, [WIDTH, FOUNDATION + SHOP, DEPTH]), {
      at: [0, -FOUNDATION, 0],
    }),
    transform(box(CITY.renderGrey, [WIDTH, FLOOR * FLOORS, DEPTH]), { at: [0, SHOP, 0] }),
    ...longFaces.flatMap((edge, side) => [
      ...punchedWall(edge, 0.5, 1, {
        window: 3.4,
        floor: SHOP,
        bay: 4.8,
        lit: 0.55,
        seed: seed + side,
      }),
      ...punchedWall(edge, SHOP, FLOORS, {
        window: 2.1,
        floor: FLOOR,
        bay: 4.8,
        lit: 0.25,
        seed: seed + 10 + side,
      }),
    ]),
    transform(box(CITY.stone, [WIDTH + 0.4, 0.35, DEPTH + 0.4]), {
      at: [0, SHOP + FLOORS * FLOOR, 0],
    }),
  ]);
}

/** Four walls form the court; twin-office cells keep their side lanes open. */
export function placeStreetwalls(placer: Placer, cell: Cell, rank: number) {
  const y = cell.base + KERB;
  for (const side of [-1, 1]) {
    const v = side * (cell.box.half[1] - 7 - STREETWALL_HALF[1]);
    placer.place(
      'city/downtown-streetwall',
      inCell(placer, cell, [0, v], y),
      placer.site.yaw + (side > 0 ? 0 : Math.PI),
      'solid',
      RANK.structure,
      footprint(placer, cell, [0, v], STREETWALL_HALF),
      { support: y - FOUNDATION },
    );
    if (rank >= 2 && rank % 4 === 2) continue;
    const u = side * (cell.box.half[0] - 7 - STREETWALL_HALF[1]);
    placer.place(
      'city/downtown-streetwall',
      inCell(placer, cell, [u, 0], y),
      placer.site.yaw + Math.PI / 2,
      'solid',
      RANK.structure,
      footprint(placer, cell, [u, 0], [27, STREETWALL_HALF[1]], Math.PI / 2),
      { support: y - FOUNDATION, scale: [27 / STREETWALL_HALF[0], 1, 1] },
    );
  }
}
