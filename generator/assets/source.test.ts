import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { ASSET_ROOT, BUILDING_ASSETS, assetSource, type Gltf } from './source.ts';
import { appendBuildings } from './assemble.ts';
import { writeWorldGltf } from '../gltf/write.ts';
import { buildWorkload } from '../workloads/fixture.ts';

test('every original model and dependent atlas matches pinned provenance and measured geometry', async () => {
  assert.ok(BUILDING_ASSETS.length > 0 && BUILDING_ASSETS.length <= 6);
  for (const asset of BUILDING_ASSETS) {
    assert.match(asset.revision, /^[a-f0-9]{40}$/);
    assert.equal(asset.license, 'CC0-1.0');
    assert.match(await readFile(resolve(ASSET_ROOT, asset.licenseFile), 'utf8'), /CC0/);
    for (const file of asset.files) {
      const bytes = await readFile(resolve(ASSET_ROOT, file.path));
      assert.equal(bytes.length, file.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
      assert.equal(file.license, asset.license);
      assert.ok(file.source.includes(asset.revision));
      if ('dimensions' in file) {
        assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], file.dimensions);
      }
    }
    const { gltf, binary } = await assetSource(asset);
    assert.deepEqual(
      {
        translation: gltf.nodes[0].translation ?? [0, 0, 0],
        rotation: gltf.nodes[0].rotation ?? [0, 0, 0, 1],
        scale: gltf.nodes[0].scale ?? [1, 1, 1],
      },
      asset.authoredNodeTransform,
    );
    assert.equal(gltf.materials.length, asset.materials);
    assert.equal(
      gltf.meshes
        .flatMap((m) => m.primitives)
        .reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0),
      asset.indexedTriangles,
    );
    const position = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION],
      view = gltf.bufferViews[position.bufferView],
      buffer =
        binary ?? (await readFile(resolve(ASSET_ROOT, asset.file, '..', gltf.buffers[0].uri!)));
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.count; i++)
      for (let axis = 0; axis < 3; axis++) {
        const v = buffer.readFloatLE(
          (view.byteOffset ?? 0) +
            (position.byteOffset ?? 0) +
            i * (view.byteStride ?? 12) +
            axis * 4,
        );
        min[axis] = Math.min(min[axis], v);
        max[axis] = Math.max(max[axis], v);
      }
    assert.deepEqual(min, asset.bounds.min);
    assert.deepEqual(max, asset.bounds.max);
    assert.ok(asset.metresPerSourceUnit > 0 && min[1] === 0 && max[1] > min[1]);
  }
});

test('existing world glTF writer plus assembly preserves all source indices, atlases and placed nodes', async () => {
  // All temporary artefacts stay inside the repository and are removed, even on failure.
  await mkdir(resolve(import.meta.dirname, '../../dist'), { recursive: true });
  const dir = await mkdtemp(resolve(import.meta.dirname, '../../dist/source-test-'));
  try {
    const fixture = buildWorkload('four-blocks');
    await writeWorldGltf(dir, 'world', {
      meshes: fixture.meshes,
      instances: fixture.instances.filter((i) => !BUILDING_ASSETS.some((a) => a.id === i.prop)),
      lights: [],
    });
    await appendBuildings(dir, fixture.instances);
    const gltf = JSON.parse(await readFile(resolve(dir, 'world.gltf'), 'utf8')) as Gltf;
    assert.equal(gltf.nodes.length, fixture.report.totalInstances);
    assert.equal(gltf.scenes[0].nodes.length, gltf.nodes.length);
    assert.equal(gltf.meshes.length, fixture.meshes.length + BUILDING_ASSETS.length);
    assert.equal(gltf.materials.length, fixture.report.uniqueMaterials);
    for (const mesh of gltf.meshes)
      for (const p of mesh.primitives) {
        assert.ok(gltf.materials[p.material]);
        assert.ok(gltf.accessors[p.indices]);
        for (const accessor of Object.values(p.attributes)) assert.ok(gltf.accessors[accessor]);
      }
    for (const view of gltf.bufferViews) assert.ok(gltf.buffers[view.buffer]);
    for (const buffer of gltf.buffers)
      assert.equal((await readFile(resolve(dir, buffer.uri!))).length, buffer.byteLength);
    for (const image of gltf.images!)
      assert.ok((await readFile(resolve(dir, image.uri))).length > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
