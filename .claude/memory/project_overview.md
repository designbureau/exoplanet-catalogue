---
name: Exoplanet Remix Project Overview
description: 3D exoplanet visualization app using React Router v7 + React Three Fiber, rendering 4081 systems from Open Exoplanet Catalogue
type: project
originSessionId: b497df1c-e498-45a9-830d-52fe0fe92e70
---
Exoplanet data visualization app. Renders 4,081 real exoplanet systems from the Open Exoplanet Catalogue (XML files in `app/data/`).

**Stack**: React Router v7, React Three Fiber, Three.js, Tailwind CSS v3, shadcn/ui, chroma.js.

## Roadmap

### Completed
- RR7 migration, shadcn setup, architecture fixes
- Procedural planet shaders: gas giant, rocky, terrestrial, hazy, ice giant (5 shader types)
- Planet classification engine: 15 types based on stellar flux, mass, radius, density
- Habitable zone gradient with 3-category terrestrial presets (Mars/Earth/Warm)
- Venus Zone, Frozen, Water World, Sub-Neptune, Lava World preset systems
- Wrap lighting + fresnel ambient for realistic dark-side falloff
- Per-planet atmosphere controls: rim, shell, halo with per-type presets
- Star effects: glow ring, rays, flares with chroma.js blackbody colours
- Temperature graduation across star effect layers (surface → corona → prominences)
- Keplerian orbits (true anomaly from Kepler equation solver)
- Orbital phase offsets (periastron data + name hash fallback)
- Orbit trail with taper fade (75% circumference)
- Post-processing pipeline: tone mapping, chromatic aberration, vignette, grain, DoF
- Nebula with full controls (scale, warp, contrast, mix, cutoff, colours)
- Skybox with starfield cubemap
- LOD for planets (3-tier geometry) and star rays (2-tier)
- Camera obstacle-aware transitions, polar angle preservation
- Ring system shader with translucent lighting
- Menu nesting for binary systems
- Featured systems index page

### In Progress / Short Term
- Star glow ring z-fighting (billboard vs sphere edge — tried many approaches, needs fundamentally different solution like screen-space bloom or stencil masking)
- Camera-relative rendering for float32 precision at large distances (Pluto orbit jitter, wide binary z-fighting at 1:1 scale)
- Binary star orbital dynamics (proper period/separation motion)
- N-body gravitational perturbations between planets
- Camera follow wobble on n-body orbits: camera tracking feels wobbly when following planets — may be sampling rate, interpolation, or camera controller spring/damping issue

### Near Term
- Animated clouds: re-enable u_time update on cloud sphere (currently frozen for perf). Just toggle one line in Planet.jsx useFrame.
- GPU render-to-texture terrain bake: run actual GLSL computeContinent to a texture for pixel-identical baked heightfield/normals. Would replace 170 noise evals/fragment with 1 texture lookup.
- Gas giant volumetric depth: normal mapping on the banded noise to create 3D cloud belt relief
- Eyeball planets: sub-stellar hurricane spiral (permanent cyclonic cloud system with spiral arms, clear eye at center, based on Pierrehumbert & Hammond 2019 circulation model)
- Tidally locked ice/ocean eyeball: add Voronoi crack valleys to ice terrain (crevasses, fracture lines in ice sheet — same technique as lava eyeball terrain carving)
- Lava eyeball: port the unified Voronoi pattern from ice/ocean eyeball. The single-cellset + width-modulated-edges approach (hierarchical cracks drawn on ONE Voronoi tessellation, major vs hairline chosen by low-freq region noise) is already shared via the same code path (`u_eyeAridEdge > 1.0` branch in `planetShader.ts`), but the lava lighting/colouring on top may need retuning so major lava channels and hairline cooled cracks both read well on the same tessellation.
- Volumetric clouds revisited: pre-baked 3D noise texture approach (avoided per-frame procedural noise cost)

### Future / Wishlist
- Camera-relative rendering architecture (subtract camera position on GPU for float32 precision)
- Full N-body physics simulation
- Binary star Keplerian motion (two-body orbit around barycentre)
- Volumetric dust/fog clouds for depth
- Screen-space star bloom (post-processing instead of billboard glow)
- Atmospheric scattering: fix ray-march for visible output at scene scales, or improve fallback
- Frozen planet preset tuning
- Gas giant Sudarsky class sub-presets
- Star spectral type colour refinement on surface shader (replace tempToTint lookup with chroma.js)
- Dynamic LOD for orbit lines based on camera distance
- Performance profiling and optimization for 4000+ system galaxy view
- Vercel deployment optimisation
- Data pipeline: supplement OEC with NASA Exoplanet Archive — query NASA TAP API for ~494 systems missing from OEC, generate OEC-format XML, add to weekly sync pipeline
- Data pipeline: auto-update from Open Exoplanet Catalogue with GitHub Actions

**How to apply**: When working on planet rendering, reference the classification system in `planetClassification.ts`. When working on UI, use shadcn components and the dark theme. All star colours should use `chroma.temperature()` — avoid discrete lookup tables. Planet halo/atmosphere uses per-type presets from `EnvContext.jsx`.
