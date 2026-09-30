/**
 * The contents of one block, in the block's own frame (`u` along the grid, `v` across, origin at
 * the block centre, at least ±45 m of it inside the sidewalk): a mid-rise courtyard block, and a
 * suburban garden lot.
 */
import { hash01 } from '../../props/index.ts';
import type { CityCatalog } from './catalog.ts';
import type { Xz } from './frame.ts';
import { KERB } from './ground-props.ts';
import { footprint, inCell, type Cell } from './grid.ts';
import { RANK, type Placer } from './placement.ts';
import { neon, onProp } from './mounts.ts';
import { FOUNDATION } from './tower-kit.ts';

/** Two adjoining pairs face the streets; narrow end alleys enter the shared courtyard. */
export function midriseBlock(placer: Placer, cell: Cell, catalog: CityCatalog, seed: number) {
  const y = cell.base + KERB;
  const rows = [-1, 1].flatMap((side) => {
    const left =
        catalog.midrise[Math.floor(hash01(seed, cell.i, cell.j, side) * catalog.midrise.length)],
      choices = catalog.midrise.filter((right) => {
        const half = left.half[0] + right.half[0];
        return half >= 37 && half <= 41;
      }),
      right = choices[Math.floor(hash01(seed + 1, cell.i, cell.j, side) * choices.length)],
      seam = left.half[0] - right.half[0];
    return [
      { pick: left, u: seam - left.half[0], side },
      { pick: right, u: seam + right.half[0], side },
    ];
  });
  for (const { pick, u, side } of rows) {
    const v = side * (45 - pick.half[1] - 0.5),
      turnBy = side > 0 ? 0 : Math.PI,
      yaw = placer.site.yaw + turnBy,
      at = inCell(placer, cell, [u, v], y);
    const item = placer.place(
      pick.prop.id,
      at,
      yaw,
      'solid',
      RANK.structure,
      footprint(placer, cell, [u, v], pick.half, turnBy),
      {
        support: y - FOUNDATION,
      },
    );
    if (!item) continue;
    if (hash01(seed + 3, cell.i, cell.j, u * side) < 0.5)
      placer.place(
        'city/water-tank',
        onProp(at, yaw, [-pick.half[0] * 0.5, 0], pick.roof),
        yaw,
        'solid',
        RANK.furniture,
      );
    const draw = hash01(seed + 4, cell.i, cell.j, u * side);
    if (draw < 0.6) neon(placer, at, yaw, pick.half[1] - 0.3, draw, seed);
  }
  for (const u of [-12, 12])
    placer.place(
      'tree-birch-large',
      inCell(placer, cell, [u, 0], y),
      u,
      'solid',
      RANK.garden,
      footprint(placer, cell, [u, 0], [1.5, 1.5]),
      { support: cell.base - FOUNDATION },
    );
}

/** Sixteen garden lots: ten on long frontages and six small homes on the side streets. */
export function house(
  placer: Placer,
  cell: Cell,
  catalog: CityCatalog,
  lot: number,
  seed: number,
  decorate = false,
) {
  const frontage = lot < 10,
    col = frontage ? lot % 5 : (lot - 10) % 3,
    side = frontage ? (lot < 5 ? 1 : -1) : lot < 13 ? 1 : -1,
    choices = catalog.house.filter((h) => h.half[0] * 2 <= (frontage ? 17 : 11.5)),
    pick = choices[Math.floor(hash01(seed, cell.i * 16 + lot, cell.j) * choices.length)],
    turnBy = frontage ? (side > 0 ? 0 : Math.PI) : (side * Math.PI) / 2,
    along = frontage ? -36 + col * 18 : -18 + col * 18,
    edge = side * (37 - pick.half[1]),
    [u, v] = frontage ? [along, edge] : [edge, along],
    y = cell.base + KERB,
    support = cell.base - FOUNDATION;
  if (!decorate) {
    placer.place(
      pick.prop.id,
      inCell(placer, cell, [u, v], y),
      placer.site.yaw + turnBy,
      'solid',
      RANK.structure,
      footprint(placer, cell, [u, v], pick.half, turnBy),
      { support: y - FOUNDATION },
    );
    return;
  }
  const fence = (uv: Xz, across: boolean) =>
    placer.place(
      'city/garden-fence',
      inCell(placer, cell, uv, y),
      placer.site.yaw + (across ? Math.PI / 2 : 0),
      'solid',
      RANK.garden,
      footprint(placer, cell, uv, [11.25, 0.15], across ? Math.PI / 2 : 0),
      { support },
    );
  if (frontage && col === 0) fence([0, side * 15], false);
  const tree = ['tree-oak-small', 'tree-birch-small', 'bush-round'][
      Math.floor(hash01(seed + 5, cell.i * 8 + lot, cell.j) * 3)
    ],
    at: Xz = frontage ? [u, side * 18] : [side * 18, v];
  placer.place(
    tree,
    inCell(placer, cell, at, y),
    lot,
    'solid',
    RANK.garden,
    footprint(placer, cell, at, [1.2, 1.2]),
    { support },
  );
}
