import * as THREE from "three";
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
    case PlanetType.LAVA_WORLD:
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

const scatteringVertex = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Ray marching atmospheric scattering fragment shader
// Adapted from wwwtyro/glsl-atmosphere (MIT license)
const scatteringFragment = `
  precision highp float;

  #define PI 3.141592653589793

  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  uniform vec3 uSunDirection;
  uniform vec3 uPlanetCenter;
  uniform float uPlanetRadius;
  uniform float uAtmosRadius;
  uniform vec3 uBetaR;           // Rayleigh scattering coefficients
  uniform float uBetaM;          // Mie scattering coefficient
  uniform float uHr;             // Rayleigh scale height
  uniform float uHm;             // Mie scale height
  uniform float uMieG;           // Henyey-Greenstein g parameter
  uniform float uSunIntensity;
  uniform int uSteps;            // 0 = fallback, 8 = reduced, 16 = full

  // Fallback uniforms (cheap path)
  uniform vec3 uAtmosDayColor;
  uniform vec3 uAtmosTwilightColor;
  uniform float uFallbackIntensity;

  // Ray-sphere intersection (sphere at origin)
  vec2 rsi(vec3 r0, vec3 rd, float sr) {
    float a = dot(rd, rd);
    float b = 2.0 * dot(rd, r0);
    float c = dot(r0, r0) - sr * sr;
    float d = b * b - 4.0 * a * c;
    if (d < 0.0) return vec2(1e5, -1e5);
    float sd = sqrt(d);
    return vec2((-b - sd) / (2.0 * a), (-b + sd) / (2.0 * a));
  }

  // Cheap fallback: smoothstep day/twilight (existing Layer 2 logic)
  vec4 cheapAtmosphere() {
    vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    float sunOrientation = dot(uSunDirection, normal);
    float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
    vec3 color = mix(uAtmosTwilightColor, uAtmosDayColor, atmosphereDayMix);
    float edgeAlpha = smoothstep(0.0, 0.5, dot(viewDirection, normal));
    float dayAlpha = smoothstep(-0.5, 0.0, sunOrientation);
    float alpha = edgeAlpha * dayAlpha * uFallbackIntensity;
    return vec4(color, alpha);
  }

  void main() {
    // Fallback path for distant/tiny planets
    if (uSteps < 1) {
      gl_FragColor = cheapAtmosphere();
      return;
    }

    // Ray setup: camera through this fragment, in planet-local space
    vec3 rayOrigin = cameraPosition - uPlanetCenter;
    vec3 rayDir = normalize(vWorldPosition - cameraPosition);

    // Intersect with atmosphere sphere
    vec2 atmos = rsi(rayOrigin, rayDir, uAtmosRadius);
    if (atmos.x > atmos.y) { discard; return; }

    // Clip to planet surface (don't march through the planet)
    vec2 planet = rsi(rayOrigin, rayDir, uPlanetRadius);
    float marchEnd = (planet.x > 0.0) ? min(atmos.y, planet.x) : atmos.y;
    float marchStart = max(atmos.x, 0.0);

    if (marchEnd <= marchStart) { discard; return; }

    float stepSize = (marchEnd - marchStart) / float(uSteps);
    int halfSteps = uSteps / 2;
    if (halfSteps < 1) halfSteps = 1;

    // Phase functions
    float mu = dot(rayDir, uSunDirection);
    float mu2 = mu * mu;
    float g2 = uMieG * uMieG;
    float phaseR = 3.0 / (16.0 * PI) * (1.0 + mu2);
    float phaseM = 3.0 / (8.0 * PI) * ((1.0 - g2) * (mu2 + 1.0)) /
                   (pow(1.0 + g2 - 2.0 * mu * uMieG, 1.5) * (2.0 + g2));

    // Accumulators
    vec3 totalR = vec3(0.0);
    vec3 totalM = vec3(0.0);
    float odR = 0.0;
    float odM = 0.0;

    // Primary ray march
    float t = marchStart;
    for (int i = 0; i < 16; i++) {
      if (i >= uSteps) break;
      vec3 pos = rayOrigin + rayDir * (t + stepSize * 0.5);
      float h = length(pos) - uPlanetRadius;
      float hr = max(h / (uPlanetRadius * uHr), 0.0);
      float hm = max(h / (uPlanetRadius * uHm), 0.0);
      float dR = exp(-hr) * stepSize;
      float dM = exp(-hm) * stepSize;
      odR += dR;
      odM += dM;

      // Secondary ray march toward sun
      float sunStepSize = rsi(pos, uSunDirection, uAtmosRadius).y / float(halfSteps);
      float sOdR = 0.0, sOdM = 0.0;
      float st = 0.0;
      for (int j = 0; j < 8; j++) {
        if (j >= halfSteps) break;
        vec3 sPos = pos + uSunDirection * (st + sunStepSize * 0.5);
        float sH = length(sPos) - uPlanetRadius;
        sOdR += exp(-max(sH / (uPlanetRadius * uHr), 0.0)) * sunStepSize;
        sOdM += exp(-max(sH / (uPlanetRadius * uHm), 0.0)) * sunStepSize;
        st += sunStepSize;
      }

      vec3 attn = exp(-(uBetaM * (odM + sOdM) + uBetaR * (odR + sOdR)));
      totalR += dR * attn;
      totalM += dM * attn;

      t += stepSize;
    }

    vec3 scatter = uSunIntensity * (phaseR * uBetaR * totalR + phaseM * uBetaM * totalM);

    // Optical depth for alpha (how opaque the atmosphere is along this ray)
    float totalOd = dot(uBetaR, vec3(odR)) / 3.0 + uBetaM * odM;
    float alpha = 1.0 - exp(-totalOd * 2.0);

    gl_FragColor = vec4(scatter, clamp(alpha, 0.0, 1.0));
  }
`;

export function createScatteringMaterial(
  params: ScatteringParams,
  fallbackDayColor: THREE.Color,
  fallbackTwilightColor: THREE.Color,
  fallbackIntensity: number,
  planetRadius: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: scatteringVertex,
    fragmentShader: scatteringFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    uniforms: {
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
      uSteps: { value: 0 }, // start in fallback, useFrame sets LOD
      // Fallback uniforms
      uAtmosDayColor: { value: fallbackDayColor },
      uAtmosTwilightColor: { value: fallbackTwilightColor },
      uFallbackIntensity: { value: fallbackIntensity },
    },
  });
}
