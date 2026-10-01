/** Find a short contour-following track on true ground to an existing highway vertex. */
import type { Vec3 } from '../../plan/contract.ts';
import type { Point } from './geometry2.ts';

type Cell = { x: number; z: number; cost: number; priority: number; from?: string };
const STEP = 12,
  LIMIT = 800;

export function oasisTrack(
  start: Point,
  highway: readonly Vec3[],
  height: (x: number, z: number) => number,
  safe: (a: Point, b: Point, width: number) => boolean,
  width: number,
): Point[] | undefined {
  const goals = highway
    .filter(
      ([x, y, z]) =>
        Math.hypot(x - start[0], z - start[1]) < 550 && Math.abs(y - height(x, z)) < 0.05,
    )
    .map(([x, , z]): Point => [x, z]);
  if (!goals.length) return;
  for (const goal of [...goals].sort((a, b) => distance(start, a) - distance(start, b)))
    if (distance(start, goal) < 350 && safe(start, goal, width)) return [start, goal];

  const key = (x: number, z: number) => `${x},${z}`,
    point = (x: number, z: number): Point => [start[0] + x * STEP, start[1] + z * STEP],
    heuristic = (p: Point) => Math.min(...goals.map((goal) => distance(p, goal))),
    cells = new Map<string, Cell>(),
    open: Cell[] = [];
  const push = (cell: Cell) => {
    open.push(cell);
    let i = open.length - 1;
    while (i) {
      const parent = (i - 1) >> 1;
      if (open[parent].priority <= cell.priority) break;
      open[i] = open[parent];
      i = parent;
    }
    open[i] = cell;
  };
  const pop = () => {
    const first = open[0],
      last = open.pop()!;
    if (open.length) {
      let i = 0;
      while (i * 2 + 1 < open.length) {
        let child = i * 2 + 1;
        if (child + 1 < open.length && open[child + 1].priority < open[child].priority) child++;
        if (open[child].priority >= last.priority) break;
        open[i] = open[child];
        i = child;
      }
      open[i] = last;
    }
    return first;
  };
  const root = { x: 0, z: 0, cost: 0, priority: heuristic(start) };
  cells.set(key(0, 0), root);
  push(root);
  for (let visited = 0; open.length && visited < 10000; visited++) {
    const cell = pop(),
      at = point(cell.x, cell.z);
    if (cell !== cells.get(key(cell.x, cell.z))) continue;
    const goal = goals.find(
      (candidate) => distance(at, candidate) < 27 && safe(at, candidate, width),
    );
    if (goal) {
      const path: Point[] = [goal];
      let current: Cell | undefined = cell;
      while (current) {
        path.push(point(current.x, current.z));
        current = current.from ? cells.get(current.from) : undefined;
      }
      return path.reverse();
    }
    for (const dx of [-1, 0, 1])
      for (const dz of [-1, 0, 1]) {
        if (!dx && !dz) continue;
        const x = cell.x + dx,
          z = cell.z + dz,
          next = point(x, z),
          cost = cell.cost + Math.hypot(dx, dz) * STEP,
          id = key(x, z);
        if (
          cost + heuristic(next) > LIMIT ||
          cost >= (cells.get(id)?.cost ?? Infinity) ||
          Math.abs(height(next[0], next[1]) - height(at[0], at[1])) >
            Math.hypot(dx, dz) * STEP * 0.1 ||
          !safe(at, next, width)
        )
          continue;
        const candidate = {
          x,
          z,
          cost,
          priority: cost + heuristic(next),
          from: key(cell.x, cell.z),
        };
        cells.set(id, candidate);
        push(candidate);
      }
  }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
