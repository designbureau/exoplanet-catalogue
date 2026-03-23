import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = normalize(position);
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform vec3 u_seed;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_nebulaDensity;
  uniform float u_brightness;
  uniform float u_starDensity;
  varying vec3 vPosition;

  // --- Noise functions ---
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1,0,0)), u.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y), u.z);
  }

  // Cloud noise: sin-modulated FBM for wispy filaments
  float cloudNoise(vec3 p, float freq, float seed) {
    float v = 0.0, a = 0.5;
    p = p * freq + vec3(seed);
    for (int i = 0; i < 8; i++) {
      float n = noise3d(p);
      v += a * (sin(n * 6.2831) * 0.5 + 0.5);
      p = p * 2.02 + vec3(31.7, 17.3, 53.1);
      a *= 0.5;
    }
    return v;
  }

  // Ridged noise for more dramatic features
  float ridgedNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 6; i++) {
      float n = noise3d(p);
      n = 1.0 - abs(n * 2.0 - 1.0); // ridge
      v += a * n * n;
      p = p * 2.03 + vec3(13.7, 29.3, 41.1);
      a *= 0.5;
    }
    return v;
  }

  // Worley/cellular noise for bright stars
  float worley(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float minDist = 1.0;
    for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
    for (int z = -1; z <= 1; z++) {
      vec3 neighbor = vec3(float(x), float(y), float(z));
      vec3 point = vec3(
        hash3(i + neighbor),
        hash3(i + neighbor + vec3(37.0)),
        hash3(i + neighbor + vec3(71.0))
      );
      float d = length(neighbor + point - f);
      minDist = min(minDist, d);
    }
    return minDist;
  }

  void main() {
    vec3 dir = normalize(vPosition);
    vec3 sp = dir + u_seed * 50.0;

    // Layer 1: base cloud structure
    float c1 = cloudNoise(sp, 1.5, u_seed.x * 100.0);

    // Layer 2: domain-warped cloud using layer 1
    float c2 = cloudNoise(sp + vec3(c1 * 0.4), 2.5, u_seed.y * 100.0 + 310.4);

    // Layer 3: ridged features for filamentary structure
    float r1 = ridgedNoise(sp + vec3(c1 * 0.2, c2 * 0.15, 0.0), 2.0);

    // Combine into nebula density
    float nebula = c2 * 0.6 + r1 * 0.4;
    nebula = pow(nebula, 1.5) * u_nebulaDensity;
    nebula = clamp(nebula, 0.0, 1.0);

    // Colour: blend between nebula colours based on density layers
    vec3 nebulaColor = mix(u_color1, u_color2, c1);
    nebulaColor = mix(nebulaColor, u_color3, r1 * 0.5);

    // Compose final colour (nebula only)
    vec3 color = nebulaColor * nebula * u_brightness;

    gl_FragColor = vec4(color, nebula);
  }
