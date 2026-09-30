/** A genuine 900 m northeast field: shared hangar geometry, a terminal and clear landing strips. */
import type { Marker, RegionOutput, Road, Vec3, WorldPlan } from '../../plan/contract.ts';
import { GENERAL_FIELD } from '../../plan/airfields.ts';
import { isTerrainPlan } from '../../plan/plan.ts';
import { EYE } from '../../build/markers.ts';
import { office } from './offices.ts';
import { HANGARS, hangarFootprint } from './hangar.ts';
import { Placer, type Footprint, type Layer, type PlaceOptions } from './placer.ts';

export function generalLayout(plan: WorldPlan) {
  if (!isTerrainPlan(plan)) return undefined;
  const p = plan.airfields.general,
    z = (p.minZ + p.maxZ) / 2,
    runwayX = p.minX + 85,
    taxiX = runwayX + 55,
    terminalX = p.maxX - 45,
    half = GENERAL_FIELD.length / 2,
    y = (x: number, z: number): Vec3 => [x, plan.height(x, z), z];
  const road = (
    id: string,
    cls: Road['class'],
    width: number,
    points: readonly [number, number][],
  ): Road => ({
    id: `airport/general/${id}`,
    class: cls,
    width,
    points: points.map(([x, z]) => y(x, z)),
  });
  const roads = [
      road('runway', 'runway', GENERAL_FIELD.width, [
        [runwayX, z - half],
        [runwayX, z + half],
      ]),
      road('taxiway', 'taxiway', GENERAL_FIELD.taxiwayWidth, [
        [taxiX, z - half + 30],
        [taxiX, z + half - 30],
      ]),
      ...[-1, 1].map((side) =>
        road(`connector-${side}`, 'taxiway', GENERAL_FIELD.taxiwayWidth, [
          [runwayX, z + side * (half - 30)],
          [taxiX, z + side * (half - 30)],
        ]),
      ),
      road('apron-access', 'taxiway', GENERAL_FIELD.taxiwayWidth, [
        [taxiX, z],
        [p.maxX - 145, z],
      ]),
      road('terminal-access', 'secondary', 8, [
        [p.maxX + 100, z],
        [terminalX + 25, z],
      ]),
    ],
    placer = new Placer(plan, [...plan.roads, ...roads]);
  const put = (
    prop: string,
    x: number,
    zz: number,
    footprint: Footprint,
    layer: Layer,
    options: PlaceOptions = {},
    yaw = 0,
  ) => placer.place(prop, [x, zz], yaw, footprint, layer, options);
  put('airport/slab-concrete', p.maxX - 110, z, [[0, 0, 0.5, 0.5]], 'pad', {
    scale: [110, 1, 120],
    name: 'airport/general/apron',
  });
  const terminal = office('airport/general-terminal', { width: 36, depth: 18, floors: 2 });
  if (
    !put(terminal.id, terminalX, z - 100, [[0, 0, 18.5, 9.5]], 'solid', {
      name: 'airport/general/terminal',
      reach: 1.2,
    })
  )
    throw new Error('general airfield: terminal was not placed');
  if (
    !put(
      'airport/hangar',
      p.maxX - 105,
      z + 125,
      hangarFootprint(HANGARS.standard),
      'solid',
      { scale: 0.5, name: 'airport/general/hangar', reach: 2 },
      Math.PI,
    )
  )
    throw new Error('general airfield: hangar was not placed');
  put('airport/windsock', runwayX + 100, z - 200, [[0, 0, 3, 1]], 'solid', {
    name: 'airport/general/windsock',
  });
  for (let along = -half + 45; along < half; along += 60)
    put('airport/mark-dash', runwayX, z + along, [[0, 0, 0.5, 15]], 'paint', {
      scale: [0.6, 1, 0.5],
    });
  for (const side of [-1, 1]) {
    put(
      'airport/mark-piano',
      runwayX,
      z + side * (half - 15),
      [[0, 0, 11, 10]],
      'paint',
      { scale: [0.45, 1, 0.6] },
      side < 0 ? 0 : Math.PI,
    );
    for (let along = -half; along <= half; along += 60)
      put(
        'airport/light-edge',
        runwayX + side * (GENERAL_FIELD.width / 2 + 2),
        z + along,
        [[0, 0, 0.4, 0.4]],
        'solid',
      );
  }
  const markers: Marker[] = [
    {
      kind: 'teleport',
      name: 'airport/general/terminal',
      position: [terminalX, p.level + EYE, z - 80],
      yaw: Math.PI / 2,
    },
    {
      kind: 'teleport',
      name: 'airport/general/landing',
      position: [runwayX, p.level + EYE, z + half - 10],
      yaw: 0,
    },
    {
      kind: 'spawn',
      vehicle: 'plane',
      name: 'airport/general/plane',
      position: [runwayX, p.level, z + half - 60],
      yaw: 0,
    },
  ];
  const output: RegionOutput = {
    props: [terminal],
    instances: placer.instances,
    markers,
    lights: [],
    movers: [],
    roads,
  };
  return { output, placed: placer.placed };
}
