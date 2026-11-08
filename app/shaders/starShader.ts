import * as THREE from "three/webgpu";
import {
  Fn,
  float,
  normalView,
  positionLocal,
  pow,
  max,
  mix,
  clamp,
  uniform,
  varying,
  vec3,
  vec4,
  vec2,
  dot,
  sin,
  cos,
} from "~/shaders/tsl/nodes";
import chroma from "chroma-js";
import type { N } from "~/shaders/tsl/nodes";
import { snoise4 } from "~/shaders/tsl/simplex4d";

// Ported from sun/js/shader/ — single-pass version combining the perlin cubemap
// bake + sun sphere sampling into one fragment shader for R3F compatibility.
// Uses the original Ashima Arts 4D simplex noise + FBM with three rotating
// noise layers and brightnessToColor stellar emission. (TSL / WebGPU port.)

type Num = N;

// GLSL mat2(c, -s, s, c) * v  (column-major)  →  (c·x + s·y, −s·x + c·y)
function rot2(a: Num, x: Num, y: Num) {
  const s = sin(a);
  const c = cos(a);
  return vec2(c.mul(x).add(s.mul(y)), s.negate().mul(x).add(c.mul(y)));
}

// Star temperature → tint parameter for the `brightnessToColor` curve in
// the fragment shader. Lower = redder, higher = whiter/bluer.
//
// Derived from the blue/red ratio of `chroma.temperature(temp)` (a continuous
// Planck-blackbody curve in chroma-js) so the value is smooth across the full
// 1500–40000K range — no spectral-class steps. Scaling/offset matches the
// previous discrete table at the anchor temperatures (Sun ≈ 5778K → ~0.55,
// hot O-type → ~1.8, deep red L/T → ~0.15).
function tempToTint(temp: number): number {
  const [r, , b] = chroma.temperature(temp).rgb();
  const ratio = b / Math.max(1, r); // 0 at cool red end, ~1.8 at O-type
  return Math.max(0.15, Math.min(1.8, 0.15 + ratio));
}

// Star temperature → glow sprite tint. Continuous blackbody curve from
// chroma-js — matches the colour basis used by StarEffects.tsx for the
// surrounding glow / rays / flares, so the body and its halo stay consistent.
function tempToGlowColor(temp: number): THREE.Color {
  const [r, g, b] = chroma.temperature(temp).gl();
  return new THREE.Color(r, g, b);
}

export interface StarShaderParams {
  temperature: number;
  glowFalloff?: number;
}

export type StarUniforms = Record<
  | "u_time"
  | "u_tint"
  | "u_brightness"
  | "u_base"
  | "u_brightnessOffset"
  | "u_fresnelPower"
  | "u_fresnelInfluence"
  | "u_spatialFreq"
  | "u_temporalFreq"
  | "u_contrast"
  | "u_hParam"
  | "u_flatten",
  { value: number }
>;

export type StarMaterial = THREE.NodeMaterial & { uniforms: StarUniforms };

export function createStarMaterial(params: StarShaderParams): StarMaterial {
  const tint = tempToTint(params.temperature);

  // Original values from FWDDSImageManager.addSun() / addPerlinCube()
  const u = {
    u_time: uniform(0.0),
    u_tint: uniform(tint),
    u_brightness: uniform(0.6), // from sunMaterial
    u_base: uniform(4.0), // from sunMaterial
    u_brightnessOffset: uniform(1.0), // from sunMaterial
    u_fresnelPower: uniform(1.0), // from sunMaterial
    u_fresnelInfluence: uniform(0.8), // from sunMaterial
    u_spatialFreq: uniform(6.0), // from perlinMat
    u_temporalFreq: uniform(0.1), // from perlinMat
    u_contrast: uniform(0.25), // from perlinMat
    u_hParam: uniform(1.0), // from perlinMat (uH)
    u_flatten: uniform(0.72), // from perlinMat
  };

  const mat = new THREE.NodeMaterial() as StarMaterial;

  // ── vertex: three rotating noise layers (from sunSphereVS.glsl) ──────────
  const p = positionLocal.normalize().toVar();
  const t = u.u_time;
  const l0yz = rot2(t, p.y, p.z);
  const l1zx = rot2(t.add(2.094), p.z, p.x);
  const l2xy = rot2(t.sub(4.188), p.x, p.y);
  const vLayer0 = varying(vec3(p.x, l0yz.x, l0yz.y));
  const vLayer1 = varying(vec3(l1zx.y, p.y, l1zx.x));
  const vLayer2 = varying(vec3(l2xy.x, l2xy.y, p.z));

  // ── fragment ─────────────────────────────────────────────────────────────
  // FBM using 4D simplex (from perlinFS.glsl)
  const fbm4d = (p0: N) => {
    let pp = p0;
    let a: Num = float(1);
    let f: Num = float(1);
    let sx: Num = float(0);
    let sy: Num = float(0);
    for (let i = 0; i < 5; i++) {
      sx = sx.add(snoise4(pp.mul(f)).mul(a));
      pp = vec4(pp.xyz, pp.w.add(100));
      sy = sy.add(snoise4(pp.mul(f)).mul(a));
      a = a.mul(u.u_hParam);
      f = f.mul(2);
    }
    return vec2(sx, sy);
  };

  // Inline perlin layer (replaces cubemap lookup from perlinFS)
  const perlinLayer = (layerPos: N) => {
    const world = layerPos.add(12.45);
    const pp = vec4(world.mul(u.u_spatialFreq), u.u_time.mul(u.u_temporalFreq));
    const f = fbm4d(pp).mul(u.u_contrast).add(0.5);

    // Low-frequency modulation (from perlinFS uFlatten)
    const p2 = vec4(world.mul(2), u.u_time.mul(u.u_temporalFreq));
    const modulate = max(snoise4(p2), 0);
    return mix(f.x, f.x.mul(modulate), u.u_flatten);
  };

  // brightnessToColor from sunSphereFS — produces blackbody-like emission
  // vec3(b, b², b⁴) naturally maps brightness to stellar colour
  const brightnessToColor = (b0: Num) => {
    const b = b0.mul(u.u_tint);
    return vec3(b, b.mul(b), b.mul(b).mul(b).mul(b)).div(u.u_tint).mul(u.u_brightness);
  };

  mat.fragmentNode = Fn(() => {
    // Sample noise across three rotating layers (from sunSphereFS ocean())
    const s = perlinLayer(vLayer0).add(perlinLayer(vLayer1)).add(perlinLayer(vLayer2)).mul(0.3333);

    // Fresnel (limb darkening at edges)
    const nDotV = normalView.normalize().z;
    const fresnel = pow(float(1).sub(max(nDotV, 0)), u.u_fresnelPower).mul(u.u_fresnelInfluence);

    const brightness = s.mul(u.u_base).add(u.u_brightnessOffset).add(fresnel);
    const col = clamp(brightnessToColor(brightness), 0, 1);
    return vec4(col, 1);
  })();

  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 1;

  mat.uniforms = u as unknown as StarUniforms;
  return mat;
}

export function createStarGlowMaterial(params: StarShaderParams): THREE.SpriteNodeMaterial {
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

  return new THREE.SpriteNodeMaterial({
    map: texture,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.6,
  });
}
