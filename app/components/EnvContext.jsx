import { createContext } from "react";

export const EnvContext = createContext();

export const EnvProvider = ({ children }) => {
  const Constants = {
    mass: {
      sol: 1,
      jupiter: 1047.35,
      earth: 332946,
      jupiter_mass_in_earth_masses: 317.8,
    },
    radius: {
      sol: 11,
      jupiter: 1,
      earth: 11.209,
      scale: 2,
    },
    distance: {
      au: 215.032 * 11,
      au_sol_radius: 215.032,
    },
  };

  return (
    <EnvContext.Provider value={{ Constants }}>{children}</EnvContext.Provider>
  );
};
