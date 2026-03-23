import * as THREE from "three";
import { PlanetType, type ShaderParams } from "~/utils/planetClassification";

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;

  void main() {
    vPosition = normalize(position);
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Shared noise functions used by all planet types
const noiseLib = `
  uniform vec3 u_seed;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
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

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  float fbm3d(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3d(p);
      p = p * 2.01 + vec3(100.0);
      a *= 0.5;
    }
    return v;
  }

  // Ridged noise: sharp mountain ridges and valleys (from ProceduralPlanet)
  float ridgedNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 6; i++) {
      float n = noise3d(p);
      n = 2.0 * (0.5 - abs(0.5 - n)); // ridge fold
      v += a * n;
      p = p * 2.03 + vec3(13.7, 29.3, 41.1);
      a *= 0.5;
    }
    return pow(clamp(v, 0.0, 1.0), 3.0); // sharpen ridges
  }

  // Cloud noise: sin-modulated for wispy organic shapes
  float cloudNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 6; i++) {
      float n = noise3d(p);
      v += a * (sin(n * 5.0) * 0.5 + 0.5);
      p = p * 2.02 + vec3(31.7, 17.3, 53.1);
      a *= 0.5;
    }
    return v;
  }

  // Contrast enhancement for sharper terrain boundaries
  float enhanceContrast(float n, float center, float strength) {
    return clamp((n - center) * strength + center, 0.0, 1.0);
  }

  // Voronoi / cellular noise for craters
  vec2 voronoi(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float d1 = 1.0, d2 = 1.0;
    for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
    for (int z = -1; z <= 1; z++) {
      vec3 neighbor = vec3(float(x), float(y), float(z));
      vec3 point = vec3(
        hash3(i + neighbor),
        hash3(i + neighbor + vec3(37.0)),
        hash3(i + neighbor + vec3(71.0))
      ) * 0.8 + 0.1;
      float d = length(neighbor + point - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
    return vec2(d1, d2);
  }

  // Crater profile: depression in centre, raised rim, falloff
  float craterProfile(float d, float size) {
    float r = d / size;
    if (r > 1.2) return 0.0;
    if (r > 0.8) return 0.3 * (1.0 - smoothstep(0.8, 1.2, r)); // rim
    return -0.5 * (1.0 - smoothstep(0.0, 0.8, r)); // bowl
  }

  // Sobel-style bump normal from height field (6-sample for better quality)
  vec3 sobelNormal(vec3 p, float eps, float strength) {
    float h00 = noise3d(p + vec3(-eps, -eps, 0.0));
    float h10 = noise3d(p + vec3( 0.0, -eps, 0.0));
    float h20 = noise3d(p + vec3( eps, -eps, 0.0));
    float h01 = noise3d(p + vec3(-eps,  0.0, 0.0));
    float h21 = noise3d(p + vec3( eps,  0.0, 0.0));
    float h02 = noise3d(p + vec3(-eps,  eps, 0.0));
    float h12 = noise3d(p + vec3( 0.0,  eps, 0.0));
    float h22 = noise3d(p + vec3( eps,  eps, 0.0));
    float dX = (h20 + 2.0*h21 + h22) - (h00 + 2.0*h01 + h02);
    float dY = (h02 + 2.0*h12 + h22) - (h00 + 2.0*h10 + h20);
    return normalize(vec3(-dX * strength, -dY * strength, 1.0));
  }

  // Seed-offset helper: each planet samples different noise regions
  vec3 seededPos(vec3 p, float s) {
    return p + u_seed * s;
  }
`;

// Gas giant fragment shader (banded, swirly)
const gasGiantFragment = `
  uniform float u_time;
  uniform float scale;
  uniform float swirl_strength;
  uniform float swirl_speed;
  uniform float warp_intensity;
  uniform vec3 color1, color2, color3, color4;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  varying vec3 vPosition;
  varying vec3 vNormal;

  ${noiseLib}

  vec3 swirl(vec3 p, float time, float strength) {
    for (int i = 0; i < 5; i++) {
      float angle = time * swirl_speed + length(p.xy) * strength * (float(i) * 0.5);
      float s = sin(angle);
      float c = cos(angle);
      p.xy = mat2(c, -s, s, c) * p.xy * 0.6;
    }
    return p;
  }

  void main() {
    vec3 st = seededPos(vPosition, 100.0) * scale;
    st = swirl(st, u_time, swirl_strength);
    st += warp_intensity * vec3(fbm(st.xy * 0.9), fbm(st.zy * 0.9), fbm(st.xz * 0.9));
    st += vec3(0.0, 0.0, u_time * 0.005);

    vec3 color = mix(color1, color2, fbm(st.xy));
    color = mix(color, color3, fbm(st.zy));
    color = mix(color, color4, fbm(st.xz));
    color += emissiveColor * emissiveIntensity * fbm(st.xz * 2.0);

    float diff = max(dot(vNormal, normalize(vec3(1.0, 0.5, 0.8))), 0.15);
    color *= (0.3 + 0.7 * diff);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Rocky planet fragment shader (craters, terrain, height-based colouring, bump normals)
const rockyFragment = `
  uniform float u_time;
  uniform float scale;
  uniform vec3 color1, color2, color3, color4;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  uniform float warp_intensity;
  varying vec3 vPosition;
  varying vec3 vNormal;

  ${noiseLib}

  // Compute terrain height using ridged noise + craters
  float computeHeight(vec3 p) {
    // Base terrain: smooth continental-scale features
    float base = noise3d(p * 0.8) * 0.5;

    // Ridged mountain ranges layered on top
    float ridges = ridgedNoise(p, 1.5) * 0.35;

    // Cloud noise for softer highland areas
    float soft = cloudNoise(p + vec3(ridges * 0.3), 2.0) * 0.15;

    // Domain warp for organic shapes
    vec3 wp = p + warp_intensity * 0.05 * vec3(
      noise3d(p * 3.0 + vec3(5.0)),
      noise3d(p * 3.0 + vec3(9.0)),
      noise3d(p * 3.0 + vec3(13.0))
    );
    float detail = noise3d(wp * 6.0) * 0.08;

    float terrain = base + ridges + soft + detail;

    // Craters using Voronoi at multiple scales (fewer, varied sizes)
    vec2 v1 = voronoi(p * 0.7);
    terrain += craterProfile(v1.x, 2.0) * 0.7;
    vec2 v2 = voronoi(p * 1.8);
    terrain += craterProfile(v2.x, 0.8) * 0.4;
    vec2 v3 = voronoi(p * 5.0);
    terrain += craterProfile(v3.x, 0.5) * 0.15;

    return terrain;
  }

  void main() {
    vec3 p = seededPos(vPosition, 100.0) * scale;

    float height = computeHeight(p);

    // Bump normal from height field
    float eps = 0.002;
    float hx = computeHeight(p + vec3(eps, 0.0, 0.0));
    float hy = computeHeight(p + vec3(0.0, eps, 0.0));
    float hz = computeHeight(p + vec3(0.0, 0.0, eps));
    vec3 bumpGrad = vec3(height - hx, height - hy, height - hz) / eps;
    vec3 bumpNormal = normalize(vNormal + bumpGrad * 0.15);

    // Colour based on height
    float h = height + 0.3;
    vec3 color = mix(color1, color2, smoothstep(0.15, 0.35, h));
    color = mix(color, color3, smoothstep(0.35, 0.55, h));
    color = mix(color, color4, smoothstep(0.55, 0.75, h));

    // Fine surface roughness for colour variation
    color *= 0.9 + 0.1 * noise3d(p * 40.0);

    // Emissive (for lava worlds)
    float lavaGlow = smoothstep(0.2, 0.0, h) * emissiveIntensity;
    color += emissiveColor * lavaGlow;
    // Glow in cracks between craters
    vec2 v1 = voronoi(p * 0.7);
    float cracks = smoothstep(0.02, 0.0, abs(v1.y - v1.x - 0.1)) * emissiveIntensity * 0.5;
    color += emissiveColor * cracks;

    // Lighting with bump normal
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
    float diff = max(dot(bumpNormal, lightDir), 0.08);
    color *= (0.2 + 0.8 * diff);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Earth-like fragment shader (oceans, continents, clouds, ice caps, bump normals)
const terrestrialFragment = `
  uniform float u_time;
  uniform float scale;
  uniform vec3 color1, color2, color3, color4;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;

  ${noiseLib}

  // Compute continental height using cloud noise + ridged terrain + domain warp
  float computeContinent(vec3 p) {
    // Strong domain warp at very low frequency for organic continent shapes
    vec3 wp = p + 0.6 * vec3(
      fbm3d(p * 0.4),
      fbm3d(p * 0.4 + vec3(5.2)),
      fbm3d(p * 0.4 + vec3(9.7))
    );

    // Very low frequency base for massive continents and ocean basins
    float h1 = noise3d(wp * 0.25);

    // Cloud noise for organic wispy coastline shapes (sin-modulated)
    float h2 = cloudNoise(wp, 0.6) * 0.35;

    // Ridged noise for mountain ranges on land
    float h3 = ridgedNoise(wp + vec3(h1 * 0.5), 1.2) * 0.15;

    // Coastline detail warp
    vec3 wp2 = wp + 0.12 * vec3(
      noise3d(wp * 2.5 + vec3(17.0)),
      noise3d(wp * 2.5 + vec3(31.0)),
      noise3d(wp * 2.5 + vec3(47.0))
    );
    float h4 = noise3d(wp2 * 2.0) * 0.08;

    float raw = h1 * 0.5 + h2 + h3 + h4;

    // Contrast enhancement for sharper land/ocean boundaries
    return enhanceContrast(raw, 0.45, 1.4);
  }

  void main() {
    vec3 p = seededPos(vPosition, 100.0) * scale;

    float continent = computeContinent(p);

    // Bump normal from continental height
    float eps = 0.002;
    float cx = computeContinent(p + vec3(eps, 0.0, 0.0));
    float cy = computeContinent(p + vec3(0.0, eps, 0.0));
    float cz = computeContinent(p + vec3(0.0, 0.0, eps));
    vec3 bumpGrad = vec3(continent - cx, continent - cy, continent - cz) / eps;
    vec3 bumpNormal = normalize(vNormal + bumpGrad * 0.08);

    // Sea level threshold (tuned for additive continent noise range)
    float seaLevel = 0.45;
    float isLand = smoothstep(seaLevel - 0.02, seaLevel + 0.02, continent);

    // Ocean colour (deeper = darker)
    vec3 deepOcean = color1 * 0.6;
    vec3 shallowOcean = color1;
    float oceanDepth = smoothstep(0.2, seaLevel, continent);
    vec3 oceanColor = mix(deepOcean, shallowOcean, oceanDepth);

    // Land colour varies with height, moisture, and ridged features
    float landHeight = (continent - seaLevel) / (1.0 - seaLevel);
    float moisture = cloudNoise(p * 0.5 + vec3(33.0), 1.0);
    float mountainRidge = ridgedNoise(p, 2.0);

    vec3 lowland = color2;
    vec3 highland = color3;
    vec3 peaks = color4;

    vec3 landColor = mix(lowland, highland, smoothstep(0.1, 0.5, landHeight));
    landColor = mix(landColor, peaks, smoothstep(0.5, 0.8, landHeight));
    // Ridged areas get more rocky highland colour
    landColor = mix(landColor, highland * 0.9, mountainRidge * 0.3);
    // Dry areas are more brown
    landColor = mix(landColor, highland * 0.8, smoothstep(0.5, 0.3, moisture) * 0.3);

    vec3 surfaceColor = mix(oceanColor, landColor, isLand);

    // Ice caps at poles (use original vPosition.y for latitude)
    float latitude = abs(vPosition.y);
    float iceCap = smoothstep(0.7, 0.85, latitude + fbm3d(p * 5.0) * 0.15);
    surfaceColor = mix(surfaceColor, vec3(0.92, 0.94, 0.96), iceCap);

    // Cloud layer (seeded but also time-animated)
    vec3 cloudP = seededPos(vPosition, 50.0) * 8.0 + vec3(u_time * 0.003, 0.0, u_time * 0.002);
    float clouds = fbm3d(cloudP);
    clouds = smoothstep(0.4, 0.7, clouds);
    surfaceColor = mix(surfaceColor, vec3(0.95, 0.95, 0.97), clouds * 0.6);

    // Lighting with bump normal (land only; ocean is smooth)
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
    vec3 effectiveNormal = mix(vNormal, bumpNormal, isLand);
    float diff = max(dot(effectiveNormal, lightDir), 0.1);
    surfaceColor *= (0.25 + 0.75 * diff);

    // Specular on ocean
    vec3 viewDir = normalize(-vPosition);
    vec3 reflectDir = reflect(-lightDir, vNormal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    surfaceColor += vec3(0.3) * spec * (1.0 - isLand) * (1.0 - clouds);

    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`;

// Venus/hazy atmosphere shader
const hazyFragment = `
  uniform float u_time;
  uniform float scale;
  uniform vec3 color1, color2, color3, color4;
  varying vec3 vPosition;
  varying vec3 vNormal;

  ${noiseLib}

  void main() {
    vec3 p = seededPos(vPosition, 100.0) * scale;
    p += vec3(u_time * 0.001, u_time * 0.0005, 0.0);

    // Very subtle banding through thick haze
    float band = fbm3d(p * 0.5) * 0.3 + fbm3d(p * 1.5) * 0.1;
    vec3 color = mix(color1, color2, band);
    color = mix(color, color3, fbm3d(p * 0.3 + vec3(20.0)) * 0.2);

    // Fresnel-like limb brightening (thick atmosphere scatters at edges)
    float fresnel = 1.0 - abs(dot(vNormal, normalize(vec3(0.0, 0.0, 1.0))));
    fresnel = pow(fresnel, 2.0);
    color = mix(color, color4, fresnel * 0.3);

    float diff = max(dot(vNormal, normalize(vec3(1.0, 0.5, 0.8))), 0.15);
    color *= (0.4 + 0.6 * diff);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Ice giant shader (methane blue with subtle bands)
const iceGiantFragment = `
  uniform float u_time;
  uniform float scale;
  uniform vec3 color1, color2, color3, color4;
  varying vec3 vPosition;
  varying vec3 vNormal;

  ${noiseLib}

  void main() {
    vec3 p = seededPos(vPosition, 100.0) * scale;

    // Subtle horizontal banding
    float lat = vPosition.y * 8.0 + u_seed.x * 20.0;
    float band = sin(lat + fbm(vPosition.xz * 4.0 + u_seed.xy * 10.0) * 2.0) * 0.5 + 0.5;
    band = smoothstep(0.3, 0.7, band);

    vec3 color = mix(color1, color2, band);

    // Subtle haze variation
    float haze = fbm3d(p * 0.5 + vec3(0.0, 0.0, u_time * 0.002));
    color = mix(color, color3, haze * 0.2);

    // Storm spot at unique position per planet
    vec2 stormPos = vec2(u_seed.x * 0.6 - 0.3, u_seed.y * 0.4 - 0.2);
    float storm = 1.0 - smoothstep(0.0, 0.15, length(vPosition.xz - stormPos));
    color = mix(color, color4, storm * 0.4);

    // Fresnel for atmosphere haze
    float fresnel = 1.0 - abs(dot(vNormal, normalize(vec3(0.0, 0.0, 1.0))));
    color = mix(color, color2 * 1.2, pow(fresnel, 3.0) * 0.2);

    float diff = max(dot(vNormal, normalize(vec3(1.0, 0.5, 0.8))), 0.15);
    color *= (0.3 + 0.7 * diff);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function selectFragmentShader(type: PlanetType): string {
  switch (type) {
    case PlanetType.COLD_GIANT:
    case PlanetType.COOL_GIANT:
    case PlanetType.WARM_GIANT:
    case PlanetType.HOT_JUPITER_IV:
    case PlanetType.HOT_JUPITER_V:
      return gasGiantFragment;

    case PlanetType.ICE_GIANT:
      return iceGiantFragment;

    case PlanetType.WATER_WORLD:
    case PlanetType.SUB_NEPTUNE:
      return hazyFragment;

    case PlanetType.TEMPERATE:
      return terrestrialFragment;

    case PlanetType.VENUS_LIKE:
      return hazyFragment;

    case PlanetType.LAVA_WORLD:
    case PlanetType.HOT_ROCKY:
    case PlanetType.FROZEN:
      return rockyFragment;

    default:
      return rockyFragment;
  }
}

export function createPlanetMaterial(params: ShaderParams): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_seed: { value: params.seed },
      scale: { value: params.noiseScale },
      swirl_strength: { value: params.swirlStrength },
      swirl_speed: { value: params.swirlSpeed },
      warp_intensity: { value: params.warpIntensity },
      color1: { value: params.color1 },
      color2: { value: params.color2 },
      color3: { value: params.color3 },
      color4: { value: params.color4 },
      emissiveColor: { value: params.emissive },
      emissiveIntensity: { value: params.emissiveIntensity },
    },
    vertexShader,
    fragmentShader: selectFragmentShader(params.type),
  });
}
