# Island route replay

Routes are generated from the same world plan and settled landmarks as the scenery. `world.json` embeds the route metadata; `routes.json` contains the same workload manifest beside the cooked world. The seed, cooked content key, pinned engine commit, exact camera poses, rotation, timestamps, length and duration travel together.

Use **Replay route** to play a selected camera workload, **Explore** to resume the previous player position, or **Return to land** to recover to the last observed dry grounded position. Recovery is explicit; entering water or leaving the playable envelope never silently clamps the player or adds an invisible wall. The flight envelope is the 8 km square and 3,200 m altitude. Boats and swimming are outside this delivery.

Replay pauses native physical stepping and temporarily releases the character camera controls. It restores the camera pose, control ownership and prior physics pause state when stopped. Native flight and moving-platform acceptance remain upstream work; a successful camera replay proves renderer traversal only.

The base workload requests 512 MiB geometry / 256 MiB texture pools, 40 traffic cars and 60 pedestrians. Day replay fixes noon; night replay fixes 22:00. The manifest's 1280 × 720 is the measurement target: the measurer must configure and record the actual canvas resolution and device pixel ratio. It is not a claim about every browser's viewport. Unsupported metrics remain unavailable.

Cold means a newly created browser context without HTTP/site/engine caches. Warm means rerunning the identical route in that same context after a complete first traversal. Selecting a route never clears caches; cold/warm runs must be distinguished in the measurement record, not inferred from route names. Three repeats of each profile are required for hardware evidence. Headless/software checks do not establish game-PC performance.

Paved road connectivity is validated at real segment crossings and collinear overlaps, with 20 cm maximum road-surface height disagreement and per-class grade limits. A projected checkpoint may select a graph node; it does not join otherwise disconnected roads. Runways and taxiways never become public highway edges. Failed required connections are recorded in `failures`, and their incomplete loop is not advertised as a playable replay.
