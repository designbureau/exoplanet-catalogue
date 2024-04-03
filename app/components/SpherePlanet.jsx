import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";

const SpherePlanet = ({ data }) => {
  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);

  const name = data.name ? data.name[0] : "Unnamed planet";

  useEffect(() => {
    addRef(name, "planet", ref);
  }, [name, addRef, ref]);

  const handleClick = (e) => {
    e.stopPropagation();
    console.log(ref);
    setActive(ref);
  };

  useFrame((state, delta) => (ref.current.rotation.x += delta));

  const [pos, setPos] = useState({
    x: Math.random() * 20 * 0.5 - 1,
    y: Math.random() * 20 * 0.5 - 1,
    z: Math.random() * 20 * 0.5 - 1,
  });

  const isActive = activeRef === ref;

  return (
    <mesh
      ref={ref}
      name={name}
      position={[pos.x, pos.y, pos.z]}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 256, 256]} />
      <meshStandardMaterial color={isActive ? "green" : "blue"} />
    </mesh>
  );
};

export default SpherePlanet;
