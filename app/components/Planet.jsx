import * as THREE from "three";

// Cached LOD sphere geometries — keyed by "radius:segments"
const _lodSphereCache = {};
function getLodSphereGeo(radius, segments) {
  const key = `${radius.toFixed(6)}:${segments}`;
  if (_lodSphereCache[key]) return _lodSphereCache[key];
  const geo = new THREE.SphereGeometry(radius, segments, segments);
  _lodSphereCache[key] = geo;
  return geo;
}
// LOD tiers: [maxDistMultiplier, planetSegs, atmosSegs, vertLOD]
// vertLOD: 0=no displacement, 1=basic, 2=full displacement + normals
const LOD_TIERS = [
  [4,    512,  64, 2],    // close: full displacement + normals
  [12,   256,  64, 1],    // mid-close: basic displacement
  [30,   128,  64, 0],    // mid: no displacement, full fragment
  [60,   64,   48, 0],    // mid-range
  [Infinity, 32, 48, 0],  // far
];

// Shared annular ring geometry for soft glow — 128 segments, inner=0 outer=1
let _softGlowRingGeo = null;
function getSoftGlowRingGeo() {
  if (_softGlowRingGeo) return _softGlowRingGeo;
  const segments = 128;
  const positions = new Float32Array(3 * 2 * segments);
  let pi = 0;
  for (let a = 0; a < segments; a++) {
    const angle = (a / segments) * Math.PI * 2.0;
    const sx = Math.sin(angle), sy = Math.cos(angle);
    positions[pi++] = sx; positions[pi++] = sy; positions[pi++] = 0.0;
    positions[pi++] = sx; positions[pi++] = sy; positions[pi++] = 1.0;
  }
  const indices = new Uint16Array(2 * segments * 3);
  let oi = 0;
  for (let a = 0; a < segments; a++) {
    const i0 = 2 * a, i1 = 2 * a + 1;
    const i2 = 2 * ((a + 1) % segments), i3 = i2 + 1;
    indices[oi++] = i0; indices[oi++] = i1; indices[oi++] = i2;
    indices[oi++] = i2; indices[oi++] = i1; indices[oi++] = i3;
  }
  _softGlowRingGeo = new THREE.BufferGeometry();
  _softGlowRingGeo.setAttribute("aPos", new THREE.Float32BufferAttribute(positions, 3));
  _softGlowRingGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  return _softGlowRingGeo;
}

// Cached soft glow texture — shared across all planets, regenerated only when params change
let _softGlowTex = null;
let _softGlowParams = { falloff: -1, inner: -1 };
function getSoftGlowTexture(falloff, inner) {
  if (_softGlowTex && _softGlowParams.falloff === falloff && _softGlowParams.inner === inner) return _softGlowTex;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / c, dy = (y - c) / c;
      const d = Math.sqrt(dx * dx + dy * dy);
      let a = 0;
      if (d < 1.0) {
        const outer = Math.pow(1.0 - d, Math.max(0.1, falloff));
        const innerFade = inner > 0 && d < inner ? d / inner : 1.0;
        a = outer * innerFade * 255;
      }
      const i = (y * size + x) * 4;
      data[i] = 255; data[i+1] = 255; data[i+2] = 255;
      data[i+3] = Math.min(255, Math.max(0, a));
    }
  }
  if (_softGlowTex) _softGlowTex.dispose();
  _softGlowTex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  _softGlowTex.needsUpdate = true;
  _softGlowParams = { falloff, inner };
  return _softGlowTex;
}

import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useMemo } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import { getRingParams, createRingMaterial } from "../shaders/ringShader";
import { keplerPosition } from "../utils/kepler";
import {
  getSemimajoraxis,
  getPeriod,
  getEccentricity,
  getInclination,
  getPeriastron,
  getPhaseOffset,
  getEllipse,
  getPeriapsis,
  getMass,
  getRadius,
} from "../utils/helperFunctions";
import { classifyPlanet, PlanetType } from "../utils/planetClassification";
import { createPlanetMaterial, createCloudMaterial } from "../shaders/planetShader";
import { bakeTerrainMaps } from "../shaders/terrainTexture";
import { getAtmosphereParams } from "../shaders/atmosphereShader";
import { getScatteringPreset, createScatteringMaterial } from "../shaders/scatteringShader";
import LavaFlares from "./LavaFlares";

const _starWorldPos = new THREE.Vector3();
const _sunDirLocal = new THREE.Vector3();
const _invMatrix = new THREE.Matrix4();

