# Cache size audit (issue #22)

The last complete 8 km cache in the issue #15 worktree occupies 2,702,192,007 bytes
(2,577.01 MiB). This audit read the published artifacts; it did not cook the full world.

| Product | MiB | Share |
| --- | ---: | ---: |
| `world-roots.bin` | 1,574.68 | 61.1% |
| `world-roots.json` | 309.60 | 12.0% |
| `native/objects` (109,290 files) | 298.16 | 11.6% |
| `source.bin` | 113.78 | 4.4% |
| Textures | 76.85 | 3.0% |
| `physics.json` | 60.77 | 2.4% |
| Other cache files | 143.17 | 5.6% |

The root products alone occupy 1,884.28 MiB (73.1%). `world-roots.json` lists
675,869 page records and 333,571 cell object records. Its cell object `node` index
can be joined directly to `source.gltf.nodes[]`, then to the named mesh. The source
has 72,101 tree nodes, 44,958 shrub or grass nodes, 5,567 vehicle nodes, 2,689
building nodes, 11,835 rock nodes, and 64 terrain nodes. Bundle dependency lists
identify which root bundles each object uses, but multiple classes can share one
bundle. Assigning each shared bundle equally among the classes that reference it
gives **exploratory allocations**, not removable bytes: trees 810 MiB, shrubs and
grass 492 MiB, vehicles 73 MiB, buildings 38 MiB, rocks 61 MiB, terrain 4 MiB,
other 98 MiB. Trees exclusively reference 311 MiB and shrubs/grass 25 MiB; their
respective total touched bundles are 1,461 and 1,094 MiB. Those ranges show why a
precise saving cannot be inferred from node counts alone.

One bounded 2 × 2 km experiment removed every second bush instance from the same
on-disk island preview source in the issue #15 worktree (commit `3af6b98`). This
artifact is 405.66 MiB, newer than the 506 MiB run recorded in the preview guide.
It preserved all 7,138 tree instances, buildings, roads,
terrain, meshes and buffers; 953 of 1,906 bush nodes were removed from the scene
root list. Using the pinned compiler and the same `full`, 150,000 triangle budget,
two threads, and `qem-endpoints` settings, cache size fell from 425,368,434 to
414,777,876 bytes: **10.10 MiB (2.49%)**. Root binary fell 8.44 MiB and root JSON
1.40 MiB. This is a measured upper bound for that density cut, with half the
small shrubs visibly absent at close range. It does not support a 3× total cache
reduction.

To reproduce the bounded variant, copy the preview `source/` to a separate
directory, load `world.gltf`, and remove the even-numbered nodes whose referenced
mesh name starts with `bush-` from `scenes[0].nodes`. Leave `nodes`, meshes and
`world.bin` unchanged. Compile that directory with the pinned compiler arguments
`source cache full 150000 2 2048 ../../../../source/ qem-endpoints`, then sum file
sizes under `cache/`. The control is the unedited on-disk preview cache.

The pinned compiler creates world super-roots for every placed primitive with
`qem-endpoints` (`compiler_world_roots.rs`). Its comment that nothing reads them is
stale: the browser SDK's `scene/worldRoots.ts` reads and verifies the JSON, pins
the binary top through an HTTP Range request, and fetches cell dependencies. The
runtime therefore depends on those products for the current cook mode. A copied
2 × 2 km cache with only `world-roots.bin` and `world-roots.json` deleted failed
`scene.load()` in Chromium with `world-roots.json: HTTP 404, type absent`. Its
manifest still announced the removed, hashed products. Simple post-cook deletion
is not a valid optimization.

Exact clusters (`simplification: none`) skip the super-root stage and would publish
a consistent manifest with no world roots. A single compile of the unchanged 2 × 2
km preview source reached the proxy stage (97%) with 8.84 GiB peak RSS, then kept
both CPU threads busy in the impostor stage without another progress event for
over six minutes. It was stopped at eight minutes total, with no complete cache
or browser test. Its partial output is **not a measured cache saving**. The
near-identical half-bush sample compiled with `qem-endpoints` in about 2.6
minutes and peaked at 1.77 GiB.
Exact clusters require a completed cook, WebGL2 visual and collision checks, and
an assessed compile resource cost before considering the full world.

At the current engine pin, the measured shrub density cut saves only 2.49% of
the preview cache while removing half its small shrubs. A 3× reduction of the
complete cache while retaining dense trees, buildings and long vistas is not
supported by this source-side evidence. The dominant cost is the compiler's
per-placement world-root expansion; a source-only fix would need to change the
placed primitive count or detail enough to preserve appearance and then pass a
fresh measured cook. The source triangle and node cost model in
`generator/plan/contract.ts` omits this expansion and should not be treated as
predictive for native cache size. The old 800 MiB planning estimate is no longer
a pass/fail gate: preserve the dense scene and use its measured cost to expose engine bottlenecks.

`EXT_mesh_gpu_instancing` does not avoid this expansion at the pinned SDK commit.
The compiler accepts it but `compiler_instancing.rs` expands every instance into
a child mesh node before scene selection, tables, proxy, physics and lights.
`tests/formats/gltf_world.rs` explicitly requires one cooked mesh node per
instance. `compiler_world_roots.rs` then visits each placed node and primitive
to build the roots. Repacking the 117,059 tree and shrub/grass placements as
glTF GPU instances would restore those nodes during import. A genuine
instancing reduction requires a compiler/runtime capability that preserves
instances beyond import, or a measured content density/geometry tradeoff.
