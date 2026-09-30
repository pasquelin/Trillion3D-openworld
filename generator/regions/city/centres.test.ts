import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from '../../plan/plan.ts';
import { REGIONS } from '../index.ts';
import { outputBytes } from '../testing.ts';
import { buildUrbanCentres } from './centres.ts';
import { cityRegion } from './index.ts';
import { layout } from '../airport/index.ts';
import { GENERAL_FIELD } from '../../plan/airfields.ts';
import { SegmentIndex } from '../../plan/segments.ts';
import { STEP } from '../../plan/route.ts';

const plan = createPlan(undefined, REGIONS),
  cities = buildUrbanCentres(plan),
  airport = layout(plan);

test('five actual centres retain varied buildings, access and distinct identifiers', () => {
  assert.equal(cities.centres.length, 5);
  assert.ok(outputBytes(cities.output).equals(outputBytes(cityRegion.generate(plan))));
  for (const core of cities.centres) {
    const built = core.kept.filter((i) => i.building && i.building.class !== 'civic');
    assert.ok(built.length > 20, `${core.id}: ${built.length} buildings`);
    for (const cls of ['low', 'mid', 'high'])
      assert.ok(
        built.some((i) => i.building!.class === cls),
        `${core.id}: ${cls}`,
      );
    assert.ok(
      core.output.markers.some((m) => m.name === `${core.id}/downtown`),
      core.id,
    );
    assert.ok(
      core.report.districts
        .filter((d) => d.buildingCount)
        .every((d) => d.roadConnectedComponents === 1),
      core.id,
    );
    if (core.id !== 'city') {
      const access = new SegmentIndex();
      for (const road of plan.roads.filter((r) => r.class === 'highway' || r.class === 'secondary'))
        for (let n = 1; n < road.points.length; n++) {
          const a = road.points[n - 1],
            b = road.points[n];
          access.add(a[0], a[2], b[0], b[2], STEP);
        }
      assert.ok(
        access.near(core.site.city.centre[0], core.site.city.centre[2]).length > 0,
        `${core.id}: actual arterial access`,
      );
      assert.ok(
        built
          .filter((i) => i.building!.class === 'high')
          .every((i) => i.building!.height >= 50 && i.building!.height <= 140),
      );
    }
  }
  for (const names of [
    cities.output.instances.map((i) => i.name),
    cities.output.markers.map((m) => m.name),
    cities.output.roads.map((r) => r.id),
  ])
    assert.equal(new Set(names).size, names.length);
  assert.ok(
    cities.output.instances.length + cities.output.movers.length <= plan.regions.city.budget.nodes,
  );
});

test('two physical airfields retain runways, terminal geometry and A-to-B landing positions', () => {
  const strip = airport.output.roads.find((r) => r.id === 'airport/general/runway')!;
  assert.ok(strip);
  assert.equal(strip.width, GENERAL_FIELD.width);
  const [a, b] = [strip.points[0], strip.points.at(-1)!];
  assert.equal(Math.hypot(a[0] - b[0], a[2] - b[2]), 900);
  for (const p of strip.points) assert.ok(Math.abs(p[1] - plan.airfields.general.level) < 1e-9);
  for (let z = a[2]; z <= b[2]; z += 10)
    assert.ok(Math.abs(plan.height(a[0], z) - plan.airfields.general.level) < 1e-9);
  const landing = airport.output.markers.find((m) => m.name === 'airport/general/landing')!;
  const departure = airport.output.markers.find(
    (m) => m.kind === 'spawn' && m.vehicle === 'plane' && m.name === 'Airport — runway 1',
  )!;
  assert.ok(
    Math.hypot(
      landing.position[0] - departure.position[0],
      landing.position[2] - departure.position[2],
    ) > 4_000,
  );
  for (const name of ['airport/general/terminal', 'airport/general/hangar'])
    assert.ok(
      airport.output.instances.some((i) => i.name === name),
      name,
    );
  assert.ok(plan.roads.some((r) => r.id === 'general-airfield-access'));
  assert.ok(airport.output.instances.length <= plan.regions.airport.budget.nodes);
});
