# Road-facing neighborhoods and the building census

Issue #19 keeps the existing procedural building geometry and shared instances. District borders follow the avenue frame and the available dry, foundation-safe blocks. Garden Reach lies west of Market Ward; Bay Center rises around their shared avenue junction. These are original neighborhoods, not copied GTA districts.

A low-rise block has sixteen houses: ten fronts on the long streets and six small cottages on the side streets. The garden lawn fills the supporting block plinth so roots and fences do not float over sloped ground. A protected three-block interface keeps civic placements out of the shared residential/mixed/center walking junction. The catalogue's wider garage house does not fit these narrow garden lots; it remains available in the catalogue. Buildings are placed before garden furniture so later homes are not rejected by a previously placed tree. Mid-rise streets retain four detailed apartment fronts around a courtyard. Selected center blocks hold two small offices around a pedestrian/service plaza, while other blocks retain large tower podiums. Only the existing nominal 310 m landmark exceeds the normal tower envelope; its actual maximum vertex height is reported (315.5 m).

`pnpm run report:urban -- --seed=332 --out=dist/urban-report` writes `districts.json` and `districts.svg`. The report records the engine pin, seed, content hash, unique source triangles and meshes, prop placements, explicit building placements, individual heights/footprints, district catchments, dry area, density, coverage, road access, sidewalk circuits and rejection reasons. It is generated evidence; cooked meshes and report artifacts remain ignored. The SVG is a plan diagram, not a screenshot or GPU performance result.

Building membership is declared from catalogue arrays. Trees, lamps, fences, signs, rooftop furniture and source mesh names cannot accidentally become buildings. Height is the actual maximum mesh Y above its placement origin, excluding buried foundations. Footprints are conservative oriented rectangles used by occupancy. Because accepted building footprints do not overlap, their sum equals their footprint union; this counts podium/porch envelopes rather than claiming an architectural wall-area survey.

District density divides buildings by the disjoint full-pitch block catchments, including half of adjacent streets and open lots. Coverage divides footprint union by the dry part of those catchments, sampled at at most 25 m spacing. Rejected water, slope, road, occupied and disconnected blocks remain explicit rejection counts; they are not silently included as built urban area. Civic parks and the stadium are reported separately. Each required residential, mixed and center zone has at least two actual avenue connections and a clear 1.2 m sidewalk circuit. Shared traversal validation checks actual geometric junctions, vertical levels and road grades; proximity alone is not connectivity.

## Area feasibility

The original 8 km² urban target remains in the report alongside its absolute and relative errors. With the enclosing island and the gentler city plain, seed 332 has only 4.744375 km² of dry region land: 8 km² cannot fit in this ownership rectangle. Water, slopes deeper than the existing 4 m foundations, roads, harbor occupation and disconnected frontage further constrain the built area. This implementation visibly revises the current chosen catchments to **2.2 km²** while retaining density and coverage targets. Expanding the ownership boundary or reclaiming ocean was not used to disguise this constraint.

| District | Initial chosen area | Revised chosen area | Measured area | Explicit buildings | Density / km² | Footprint coverage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Garden Reach | 4.0 km² | 1.00 km² | 0.984375 km² | 1,008 | 1,024 | 12.77% |
| Market Ward | 2.5 km² | 0.80 km² | 0.812500 km² | 208 | 256 | 15.62% |
| Bay Center | 0.8 km² | 0.25 km² | 0.250000 km² | 20 | 80 | 13.35% |
| Civic Green | 0.7 km² | 0.15 km² | 0.156250 km² | 1 stadium | 6.4 | 22.31% |
| Total | 8.0 km² | 2.20 km² | 2.203125 km² | 1,237 | — | — |

These are generated source observations for seed 332 after the enclosing-island composition, not GTA measurements or hardware results. The three required building districts reach their original density and coverage envelopes. Civic coverage is reported separately and has no residential/tower coverage target. The city has 6,089 total prop instances and 365,888 unique catalogue triangles within the existing budgets; accessories and repeated placements do not inflate unique geometry counts.

No city-wide hardware frame-time, memory or collision-capacity conclusion follows from these source counts. Renderer pools and base populations stay unchanged. Sidewalk circuits are within each supported block; crossing between different block floor levels requires the route task's explicit pedestrian crossing ramps rather than interpolated floating paths.
