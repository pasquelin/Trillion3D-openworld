/** Diagram of observed district catchments and conservative building footprints, in metres. */
import { corners } from './frame.ts';
import type { buildCity } from './index.ts';
import { NEIGHBORHOODS } from './zones.ts';

const COLORS = { low: '#93c581', mid: '#d4b660', high: '#9b85bb', civic: '#7198a8' };
export function districtSvg(city: ReturnType<typeof buildCity>) {
  const { minX, minZ, maxX, maxZ } = city.site.bounds;
  const width = maxX - minX,
    height = maxZ - minZ;
  const catchments = [...city.cells.values()].map((c) => {
    const box = { ...c.box, half: [city.site.pitch / 2, city.site.pitch / 2] as const };
    return `<polygon points="${corners(box)
      .map(([x, z]) => `${x},${z}`)
      .join(' ')}" fill="${COLORS[NEIGHBORHOODS[c.district].buildingClass]}" opacity=".25"/>`;
  });
  const roads = [...city.site.roadList, ...city.output.roads].map(
    (r) =>
      `<polyline points="${r.points.map(([x, , z]) => `${x},${z}`).join(' ')}" fill="none" stroke="#6c7781" stroke-width="${r.width}"/>`,
  );
  const polygons = city.kept
    .filter((i) => i.building && i.box)
    .map(
      (i) =>
        `<polygon points="${corners(i.box!)
          .map(([x, z]) => `${x},${z}`)
          .join(' ')}" fill="${COLORS[i.building!.class]}" stroke="#25303b" stroke-width="1"/>`,
    );
  const loops = city.report.districts.flatMap((d) =>
    d.sidewalkLoop
      ? [
          `<polyline points="${d.sidewalkLoop.map(([x, , z]) => `${x},${z}`).join(' ')}" fill="none" stroke="#ffffff" stroke-width="3"/>`,
        ]
      : [],
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minZ} ${width} ${height}" width="1000" height="${(1000 * height) / width}">
<title>Original districts: explicit building footprints and clear sidewalk circuits</title>
<rect x="${minX}" y="${minZ}" width="${width}" height="${height}" fill="#18232d"/>
${catchments.join('\n')}${roads.join('\n')}${polygons.join('\n')}${loops.join('\n')}</svg>\n`;
}
