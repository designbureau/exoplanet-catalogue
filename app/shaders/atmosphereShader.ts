import * as THREE from "three";
import { PlanetType } from "~/utils/planetClassification";

export interface AtmosphereParams {
  color: THREE.Color;
  intensity: number;
  thickness: number;
}

export function getAtmosphereParams(type: PlanetType, starTemp: number): AtmosphereParams | null {
  switch (type) {
    case PlanetType.TEMPERATE:
      return { color: new THREE.Color(0.3, 0.5, 1.0), intensity: 1.0, thickness: 1.15 };
    case PlanetType.VENUS_LIKE:
      return { color: new THREE.Color(0.8, 0.6, 0.25), intensity: 1.2, thickness: 1.2 };
    case PlanetType.SUB_NEPTUNE:
      return { color: new THREE.Color(0.35, 0.45, 0.65), intensity: 1.0, thickness: 1.18 };
    case PlanetType.WATER_WORLD:
      return { color: new THREE.Color(0.2, 0.4, 0.75), intensity: 1.0, thickness: 1.15 };
    case PlanetType.COLD_GIANT:
      return { color: new THREE.Color(0.6, 0.45, 0.25), intensity: 0.6, thickness: 1.08 };
    case PlanetType.COOL_GIANT:
      return { color: new THREE.Color(0.65, 0.65, 0.6), intensity: 0.5, thickness: 1.08 };
    case PlanetType.WARM_GIANT:
      return { color: new THREE.Color(0.3, 0.4, 0.7), intensity: 0.6, thickness: 1.08 };
    case PlanetType.HOT_JUPITER_IV:
      return { color: new THREE.Color(0.15, 0.1, 0.25), intensity: 0.5, thickness: 1.1 };
    case PlanetType.HOT_JUPITER_V:
      return { color: new THREE.Color(0.8, 0.4, 0.1), intensity: 0.8, thickness: 1.12 };
    case PlanetType.ICE_GIANT:
      return { color: new THREE.Color(0.2, 0.45, 0.7), intensity: 0.7, thickness: 1.1 };
    case PlanetType.LAVA_WORLD:
      return { color: new THREE.Color(0.9, 0.3, 0.05), intensity: 0.6, thickness: 1.08 };
    case PlanetType.FROZEN:
      return { color: new THREE.Color(0.4, 0.5, 0.7), intensity: 0.3, thickness: 1.05 };
    case PlanetType.HOT_ROCKY:
      return null;
    default:
      return null;
  }
}

// Generate a radial gradient texture with configurable falloff and inner cutout
// Returns a new texture each time params change
let _lastFalloff = -1;
let _lastInner = -1;
let _glowTexture: THREE.DataTexture | null = null;

export function getGlowTexture(falloff: number = 1.5, inner: number = 0.3): THREE.DataTexture {
  // Cache: only regenerate if params changed
  if (_glowTexture && _lastFalloff === falloff && _lastInner === inner) return _glowTexture;

  const size = 512;
  const data = new Uint8Array(size * size * 4);
  const centre = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - centre) / centre;
      const dy = (y - centre) / centre;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let alpha = 0;
      if (dist < 1.0) {
        // Outer falloff: controls how quickly glow fades at edges
        let outerGlow = Math.pow(1.0 - dist, falloff);
        // Inner cutout: fade out the centre so the planet shows through
        let innerFade = dist < inner ? (dist / inner) : 1.0;
        innerFade = Math.pow(innerFade, 0.5); // soften the inner edge
        alpha = outerGlow * innerFade * 255;
      }

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.min(255, Math.max(0, alpha));
    }
  }

  if (_glowTexture) _glowTexture.dispose();
  _glowTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  _glowTexture.needsUpdate = true;
  _lastFalloff = falloff;
  _lastInner = inner;
  return _glowTexture;
}

export function createGlowSpriteMaterial(params: AtmosphereParams, falloff: number = 1.5, inner: number = 0.3): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: getGlowTexture(falloff, inner),
    color: params.color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: params.intensity,
  });
}

// Update existing material's texture when glow shape params change
export function updateGlowTexture(material: THREE.SpriteMaterial, falloff: number, inner: number): void {
  material.map = getGlowTexture(falloff, inner);
  material.needsUpdate = true;
}
