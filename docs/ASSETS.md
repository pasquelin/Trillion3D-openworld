# Licensed buildings and original street block workloads

The island keeps its existing procedural catalogues. Two complementary CC0 buildings supplement
them on clear, dry civic lots. The normal cook selects those lots after all ordinary instances
and roads are placed, using the existing city occupancy and ground helpers. A small original
foundation reaches the sampled terrain; each chosen placement, normalized height and conservative
ground footprint is written to `imported-buildings.json`. These supplemental civic sites are
reported separately from the three district density classes.

## Provenance and coordinate scale

`assets/buildings/manifest.json` contains source URLs at full commit revisions, byte lengths and
SHA-256 for each original model/buffer/atlas; asset-specific licenses; indexed triangle and
material counts; authored bounds and node transform; chosen application scale and normalized
bounds. Original source and license bytes were compared directly with the pinned Git objects.
No source engine code, paid extras or GTA content is included.

| Asset | Pinned revision | Original files, bytes | Indexed triangles | Materials | Atlas |
| --- | --- | --- | ---: | ---: | --- |
| Kenney small B | `4535092b740b378b700efd9df9e27a631815b84a` | GLB 49,764; PNG 10,108 | 600 | 1 | 512×512 |
| KayKit building H | `63976910ca04d16f0fc531b9c614244be8128713` | glTF 3,016; BIN 118,064; PNG 19,885 | 1,885 | 1 | 1024×1024 |

The Kenney README explicitly licenses its **assets CC0**, separately from its MIT project code.
KayKit's public Assets/LICENSE.txt licenses this subset CC0. The original licenses are included
beside the models. glTF 2 defines coordinates in metres, but these packs do not document a full-size
architectural scale. The application **chooses** instance scale 8: small B becomes 8×13.012×8 m,
and H 16.054×24.4×16 m. This is a silhouette design choice, not evidence of real-world dimensions.
Authored nodes in this subset have identity transforms. Placement adds translation, yaw and that
chosen uniform scale; geometry, UVs, material properties and original atlases remain intact.

The existing world glTF writer emits procedural geometry. `generator/assets/assemble.ts` then
appends the two narrow, vetted source documents by rebasing glTF table indices and copying binary
and texture dependencies. It does not convert or simplify their geometry, resample textures or
implement an engine importer. The existing public native compiler cooks this one assembled source.
Collision choice is the engine's static mesh from its compiled cache, shared with the ground and
procedural buildings. Physical behavior awaits the engine acceptance campaign; metadata is not
proof of collision performance.

## Street block workloads

Each block has fourteen original six-, seven- and eight-storey buildings, both CC0 buildings,
a pavement and surrounding streets. Five adjoining facades line each north/south frontage;
pairs complete the east/west sides. Flush party walls and roofs meet without volumetric overlap.
Front/rear balconies leave 5.31 m corner passages and two unobstructed 4 m service alleys
connecting the outer streets to a courtyard with supplemental CC0 lots. The original building uses the existing shape/transform kits for raised facade frames,
projecting balconies with rails, parapets, rooftop HVAC with louvers and a chimney. These are
visible geometry and silhouette changes, not arbitrary subdivision. Materials include plaster,
glass, frames, concrete, steel, dark metal, painted metal and brick. Conservative footprints include
balconies. Tests require adjoining party walls and clear service alleys and reject positive-volume
building/building and building/road intersection.

```sh
pnpm install --frozen-lockfile
pnpm engine:compiler
pnpm workload one-block
pnpm workload four-blocks
pnpm workload sixteen-blocks
pnpm build
pnpm serve
```

Open `workload.html?preset=one-block`, `four-blocks` or `sixteen-blocks`. Facade and Skyline buttons
restore recorded camera poses. The optional `renderer=webgl2` or `renderer=webgpu` explicitly selects
the public engine backend; the default uses the engine's automatic choice. There is no lowered
quality preset. The existing 512 MiB geometry and 256 MiB texture pools are unchanged. The viewer's
lighting is a fixed warm directional light (intensity 3, shadows enabled) plus a cool
hemisphere fill (intensity 0.8) in every profile; these chosen values are not a physical lighting
calibration. Source geometry and atlas resolution stay identical.
The normal island cook is untouched by fixture selection; it never generates sixteen detailed blocks.
The publication workflow cooks and caches all three fixture outputs and refuses missing manifests
or reports, so the viewer is included with its content.

Each `dist/workloads/<preset>/report.json` records the engine pin, exact assembled source hash/bytes,
actual cooked directory bytes, camera poses and authored geometry/material counts. Source-only
generation is available with `pnpm workload <preset> --source-only`; its cook/reload fields are null.
The public SDK-core `readPagedManifest` reloads every compiled fixture and verifies its primitive
table and input triangle count. No internal reader is copied into the application.

| Profile | Buildings | Total instances | Unique authored source triangles | Instance-expanded authored triangles | Unique materials |
| --- | ---: | ---: | ---: | ---: | ---: |
| one-block | 16 | 18 | 34,287 | 144,507 | 13 |
| four-blocks | 64 | 72 | 34,287 | 578,028 | 13 |
| sixteen-blocks | 256 | 288 | 34,287 | 2,312,112 | 13 |

All three small native cooks at engine `7f810cbe344ee10fdcc910a8f5659e1536edbc2d` reloaded 28
primitives and two texture previews. Their output directories were below the 800 MiB cooked-disk
envelope per profile. The envelope is not a runtime memory budget or a combined world-plus-fixtures
payload guarantee. Normal world capacity requires its own complete cook; these profiles are separate
scenes, never simultaneously loaded.

Observed dense-block small-cook output on 2026-09-30 (directory sizes include compiler sidecars and source.bin):

| Profile | Assembled source bytes | Cooked directory bytes | Source SHA-256 |
| --- | ---: | ---: | --- |
| one-block | 2,125,229 | 12,564,370 | `e74caad3b90c3de5950ddbd2936a52ea592d70f9dd2797c07574ddef76ba9b6c` |
| four-blocks | 2,131,129 | 10,307,996 | `6fc7ec1d4ff4a3fc05752db48ff2f4feec879ff9df96a0643d7241b2f26c0583` |
| sixteen-blocks | 2,155,757 | 11,710,104 | `e7d7c71258c2150bb106332249d5d384d51382e77f51282371e2c70a370c868f` |

**Counting distinction:** native manifest `sourceTriangles` reports instance-expanded input for
these fixtures (144,507 / 578,028 / 2,312,112), although the authored unique geometry is 34,287.
The fixture reload labels that raw field `compilerInstanceExpandedTriangles`. Native selected
input/cache triangle counts are not camera-selected or rendered counts. The generation report keeps
those null; the dedicated measurement campaign records observed camera counters separately.
Cache bytes need not grow monotonically because
the compiler's spatial proxy and layout depend on scene extent. No compression/performance claim
is inferred from these small cooks.

Near-facade and skyline captures, backend readiness, frame timing, GPU residency and hardware
performance are the measurement campaign's evidence. Software browser failures are reported as
capability/functional observations; no desktop-game performance is asserted here.
