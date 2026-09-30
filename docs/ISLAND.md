# Original island: finite delivery plan for Open World #15

Prepared for #17 on 2026-09-30. Design proposal, not generated-world evidence. Application frame: 8,000 m square, metres, Y up, +X east, +Z south; seed 332. Only Open World source and pinned public engine APIs may change.

## What proceeds now

The maintainer authorized application work while engine-dependent tests are deferred. Open World #3 (streamed render heightfield, upstream #413) and upstream #1361 (native character platform behavior) stay deferred and separately tracked. Existing triangle terrain remains the implementation path. These issues do not need to be resolved to author deterministic geography, streets, assets and benchmark routes. Parent #15 cannot claim hardware performance or deferred engine behavior is validated.

## Reference versus design

The inspected GTA V maps establish qualitative contrasts: concentrated city, open hinterland, coastal industry, airport, winding mountain access and large changes in visibility. They establish no reliable building counts, heights or exact density ratios. No GTA outline, district map, model or texture enters the application.

All values below are original design choices. The current generator has a south coast with land reaching other map edges; an enclosing ocean requires changing the *final* terrain composition, not just adding a water plane. Its six regional rectangles can remain generator ownership bounds initially. Land-use areas are measured classes, not those rectangular bounds.

## Geography contract

Target 42 km² land and 22 km² ocean in the 64 km² frame, with initial tolerance ±3 km². Reserve a minimum 250 m ocean margin on every outer edge. Main land is one connected island; existing decorative offshore islands may remain if they fit inside the sea margin. Retain the 2,000 m summit envelope, with a mountain spine in the north interior, western dry plateau, eastern wooded/farming belt and southern urban coast. Do not shrink the image's terrain detail to satisfy content budgets.

| Exclusive land-use class | Chosen area | Geographic intention |
| --- | ---: | --- |
| Mountain | 10 km² | North interior ridge; summit sees city, airport and coast |
| Desert | 7 km² | Western plateau, sparse settlement and exposed long view |
| Countryside/woodland | 9 km² | Eastern foothills; clustered vegetation and open fields |
| Urban neighborhoods | 8 km² | Southern bay, connected to airport and harbor |
| Airport | 3 km² | Existing central platform initially retained; no runway at shore edge |
| Port/industry | 1 km² | Southern sheltered bay; meaningful shoreline access |
| Beach/coastal nature | 4 km² | East/southeast sandy shore, north/west rocky sections |
| Total land | 42 km² | Roads and inland water remain inside their host classes |

The 8/3/1 km² built areas are targets across actual usable ground, not new rectangular generators. Record measured areas on a 25 m sampling grid with explicit precedence: sea, airport, port, urban, mountain, desert, countryside, residual coastal nature. Coastal nature is an explicit zone, not all unclassified land. Publish the classified map and absolute/relative error. Revise chosen targets visibly if runway, dry land or road constraints make them impossible; do not silently count overlapping areas.

Coast profiles: low sandy southeastern beach roughly 1.2–1.8 km long, rocky northwestern headlands, sheltered southern harbor inlet. Inland biome transitions use the existing 200 m blend; shoreline height must remain smooth and below sea at the whole outer perimeter after refinement, road cuts and platforms. Ground below sea excludes buildings, vegetation, roads and land spawns. Boat/swimming behavior is outside this batch. Vehicles reaching deep water use an explicit return-to-last-safe-ground action; flight reaches a documented playable envelope and has an explicit return action, without an invisible collision wall masquerading as scenery.

## Urban targets

Replace uniform distance rings with a small set of district zones oriented to main roads, coastline and slope. Keep reusable procedural catalogues and placement rejection. Start with three connected contrasting neighborhoods, not a whole new asset pipeline.

