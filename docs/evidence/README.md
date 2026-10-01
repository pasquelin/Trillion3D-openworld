# Island render and performance evidence

Issue #22 has two separate gates. A software browser can prove that the **actual cooked
world** loads and draws a selected route. Only a named hardware run can establish the
island's frame times, memory behavior and game performance. Keep their results separate.

The [October 2026 checkpoint](full-island-checkpoint.md) records the completed #15
full cook, its disk budget miss, a bounded full-world browser attempt, and the
separate downtown preview. It is an input to this protocol, not a passing full-island
render or performance result.

## Capture the cooked world

1. From a final, clean application commit, record `git rev-parse HEAD`, the engine pin
   in `package.json`, the cook key, seed, hashes of `dist/assets/<key>/world.json` and
   `dist/assets/<key>/cache/native/full/manifest.json`, and the browser version.
2. Run `pnpm run cook`, `pnpm run build`, then `pnpm run serve` without another cook or
   build in progress. Do not commit `dist/` or cooked assets.
3. On a machine able to run local Chromium, run:

   ```sh
   node scripts/capture-island.mjs --url=http://127.0.0.1:4180/ --out=/tmp/island-vista --route=V1-summit
   ```

   Repeat with `V1-roof` for the city, `V1-harbor` for the coast, and `F2` for the
   airport-to-airfield departure. Confirm each ID exists in the actual page selector.
   Start with `--wait=10000` milliseconds and `--timeout=90000` for a bounded
   attempt. For a slow but progressing full-world load, record the reason and use
   a larger overall timeout plus `--rpc-timeout=120000` (milliseconds). A screenshot is saved only after the
   loading overlay is gone, the route is selected, no uncaught exception was captured,
   and the page reports a positive count of **selected** triangles. Inspect the PNG
   by eye as well: a positive counter alone does not prove visible geometry.

4. Save `capture.json` beside each PNG and hashes for both files. Keep a failed
   `failure.txt` and `chromium.log` as diagnostics, never relabel a failed capture as
   proof. A SwiftShader screenshot can establish appearance and loading only. Do not
   infer FPS, GPU time or hardware residency from it.

The route runner uses the application's existing replay button and the public engine
render path. It does not synthesize geometry or draw a diagram. It requires a browser
where Chromium DevTools and local sockets work. This managed cloud currently fails
Chromium's crashpad `setsockopt` inside its filesystem sandbox. Its unsandboxed
`--dump-dom` probe timed out, but DevTools successfully reached a local browser page.
An earlier smoke image had zero selected triangles. A later full-world attempt
remained blocked for over 13 minutes even with HTTP Range support and ended at a
120-second DevTools evaluation timeout. Neither is full-island 3D evidence. The
final cooked island still needs a valid inspected capture.

## Named hardware measurement

Choose and publish a target CPU, GPU, RAM, OS, driver, browser, renderer backend,
1600 × 900 or another fixed resolution, detail, render scale, geometry pool (initially
512 MiB), texture pool (initially 256 MiB), and frame budget. Keep base population at
40 vehicles and 60 pedestrians. A larger population is a separately named profile.

For each of W1, D1, V1, F1 and N1, and the one, four and sixteen block fixtures:

- Run three cold and three warm repeats with the same route samples, seed, world and
  engine hashes. Define cold as a fresh browser/process and empty application cache;
  define warm as the same route after its pages have loaded. Record run order.
- Capture every presented frame interval; report p50, p95, p99 and maximum stall for
  each repeat and the spread across repeats. Also record loading time, streaming
  latency and collider readiness with timestamped events where exposed.
- Record CPU and GPU timings in separate columns with their exact supported timing
  API. Do not add asynchronous CPU and GPU timings. Count selected, rendered and
  instance-expanded triangles separately where exposed; source-authored triangles
  are a separate static fact.
- Record live instances, resident pages, geometry and texture residency, transferred
  bytes, process RAM and GPU memory where measurable. Use the literal `unavailable`
  for unsupported counters. A configured pool is a budget, not measured residency.
  The 800 MiB cooked-disk envelope is not runtime RAM.
- Attach still and moving captures of coastline, district frontage, summit distance,
  night lights and route re-entry. Note visual holes, collisions and stalls by route
  sample and timestamp. Inspect output at equal image quality before choosing a
  narrowly scoped optimization.

Native engine acceptance remains deferred until Open World #3, Trillion3D #413 and
#1361 are ready. Software replay or source counts do not close that hardware gate.
