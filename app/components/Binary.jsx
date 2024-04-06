import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import Star from "./Star";
import Planet from "./Planet";
import { getPosition } from "../utils/helperFunctions";

const Binary = ({ data, parentPosition = { x: 0, y: 0, z: 0 } }) => {
  if (!data) return;

  const ref = useRef();
  const { addRef, activeRef, setActiveByName } = useContext(RefContext);
  const name = data.name ? data.name[0] : "Unnamed binary";

  useEffect(() => {
    addRef(name, "binary", ref);
  }, [name, addRef, ref]);

  useEffect(() => {
    // Assuming the binary data structure and that stars are listed under data.star
    if (data.star && data.star.length > 0) {
      const firstStarName = data.star[0].name
        ? data.star[0].name[0]
        : "Unnamed star";
      // Use a timeout to ensure all refs are set before trying to access them
      setTimeout(() => {
        setActiveByName(firstStarName, "star");
      }, 0);
    }
  }, [data, setActiveByName]);

  // const handleClick = (e) => {
  //   e.stopPropagation();
  //   console.log(ref);
  //   setActive(ref);
  // };

  // Calculate the binary's own position based on separation and position angle from its parent
  const separation = parseFloat(data.separation?.[0] ?? 0);
  const positionAngleDegrees = parseFloat(data.positionangle?.[0] ?? 0);
  const binaryPosition = getPosition({ separation, positionAngleDegrees });

  // Adjust the binary's position based on the parentPosition
  const adjustedBinaryPosition = {
    x: parentPosition.x + binaryPosition.x,
    y: parentPosition.y + binaryPosition.y,
    z: parentPosition.z + binaryPosition.z,
  };

  const firstStarPosition = { ...adjustedBinaryPosition };
  const secondStarPosition = getPosition({ separation, positionAngleDegrees });
  secondStarPosition.x += adjustedBinaryPosition.x;
  secondStarPosition.y += adjustedBinaryPosition.y;
  secondStarPosition.z += adjustedBinaryPosition.z;

  const isActive = activeRef === ref;

  return (
    <group
      ref={ref}
      name={name}
      active={isActive}
      // onClick={handleClick}
      position={[
        adjustedBinaryPosition.x,
        adjustedBinaryPosition.y,
        adjustedBinaryPosition.z,
      ]}
    >
      {data.binary &&
        data.binary.map((binary, index) => (
          <Binary
            key={index}
            data={binary}
            parentPosition={adjustedBinaryPosition}
          />
        ))}
      {data.star &&
        data.star.map((star, index) => (
          <Star
            key={index}
            data={star}
            position={index === 0 ? firstStarPosition : secondStarPosition}
          />
        ))}
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} />
        ))}
    </group>
  );
};

export default Binary;
