import * as THREE from "three";

// ── JS Perlin noise (matches GLSL cnoise from perlinNoise3D) ──

function mod289(x: number): number {
  return x - Math.floor(x * (1.0 / 289.0)) * 289.0;
}

function permute(x: number): number {
  return mod289(((x * 34.0) + 10.0) * x);
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad3(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

// Classic 3D Perlin noise [-1,1] → pnoise3d returns [0,1]
function cnoise(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const p = (i: number) => permute(i % 289);
  const A = p(X) + Y, AA = p(A) + Z, AB = p(A + 1) + Z;
  const B = p(X + 1) + Y, BA = p(B) + Z, BB = p(B + 1) + Z;

  return lerp(
    lerp(
      lerp(grad3(p(AA) | 0, x, y, z), grad3(p(BA) | 0, x - 1, y, z), u),
      lerp(grad3(p(AB) | 0, x, y - 1, z), grad3(p(BB) | 0, x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad3(p(AA + 1) | 0, x, y, z - 1), grad3(p(BA + 1) | 0, x - 1, y, z - 1), u),
      lerp(grad3(p(AB + 1) | 0, x, y - 1, z - 1), grad3(p(BB + 1) | 0, x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  ) * 2.2; // match GLSL scale
}

function pnoise3d(x: number, y: number, z: number): number {
  return cnoise(x, y, z) * 0.5 + 0.5;
}

// ── Noise functions matching GLSL hi* exactly ──

function hiCloud(px: number, py: number, pz: number, frq: number, sd: number): number {
  let n = 0, amp = 0.5;
  let x = px * frq + sd, y = py * frq + sd, z = pz * frq + sd;
  for (let i = 0; i < 6; i++) {
    let s = pnoise3d(x, y, z);
    s = Math.sin(s * 5.0) * 0.5 + 0.5;
    n += s * amp;
    const ox = x, oy = y, oz = z;
    x = ox * 2.02 + i * 31.7;
    y = oy * 2.02 + i * 17.3;
    z = oz * 2.02 + i * 53.1;
    amp *= 0.5;
  }
  return Math.max(0, Math.min(1, n));
}

function hiRidged(px: number, py: number, pz: number, frq: number, sd: number): number {
  let n = 0, amp = 0.5;
  let x = px * frq + sd, y = py * frq + sd, z = pz * frq + sd;
  for (let i = 0; i < 6; i++) {
    let s = pnoise3d(x, y, z);
    s = 2.0 * (0.5 - Math.abs(0.5 - s));
    n += s * amp;
    const ox = x, oy = y, oz = z;
    x = ox * 2.03 + i * 13.7;
    y = oy * 2.03 + i * 7.3;
    z = oz * 2.03 + i * 19.1;
    amp *= 0.5;
  }
  return Math.pow(Math.max(0, Math.min(1, n)), 4.0);
}

// ── computeContinent: exact port of GLSL high-LOD path ──

interface TerrainParams {
  seedX: number;
  seedY: number;
  seedZ: number;
  noiseScale: number;
  continentFreq: number;
  coastDetail: number;
  landContrast: number;
  terrWarp: number;
  seaLevel: number;
}

function computeContinent(
  // Sphere direction (unit vector)
  dx: number, dy: number, dz: number,
  params: TerrainParams,
): number {
  // Match GLSL: p = seededPos(baseDir, 100.0) * scale
  const px = (dx + params.seedX * 100) * params.noiseScale;
  const py = (dy + params.seedY * 100) * params.noiseScale;
  const pz = (dz + params.seedZ * 100) * params.noiseScale;

  const sd = params.seedX * 100;
  const freq = params.continentFreq;
  const ridgeFreqMul = 1.0 + params.coastDetail * 3.0;

  // Sub-layers
  const sub1 = hiCloud(px, py, pz, freq * 1.0, sd + 11.4);
  const sub2 = hiRidged(px, py, pz, freq * ridgeFreqMul, sd + 29.4);
  const sub3 = hiCloud(px, py, pz, freq * 0.6, sd + 53.0);

  // Domain warp
  const warpScale = params.terrWarp * 0.4;
  const wx = px + (sub1 - 0.5) * warpScale;
  const wy = py + (sub2 - 0.5) * warpScale;
  const wz = pz + (sub3 - 0.5) * warpScale;

  let n = hiCloud(wx, wy, wz, freq * 0.8, sd + 78.2);

  // Ridged blend
  const mask = smoothstep(0.3, 0.7, sub3);
  const ridgeMix = params.landContrast * 0.3;
  n = n * (1.0 - mask * 0.7) + (n * (1.0 - ridgeMix) + sub2 * ridgeMix) * mask * 0.7;

  // Contrast push centered at sea level
  const c = n - params.seaLevel;
  n = params.seaLevel + c * (1.0 + Math.abs(c) * 2.0);
  n = Math.max(0, Math.min(1, n));

  return n;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Main: Bake equirectangular heightfield + normal map ──

export function bakeTerrainMaps(
  seed: THREE.Vector3,
  params: {
    noiseScale: number;
    continentFreq: number;
    coastDetail?: number;
    landContrast?: number;
    warpIntensity?: number;
    seaLevel?: number;
  },
  width: number = 2048,
): { heightMap: THREE.DataTexture; normalMap: THREE.DataTexture } {
  const height = width / 2;
  const heightData = new Float32Array(width * height);
  const normalData = new Uint8Array(width * height * 4);

  const tp: TerrainParams = {
    seedX: seed.x,
    seedY: seed.y,
    seedZ: seed.z,
    noiseScale: params.noiseScale,
    continentFreq: params.continentFreq ?? 0.11,
    coastDetail: params.coastDetail ?? 0.35,
    landContrast: params.landContrast ?? 1.6,
    terrWarp: params.warpIntensity ?? 0.5,
    seaLevel: params.seaLevel ?? 0.5,
  };

  // Pass 1: Compute heightfield
  for (let j = 0; j < height; j++) {
    const v = j / (height - 1); // [0, 1]
    const theta = v * Math.PI; // polar angle
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let i = 0; i < width; i++) {
      const u = i / (width - 1); // [0, 1]
      const phi = u * 2.0 * Math.PI; // azimuth

      // Equirectangular → sphere direction
      const dx = sinTheta * Math.cos(phi);
      const dy = cosTheta;
      const dz = sinTheta * Math.sin(phi);

      const h = computeContinent(dx, dy, dz, tp);
      heightData[j * width + i] = h;
    }
  }

  // Pass 2: Sobel filter → normal map
  const eps = 1.0 / width;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const idx = j * width + i;

      // Sample neighbors with wrapping
      const l = heightData[j * width + ((i - 1 + width) % width)];
      const r = heightData[j * width + ((i + 1) % width)];
      const t = heightData[Math.max(j - 1, 0) * width + i];
      const b = heightData[Math.min(j + 1, height - 1) * width + i];

      // Gradient
      const dX = (r - l) / (2.0 * eps);
      const dY = (b - t) / (2.0 * eps);

      // Normal from gradient (tangent-space)
      const strength = 0.6; // matches u_bumpStrength default
      const nx = -dX * strength;
      const ny = -dY * strength;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      // Pack to [0, 255]
      const pi = idx * 4;
      normalData[pi + 0] = Math.floor((nx / len * 0.5 + 0.5) * 255);
      normalData[pi + 1] = Math.floor((ny / len * 0.5 + 0.5) * 255);
      normalData[pi + 2] = Math.floor((nz / len * 0.5 + 0.5) * 255);
      normalData[pi + 3] = 255;
    }
  }

  // Create DataTextures
  const heightMap = new THREE.DataTexture(
    heightData, width, height,
    THREE.RedFormat, THREE.FloatType,
  );
  heightMap.minFilter = THREE.LinearFilter;
  heightMap.magFilter = THREE.LinearFilter;
  heightMap.wrapS = THREE.RepeatWrapping;
  heightMap.wrapT = THREE.ClampToEdgeWrapping;
  heightMap.needsUpdate = true;

  const normalMap = new THREE.DataTexture(
    normalData, width, height,
    THREE.RGBAFormat, THREE.UnsignedByteType,
  );
  normalMap.minFilter = THREE.LinearFilter;
  normalMap.magFilter = THREE.LinearFilter;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.ClampToEdgeWrapping;
  normalMap.needsUpdate = true;

  return { heightMap, normalMap };
}
