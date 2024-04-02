import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import Sphere from "./Sphere";

const BinaryNew = ({ data }) => {
  if (!data) return;

  const ref = useRef();
  const { addRef } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed binary";

  useEffect(() => {
    addRef(name, ref);
  }, [name, addRef]);

  return (
    <group
      // className="binary"
      ref={ref}
      name={name}
      // onClick={(e) => {
      //   e.stopPropagation();
      //   console.log(ref.current);
      // }}
    >
      {data.star &&
        data.star.map((star, index) => <Sphere key={index} data={star} />)}
      {data.planet &&
        data.planet.map((planet, index) => (
          <Sphere key={index} data={planet} />
        ))}
      {data.binary &&
        data.binary.map((binary, index) => (
          <BinaryNew key={index} data={binary} />
        ))}
    </group>
  );
};

export default BinaryNew;
