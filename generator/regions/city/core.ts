/** One detailed road-facing city core, using the shared catalogue and a fixed node share. */
import type { Budget, Settlement, WorldPlan } from '../../plan/contract.ts';
import { layBridges } from './bridges.ts';
import { cityCatalog, type CityCatalog } from './catalog.ts';
import { fillCells } from './districts.ts';
import { facing, turn } from './frame.ts';
import { layCells } from './grid.ts';
import { layHarbour } from './harbour.ts';
import { Placer } from './placement.ts';
import { readSite } from './site.ts';
import { layStreets } from './streets.ts';
import { EYE } from '../../build/markers.ts';
import { cityReport } from './report.ts';
import { segments } from './segments.ts';
import { segmentId, streetAccessGraph } from './access-graph.ts';

/** Everything the city builds from the plan, with what the tests check besides the output. */
export type CityOptions = { settlement?: Settlement; budget?: Budget; catalog?: CityCatalog };

export function buildCity(plan: WorldPlan, options: CityOptions = {}) {
  const budget = options.budget ?? plan.regions.city.budget,
    site = readSite(plan, options.settlement),
    primary = site.city.id === 'city',
    catalog = options.catalog ?? cityCatalog(plan.subSeed('city/props'), site),
    placer = new Placer(site, catalog.buildings);
  const harbour = primary ? layHarbour(placer, plan.subSeed('city/harbour')) : undefined;
  if (primary) layBridges(placer);
  const cellRejections: Record<string, number> = {};
  const cells = layCells(site, plan.subSeed(`${site.city.id}/grid`), cellRejections, primary);
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
    deck = fillCells(placer, cells, catalog, plan.subSeed(`${site.city.id}/blocks`), primary),
    towardSea = facing(harbour ? harbour.out : turn([1, 0], site.yaw));
  if (deck)
    placer.markers.push({
      kind: 'teleport',
      name: `${site.city.id}/rooftop`,
      position: [deck[0], deck[1] + EYE, deck[2]],
      deck: true,
      yaw: towardSea,
      pitch: -0.25,
    });
  if (street.point)
    placer.markers.push({
      kind: 'teleport',
      name: `${site.city.id}/downtown`,
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
