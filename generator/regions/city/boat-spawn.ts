/** A harbour berth follows real open water even when quay roots are drawn inland. */
import type { Marker } from '../../plan/contract.ts';
import { footprintOf } from '../../build/footprint.ts';
import { facing, type Xz } from './frame.ts';
import { QUAY, ROOT } from './harbour-props.ts';
import type { Placer } from './placement.ts';
import { groundUnder } from './site.ts';

export function boatSpawn(placer: Placer, world: (a: number, b: number) => Xz, out: Xz) {
  const marker: Extract<Marker, { kind: 'spawn' }> = {
    kind: 'spawn',
    vehicle: 'boat',
    name: 'city/harbour-boat',
    position: [0, 0, 0],
    yaw: facing(out),
  };
  const print = footprintOf(marker);
  for (let a = ROOT + 150; a <= ROOT + QUAY.length + 600; a += 20) {
    const [x, z] = world(a, 0),
      box = { centre: [x, z] as Xz, half: [print.radius, print.radius] as Xz, yaw: marker.yaw };
    if (!placer.fits(box, 'solid') || placer.occupied(box)) continue;
    if (!groundUnder(placer.site, box, 2).every((h) => Number.isFinite(h) && h < print.low - 0.25))
      continue;
    return { ...marker, position: [x, 0, z] as const };
  }
  return undefined;
}
