import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from './plan.ts';
import { CITY_CORES } from './geography.ts';
import { REGIONS } from '../regions/index.ts';
import { layout } from '../regions/airport/index.ts';
const GRADE = {
  highway: 0.06,
  secondary: 0.08,
  pass: 0.1,
  avenue: 0.08,
  street: 0.1,
  dirt: 0.25,
  runway: 0.01,
  taxiway: 0.015,
};

for (const seed of [332, 333])
  test(`integrated road profiles and physical airfields retain grade and runway levels, seed ${seed}`, () => {
    const plan = createPlan(seed, REGIONS),
      airport = layout(plan);
    for (const road of [...plan.roads, ...airport.output.roads]) {
      assert.ok(
        road.points.every((p) => p.every(Number.isFinite)),
        `${road.id}: finite points`,
      );
      for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i - 1],
          b = road.points[i],
          length = Math.hypot(a[0] - b[0], a[2] - b[2]),
          rise = Math.abs(a[1] - b[1]);
        assert.ok(length > 1e-5 || rise < 1e-5, `${road.id}: no vertical/NaN segment`);
        assert.ok(
          rise <= GRADE[road.class] * length + 1e-5,
          `${road.id}: ${((rise / length) * 100).toFixed(2)}% exceeds ${GRADE[road.class] * 100}%`,
        );
      }
    }
    for (const core of plan.settlements.filter((s) => CITY_CORES.some((c) => c.id === s.id))) {
      const near = plan.roads
        .flatMap((r) => r.points)
        .filter((p) => Math.hypot(p[0] - core.centre[0], p[2] - core.centre[2]) < 50);
      assert.ok(near.length, `${core.id}: real road junction`);
      for (const p of near)
        assert.ok(
          Math.abs(p[1] - plan.beforeRoads(p[0], p[2])) < 0.01,
          `${core.id}: anchored urban altitude ${p[1]}`,
        );
    }
    const strips = airport.output.roads.filter((r) => r.class === 'runway');
    assert.equal(strips.length, 3);
    for (const strip of strips) {
      const field = strip.id.includes('general') ? plan.airfields.general : plan.airfields.main;
      for (const p of strip.points) {
        assert.ok(
          Math.abs(p[1] - field.level) < 1e-7,
          `${strip.id}: physical strip matches field level`,
        );
        assert.ok(
          Math.abs(plan.height(p[0], p[2]) - field.level) < 1e-7,
          `${strip.id}: terrain supports strip`,
        );
      }
    }
    for (const name of ['airport/general/terminal', 'airport/general/hangar'])
      assert.ok(
        airport.output.instances.some((i) => i.name === name),
        name,
      );
  });
