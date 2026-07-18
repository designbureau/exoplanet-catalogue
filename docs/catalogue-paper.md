# A Catalogue of Alien Worlds

### A procedural-visualisation interface to the Open Exoplanet Catalogue

**Ian Jamieson**

July 2026

*System description.*

---

## Abstract

More than four thousand planetary systems beyond the Sun have been confirmed,
and almost none of them has ever been seen. The observational record of an
exoplanet is a handful of numbers, a period, a radius or a minimum mass, an
orbital distance, the temperature and size of its star, and the public
encounters that record either as a table or as an artist's impression whose
relationship to the data is undisclosed.

This paper describes a web interface to the Open Exoplanet Catalogue that
takes a third route: every one of the catalogue's 4,081 systems is rendered as
an explorable three-dimensional scene, with each planet's appearance *derived*
from its recorded physical parameters through an explicit classification
pipeline and a procedural shader, rather than painted by hand. The system
comprises three surfaces, a curated catalogue of featured systems, a
per-system orbital viewer with Keplerian propagation, and a galactic star map
of every catalogued system positioned by right ascension, declination and
distance, over a build-time pipeline that converts the catalogue's XML into
JSON and a bake pipeline that pre-renders thumbnails with the same shaders
used live.

Two engineering problems dominate the account: honesty about scale (a scene
that must hold a star, planets a hundredth of its size, and an orbit at
seventy-nine thousand scene units, all within 32-bit GPU arithmetic) and
honesty about knowledge (what may be drawn from data, and what is fiction).
The first is addressed with relative-to-eye orbit rendering, explicit scale
compromises that are stated rather than hidden, and documented clamps; the
second is the subject of the companion paper on procedural appearance. A third
companion paper situates both within the wider landscape of exoplanet
visualisation. No user study has yet been run; the evaluation section
specifies one.

---

## 1. Introduction

The first planet found orbiting a Sun-like star was announced in 1995 (Mayor &
Queloz 1995); three decades later the confirmed count is in the thousands, and
grows weekly. Yet the exoplanet is a peculiar object of public fascination: it
is almost always invisible. Nearly every known exoplanet was detected
indirectly, as a periodic dimming of its star's light or a periodic wobble in
its star's spectrum, and even the few dozen imaged directly appear as
unresolved points of light (Marois et al. 2008). There is no photograph of an
exoplanet's surface, and there will be none for the foreseeable future.

What exists instead is a catalogue: for each system, a set of measured and
inferred quantities, with uncertainties, maintained in public databases
(Akeson et al. 2013; Schneider et al. 2011; Rein 2012). The catalogue is open,
machine-readable, and hard to *see*. A table of periods and radii does not
communicate that TRAPPIST-1's seven worlds huddle closer to their star than
Mercury does to the Sun, or that a hot Jupiter's year lasts four days, or what
it means for a planet to be tidally locked. The gap this project addresses is
between the availability of the data and its legibility as a set of *places*.

The system described here renders the entire Open Exoplanet Catalogue, 4,081
system records vendored as XML and synchronised weekly with the upstream
repository, as an interactive site: a catalogue page of featured systems, a
three-dimensional viewer for any system, and a star map of the whole
catalogue. Its central design commitment, developed at length in the companion
paper *Plausible Worlds from Sparse Parameters*, is that a planet's rendered
appearance is a deterministic function of its recorded parameters: a
classification pipeline assigns each planet one of sixteen physically
motivated types, and a procedural shader renders that type. Nothing is
hand-painted; nothing is random between visits; and the boundary between
measurement and plausible fiction is stated.

### Contributions

The underlying technologies, a React application, a WebGL scene graph,
procedural noise shaders, are established practice and are not claimed as
contributions. The contributions are the application and the engineering
record.

1. **A worked, whole-catalogue application of parameter-derived rendering.**
   Not a curated dozen showpieces but every system in the catalogue, including
   the sparse majority for which only two or three parameters are recorded,
   with documented fallbacks for every missing quantity.
