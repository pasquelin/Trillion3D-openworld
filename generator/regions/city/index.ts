/**
 * Road-facing neighborhoods on the city's dry coastal plain: Garden Reach's sixteen-lot
 * residential blocks, Market Ward's apartment courtyards, and Bay Center's podium towers and
 * service plazas. Existing detailed shared catalogues, street furniture, civic parks, stadium,
 * bridges and harbor remain. Bounds, water, foundation depth, occupied footprints, road access
 * and the region node budget constrain placement. The report counts buildings explicitly.
 */
import type { RegionModule, WorldPlan } from '../../plan/contract.ts';
import { surface, SURFACES } from '../../props/index.ts';
import { layBridges } from './bridges.ts';
import { cityCatalog } from './catalog.ts';
import { fillCells } from './districts.ts';
import { facing, turn } from './frame.ts';
import { layCells } from './grid.ts';
import { layHarbour } from './harbour.ts';
import { Placer } from './placement.ts';
import { readSite } from './site.ts';
import { layStreets } from './streets.ts';
import { CITY } from './surfaces.ts';
import { EYE } from '../../build/markers.ts';
import { cityReport } from './report.ts';
import { segments } from './segments.ts';
import { segmentId, streetAccessGraph } from './access-graph.ts';

/**
 * Share of the global relief the city keeps above the sea: a coastal plain, so 100 m blocks sit
 * on plinths. The coastline (height 0) does not move. A design value, not a measured one.
 */
const RELIEF = 0.15;

/** Everything the city builds from the plan, with what the tests check besides the output. */
export function buildCity(plan: WorldPlan) {
  const { budget } = plan.regions.city,
    site = readSite(plan),
    catalog = cityCatalog(plan.subSeed('city/props'), site),
    placer = new Placer(site, catalog.buildings);
  const harbour = layHarbour(placer, plan.subSeed('city/harbour'));
  layBridges(placer);
  const cellRejections: Record<string, number> = {};
  const cells = layCells(site, plan.subSeed('city/grid'), cellRejections);
  for (const [key, cell] of cells)
    if (placer.occupied(cell.box)) {
      cells.delete(key);
      cellRejections.occupied = (cellRejections.occupied ?? 0) + 1;
    }
  const fronts = segments(placer, cells),
    network = streetAccessGraph(site, fronts);
  const reachable = new Set(
    fronts
      .filter((s) => network.roadComponents.get(segmentId(s))?.has(network.main!))
      .flatMap((s) => s.sides.filter((c): c is NonNullable<typeof c> => !!c)),
  );
  for (const [id, cell] of cells)
    if (!reachable.has(cell)) {
      cells.delete(id);
      cellRejections.disconnected = (cellRejections.disconnected ?? 0) + 1;
    }
  const street = layStreets(placer, cells),
    deck = fillCells(placer, cells, catalog, plan.subSeed('city/blocks')),
    towardSea = facing(harbour ? harbour.out : turn([1, 0], site.yaw));
  if (deck)
    placer.markers.push({
      kind: 'teleport',
      name: 'city/rooftop',
      position: [deck[0], deck[1] + EYE, deck[2]],
      deck: true,
      yaw: towardSea,
      pitch: -0.25,
    });
  if (street.point)
    placer.markers.push({
      kind: 'teleport',
      name: 'city/downtown',
      position: [street.point[0], street.point[1] + EYE, street.point[2]],
      yaw: facing(turn([1, 0], site.yaw)),
    });
  const { output, kept } = placer.finish(budget),
    retained = new Set(kept);
  const rejected = [
    ...placer.rejected,
    ...placer.items
      .filter((i) => i.building && !retained.has(i))
      .map((i) => ({ prop: i.instance.prop, reason: 'budget' })),
  ];
  return {
    output: { ...output, props: catalog.props },
    kept,
    site,
    cells,
    report: {
      ...cityReport(site, cells, kept, catalog, rejected, street.segments),
      cellRejections,
    },
  };
}

export const cityRegion: RegionModule = {
  name: 'city',
  refine: (_x, _z, base) => (base > 0 ? -base * (1 - RELIEF) : 0),
  ground: [
    { surface: surface('city/beach-sand', [0.62, 0.55, 0.4], 0, 0.95), maxHeight: 2.5 },
    { surface: CITY.lawn, maxSlope: 0.35 },
    { surface: SURFACES.rock },
  ],
  generate: (plan) => buildCity(plan).output,
};
