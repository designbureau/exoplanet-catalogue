import * as THREE from "three";

// Planet types based on size, temperature, and composition
export enum PlanetType {
  // Gas giants (Sudarsky classification)
  COLD_GIANT = "COLD_GIANT",         // Class I: ammonia bands, Jupiter-like
  COOL_GIANT = "COOL_GIANT",         // Class II: water-ice clouds, bright white
  WARM_GIANT = "WARM_GIANT",         // Class III: cloudless azure blue
  HOT_JUPITER_IV = "HOT_JUPITER_IV", // Class IV: very dark, alkali absorption
  HOT_JUPITER_V = "HOT_JUPITER_V",   // Class V: silicate clouds, thermal glow

  // Ice giants
  ICE_GIANT = "ICE_GIANT",           // Methane blue/cyan

  // Sub-Neptunes
  WATER_WORLD = "WATER_WORLD",       // Low density, volatile-rich
  SUB_NEPTUNE = "SUB_NEPTUNE",       // Rocky with thick atmosphere

  // Rocky
  LAVA_WORLD = "LAVA_WORLD",         // Ultra-hot, magma surface
  HOT_ROCKY = "HOT_ROCKY",           // Hot airless rocky (Mercury-like)
  VENUS_LIKE = "VENUS_LIKE",         // Hot, thick haze (larger rocky worlds)
  TEMPERATE = "TEMPERATE",           // Habitable zone, Earth-like potential
  FROZEN = "FROZEN",                 // Cold, icy surface

  UNKNOWN = "UNKNOWN",
}

export interface ShaderParams {
  type: PlanetType;
  color1: THREE.Color;
  color2: THREE.Color;
  color3: THREE.Color;
  color4: THREE.Color;
  noiseScale: number;
  swirlStrength: number;
  swirlSpeed: number;
  warpIntensity: number;
  emissive: THREE.Color;
  emissiveIntensity: number;
  equilibriumTemp: number;
  stellarFlux: number;      // S_eff relative to Earth (1.0 = Earth flux)
  seed: THREE.Vector3;
  atmosColor: THREE.Color;
  atmosIntensity: number;
  atmosDayColor: THREE.Color;
  atmosTwilightColor: THREE.Color;
  // Atmosphere layer flags
  hasAtmosphere: boolean;
  showRim: boolean;
  showShell: boolean;
  showHalo: boolean;
  hasHzGradient: boolean;
  // Per-planet atmosphere intensities
  rimIntensity: number;
  rimFalloff: number;
  shellIntensity: number;
  haloIntensity: number;
  haloScale: number;
  haloFalloff: number;
  haloWhiten: number;
  haloShadow: number;
  // Per-planet terrestrial surface params (HZ gradient)
  cloudCoverage?: number;
  cloudOpacity?: number;
  cloudSwirl?: number;
  cloudBands?: number;
  cloudWarp?: number;
  seaLevel?: number;
  iceCapSize?: number;
  iceEdge?: number;
  iceWarp?: number;
  iceDetail?: number;
  coastDetail?: number;
  landContrast?: number;
  continentFreq?: number;
}

// Deterministic string hash for seeding planet noise
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

function planetSeed(name: string): THREE.Vector3 {
  const hx = hashString(name + "x");
  const hy = hashString(name + "y");
  const hz = hashString(name + "z");
  return new THREE.Vector3(
    (((hx % 1000) + 1000) % 1000) / 1000,
    (((hy % 1000) + 1000) % 1000) / 1000,
    (((hz % 1000) + 1000) % 1000) / 1000
  );
}

// Estimate equilibrium temperature from host star and orbital data
// T_eq = T_star * sqrt(R_star / (2 * a))
// When R_star unknown, estimate from mass using main-sequence relation
function estimateEquilibriumTemp(
  starTemp: number,
  starMass: number,
  starRadius: number,
  semimajorAxisAU: number
): number {
  let rStar = starRadius;
  if (rStar <= 0 && starMass > 0) {
    rStar = Math.pow(starMass, 0.8);
  }
  if (rStar <= 0 || semimajorAxisAU <= 0 || starTemp <= 0) return 300;

  const rStarAU = rStar * 0.00465;
  return starTemp * Math.sqrt(rStarAU / (2 * semimajorAxisAU));
}

// Compute effective stellar flux relative to Earth (S_eff)
// S_eff = (T_star/5780)^4 * (R_star)^2 / (a)^2
// where R_star in solar radii, a in AU
// Earth = 1.0, Venus ≈ 1.91, Mars ≈ 0.43
// Based on Kopparapu et al. 2013/2014 and Kane et al. 2014
function computeStellarFlux(
  starTemp: number,
  starMass: number,
  starRadius: number,
  semimajorAxisAU: number
): number {
  let rStar = starRadius;
  if (rStar <= 0 && starMass > 0) {
    rStar = Math.pow(starMass, 0.8);
  }
  if (rStar <= 0 || semimajorAxisAU <= 0 || starTemp <= 0) return 1.0;

  return Math.pow(starTemp / 5780, 4) * Math.pow(rStar, 2) / Math.pow(semimajorAxisAU, 2);
}

