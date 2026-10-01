import assert from 'node:assert/strict';
import test from 'node:test';
import { lakeDistance, lakeRadiusAt } from './lake-shore.ts';
import { waterCarver, type Lake } from './carve.ts';

for (const phase of [0.6, 2.3])
  test(`organic water rim and basin agree continuously, phase ${phase}`, () => {
    const lake: Lake = {
        id: 'test',
        x: 0,
        z: 0,
        radius: 350,
        level: 20,
        depth: 12,
        shore: { yaw: 0.4, ratio: 0.7, phase },
      },
      carve = waterCarver([], [lake], { heights: new Float64Array(), at: () => 100 }),
      radii = Array.from({ length: 96 }, (_, i) => lakeRadiusAt(lake, (i * Math.PI) / 48));
    assert.ok(
      Math.max(...radii) - Math.min(...radii) > 100,
      'the outline must visibly differ from a circle',
    );
    assert.ok(
      radii.every((r) => r > lake.radius * 0.4 && r <= lake.radius),
      'existing radius remains a safe envelope',
    );
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const radius = lakeRadiusAt(lake, angle),
        c = Math.cos(angle),
        s = Math.sin(angle),
        step = 0.001,
        at = (offset: number) => carve((radius + offset) * c, (radius + offset) * s, 100),
        centre = at(0),
        left = (centre - at(-step)) / step,
        right = (at(step) - centre) / step;
      assert.ok(Math.abs(lakeDistance(lake, radius * c, radius * s) - lake.radius) < 1e-9);
      assert.ok(Math.abs(centre - lake.level) < 1e-9, 'water surface meets its physical shore');
      assert.ok(Math.abs(left - right) < 1e-4, `${left} vs ${right}: smooth bank normal`);
    }
  });