| District class | Share of 8 km² urban land | Building density target | Height range | Building footprint coverage |
| --- | ---: | ---: | ---: | ---: |
| Low-rise residential | 4.0 km² | 900–1,400 buildings/km² | 5–15 m | 12–20% |
| Mid-rise mixed streets | 2.5 km² | 200–320 buildings/km² | 15–50 m | 8–16% |
| High-rise center | 0.8 km² | 70–110 buildings/km² | 80–220 m; one existing 310 m landmark permitted | 10–18% |
| Parks/plazas/civic sites | 0.7 km² | Report separately | Site-specific | Report separately |

These targets imply roughly 4,156–6,488 urban buildings, excluding civic sites and port. Count buildings using explicit catalogue/instance metadata, not every prop or arbitrary ID substring. Density denominator includes each district's streets and open lots; report dry usable area and placement rejection separately. Coverage is union of building footprints divided by district dry usable area. Trees, lamps and benches do not count as buildings. Coverage and density use different stated denominators; derive actual mean building footprint from the measured count and dry district area. Low-rise targets assume mostly 80–200 m² house footprints with gardens, mid-rise roughly 300–700 m² blocks, and high-rise roughly 1,000–2,000 m² towers. Density/coverage ranges are coupled feasibility envelopes, not every endpoint combination. Avoid claiming compliance from source mesh counts.

Road frontage should vary: attached/closely spaced mid-rise facades, low-rise gardens and setbacks, high-rise plazas and parking/service access. A city district must have an accessible sidewalk loop and at least two road connections. Reject building/road, building/water and building/building overlap deterministically. Retain visual detail; no blanket node increase solely to inflate placement totals.

## Connected travel plan

Reuse `plan/network.ts`, grade limits and bridge/tunnel handling rather than creating a second route solver. Route checkpoints resolve from actual generated settlements/markers, not invented absolute positions. One paved loop links city → western desert town → northern mountain foothill town → eastern countryside town → east beach town → airport interchange → city. The mountain summit is a graded pass/trail spur; the port and terminal are paved spurs. Runways/taxiways are not public highway edges.

Prove graph connectivity using geometric segment junctions, bridge levels and traversable grade; nearest points alone cannot establish a junction. Snap derived checkpoint coordinates to the validated road/trail graph. Roads that cannot be routed are reported as failed required connections, not silently omitted.

| Route | Fixed workload | Evidence to record |
| --- | --- | --- |
| W1 city walk | 600–900 m loop through mid-rise frontage, low-rise edge and center plaza; 1.7 m eye height | Facade continuity, sidewalks, close geometry and collisions |
| D1 island drive | Paved loop through all five land contrasts, then port/terminal spurs; speed schedule 0/30/60/90 km/h within allowed road classes | Streaming readiness, collision stalls, road slope and transition coherence |
| V1 fixed vistas | Summit, center roof, harbor, beach, desert ridge, wooded overlook; 60 s each | Far visibility, selected geometry, stable coverage and residency |
| F1 flight | Terminal departure, 300 m-above-ground circuit, 800 m summit clearance, city/beach descent, airport return; speed schedule 40/100/160 m/s | Fast cache turnover, re-entry and visible holes; engine flight acceptance deferred separately |
| N1 night | Same W1/D1 geometry and poses at fixed night time | Lights/shadows and image quality under equal settings |

Distances and duration come from generated routes; the stated ranges/speeds are initial test design values, not measured gameplay speeds. Record exact coordinate/rotation/time samples after generation, seed, content hash and engine pin so later runs replay the same path. Fast-flight camera replay is a renderer workload and can proceed even when native vehicle acceptance is deferred.

## Assets and geometry complexity

Two existing verified CC0 sources complement procedural buildings:

- Kenney Starter Kit City Builder at `4535092b740b378b700efd9df9e27a631815b84a`: model assets CC0; project code MIT. Inspected small building: 600 indexed triangles, one material, external atlas.
- KayKit City Builder Bits 1.0 at `63976910ca04d16f0fc531b9c614244be8128713`: public asset pack CC0. Inspected building H: 1,885 indexed triangles, one material, shared 1024² atlas. Paid extras are not included.

Import a small representative subset with source/revision/asset license, exact byte sizes, mesh triangle counts, material/texture dimensions, units, bounds and collision choice. Verify the public engine loading/cooking path first. Do not build a general asset converter unless the existing source path actually cannot handle these files.

