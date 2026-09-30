/** Repeatable street blocks, separate from the island: every quality setting stays identical. */
import type { Bounds, Instance, Vec3 } from '../plan/contract.ts';
import { BUILDING_ASSETS } from '../assets/source.ts';
import { plane, box } from '../props/shapes.ts';
import { SURFACES as S } from '../props/surfaces.ts';
import { prop } from '../props/transform.ts';
import { detailedBuilding } from './block.ts';

export const WORKLOADS = { 'one-block': 1, 'four-blocks': 4, 'sixteen-blocks': 16 } as const;
export type WorkloadName = keyof typeof WORKLOADS;
type BuildingPlacement = {
  instance: Instance;
  class: 'mid' | 'low';
  height: number;
  footprint: Bounds;
  source: 'original' | 'CC0';
  collision: 'cooked-static-mesh';
};

export function buildWorkload(name: WorkloadName) {
  const count = WORKLOADS[name];
  if (!Object.hasOwn(WORKLOADS, name)) throw new Error(`Unknown workload ${name}`);
  const side = Math.sqrt(count),
    detailed = detailedBuilding(),
    instances: Instance[] = [],
    buildings: BuildingPlacement[] = [],
    roads: Bounds[] = [];
  const pavement = prop('workload/pavement', [box(S.concrete, [104, 0.2, 104])]),
    street = prop('workload/street', [plane(S.asphalt, 128, 128)]);
  for (let row = 0; row < side; row++)
    for (let col = 0; col < side; col++) {
      const x = (col - (side - 1) / 2) * 128,
        z = (row - (side - 1) / 2) * 128;
      instances.push(
        { prop: street.id, position: [x, 0, z], yaw: 0 },
        { prop: pavement.id, position: [x, 0, z], yaw: 0 },
      );
      roads.push(
        { minX: x - 64, maxX: x + 64, minZ: z + 52, maxZ: z + 64 },
        { minX: x - 64, maxX: x + 64, minZ: z - 64, maxZ: z - 52 },
        { minX: x - 64, maxX: x - 52, minZ: z - 52, maxZ: z + 52 },
        { minX: x + 52, maxX: x + 64, minZ: z - 52, maxZ: z + 52 },
      );
      const place = (
        id: string,
        offset: Vec3,
        min: readonly number[],
        max: readonly number[],
        scale: number,
        source: 'original' | 'CC0',
      ) => {
        const instance: Instance = {
          prop: id,
          position: [x + offset[0], 0.2, z + offset[2]],
          yaw: 0,
          name: `${name}/${row}-${col}/${id}/${offset[0]}-${offset[2]}`,
        };
        instances.push(instance);
        buildings.push({
          instance,
          class:
            source === 'original'
              ? 'mid'
              : (BUILDING_ASSETS.find((a) => a.id === id)!.buildingClass as 'low' | 'mid'),
          height: (max[1] - min[1]) * scale,
          source,
          collision: 'cooked-static-mesh',
          footprint: {
            minX: instance.position[0] + min[0] * scale,
            maxX: instance.position[0] + max[0] * scale,
            minZ: instance.position[2] + min[2] * scale,
            maxZ: instance.position[2] + max[2] * scale,
          },
        });
      };
      // Bounds include projecting balconies, not only the main building shell.
      for (const dx of [-28, 28])
        for (const dz of [-28, 28])
          place(
            detailed.id,
            [dx, 0, dz],
            [-10.69, 0, -10.69],
            [10.69, 27.25, 10.69],
            1,
            'original',
          );
      BUILDING_ASSETS.forEach((a, i) =>
        place(a.id, [i ? 28 : -28, 0, 0], a.bounds.min, a.bounds.max, a.metresPerSourceUnit, 'CC0'),
      );
    }
  const meshes = [street, pavement, detailed],
    triangles = new Map(
      meshes.map((m) => [m.id, m.parts.reduce((n, p) => n + p.indices.length / 3, 0)]),
    );
  for (const a of BUILDING_ASSETS) triangles.set(a.id, a.indexedTriangles);
  const originalMaterials = new Set(meshes.flatMap((m) => m.parts.map((p) => p.surface.name))).size;
  return {
    meshes,
    instances,
    buildings,
    roads,
    report: {
      name,
      blocks: count,
      buildingInstances: buildings.length,
      totalInstances: instances.length,
      uniqueSourceTriangles: [...triangles.values()].reduce((a, b) => a + b, 0),
      instanceExpandedTriangles: instances.reduce((n, i) => n + triangles.get(i.prop)!, 0),
      uniqueMaterials: originalMaterials + BUILDING_ASSETS.reduce((n, a) => n + a.materials, 0),
      renderedTriangles: null,
      selectedTriangles: null,
      units: 'metres',
      cacheEnvelopeBytes: 800 * 1024 * 1024,
      geometryPoolBytes: 512 * 1024 * 1024,
      texturePoolBytes: 256 * 1024 * 1024,
      lighting: {
        sun: {
          color: [1, 0.95, 0.88],
          intensity: 3,
          position: [-50, 100, 50],
          target: [0, 0, 0],
          castShadow: true,
        },
        fill: { color: [0.55, 0.7, 1], groundColor: [0.22, 0.18, 0.13], intensity: 0.8 },
        background: [0.16, 0.23, 0.31],
      },
      cameras: {
        facade: {
          position: [-(side - 1) * 64 - 28, 1.7, -(side - 1) * 64 - 11],
          target: [-(side - 1) * 64 - 28, 10, -(side - 1) * 64 - 28],
        },
        skyline: { position: [side * 95, 85, side * 95], target: [0, 12, 0] },
      },
    },
  };
}
