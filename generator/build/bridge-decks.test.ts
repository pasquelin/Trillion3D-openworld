import test from 'node:test';
import assert from 'node:assert/strict';
import type { Instance, PropMesh, WorldPlan } from '../plan/contract.ts';
import { bridges } from '../regions/coast/sites/bridges.ts';
import type { Layout } from '../regions/coast/sites/layout.ts';
import { auditBridgeDecks } from './bridge-decks.ts';

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
      bridges: [{ id: 'span', road: 'main', width: 8, from: points[0], to: points[2] }],
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
  assert.equal(instances.length, 4);
  assert.ok(atJunction.length > 0);
  const triangles = (mesh: PropMesh) =>
      mesh.parts.reduce((sum, part) => sum + part.indices.length / 3, 0),
    closed = meshes.find((mesh) => !mesh.id.includes('/open'))!;
  assert.ok(closed);
  assert.ok(atJunction.every((mesh) => triangles(mesh) < triangles(closed)));
});