// Estimate radius in Earth radii from mass in Jupiter masses
function estimateRadiusFromMass(massJupiter: number): number {
  const massEarth = massJupiter * 317.8;
  if (massEarth < 124) {
    // Small planets: R ∝ M^0.27
    return Math.pow(massEarth, 0.27);
  }
  // Large planets: radius roughly constant (~11 R_Earth)
  return 11;
}

export interface ClassificationInput {
  massJupiter: number;       // planet mass in Jupiter masses
  radiusJupiter: number;     // planet radius in Jupiter radii
  semimajorAxisAU: number;   // orbital distance in AU (raw, not scene units)
  starTemp: number;          // host star temperature K
  starMass: number;          // host star mass in solar masses
  starRadius: number;        // host star radius in solar radii
  name?: string;             // planet name for unique seed generation
  hzRanges?: HzRanges;       // GUI-driven HZ gradient range overrides
}

export function classifyPlanet(input: ClassificationInput): ShaderParams {
  const { massJupiter, radiusJupiter, semimajorAxisAU, starTemp, starMass, starRadius } = input;

  // Convert to Earth units for classification
  let radiusEarth = radiusJupiter * 11.209;
  const massEarth = massJupiter * 317.8;

  // Estimate radius if missing
  if (radiusEarth <= 0 && massJupiter > 0) {
    radiusEarth = estimateRadiusFromMass(massJupiter);
  }

  // Estimate mass from radius if missing (inverse of mass-radius relation)
  let effectiveMassEarth = massEarth;
  if (massEarth <= 0 && radiusEarth > 0) {
    effectiveMassEarth = Math.pow(radiusEarth, 1 / 0.27);
  }

  // Compute equilibrium temperature and stellar flux
  const rawSMA = semimajorAxisAU > 0 ? semimajorAxisAU : 1;
  const tEq = estimateEquilibriumTemp(starTemp, starMass, starRadius, rawSMA);
  const sEff = computeStellarFlux(starTemp, starMass, starRadius, rawSMA);

  // Bulk density (if both mass and radius available)
  const density = (radiusEarth > 0 && effectiveMassEarth > 0)
    ? effectiveMassEarth / Math.pow(radiusEarth, 3) * 5.51 // relative to Earth density
    : -1;

  // Classification decision tree
  // Rocky planet boundaries use stellar flux (Kopparapu et al. 2013, Kane et al. 2014):
  //   S_eff > 25    → atmosphere eroded (LAVA_WORLD)
  //   S_eff > 1.04  → Venus Zone / runaway greenhouse (VENUS_LIKE or HOT_ROCKY)
  //   S_eff 0.35–1.04 → Habitable Zone (TEMPERATE)
  //   S_eff < 0.35  → too cold (FROZEN)
  let type: PlanetType;

  if (radiusEarth > 6 || (radiusEarth <= 0 && massEarth > 50)) {
    // Gas giant (still use tEq — flux boundaries are for rocky planets)
    if (tEq > 1400) type = PlanetType.HOT_JUPITER_V;
    else if (tEq > 900) type = PlanetType.HOT_JUPITER_IV;
    else if (tEq > 350) type = PlanetType.WARM_GIANT;
    else if (tEq > 150) type = PlanetType.COOL_GIANT;
    else type = PlanetType.COLD_GIANT;
  } else if (radiusEarth > 3.5) {
    type = PlanetType.ICE_GIANT;
  } else if (radiusEarth > 1.75) {
    if (density >= 0 && density < 2) type = PlanetType.WATER_WORLD;
    else type = PlanetType.SUB_NEPTUNE;
  } else if (radiusEarth > 0) {
    // Rocky planets: use stellar flux for Venus/HZ/Frozen boundaries
    if (sEff > 25) type = PlanetType.LAVA_WORLD;
    else if (sEff > 1.04 && radiusEarth > 0.5) type = PlanetType.VENUS_LIKE;
    else if (sEff > 1.04) type = PlanetType.HOT_ROCKY;  // too small to retain atmosphere
    else if (sEff > 0.35) type = PlanetType.TEMPERATE;
    else type = PlanetType.FROZEN;
  } else {
    // No size data at all - guess from temperature
    if (tEq > 1000) type = PlanetType.HOT_JUPITER_IV;
    else if (tEq > 400) type = PlanetType.WARM_GIANT;
    else type = PlanetType.COLD_GIANT;
  }

  return getShaderParams(type, tEq, input.name || "planet", starTemp || 5500, massJupiter, radiusJupiter, input.hzRanges, sEff);
}

export interface HzRanges {
  atmos?: [number, number];
  cloudCover?: [number, number];
  cloudOpacity?: [number, number];
  seaLevel?: [number, number];
  iceCap?: [number, number];
  continentFreq?: [number, number];
}

