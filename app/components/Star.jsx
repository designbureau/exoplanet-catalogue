import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import Planet from "./Planet";
// import { LayerMaterial, Fresnel } from "lamina";

import {
  getMass,
  getRadius,
  getTemperature,
  getColor,
} from "../utils/helperFunctions";

const Star = ({ data, position }) => {
  const ref = useRef();

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

  const [pos, setPos] = useState({
    x: Math.random() * 1000 - 1,
    y: Math.random() * 1000 - 1,
    z: Math.random() * 1000 - 1,
  });

  const isActive = activeRef === ref;
  const colorProps = isActive ? { color: color } : { color: color };

  return (
    <group position={[position.x, position.y, position.z]}>
      <pointLight color={color} intensity={2} distance={30000} />
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
