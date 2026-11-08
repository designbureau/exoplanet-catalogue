import { useRef, useMemo } from "react";
import * as THREE from "three/webgpu";
import {
  Fn,
  abs,
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  cross,
  distance,
  float,
  fract,
  length,
  max,
  mix,
  modelScale,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  select,
  sin,
  smoothstep,
  uniform,
  varying,
  vec3,
  vec4,
  type N,
} from "~/shaders/tsl/nodes";
import { useFrame, useThree } from "@react-three/fiber";
import chroma from "chroma-js";

// ---- TSL shader building blocks (ported from sun/js/shader/*.glsl) ----

type V3 = N;
type V4 = N;

// GLSL mat4(...) is column-major: these are the four columns of m4.
const M4_COLS = [
  vec4(0.0, 0.8, 0.6, -0.4),
  vec4(-0.8, 0.36, -0.48, -0.5),
  vec4(-0.6, -0.48, 0.64, 0.2),
  vec4(0.4, 0.3, 0.2, 0.4),
];
const m4mul = (q: V4) =>
  M4_COLS[0].mul(q.x).add(M4_COLS[1].mul(q.y)).add(M4_COLS[2].mul(q.z)).add(M4_COLS[3].mul(q.w));

function twistedSineNoise(q0: V4, falloff: number): V4 {
  let q = q0;
  let a = 1.0;
  let f = 1.0;
  let sum: V4 = vec4(0, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    q = m4mul(q).toVar();
    const s = sin(q.ywxz.mul(f)).mul(a).toVar();
    q = q.add(s);
    sum = sum.add(s);
    a *= falloff;
    f /= falloff;
  }
  return sum;
}

// Camera-facing ribbon side vector, with a stable fallback when the ribbon
// points straight at the camera.
function ribbonSide(pW: V3, p1W: V3, camPos: V3): V3 {
  const dirW = normalize(p1W.sub(pW));
  const vW = normalize(pW.sub(camPos));
  const c = cross(vW, dirW).toVar();
  const len = length(c);
  const up = select(abs(dirW.y).lessThan(0.99), vec3(0, 1, 0), vec3(1, 0, 0));
  return select(len.lessThan(1e-6), normalize(cross(up, dirW)), c.div(max(len, 1e-12)));
}

const aWireRandom = () => attribute("aWireRandom", "vec4");

// Full visibility — no directional culling in our system view (getAlpha == 1).

// ---- Sun Rays: noise-displaced ribbons emanating from surface ----
function createRaysMaterial(init: {
  width: number;
  length: number;
  opacity: number;
  hue: number;
  baseColor: THREE.Color;
}) {
  const u = {
    uTime: uniform(0),
    uCamPos: uniform(new THREE.Vector3()),
    uWidth: uniform(init.width),
    uLength: uniform(init.length),
    uOpacity: uniform(init.opacity),
    uNoiseFrequency: uniform(8.0),
    uNoiseAmplitude: uniform(0.4),
    uHueSpread: uniform(0.15),
    uHue: uniform(init.hue),
    uBaseColor: uniform(init.baseColor),
  };
  const aPos = attribute("aPos", "vec3");
  const aPos0 = attribute("aPos0", "vec3");
  const rnd = aWireRandom();

  const getPos = (phase: N) => {
    const size = rnd.z.add(0.2);
    const d = phase.mul(u.uLength).mul(size).toVar();
    const p = aPos0.add(aPos0.mul(d)).toVar();
    return p.add(twistedSineNoise(vec4(p.mul(u.uNoiseFrequency), u.uTime), 0.707).xyz.mul(d.mul(u.uNoiseAmplitude)));
  };

  const p = getPos(aPos.x).toVar();
  const p1 = getPos(aPos.x.add(0.01)).toVar();
  const pW = modelWorldMatrix.mul(vec4(p, 1)).xyz.toVar();
  const p1W = modelWorldMatrix.mul(vec4(p1, 1)).xyz;
  const sideW = ribbonSide(pW, p1W, u.uCamPos);
  const width = u.uWidth.mul(aPos.z).mul(float(1).sub(aPos.x));
  const pFinal = pW.add(sideW.mul(width));

  const vOpacity = varying(u.uOpacity.mul(rnd.w.add(0.5)));
  // Temperature-matched colour with per-ray brightness variation
  const variation = rnd.w.mul(u.uHueSpread);
  const vColor = varying(u.uBaseColor.mul(variation.mul(0.6).add(0.7)));

  const mat = new THREE.NodeMaterial();
  mat.transparent = true;
  mat.depthWrite = false;
  mat.depthTest = true;
  mat.blending = THREE.AdditiveBlending;
  mat.side = THREE.DoubleSide;
  mat.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(pFinal, 1));
  mat.fragmentNode = Fn(() => {
    const a0 = float(1).sub(smoothstep(0, 1, abs(aPos.z)));
    const alpha = a0.mul(a0).mul(vOpacity);
    return vec4(vColor.mul(alpha), alpha);
  })();
  return Object.assign(mat, { uniforms: u });
}

