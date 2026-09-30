import type { placeWorld } from '../build/world.ts';
import { islandBuildings } from '../assets/island.ts';
import { overlaps, segmentBox, xz } from '../regions/city/frame.ts';
import type { Traversal } from './types.ts';
import { withBuildingColliders } from '../assets/colliders.ts';
import { markerSite } from '../build/markers.ts';

/** The same supplemental source placement used by the cook; no substitute building geometry. */
export async function civicRouteObservations(
  world: ReturnType<typeof placeWorld>,
  manifest: Traversal,
) {
  const roads = [...world.plan.roads, ...world.placed.flatMap((output) => output.roads)],
    civic = islandBuildings(world.plan, world.meshes, world.instances, roads),
    walk = manifest.routes.find((route) => route.id === 'W1'),
    failures: string[] = [];
  const buildings = civic.buildings.map((building) => {
    const clear =
      Boolean(walk) &&
      !walk!.samples.some((sample, i) => {
        if (!i) return false;
        const a = walk!.samples[i - 1].position,
          b = sample.position;
        if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.001) return false;
        return overlaps(segmentBox(xz(a), xz(b), 0.6), building.footprint);
      });
    if (!clear)
      failures.push(`W1: supplemental civic footprint ${building.asset} obstructs the walk`);
    return { ...building, walkClear: clear };
  });
  const solids = await withBuildingColliders(world.solids, civic.foundations, civic.instances),
    standing = markerSite({ ...world, solids });
  for (const sample of walk?.samples ?? []) {
    const problem = standing.problem({ kind: 'teleport', name: 'W1', ...sample, deck: true });
    if (problem) failures.push(`${problem}; seconds ${sample.seconds}`);
  }
  return {
    solids,
    failures,
    observations: {
      sourceObjects: world.instances.length + civic.instances.length,
      sourceRoads: roads.length,
      supplementalCivicBuildings: buildings,
      supplementalFoundationMeshes: civic.foundations.length,
      supplementalColliderInstances: solids.placed.length - world.solids.placed.length,
      supplementalColliderTriangles: [...solids.shapes]
        .filter(([id]) => !world.solids.shapes.has(id))
        .reduce((sum, [, mesh]) => sum + mesh.indices.length / 3, 0),
      walkBodyProbeSamples: walk?.samples.length ?? 0,
    },
  };
}
