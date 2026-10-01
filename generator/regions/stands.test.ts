import assert from 'node:assert/strict';
import test from 'node:test';
import { forestStands } from '../props/stands.ts';
import { plantStands } from './stands.ts';

// A narrow depression between lattice samples used to leave a merged trunk floating.
test('every accepted merged tree root rests within its actual ground burial allowance', () => {
  const seed = 73,
    variants = forestStands(seed).variants,
    height = (x: number, z: number) =>
      100 + 0.07 * x - 2 * Math.exp(-((x - 13) ** 2 + (z - 9) ** 2) / 2);
  let accepted = 0;
  plantStands({
    seed,
    height,
    cells: [[0, 0, 64, 1]],
    biomeAt: () => 'broadleaf',
    nodes: 100,
    place: (spot) => {
      const variant = variants.find((v) => v.id === spot.variant.id)!;
      for (const [x, z, limit] of variant.roots) {
        const ground = height(
            spot.x + x * Math.cos(spot.yaw) + z * Math.sin(spot.yaw),
            spot.z - x * Math.sin(spot.yaw) + z * Math.cos(spot.yaw),
          ),
          root = spot.y - variant.gradient * x;
        assert.ok(root <= ground + 1e-9, `${variant.id}: floating root`);
        assert.ok(ground - root <= limit + 1e-9, `${variant.id}: buried crown`);
      }
      accepted++;
      return { prop: variant.id, position: [spot.x, spot.y, spot.z], yaw: spot.yaw };
    },
  });
  assert.ok(accepted > 0, 'the regression must check actual accepted geometry');
});
