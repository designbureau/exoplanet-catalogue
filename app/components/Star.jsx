import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import Planet from "./Planet";
import { getMass, getRadius } from "../utils/helperFunctions";

const Star = ({ data }) => {
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

  let scale = 1;

  if (mass > 0) {
    scale = mass;
    // console.log("star mass", mass)
  }

  if (radius > 0) {
    scale = radius;
    // console.log("star radius", radius)
  }

  scale = scale * Constants.radius.sol * Constants.radius.scale;

  useFrame((state, delta) => (ref.current.rotation.x += delta));

  const [pos, setPos] = useState({
    x: Math.random() * 100 * 0.5 - 1,
    y: Math.random() * 100 * 0.5 - 1,
    z: Math.random() * 100 * 0.5 - 1,
  });

  const isActive = activeRef === ref;
  const colorProps = isActive ? { color: "orange" } : { color: "orange" };

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh ref={ref} name={name} onClick={handleClick}>
        <sphereGeometry args={[1, 256, 256]} />
        <meshStandardMaterial {...colorProps} />
      </mesh>
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} />
        ))}
    </group>
  );
};

export default Star;
