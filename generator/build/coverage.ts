/** Conservative proximity census using actual projected mesh vertices, never instance bounds. */
import type { Instance, PropMesh, Road } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { WORLD } from '../plan/contract.ts';
import { SegmentIndex } from '../plan/segments.ts';
import { onOperationalAirfield } from '../plan/airfields.ts';
import { lakeDistance } from '../plan/lake-shore.ts';

const CELL = 20;
const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

/** A retained point is always an actual vertex: thinning can only understate coverage. */
function witnesses(mesh: PropMesh) {
  const cells = new Map<string, readonly [number, number]>();
  for (const part of mesh.parts)
    for (let i = 0; i < part.positions.length; i += 3) {
      const x = part.positions[i],
        z = part.positions[i + 2],
        cell = `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
      if (!cells.has(cell)) cells.set(cell, [x, z]);
    }
  return [...cells.values()];
}

export function landCoverage(
  plan: TerrainPlan,
  instances: readonly Instance[],
  meshes: readonly PropMesh[],
  localRoads: readonly Road[] = [],
  sample = 20,
  observe?: (cell: { x: number; z: number; distanceM: number; owner: string }) => void,
) {
  const geometry = new Map(meshes.map((mesh) => [mesh.id, witnesses(mesh)])),
    points = new Map<string, [number, number][]>(),
    roads = new SegmentIndex(),
    water = new SegmentIndex();
  for (const road of [...plan.roads, ...localRoads])
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i];
      roads.add(a[0], a[2], b[0], b[2], road.width / 2 + 8);
    }
  for (const river of plan.rivers)
    for (let i = 1; i < river.points.length; i++) {
      const a = river.points[i - 1],
        b = river.points[i];
      water.add(a[0], a[2], b[0], b[2], Math.max(river.widths[i - 1], river.widths[i]) / 2);
    }
  for (const instance of instances) {
    const scale = instance.scale ?? 1,
      sx = typeof scale === 'number' ? scale : scale[0],
      sz = typeof scale === 'number' ? scale : scale[2],
      yaw = instance.yaw ?? 0,
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    for (const [vx, vz] of geometry.get(instance.prop) ?? []) {
      const x = instance.position[0] + vx * sx * c + vz * sz * s,
        z = instance.position[2] - vx * sx * s + vz * sz * c,
        id = key(x, z),
        found = points.get(id) ?? [];
      found.push([x, z]);
      points.set(id, found);
    }
  }
  const distances: number[] = [],
    exceptions = { water: 0, airfield: 0, road: 0, cliff: 0 },
    regions: Record<string, { cells: number; within10m: number }> = {};
  for (let x = -WORLD.size / 2 + sample / 2; x < WORLD.size / 2; x += sample)
    for (let z = -WORLD.size / 2 + sample / 2; z < WORLD.size / 2; z += sample) {
      const h = plan.height(x, z);
      if (
        h < 1 ||
        water.near(x, z).length ||
        plan.lakes.some((lake) => lakeDistance(lake, x, z) < lake.radius)
      ) {
        exceptions.water++;
        continue;
      }
      if (onOperationalAirfield(plan.airfields, x, z)) {
        exceptions.airfield++;
        continue;
      }
      if (roads.near(x, z).length) {
        exceptions.road++;
        continue;
      }
      const slope =
        Math.hypot(
          plan.height(x + 5, z) - plan.height(x - 5, z),
          plan.height(x, z + 5) - plan.height(x, z - 5),
        ) / 10;
      if (slope > 0.7) {
        exceptions.cliff++;
        continue;
      }
      let nearest = 30;
      const cx = Math.floor(x / CELL),
        cz = Math.floor(z / CELL);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (const [px, pz] of points.get(`${cx + dx},${cz + dz}`) ?? [])
            nearest = Math.min(nearest, Math.hypot(px - x, pz - z));
      distances.push(nearest);
      const owner = plan.biome(x, z).owner,
        row = regions[owner] ?? { cells: 0, within10m: 0 };
      observe?.({ x, z, distanceM: nearest, owner });
      row.cells++;
      if (nearest <= 10) row.within10m++;
      regions[owner] = row;
    }
  distances.sort((a, b) => a - b);
  return {
    sampleM: sample,
    witnessDefinition:
      'actual mesh vertices projected horizontally; 4m local thinning yields conservative coverage',
    distanceCensorM: 30,
    eligibleCells: distances.length,
    exceptions,
    regions,
    within10mFraction: distances.filter((d) => d <= 10).length / Math.max(1, distances.length),
    beyond30mFraction: distances.filter((d) => d === 30).length / Math.max(1, distances.length),
    quantilesM: {
      p50: distances[Math.floor(distances.length * 0.5)],
      p90: distances[Math.floor(distances.length * 0.9)],
      p95: distances[Math.floor(distances.length * 0.95)],
    },
  };
}
