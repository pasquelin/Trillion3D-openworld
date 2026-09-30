import assert from 'node:assert/strict';
import test from 'node:test';
import type { Mesh } from 'trillion3d-engine';
import { trafficPhysics } from './bodies.ts';
import { physicsFixture } from './physics.fixture.ts';

test('a recycled traffic body is recreated at its destination rather than swept through the world', () => {
  const f = physicsFixture(),
    roots = [f.built.root];
  const meshes: Mesh[] = [];
  const original = f.engine.object.mesh;
  f.engine.object.mesh = (shape, material) => {
    const mesh = original(shape, material);
    meshes.push(mesh as unknown as Mesh);
    return mesh;
  };
  const pool = trafficPhysics(f.engine, roots);
  pool.update();
  const first = meshes[0].physics;
  roots[0].position.set(0, 0, 1);
  pool.update();
  assert.equal(meshes[0].physics, first);
  roots[0].position.set(200, 0, 200);
  pool.update();
  assert.notEqual(meshes[0].physics, first);
  roots[0].visible = false;
  pool.update();
  assert.equal(meshes[0].physics, null);
  pool.dispose();
});
