import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";
import SpherePlanet from "./SpherePlanet";

const SphereStar = ({ data }) => {
  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);

  const name = data.name ? data.name[0] : "Unnamed star";

  const handleClick = (e) => {
    e.stopPropagation();
    console.log(ref);
    setActive(ref);
  };

  useEffect(() => {
    addRef(name, "star", ref);
  }, [name, addRef, ref]);

  useFrame((state, delta) => (ref.current.rotation.x += delta));

  const [pos, setPos] = useState({
    x: Math.random() * 20 * 0.5 - 1,
    y: Math.random() * 20 * 0.5 - 1,
    z: Math.random() * 20 * 0.5 - 1,
  });

  const isActive = activeRef === ref;

  return (
    <group>
      <mesh
        ref={ref}
        name={name}
        position={[pos.x, pos.y, pos.z]}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 256, 256]} />
        <meshStandardMaterial color={isActive ? "hotpink" : "orange"} />
      </mesh>
      {data.planet &&
        data.planet.map((planet, index) => (
          <SpherePlanet key={index} data={planet} />
        ))}
    </group>
  );
};

export default SphereStar;
