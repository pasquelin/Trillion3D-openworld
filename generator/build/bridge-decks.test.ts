import test from 'node:test';
import assert from 'node:assert/strict';
import { Ray, Vector3 } from 'three';
import type { Instance, PropMesh, WorldPlan } from '../plan/contract.ts';
import { bridges } from '../regions/coast/sites/bridges.ts';
import type { Layout } from '../regions/coast/sites/layout.ts';
import { auditBridgeDecks } from './bridge-decks.ts';
import { collisionMesh } from './collision.ts';

test('emitted bridge asphalt follows interior road heights instead of the endpoint chord', () => {
  const points = [
      [0, 10, 0],
      [0, 15, 50],
      [25, 13, 100],
    ] as const,
    plan = {
      roads: [{ id: 'road', class: 'secondary', width: 8, points }],
      bridges: [{ id: 'span', road: 'road', width: 8, from: points[0], to: points[2] }],
    } as unknown as WorldPlan,
    instances: Instance[] = [],
    registered: PropMesh[] = [];
  const layout = {
    map: { plan },
    register: (mesh: PropMesh) => registered.push(mesh),
    place: (
      prop: string,
      x: number,
      z: number,
      yaw: number,
      options: { y: number; name: string },
    ) => {
      const instance = { prop, position: [x, options.y, z] as const, yaw, name: options.name };
      instances.push(instance);
      return instance;
    },
  } as unknown as Layout;
  const meshes = bridges(layout, plan.bridges),
    result = auditBridgeDecks(plan, meshes, instances);
  assert.equal(meshes.length, 2);
  assert.equal(registered.length, 2);
  assert.equal(instances.length, 10);
  assert.ok(result.vertices > 0);
  assert.deepEqual(result.mismatches, []);
  const shifted = instances.map((instance) => ({
    ...instance,
    position: [instance.position[0], instance.position[1] - 1, instance.position[2]] as const,
  }));
  assert.ok(auditBridgeDecks(plan, meshes, shifted).mismatches.length > 0);
});

test('a road joining the bridge deck has an opening in its actual parapet collider', () => {
  const points = [
      [-24, 16, 0],
      [0, 16, 0],
      [24, 16, 0],
    ] as const,
    plan = {
      roads: [
        { id: 'main', class: 'secondary', width: 8, points },
        { id: 'spur', class: 'secondary', width: 8, points: [[0, 16, -24], points[1]] },
      ],
      bridges: [
        { id: 'span', road: 'main', width: 8, from: points[0], to: points[2] },
        { id: 'spur-span', road: 'spur', width: 8, from: [0, 16, -24], to: points[1] },
      ],
    } as unknown as WorldPlan,
    instances: Instance[] = [];
  const layout = {
    map: { plan },
    register: () => {},
    place: (prop: string, x: number, z: number, yaw: number, options: { y: number }) => {
      instances.push({ prop, position: [x, options.y, z], yaw });
      return instances.at(-1);
    },
  } as unknown as Layout;
  const meshes = bridges(layout, plan.bridges),
    atJunction = meshes.filter((mesh) => mesh.id.includes('/open'));
  assert.equal(instances.length, 6);
  assert.ok(atJunction.length > 0);
  const triangles = (mesh: PropMesh) =>
      mesh.parts.reduce((sum, part) => sum + part.indices.length / 3, 0),
    closed = meshes.find((mesh) => !mesh.id.includes('/open'))!;
  assert.ok(closed);
  assert.ok(atJunction.every((mesh) => triangles(mesh) < triangles(closed)));
  assert.ok(atJunction.some((mesh) => mesh.id.includes('spur-span/open0')));
  const ray = new Ray(new Vector3(-8, 16.4, -0.1), new Vector3(1, 0, 0));
  for (const instance of instances) {
    const mesh = meshes.find((m) => m.id === instance.prop)!,
      body = collisionMesh(mesh)!;
    const point = (v: number) => {
      const p = body.positions,
        x = p[v * 3],
        z = p[v * 3 + 2],
        c = Math.cos(instance.yaw),
        s = Math.sin(instance.yaw);
      return new Vector3(
        instance.position[0] + x * c + z * s,
        instance.position[1] + p[v * 3 + 1],
        instance.position[2] - x * s + z * c,
      );
    };
    for (let k = 0; k < body.indices.length; k += 3) {
      const hit = ray.intersectTriangle(
        point(body.indices[k]),
        point(body.indices[k + 1]),
        point(body.indices[k + 2]),
        false,
        new Vector3(),
      );
      assert.ok(!hit || hit.x > 8, `${instance.prop}: parapet blocks the main carriageway`);
    }
  }
});
