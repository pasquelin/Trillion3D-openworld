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
