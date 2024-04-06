import { useContext } from "react";
import { EnvContext } from "~/components/EnvContext";

export const getSemimajoraxis = ({ data }: any) => {
  const { Constants } = useContext(EnvContext);

  // Extract the first semimajoraxis value, if it exists, and parse it as a float
  const semimajoraxisValue =
    data.semimajoraxis?.[0]?.["_"] ??
    data.semimajoraxis?.[0] ??
    data.semimajoraxis;

  // Parse the extracted value as a float, providing a default value of 10 if the result is NaN
  let semimajoraxis = parseFloat(semimajoraxisValue);
  semimajoraxis = isNaN(semimajoraxis) ? Constants.distance.au : semimajoraxis;

  semimajoraxis = semimajoraxis * Constants.distance.au;

  return semimajoraxis;
};

export const getPeriod = ({ data }: any) => {
  const periodValue =
    data.period?.[0]?.["_"] ??
    data.period?.[0]?.$?.upperlimit ??
    data.period?.[0]?.$?.lowerlimit ??
    data.period?.[0] ??
    data.period;

  // Parse the extracted value as a float, providing a default value of 365 if the result is NaN
  let period = parseFloat(periodValue);
  period = isNaN(period) ? 365 : period;

  return period;
};

export const getEccentricity = ({ data }: any) => {
  // Attempt to extract the eccentricity value from planet details
  const eccentricityValue =
    data.eccentricity?.[0]?.["_"] ?? data.eccentricity?.[0];

  // Parse the extracted value as a float, providing a default value of 0 if the result is NaN
  let eccentricity = parseFloat(eccentricityValue);
  eccentricity = isNaN(eccentricity) ? 0 : eccentricity;

  return eccentricity;
};

export const getInclination = ({ data }: any) => {
  // Attempt to extract the inclination value from planet details
  const inclinationValue =
    data.inclination?.[0]?.["_"] ?? data.inclination?.[0];

  // Parse the extracted value as a float, providing a default value of 0 if the result is NaN
  let inclination = parseFloat(inclinationValue);
  inclination = isNaN(inclination) ? 0 : inclination;

  return inclination;
};

export const getPeriastron = ({ data }: any) => {
  const periastron = parseFloat(data.periastron?.[0] ?? 0);

  return periastron;
};

export const getPeriapsis = (a: number, e: number): number => {
  return a * (1 - e);
};

export const getApoapsis = (a: number, e: number): number => {
  return a * (1 + e);
};

export const getSemiMinorAxis = (a: number, e: number): number => {
  return a * Math.sqrt(1 - e * e);
};

export const getEllipse = (
  a: number,
  e: number
): { xRadius: number; yRadius: number } => {
  return {
    xRadius: a,
    yRadius: getSemiMinorAxis(a, e),
  };
};

export const getMass = ({ data }: any) => {
  let mass;
  if (Array.isArray(data.mass) && data.mass[0]?._) {
    mass = data.mass[0]._;
  } else if (data.mass?._) {
    mass = data.mass._;
  } else if (Array.isArray(data.mass)) {
    mass = data.mass[0];
  } else {
    mass = data.mass;
  }
  return parseFloat(mass ?? "0");
};

export const getRadius = ({ data }: any) => {
  const radiusValue =
    typeof data.radius === "object" ? data.radius._ : data.radius;
  return parseFloat(radiusValue ?? "0");
};
