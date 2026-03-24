import * as THREE from "three";

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
  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, planetDistanceFactor, atmosIntensity, atmosFalloff, glowIntensity, glowScale, glowFalloff, glowHueShift, glowSaturation, cloudCoverage, cloudOpacity, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, setActivePlanetInfo } = useContext(EnvContext);

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
  const { shaderMaterial, atmosParams, atmosRingGeo, atmosRingMat, planetType } = useMemo(() => {
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

    // Atmosphere glow — annular billboard ring for all types
    let atmosRingGeo = null;
    let atmosRingMat = null;
    if (ap) {
      const segments = 128;
      const positions = new Float32Array(3 * 2 * segments);
      let pi2 = 0;
      for (let a = 0; a < segments; a++) {
        const angle = (a / segments) * Math.PI * 2.0;
        const sx = Math.sin(angle);
        const sy = Math.cos(angle);
        positions[pi2++] = sx; positions[pi2++] = sy; positions[pi2++] = 0.0;
        positions[pi2++] = sx; positions[pi2++] = sy; positions[pi2++] = 1.0;
      }
      const indices = new Uint16Array(2 * segments * 3);
      let oi = 0;
      for (let a = 0; a < segments; a++) {
        const i0 = 2 * a, i1 = 2 * a + 1;
        const i2 = 2 * ((a + 1) % segments), i3 = i2 + 1;
        indices[oi++] = i0; indices[oi++] = i1; indices[oi++] = i2;
        indices[oi++] = i2; indices[oi++] = i1; indices[oi++] = i3;
      }
      atmosRingGeo = new THREE.BufferGeometry();
      atmosRingGeo.setAttribute("aPos", new THREE.Float32BufferAttribute(positions, 3));
      atmosRingGeo.setIndex(new THREE.BufferAttribute(indices, 1));
      atmosRingMat = new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 aPos;
          varying float vRadial;
          uniform float uRadius;
          uniform vec3 uCamPos;
          uniform vec3 uPlanetWorldPos;
          void main() {
            vRadial = aPos.z;
            // Billboard towards camera from planet's world position
            vec3 lookDir = normalize(uCamPos - uPlanetWorldPos);
            vec3 worldUp = vec3(0.0, 1.0, 0.0);
            // Handle degenerate case when looking straight down
            if (abs(dot(lookDir, worldUp)) > 0.99) worldUp = vec3(0.0, 0.0, 1.0);
            vec3 right = normalize(cross(worldUp, lookDir));
            vec3 up = cross(lookDir, right);
            vec3 p = aPos.x * right + aPos.y * up;
            p *= 1.0 + aPos.z * uRadius;
            // Position in world space directly (bypass modelMatrix rotation)
            vec3 worldP = uPlanetWorldPos + p * length((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
            gl_Position = projectionMatrix * viewMatrix * vec4(worldP, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying float vRadial;
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uFalloff;
          void main() {
            float alpha = pow(1.0 - vRadial, uFalloff);
            alpha *= uIntensity;
            vec3 col = uColor * alpha;
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uRadius: { value: ap.thickness || 0.3 },
          uColor: { value: ap.color },
          uIntensity: { value: ap.intensity || 0.8 },
          uFalloff: { value: 1.5 },
          uCamPos: { value: new THREE.Vector3(0, 0, 5) },
          uPlanetWorldPos: { value: new THREE.Vector3() },
        },
      });
    }

    return {
      shaderMaterial: shader,
      atmosParams: ap,
      atmosRingGeo,
      atmosRingMat,
      planetType: params.type,
    };
  }, [mass, radius, rawSMA, starData?.temperature, starData?.mass, starData?.radius]);

  useEffect(() => {
    addRef(name, "planet", ref);
  }, [name, addRef, ref]);

  // Update atmosphere ring colour when controls change
  useEffect(() => {
    if (!atmosRingMat) return;
    if (atmosParams?.color) {
      const hsl = {};
      atmosParams.color.getHSL(hsl);
      const shifted = new THREE.Color().setHSL(
        (hsl.h + glowHueShift) % 1.0,
        Math.min(1.0, hsl.s * glowSaturation),
        hsl.l
      );
      atmosRingMat.uniforms.uColor.value.copy(shifted);
    }
  }, [atmosRingMat, atmosParams, glowHueShift, glowSaturation]);

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

  useFrame((state) => {
    const elapsedTime = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.PI * 0.5;
    ref.current.rotation.y += 0.001;
    ref.current.position.x =
      ellipse.xRadius * Math.cos((elapsedTime / period) * speed);
    ref.current.position.y =
      ellipse.yRadius * Math.sin((elapsedTime / period) * speed);

    // Animate shader
    if (shaderMaterial.uniforms.u_time) {
      shaderMaterial.uniforms.u_time.value = elapsedTime;
    }

    // LOD: full detail when this planet is active, reduced otherwise
    const isActive = activeRef?.current === ref.current;
    if (shaderMaterial.uniforms.u_lod) {
      shaderMaterial.uniforms.u_lod.value = isActive ? 1.0 : 0.0;
    }

    // Atmosphere controls — update both surface rim and outer glow
    if (shaderMaterial.uniforms.u_atmosIntensity) {
      shaderMaterial.uniforms.u_atmosIntensity.value = atmosIntensity;
    }
    if (shaderMaterial.uniforms.u_atmosFalloff) {
      shaderMaterial.uniforms.u_atmosFalloff.value = atmosFalloff;
    }
    if (shaderMaterial.uniforms.u_cloudCoverage) {
      shaderMaterial.uniforms.u_cloudCoverage.value = cloudCoverage;
    }
    if (shaderMaterial.uniforms.u_cloudOpacity) {
      shaderMaterial.uniforms.u_cloudOpacity.value = cloudOpacity;
    }
    // Gas/ice giant controls — use ice controls for ICE_GIANT and hazy types
    if (shaderMaterial.uniforms.u_gasWarp) {
      const isIce = planetType === "ICE_GIANT" || planetType === "VENUS_LIKE" || planetType === "WATER_WORLD" || planetType === "SUB_NEPTUNE";
      shaderMaterial.uniforms.swirl_strength.value = isIce ? gasSwirl : gasSwirl;
      shaderMaterial.uniforms.u_gasWarp.value = isIce ? iceWarp : gasWarp;
      shaderMaterial.uniforms.u_gasStorm.value = isIce ? iceStorm : gasStorm;
      shaderMaterial.uniforms.u_gasTurb.value = isIce ? iceTurb : gasTurb;
      shaderMaterial.uniforms.u_gasBands.value = isIce ? iceBands : gasBands;
      shaderMaterial.uniforms.u_gasEdgeNoise.value = isIce ? iceEdgeNoise : gasEdgeNoise;
    }
    // Terrestrial controls
    if (shaderMaterial.uniforms.u_seaLevel) {
      shaderMaterial.uniforms.u_seaLevel.value = terrSeaLevel;
      shaderMaterial.uniforms.u_continentFreq.value = terrContinentFreq;
      shaderMaterial.uniforms.u_terrWarp.value = terrWarpStrength;
      shaderMaterial.uniforms.u_iceCapSize.value = terrIceCapSize;
    }
    // Rocky controls
    if (shaderMaterial.uniforms.u_craterScale) {
      shaderMaterial.uniforms.u_craterScale.value = rockyCraterScale;
      shaderMaterial.uniforms.u_ridgeStrength.value = rockyRidgeStrength;
      shaderMaterial.uniforms.u_craterDepth.value = rockyCraterDepth;
    }
    // Apply colour overrides for this planet's type (affects all planets of this type)
    const typeColors = typeColorOverrides[planetType];
    if (typeColors) {
      if (shaderMaterial.uniforms.color1) shaderMaterial.uniforms.color1.value.set(typeColors[0]);
      if (shaderMaterial.uniforms.color2) shaderMaterial.uniforms.color2.value.set(typeColors[1]);
      if (shaderMaterial.uniforms.color3) shaderMaterial.uniforms.color3.value.set(typeColors[2]);
      if (shaderMaterial.uniforms.color4) shaderMaterial.uniforms.color4.value.set(typeColors[3]);
    }
    // Update atmosphere ring billboarding
    if (atmosRingMat) {
      state.camera.getWorldPosition(_camRight); // reuse vector for cam pos
      atmosRingMat.uniforms.uCamPos.value.copy(_camRight);
      // Get planet's world position
      if (ref.current) {
        ref.current.getWorldPosition(_camUp); // reuse vector
        atmosRingMat.uniforms.uPlanetWorldPos.value.copy(_camUp);
      }
      atmosRingMat.uniforms.uIntensity.value = glowIntensity;
      atmosRingMat.uniforms.uRadius.value = (atmosParams?.thickness || 0.3) * glowScale;
      atmosRingMat.uniforms.uFalloff.value = glowFalloff;
    }
    // Sync ring position with orbiting planet
    if (glowRef.current && ref.current) {
      glowRef.current.position.copy(ref.current.position);
    }
  });

  const position = [periapsis, 0, 0];

  const curve = new THREE.EllipseCurve(
    0, 0,
    ellipse.xRadius, ellipse.yRadius,
    0, 2 * Math.PI,
    false, 0
  );
  const orbitRef = useRef();
  const points = curve.getPoints(1000);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group position={position} rotation={[(inclination * Math.PI) / 90, 0, 0]}>
      <line ref={orbitRef} geometry={geometry}>
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
      {atmosRingGeo && atmosRingMat && glowIntensity > 0 && (
        <mesh
          ref={glowRef}
          geometry={atmosRingGeo}
          material={atmosRingMat}
          scale={[scale, scale, scale]}
          frustumCulled={false}
          renderOrder={2}
        />
      )}
    </group>
  );
};

export default Planet;