`;

// Nebula palettes inspired by real nebulae, grouped by star temperature association
// Hot stars (>15000K): OIII-dominated — teal, green-blue, cyan
// Warm-hot stars (8000-15000K): mixed emission — blue-purple, magenta
// Solar-type (5000-8000K): reflection + Hα — blue, pink, gold
// Cool stars (<5000K): molecular clouds + Hα — red, orange, brown, warm tones

type Palette = [THREE.Color, THREE.Color, THREE.Color];

const hotPalettes: Palette[] = [
  // Eta Carinae homunculus — teal/orange/gold
  [new THREE.Color(0.05, 0.4, 0.45), new THREE.Color(0.8, 0.5, 0.15), new THREE.Color(0.2, 0.7, 0.6)],
  // OIII emission — deep teal/green/cyan
  [new THREE.Color(0.02, 0.35, 0.3), new THREE.Color(0.1, 0.6, 0.5), new THREE.Color(0.15, 0.8, 0.7)],
  // Blue supergiant — electric blue/white/cyan
  [new THREE.Color(0.1, 0.15, 0.6), new THREE.Color(0.2, 0.4, 0.9), new THREE.Color(0.5, 0.7, 1.0)],
  // Pillars of Creation — green/gold/brown
  [new THREE.Color(0.15, 0.35, 0.1), new THREE.Color(0.5, 0.45, 0.15), new THREE.Color(0.2, 0.55, 0.25)],
];

const warmPalettes: Palette[] = [
  // Orion Nebula — purple/pink/blue
  [new THREE.Color(0.3, 0.08, 0.5), new THREE.Color(0.6, 0.2, 0.7), new THREE.Color(0.4, 0.3, 0.9)],
  // Carina magic mountain — blue/teal/gold
  [new THREE.Color(0.08, 0.2, 0.5), new THREE.Color(0.1, 0.45, 0.55), new THREE.Color(0.7, 0.55, 0.2)],
  // Lagoon Nebula — magenta/pink/red
  [new THREE.Color(0.5, 0.05, 0.3), new THREE.Color(0.7, 0.15, 0.4), new THREE.Color(0.9, 0.35, 0.5)],
  // Veil Nebula — cyan/red/blue filaments
  [new THREE.Color(0.1, 0.4, 0.6), new THREE.Color(0.6, 0.15, 0.1), new THREE.Color(0.15, 0.25, 0.7)],
];

const solarPalettes: Palette[] = [
  // Eagle Nebula — gold/green/brown pillars
  [new THREE.Color(0.5, 0.4, 0.1), new THREE.Color(0.25, 0.4, 0.15), new THREE.Color(0.7, 0.5, 0.2)],
  // Rosette Nebula — red/pink/purple
  [new THREE.Color(0.6, 0.1, 0.12), new THREE.Color(0.8, 0.2, 0.3), new THREE.Color(0.5, 0.15, 0.4)],
  // Reflection + Hα — blue/pink
  [new THREE.Color(0.1, 0.15, 0.45), new THREE.Color(0.6, 0.2, 0.35), new THREE.Color(0.25, 0.3, 0.7)],
  // Bubble Nebula — teal/yellow/orange
  [new THREE.Color(0.05, 0.3, 0.35), new THREE.Color(0.7, 0.6, 0.15), new THREE.Color(0.9, 0.45, 0.1)],
];

const coolPalettes: Palette[] = [
  // Horsehead / dark molecular — deep red/brown/orange
  [new THREE.Color(0.5, 0.08, 0.05), new THREE.Color(0.7, 0.25, 0.08), new THREE.Color(0.9, 0.45, 0.12)],
  // Flame Nebula — orange/yellow/red
  [new THREE.Color(0.7, 0.3, 0.05), new THREE.Color(0.9, 0.55, 0.1), new THREE.Color(1.0, 0.7, 0.2)],
  // Barnard's Loop — faint red/crimson/maroon
  [new THREE.Color(0.45, 0.05, 0.08), new THREE.Color(0.65, 0.12, 0.1), new THREE.Color(0.8, 0.25, 0.15)],
  // Witch Head — blue-grey/warm brown
  [new THREE.Color(0.15, 0.15, 0.3), new THREE.Color(0.4, 0.25, 0.15), new THREE.Color(0.55, 0.35, 0.2)],
];

function nebulaColors(seed: number, starTemp: number): Palette {
  let palettes: Palette[];
  if (starTemp > 15000) palettes = hotPalettes;
  else if (starTemp > 8000) palettes = warmPalettes;
  else if (starTemp > 5000) palettes = solarPalettes;
  else palettes = coolPalettes;

  const index = ((seed % palettes.length) + palettes.length) % palettes.length;
  return palettes[index];
}

interface NebulaProps {
  seed?: string;
  density?: number;
  brightness?: number;
  starTemp?: number;
  starDensity?: number;
}

export default function Nebula({ seed = "default", density = 0.6, brightness = 0.5, starTemp = 5500, starDensity = 1.0 }: NebulaProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    // Hash the seed string
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }

    const seedVec = new THREE.Vector3(
      (((h % 1000) + 1000) % 1000) / 1000,
      ((((h * 7) % 1000) + 1000) % 1000) / 1000,
      ((((h * 13) % 1000) + 1000) % 1000) / 1000
    );

    const [c1, c2, c3] = nebulaColors(h, starTemp);

    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_seed: { value: seedVec },
        u_color1: { value: c1 },
        u_color2: { value: c2 },
        u_color3: { value: c3 },
        u_nebulaDensity: { value: density },
        u_brightness: { value: brightness },
        u_starDensity: { value: starDensity },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [seed, density, brightness, starTemp, starDensity]);

  useFrame((state) => {
    material.uniforms.u_time.value = state.clock.getElapsedTime();
    material.uniforms.u_nebulaDensity.value = density;
    material.uniforms.u_brightness.value = brightness;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[50000000, 32, 32]} />
    </mesh>
  );
}
