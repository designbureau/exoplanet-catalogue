# Exoplanet Catalogue

An editorial, real-time 3D catalogue of nearby exoplanet systems. Browse a
galaxy map of 4,000+ real systems, drop into any one to see its star(s) and
planets rendered live, and read a curated catalogue of featured worlds — every
planet drawn with procedural GLSL shaders driven by its real physical
parameters.

## Stack

- **[React Router v7](https://reactrouter.com)** — framework mode, SSR enabled
  (`react-router.config.ts`), file-system routes via `@react-router/fs-routes`.
- **[React Three Fiber](https://r3f.docs.pmnd.rs)** + **three.js** — the 3D
  scene graph, with `@react-three/drei`, `@react-three/postprocessing`, and
  `postprocessing`.
- **Custom GLSL shaders** — planets, stars, atmospheres, rings and nebulae are
  all procedural (`app/shaders/`).
- **[Tailwind CSS](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** (Radix) — dark editorial UI.
- **[chroma-js](https://gka.github.io/chroma.js/)** — blackbody star colours.
- **Vite** — bundler/dev server. **TypeScript** throughout.

Node **≥ 18**; 20+ recommended.

## Getting started

```sh
npm ci --legacy-peer-deps   # peer-dep graph needs the legacy resolver
node scripts/prebuild-data.js   # generate data-json/ once in a fresh checkout
npm run dev                 # http://localhost:5173
```

`prebuild-data.js` runs automatically as part of `npm run build`, but the **dev
server needs the data generated once manually** in a fresh checkout (see [Data
pipeline](#data-pipeline)). Without it, the galaxy and system routes have
nothing to load.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | React Router dev server (Vite HMR) on port 5173. |
| `npm run build` | Prebuilds data → `react-router build` → copies `data-json/` into `build/client`. |
| `npm start` | Serves the production build (`react-router-serve`). |
| `npm run prebuild` | Parses OEC XML → `data-json/` (runs automatically before `build`). |
| `npm run bake` | Bakes planet thumbnails via the offline snapshot pipeline (`scripts/bake-planets.mjs`). |
| `npm run typecheck` | `react-router typegen && tsc`. |
| `npm run lint` | ESLint across the repo. |

## Routes

File-system routed (`app/routes/`):

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `_index.tsx` | Editorial catalogue — featured systems + filterable grid, live shader hero. |
| `/galaxy` | `galaxy.tsx` | 3D galaxy map of all ~4,000 systems, positioned by real RA/Dec/distance, with zodiac constellations. |
| `/system/:filename` | `_system.system.$filename.tsx` | Live 3D view of a single system: star(s), planets, orbits, habitable zone. |
| `/planet-bake` | `planet-bake.tsx` | Internal tool for baking planet thumbnail snapshots. |

`_system.tsx` is the layout (sidebar menu + `<Outlet>`) shared by the system
views.

## Project layout

```
app/
  routes/            React Router file routes (see table above)
  components/         R3F scene components — Planet, Star, Binary, Nebula,
                      MilkyWay, PlanetCanvas, LivePlanet, menus, ui/ (shadcn)
    old/             Legacy pre-shader components, kept for reference
  shaders/           GLSL: planetShader, starShader, atmosphereShader,
                      ringShader, scatteringShader, gasGiant, terrainTexture…
  utils/             kepler.ts (orbital mechanics), planetClassification.ts,
                      getHabitableZone, parseSystemPositions, snapshot helpers
  data/              featuredSystems, catalogueSystems, zodiacConstellations,
                      open_exoplanet_catalogue/systems/*.xml (4,081 systems)
scripts/
  prebuild-data.js   XML → data-json/ (index + per-system JSON)
  bake-planets.mjs   Offline planet thumbnail baker
data-json/           Generated, gitignored — per-worktree build artifact
```

## Planet classification

Rendering is driven by `app/utils/planetClassification.ts`, which sorts every
planet into one of ~15 types from its mass, radius, temperature and host-star
properties. Each type maps to a shader preset (colour, terrain noise, ocean
level, atmosphere, clouds). Types include:

`TEMPERATE` · `WATER_WORLD` · `ICE_OCEAN_EYEBALL` · `LAVA_EYEBALL` ·
`LAVA_WORLD` · `HOT_ROCKY` · `VENUS_LIKE` · `FROZEN` · `SUB_NEPTUNE` ·
`ICE_GIANT` · `COLD_GIANT` / `COOL_GIANT` / `WARM_GIANT` ·
`HOT_JUPITER_IV` / `HOT_JUPITER_V` · `UNKNOWN`

Habitable-zone worlds interpolate presets across three HZ anchors, so a planet
near the inner edge reads hotter/drier than one near the outer edge.

## Data pipeline

Source data is the [Open Exoplanet Catalogue](https://github.com/OpenExoplanetCatalogue/open_exoplanet_catalogue)
(OEC), vendored as XML under `app/data/open_exoplanet_catalogue/systems/`
(4,081 systems).

- **`scripts/prebuild-data.js`** parses every XML file into
  `data-json/systems-index.json` (galaxy positions) and per-system JSON files.
  This directory is **gitignored** and regenerated per worktree — run it once
  after cloning, and it runs automatically as part of `npm run build`.
- **`.github/workflows/update-catalogue.yml`** syncs the vendored OEC XML from
  upstream weekly (Mondays 06:00 UTC), and can be triggered manually.

## Deployment

Configured for Vercel (`vercel.json` pins `npm ci --legacy-peer-deps` as the
install command). `npm run build` produces `build/server` and `build/client`
(with `data-json/` copied into the client output); `npm start` serves it with
the built-in React Router server on any Node host.

## Roadmap

See [ROADMAP.md](ROADMAP.md) — a living document covering shader work,
camera-relative rendering for float32 precision at large scene distances,
binary-star orbital dynamics, N-body perturbations, and data-pipeline
expansion. Verify items against the code before acting on them; it drifts.