2. **An account of numerical honesty at scene scale.** The viewer holds bodies
   from 0.08 to thousands of scene units across orbits up to ~10⁵ units in
   32-bit GPU arithmetic. We document the failure modes (orbit-line jitter at
   distance, planets rendered inside their stars, binary separations wrong by
   orders of magnitude from unit ambiguity) and the fixes (relative-to-eye
   orbit rendering with high/low float splitting, periapsis clamping, unit
   disambiguation), each stated as a compromise rather than hidden.
3. **A reproducible bake pipeline**, in which the same GLSL shaders that
   render planets live also pre-render the catalogue's thumbnails through a
   headless browser, so that the still and the interactive views cannot drift
   apart.
4. **An honesty-first framing**, carried through the interface: scale
   compromises are documented in code and in this paper, speculative
   appearance is the subject of an explicit companion analysis, and the known
   infelicities of the current build are listed in Appendix B rather than
   elided.

---

## 2. Background: what the catalogue contains

### 2.1 The Open Exoplanet Catalogue

The Open Exoplanet Catalogue (OEC) is a community-maintained, decentralised
database of exoplanet discoveries, stored as one XML file per system under
version control (Rein 2012). It was chosen over the institutional alternatives
(the NASA Exoplanet Archive, exoplanet.eu) for two properties that suit a
self-contained web application: the entire catalogue is a directory of files
that can be vendored into the repository, and its hierarchical schema
represents multiple-star systems natively. A `<binary>` element contains
stars, planets, or further binaries, so a hierarchical triple like 16 Cygni,
two stars in a close pair with a third carrying the planet, is a tree, not a
footnote.

The trade-off is currency. Community maintenance has slowed relative to the
institutional archives, and the vendored copy's 4,081 system files should be
read as the OEC's coverage, not the field's: the NASA Exoplanet Archive's
confirmed-planet count is substantially higher. The repository syncs with
upstream weekly (a scheduled job, Mondays 06:00 UTC), so the gap is upstream,
not local. This is stated in the interface's favoured spirit of honesty: the
figures the site shows are the catalogue's.

### 2.2 The anatomy of a system record

A system record contains, at most: a name and aliases; right ascension,
declination, and distance (parsecs, with error bounds); for each star, mass,
radius, effective temperature, spectral type, metallicity, magnitudes, and
age; for each planet, mass (sometimes only *m* sin *i*), radius, period,
semi-major axis, eccentricity, inclination, periastron, discovery method and
year, and a prose description. Binary systems add separations (in arcseconds
and/or AU) and position angles.

The operative phrase is *at most*. The catalogue's sparsity is structural, not
incidental: transit surveys yield radii but often no mass; radial-velocity
detections yield minimum masses but no radius; many entries record little more
than a period and a host star. Every downstream stage of the system,
classification, scaling, orbit propagation, therefore begins from the premise
that any field may be absent, and the fallback chain for each quantity is part
of the design (Section 3.5, and the companion paper §3).

---

## 3. The system

### 3.1 Design principles

Five tenets served as tiebreakers throughout.

1. **Derive, don't decorate.** A planet's look must be a function of its data.
   The same record renders the same world on every visit (appearance is seeded
   deterministically); a different record renders a different world.
2. **State the compromise.** Where legibility requires departing from physical
   truth, in inflated body scales, clamped orbits, or exaggerated
   inclinations, the departure is explicit in code comments and in this
   paper, never silent.
3. **The catalogue is the interface.** Browse views, featured cards, and the
   star map all resolve to the same underlying records; there is no separate
   "content" layer that could drift from the data.
4. **Live and baked must agree.** Pre-rendered imagery is produced by the same
   shaders as the interactive scene, through the bake pipeline, so a thumbnail
   is a genuine still of the world the viewer will show.
5. **Dark, editorial, quiet.** The visual register is a black-background
   editorial catalogue, closer to a printed atlas than to an application, so
   that the procedural worlds, not the chrome, carry the interest.

### 3.2 Architecture and stack

The application is a server-rendered React Router site with a three.js scene
graph mounted per route.

