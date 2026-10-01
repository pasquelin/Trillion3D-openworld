import assert from 'node:assert/strict';
import test from 'node:test';
import { occupiedCells, propFootprints } from './infill-occupancy.ts';
import { box, prop, SURFACES } from '../props/index.ts';
const slab = prop('slab', [box(SURFACES.concrete, [60, 1, 4])]);
const at = (cells: Uint8Array, x: number, z: number) =>
  cells[Math.floor((z + 50) / 5) * 20 + Math.floor((x + 50) / 5)];
test('a long narrow slab leaves the neighbouring parcel available instead of reserving its radius square', () => {
  const bounds = propFootprints([slab]),
    cells = occupiedCells([{ prop: 'slab', position: [0, 0, 0], yaw: 0 }], bounds, 100, 5);
  assert.equal(at(cells, 20, 0), 1);
  assert.equal(at(cells, 0, 20), 0);
  const rotated = occupiedCells(
    [{ prop: 'slab', position: [0, 0, 0], yaw: Math.PI / 2, scale: [0.5, 1, 2] }],
    bounds,
    100,
    5,
  );
  assert.equal(at(rotated, 0, 10), 1);
  assert.equal(at(rotated, 10, 0), 0);
});
