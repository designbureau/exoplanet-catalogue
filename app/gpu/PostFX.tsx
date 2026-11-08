import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import {
  convertToTexture,
  dot,
  float,
  fract,
  mix,
  pass,
  select,
  sin,
  smoothstep,
  time,
  toneMapping,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  type N,
} from "~/shaders/tsl/nodes";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { smaa } from "three/addons/tsl/display/SMAANode.js";

// Post-processing pipeline on three's TSL RenderPipeline — replaces the old
// @react-three/postprocessing EffectComposer. Stage order and maths follow the
// original `postprocessing` effects: SMAA → DoF → tone map → colour grade →
// hue/sat → brightness/contrast → chromatic aberration → vignette → grain.

export interface FxConfig {
  smaa: { on: boolean };
  dof: { on: boolean; focusDistance: number; focalLength: number; bokehScale: number };
  toneMap: { on: boolean; mode: number };
  colorGrade: { on: boolean; temperature: number; tint: number; shadows: number; highlights: number };
  hueSat: { on: boolean; saturation: number };
  brightContrast: { on: boolean; brightness: number; contrast: number };
  chroma: { on: boolean; offset: number };
  vignette: { on: boolean; offset: number; darkness: number };
  noise: { on: boolean; opacity: number };
}

// Tone-mapping choices exposed in the GUI (three.js constants).
export const TONE_MAP_OPTIONS: { label: string; value: number }[] = [
  { label: "ACES Filmic", value: THREE.ACESFilmicToneMapping },
  { label: "AgX", value: THREE.AgXToneMapping },
  { label: "Reinhard", value: THREE.ReinhardToneMapping },
  { label: "Cineon", value: THREE.CineonToneMapping },
  { label: "Neutral", value: THREE.NeutralToneMapping },
  { label: "Linear", value: THREE.LinearToneMapping },
];

// World-unit scale for the DoF GUI sliders. The old effect took focus/length as
// fractions of the camera near–far range; three's DoF takes world units.
const DOF_WORLD_SCALE = 1000;

const luma = (c: N) => dot(c, vec3(0.2126, 0.7152, 0.0722));

function buildStages(scenePass: N, u: Record<string, N>, flags: Record<string, boolean>, toneMode: number) {
  let color: N = scenePass.getTextureNode();

  if (flags.smaa) color = smaa(color);

  if (flags.dof) {
    color = dof(
      color,
      scenePass.getViewZNode(),
      u.dofFocus.mul(DOF_WORLD_SCALE),
      u.dofLength.mul(DOF_WORLD_SCALE),
      u.dofBokeh,
    );
  }

  // Tone mapping is always applied (linear → display range); the toggle only picks ACES vs the chosen mode.
  color = toneMapping(toneMode, float(1), color);

  if (flags.grade) {
    // Temperature: + warm / − cool. Tint: + green / − magenta. Shadows lift, highlights compress.
    let c: N = color.rgb.toVar();
    c = vec3(c.x.add(u.gradeTemp.mul(0.1)), c.y, c.z.sub(u.gradeTemp.mul(0.1)));
    c = vec3(c.x, c.y.add(u.gradeTint.mul(0.1)), c.z);
    const lum = luma(c);
    const shadowMask = float(1).sub(smoothstep(0.0, 0.5, lum));
    c = c.add(u.gradeShadows.mul(shadowMask).mul(0.15));
    const highlightMask = smoothstep(0.5, 1.0, lum);
    c = mix(c, c.mul(float(1).sub(u.gradeHighlights.mul(0.3))), highlightMask);
    color = vec4(c.max(0), color.a);
  }

  if (flags.hueSat) {
    const c = color.rgb;
    const average = c.x.add(c.y).add(c.z).div(3);
    const diff = vec3(average).sub(c);
    const boosted = c.add(diff.mul(float(1).sub(float(1).div(float(1.001).sub(u.sat)))));
    const reduced = c.add(diff.mul(u.sat.negate()));
    color = vec4(select(u.sat.greaterThan(0), boosted, reduced), color.a);
  }

  if (flags.brightContrast) {
    const c = color.rgb.add(u.bcBrightness);
    const up = c.sub(0.5).div(float(1).sub(u.bcContrast)).add(0.5);
    const down = c.sub(0.5).mul(float(1).add(u.bcContrast)).add(0.5);
    color = vec4(select(u.bcContrast.greaterThan(0), up, down), color.a);
  }

  if (flags.chroma) {
    const tex = convertToTexture(color);
    const o = vec2(u.chromaOffset, u.chromaOffset);
    const r = tex.sample(uv().add(o)).r;
    const g = tex.sample(uv()).g;
    const b = tex.sample(uv().sub(o)).b;
    color = vec4(r, g, b, tex.sample(uv()).a);
  }

  if (flags.vignette) {
    // smoothstep(0.8, offset * 0.799, d * (darkness + offset)) with its edges reversed
    const d = uv().sub(0.5).length();
    const v = float(1).sub(smoothstep(u.vigOffset.mul(0.799), 0.8, d.mul(u.vigDarkness.add(u.vigOffset))));
    color = vec4(color.rgb.mul(v), color.a);
  }

  if (flags.noise) {
    // SOFT_LIGHT blend of per-pixel grain at `noiseOpacity`
    const n = fract(sin(dot(uv().add(fract(time)), vec2(12.9898, 78.233))).mul(43758.5453));
    const x = color.rgb;
    const soft = float(1).sub(n.mul(2)).mul(x).mul(x).add(n.mul(2).mul(x));
    color = vec4(mix(x, soft, u.noiseOpacity), color.a);
  }

  return color;
}

