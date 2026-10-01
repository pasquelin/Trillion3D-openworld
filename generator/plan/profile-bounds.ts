/** Grade envelopes preserve real bridge clearance while permitting terrestrial cuts and tunnels. */
type Link = { to: number; rise: number };
export function boundedProfiles(
  preferred: readonly number[],
  links: readonly Link[][],
  floors: readonly number[],
  anchors: readonly (number | undefined)[],
) {
  const upper = anchors.map((a) => a ?? Infinity),
    upperFrom = anchors.map((_, k) => k);
  const propagate = (values: number[], from: number[], down: boolean) => {
    const pending = [...values.keys()],
      queued = new Set(pending);
    for (let cursor = 0; cursor < pending.length; cursor++) {
      const at = pending[cursor];
      queued.delete(at);
      for (const { to, rise } of links[at]) {
        const value = values[at] + (down ? rise : -rise);
        if (down ? values[to] > value + 1e-8 : values[to] < value - 1e-8) {
          values[to] = value;
          from[to] = from[at];
          if (!queued.has(to)) {
            queued.add(to);
            pending.push(to);
          }
        }
      }
    }
  };
  propagate(upper, upperFrom, true);
  const lower = floors.map((floor, k) => Math.max(floor, anchors[k] ?? -Infinity)),
    lowerFrom = floors.map((_, k) => k);
  propagate(lower, lowerFrom, false);
  lower.forEach((value, k) => {
    if (value > upper[k] + 1e-7)
      throw new Error(
        `Road grade anchors incompatible at node ${k}: ${value} > ${upper[k]} (lower from ${lowerFrom[k]}, upper from ${upperFrom[k]})`,
      );
  });
  const height = preferred.map((value, k) => Math.max(lower[k], Math.min(value, upper[k])));
  propagate(height, lowerFrom, false);
  return height;
}
