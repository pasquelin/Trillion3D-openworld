import assert from 'node:assert/strict';
import test from 'node:test';
import { flightSweep } from './flightSweep.ts';
import { aircraft } from './sim/flight.ts';
import { axisAngle } from './math3.ts';

test('a banked or sideways aircraft sweeps its wings in world coordinates', () => {
  const plane = aircraft([0, 100, 0], Math.PI / 2);
  const yaw = flightSweep(plane, [plane]);
  assert.ok(yaw.z >= 5.5, 'yaw turns the wings across world Z');
  plane.orientation = axisAngle([0, 0, 1], Math.PI / 2);
  assert.ok(flightSweep(plane, [plane]).y >= 5.5, 'roll turns the wings upward');
});

test('the sweep encloses intermediate bends as well as its straight endpoint chord', () => {
  const from = aircraft([0, 100, 0], 0);
  const mid = aircraft([10, 100, -1], 0),
    end = aircraft([0, 100, -2], 0);
  assert.ok(flightSweep(from, [mid, end]).x >= 15.5);
});