// ---- Sun Flares: arcing ribbons between two surface points ----
function createFlaresMaterial(init: {
  width: number;
  amp: number;
  opacity: number;
  flareColor: THREE.Color;
}) {
  const u = {
    uTime: uniform(0),
    uCamPos: uniform(new THREE.Vector3()),
    uWidth: uniform(init.width),
    uAmp: uniform(init.amp),
    uOpacity: uniform(init.opacity),
    uAlphaBlended: uniform(0.65),
    uHueSpread: uniform(0.16),
    uFlareColor: uniform(init.flareColor),
    uNoiseFrequency: uniform(4.0),
    uNoiseAmplitude: uniform(0.2),
  };
  const aPos = attribute("aPos", "vec3");
  const aPos0 = attribute("aPos0", "vec3");
  const aPos1 = attribute("aPos1", "vec3");
  const rnd = aWireRandom();

  const animPhase = fract(u.uTime.mul(0.3).mul(rnd.y.mul(0.5)).add(rnd.x)).toVar();

  const getPosOBJ = (phase: N) => {
    const size = distance(aPos0, aPos1);
    const n = normalize(aPos0.add(aPos1).mul(0.5));
    const p = mix(aPos0, aPos1, phase).toVar();
    const amp = sin(phase.mul(3.14159265)).mul(size).mul(u.uAmp).mul(animPhase).toVar();
    const p2 = p.add(n.mul(amp)).toVar();
    return p2.add(twistedSineNoise(vec4(p2.mul(u.uNoiseFrequency), u.uTime), 0.707).xyz.mul(amp.mul(u.uNoiseAmplitude)));
  };

  const pOBJ = getPosOBJ(aPos.x).toVar();
  const p1OBJ = getPosOBJ(aPos.x.add(0.01)).toVar();
  const pW = modelWorldMatrix.mul(vec4(pOBJ, 1)).xyz.toVar();
  const p1W = modelWorldMatrix.mul(vec4(p1OBJ, 1)).xyz;
  const sideW = normalize(cross(normalize(pW.sub(u.uCamPos)), normalize(p1W.sub(pW))));

  const R = length(aPos0);
  const width = u.uWidth.mul(aPos.z).mul(animPhase.add(1)).mul(R);
  const pFinal = pW.add(sideW.mul(width)).toVar();

  const lenW = length(pFinal);
  const vOpacity = varying(smoothstep(R, R.mul(1.03), lenW).mul(float(1).sub(animPhase)).mul(u.uOpacity));
  // Temperature-matched colour with subtle per-wire variation
  const variation = rnd.w.mul(u.uHueSpread);
  const vColor = varying(u.uFlareColor.mul(variation.mul(0.3).add(0.85)));

  const mat = new THREE.NodeMaterial();
  mat.transparent = true;
  mat.depthWrite = false;
  mat.depthTest = true;
  mat.side = THREE.DoubleSide;
  // Premultiplied "over": the shader already multiplies colour by alpha, so use
  // an explicit (ONE, ONE_MINUS_SRC_ALPHA) blend rather than NodeMaterial's
  // premultipliedAlpha flag (which would premultiply a second time).
  mat.blending = THREE.CustomBlending;
  mat.blendEquation = THREE.AddEquation;
  mat.blendSrc = THREE.OneFactor;
  mat.blendDst = THREE.OneMinusSrcAlphaFactor;
  mat.blendSrcAlpha = THREE.OneFactor;
  mat.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  mat.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(pFinal, 1));
  mat.fragmentNode = Fn(() => {
    const a0 = float(1).sub(smoothstep(0, 1, abs(aPos.z)));
    const alpha = a0.mul(a0).mul(vOpacity);
    return vec4(vColor.mul(alpha), alpha.mul(u.uAlphaBlended));
  })();
  return Object.assign(mat, { uniforms: u });
}

