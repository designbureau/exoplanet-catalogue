import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import SphereStar from "./SphereStar";
import SpherePlanet from "./SpherePlanet";

const Binary = ({ data }) => {
  if (!data) return;

  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed binary";

  useEffect(() => {
    addRef(name, "binary", ref);
  }, [name, addRef, ref]);

  const handleClick = (e) => {
    e.stopPropagation();
    console.log(ref);
    setActive(ref);
  };

  const isActive = activeRef === ref;

  return (
    <group ref={ref} name={name} active={isActive} onClick={handleClick}>
      {data.star &&
        data.star.map((star, index) => <SphereStar key={index} data={star} />)}
      {data.planet &&
        data.planet.map((planet, index) => (
          <SpherePlanet key={index} data={planet} />
        ))}
      {data.binary &&
        data.binary.map((binary, index) => (
          <Binary key={index} data={binary} />
        ))}
    </group>
  );
};

export default Binary;
