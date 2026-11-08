import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  dot,
  float,
  max,
  mix,
  modelNormalMatrix,
  modelScale,
  modelViewMatrix,
  normalGeometry,
  normalize,
  positionGeometry,
  positionWorld,
  pow,
  select,
  smoothstep,
  transformDirection,
  uniform,
  varying,
  vec3,
  vec4,
  type N,
} from "~/shaders/tsl/nodes";

// Small hand-written TSL materials used around planets: the non-scattering
// atmosphere shell, the soft halo billboard ring and the relative-to-eye orbit
// trail. Each exposes a `uniforms` map ({ value }) with the same keys the old
// ShaderMaterials had, so the per-frame update code is unchanged.

type UniformMaterial = THREE.NodeMaterial & { uniforms: Record<string, N> };

/** Cheap atmosphere shell (BackSide sphere) for types without a scattering preset. */
export function createAtmosphereFallbackMaterial(init: {
  day: THREE.Color;
  twilight: THREE.Color;
  intensity: number;
}): UniformMaterial {
  const u = {
    uSunDirection: uniform(new THREE.Vector3(1, 0.5, 0.8).normalize()),
    uAtmosDayColor: uniform(init.day),
    uAtmosTwilightColor: uniform(init.twilight),
    uFallbackIntensity: uniform(init.intensity),
    uShellFalloff: uniform(1.25),
    uShellInner: uniform(0.0),
  };

  const vNormal = varying(modelNormalMatrix.mul(normalGeometry).normalize());
  const vWorldPosition = varying(positionWorld);

  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.side = THREE.BackSide;
  mat.fragmentNode = Fn(() => {
    const viewDirection = normalize(vWorldPosition.sub(cameraPosition));
    const normal = normalize(vNormal);
    const sunOrientation = dot(u.uSunDirection, normal);
    const atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    const color = mix(u.uAtmosTwilightColor, u.uAtmosDayColor, atmosphereDayMix);
    // BackSide sphere: dot(view, normal) is high at centre, 0 at limb — invert for edge glow
    const edge = dot(viewDirection, normal);
    const edgeAlpha = pow(float(1).sub(smoothstep(0.0, 0.5, edge)), u.uShellFalloff);
    const dayAlpha = smoothstep(-0.5, 0.0, sunOrientation);
    return vec4(color, edgeAlpha.mul(dayAlpha).mul(u.uFallbackIntensity));
  })();
  mat.uniforms = u;
  return mat;
}

/** Soft outer glow: an annular billboard (geometry attr `aPos` = (x, y, radial 0→1)). */
export function createHaloMaterial(init: {
  radius: number;
  color: THREE.Color;
  intensity: number;
  falloff: number;
  shadow: number;
}): UniformMaterial {
  const u = {
    uRadius: uniform(init.radius),
    uColor: uniform(init.color),
    uIntensity: uniform(init.intensity),
    uFalloff: uniform(init.falloff),
    uInner: uniform(0.0),
    uSunDirection: uniform(new THREE.Vector3(1, 0, 0)),
    uHaloShadow: uniform(init.shadow),
  };
  const aPos = attribute("aPos", "vec3");

  const vRadial = varying(aPos.z);
  const vRingDir = varying(normalize(aPos.xy));

  // Billboard via modelViewMatrix — always camera-aligned, uniform scale from the mesh
  const mvCenter = modelViewMatrix.mul(vec4(0, 0, 0, 1));
  const r = float(1).add(aPos.z.mul(u.uRadius)).mul(modelScale.x);
  const viewPos = mvCenter.xyz.add(vec3(aPos.x.mul(r), aPos.y.mul(r), 0));

  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.depthTest = true;
  mat.blending = THREE.AdditiveBlending;
  mat.side = THREE.DoubleSide;
  mat.vertexNode = cameraProjectionMatrix.mul(vec4(viewPos, 1));
  mat.fragmentNode = Fn(() => {
    const a0 = pow(float(1).sub(vRadial), u.uFalloff);
    const alpha = select(u.uInner.greaterThan(0.001), a0.mul(smoothstep(0.0, max(u.uInner, 0.001), vRadial)), a0).toVar();

    // Sun shadow on halo — gentle cosine fade, no hard edges
    const sunView = transformDirection(u.uSunDirection, cameraViewMatrix);
    const sunDot = dot(vRingDir, sunView.xy);
    const shadow = clamp(sunDot.mul(float(1).sub(u.uHaloShadow)).mul(0.5).add(0.5).add(u.uHaloShadow.mul(0.5)), 0, 1);
    alpha.assign(alpha.mul(shadow).mul(u.uIntensity));
    return vec4(u.uColor.mul(alpha), alpha);
  })();
  mat.uniforms = u;
  return mat;
}

