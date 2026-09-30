import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildingCollisionMeshes, withBuildingColliders } from './colliders.ts';
import { BUILDING_ASSETS } from './source.ts';
import { partBounds } from '../props/geometry.ts';
import { prop } from '../props/transform.ts';
import { box } from '../props/shapes.ts';
import { SURFACES } from '../props/surfaces.ts';
import { solidColliders, tileColliders } from '../build/colliders.ts';
import { decodeCollisionMesh, encodeCollisionMesh, placePoint } from '../../page/play/collision.ts';
import type { Instance } from '../plan/contract.ts';

test('CC0 physics decodes original indexed triangles at the same normalized metre bounds', async () => {
  const meshes = await buildingCollisionMeshes();
  assert.equal(meshes.length, 2);
  for (const mesh of meshes) {
    const asset = BUILDING_ASSETS.find((a) => a.id === mesh.id)!;
    assert.equal(
      mesh.parts.reduce((n, p) => n + p.indices.length / 3, 0),
      asset.indexedTriangles,
    );
    const bounds = partBounds(mesh.parts);
    assert.deepEqual(bounds, [asset.normalizedBoundsMetres.min, asset.normalizedBoundsMetres.max]);
    for (const part of mesh.parts) {
      assert.ok(part.positions.every(Number.isFinite));
      assert.ok(part.indices.every((i) => i < part.positions.length / 3));
    }
  }
  assert.deepEqual(await buildingCollisionMeshes(), meshes);
});

test('cook sidecars retain both original meshes and both foundations with four matching placements', async () => {
  const baseMesh = prop('existing-wall', [box(SURFACES.concrete, [2, 4, 2])]),
    base = solidColliders([baseMesh], [{ prop: baseMesh.id, position: [-50, 10, -50], yaw: 0 }]),
    foundations = BUILDING_ASSETS.map((a) =>
      prop(`assets/foundation-${a.id}`, [
        box(SURFACES.concrete, [
          a.normalizedBoundsMetres.max[0] * 2 + 2,
          1,
          a.normalizedBoundsMetres.max[2] * 2 + 2,
        ]),
      ]),
    ),
    instances: Instance[] = BUILDING_ASSETS.flatMap((a, i) => [
      { prop: foundations[i].id, position: [100 + i * 100, 10, 200], yaw: Math.PI / 2 },
      { prop: a.id, position: [100 + i * 100, 11, 200], yaw: Math.PI / 2 },
    ]),
    result = await withBuildingColliders(base, foundations, instances);
  assert.equal(result.shapes.size, 5);
  assert.equal(result.placed.length, 5);
  assert.equal(base.shapes.size, 1);
  assert.equal(base.placed.length, 1);
  assert.deepEqual(result.placed[0], base.placed[0]);
  const tiles = tileColliders(result.placed, 8000, 1000),
    restored = [...tiles.values()].flat();
  for (const instance of instances) {
    const placed = restored.find((p) => p.prop === instance.prop)!;
    assert.ok(placed);
    assert.deepEqual(placed, { ...instance, scale: [1, 1, 1] });
    const source = result.shapes.get(instance.prop)!;
    const encoded = encodeCollisionMesh(source),
      decoded = decodeCollisionMesh(encoded.buffer as ArrayBuffer);
    assert.deepEqual(decoded, source);
    assert.ok(decoded.indices.length > 0);
    assert.deepEqual(placePoint(placed, 0, 0, 0), instance.position);
    const asset = BUILDING_ASSETS.find((a) => a.id === instance.prop);
    if (asset) {
      assert.equal(decoded.indices.length / 3, asset.indexedTriangles);
      const highest = Math.max(...decoded.positions.filter((_, i) => i % 3 === 1));
      assert.equal(highest, asset.normalizedBoundsMetres.max[1]);
      assert.equal(placePoint(placed, 0, highest, 0)[1], instance.position[1] + highest);
    }
  }
});
