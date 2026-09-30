/** Road-aligned neighborhoods, measured from available blocks rather than distance rings. */
import type { Cell, District } from './grid.ts';

export const NEIGHBORHOODS = {
  suburb: { name: 'Garden Reach', buildingClass: 'low' },
  midrise: { name: 'Market Ward', buildingClass: 'mid' },
  downtown: { name: 'Bay Center', buildingClass: 'high' },
  park: { name: 'Civic Green', buildingClass: 'civic' },
  stadium: { name: 'Civic Green', buildingClass: 'civic' },
} as const;

/** Borders follow avenue columns. Narrow terrain holes remain unbuilt open lots. */
export function zoneCells(cells: Map<string, Cell>) {
  const columns = [...new Set([...cells.values()].map((c) => c.i))].sort((a, b) => a - b);
  const counts = columns.map((i) => [...cells.values()].filter((c) => c.i === i).length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return;
  let count = 0,
    boundary = columns[0];
  for (let k = 0; k < columns.length; k++) {
    count += counts[k];
    if (count >= total * 0.55) {
      boundary = columns[k];
      break;
    }
  }
  const frontage = [...cells.values()]
    .filter((c) => Math.abs(c.i - boundary) <= 1)
    .sort((a, b) => a.j - b.j);
  const middle = frontage[Math.floor(frontage.length / 2)];
  const candidates = [...cells.values()].filter(
    (c) => cells.has(`${c.i - 1},${c.j}`) && cells.has(`${c.i},${c.j + 1}`),
  );
  const crossing =
    candidates.sort(
      (a, b) =>
        Math.abs(a.i - boundary) +
          Math.abs(a.j - middle.j) -
          (Math.abs(b.i - boundary) + Math.abs(b.j - middle.j)) ||
        a.i - b.i ||
        a.j - b.j,
    )[0] ?? middle;
  const low = cells.get(`${crossing.i - 1},${crossing.j}`),
    mid = cells.get(`${crossing.i},${crossing.j + 1}`);
  for (const c of [crossing, low, mid]) if (c) c.interface = true;
  const center = [...cells.values()].sort(
    (a, b) =>
      Math.abs(a.i - boundary) +
        Math.abs(a.j - crossing.j) -
        (Math.abs(b.i - boundary) + Math.abs(b.j - crossing.j)) ||
      a.i - b.i ||
      a.j - b.j,
  );
  const high = new Set(
    center.filter((c) => c !== low && c !== mid).slice(0, Math.max(3, Math.round(total * 0.12))),
  );
  high.add(crossing);
  for (const cell of cells.values())
    cell.district =
      cell === low
        ? 'suburb'
        : cell === mid
          ? 'midrise'
          : high.has(cell)
            ? 'downtown'
            : cell.i <= boundary
              ? 'suburb'
              : 'midrise';
}

export type BuildingClass = (typeof NEIGHBORHOODS)[District]['buildingClass'];
export type BuildingMetadata = { class: BuildingClass; height: number };
