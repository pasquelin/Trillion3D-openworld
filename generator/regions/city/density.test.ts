import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from '../../plan/plan.ts';
import { REGIONS } from '../index.ts';
import { buildCity } from './index.ts';
import { turn } from './frame.ts';
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
  for (const item of terraces) {
    const roadFacing = city.site.roadList.some((road) =>
      road.points.slice(1).some((end, k) => {
        const start = road.points[k],
          dx = end[0] - start[0],
          dz = end[2] - start[2],
          length = Math.hypot(dx, dz),
          x = item.box!.centre[0] - start[0],
          z = item.box!.centre[1] - start[2];
        if (!length) return false;
        const along = (x * dx + z * dz) / length,
          away = Math.abs(x * dz - z * dx) / length;
        return (
          along >= 0 &&
          along <= length &&
          Math.abs(away - road.width / 2 - 12.5) < 0.01 &&
          Math.abs(Math.sin(item.instance.yaw - Math.atan2(-dz, dx))) < 0.001
        );
      }),
    );
    assert.ok(roadFacing, item.instance.name);
  }
  for (const item of [...terraces, ...trees]) {
    assert.ok(item.box && dryFootprint(city.site, item.box));
    assert.equal(city.site.roads.hits(item.box, TOUCH).length, 0, item.instance.name);
    const heights = groundUnder(city.site, item.box, 8);
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 4, item.instance.name);
  }
});
