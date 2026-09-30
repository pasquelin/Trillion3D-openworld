import type { Vec3 } from '../plan/contract.ts';
export type Pose = { seconds: number; position: Vec3; yaw: number; pitch: number };
export type ReplayRoute = {
  id: string;
  name: string;
  kind: 'walk' | 'drive' | 'vista' | 'flight';
  night: boolean;
  length: number;
  duration: number;
  samples: Pose[];
};
export type Traversal = {
  version: 1;
  seed: number;
  contentHash: string;
  enginePin: string;
  settings: {
    width: number;
    height: number;
    geometryBytes: number;
    textureBytes: number;
    traffic: number;
    pedestrians: number;
    time: number;
  };
  routes: ReplayRoute[];
  failures: string[];
  rejectedRoadSegments: string[];
  envelope: { halfSize: number; maxAltitude: number; seaLevel: number };
};
