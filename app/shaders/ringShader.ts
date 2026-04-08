import * as THREE from "three";
import { PlanetType } from "~/utils/planetClassification";

const ringVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vRadius;

  uniform float u_innerRadius;
  uniform float u_outerRadius;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    // Compute radial distance from centre in local space (ring lies in XZ plane before rotation)
    float dist = length(position.xy);
    vRadius = (dist - u_innerRadius) / (u_outerRadius - u_innerRadius);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_innerRadius;
  uniform float u_outerRadius;
  uniform float u_seed;
  uniform vec3 u_sunDirection;
  uniform float u_opacity;
  uniform vec3 u_planetPos;
  uniform float u_planetRadius;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vRadius;

  // Simple hash for band variation
  float hash(float p) {
    return fract(sin(p * 127.1) * 43758.5453123);
  }

  // 1D noise
  float noise1d(float p) {
    float i = floor(p);
    float f = fract(p);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }

  // FBM for ring bands
  float fbm1d(float p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise1d(p);
      p = p * 2.1 + u_seed * 10.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Use computed radial distance (0=inner edge, 1=outer edge)
    float r = clamp(vRadius, 0.0, 1.0);

    // Soft edges
    float edgeFade = smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.92, r);

    // Procedural band pattern (radial stripes like Saturn)
    float bandFreq = 30.0 + u_seed * 20.0;
    float bands = fbm1d(r * bandFreq);

    // Add sharper divisions (Cassini division style)
    float divisions = smoothstep(0.42, 0.44, r) * smoothstep(0.48, 0.46, r);
    float division2 = smoothstep(0.72, 0.73, r) * smoothstep(0.76, 0.75, r);
    float gapDarken = 1.0 - divisions * 0.7 - division2 * 0.5;

    // Additional fine gaps from noise
    float fineGaps = smoothstep(0.45, 0.5, noise1d(r * 80.0 + u_seed * 50.0));
    gapDarken *= mix(1.0, 0.6, (1.0 - fineGaps) * 0.3);

    // Colour: blend based on band noise and radial position
    vec3 color = mix(u_color1, u_color2, bands);
    color = mix(color, u_color3, smoothstep(0.6, 0.9, r) * 0.5);

    // Apply gaps
    color *= gapDarken;

    // Planet shadow: check if this ring fragment is behind the planet relative to sun
    vec3 toFrag = vWorldPos - u_planetPos;
    // Project onto sun direction — if behind planet and within planet radius, it's in shadow
    float projDist = dot(toFrag, -u_sunDirection);
    vec3 perpOffset = toFrag + u_sunDirection * projDist;
    float perpDist = length(perpOffset);
    float shadow = 1.0;
    if (projDist > 0.0 && perpDist < u_planetRadius) {
      shadow = smoothstep(u_planetRadius * 0.8, u_planetRadius, perpDist);
    }

    // Ring lighting with translucency
    // Front: full diffuse reflection
    // Back: transmitted light passes through thin ring material
    float sunDot = dot(vNormal, u_sunDirection);
    float frontLight = max(sunDot, 0.0);
    float backLight = max(-sunDot, 0.0);

    // Forward scattering: light passing through the ring from behind
    // Thinner parts (higher alpha = denser = less transmission)
    float transmission = backLight * 0.4; // 40% light passes through

    float light;
    if (gl_FrontFacing) {
      light = frontLight + transmission * 0.3; // front sees some backlit glow
    } else {
      light = backLight * 0.15 + transmission; // back is mostly transmitted light
    }

    float ambient = 0.06;
    color *= (ambient + (1.0 - ambient) * light) * (0.3 + 0.7 * shadow);

    // Overall opacity with soft edges
    float alpha = edgeFade * u_opacity * (0.5 + bands * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`;

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

export function createRingMaterial(params: RingParams, seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
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
    },
    vertexShader: ringVertexShader,
    fragmentShader: ringFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}
