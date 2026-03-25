import chroma from "chroma-js";

interface Constants {
  mass: {
    sol: number;
    jupiter: number;
    earth: number;
    jupiter_mass_in_earth_masses: number;
  };
  radius: {
    sol: number;
    jupiter: number;
    earth: number;
    scale: number;
  };
  distance: {
    au: number;
    au_sol_radius: number;
  };
}

export const getSemimajoraxis = ({ data, Constants }: { data: any; Constants: Constants }) => {
  const semimajoraxisValue =
    data.semimajoraxis?.[0]?.["_"] ??
    data.semimajoraxis?.[0] ??
    data.semimajoraxis;

  let semimajoraxis = parseFloat(semimajoraxisValue);
  semimajoraxis = isNaN(semimajoraxis) ? 1 : semimajoraxis;

  return semimajoraxis * Constants.distance.au;
};

export const getPeriod = ({ data }: any) => {
  const periodValue =
    data.period?.[0]?.["_"] ??
    data.period?.[0]?.$?.upperlimit ??
    data.period?.[0]?.$?.lowerlimit ??
    data.period?.[0] ??
    data.period;

  let period = parseFloat(periodValue);
  period = isNaN(period) ? 365 : period;

  return period;
};

export const getEccentricity = ({ data }: any) => {
  const eccentricityValue =
    data.eccentricity?.[0]?.["_"] ?? data.eccentricity?.[0];

  let eccentricity = parseFloat(eccentricityValue);
  eccentricity = isNaN(eccentricity) ? 0 : eccentricity;

  return eccentricity;
};

export const getInclination = ({ data }: any) => {
  const inclinationValue =
    data.inclination?.[0]?.["_"] ?? data.inclination?.[0];

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
  let radiusValue = data.radius;
  if (Array.isArray(radiusValue)) radiusValue = radiusValue[0];
  if (typeof radiusValue === "object" && radiusValue !== null) radiusValue = radiusValue._ ?? radiusValue["$t"];
  return parseFloat(radiusValue ?? "0");
};

const spectralTypeTemperatures: Record<string, number> = {
  M: 3000,
  K: 4500,
  G: 5500,
  F: 6500,
  A: 8000,
  B: 20000,
  O: 40000,
};

export const getTemperature = ({ data }: any) => {
  // Try to get actual temperature from data first
  const parsedTemp = parseFloat(data.temperature?.[0]?._ ?? data.temperature?._);
  if (!isNaN(parsedTemp) && parsedTemp > 0) {
    return parsedTemp;
  }

  // Fall back to spectral type estimate
  const spectraltype = data.spectraltype?.[0]?.[0] || "M";
  return spectralTypeTemperatures[spectraltype] ?? 6500;
};

export const getColor = ({ temperature }: { temperature: number }) => {
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

interface PositionParams {
  separation: number;
  positionAngleDegrees: number;
}

export const getPosition = ({
  separation,
  positionAngleDegrees,
}: PositionParams): Position => {
  const positionAngleRadians = positionAngleDegrees * (Math.PI / 180);

  const x = separation * Math.sin(positionAngleRadians);
  const y = separation * Math.cos(positionAngleRadians);
  const z = 0;

  return { x, y, z };
};
