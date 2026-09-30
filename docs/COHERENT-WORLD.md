# Coherent world implementation (#15)

The approved five-centre sketch guides original proportions; it is not an engine
capture. The source now composes a curved island, one continuous massif, gradual
foothills, rolling rural ground and organic ownership. Seeded coastal undulations
retain the 8 km frame, ocean margin and three detached islets. A smooth summit
ceiling bounds natural relief; the final composed altitude remains separately
measured. The intermediate 40 m census found 1,891 m; only 0.2096 km²
exceeded 1,800 m. These rare crests retain the existing `WORLD.peak = 2000`
contract and long-view geometry. The engine pin and 800 MiB envelope remain unchanged.

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
a public A-to-B demonstration route awaits integration with #21.

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

Full composed marker, route, collision and cache gates remain required before
publication. Final map/route validation must include #20 and #21. Source maps and
cook-time timing/memory are not native GPU captures or frame-performance evidence;
the user deferred that native verification. No engine source is modified.
