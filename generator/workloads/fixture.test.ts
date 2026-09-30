import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWorkload, WORKLOADS } from './fixture.ts';
import type { Bounds } from '../plan/contract.ts';

const intersects = (a: Bounds, b: Bounds) =>
  a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
test('identical detail scales by block instances, without building or road overlap', () => {
  const one = buildWorkload('one-block');
  for (const name of Object.keys(WORKLOADS) as (keyof typeof WORKLOADS)[]) {
    const fixture = buildWorkload(name),
      n = WORKLOADS[name];
    assert.equal(fixture.buildings.length, 6 * n);
    assert.equal(fixture.report.totalInstances, 8 * n);
    assert.equal(fixture.report.uniqueSourceTriangles, one.report.uniqueSourceTriangles);
    assert.equal(
      fixture.report.instanceExpandedTriangles,
      one.report.instanceExpandedTriangles * n,
    );
    assert.equal(fixture.report.uniqueMaterials, one.report.uniqueMaterials);
    assert.equal(fixture.report.renderedTriangles, null);
    for (const [i, building] of fixture.buildings.entries()) {
      assert.ok(!fixture.roads.some((road) => intersects(road, building.footprint)));
      assert.ok(
        !fixture.buildings.slice(i + 1).some((b) => intersects(b.footprint, building.footprint)),
      );
    }
    assert.deepEqual(buildWorkload(name), fixture);
  }
});

test('original facade contains raised frames, projecting balconies and roof equipment', () => {
  const fixture = buildWorkload('one-block'),
    mesh = fixture.meshes.find((m) => m.id.endsWith('detailed-building'))!;
  const materials = new Set(mesh.parts.map((p) => p.surface.name));
  assert.ok(materials.has('steel') && materials.has('glass') && materials.has('brick'));
  const positions = mesh.parts.flatMap((p) => [...p.positions]);
  assert.ok(Math.max(...positions.filter((_, i) => i % 3 === 1)) > 27);
  assert.ok(Math.max(...positions.filter((_, i) => i % 3 === 2)) > 10.6);
  assert.ok(fixture.report.uniqueSourceTriangles > 600 + 1885);
});
