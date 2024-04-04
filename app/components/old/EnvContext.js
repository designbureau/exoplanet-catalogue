import { createContext } from "react";

// 1047.35

// Sol/Jupiter mass	1047.566
// Jupiter/Earth mass	317.8284
// Sol/Earth mass	332,946.1

export const Constants = {
  mass: {
    sol: 1,
    jupiter: 1047.566,
    sol_earth: 332946.1,
    jupiter_earth: 317.8284,
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

export const EnvContext = createContext();
