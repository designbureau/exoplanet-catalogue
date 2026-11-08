import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { toUniformNodes, type UniformMaterial } from "~/shaders/planetShader";
import buildRingFragment from "~/shaders/generated/ringFragment";
import { PlanetType } from "~/utils/planetClassification";

export interface RingParams {
  hasRing: boolean;
  innerRadius: number; // multiplier of planet radius
  outerRadius: number; // multiplier of planet radius
  color1: THREE.Color;
  color2: THREE.Color;
  color3: THREE.Color;
  opacity: number;
  tilt: number; // ring tilt in radians
}

// Known axial tilts in radians for solar system planets
const KNOWN_TILTS: Record<string, number> = {
  "Jupiter": 3.1 * Math.PI / 180,
  "Saturn": 26.7 * Math.PI / 180,
  "Uranus": 97.8 * Math.PI / 180,
  "Neptune": 28.3 * Math.PI / 180,
};

// Known ring systems: force rings with specific parameters
const KNOWN_RINGS: Record<string, Partial<RingParams>> = {
  "Saturn": {
    hasRing: true,
    innerRadius: 1.24,
    outerRadius: 2.27,
    color1: new THREE.Color(0.88, 0.79, 0.64),
    color2: new THREE.Color(0.62, 0.55, 0.44),
    color3: new THREE.Color(0.78, 0.72, 0.58),
    opacity: 0.85,
  },
  "Jupiter": {
    hasRing: true,
    innerRadius: 1.29,
    outerRadius: 1.81,
    color1: new THREE.Color(0.42, 0.35, 0.26),
    color2: new THREE.Color(0.32, 0.26, 0.2),
    color3: new THREE.Color(0.38, 0.32, 0.24),
    opacity: 0.18,
  },
  "Uranus": {
    hasRing: true,
    innerRadius: 1.6,
    outerRadius: 2.0,
    color1: new THREE.Color(0.28, 0.3, 0.35),
    color2: new THREE.Color(0.2, 0.22, 0.26),
    color3: new THREE.Color(0.34, 0.36, 0.4),
    opacity: 0.35,
  },
  "Neptune": {
    hasRing: true,
    innerRadius: 1.7,
    outerRadius: 2.5,
    color1: new THREE.Color(0.3, 0.24, 0.22),
    color2: new THREE.Color(0.22, 0.18, 0.16),
    color3: new THREE.Color(0.35, 0.28, 0.26),
    opacity: 0.25,
  },
};

