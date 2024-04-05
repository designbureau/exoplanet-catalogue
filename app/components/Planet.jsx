import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useState } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import PlanetTexture from "../utils/PlanetTextures";
import {
  getSemimajoraxis,
  getPeriod,
  getEccentricity,
  getInclination,
  getPeriastron,
  getEllipse,
  getPeriapsis,
  getMass,
  getRadius,
} from "../utils/helperFunctions";

const Planet = ({ data }) => {
  const ref = useRef();
  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants } = useContext(EnvContext);

  const name = data.name ? data.name[0] : "Unnamed planet";

  const semimajoraxis = getSemimajoraxis({ data });
  const period = getPeriod({ data });
  const eccentricity = getEccentricity({ data });
  const inclination = getInclination({ data });
  const periasteron = getPeriastron({ data });
  const mass = getMass({ data });
  const radius = getRadius({ data });
  const ellipse = getEllipse(semimajoraxis, eccentricity);
  const periapsis = getPeriapsis(semimajoraxis, eccentricity) - semimajoraxis;

  console.log({ data });

  const planetTexture = PlanetTexture(mass, radius, name);
  console.log({ planetTexture });

  /* https://www.aanda.org/articles/aa/full_html/2017/08/aa29922-16/aa29922-16.html */
  /* 
    We suggest that the transition between the two regimes of “small” and “large” 
    planets  occurs at a mass of 124 ± 7M⊕ and a radius of 12.1 ± 0.5R⊕. Furthermore, 
    the M-R relation is R ∝ M0.55 ± 0.02 and R ∝ M0.01 ± 0.02 for small and large planets, 
    respectively.
  */
  let scale = 1;

  if (mass > 0) {
    scale = mass;
    const earthMasses = mass * Constants.mass.jupiter_mass_in_earth_masses;
    if (earthMasses < 124) {
      scale = mass ** 0.55;
      console.log("mass radius proportion smaller planets", "Mass ** 0.55");
    } else {
      scale = mass ** 0.01;
      console.log("mass radius proportion larger planets", "Mass ** 0.01");
    }
  }

  if (radius > 0) {
    scale = radius;
    console.log("scale set by radius");
  } else {
    console.log("scale set by mass");
  }

  //Relative to sol radius
  scale = scale * Constants.radius.jupiter * Constants.radius.scale;

  console.log({
    semimajoraxis,
    periasteron,
    inclination,
    eccentricity,
    period,
    periapsis,
    ellipse,
    mass,
    radius,
    scale,
  });

  useEffect(() => {
    addRef(name, "planet", ref);
  }, [name, addRef, ref]);

  const handleClick = (e) => {
    e.stopPropagation();
    console.log(ref);
    setActive(ref);
  };

  useFrame((state, delta) => (ref.current.rotation.x += delta * 0.5));

  const [pos, setPos] = useState({
    x: Math.random() * 20 * 0.5 - 1,
    y: Math.random() * 20 * 0.5 - 1,
    z: Math.random() * 20 * 0.5 - 1,
  });

  const isActive = activeRef === ref;
  const colorProps = isActive ? { color: "green" } : {};

  return (
    <mesh
      ref={ref}
      name={name}
      position={[pos.x, pos.y, pos.z]}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 256, 256]} />
      <meshStandardMaterial map={planetTexture} {...colorProps} />
    </mesh>
  );
};

export default Planet;
