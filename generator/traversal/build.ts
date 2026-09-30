import type { Marker, Road } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { drivingRoutes, flightRoute, vistas } from './routes.ts';
import type { ReplayRoute, Traversal } from './types.ts';

export function buildTraversal(
  plan: TerrainPlan,
  roads: readonly Road[],
  markers: readonly Marker[],
  walk: ReplayRoute[] = [],
): Traversal {
  const drive = drivingRoutes(plan, roads),
    view = vistas(markers),
    flight = flightRoute(plan, markers);
  return {
    version: 1,
    seed: plan.seed,
    contentHash: '',
    enginePin: '',
    settings: {
      width: 1280,
      height: 720,
      geometryBytes: 512 * 2 ** 20,
      textureBytes: 256 * 2 ** 20,
      traffic: 40,
      pedestrians: 60,
      time: 12,
    },
    routes: [...walk, ...drive.routes, ...view.routes, ...flight.routes],
    failures: [...drive.failures, ...view.failures, ...flight.failures],
    envelope: { halfSize: 4000, maxAltitude: 3200, seaLevel: 0 },
  };
}
