# Street workload browser acceptance — 2026-09-30

The three cooked profiles pass functional and visual acceptance on the explicitly selected WebGL2 software fallback. This is not a hardware performance benchmark or a full-island acceptance.

## Environment and method

- Source worktree: `20-city-assets`, base HEAD `830d9d4efaa0ce31d43f24b904477ab655a3aaad`, plus the uncommitted asset/workload changes and lit viewer supplied by the issue owner.
- Engine pin: `7f810cbe344ee10fdcc910a8f5659e1536edbc2d`.
- Chromium 151 headless, viewport and canvas 1280 × 720, DPR 1.
- Actual backend: WebGL2; device: ANGLE (Google, Vulkan 1.3.0, SwiftShader Device Subzero), software driver. No hardware GPU performance claim.
- Each profile loaded its actual cooked manifest through the public engine API. The existing page buttons selected the fixed facade and skyline camera poses. Screenshots were captured and individually inspected.
- The same directional and hemisphere lighting, source meshes, textures, memory budgets and facade geometry were used in all profiles. Density grows by block count; quality remains constant.

## Evidence

| Profile | Building instances | Skyline selected/drawn triangles | Skyline draw calls | Facade selected/drawn triangles | Geometry allocation bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| one-block | 6 | 73,107 | 602 | 15,692 | 8,804,808 |
| four-blocks | 24 | 292,428 | 2,408 | 15,692 | 35,219,232 |
| sixteen-blocks | 96 | 1,169,712 | 9,632 | 15,692 | 140,876,928 |

These are actual public `world.onFrame` counters from the sampled camera frames, not FPS measurements. Every facade sample reported 128 draw calls. All profiles reported 339 resident pages and a configured 536,870,912-byte geometry envelope. Texture residency counters were unavailable on this backend; they are not estimated. Counters describe this WebGL2 fallback and do not predict WebGPU instancing or draw-call behavior.

All three viewers reached `ready: true`. No uncaught JavaScript exceptions were captured. Two canceled requests were recorded across page navigation; these were `net::ERR_ABORTED`, not failed asset-load assertions.

A focused repeat on the revised viewer with its graphics selector, retry button and bounded loading used Chromium's actual pointer and keyboard input. Facade and skyline buttons moved the camera to the authored poses. Selecting four blocks from one block preserved `renderer=webgl2` in the URL and the visible graphics selector, loaded successfully, and pressing Retry reloaded that same profile and backend successfully. No uncaught exceptions occurred. Evidence: `ui-results.json`.

The six PNGs adjacent to this report show the actual near-facade geometry and each growing skyline. Inspection confirms window frames, balconies, railings, rooftop equipment, repeated detailed buildings, and the two colorful CC0 building variants with visible atlas textures. The sixteen-block scene remains a deliberately repeated test grid, not an organically populated finished city.

## Defects found and addressed

The original viewer contained no lights, producing black silhouettes on the otherwise working WebGL2 path. The issue owner added consistent public lighting and an explicit background; the revised six views pass inspection. Diagnostic stage reporting and camera reapplication after scene load were also added.

Automatic WebGPU selection on this software machine failed acceptance: scene metadata loaded but visible-page waits did not settle, and `WEBGPU_LOST` / `OperationError: A valid external Instance reference no longer exists` followed. Earlier evidence remains under `webgpu-attempt/`. This is an observed software-environment limitation; no claim is made about hardware WebGPU. The public `renderer=webgl2` option produced the working proof. No engine code or private engine API was changed.

## Limits

No frame-rate, hardware GPU timing, complete-island streaming, gameplay, collision, weather, full route or ocean-boundary acceptance is established by this fixture. A final materially changed source or cook requires a focused repeat. The tested lighting/viewer updates were present in dist at capture time; the owner must preserve them in the final commit and publication build.
