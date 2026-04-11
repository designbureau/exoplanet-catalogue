import * as THREE from "three";
import { PlanetType, type ShaderParams } from "~/utils/planetClassification";

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
  varying vec3 vSphereDir; // undisplaced sphere direction (for clouds)
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  uniform vec3 u_seed;
  uniform float u_displace;      // 0 = no displacement, >0 = displacement scale
  uniform float u_continentFreq;
  uniform float u_terrWarp;
  uniform float u_seaLevel;

  // Inline noise for vertex shader (must be self-contained)
  float hash3v(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3v(i), hash3v(i + vec3(1,0,0)), u.x),
          mix(hash3v(i + vec3(0,1,0)), hash3v(i + vec3(1,1,0)), u.x), u.y),
      mix(mix(hash3v(i + vec3(0,0,1)), hash3v(i + vec3(1,0,1)), u.x),
          mix(hash3v(i + vec3(0,1,1)), hash3v(i + vec3(1,1,1)), u.x), u.y), u.z);
  }
  // Simplified FBM for vertex displacement (3 octaves — cheaper than fragment)
  float vfbm(vec3 p) {
    float v = 0.0, a = 0.5, f = 1.0;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p * f);
      f *= 2.0; a *= 0.5;
    }
    return v;
  }

  uniform float scale; // noiseScale from fragment shader

  float computeHeight(vec3 p) {
    // Match fragment shader coordinate space: seededPos(normalize(position), 100.0) * scale
    vec3 sp = (p + u_seed * 100.0) * scale;
    // Domain warp
    vec3 wp = sp + u_terrWarp * 0.3 * vec3(
      vnoise(sp * 0.2),
      vnoise(sp * 0.2 + vec3(5.2)),
      vnoise(sp * 0.2 + vec3(9.7))
    );
    // Continental base
    float h = vnoise(wp * u_continentFreq);
    h += vnoise(wp * u_continentFreq * 0.67 + vec3(42.0)) * 0.3;
    h *= 0.55;
    // FBM detail
    h += vfbm(wp * 0.8) * 0.15;
    // Contrast enhancement to match fragment
    h = clamp((h - 0.48) * 1.6 + 0.48, 0.0, 1.0);
    // Clamp to land only (above sea level)
    float land = max(h - u_seaLevel, 0.0) / (1.0 - u_seaLevel);
    return land;
  }

  void main() {
    vec3 dir = normalize(position);
    vSphereDir = dir; // undisplaced direction for clouds
    vPosition = dir;

    // Displacement: push land vertices outward, ocean stays flat
    vec3 displacedPos = position;
    if (u_displace > 0.0) {
      float height = computeHeight(dir);
      displacedPos = position + normal * height * u_displace;
      // Update vPosition to displaced direction for terrain shading
      vPosition = normalize(displacedPos);
    }

    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vWorldPosition = (modelMatrix * vec4(displacedPos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
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

  // Ridged noise: sharp mountain ridges and valleys (from ProceduralPlanet)
  float ridgedNoise(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    for (int i = 0; i < 4; i++) {
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
  uniform float u_lod;

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

    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, vWorldNormal, u_sunDirection, V, u_ambient);
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

    // Lighting — lava worlds have higher ambient (self-radiant heat)
    float ambient = emissiveIntensity > 0.01 ? u_lavaAmbient : u_ambient;
    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, vWorldNormal, u_sunDirection, V, ambient);

    // Emissive (for lava worlds) — added after lighting so it glows in shadow
    // Lava emissive — glow in low areas + voronoi cracks
    float lavaEmit = smoothstep(0.35, 0.0, h) * u_lavaGlow;
    color += emissiveColor * lavaEmit;
    vec2 v1 = voronoi(p * 0.3);
    float cracks = 1.0 - smoothstep(0.0, 0.1, v1.y - v1.x);
    cracks *= cracks;
    cracks *= smoothstep(0.5, 0.15, h) * u_lavaGlow;
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
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${noiseLib}

  // Compute continental height using cloud noise + ridged terrain (LOD-aware)
  float computeContinent(vec3 p) {
    // Domain warp at very low frequency for continent-scale distortion
    vec3 wp;
    if (u_lod > 0.5) {
      wp = p + u_terrWarp * vec3(
        fbm3d(p * 0.2),
        fbm3d(p * 0.2 + vec3(5.2)),
        fbm3d(p * 0.2 + vec3(9.7))
      );
    } else {
      wp = p + 0.3 * vec3(
        noise3d(p * 0.2),
        noise3d(p * 0.2 + vec3(5.2)),
        noise3d(p * 0.2 + vec3(9.7))
      );
    }

    // Very low frequency base: big clumped continents and wide ocean basins
    float h1 = noise3d(wp * u_continentFreq);
    // Secondary low-freq layer for continent grouping
    float h1b = noise3d(wp * u_continentFreq * 0.67 + vec3(42.0)) * 0.3;

    // Cloud noise for organic coastline detail (LOD-aware, lower freq)
    float h2 = cloudNoise_lod(wp, u_coastDetail) * 0.2;

    // Ridged noise + detail layers at high LOD
    float h3 = 0.0;
    float h4 = 0.0;
    float h5 = 0.0; // mountain ridges
    float h6 = 0.0; // micro-terrain
    if (u_lod > 0.5) {
      // Mountain ridges — sharp peaks from ridged noise
      h3 = ridgedNoise(wp + vec3(h1 * 0.5), 0.8) * 0.1;

      // Secondary domain warp for mid-frequency detail
      vec3 wp2 = wp + 0.08 * vec3(
        noise3d(wp * 1.5 + vec3(17.0)),
        noise3d(wp * 1.5 + vec3(31.0)),
        noise3d(wp * 1.5 + vec3(47.0))
      );
      h4 = noise3d(wp2 * 1.2) * 0.06;

      // Mountain range chains — elongated ridged noise at medium frequency
      float ridgeWarp = noise3d(wp * 0.6 + vec3(83.0)) * 0.3;
      h5 = ridgedNoise(wp + vec3(ridgeWarp, 0.0, ridgeWarp * 0.7), 1.5) * 0.06;

      // Micro-terrain: fine surface detail (valleys, hills, erosion patterns)
      float erosion = noise3d(wp * 4.0 + vec3(h3 * 2.0)) * 0.02;
      float valleys = (1.0 - ridgedNoise(wp, 3.0)) * 0.015; // inverted ridges = valleys
      h6 = erosion - valleys;
    }

    // Base dominates, detail layers add complexity
    float raw = (h1 + h1b) * 0.5 + h2 + h3 + h4 + h5 + h6;
    return enhanceContrast(raw, 0.48, u_landContrast);
  }

  void main() {
    vec3 p = seededPos(vPosition, 100.0) * scale;

    float continent = computeContinent(p);

    // Bump normal: only compute at high LOD
    vec3 bumpNormal = vNormal;
    if (u_lod > 0.5) {
      // Fine bump from continent height
      float eps = 0.001;
      float cx = computeContinent(p + vec3(eps, 0.0, 0.0));
      float cy = computeContinent(p + vec3(0.0, eps, 0.0));
      float cz = computeContinent(p + vec3(0.0, 0.0, eps));
      vec3 bumpGrad = vec3(continent - cx, continent - cy, continent - cz) / eps;
      bumpNormal = normalize(vNormal + bumpGrad * 0.15);

      // Secondary micro-bump for surface roughness (higher frequency)
      float me = 0.003;
      float mx = noise3d((p + vec3(me, 0.0, 0.0)) * 6.0);
      float my = noise3d((p + vec3(0.0, me, 0.0)) * 6.0);
      float mz = noise3d((p + vec3(0.0, 0.0, me)) * 6.0);
      float mc = noise3d(p * 6.0);
      vec3 microGrad = vec3(mc - mx, mc - my, mc - mz) / me;
      bumpNormal = normalize(bumpNormal + microGrad * 0.03);
    }

    // Sea level threshold (higher = more ocean, fewer but bigger continents)
    float seaLevel = u_seaLevel;
    float isLand = smoothstep(seaLevel - 0.02, seaLevel + 0.02, continent);

    // Noise layers for colour variation
    float moisture = (u_lod > 0.5) ? cloudNoise(p * 0.5 + vec3(33.0), 1.0) : noise3d(p * 0.5 + vec3(33.0));
    float mountainRidge = (u_lod > 0.5) ? ridgedNoise(p, 2.0) : 0.0;
    float microNoise = noise3d(p * 4.0);
    float warpNoise = noise3d(p * 3.0 + vec3(77.0));

    // Ocean: 3-zone depth with colour variation
    vec3 deepOcean = color1 * 0.5;
    vec3 midOcean = color1 * 0.85;
    vec3 shallowOcean = color1 * 1.1 + vec3(0.02, 0.04, 0.03);
    float oceanDepth = smoothstep(0.15, seaLevel, continent);
    vec3 oceanColor = mix(deepOcean, midOcean, smoothstep(0.0, 0.5, oceanDepth));
    oceanColor = mix(oceanColor, shallowOcean, smoothstep(0.6, 1.0, oceanDepth));
    // Subtle colour shift from depth noise
    oceanColor += vec3(-0.01, 0.01, 0.015) * microNoise;

    // Coastal zone: sand/reef tint where land meets water
    float coastalBand = smoothstep(seaLevel - 0.04, seaLevel - 0.01, continent) * (1.0 - isLand);
    vec3 coastalColor = mix(color2, color3, 0.5) * 0.8 + vec3(0.06, 0.05, 0.02);
    oceanColor = mix(oceanColor, coastalColor, coastalBand * 0.6);

    // Land: multi-zone biome system with height + moisture + latitude
    float landHeight = (continent - seaLevel) / (1.0 - seaLevel);
    float latitude = abs(vPosition.y); // 0 at equator, 1 at poles

    // Beach/shore zone
    vec3 shoreColor = mix(color2, color3, 0.3) + vec3(0.08, 0.06, 0.02);

    // Lowland biomes driven by moisture AND latitude
    vec3 lowWet = color2 * 1.1 + vec3(-0.005, 0.015, -0.005);  // tropical/temperate forest
    vec3 lowDry = mix(color2, color3, 0.4);  // savanna/grassland
    vec3 lowArid = color3 * 0.9 + vec3(0.04, 0.02, -0.01);  // desert/scrubland
    // Latitude shifts toward drier at equator (deserts), wetter at mid-latitudes
    float latMoisture = moisture + smoothstep(0.0, 0.25, latitude) * 0.15 - smoothstep(0.5, 0.8, latitude) * 0.1;
    vec3 lowland = mix(lowArid, lowDry, smoothstep(0.25, 0.4, latMoisture));
    lowland = mix(lowland, lowWet, smoothstep(0.4, 0.6, latMoisture));
    // Micro-variation
    lowland += vec3(0.015, -0.008, -0.015) * warpNoise;

    // Highland with ridge influence — darker, rockier
    vec3 highland = color3 * 0.9;
    highland += vec3(0.02, 0.008, -0.015) * mountainRidge;
    // Tundra at high latitude + high elevation
    vec3 tundra = mix(color3 * 0.75, color4 * 0.6, 0.4) + vec3(-0.02, -0.01, 0.02);
    highland = mix(highland, tundra, smoothstep(0.5, 0.8, latitude) * smoothstep(0.3, 0.6, landHeight));

    // Exposed rock on steep slopes
    vec3 exposedRock = color3 * 0.65 + color4 * 0.35;

    // Peak/snow zone — latitude-dependent (snow starts lower near poles)
    float snowLine = mix(0.92, 0.7, smoothstep(0.4, 0.8, latitude));
    vec3 peaks = color4;

    // Blend terrain zones with overlapping transitions
    vec3 landColor = mix(shoreColor, lowland, smoothstep(0.02, 0.12, landHeight));
    // Height + moisture → highland transition
    float brownBlend = smoothstep(0.1, 0.55, landHeight) * (0.6 + 0.4 * (1.0 - latMoisture));
    landColor = mix(landColor, highland, brownBlend);
    // Rocky outcrops where ridges are strong
    landColor = mix(landColor, exposedRock, mountainRidge * smoothstep(0.2, 0.5, landHeight) * 0.6);
    // Snow/peak — latitude-dependent snowline
    landColor = mix(landColor, peaks, smoothstep(snowLine, snowLine + 0.06, landHeight));

    // Surface texture variation (subtle)
    landColor *= 0.96 + 0.06 * microNoise;

    vec3 surfaceColor = mix(oceanColor, landColor, isLand);

    // Ice caps at poles: organic continent-like shapes with swirly sharp edges
    float northLat = vPosition.y;
    float southLat = -vPosition.y;

    // Domain-warped noise for organic, fractal ice boundaries
    // First warp pass: large-scale continental lobes
    vec3 nWarp = vec3(
      noise3d(p * 2.0 + vec3(11.0, 0.0, 0.0)),
      noise3d(p * 2.0 + vec3(0.0, 23.0, 0.0)),
      noise3d(p * 2.0 + vec3(0.0, 0.0, 37.0))
    ) * u_iceWarp;
    // Second warp pass: finer swirling detail
    vec3 nWarp2 = vec3(
      noise3d((p + nWarp) * 4.0 + vec3(41.0)),
      noise3d((p + nWarp) * 4.0 + vec3(59.0)),
      noise3d((p + nWarp) * 4.0 + vec3(71.0))
    ) * (u_iceWarp * 0.375);
    vec3 warpedIceP = p + nWarp + nWarp2;

    float northNoise = noise3d(warpedIceP * u_iceDetail + vec3(11.0)) * 0.12
                     + noise3d(warpedIceP * (u_iceDetail * 2.8) + vec3(23.0)) * 0.04;
    float southNoise = noise3d(warpedIceP * u_iceDetail + vec3(53.0)) * 0.14
                     + noise3d(warpedIceP * (u_iceDetail * 2.8) + vec3(67.0)) * 0.04;

    // Asymmetric cap sizes via seed
    float northStart = u_iceCapSize + u_seed.x * 0.06;
    float southStart = (u_iceCapSize - 0.02) + u_seed.y * 0.08;
    float northCap = smoothstep(northStart, northStart + u_iceEdge, northLat + northNoise);
    float southCap = smoothstep(southStart, southStart + u_iceEdge, southLat + southNoise);
    float iceCap = max(northCap, southCap);
    // Frost fringe — thin icy border
    float northFringe = smoothstep(northStart - 0.03, northStart, northLat + northNoise) * (1.0 - northCap);
    float southFringe = smoothstep(southStart - 0.03, southStart, southLat + southNoise) * (1.0 - southCap);
    float iceFringe = max(northFringe, southFringe) * 0.25;
    vec3 iceColor = vec3(0.82, 0.85, 0.9) + vec3(0.04, 0.03, 0.02) * microNoise;
    surfaceColor = mix(surfaceColor, mix(surfaceColor, iceColor, 0.4), iceFringe);
    surfaceColor = mix(surfaceColor, iceColor, iceCap);

    // Clouds removed — rendered on separate sphere to avoid displacement artefacts

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

    vec3 V = normalize(cameraPosition - vWorldPosition);
    color = planetLighting(color, vWorldNormal, u_sunDirection, V, u_ambient);
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
      u_displace: { value: 0 }, // vertex displacement scale (0 = off, set by LOD)
      u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
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
  uniform float u_cloudCoverage;
  uniform float u_cloudOpacity;
  uniform float u_cloudSwirl;
  uniform float u_cloudBands;
  uniform float u_cloudWarp;
  uniform float u_lod;
  uniform vec3 u_sunDirection;
  uniform float u_wrapRange;
  uniform float u_wrapPower;
  varying vec3 vPosition;
  varying vec3 vSphereDir;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;

  // Inline noise functions for cloud shader
  float hash3c(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3c(i), hash3c(i + vec3(1,0,0)), u.x),
          mix(hash3c(i + vec3(0,1,0)), hash3c(i + vec3(1,1,0)), u.x), u.y),
      mix(mix(hash3c(i + vec3(0,0,1)), hash3c(i + vec3(1,0,1)), u.x),
          mix(hash3c(i + vec3(0,1,1)), hash3c(i + vec3(1,1,1)), u.x), u.y), u.z);
  }
  float cloudNoise(vec3 p, float freq, float seed) {
    float v = 0.0, a = 0.5;
    p = p * freq + vec3(seed);
    for (int i = 0; i < 5; i++) {
      float n = noise3d(p);
      v += a * (sin(n * 6.2831) * 0.5 + 0.5);
      p = p * 2.02 + vec3(31.7, 17.3, 53.1);
      a *= 0.5;
    }
    return v;
  }
  float cloudNoise_lod(vec3 p, float freq) {
    float v = 0.0, a = 0.5;
    p = p * freq;
    int oct = (u_lod > 0.5) ? 5 : 3;
    for (int i = 0; i < 5; i++) {
      if (i >= oct) break;
      float n = noise3d(p);
      v += a * (sin(n * 6.2831) * 0.5 + 0.5);
      p = p * 2.02 + vec3(31.7, 17.3, 53.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 p = vPosition + u_seed * 50.0;
    vec3 cloudBase = p * 4.0;
    float t = u_time * 0.002;

    float signedLat = vPosition.y;
    float absLat = abs(signedLat);
    float windSpeed = (1.0 - absLat * 0.6);

    float equatorNoise = noise3d(cloudBase * 0.8 + vec3(17.0)) * 0.15;
    float hemisphereBlend = smoothstep(-0.12 + equatorNoise, 0.12 + equatorNoise, signedLat);
    float coriolisSign = mix(-1.0, 1.0, hemisphereBlend);
    float coriolisStrength = smoothstep(0.0, 0.5, absLat + equatorNoise * 0.5);
    float swirlAngle = coriolisSign * coriolisStrength * u_cloudSwirl + t * windSpeed * 0.15;
    float cs = cos(swirlAngle * 0.08);
    float sn = sin(swirlAngle * 0.08);
    cloudBase.xz = mat2(cs, -sn, sn, cs) * cloudBase.xz;

    float warp1 = cloudNoise(cloudBase * 0.4, 1.2);
    float warp2 = noise3d(cloudBase * 0.6 + vec3(43.0));
    vec3 warpedP = cloudBase + vec3(warp1 * u_cloudWarp + warp2 * (u_cloudWarp * 0.4), t * 0.4, warp1 * (u_cloudWarp * 0.7));

    float c1 = cloudNoise_lod(warpedP + vec3(t * 0.15), 1.2);
    float c2 = cloudNoise_lod(warpedP * 0.6 + vec3(t * 0.08, 20.0, 0.0), 0.8);
    float clouds = c1 * 0.6 + c2 * 0.4;

    float bands = sin(vPosition.y * u_cloudBands + warp1 * 1.5) * 0.06 + 0.5;
    clouds *= bands;
    clouds = smoothstep(u_cloudCoverage, u_cloudCoverage + 0.3, clouds);

    // Lighting
    float diff = dot(vWorldNormal, u_sunDirection) * u_wrapRange + u_wrapRange;
    diff = clamp(pow(diff, u_wrapPower), 0.0, 1.0);

    vec3 cloudColor = mix(vec3(0.88, 0.9, 0.94), vec3(0.96, 0.97, 0.98), clouds);
    float alpha = clouds * u_cloudOpacity * diff;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(cloudColor * diff, alpha);
  }
`;

export function createCloudMaterial(params: ShaderParams): THREE.ShaderMaterial | null {
  if (params.type !== PlanetType.TEMPERATE && params.type !== PlanetType.WATER_WORLD) return null;
  if (!params.cloudCoverage && !params.cloudOpacity) return null;

  return new THREE.ShaderMaterial({
    vertexShader,  // standard flat vertex shader — no displacement
    fragmentShader: cloudFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      u_time: { value: 0 },
      u_seed: { value: params.seed },
      u_lod: { value: 0 },
      u_cloudCoverage: { value: params.cloudCoverage ?? 0.35 },
      u_cloudOpacity: { value: params.cloudOpacity ?? 0.6 },
      u_cloudSwirl: { value: params.cloudSwirl ?? 0.8 },
      u_cloudBands: { value: params.cloudBands ?? 5.0 },
      u_cloudWarp: { value: params.cloudWarp ?? 0.35 },
      u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_wrapRange: { value: 0.45 },
      u_wrapPower: { value: 3.9 },
    },
  });
}
