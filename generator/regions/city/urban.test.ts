import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from '../../plan/plan.ts';
import { REGIONS } from '../index.ts';
import { buildCity } from './index.ts';
import { buildingMetadata } from './metadata.ts';
import { dryFootprint } from './dry-footprint.ts';
import { dry } from './site.ts';
import { Occupancy, overlaps, turn } from './frame.ts';
import { TOUCH } from './placement.ts';

const plan = createPlan(undefined, REGIONS);
const city = buildCity(plan);

test('density counts explicit buildings and reconciles footprint union on actual dry catchments', () => {
  let count = 0;
  for (const d of city.report.districts) {
    count += d.buildingCount;
    assert.equal(d.densityPerKm2, d.buildingCount / d.areaKm2);
    assert.equal(d.coverage, d.footprintUnionM2 / (d.usableDryKm2 * 1e6));
    assert.equal(d.meanFootprintM2, d.footprintUnionM2 / d.buildingCount);
    if (d.id === 'park') continue;
    assert.ok('density' in d.targets);
    assert.ok(d.densityPerKm2 >= d.targets.density[0] && d.densityPerKm2 <= d.targets.density[1]);
    assert.ok(d.coverage >= d.targets.coverage[0] && d.coverage <= d.targets.coverage[1]);
    assert.equal(d.roadConnectedComponents, 1, d.name);
    assert.ok(d.roadConnections.length >= 2, d.name);
    assert.ok(d.sidewalkLoop && d.sidewalkLoop.length === 5, d.name);
    assert.deepEqual(d.sidewalkLoop[0], d.sidewalkLoop[4]);
  }
  for (const i of city.kept.filter((i) => i.building && i.building.class !== 'civic')) {
    const [min, max] = { low: [5, 15], mid: [15, 50], high: [80, 220] }[
      i.building!.class as 'low' | 'mid' | 'high'
    ];
    if (i.instance.prop === 'city/tower-round-310') continue;
    assert.ok(i.building!.height >= min && i.building!.height <= max, i.instance.prop);
  }
  assert.equal(
    count + city.report.avenueInfill.terraceCount,
    city.kept.filter((i) => i.building).length,
  );
  assert.ok(city.output.instances.length > count * 2, 'accessories are not counted as buildings');
  const footprints = new Occupancy<string>(100);
  for (const i of city.kept.filter((i) => i.building)) {
    assert.ok(i.box && dryFootprint(city.site, i.box), i.instance.name);
    assert.deepEqual(footprints.hits(i.box, TOUCH), [], i.instance.name);
    footprints.add(i.box, i.instance.name!);
  }
});

test('midrise fronts share flush party walls and leave clear end alleys to the courtyard', () => {
  for (const prop of city.output.props.filter((p) => p.id.startsWith('city/midrise-'))) {
    const width = city.kept.find((i) => i.instance.prop === prop.id)!.box!.half[0];
    for (const part of prop.parts)
      for (let k = 0; k < part.positions.length; k += 3)
        assert.ok(Math.abs(part.positions[k]) <= width + TOUCH, prop.id);
  }
  for (const cell of city.cells.values()) {
    if (cell.district !== 'midrise') continue;
    const local = city.kept
      .filter((i) => i.building?.class === 'mid' && i.box)
      .map((i) => {
        const [u, v] = turn(
          [i.box!.centre[0] - cell.box.centre[0], i.box!.centre[1] - cell.box.centre[1]],
          -city.site.yaw,
        );
        return { item: i, u, v };
      })
      .filter(({ u, v }) => Math.abs(u) < 45 && Math.abs(v) < 45);
    assert.equal(local.length, 4);
    for (const side of [-1, 1]) {
      const [left, right] = local
        .filter(({ v }) => Math.sign(v) === side)
        .sort((a, b) => a.u - b.u);
      assert.notEqual(left.item.building!.height, right.item.building!.height);
      assert.ok(
        Math.abs(left.u + left.item.box!.half[0] - right.u + right.item.box!.half[0]) < TOUCH,
      );
      assert.ok(left.u - left.item.box!.half[0] >= -42 - TOUCH);
      assert.ok(right.u + right.item.box!.half[0] <= 42 + TOUCH);
    }
    for (const u of [-43.5, 43.5]) {
      const [dx, dz] = turn([u, 0], city.site.yaw);
      const lane = {
        centre: [cell.box.centre[0] + dx, cell.box.centre[1] + dz] as const,
        half: [1.2, 43] as const,
        yaw: city.site.yaw,
      };
      assert.ok(
        !city.kept.some((i) => i.kind === 'solid' && i.box && overlaps(lane, i.box, TOUCH)),
      );
    }
  }
});

