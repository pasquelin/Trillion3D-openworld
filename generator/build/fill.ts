import { propFootprints, occupiedCells } from './infill-occupancy.ts';
/** Budgeted understory infill on an 18 m lattice; measured coverage is reported separately. */
import { WORLD, type Instance, type PropMesh, type RegionName } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { hash01, standExtent } from '../props/index.ts';
import { onOperationalAirfield } from '../plan/airfields.ts';
import { dryFootprint } from '../plan/dry.ts';
import { SegmentIndex } from '../plan/segments.ts';
import type { Road } from '../plan/contract.ts';
import { CITY_CORES } from '../plan/geography.ts';
import { lakeDistance } from '../plan/lake-shore.ts';

/** Side of a checked cell, metres, and the props one empty cell receives. */
const FILL_CELL = 18;
const PER_CELL = 1;
/** A region's prop counts as scattered when it places at least this many copies of it. */
const SCATTERED = 24;
/** Clearance kept from a road's edge, metres. */
const VERGE = 8;

const SIDE = Math.ceil(WORLD.size / FILL_CELL),
  HALF = WORLD.size / 2;

/** Whether a cell is ground a prop may stand on: dry, off roads, lakes and the platform. */
function open(
  plan: TerrainPlan,
  roads: SegmentIndex,
  clearance: readonly number[],
  x: number,
  z: number,
) {
  if (Math.abs(x) >= HALF || Math.abs(z) >= HALF) return false;
  if (onOperationalAirfield(plan.airfields, x, z)) return false;
  if (plan.natural(x, z) < 1 || plan.height(x, z) < 1) return false;
  if (plan.lakes.some((l) => lakeDistance(l, x, z) < l.radius + FILL_CELL)) return false;
  return !roads.near(x, z).some((hit) => hit.distance < clearance[hit.segment]);
}

/**
 * Additional instances for unoccupied land cells, constrained by each region’s remaining nodes,
 * from each region's `placed` instances (in `names` order).
 */
export function fillEmptyLand(
  plan: TerrainPlan,
  names: readonly RegionName[],
  placed: readonly (readonly Instance[])[],
  meshes: readonly PropMesh[],
  solid: (prop: string) => boolean,
  localRoads: readonly Road[] = [],
  reservedNodes: readonly number[] = placed.map((p) => p.length),
) {
  const footprints = propFootprints(meshes),
    used = occupiedCells(placed.flat(), footprints, WORLD.size, FILL_CELL),
    pools = new Map<string, string[]>(),
    remaining = new Map(
      names.map((name, i) => [
        name,
        Math.max(0, plan.regions[name].budget.nodes - reservedNodes[i]),
      ]),
    ),
    roads = new SegmentIndex(),
    clearance: number[] = [];
  for (const road of [...plan.roads, ...localRoads])
    for (let n = 1; n < road.points.length; n++) {
      const a = road.points[n - 1],
        b = road.points[n];
      roads.add(a[0], a[2], b[0], b[2], 300);
      clearance.push(road.width / 2 + VERGE);
    }
  for (const river of plan.rivers)
    for (let n = 1; n < river.points.length; n++) {
      const a = river.points[n - 1],
        b = river.points[n],
        width = Math.max(river.widths[n - 1], river.widths[n]) / 2 + VERGE;
      roads.add(a[0], a[2], b[0], b[2], width);
      clearance.push(width);
    }
  names.forEach((name, index) => {
    const counts = new Map<string, number>();
    for (const { prop } of placed[index]) counts.set(prop, (counts.get(prop) ?? 0) + 1);
    pools.set(
      name,
      [...counts]
        .filter(
          ([prop, n]) =>
            n >= SCATTERED &&
            /^(tree-|bush-|grass|cactus|rock|desert\/(cactus|prickly|agave|barrel|dry-shrub|tumbleweed))/.test(
              prop,
            ) &&
            !solid(prop) &&
            !standExtent(prop),
        )
        .flatMap(([prop, n]) => Array(n).fill(prop)),
    );
  });
  const seed = plan.subSeed('fill'),
    out: Instance[] = [],
    candidates: { i: number; k: number; x: number; z: number; priority: number }[] = [];
  let [land, empty] = [0, 0];
  for (let k = 0; k < SIDE; k++)
    for (let i = 0; i < SIDE; i++) {
      const x = -HALF + (i + 0.5) * FILL_CELL,
        z = -HALF + (k + 0.5) * FILL_CELL;
      if (!open(plan, roads, clearance, x, z)) continue;
      land++;
      if (used[k * SIDE + i]) continue;
      empty++;
      const nearSettlement = CITY_CORES.some(
          (core) => Math.hypot(x - core.x, z - core.z) < core.radius + 500,
        ),
        explored = nearSettlement || roads.near(x, z).length > 0;
      candidates.push({ i, k, x, z, priority: (explored ? 0 : 1) + hash01(seed, i, k, 17) * 0.5 });
    }
  candidates.sort((a, b) => a.priority - b.priority || a.k - b.k || a.i - b.i);
  for (const { i, k, x, z } of candidates) {
    const owner = plan.biome(x, z).owner,
      pool = pools.get(owner === 'airport' ? 'countryside' : owner);
    if (owner === 'sea' || !(remaining.get(owner) ?? 0)) continue;
    if (!pool?.length) continue;
    for (let n = 0; n < PER_CELL; n++) {
      const px = x + (hash01(seed, i, k, n * 4) - 0.5) * 12,
        pz = z + (hash01(seed, i, k, n * 4 + 1) - 0.5) * 12;
      const prop = pool[Math.floor(hash01(seed, i, k, n * 4 + 2) * pool.length)],
        radius = footprints.get(prop)?.radius ?? 0,
        yaw = hash01(seed, i, k, n * 4 + 3) * Math.PI * 2,
        extent = standExtent(prop);
      if (
        !open(plan, roads, clearance, px, pz) ||
        !dryFootprint(plan.height, px, pz, radius, radius)
      )
        continue;
      if (extent && !dryFootprint(plan.height, px, pz, extent[2], extent[3], yaw)) continue;
      if (plan.biome(px, pz).owner !== owner) continue;
      remaining.set(owner, remaining.get(owner)! - 1);
      out.push({
        name: `fill/${owner}/${i}/${k}`,
        prop,
        position: [px, plan.height(px, pz), pz],
        yaw,
      });
    }
  }
  return { instances: out, land, empty, remaining: Object.fromEntries(remaining) };
}
