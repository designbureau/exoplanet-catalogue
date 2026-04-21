---
name: Catalogue UI — session handover
description: State of the exoplanet-catalogue branch as of 2026-04-21, covering the full index page redesign, thumbnail pipeline, and LivePlanet masthead component
type: handover
originSessionId: 7d123c63-eb09-4b08-a047-484ab92bb9a5
---

## Branch

`design/exoplanet-catalogue`

Last commit: `9d9ec33 feat(catalogue): baked planet thumbnail pipeline using real OEC classification`

All work below is **uncommitted** (modified + untracked files in working tree).

---

## What was built this session

### 1. Index page redesign (`app/routes/_index.tsx`)
Full redesign from the featured-systems list into an editorial catalogue. Key sections:
- **Nav** — sticky, monospace wordmark, ghost links, search input with ⌘K badge, system count
- **Masthead** — giant 3-line headline ("Nearby / worlds / catalogue"), "worlds" uses an exotic gradient (`oklch(0.78 0.14 320)` → white), 4-stat strip, live GLSL planet behind the text
- **Toolbar** — filter chips (All / habitable zone / rocky / gas giant / historic / nearest / exotic / multi-planet) + sort select
- **Featured card** — `FeaturedCard` component (large card with text left + `ShaderPlanet` right), only shows when no active filter/search
- **System grid** — `SystemCard` grid (`repeat(auto-fill, minmax(320px, 1fr))`), each card has `ShaderPlanet` thumbnail at top

Hover parallax on cards was removed (user request — too distracting).

Data source: `app/data/catalogueSystems.ts` (24 curated systems). Filter tags come from `FILTER_TAGS` export in that file.

### 2. Catalogue data (`app/data/catalogueSystems.ts`)
24 curated systems with rich schema: `filename`, `slug`, `name`, `blurb`, `star { type, label, color }`, `distance`, `discovered`, `tags[]`, `featured { name, note, type, seed }`, `planets[]`. Seed computed deterministically from slug char codes. This file and `_index.tsx` are both new files on this branch.

### 3. ShaderPlanet thumbnails (`app/components/ShaderPlanet.tsx`)
Component that:
1. Tries `/planet-thumbs/{slug}.png` (baked, fast)
2. Falls back to `renderPlanetSnapshot()` (runtime off-screen WebGL render)
3. Shows pulsing placeholder while loading

### 4. Planet snapshot renderer (`app/utils/planetSnapshot.ts`)
Two key exports: `renderPlanetSnapshot(catType, seed, size)` and `buildShaderParams(catType, seed)`.

**Critical fix this session:** Replaced per-call `new THREE.WebGLRenderer()` with a singleton shared renderer (`getSharedRenderer`). Previously every thumbnail render created a new WebGL context, blowing past the browser's ~16-context limit and crashing the LivePlanet masthead canvas. Now there is exactly ONE offscreen context for all thumbnails.

Thumbnail rendering details:
- `u_lod = 0` (3-octave noise, fast for thumbnails)
- `u_ambient = 0.32` (brighter than viewer default)
- `u_wrapRange = 0.65` (softer terminator)
- Sun direction slightly frontal for bright thumbnails
- γ=0.58 gamma lift applied via 2D canvas pixel loop after WebGL render
- TEMPERATE worlds: cloud opacity capped at 0.42 / coverage at 0.38 (prevents featureless white blob)
- Gas band count: ice giant → 4.0, others → 2.5 (matches EnvContext viewer defaults)

### 5. LivePlanet masthead (`app/components/LivePlanet.tsx`)
New component (untracked). Live rotating GLSL planet at full quality for the masthead background.

**Architecture** (critical — easy to break):
- Outer div: fills parent, `position: relative; overflow: hidden`
- Inner div: fixed `RENDER_PX × RENDER_PX`, `position: absolute`, centered with `transform: translate(-50%, -50%)` — **NO scale()** — pure translation preserves `getBoundingClientRect()` dimensions so R3F measures the correct canvas size
- Canvas: fills the inner div, `dpr={1}`, `antialias: false`

**Why no CSS scale()**: R3F uses `getBoundingClientRect()` to set canvas dimensions. If the parent has `scale(N)` applied, R3F reads the post-scale visual size and renders at that size, defeating the fixed-resolution approach. Translation only = no size change = R3F always renders at exactly RENDER_PX.

**Current settings**:
- `RENDER_PX = 1300` (2× visible sphere vs original; ~1.69M fragment pixels at 6-octave FBM)
- `ZOOM = 1300 / (2 * 1.15)` (sphere fills 87% of canvas)
- `u_lod = 1.0` (6-octave FBM, full detail)
- `u_ambient = 0.22`
- `u_wrapRange = 0.65`
- `u_gasBands = 2.5`
- Sphere geometry: 96×96 segments

