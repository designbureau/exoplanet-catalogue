import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import chroma from "chroma-js";

// ---- Shared visibility GLSL (from sun/js/shader/includes/visibility.glsl) ----
const visibilityGLSL = `
  float getAlpha(vec3 n) {
    // Full visibility — no directional culling in our system view
    return 1.0;
  }
`;

// ---- Sun Rays: noise-displaced ribbons emanating from surface ----
const sunRaysVS = `
  attribute vec3 aPos;
  attribute vec3 aPos0;
  attribute vec4 aWireRandom;

  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying vec3 vNormal;

  uniform float uHueSpread;
  uniform float uHue;
  uniform float uLength;
  uniform float uWidth;
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform vec3 uCamPos;
  uniform float uOpacity;

  #define m4 mat4(0.00,0.80,0.60,-0.4,-0.80,0.36,-0.48,-0.5,-0.60,-0.48,0.64,0.2,0.40,0.30,0.20,0.4)

  vec4 twistedSineNoise(vec4 q, float falloff) {
    float a = 1.0, f = 1.0;
    vec4 sum = vec4(0);
    for (int i = 0; i < 4; i++) {
      q = m4 * q;
      vec4 s = sin(q.ywxz * f) * a;
      q += s; sum += s;
      a *= falloff; f /= falloff;
    }
    return sum;
  }

  vec3 getPos(float phase, float animPhase) {
    float size = aWireRandom.z + 0.2;
    float d = phase * uLength * size;
    vec3 p = aPos0 + aPos0 * d;
    p += twistedSineNoise(vec4(p * uNoiseFrequency, uTime), 0.707).xyz * (d * uNoiseAmplitude);
    return p;
  }

  uniform vec3 uBaseColor;

  void main() {
    vUVY = aPos.z;
    float animPhase = fract(uTime * 0.3 * (aWireRandom.y * 0.5) + aWireRandom.x);

    vec3 p = getPos(aPos.x, animPhase);
    vec3 p1 = getPos(aPos.x + 0.01, animPhase);

    // Transform to world space
    vec3 pW = (modelMatrix * vec4(p, 1.0)).xyz;
    vec3 p1W = (modelMatrix * vec4(p1, 1.0)).xyz;

    vec3 dirW = normalize(p1W - pW);
    vec3 vW = normalize(pW - uCamPos);
    vec3 sideW = normalize(cross(vW, dirW));

    if (length(sideW) < 1e-6) {
      vec3 up = (abs(dirW.y) < 0.99) ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
      sideW = normalize(cross(up, dirW));
    }

    float width = uWidth * aPos.z * (1.0 - aPos.x);
    pW += sideW * width;

    vNormal = normalize(pW);
    vOpacity = uOpacity * (0.5 + aWireRandom.w);
    // Temperature-matched colour with per-ray brightness variation
    float variation = aWireRandom.w * uHueSpread;
    vColor = uBaseColor * (0.7 + variation * 0.6);

    gl_Position = projectionMatrix * viewMatrix * vec4(pW, 1.0);
  }
`;

const sunRaysFS = `
  precision highp float;

  ${visibilityGLSL}

  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying vec3 vNormal;

  void main() {
    float alpha = 1.0 - smoothstep(0.0, 1.0, abs(vUVY));
    alpha *= alpha;
    alpha *= vOpacity;
    alpha *= getAlpha(vNormal);
    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// ---- Sun Flares: arcing ribbons between two surface points ----
const sunFlaresVS = `
  attribute vec3 aPos;
  attribute vec3 aPos0;
  attribute vec3 aPos1;
  attribute vec4 aWireRandom;

  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying vec3 vNormal;

  uniform float uWidth;
  uniform float uAmp;
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform vec3 uCamPos;
  uniform float uOpacity;
  uniform float uHueSpread;
  uniform float uHue;

  #define m4 mat4(0.00,0.80,0.60,-0.4,-0.80,0.36,-0.48,-0.5,-0.60,-0.48,0.64,0.2,0.40,0.30,0.20,0.4)

  vec4 twistedSineNoise(vec4 q, float falloff) {
    float a = 1.0, f = 1.0;
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 4; i++) {
      q = m4 * q;
      vec4 s = sin(q.ywxz * f) * a;
      q += s; sum += s;
      a *= falloff; f /= falloff;
    }
    return sum;
  }

  vec3 getPosOBJ(float phase, float animPhase) {
    float size = distance(aPos0, aPos1);
    vec3 n = normalize((aPos0 + aPos1) * 0.5);
    vec3 p = mix(aPos0, aPos1, phase);
    float amp = sin(phase * 3.14159265) * size * uAmp;
    amp *= animPhase;
    p += n * amp;
    p += twistedSineNoise(vec4(p * uNoiseFrequency, uTime), 0.707).xyz * (amp * uNoiseAmplitude);
    return p;
  }

  #define hue(v) ( .6 + .6 * cos( 6.3*(v) + vec3(0.0,23.0,21.0) ) )

  void main() {
    vUVY = aPos.z;
    float animPhase = fract(uTime * 0.3 * (aWireRandom.y * 0.5) + aWireRandom.x);

    vec3 pOBJ = getPosOBJ(aPos.x, animPhase);
    vec3 p1OBJ = getPosOBJ(aPos.x + 0.01, animPhase);

    vec3 pW = (modelMatrix * vec4(pOBJ, 1.0)).xyz;
    vec3 p1W = (modelMatrix * vec4(p1OBJ, 1.0)).xyz;

    vec3 dirW = normalize(p1W - pW);
    vec3 vW = normalize(pW - uCamPos);
    vec3 sideW = normalize(cross(vW, dirW));

    float R = length(aPos0);
    float width = uWidth * aPos.z * (1.0 + animPhase) * R;
    pW += sideW * width;

    vNormal = normalize(pW);
    float lenW = length(pW);
    vOpacity = smoothstep(R, R * 1.03, lenW);
    vOpacity *= (1.0 - animPhase);
    vOpacity *= uOpacity;
    vColor = hue(aWireRandom.w * uHueSpread + uHue);

    gl_Position = projectionMatrix * viewMatrix * vec4(pW, 1.0);
  }
