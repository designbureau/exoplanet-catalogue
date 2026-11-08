import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { PlanetType, type ShaderParams } from "~/utils/planetClassification";
import buildNoiseLib from "~/shaders/generated/noiseLib";
import buildTerrestrialVertex from "~/shaders/generated/terrestrialVertex";
import buildGasGiant from "~/shaders/generated/gasGiantFragment";
import buildRocky from "~/shaders/generated/rockyFragment";
import buildTerrestrial from "~/shaders/generated/terrestrialFragment";
import buildIceOcean from "~/shaders/generated/iceOceanFragment";
import buildHazy from "~/shaders/generated/hazyFragment";
import buildIceGiant from "~/shaders/generated/iceGiantFragment";
import buildCloud from "~/shaders/generated/cloudFragment";

// Procedural planet surfaces — TSL / WebGPU.
//
// The fragment logic (Perlin-based terrain, gas-giant banding, lava, ice, wrap
// lighting, …) lives in app/shaders/generated/*: a mechanical TSL port of the
// original GLSL. This file owns the parts that depend on the host: the uniform
// map, the vertex stage (varyings + terrestrial displacement) and material
// assembly per planet type.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Material + the `uniforms` map that the rest of the app mutates (`.value`). */
export type UniformMaterial = THREE.NodeMaterial & { uniforms: Record<string, Any> };

/**
 * Turn `{ name: { value } }` defaults into live TSL uniform nodes. A uniform node
 * exposes the same `.value` get/set (and holds Vector3/Color instances by
 * reference), so code that does `mat.uniforms.u_time.value = t` or
 * `mat.uniforms.u_sunDirection.value.copy(v)` keeps working unchanged.
 */
export function toUniformNodes(defaults: Record<string, { value: Any }>): Record<string, Any> {
  const out: Record<string, Any> = {};
  for (const [name, { value }] of Object.entries(defaults)) {
    out[name] = value === null || value === undefined ? { value } : TSL.uniform(value);
  }
  return out;
}

// The generated modules call `reference('value', type, uniforms[name])`; our
// uniforms already are TSL nodes, so hand them straight back.
export const GENERATED_TSL: Any = { ...TSL, reference: (_prop: string, _type: string, node: Any) => node };

function varyingsFor(dir: Any, normalObj: Any, positionObj: Any, vPositionSrc?: Any) {
  const { varying, transformDirection, modelWorldMatrix, modelNormalMatrix, vec4 } = TSL as Any;
  const vPosition = varying(vPositionSrc ?? dir, "vPosition");
  return {
    vPosition,
    vSphereDir: varying(dir, "vSphereDir"),
    vNormal: varying(modelNormalMatrix.mul(normalObj).normalize(), "vNormal"),
    vWorldNormal: varying(transformDirection(normalObj, modelWorldMatrix), "vWorldNormal"),
    vWorldPosition: varying(modelWorldMatrix.mul(vec4(positionObj, 1)).xyz, "vWorldPosition"),
  };
}

/** Flat (undisplaced) vertex stage shared by every non-terrestrial planet and the cloud sphere. */
function flatVaryings() {
  const { positionGeometry, normalGeometry } = TSL as Any;
  return varyingsFor(positionGeometry.normalize(), normalGeometry, positionGeometry);
}

/**
 * Terrestrial vertex stage: procedural height displacement + forward-difference
 * normals (3 height evaluations per vertex), gated by u_displace so far/low-LOD
 * meshes skip the noise entirely. Returns the displaced object-space position
 * for material.positionNode plus the varyings.
 */
function terrestrialVertex(uniforms: Any, lib: Any) {
  const { Fn, If, vec3, mat3, select, abs, cross, length, normalize, positionGeometry, normalGeometry } = TSL as Any;
  const vtx = buildTerrestrialVertex(GENERATED_TSL, uniforms, {}, lib);
  const { u_displace, computeHeight } = vtx;

  const dir = positionGeometry.normalize();

  // packed = [displacedPos | displacedNormal | vPosition] columns
  const packed = Fn(() => {
    const displacedPos = positionGeometry.toVar();
    const displacedNormal = normalGeometry.toVar();
    const vPos = dir.toVar();
    If(u_displace.greaterThan(0.0), () => {
      const height = computeHeight(dir, dir);
      displacedPos.assign(positionGeometry.add(normalGeometry.mul(height).mul(u_displace)));

      const up = select(abs(dir.y).lessThan(0.999), vec3(0, 1, 0), vec3(1, 0, 0));
      const tangent = normalize(cross(up, dir));
      const bitangent = cross(dir, tangent);
      const eps = 0.003;
      const r = length(positionGeometry);
      const pT = normalize(dir.add(tangent.mul(eps)));
      const pB = normalize(dir.add(bitangent.mul(eps)));
      const posT = pT.mul(r).add(pT.mul(computeHeight(pT, pT)).mul(u_displace));
      const posB = pB.mul(r).add(pB.mul(computeHeight(pB, pB)).mul(u_displace));
      displacedNormal.assign(normalize(cross(posT.sub(displacedPos), posB.sub(displacedPos))));
      vPos.assign(normalize(displacedPos));
    });
    return mat3(displacedPos, displacedNormal, vPos);
  })().toVar();

  const displacedPos = packed.element(0);
  const displacedNormal = packed.element(1);
  const vPos = packed.element(2);
  return { positionNode: displacedPos, ...varyingsFor(dir, displacedNormal, displacedPos, vPos) };
}