| Layer | Component |
|---|---|
| Framework | React Router 7.13 (framework mode, SSR on, file-system routes) |
| 3D | three.js 0.172 via @react-three/fiber 8.17, drei 9.120 |
| Shaders | Hand-written GLSL (planet ~2,100 lines; star; nebula; orbit lines) |
| Data | Vendored OEC XML → build-time JSON (xml2js 0.6) |
| Post-processing | @react-three/postprocessing (SMAA, ACES tone mapping et al.) |
| Bake | Playwright headless Chromium, 512 px PNG per featured system |
| Hosting | Vercel (git-connected build); Node ≥ 18 |

Three routes carry the experience: the catalogue index (`/`), the system
viewer (`/system/:filename`), and the star map (`/galaxy`). A fourth route
(`/planet-bake`) exists only as the bake pipeline's render target.

### 3.3 The data pipeline

A prebuild script (`scripts/prebuild-data.js`) runs before every build and
converts the 4,081 XML files once, so that no XML is parsed at request time.

- **Per-system JSON.** Each system file is parsed (xml2js, attributes
  discarded) and written to `data-json/<name>.json`. The system viewer's
  loader reads this JSON from disk (or, client-side, over HTTP); a missing
  file is a 404, not a crash.
- **The galaxy index.** For every system with usable coordinates, the script
  extracts right ascension, declination and distance, converts RA
  (hours–minutes–seconds, at 15° per hour) and declination (signed
  degrees–minutes–seconds) to radians, and projects to Cartesian coordinates:
  *x* = *d*·cos δ·cos α, *y* = *d*·cos δ·sin α, *z* = *d*·sin δ, with *d* in
  parsecs. Each index record carries name, filename, position, distance, and
  planet count. Systems without coordinates are skipped and counted; the
  script reports parsed, skipped and indexed totals on every run.

The generated `data-json/` directory is gitignored and rebuilt per checkout;
the vendored XML is the only checked-in data artefact.

### 3.4 The catalogue surface

The index page presents a masthead, a stats strip, and a grid of systems. Two
details are worth recording.

**Curated cards over live data.** Twenty-one systems are editorially selected
(`catalogueSystems.ts`): TRAPPIST-1, Proxima Centauri, 51 Pegasi, Kepler-442,
HR 8799, 55 Cancri, the Solar System as reference, and others, each with a
blurb, a featured planet, tags drawn from a fixed eight-tag vocabulary
(habitable zone, rocky, gas giant, historic, nearest, exotic, multi-planet),
and a seed. The cards are curated *pointers*: each links into the same
system-viewer route as any search result, so curation adds narrative without
forking the data path.

**Baked thumbnails with a CSS terminator.** Each card's planet image is a
512-pixel PNG pre-rendered by the bake pipeline (Section 3.7) from the
featured planet's classification. The day–night terminator is then applied in
CSS, an inset box-shadow crescent overlay whose offsets scale with the
rendered diameter, so that the lighting can respond to interaction (the shadow
relaxes on hover) without re-rendering. It is a presentational trick, and it
is confined to the thumbnails; the viewer's lighting is computed in the
shader.

The masthead behind the title is not an image but a live shader planet at
1300 × 1300 render resolution, cycling through nine representative types on a
six-second interval, draggable with inertia. It is the first statement of the
project's thesis: the artwork is the data pipeline running.

### 3.5 The system viewer

The viewer renders one system as a navigable scene: star (or star hierarchy),
planets on animated orbits, habitable-zone annulus, orbit lines, nebula and
Milky Way skybox, under cinematic post-processing.

**Scale model.** One astronomical unit maps to 2,000 scene units; one solar
radius is then 9.30 units and one Jupiter radius 0.926 (the physical ratios,
1 AU = 215.032 R☉ and 1 R☉ = 10.045 R_Jup, are kept in code as named
constants). Bodies are additionally inflated by a user-adjustable `bodyScale`
(default ×3), because at true scale a planet at catalogue distances is
subpixel; this is the compromise every orrery makes. Crucially, the inflation
applies to *bodies but not orbits*, which is stated in a code comment and has
a consequence dealt with below.

