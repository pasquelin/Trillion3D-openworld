import test from 'node:test';
import assert from 'node:assert/strict';
import { urbanRivers } from './urban-rivers.ts';
test('urban river cuts lower actual water with the plateau without reversing flow', () => {
  const source = {
    river: {
      id: 'cut',
      points: [
        [0, 100, 0],
        [100, 90, 0],
        [200, 80, 0],
      ] as const,
      widths: [10, 10, 10],
    },
    beds: [95, 85, 75],
    depths: [5, 5, 5],
  };
  const [settled] = urbanRivers(
    [source],
    () => 100,
    (x, _, h) => (x === 100 ? 30 : h),
  );
  assert.equal(settled.river.points[1][1], 30);
  assert.ok(settled.river.points[2][1] <= 30);
  assert.ok(settled.beds[2] < settled.beds[1]);
  assert.deepEqual(settled.depths, source.depths);
  assert.deepEqual(
    source.river.points.map((p) => p[1]),
    [100, 90, 80],
  );
});
test('unmodified urban ground keeps exact original river values', () => {
  const source = {
    river: {
      id: 'same',
      points: [
        [0, 10, 0],
        [100, 9, 0],
      ] as const,
      widths: [10, 10],
    },
    beds: [5, 4],
    depths: [5, 5],
  };
  assert.deepEqual(
    urbanRivers(
      [source],
      () => 20,
      (_, __, h) => h,
    ),
    [source],
  );
});
test('final tributary water meets the main level without reversing its upstream flow', () => {
  const main = {
      river: {
        id: 'river-main',
        points: [
          [0, 50, 0],
          [100, 40, 0],
        ] as const,
        widths: [10, 10],
      },
      beds: [45, 35],
      depths: [5, 5],
    },
    west = {
      river: {
        id: 'river-west',
        points: [
          [-100, 70, 0],
          [0, 60, 0],
        ] as const,
        widths: [10, 10],
      },
      beds: [65, 55],
      depths: [5, 5],
    };
  const settled = urbanRivers(
    [main, west],
    () => 100,
    (_, __, h) => h,
  );
  assert.equal(settled[1].river.points.at(-1)![1], settled[0].river.points[0][1]);
  assert.ok(settled[1].river.points[0][1] >= settled[1].river.points[1][1]);
  assert.ok(settled[1].beds[0] > settled[1].beds[1]);
});
test('a lower tributary bank lowers the confluence and main downstream water', () => {
  const main = {
      river: {
        id: 'river-main',
        points: [
          [0, 50, 0],
          [100, 40, 0],
        ] as const,
        widths: [10, 10],
      },
      beds: [45, 35],
      depths: [5, 5],
    },
    west = {
      river: {
        id: 'river-west',
        points: [
          [-100, 30, 0],
          [0, 20, 0],
        ] as const,
        widths: [10, 10],
      },
      beds: [25, 15],
      depths: [5, 5],
    },
    settled = urbanRivers(
      [main, west],
      () => 100,
      (_, __, h) => h,
    );
  assert.equal(settled[0].river.points[0][1], 20);
  assert.equal(settled[0].river.points[1][1], 20);
  assert.equal(settled[1].river.points.at(-1)![1], 20);
  assert.equal(settled[1].river.points[0][1], 30);
});
