import * as THREE from "three";

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

const Planet = ({ data, starData }) => {
  const ref = useRef();
  const glowRef = useRef();
  const softGlowRef = useRef();

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, planetDistanceFactor, atmosIntensity, atmosFalloff, glowIntensity, glowScale, glowFalloff, glowHueShift, glowSaturation, spriteGlowIntensity, spriteGlowScale, spriteGlowFalloff, spriteGlowInner, cloudCoverage, cloudOpacity, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, setActivePlanetInfo } = useContext(EnvContext);

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
  const { shaderMaterial, atmosParams, atmosMat, planetType } = useMemo(() => {
    const params = classifyPlanet({
      massJupiter: mass,
      radiusJupiter: radius,
      semimajorAxisAU: rawSMA,
      starTemp: starData?.temperature || 5500,
      starMass: starData?.mass || 1,
      starRadius: starData?.radius || 1,
      name,
    });
    const shader = createPlanetMaterial(params);
    const ap = getAtmosphereParams(params.type, starData?.temperature || 5500);

    // Atmosphere glow — BackSide sphere (dual-layer technique from 38-earth-shaders-final)
    let atmosMat = null;
    if (ap && ap.intensity > 0) {
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
          uniform float uIntensity;
          void main() {
            vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
            vec3 normal = normalize(vNormal);
            vec3 color = vec3(0.0);

            // Sun orientation
            float sunOrientation = dot(uSunDirection, normal);

            // Atmosphere colour
            float atmosphereDayMix = smoothstep(-0.5, 1.0, sunOrientation);
            vec3 atmosphereColor = mix(uAtmosTwilightColor, uAtmosDayColor, atmosphereDayMix);
            color += atmosphereColor;

            // Alpha
            float edgeAlpha = dot(viewDirection, normal);
            edgeAlpha = smoothstep(0.0, 0.5, edgeAlpha);

            float dayAlpha = smoothstep(-0.5, 0.0, sunOrientation);
            float alpha = edgeAlpha * dayAlpha * uIntensity;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        uniforms: {
          uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
          uAtmosDayColor: { value: ap.dayColor || new THREE.Color(0x00aaff) },
          uAtmosTwilightColor: { value: ap.twilightColor || new THREE.Color(0xff6600) },
          uIntensity: { value: ap.intensity || 0.8 },
        },
      });
    }

    return {
      shaderMaterial: shader,
      atmosParams: ap,
      atmosMat,
      planetType: params.type,
    };
  }, [mass, radius, rawSMA, starData?.temperature, starData?.mass, starData?.radius]);

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
    if (u.u_atmosIntensity) u.u_atmosIntensity.value = atmosIntensity;
    if (u.u_atmosFalloff) u.u_atmosFalloff.value = atmosFalloff;
    if (u.u_cloudCoverage) u.u_cloudCoverage.value = cloudCoverage;
    if (u.u_cloudOpacity) u.u_cloudOpacity.value = cloudOpacity;
    if (u.u_gasWarp) {
      const isIce = planetType === "ICE_GIANT" || planetType === "VENUS_LIKE" || planetType === "WATER_WORLD" || planetType === "SUB_NEPTUNE";
      u.swirl_strength.value = gasSwirl;
      u.u_gasWarp.value = isIce ? iceWarp : gasWarp;
      u.u_gasStorm.value = isIce ? iceStorm : gasStorm;
      u.u_gasTurb.value = isIce ? iceTurb : gasTurb;
      u.u_gasBands.value = isIce ? iceBands : gasBands;
      u.u_gasEdgeNoise.value = isIce ? iceEdgeNoise : gasEdgeNoise;
    }
    if (u.u_seaLevel) {
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
    const typeColors = typeColorOverrides[planetType];
    if (typeColors) {
      if (u.color1) u.color1.value.set(typeColors[0]);
      if (u.color2) u.color2.value.set(typeColors[1]);
      if (u.color3) u.color3.value.set(typeColors[2]);
      if (u.color4) u.color4.value.set(typeColors[3]);
    }
    if (atmosMat) atmosMat.uniforms.uIntensity.value = glowIntensity;
  }, [atmosIntensity, atmosFalloff, cloudCoverage, cloudOpacity,
      gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise,
      iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise,
      terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize,
      rockyCraterScale, rockyRidgeStrength, rockyCraterDepth,
      typeColorOverrides, glowIntensity, shaderMaterial, atmosMat, planetType]);

  // Soft glow uniforms — only when those sliders change
  useEffect(() => {
    if (softGlowRef.current?.material?.uniforms) {
      const sgU = softGlowRef.current.material.uniforms;
      sgU.uRadius.value = spriteGlowScale * 0.3;
      sgU.uIntensity.value = spriteGlowIntensity;
      sgU.uFalloff.value = spriteGlowFalloff;
    }
  }, [spriteGlowScale, spriteGlowIntensity, spriteGlowFalloff]);

  // Per-frame: only orbital motion, time, LOD, sun direction, position sync
  useFrame((state) => {
    const elapsedTime = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.PI * 0.5;
    ref.current.rotation.y += 0.001;
    ref.current.position.x =
      ellipse.xRadius * Math.cos((elapsedTime / period) * speed);
    ref.current.position.y =
      ellipse.yRadius * Math.sin((elapsedTime / period) * speed);

    // Time + LOD — only animate active planet's clouds
    const isActive = activeRef?.current === ref.current;
    if (shaderMaterial.uniforms.u_time && isActive) {
      shaderMaterial.uniforms.u_time.value = elapsedTime;
    }
    if (shaderMaterial.uniforms.u_lod) {
      shaderMaterial.uniforms.u_lod.value = isActive ? 1.0 : 0.0;
    }

    // Sun direction (depends on planet position which changes per-frame)
    if (atmosMat && ref.current) {
      ref.current.getWorldPosition(_camUp);
      const sunDir = _camRight.set(0, 0, 0).sub(_camUp).normalize();
      atmosMat.uniforms.uSunDirection.value.copy(sunDir.negate());
      if (shaderMaterial.uniforms.u_sunDirection) {
        shaderMaterial.uniforms.u_sunDirection.value.copy(atmosMat.uniforms.uSunDirection.value);
      }
    }

    // Sync glow positions with orbiting planet
    if (glowRef.current) glowRef.current.position.copy(ref.current.position);
    if (softGlowRef.current) softGlowRef.current.position.copy(ref.current.position);
  });

  const position = [periapsis, 0, 0];
  const orbitRef = useRef();

  const orbitGeometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, ellipse.xRadius, ellipse.yRadius, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(128); // enough for smooth orbit
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [ellipse.xRadius, ellipse.yRadius]);

  return (
    <group position={position} rotation={[(inclination * Math.PI) / 90, 0, 0]}>
      <line ref={orbitRef} geometry={orbitGeometry}>
        <lineBasicMaterial
          attach="material"
          color={"#ffffff"}
          opacity={0.25}
          transparent={true}
        />
      </line>
      <mesh ref={ref} name={name} onClick={handleClick} material={shaderMaterial}>
        <sphereGeometry args={[scale, 32, 32]} />
      </mesh>
      {atmosMat && glowIntensity > 0 && (
        <>
          {/* BackSide atmosphere sphere — crisp day/twilight structure */}
          <mesh
            ref={glowRef}
            material={atmosMat}
            frustumCulled={false}
          >
            <sphereGeometry args={[scale * (1.0 + glowScale * 0.04), 16, 16]} />
          </mesh>
          {/* Soft outer glow — annular ring billboard */}
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
                uColor: { value: atmosMat.uniforms.uAtmosDayColor.value },
                uIntensity: { value: spriteGlowIntensity },
                uFalloff: { value: spriteGlowFalloff },
              }}
              vertexShader={`
                attribute vec3 aPos;
                varying float vRadial;
                uniform float uRadius;
                void main() {
                  vRadial = aPos.z;
                  // Billboard: extract camera right/up from view matrix
                  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
                  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
                  // Ring in local space: inner circle at radius 1, outer at 1+uRadius
                  vec3 localPos = (aPos.x * right + aPos.y * up) * (1.0 + aPos.z * uRadius);
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(localPos, 1.0);
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
        </>
      )}
    </group>
  );
};

export default Planet;
