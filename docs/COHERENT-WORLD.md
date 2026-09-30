# Coherent world implementation (#15)

The approved five-centre sketch is a design reference, not an engine capture.
This first foundation moves the natural terrain to a continuously curved island,
a curved inland massif, gradual foothills and rolling rural ground. The natural
profile already reserves low ground for a compact western airport and a northeast
general aviation field. The fixed 8 km frame, 800 MiB cache envelope, triangle and
node budgets, physics height sampling and public engine pin are unchanged.

`generator/plan/geography.ts` owns the five intended city anchors and two airfield
reservations. Anchors are original authored proportions in metres. Settlement
builders must search nearby suitable dry ground, keep approaches clear and share
these locations with roads and flight endpoints. No airport runway has moved in
this foundation: existing airport output, marker names and its single-platform
API remain active until placement ownership is migrated together.

The next integration must replace rectangular biome ownership and gate every
region's placements by that ownership. Mountains and coast already enforce it;
countryside, desert and city still need coordinated placement guards. Activating
overlapping bounds alone would introduce overlapping geometry. The richer city
builder from #19 must be integrated before it consumes the five anchors. #20's
shared asset geometry and #21's routes then use the same ownership and clearances.

The whole redesign also requires the western two-runway airport, a working 900 m
northeast field, five populated centres, scattered residential and agricultural
sites, and a deterministic spatial coverage census. The existing 100 m fill with
four props per empty cell does not establish the approved approximately 10 m
perceived coverage; it must be replaced under fixed budgets. Native GPU views and
flight performance are unmeasured and deferred by the user. No source plan plot
or census is presented as rendered image or frame performance evidence.
