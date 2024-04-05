import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";

const PlanetBasic = ({ data }) => {
  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);

  const name = data.name ? data.name[0] : "Unnamed planet";

  useEffect(() => {
    addRef(name, "planet", ref);
  }, [name, addRef, ref]);

  return (
    <div
      className="planet"
      ref={ref}
      data-name={name}
      onClick={(e) => {
        e.stopPropagation();
        console.log(ref.current);
      }}
    ></div>
  );
};

export default PlanetBasic;
