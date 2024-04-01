import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";

const Satellite = ({ data }) => {
  const ref = useRef();
  const { addRef } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed satellite";

  useEffect(() => {
    addRef(name, ref);
  }, [name, addRef]);

  return (
    <div
      className="satellite"
      ref={ref}
      data-name={name}
      onClick={(e) => {
        e.stopPropagation();
        console.log(ref.current);
      }}
    >
      {/* <p>Satellite: {name}</p> */}
      {/* Render other properties as needed */}
    </div>
  );
};

export default Satellite;