**Keplerian propagation.** Each planet's position is computed per frame from
first principles: mean anomaly advances as (elapsed/period) scaled by a global
time-compression factor, plus a phase offset (the recorded periastron where
present, else a deterministic name-hash so that co-orbital planets do not
stack); Kepler's equation *M* = *E* − *e* sin *E* is solved by Newton–Raphson
(at most 30 iterations, tolerance 10⁻⁸, seeded at *E* = π for *e* > 0.8,
following standard practice; Danby 1988, Colwell 1993); true anomaly and
radius follow, and near-circular orbits (*e* < 10⁻⁶) short-circuit to the
trigonometric case. Because every planet advances by elapsed/period,
*relative* orbital rates within a system are correct even though absolute time
is compressed.

**The hot-Jupiter clamp.** Body inflation without orbit inflation means a
close-in planet's *rendered* orbit can lie inside its star's *rendered*
surface; WASP-12 b, at 0.023 AU around a swollen star, was the discovered
case. The viewer clamps: if periapsis *a*(1 − *e*) falls below the star's
scene radius plus 1.6× the planet's, the semi-major axis is pushed out to
clear it. This is a legibility lie, documented as such; the alternative,
rendering the truth, shows a planet orbiting *within* a photosphere, which
reads as a bug rather than as the genuinely remarkable fact that hot Jupiters
skim their stars.

**Binaries.** The OEC's hierarchical `<binary>` trees are rendered
recursively: each binary node splits into two children (stars, planets, or
nested binaries) placed on opposite sides of the barycentre with mass-weighted
offsets and the recorded position angle. One data hazard is disambiguated
explicitly. The catalogue may record separation twice, in arcseconds and in
AU, and naive parsing takes the arcsecond value first, an error of three
orders of magnitude; the loader takes the maximum of the numeric candidates,
on the grounds that the AU figure is always the larger. WASP-12's colliding
star pair was the motivating failure. Separations are further clamped to a
maximum scene offset, because float32 matrix arithmetic degrades visibly
beyond ~10⁶ units.

**Orbit lines at distance: relative-to-eye rendering.** The most instructive
numerical problem was the outermost orbits. At Pluto-scale distances (~79,000
scene units) a float32 vertex position has a granularity of roughly 0.005
units, and the standard modelView transform subtracts two nearly equal large
numbers (vertex − camera), so orbit lines visibly jittered and breathed as the
camera moved. The fix is the relative-to-eye technique from virtual-globe
rendering (Cozzi & Ring 2011): each orbit vertex is split at build time into a
high part (the float32-rounded value, via `Math.fround`) and a low part (the
residual), stored as two attributes; the camera position, transformed into the
orbit's local frame each frame, is split the same way; and the vertex shader
computes (pos_high − cam_high) + (pos_low − cam_low), in which the large high
parts cancel *exactly* and the residuals carry the precision. The modelView's
translation component is discarded (only its rotation is applied), so no large
translation ever enters the GPU pipeline. Orbit lines additionally fade out as
the camera approaches a planet, ramping over 5–20 % of the semi-major axis, so
that the line never slices through a close-up view. Segment counts adapt to
circumference (256–8,192).

**Controls and locks.** Camera control (drei `CameraControls`) enforces a
minimum approach distance of 1.15× a selected body's rendered radius, so that
one cannot dolly inside a star, and a follow mode re-targets the camera each
frame without damping, because damped following visibly lags a fast
hot-Jupiter. Tidally locked planets (as flagged by the classification) do not
rotate; their cloud layers are slaved to surface rotation at 1.15×
(super-rotation), so that clouds on a locked world correctly stand still with
it rather than counter-rotating, a subtle correctness bug found and fixed
during development.

**Habitable zone.** The annulus is computed per star from the Kopparapu et al.
(2013) effective-flux polynomials (runaway-greenhouse inner edge,
maximum-greenhouse outer edge), with luminosity from Stefan–Boltzmann when
temperature and radius are recorded and from a spectral-type-dependent
mass–luminosity power law otherwise. It renders as an additive, double-sided,
soft-edged ring, tilted to the mean inclination of the system's planets, off
by default and toggled from the toolbar.

### 3.6 The star map

The `/galaxy` route renders every indexed system as one point in a single
`THREE.Points` cloud, at one parsec per scene unit, with Sol injected at the
origin. The prebuilt Cartesian positions are used directly (the scene remaps
the catalogue's *z*-up to the renderer's *y*-up). An equatorial reference grid
draws concentric rings at 200–1,000 parsecs with radial spokes at 30°
intervals, and a zodiac-constellation overlay is projected by the same RA/dec
formula for orientation. Hover and selection surface each system's name,
distance and planet count, and click-through opens the system viewer; the map
and the viewer are two projections of the same records.

