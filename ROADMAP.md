# Roadmap

Living document. Verify against the codebase before acting on any item —
priorities shift and details get stale.

## Recently shipped

- **Catalogue masthead overhaul** — full-bleed live shader behind the
  headline, cycles through all nine `CatType` values every 6 s with a stable
  per-type seed, sphere offset right on desktop with no clipped edges, all
  text normalised to solid white.
- **Light-direction GUI** — temporary tuning panel on `<LivePlanet>` with sun
  X/Y/Z, intensity (new `u_sunIntensity` uniform), ambient, and wrap range.
  Shows the current `CatType` so it's obvious which world the sliders are
  driving.
- **Cloud layer** in `<LivePlanet>` — mounts only for terrestrial/ocean
  classifications via `createCloudMaterial`'s internal gate.
- **8-octave terrestrial noise** — `hiFBM` / `hiRidged` / `hiCloud` bumped
  from 6 to 8 at full LOD. Affects TEMPERATE / WATER_WORLD /
  ICE_OCEAN_EYEBALL / LAVA_EYEBALL only.
- **TEMPERATE classifier fix** — inline mars/earth/warm fallback presets
  were missing `ridgeFreq` / `ridgeMix` / `warp` keys, so the bake path
  rendered earth-likes as smooth blobs. Filled every key the lerp loop reads
  and added a `base.warpIntensity` assignment.
- **Earth-realistic ocean coverage** — bumped `seaLevel` across all three
  HZ anchors (0.45 / 0.82 / 0.30) so habitable worlds read as ocean planets.
- **Higher-resolution thumbnails** — bake now runs at `u_lod = 1.0`
  (8-octave instead of 3); runtime `renderPlanetSnapshot` oversamples to
  `max(size * 4, 256)` so small companion-planet dots downsample crisply.
- **Nebula off by default** in the system view.
- **Binary-companion orbit bob fixed (float32 precision)** — planets in deep
  hierarchies (e.g. Alpha Centauri B b) were placed millions of scene units
  from the origin because the wide outer-pair separation (15000 AU for the
  AB–Proxima pair) scaled to a ~3,000,000-unit nesting offset. GPU float32
  matrices resolve only ~0.25 units at that magnitude, so the planet's
  vertices snapped to the grid and visibly bobbed. `Binary.jsx` now clamps
  any binary/hierarchy offset to `MAX_BINARY_OFFSET` (20000 units), pulling
  Alpha Cen B b from 3,007,248 → 27,254 units (ULP 0.25 → 0.0032). This is a
  stopgap; the real fix is camera-relative rendering (below). Camera follow
  also snaps its target exactly each frame now (`moveTo(..., false)` +
  `update(0)`), eliminating a separate sub-pixel one-frame lag.
- **Star colours on the chroma blackbody curve** — `tempToTint` and
  `tempToGlowColor` in `starShader.ts` now derive from
  `chroma.temperature()` instead of stepped spectral-class lookup tables.
  Body and surrounding effects (glow / rays / flares) finally share one
  colour basis.

## In progress / short term

- **Star glow ring z-fighting** — billboard vs sphere edge. Many approaches
  tried; needs a fundamentally different solution (screen-space bloom or
  stencil masking).
- **Camera-relative rendering** for float32 precision at large distances
  (Pluto orbit jitter, wide binary z-fighting at 1:1 scale). The
  `MAX_BINARY_OFFSET` clamp in `Binary.jsx` is a stopgap that bounds the worst
  offsets; the real fix is subtracting the camera position on the GPU so
  precision is highest near what you're looking at.
- **Binary star orbital dynamics** — proper period/separation motion.
- **N-body gravitational perturbations** between planets.

## Near term

- **Animated clouds** — re-enable `u_time` on cloud sphere in
  `Planet.jsx` `useFrame` (frozen for perf; one-line toggle).
- **GPU render-to-texture terrain bake** — run the real GLSL
  `computeContinent` to a texture for pixel-identical baked heightfield /
  normals. Would replace ~170 noise evals/fragment with one texture lookup.
- **Gas giant volumetric depth** — normal mapping on banded noise for 3D
  cloud-belt relief.
- **Eyeball hurricane spiral** — permanent sub-stellar cyclone with spiral
  arms and clear eye, based on Pierrehumbert & Hammond 2019 circulation
  model.
- **Tidally locked ice/ocean Voronoi crevasses** — crack valleys on the ice
  cap, same technique already used for lava-eyeball surface carving.
- **Lava eyeball Voronoi unification** — port the single-cellset +
  width-modulated-edges approach from ice/ocean. The code path exists
  (`u_eyeAridEdge > 1.0` branch in `planetShader.ts`); lava lighting/colour
  needs retuning so major lava channels and hairline cooled cracks both
  read well on the same tessellation.
- **Lava eyeball prominence flares** — parked. A first pass exists in
  `app/components/LavaFlares.jsx` (arcing ribbons adapted from the star-flare
  shader, mounted on `LAVA_EYEBALL` planets, masked to the hot pole). Both the
  usage and import in `Planet.jsx` are commented out. Issues to solve on
  return: motion still reads janky, and the arched ribbons look basic at small
  scale. Next idea to try: **more vertical flares** (jets erupting straight out
  from the surface rather than low arcs between two anchor points).
- **Volumetric clouds revisited** — pre-baked 3D noise texture instead of
  per-frame procedural noise.

## Future / wishlist

- Full camera-relative rendering architecture (subtract camera position on
  GPU for float32 precision).
- Full N-body physics simulation.
- Binary star Keplerian motion (two-body orbit around barycentre).
- Volumetric dust/fog clouds for depth.
- Screen-space star bloom (post-processing instead of billboard glow).
- Atmospheric scattering — fix ray-march for visible output at scene scales,
  or improve the fallback.
- Frozen-planet preset tuning (sibling to the TEMPERATE preset fix).
- Gas giant Sudarsky class sub-presets.
- Dynamic LOD for orbit lines based on camera distance.
- Performance profiling and optimisation for the 4 000+ system galaxy view.
- Vercel deployment optimisation.
- Data pipeline: supplement OEC with NASA Exoplanet Archive — query NASA TAP
  API for ~494 systems missing from OEC, generate OEC-format XML, add to
  weekly sync.
- Data pipeline: auto-update from Open Exoplanet Catalogue via GitHub
  Actions.

## How to use this list

- Reference `planetClassification.ts` when working on planet rendering — it
  drives the 15-type classification and HZ-gradient presets.
- For UI work, use shadcn components and the dark theme.
- All star colours should use `chroma.temperature()` — avoid discrete lookup
  tables.
- Planet halo / atmosphere uses per-type presets in `EnvContext.jsx`.
- A fresh worktree needs `node scripts/prebuild-data.js` once before the
  system route works (generates `data-json/` from the OEC XML; gitignored
  per-worktree artifact).
