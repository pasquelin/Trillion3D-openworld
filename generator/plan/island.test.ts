import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { placeWorld } from '../build/world.ts';
import { WORLD } from './contract.ts';
import { islandCensus } from './island.ts';
import { createPlan } from './plan.ts';
import { dryFootprint } from './dry.ts';
import { REGIONS } from '../regions/index.ts';

for (const seed of [332, 333]) {
  describe(`composed enclosing island, seed ${seed}`, () => {
    const world = placeWorld(seed),
      plan = world.plan,
      census = islandCensus(plan);
    it('has the chosen land area, one main island, and no dry outer ocean margin', () => {
      assert.ok(census.measuredLandKm2 >= 39 && census.measuredLandKm2 <= 45);
      assert.equal(census.borderDry, 0);
      assert.ok(census.componentsKm2[0] / census.measuredLandKm2 > 0.97);
      assert.equal(
        census.componentsKm2.length,
        4,
        'main island and three authored offshore islets',
      );
      for (let edge = 3750; edge <= 4000; edge += 25)
        for (let along = -4000; along <= 4000; along += 25)
          for (const [x, z] of [
            [edge, along],
            [-edge, along],
            [along, edge],
            [along, -edge],
          ]) {
            assert.ok(plan.height(x, z) < WORLD.seaLevel, `${x},${z}`);
            assert.equal(plan.biome(x, z).owner, 'sea');
          }
    });
    it('repeats the composed shore and census exactly from the same seed', () => {
      assert.deepEqual(islandCensus(createPlan(seed, REGIONS)), census);
    });
    it('keeps the platform, required settlements and land spawns on dry ground', () => {
      for (const id of [
        'city',
        'airport',
        'port',
        'desert-town',
        'mountains-town',
        'countryside-town',
        'coast-town',
        'ski-resort',
      ]) {
        const settlement = plan.settlements.find((s) => s.id === id);
        assert.ok(settlement, id);
        assert.ok(plan.height(settlement.centre[0], settlement.centre[2]) > 0, id);
      }
      const p = plan.platform;
      for (let x = p.minX; x <= p.maxX; x += 50)
        for (let z = p.minZ; z <= p.maxZ; z += 50)
          assert.ok(Math.abs(plan.height(x, z) - p.level) < 0.1, `platform ${x},${z}`);
      for (const marker of world.markers) {
        if (
          marker.kind === 'emitter' ||
          marker.deck ||
          (marker.kind === 'spawn' && marker.vehicle === 'boat')
        )
          continue;
        assert.ok(plan.height(marker.position[0], marker.position[2]) > 0, marker.name);
      }
    });
    it('retains required road connections and no smoothed road segment crosses sea', () => {
      for (const id of [
        ...Array.from({ length: 6 }, (_, k) => `highway-${k}`),
        'airport-access',
        'pass',
        'port/road',
      ])
        assert.ok(
          plan.roads.some((r) => r.id === id),
          id,
        );
      assert.deepEqual(
        plan.failedConnections.filter((id) => !id.startsWith('trail/')),
        [],
      );
      for (const road of [...plan.roads, ...world.placed.flatMap((output) => output.roads)])
        for (let k = 1; k < road.points.length; k++) {
          const a = road.points[k - 1],
            b = road.points[k],
            n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 10);
          for (let i = 0; i <= n; i++) {
            const x = a[0] + ((b[0] - a[0]) * i) / n,
              z = a[2] + ((b[2] - a[2]) * i) / n;
            assert.ok(plan.natural(x, z) > WORLD.seaLevel, `${road.id} sea segment ${k}`);
          }
        }
    });
    it('places vegetation and crop centers on dry composed ground', () => {
      const plants = world.instances.filter((i) =>
        /^(tree-|bush-|desert\/agave|countryside\/field-)/.test(i.prop),
      );
      assert.ok(plants.length > 1000);
      for (const i of plants)
        assert.ok(plan.height(i.position[0], i.position[2]) > 0, i.name ?? i.prop);
    });
    it('keeps actual field and stand mesh footprints out of the sea', () => {
      const bounds = new Map(
        world.meshes.map((mesh) => {
          const b = [Infinity, -Infinity, Infinity, -Infinity];
          for (const part of mesh.parts)
            for (let k = 0; k < part.positions.length; k += 3) {
              b[0] = Math.min(b[0], part.positions[k]);
              b[1] = Math.max(b[1], part.positions[k]);
              b[2] = Math.min(b[2], part.positions[k + 2]);
              b[3] = Math.max(b[3], part.positions[k + 2]);
            }
          return [mesh.id, b] as const;
        }),
      );
      for (const instance of world.instances.filter((i) =>
        /^(tree-stand-|countryside\/field-)/.test(i.prop),
      )) {
        const [x0, x1, z0, z1] = bounds.get(instance.prop)!,
          c = Math.cos(instance.yaw),
          s = Math.sin(instance.yaw),
          dx = (x0 + x1) / 2,
          dz = (z0 + z1) / 2;
        assert.ok(
          dryFootprint(
            plan.height,
            instance.position[0] + dx * c + dz * s,
            instance.position[2] - dx * s + dz * c,
            (x1 - x0) / 2,
            (z1 - z0) / 2,
            instance.yaw,
          ),
          instance.name ?? instance.prop,
        );
      }
      for (const instance of world.instances.filter((i) =>
        i.prop.startsWith('countryside/field-'),
      )) {
        const mesh = world.meshes.find((m) => m.id === instance.prop)!;
        for (const part of mesh.parts)
          for (let k = 0; k < part.positions.length; k += 3) {
            const x = part.positions[k],
              z = part.positions[k + 2],
              c = Math.cos(instance.yaw),
              s = Math.sin(instance.yaw);
            assert.ok(
              plan.height(
                instance.position[0] + x * c + z * s,
                instance.position[2] - x * s + z * c,
              ) > 0,
              instance.prop,
            );
          }
      }
    });
  });
}
