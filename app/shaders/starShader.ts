import * as THREE from "three";

// Ported from sun/js/shader/ — single-pass version combining the perlin cubemap
// bake + sun sphere sampling into one fragment shader for R3F compatibility.
// Uses the original Ashima Arts 4D simplex noise + FBM with three rotating
// noise layers and brightnessToColor stellar emission.

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormalView;
  varying vec3 vLayer0;
  varying vec3 vLayer1;
  varying vec3 vLayer2;

  uniform float u_time;

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vPosition = normalize(position);
    vNormalView = normalize(normalMatrix * normal);

    // Three rotating noise layers (from sunSphereVS.glsl)
    float t = u_time;
    vec3 p = normalize(position);

    vec3 p0 = p;
    p0.yz = rot(t) * p0.yz;
    vLayer0 = p0;

    vec3 p1 = p;
    p1.zx = rot(t + 2.094) * p1.zx;
    vLayer1 = p1;

    vec3 p2 = p;
    p2.xy = rot(t - 4.188) * p2.xy;
    vLayer2 = p2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Full 4D simplex noise from sun/js/shader/includes/simplex4d.glsl (Ashima Arts, MIT)
const simplex4dGLSL = `
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  float mod289(float x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
  float permute(float x){ return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float taylorInvSqrt(float r){ return 1.79284291400159 - 0.85373472095314 * r; }

  vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
  }

  #define F4 0.309016994374947451

  float snoise(vec4 v) {
    const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
    vec4 i = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0-1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0-2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    i = mod289(i);
    float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute(permute(permute(permute(
      i.w + vec4(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
      + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
      + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0);
    vec4 p0a = grad4(j0, ip);
    vec4 p1a = grad4(j1.x, ip);
    vec4 p2a = grad4(j1.y, ip);
    vec4 p3a = grad4(j1.z, ip);
    vec4 p4a = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(dot(p0a,p0a), dot(p1a,p1a), dot(p2a,p2a), dot(p3a,p3a)));
    p0a *= norm.x; p1a *= norm.y; p2a *= norm.z; p3a *= norm.w;
    p4a *= taylorInvSqrt(dot(p4a, p4a));
    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
    m0 = m0 * m0; m1 = m1 * m1;
    return 49.0 * (dot(m0*m0, vec3(dot(p0a,x0), dot(p1a,x1), dot(p2a,x2)))
                 + dot(m1*m1, vec2(dot(p3a,x3), dot(p4a,x4))));
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float u_time;
  uniform float u_tint;
  uniform float u_brightness;
  uniform float u_base;
  uniform float u_brightnessOffset;
  uniform float u_fresnelPower;
  uniform float u_fresnelInfluence;
  uniform float u_spatialFreq;
  uniform float u_temporalFreq;
  uniform float u_contrast;
  uniform float u_hParam;
  uniform float u_flatten;

  varying vec3 vPosition;
  varying vec3 vNormalView;
  varying vec3 vLayer0;
  varying vec3 vLayer1;
  varying vec3 vLayer2;

  ${simplex4dGLSL}

  // FBM using 4D simplex (from perlinFS.glsl)
  vec2 fbm4d(vec4 p) {
    float a = 1.0, f = 1.0;
    vec2 sum = vec2(0.0);
    for (int i = 0; i < 5; i++) {
      sum.x += snoise(p * f) * a;
      p.w += 100.0;
      sum.y += snoise(p * f) * a;
      a *= u_hParam;
      f *= 2.0;
    }
    return sum;
  }

  // Inline perlin layer (replaces cubemap lookup from perlinFS)
  float perlinLayer(vec3 layerPos) {
    vec3 world = layerPos + 12.45;
    vec4 p = vec4(world * u_spatialFreq, u_time * u_temporalFreq);
    vec2 f = fbm4d(p) * u_contrast + 0.5;

    // Low-frequency modulation (from perlinFS uFlatten)
    vec4 p2 = vec4(world * 2.0, u_time * u_temporalFreq);
    float modulate = max(snoise(p2), 0.0);
    return mix(f.x, f.x * modulate, u_flatten);
  }

  // brightnessToColor from sunSphereFS — produces blackbody-like emission
  // vec3(b, b², b⁴) naturally maps brightness to stellar colour
  vec3 brightnessToColor(float b) {
    b *= u_tint;
    return (vec3(b, b*b, b*b*b*b) / u_tint) * u_brightness;
  }

  void main() {
    // Sample noise across three rotating layers (from sunSphereFS ocean())
    float s = 0.0;
    s += perlinLayer(vLayer0);
    s += perlinLayer(vLayer1);
    s += perlinLayer(vLayer2);
    s *= 0.3333;

    // Fresnel (limb darkening at edges)
    vec3 Vview = vec3(0.0, 0.0, 1.0);
    float nDotV = dot(vNormalView, Vview);
    float fresnel = pow(1.0 - max(nDotV, 0.0), u_fresnelPower) * u_fresnelInfluence;

    float brightness = s * u_base + u_brightnessOffset + fresnel;
    vec3 col = clamp(brightnessToColor(brightness), 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Star temperature to tint parameter mapping
// Lower tint = redder (cool stars), higher = bluer/whiter (hot stars)
function tempToTint(temp: number): number {
  if (temp > 30000) return 1.8;   // O-type: blue-white
  if (temp > 10000) return 1.4;   // B-type: blue-white
  if (temp > 7500) return 1.15;   // A-type: white
  if (temp > 6000) return 0.85;   // F-type: yellow-white
  if (temp > 5200) return 0.55;   // G-type: yellow (Sun-like)
  if (temp > 3700) return 0.35;   // K-type: orange
  if (temp > 2400) return 0.22;   // M-type: red
  return 0.15;                     // L/T-type: deep red
}

// Star temperature to glow colour
function tempToGlowColor(temp: number): THREE.Color {
  if (temp > 30000) return new THREE.Color(0.6, 0.7, 1.0);
  if (temp > 10000) return new THREE.Color(0.7, 0.8, 1.0);
  if (temp > 7500) return new THREE.Color(0.9, 0.9, 1.0);
  if (temp > 6000) return new THREE.Color(1.0, 0.95, 0.85);
  if (temp > 5200) return new THREE.Color(1.0, 0.9, 0.6);
  if (temp > 3700) return new THREE.Color(1.0, 0.65, 0.3);
  if (temp > 2400) return new THREE.Color(1.0, 0.4, 0.15);
  return new THREE.Color(0.9, 0.25, 0.1);
}

export interface StarShaderParams {
  temperature: number;
  glowFalloff?: number;
}

export function createStarMaterial(params: StarShaderParams): THREE.ShaderMaterial {
  const tint = tempToTint(params.temperature);

  return new THREE.ShaderMaterial({
    uniforms: {
      // Original values from FWDDSImageManager.addSun() / addPerlinCube()
      u_time: { value: 0.0 },
      u_tint: { value: tint },
      u_brightness: { value: 0.6 },           // from sunMaterial
      u_base: { value: 4.0 },                  // from sunMaterial
      u_brightnessOffset: { value: 1.0 },       // from sunMaterial
      u_fresnelPower: { value: 1.0 },           // from sunMaterial
      u_fresnelInfluence: { value: 0.8 },        // from sunMaterial
      u_spatialFreq: { value: 6.0 },            // from perlinMat
      u_temporalFreq: { value: 0.1 },           // from perlinMat
      u_contrast: { value: 0.25 },              // from perlinMat
      u_hParam: { value: 1.0 },                 // from perlinMat (uH)
      u_flatten: { value: 0.72 },               // from perlinMat
    },
    vertexShader,
    fragmentShader,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

export function createStarGlowMaterial(params: StarShaderParams): THREE.SpriteMaterial {
  const color = tempToGlowColor(params.temperature);

  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const centre = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - centre) / centre;
      const dy = (y - centre) / centre;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = params.glowFalloff ?? 1.8;
      const alpha = dist < 1.0 ? Math.pow(1.0 - dist, falloff) * 255 : 0;
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.min(255, Math.max(0, alpha));
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;

  return new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.6,
  });
}
