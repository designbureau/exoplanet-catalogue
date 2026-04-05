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
// LOD tiers: [maxDistance, planetSegs, atmosSegs]
const LOD_TIERS = [
  [80,   128, 96],   // close-up: full detail
  [400,  64,  48],   // mid-range
  [Infinity, 32, 24] // far away
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
import {
  getSemimajoraxis,
  getPeriod,
  getEccentricity,
  getInclination,
  getPeriastron,
  getEllipse,
  getPeriapsis,
  getMass,
  getRadius,
} from "../utils/helperFunctions";
import { classifyPlanet, PlanetType } from "../utils/planetClassification";
import { createPlanetMaterial } from "../shaders/planetShader";
import { getAtmosphereParams } from "../shaders/atmosphereShader";
import { getScatteringPreset, createScatteringMaterial } from "../shaders/scatteringShader";

const _starWorldPos = new THREE.Vector3();

const Planet = ({ data, starData, starRef }) => {
  const ref = useRef();
  const glowRef = useRef();
  const softGlowRef = useRef();
  const ringRef = useRef();

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, planetDistanceFactor, atmosFalloff, glowFalloff, glowHueShift, glowSaturation, spriteGlowScale, spriteGlowFalloff, spriteGlowInner, cloudCoverage, cloudOpacity, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, lavaWarp, lavaGlow, lavaHeightOffset, lavaFlowScale, shaderAmbient, lavaAmbient, wrapRange, wrapPower, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, setActivePlanetInfo, showOrbits, hzPresets } = useContext(EnvContext);

  const softGlowTexture = getSoftGlowTexture(spriteGlowFalloff, spriteGlowInner);

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

  // Raw semi-major axis in AU (before scene scaling) for classification
  const rawSMA = (() => {
    const val = data.semimajoraxis?.[0]?.["_"] ?? data.semimajoraxis?.[0] ?? data.semimajoraxis;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 1 : parsed;
  })();

  // Classify planet and create shader material + atmosphere ring
  const { shaderMaterial, atmosParams, atmosMat, atmosScale, planetType, hasAtmosphere, defaultShowRim, defaultShowShell, defaultShowHalo, rimIntensity, shellIntensity, haloIntensity, hasHzGradient, ringData } = useMemo(() => {
    const params = classifyPlanet({
      massJupiter: mass,
      radiusJupiter: radius,
      semimajorAxisAU: rawSMA,
      starTemp: starData?.temperature || 5500,
      starMass: starData?.mass || 1,
      starRadius: starData?.radius || 1,
      name,
      hzRanges: hzPresets,
    });
    const shader = createPlanetMaterial(params);
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
          void main() {
            vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
            vec3 normal = normalize(vNormal);
            float sunOrientation = dot(uSunDirection, normal);
            float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
            vec3 color = mix(uAtmosTwilightColor, uAtmosDayColor, atmosphereDayMix);
            float edgeAlpha = smoothstep(0.0, 0.5, dot(viewDirection, normal));
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
        },
      });
    }

    return {
      shaderMaterial: shader,
      atmosParams: ap,
      atmosMat,
      atmosScale: scatterPreset?.atmosphereScale || (1.0 + 0.04),
      planetType: params.type,
      hasAtmosphere: params.hasAtmosphere,
      defaultShowRim: params.showRim,
      defaultShowShell: params.showShell,
      defaultShowHalo: params.showHalo,
      rimIntensity: params.rimIntensity,
      shellIntensity: params.shellIntensity,
      haloIntensity: params.haloIntensity,
      hasHzGradient: params.hasHzGradient,
      ringData: ringParams ? { params: ringParams, material: ringMat } : null,
    };
  }, [mass, radius, rawSMA, starData?.temperature, starData?.mass, starData?.radius, name, hzPresets]);

  // Effective layer visibility: based on per-planet intensity from classification
  const effectiveRim = defaultShowRim && rimIntensity > 0;
  const effectiveShell = defaultShowShell && shellIntensity > 0;
  const effectiveHalo = defaultShowHalo && haloIntensity > 0;

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
        rim: { intensity: parseFloat(atmosIntensity.toFixed(2)), falloff: parseFloat(atmosFalloff.toFixed(2)) },
        shell: { intensity: parseFloat(glowIntensity.toFixed(2)), scale: parseFloat(glowScale.toFixed(2)), falloff: parseFloat(glowFalloff.toFixed(2)), inner: parseFloat(glowInner.toFixed(2)), hue: parseFloat(glowHueShift.toFixed(2)), sat: parseFloat(glowSaturation.toFixed(2)) },
        halo: { intensity: parseFloat(spriteGlowIntensity.toFixed(2)), scale: parseFloat(spriteGlowScale.toFixed(2)), falloff: parseFloat(spriteGlowFalloff.toFixed(2)), inner: parseFloat(spriteGlowInner.toFixed(2)) },
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
    if (u.u_atmosFalloff) u.u_atmosFalloff.value = atmosFalloff;
    // Clouds: only override from global sliders when HZ gradient is not active
    if (u.u_cloudCoverage && !hasHzGradient) {
      u.u_cloudCoverage.value = cloudCoverage;
      u.u_cloudOpacity.value = cloudOpacity;
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
    // Terrestrial: only override from global sliders when HZ gradient is not active
    if (u.u_seaLevel && !hasHzGradient) {
      u.u_seaLevel.value = terrSeaLevel;
      u.u_continentFreq.value = terrContinentFreq;
      u.u_terrWarp.value = terrWarpStrength;
      u.u_iceCapSize.value = terrIceCapSize;
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
    if (atmosMat?.uniforms.uSunIntensity) atmosMat.uniforms.uSunIntensity.value = shellIntensity * 24.0;
  }, [rimIntensity, atmosFalloff, cloudCoverage, cloudOpacity,
      gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise,
      iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise,
      terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize,
      rockyCraterScale, rockyRidgeStrength, rockyCraterDepth,
      lavaWarp, lavaGlow, lavaHeightOffset, lavaFlowScale,
      shaderAmbient, lavaAmbient, wrapRange, wrapPower,
      typeColorOverrides, shellIntensity, haloIntensity, shaderMaterial, atmosMat, planetType]);

  // Soft glow uniforms — only when those sliders change
  useEffect(() => {
    if (softGlowRef.current?.material?.uniforms) {
      const sgU = softGlowRef.current.material.uniforms;
      sgU.uRadius.value = spriteGlowScale * 0.3;
      sgU.uIntensity.value = haloIntensity;
      sgU.uFalloff.value = spriteGlowFalloff;
    }
  }, [spriteGlowScale, haloIntensity, spriteGlowFalloff]);

  // Per-frame: only orbital motion, time, LOD, sun direction, position sync
  useFrame((state) => {
    const elapsedTime = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.PI * 0.5;
    ref.current.rotation.y += 0.001;
    ref.current.position.x =
      ellipse.xRadius * Math.cos((elapsedTime / period) * speed);
    ref.current.position.y =
      ellipse.yRadius * Math.sin((elapsedTime / period) * speed);

    // Update ribbon trail phase to follow planet
    if (orbitMat?.uniforms?.uPhase) {
      const orbitAngle = ((elapsedTime / period) * speed) % (Math.PI * 2);
      orbitMat.uniforms.uPhase.value = orbitAngle / (Math.PI * 2);
    }

    // Time + LOD — only animate active planet's clouds
    const isActive = activeRef?.current === ref.current;
    if (shaderMaterial.uniforms.u_time && isActive) {
      shaderMaterial.uniforms.u_time.value = elapsedTime;
    }
    if (shaderMaterial.uniforms.u_lod) {
      shaderMaterial.uniforms.u_lod.value = isActive ? 1.0 : 0.0;
    }

    // Geometry LOD — swap sphere resolution based on camera distance
    if (ref.current) {
      ref.current.getWorldPosition(_camUp);
      const camDist = state.camera.position.distanceTo(_camUp);
      for (const [maxDist, pSegs, aSegs] of LOD_TIERS) {
        if (camDist < maxDist || maxDist === Infinity) {
          const newGeo = getLodSphereGeo(scale, pSegs);
          if (ref.current.geometry !== newGeo) ref.current.geometry = newGeo;
          if (glowRef.current) {
            const newAtmosGeo = getLodSphereGeo(scale * atmosScale, aSegs);
            if (glowRef.current.geometry !== newAtmosGeo) glowRef.current.geometry = newAtmosGeo;
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
        // LOD: full scatter on active planet, reduced on visible, fallback on tiny
        atmosMat.uniforms.uSteps.value = isActive ? 16 : 8;
      }
    }

    // Sync glow positions with orbiting planet
    if (glowRef.current) glowRef.current.position.copy(ref.current.position);
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
    if (softGlowRef.current) softGlowRef.current.position.copy(ref.current.position);
  });

  const position = [periapsis, 0, 0];
  // Orbit line with per-vertex alpha for taper effect
  const orbitLine = useRef();
  const { orbitGeo, orbitMat } = useMemo(() => {
    const circumference = Math.PI * (ellipse.xRadius + ellipse.yRadius);
    const segments = Math.max(128, Math.min(512, Math.round(circumference * 0.5)));
    const curve = new THREE.EllipseCurve(0, 0, ellipse.xRadius, ellipse.yRadius, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(segments);
    const geo = new THREE.BufferGeometry().setFromPoints(points);

    // Store normalized t (0→1) per vertex for the shader taper
    const tValues = new Float32Array(segments + 1);
    for (let i = 0; i <= segments; i++) tValues[i] = i / segments;
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

          // 98% visible: full for first 90%, taper over next 8%, tiny 2% gap
          float taper = 1.0 - smoothstep(0.90, 0.98, dist);
          if (taper < 0.01) discard;

          gl_FragColor = vec4(1.0, 1.0, 1.0, taper * 0.25);
        }
      `,
    });

    return { orbitGeo: geo, orbitMat: mat };
  }, [ellipse.xRadius, ellipse.yRadius]);

  return (
    <group position={position} rotation={[(inclination * Math.PI) / 90, 0, 0]}>
      {showOrbits && (
        <line geometry={orbitGeo} material={orbitMat} />
      )}
      <mesh ref={ref} name={name} onClick={handleClick} material={shaderMaterial}
        geometry={getLodSphereGeo(scale, 32)} />
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
            <sphereGeometry args={[scale * atmosScale, 24, 24]} />
          </mesh>
      )}
      {/* Soft outer glow — annular ring billboard */}
      {effectiveHalo && haloIntensity > 0 && shaderMaterial.uniforms.u_atmosDayColor && (
          <mesh
            ref={softGlowRef}
            geometry={getSoftGlowRingGeo()}
            frustumCulled={false}
            renderOrder={2}
            scale={[scale, scale, scale]}
          >
            <shaderMaterial
              transparent
              depthWrite={false}
              depthTest={true}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              uniforms={{
                uRadius: { value: spriteGlowScale * 0.3 },
                uColor: { value: shaderMaterial.uniforms.u_atmosDayColor.value.clone().lerp(new THREE.Color(1, 1, 1), 0.35) },
                uIntensity: { value: spriteGlowIntensity },
                uFalloff: { value: spriteGlowFalloff },
              }}
              vertexShader={`
                attribute vec3 aPos;
                varying float vRadial;
                uniform float uRadius;
                void main() {
                  vRadial = aPos.z;
                  // Billboard: compute centre in view space (respects all parent transforms)
                  vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                  // Extract uniform scale from model matrix
                  float s = length(vec3(modelMatrix[0][0], modelMatrix[1][0], modelMatrix[2][0]));
                  float r = (1.0 + aPos.z * uRadius) * s;
                  // Offset in screen-aligned view-space X/Y (always faces camera)
                  vec3 viewPos = mvCenter.xyz + vec3(aPos.x * r, aPos.y * r, 0.0);
                  gl_Position = projectionMatrix * vec4(viewPos, 1.0);
                }
              `}
              fragmentShader={`
                precision highp float;
                varying float vRadial;
                uniform vec3 uColor;
                uniform float uIntensity;
                uniform float uFalloff;
                void main() {
                  float alpha = pow(1.0 - vRadial, uFalloff);
                  alpha *= uIntensity;
                  gl_FragColor = vec4(uColor * alpha, alpha);
                }
              `}
            />
          </mesh>
      )}
    </group>
  );
};

export default Planet;
