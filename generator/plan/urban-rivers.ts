/** Lower river beds with urban cuts while preserving downstream flow and authored depths. */
import type { Vec3 } from './contract.ts';
import type { RiverCourse } from './rivers.ts';
export function urbanRivers(
  courses: readonly RiverCourse[],
  natural: (x: number, z: number) => number,
  urban: (x: number, z: number, h: number) => number,
): RiverCourse[] {
  const settled = courses.map((course) => {
    const beds: number[] = [],
      points: Vec3[] = [];
    course.river.points.forEach(([x, level, z], k) => {
      const h = natural(x, z),
        ground = urban(x, z, h),
        bed = Math.min(
          course.beds[k],
          ground - course.depths[k],
          k ? beds[k - 1] - 0.05 : Infinity,
        ),
        water = Math.min(level, bed + course.depths[k], k ? points[k - 1][1] : Infinity);
      beds.push(bed);
      points.push([x, water, z]);
    });
    return { ...course, beds, river: { ...course.river, points } };
  });
  const main = settled.find((c) => c.river.id === 'river-main'),
    west = settled.find((c) => c.river.id === 'river-west');
  if (main && west) {
    const end = west.river.points.at(-1)!,
      at = main.river.points.findIndex((p) => Math.hypot(p[0] - end[0], p[2] - end[2]) < 1e-5);
    if (at < 0) throw new Error('Tributary is disconnected from the main river');
    const mainPoints = main.river.points as Vec3[],
      mainBeds = main.beds as number[],
      westPoints = west.river.points as Vec3[],
      westBeds = west.beds as number[],
      confluence = Math.min(mainPoints[at][1], end[1]);
    westPoints[westPoints.length - 1] = [end[0], confluence, end[2]];
    westBeds[westBeds.length - 1] = confluence - west.depths.at(-1)!;
    for (let k = at; k < mainPoints.length; k++) {
      const [x, level, z] = mainPoints[k],
        next = Math.min(level, k === at ? confluence : mainPoints[k - 1][1]);
      mainPoints[k] = [x, next, z];
      mainBeds[k] = next - main.depths[k];
    }
  }
  return settled;
}
