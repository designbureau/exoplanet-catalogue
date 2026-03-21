import * as THREE from "three";

import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import PlanetTexture from "../utils/PlanetTextures";
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

const Planet = ({ data }) => {
  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants } = useContext(EnvContext);

  const name = data.name ? data.name[0] : "Unnamed planet";

  const semimajoraxis = getSemimajoraxis({ data, Constants });
  const period = getPeriod({ data });
  const eccentricity = getEccentricity({ data });
  const inclination = getInclination({ data });
  const mass = getMass({ data });
  const radius = getRadius({ data });
  const ellipse = getEllipse(semimajoraxis, eccentricity);
  const periapsis = getPeriapsis(semimajoraxis, eccentricity) - semimajoraxis;
  const planetTexture = PlanetTexture(mass, radius, name);

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
      <mesh ref={ref} name={name} onClick={handleClick}>
        <sphereGeometry args={[scale, 256, 256]} />
        <meshStandardMaterial map={planetTexture} />
      </mesh>
    </group>
  );
};

export default Planet;