const FRAGMENT_BUILDERS: Record<string, Any> = {
  gasGiant: buildGasGiant,
  rocky: buildRocky,
  terrestrial: buildTerrestrial,
  iceOcean: buildIceOcean,
  hazy: buildHazy,
  iceGiant: buildIceGiant,
};

function selectFragment(type: PlanetType): string {
  switch (type) {
    case PlanetType.COLD_GIANT:
    case PlanetType.COOL_GIANT:
    case PlanetType.WARM_GIANT:
    case PlanetType.HOT_JUPITER_IV:
    case PlanetType.HOT_JUPITER_V:
      return "gasGiant";

    case PlanetType.ICE_GIANT:
      return "iceGiant";

    case PlanetType.WATER_WORLD:
    case PlanetType.ICE_OCEAN_EYEBALL:
    case PlanetType.LAVA_EYEBALL:
    case PlanetType.TEMPERATE:
      return "terrestrial";

    case PlanetType.SUB_NEPTUNE:
    case PlanetType.VENUS_LIKE:
      return "hazy";

    case PlanetType.LAVA_WORLD:
    case PlanetType.HOT_ROCKY:
    case PlanetType.FROZEN:
    default:
      return "rocky";
  }
}

const usesDisplacement = (type: PlanetType) =>
  type === PlanetType.TEMPERATE ||
  type === PlanetType.WATER_WORLD ||
  type === PlanetType.ICE_OCEAN_EYEBALL ||
  type === PlanetType.LAVA_EYEBALL;

export function createPlanetMaterial(params: ShaderParams): UniformMaterial {
  const uniforms = toUniformNodes({

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
      emissiveColor: { value: params.emissive || new THREE.Color(0, 0, 0) },
      emissiveIntensity: { value: params.emissiveIntensity ?? 0 },
      u_lavaCrackDepth: { value: 0.45 },
      u_lavaPoolSize: { value: 0.3 },
      u_lavaHeatGrad: { value: 0.6 },
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
      u_wrapPower: { value: 1.0 },
      u_sunIntensity: { value: 1.0 },
      u_displace: { value: 0 },
      u_vertLOD: { value: 0 },
      u_bumpStrength: { value: params.bumpStrength ?? 0.8 },
      u_tidallyLocked: { value: params.tidallyLocked ? 1.0 : 0.0 },
      u_eyeAridEdge: { value: params.eyeAridEdge ?? 0.3 },
      u_eyeIceEdge: { value: params.eyeIceEdge ?? -0.15 },
      u_eyeIceBergDensity: { value: params.eyeIceBergDensity ?? 0.5 },
      u_iceOceanPolarFade: { value: params.iceOceanPolarFade ?? 0.5 },
      u_iceOceanEdgeNoise: { value: params.iceOceanEdgeNoise ?? 0.5 },
      u_iceOceanCrackDepth: { value: params.iceOceanCrackDepth ?? 0.5 },
      u_eyeVegHue: { value: 0.0 },
      u_eyeVegSat: { value: 1.0 },
      u_eyeMoisture: { value: 0.7 },
      u_useTextureMaps: { value: 0 },
      u_heightMap: { value: null },
      u_normalMap: { value: null },
      u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_sunDirectionLocal: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_atmosDayColor: { value: params.atmosDayColor || new THREE.Color(0x00aaff) },
      u_atmosTwilightColor: { value: params.atmosTwilightColor || new THREE.Color(0xff6600) },
    
  });

  const lib = buildNoiseLib(GENERATED_TSL, uniforms, {}, {});

  const mat = new THREE.NodeMaterial() as UniformMaterial;
  let varyings: Any;
  if (usesDisplacement(params.type)) {
    const v = terrestrialVertex(uniforms, lib);
    mat.positionNode = v.positionNode;
    varyings = v;
  } else {
    varyings = flatVaryings();
  }

  const frag = FRAGMENT_BUILDERS[selectFragment(params.type)](GENERATED_TSL, uniforms, varyings, lib);
  mat.fragmentNode = frag.fragMain();
  mat.uniforms = uniforms;
  mat.userData.varyings = varyings; // exposed for debugging
  return mat;
}

// Cloud layer material — separate sphere slightly above planet surface
export function createCloudMaterial(params: ShaderParams): UniformMaterial | null {
  if (params.type !== PlanetType.TEMPERATE && params.type !== PlanetType.WATER_WORLD) return null;

  const uniforms = toUniformNodes({

      u_time: { value: 0 },
      u_seed: { value: params.seed },
      u_lod: { value: 1.0 },  // always full detail for cloud sphere
      u_cloudCoverage: { value: params.cloudCoverage ?? 0.35 },
      u_cloudOpacity: { value: params.cloudOpacity ?? 0.6 },
      u_cloudSwirl: { value: params.cloudSwirl ?? 0.8 },
      u_cloudBands: { value: params.cloudBands ?? 5.0 },
      u_cloudWarp: { value: params.cloudWarp ?? 0.35 },
      u_sunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_sunDirectionLocal: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      u_tidallyLocked: { value: params.tidallyLocked ? 1.0 : 0.0 },
      u_spiralTightness: { value: 3.5 },
      u_spiralArms: { value: 2.0 },
      u_spiralStrength: { value: 0.14 },
      u_eyeSize: { value: 0.15 },
      u_wrapRange: { value: 0.45 },
      u_wrapPower: { value: 1.0 },
      u_sunIntensity: { value: 1.0 },
  });

  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.side = THREE.FrontSide;
  const frag = buildCloud(GENERATED_TSL, uniforms, flatVaryings(), {});
  mat.fragmentNode = frag.fragMain();
  mat.uniforms = uniforms;
  return mat;
}
