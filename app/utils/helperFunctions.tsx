import { useContext } from "react";
import { EnvContext } from "~/components/EnvContext";
import chroma from "chroma-js";

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

export const getTemperature = ({ data }: any) => {
  let temperature =
    parseFloat(data.temperature?.[0]?._ ?? data.temperature?._) || null;
  const spectraltype = data.spectraltype?.[0]?.[0] || "M"; //M is the most common type of star so is an appropriate default

  switch (spectraltype) {
    case "M":
      temperature = 3000;
      break;
    case "K":
      temperature = 4500;
      break;
    case "G":
      temperature = 5500;
      break;
    case "F":
      temperature = 6500;
      break;
    case "A":
      temperature = 8000;
      break;
    case "B":
      temperature = 20000;
      break;
    case "O":
      temperature = 40000;
      break;
    default:
      temperature = 6500;
      break;
  }
  return temperature;
};

export const getColor = ({ temperature }: any) => {
  const color = chroma.temperature(temperature).hex("rgb");
  const color_light = chroma
    .temperature(temperature + (temperature / 100) * 50)
    .hex("rgb");
  const color_dark = chroma
    .temperature(temperature - (temperature / 100) * 50)
    .hex("rgb");

  return { color, color_light, color_dark };
};

interface Position {
  x: number;
  y: number;
  z: number;
}

interface OrbitParameters {
  separation: number;
  positionAngleDegrees: number;
}

export const getPosition = ({
  separation,
  positionAngleDegrees,
}: OrbitParameters): Position => {
  const { Constants } = useContext(EnvContext);

  // Convert position angle from degrees to radians
  const positionAngleRadians = positionAngleDegrees * (Math.PI / 180);

  // Calculate x and y using trigonometry
  const x = separation * Constants.distance.au * Math.sin(positionAngleRadians);
  const y = separation * Constants.distance.au * Math.cos(positionAngleRadians);

  // Assuming z is 0 for a 2D plane
  const z = 0;

  return { x, y, z };
};