`;

const sunFlaresFS = `
  precision highp float;

  ${visibilityGLSL}

  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying vec3 vNormal;

  uniform float uAlphaBlended;

  void main() {
    float alpha = smoothstep(1.0, 0.0, abs(vUVY));
    alpha *= alpha;
    alpha *= vOpacity;
    alpha *= getAlpha(vNormal);
    gl_FragColor = vec4(vColor * alpha, alpha * uAlphaBlended);
  }
`;

// ---- Geometry builders ----

function buildRaysGeometry(starRadius: number): THREE.BufferGeometry {
  const lineCount = 4000;
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

  // Blackbody colour from chroma.js
  const glowColor = useMemo(() => chroma.temperature(temperature).hex('rgb'), [temperature]);

  // Base colour for rays/flares based on star temperature
  const baseColor = useMemo(() => {
    if (temperature > 15000) return new THREE.Color(0.7, 0.8, 1.0);    // blue-white
    if (temperature > 8000) return new THREE.Color(0.9, 0.85, 1.0);    // white-blue
    if (temperature > 6000) return new THREE.Color(1.0, 0.9, 0.7);     // warm white
    if (temperature > 5000) return new THREE.Color(1.0, 0.75, 0.4);    // yellow-orange (Sun)
    if (temperature > 3700) return new THREE.Color(1.0, 0.5, 0.2);     // orange
    return new THREE.Color(1.0, 0.3, 0.1);                              // red
  }, [temperature]);

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
    const rayOpacity = 0.15;
    const flareAmp = 0.5;          // original: 0.5 (not scaled by star size)
    const flareWidth = 0.005;      // original: 0.005
    const flareOpacity = 0.2;      // original: 0.2

    const rGeo = buildRaysGeometry(starRadius);
    const rMat = new THREE.ShaderMaterial({
      vertexShader: sunRaysVS,
      fragmentShader: sunRaysFS,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uWidth: { value: rayWidth },
        uLength: { value: rayLength },
        uOpacity: { value: rayOpacity },
        uNoiseFrequency: { value: 8.0 },
        uNoiseAmplitude: { value: 0.4 },
        uHueSpread: { value: 0.15 },
        uHue: { value: hue },
        uBaseColor: { value: baseColor },
      },
    });

    const fGeo = buildFlaresGeometry(starRadius);
    const fMat = new THREE.ShaderMaterial({
      vertexShader: sunFlaresVS,
      fragmentShader: sunFlaresFS,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uWidth: { value: flareWidth },
        uAmp: { value: flareAmp },
        uOpacity: { value: flareOpacity },
        uAlphaBlended: { value: 0.65 },
        uHueSpread: { value: 0.16 },
        uHue: { value: hue },
        uNoiseFrequency: { value: 4.0 },
        uNoiseAmplitude: { value: 0.2 },
      },
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

    const gMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aPos;
        varying float vRadial;
        varying vec3 vWorld;
        uniform float uRadius;
        uniform vec3 uCamRight;
        uniform vec3 uCamUp;
        void main() {
          vRadial = aPos.z;
          vec3 p = aPos.x * uCamRight + aPos.y * uCamUp;
          p *= 1.0 + aPos.z * uRadius;
          vec4 world = modelMatrix * vec4(p, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vRadial;
        uniform vec3 uColor;
        uniform float uBrightness;
        uniform float uFalloff;
        uniform float uFalloffColor;
        void main() {
          float alpha = pow(1.0 - vRadial, uFalloff);
          float brightness = 1.0 + alpha * uFalloffColor;
          vec3 col = uColor * brightness * uBrightness * alpha;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uRadius: { value: glowScale * 0.15 },
        uColor: { value: new THREE.Color(glowColor) },
        uBrightness: { value: glowBrightness },
        uFalloff: { value: glowFalloff },
        uFalloffColor: { value: 0.7 },
        uCamRight: { value: new THREE.Vector3(1, 0, 0) },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      },
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
    glowMat.uniforms.uRadius.value = glowScale * 0.15;
    glowMat.uniforms.uBrightness.value = glowBrightness;
    glowMat.uniforms.uFalloff.value = glowFalloff;
    glowMat.uniforms.uColor.value.set(glowColor);

    // Camera-dependent uniforms every 3rd frame
    frameSkip.current++;
    if (frameSkip.current >= 3) {
      frameSkip.current = 0;
      camera.getWorldPosition(_camPos);
      if (focused) {
        raysMat.uniforms.uCamPos.value.copy(_camPos);
        flaresMat.uniforms.uCamPos.value.copy(_camPos);
      }
      camera.matrixWorld.extractBasis(_camRight, _camUp, _camFwd);
      glowMat.uniforms.uCamRight.value.copy(_camRight);
      glowMat.uniforms.uCamUp.value.copy(_camUp);
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
