import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useMemo } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import {
  calculateHZFromMassAndType,
} from "../utils/getHabitableZone";
import Planet from "./Planet";
import * as THREE from "three";
import { createStarMaterial, createStarGlowMaterial } from "../shaders/starShader";
import StarEffects from "./StarEffects";

import {
  getMass,
  getRadius,
  getTemperature,
  getColor,
} from "../utils/helperFunctions";

const Star = ({ data, position, distance }) => {
  const ref = useRef();
  const glowRef = useRef();

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, showHabitableZone } = useContext(EnvContext);

  const name = data.name ? data.name[0] : "Unnamed star";

  const handleClick = (e) => {
    e.stopPropagation();
    setActive(ref);
  };

  useEffect(() => {
    addRef(name, "star", ref);
  }, [name, addRef, ref]);

  const mass = getMass({ data });
  const radius = getRadius({ data });
  const temperature = getTemperature({ data });
  const { color } = getColor({ temperature });

  const magnitudeToIntensity = (magnitude) => {
    const minIntensity = 1;
    const maxIntensity = 5;
    const base = 10;

    let rawIntensity = Math.pow(base, -magnitude / 2.5);
    let normalizedIntensity =
      ((rawIntensity - minIntensity) / (1 - minIntensity)) *
        (maxIntensity - minIntensity) +
      minIntensity;

    normalizedIntensity = Math.max(
      minIntensity,
      Math.min(maxIntensity, normalizedIntensity)
    );

    return isNaN(normalizedIntensity) ? 2 : normalizedIntensity;
  };

  const intensity = magnitudeToIntensity(data.magV);

  let scale = 1;
  if (mass > 0) {
    scale = mass;
  }
  if (radius > 0) {
    scale = radius;
  }

  scale = scale * Constants.radius.sol * Constants.radius.scale;

  // Create procedural star shader material
  const { starMaterial, glowMaterial } = useMemo(() => {
    const temp = temperature || 5500;
    const starMat = createStarMaterial({ temperature: temp });
    const glowMat = createStarGlowMaterial({ temperature: temp });
    return { starMaterial: starMat, glowMaterial: glowMat };
  }, [temperature]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    ref.current.rotation.y += 0.002;

    // Animate the star shader
    if (starMaterial.uniforms.u_time) {
      starMaterial.uniforms.u_time.value = elapsed * 0.075;
    }

    // Keep glow sprite facing camera
    if (glowRef.current) {
      glowRef.current.position.set(0, 0, 0);
    }
  });

  const spectraltype = data.spectraltype?.[0]?.[0] || "M";
  const habitableZone = calculateHZFromMassAndType({ mass, spectraltype, Constants });

  return (
    <group position={[position.x, position.y, position.z]}>
      <pointLight color={color} intensity={intensity} distance={30000} />
      {habitableZone && showHabitableZone && (
        <mesh>
          <ringGeometry
            args={[
              habitableZone.innerRadiusAU,
              habitableZone.outerRadiusAU,
              128,
            ]}
          />
          <meshBasicMaterial
            transparent={true}
            opacity={0.15}
            color={0x008080}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <mesh ref={ref} name={name} onClick={handleClick}>
        <sphereGeometry args={[scale, 64, 64]} />
        <primitive object={starMaterial} attach="material" />
      </mesh>

      {/* Star glow sprite */}
      <sprite ref={glowRef} scale={[scale * 4, scale * 4, 1]}>
        <primitive object={glowMaterial} attach="material" />
      </sprite>

      {/* Sun rays + flares */}
      <StarEffects starRadius={scale} temperature={temperature} />

      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet
            key={index}
            data={planet}
            starData={{ temperature, mass, radius }}
          />
        ))}
    </group>
  );
};

export default Star;
