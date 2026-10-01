import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from '../../plan/plan.ts';
import { REGIONS } from '../index.ts';
import { buildCity } from './index.ts';
import { polylineDistance, turn } from './frame.ts';
import { gridPoint } from './grid.ts';
import { dryFootprint } from './dry-footprint.ts';
import { groundUnder } from './site.ts';
import { TOUCH } from './placement.ts';

const city = buildCity(createPlan(undefined, REGIONS));

test('downtown streetwalls enclose tower courts while preserving twin offices and service gaps', () => {
  const downtown = [...city.cells.values()].filter((cell) => cell.district === 'downtown');
  const walls = city.kept.filter((item) => item.instance.prop === 'city/downtown-streetwall');
  assert.ok(downtown.length > 0);
  assert.equal(walls.length, downtown.length * 4 - 2 * Math.floor((downtown.length + 1) / 4));
  assert.ok(city.report.districts.find((district) => district.id === 'downtown')!.coverage > 0.38);
  for (const cell of downtown) {
    const local = walls.filter((wall) => {
      const [u, v] = turn(
        [wall.box!.centre[0] - cell.box.centre[0], wall.box!.centre[1] - cell.box.centre[1]],
        -city.site.yaw,
      );
      return Math.abs(u) <= cell.box.half[0] && Math.abs(v) <= cell.box.half[1];
    });
    assert.ok(local.length === 2 || local.length === 4);
    assert.equal(local.filter((wall) => wall.box!.half[0] === 44).length, 2);
    for (const wall of local) assert.ok(wall.box && !city.site.roads.hits(wall.box).length);
  }
});

test('avenue fragments hold grounded row houses and oaks clear of the carriageway', () => {
  const terraces = city.kept.filter((item) => item.instance.prop === 'city/terrace');
  const trees = city.kept.filter((item) => item.instance.prop === 'tree-oak-large' && item.box);
  assert.equal(terraces.length, city.report.avenueInfill.terraceCount);
  assert.ok(terraces.length > 100);
  assert.ok(city.report.avenueInfill.boulevardTreeCount > 0);
  const roads = [...city.site.roadList, ...city.output.roads];
  for (const item of terraces) {
    const [u, v] = turn(
      [item.box!.centre[0] - city.site.origin[0], item.box!.centre[1] - city.site.origin[1]],
      -city.site.yaw,
    );
    const i = Math.floor(u / city.site.pitch),
      j = Math.floor(v / city.site.pitch),
      acrossX = Math.abs(item.box!.yaw - city.site.yaw) > 0.01,
      offset = (acrossX ? u : v) - ((acrossX ? i : j) + 0.5) * city.site.pitch,
      along = (acrossX ? v : u) - ((acrossX ? j : i) + 0.5) * city.site.pitch;
    assert.ok(Math.abs(Math.abs(along) - 23) < 0.01, item.instance.name);
    assert.ok([15, 38].some((n) => Math.abs(Math.abs(offset) - n) < 0.01));
    const edge = (acrossX ? i : j) + (offset > 0 ? 1 : 0);
    const samples = [0.25, 0.75].map((fraction) =>
      gridPoint(
        city.site,
        acrossX
          ? [edge * city.site.pitch, (j + fraction) * city.site.pitch]
          : [(i + fraction) * city.site.pitch, edge * city.site.pitch],
      ),
    );
    assert.ok(
      roads.some((road) =>
        samples.every((sample) => polylineDistance(sample, road.points) <= road.width / 2 + 1),
      ),
      item.instance.name,
    );
  }
  for (const item of [...terraces, ...trees]) {
    assert.ok(item.box && dryFootprint(city.site, item.box));
    assert.equal(city.site.roads.hits(item.box, TOUCH).length, 0, item.instance.name);
    const heights = groundUnder(city.site, item.box, 8);
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 4, item.instance.name);
  }
});