function getShaderParams(type: PlanetType, tEq: number, name: string, starTemp: number, massJup: number = 0, radiusJup: number = 0, hzRanges?: HzRanges, sEff: number = 1.0): ShaderParams {
  const base: ShaderParams = {
    type,
    color1: new THREE.Color(0.5, 0.5, 0.5),
    color2: new THREE.Color(0.5, 0.5, 0.5),
    color3: new THREE.Color(0.5, 0.5, 0.5),
    color4: new THREE.Color(0.5, 0.5, 0.5),
    noiseScale: 10,
    swirlStrength: 0.2,
    swirlSpeed: 0.005,
    warpIntensity: 3.0,
    emissive: new THREE.Color(0, 0, 0),
    emissiveIntensity: 0,
    equilibriumTemp: tEq,
    stellarFlux: sEff,
    seed: planetSeed(name),
    atmosColor: new THREE.Color(0, 0, 0),
    atmosIntensity: 0,
    atmosDayColor: new THREE.Color(0x00aaff),
    atmosTwilightColor: new THREE.Color(0xff6600),
    hasAtmosphere: false,
    showRim: false,
    showShell: false,
    showHalo: false,
    rimIntensity: 0,
    rimFalloff: 1.0,
    shellIntensity: 0,
    haloIntensity: 0,
    haloScale: 2.0,
    haloFalloff: 1.5,
    haloWhiten: 0.35,
    haloShadow: 0.7,
    hasHzGradient: false,
  };

  switch (type) {
    case PlanetType.COLD_GIANT:
      // Jupiter-like: orange/brown bands with white zones
      base.color1 = new THREE.Color(0.6, 0.35, 0.15);
      base.color2 = new THREE.Color(0.85, 0.75, 0.55);
      base.color3 = new THREE.Color(0.5, 0.3, 0.1);
      base.color4 = new THREE.Color(0.9, 0.85, 0.7);
      base.swirlStrength = 0.25;
      base.warpIntensity = 2.5;
      break;

    case PlanetType.COOL_GIANT:
      // Water-ice clouds: bright white/cream — no separate atmosphere shell
      base.color1 = new THREE.Color(0.9, 0.9, 0.85);
      base.color2 = new THREE.Color(0.95, 0.95, 0.9);
      base.color3 = new THREE.Color(0.8, 0.82, 0.85);
      base.color4 = new THREE.Color(1.0, 1.0, 0.95);
      base.swirlStrength = 0.15;
      base.warpIntensity = 2.0;
      break;

    case PlanetType.WARM_GIANT:
      // Cloudless azure blue (Rayleigh scattering)
      base.color1 = new THREE.Color(0.15, 0.25, 0.6);
      base.color2 = new THREE.Color(0.2, 0.35, 0.7);
      base.color3 = new THREE.Color(0.1, 0.2, 0.55);
      base.color4 = new THREE.Color(0.25, 0.4, 0.75);
      base.swirlStrength = 0.05;
      base.warpIntensity = 1.0;
      base.noiseScale = 8;
      break;

    case PlanetType.HOT_JUPITER_IV:
      // Very dark, alkali absorption
      base.color1 = new THREE.Color(0.05, 0.04, 0.06);
      base.color2 = new THREE.Color(0.1, 0.07, 0.08);
      base.color3 = new THREE.Color(0.08, 0.05, 0.04);
      base.color4 = new THREE.Color(0.12, 0.08, 0.06);
      base.swirlStrength = 0.1;
      base.warpIntensity = 1.5;
      break;

    case PlanetType.HOT_JUPITER_V:
      // Silicate clouds + thermal glow
      base.color1 = new THREE.Color(0.7, 0.5, 0.3);
      base.color2 = new THREE.Color(0.9, 0.7, 0.4);
      base.color3 = new THREE.Color(0.6, 0.3, 0.15);
      base.color4 = new THREE.Color(0.95, 0.8, 0.5);
      base.swirlStrength = 0.15;
      base.emissive = new THREE.Color(0.8, 0.3, 0.05);
      base.emissiveIntensity = 0.3;
      break;

    case PlanetType.ICE_GIANT:
      // Methane blue/cyan (Neptune/Uranus) — no separate atmosphere shell
      base.color1 = new THREE.Color(0.15, 0.35, 0.6);
      base.color2 = new THREE.Color(0.2, 0.5, 0.7);
      base.color3 = new THREE.Color(0.1, 0.3, 0.55);
      base.color4 = new THREE.Color(0.25, 0.55, 0.75);
      base.swirlStrength = 0.08;
      base.warpIntensity = 1.5;
      base.noiseScale = 12;
      break;

    case PlanetType.WATER_WORLD: {
      // Ocean-dominated terrestrial — driven by waterWorld preset
      const ww = (hzRanges as any)?.waterWorld || {};
      // Deep ocean, volcanic islands, reef/sand, pale peaks
      base.color1 = new THREE.Color('#0a1a3d'); // deep ocean
      base.color2 = new THREE.Color('#2a3025'); // dark volcanic rock
      base.color3 = new THREE.Color('#1a2a1a'); // mossy island
      base.color4 = new THREE.Color('#8a8a7a'); // pale reef/sand
      base.noiseScale = 12;
      // Surface params from preset
      base.seaLevel = ww.seaLevel ?? 0.85;
      base.continentFreq = ww.continentFreq ?? 0.05;
      base.iceCapSize = ww.iceCap ?? 0.95;
      base.iceEdge = ww.iceEdge ?? 0.03;
      base.iceWarp = ww.iceWarp ?? 0.6;
      base.iceDetail = ww.iceDetail ?? 0.8;
      base.warpIntensity = (ww.warp ?? 0.4) * 6.0;
      base.coastDetail = ww.coastDetail ?? 0.35;
      base.landContrast = ww.landContrast ?? 1.6;
      base.swirlStrength = 0.15;
      base.cloudCoverage = ww.cloudCover ?? 0.50;
      base.cloudOpacity = ww.cloudOpacity ?? 0.75;
      base.cloudSwirl = ww.cloudSwirl ?? 0.8;
      base.cloudBands = ww.cloudBands ?? 3.0;
      base.cloudWarp = ww.cloudWarp ?? 0.35;
      // Atmosphere
      base.atmosIntensity = ww.atmos ?? 0.0;
      base.atmosDayColor = new THREE.Color(ww.rimDay || '#2266cc');
      base.atmosTwilightColor = new THREE.Color(ww.rimTwi || '#554422');
      base.hasAtmosphere = true;
      base.showRim = true;
      base.showShell = (ww.shell ?? 0) > 0;
      base.showHalo = true;
      base.rimIntensity = ww.rim ?? 0.0;
      base.rimFalloff = ww.rimFalloff ?? 1.0;
      base.shellIntensity = ww.shell ?? 0;
      base.haloIntensity = ww.halo ?? 0.0;
      base.haloScale = ww.haloScale ?? 2.0;
      base.haloFalloff = ww.haloFalloff ?? 1.5;
      base.haloWhiten = ww.haloWhiten ?? 0.3;
      base.haloShadow = ww.haloShadow ?? 0.7;
      base.hasHzGradient = true; // preset controls override globals
      break;
    }

    case PlanetType.SUB_NEPTUNE: {
      // Thick atmosphere, blue-grey — driven by subNeptune preset
      const sn = (hzRanges as any)?.subNeptune || {};
      base.color1 = new THREE.Color(0.4, 0.45, 0.5);
      base.color2 = new THREE.Color(0.5, 0.55, 0.6);
      base.color3 = new THREE.Color(0.35, 0.4, 0.5);
      base.color4 = new THREE.Color(0.55, 0.6, 0.65);
      base.swirlStrength = 0.1;
      base.warpIntensity = 1.5;
      base.atmosIntensity = sn.atmos ?? 0.0;
      base.atmosDayColor = new THREE.Color(sn.rimDay || '#6688bb');
      base.atmosTwilightColor = new THREE.Color(sn.rimTwi || '#445566');
      base.hasAtmosphere = true;
      base.showRim = true;
      base.showShell = (sn.shell ?? 0) > 0;
      base.showHalo = true;
      base.rimIntensity = sn.rim ?? 0.0;
      base.rimFalloff = sn.rimFalloff ?? 0.8;
      base.shellIntensity = sn.shell ?? 0;
      base.haloIntensity = sn.halo ?? 0.0;
      base.haloScale = sn.haloScale ?? 2.5;
      base.haloFalloff = sn.haloFalloff ?? 1.2;
      base.haloWhiten = sn.haloWhiten ?? 0.35;
      base.haloShadow = sn.haloShadow ?? 0.7;
      break;
    }

    case PlanetType.LAVA_WORLD: {
      // Mostly black cooled crust with magma in low areas — driven by lavaWorld preset
      const lw = (hzRanges as any)?.lavaWorld || {};
      base.color1 = new THREE.Color(0.8, 0.25, 0.02);     // low: exposed magma (orange)
      base.color2 = new THREE.Color(0.3, 0.08, 0.02);     // mid-low: cooling rock (dark red)
      base.color3 = new THREE.Color(0.06, 0.04, 0.03);    // mid-high: cooled basalt (near black)
      base.color4 = new THREE.Color(0.03, 0.02, 0.02);    // high: cold crust (black)
      base.swirlStrength = 0.0;
      base.warpIntensity = 4.0;
      base.noiseScale = 15;
      base.emissive = new THREE.Color(1.0, 0.4, 0.05);
      base.emissiveIntensity = 0.6;
      base.atmosIntensity = lw.atmos ?? 0.0;
      base.atmosDayColor = new THREE.Color(lw.rimDay || '#ff7300');
      base.atmosTwilightColor = new THREE.Color(lw.rimTwi || '#881100');
      base.hasAtmosphere = true;
      base.showRim = true;
      base.showShell = (lw.shell ?? 0) > 0;
      base.showHalo = true;
      base.rimIntensity = lw.rim ?? 0.0;
      base.rimFalloff = lw.rimFalloff ?? 0.8;
      base.shellIntensity = lw.shell ?? 0;
      base.haloIntensity = lw.halo ?? 0.0;
      base.haloScale = lw.haloScale ?? 1.5;
      base.haloFalloff = lw.haloFalloff ?? 2.0;
      base.haloWhiten = lw.haloWhiten ?? 0.1;
      base.haloShadow = lw.haloShadow ?? 0.8;
      break;
    }

    case PlanetType.HOT_ROCKY:
      // Mercury-like: dark grey cratered surface
      base.color1 = new THREE.Color(0.25, 0.22, 0.2);
      base.color2 = new THREE.Color(0.35, 0.32, 0.28);
      base.color3 = new THREE.Color(0.18, 0.16, 0.15);
      base.color4 = new THREE.Color(0.4, 0.38, 0.35);
      base.swirlStrength = 0.0;
      base.warpIntensity = 2.5;
      base.noiseScale = 12;
      break;

    case PlanetType.VENUS_LIKE: {
      // Runaway greenhouse — driven by venusZone preset sliders
      const vz = (hzRanges as any)?.venusZone || {};
      base.color1 = new THREE.Color(0.75, 0.65, 0.4);
      base.color2 = new THREE.Color(0.8, 0.7, 0.45);
      base.color3 = new THREE.Color(0.7, 0.6, 0.38);
      base.color4 = new THREE.Color(0.85, 0.75, 0.5);
      base.swirlStrength = 0.03;
      base.warpIntensity = 0.5;
      base.noiseScale = 6;
      base.atmosIntensity = vz.atmos ?? 0.0;
      base.atmosDayColor = new THREE.Color(vz.rimDay || '#ccaa44');
      base.atmosTwilightColor = new THREE.Color(vz.rimTwi || '#aa6622');
      base.hasAtmosphere = true;
      base.showRim = true;
      base.showShell = (vz.shell ?? 0) > 0;
      base.showHalo = true;
      base.rimIntensity = vz.rim ?? 0.0;
      base.rimFalloff = vz.rimFalloff ?? 0.7;
      base.shellIntensity = vz.shell ?? 0;
      base.haloIntensity = vz.halo ?? 0.0;
      base.haloScale = vz.haloScale ?? 3.0;
      base.haloFalloff = vz.haloFalloff ?? 1.0;
      base.haloWhiten = vz.haloWhiten ?? 0.35;
      base.haloShadow = vz.haloShadow ?? 0.7;
      break;
    }

    case PlanetType.TEMPERATE: {
      // Dynamic terrestrial colours based on star type, temperature, seed,
      // and continuous habitable zone position (Kopparapu et al. 2013)
      const seed = base.seed;
      const seedVar = (seed.x + seed.y + seed.z) / 3; // 0-1

      // --- Continuous HZ position using stellar flux (Kopparapu et al. 2013) ---
      // S_eff 0.35 (outer/cold edge) → hz=0, S_eff 1.04 (inner/warm edge) → hz=1
      // Mars ≈ 0.43 → hz≈0.12, Earth ≈ 1.0 → hz≈0.94
      const hzRaw = Math.max(0, Math.min(1, (sEff - 0.35) / (1.04 - 0.35)));

      // Mass modifier: low mass → Mars-like (cooler), high mass → Venus-like (warmer)
      const massE = massJup > 0 ? massJup * 317.8 : 1.0;
      const massEffect = Math.log2(Math.max(0.1, massE)) * 0.08;
      const hz = Math.max(0, Math.min(1, hzRaw + massEffect));

      // Helper: lerp a number
      const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

      // --- Surface parameters driven by HZ gradient ---
      // 3-category presets: Mars (cold) → Earth (mid) → Venus (warm)
      // Piecewise linear interpolation through 3 anchor points
      const p = hzRanges || {};
      const mars  = p.mars  || { atmos: 0.05, cloudCover: 0.15, cloudOpacity: 0.2,  seaLevel: 0.15, iceCap: 0.98, continentFreq: 0.10 };
      const earth = p.earth || { atmos: 0.35, cloudCover: 0.45, cloudOpacity: 0.7,  seaLevel: 0.38, iceCap: 0.96, continentFreq: 0.16 };
      const warm  = p.warm  || { atmos: 0.60, cloudCover: 0.60, cloudOpacity: 0.90, seaLevel: 0.10, iceCap: 0.99, continentFreq: 0.22 };

      // Real S_eff mapping: Mars≈0.43→hz≈0.12, Earth≈1.0→hz≈0.94
      // Anchor points: Mars at hz=0.15, Earth at hz=0.85, Warm at hz=1.0
      // hz 0→0.15: pure Mars
      // hz 0.15→0.85: Mars→Earth (main habitable gradient)
      // hz 0.85→1.0: Earth→Warm (inner edge transition)
      const lerpPreset = (key: string) => {
        const m = (mars as any)[key], e = (earth as any)[key], v = (warm as any)[key];
        if (hz < 0.15) return m;
        if (hz < 0.85) return lerpN(m, e, (hz - 0.15) / 0.7);
        return lerpN(e, v, (hz - 0.85) / 0.15);
      };

      base.atmosIntensity = lerpPreset('atmos');

      // Atmosphere colour: interpolate through preset day/twilight colours
      const marsDay = new THREE.Color(mars.rimDay || '#cc6644');
      const earthDay = new THREE.Color(earth.rimDay || '#00aaff');
      const warmDay = new THREE.Color(warm.rimDay || '#cc8833');
      const marsTwi = new THREE.Color(mars.rimTwi || '#884422');
      const earthTwi = new THREE.Color(earth.rimTwi || '#ff6600');
      const warmTwi = new THREE.Color(warm.rimTwi || '#aa6622');

      const lerpColor = (a: THREE.Color, b: THREE.Color, c: THREE.Color) => {
        if (hz < 0.15) return a.clone();
        if (hz < 0.85) return a.clone().lerp(b, (hz - 0.15) / 0.7);
        return b.clone().lerp(c, (hz - 0.85) / 0.15);
      };

      base.atmosDayColor = lerpColor(marsDay, earthDay, warmDay);
      base.atmosTwilightColor = lerpColor(marsTwi, earthTwi, warmTwi);
      base.atmosColor = base.atmosDayColor.clone().multiplyScalar(0.5);

      base.cloudCoverage = lerpPreset('cloudCover');
      base.cloudOpacity = lerpPreset('cloudOpacity');
      base.cloudSwirl = lerpPreset('cloudSwirl');
      base.cloudBands = lerpPreset('cloudBands');
      base.cloudWarp = lerpPreset('cloudWarp');
      base.seaLevel = lerpPreset('seaLevel');
      base.iceCapSize = lerpPreset('iceCap');
      base.iceEdge = lerpPreset('iceEdge');
      base.iceWarp = lerpPreset('iceWarp');
      base.iceDetail = lerpPreset('iceDetail');
      base.continentFreq = lerpPreset('continentFreq');

      // --- Star-type colour palettes (unchanged) ---
      type CPalette = [THREE.Color, THREE.Color, THREE.Color, THREE.Color];

      const redDwarfPalettes: CPalette[] = [
        [new THREE.Color(0.04, 0.045, 0.09), new THREE.Color(0.16, 0.06, 0.05), new THREE.Color(0.1, 0.1, 0.1), new THREE.Color(0.22, 0.18, 0.16)],
        [new THREE.Color(0.04, 0.08, 0.1), new THREE.Color(0.18, 0.1, 0.05), new THREE.Color(0.12, 0.1, 0.08), new THREE.Color(0.25, 0.2, 0.18)],
        [new THREE.Color(0.03, 0.035, 0.07), new THREE.Color(0.13, 0.05, 0.1), new THREE.Color(0.08, 0.07, 0.09), new THREE.Color(0.18, 0.15, 0.17)],
      ];

      const kDwarfPalettes: CPalette[] = [
        [new THREE.Color(0.05, 0.09, 0.16), new THREE.Color(0.1, 0.16, 0.07), new THREE.Color(0.22, 0.16, 0.1), new THREE.Color(0.36, 0.33, 0.3)],
        [new THREE.Color(0.06, 0.1, 0.18), new THREE.Color(0.13, 0.18, 0.1), new THREE.Color(0.25, 0.19, 0.12), new THREE.Color(0.4, 0.37, 0.33)],
        [new THREE.Color(0.04, 0.1, 0.13), new THREE.Color(0.1, 0.17, 0.08), new THREE.Color(0.2, 0.15, 0.1), new THREE.Color(0.34, 0.31, 0.28)],
      ];

      const gTypePalettes: CPalette[] = [
        // Base: deep ocean, olive vegetation, dark forest, sandy highlands
        [new THREE.Color('#1d273e'), new THREE.Color('#45482e'), new THREE.Color('#133013'), new THREE.Color('#bab2a6')],
        // Warmer: teal ocean, yellow-green veg, warm forest, cream peaks
        [new THREE.Color('#1e2f3a'), new THREE.Color('#4d4e28'), new THREE.Color('#1a3510'), new THREE.Color('#c4b99a')],
        // Cooler: slate ocean, blue-green veg, deep emerald, grey peaks
        [new THREE.Color('#1a2540'), new THREE.Color('#3b4a35'), new THREE.Color('#0f2a18'), new THREE.Color('#a8a8a4')],
        // Arid: dark navy ocean, sage brush, muted olive, pale rock
        [new THREE.Color('#1f2338'), new THREE.Color('#4a4c30'), new THREE.Color('#1d3418'), new THREE.Color('#b5ab98')],
      ];

      const fTypePalettes: CPalette[] = [
        [new THREE.Color(0.08, 0.13, 0.24), new THREE.Color(0.18, 0.2, 0.1), new THREE.Color(0.3, 0.25, 0.16), new THREE.Color(0.55, 0.52, 0.48)],
        [new THREE.Color(0.09, 0.14, 0.22), new THREE.Color(0.24, 0.22, 0.12), new THREE.Color(0.34, 0.28, 0.18), new THREE.Color(0.58, 0.55, 0.5)],
      ];

      const hotStarPalettes: CPalette[] = [
        [new THREE.Color(0.12, 0.16, 0.22), new THREE.Color(0.28, 0.25, 0.18), new THREE.Color(0.38, 0.33, 0.24), new THREE.Color(0.58, 0.56, 0.52)],
        [new THREE.Color(0.1, 0.14, 0.2), new THREE.Color(0.22, 0.22, 0.15), new THREE.Color(0.35, 0.3, 0.22), new THREE.Color(0.55, 0.53, 0.5)],
      ];

      let palettes: CPalette[];
      if (starTemp < 3500) palettes = redDwarfPalettes;
      else if (starTemp < 5000) palettes = kDwarfPalettes;
      else if (starTemp < 6000) palettes = gTypePalettes;
      else if (starTemp < 7500) palettes = fTypePalettes;
      else palettes = hotStarPalettes;

      const palIdx = Math.floor(((seed.x * 1000) % palettes.length + palettes.length) % palettes.length);
      const [ocean, lowVeg, highland, peak] = palettes[palIdx].map(c => c.clone()) as CPalette;

      // Subtle per-planet jitter
      const jitter = (seedVar - 0.5) * 0.06;
      ocean.offsetHSL(jitter * 0.3, jitter * 0.1, jitter * 0.05);
      lowVeg.offsetHSL(jitter * 0.5, jitter * 0.15, jitter * 0.08);
      highland.offsetHSL(jitter * 0.3, jitter * 0.1, jitter * 0.06);

      // --- HZ-driven colour shifts ---
      // Only at extremes — palette is tuned for mid-HZ (Earth-like), shifts at edges
      // Warm edge (hz > 0.9): approaching Venus zone — vegetation dries, sandy
      if (hz > 0.9) {
        const warmShift = (hz - 0.9) / 0.1; // 0–1 over the last 10%
        lowVeg.lerp(new THREE.Color(0.30, 0.24, 0.14), warmShift * 0.6);
        highland.lerp(new THREE.Color(0.38, 0.32, 0.20), warmShift * 0.5);
        ocean.lerp(new THREE.Color(0.05, 0.06, 0.12), warmShift * 0.3);
        peak.lerp(new THREE.Color(0.55, 0.50, 0.42), warmShift * 0.3);
      }
      // Cool edge (hz < 0.35): Mars-like — iron oxide, barren, dusty, no liquid water
      if (hz < 0.35) {
        const coolShift = (0.35 - hz) / 0.35; // 0–1, maxes at hz=0
        ocean.lerp(new THREE.Color(0.18, 0.12, 0.08), coolShift);
        lowVeg.lerp(new THREE.Color(0.28, 0.16, 0.08), coolShift);
        highland.lerp(new THREE.Color(0.22, 0.15, 0.10), coolShift);
        peak.lerp(new THREE.Color(0.75, 0.72, 0.68), coolShift * 0.7);
      }

      base.color1 = ocean;
      base.color2 = lowVeg;
      base.color3 = highland;
      base.color4 = peak;
      base.swirlStrength = lerpN(0.05, 0.2, hz); // less convection when cold
      base.warpIntensity = lerpPreset('warp') * 6.0; // scale preset 0-1 to shader range
      base.noiseScale = 12;
      base.hasAtmosphere = true;
      base.showRim = true;
      base.showShell = true;
      base.showHalo = true;
      base.rimIntensity = lerpPreset('rim');
      base.rimFalloff = lerpPreset('rimFalloff');
      base.shellIntensity = lerpPreset('shell');
      base.haloIntensity = lerpPreset('halo');
      base.haloScale = lerpPreset('haloScale');
      base.haloFalloff = lerpPreset('haloFalloff');
      base.haloWhiten = lerpPreset('haloWhiten');
      base.haloShadow = lerpPreset('haloShadow');
      base.hasHzGradient = true;
      break;
    }

    case PlanetType.FROZEN: {
      // Cold icy world — driven by frozen preset
      const fr = (hzRanges as any)?.frozen || {};
      base.color1 = new THREE.Color(0.75, 0.78, 0.82);
      base.color2 = new THREE.Color(0.85, 0.87, 0.9);
      base.color3 = new THREE.Color(0.6, 0.65, 0.7);
      base.color4 = new THREE.Color(0.9, 0.92, 0.95);
      base.swirlStrength = 0.0;
      base.warpIntensity = 2.0;
      base.noiseScale = 15;
      base.atmosIntensity = fr.atmos ?? 0.0;
      base.atmosDayColor = new THREE.Color(fr.rimDay || '#6688aa');
      base.atmosTwilightColor = new THREE.Color(fr.rimTwi || '#334455');
      base.hasAtmosphere = true;
      base.showRim = true;
      base.showShell = (fr.shell ?? 0) > 0;
      base.showHalo = (fr.halo ?? 0) > 0;
      base.rimIntensity = fr.rim ?? 0.0;
      base.rimFalloff = fr.rimFalloff ?? 1.5;
      base.shellIntensity = fr.shell ?? 0;
      base.haloIntensity = fr.halo ?? 0.0;
      base.haloScale = fr.haloScale ?? 1.5;
      base.haloFalloff = fr.haloFalloff ?? 2.0;
      base.haloWhiten = fr.haloWhiten ?? 0.5;
      base.haloShadow = fr.haloShadow ?? 0.5;
      break;
    }

    default:
      break;
  }

  // Apply halo presets for gas/ice giants (after switch so all subtypes covered)
  const isGasGiant = [PlanetType.COLD_GIANT, PlanetType.COOL_GIANT, PlanetType.WARM_GIANT, PlanetType.HOT_JUPITER_IV, PlanetType.HOT_JUPITER_V].includes(type);
  if (isGasGiant) {
    const gg = (hzRanges as any)?.gasGiant || {};
    base.haloIntensity = gg.halo ?? 0;
    base.haloScale = gg.haloScale ?? 2.0;
    base.haloFalloff = gg.haloFalloff ?? 1.5;
    base.haloWhiten = gg.haloWhiten ?? 0.35;
    base.haloShadow = gg.haloShadow ?? 0.7;
    base.rimIntensity = gg.rim ?? 0;
    base.rimFalloff = gg.rimFalloff ?? 1.0;
    if (gg.rimDay) base.atmosDayColor = new THREE.Color(gg.rimDay);
    if (gg.rimTwi) base.atmosTwilightColor = new THREE.Color(gg.rimTwi);
  }
  if (type === PlanetType.ICE_GIANT) {
    const ig = (hzRanges as any)?.iceGiant || {};
    base.haloIntensity = ig.halo ?? 0;
    base.haloScale = ig.haloScale ?? 2.0;
    base.haloFalloff = ig.haloFalloff ?? 1.5;
    base.haloWhiten = ig.haloWhiten ?? 0.35;
    base.haloShadow = ig.haloShadow ?? 0.7;
    base.rimIntensity = ig.rim ?? 0;
    base.rimFalloff = ig.rimFalloff ?? 1.0;
    if (ig.rimDay) base.atmosDayColor = new THREE.Color(ig.rimDay);
    if (ig.rimTwi) base.atmosTwilightColor = new THREE.Color(ig.rimTwi);
  }

  // Gas giant mass/radius-based colour variation
  // Heavier giants (>0.5 Jup) → more Jupiter-like (orange/brown, strong bands)
  // Lighter giants (<0.5 Jup) → more Saturn-like (pale gold/azure, muted bands)
  if (type === PlanetType.COLD_GIANT || type === PlanetType.COOL_GIANT) {
    const massRatio = Math.min(massJup / 1.0, 2.0); // normalise to Jupiter=1

    if (massRatio < 0.5) {
      // Saturn-like: pale gold/butter/azure, muted contrast
      const saturnFactor = 1.0 - massRatio * 2.0; // 1.0 at 0 mass, 0.0 at 0.5 Jup
      const satGold = new THREE.Color(0.75, 0.65, 0.4);
      const satCream = new THREE.Color(0.9, 0.85, 0.65);
      const satBlue = new THREE.Color(0.5, 0.55, 0.65);
      const satPale = new THREE.Color(0.85, 0.82, 0.7);

      base.color1.lerp(satGold, saturnFactor * 0.7);
      base.color2.lerp(satCream, saturnFactor * 0.6);
      base.color3.lerp(satBlue, saturnFactor * 0.5);
      base.color4.lerp(satPale, saturnFactor * 0.6);
      // Saturn has less band contrast and weaker storms
      base.swirlStrength *= (1.0 - saturnFactor * 0.5);
      base.warpIntensity *= (1.0 - saturnFactor * 0.3);
    } else if (massRatio > 1.5) {
      // Super-Jupiters: deeper, more saturated oranges and darker bands
      const superFactor = Math.min((massRatio - 1.5) / 1.5, 1.0);
      base.color1.lerp(new THREE.Color(0.5, 0.25, 0.08), superFactor * 0.4);
      base.color3.lerp(new THREE.Color(0.35, 0.15, 0.05), superFactor * 0.4);
      base.swirlStrength *= (1.0 + superFactor * 0.3);
      base.warpIntensity *= (1.0 + superFactor * 0.2);
    }

    // Radius-based: larger radius = puffier, more washed out
    if (radiusJup > 1.2) {
      const puffFactor = Math.min((radiusJup - 1.2) / 0.8, 1.0);
      base.color1.lerp(base.color2, puffFactor * 0.3);
      base.color3.lerp(base.color4, puffFactor * 0.3);
    }
  }

  // Hot Jupiters: mass-based deepening
  if (type === PlanetType.HOT_JUPITER_IV || type === PlanetType.HOT_JUPITER_V) {
    if (massJup > 3) {
      const deepFactor = Math.min((massJup - 3) / 5, 1.0);
      base.color1.lerp(new THREE.Color(0.15, 0.05, 0.02), deepFactor * 0.5);
      base.color3.lerp(new THREE.Color(0.08, 0.02, 0.01), deepFactor * 0.4);
    }
  }

  return base;
}
