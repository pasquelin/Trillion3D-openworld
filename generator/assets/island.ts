/** Two supplemental civic buildings, chosen on clear dry lots after the normal world is placed. */
import type { Instance, PropMesh, Road, WorldPlan } from '../plan/contract.ts';
import { partBounds } from '../props/geometry.ts';
import { box } from '../props/shapes.ts';
import { prop } from '../props/transform.ts';
import { SURFACES } from '../props/surfaces.ts';
import { Occupancy, corners, segmentBox, turn, xz, type Obb } from '../regions/city/frame.ts';
import { dry, groundUnder, inBounds, readSite } from '../regions/city/site.ts';
import { gridPoint } from '../regions/city/grid.ts';
import { BUILDING_ASSETS } from './source.ts';

export function islandBuildings(
  plan: WorldPlan,
  meshes: readonly PropMesh[],
  placed: readonly Instance[],
  roads: readonly Road[],
) {
  const site = readSite(plan),
    occupancy = new Occupancy<{ id: string; low: number; high: number }>(120),
    bounds = new Map(meshes.map((m) => [m.id, partBounds(m.parts)]));
  for (const instance of placed) {
    const b = bounds.get(instance.prop);
    if (!b) continue;
    const scale =
        typeof instance.scale === 'number'
          ? [instance.scale, instance.scale, instance.scale]
          : (instance.scale ?? [1, 1, 1]),
      offset = turn(
        [((b[0][0] + b[1][0]) * scale[0]) / 2, ((b[0][2] + b[1][2]) * scale[2]) / 2],
        instance.yaw,
      );
    occupancy.add(
      {
        centre: [instance.position[0] + offset[0], instance.position[2] + offset[1]],
        half: [((b[1][0] - b[0][0]) * scale[0]) / 2, ((b[1][2] - b[0][2]) * scale[2]) / 2],
        yaw: instance.yaw,
      },
      {
        id: instance.prop,
        low: instance.position[1] + b[0][1] * scale[1],
        high: instance.position[1] + b[1][1] * scale[1],
      },
    );
  }
  for (const road of roads)
    for (let i = 0; i + 1 < road.points.length; i++)
      occupancy.add(segmentBox(xz(road.points[i]), xz(road.points[i + 1]), road.width / 2 + 2), {
        id: road.id,
        low: -Infinity,
        high: Infinity,
      });
  const instances: Instance[] = [],
    foundations: PropMesh[] = [],
    buildings: {
      asset: string;
      class: 'civic';
      height: number;
      footprint: Obb;
      instance: Instance;
    }[] = [];
  for (const asset of BUILDING_ASSETS) {
    const [min, max] = [asset.normalizedBoundsMetres.min, asset.normalizedBoundsMetres.max],
      half: readonly [number, number] = [(max[0] - min[0]) / 2 + 1, (max[2] - min[2]) / 2 + 1];
    let chosen: { footprint: Obb; base: number; top: number } | undefined;
    // Stable scan of cell interiors; fronts face the same heading as existing districts.
    const cells = Math.ceil(site.city.radius / site.pitch);
    for (let ring = 0; ring <= cells && !chosen; ring++)
      for (let i = -ring; i <= ring && !chosen; i++)
        for (let j = -ring; j <= ring && !chosen; j++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
          for (const du of [-24, 0, 24])
            for (const dv of [-24, 0, 24]) {
              if (chosen) continue;
              const centre = gridPoint(site, [
                  (i + 0.5) * site.pitch + du,
                  (j + 0.5) * site.pitch + dv,
                ]),
                footprint: Obb = { centre, half, yaw: site.yaw };
              if (!inBounds(site, centre, Math.hypot(...half))) continue;
              if (
                Math.hypot(centre[0] - site.city.centre[0], centre[1] - site.city.centre[2]) +
                  Math.hypot(...half) >
                site.city.radius
              )
                continue;
              const ground = groundUnder(site, footprint, 2);
              if (
                !ground.length ||
                Math.min(...ground) <= 1 ||
                Math.max(...ground) - Math.min(...ground) > 1
              )
                continue;
              if (
                !ground.every(Number.isFinite) ||
                ![centre, ...corners(footprint)].every((p) => dry(site, p))
              )
                continue;
              const top = Math.max(...ground) + 0.15;
              // Water and ground/paving below the foundation are not building obstructions.
              if (
                occupancy
                  .hits(footprint)
                  .some((item) => item.high > top + 0.5 && item.low < top + max[1])
              )
                continue;
              chosen = {
                footprint,
                base: Math.min(...ground) - 0.25,
                top,
              };
              break;
            }
        }
    if (!chosen) throw new Error(`No clear dry civic lot for ${asset.id}`);
    const { footprint, base, top } = chosen,
      [x, z] = footprint.centre,
      foundation = prop(`assets/foundation-${asset.id}`, [
        box(SURFACES.concrete, [half[0] * 2, top - base, half[1] * 2]),
      ]),
      instance: Instance = {
        prop: asset.id,
        position: [x, top, z],
        yaw: footprint.yaw,
        name: `city/assets/${asset.id}`,
      };
    foundations.push(foundation);
    instances.push({ prop: foundation.id, position: [x, base, z], yaw: footprint.yaw }, instance);
    occupancy.add(footprint, { id: asset.id, low: base, high: top + max[1] });
    buildings.push({
      asset: asset.id,
      class: 'civic',
      height: max[1] - min[1],
      footprint,
      instance,
    });
  }
  return { foundations, instances, buildings };
}
