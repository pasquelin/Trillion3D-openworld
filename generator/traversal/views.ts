import type { Marker, Vec3 } from '../plan/contract.ts';
import type { TerrainPlan } from '../plan/plan.ts';
import type { ReplayRoute } from './types.ts';

/** Long views retain real landmark positions and declare the geometry expected in their frustum. */
export function vistas(plan: TerrainPlan, markers: readonly Marker[]) {
  const groups = [
    ['summit', /summit-viewpoint/],
    ['roof', /roof|rooftop/i],
    ['harbor', /harbour|harbor|port/i],
    ['beach', /beach/],
    ['desert', /mesa-sunset/],
    ['woodland', /countryside\/village|countryside\/.*overlook/],
  ] as const;
  const sites = new Map(
    groups.flatMap(([id, pattern]) => {
      const marker = markers.find((m) => m.kind === 'teleport' && pattern.test(m.name));
      return marker ? [[id, marker] as const] : [];
    }),
  );
  const routes: ReplayRoute[] = [],
    failures: string[] = [];
  for (const [id] of groups) {
    const marker = sites.get(id);
    if (!marker || marker.kind !== 'teleport') {
      failures.push(`V1: missing ${id}`);
      continue;
    }
    const subjects: NonNullable<ReplayRoute['subjects']> = [];
    const subject = (name: string, range: 'near' | 'mid' | 'far', position?: Vec3) => {
      if (position) subjects.push({ name, range, position });
      else failures.push(`V1-${id}: missing ${name} long-view target`);
    };
    if (id === 'harbor') {
      subject('harbor quay', 'near', marker.position);
      subject('city skyline', 'mid', sites.get('roof')?.position);
      subject('mountain summit', 'far', sites.get('summit')?.position);
    } else if (id === 'summit') {
      subject('summit foreground', 'near', marker.position);
      subject('city', 'mid', plan.settlements.find((s) => s.id === 'city')?.centre);
      subject('coast town', 'far', plan.settlements.find((s) => s.id === 'coast-town')?.centre);
    } else if (id === 'roof') {
      subject('roof foreground', 'near', marker.position);
      subject('harbor', 'mid', sites.get('harbor')?.position);
      subject(
        'woodland hinterland',
        'far',
        plan.settlements.find((s) => s.id === 'countryside-town')?.centre,
      );
    }
    const directions = subjects
      .filter((s) => s.range !== 'near')
      .map(({ position }) => {
        const delta = position.map((v, k) => v - marker.position[k]),
          length = Math.hypot(...delta);
        return delta.map((v) => v / length);
      });
    const direction = [0, 1, 2].map((k) => directions.reduce((sum, d) => sum + d[k], 0));
    const pose = {
      seconds: 0,
      position: marker.position,
      yaw: directions.length ? Math.atan2(-direction[0], -direction[2]) : marker.yaw,
      pitch: directions.length
        ? Math.atan2(direction[1], Math.hypot(direction[0], direction[2]))
        : (marker.pitch ?? 0),
    };
    routes.push({
      id: `V1-${id}`,
      name: `${id} vista`,
      kind: 'vista',
      night: false,
      length: 0,
      duration: 60,
      samples: [pose, { ...pose, seconds: 60 }],
      subjects,
      camera: { fov: id === 'roof' ? 90 : 50, far: 12_000 },
    });
  }
  return { routes, failures };
}
