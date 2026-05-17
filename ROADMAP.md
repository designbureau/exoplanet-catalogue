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

## In progress / short term

- **Star glow ring z-fighting** — billboard vs sphere edge. Many approaches
  tried; needs a fundamentally different solution (screen-space bloom or
  stencil masking).
- **Camera-relative rendering** for float32 precision at large distances
  (Pluto orbit jitter, wide binary z-fighting at 1:1 scale).
- **Binary star orbital dynamics** — proper period/separation motion.
- **N-body gravitational perturbations** between planets.
- **Camera follow wobble on n-body orbits** — tracking feels jittery; may be
  sampling rate, interpolation, or camera spring/damping.

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
- Star spectral-type colour refinement on the surface shader — replace
  `tempToTint` lookup with `chroma.js`.
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
