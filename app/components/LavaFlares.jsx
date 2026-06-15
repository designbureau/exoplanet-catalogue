/**
 * LavaFlares — a handful of arched prominence ribbons rising off a lava
 * eyeball's molten sub-stellar face. Adapted from the star-flare shader
 * (StarEffects.tsx): each arc is a ribbon bulging between two nearby surface
 * points. Rendered as a child of the planet mesh so it inherits the orbit
 * transform, and masked to the hot side via the planet's object-space sun
 * direction so the flares only erupt where the surface is molten.
 */

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const flaresVS = `
  attribute vec3 aPos;
  attribute vec3 aPos0;
  attribute vec3 aPos1;
  attribute vec4 aWireRandom;

  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying float vArc;
  varying float vSeed;

  uniform float uWidth;
  uniform float uAmp;
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform vec3 uCamPos;
  uniform float uOpacity;
  uniform vec3 uFlareColor;
  uniform vec3 uSunDirLocal;

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
    // Two noise octaves: broad sway + finer filament wander, both scaled by amp
    // (and therefore the lifecycle) so they add structure without snapping.
    p += twistedSineNoise(vec4(p * uNoiseFrequency, uTime), 0.707).xyz * (amp * uNoiseAmplitude);
    p += twistedSineNoise(vec4(p * uNoiseFrequency * 3.2, uTime * 1.4 + 7.0), 0.6).xyz * (amp * uNoiseAmplitude * 0.5);
    return p;
  }

  void main() {
    vUVY = aPos.z;
    // Smooth eruption lifecycle: sin() is zero at both ends of the 0..1 cycle,
    // so each flare rises and falls gracefully with no snap when the cycle
    // wraps — fixes the flicker/jank of the old fract() envelope.
    float life = fract(uTime * 0.055 * (0.5 + aWireRandom.y * 0.7) + aWireRandom.x);
    float env = sin(life * 3.14159265);
    env *= env;

    vec3 pOBJ = getPosOBJ(aPos.x, env);
    vec3 p1OBJ = getPosOBJ(aPos.x + 0.01, env);

    vec3 pW = (modelMatrix * vec4(pOBJ, 1.0)).xyz;
    vec3 p1W = (modelMatrix * vec4(p1OBJ, 1.0)).xyz;

    vec3 dirW = normalize(p1W - pW);
    vec3 vW = normalize(pW - uCamPos);
    vec3 sideW = normalize(cross(vW, dirW));

    // Taper the ribbon toward its anchored feet so each arc reads as a rounded
    // loop (fuller in the middle) rather than a flat constant-width strip.
    float taper = sin(aPos.x * 3.14159265);
    float R = length(aPos0);
    float width = uWidth * aPos.z * R * (0.18 + 0.82 * taper);
    pW += sideW * width;

    // Concentrate around the molten sub-stellar (hot) pole.
    float sub = dot(normalize((aPos0 + aPos1) * 0.5), uSunDirLocal);
    float sideMask = smoothstep(0.30, 0.80, sub);

    vOpacity = sideMask * env * uOpacity;
    vColor = uFlareColor * (0.8 + aWireRandom.w * 0.4);
    vArc = aPos.x;
    vSeed = aWireRandom.z;

    gl_Position = projectionMatrix * viewMatrix * vec4(pW, 1.0);
  }
`;

const flaresFS = `
  precision highp float;
  varying float vUVY;
  varying float vOpacity;
  varying vec3 vColor;
  varying float vArc;
  varying float vSeed;
  uniform float uAlphaBlended;
  uniform float uTime;

  void main() {
    // Soft round cross-section (brighter down the centreline).
    float core = smoothstep(1.0, 0.0, abs(vUVY));
    core *= core;
    // Flowing filament detail along the loop: drifting bright/dim bands plus a
    // finer ripple, so the arc reads as structured plasma, not a flat ribbon.
    float bands = sin(vArc * 26.0 + uTime * 2.5 + vSeed * 31.0) * 0.5 + 0.5;
    float fine  = sin(vArc * 72.0 - uTime * 4.0 + vSeed * 53.0) * 0.5 + 0.5;
    float detail = mix(0.5, 1.0, bands) * mix(0.78, 1.0, fine);
    // Hotter, brighter core down the centre.
    vec3 col = mix(vColor, vColor + vec3(0.5, 0.32, 0.08), core);
    float alpha = core * vOpacity * detail;
    gl_FragColor = vec4(col * alpha, alpha * uAlphaBlended);
  }
`;

// Build a handful of short arcs anchored on a sphere of the given radius.
function buildGeometry(radius, count) {
  const segments = 28;
  const totalVerts = count * segments * 2;
  const aPos = new Float32Array(totalVerts * 3);
  const aPos0 = new Float32Array(totalVerts * 3);
  const aPos1 = new Float32Array(totalVerts * 3);
  const aWireRand = new Float32Array(totalVerts * 4);
  const indices = new Uint16Array(count * (segments - 1) * 2 * 3);

  const base = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const e0 = new THREE.Vector3();
  const e1 = new THREE.Vector3();

  let s = 0, l = 0, c = 0, h = 0, u = 0;

  for (let y = 0; y < count; y++) {
    base.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    // a tangent direction orthogonal to base
    tan.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    tan.addScaledVector(base, -tan.dot(base)).normalize();
    axis.crossVectors(base, tan).normalize();
    const span = 0.09 + Math.random() * 0.13; // arc angular length (small loops)
    e0.copy(base).applyAxisAngle(axis, -span * 0.5).multiplyScalar(radius);
    e1.copy(base).applyAxisAngle(axis, span * 0.5).multiplyScalar(radius);

    const rands = [Math.random(), Math.random(), Math.random(), Math.random()];

    for (let E = 0; E < segments; E++) {
      for (let A = 0; A <= 1; A++) {
        aPos[s++] = (E + 0.5) / segments;
        aPos[s++] = (y + 0.5) / count;
        aPos[s++] = 2 * A - 1;
        for (let R = 0; R < 4; R++) aWireRand[l++] = rands[R];
        aPos0[c++] = e0.x; aPos0[c++] = e0.y; aPos0[c++] = e0.z;
        aPos1[h++] = e1.x; aPos1[h++] = e1.y; aPos1[h++] = e1.z;
      }
      if (E < segments - 1) {
        const b = 2 * (y * segments + E);
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

export default function LavaFlares({ radius, sourceMaterial, color = "#ff6024", count = 12 }) {
  const { camera } = useThree();
  const meshRef = useRef();

  const { geo, mat } = useMemo(() => {
    const g = buildGeometry(radius, count);
    const m = new THREE.ShaderMaterial({
      vertexShader: flaresVS,
      fragmentShader: flaresFS,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uWidth: { value: 0.05 },
        uAmp: { value: 0.34 },             // arc height as fraction of arc length
        uOpacity: { value: 1.15 },
        uAlphaBlended: { value: 0.9 },
        uFlareColor: { value: new THREE.Color(color) },
        uNoiseFrequency: { value: 3.0 },
        uNoiseAmplitude: { value: 0.13 },
        uSunDirLocal: { value: new THREE.Vector3(0, 0, 1) },
      },
    });
    return { geo: g, mat: m };
  }, [radius, count, color]);

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.getElapsedTime();
    mat.uniforms.uCamPos.value.copy(camera.position);
    const sun = sourceMaterial?.uniforms?.u_sunDirectionLocal;
    if (sun) mat.uniforms.uSunDirLocal.value.copy(sun.value);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={mat}
      frustumCulled={false}
      renderOrder={3}
      raycast={() => null}
    />
  );
}