### 3.7 The bake pipeline

Thumbnails are not exported art; they are captured output. A Node script
launches headless Chromium (Playwright), starts the site on a local port,
navigates to the dedicated `/planet-bake` route for each of the 21 curated
slugs, which classifies the featured planet from its real catalogue record and
renders it with the production shaders, and screenshots a 512-pixel PNG per
system into `public/planet-thumbs/`. Because bake and live share one shader
and one classification, a change to either regenerates *both* looks with a
single command, and the stills cannot silently diverge from the interactive
truth. (The pipeline exists because the live shader at full quality is too
costly to run two dozen times on a catalogue page; the masthead runs exactly
one live instance.)

---

## 4. Related work

**Interactive astronomy visualisation.** NASA's Eyes on Exoplanets renders the
known exoplanet population as navigable 3D, from institutionally curated data;
OpenSpace (Bock et al. 2020) and Gaia Sky (Sagristà et al. 2019) target
planetarium-grade contextualisation of astronomical catalogues, with the Gaia
star catalogue as the paradigm case; Celestia and Stellarium are the
long-standing open-source ancestors. This project differs in two commitments:
the appearance layer is parameter-derived per planet, rather than a stock
texture per class, and the whole pipeline, data, classification, shaders and
bake, is a single small open codebase intended to be read. The comparative
landscape is the subject of the third companion paper.

