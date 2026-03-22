import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import Star from "./Star";
import Planet from "./Planet";
import { getPosition, getMass } from "../utils/helperFunctions";

const Binary = ({ data, parentPosition = { x: 0, y: 0, z: 0 } }) => {
  if (!data) return null;

  const ref = useRef();
  const { addRef, activeRef, setActiveByName } = useContext(RefContext);
  const { Constants, binaryDistanceFactor } = useContext(EnvContext);
  const name = data.name ? data.name[0] : "Unnamed binary";

  useEffect(() => {
    addRef(name, "binary", ref);
  }, [name, addRef, ref]);

  useEffect(() => {
    if (data.star && data.star.length > 0) {
      const firstStarName = data.star[0].name
        ? data.star[0].name[0]
        : "Unnamed star";
      setTimeout(() => {
        setActiveByName(firstStarName, "star");
      }, 0);
    }
  }, [data, setActiveByName]);

  // Binary separation in scene units (adjustable via UI)
  const binaryDistanceScale = Constants.distance.au * binaryDistanceFactor;
  const separation =
    parseFloat(
      data.separation?.[0] ?? data.semimajoraxis?.[0] ?? 16
    ) * binaryDistanceScale;

  const positionAngleDegrees = parseFloat(data.positionangle?.[0] ?? 0);

  // Position stars symmetrically around the binary center of mass
  // If masses are known, weight the offset; otherwise split evenly
  const stars = data.star || [];
  let mass1 = stars[0] ? getMass({ data: stars[0] }) : 1;
  let mass2 = stars[1] ? getMass({ data: stars[1] }) : 1;
  // Default to equal masses if unknown
  if (mass1 <= 0) mass1 = 1;
  if (mass2 <= 0) mass2 = 1;
  const totalMass = mass1 + mass2;

  // Star 1 offset from center: -separation * m2 / (m1 + m2)
  // Star 2 offset from center: +separation * m1 / (m1 + m2)
  const offset1 = getPosition({
    separation: separation * (mass2 / totalMass),
    positionAngleDegrees: positionAngleDegrees + 180, // opposite direction
  });
  const offset2 = getPosition({
    separation: separation * (mass1 / totalMass),
    positionAngleDegrees,
  });

  const starPositions = [offset1, offset2];

  const isActive = activeRef === ref;

  return (
    <group
      ref={ref}
      name={name}
      active={isActive}
      position={[parentPosition.x, parentPosition.y, parentPosition.z]}
    >
      {data.binary &&
        data.binary.map((binary, index) => {
          // Nested binaries get offset from this binary's center
          const nestedOffset = getPosition({
            separation: parseFloat(binary.separation?.[0] ?? binary.semimajoraxis?.[0] ?? 16) * binaryDistanceScale,
            positionAngleDegrees: parseFloat(binary.positionangle?.[0] ?? 0),
          });
          return (
            <Binary
              key={index}
              data={binary}
              parentPosition={nestedOffset}
            />
          );
        })}
      {stars.map((star, index) => (
        <Star
          key={index}
          data={star}
          distance={data.distance}
          position={starPositions[index] || { x: 0, y: 0, z: 0 }}
        />
      ))}
      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet key={index} data={planet} starData={{ temperature: 5500, mass: 1, radius: 1 }} />
        ))}
    </group>
  );
};

export default Binary;
