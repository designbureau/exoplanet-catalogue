// Simplified mass-luminosity relation refined by spectral type
const spectralExponents = {
  M: 5.5,
  K: 4.8,
  G: 4.5,
  F: 4.0,
  A: 4.0,
  B: 3.5,
  O: 3.5,
};

export const estimateLuminosityFromMassAndType = ({ mass, spectraltype }) => {
  const exponent = spectralExponents[spectraltype] ?? 4.5;
  return Math.pow(mass, exponent);
};

// Calculate habitable zone boundaries from mass and spectral type
// Returns inner/outer radius in scene units (AU * Constants.distance.au)
export const calculateHZFromMassAndType = ({ mass, spectraltype, Constants }) => {
  const Lstar_Lsun = estimateLuminosityFromMassAndType({ mass, spectraltype });

  // Stellar flux boundaries (Kasting et al., 1993; Whitmire et al., 1996)
  const SeffInner = 1.1;
  const SeffOuter = 0.53;

  const DInner = Math.sqrt(Lstar_Lsun / SeffInner) * Constants.distance.au;
  const DOuter = Math.sqrt(Lstar_Lsun / SeffOuter) * Constants.distance.au;

  return {
    innerRadiusAU: DInner,
    outerRadiusAU: DOuter,
  };
};