**Procedural planets.** Procedural planetary surfaces have a deep graphics
lineage (Perlin 1985; Musgrave et al. 1989; Ebert et al. 2003) and a
contemporary commercial one (Space Engine; No Man's Sky). The distinction here
is the *grounding*: procedural technique is subordinated to a documented
classification of real catalogue records. That layer is the subject of the
companion paper, which carries the related work on noise and shading.

**Precision rendering at planetary scale.** The high/low float splitting used
for orbit lines is standard in virtual-globe engines (Cozzi & Ring 2011),
where Earth-sized coordinates exceed float32; the contribution here is only
its application to orbit polylines in a catalogue viewer, together with the
documented decision to treat the remaining large-coordinate artefacts (binary
offsets) with clamps rather than a full floating-origin refactor, a scoping
judgement, noted on the roadmap.

**Data infrastructure.** The OEC's design rationale is given by Rein (2012);
the institutional archives by Akeson et al. (2013) and Schneider et al.
(2011). The prebuild-to-JSON pattern follows ordinary static-site practice and
claims no novelty.

---

## 5. Evaluation

No empirical results are reported; this section specifies the evaluation the
system is designed to support.

**Performance.** Frame-time distributions (median, p95) across a stratified
sample of systems: single-star single-planet, high-multiplicity (TRAPPIST-1,
Kepler-90), hierarchical binaries (16 Cygni), and extreme-scale orbits, on
reference hardware tiers, with and without post-processing; together with
time-to-first-frame for the viewer route and bake-pipeline wall time.

**Numerical fidelity.** Orbit-line stability quantified as screen-space vertex
displacement across camera dollies at fixed logical positions, RTE on against
RTE off; propagation accuracy against a reference double-precision ephemeris
over 10³ orbits (drift in phase); and verification that the clamped cases
(periapsis, binary separation) are the only cases in the catalogue where
rendered geometry departs from computed geometry, with an exhaustive count of
each.

**Classification audit.** Since the appearance layer's validity rests on the
classification, a sample of catalogue planets with published characterisation
(confirmed hot Jupiters, the TRAPPIST-1 planets, known super-puffs) should be
checked against assigned types by a domain reviewer, with disagreement rates
reported per branch of the decision tree. This audit is specified in detail in
the companion paper.

**Readers.** A task-based study with non-specialist readers, locate a system,
state which of two planets is hotter and why, judge whether an orbit's speed
difference is meaningful, against the same tasks on a tabular interface,
measuring accuracy and self-reported understanding, with explicit probes for
the misconception risks the companion papers identify as the central hazard of
the genre: do participants believe they saw photographs? do they report the
continents as known?

---

## 6. Limitations

**The stats strip mislabels its sources.** The headline figure labelled
"confirmed" is in fact the live *system-file count* (4,081), while the figure
labelled "systems" (4,231), together with the habitable-zone (62) and
earth-like (147) counts, is a hardcoded literal. The labels and sources are
crossed, and the derived counts should be computed from the index at build
time. This is the most concrete honesty defect in the current build, and it is
flagged for repair.

**Orbital orientation is incomplete and exaggerated.** Only inclination is
applied to an orbit's plane, as a single tilt; longitude of the ascending node
and argument of periapsis are not represented in 3D (periapsis enters only as
a phase offset). Moreover the tilt applied is twice the physical
degree-to-radian mapping (π/90 per degree), so rendered inclinations are
exaggerated by a factor of two. Read as a legibility choice, it is
undocumented in the interface; read as an artefact, it is a bug. Either way,
rendered orbital geometry is not to scale in orientation, and this paper is
currently the only place that says so.

**Scale is a stack of stated compromises.** Bodies ×3 (adjustable), orbits
unscaled, hot-Jupiter periapses clamped, binary separations clamped at 20,000
units, time compressed by a global factor. Each is individually documented,
but their *composition* means the viewer is an interpretive diagram, not a
simulation; a reader who measures the screen will not recover the catalogue.

**One catalogue, ageing.** Coverage and currency are bounded by the OEC.
Systems confirmed since the community catalogue's maintenance slowed are
absent, and no cross-check against the NASA archive is performed. Weekly sync
guarantees freshness against upstream only.

**Sparse-data planets are rendered with equal confidence.** A planet known
only by period and *m* sin *i* renders as vividly as TRAPPIST-1 e. The
classification pipeline's fallback chain (companion paper §3) makes the
*derivation* honest, but the interface does not yet surface per-planet data
completeness; a "what is this picture based on?" affordance remains roadmap.

**No moons; controversial entries included.** Satellites in the catalogue are
not rendered. Planets flagged `Controversial` upstream are rendered without a
visual distinction.

**No user study has been run.** All claims about legibility are design
rationale, not measured outcomes (Section 5).

---

## 7. Conclusion

This paper has described a system that renders an entire public exoplanet
catalogue as explorable places: a data pipeline from vendored XML, a
classification-driven appearance layer, a Keplerian viewer engineered to
remain truthful or explicit at float32's edges, and a star map that situates
four thousand systems in three dimensions. The engineering lesson generalises
beyond astronomy: a visualisation over public scientific data earns trust not
by maximal realism but by stated derivation, every pixel traceable to a
record, every departure from truth documented as a compromise. The system's
remaining dishonesties are enumerable (Section 6, Appendix B), which is the
point: they are a to-do list, not an aesthetic.

What the interface cannot settle is how much of what it shows is *known*. That
question, where measurement ends and plausible fiction begins in a rendered
exoplanet, is the subject of the companion paper *Plausible Worlds from Sparse
Parameters*; and what such interfaces can achieve for public understanding,
against the wider landscape from artist's impressions to planetarium software,
is the subject of the third, *From Data Point to Destination*.

---

## Acknowledgements

This project exists because the Open Exoplanet Catalogue's maintainers chose
openness and decentralisation (Rein 2012), and because the three.js,
react-three-fiber and wider WebGL communities made planetary-scale rendering
in the browser a practical undertaking. The Milky Way skybox derives from NASA
imagery. The classification stands on the exoplanet characterisation
literature cited in the companion paper.

---

## References

*Exoplanet data infrastructure*

- Rein, H. (2012). A proposal for community driven and decentralized
  astronomical databases and the Open Exoplanet Catalogue. arXiv:1211.7121.
- Akeson, R. L., et al. (2013). The NASA Exoplanet Archive: Data and Tools for
  Exoplanet Research. *PASP* 125, 989.
- Schneider, J., Dedieu, C., Le Sidaner, P., Savalle, R., & Zolotukhin, I.
  (2011). Defining and cataloging exoplanets: the exoplanet.eu database.
  *A&A* 532, A79.

*Discoveries and characterisation*

- Mayor, M., & Queloz, D. (1995). A Jupiter-mass companion to a solar-type
  star. *Nature* 378, 355–359.
- Marois, C., et al. (2008). Direct Imaging of Multiple Planets Orbiting the
  Star HR 8799. *Science* 322, 1348–1352.
- Gillon, M., et al. (2017). Seven temperate terrestrial planets around the
  nearby ultracool dwarf star TRAPPIST-1. *Nature* 542, 456–460.
- Kopparapu, R. K., et al. (2013). Habitable Zones around Main-sequence Stars:
  New Estimates. *ApJ* 765, 131.

*Orbital mechanics and numerics*

- Danby, J. M. A. (1988). *Fundamentals of Celestial Mechanics*, 2nd ed.
  Willmann-Bell.
- Colwell, P. (1993). *Solving Kepler's Equation Over Three Centuries*.
  Willmann-Bell.
- Cozzi, P., & Ring, K. (2011). *3D Engine Design for Virtual Globes*. CRC
  Press. (Relative-to-eye rendering; high/low floating-point splitting.)

*Visualisation systems*

- Bock, A., et al. (2020). OpenSpace: A System for Astrographics. *IEEE
  Transactions on Visualization and Computer Graphics* 26(1), 633–642.
- Sagristà, A., Jordan, S., Müller, T., & Sadlo, F. (2019). Gaia Sky:
  Navigating the Gaia Catalog. *IEEE TVCG* 25(1), 1070–1079.
- NASA/JPL-Caltech. Eyes on Exoplanets. https://eyes.nasa.gov/apps/exo/

*Procedural graphics (fuller list in the companion paper)*

- Perlin, K. (1985). An Image Synthesizer. *SIGGRAPH '85*, 287–296.
- Musgrave, F. K., Kolb, C. E., & Mace, R. S. (1989). The synthesis and
  rendering of eroded fractal terrains. *SIGGRAPH '89*, 41–50.
- Ebert, D. S., Musgrave, F. K., Peachey, D., Perlin, K., & Worley, S. (2003).
  *Texturing & Modeling: A Procedural Approach*, 3rd ed. Morgan Kaufmann.

---

## Appendix A: System at a glance

| Metric | Value |
|---|---|
| Catalogue systems (vendored XML) | 4,081, synced weekly from OEC upstream |
| Curated featured systems | 21 |
| Planet types (classification) | 16 (incl. UNKNOWN, unassigned in practice) |
| Planet shader | ~2,100 lines GLSL, ~69 uniforms, 7 fragment programs |
| Scene scale | 1 AU = 2,000 units; 1 R☉ = 9.30; 1 R_Jup = 0.926; bodies ×3 |
| Kepler solve | Newton–Raphson, tol 10⁻⁸, ≤30 iterations |
| Orbit lines | RTE high/low split, 256–8,192 segments, proximity fade |
| Star map | 1 pc = 1 unit; every indexed system as one point; Sol at origin |
| Thumbnails | 21 × 512 px PNG, baked via headless Chromium from live shaders |
| Stack | React Router 7.13 SSR · three.js 0.172 · R3F 8.17 · Vercel |

## Appendix B: Known infelicities

In the spirit of stating rather than eliding, the current build's known
defects, none load-bearing.

1. The stats strip's label–source crossing (Section 6), the one defect that
   affects displayed figures.
2. Inclination applied at twice the physical angle, with node and periapsis
   orientation unrepresented (Section 6).
3. `PlanetType.UNKNOWN` is defined but unreachable; every branch of the
   classifier assigns a concrete type.
4. A standalone ice-ocean fragment shader exists but is never selected;
   eyeball worlds route through the terrestrial program's tidally-locked
   branches.
5. One shader uniform (`u_lavaGlow`) is declared twice; the second declaration
   wins silently.
6. The prebuild script's header comment names output paths that were later
   renamed; the constants, not the comment, are authoritative.
7. The declared TypeScript type for tuning presets is narrower than the object
   the code actually reads (accessed through a cast); the runtime is
   permissive, the type is stale.

Each is recorded here so that the paper, like the interface, does not claim a
cleanliness the repository does not have.
