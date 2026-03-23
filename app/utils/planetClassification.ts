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
  seed: THREE.Vector3;
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
    // Main-sequence mass-radius: R ≈ M^0.8 (in solar units)
    rStar = Math.pow(starMass, 0.8);
  }
  if (rStar <= 0 || semimajorAxisAU <= 0 || starTemp <= 0) return 300; // default

  // R_star in AU: 1 solar radius = 0.00465 AU
  const rStarAU = rStar * 0.00465;
  return starTemp * Math.sqrt(rStarAU / (2 * semimajorAxisAU));
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

  // Compute equilibrium temperature
  const rawSMA = semimajorAxisAU > 0 ? semimajorAxisAU : 1;
  const tEq = estimateEquilibriumTemp(starTemp, starMass, starRadius, rawSMA);

  // Bulk density (if both mass and radius available)
  const density = (radiusEarth > 0 && effectiveMassEarth > 0)
    ? effectiveMassEarth / Math.pow(radiusEarth, 3) * 5.51 // relative to Earth density
    : -1;

  // Classification decision tree
  let type: PlanetType;

  if (radiusEarth > 6 || (radiusEarth <= 0 && massEarth > 50)) {
    // Gas giant
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
    if (tEq > 1500) type = PlanetType.LAVA_WORLD;
    else if (tEq > 400 && radiusEarth > 1.2) type = PlanetType.VENUS_LIKE;
    else if (tEq > 400) type = PlanetType.HOT_ROCKY;
    else if (tEq > 180) type = PlanetType.TEMPERATE;
    else type = PlanetType.FROZEN;
  } else {
    // No size data at all - guess from temperature
    if (tEq > 1000) type = PlanetType.HOT_JUPITER_IV;
    else if (tEq > 400) type = PlanetType.WARM_GIANT;
    else type = PlanetType.COLD_GIANT;
  }

  return getShaderParams(type, tEq, input.name || "planet");
}

function getShaderParams(type: PlanetType, tEq: number, name: string): ShaderParams {
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
    seed: planetSeed(name),
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
      // Water-ice clouds: bright white/cream
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
      // Methane blue/cyan (Neptune/Uranus)
      base.color1 = new THREE.Color(0.15, 0.35, 0.6);
      base.color2 = new THREE.Color(0.2, 0.5, 0.7);
      base.color3 = new THREE.Color(0.1, 0.3, 0.55);
      base.color4 = new THREE.Color(0.25, 0.55, 0.75);
      base.swirlStrength = 0.08;
      base.warpIntensity = 1.5;
      base.noiseScale = 12;
      break;

    case PlanetType.WATER_WORLD:
      // Deep blue, cloud swirls
      base.color1 = new THREE.Color(0.1, 0.2, 0.45);
      base.color2 = new THREE.Color(0.2, 0.35, 0.55);
      base.color3 = new THREE.Color(0.15, 0.25, 0.5);
      base.color4 = new THREE.Color(0.6, 0.65, 0.7);
      base.swirlStrength = 0.2;
      base.warpIntensity = 2.0;
      base.noiseScale = 8;
      break;

    case PlanetType.SUB_NEPTUNE:
      // Hazy, blue-grey
      base.color1 = new THREE.Color(0.4, 0.45, 0.5);
      base.color2 = new THREE.Color(0.5, 0.55, 0.6);
      base.color3 = new THREE.Color(0.35, 0.4, 0.5);
      base.color4 = new THREE.Color(0.55, 0.6, 0.65);
      base.swirlStrength = 0.1;
      base.warpIntensity = 1.5;
      break;

    case PlanetType.LAVA_WORLD:
      // Dark rock with glowing magma cracks
      base.color1 = new THREE.Color(0.08, 0.06, 0.05);
      base.color2 = new THREE.Color(0.12, 0.08, 0.05);
      base.color3 = new THREE.Color(0.9, 0.3, 0.02);
      base.color4 = new THREE.Color(1.0, 0.6, 0.1);
      base.swirlStrength = 0.0;
      base.warpIntensity = 4.0;
      base.noiseScale = 15;
      base.emissive = new THREE.Color(1.0, 0.4, 0.05);
      base.emissiveIntensity = 0.6;
      break;

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

    case PlanetType.VENUS_LIKE:
      // Thick yellowish haze, featureless
      base.color1 = new THREE.Color(0.75, 0.65, 0.4);
      base.color2 = new THREE.Color(0.8, 0.7, 0.45);
      base.color3 = new THREE.Color(0.7, 0.6, 0.38);
      base.color4 = new THREE.Color(0.85, 0.75, 0.5);
      base.swirlStrength = 0.03;
      base.warpIntensity = 0.5;
      base.noiseScale = 6;
      break;

    case PlanetType.TEMPERATE:
      // Earth-like: ocean blue, green/brown landmass, white clouds
      base.color1 = new THREE.Color(0.1, 0.25, 0.5);
      base.color2 = new THREE.Color(0.2, 0.4, 0.15);
      base.color3 = new THREE.Color(0.45, 0.35, 0.2);
      base.color4 = new THREE.Color(0.9, 0.92, 0.95);
      base.swirlStrength = 0.15;
      base.warpIntensity = 3.0;
      base.noiseScale = 12;
      break;

    case PlanetType.FROZEN:
      // White/grey ice with subtle features
      base.color1 = new THREE.Color(0.75, 0.78, 0.82);
      base.color2 = new THREE.Color(0.85, 0.87, 0.9);
      base.color3 = new THREE.Color(0.6, 0.65, 0.7);
      base.color4 = new THREE.Color(0.9, 0.92, 0.95);
      base.swirlStrength = 0.0;
      base.warpIntensity = 2.0;
      base.noiseScale = 15;
      break;

    default:
      break;
  }

  return base;
}
