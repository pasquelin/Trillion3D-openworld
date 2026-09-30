/** Five original urban centres reuse one catalogue and split the existing region node budget. */
import type { RegionOutput, WorldPlan } from '../../plan/contract.ts';
import { CITY_CORES } from '../../plan/geography.ts';
import { cityCatalog } from './catalog.ts';
import { buildCity } from './core.ts';
import { readSite } from './site.ts';

/** Primary identifiers remain stable; every other core carries its own public identifiers. */
function qualify(output: RegionOutput, core: string): RegionOutput {
  if (core === 'city') return output;
  const name = (id: string) => (id.startsWith('city/') ? `${core}/${id.slice(5)}` : id);
  return {
    ...output,
    roads: output.roads.map((r) => ({ ...r, id: name(r.id) })),
    markers: output.markers.map((m) => ({ ...m, name: name(m.name) })),
    movers: output.movers.map((m) => ({ ...m, name: name(m.name) })),
    lights: output.lights.map((l) => ({ ...l, name: name(l.name) })),
  };
}

export function buildUrbanCentres(plan: WorldPlan) {
  const shared = cityCatalog(plan.subSeed('city/props'), readSite(plan)),
    budget = plan.regions.city.budget,
    settlements = CITY_CORES.map((core) => plan.settlements.find((s) => s.id === core.id)).filter(
      (s): s is NonNullable<typeof s> => !!s,
    ),
    primaryNodes = settlements.length > 1 ? Math.floor(budget.nodes / 2) : budget.nodes,
    otherNodes = Math.floor((budget.nodes - primaryNodes) / Math.max(1, settlements.length - 1)),
    centres = settlements.map((settlement) => ({
      id: settlement.id,
      ...buildCity(plan, {
        settlement,
        catalog: shared,
        budget: { ...budget, nodes: settlement.id === 'city' ? primaryNodes : otherNodes },
      }),
    })),
    outputs = centres.map((c) => qualify(c.output, c.id));
  const output: RegionOutput = {
    props: shared.props,
    instances: outputs.flatMap((o) => o.instances),
    lights: outputs.flatMap((o) => o.lights),
    markers: outputs.flatMap((o) => o.markers),
    movers: outputs.flatMap((o) => o.movers),
    roads: outputs.flatMap((o) => o.roads),
  };
  return { output, centres };
}
