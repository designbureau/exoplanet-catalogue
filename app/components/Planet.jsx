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
import { classifyPlanet } from "../utils/planetClassification";
import { createPlanetMaterial } from "../shaders/planetShader";
import { getAtmosphereParams, createAtmosphereMaterial } from "../shaders/atmosphereShader";

const Planet = ({ data, starData }) => {
  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, planetDistanceFactor, atmosIntensity, atmosFalloff } = useContext(EnvContext);

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

  // Classify planet and create shader material
  const { shaderMaterial, atmosphereMaterial, atmosphereScale } = useMemo(() => {
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
    const atmosParams = getAtmosphereParams(params.type, starData?.temperature || 5500);
    const atmos = atmosParams ? createAtmosphereMaterial(atmosParams) : null;
    return {
      shaderMaterial: shader,
      atmosphereMaterial: atmos,
      atmosphereScale: atmosParams?.thickness || 1.0,
    };
  }, [mass, radius, rawSMA, starData?.temperature, starData?.mass, starData?.radius]);

  useEffect(() => {
    addRef(name, "planet", ref);
  }, [name, addRef, ref]);

  const handleClick = (e) => {
    e.stopPropagation();
    setActive(ref);
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

    // Atmosphere controls
    if (shaderMaterial.uniforms.u_atmosIntensity) {
      shaderMaterial.uniforms.u_atmosIntensity.value = atmosIntensity;
    }
    if (shaderMaterial.uniforms.u_atmosFalloff) {
      shaderMaterial.uniforms.u_atmosFalloff.value = atmosFalloff;
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
    </group>
  );
};

export default Planet;
