// Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E
// Uses Newton-Raphson iteration
export function solveKepler(M: number, e: number, tol: number = 1e-8): number {
  // Normalise M to [0, 2π]
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Initial guess
  let E = M;
  if (e > 0.8) E = Math.PI; // better starting point for high eccentricity

  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

// Convert eccentric anomaly to true anomaly
export function eccentricToTrue(E: number, e: number): number {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

// Get orbital position (x, y) and true anomaly from mean anomaly and orbital elements
export function keplerPosition(
  meanAnomaly: number,
  eccentricity: number,
  semiMajorAxis: number
): { x: number; y: number; trueAnomaly: number } {
  if (eccentricity < 1e-6) {
    // Nearly circular — skip Kepler solve
    return {
      x: semiMajorAxis * Math.cos(meanAnomaly),
      y: semiMajorAxis * Math.sin(meanAnomaly),
      trueAnomaly: meanAnomaly,
    };
  }

  const E = solveKepler(meanAnomaly, eccentricity);
  const trueAnomaly = eccentricToTrue(E, eccentricity);

  // Distance from focus
  const r = semiMajorAxis * (1 - eccentricity * Math.cos(E));

  return {
    x: r * Math.cos(trueAnomaly),
    y: r * Math.sin(trueAnomaly),
    trueAnomaly,
  };
}
