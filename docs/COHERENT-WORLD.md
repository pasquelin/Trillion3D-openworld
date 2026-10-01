# Coherent world implementation (#15)

The approved five-centre sketch guides original proportions; it is not an engine
capture. The source now composes a curved island, one continuous massif, gradual
foothills, rolling rural ground and organic ownership. Seeded coastal undulations
retain the 8 km frame, ocean margin and three detached islets. A smooth summit
ceiling bounds natural relief; the final composed altitude remains separately
measured. The intermediate 40 m census found 1,891 m; only 0.2096 km²
exceeded 1,800 m. These rare crests retain the existing `WORLD.peak = 2000`
contract and long-view geometry. The engine pin is unchanged. The earlier native cache measures 2,577.01 MiB; 800 MiB was an old planning
estimate, not a limit on this full-world stress scene. Measured sizes follow.

`geography.ts` owns five anchors and two airfield reservations. The richer #19 city
builder consumes all five settlements, with a single shared catalogue, qualified
secondary identifiers and one fixed city node allowance. Primary towers and dense
frontages retain their own census; secondary cores use actual 50–140 m buildings.
Each core reaches a real arterial, including shared highway access where adding a
second identical road would duplicate geometry. Terrain grading blends around
rounded urban catchments; river carving and airport earthworks retain priority.

The western field contains two actual 2.4 km runways and its existing terminal,
freight and landside geometry. Its terminal faces east in the shared terrain/site
frame. The northeast field adds a physical 900 m runway, taxiway, terminal, hangar
and distinct landing/spawn markers. Operational strips/pads differ from routing
reservations: their smooth earthworks and biome masks release unused corners to
natural terrain and rural content. The two destinations support free flight;
the #21 public replay controls expose a separate F2 A-to-B camera route. Its southern lowland corridor bakes terrain clearance into a profile bounded to 8% climb/descent, with exact runway marker endpoints. This is a source camera workload; native piloted flight validation remains deferred.

Village/farm geometry is retained. Additional homes occupy selected accessible
lowland and 30–250 m rural land on approximately 50 m plots, through existing foundations and
occupancy checks. Understory infill visits 18 m cells, prioritizes routes and
settlements, respects remaining regional node allowances and protects operational
strips. Countryside woodland retains 25% of its node allowance for distributed
infill. Shared forest patches fit every actual tree root as well as ground samples,
so accepted tree bases neither float nor bury their crowns. Sloped patches rotate
along their actual downhill direction; forest cells sample partial ownership
instead of cutting whole 250 m cells at a single centre. Organic lake outlines are
shared by water geometry, basin carving, erosion, ground stamps and jetty placement.

`node scripts/world-report.ts --out=...` produces actual placements, composed
terrain map inputs and an after-placement proximity census. Distances use retained
actual mesh vertices projected horizontally, rather than bounding boxes or
instance counts. Thinning can understate coverage. Quantiles are censored at 30 m;
water, operational fields, roads and steep cliffs are reported separately.
Approximately 10 m coverage is a local target, not a proved whole-island promise.
The initial `fill.empty` count is separate from the final proximity observations.

The final source census includes #15 city density and local-street surfaces, #19,
#20 and the tested local #21 route source.
The 281-test source suite passed at the preceding world checkpoint; targeted
vegetation, stand and countryside checks pass after the tree-mesh reduction.
Source maps and cook-time timing/memory are not native GPU
captures or frame-performance evidence. No engine source is modified.

The integrated road solver preserves 6 m clearance above actual water surfaces,
including positive-altitude rivers. It permits cuts and real tunnels where
terrestrial profiles need lowering. Bridge decks follow graded road segments;
their barriers open at shared T junctions on both branches. Fixed urban arterial
junctions and operational airfield anchors prevent a mountain road from lifting
all lowland junctions. The west city access uses a southern lowland corridor and
the mountain village sits on an accessible foothill; both remain connected within
the 10% road grade limit. Incompatible bridge/anchor grade intervals fail explicitly.
The generated road water census samples the centre and edges of complete road
segments every 10 m against the exact emitted ocean, river and lake surfaces.
Coastal component labeling uses the largest land component, so an island enclosed
by sea retains a real mainland beach and its F1/V1 landmarks.

