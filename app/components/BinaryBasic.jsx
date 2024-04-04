import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import Planet from "./Planet";
import Star from "./Star";

const BinaryBasic = ({ data }) => {
  if (!data) return;

  const ref = useRef();

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed binary";

  useEffect(() => {
    addRef(name, "binary", ref);
  }, [name, addRef, ref]);

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
      {data.star &&
        data.star.map((star, index) => <Star key={index} data={star} />)}
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} />
        ))}
      {data.binary &&
        data.binary.map((binary, index) => (
          <BinaryBasic key={index} data={binary} />
        ))}
    </div>
  );
};

export default BinaryBasic;
