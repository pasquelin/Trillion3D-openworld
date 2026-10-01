# Full-island cook and browser checkpoint — 2026-10-01

This checkpoint reports observations from Open World #15, source commit `a8e7fe1`,
seed 332, cook key `54fa54fd3fcc34f9`, and engine pin
`7f810cbe344ee10fdcc910a8f5659e1536edbc2d`. The #15
`docs/COHERENT-WORLD.md` and `docs/island-preview.md` describe the source and
preview; the local #15 cook log and browser `capture-roof-range` diagnostics
record the attempts. These artifacts are tied to that checkpoint. Repeat after
any change to the application, engine pin, source or cook inputs.

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

A separate 2 × 2 km downtown preview compiled a 506 MiB native cache, with a
42 MiB `world-roots.json`. At 960 × 540 in Chromium WebGL2/SwiftShader, its
neighborhood view reached ready with 759 resident pages and 1,232,142 selected
triangles; the towers, aerial and district views also produced inspected captures.
These counts and images prove that generated subset geometry rendered in the
software backend. They do not establish full-world loading, hardware FPS,
streaming smoothness, or the 800 MiB full-world disk target.

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

The current disposition is **full cook completed; disk budget failed; preview
render passed; full-world render and hardware performance unverified**. The
largest measured bottleneck is the world-roots cache. Any reduction should be
made against a reproducible cache/capture baseline and retested for appearance,
loading, and residency. No engine change or hardware FPS claim is made here.
