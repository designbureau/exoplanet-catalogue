import { createContext, useState, useMemo } from "react";

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

  // Visual scale multiplier for body radii (adjustable via UI)
  const [bodyScale, setBodyScale] = useState(3);

  // Distance factors (1.0 = physical scale)
  const [planetDistanceFactor, setPlanetDistanceFactor] = useState(1);
  const [binaryDistanceFactor, setBinaryDistanceFactor] = useState(0.1);

  // Toggles
  const [showHabitableZone, setShowHabitableZone] = useState(false);

  // Atmosphere controls
  const [atmosIntensity, setAtmosIntensity] = useState(0.3);
  const [atmosFalloff, setAtmosFalloff] = useState(1.0);

  const Constants = useMemo(() => ({
    mass: {
      sol: 1,
      jupiter: 1047.35,
      earth: 332946,
      jupiter_mass_in_earth_masses: 317.8,
    },
    radius: {
      sol: 2000 / 215.032,
      jupiter: (2000 / 215.032) / 10.045,
      earth: (2000 / 215.032) / 10.045 / 11.209,
      scale: bodyScale,
    },
    distance: {
      au: 2000,
      au_sol_radius: 215.032,
    },
  }), [bodyScale]);

  return (
    <EnvContext.Provider value={{
      Constants,
      planetDistanceFactor,
      setPlanetDistanceFactor,
      binaryDistanceFactor,
      setBinaryDistanceFactor,
      bodyScale,
      setBodyScale,
      showHabitableZone,
      setShowHabitableZone,
      atmosIntensity,
      setAtmosIntensity,
      atmosFalloff,
      setAtmosFalloff,
    }}>
      {children}
    </EnvContext.Provider>
  );
};
