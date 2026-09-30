/** Cook-time observations only: district catchments include their streets and open garden lots. */
import type { CityCatalog } from './catalog.ts';
import { turn } from './frame.ts';
import type { Cell, District } from './grid.ts';
import type { Item } from './placement.ts';
import { dry, type Site } from './site.ts';
import type { Segment } from './segments.ts';
import { NEIGHBORHOODS } from './zones.ts';
import { districtAccess } from './access.ts';
import { streetAccessGraph } from './access-graph.ts';

const TARGETS = {
  suburb: { areaKm2: 4, density: [900, 1400], height: [5, 15], coverage: [0.12, 0.2] },
  midrise: { areaKm2: 2.5, density: [200, 320], height: [15, 50], coverage: [0.08, 0.16] },
  downtown: { areaKm2: 0.8, density: [70, 110], height: [80, 220], coverage: [0.1, 0.18] },
  park: { areaKm2: 0.7 },
} as const;

export function cityReport(
  site: Site,
  cells: Map<string, Cell>,
  kept: Item[],
  catalog: CityCatalog,
  rejected: readonly { prop: string; reason: string }[],
  segments: Segment[],
) {
  const network = streetAccessGraph(site, segments);
  const groups: District[] = ['suburb', 'midrise', 'downtown', 'park'];
  const rows = groups.map((district) => {
    const blocks = [...cells.values()].filter((c) =>
      district === 'park'
        ? c.district === 'park' || c.district === 'stadium'
        : c.district === district,
    );
    const kind = NEIGHBORHOODS[district].buildingClass;
    const buildings = kept.filter((i) => i.building?.class === kind && i.box);
    const area = blocks.length * site.pitch ** 2;
    // 25 m midpoint quadrature, clipped per catchment; no street/open-lot subtraction.
    const n = Math.ceil(site.pitch / 25),
      step = site.pitch / n;
    let usable = 0;
    for (const block of blocks)
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const u = (i + 0.5) * step - site.pitch / 2;
          const v = (j + 0.5) * step - site.pitch / 2;
          const {
              centre: [x, z],
              yaw,
            } = block.box,
            [dx, dz] = turn([u, v], yaw);
          if (dry(site, [x + dx, z + dz])) usable += step ** 2;
        }
    // Exact footprint union: occupancy rejects overlapping building OBBs, so sum = union.
    const footprint = buildings.reduce((sum, i) => sum + 4 * i.box!.half[0] * i.box!.half[1], 0);
    const heights = buildings.map((i) => i.building!.height);
    const rejections: Record<string, number> = {};
    for (const r of rejected)
      if (catalog.buildings.get(r.prop)?.class === kind)
        rejections[r.reason] = (rejections[r.reason] ?? 0) + 1;
    const target = TARGETS[district as keyof typeof TARGETS];
    return {
      id: district,
      name: NEIGHBORHOODS[district].name,
      targets: target,
      blocks: blocks.length,
      areaKm2: area / 1e6,
      usableDryKm2: usable / 1e6,
      areaErrorKm2: area / 1e6 - target.areaKm2,
      areaRelativeError: area / 1e6 / target.areaKm2 - 1,
      buildingCount: buildings.length,
      uniqueBuildingMeshes: new Set(buildings.map((i) => i.instance.prop)).size,
      densityPerKm2: area ? buildings.length / (area / 1e6) : 0,
      footprintUnionM2: footprint,
      coverage: usable ? footprint / usable : 0,
      meanFootprintM2: buildings.length ? footprint / buildings.length : 0,
      heightRangeM: heights.length ? [Math.min(...heights), Math.max(...heights)] : [],
      rejections,
      ...districtAccess(site, blocks, segments, kept, network),
    };
  });
  let dryLand = 0;
  for (let x = site.bounds.minX + 12.5; x < site.bounds.maxX; x += 25)
    for (let z = site.bounds.minZ + 12.5; z < site.bounds.maxZ; z += 25)
      if (dry(site, [x, z])) dryLand += 625;
  return {
    regionDryLandKm2: dryLand / 1e6,
    seed: site.plan.seed,
    areaSamplingM: 25,
    areaDefinition: 'disjoint block catchments including half adjacent streets and open lots',
    coverageDefinition: 'union of conservative building OBB footprints / usable dry catchment area',
    districts: rows,
    buildings: kept
      .filter((i) => i.building)
      .map((i) => ({
        name: i.instance.name,
        prop: i.instance.prop,
        position: i.instance.position,
        yaw: i.instance.yaw,
        ...i.building,
        footprint: i.box,
      })),
  };
}