/**
 * Render the scene through the post stack. Mount inside a GPUCanvas (use `flat`
 * so the renderer's own tone mapping is off — the stack tone-maps explicitly,
 * then the pipeline's output transform converts to sRGB).
 */
export function PostFX({ fx }: { fx: FxConfig }) {
  const { gl, scene, camera } = useThree();

  const u = useMemo(
    () => ({
      dofFocus: uniform(0.01),
      dofLength: uniform(0.05),
      dofBokeh: uniform(3),
      gradeTemp: uniform(0),
      gradeTint: uniform(0),
      gradeShadows: uniform(0),
      gradeHighlights: uniform(0),
      sat: uniform(0),
      bcBrightness: uniform(0),
      bcContrast: uniform(0),
      chromaOffset: uniform(0.0005),
      vigOffset: uniform(0.3),
      vigDarkness: uniform(0.6),
      noiseOpacity: uniform(0.1),
    }),
    [],
  );

  // Slider values only touch uniforms — no pipeline rebuild
  useEffect(() => {
    u.dofFocus.value = fx.dof.focusDistance;
    u.dofLength.value = fx.dof.focalLength;
    u.dofBokeh.value = fx.dof.bokehScale;
    u.gradeTemp.value = fx.colorGrade.temperature;
    u.gradeTint.value = fx.colorGrade.tint;
    u.gradeShadows.value = fx.colorGrade.shadows;
    u.gradeHighlights.value = fx.colorGrade.highlights;
    u.sat.value = fx.hueSat.saturation;
    u.bcBrightness.value = fx.brightContrast.brightness;
    u.bcContrast.value = fx.brightContrast.contrast;
    u.chromaOffset.value = fx.chroma.offset;
    u.vigOffset.value = fx.vignette.offset;
    u.vigDarkness.value = fx.vignette.darkness;
    u.noiseOpacity.value = fx.noise.opacity;
  }, [fx, u]);

  const toneMode = fx.toneMap.on ? fx.toneMap.mode : THREE.ACESFilmicToneMapping;
  const structure = [
    fx.smaa.on,
    fx.dof.on,
    fx.colorGrade.on,
    fx.hueSat.on,
    fx.brightContrast.on,
    fx.chroma.on,
    fx.vignette.on,
    fx.noise.on,
    toneMode,
  ].join(",");

  const pipeline = useMemo(() => {
    const renderer = gl as unknown as THREE.WebGPURenderer;
    const scenePass = pass(scene, camera);
    const flags = {
      smaa: fx.smaa.on,
      dof: fx.dof.on,
      grade: fx.colorGrade.on,
      hueSat: fx.hueSat.on,
      brightContrast: fx.brightContrast.on,
      chroma: fx.chroma.on,
      vignette: fx.vignette.on,
      noise: fx.noise.on,
    };
    const p = new THREE.RenderPipeline(renderer, buildStages(scenePass, u, flags, toneMode));
    // outputColorTransform (default true) applies the sRGB conversion at the end; the
    // renderer's own tone mapping is NoToneMapping (Canvas `flat`), so nothing is mapped twice.
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, structure, u]);

  useEffect(() => () => pipeline.dispose?.(), [pipeline]);

  // priority > 0 takes over R3F's default render
  useFrame(() => {
    pipeline.render();
  }, 1);

  return null;
}
