import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";

const Planet = ({ data }) => {
  const ref = useRef();
  const { addRef } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed planet";

  useEffect(() => {
    addRef(name, ref);
  }, [name, addRef]);

  return (
    <div
      className="planet"
      ref={ref}
      data-name={name}
      onClick={(e) => {
        e.stopPropagation();
        console.log(ref.current);
      }}
    >
      {/* <p>Planet: {name}</p> */}
      {/* Render other properties as needed */}
    </div>
  );
};

export default Planet;