These packs exercise instancing and silhouettes, not heavy geometry or PBR diversity. Add one original procedural detailed street block using existing TypeScript kits: facade frames, balconies, roof equipment and varied material slots. Provide *separate reproducible workload presets* (e.g. one block / four blocks / sixteen blocks) with identical asset quality and resolution; triangle and material totals are generated observations. Do not artificially subdivide flat surfaces or claim high detail from repeated source totals. More third-party PBR packs require separate verified provenance before selection.

## Measurement protocol

No representative hardware result exists yet. Current 512 MiB geometry and 256 MiB texture pools remain the initial renderer settings; 800 MiB cache is a cooked-disk envelope, not total runtime memory. Preserve current 40 traffic/60 pedestrians as the base profile; population stress is a separate named run.

Dedicated measurer records hardware, OS, browser/backend, engine commit, world hash, resolution, camera, detail and pool settings. Repeat cold and warm W1/D1/V1/F1/N1 three times without concurrent build/cook. Publish frame-time p50/p95/p99 and worst stalls, CPU/GPU timing separately where supported, selected/rendered/instance-expanded triangle counts where exposed, live instances, geometry/texture residency, process/GPU memory where measurable, transfer bytes and latency, collider readiness, and visual captures. Unsupported counters are `unavailable`, never inferred from source counts. Do not add asynchronous CPU and GPU timing.

An optimization begins only after an identified bottleneck. Compare equal image quality, route and settings; keep visual proofs alongside timing. Choose a frame budget only with the named target hardware. Software/headless runs can prove loading and replay, not PC-game GPU performance.

## Delivery order and smallest first slice

1. **Enclosing island terrain**: complete perimeter ocean and connected dry land, keeping current triangle terrain and region catalogues. This is the first smallest source change: a shared coast envelope applied before dependent planning and enforced after composed terrain shaping, meaningful perimeter/connectivity/placement/road tests, and deterministic area report. No new models, populations or gameplay changes in that PR.
2. **Three coherent urban districts**: road-facing low/mid/high neighborhoods with explicit building density metadata/report.
3. **Vetted asset subset and detailed block workload**: limited import and repeatable complexity presets, provenance included.
4. **Traversable landmarks and deterministic replay routes**: route graph proof, boundary return and fixed camera scenarios.
5. **Measurement evidence**: dedicated hardware profile captures/counters, then separately scoped optimization issue from observed cost.

Delivery tasks: #18 enclosing island; #19 urban districts; #20 vetted assets and detailed block; #21 traversal routes; #22 measured evidence. #15 remains the tracking parent; Open World #3 and upstream Trillion3D #1361 remain separately tracked and deferred.

## Reference sources

- GTA V geographic reference maps: https://github.com/gta5-map/gta5-map.github.io and https://github.com/DurtyFree/gta-v-map-leaflet . No exact density measurements are asserted.
- Kenney public source and asset license: https://github.com/KenneyNL/Starter-Kit-City-Builder/tree/4535092b740b378b700efd9df9e27a631815b84a .
- KayKit public source and asset license: https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/tree/63976910ca04d16f0fc531b9c614244be8128713 .

## Urban area revision from #19

The completed enclosing-island terrain with the city plain contains only 4.745 km² of dry land in the current city ownership rectangle (seed 332, 25 m census excluding river banks and water). The initial 8 km² urban design cannot fit there. #19 therefore chooses 2.2 km² of foundation-safe, road-connected catchments: 1.00 km² residential, 0.80 km² mixed streets, 0.25 km² center and 0.15 km² civic spaces. The generated total is 2.109375 km²; original area targets and their errors remain explicit in the report. Density, height and coverage targets are retained. [URBAN.md](URBAN.md) records the actual building counts, definitions and reproduction command. This changes the urban area design; it does not claim that the initial exclusive land-use table was satisfied. A final whole-island land-use census must report the remaining land under its actual classes.
