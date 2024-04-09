import { useContext } from "react";
import { EnvContext } from "../components/EnvContext";
import * as THREE from "three";

export const getHabitableZone = ({ data, distance }) => {
  const { Constants } = useContext(EnvContext);

  const spectraltype = data.spectraltype?.[0]?.[0] || "M";

  //Visual Magnitude
  const apparentMagnitude = parseFloat(data.magV?.[0]?.[0] ?? 5); // 5 is arbitrary

  console.log({ apparentMagnitude });

  let bc = -0;
  const bolometricCorrection = {
    B: -2.0,
    A: -0.3,
    F: -0.15,
    G: -0.4,
    K: -0.8,
    M: -2.0,
  };

  bc = bolometricCorrection[spectraltype];
  // console.log("BC", bc);

  let Mv, mv, Mbol, Lstar;
  mv = apparentMagnitude;

  // Stage 1: Estimate the host star’s absolute luminosity based on the star’s apparent visual magnitude (three steps)

  //1. Calculate absolute visual magnitude
  Mv = mv - 5 * (Math.log10(distance) - 1);
  // console.log("Mv", Mv);

  //2. Calculate bolometric magnitude
  Mbol = Mv + bc;
  // console.log("Mbol", Mbol);

  // 3. Calculate absolute luminosity
  // Where:
  // Lstar/Lsun = the absolute luminosity of the host star in terms of the absolute luminosity of the sun
  // Mbol star = the bolometric magnitude of the host star
  // Mbol sun = the bolometric magnitude of the sun = 4.72
  // 2.5 is a constant value used for comparing stellar luminosities -- known as "Pogson's Ratio."

  Lstar = Math.pow(10, (Mbol - 4.72) / -2.5);
  // console.log("Lstar", Lstar);

  // Stage 2: Approximate the radii of the host star’s habitable zone boundaries

  // Where:
  // This method approximates habitable zone radii using stellar luminosity and stellar flux following methods presented by Whitmire et al., 1996, cited below.
  // ri = the inner boundary of the habitable zone in astronomical units (AU)
  // ro = the outer boundary of the habitable zone in astronomical units (AU)
  // Lstar is the absolute luminosity of the star
  // 1.1 is a constant value representing stellar flux at the inner radius (based on Kasting et al., 1993, cited below; Whitmire et al., 1996, cited below)
  // 0.53 is a constant value representing stellar flux at the outer radius (based on Kasting et al., 1993, cited below; Whitmire et al., 1996., cited below)

  let innerRadius, outerRadius;

  innerRadius = Math.sqrt(Lstar / 1.1);
  outerRadius = Math.sqrt(Lstar / 0.53);

  innerRadius = innerRadius * 5;
  outerRadius = outerRadius * 5;

  console.log("innerRadius", innerRadius);
  console.log("outerRadius", outerRadius);

  // return habitableZoneMesh;

  if (isNaN(innerRadius) && isNaN(innerRadius)) return null;
  else return { innerRadius, outerRadius };

  //Z fighting fix needed for binaries
  // habitableZoneMesh.rotation.y = Math.PI * i * 0.025;
  // console.log(i);
};

// Simplified function to refine luminosity estimate using mass and spectral type
export const estimateLuminosityFromMassAndType = ({ mass, spectraltype }) => {
  // Base exponent for main-sequence stars, can be refined based on spectral type
  let exponent = 3.5;

  switch (spectraltype) {
    case "M":
      exponent = 5.5;
      break;
    case "K":
      exponent = 4.8;
      break;
    case "G":
      exponent = 4.5;
      break;
    case "F":
      exponent = 4.0;
      break;
    case "A":
      exponent = 4.0;
      break;
    case "B":
      exponent = 3.5;
      break;
    case "O":
      exponent = 3.5;
      break;
    default:
      exponent = 4.5;
      break;
  }

  return Math.pow(mass, exponent); // Simple mass-luminosity relation
};
// Updated function that now takes into account both mass and spectral type
export const calculateHZFromMassAndType = ({ mass, spectraltype }) => {
  const { Constants } = useContext(EnvContext);

  const Lstar_Lsun = estimateLuminosityFromMassAndType({
    mass,
    spectraltype,
  }); // Estimate Lstar based on mass and type

  // Standard calculations for the HZ continue here
  const SeffInner = 1.1;
  const SeffOuter = 0.53;

  const DInner = Math.sqrt(Lstar_Lsun / SeffInner) * Constants.distance.au;
  const DOuter = Math.sqrt(Lstar_Lsun / SeffOuter) * Constants.distance.au;

  return {
    innerRadiusAU: DInner,
    outerRadiusAU: DOuter,
  };
};

// // Example usage
// const massStar = 1; // Solar masses
// const spectralType = "G"; // Example: Sun-like star
// const habitableZone = calculateHZFromMassAndType(massStar, spectralType);

// console.log(`Spectral Type: ${spectralType}, Mass: ${massStar} Solar masses`);
// console.log(`Inner Radius of HZ: ${habitableZone.innerRadiusAU} AU`);
// console.log(`Outer Radius of HZ: ${habitableZone.outerRadiusAU} AU`);