The desert town is planned beside, but outside, the western runway reservation.
Its compact oasis follows natural ground: a pool, a level palm grove, a 25 m ring,
two local streets and a track reaching an existing highway vertex. Candidate
sites are checked for water and at most 10% grade every 5 m along the centre and
both shoulders. A bounded contour search supplies a route where a direct track
would climb a dune face. The pool has a visible six-metre stone foundation. The mountain
town is sought on the foothill below 500 m. Churches use masonry retaining
terraces up to 17.5 m where the terrain and authored routes leave no flatter
footing; the placed floors and terraces satisfy the regional ground tests.

`python3 scripts/world-map.py REPORT_DIRECTORY docs/captures/coherent-world.png`
renders the final source map from the census inputs, actual building footprints,
shared stand tree roots and the same organic lake outline. Its adjacent JSON
records the source cook key, engine pin, census hash and map/PNG SHA-256 hashes.

## Integrated source measurements

The measured source checkpoint is `239b3d7`,
with cook key `5ed3a2e1ef403447`. Both censuses include the #15 city density and
local-street surface changes as well as #19, #20 and the tested local #21 route
source. These are source-generation observations; GPU performance
requires a separate check.

| Seed | Placed nodes | Unique mesh triangles | Mesh buffers | Homes | Eligible samples ≤10 m | Eligible samples ≥30 m | Generation |   Peak RSS |
| ---- | -----------: | --------------------: | -----------: | ----: | ---------------------: | ---------------------: | ---------: | ---------: |
| 332  |      149,963 |             2,499,303 |   100.93 MiB |   671 |                 85.31% |                  0.47% |   113.95 s | 749.68 MiB |
| 333  |      145,524 |             2,228,852 |    88.93 MiB |   496 |                 85.19% |                  1.60% |   127.12 s | 733.31 MiB |

The 90th-percentile distance is 11.13 m / 11.33 m; the 95th percentile is
13.30 m / 14.17 m. Operational fields, roads, water and steep cliffs are excluded
and counted separately. Seeds 332 / 333 retain 247 / 854 eligible cells at least 30 m from
retained mesh witnesses. Airport and coast node allowances remain saturated at
15,000 and 40,000 respectively. The separate gap map displays this residual;
the approximately 10 m target is not achieved everywhere.

| Seed 332 centre | Buildings | Maximum building height | Maximum roof altitude | Building footprint union | Dry urban blocks | Roads |
| --------------- | --------: | ----------------------: | --------------------: | -----------------------: | ---------------: | ----: |
| Primary south   |     1,534 |                 315.5 m |               332.3 m |               395,532 m² |        2.203 km² |   263 |
| West            |       318 |                 125.4 m |               150.6 m |                66,181 m² |        0.438 km² |    60 |
| Interior        |       555 |                 125.4 m |               257.2 m |               132,482 m² |        0.828 km² |    94 |
| Northeast       |       325 |                 125.4 m |               267.5 m |                72,900 m² |        0.469 km² |    63 |
| East            |       385 |                 125.4 m |               143.6 m |                84,604 m² |        0.516 km² |    76 |

The footprint column sums designated dry district catchments; the primary core
also has 236 grid-street-facing terraces outside those catchments, with 128,856 m²
of additional physical footprint and 77 boulevard oaks. Its Bay Center downtown
catchment now has 107,336 m² of building footprint across 0.266 km² of dry blocks,
or 40.41% coverage, versus 13.93% before the density change. Every centre has a
connected street component and physical buildings. Composed
40 m relief samples reach 1,890 m / 1,899 m. Both seeds report no traversal
validation failures. Road-water checks find 0 submerged samples out of 1,275
wet samples on seed 332 and 659 on seed 333 (102,270 / 113,388 road samples).
The 34 / 21 emitted bridge bays
match their graded road decks with no mismatch. D1 uses the actual graded
mountain pass off the lowland ring; its connector joins the authored centreline.
F2 is a camera replay with exact
separate airfield endpoints, source terrain clearance and an 8% maximum vertical
gradient. Piloted flight and native GPU validation remain deferred.

The cableway settles its physical supports before solving the final sagging spans.
Both emitted cable lines and cabin paths are checked at intervals no greater than
10 m on both composed seeds. The stations have bounded boarding clearance; away
from them the cable remains at least 14.5 m above terrain. Real pylon variants
extend to 120 m for the concave mountain/lake crossing. Refused supports remain
counted separately; incompatible clearance fails explicitly.