test('all three sidewalk circuits remain clear of solid furniture and buildings', () => {
  for (const d of city.report.districts.filter((d) => d.id !== 'park')) {
    const loop = d.sidewalkLoop!;
    for (let k = 1; k < loop.length; k++) {
      // The midpoint of each sidewalk side must have an unobstructed pedestrian footprint.
      const centre = [
        (loop[k - 1][0] + loop[k][0]) / 2,
        (loop[k - 1][2] + loop[k][2]) / 2,
      ] as const;
      const body = { centre, half: [0.6, 0.6] as const, yaw: city.site.yaw };
      assert.ok(
        !city.kept.some((i) => i.kind === 'solid' && i.box && overlaps(body, i.box)),
        d.name,
      );
    }
  }
});

test('three neighboring clear blocks expose a real residential, mixed and center interface', () => {
  const protectedCells = [...city.cells.values()].filter((c) => c.interface);
  assert.equal(protectedCells.length, 3);
  assert.deepEqual(
    new Set(protectedCells.map((c) => c.district)),
    new Set(['suburb', 'midrise', 'downtown']),
  );
  for (const cell of protectedCells) {
    const district = city.report.districts.find((d) => d.id === cell.district)!;
    assert.ok(
      district.sidewalkLoops.some((l) => l.cellId === `${cell.i},${cell.j}`),
      district.name,
    );
  }
});

test('a narrow river crossing the interior rejects a building despite dry corners and center', () => {
  const site = {
    ...city.site,
    plan: {
      ...plan,
      height: () => 3,
      rivers: [
        {
          id: 'interior-channel',
          points: [
            [25, 3, -100],
            [25, 3, 100],
          ] as const,
          widths: [1, 1],
        },
      ],
    },
  };
  const footprint = { centre: [0, 0] as const, half: [50, 50] as const, yaw: 0 };
  for (const p of [
    [-50, -50],
    [-50, 50],
    [50, 50],
    [50, -50],
    [0, 0],
  ] as const)
    assert.ok(dry(site, p));
  assert.equal(dryFootprint(site, footprint), false);
});

test('above-sea lake water excludes point and full building footprints', () => {
  const site = {
    ...city.site,
    plan: {
      ...plan,
      height: () => 10,
      rivers: [],
      lakes: [{ id: 'raised-lake', x: 25, z: 0, radius: 4, level: 12, depth: 2 }],
    },
  };
  assert.equal(dry(site, [25, 0]), false);
  assert.equal(dry(site, [0, 0]), true);
  assert.equal(dryFootprint(site, { centre: [0, 0], half: [30, 30], yaw: 0 }), false);
});

test('building class comes from catalogue membership and height excludes buried foundations', () => {
  const part = {
    surface: city.output.props[0].parts[0].surface,
    positions: new Float32Array([0, -4, 0, 0, 14, 0, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
  };
  const metadata = buildingMetadata([
    { prop: { id: 'a-name-without-building-words', parts: [part] }, class: 'mid' },
  ]);
  assert.deepEqual(metadata.get('a-name-without-building-words'), { class: 'mid', height: 14 });
  assert.equal(metadata.has('city/tower-decoration'), false);
});