// ---- Glow ring (annular billboard from glowVS/glowFS) ----
function createGlowMaterial(init: { radius: number; color: THREE.Color; brightness: number; falloff: number }) {
  const u = {
    uRadius: uniform(init.radius),
    uColor: uniform(init.color),
    uBrightness: uniform(init.brightness),
    uFalloff: uniform(init.falloff),
    uFalloffColor: uniform(0.7),
  };
  const aPos = attribute("aPos", "vec3");
  const vRadial = aPos.z;

  // Billboard via modelViewMatrix — always aligned, no lag
  const mvCenter = modelViewMatrix.mul(vec4(0, 0, 0, 1));
  const r = float(1).add(aPos.z.mul(u.uRadius)).mul(modelScale.x);
  const viewPos = mvCenter.xyz.add(vec3(aPos.x.mul(r), aPos.y.mul(r), 0));

  const mat = new THREE.NodeMaterial();
  mat.transparent = true;
  mat.depthWrite = false;
  mat.depthTest = true;
  mat.blending = THREE.AdditiveBlending;
  mat.side = THREE.DoubleSide;
  mat.vertexNode = cameraProjectionMatrix.mul(vec4(viewPos, 1));
  mat.fragmentNode = Fn(() => {
    const a0 = float(1).sub(vRadial);
    const alpha = a0.mul(a0); // squared falloff — softer inner edge
    const brightness = alpha.mul(u.uFalloffColor).add(1);
    return vec4(u.uColor.mul(brightness).mul(u.uBrightness).mul(alpha), alpha);
  })();
  return Object.assign(mat, { uniforms: u });
}

// ---- Geometry builders ----

