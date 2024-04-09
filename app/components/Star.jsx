import { useFrame, extend } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import {
  getHabitableZone,
  calculateHZFromMassAndType,
} from "../utils/getHabitableZone";
import Planet from "./Planet";
// import { LayerMaterial, Fresnel } from "lamina";
import * as THREE from "three";

import {
  getMass,
  getRadius,
  getTemperature,
  getColor,
} from "../utils/helperFunctions";

const Star = ({ data, position, distance }) => {
  const ref = useRef();

  console.log("star", { data });

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants } = useContext(EnvContext);

  const name = data.name ? data.name[0] : "Unnamed star";

  const handleClick = (e) => {
    e.stopPropagation();
    console.log(ref);
    setActive(ref);
  };

  useEffect(() => {
    addRef(name, "star", ref);
  }, [name, addRef, ref]);

  const mass = getMass({ data });
  const radius = getRadius({ data });
  const temperature = getTemperature({ data });
  const { color, color_dark, color_light } = getColor({ temperature });
  // console.log({ temperature });
  // console.log({ color });

  const magnitudeToIntensity = (magnitude) => {
    const minIntensity = 1; // Minimum intensity value
    const maxIntensity = 5; // Maximum intensity value
    const base = 10; // Base for the exponential function

    // Convert magnitude to a raw intensity value using an exponential scale
    let rawIntensity = Math.pow(base, -magnitude / 2.5);

    // Normalize the raw intensity to be within the range [minIntensity, maxIntensity]
    // This is a simple linear normalization; you might need to adjust it based on your data
    let normalizedIntensity =
      ((rawIntensity - minIntensity) / (1 - minIntensity)) *
        (maxIntensity - minIntensity) +
      minIntensity;

    // Clamp the value to ensure it's within the desired range
    normalizedIntensity = Math.max(
      minIntensity,
      Math.min(maxIntensity, normalizedIntensity)
    );

    return isNaN(normalizedIntensity) ? 2 : normalizedIntensity;
  };

  const intensity = magnitudeToIntensity(data.magV);

  console.log({ intensity });

  let scale = 1;

  if (mass > 0) {
    scale = mass;
    // console.log("star mass", mass);
  }

  if (radius > 0) {
    scale = radius;
    // console.log("star radius", radius);
  }

  scale = scale * Constants.radius.sol * Constants.radius.scale;

  useFrame((state, delta) => (ref.current.rotation.x += delta));

  const isActive = activeRef === ref;
  const colorProps = isActive ? { color: color } : { color: color };

  // const habitableZone = getHabitableZone({ data, distance });

  const spectraltype = data.spectraltype?.[0]?.[0] || "M";

  const habitableZone = calculateHZFromMassAndType({ mass, spectraltype });

  console.log({ habitableZone });

  return (
    <group position={[position.x, position.y, position.z]}>
      <pointLight color={color} intensity={intensity} distance={30000} />
      {habitableZone && (
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
        <sphereGeometry args={[scale, 256, 256]} />
        <meshMatcapMaterial color={color} />
      </mesh>
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} />
        ))}
    </group>
  );
};

export default Star;
