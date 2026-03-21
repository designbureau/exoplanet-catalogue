import { createContext } from "react";

export const EnvContext = createContext();

export const EnvProvider = ({ children }) => {
  // Scene scale: 1 AU = 2000 scene units
  // Physical ratios:
  //   1 AU = 215.032 solar radii
  //   1 solar radius = 10.045 Jupiter radii
  //   1 Jupiter radius = 11.209 Earth radii
  //
  // With 1 AU = 2000 scene units:
  //   1 solar radius = 2000 / 215.032 ≈ 9.3 scene units
  //   1 Jupiter radius ≈ 9.3 / 10.045 ≈ 0.926 scene units
  //
  // We apply a visual scale multiplier to make small bodies visible.
  // Without it, planets would be invisible dots next to stars.
  const visualScale = 3;

  const Constants = {
    mass: {
      sol: 1,
      jupiter: 1047.35,
      earth: 332946,
      jupiter_mass_in_earth_masses: 317.8,
    },
    radius: {
      sol: 2000 / 215.032, // ~9.3 scene units per solar radius
      jupiter: (2000 / 215.032) / 10.045, // ~0.926 scene units per Jupiter radius
      earth: (2000 / 215.032) / 10.045 / 11.209, // ~0.083 scene units per Earth radius
      scale: visualScale,
    },
    distance: {
      au: 2000,
      au_sol_radius: 215.032,
    },
  };

  return (
    <EnvContext.Provider value={{ Constants }}>{children}</EnvContext.Provider>
  );
};