const Planet = ({ data, starData, starRef }) => {
  const ref = useRef();
  const glowRef = useRef();
  const softGlowRef = useRef();
  const ringRef = useRef();
  const cloudRef = useRef();

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, planetDistanceFactor, atmosFalloff, glowFalloff, glowInner, glowHueShift, glowSaturation, spriteGlowInner, cloudCoverage, cloudOpacity, cloudSwirl, cloudBands, cloudWarp, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, terrCoastDetail, terrLandContrast, terrDisplaceScale, terrBumpStrength, eyeAridEdge, eyeIceEdge, eyeIceBergDensity, iceOceanPolarFade, iceOceanEdgeNoise, iceOceanCrackDepth, eyeSpiralTightness, eyeSpiralArms, eyeSpiralStrength, eyeEyeSize, eyeVegHue, eyeVegSat, eyeMoisture, lavaCrackDepth, lavaPoolSize, lavaHeatGrad, lavaWarp, lavaGlow, lavaHeightOffset, lavaFlowScale, shaderAmbient, lavaAmbient, wrapRange, wrapPower, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, setActivePlanetInfo, showOrbits, hzPresets } = useContext(EnvContext);

  // Pre-allocated vectors for per-frame camera updates
  const _camRight = useMemo(() => new THREE.Vector3(), []);
  const _camUp = useMemo(() => new THREE.Vector3(), []);
  const _camFwd = useMemo(() => new THREE.Vector3(), []);

  const name = data.name ? data.name[0] : "Unnamed planet";

  const semimajoraxis = getSemimajoraxis({ data, Constants }) * planetDistanceFactor;
  const period = getPeriod({ data });
  const eccentricity = getEccentricity({ data });
  const inclination = getInclination({ data });
  const mass = getMass({ data });
  const radius = getRadius({ data });
  const ellipse = getEllipse(semimajoraxis, eccentricity);
  const periapsis = getPeriapsis(semimajoraxis, eccentricity) - semimajoraxis;
  const phaseOffset = getPhaseOffset({ data, name });

  // Raw semi-major axis in AU (before scene scaling) for classification
  const rawSMA = (() => {
    const val = data.semimajoraxis?.[0]?.["_"] ?? data.semimajoraxis?.[0] ?? data.semimajoraxis;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 1 : parsed;
  })();

  // Classify planet and create shader material + atmosphere ring
  const { shaderMaterial, cloudMat, atmosParams, atmosMat, atmosScale, haloMat, planetType, hasAtmosphere, defaultShowRim, defaultShowShell, defaultShowHalo, rimIntensity, rimFalloff, shellIntensity, haloIntensity, haloScale, haloFalloff, haloWhiten, haloShadow, atmosDayColor, hasHzGradient, paramDisplaceScale, ringData } = useMemo(() => {
    const params = classifyPlanet({
      massJupiter: mass,
      radiusJupiter: radius,
      semimajorAxisAU: rawSMA,
      starTemp: starData?.temperature || 5500,
      starMass: starData?.mass || 1,
      starRadius: starData?.radius || 1,
      name,
      hzRanges: hzPresets,
      eccentricity,
    });
    const shader = createPlanetMaterial(params);
    const cloudMat = createCloudMaterial(params);
    // Pre-baked terrain textures: disabled for now — JS noise doesn't match
    // GLSL Perlin, causing mismatched height/biome. Future: GPU render-to-texture
    // to bake using the actual GLSL shader for identical output.
    // Atmosphere: use HZ-gradient params from classifier when available, fall back to type defaults
    const ap = getAtmosphereParams(params.type, starData?.temperature || 5500);
    const atmosDayCol = params.atmosDayColor || ap?.dayColor || new THREE.Color(0x00aaff);
    const atmosTwiCol = params.atmosTwilightColor || ap?.twilightColor || new THREE.Color(0xff6600);
    // Use classifier's atmosIntensity if set (even 0 means "no atmosphere");
    // only fall back to type defaults when classifier didn't set it (undefined)
    const hasHzAtmos = params.cloudCoverage !== undefined; // HZ gradient was applied
    const atmosInt = hasHzAtmos ? params.atmosIntensity : (params.atmosIntensity > 0 ? params.atmosIntensity : (ap?.intensity || 0));

    // Ring system
    const nameSeed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
    const ringSeed = ((nameSeed * 9301 + 49297) % 233280) / 233280;
    const ringParams = getRingParams(params.type, ringSeed, name);
    const ringMat = ringParams ? createRingMaterial(ringParams, ringSeed) : null;

    // Atmosphere — ray marching scattering with LOD fallback
    // Compute HZ position for scattering preset interpolation
    const hzRaw = params.stellarFlux > 0 ? Math.max(0, Math.min(1, (params.stellarFlux - 0.35) / (1.04 - 0.35))) : 0.5;
    const scatterPreset = getScatteringPreset(params.type, hzRaw);
    let atmosMat = null;
    if (scatterPreset && (atmosInt > 0 || params.type !== PlanetType.TEMPERATE)) {
      atmosMat = createScatteringMaterial(
        scatterPreset,
        atmosDayCol,
        atmosTwiCol,
        atmosInt,
        1.0, // planet radius in local units (scale applied via mesh)
      );
      atmosMat._baseSunIntensity = scatterPreset.sunIntensity; // preserve for slider scaling
    } else if (atmosInt > 0) {
      // Non-scattering fallback for types without presets
      atmosMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          uniform vec3 uSunDirection;
          uniform vec3 uAtmosDayColor;
          uniform vec3 uAtmosTwilightColor;
          uniform float uFallbackIntensity;
          uniform float uShellFalloff;
          uniform float uShellInner;
          void main() {
            vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
            vec3 normal = normalize(vNormal);
            float sunOrientation = dot(uSunDirection, normal);
            float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
            vec3 color = mix(uAtmosTwilightColor, uAtmosDayColor, atmosphereDayMix);
            // BackSide sphere: dot(view, normal) is high at centre, 0 at limb — invert for edge glow
            float edge = dot(viewDirection, normal);
            float edgeAlpha = pow(1.0 - smoothstep(0.0, 0.5, edge), uShellFalloff);
            float dayAlpha = smoothstep(-0.5, 0.0, sunOrientation);
            float alpha = edgeAlpha * dayAlpha * uFallbackIntensity;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        uniforms: {
          uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
          uAtmosDayColor: { value: atmosDayCol },
          uAtmosTwilightColor: { value: atmosTwiCol },
          uFallbackIntensity: { value: atmosInt },
          uShellFalloff: { value: 1.25 },
          uShellInner: { value: 0.0 },
        },
      });
    }

    // Stable halo material — uniforms updated via useEffect
    const haloColor = params.atmosDayColor ? params.atmosDayColor.clone().lerp(new THREE.Color(1, 1, 1), params.haloWhiten) : new THREE.Color(0.5, 0.7, 1.0);
    const hMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uRadius: { value: params.haloScale * 0.3 },
        uColor: { value: haloColor },
        uIntensity: { value: params.haloIntensity },
        uFalloff: { value: params.haloFalloff },
        uInner: { value: 0.0 },
        uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
        uHaloShadow: { value: params.haloShadow },
      },
      vertexShader: `
        attribute vec3 aPos;
        varying float vRadial;
        varying vec2 vRingDir;
        uniform float uRadius;
        void main() {
          vRadial = aPos.z;
          vRingDir = normalize(aPos.xy);
          vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float s = length(vec3(modelMatrix[0][0], modelMatrix[1][0], modelMatrix[2][0]));
          float r = (1.0 + aPos.z * uRadius) * s;
          vec3 viewPos = mvCenter.xyz + vec3(aPos.x * r, aPos.y * r, 0.0);
          gl_Position = projectionMatrix * vec4(viewPos, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vRadial;
        varying vec2 vRingDir;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uFalloff;
        uniform float uInner;
        uniform vec3 uSunDirection;
        uniform float uHaloShadow;
        void main() {
          float alpha = pow(1.0 - vRadial, uFalloff);
          if (uInner > 0.001) alpha *= smoothstep(0.0, uInner, vRadial);

          // Sun shadow on halo — gentle cosine fade, no hard edges
          vec3 sunView = normalize(mat3(viewMatrix) * uSunDirection);
          float sunDot = dot(vRingDir, sunView.xy);
          float shadow = clamp(sunDot * (1.0 - uHaloShadow) * 0.5 + 0.5 + uHaloShadow * 0.5, 0.0, 1.0);
          alpha *= shadow;

          alpha *= uIntensity;
          gl_FragColor = vec4(uColor * alpha, alpha);
        }
      `,
    });

    return {
      shaderMaterial: shader,
      cloudMat,
      atmosParams: ap,
      atmosMat,
      atmosScale: scatterPreset?.atmosphereScale || (1.0 + 0.04),
      haloMat: hMat,
      planetType: params.type,
      hasAtmosphere: params.hasAtmosphere,
      defaultShowRim: params.showRim,
      defaultShowShell: params.showShell,
      defaultShowHalo: params.showHalo,
      rimIntensity: params.rimIntensity,
      rimFalloff: params.rimFalloff,
      shellIntensity: params.shellIntensity,
      haloIntensity: params.haloIntensity,
      haloScale: params.haloScale,
      haloFalloff: params.haloFalloff,
      haloWhiten: params.haloWhiten,
      haloShadow: params.haloShadow,
      atmosDayColor: params.atmosDayColor?.clone(),
      hasHzGradient: params.hasHzGradient,
      paramDisplaceScale: params.displaceScale,
      ringData: ringParams ? { params: ringParams, material: ringMat } : null,
    };
  }, [mass, radius, rawSMA, starData?.temperature, starData?.mass, starData?.radius, name, hzPresets]);

  // Effective layer visibility: based on per-planet intensity from classification
  const effectiveRim = defaultShowRim && rimIntensity > 0;
  const effectiveShell = defaultShowShell && shellIntensity > 0;
  const effectiveHalo = haloIntensity > 0;


  useEffect(() => {
    addRef(name, "planet", ref);
  }, [name, addRef, ref]);

  // Update atmosphere colour when controls change
  useEffect(() => {
    if (!atmosMat) return;
    if (atmosParams?.dayColor) {
      const hsl = {};
      atmosParams.dayColor.getHSL(hsl);
      const shifted = new THREE.Color().setHSL(
        (hsl.h + glowHueShift) % 1.0,
        Math.min(1.0, hsl.s * glowSaturation),
        hsl.l
      );
      atmosMat.uniforms.uAtmosDayColor.value.copy(shifted);
    }
  }, [atmosMat, atmosParams, glowHueShift, glowSaturation]);

  const handleClick = (e) => {
    e.stopPropagation();
    setActive(ref);
    // Publish active planet's type and default colours for the UI picker
    if (shaderMaterial.uniforms.color1) {
      const toHex = (c) => '#' + c.getHexString();
      setActivePlanetInfo({
        type: planetType,
        colors: [
          toHex(shaderMaterial.uniforms.color1.value),
          toHex(shaderMaterial.uniforms.color2.value),
          toHex(shaderMaterial.uniforms.color3.value),
          toHex(shaderMaterial.uniforms.color4.value),
        ],
      });
    }
    // Log current settings as JSON for tuning
    const u = shaderMaterial.uniforms;
    console.log(JSON.stringify({
      planet: name,
      type: planetType,
      atmosphere: {
        rim: { intensity: parseFloat((rimIntensity || 0).toFixed(2)), falloff: parseFloat(atmosFalloff.toFixed(2)) },
        shell: { intensity: parseFloat((shellIntensity || 0).toFixed(2)), falloff: parseFloat(glowFalloff.toFixed(2)), inner: parseFloat(glowInner.toFixed(2)), hue: parseFloat(glowHueShift.toFixed(2)), sat: parseFloat(glowSaturation.toFixed(2)) },
        halo: { intensity: parseFloat((haloIntensity || 0).toFixed(2)), scale: parseFloat((haloScale || 0).toFixed(2)), falloff: parseFloat((haloFalloff || 0).toFixed(2)) },
      },
      clouds: { cover: parseFloat(cloudCoverage.toFixed(2)), opacity: parseFloat(cloudOpacity.toFixed(2)) },
      terrestrial: {
        seaLevel: parseFloat(terrSeaLevel.toFixed(2)),
        continentFreq: parseFloat(terrContinentFreq.toFixed(2)),
        warp: parseFloat(terrWarpStrength.toFixed(2)),
        iceCap: parseFloat(terrIceCapSize.toFixed(2)),
      },
      colors: u.color1 ? {
        ocean: '#' + u.color1.value.getHexString(),
        lowland: '#' + u.color2.value.getHexString(),
        highland: '#' + u.color3.value.getHexString(),
        peak: '#' + u.color4.value.getHexString(),
      } : null,
    }, null, 2));
  };

  /* Mass-radius relation: R ∝ M^0.55 for small planets (<124 M⊕), R ∝ M^0.01 for large */
  let scale = 1;

  if (mass > 0) {
    scale = mass;
    const earthMasses = mass * Constants.mass.jupiter_mass_in_earth_masses;
    if (earthMasses < 124) {
      scale = mass ** 0.55;
    } else {
      scale = mass ** 0.01;
    }
  }

  if (radius > 0) {
    scale = radius;
  }

  scale = scale * Constants.radius.jupiter * Constants.radius.scale;

  const speed = 0.0005;

  // Slider-driven uniforms — only update when values change, not every frame
  useEffect(() => {
    const u = shaderMaterial.uniforms;
    if (u.u_atmosIntensity) u.u_atmosIntensity.value = effectiveRim ? rimIntensity : 0;
    if (u.u_atmosFalloff) u.u_atmosFalloff.value = rimFalloff || atmosFalloff;
    // Clouds: only override from global sliders when HZ gradient is not active
    if (u.u_cloudCoverage && !hasHzGradient) {
      u.u_cloudCoverage.value = cloudCoverage;
      u.u_cloudOpacity.value = cloudOpacity;
      if (u.u_cloudSwirl) u.u_cloudSwirl.value = cloudSwirl;
      if (u.u_cloudBands) u.u_cloudBands.value = cloudBands;
      if (u.u_cloudWarp) u.u_cloudWarp.value = cloudWarp;
    }
    if (u.u_gasWarp) {
      const isIce = planetType === "ICE_GIANT" || planetType === "VENUS_LIKE" || planetType === "WATER_WORLD" || planetType === "SUB_NEPTUNE";
      u.swirl_strength.value = gasSwirl;
      u.u_gasWarp.value = isIce ? iceWarp : gasWarp;
      u.u_gasStorm.value = isIce ? iceStorm : gasStorm;
      u.u_gasTurb.value = isIce ? iceTurb : gasTurb;
      u.u_gasBands.value = isIce ? iceBands : gasBands;
      u.u_gasEdgeNoise.value = isIce ? iceEdgeNoise : gasEdgeNoise;
    }
    // Terrestrial: HZ planets get values from preset (via useMemo material creation);
    // non-HZ planets use global sliders as fallback
    if (u.u_seaLevel && !hasHzGradient) {
      u.u_seaLevel.value = terrSeaLevel;
      u.u_continentFreq.value = terrContinentFreq;
      u.u_terrWarp.value = terrWarpStrength;
      u.u_iceCapSize.value = terrIceCapSize;
      u.u_bumpStrength.value = terrBumpStrength;
      u.u_coastDetail.value = terrCoastDetail;
      u.u_landContrast.value = terrLandContrast;
    }
    // Eyeball planet controls
    if (u.u_eyeAridEdge) {
      // Don't overwrite ice/ocean eyeball presets (eyeAridEdge > 1.0 signals ice/ocean type)
      if (u.u_eyeAridEdge.value <= 1.0) {
        u.u_eyeAridEdge.value = eyeAridEdge;
      }
      u.u_eyeIceEdge.value = eyeIceEdge;
      u.u_eyeIceBergDensity.value = eyeIceBergDensity;
      if (u.u_iceOceanPolarFade) {
        u.u_iceOceanPolarFade.value = iceOceanPolarFade;
        u.u_iceOceanEdgeNoise.value = iceOceanEdgeNoise;
        u.u_iceOceanCrackDepth.value = iceOceanCrackDepth;
      }
      if (u.u_eyeVegHue) {
        u.u_eyeVegHue.value = eyeVegHue;
        u.u_eyeVegSat.value = eyeVegSat;
        u.u_eyeMoisture.value = eyeMoisture;
      }
    }
    // Lava eyeball controls
    if (u.u_lavaCrackDepth) {
      u.u_lavaCrackDepth.value = lavaCrackDepth;
      u.u_lavaPoolSize.value = lavaPoolSize;
      u.u_lavaHeatGrad.value = lavaHeatGrad;
    }
    if (u.u_craterScale) {
      u.u_craterScale.value = rockyCraterScale;
      u.u_ridgeStrength.value = rockyRidgeStrength;
      u.u_craterDepth.value = rockyCraterDepth;
    }
    if (u.u_lavaWarp) {
      u.u_lavaWarp.value = lavaWarp;
      u.u_lavaGlow.value = lavaGlow;
      u.u_lavaHeightOffset.value = lavaHeightOffset;
      u.u_lavaFlowScale.value = lavaFlowScale;
    }
    if (u.u_ambient) {
      u.u_ambient.value = shaderAmbient;
      u.u_lavaAmbient.value = lavaAmbient;
      u.u_wrapRange.value = wrapRange;
      u.u_wrapPower.value = wrapPower;
    }
    const typeColors = typeColorOverrides[planetType];
    if (typeColors) {
      if (u.color1) u.color1.value.set(typeColors[0]);
      if (u.color2) u.color2.value.set(typeColors[1]);
      if (u.color3) u.color3.value.set(typeColors[2]);
      if (u.color4) u.color4.value.set(typeColors[3]);
    }
    if (atmosMat?.uniforms.uFallbackIntensity) atmosMat.uniforms.uFallbackIntensity.value = shellIntensity;
    // Scale sun intensity: shellIntensity acts as a multiplier on the preset's base value
    if (atmosMat?.uniforms.uSunIntensity && atmosMat._baseSunIntensity != null) {
      atmosMat.uniforms.uSunIntensity.value = atmosMat._baseSunIntensity * shellIntensity;
    }
    if (atmosMat?.uniforms.uShellFalloff) atmosMat.uniforms.uShellFalloff.value = glowFalloff;
    if (atmosMat?.uniforms.uShellInner) atmosMat.uniforms.uShellInner.value = glowInner;
  }, [rimIntensity, atmosFalloff, glowFalloff, glowInner, cloudCoverage, cloudOpacity, cloudSwirl, cloudBands, cloudWarp,
      gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise,
      iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise,
      terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, terrCoastDetail, terrLandContrast, terrBumpStrength, eyeAridEdge, eyeIceEdge, eyeIceBergDensity,
      iceOceanPolarFade, iceOceanEdgeNoise, iceOceanCrackDepth,
      rockyCraterScale, rockyRidgeStrength, rockyCraterDepth,
      lavaWarp, lavaGlow, lavaHeightOffset, lavaFlowScale,
      shaderAmbient, lavaAmbient, wrapRange, wrapPower,
      typeColorOverrides, shellIntensity, haloIntensity, shaderMaterial, atmosMat, planetType]);

  // Halo uniforms — update stable material when per-planet values change
  useEffect(() => {
    if (haloMat?.uniforms) {
      const u = haloMat.uniforms;
      u.uRadius.value = haloScale * 0.3;
      u.uIntensity.value = haloIntensity;
      u.uFalloff.value = haloFalloff;
      u.uInner.value = spriteGlowInner;
      if (u.uHaloShadow) u.uHaloShadow.value = haloShadow;
      // Sync sun direction for halo shadow
      if (u.uSunDirection && shaderMaterial.uniforms.u_sunDirection) {
        u.uSunDirection.value.copy(shaderMaterial.uniforms.u_sunDirection.value);
      }
      // Update halo colour from classification atmosDayColor
      if (atmosDayColor) {
        u.uColor.value.copy(atmosDayColor).lerp(new THREE.Color(1, 1, 1), haloWhiten);
      }
    }
  }, [haloMat, haloIntensity, haloScale, haloFalloff, haloWhiten, haloShadow, atmosDayColor, spriteGlowInner, glowHueShift, glowSaturation, shaderMaterial]);

  // Per-frame: only orbital motion, time, LOD, sun direction, position sync
  useFrame((state) => {
    const elapsedTime = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.PI * 0.5;
    // Tidally locked planets don't rotate — one face always toward star
    if (!(shaderMaterial.uniforms.u_tidallyLocked?.value > 0.5)) {
      ref.current.rotation.y += 0.001;
    }
    // Keplerian orbit: mean anomaly linear in time, true anomaly varies (faster at periapsis)
    const meanAnomaly = (elapsedTime / period) * speed * 2 * Math.PI + phaseOffset;
    const kep = keplerPosition(meanAnomaly, eccentricity, semimajoraxis);
    ref.current.position.x = kep.x;
    ref.current.position.y = kep.y;

    // Update ribbon trail phase — normalised mean anomaly to match orbit line parameterisation
    if (orbitMat?.uniforms?.uPhase) {
      orbitMat.uniforms.uPhase.value = ((meanAnomaly % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
    }

    // Time + LOD — only animate active planet's clouds
    const isActive = activeRef?.current === ref.current;
    if (shaderMaterial.uniforms.u_time && isActive) {
      shaderMaterial.uniforms.u_time.value = elapsedTime;
    }
    if (shaderMaterial.uniforms.u_lod) {
      // LOD 1.0 = full detail (6 octaves + bump). Only for active planet at close range.
      // LOD 0.0 = reduced (3 octaves, no bump). For inactive or far planets.
      shaderMaterial.uniforms.u_lod.value = isActive ? 1.0 : 0.0;
      // Note: u_lod is further refined in the LOD tier loop below for active planets
    }
    // Sync cloud sphere uniforms
    if (cloudMat) {
      // Cloud time frozen — pattern is static, sphere rotation provides movement
      cloudMat.uniforms.u_lod.value = 1.0; // always full detail — cloud sphere only exists for temperate/water
      if (shaderMaterial.uniforms.u_sunDirection) {
        cloudMat.uniforms.u_sunDirection.value.copy(shaderMaterial.uniforms.u_sunDirection.value);
      }
      if (shaderMaterial.uniforms.u_sunDirectionLocal) {
        cloudMat.uniforms.u_sunDirectionLocal.value.copy(shaderMaterial.uniforms.u_sunDirectionLocal.value);
      }
      cloudMat.uniforms.u_wrapRange.value = shaderMaterial.uniforms.u_wrapRange?.value ?? 0.45;
      cloudMat.uniforms.u_wrapPower.value = shaderMaterial.uniforms.u_wrapPower?.value ?? 1.0;
      // Sync cloud params from planet shader (set by preset system)
      if (shaderMaterial.uniforms.u_cloudCoverage) {
        cloudMat.uniforms.u_cloudCoverage.value = shaderMaterial.uniforms.u_cloudCoverage.value;
        cloudMat.uniforms.u_cloudOpacity.value = shaderMaterial.uniforms.u_cloudOpacity.value;
        cloudMat.uniforms.u_cloudSwirl.value = shaderMaterial.uniforms.u_cloudSwirl.value;
        cloudMat.uniforms.u_cloudBands.value = shaderMaterial.uniforms.u_cloudBands.value;
        cloudMat.uniforms.u_cloudWarp.value = shaderMaterial.uniforms.u_cloudWarp.value;
      }
      if (cloudMat.uniforms.u_spiralTightness) {
        cloudMat.uniforms.u_spiralTightness.value = eyeSpiralTightness;
        cloudMat.uniforms.u_spiralArms.value = eyeSpiralArms;
        cloudMat.uniforms.u_spiralStrength.value = eyeSpiralStrength;
        cloudMat.uniforms.u_eyeSize.value = eyeEyeSize;
      }
    }

    // Geometry LOD — throttle checks for non-active planets
    const frameCount = Math.round(state.clock.elapsedTime * 60);
    if (ref.current && (isActive || frameCount % 30 === 0)) {
      ref.current.getWorldPosition(_camUp);
      const camDist = state.camera.position.distanceTo(_camUp);
      for (const [maxDistMult, pSegs, aSegs, vertLOD] of LOD_TIERS) {
        const maxDist = maxDistMult === Infinity ? Infinity : maxDistMult * scale;
        if (camDist < maxDist || maxDist === Infinity) {
          const newGeo = getLodSphereGeo(scale, pSegs);
          if (ref.current.geometry !== newGeo) ref.current.geometry = newGeo;
          if (glowRef.current) {
            const newAtmosGeo = getLodSphereGeo(scale * atmosScale, aSegs);
            if (glowRef.current.geometry !== newAtmosGeo) glowRef.current.geometry = newAtmosGeo;
          }
          // Vertex displacement: only for active (selected) planet
          if (shaderMaterial.uniforms.u_displace) {
            const dScale = hasHzGradient && paramDisplaceScale != null ? paramDisplaceScale : terrDisplaceScale;
            shaderMaterial.uniforms.u_displace.value = (isActive && vertLOD > 0) ? scale * dScale : 0;
          }
          if (shaderMaterial.uniforms.u_vertLOD) {
            shaderMaterial.uniforms.u_vertLOD.value = isActive ? vertLOD : 0;
          }
          // Refine fragment LOD: skip expensive bump at far tiers (64/32 segs)
          if (isActive && shaderMaterial.uniforms.u_lod) {
            shaderMaterial.uniforms.u_lod.value = (pSegs >= 128) ? 1.0 : 0.0;
          }
          break;
        }
      }
    }

    // Sun direction — pass world-space, shader transforms to match normalMatrix space
    if (ref.current) {
      ref.current.getWorldPosition(_camUp); // planet world pos
      // World-space direction: planet → actual star position
      if (starRef?.current) {
        starRef.current.getWorldPosition(_starWorldPos);
      } else {
        _starWorldPos.set(0, 0, 0);
      }
      const sunDirWorld = _camRight.copy(_starWorldPos).sub(_camUp).normalize();
      if (shaderMaterial.uniforms.u_sunDirection) {
        shaderMaterial.uniforms.u_sunDirection.value.copy(sunDirWorld);
      }
      // Transform sun direction to object space for eyeball biome mapping
      if (shaderMaterial.uniforms.u_sunDirectionLocal) {
        _invMatrix.copy(ref.current.matrixWorld).invert();
        _sunDirLocal.copy(sunDirWorld).transformDirection(_invMatrix).normalize();
        shaderMaterial.uniforms.u_sunDirectionLocal.value.copy(_sunDirLocal);
      }
      // Atmosphere uses world-space (negated convention)
      if (atmosMat) {
        atmosMat.uniforms.uSunDirection.value.copy(sunDirWorld).negate();
      }
      // Distance-based ambient: closer to star = more reflected light
      if (shaderMaterial.uniforms.u_ambient) {
        const dist = _camUp.distanceTo(_starWorldPos);
        // Inverse square falloff, clamped. Inner planets ~2x base ambient, outer planets ~0.5x
        const distFactor = Math.min(2.0, 1000.0 / Math.max(dist, 100));
        const isLava = shaderMaterial.uniforms.emissiveIntensity?.value > 0.01;
        const baseAmbient = isLava ? lavaAmbient : shaderAmbient;
        shaderMaterial.uniforms.u_ambient.value = baseAmbient * distFactor;
        if (shaderMaterial.uniforms.u_lavaAmbient) {
          shaderMaterial.uniforms.u_lavaAmbient.value = lavaAmbient * distFactor;
        }
      }
      // Scattering-specific uniforms (only present on scattering materials)
      if (atmosMat && atmosMat.uniforms.uPlanetCenter) {
        atmosMat.uniforms.uPlanetCenter.value.copy(_camUp); // planet world position
        atmosMat.uniforms.uPlanetRadius.value = scale;
        atmosMat.uniforms.uAtmosRadius.value = scale * atmosScale;
        // Use sharp day/twilight fallback (uSteps=0) — ray march is too subtle for thin atmospheres
        atmosMat.uniforms.uSteps.value = 0;
      }
    }

    // Sync glow positions with orbiting planet
    if (glowRef.current) glowRef.current.position.copy(ref.current.position);
    if (cloudRef.current) {
      cloudRef.current.position.copy(ref.current.position);
      cloudRef.current.rotation.x = ref.current.rotation.x;
      cloudRef.current.rotation.y += 0.0009;
      // Distance cull: hide clouds when far away (saves ~2ms per planet)
      ref.current.getWorldPosition(_camRight);
      const cloudDist = state.camera.position.distanceTo(_camRight);
      cloudRef.current.visible = cloudDist < scale * 8.0;
    }
    if (ringRef.current && ringData) {
      ringRef.current.position.copy(ref.current.position);
      const rm = ringRef.current.material;
      if (rm.uniforms.u_sunDirection) {
        rm.uniforms.u_sunDirection.value.copy(shaderMaterial.uniforms.u_sunDirection.value);
      }
      rm.uniforms.u_innerRadius.value = scale * ringData.params.innerRadius;
      rm.uniforms.u_outerRadius.value = scale * ringData.params.outerRadius;
      // Planet shadow: pass world position and radius
      ref.current.getWorldPosition(rm.uniforms.u_planetPos.value);
      rm.uniforms.u_planetRadius.value = scale;
    }
    if (softGlowRef.current) {
      softGlowRef.current.position.copy(ref.current.position);
      // Sync sun direction for halo shadow
      if (haloMat?.uniforms.uSunDirection && shaderMaterial.uniforms.u_sunDirection) {
        haloMat.uniforms.uSunDirection.value.copy(shaderMaterial.uniforms.u_sunDirection.value);
      }
    }
  });

  const position = [0, 0, 0]; // star at focus, keplerPosition handles offset
  // Orbit line with per-vertex alpha for taper effect
  const orbitLine = useRef();
  const { orbitGeo, orbitMat } = useMemo(() => {
    const circumference = Math.PI * (ellipse.xRadius + ellipse.yRadius);
    const segments = Math.max(256, Math.min(8192, Math.round(circumference * 4.0)));
    // Generate orbit from Kepler positions so line matches planet motion
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const M = (i / segments) * Math.PI * 2;
      const { x, y } = keplerPosition(M, eccentricity, semimajoraxis);
      points.push(new THREE.Vector3(x, y, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);

    // Store normalized mean anomaly (0→1) per vertex — linear, no wrapping issues
    const tValues = new Float32Array(segments + 1);
    for (let i = 0; i <= segments; i++) {
      tValues[i] = i / segments;
    }
    geo.setAttribute("aT", new THREE.BufferAttribute(tValues, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPhase: { value: 0 },
      },
      vertexShader: `
        attribute float aT;
        varying float vT;
        void main() {
          vT = aT;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vT;
        uniform float uPhase;
        void main() {
          // How far behind the planet (0=at planet, 1=full orbit)
          float dist = vT - uPhase;
          if (dist < 0.0) dist += 1.0;

          // 75% trail: fade opacity along entire length, taper at end
          float taper = 1.0 - smoothstep(0.65, 0.75, dist);
          float fade = 1.0 - dist / 0.75; // linear fade from planet to tail
          float alpha = taper * fade * 0.3;
          if (alpha < 0.005) discard;

          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
    });

    return { orbitGeo: geo, orbitMat: mat };
  }, [semimajoraxis, eccentricity]);

  return (
    <group position={position} rotation={[(inclination * Math.PI) / 90, 0, 0]}>
      {showOrbits && (
        <line geometry={orbitGeo} material={orbitMat} />
      )}
      <mesh ref={ref} name={name} onClick={handleClick} material={shaderMaterial}
        geometry={getLodSphereGeo(scale, 32)}>
        {planetType === PlanetType.LAVA_EYEBALL && (
          <LavaFlares radius={scale} sourceMaterial={shaderMaterial} />
        )}
      </mesh>
      {cloudMat && (
        <mesh ref={cloudRef} material={cloudMat} frustumCulled={false}>
          <sphereGeometry args={[scale * (1.0 + (hasHzGradient && paramDisplaceScale != null ? paramDisplaceScale : terrDisplaceScale) + 0.006), 64, 32]} />
        </mesh>
      )}
      {ringData && (
        <mesh
          ref={ringRef}
          material={ringData.material}
          rotation={[Math.PI / 2 + ringData.params.tilt, 0, 0]}
          frustumCulled={false}
        >
          <ringGeometry args={[scale * ringData.params.innerRadius, scale * ringData.params.outerRadius, 128, 1]} />
        </mesh>
      )}
      {effectiveShell && atmosMat && shellIntensity > 0 && (
          /* BackSide atmosphere sphere — crisp day/twilight structure */
          <mesh
            ref={glowRef}
            material={atmosMat}
            frustumCulled={false}
          >
            <sphereGeometry args={[scale * atmosScale, 48, 48]} />
          </mesh>
      )}
      {/* Soft outer glow — annular ring billboard */}
      {effectiveHalo && haloMat && (
          <mesh
            ref={softGlowRef}
            geometry={getSoftGlowRingGeo()}
            material={haloMat}
            frustumCulled={false}
            renderOrder={2}
            scale={[scale, scale, scale]}
          />
      )}
    </group>
  );
};

export default Planet;
