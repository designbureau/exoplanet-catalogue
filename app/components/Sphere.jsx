import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";

const Sphere = ({ data }) => {
  const ref = useRef();
  const { addRef } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed sphere";

  const [active, setActive] = useState(false);

  useEffect(() => {
    addRef(name, ref);
  }, [name, addRef]);

  useFrame((state, delta) => (ref.current.rotation.x += delta));

  const [pos, setPos] = useState({
    x: Math.random() * 20 * 0.5 - 1,
    y: Math.random() * 20 * 0.5 - 1,
    z: Math.random() * 20 * 0.5 - 1,
  });

  return (
    <mesh
      ref={ref}
      name={name}
      position={[pos.x, pos.y, pos.z]}
      onClick={(e) => {
        e.stopPropagation();
        console.log(ref.current);
        setActive(!active);
      }}
    >
      <sphereGeometry args={[1, 256, 256]} />
      <meshStandardMaterial color={active ? "hotpink" : "orange"} />
    </mesh>
  );
};

export default Sphere;
