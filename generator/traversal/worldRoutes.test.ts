import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRoadWater } from '../build/road-water.ts';
import { placeWorld } from '../build/world.ts';
import { solidIndex } from '../build/solids.ts';
import { buildTraversal } from './build.ts';
import { nearestRoad, roadIndex } from '../../page/play/roads.ts';
import { rotate, yawPitchRoll } from '../../page/play/math3.ts';
import { markerSite } from '../build/markers.ts';
import { civicRouteObservations } from './observations.ts';

const world = placeWorld(),
  roads = [...world.plan.roads, ...world.placed.flatMap((o) => o.roads)],
  manifest = buildTraversal(world.plan, roads, world.markers, world.city);
test('placeWorld retains actual geometry, roads and settled landmarks for all five urban centres', () => {
  assert.equal(world.centres?.length, 5);
  const output = world.placed.find((o) => o.instances.some((i) => i.name?.startsWith('city/')))!;
  for (const core of world.centres!) {
    const buildings = core.kept.filter((i) => i.building && i.building.class !== 'civic');
    assert.ok(buildings.length > 20, core.id);
    for (const building of buildings)
      assert.ok(
        output.instances.some((i) => i.name === building.instance.name),
        building.instance.name,
      );
    assert.ok(
      world.markers.some((m) => m.name === `${core.id}/downtown`),
      core.id,
    );
    assert.ok(
      roads.some((r) => r.id.startsWith(`${core.id}/`)),
      `${core.id}: streets`,
    );
  }
  assert.equal(world.city?.id, 'city');
  assert.ok(manifest.routes.some((r) => r.id === 'W1'));
});
test('the generated island exposes every required traversal with no missing connection or landmark', () => {
  assert.deepEqual(manifest.failures, []);
  const required = [
    'W1',
    'D1',
    'N1-W1',
    'N1-D1',
    'D1-port',
    'D1-airport',
    'F1',
    'F2',
    'S1',
    ...['summit', 'roof', 'harbor', 'beach', 'desert', 'woodland'].map((id) => `V1-${id}`),
  ];
  for (const id of required)
    assert.ok(
      manifest.routes.some((r) => r.id === id),
      id,
    );
});
test('night replay preserves exact generated poses and city walking loop respects its chosen distance', () => {
  const walk = manifest.routes.find((r) => r.id === 'W1')!;
  assert.ok(walk.length >= 600 && walk.length <= 900, String(walk.length));
  assert.deepEqual(walk.samples[0].position, walk.samples.at(-1)!.position);
  for (const id of ['W1', 'D1'])
    assert.deepEqual(
      manifest.routes.find((r) => r.id === id)!.samples,
      manifest.routes.find((r) => r.id === `N1-${id}`)!.samples,
    );
  assert.deepEqual(manifest, buildTraversal(world.plan, roads, world.markers, world.city));
});
test('D1 begins with a fixed ten-second 0 km/h stop before road-class driving', () => {
  const drive = manifest.routes.find((r) => r.id === 'D1')!;
  assert.equal(drive.samples[0].seconds, 0);
  assert.equal(drive.samples[1].seconds, 10);
  assert.deepEqual(drive.samples[0].position, drive.samples[1].position);
  assert.equal(drive.samples.at(-1)!.seconds, drive.duration);
});
test('the airport spur reaches the generated terminal curbside on real graded pavement', () => {
  const end = manifest.routes.find((r) => r.id === 'D1-airport')!.samples.at(-1)!.position,
    curbside = roads.filter((r) => r.id === 'airport/curbside'),
    hit = nearestRoad(roadIndex(curbside), end[0], end[2]);
  assert.ok(hit && hit.distance < 0.01);
  assert.ok(Math.abs(world.plan.height(end[0], end[2]) - (end[1] - 1.7)) < 0.01);
});
test('the port spur traverses the authored port road to its settlement rather than stopping at the interchange', () => {
  const port = world.plan.roads.find((r) => r.id === 'port/road')!,
    end = manifest.routes.find((r) => r.id === 'D1-port')!.samples.at(-1)!.position;
  assert.ok(Math.hypot(end[0] - port.points[0][0], end[2] - port.points[0][2]) < 0.01);
  assert.ok(Math.hypot(end[0] - port.points.at(-1)![0], end[2] - port.points.at(-1)![2]) > 1);
});
test('long vistas frame their generated skyline and hinterland targets within declared real-camera optics', () => {
  for (const id of ['harbor', 'roof', 'summit']) {
    const route = manifest.routes.find((r) => r.id === `V1-${id}`)!,
      pose = route.samples[0],
      q = yawPitchRoll(pose.yaw, pose.pitch),
      vertical = Math.tan((route.camera!.fov * Math.PI) / 360);
    assert.deepEqual(
      route.subjects!.map((s) => s.range),
      ['near', 'mid', 'far'],
    );
    for (const subject of route.subjects!.filter((s) => s.range !== 'near')) {
      const delta = subject.position.map((v, k) => v - pose.position[k]),
        p = rotate([-q[0], -q[1], -q[2], q[3]], delta);
      assert.ok(p[2] < 0, `${id}: ${subject.name} behind camera`);
      assert.ok(
        Math.abs(p[0]) < (-p[2] * vertical * 1280) / 720,
        `${id}: ${subject.name} horizontal field`,
      );
      assert.ok(Math.abs(p[1]) < -p[2] * vertical, `${id}: ${subject.name} vertical field`);
      assert.ok(Math.hypot(...delta) < route.camera!.far);
    }
  }
});
test('every W1 camera sample has a real upward collision floor within 0.1 m of its feet', () => {
  const walk = manifest.routes.find((r) => r.id === 'W1')!,
    solids = solidIndex(world.solids);
  for (const sample of walk.samples) {
    const [x, y, z] = sample.position,
      feet = y - 1.7,
      terrain = world.plan.height(x, z),
      floors = [
        terrain,
        ...solids
          .over(x, z)
          .filter((h) => h.up)
          .map((h) => h.y),
      ];
    assert.ok(
      floors.some((h) => Math.abs(h - feet) <= 0.1),
      `${x.toFixed(2)},${z.toFixed(2)} floor ${feet.toFixed(3)} candidates ${floors}`,
    );
  }
});
test('the generated fast flight keeps its declared altitude and island envelope without a runtime clamp', () => {
  const flight = manifest.routes.find((r) => r.id === 'F1')!;
  for (const {
    position: [x, y, z],
  } of flight.samples) {
    assert.ok(
      Math.abs(x) <= manifest.envelope.halfSize && Math.abs(z) <= manifest.envelope.halfSize,
    );
    assert.ok(y <= manifest.envelope.maxAltitude);
  }
});
test('the full W1 body clearance includes actual cooked-world solids and both CC0 civic footprints', async () => {
  const civic = await civicRouteObservations(world, manifest),
    standing = markerSite({ ...world, solids: civic.solids });
  assert.deepEqual(civic.failures, []);
  assert.equal(civic.observations.supplementalCivicBuildings.length, 2);
  assert.ok(civic.observations.supplementalCivicBuildings.every((building) => building.walkClear));
  assert.equal(civic.observations.supplementalColliderInstances, 4);
  assert.equal(civic.observations.supplementalColliderTriangles, 2509);
  for (const sample of manifest.routes.find((route) => route.id === 'W1')!.samples)
    assert.equal(
      standing.problem({
        kind: 'teleport',
        name: 'W1',
        position: sample.position,
        yaw: sample.yaw,
        deck: true,
      }),
      undefined,
      JSON.stringify(sample),
    );
});
test('F2 reaches the distinct northeast field with exact source endpoint poses and baked clearance', () => {
  const transfer = manifest.routes.find((r) => r.id === 'F2')!,
    departure = world.markers.find(
      (m) => m.kind === 'teleport' && m.name === 'Airport — runway threshold',
    )!,
    arrival = world.markers.find(
      (m) => m.kind === 'teleport' && m.name === 'airport/general/landing',
    )!;
  assert.deepEqual(transfer.samples[0].position, departure.position);
  assert.deepEqual(transfer.samples.at(-1)!.position, arrival.position);
  assert.ok(Math.hypot(...departure.position.map((v, k) => v - arrival.position[k])) > 4000);
  assert.equal(transfer.samples[0].yaw, 'yaw' in departure ? departure.yaw : undefined);
  assert.equal(transfer.samples.at(-1)!.yaw, 'yaw' in arrival ? arrival.yaw : undefined);
  for (const [k, sample] of transfer.samples.entries()) {
    const [x, y, z] = sample.position;
    assert.ok(Math.abs(x) <= 4000 && Math.abs(z) <= 4000 && y <= 3200);
    assert.ok(y >= world.plan.height(x, z) + 1.6, JSON.stringify(sample));
    if (k) {
      const previous = transfer.samples[k - 1];
      assert.ok(sample.seconds > previous.seconds);
      assert.ok(
        Math.abs(y - previous.position[1]) <=
          0.08001 * Math.hypot(x - previous.position[0], z - previous.position[2]),
      );
    }
  }
  assert.deepEqual(
    manifest.routes.find((r) => r.id === 'F1')!.samples[0].position,
    manifest.routes.find((r) => r.id === 'F1')!.samples.at(-1)!.position,
  );
});
test('composed road decks clear actual visible aquatic surfaces', () => {
  assert.deepEqual(auditRoadWater(world.plan, roads).submerged, []);
});