The versioned [source map](captures/coherent-world.png),
[gap map](captures/coherent-world-gaps.png),
[provenance](captures/coherent-world.json) and source censuses for
[332](captures/coherent-world-census-332.json) /
[333](captures/coherent-world-census-333.json) record this exact source checkpoint.
The main map displays composed relief, five centres, physical building footprints,
roads, both airfields, water and actual vegetation roots.
The [district WebGL2 capture](captures/coherent-world-district.png) and its
[capture record](captures/coherent-world-district-capture.json) show the current
2 × 2 km preview on source head `239b3d7`.

## Validation

The exact seed-332/333 source census above ran on `239b3d7` and passed road-water,
bridge-deck and traversal audits on both seeds. The local #15 density tests,
TypeScript, ESLint, Prettier and line-count gate passed on the immediately prior
city commit `8bf2005`; the road-surface change was checked by its focused tests
before `3cb49bf`. At historical source commit `a8e7fe1`, the direct Prettier,
ESLint, TypeScript, Knip, line-count and build gates passed. The 281-test full suite
passed on the preceding `4d5a489` checkpoint; vegetation, stand and countryside
tests passed on `a8e7fe1`. The
seed-332 desert test separately checks that each local street follows the true
ground at intervals no greater than 5 m, stays below 10% longitudinal grade,
and reaches a real highway node through the walking travel graph. The new source
census repeats road-water, bridge-deck and authored traversal audits on
both seeds; neither seed has a reported failure.

The first official full cache attempt at `4d5a489` reached 97% of native
compilation but exhausted this environment's 32 GiB memory limit while expanding
155,342 drawn mesh nodes into the scene proxy. A second native-only attempt with
one thread also exhausted memory. The repeated tree and bush meshes were then
reduced while keeping their placement rules, species and measured canopy dimensions.
On the previous glTF node distribution, the sum of per-mesh triangles multiplied
by placement counts falls from 1.863 billion to an estimated 494.5 million
(73.5% lower). This is an input-load estimate, not a GPU frame measurement.

The historical official `a8e7fe1` cook completed with the pinned native compiler after
4,576.7 s (including 1,529.9 s in native compilation). It selected 150,747
drawn mesh nodes and 479,030,012 instance-expanded triangles. Its scene proxy
has 247,787 triangles and reached 12.76 GB native peak RSS. The engine's
`cache/` directory occupies **2,577.01 MiB**; the earlier 800 MiB planning
estimate does not limit authored content;
the whole `dist/assets/54fa54fd3fcc34f9/` folder including source, heights,
colliders and page JSON occupies 2,795.96 MiB. The largest cache products are
`world-roots.bin` (1,574.68 MiB) and `world-roots.json` (309.60 MiB). These
measurements expose a cooked-disk bottleneck at that checkpoint despite successful
compilation; they do not establish runtime frame rate or residency for current source.

The `world-roots.json` table contains 675,869 page records (199.19 MB) and
333,571 placed-primitive dependency records across 315 cells (120.57 MB). The
compiler builds world-space super-roots for every placed primitive, so repeated
instances still contribute pages and dependency lists. The browser reads this
entire JSON table at scene open. It fetches only requested ranges of the
1,651,175,180-byte binary when the host supports HTTP Range. The local
`scripts/serve.ts` now responds with `206 Partial Content` for such requests;
without Range support it sent the whole binary. A local 64-byte request returned
exactly 64 bytes, and an out-of-bounds request returned `416`. This fixes the
local transport but does not reduce cache size or the full-table startup cost.

## Terrain evaluation experiment

Factoring repeated pure `natural(x,z)` evaluations preserves arithmetic and
resolution. On the same local source, an isolated tile 4,5 bake decreased from
61.04 s to 34.30 s (43.8%). The 25 m sampled raw-height digest and the exact
terrain-mesh plus texture-byte hash were identical before and after:

- Height digest: `3f2e2d077f59caee5177849997e411f776e2801f3bc680c22c7a61e20ce496f2`.
- Mesh/texture hash: `c57db1e74ad80e9dce4d124755c2c3c96a8472092b01ea9f4e7db6101ed1e8c0`.

The tile retained 399 triangles and a 2,612² texture. This is a measured source
bake improvement; it does not establish frame-rate or cache performance.