function buildRaysGeometry(starRadius: number, count: number = 6000): THREE.BufferGeometry {
  const lineCount = count;
  const lineLength = 8;

  const totalVerts = lineCount * lineLength * 2;
  const aPos = new Float32Array(totalVerts * 3);
  const aPos0 = new Float32Array(totalVerts * 3);
  const aWireRand = new Float32Array(totalVerts * 4);
  const indices = new Uint16Array(lineCount * (lineLength - 1) * 2 * 3);

  const held = new THREE.Vector3();
  const jitter = new THREE.Vector3();
  const base = new THREE.Vector3();
  const randomUnit = (v: THREE.Vector3) => {
    const z = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return v.set(r * Math.cos(t), r * Math.sin(t), z);
  };

  let ip = 0, i0 = 0, ir = 0, ii = 0;
  let d = Math.random(), p = Math.random();

  for (let v = 0; v < lineCount; v++) {
    if (Math.random() < 0.1 || v === 0) {
      randomUnit(held).normalize();
      d = Math.random();
      p = Math.random();
    }
    base.copy(held);
    randomUnit(jitter).multiplyScalar(0.025);
    base.add(jitter).normalize();

    const rands = [d, p, Math.random(), Math.random()];

    for (let m = 0; m < lineLength; m++) {
      for (let y = 0; y <= 1; y++) {
        aPos[ip++] = m / (lineLength - 1);
        aPos[ip++] = (v + 0.5) / lineCount;
        aPos[ip++] = 2 * y - 1;
        for (let t = 0; t < 4; t++) aWireRand[ir++] = rands[t];
        aPos0[i0++] = base.x * starRadius;
        aPos0[i0++] = base.y * starRadius;
        aPos0[i0++] = base.z * starRadius;
      }
      if (m < lineLength - 1) {
        const b = 2 * (v * lineLength + m);
        indices[ii++] = b; indices[ii++] = b + 1; indices[ii++] = b + 2;
        indices[ii++] = b + 2; indices[ii++] = b + 1; indices[ii++] = b + 3;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("aPos", new THREE.BufferAttribute(aPos, 3));
  geo.setAttribute("aPos0", new THREE.BufferAttribute(aPos0, 3));
  geo.setAttribute("aWireRandom", new THREE.BufferAttribute(aWireRand, 4));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

function buildFlaresGeometry(starRadius: number): THREE.BufferGeometry {
  const lineCount = 1024;
  const lineLength = 16;

  const totalVerts = lineCount * lineLength * 2;
  const aPos = new Float32Array(totalVerts * 3);
  const aPos0 = new Float32Array(totalVerts * 3);
  const aPos1 = new Float32Array(totalVerts * 3);
  const aWireRand = new Float32Array(totalVerts * 4);
  const indices = new Uint16Array(lineCount * (lineLength - 1) * 2 * 3);

  const held = new THREE.Vector3();
  const dDir = new THREE.Vector3();
  const f = new THREE.Vector3();
  const pDir = new THREE.Vector3();
  const g = new THREE.Vector3();

  let s = 0, l = 0, c = 0, h = 0, u = 0;
  f.set(Math.random(), Math.random(), Math.random()).normalize();
  let m = Math.random(), _p = Math.random();

  for (let y = 0; y < lineCount; y++) {
    if (Math.random() < 0.025 || y === 0) {
      dDir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      held.copy(dDir);
      g.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.4);
      held.add(g).normalize();
      m = Math.random();
      _p = Math.random();
    }

    f.copy(dDir);
    g.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.02);
    f.add(g).normalize();

    pDir.copy(held);
    g.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(0.075);
    pDir.add(g).normalize();

    const rands = [m, _p, Math.random(), Math.random()];

    for (let E = 0; E < lineLength; E++) {
      for (let A = 0; A <= 1; A++) {
        aPos[s++] = (E + 0.5) / lineLength;
        aPos[s++] = (y + 0.5) / lineCount;
        aPos[s++] = 2 * A - 1;
        for (let R = 0; R < 4; R++) aWireRand[l++] = rands[R];
        aPos0[c++] = f.x * starRadius;
        aPos0[c++] = f.y * starRadius;
        aPos0[c++] = f.z * starRadius;
        aPos1[h++] = pDir.x * starRadius;
        aPos1[h++] = pDir.y * starRadius;
        aPos1[h++] = pDir.z * starRadius;
      }
      if (E < lineLength - 1) {
        const b = 2 * (y * lineLength + E);
        indices[u++] = b; indices[u++] = b + 1; indices[u++] = b + 2;
        indices[u++] = b + 2; indices[u++] = b + 1; indices[u++] = b + 3;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("aPos", new THREE.BufferAttribute(aPos, 3));
  geo.setAttribute("aPos0", new THREE.BufferAttribute(aPos0, 3));
  geo.setAttribute("aPos1", new THREE.BufferAttribute(aPos1, 3));
  geo.setAttribute("aWireRandom", new THREE.BufferAttribute(aWireRand, 4));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  return geo;
}

// ---- React component ----

function tempToGlowTint(temp: number): number {
  if (temp > 15000) return 1.5;
  if (temp > 8000) return 1.0;
  if (temp > 6000) return 0.6;
  if (temp > 5000) return 0.4;  // Sun
  if (temp > 3700) return 0.3;
  return 0.2;
}

interface StarEffectsProps {
  starRadius: number;
  temperature?: number;
  focused?: boolean;
  glowScale?: number;
  glowFalloff?: number;
  glowBrightness?: number;
}

export default function StarEffects({ starRadius, temperature = 5500, focused = false, glowScale = 4.0, glowFalloff = 1.8, glowBrightness = 1.0 }: StarEffectsProps) {
  const raysRef = useRef<THREE.Mesh>(null);
  const flaresRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Blackbody colours from chroma.js — graduated by layer
  // Glow: photosphere colour (scattered light)
  const glowColor = useMemo(() => chroma.temperature(temperature).hex('rgb'), [temperature]);
  // Rays: slightly cooler (corona visible emission)
  const baseColor = useMemo(() => {
    const [r, g, b] = chroma.temperature(temperature * 0.85).gl();
    return new THREE.Color(r, g, b);
  }, [temperature]);
  // Flares: cooler still (prominences)
  const flareColor = useMemo(() => chroma.temperature(temperature * 0.75).hex('rgb'), [temperature]);

  // Hue for rays spectrum function
  const hue = useMemo(() => {
    if (temperature > 15000) return 0.5;
    if (temperature > 8000) return 0.35;
    if (temperature > 6000) return 0.2;
    if (temperature > 5000) return 0.15;
    if (temperature > 3700) return 0.05;
    return 0.0;
  }, [temperature]);

  const { raysGeo, raysMat, flaresGeo, flaresMat, glowGeo, glowMat } = useMemo(() => {
    // Non-linear scaling: sqrt(r) capped for giant stars
    const r = starRadius;
    const s = Math.sqrt(Math.min(r, 20)); // cap at ~20 scene units to prevent giant star bloat
    const rayLength = Math.min(s * 0.12, 0.5);  // proportional, clamped
    const rayWidth = Math.min(s * 0.015, 0.06);  // proportional, clamped
    const rayOpacity = 0.22;
    const flareAmp = 0.5;          // original: 0.5 (not scaled by star size)
    const flareWidth = 0.005;      // original: 0.005
    const flareOpacity = 0.2;      // original: 0.2

    const rGeo = buildRaysGeometry(starRadius, 10000);
    const rMat = createRaysMaterial({ width: rayWidth, length: rayLength, opacity: rayOpacity, hue, baseColor });

    const fGeo = buildFlaresGeometry(starRadius);
    const fMat = createFlaresMaterial({
      width: flareWidth,
      amp: flareAmp,
      opacity: flareOpacity,
      flareColor: new THREE.Color(flareColor),
    });

    // --- Glow ring (annular billboard from glowVS/glowFS) ---
    const glowSegments = 128;
    const glowPositions = new Float32Array(3 * 2 * glowSegments);
    let gi = 0;
    for (let a = 0; a < glowSegments; a++) {
      const angle = (a / glowSegments) * Math.PI * 2.0;
      const sx = Math.sin(angle) * starRadius;
      const sy = Math.cos(angle) * starRadius;
      glowPositions[gi++] = sx; glowPositions[gi++] = sy; glowPositions[gi++] = 0.0; // inner (vRadial=0)
      glowPositions[gi++] = sx; glowPositions[gi++] = sy; glowPositions[gi++] = 1.0; // outer (vRadial=1)
    }
    const glowIndices = new Uint16Array(2 * glowSegments * 3);
    let go = 0;
    for (let a = 0; a < glowSegments; a++) {
      const i0 = 2 * a, i1 = 2 * a + 1;
      const i2 = 2 * ((a + 1) % glowSegments), i3 = i2 + 1;
      glowIndices[go++] = i0; glowIndices[go++] = i1; glowIndices[go++] = i2;
      glowIndices[go++] = i2; glowIndices[go++] = i1; glowIndices[go++] = i3;
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("aPos", new THREE.Float32BufferAttribute(glowPositions, 3));
    gGeo.setIndex(new THREE.BufferAttribute(glowIndices, 1));

    const gMat = createGlowMaterial({
      radius: 0.4,
      color: new THREE.Color(glowColor),
      brightness: glowBrightness,
      falloff: glowFalloff,
    });

    return { raysGeo: rGeo, raysMat: rMat, flaresGeo: fGeo, flaresMat: fMat, glowGeo: gGeo, glowMat: gMat };
  }, [starRadius, hue, baseColor, temperature]);

  // Pre-allocate vectors to avoid per-frame GC jitter
  const _camPos = useMemo(() => new THREE.Vector3(), []);
  const _camRight = useMemo(() => new THREE.Vector3(), []);
  const _camUp = useMemo(() => new THREE.Vector3(), []);
  const _camFwd = useMemo(() => new THREE.Vector3(), []);
  const frameSkip = useRef(0);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.25;

    // Time always updates (cheap)
    if (focused) {
      raysMat.uniforms.uTime.value = t;
      flaresMat.uniforms.uTime.value = t;
    }

    // Update glow controls
    glowMat.uniforms.uRadius.value = 0.4;
    glowMat.uniforms.uBrightness.value = glowBrightness;
    glowMat.uniforms.uFalloff.value = glowFalloff;
    glowMat.uniforms.uColor.value.set(glowColor);

    // Camera-dependent uniforms every 3rd frame
    frameSkip.current++;
    if (frameSkip.current >= 3) {
      frameSkip.current = 0;
      camera.getWorldPosition(_camPos);

      // Rays use fixed geometry — shown/hidden via focused gate in JSX
      if (focused) {
        raysMat.uniforms.uCamPos.value.copy(_camPos);
        flaresMat.uniforms.uCamPos.value.copy(_camPos);
      }
      camera.matrixWorld.extractBasis(_camRight, _camUp, _camFwd);
    }
  });

  return (
    <>
      <mesh geometry={glowGeo} material={glowMat} frustumCulled={false} renderOrder={2} />
      {focused && (
        <>
          <mesh ref={raysRef} geometry={raysGeo} material={raysMat} frustumCulled={false} renderOrder={3} />
          <mesh ref={flaresRef} geometry={flaresGeo} material={flaresMat} frustumCulled={false} renderOrder={1} />
        </>
      )}
    </>
  );
}
