// Mass-luminosity exponents by spectral type (fallback when T/R unavailable)
const spectralExponents = {
  M: 5.5,
  K: 4.8,
  G: 4.5,
  F: 4.0,
  A: 4.0,
  B: 3.5,
  O: 3.5,
};

// Rough spectral-type temperature estimates (fallback for Kopparapu model)
const spectralTypeTemp = {
  M: 3300,
  K: 4500,
  G: 5780,
  F: 6500,
  A: 8000,
  B: 20000,
  O: 40000,
};

// Estimate stellar luminosity in solar units.
// Prefers Stefan-Boltzmann (L ∝ R²T⁴) when temperature and radius are known;
// falls back to mass-luminosity power law otherwise.
export const estimateLuminosity = ({ mass, spectraltype, temperature, radius }) => {
  // Stefan-Boltzmann: L/L☉ = (R/R☉)² × (T/T☉)⁴
  if (temperature > 0 && radius > 0) {
    return Math.pow(radius, 2) * Math.pow(temperature / 5778, 4);
  }
  // Fallback: mass-luminosity relation
  if (mass > 0) {
    const exponent = spectralExponents[spectraltype] ?? 4.5;
    return Math.pow(mass, exponent);
  }
  return 1; // default solar
};

// Kopparapu et al. 2013 temperature-dependent stellar flux boundary.
// S_eff = S☉ + a·T* + b·T*² + c·T*³ + d·T*⁴   where T* = T_star − 5780
function kopparapuSeff(Ssun, a, b, c, d, starTemp) {
  const Ts = (starTemp || 5780) - 5780;
  return Ssun + a * Ts + b * Ts * Ts + c * Ts * Ts * Ts + d * Ts * Ts * Ts * Ts;
}

// Calculate habitable zone boundaries using Kopparapu et al. 2013 model.
// Returns inner/outer radius in scene units (AU × Constants.distance.au).
export const calculateHZ = ({ mass, spectraltype, temperature, radius, Constants }) => {
  const L = estimateLuminosity({ mass, spectraltype, temperature, radius });
  const starTemp = temperature || spectralTypeTemp[spectraltype] || 5780;

  // Runaway Greenhouse (conservative inner edge)
  const SeffInner = kopparapuSeff(1.0512, 1.3242e-4, 1.5418e-8, -7.9895e-12, -1.8328e-15, starTemp);
  // Maximum Greenhouse (conservative outer edge)
  const SeffOuter = kopparapuSeff(0.3438, 5.8942e-5, 1.6558e-9, -3.0045e-12, -5.2983e-16, starTemp);

  const DInner = Math.sqrt(L / SeffInner) * Constants.distance.au;
  const DOuter = Math.sqrt(L / SeffOuter) * Constants.distance.au;

  return {
    innerRadiusAU: DInner,
    outerRadiusAU: DOuter,
  };
};

// Legacy export — kept for backward compatibility
export const estimateLuminosityFromMassAndType = ({ mass, spectraltype }) => {
  return estimateLuminosity({ mass, spectraltype, temperature: 0, radius: 0 });
};

export const calculateHZFromMassAndType = ({ mass, spectraltype, Constants }) => {
  return calculateHZ({ mass, spectraltype, temperature: 0, radius: 0, Constants });
};
