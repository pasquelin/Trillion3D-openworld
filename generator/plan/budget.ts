/** Authored content and terrain-detail settings for the full-world stress workload. */
import { COOK_COST, type Budget, type RegionName } from './contract.ts';

/**
 * Placed-node and unique-prop complexity allowances for each region. These describe the current
 * authored workload and are never scaled down to fit a cooked-disk size. Raise them with new
 * content; report the resulting source and native cache measurements separately.
 */
const DEMAND: Record<RegionName, Budget> = {
  countryside: { nodes: 90_000, triangles: 400_000 },
  city: { nodes: 80_000, triangles: 400_000 },
  mountains: { nodes: 50_000, triangles: 400_000 },
  coast: { nodes: 40_000, triangles: 400_000 },
  desert: { nodes: 25_000, triangles: 400_000 },
  airport: { nodes: 15_000, triangles: 400_000 },
};

/** Each region receives its authored allowance without any cache-size downscale. */
export function regionBudgets(): Record<RegionName, Budget> {
  return Object.fromEntries(
    Object.entries(DEMAND).map(([name, budget]) => [name, { ...budget }]),
  ) as Record<RegionName, Budget>;
}

/**
 * Terrain quality weight for balancing relief triangles and baked ground texels. This preserves
 * the established terrain detail of seed 332; it is independent of native cache size and may be
 * raised for a more demanding workload. It is not a pass/fail disk or runtime memory budget.
 */
export const TERRAIN_DETAIL_WEIGHT = 512_795_040;

/**
 * Source triangle density used to sample forest stand roots consistently with terrain detail.
 * The build publishes the actual triangle count separately.
 */
export const TERRAIN_TRIANGLES = Math.floor(TERRAIN_DETAIL_WEIGHT / COOK_COST.bytesPerTriangle);

/** Historical relative cost of one square ground texture for the terrain quality split. */
export function textureBytes(size: number): number {
  return Math.ceil(size * size * COOK_COST.bytesPerTexel);
}
