import type { Marker, Road } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import { drivingRoutes, flightRoute } from './routes.ts';
import { vistas } from './views.ts';
import { summitAccess } from './summit.ts';
import { walkingRoutes } from './walk.ts';
import type { buildCity } from '../regions/city/index.ts';
import type { Traversal } from './types.ts';

export function buildTraversal(
  plan: TerrainPlan,
  roads: readonly Road[],
  markers: readonly Marker[],
  city?: ReturnType<typeof buildCity>,
): Traversal {
  const walk = city ? walkingRoutes(city) : { routes: [], failures: ['W1: no city metadata'] };
  const drive = drivingRoutes(plan, roads),
    view = vistas(plan, markers),
    flight = flightRoute(plan, markers),
    summit = summitAccess(plan, roads, markers);
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
    routes: [
      ...walk.routes,
      ...drive.routes,
      ...view.routes,
      ...flight.routes,
      ...summit.routes,
    ].map((route) => ({ ...route, camera: route.camera ?? { fov: 50, far: 60_000 } })),
    rejectedRoadSegments: drive.rejectedRoadSegments,
    failures: [
      ...walk.failures,
      ...drive.failures,
      ...view.failures,
      ...flight.failures,
      ...summit.failures,
    ],
    envelope: { halfSize: 4000, maxAltitude: 3200, seaLevel: 0 },
  };
}
