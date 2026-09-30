import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { Marker, WorldPlan } from '../plan/contract.ts';
import { EYE, markerSite } from './markers.ts';

it('moves a land teleport from submerged ground onto nearby dry ground', () => {
  const height = (x: number, z: number) => (Math.hypot(x, z) < 4 ? -5 : 2),
    site = markerSite({ plan: { height } as WorldPlan, meshes: [], instances: [] }),
    marker: Extract<Marker, { kind: 'teleport' }> = {
      kind: 'teleport',
      name: 'dry-footing',
      position: [0, -5 + EYE, 0],
      yaw: 0,
    },
    moved = site.settle(marker);
  assert.ok(site.problem(marker));
  assert.equal(site.problem(moved), undefined);
  assert.ok(height(moved.position[0], moved.position[2]) > 0);
  assert.equal(moved.position[1], 2 + EYE);
});
