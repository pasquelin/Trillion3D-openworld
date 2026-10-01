# Generated island preview

`node scripts/island-preview.ts` cooks a separate 2 × 2 km downtown subset under
`dist/island-preview/` and writes `dist/island-preview.html`. The normal cooked world and its
cache remain untouched. `--source-only` writes the source without invoking the native compiler.
The script uses the generated island's downtown marker, four terrain tiles, nearby placed objects,
lights, and the two imported civic buildings. Its views come from named generated objects and
measured source mesh bounds.

Build the browser runtime with `node scripts/build.ts`, cook the preview with
`node scripts/island-preview.ts`, and serve `dist/` with `PORT=4180 node scripts/serve.ts`.
Open `/island-preview.html?view=neighborhood`, `?view=towers`, `?view=aerial`, or
`?view=district`. Each view is explicitly labeled as a subset. All use WebGL2 and an 800 m
camera far plane so the session streams nearby partition cells.

To capture a view, run:

```sh
node scripts/capture-preview.mjs \
  --url=http://127.0.0.1:4180/island-preview.html?view=neighborhood \
  --out=dist/island-preview-capture --timeout=180000 --settle=15000
```

The capture checks the actual WebGL2 renderer, resident pages, selected triangles, JavaScript
exceptions, failed network requests, and screenshot bytes. It writes `capture.json` and a PNG,
or a diagnostic PNG with `valid: false`. This is a visual and loading check in software-rendered
Chromium; it does not measure interactive performance.

The local 1 October 2026 cook produced 4 terrain tiles, 18,321 selected objects (including 2
imported buildings), and a 506 MiB native cache. The separate `world-roots.json` was 42 MiB,
versus 309 MiB for the full-world cache in that run. Verified 960 × 540 captures include the
neighborhood (759 resident pages, 1,232,142 selected triangles), towers (759 pages, 1,370,216
triangles), rooftop aerial view (759 pages, 840,780 triangles), and rooftop district view (759
pages, 1,767,133 triangles). Their capture JSON files reported no JavaScript exceptions or
failed network requests. The only HTTP 404 was the optional favicon.

The tower views expose visual limitations of the generated scene: dark crowns and spires can
look detached from distant towers, pale gaps remain around some downtown plinths, and the
housing district has large green spaces between developed blocks. The
capture artifacts and cooked cache stay out of Git. The preview is evidence that generated
island geometry renders; it is not a substitute for a full-world visual review.

## City density source check

For seed 332, the primary downtown's conservative building footprint rose from 37,000 m²
(13.93% of its dry block catchment) to 107,336 m² (40.41%). Shared streetwall meshes form
continuous frontages around tower courts, with narrow corner passages and clear twin-office
plots. Partial parcels beside connected grid streets gained 236 street-facing terrace rows with
128,856 m² of building footprint and 77 mature-oak instances. These are checked against
terrain height, water, roads, and existing solid footprints. Primary city instances changed
from 6,157 before density work to 6,470; unique city prop triangles rose by about 1.3%.

The earlier density-only four-tile district capture rendered 18,080 objects, 775 resident pages
and 1,679,598 selected triangles. The combined local-street surface diagnostic rendered 18,080
objects, 775 resident pages and 1,679,685 selected triangles with paved block streets visible.
Its strict capture result is invalid because one network request ended with `ERR_ABORTED`; the
WebGL2 renderer was ready and reported no JavaScript exception. Software-rendered screenshots
establish appearance and loading, not interactive frame rate. Both captures predate the grid-street
parcel alignment in `8bf2005`.

The [grid-street district capture](captures/coherent-world-district.png) on source head
`239b3d7` is valid in WebGL2: 17,925 selected objects, 775 resident pages, 1,500,478 selected
triangles, and no JavaScript exceptions or failed requests. The adjacent
[capture record](captures/coherent-world-district-capture.json) includes the PNG SHA-256 and
records the optional favicon 404. It shows frontage rows aligned to visible local streets.
Large grassy parcels and distant tower crown artifacts remain visible. This regional subset
does not establish whole-island startup or hardware frame performance.
