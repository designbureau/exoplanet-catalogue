import * as THREE from "three";
import { PlanetType, type ShaderParams } from "~/utils/planetClassification";

// Gustavson classic 3D Perlin noise (MIT license) — smooth at all frequencies
// Returns [-1,1]. Wrapped as pnoise3d() returning [0,1] for our pipeline.
// Defined first so both vertex and fragment shaders can inject it via ${perlinNoise3D}.
const perlinNoise3D = `
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289v4(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289v3(Pi0);
    Pi1 = mod289v3(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
    float n000 = norm0.x * dot(g000, Pf0);
    float n010 = norm0.y * dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n100 = norm0.z * dot(g100, vec3(Pf1.x, Pf0.yz));
    float n110 = norm0.w * dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = norm1.x * dot(g001, vec3(Pf0.xy, Pf1.z));
    float n011 = norm1.y * dot(g011, vec3(Pf0.x, Pf1.yz));
    float n101 = norm1.z * dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n111 = norm1.w * dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  // [0,1] wrapper for pipeline compatibility
  float pnoise3d(vec3 p) { return cnoise(p) * 0.5 + 0.5; }
`;

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vSphereDir;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vPosition = normalize(position);
    vSphereDir = vPosition; // no displacement, same as vPosition
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Vertex shader with displacement for terrestrial planets at high LOD
const terrestrialVertexShader = `
  varying vec3 vPosition;
  varying vec3 vSphereDir;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  uniform vec3 u_seed;
  uniform float u_displace;
  uniform float u_continentFreq;
  uniform float u_terrWarp;
  uniform float u_seaLevel;
  uniform float u_coastDetail;
  uniform float u_landContrast;
  uniform float u_vertLOD;
  uniform float scale;
  uniform float u_useTextureMaps;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_normalMap;

  // Equirectangular UV from sphere direction
  vec2 dirToUV(vec3 d) {
    float phi = atan(d.z, d.x);      // [-π, π]
    float theta = acos(clamp(d.y, -1.0, 1.0)); // [0, π]
    return vec2(phi / (2.0 * 3.14159265) + 0.5, theta / 3.14159265);
  }

  // ── Perlin noise (same as fragment — must match exactly) ──
  ${perlinNoise3D}

  // ── Vertex noise: exact mirrors of fragment hi* functions ──

  // Cloud noise: 4-octave for vertex (displacement doesn't need fine detail)
  // Same algorithm as fragment hiCloud but fewer octaves — shapes match, less detail
  float vCloud(vec3 pos, float frq, float sd) {
    float n = 0.0, amp = 0.5;
    vec3 p = pos * frq + vec3(sd);
    for (int i = 0; i < 4; i++) {
      float s = pnoise3d(p);
      s = sin(s * 5.0) * 0.5 + 0.5;
      n += s * amp;
      p = p * 2.02 + vec3(float(i) * 31.7, float(i) * 17.3, float(i) * 53.1);
      amp *= 0.5;
    }
    return clamp(n, 0.0, 1.0);
  }

  // Ridged: 4-octave for vertex displacement
  float vRidged(vec3 pos, float frq, float sd) {
    float n = 0.0, amp = 0.5;
    vec3 p = pos * frq + vec3(sd);
    for (int i = 0; i < 4; i++) {
      float s = pnoise3d(p);
      s = 2.0 * (0.5 - abs(0.5 - s));
      n += s * amp;
      p = p * 2.03 + vec3(float(i) * 13.7, float(i) * 7.3, float(i) * 19.1);
      amp *= 0.5;
    }
    return pow(clamp(n, 0.0, 1.0), 4.0);
  }

  // ── Height: exact mirror of fragment computeContinent ───────
  float computeHeight(vec3 p) {
    // Same coordinate space as fragment: seededPos(dir, 100.0) * scale
    vec3 sp = (p + u_seed * 100.0) * scale;
    float sd = u_seed.x * 100.0;

    // 3 sub-layers — must match fragment computeContinent exactly
    float sub1 = vCloud(sp, u_continentFreq * 1.0, sd + 11.4);
    float sub2 = vRidged(sp, u_continentFreq * (1.0 + u_coastDetail * 3.0), sd + 29.4);
    float sub3 = vCloud(sp, u_continentFreq * 0.6, sd + 53.0);

    // Domain warp
    vec3 warp = vec3(sub1 - 0.5, sub2 - 0.5, sub3 - 0.5) * u_terrWarp * 0.4;
    float n = vCloud(sp + warp, u_continentFreq * 0.8, sd + 78.2);

    // Blend ridged peaks via spatial mask
    float mask = smoothstep(0.3, 0.7, sub3);
    float ridgeMix = u_landContrast * 0.3;
    n = mix(n, n * (1.0 - ridgeMix) + sub2 * ridgeMix, mask * 0.7);

    // Contrast push — must match fragment computeContinent
    float c = n - u_seaLevel;
    n = u_seaLevel + c * (1.0 + abs(c) * 2.0);
    n = clamp(n, 0.0, 1.0);

    // Land only — ocean stays flat
    return max(n - u_seaLevel, 0.0) / (1.0 - u_seaLevel);
  }

  // ── Main — displacement + normals (texture or procedural) ──
  void main() {
    vec3 dir = normalize(position);
    vSphereDir = dir;

    vec3 displacedPos = position;
    vec3 displacedNormal = normal;

    if (u_displace > 0.0) {
      float height;
      if (u_useTextureMaps > 0.5) {
        // ── Texture path: single texture lookup ──
        vec2 uv = dirToUV(dir);
        height = texture2D(u_heightMap, uv).r;
        // Convert heightfield to land-only displacement
        height = max(height - u_seaLevel, 0.0) / (1.0 - u_seaLevel);
      } else {
        // ── Procedural path: expensive per-vertex noise ──
        height = computeHeight(dir);
      }
      displacedPos = position + normal * height * u_displace;

      // Forward-difference normal: 2 neighbors (3× computeHeight total)
      vec3 up = abs(dir.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 tangent = normalize(cross(up, dir));
      vec3 bitangent = cross(dir, tangent);
      float eps = 0.003;
      float r = length(position);
      vec3 pT = normalize(dir + tangent * eps);
      vec3 pB = normalize(dir + bitangent * eps);
      vec3 posT = pT * r + pT * computeHeight(pT) * u_displace;
      vec3 posB = pB * r + pB * computeHeight(pB) * u_displace;
      displacedNormal = normalize(cross(posT - displacedPos, posB - displacedPos));
      vPosition = normalize(displacedPos);
    } else {
      vPosition = dir;
    }

    vNormal = normalize(normalMatrix * displacedNormal);
    vWorldNormal = normalize((modelMatrix * vec4(displacedNormal, 0.0)).xyz);
    vWorldPosition = (modelMatrix * vec4(displacedPos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
  }
`;

