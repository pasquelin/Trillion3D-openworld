/** Original six-storey street facade: real projecting balconies, frames and roof equipment. */
import type { MeshPart } from '../plan/contract.ts';
import { box } from '../props/shapes.ts';
import { SURFACES as S, surface } from '../props/surfaces.ts';
import { prop, transform } from '../props/transform.ts';

export function detailedBuilding() {
  const plaster = surface('workload/warm-plaster', [0.61, 0.46, 0.29]),
    frame = surface('workload/frame', [0.72, 0.7, 0.64], 0.1, 0.45),
    parts: MeshPart[] = [box(plaster, [18, 24, 18])];
  const add = (
    s: typeof plaster,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    yaw = 0,
  ) => parts.push(transform(box(s, size), { at, yaw }));
  // Facades on four sides. Each window has a pane, four raised frames and a sill.
  for (let side = 0; side < 4; side++) {
    const yaw = (side * Math.PI) / 2;
    for (let floor = 0; floor < 6; floor++)
      for (let column = 0; column < 5; column++) {
        const x = -6.4 + column * 3.2,
          y = 0.8 + floor * 4;
        const facade = (
          s: typeof plaster,
          size: readonly [number, number, number],
          at: readonly [number, number, number],
        ) => {
          parts.push(transform(transform(box(s, size), { at }), { yaw }));
        };
        facade(S.glass, [1.9, 2.3, 0.08], [x, y, 9.04]);
        for (const dx of [-1.05, 1.05]) facade(frame, [0.18, 2.7, 0.2], [x + dx, y - 0.2, 9.13]);
        for (const dy of [-0.2, 2.3]) facade(frame, [2.3, 0.18, 0.2], [x, y + dy, 9.13]);
        facade(S.concrete, [2.5, 0.2, 0.6], [x, y - 0.25, 9.25]);
        if (floor > 0 && column % 2 === 0) {
          facade(S.concrete, [2.8, 0.25, 1.8], [x, y - 0.4, 9.8]);
          facade(S.steel, [2.8, 0.08, 0.08], [x, y + 0.8, 10.65]);
          for (let bar = 0; bar < 8; bar++)
            facade(S.darkMetal, [0.05, 1.05, 0.05], [x - 1.3 + (bar * 2.6) / 7, y - 0.15, 10.65]);
          for (const dx of [-1.36, 1.36])
            facade(S.steel, [0.08, 0.08, 1.8], [x + dx, y + 0.8, 9.8]);
        }
      }
  }
  add(S.concrete, [19, 0.45, 19], [0, 24, 0]);
  for (const x of [-8.9, 8.9]) add(frame, [0.3, 1.1, 18], [x, 24.45, 0]);
  for (const z of [-8.9, 8.9]) add(frame, [18, 1.1, 0.3], [0, 24.45, z]);
  for (const x of [-4, 0, 4]) {
    add(S.paintedMetal, [2, 1.2, 3], [x, 24.45, -3]);
    for (let slat = 0; slat < 7; slat++)
      add(S.darkMetal, [1.8, 0.06, 0.05], [x, 24.6 + slat * 0.14, -1.46]);
  }
  add(S.brick, [1.3, 2.8, 1.3], [5, 24.45, 5]);
  return prop('workload/detailed-building', parts);
}