/**
 * Orbit trail line with per-vertex taper, rendered relative-to-eye (RTE): distant
 * orbits blow past float32 precision, so each vertex is stored as a high/low
 * float pair and the camera position (in the group's local space) is subtracted
 * per pair so the large parts cancel exactly.
 */
export function createOrbitTrailMaterial(): UniformMaterial {
  const u = {
    uPhase: uniform(0),
    uCamHigh: uniform(new THREE.Vector3()),
    uCamLow: uniform(new THREE.Vector3()),
    uFade: uniform(1), // 0 when camera is right on the planet, 1 when pulled back
  };
  const aPosLow = attribute("aPosLow", "vec3");
  const aT = attribute("aT", "float");

  // position (high) − camera (high) cancels the large magnitude exactly; add the
  // residuals for the precise local offset from the camera.
  const rel = positionGeometry.sub(u.uCamHigh).add(aPosLow.sub(u.uCamLow));
  // rel is local-space camera-relative; rotate into view space (rotation part of
  // modelView only — the huge translation is already handled) and project.
  const mv = modelViewMatrix;
  const relView = mv.element(0).xyz.mul(rel.x).add(mv.element(1).xyz.mul(rel.y)).add(mv.element(2).xyz.mul(rel.z));
  const vT = varying(aT);

  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.vertexNode = cameraProjectionMatrix.mul(vec4(relView, 1));
  mat.fragmentNode = Fn(() => {
    // How far behind the planet (0=at planet, 1=full orbit)
    const d0 = vT.sub(u.uPhase);
    const dist = select(d0.lessThan(0), d0.add(1), d0);

    // 75% trail: fade opacity along entire length, taper at end
    const taper = float(1).sub(smoothstep(0.65, 0.75, dist));
    const fade = float(1).sub(dist.div(0.75)); // linear fade from planet to tail
    const alpha = taper.mul(fade).mul(0.3).mul(u.uFade);
    alpha.lessThan(0.005).discard();
    return vec4(1, 1, 1, alpha);
  })();
  mat.uniforms = u;
  return mat;
}

/** Additive habitable-zone annulus: soft fade in/out across [geoInner, inner] and [outer, geoOuter]. */
export function createHabitableZoneMaterial(init: {
  inner: number;
  outer: number;
  geoInner: number;
  geoOuter: number;
}): UniformMaterial {
  const u = {
    uColor: uniform(new THREE.Color(0x00aaaa)),
    uOpacity: uniform(0.2),
    uInnerEdge: uniform(init.inner),
    uOuterEdge: uniform(init.outer),
    uGeoInner: uniform(init.geoInner),
    uGeoOuter: uniform(init.geoOuter),
  };
  const vRadius = varying(positionGeometry.xy.length());

  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.side = THREE.DoubleSide;
  mat.depthWrite = false;
  mat.blending = THREE.AdditiveBlending;
  mat.fragmentNode = Fn(() => {
    // Soft fade at inner and outer edges, full opacity in the zone itself
    const innerFade = smoothstep(u.uGeoInner, u.uInnerEdge, vRadius);
    const outerFade = float(1).sub(smoothstep(u.uOuterEdge, u.uGeoOuter, vRadius));
    return vec4(u.uColor, innerFade.mul(outerFade).mul(u.uOpacity));
  })();
  mat.uniforms = u;
  return mat;
}
