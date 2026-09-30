/** Explicit catalogue membership; no mesh-ID substring defines a building. */
import type { PropMesh } from '../../plan/contract.ts';
import type { BuildingClass, BuildingMetadata } from './zones.ts';

export function buildingMetadata(entries: readonly { prop: PropMesh; class: BuildingClass }[]) {
  return new Map<string, BuildingMetadata>(
    entries.map(({ prop, class: kind }) => {
      let height = 0;
      for (const part of prop.parts)
        for (let i = 1; i < part.positions.length; i += 3)
          height = Math.max(height, part.positions[i]);
      return [prop.id, { class: kind, height }];
    }),
  );
}
