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

  return getShaderParams(type, tEq, input.name || "planet", starTemp || 5500);
}

function getShaderParams(type: PlanetType, tEq: number, name: string, starTemp: number): ShaderParams {
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

    case PlanetType.TEMPERATE: {
      // Dynamic terrestrial colours based on star type, temperature, and seed
      const seed = base.seed;
      const seedVar = (seed.x + seed.y + seed.z) / 3; // 0-1

      // Habitable zone position: 0 = warm edge, 1 = cool edge
      const hzPos = 1.0 - Math.max(0, Math.min(1, (tEq - 180) / (380 - 180)));

      // Star colour influence on ocean & vegetation
      // Cool red dwarfs (<3500K): dark oceans, dark/reddish vegetation (absorb more light)
      // K-type (3500-5000K): deeper blue-green oceans, olive/dark green vegetation
      // G-type (5000-6000K): Earth-like blue oceans, green vegetation
      // F-type (6000-7500K): lighter blue/azure oceans, lighter vegetation
      // Hot (>7500K): pale/turquoise oceans, sparse yellow-green vegetation

      // Multiple rich palettes per star type, selected by seed
      // Inspired by NASA concept art and real planetary photography
      // Each palette: [ocean, lowland, highland, peak]
      type CPalette = [THREE.Color, THREE.Color, THREE.Color, THREE.Color];

      const redDwarfPalettes: CPalette[] = [
        // Twilight world: ink oceans, burgundy lowlands, dark slate highlands
        [new THREE.Color(0.04, 0.045, 0.09), new THREE.Color(0.16, 0.06, 0.05), new THREE.Color(0.1, 0.1, 0.1), new THREE.Color(0.22, 0.18, 0.16)],
        // Warm red dwarf: dark teal seas, copper/rust vegetation, ash rock
        [new THREE.Color(0.04, 0.08, 0.1), new THREE.Color(0.18, 0.1, 0.05), new THREE.Color(0.12, 0.1, 0.08), new THREE.Color(0.25, 0.2, 0.18)],
        // Exotic: near-black seas, deep plum lowlands, charcoal
        [new THREE.Color(0.03, 0.035, 0.07), new THREE.Color(0.13, 0.05, 0.1), new THREE.Color(0.08, 0.07, 0.09), new THREE.Color(0.18, 0.15, 0.17)],
      ];

      const kDwarfPalettes: CPalette[] = [
        // Deep slate seas, dark olive-green lowlands, sienna rock, grey stone
        [new THREE.Color(0.05, 0.09, 0.16), new THREE.Color(0.1, 0.16, 0.07), new THREE.Color(0.22, 0.16, 0.1), new THREE.Color(0.36, 0.33, 0.3)],
        // Grey-blue oceans, sage green, warm brown, pale sandstone
        [new THREE.Color(0.06, 0.1, 0.18), new THREE.Color(0.13, 0.18, 0.1), new THREE.Color(0.25, 0.19, 0.12), new THREE.Color(0.4, 0.37, 0.33)],
        // Dark teal seas, moss green, chocolate brown, grey
        [new THREE.Color(0.04, 0.1, 0.13), new THREE.Color(0.1, 0.17, 0.08), new THREE.Color(0.2, 0.15, 0.1), new THREE.Color(0.34, 0.31, 0.28)],
      ];

      const gTypePalettes: CPalette[] = [
        // Deep ocean, dark muted forest lowlands, dark sienna, pale stone
        [new THREE.Color(0.04, 0.08, 0.22), new THREE.Color(0.08, 0.12, 0.065), new THREE.Color(0.22, 0.15, 0.08), new THREE.Color(0.5, 0.47, 0.43)],
        // Teal seas, deep olive, dark rust-brown, warm grey
        [new THREE.Color(0.05, 0.12, 0.2), new THREE.Color(0.065, 0.11, 0.06), new THREE.Color(0.2, 0.14, 0.08), new THREE.Color(0.46, 0.43, 0.4)],
        // Slate ocean, muted sage lowlands, dark terracotta, cream
        [new THREE.Color(0.05, 0.09, 0.2), new THREE.Color(0.09, 0.13, 0.07), new THREE.Color(0.25, 0.17, 0.09), new THREE.Color(0.52, 0.48, 0.44)],
        // Deep blue, dark muted green, dark warm brown, neutral rock
        [new THREE.Color(0.04, 0.07, 0.24), new THREE.Color(0.07, 0.12, 0.07), new THREE.Color(0.2, 0.15, 0.09), new THREE.Color(0.44, 0.42, 0.4)],
      ];

      const fTypePalettes: CPalette[] = [
        // Azure-steel seas, golden-olive lowlands, sandy brown, pale stone
        [new THREE.Color(0.08, 0.13, 0.24), new THREE.Color(0.18, 0.2, 0.1), new THREE.Color(0.3, 0.25, 0.16), new THREE.Color(0.55, 0.52, 0.48)],
        // Blue-grey seas, straw-gold lowlands, warm taupe, cream
        [new THREE.Color(0.09, 0.14, 0.22), new THREE.Color(0.24, 0.22, 0.12), new THREE.Color(0.34, 0.28, 0.18), new THREE.Color(0.58, 0.55, 0.5)],
      ];

      const hotStarPalettes: CPalette[] = [
        // Pale grey-blue seas, bleached tan, warm sand, cream rock
        [new THREE.Color(0.12, 0.16, 0.22), new THREE.Color(0.28, 0.25, 0.18), new THREE.Color(0.38, 0.33, 0.24), new THREE.Color(0.58, 0.56, 0.52)],
        // Steel seas, dusty olive, khaki, pale grey
        [new THREE.Color(0.1, 0.14, 0.2), new THREE.Color(0.22, 0.22, 0.15), new THREE.Color(0.35, 0.3, 0.22), new THREE.Color(0.55, 0.53, 0.5)],
      ];

      let palettes: CPalette[];
      if (starTemp < 3500) palettes = redDwarfPalettes;
      else if (starTemp < 5000) palettes = kDwarfPalettes;
      else if (starTemp < 6000) palettes = gTypePalettes;
      else if (starTemp < 7500) palettes = fTypePalettes;
      else palettes = hotStarPalettes;

      // Select palette using seed, with slight colour jitter for uniqueness
      const palIdx = Math.floor(((seed.x * 1000) % palettes.length + palettes.length) % palettes.length);
      const [ocean, lowVeg, highland, peak] = palettes[palIdx].map(c => c.clone()) as CPalette;

      // Subtle per-planet jitter: shift hue/brightness slightly
      const jitter = (seedVar - 0.5) * 0.06;
      ocean.offsetHSL(jitter * 0.3, jitter * 0.1, jitter * 0.05);
      lowVeg.offsetHSL(jitter * 0.5, jitter * 0.15, jitter * 0.08);
      highland.offsetHSL(jitter * 0.3, jitter * 0.1, jitter * 0.06);

      // Temperature within habitable zone shifts towards arid or icy
      if (tEq > 320) {
        const warmShift = Math.min(1, (tEq - 320) / 60);
        lowVeg.lerp(new THREE.Color(0.24, 0.22, 0.17), warmShift * 0.5);
        highland.lerp(new THREE.Color(0.3, 0.27, 0.22), warmShift * 0.4);
      }
      if (tEq < 230) {
        const coolShift = Math.min(1, (230 - tEq) / 50);
        lowVeg.lerp(new THREE.Color(0.16, 0.17, 0.15), coolShift * 0.5);
        highland.lerp(new THREE.Color(0.25, 0.25, 0.24), coolShift * 0.4);
        ocean.lerp(new THREE.Color(0.05, 0.07, 0.12), coolShift * 0.3);
      }

      base.color1 = ocean;
      base.color2 = lowVeg;
      base.color3 = highland;
      base.color4 = peak;
      base.swirlStrength = 0.15;
      base.warpIntensity = 3.0;
      base.noiseScale = 12;
      break;
    }

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