**Drag rotation** (added this session):
- `onPointerDown/Move/Up` on the inner div with `setPointerCapture`
- `pointerEvents: "auto"` on the inner div overrides any ancestor `pointer-events: none`
- `touchAction: "none"` prevents mobile scroll hijack
- Velocity ref (`vel`) starts at AUTO_SPEED; on drag release, throw velocity decays exponentially (`halfLife = 0.8s`) back to AUTO_SPEED in `useFrame`
- `CompileHelper` pre-compiles the shader on mount to eliminate first-frame stutter

### 6. Bake pipeline (`scripts/bake-planets.mjs`, `app/routes/planet-bake.tsx`)
Playwright headless bake script renders all catalogueSystems thumbnails at 512×512 and saves to `public/planet-thumbs/{slug}.png`. Pre-baked PNGs are served statically; ShaderPlanet loads them instantly, only falls back to runtime render if missing.

To run: `npm run bake-planets` (check package.json for exact script name). Requires dev server warm-up first (script pings `/planet-bake?__warmup__` before starting renders).

### 7. EnvContext defaults (`app/components/EnvContext.jsx`)
Sub-Neptune and Water World cloud presets updated:
- `cloudCover: 0.71, cloudOpacity: 0.71` for both types
- Sub-Neptune adds: `cloudSwirl: 0.6, cloudBands: 3.0, cloudWarp: 0.35`

### 8. Planet classification (`app/utils/planetClassification.ts`)
SUB_NEPTUNE now copies cloud fields from the preset (coverage, opacity, swirl, bands, warp). WATER_WORLD cloud opacity defaulted to 0.71.

---

## What is NOT committed yet

All of the above session work is uncommitted (git diff shows 9 modified files + 2 untracked):

**Modified:**
- `app/components/EnvContext.jsx` — cloud preset changes
- `app/routes/_index.tsx` — full redesign (removed parallax, added LivePlanet)
- `app/routes/planet-bake.tsx` — warmup endpoint
- `app/utils/planetClassification.ts` — cloud fields for SUB_NEPTUNE / WATER_WORLD
- `app/utils/planetSnapshot.ts` — shared renderer + gamma lift + thumbnail settings
- `scripts/bake-planets.mjs` — warmup ping
- `package.json` + `package-lock.json` — playwright added for bake pipeline

**Untracked (new files):**
- `app/components/LivePlanet.tsx` — live masthead planet
- `design_handoff/` — design reference files (ignore, not part of app)

Suggested commit sequence:
1. `fix(snapshot): shared WebGL renderer + gamma lift + thumbnail tuning`
2. `fix(classification): sub-neptune + water-world cloud defaults`
3. `fix(env): water-world and sub-neptune cloud preset defaults 0.71`
4. `feat(catalogue): live masthead planet with drag rotation`
5. `feat(catalogue): bake pipeline warmup`

---

## Known issues / next steps

### Thumbnail quality
The γ=0.58 gamma lift and u_ambient=0.32 improved brightness. Some planet types may still look flat; can iterate on per-type overrides in `renderOffscreen()` in `planetSnapshot.ts`.

### Bake pipeline
Pre-baked PNGs exist for systems where `slug` is provided. Run `npm run bake-planets` to (re)generate after any shader or classification changes. Without PNGs, ShaderPlanet falls back to runtime render (slower first load but functionally identical).

### Catalogue data completeness
24 systems currently. The data schema in `catalogueSystems.ts` supports `planets[]` with type/seed/r/temp for the companion planet dots on each card. Some entries may have placeholder data.

### LivePlanet planet type
Currently uses `featured.featured.type` and `featured.featured.seed` from the first catalogue system (TRAPPIST-1). Could be parameterised or randomised.

### Performance
- 1300px × 6-octave FBM = 1.69M fragments. Still much better than the original broken 1800px (~3.24M). The shared renderer means thumbnails no longer compete for context slots.
- If performance becomes an issue: reduce RENDER_PX to 900 (1.74× vs current, 45% fewer pixels).

### Mobile layout
The masthead planet (`right: -50vw`) shows only a sliver on narrow viewports. This is intentional but could be improved with a responsive `right` value.

---

## Architecture gotchas to remember

1. **Never CSS scale() the R3F Canvas parent** — R3F reads getBoundingClientRect() which includes transforms. Use margin or translate only.
2. **Never create WebGLRenderer in renderOffscreen** directly — always use `getSharedRenderer()` from the module singleton to stay within browser context limits.
3. **EnvContext cloud presets vs classification defaults** — classification defaults must match EnvContext presets or the GUI will show different values than what's rendered in thumbnails.
4. **TEMPERATE cloud cap** — must be applied as a params clone BEFORE `createPlanetMaterial()`, not via post-creation uniform override (uniforms are set from params on construction).
5. **u_lod branching** — `u_lod > 0.5` activates 6-octave FBM (`hiFBM`, `hiRidged`, `hiCloud`). LivePlanet uses `u_lod = 1.0`; thumbnails use `u_lod = 0` for speed.
