# Regional cache prototype

`node scripts/regional-prototype.ts` cooks three deliberately tiny compiled scenes in
`dist/regional-prototype/`: a persistent 8 km ground plane and two neighboring tower sectors.
It bundles the pinned browser SDK into the same directory. Serve `dist/` with
`PORT=4192 node scripts/serve.ts`, then open `/regional-prototype/`. The page loads the
proxy, loads the west sector, and replaces west with east using the public
`world.scene.load()` and `world.scene.remove()` methods. `window.regionalSamples` records
load and first drawn frame times; `window.regionalReopens` records SDK diagnostics.
`--source-only` writes the three glTF sources without invoking the compiler.

The local run used the existing compiler binary built from the same pinned engine commit,
`7f810cbe344ee10fdcc910a8f5659e1536edbc2d`, through
`TRILLION3D_COMPILER_BIN`. It did not cook the island. Cache sizes were:

| Scene | Cache bytes | MiB |
| --- | ---: | ---: |
| Proxy | 12,615,825 | 12.03 |
| West | 8,283,421 | 7.90 |
| East | 10,175,903 | 9.70 |

In one headless Chromium WebGL2/SwiftShader run, `scene.load()` took 45 ms for west and
86 ms for east. Time from starting each load until the next drawn frame was 7,891 ms and
7,359 ms. The SDK emitted two `session-reopen` diagnostics, both caused by
`scene-change` and marked `defect: true`; their durations were 7,842.5 ms and
7,270.7 ms, with 3 and 2 frames without a new image. No JavaScript exception was
reported. This is a software-rendered feasibility test, not interactive performance
evidence for the full island.

The engine source confirms the behavior: `scene.load` adds a `LoadedModel` to the scene;
`worldContents` compares the set of loaded models to the set used to open the session;
`worldRuntime` disposes and reopens that session when they differ. The canvas preserves
its last image during the reopen, but the example did not deliver a new frame for about
seven seconds. A production regional system would need an engine path that mounts and
unmounts compiled models within an open session, plus bounded proxy and sector caches.
Splitting the current full island cache alone does not satisfy its 800 MiB aggregate
cache contract.
