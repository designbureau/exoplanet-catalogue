import { useRef, useContext, useEffect } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import Star from "./Star";
import Planet from "./Planet";
import { getPosition, getMass } from "../utils/helperFunctions";

// Hard cap on how far (in scene units) any binary offset can place a
// subsystem from its parent's centre. Hierarchical systems can have enormous
// separations — Alpha Centauri's outer pair is 15000 AU, which at the default
// scale lands the inner AB binary ~3,000,000 units from the origin. GPU
// float32 matrices have ~0.25-unit resolution at that magnitude, so any
// planet there (e.g. Alpha Centauri B b, an 80-unit-radius orbit) shimmers
// and bobs as its vertices snap to the float32 grid. Clamping keeps every
// body inside a precision-safe envelope (ULP < ~0.003 units) while still
// reading as "far apart". Proper fix is camera-relative rendering (roadmap).
const MAX_BINARY_OFFSET = 20000;

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

  // Position stars symmetrically around the binary center of mass
  // If masses are known, weight the offset; otherwise split evenly
  const stars = data.star || [];

  // Binary separation in scene units (adjustable via UI)
  const binaryDistanceScale = Constants.distance.au * binaryDistanceFactor;
  const rawSeparation =
    parseFloat(
      data.separation?.[0] ?? data.semimajoraxis?.[0] ?? 16
    ) * binaryDistanceScale;
  // Minimum visual separation: at least 3x the largest star radius so they don't overlap
  const star1Radius = (parseFloat(stars[0]?.radius?.[0] ?? stars[0]?.mass?.[0] ?? 1) || 1) * Constants.radius.sol * Constants.radius.scale;
  const star2Radius = (parseFloat(stars[1]?.radius?.[0] ?? stars[1]?.mass?.[0] ?? 1) || 1) * Constants.radius.sol * Constants.radius.scale;
  const minSeparation = Math.max(star1Radius, star2Radius) * 3;
  const separation = Math.min(Math.max(rawSeparation, minSeparation), MAX_BINARY_OFFSET);

  const positionAngleDegrees = parseFloat(data.positionangle?.[0] ?? 0);
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
            separation: Math.min(
              parseFloat(binary.separation?.[0] ?? binary.semimajoraxis?.[0] ?? 16) * binaryDistanceScale,
              MAX_BINARY_OFFSET,
            ),
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
        (() => {
          // Derive primary star properties for circumbinary planet classification
          const primaryStar = stars[0] || {};
          const starTemp = parseFloat(primaryStar.temperature?.[0] ?? 5500);
          const starMass = getMass({ data: primaryStar }) || 1;
          const starRadius = parseFloat(primaryStar.radius?.[0] ?? 1);
          const starData = { temperature: starTemp, mass: starMass, radius: starRadius };
          return data.planet.map((planet, index) => (
            <Planet
              key={index}
              data={planet}
              starData={starData}
            />
          ));
        })()}
    </group>
  );
};

export default Binary;
