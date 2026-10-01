# Full-island cook and browser checkpoint — 2026-10-01

Open World #15 finished at source commit `f2ea51f`. Its latest measured source
census is `239b3d7`, seed 332/333, cook key `5ed3a2e1ef403447`. The current
main commit `fb9be1b` has a successful full cook and deployment at cook key
`a63aadebd81238bc`; its full-world browser capture is still invalid. The
measured cache sizes below belong to the earlier `a8e7fe1` checkpoint, seed
332, cook key `54fa54fd3fcc34f9`. They do **not** measure the final source.
These checkpoints use engine pin `7f810cbe344ee10fdcc910a8f5659e1536edbc2d`. The #15
`docs/COHERENT-WORLD.md` and `docs/island-preview.md` describe the source and
previews; the local #15 cook log and browser `capture-roof-range` diagnostics
record the historical attempts. Repeat the full cook and capture after source,
engine pin or cook input changes.

## Current full cook and published-site attempt

The [Site workflow for `fb9be1b`](https://github.com/pasquelin/Trillion3D-openworld/actions/runs/36852410322)
completed on 1 October 2026. Its `build` job succeeded in 1 h 27 min 8 s,
including the official full `pnpm run cook`, the three separate block workload
cooks, the page build and output checks. Its `deploy` job succeeded in 3 min
35 s. These are job durations, not isolated full-cook timings. The current
published `world.json` responded HTTP 200 with 3,424,707 bytes and SHA-256
`f39d9233770fdfd4d05b61557d006ec7c6394661a7eb68f530b7991428968b74`.
The native full manifest responded HTTP 200 with 236 bytes and SHA-256
`b6d86464a28c5c7901f713dfe4ba6f6c4c6adf2ccbb5c1df2f98f44fece9675d`.
The site, runtime and current cache are deployed. Published current
`world-roots.json` is 326,512,069 bytes (311.39 MiB) and `world-roots.bin` is
1,647,400,232 bytes (1,571.08 MiB); together they are 1,882.47 MiB. A
64-byte HTTP Range request to the binary returned 206,
`Content-Range: bytes 0-63/1647400232` and exactly 64 bytes. Current **aggregate** cache bytes
were not recovered from the CI logs. The earlier 2,577.01 MiB must not be
presented as the current aggregate cache size.

A bounded Chromium 151 / Debian 13 attempt used the published site, 1600 × 900,
WebGL2 SwiftShader requested, `V1-roof`, `--wait=10000`, `--timeout=420000`
and `--rpc-timeout=120000`. A temporary copy of `capture-island.mjs` allowed
only the official HTTPS origin and replaced `--no-proxy-server` with the cloud
HTTP proxy; its readiness, selected-triangle, exception and PNG checks were
otherwise unchanged. The initial readiness `Runtime.evaluate` call timed out
after 120 s. The runner never selected the route or wrote a validated PNG.
One renderer process was sampled above 5.5 GiB RSS during the attempt. This
software-browser failure does not establish the root cause or hardware frame
performance. Its `failure.txt` SHA-256 is
`9b274851aec030a5c02056ad84b545600af84f651ec0c24ddb65ecb9e5e540f0`;
its Chromium log SHA-256 is
`c2f744803249becc103f7db4cb5b0dcda9b7ab0206bc64178de8f866654b7e29`.
The local diagnostics remain outside Git. Instrument the browser's startup
stages and memory before attributing the stall to the engine, transport or
software renderer. A hardware capture of the same full scene is still needed.

## Latest source and preview

| Seed | Placed nodes | Unique mesh triangles | Eligible samples within 10 m | Road-water, bridge-deck and route failures |
| --- | ---: | ---: | ---: | ---: |
| 332 | 149,963 | 2,499,303 | 85.31% | 0 |
| 333 | 145,524 | 2,228,852 | 85.19% | 0 |

These are source census and validation results at `239b3d7`, not a native cook
or GPU benchmark. The earlier 2 × 2 km downtown diagnostic with local-street
surfaces reported 18,080 objects, 775 resident pages and 1,679,685 selected
triangles in WebGL2/SwiftShader, but its strict capture was invalid after one
`ERR_ABORTED` request. The later #15 district capture at `239b3d7` was valid:
17,925 selected objects, 775 resident pages, 1,500,478
selected triangles, no JavaScript exceptions or failed requests. The visible
frontages align with local streets; large grassy parcels and distant tower
artifacts remain. Neither regional capture passes the full-world render gate
or establishes interactive performance.

## Earlier completed full cook

| Observation | Result | Scope |
| --- | ---: | --- |
| Official full cook | Completed in 4,576.7 s; native compilation 1,529.9 s | Source and native cache generation |
| Drawn mesh nodes | 150,747 | Full cook input |
| Instance-expanded triangles | 479,030,012 | Full cook input, not a frame counter |
| Scene proxy triangles | 247,787 | Full cook output |
| Native peak RSS | 12.76 GB | Cook process, not browser RAM |
| Engine `cache/` on disk | 2,577.01 MiB | 3.22 × the historical 800 MiB planning estimate |
| `world-roots.bin` / `world-roots.json` | 1,574.68 / 309.60 MiB | Largest cache products |
| Whole cooked asset folder | 2,795.96 MiB | Includes source, heights, colliders and page JSON |

The first full-cache attempt before the tree mesh revision exhausted the
environment's 32 GiB memory limit near 97% of native compilation; a one-thread
retry also exhausted memory. Reducing repeated tree and bush mesh complexity
changed the estimated instance-expanded input from 1.863 billion to 494.5
million triangles on the prior node distribution, a 73.5% reduction. The later
completed cook measured 479,030,012 expanded triangles. The estimate and the
final measurement come from different checkpoints and are not a frame-rate gain.

The JSON table has 675,869 page records and 333,571 placed-primitive dependency
records across 315 cells. The browser reads the entire JSON table when opening
the scene. The binary supports byte-range fetches on the local server: a 64-byte
request returned 206 with 64 bytes, and an out-of-bounds request returned 416.
Range support avoids transferring the entire 1,651,175,180-byte binary at once;
it does not shrink the on-disk cache or eliminate startup work.

The full-world Chromium SwiftShader attempt with Range support ran for over 13
minutes without a valid route capture. DevTools then reported
`Runtime.evaluate timed out after 120000 ms`. No inspected full-island frame,
frame-time distribution, GPU timing or resident-memory measurement resulted.
The previous full-world smoke image had zero selected triangles. Both attempts
remain diagnostics, not successful render evidence.

A separate preview at the earlier source checkpoint compiled a 506 MiB native cache, with a
42 MiB `world-roots.json`. At 960 × 540 in Chromium WebGL2/SwiftShader, its
neighborhood view reached ready with 759 resident pages and 1,232,142 selected
triangles; the towers, aerial and district views also produced inspected captures.
These counts and images prove that generated subset geometry rendered in the
software backend. They do not establish full-world loading, hardware FPS,
streaming smoothness or full-world loading performance.

## Measuring the full-density scene and its loading

Unreal's World Partition streams nearby cells while hierarchical LOD (HLOD)
keeps distant groups visible with coarse proxies. Apply that pattern here as an
application-level prototype: keep one coarse proxy for the entire roughly 8 km
island loaded, split detailed geometry and colliders into region caches, and use
the public `scene.load` / `scene.remove` path to change active regions. Predict
regions ahead of vehicle and flight cameras; retain recently visited regions
with distance and time hysteresis so a boundary crossing does not unload and
reload them repeatedly. Changing the loaded model set currently reopens the
engine session. The [regional prototype](../regional-prototype.md) compiled an
8 km proxy and two tiny sectors (12.03, 7.90 and 9.70 MiB respectively). In one
headless WebGL2/SwiftShader run, west/east loads returned in 45/86 ms, but
new drawn frames arrived after 7,891/7,359 ms because two session reopens took
7,842.5/7,270.7 ms. This proves the public API can switch small models; it does
not demonstrate smooth streaming. A production regional system needs an SDK
path to mount and remove compiled models without reopening the session. That
engine capability must be resolved upstream; this application does not patch it.

This separates two measurements. **Active** transfer and residency can fall when
only nearby region data is loaded. **Total** cooked disk size will not fall just
because the 2,577.01 MiB cache is split into files. The historical
`world-roots.bin` alone is 1,574.68 MiB and its JSON index is 309.60 MiB.
Investigate measured HLOD for distant detail, shared meshes/materials, real instancing
or page deduplication for repeated trees and buildings, and compact procedural
seeds where reconstruction preserves appearance and collision. Count bytes and
dependencies after each change. The current density and long vistas are the test
workload; a smaller scene is not a fix. Compiler-format or engine API changes
belong upstream, not in this application.

The small proxy-and-two-sector prototype isolates the reopen cost. Next compare
identical camera poses and a boundary crossing with final-source region data
before expanding to the island. Record the following on a named hardware
profile at the fixed settings in [the protocol](README.md#named-hardware-measurement):

| Measurement | Workload expectation |
| --- | --- |
| Cold start | Record first useful frame and route-ready distributions over three cold runs; report timeouts as failures |
| Active data | Record first-frame transfer, resident geometry, textures and the configured pools separately |
| Total cooked disk | Record all native caches, persistent and regional products; no content cap |
| Flight crossing | No missing region; measure p95 and maximum hitch over three F2 runs on named hardware |
| Long vistas | At fixed summit, coast and flight poses, continuous island silhouette to the 8 km proxy extent; zero missing-region frames in stills and video |

These are protocol expectations, not measured results. Keep the same visual detail in near
views and compare captures before accepting a byte or timing improvement.

## Reproduce and accept

1. On a clean #15 source checkpoint, record the full 40-character application
   commit, engine pin, seed, cook key, hashes of `world.json` and the native
   manifest, compiler version, OS and RAM limit. Run `pnpm run cook` with a
   process time/RSS recorder; keep stdout and stderr. Measure `cache/`, the
   entire cooked folder, `world-roots.bin`, and `world-roots.json` in bytes,
   then convert to MiB using 1,048,576 bytes per MiB. Record growth without
   reducing world density to meet the old planning estimate.
2. Run `pnpm run build` and `pnpm run serve`. Check a valid 64-byte Range request
   returns 206 and exactly 64 bytes; check an invalid range returns 416. This
   checks transport only.
3. Run the [full-world route capture](README.md) with its output outside Git.
   Save the command, browser version, `capture.json`, image hashes, failure text,
   and browser log. Inspect each image. Mark the gate passing only when the
   actual full-world route has a nonzero selected-triangle count, no uncaught
   exception, and a visible 3D frame. A timeout remains a failed attempt.
4. Run the [named hardware protocol](README.md#named-hardware-measurement) on
   a specified CPU and GPU for frame intervals and residency. Use the
   [manifest template](manifest.template.json); publish unsupported counters as
   `unavailable`. Compare quality at the same camera poses before treating a
   performance change as an improvement.

The current disposition is **latest source census and regional preview capture
passed; current full cook and deployment passed; smooth regional switching
failed in the software prototype; published full-world browser capture failed;
hardware performance remains unverified**. The earlier full cook measured
2,577.01 MiB, dominated by world-roots files. Measure the current cache size,
then diagnose startup and capture the full scene on named hardware. No engine
change or hardware FPS claim is made here.