// Shared noise functions used by all planet types
const noiseLib = `
  uniform vec3 u_seed;
  uniform float u_lod;

  ${perlinNoise3D}

  // Legacy hash-based value noise (kept for 2D noise, voronoi, etc.)
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

  // noise3d now uses Perlin noise — smooth at all frequencies
  float noise3d(vec3 p) { return pnoise3d(p); }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  float fbm3d(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise3d(p);
      p = p * 2.01 + vec3(100.0);
      a *= 0.5;
    }
    return v;
  }

  // ── High-detail noise (Perlin-based, LOD-aware: 6 oct close, 3 oct far) ──
  // Octaves 7-10 contribute <1% each — imperceptible but double the cost.

  // Base FBM: 6/3-octave, contrast-boosted
  float hiFBM(vec3 pos, float frq, float sd) {
    float n = 0.0, amp = 0.5;
    vec3 p = pos * frq + vec3(sd);
    int oct = (u_lod > 0.5) ? 6 : 3;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      n += pnoise3d(p) * amp;
      p = p * 2.03 + vec3(float(i) * 13.7, float(i) * 7.3, float(i) * 19.1);
      amp *= 0.5;
    }
    return clamp((n - 0.5) * 2.0 + 0.5, 0.0, 1.0);
  }

  // Ridged: 6/3-octave, ridge-folded, pow4 sharpened
  float hiRidged(vec3 pos, float frq, float sd) {
    float n = 0.0, amp = 0.5;
    vec3 p = pos * frq + vec3(sd);
    int oct = (u_lod > 0.5) ? 6 : 3;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      float s = pnoise3d(p);
      s = 2.0 * (0.5 - abs(0.5 - s));
      n += s * amp;
      p = p * 2.03 + vec3(float(i) * 13.7, float(i) * 7.3, float(i) * 19.1);
      amp *= 0.5;
    }
    return pow(clamp(n, 0.0, 1.0), 4.0);
  }

  // Inverted ridged: valleys instead of peaks
  float hiInvRidged(vec3 pos, float frq, float sd) {
    return 1.0 - hiRidged(pos, frq, sd);
  }

  // Cloud noise: 6/3-octave sin-modulated for organic shapes
  float hiCloud(vec3 pos, float frq, float sd) {
    float n = 0.0, amp = 0.5;
    vec3 p = pos * frq + vec3(sd);
    int oct = (u_lod > 0.5) ? 6 : 3;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      float s = pnoise3d(p);
      s = sin(s * 5.0) * 0.5 + 0.5;
      n += s * amp;
      p = p * 2.02 + vec3(float(i) * 31.7, float(i) * 17.3, float(i) * 53.1);
      amp *= 0.5;
    }
    return clamp(n, 0.0, 1.0);
  }

  // ── Legacy noise (used by non-terrestrial shaders, LOD paths) ────

  // Ridged noise: 4-octave (cheaper, for bump layers)
  float ridgedNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 4; i++) {
      float n = noise3d(p);
      n = 2.0 * (0.5 - abs(0.5 - n));
      v += a * n;
      p = p * 2.03 + vec3(13.7, 29.3, 41.1);
      a *= 0.5;
    }
    return pow(clamp(v, 0.0, 1.0), 3.0);
  }

  // Cloud noise: 4-octave (cheaper, for bump/cloud layers)
  float cloudNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 4; i++) {
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
    // Smooth rim + bowl with no sharp transitions
    float rim = 0.15 * smoothstep(0.6, 0.9, r) * (1.0 - smoothstep(0.9, 1.2, r));
    float bowl = -0.3 * (1.0 - smoothstep(0.0, 0.7, r));
    return rim + bowl;
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

  // Atmosphere fresnel helper
  uniform vec3 u_sunDirection;
  uniform vec3 u_sunDirectionLocal; // object-space sun direction for eyeball biomes
  uniform float u_ambient;
  uniform float u_lavaAmbient;
  uniform float u_wrapRange;
  uniform float u_wrapPower;
  uniform vec3 u_atmosDayColor;
  uniform vec3 u_atmosTwilightColor;
  uniform float u_atmosIntensity;
  uniform float u_atmosFalloff;

  // Wrap lighting + fresnel ambient for realistic dark-side falloff
  float wrapDiffuse(vec3 N, vec3 L) {
    float wrap = dot(N, L) * u_wrapRange + u_wrapRange;
    return clamp(pow(wrap, u_wrapPower), 0.0, 1.0);
  }

  float fresnelAmbient(vec3 N, vec3 V) {
    float f = 1.0 - abs(dot(N, V));
    return f * f;
  }

  vec3 planetLighting(vec3 color, vec3 N, vec3 L, vec3 V, float ambient) {
    float diff = wrapDiffuse(N, L);
    float rim = fresnelAmbient(N, V);
    float light = diff + ambient * rim * (1.0 - diff);
    return color * light;
  }

  vec3 applyAtmosphere(vec3 color, vec3 normal, vec3 worldPos) {
    vec3 viewDir = normalize(cameraPosition - worldPos);
    float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
    fresnel = pow(fresnel, u_atmosFalloff);

    float sunOrientation = dot(normal, u_sunDirection);
    // Day colour blend: transitions across full lit hemisphere
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 atmosColor = mix(u_atmosTwilightColor, u_atmosDayColor, atmosphereDayMix);

    // Match planet surface wrap lighting for consistent shadow terminator
    float dayVisibility = wrapDiffuse(normal, u_sunDirection);

    // Atmosphere fades to black in shadow — both colour and blend strength
    vec3 litAtmos = atmosColor * dayVisibility;
    return mix(color, litAtmos, fresnel * u_atmosIntensity);
  }

  // LOD-aware noise: fewer octaves when u_lod is 0
  float fbm3d_lod(vec3 p) {
    float v = 0.0, a = 0.5;
    int octaves = (u_lod > 0.5) ? 4 : 2;
    for (int i = 0; i < 4; i++) {
      if (i >= octaves) break;
      v += a * noise3d(p);
      p = p * 2.01 + vec3(100.0);
      a *= 0.5;
    }
    return v;
  }

  float ridgedNoise_lod(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    int octaves = (u_lod > 0.5) ? 4 : 2;
    for (int i = 0; i < 4; i++) {
      if (i >= octaves) break;
      float n = noise3d(p);
      n = 2.0 * (0.5 - abs(0.5 - n));
      v += a * n;
      p = p * 2.03 + vec3(13.7, 29.3, 41.1);
      a *= 0.5;
    }
    return pow(clamp(v, 0.0, 1.0), 3.0);
  }

  float cloudNoise_lod(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    int octaves = (u_lod > 0.5) ? 4 : 2;
    for (int i = 0; i < 4; i++) {
      if (i >= octaves) break;
      float n = noise3d(p);
      v += a * (sin(n * 5.0) * 0.5 + 0.5);
      p = p * 2.02 + vec3(31.7, 17.3, 53.1);
      a *= 0.5;
    }
    return v;
  }
`;

