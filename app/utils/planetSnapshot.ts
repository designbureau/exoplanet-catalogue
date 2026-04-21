/**
 * Off-screen planet renderer for catalogue thumbnails.
 *
 * Creates a single temporary WebGLRenderer per call, renders one frame of the
 * real GLSL planet shader, captures a PNG data URL, then disposes everything.
 * Results are module-level cached so each (type, seed, size) triple is only
 * rendered once per page load.
 */

import * as THREE from "three";
import { createPlanetMaterial } from "~/shaders/planetShader";
import { PlanetType, type ShaderParams } from "~/utils/planetClassification";
import type { PlanetType as CatType } from "~/components/PlanetCanvas";

// ─── module-level cache ───────────────────────────────────────────────────────
const CACHE = new Map<string, string>(); // key → data URL
const PENDING = new Map<string, Promise<string>>();

// ─── shared offscreen renderer ───────────────────────────────────────────────
// We reuse a single WebGLRenderer for all thumbnail renders so we never hold
// more than one offscreen WebGL context at a time.  Creating a new renderer per
// render() call was consuming all 16 browser slots and killing the live Canvas.
let _sharedRenderer: THREE.WebGLRenderer | null = null;
let _sharedCanvas: HTMLCanvasElement | null = null;

function getSharedRenderer(size: number): THREE.WebGLRenderer {
  if (!_sharedRenderer) {
    _sharedCanvas = document.createElement("canvas");
    _sharedRenderer = new THREE.WebGLRenderer({
      canvas: _sharedCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    _sharedRenderer.setPixelRatio(1);
    _sharedRenderer.setClearColor(0x000000, 0);
  }
  if (_sharedCanvas!.width !== size || _sharedCanvas!.height !== size) {
    _sharedRenderer.setSize(size, size, false);
  }
  return _sharedRenderer;
}

// ─── seed conversion ──────────────────────────────────────────────────────────
export function numericSeedToVec3(n: number): THREE.Vector3 {
  // Scatter a single integer across three 0..1 components with low correlation
  const a = ((n * 0x9e3779b9) >>> 0) / 0xffffffff;
  const b = ((n * 0x6c62272e) >>> 0) / 0xffffffff;
  const c = ((n * 0x517cc1b7) >>> 0) / 0xffffffff;
  return new THREE.Vector3(a, b, c);
}

// ─── ShaderParams factory for each catalogue type ────────────────────────────
function baseParams(type: PlanetType, seed: THREE.Vector3): ShaderParams {
  return {
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
    equilibriumTemp: 300,
    stellarFlux: 1.0,
    seed,
    atmosColor: new THREE.Color(0, 0, 0),
    atmosIntensity: 0,
    atmosDayColor: new THREE.Color(0x00aaff),
    atmosTwilightColor: new THREE.Color(0xff6600),
    hasAtmosphere: false,
    showRim: false,
    showShell: false,
    showHalo: false,
    hasHzGradient: false,
    rimIntensity: 0,
    rimFalloff: 1.0,
    shellIntensity: 0,
    haloIntensity: 0,
    haloScale: 2.0,
    haloFalloff: 1.5,
    haloWhiten: 0.35,
    haloShadow: 0.7,
    tidallyLocked: false,
  };
}

export function buildShaderParams(catType: CatType, seed: THREE.Vector3): ShaderParams {
  switch (catType) {
    case "eyeball_ice": {
      const p = baseParams(PlanetType.ICE_OCEAN_EYEBALL, seed);
      p.color1 = new THREE.Color("#0e2a4a");
      p.color2 = new THREE.Color("#3a5a6a");
      p.color3 = new THREE.Color("#6a7a88");
      p.color4 = new THREE.Color("#d0d8e2");
      p.noiseScale = 10;
      p.seaLevel = 0.78;
      p.continentFreq = 0.18;
      p.iceCapSize = 0.15;
      p.iceEdge = 0.06;
      p.iceWarp = 1.4;
      p.iceDetail = 0.8;
      p.warpIntensity = 3.0;
      p.coastDetail = 0.35;
      p.landContrast = 1.4;
      p.bumpStrength = 0.5;
      p.tidallyLocked = true;
      (p as any).eyeAridEdge = 1.5;
      (p as any).eyeIceEdge = -0.1;
      (p as any).eyeIceBergDensity = 0.85;
      p.cloudCoverage = 0.65;
      p.cloudOpacity = 0.4;
      p.cloudSwirl = 0.6;
      p.cloudBands = 3.0;
      p.cloudWarp = 0.4;
      p.swirlStrength = 0.1;
      p.hasAtmosphere = true;
      p.showRim = true;
      p.showHalo = true;
      p.atmosDayColor = new THREE.Color("#3388cc");
      p.atmosTwilightColor = new THREE.Color("#445566");
      p.rimIntensity = 0.08;
      p.rimFalloff = 1.2;
      p.haloIntensity = 0.4;
      p.haloScale = 1.8;
      p.haloFalloff = 2.5;
      p.haloWhiten = 0.2;
      p.haloShadow = 0.7;
      p.hasHzGradient = true;
      return p;
    }

    case "lava": {
      const p = baseParams(PlanetType.LAVA_WORLD, seed);
      p.color1 = new THREE.Color(0.8, 0.25, 0.02);
      p.color2 = new THREE.Color(0.3, 0.08, 0.02);
      p.color3 = new THREE.Color(0.06, 0.04, 0.03);
      p.color4 = new THREE.Color(0.03, 0.02, 0.02);
      p.swirlStrength = 0.0;
      p.warpIntensity = 4.0;
      p.noiseScale = 15;
      p.emissive = new THREE.Color(1.0, 0.4, 0.05);
      p.emissiveIntensity = 0.6;
      p.hasAtmosphere = true;
      p.showRim = true;
      p.showHalo = true;
      p.atmosDayColor = new THREE.Color("#ff7300");
      p.atmosTwilightColor = new THREE.Color("#881100");
      p.rimIntensity = 0.0;
      p.rimFalloff = 0.8;
      p.haloIntensity = 0.0;
      p.haloScale = 1.5;
      p.haloFalloff = 2.0;
      p.haloWhiten = 0.1;
      p.haloShadow = 0.8;
      return p;
    }

    case "rocky_earthlike": {
      const p = baseParams(PlanetType.TEMPERATE, seed);
      // Earth-like: ocean + continent + ice cap
      p.color1 = new THREE.Color("#0a2050");   // deep ocean
      p.color2 = new THREE.Color("#2a5c28");   // vegetation
      p.color3 = new THREE.Color("#7a6a50");   // highland / desert
      p.color4 = new THREE.Color("#e8e8e0");   // peaks / ice
      p.noiseScale = 10;
      p.seaLevel = 0.38;
      p.continentFreq = 0.15;
      p.iceCapSize = 0.96;
      p.iceEdge = 0.035;
      p.iceWarp = 0.5;
      p.iceDetail = 1.5;
      p.warpIntensity = 3.5;
      p.coastDetail = 0.35;
      p.landContrast = 1.6;
      p.bumpStrength = 0.8;
      p.swirlStrength = 0.12;
      p.cloudCoverage = 0.45;
      p.cloudOpacity = 0.65;
      p.cloudSwirl = 0.8;
      p.cloudBands = 5.0;
      p.cloudWarp = 0.35;
      p.hasAtmosphere = true;
      p.showRim = true;
      p.showHalo = true;
      p.atmosIntensity = 0.35;
      p.atmosDayColor = new THREE.Color("#00aaff");
      p.atmosTwilightColor = new THREE.Color("#ff6600");
      p.rimIntensity = 0.12;
      p.rimFalloff = 1.0;
      p.haloIntensity = 0.3;
      p.haloScale = 2.0;
      p.haloFalloff = 1.5;
      p.haloWhiten = 0.35;
      p.haloShadow = 0.7;
      p.hasHzGradient = true;
      return p;
    }

    case "rocky": {
      const p = baseParams(PlanetType.HOT_ROCKY, seed);
      p.color1 = new THREE.Color(0.25, 0.22, 0.2);
      p.color2 = new THREE.Color(0.35, 0.32, 0.28);
      p.color3 = new THREE.Color(0.18, 0.16, 0.15);
      p.color4 = new THREE.Color(0.4, 0.38, 0.35);
      p.swirlStrength = 0.0;
      p.warpIntensity = 2.5;
      p.noiseScale = 12;
      return p;
    }

    case "gas_giant": {
      const p = baseParams(PlanetType.COLD_GIANT, seed);
      p.color1 = new THREE.Color(0.6, 0.35, 0.15);
      p.color2 = new THREE.Color(0.85, 0.75, 0.55);
      p.color3 = new THREE.Color(0.5, 0.3, 0.1);
      p.color4 = new THREE.Color(0.9, 0.85, 0.7);
      p.swirlStrength = 0.25;
      p.warpIntensity = 2.5;
      return p;
    }

    case "ice_giant": {
      const p = baseParams(PlanetType.ICE_GIANT, seed);
      p.color1 = new THREE.Color(0.15, 0.35, 0.6);
      p.color2 = new THREE.Color(0.2, 0.5, 0.7);
      p.color3 = new THREE.Color(0.1, 0.3, 0.55);
      p.color4 = new THREE.Color(0.25, 0.55, 0.75);
      p.swirlStrength = 0.08;
      p.warpIntensity = 1.5;
      p.noiseScale = 12;
      return p;
    }

    case "ocean": {
      const p = baseParams(PlanetType.WATER_WORLD, seed);
      p.color1 = new THREE.Color("#0a1a3d");
      p.color2 = new THREE.Color("#2a3025");
      p.color3 = new THREE.Color("#1a2a1a");
      p.color4 = new THREE.Color("#8a8a7a");
      p.noiseScale = 12;
      p.seaLevel = 0.88;
      p.continentFreq = 0.05;
      p.iceCapSize = 0.95;
      p.iceEdge = 0.03;
      p.iceWarp = 0.6;
      p.iceDetail = 0.8;
      p.warpIntensity = 2.4;
      p.coastDetail = 0.35;
      p.landContrast = 1.6;
      p.swirlStrength = 0.15;
      p.cloudCoverage = 0.55;
      p.cloudOpacity = 0.7;
      p.cloudSwirl = 0.8;
      p.cloudBands = 3.0;
      p.cloudWarp = 0.35;
      p.hasAtmosphere = true;
      p.showRim = true;
      p.showHalo = true;
      p.atmosIntensity = 0.0;
      p.atmosDayColor = new THREE.Color("#2266cc");
      p.atmosTwilightColor = new THREE.Color("#554422");
      p.rimIntensity = 0.0;
      p.haloIntensity = 0.0;
      p.hasHzGradient = true;
      return p;
    }

    case "hot_jupiter": {
      const p = baseParams(PlanetType.HOT_JUPITER_IV, seed);
      p.color1 = new THREE.Color(0.05, 0.04, 0.06);
      p.color2 = new THREE.Color(0.1, 0.07, 0.08);
      p.color3 = new THREE.Color(0.08, 0.05, 0.04);
      p.color4 = new THREE.Color(0.12, 0.08, 0.06);
      p.swirlStrength = 0.1;
      p.warpIntensity = 1.5;
      return p;
    }

    case "carbon": {
      // No direct 3D carbon type — use FROZEN with near-black graphite colours
      const p = baseParams(PlanetType.FROZEN, seed);
      p.color1 = new THREE.Color(0.05, 0.04, 0.06);
      p.color2 = new THREE.Color(0.12, 0.10, 0.13);
      p.color3 = new THREE.Color(0.22, 0.20, 0.25);
      p.color4 = new THREE.Color(0.38, 0.35, 0.42);
      p.swirlStrength = 0.0;
      p.warpIntensity = 2.0;
      p.noiseScale = 14;
      return p;
    }

    default:
      return baseParams(PlanetType.HOT_ROCKY, seed);
  }
}

// ─── renderer ────────────────────────────────────────────────────────────────
/** Exported for use by the bake route — renders arbitrary ShaderParams. */
export function renderOffscreenFromParams(params: ShaderParams, size: number): string {
  return renderOffscreen(params, size);
}

function renderOffscreen(params: ShaderParams, size: number): string {
  const renderer = getSharedRenderer(size);
  const canvas = _sharedCanvas!;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.15, 1.15, 1.15, -1.15, 0.1, 10);
  camera.position.set(0, 0, 3);

  // For TEMPERATE worlds the HZ gradient can push cloud opacity very high (>0.8),
  // completely obscuring the surface in a static thumbnail. Patch the params clone
  // before material creation so the uniforms are set correctly from the start.
  const snapParams: ShaderParams = { ...params };
  if (snapParams.type === PlanetType.TEMPERATE) {
    snapParams.cloudOpacity  = Math.min(snapParams.cloudOpacity  ?? 0.6,  0.42);
    snapParams.cloudCoverage = Math.min(snapParams.cloudCoverage ?? 0.45, 0.38);
  }

  // Sphere — 128 segs is enough for thumbnails; matches LOD "far" tier look
  const geo = new THREE.SphereGeometry(1, 128, 128);
  const mat = createPlanetMaterial(snapParams);

  // Tilt sun slightly so the terminator shows, but keep it fairly frontal for bright thumbnails
  const sunDir = new THREE.Vector3(0.45, 0.25, 0.85).normalize();
  mat.uniforms.u_sunDirection.value.copy(sunDir);
  mat.uniforms.u_sunDirectionLocal.value.copy(sunDir);
  mat.uniforms.u_time.value = 0;
  mat.uniforms.u_lod.value = 0;

  // Brighter ambient for thumbnail legibility (shader default is 0.06, viewer overrides live)
  if (mat.uniforms.u_ambient) mat.uniforms.u_ambient.value = 0.32;
  // Wider wrap range softens the terminator, spreading light further around the dark side
  if (mat.uniforms.u_wrapRange) mat.uniforms.u_wrapRange.value = 0.65;

  // Match EnvContext viewer defaults for gas band count (shader default 6.0 is too many)
  if (mat.uniforms.u_gasBands) {
    const isIceType = params.type === PlanetType.ICE_GIANT;
    mat.uniforms.u_gasBands.value = isIceType ? 4.0 : 2.5;
  }

  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  renderer.render(scene, camera);

  // ── Gamma lift for thumbnail legibility ─────────────────────────────────
  // The shader is tuned for a live star-lit scene; in a static thumbnail the
  // dark side of planets becomes illegibly black.  Apply a modest gamma curve
  // (γ ≈ 0.62) that lifts shadows without blowing out bright surfaces.
  const lift = document.createElement("canvas");
  lift.width = size;
  lift.height = size;
  const ctx2d = lift.getContext("2d")!;
  ctx2d.drawImage(canvas, 0, 0);
  const id = ctx2d.getImageData(0, 0, size, size);
  const px = id.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue; // skip transparent (background)
    px[i]     = Math.round(Math.pow(px[i]     / 255, 0.58) * 255);
    px[i + 1] = Math.round(Math.pow(px[i + 1] / 255, 0.58) * 255);
    px[i + 2] = Math.round(Math.pow(px[i + 2] / 255, 0.58) * 255);
  }
  ctx2d.putImageData(id, 0, 0);

  const dataURL = lift.toDataURL("image/png");

  // Dispose geometry and material — the shared renderer stays alive for reuse
  geo.dispose();
  mat.dispose();

  return dataURL;
}

// ─── public API ──────────────────────────────────────────────────────────────
export function renderPlanetSnapshot(
  catType: CatType,
  seed: number,
  size = 200,
): Promise<string> {
  const key = `${catType}|${seed}|${size}`;

  if (CACHE.has(key)) return Promise.resolve(CACHE.get(key)!);
  if (PENDING.has(key)) return PENDING.get(key)!;

  const p = new Promise<string>((resolve) => {
    // Defer to next tick so we don't block first paint
    setTimeout(() => {
      try {
        const vec3Seed = numericSeedToVec3(seed);
        const params = buildShaderParams(catType, vec3Seed);
        const url = renderOffscreen(params, size);
        CACHE.set(key, url);
        resolve(url);
      } catch (err) {
        console.warn("planetSnapshot render failed", catType, err);
        resolve(""); // graceful fallback
      }
      PENDING.delete(key);
    }, 0);
  });

  PENDING.set(key, p);
  return p;
}
