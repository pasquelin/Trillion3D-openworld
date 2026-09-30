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

Each block has four original six-storey buildings, both CC0 buildings, a pavement and surrounding
streets. The original building uses the existing shape/transform kits for raised facade frames,
projecting balconies with rails, parapets, rooftop HVAC with louvers and a chimney. These are
visible geometry and silhouette changes, not arbitrary subdivision. Materials include plaster,
glass, frames, concrete, steel, dark metal, painted metal and brick. Conservative footprints include
balconies. Tests reject building/building and building/road intersection.

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
| one-block | 6 | 8 | 20,151 | 73,107 | 11 |
| four-blocks | 24 | 32 | 20,151 | 292,428 | 11 |
| sixteen-blocks | 96 | 128 | 20,151 | 1,169,712 | 11 |

All three small native cooks at engine `7f810cbe344ee10fdcc910a8f5659e1536edbc2d` reloaded 12
primitives and two texture previews. Their output directories were below the 800 MiB cooked-disk
envelope per profile. The envelope is not a runtime memory budget or a combined world-plus-fixtures
payload guarantee. Normal world capacity requires its own complete cook; these profiles are separate
scenes, never simultaneously loaded.

Observed final small-cook output on 2026-09-30 (directory sizes include compiler sidecars and source.bin):

| Profile | Assembled source bytes | Cooked directory bytes | Source SHA-256 |
| --- | ---: | ---: | --- |
| one-block | 1,266,505 | 15,715,872 | `85aaf98c66081121513c31d5a8c55f8972aef9b2c6ec97eb2a9165fccbd36182` |
| four-blocks | 1,268,681 | 6,050,740 | `e116c9835fcbffa6a19d34cf098abf25b76a635178f80bce66b4e833cd0d47b2` |
| sixteen-blocks | 1,277,753 | 11,534,229 | `b29fa8c3f621ba0eed9e7ff0da2f9477c4c9299290800cbb147541959c9d343c` |

**Counting distinction:** native manifest `sourceTriangles` reports instance-expanded input for
these fixtures (73,107 / 292,428 / 1,169,712), although the authored unique geometry is 20,151.
The fixture reload labels that raw field `compilerInstanceExpandedTriangles`. Native selected
input/cache triangle counts are not camera-selected or rendered counts. The generation report keeps
those null; the dedicated measurement campaign records observed camera counters separately.
Cache bytes need not grow monotonically because
the compiler's spatial proxy and layout depend on scene extent. No compression/performance claim
is inferred from these small cooks.

Near-facade and skyline captures, backend readiness, frame timing, GPU residency and hardware
performance are the measurement campaign's evidence. Software browser failures are reported as
capability/functional observations; no desktop-game performance is asserted here.
