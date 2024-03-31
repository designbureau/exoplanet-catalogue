import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import Planet from "./Planet";

const Star = ({ data }) => {
  const ref = useRef();
  const { addRef } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed star";

  useEffect(() => {
    addRef(name, ref);
  }, [name, addRef]);

  return (
    <div
      className="star"
      ref={ref}
      data-name={name}
      onClick={(e) => {
        e.stopPropagation();
        console.log(ref.current);
      }}
    >
      {/* <p>Star: {name}</p> */}
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} />
        ))}
    </div>
  );
};

export default Star;
