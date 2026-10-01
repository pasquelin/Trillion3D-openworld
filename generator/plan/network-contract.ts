import type { Bridge, Vec3 } from './contract.ts';
import type { RoadCourse } from './carve.ts';
import type { Tunnel } from './tunnels.ts';

export type Network = {
  courses: RoadCourse[];
  bridges: Bridge[];
  tunnels: Tunnel[];
  viewpoints: Vec3[];
  failedConnections: string[];
};
