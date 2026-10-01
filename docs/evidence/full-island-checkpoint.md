# Full-island cook and browser checkpoint — 2026-10-01

Open World #15 finished at source commit `f2ea51f`. Its latest measured source
checkpoint is `239b3d7`, seed 332/333, cook key `5ed3a2e1ef403447`. The
completed full cook, cache measurements and failed full-world browser attempt
below belong to the earlier `a8e7fe1` checkpoint, seed 332, cook key
`54fa54fd3fcc34f9`. They do **not** measure the final source. Both checkpoints
use engine pin `7f810cbe344ee10fdcc910a8f5659e1536edbc2d`. The #15
`docs/COHERENT-WORLD.md` and `docs/island-preview.md` describe the source and
previews; the local #15 cook log and browser `capture-roof-range` diagnostics
record the historical attempts. Repeat the full cook and capture after source,
engine pin or cook input changes.

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
| Engine `cache/` on disk | 2,577.01 MiB | 3.22 × the 800 MiB contract |
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
streaming smoothness, or the 800 MiB full-world disk target.

## Reducing scene weight

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

This separates two budgets. **Active** transfer and residency can fall when
only nearby region data is loaded. **Total** cooked disk size will not fall just
because the 2,577.01 MiB cache is split into files. The historical
`world-roots.bin` alone is 1,574.68 MiB and its JSON index is 309.60 MiB.
Reduce their underlying contents through measured HLOD for distant detail,
shared meshes/materials and real instancing or page deduplication for repeated
trees/buildings, and compact procedural seeds where reconstruction preserves
appearance and collision. Count bytes and dependencies after each change; any
compiler-format or engine API change belongs upstream, not in this application.

The small proxy-and-two-sector prototype isolates the reopen cost. Next compare
identical camera poses and a boundary crossing with final-source region data
before expanding to the island. Proposed acceptance targets on a named hardware
profile at the fixed settings in [the protocol](README.md#named-hardware-measurement):

| Gate | Proposed target |
| --- | --- |
| Cold start | First useful frame ≤10 s and route ready ≤30 s; record both distributions over three cold runs |
| Active data | ≤256 MiB transferred to first route frame; resident geometry ≤512 MiB and textures ≤256 MiB, measured separately |
| Total cooked disk | All native caches together ≤800 MiB, including persistent and regional products |
| Flight crossing | No missing region; frame-interval p95 ≤33.3 ms and maximum hitch ≤100 ms over three F2 runs |
| Long vistas | At fixed summit, coast and flight poses, continuous island silhouette to the 8 km proxy extent; zero missing-region frames in stills and video |

These are targets, not measured results. Keep the same visual detail in near
views and compare captures before accepting a byte or timing improvement.

## Reproduce and accept

1. On a clean #15 source checkpoint, record the full 40-character application
   commit, engine pin, seed, cook key, hashes of `world.json` and the native
   manifest, compiler version, OS and RAM limit. Run `pnpm run cook` with a
   process time/RSS recorder; keep stdout and stderr. Measure `cache/`, the
   entire cooked folder, `world-roots.bin`, and `world-roots.json` in bytes,
   then convert to MiB using 1,048,576 bytes per MiB. Recheck the 800 MiB limit.
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
passed; smooth regional switching failed in the software prototype; final-source
full cook, disk budget, full-world render and hardware performance unverified**.
The earlier full cook completed but missed
the disk budget by more than 3×. Its largest measured products were the
world-roots files. Retest the final source for cache size, appearance, loading
and residency before accepting any improvement. No engine change or hardware
FPS claim is made here.
