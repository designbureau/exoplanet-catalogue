import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import Planet from "./Planet";
import Star from "./Star";

const Binary = ({ data }) => {
  if (!data) return;

  const ref = useRef();
  const { addRef } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed binary";

  useEffect(() => {
    addRef(name, ref);
  }, [name, addRef]);

  return (
    <div
      className="binary"
      ref={ref}
      data-name={name}
      onClick={(e) => {
        e.stopPropagation();
        console.log(ref.current);
      }}
    >
      {/* <p>Binary: {name}</p> */}
      {data.star &&
        data.star.map((star, index) => <Star key={index} data={star} />)}
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} />
        ))}
      {data.binary &&
        data.binary.map((binary, index) => (
          <Binary key={index} data={binary} />
        ))}
    </div>
  );
};

export default Binary;