// Gas giant fragment shader (banded, swirly)
const gasGiantFragment = `
  uniform float u_time;
  uniform float scale;
  uniform float swirl_strength;
  uniform float swirl_speed;
  uniform float warp_intensity;
  uniform float u_gasWarp;
  uniform float u_gasStorm;
  uniform float u_gasTurb;
  uniform float u_gasBands;
  uniform float u_gasEdgeNoise;
  uniform vec3 color1, color2, color3, color4;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${noiseLib}

  // 3D storm vortex: swirl the XZ plane near a point on the sphere
  vec3 stormVortex3D(vec3 p, vec3 center, float radius, float strength) {
    vec3 d = p - center;
    float dist = length(d);
    float t = 1.0 - clamp(dist / radius, 0.0, 1.0);
    t = t * t * t; // cubic falloff for tight eye
    float angle = strength * t;
    float sa = sin(angle);
    float ca = cos(angle);
    // Rotate in the tangent plane (XZ relative to storm centre)
    vec3 result = p;
    result.xz = center.xz + mat2(ca, -sa, sa, ca) * (p.xz - center.xz);
    // Slight Y compression towards storm eye
    result.y = mix(p.y, center.y, t * 0.3);
    return result;
  }

  void main() {
    vec3 p = vPosition;
    float latitude = abs(p.y);

    // Coriolis: rotate XZ plane — faster at equator, slower at poles
    float rotAngle = u_time * (1.0 - latitude * 0.6) * swirl_speed * 0.02;
    float cr = cos(rotAngle);
    float sr = sin(rotAngle);
    p.xz = mat2(cr, -sr, sr, cr) * p.xz;

    // Storm vortices
    vec3 storm1Pos = normalize(vec3(cos(u_seed.x * 6.28), 0.25 + u_seed.y * 0.15, sin(u_seed.x * 6.28)));
    p = stormVortex3D(p, storm1Pos, 0.45, swirl_strength * u_gasStorm);
    vec3 storm2Pos = normalize(vec3(cos(u_seed.y * 6.28 + 2.5), -0.3 - u_seed.z * 0.15, sin(u_seed.y * 6.28 + 2.5)));
    p = stormVortex3D(p, storm2Pos, 0.3, swirl_strength * -u_gasStorm * 0.67);
    vec3 storm3Pos = normalize(vec3(cos(u_seed.z * 6.28 + 1.0), 0.55, sin(u_seed.z * 6.28 + 1.0)));
    p = stormVortex3D(p, storm3Pos, 0.2, swirl_strength * u_gasStorm * 0.55);
    vec3 storm4Pos = normalize(vec3(cos(u_seed.x * 6.28 + 4.0), -0.1, sin(u_seed.x * 6.28 + 4.0)));
    p = stormVortex3D(p, storm4Pos, 0.22, swirl_strength * -u_gasStorm * 0.44);
    vec3 storm5Pos = normalize(vec3(cos(u_seed.z * 6.28 + 3.2), 0.7, sin(u_seed.z * 6.28 + 3.2)));
    p = stormVortex3D(p, storm5Pos, 0.15, swirl_strength * u_gasStorm * 0.39);

    // Stretched 3D coords for banding
    vec3 bp = vec3(p.x, p.y * scale * 0.5, p.z) + u_seed * 5.0;

    // Domain warp (IQ technique)
    float n1 = fbm3d(bp);
    float n2 = fbm3d(bp + vec3(5.2, 1.3, 7.4));
    float r1 = fbm3d(bp + u_gasWarp * vec3(n1, n2, n1 * 0.5) + vec3(1.7, 9.2, 3.1) + vec3(0.0, 0.0, u_time * 0.008));
    float r2 = fbm3d(bp + u_gasWarp * vec3(n1, n2, n2 * 0.5) + vec3(8.3, 2.8, 5.7) + vec3(0.0, 0.0, u_time * 0.006));
    float f = fbm3d(bp + u_gasWarp * vec3(r1, r2, r1 * 0.7));

    // Band structure
    float bandY = p.y * scale * 0.5;
    float edgeNoise = (noise3d(bp * 3.0) * 0.7 + noise3d(bp * 7.0) * 0.3) * u_gasEdgeNoise;
    float bandPhase = bandY * u_gasBands + n1 * 2.5 + edgeNoise;
    float band1 = sin(bandPhase) * 0.5 + 0.5;

    // Turbulence at band edges
    float bandEdge = abs(cos(bandPhase));
    float turbNoise = noise3d(bp * 10.0 + vec3(u_time * 0.012));
    float turbulence = bandEdge * turbNoise * u_gasTurb * 0.5;
    float wispTurb = abs(r1 - r2) * bandEdge * u_gasTurb;

    float band2Phase = bandY * u_gasBands * 2.5 + n2 * 3.5 + f * 2.5 + edgeNoise * 2.0;
    float band2 = sin(band2Phase) * 0.5 + 0.5;

    // Colour mapping
    vec3 color = mix(color1, color2, smoothstep(0.3, 0.7, band1));
    color = mix(color, color3, clamp(sqrt(n1*n1 + n2*n2), 0.0, 1.0) * 0.5);
    color = mix(color, color4, smoothstep(0.3, 0.8, r2) * 0.3);
    color *= 0.8 + 0.4 * f;
    color *= 0.9 + 0.2 * band2;

    // Turbulence brightens and mixes band edges chaotically
    color += color3 * turbulence;
    color = mix(color, color4, wispTurb);

    // Storm eye darkening — darken the very centre of large storms
    float d1 = length(p - storm1Pos);
    float eye1 = smoothstep(0.08, 0.0, d1);
    color = mix(color, color3 * 0.6, eye1 * 0.5);

    float d2 = length(p - storm2Pos);
    float eye2 = smoothstep(0.05, 0.0, d2);
    color = mix(color, color3 * 0.6, eye2 * 0.4);

    // Polar darkening
    color *= 1.0 - latitude * 0.2;

    // ── Subtle cloud belt normal perturbation ──
    // Domain warp difference gives gentle organic relief (no extra noise)
    // Band derivative kept very low to avoid stripey look
    vec3 beltBump = vec3(
      (r1 - r2) * 0.08,                          // warp-driven XZ relief
      cos(bandPhase) * 0.02,                      // very gentle band ridges
      (n1 - n2) * 0.06                            // warp-driven XZ relief
    );
    vec3 gasNormal = normalize(vWorldNormal + beltBump);

    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, gasNormal, u_sunDirection, V, u_ambient);
    color = applyAtmosphere(color, vWorldNormal, vWorldPosition);

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
  uniform float u_craterScale;
  uniform float u_ridgeStrength;
  uniform float u_craterDepth;
  uniform float u_lavaWarp;
  uniform float u_lavaGlow;
  uniform float u_lavaHeightOffset;
  uniform float u_lavaFlowScale;
  uniform float u_tidallyLocked;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${noiseLib}

  // Compute terrain height (LOD-aware)
  // Lava worlds: flowing domain-warped noise, no craters
  // Rocky worlds: ridged noise + craters
  float computeHeight(vec3 p) {
    bool isLava = emissiveIntensity > 0.01;
    float base = noise3d(p * 0.8) * 0.5;

    if (isLava) {
      // Lava: domain-warped flowing terrain, no craters
      vec3 wp = p + warp_intensity * u_lavaWarp * vec3(
        noise3d(p * 0.8 + vec3(5.0)),
        noise3d(p * 0.8 + vec3(9.0)),
        noise3d(p * 0.8 + vec3(13.0))
      );
      float flow1 = noise3d(wp * u_lavaFlowScale) * 0.5;
      float flow2 = cloudNoise_lod(wp + vec3(flow1 * 0.3), u_lavaFlowScale * 2.0) * 0.25;
      float detail = 0.0;
      if (u_lod > 0.5) {
        detail = noise3d(wp * u_lavaFlowScale * 4.0 + vec3(flow1)) * 0.1;
      }
      return (base + flow1 + flow2 + detail) + u_lavaHeightOffset;
    }

    // Rocky: ridged noise + craters
    float ridges = ridgedNoise_lod(p, 1.5) * u_ridgeStrength;
    float soft = cloudNoise_lod(p + vec3(ridges * 0.3), 2.0) * 0.15;
    float detail = 0.0;
    if (u_lod > 0.5) {
      vec3 wp = p + warp_intensity * 0.05 * vec3(
        noise3d(p * 3.0 + vec3(5.0)),
        noise3d(p * 3.0 + vec3(9.0)),
        noise3d(p * 3.0 + vec3(13.0))
      );
      detail = noise3d(wp * 6.0) * 0.08;
    }
    float terrain = base + ridges + soft + detail;

    vec2 v0 = voronoi(p * 0.18);
    terrain += craterProfile(v0.x, 3.5) * u_craterDepth * 0.6;
    vec2 v1 = voronoi(p * 0.7 * u_craterScale);
    terrain += craterProfile(v1.x, 2.0) * u_craterDepth;
    if (u_lod > 0.5) {
      vec2 v2 = voronoi(p * 1.8 * u_craterScale);
      terrain += craterProfile(v2.x, 0.8) * 0.4;
      vec2 v3 = voronoi(p * 5.0 * u_craterScale);
      terrain += craterProfile(v3.x, 0.5) * 0.15;
    }
    return terrain;
  }

  void main() {
    vec3 p = seededPos(vPosition, 100.0) * scale;

    float height = computeHeight(p);

    // Bump normal: only compute at high LOD
    vec3 bumpNormal = vNormal;
    if (u_lod > 0.5) {
      float eps = 0.01;
      float hx = computeHeight(p + vec3(eps, 0.0, 0.0));
      float hy = computeHeight(p + vec3(0.0, eps, 0.0));
      float hz = computeHeight(p + vec3(0.0, 0.0, eps));
      vec3 bumpGrad = vec3(height - hx, height - hy, height - hz) / eps;
      bumpGrad = clamp(bumpGrad, vec3(-2.0), vec3(2.0));
      bumpNormal = normalize(vNormal + bumpGrad * 0.08);
    }

    // Colour based on height
    float h = height + 0.3;
    vec3 color = mix(color1, color2, smoothstep(0.15, 0.35, h));
    color = mix(color, color3, smoothstep(0.35, 0.55, h));
    color = mix(color, color4, smoothstep(0.55, 0.75, h));

    // Fine surface roughness for colour variation
    color *= 0.9 + 0.1 * noise3d(p * 40.0);

    // ── Tidally locked lava: modulate shader parameters by sun angle ──
    float tidalHeat = 1.0; // 1.0 = normal, >1 = hotter, <1 = cooler
    if (u_tidallyLocked > 0.5 && emissiveIntensity > 0.01) {
      // Use world-space normal vs world-space sun direction for correct orientation
      float sunAngle = dot(vWorldNormal, u_sunDirection);
      // Sub-stellar: molten — boost glow, lower terrain (more lava pools)
      float daySide = smoothstep(-0.1, 0.5, sunAngle);
      // Anti-stellar: cooled — suppress glow, raise terrain (solidified crust)
      float nightSide = smoothstep(0.1, -0.5, sunAngle);

      tidalHeat = mix(0.08, 2.0, daySide); // 8% glow on night, 200% on day
      // Shift the height so day side has more low areas (lava pools)
      // and night side has more high areas (solidified crust)
      h = h - daySide * 0.15 + nightSide * 0.2;
      // Darken base color on night side (cooled black basalt)
      color *= mix(1.0, 0.2, nightSide);
    }

    // Lighting — lava worlds have higher ambient (self-radiant heat)
    float ambient = emissiveIntensity > 0.01 ? u_lavaAmbient : u_ambient;
    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, vWorldNormal, u_sunDirection, V, ambient);

    // Emissive (for lava worlds) — glow in low areas + voronoi cracks
    // tidalHeat modulates everything: bright day side, dim night side
    float lavaEmit = smoothstep(0.35, 0.0, h) * u_lavaGlow * tidalHeat;
    color += emissiveColor * lavaEmit;
    vec2 v1 = voronoi(p * 0.3);
    float cracks = 1.0 - smoothstep(0.0, 0.1, v1.y - v1.x);
    cracks *= cracks;
    cracks *= smoothstep(0.5, 0.15, h) * u_lavaGlow * tidalHeat;
    color += emissiveColor * cracks * emissiveIntensity;
    color = applyAtmosphere(color, vWorldNormal, vWorldPosition);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Earth-like fragment shader (oceans, continents, clouds, ice caps, bump normals)
const terrestrialFragment = `
  varying vec3 vSphereDir; // undisplaced sphere direction for clouds
  uniform float u_time;
  uniform float scale;
  uniform vec3 color1, color2, color3, color4;
  uniform vec3 u_atmosColor;
  uniform float u_cloudCoverage;
  uniform float u_cloudOpacity;
  uniform float u_cloudSwirl;
  uniform float u_cloudBands;
  uniform float u_cloudWarp;
  uniform float u_seaLevel;
  uniform float u_continentFreq;
  uniform float u_terrWarp;
  uniform float u_iceCapSize;
  uniform float u_iceEdge;
  uniform float u_iceWarp;
  uniform float u_iceDetail;
  uniform float u_coastDetail;
  uniform float u_landContrast;
  uniform float u_displace;
  uniform float u_bumpStrength;
  uniform float u_tidallyLocked;
  uniform float u_eyeAridEdge;    // sun angle where arid→terminator transition starts
  uniform float u_eyeIceEdge;     // sun angle where terminator→ice transition starts
  uniform float u_eyeIceBergDensity; // iceberg frequency in transition zone
  uniform float u_eyeVegHue;        // hue rotation for vegetation (-0.5 to 0.5)
  uniform float u_eyeVegSat;        // saturation multiplier (0=grey, 1=normal, 2=vivid)
  uniform float u_eyeMoisture;      // terminator moisture level (0=dry, 1=lush)
  uniform float u_useTextureMaps;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_normalMap;

  // Equirectangular UV from sphere direction
  vec2 dirToUV(vec3 d) {
    float phi = atan(d.z, d.x);
    float theta = acos(clamp(d.y, -1.0, 1.0));
    return vec2(phi / (2.0 * 3.14159265) + 0.5, theta / 3.14159265);
  }

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${noiseLib}

  // ── ColorDodge-style terrain with value-noise-safe frequencies ──
  // ColorDodge uses simplex noise with arbitrary frequencies up to 5.0.
  // Our value noise aliases above freq ~1.5 with 6 octaves (highest
  // octave at 1.5 * 32 = 48x). So we keep base frequencies low.

  float computeContinent(vec3 p) {
    float sd = u_seed.x * 100.0;

    if (u_lod > 0.5) {
      // Sub 1: organic continental shapes
      float sub1 = hiCloud(p, u_continentFreq * 1.0, sd + 11.4);
      // Sub 2: ridged mountains at higher frequency (u_coastDetail scales)
      float sub2 = hiRidged(p, u_continentFreq * (1.0 + u_coastDetail * 3.0), sd + 29.4);
      // Sub 3: large-scale mixing control
      float sub3 = hiCloud(p, u_continentFreq * 0.6, sd + 53.0);

      // Domain warp (u_terrWarp controls strength)
      vec3 warp = vec3(sub1 - 0.5, sub2 - 0.5, sub3 - 0.5) * u_terrWarp * 0.4;
      float n = hiCloud(p + warp, u_continentFreq * 0.8, sd + 78.2);

      // Blend ridged peaks via spatial mask (u_landContrast controls mix amount)
      float mask = smoothstep(0.3, 0.7, sub3);
      float ridgeMix = u_landContrast * 0.3;
      n = mix(n, n * (1.0 - ridgeMix) + sub2 * ridgeMix, mask * 0.7);

      // Contrast push: clusters landmasses, widens oceans
      // S-curve centered at sea level — steepens the land/ocean transition
      float c = n - u_seaLevel;
      n = u_seaLevel + c * (1.0 + abs(c) * 2.0);
      n = clamp(n, 0.0, 1.0);

      return n;
    } else {
      vec3 wp = p + 0.3 * vec3(noise3d(p * 0.2), noise3d(p * 0.2 + vec3(5.2)), noise3d(p * 0.2 + vec3(9.7)));
      return noise3d(wp * u_continentFreq) * 0.65 + noise3d(wp * u_continentFreq * 0.67 + vec3(42.0)) * 0.15 + 0.1;
    }
  }



  void main() {
    vec3 baseDir = (u_displace > 0.0) ? vSphereDir : vPosition;
    vec3 p = seededPos(baseDir, 100.0) * scale;

    // ── Height: texture or procedural ──
    float continent;
    if (u_useTextureMaps > 0.5) {
      vec2 uv = dirToUV(baseDir);
      continent = texture2D(u_heightMap, uv).r;
    } else {
      continent = computeContinent(p);
    }

    float seaLevel = u_seaLevel;
    // Eyeball: pre-compute sun angle for sea level adjustment (with same noise perturbation)
    float effectiveSeaLevel = seaLevel;
    if (u_tidallyLocked > 0.5) {
      // Match the terrain-based perturbation from the biome section
      float eyeAnglePre = dot(baseDir, u_sunDirectionLocal)
                        + (continent - 0.5) * 0.25
                        + (pnoise3d(p * 2.0 + vec3(17.0)) - 0.5) * 0.08;
      float subStellarDry = smoothstep(u_eyeAridEdge - 0.15, u_eyeAridEdge + 0.2, eyeAnglePre);
      effectiveSeaLevel = mix(seaLevel, 0.0, subStellarDry);
    }
    float isLand = smoothstep(effectiveSeaLevel - 0.008, effectiveSeaLevel + 0.008, continent);

    // ── Normal mapping: texture or procedural ──
    vec3 bumpNormal = vNormal;
    if (u_lod > 0.5) {
      if (u_useTextureMaps > 0.5) {
        // Pre-baked normal map — scale XY by bumpStrength at runtime
        vec2 uv = dirToUV(baseDir);
        vec3 texN = texture2D(u_normalMap, uv).rgb * 2.0 - 1.0;
        float str = (u_displace > 0.0) ? u_bumpStrength * 0.5 : u_bumpStrength;
        texN.xy *= str;
        texN = normalize(texN);
        // Tangent frame from sphere direction
        vec3 up = abs(baseDir.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 T = normalize(cross(up, baseDir));
        vec3 B = cross(baseDir, T);
        bumpNormal = normalize(T * texN.x + B * texN.y + baseDir * texN.z);
        bumpNormal = mix(vNormal, bumpNormal, isLand * 0.95 + 0.05);
      } else {
        // Layer 1: terrain-scale bump from computeContinent
        float eps = 0.002;
        float hx = computeContinent(p + vec3(eps, 0.0, 0.0));
        float hy = computeContinent(p + vec3(0.0, eps, 0.0));
        float hz = computeContinent(p + vec3(0.0, 0.0, eps));
        vec3 grad = vec3(continent - hx, continent - hy, continent - hz) / eps;
        float strength = (u_displace > 0.0) ? u_bumpStrength * 0.5 : u_bumpStrength;
        bumpNormal = normalize(vNormal + grad * strength);

        // Layer 2: ridged mountain detail
        float re = 0.002;
        float rc = ridgedNoise(p, 2.5);
        float rx = ridgedNoise(p + vec3(re, 0.0, 0.0), 2.5);
        float ry = ridgedNoise(p + vec3(0.0, re, 0.0), 2.5);
        float rz = ridgedNoise(p + vec3(0.0, 0.0, re), 2.5);
        vec3 ridgeGrad = vec3(rc - rx, rc - ry, rc - rz) / re;
        bumpNormal = normalize(bumpNormal + ridgeGrad * 0.08 * isLand);

        // Layer 3: medium-frequency hills and plateaus
        float me2 = 0.003;
        float mc2 = cloudNoise(p, 3.0);
        float mx2 = cloudNoise(p + vec3(me2, 0.0, 0.0), 3.0);
        float my2 = cloudNoise(p + vec3(0.0, me2, 0.0), 3.0);
        float mz2 = cloudNoise(p + vec3(0.0, 0.0, me2), 3.0);
        vec3 hillGrad = vec3(mc2 - mx2, mc2 - my2, mc2 - mz2) / me2;
        bumpNormal = normalize(bumpNormal + hillGrad * 0.04 * isLand);

        // Layer 4: fine surface roughness
        float me = 0.005;
        float mc = pnoise3d(p * 8.0);
        float mx = pnoise3d((p + vec3(me, 0.0, 0.0)) * 8.0);
        float my = pnoise3d((p + vec3(0.0, me, 0.0)) * 8.0);
        float mz = pnoise3d((p + vec3(0.0, 0.0, me)) * 8.0);
        vec3 microGrad = vec3(mc - mx, mc - my, mc - mz) / me;
        bumpNormal = normalize(bumpNormal + microGrad * 0.03 * isLand);

        bumpNormal = mix(vNormal, bumpNormal, isLand * 0.95 + 0.05);
      }
    }

    // ── Biome coloring — aridity-aware + eyeball planet support ──
    float aridity = 1.0 - smoothstep(0.15, 0.55, seaLevel);

    // Eyeball planet: per-zone biome control
    float eyeballSunAngle = 0.0;
    float eyeSeaLevel = seaLevel;
    if (u_tidallyLocked > 0.5) {
      float rawSunAngle = dot(baseDir, u_sunDirectionLocal); // 1=sub-stellar, 0=terminator, -1=anti-stellar

      // Perturb band edges using the actual terrain height — bands follow landmasses
      // Higher terrain = slightly warmer (pushes toward arid), lower = cooler (toward ice)
      float terrainPerturb = (continent - 0.5) * 0.25;
      // Add small noise for extra raggedness at coastlines
      float edgeNoise = (pnoise3d(p * 2.0 + vec3(17.0)) - 0.5) * 0.08;
      eyeballSunAngle = rawSunAngle + terrainPerturb + edgeNoise;

      // Sub-stellar (hot): fully arid, no water
      float subStellar = smoothstep(u_eyeAridEdge - 0.15, u_eyeAridEdge + 0.2, eyeballSunAngle);
      aridity = mix(aridity, 1.0, subStellar);
      eyeSeaLevel = mix(seaLevel, 0.0, subStellar);

      // Terminator ring: force fully wet/green — habitable belt
      float terminator = (1.0 - smoothstep(u_eyeAridEdge - 0.15, u_eyeAridEdge + 0.2, eyeballSunAngle))
                       * (1.0 - smoothstep(u_eyeIceEdge + 0.1, u_eyeIceEdge - 0.2, eyeballSunAngle));
      aridity = mix(aridity, 0.0, terminator); // fully wet at terminator — green vegetation

      // Anti-stellar (cold): water with icebergs → solid ice
      float antiStellar = smoothstep(u_eyeIceEdge + 0.1, u_eyeIceEdge - 0.25, eyeballSunAngle);
      aridity = mix(aridity, 0.2, antiStellar);
    }

    float moisture = (u_lod > 0.5) ? cloudNoise(p * 0.5 + vec3(33.0), 1.0) : noise3d(p * 0.5 + vec3(33.0));
    // Eyeball: boost moisture at terminator to ensure green biome
    if (u_tidallyLocked > 0.5) {
      float termMoisture = (1.0 - smoothstep(u_eyeAridEdge - 0.15, u_eyeAridEdge + 0.2, eyeballSunAngle))
                         * (1.0 - smoothstep(u_eyeIceEdge + 0.1, u_eyeIceEdge - 0.2, eyeballSunAngle));
      moisture = mix(moisture, u_eyeMoisture + moisture * 0.3, termMoisture);
    }
    float mountainRidge = (u_lod > 0.5) ? ridgedNoise(p, 2.0) : 0.0;
    float microNoise = noise3d(p * 4.0);
    float warpNoise = noise3d(p * 3.0 + vec3(77.0));

    // Ocean / basins: on arid planets, "ocean" is dark dusty lowland, not water
    vec3 deepWater = color1 * 0.3;
    vec3 midWater = color1 * 0.6;
    vec3 shallowWater = color1 * 0.95 + vec3(0.01, 0.02, 0.015);
    // Arid basins: dark rusty lowlands instead of blue water
    vec3 deepBasin = color3 * 0.25 + vec3(0.01, 0.005, 0.0);
    vec3 midBasin = color3 * 0.45 + vec3(0.02, 0.01, 0.0);
    vec3 shallowBasin = color3 * 0.6;
    // Blend between water and arid basin based on aridity
    vec3 deepOcean = mix(deepWater, deepBasin, aridity);
    vec3 midOcean = mix(midWater, midBasin, aridity);
    vec3 shallowOcean = mix(shallowWater, shallowBasin, aridity);

    float oceanDepth = smoothstep(0.0, effectiveSeaLevel, continent);
    vec3 oceanColor = mix(deepOcean, midOcean, smoothstep(0.0, 0.5, oceanDepth));
    oceanColor = mix(oceanColor, shallowOcean, smoothstep(0.92, 0.99, oceanDepth));
    oceanColor += vec3(-0.006, 0.006, 0.01) * microNoise * (1.0 - aridity);

    // Coastal shelf
    float coastalBand = smoothstep(effectiveSeaLevel - 0.015, effectiveSeaLevel - 0.003, continent) * (1.0 - isLand);
    vec3 coastalColor = mix(color2, color3, 0.5) * 0.75 + vec3(0.04, 0.04, 0.01);
    oceanColor = mix(oceanColor, coastalColor, coastalBand * 0.4 * (1.0 - aridity * 0.7));

    // Land zones
    float landHeight = (continent - effectiveSeaLevel) / (1.0 - effectiveSeaLevel + 0.001);
    float latitude;
    if (u_tidallyLocked > 0.5) {
      // Eyeball: "latitude" = distance from sub-stellar point
      // 0 at sub-stellar (warm), 1 at anti-stellar (cold)
      latitude = 1.0 - (eyeballSunAngle * 0.5 + 0.5);
    } else {
      latitude = abs(baseDir.y);
    }

    // Shore — on arid planets, no beach, just terrain edge
    vec3 wetShore = mix(color2, color3, 0.3) + vec3(0.08, 0.06, 0.02);
    vec3 dryShore = color3 * 0.7 + vec3(0.03, 0.015, 0.0);
    vec3 shoreColor = mix(wetShore, dryShore, aridity);

    // Lowland — on arid planets, force toward arid tones
    // Eyeball: apply hue/saturation shift to vegetation color
    vec3 vegColor = color2;
    if (u_tidallyLocked > 0.5) {
      // Hue rotation via Rodrigues' formula around luminance axis
      vec3 k = vec3(0.57735); // normalize(1,1,1)
      float angle = u_eyeVegHue * 6.2832;
      float ca = cos(angle);
      float sa = sin(angle);
      vegColor = vegColor * ca + cross(k, vegColor) * sa + k * dot(k, vegColor) * (1.0 - ca);
      // Saturation: lerp toward grey
      float lum = dot(vegColor, vec3(0.299, 0.587, 0.114));
      vegColor = mix(vec3(lum), vegColor, u_eyeVegSat);
    }
    vec3 lowWet = vegColor * 1.1 + vec3(-0.005, 0.015, -0.005);
    if (u_tidallyLocked > 0.5) {
      float termZone = (1.0 - smoothstep(u_eyeAridEdge - 0.15, u_eyeAridEdge + 0.2, eyeballSunAngle))
                     * (1.0 - smoothstep(u_eyeIceEdge + 0.1, u_eyeIceEdge - 0.2, eyeballSunAngle));
      lowWet = mix(lowWet, vegColor * 1.8 + vec3(0.0, 0.02, 0.0), termZone * 0.6);
    }
    vec3 lowDry = mix(color2, color3, 0.4);
    vec3 lowArid = color3 * 0.9 + vec3(0.04, 0.02, -0.01);
    float latMoisture = moisture + smoothstep(0.0, 0.25, latitude) * 0.15 - smoothstep(0.5, 0.8, latitude) * 0.1;
    // Aridity pushes moisture down — arid planets have drier lowlands everywhere
    latMoisture = latMoisture * (1.0 - aridity * 0.6);
    vec3 lowland = mix(lowArid, lowDry, smoothstep(0.25, 0.4, latMoisture));
    lowland = mix(lowland, lowWet, smoothstep(0.4, 0.6, latMoisture));
    lowland += vec3(0.015, -0.008, -0.015) * warpNoise;

    // Highland — on arid planets, skip tundra, stay rocky
    vec3 highland = color3 * 0.9;
    highland += vec3(0.02, 0.008, -0.015) * mountainRidge;
    vec3 tundra = mix(color3 * 0.75, color4 * 0.6, 0.4) + vec3(-0.02, -0.01, 0.02);
    float tundraBlend = smoothstep(0.5, 0.8, latitude) * smoothstep(0.3, 0.6, landHeight) * (1.0 - aridity);
    highland = mix(highland, tundra, tundraBlend);

    // Exposed rock
    vec3 exposedRock = color3 * 0.65 + color4 * 0.35;
    // On arid planets, rock is more rusty
    exposedRock = mix(exposedRock, color3 * 0.55 + vec3(0.04, 0.02, 0.0), aridity);

    // Peaks — dusty rock on arid, snow on wet
    float baseSnowLine = mix(0.92, 0.7, smoothstep(0.4, 0.8, latitude));
    float snowLine = mix(baseSnowLine, 1.5, aridity); // far above max on Mars = no snow
    vec3 dustyPeak = color3 * 0.65 + vec3(0.05, 0.025, 0.005);
    vec3 peaks = mix(color4, dustyPeak, aridity);

    // Blend terrain zones
    vec3 landColor = mix(shoreColor, lowland, smoothstep(0.02, 0.12, landHeight));
    float brownBlend = smoothstep(0.1, 0.55, landHeight) * (0.6 + 0.4 * (1.0 - latMoisture));
    landColor = mix(landColor, highland, brownBlend);
    landColor = mix(landColor, exposedRock, mountainRidge * smoothstep(0.2, 0.5, landHeight) * 0.6);
    landColor = mix(landColor, peaks, smoothstep(snowLine, snowLine + 0.06, landHeight));

    // Surface texture variation
    landColor *= 0.96 + 0.06 * microNoise;

    vec3 surfaceColor = mix(oceanColor, landColor, isLand);

    // ── Ice system ──
    // Domain-warped noise for organic ice boundaries
    vec3 nWarp = vec3(
      noise3d(p * 2.0 + vec3(11.0, 0.0, 0.0)),
      noise3d(p * 2.0 + vec3(0.0, 23.0, 0.0)),
      noise3d(p * 2.0 + vec3(0.0, 0.0, 37.0))
    ) * u_iceWarp;
    vec3 nWarp2 = vec3(
      noise3d((p + nWarp) * 4.0 + vec3(41.0)),
      noise3d((p + nWarp) * 4.0 + vec3(59.0)),
      noise3d((p + nWarp) * 4.0 + vec3(71.0))
    ) * (u_iceWarp * 0.375);
    vec3 warpedIceP = p + nWarp + nWarp2;
    float iceNoise = noise3d(warpedIceP * u_iceDetail + vec3(11.0)) * 0.12
                   + noise3d(warpedIceP * (u_iceDetail * 2.8) + vec3(23.0)) * 0.04;
    vec3 iceColor = vec3(0.82, 0.85, 0.9) + vec3(0.04, 0.03, 0.02) * microNoise;

    float iceCap, iceFringe;

    if (u_tidallyLocked > 0.5) {
      // Eyeball: ice centered on anti-stellar point (night side)
      float antiStellar = -dot(baseDir, u_sunDirectionLocal); // 1=anti-stellar, -1=sub-stellar

      // Solid ice: deep into night side
      float solidIceStart = -u_eyeIceEdge + 0.15;
      iceCap = smoothstep(solidIceStart, solidIceStart + 0.15, antiStellar + iceNoise * 0.8);

      // Icebergs/sea ice: scattered ice fragments in water near terminator
      float icebergNoise = noise3d(warpedIceP * (3.0 + u_eyeIceBergDensity * 4.0) + vec3(37.0)) * 0.6
                         + noise3d(warpedIceP * (6.0 + u_eyeIceBergDensity * 6.0) + vec3(83.0)) * 0.3;
      float icebergZone = smoothstep(-0.05, solidIceStart * 0.7, antiStellar);
      float icebergThreshold = mix(0.75, 0.25, smoothstep(0.0, solidIceStart, antiStellar)) - u_eyeIceBergDensity * 0.15;
      float icebergs = smoothstep(icebergThreshold, icebergThreshold + 0.1, icebergNoise) * icebergZone;
      // Icebergs only in water, not on land
      icebergs *= (1.0 - isLand) * (1.0 - iceCap);

      iceFringe = max(
        smoothstep(solidIceStart - 0.1, solidIceStart, antiStellar + iceNoise) * (1.0 - iceCap) * 0.3,
        icebergs * 0.7
      );
    } else {
      // Normal: polar ice caps
      float northLat = baseDir.y;
      float southLat = -baseDir.y;
      float northNoise = iceNoise;
      float southNoise = noise3d(warpedIceP * u_iceDetail + vec3(53.0)) * 0.14
                       + noise3d(warpedIceP * (u_iceDetail * 2.8) + vec3(67.0)) * 0.04;
      float northStart = u_iceCapSize + u_seed.x * 0.06;
      float southStart = (u_iceCapSize - 0.02) + u_seed.y * 0.08;
      float northCap = smoothstep(northStart, northStart + u_iceEdge, northLat + northNoise);
      float southCap = smoothstep(southStart, southStart + u_iceEdge, southLat + southNoise);
      iceCap = max(northCap, southCap);
      float northFringe = smoothstep(northStart - 0.03, northStart, northLat + northNoise) * (1.0 - northCap);
      float southFringe = smoothstep(southStart - 0.03, southStart, southLat + southNoise) * (1.0 - southCap);
      iceFringe = max(northFringe, southFringe) * 0.25;
    }

    surfaceColor = mix(surfaceColor, mix(surfaceColor, iceColor, 0.4), iceFringe);
    surfaceColor = mix(surfaceColor, iceColor, iceCap);

    // Cloud shadows: handled by the cloud sphere layer rendering on top
    // with alpha blending — no separate shadow pass needed.

    // Lighting with bump normal (land only; ocean is smooth)
    vec3 effectiveNormal = mix(vNormal, bumpNormal, isLand);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    surfaceColor = planetLighting(surfaceColor, vWorldNormal, u_sunDirection, V, u_ambient);

    // Specular on ocean — only on lit side
    vec3 viewDir = normalize(-vPosition);
    vec3 reflectDir = reflect(-u_sunDirection, vWorldNormal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    float specShadow = wrapDiffuse(vWorldNormal, u_sunDirection);
    surfaceColor += vec3(0.3) * spec * specShadow * (1.0 - isLand);

    // Atmospheric rim (uses shared applyAtmosphere with shadow)
    surfaceColor = applyAtmosphere(surfaceColor, vWorldNormal, vWorldPosition);

    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`;

// Venus/hazy atmosphere shader — thick opaque clouds with domain-warped swirls
const hazyFragment = `
  uniform float u_time;
  uniform float scale;
  uniform float u_gasWarp;
  uniform float u_gasBands;
  uniform float u_gasTurb;
  uniform float u_gasEdgeNoise;
  uniform vec3 color1, color2, color3, color4;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${noiseLib}

  void main() {
    vec3 p = vPosition;

    // Slow global rotation
    float rotAngle = u_time * 0.005;
    float cr = cos(rotAngle);
    float sr = sin(rotAngle);
    p.xz = mat2(cr, -sr, sr, cr) * p.xz;

    // 3D domain warp for thick swirling cloud tops
    vec3 bp = p * scale * 0.3 + u_seed * 5.0;
    float n1 = fbm3d(bp);
    float n2 = fbm3d(bp + vec3(4.1, 2.7, 6.3));
    float r1 = fbm3d(bp + u_gasWarp * 0.6 * vec3(n1, n2, n1 * 0.3) + vec3(u_time * 0.003));
    float r2 = fbm3d(bp + u_gasWarp * 0.5 * vec3(n2, r1, n1 * 0.4) + vec3(7.3, 3.1, u_time * 0.002));
    float f = fbm3d(bp + u_gasWarp * 0.5 * vec3(r1, r2, r1 * 0.5));

    // Broad banding through the haze
    float bandY = p.y * scale * 0.2;
    float edgeN = noise3d(bp * 2.5) * u_gasEdgeNoise;
    float band = sin(bandY * u_gasBands * 0.5 + n1 * 1.5 + edgeN) * 0.5 + 0.5;

    // Colour with more variance: use all 4 colours
    vec3 color = mix(color1, color2, band * 0.5 + 0.25);
    color = mix(color, color3, clamp(f * 0.6 + 0.2, 0.0, 1.0) * 0.25);
    color = mix(color, color4, smoothstep(0.4, 0.7, r2) * 0.2);
    // Turbulent detail at cloud boundaries
    float turbDetail = abs(r1 - n2) * u_gasTurb;
    color = mix(color, color3 * 1.1, turbDetail * 0.3);
    color *= 0.85 + 0.3 * r1;

    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, vWorldNormal, u_sunDirection, V, u_ambient);
    color = applyAtmosphere(color, vWorldNormal, vWorldPosition);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Ice giant shader — Uranus/Neptune: methane blue, faint bands, dark spots, strong haze
const iceGiantFragment = `
  uniform float u_time;
  uniform float scale;
  uniform float swirl_strength;
  uniform float swirl_speed;
  uniform float u_gasWarp;
  uniform float u_gasStorm;
  uniform float u_gasTurb;
  uniform float u_gasBands;
  uniform float u_gasEdgeNoise;
  uniform vec3 color1, color2, color3, color4;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${noiseLib}

  void main() {
    vec3 p = vPosition;
    float latitude = abs(p.y);

    // Differential rotation
    float rotAngle = u_time * (1.0 - latitude * 0.3) * swirl_speed * 0.02;
    float cr = cos(rotAngle);
    float sr = sin(rotAngle);
    p.xz = mat2(cr, -sr, sr, cr) * p.xz;

    // 3D noise
    vec3 bp = vec3(p.x, p.y * scale * 0.3, p.z) + u_seed * 5.0;

    // Domain warp — controllable
    float n1 = fbm3d(bp);
    float n2 = fbm3d(bp + vec3(5.2, 1.3, 7.4));
    float r1 = fbm3d(bp + u_gasWarp * 0.5 * vec3(n1, n2, n1 * 0.3) + vec3(0.0, 0.0, u_time * 0.004));
    float r2 = fbm3d(bp + u_gasWarp * 0.4 * vec3(n2, r1, n1 * 0.5) + vec3(3.7, 8.1, u_time * 0.003));
    float f = fbm3d(bp + u_gasWarp * 0.4 * vec3(r1, r2, r1 * 0.5));

    // Faint banding with noise-disrupted edges
    float bandY = p.y * scale * 0.3;
    float edgeN = (noise3d(bp * 2.5) * 0.7 + noise3d(bp * 6.0) * 0.3) * u_gasEdgeNoise;
    float band = sin(bandY * u_gasBands * 0.7 + n1 * 1.0 + edgeN) * 0.5 + 0.5;
    float band2 = sin(bandY * u_gasBands * 1.8 + n2 * 2.0 + f * 1.5) * 0.5 + 0.5;

    // Colour with more variance across all 4 colours
    vec3 color = mix(color1, color2, band * 0.35 + 0.32);
    color = mix(color, color3, clamp(f * 0.5 + 0.2, 0.0, 1.0) * 0.2);
    color = mix(color, color4, smoothstep(0.4, 0.7, r2) * 0.15);
    color *= 0.9 + 0.2 * band2;

    // Turbulent wispy detail between bands
    float bandEdge = abs(cos(bandY * u_gasBands * 0.7 + n1));
    float turbDetail = bandEdge * abs(r1 - r2) * u_gasTurb;
    color = mix(color, color4 * 0.9, turbDetail * 0.3);

    // Polar brightening
    float polarBright = smoothstep(0.5, 0.9, latitude) * 0.15;
    color += color2 * polarBright;

    // Dark spot(s) with controllable prominence
    vec3 spot1Pos = normalize(vec3(
      cos(u_seed.x * 6.28),
      -0.2 + u_seed.y * 0.2,
      sin(u_seed.x * 6.28)
    ));
    float spot1 = smoothstep(0.2, 0.0, length(p - spot1Pos));
    color = mix(color, color3 * 0.4, spot1 * u_gasStorm * 0.025);

    // Bright companion cloud
    vec3 compPos = normalize(spot1Pos + vec3(0.15, 0.1, 0.0));
    float comp = smoothstep(0.08, 0.0, length(p - compPos));
    color = mix(color, color4 * 1.2, comp * u_gasStorm * 0.03);

    // Second dark spot
    vec3 spot2Pos = normalize(vec3(
      cos(u_seed.z * 6.28 + 3.0),
      0.4,
      sin(u_seed.z * 6.28 + 3.0)
    ));
    float spot2 = smoothstep(0.12, 0.0, length(p - spot2Pos));
    color = mix(color, color3 * 0.5, spot2 * u_gasStorm * 0.02);

    // Overall haze variation
    color *= 0.88 + 0.24 * r1;

    // Subtle limb darkening (no atmosphere shell for ice giants)
    float limb = max(dot(vNormal, normalize(vec3(0.0, 0.0, 1.0))), 0.0);
    color *= 0.85 + 0.15 * limb;

    // ── Subtle belt normal perturbation ──
    vec3 iceBeltBump = vec3(
      (r1 - r2) * 0.05,
      cos(bandY * u_gasBands * 0.7 + n1) * 0.015,
      (n1 - n2) * 0.04
    );
    vec3 iceNormal = normalize(vWorldNormal + iceBeltBump);

    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, iceNormal, u_sunDirection, V, u_ambient);
    color = applyAtmosphere(color, vWorldNormal, vWorldPosition);
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
      return terrestrialFragment;

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
      u_atmosColor: { value: params.atmosColor },
      u_atmosIntensity: { value: params.atmosIntensity },
      u_atmosFalloff: { value: 1.4 },
      u_cloudCoverage: { value: params.cloudCoverage ?? 0.35 },
      u_cloudOpacity: { value: params.cloudOpacity ?? 0.6 },
      u_cloudSwirl: { value: params.cloudSwirl ?? 0.8 },
      u_cloudBands: { value: params.cloudBands ?? 5.0 },
      u_cloudWarp: { value: params.cloudWarp ?? 0.35 },
      u_lod: { value: 0.0 },
      u_gasWarp: { value: 4.0 },
      u_gasStorm: { value: 18.0 },
      u_gasTurb: { value: 0.4 },
      u_gasBands: { value: 6.0 },
      u_gasEdgeNoise: { value: 0.4 },
      u_seaLevel: { value: params.seaLevel ?? 0.50 },
      u_continentFreq: { value: params.continentFreq ?? 0.15 },
      u_terrWarp: { value: 0.5 },
      u_iceCapSize: { value: params.iceCapSize ?? 0.85 },
      u_iceEdge: { value: params.iceEdge ?? 0.035 },
      u_iceWarp: { value: params.iceWarp ?? 0.4 },
      u_iceDetail: { value: params.iceDetail ?? 1.8 },
      u_coastDetail: { value: params.coastDetail ?? 0.35 },
      u_landContrast: { value: params.landContrast ?? 1.6 },
      u_craterScale: { value: 1.0 },
      u_ridgeStrength: { value: 0.35 },
      u_craterDepth: { value: 0.7 },
      u_lavaWarp: { value: 0.04 },
      u_lavaGlow: { value: 0.6 },
      u_lavaHeightOffset: { value: -0.3 },
      u_lavaFlowScale: { value: 1.5 },
      u_ambient: { value: 0.06 },
      u_lavaAmbient: { value: 0.08 },
      u_wrapRange: { value: 0.45 },
      u_wrapPower: { value: 3.9 },
      u_displace: { value: 0 },
      u_vertLOD: { value: 0 },
      u_bumpStrength: { value: params.bumpStrength ?? 0.8 },
      u_tidallyLocked: { value: params.tidallyLocked ? 1.0 : 0.0 },
      u_eyeAridEdge: { value: 0.3 },
      u_eyeIceEdge: { value: -0.15 },
      u_eyeIceBergDensity: { value: 0.5 },
      u_eyeVegHue: { value: 0.0 },
      u_eyeVegSat: { value: 1.0 },
      u_eyeMoisture: { value: 0.7 },
      u_useTextureMaps: { value: 0 },
      u_heightMap: { value: null },
      u_normalMap: { value: null },
      u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_sunDirectionLocal: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_atmosDayColor: { value: params.atmosDayColor || new THREE.Color(0x00aaff) },
      u_atmosTwilightColor: { value: params.atmosTwilightColor || new THREE.Color(0xff6600) },
    },
    vertexShader: (params.type === PlanetType.TEMPERATE || params.type === PlanetType.WATER_WORLD)
      ? terrestrialVertexShader : vertexShader,
    fragmentShader: selectFragmentShader(params.type),
  });
}

// Cloud layer material — separate sphere slightly above planet surface
const cloudFragmentShader = `
  uniform float u_time;
  uniform vec3 u_seed;
  uniform float u_cloudCoverage;
  uniform float u_cloudOpacity;
  uniform float u_cloudSwirl;
  uniform float u_cloudBands;
  uniform float u_cloudWarp;
  uniform float u_lod;
  uniform vec3 u_sunDirection;
  uniform vec3 u_sunDirectionLocal;
  uniform float u_tidallyLocked;
  uniform float u_spiralTightness;
  uniform float u_spiralArms;
  uniform float u_spiralStrength;
  uniform float u_eyeSize;
  uniform float u_wrapRange;
  uniform float u_wrapPower;
  varying vec3 vPosition;
  varying vec3 vSphereDir;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;

  // Perlin noise for smooth, detailed cloud patterns
  ${perlinNoise3D}

  // 5-octave Perlin FBM — smoother than hash noise, better cloud shapes
  float cloudFBM(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 5; i++) {
      v += pnoise3d(p) * a;
      p = p * 2.03 + vec3(float(i) * 13.7, float(i) * 7.3, float(i) * 19.1);
      a *= 0.5;
    }
    return v;
  }

  // Sin-modulated cloud noise — wispy organic shapes via Perlin
  float cloudNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 5; i++) {
      float n = pnoise3d(p);
      v += a * (sin(n * 5.0) * 0.5 + 0.5);
      p = p * 2.02 + vec3(31.7, 17.3, 53.1);
      a *= 0.5;
    }
    return v;
  }

  // Ridged cloud noise — creates sharp frontal boundaries
  float cloudRidged(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 4; i++) {
      float n = pnoise3d(p);
      n = 2.0 * (0.5 - abs(0.5 - n));
      v += a * n;
      p = p * 2.03 + vec3(13.7, 29.3, 41.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 p = vPosition + u_seed * 50.0;
    float t = u_time * 0.001;
    float signedLat = vPosition.y;
    float absLat = abs(signedLat);

    // Eyeball: redefine "latitude" as distance from terminator ring
    if (u_tidallyLocked > 0.5) {
      float sunAngle = dot(vPosition, u_sunDirectionLocal);
      signedLat = -sunAngle;  // terminator at 0, sub-stellar at -1, anti-stellar at +1
      absLat = abs(signedLat);
    }

    // ── Weather system: large-scale pressure cells (Perlin) ──
    vec3 weatherP = p * 2.0;
    float warpX = pnoise3d(weatherP * 0.3 + vec3(11.0));
    float warpZ = pnoise3d(weatherP * 0.3 + vec3(47.0));
    weatherP += vec3(warpX - 0.5, 0.0, warpZ - 0.5) * u_cloudWarp * 3.0;

    // ── Coriolis: cyclonic rotation per hemisphere ──
    float equatorNoise = pnoise3d(p * 3.0 + vec3(17.0)) * 0.12;
    float coriolisSign = mix(-1.0, 1.0, smoothstep(-0.1 + equatorNoise, 0.1 + equatorNoise, signedLat));
    float coriolisStrength = smoothstep(0.0, 0.4, absLat);
    float windSpeed = 1.0 - absLat * 0.5;

    // Weather cell density modulates cyclone strength
    float weatherCell = cloudNoise(weatherP, 0.4);
    float swirlAngle = coriolisSign * coriolisStrength * u_cloudSwirl * (0.5 + weatherCell)
                     + t * windSpeed * 0.3;
    float cs = cos(swirlAngle * 0.18);
    float sn = sin(swirlAngle * 0.18);
    vec3 cloudP = weatherP;
    if (u_tidallyLocked > 0.5) {
      // Eyeball: swirl around sub-stellar axis instead of Y axis
      vec3 sunDir = normalize(u_sunDirectionLocal);
      vec3 upRef = abs(sunDir.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 T = normalize(cross(upRef, sunDir));
      vec3 B = cross(sunDir, T);
      float ct = dot(cloudP, T);
      float cb = dot(cloudP, B);
      cloudP += T * (cs * ct + sn * cb - ct) + B * (-sn * ct + cs * cb - cb);
    } else {
      cloudP.xz = mat2(cs, -sn, sn, cs) * cloudP.xz;
    }

    // ── Layer 1: Cumulus masses — domain-warped Perlin FBM ──
    float w1 = cloudFBM(cloudP * 0.3, 0.8);
    float w2 = pnoise3d(cloudP * 0.5 + vec3(43.0));
    vec3 warpedP = cloudP + vec3((w1 - 0.5) * u_cloudWarp * 1.5, t * 0.2, (w2 - 0.5) * u_cloudWarp);
    float cumulus = cloudNoise(warpedP + vec3(t * 0.08), 1.2);

    // ── Layer 2: Cirrus wisps — stretched Perlin for streaky appearance ──
    vec3 cirrusP = p * 7.0 + vec3(t * 0.15, 0.0, t * 0.1);
    cirrusP.y *= 0.25; // heavy longitude stretch = thin streaks
    float cirrus = cloudFBM(cirrusP, 1.0);
    // Sharp threshold for thin wisps
    cirrus = smoothstep(0.55, 0.68, cirrus) * 0.5;

    // ── Layer 3: Frontal boundaries — ridged noise for sharp cloud fronts ──
    float fronts = cloudRidged(warpedP * 0.7 + vec3(t * 0.05, 31.0, 0.0), 1.5);

    // ── Layer 4: Fine convective texture ──
    float convective = cloudNoise(warpedP * 3.0 + vec3(t * 0.1, 71.0, 0.0), 2.5) * 0.15;

    // ── Combine ──
    float clouds = cumulus * 0.55 + fronts * 0.2 + convective;

    // ITCZ: tropical convergence band (narrow, scaled by bands control)
    float itczWidth = 0.08 / max(u_cloudBands * 0.5, 0.5);
    clouds += smoothstep(itczWidth, 0.0, absLat) * 0.06;

    // Hadley cell banding (strength scaled by bands control)
    float bandStr = 0.04 * min(u_cloudBands / 5.0, 1.0);
    clouds += sin(absLat * u_cloudBands * 6.0 + w1 * 2.5) * bandStr;

    // Eyeball: sub-stellar hurricane + terminator convergence
    if (u_tidallyLocked > 0.5) {
      float sunAngle = dot(vPosition, u_sunDirectionLocal);

      // ── Sub-stellar hurricane spiral ──
      vec3 sunDir = normalize(u_sunDirectionLocal);
      vec3 upRef = abs(sunDir.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 spiralT = normalize(cross(upRef, sunDir));
      vec3 spiralB = cross(sunDir, spiralT);
      float azimuth = atan(dot(vPosition, spiralB), dot(vPosition, spiralT));
      float distFromCenter = acos(clamp(sunAngle, -1.0, 1.0)); // angular distance from sub-stellar

      // Logarithmic spiral: tighter near eye, widening outward (like real hurricanes)
      float logDist = log(max(distFromCenter, 0.01) * 8.0 + 1.0);
      float spiralPhase = azimuth + logDist * u_spiralTightness;

      // Domain warp the spiral with noise — breaks up the geometric regularity
      float warpA = pnoise3d(p * 3.0 + vec3(53.0)) * 0.6;
      float warpB = pnoise3d(p * 5.0 + vec3(91.0)) * 0.3;
      spiralPhase += warpA + warpB;

      // Soft cloud bands, not hard arms — wider bands further out
      float bandWidth = mix(0.4, 0.7, smoothstep(0.0, 1.0, distFromCenter));
      float spiralArm = sin(spiralPhase * u_spiralArms) * 0.5 + 0.5;
      spiralArm = smoothstep(0.5 - bandWidth * 0.5, 0.5 + bandWidth * 0.5, spiralArm);

      // Feathered trailing edges: add fine detail noise that erodes the bands
      float feather = pnoise3d(p * 8.0 + vec3(37.0)) * 0.4
                    + pnoise3d(p * 14.0 + vec3(71.0)) * 0.2;
      spiralArm = clamp(spiralArm + feather - 0.2, 0.0, 1.0);

      // Spiral strength: strong near eye wall, fading toward terminator
      float eyeWall = smoothstep(u_eyeSize * 0.5, u_eyeSize * 1.7, distFromCenter);
      float outerFade = smoothstep(1.3, 0.2, distFromCenter);
      clouds += spiralArm * eyeWall * outerFade * u_spiralStrength;

      // Clear eye at dead center
      float eyeClearing = smoothstep(u_eyeSize, u_eyeSize * 0.4, distFromCenter);
      clouds *= 1.0 - eyeClearing * 0.8;

      // Mild terminator convergence band
      clouds += smoothstep(0.35, 0.0, abs(sunAngle)) * 0.04;
    }

    // Cirrus wisps on top
    clouds = max(clouds, cirrus);

    // Coverage threshold
    clouds = smoothstep(u_cloudCoverage, u_cloudCoverage + 0.15, clouds);

    // ── Edge erosion: ragged boundaries (Perlin for smooth erosion) ──
    float edgeNoise = pnoise3d(p * 16.0 + vec3(t * 0.03));
    float edgeMask = smoothstep(0.0, 0.2, clouds) * smoothstep(0.3, 0.05, clouds);
    clouds -= edgeMask * edgeNoise * 0.4;
    clouds = max(clouds, 0.0);

    // Polar / anti-stellar clearing
    if (u_tidallyLocked > 0.5) {
      // Eyeball: only clear on anti-stellar side (signedLat > 0), keep thick cap at sub-stellar
      float antiStellarFade = smoothstep(0.75, 0.95, max(signedLat, 0.0));
      clouds *= 1.0 - antiStellarFade;
    } else {
      clouds *= smoothstep(0.95, 0.75, absLat);
    }

    // ── Lighting ──
    float sunDot = dot(vWorldNormal, u_sunDirection);
    float diff = max(sunDot, 0.0) * 0.8 + 0.2;
    float selfShadow = 1.0 - clouds * 0.15;

    vec3 warmCloud = vec3(0.98, 0.97, 0.94);
    vec3 coolCloud = vec3(0.85, 0.88, 0.95);
    vec3 cloudColor = mix(coolCloud, warmCloud, diff) * diff * selfShadow;

    // Fade clouds into shadow on dark side
    float dayFade = smoothstep(-0.1, 0.15, sunDot);
    float alpha = clouds * u_cloudOpacity * dayFade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

export function createCloudMaterial(params: ShaderParams): THREE.ShaderMaterial | null {
  if (params.type !== PlanetType.TEMPERATE && params.type !== PlanetType.WATER_WORLD) return null;

  return new THREE.ShaderMaterial({
    vertexShader,  // standard flat vertex shader — no displacement
    fragmentShader: cloudFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      u_time: { value: 0 },
      u_seed: { value: params.seed },
      u_lod: { value: 1.0 },  // always full detail for cloud sphere
      u_cloudCoverage: { value: params.cloudCoverage ?? 0.35 },
      u_cloudOpacity: { value: params.cloudOpacity ?? 0.6 },
      u_cloudSwirl: { value: params.cloudSwirl ?? 0.8 },
      u_cloudBands: { value: params.cloudBands ?? 5.0 },
      u_cloudWarp: { value: params.cloudWarp ?? 0.35 },
      u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_sunDirectionLocal: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_tidallyLocked: { value: params.tidallyLocked ? 1.0 : 0.0 },
      u_spiralTightness: { value: 3.5 },
      u_spiralArms: { value: 2.0 },
      u_spiralStrength: { value: 0.14 },
      u_eyeSize: { value: 0.15 },
      u_wrapRange: { value: 0.45 },
      u_wrapPower: { value: 3.9 },
    },
  });
}
