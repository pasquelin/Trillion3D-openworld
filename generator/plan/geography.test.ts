import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLD } from './contract.ts';
import { AIRFIELD_AREAS, CITY_CORES, mountainEnvelope } from './geography.ts';
import { islandCensus } from './island.ts';
import { nameSeed } from './noise.ts';
import { createRelief } from './relief.ts';

for (const seed of [332, 333]) {
  const relief = createRelief(nameSeed(seed, 'relief'));
  test(`coherent relief retains the enclosing island contract, seed ${seed}`, () => {
    const census = islandCensus(relief);
    assert.ok(census.measuredLandKm2 >= 39 && census.measuredLandKm2 <= 45);
    assert.equal(census.borderDry, 0);
    assert.ok(census.highestMetres <= WORLD.peak);
    assert.equal(census.componentsKm2.length, 4);
    assert.ok(census.componentsKm2[0] / census.measuredLandKm2 > 0.97);
    for (const core of CITY_CORES) assert.ok(relief.height(core.x, core.z) > 3, core.id);
    for (const [id, area] of Object.entries(AIRFIELD_AREAS))
      for (let x = area.minX; x <= area.maxX; x += 25)
        for (let z = area.minZ; z <= area.maxZ; z += 25)
          assert.ok(relief.height(x, z) > 3, `${id} reservation at ${x},${z}`);
  });
  test(`coherent relief joins shores and foothills continuously, seed ${seed}`, () => {
    for (let x = -3_000; x <= 3_000; x += 100) {
      const shore = relief.southCoastZ(x);
      assert.ok(Math.abs(relief.coast(x, shore)) < 1e-4);
      assert.ok(relief.height(x, shore - 1) > 0);
      assert.ok(relief.height(x, shore + 1) < 0);
    }
    for (let x = -3_200; x <= 3_200; x += 200)
      for (let z = -3_200; z <= 2_800; z += 200) {
        const h = relief.height(x, z);
        assert.ok(Math.abs(relief.height(x + 0.001, z) - h) < 0.05);
        assert.ok(Math.abs(relief.height(x, z + 0.001) - h) < 0.05);
      }
    assert.ok(relief.height(-850, -2_250) > WORLD.peak * 0.75);
    assert.ok(mountainEnvelope(-850, -1_000) > 0.1, 'continuous south foothills');
    const rural = CITY_CORES.filter((core) => core.z > 0).map((c) => relief.height(c.x, c.z));
    assert.ok(
      rural.every((h) => h >= 30 && h <= 250),
      `${rural}`,
    );
  });
}

test('geographic frame separates five centres and supports distinct A-to-B fields', () => {
  assert.equal(CITY_CORES.length, 5);
  assert.equal(CITY_CORES.filter((core) => core.primary).length, 1);
  for (const a of CITY_CORES)
    for (const b of CITY_CORES)
      if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.radius + b.radius);
  const { main, general } = AIRFIELD_AREAS;
  assert.ok(main.maxX < 0 && general.minX > 0 && general.maxZ < 0);
  const west = CITY_CORES.find((core) => core.id === 'city-west')!;
  assert.ok(west.x + west.radius + 100 <= main.minX, 'western city clears the field');
  assert.ok(main.maxZ - main.minZ >= 2_400 + 2 * 450);
  assert.ok(main.maxX - main.minX >= 1_330);
  assert.ok(general.maxZ - general.minZ >= 900 + 2 * 150);
});

test('massif lobes join without a normal crease at their crossing', () => {
  const x = 849.313871,
    z = -2_100,
    step = 0.01,
    centre = mountainEnvelope(x, z),
    left = (centre - mountainEnvelope(x - step, z)) / step,
    right = (mountainEnvelope(x + step, z) - centre) / step;
  assert.ok(Math.abs(left - right) < 1e-7, `${left} versus ${right}`);
});