export function getRingParams(
  type: PlanetType,
  seed: number, // 0-1 hash from planet name
  planetName?: string,
): RingParams | null {
  // Determine ring probability by type
  let probability = 0;
  let innerMin = 1.3, innerMax = 1.5;
  let outerMin = 1.8, outerMax = 2.5;
  let opacity = 0.7;
  let color1 = new THREE.Color(0.76, 0.7, 0.6);  // warm beige
  let color2 = new THREE.Color(0.6, 0.55, 0.48);  // darker band
  let color3 = new THREE.Color(0.82, 0.78, 0.72);  // bright band

  switch (type) {
    case PlanetType.COLD_GIANT:
    case PlanetType.COOL_GIANT:
      probability = 0.8;
      innerMin = 1.2; innerMax = 1.6;
      outerMin = 2.0; outerMax = 3.0;
      opacity = 0.65;
      break;

    case PlanetType.WARM_GIANT:
      probability = 0.3;
      innerMin = 1.3; innerMax = 1.5;
      outerMin = 1.7; outerMax = 2.2;
      opacity = 0.4;
      break;

    case PlanetType.HOT_JUPITER_IV:
    case PlanetType.HOT_JUPITER_V:
      probability = 0.05;
      break;

    case PlanetType.ICE_GIANT:
      probability = 0.5;
      innerMin = 1.3; innerMax = 1.5;
      outerMin = 1.6; outerMax = 2.0;
      opacity = 0.3;
      // Ice giant rings: darker, bluer
      color1 = new THREE.Color(0.4, 0.42, 0.5);
      color2 = new THREE.Color(0.3, 0.32, 0.38);
      color3 = new THREE.Color(0.5, 0.52, 0.55);
      break;

    case PlanetType.SUB_NEPTUNE:
      probability = 0.15;
      innerMin = 1.3; innerMax = 1.4;
      outerMin = 1.5; outerMax = 1.8;
      opacity = 0.2;
      color1 = new THREE.Color(0.45, 0.45, 0.5);
      color2 = new THREE.Color(0.35, 0.35, 0.4);
      color3 = new THREE.Color(0.5, 0.5, 0.55);
      break;

    default:
      // Rocky/terrestrial: very rare
      probability = 0.02;
      innerMin = 1.2; innerMax = 1.3;
      outerMin = 1.4; outerMax = 1.6;
      opacity = 0.15;
      color1 = new THREE.Color(0.5, 0.45, 0.4);
      color2 = new THREE.Color(0.4, 0.35, 0.3);
      color3 = new THREE.Color(0.55, 0.5, 0.45);
      break;
  }

  // Check for known ring systems (solar system overrides)
  if (planetName && KNOWN_RINGS[planetName]) {
    const known = KNOWN_RINGS[planetName];
    const knownTilt = KNOWN_TILTS[planetName] ?? 0;
    return {
      hasRing: true,
      innerRadius: known.innerRadius!,
      outerRadius: known.outerRadius!,
      color1: known.color1!,
      color2: known.color2!,
      color3: known.color3!,
      opacity: known.opacity!,
      tilt: knownTilt,
    };
  }

  // Use seed to deterministically decide ring presence
  if (seed > probability) return null;

  // Use seed to vary ring dimensions within range
  const seed2 = (seed * 127.1) % 1;
  const seed3 = (seed * 311.7) % 1;
  const innerRadius = innerMin + seed2 * (innerMax - innerMin);
  const outerRadius = outerMin + seed3 * (outerMax - outerMin);

  // Add colour variation based on seed
  const hueShift = (seed * 43.7) % 1;
  if (type === PlanetType.COLD_GIANT || type === PlanetType.COOL_GIANT) {
    // Gas giant rings: vary from warm golden to cool grey-blue
    const warmth = hueShift;
    color1.lerp(new THREE.Color(0.6, 0.62, 0.68), 1 - warmth); // cool variant
    color2.lerp(new THREE.Color(0.42, 0.4, 0.45), 1 - warmth);
    color3.lerp(new THREE.Color(0.7, 0.68, 0.72), 1 - warmth);
  } else if (type === PlanetType.ICE_GIANT) {
    // Ice giant rings: vary between dark blue-grey and dark reddish
    color1.lerp(new THREE.Color(0.22, 0.18, 0.16), hueShift);
    color2.lerp(new THREE.Color(0.15, 0.12, 0.1), hueShift);
    color3.lerp(new THREE.Color(0.28, 0.22, 0.2), hueShift);
  }

  // Ring tilt: use known axial tilt for solar system, seeded random for others
  const knownTilt = planetName ? KNOWN_TILTS[planetName] : undefined;
  const tilt = knownTilt !== undefined ? knownTilt : (seed2 - 0.5) * 0.8;

  return {
    hasRing: true,
    innerRadius,
    outerRadius,
    color1,
    color2,
    color3,
    opacity,
    tilt,
  };
}

export function createRingMaterial(params: RingParams, seed: number): UniformMaterial {
  const uniforms = toUniformNodes({
    u_color1: { value: params.color1 },
    u_color2: { value: params.color2 },
    u_color3: { value: params.color3 },
    u_innerRadius: { value: params.innerRadius },
    u_outerRadius: { value: params.outerRadius },
    u_planetPos: { value: new THREE.Vector3() },
    u_planetRadius: { value: 1.0 },
    u_seed: { value: seed },
    u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
    u_opacity: { value: params.opacity },
  });

  // Vertex stage (ring lies in the XY plane of its geometry before rotation)
  const { varying, uv, positionGeometry, positionWorld, modelNormalMatrix, normalGeometry, length } = TSL as any;
  const varyings = {
    vUv: varying(uv(), "vUv"),
    vNormal: varying(modelNormalMatrix.mul(normalGeometry).normalize(), "vNormal"),
    vWorldPos: varying(positionWorld, "vWorldPos"),
    // radial distance from centre in local space, 0 at the inner edge → 1 at the outer
    vRadius: varying(
      length(positionGeometry.xy).sub(uniforms.u_innerRadius).div(uniforms.u_outerRadius.sub(uniforms.u_innerRadius)),
      "vRadius",
    ),
  };

  const frag = buildRingFragment({ ...TSL, reference: (_p: string, _t: string, n: unknown) => n }, uniforms, varyings, {});
  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.side = THREE.DoubleSide;
  mat.depthWrite = false;
  mat.fragmentNode = frag.fragMain();
  mat.uniforms = uniforms;
  return mat;
}
