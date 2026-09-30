/** Reproducible district census and footprint map; no render-time or GPU-performance inference. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createPlan } from '../generator/plan/plan.ts';
import { REGIONS } from '../generator/regions/index.ts';
import { buildCity } from '../generator/regions/city/index.ts';
import { districtSvg } from '../generator/regions/city/report-map.ts';
import { triangleCount } from '../generator/props/index.ts';
import { cookKey } from './cook-key.ts';

const seed = Number(process.argv.find((a) => a.startsWith('--seed='))?.slice(7) ?? 332);
if (!Number.isSafeInteger(seed)) throw new Error('Expected an integer --seed');
const out = resolve(
  process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'dist/urban-report',
);
const city = buildCity(createPlan(seed, REGIONS));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const payload = {
  ...city.report,
  sourceCookKey: cookKey(),
  engineCommit: pkg.trillion3d.commit,
  uniquePropMeshes: city.output.props.length,
  uniquePropTriangles: city.output.props.reduce((n, p) => n + triangleCount(p), 0),
  totalPropInstances: city.output.instances.length,
};
const contentHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
await mkdir(out, { recursive: true });
await writeFile(
  resolve(out, 'districts.json'),
  JSON.stringify({ ...payload, contentHash }, null, 2) + '\n',
);
await writeFile(resolve(out, 'districts.svg'), districtSvg(city));
console.table(
  payload.districts.map((d) => ({
    district: d.name,
    areaKm2: d.areaKm2.toFixed(3),
    chosenAreaKm2: d.targets.areaKm2,
    buildings: d.buildingCount,
    density: d.densityPerKm2.toFixed(1),
    coverage: (d.coverage * 100).toFixed(2) + '%',
    connected: d.roadConnectedComponents,
    sidewalk: d.sidewalkLoop !== null,
  })),
);
console.log(`Report ${contentHash}: ${out}`);
