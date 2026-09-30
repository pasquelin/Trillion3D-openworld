/** Five road-facing centres share the existing detailed city builder and geometry. */
import type { RegionModule } from '../../plan/contract.ts';
import { surface, SURFACES } from '../../props/index.ts';
import { CITY } from './surfaces.ts';
import { buildUrbanCentres } from './centres.ts';
export { buildCity } from './core.ts';

/** Coastal plain keeps natural shores; the composed height is shared by every builder. */
const RELIEF = 0.15;

export const cityRegion: RegionModule = {
  name: 'city',
  refine: (_x, _z, base) => (base > 0 ? -base * (1 - RELIEF) : 0),
  ground: [
    { surface: surface('city/beach-sand', [0.62, 0.55, 0.4], 0, 0.95), maxHeight: 2.5 },
    { surface: CITY.lawn, maxSlope: 0.35 },
    { surface: SURFACES.rock },
  ],
  generate: (plan) => buildUrbanCentres(plan).output,
};
