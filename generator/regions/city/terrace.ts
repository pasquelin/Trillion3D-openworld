/** Compact row houses for the dry fragments left beside diagonal avenues. */
import type { PropMesh } from '../../plan/contract.ts';
import { box, prop, transform } from '../../props/index.ts';
import { edgesOf, punchedWall, rectangle } from './facade.ts';
import { CITY } from './surfaces.ts';
import { FOUNDATION } from './tower-kit.ts';

export const TERRACE_HALF = [21, 6.5] as const;
const WIDTH = TERRACE_HALF[0] * 2;
const DEPTH = TERRACE_HALF[1] * 2;
const STOREY = 3.1;

export function terrace(seed: number): PropMesh {
  const faces = edgesOf(rectangle(WIDTH, DEPTH)).filter((edge) => edge.length === WIDTH);
  return prop('city/terrace', [
    transform(box(CITY.stone, [WIDTH, FOUNDATION + 0.6, DEPTH]), {
      at: [0, -FOUNDATION, 0],
    }),
    ...[-1, 0, 1].map((part) =>
      transform(box(part === 0 ? CITY.render : CITY.renderTerracotta, [14, STOREY * 3, DEPTH]), {
        at: [part * 14, 0.6, 0],
      }),
    ),
    ...faces.flatMap((edge, side) =>
      punchedWall(edge, 0.6, 3, {
        window: 1.6,
        floor: STOREY,
        bay: 3.5,
        lit: 0.3,
        seed: seed + side,
      }),
    ),
    transform(box(CITY.stone, [WIDTH + 0.4, 0.3, DEPTH + 0.4]), {
      at: [0, 0.6 + STOREY * 3, 0],
    }),
  ]);
}
