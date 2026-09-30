/** Small offices share selected center blocks around a pedestrian/service plaza. */
import type { CityCatalog } from './catalog.ts';
import { footprint, inCell, type Cell } from './grid.ts';
import { KERB } from './ground-props.ts';
import { RANK, type Placer } from './placement.ts';
import { FOUNDATION } from './tower-kit.ts';

export function towerPair(placer: Placer, cell: Cell, catalog: CityCatalog) {
  const pick = catalog.tower.find((t) => t.prop.id === 'city/tower-office-85')!;
  const y = cell.base + KERB;
  for (const u of [-23, 23])
    placer.place(
      pick.prop.id,
      inCell(placer, cell, [u, 0], y),
      placer.site.yaw,
      'solid',
      RANK.structure,
      footprint(placer, cell, [u, 0], pick.half),
      { support: y - FOUNDATION },
    );
  for (const v of [-35, 35])
    placer.place(
      'bench',
      inCell(placer, cell, [0, v], y),
      placer.site.yaw,
      'solid',
      RANK.furniture,
      footprint(placer, cell, [0, v], [1, 1]),
      { support: cell.base - FOUNDATION },
    );
}
