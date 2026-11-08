import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import { toUniformNodes, type UniformMaterial } from "~/shaders/planetShader";
import buildScatteringFragment from "~/shaders/generated/scatteringFragment";
import { PlanetType } from "~/utils/planetClassification";

// Physical atmospheric scattering parameters
export interface ScatteringParams {
  betaRayleigh: THREE.Vector3;  // wavelength-dependent scattering coefficients
  betaMie: number;              // Mie scattering coefficient
  scaleHeightR: number;         // Rayleigh scale height (fraction of planet radius)
  scaleHeightM: number;         // Mie scale height (fraction of planet radius)
  mieG: number;                 // Henyey-Greenstein asymmetry parameter
  atmosphereScale: number;      // atmosphere radius / planet radius (e.g. 1.025)
  sunIntensity: number;         // brightness multiplier
}

// Presets for different planet types
// Based on real atmospheric composition data where available
const EARTH_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(5.5e-6, 13.0e-6, 22.4e-6), // N₂/O₂ Rayleigh
  betaMie: 21e-6,
  scaleHeightR: 0.06,
  scaleHeightM: 0.012,
  mieG: 0.76,
  atmosphereScale: 1.025,
  sunIntensity: 22.0,
};

const MARS_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(19.9e-6, 13.6e-6, 5.6e-6), // thin CO₂, red-shifted
  betaMie: 4e-6,
  scaleHeightR: 0.05,
  scaleHeightM: 0.008,
  mieG: 0.65,
  atmosphereScale: 1.008,
  sunIntensity: 8.0,
};

const VENUS_TRANSITION_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(2e-6, 3e-6, 4e-6), // thick CO₂, Mie dominates
  betaMie: 80e-6,
  scaleHeightR: 0.08,
  scaleHeightM: 0.04,
  mieG: 0.85,
  atmosphereScale: 1.06,
  sunIntensity: 18.0,
};

const VENUS_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(1e-6, 2e-6, 3e-6),
  betaMie: 120e-6,
  scaleHeightR: 0.10,
  scaleHeightM: 0.05,
  mieG: 0.90,
  atmosphereScale: 1.08,
  sunIntensity: 15.0,
};

const WATER_WORLD_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(4e-6, 10e-6, 18e-6),
  betaMie: 15e-6,
  scaleHeightR: 0.07,
  scaleHeightM: 0.015,
  mieG: 0.72,
  atmosphereScale: 1.03,
  sunIntensity: 20.0,
};

const LAVA_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(1e-6, 1.5e-6, 2e-6),
  betaMie: 40e-6,
  scaleHeightR: 0.04,
  scaleHeightM: 0.02,
  mieG: 0.90,
  atmosphereScale: 1.02,
  sunIntensity: 12.0,
};

const FROZEN_PRESET: ScatteringParams = {
  betaRayleigh: new THREE.Vector3(8e-6, 6e-6, 3e-6),
  betaMie: 2e-6,
  scaleHeightR: 0.03,
  scaleHeightM: 0.005,
  mieG: 0.5,
  atmosphereScale: 1.005,
  sunIntensity: 6.0,
};

// Lerp two ScatteringParams
function lerpParams(a: ScatteringParams, b: ScatteringParams, t: number): ScatteringParams {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    betaRayleigh: a.betaRayleigh.clone().lerp(b.betaRayleigh, t),
    betaMie: l(a.betaMie, b.betaMie),
    scaleHeightR: l(a.scaleHeightR, b.scaleHeightR),
    scaleHeightM: l(a.scaleHeightM, b.scaleHeightM),
    mieG: l(a.mieG, b.mieG),
    atmosphereScale: l(a.atmosphereScale, b.atmosphereScale),
    sunIntensity: l(a.sunIntensity, b.sunIntensity),
  };
}

export function getScatteringPreset(type: PlanetType, hz: number = 0.5): ScatteringParams | null {
  switch (type) {
    case PlanetType.TEMPERATE: {
      // Interpolate across HZ: cold(Mars-like) → mid(Earth-like) → warm(Venus-transition)
      if (hz < 0.4) {
        const t = hz / 0.4;
        return lerpParams(MARS_PRESET, EARTH_PRESET, t);
      } else if (hz < 0.7) {
        const t = (hz - 0.4) / 0.3;
        return lerpParams(EARTH_PRESET, VENUS_TRANSITION_PRESET, t);
      } else {
        const t = (hz - 0.7) / 0.3;
        return lerpParams(VENUS_TRANSITION_PRESET, VENUS_PRESET, t);
      }
    }
    case PlanetType.VENUS_LIKE:
      return VENUS_PRESET;
    case PlanetType.WATER_WORLD:
      return WATER_WORLD_PRESET;
    case PlanetType.ICE_OCEAN_EYEBALL:
      return lerpParams(FROZEN_PRESET, WATER_WORLD_PRESET, 0.5);
    case PlanetType.LAVA_WORLD:
    case PlanetType.LAVA_EYEBALL:
      return LAVA_PRESET;
    case PlanetType.FROZEN:
      return FROZEN_PRESET;
    case PlanetType.SUB_NEPTUNE:
      return { ...WATER_WORLD_PRESET, betaMie: 30e-6, mieG: 0.80, scaleHeightM: 0.03, atmosphereScale: 1.05 };
    // Gas/ice giants: atmosphere IS the planet, no separate shell
    default:
      return null;
  }
}

// ---- GLSL ----

export function createScatteringMaterial(
  params: ScatteringParams,
  fallbackDayColor: THREE.Color,
  fallbackTwilightColor: THREE.Color,
  fallbackIntensity: number,
  planetRadius: number,
): UniformMaterial {
  const uniforms = toUniformNodes({
    uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
    uPlanetCenter: { value: new THREE.Vector3(0, 0, 0) },
    uPlanetRadius: { value: planetRadius },
    uAtmosRadius: { value: planetRadius * params.atmosphereScale },
    uBetaR: { value: params.betaRayleigh.clone() },
    uBetaM: { value: params.betaMie },
    uHr: { value: params.scaleHeightR },
    uHm: { value: params.scaleHeightM },
    uMieG: { value: params.mieG },
    uSunIntensity: { value: params.sunIntensity },
    // Fallback uniforms
    uAtmosDayColor: { value: fallbackDayColor },
    uAtmosTwilightColor: { value: fallbackTwilightColor },
    uFallbackIntensity: { value: fallbackIntensity },
    uShellFalloff: { value: 1.25 },
    uShellInner: { value: 0.0 },
  });
  // 0 = fallback, 8 = reduced, 16 = full ray-march (set per frame by the LOD logic) — an int loop bound
  uniforms.uSteps = TSL.uniform(0, "int");

  const { varying, positionWorld, modelNormalMatrix, normalGeometry } = TSL as any;
  const varyings = {
    vNormal: varying(modelNormalMatrix.mul(normalGeometry).normalize(), "vNormal"),
    vWorldPosition: varying(positionWorld, "vWorldPosition"),
  };

  const frag = buildScatteringFragment({ ...TSL, reference: (_p: string, _t: string, n: unknown) => n }, uniforms, varyings, {});
  const mat = new THREE.NodeMaterial() as UniformMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.side = THREE.BackSide;
  mat.fragmentNode = frag.fragMain();
  mat.uniforms = uniforms;
  return mat;
}
