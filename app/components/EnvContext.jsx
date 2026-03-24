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
  const [glowIntensity, setGlowIntensity] = useState(0.9);
  const [glowScale, setGlowScale] = useState(1.15);
  const [glowFalloff, setGlowFalloff] = useState(1.25);
  const [glowInner, setGlowInner] = useState(0.0);
  const [glowHueShift, setGlowHueShift] = useState(0.0);
  const [glowSaturation, setGlowSaturation] = useState(1.0);
  const [cloudCoverage, setCloudCoverage] = useState(0.35);
  const [cloudOpacity, setCloudOpacity] = useState(0.6);

  // Gas giant controls
  const [gasSwirl, setGasSwirl] = useState(0.25);
  const [gasWarp, setGasWarp] = useState(4.0);
  const [gasStorm, setGasStorm] = useState(18.0);
  const [gasTurb, setGasTurb] = useState(0.4);
  const [gasBands, setGasBands] = useState(6.0);
  const [gasEdgeNoise, setGasEdgeNoise] = useState(0.4);

  // Planet colour overrides keyed by PlanetType (null entry = use classification default)
  const [typeColorOverrides, setTypeColorOverrides] = useState({}); // { COLD_GIANT: [hex1,hex2,hex3,hex4], ... }
  // Track the active planet's type and default colours for the UI picker
  const [activePlanetInfo, setActivePlanetInfo] = useState(null); // { type, colors: [hex1..4] }

  // Ice giant controls (separate defaults — subtler than gas giants)
  const [iceWarp, setIceWarp] = useState(2.0);
  const [iceStorm, setIceStorm] = useState(8.0);
  const [iceTurb, setIceTurb] = useState(0.3);
  const [iceBands, setIceBands] = useState(4.0);
  const [iceEdgeNoise, setIceEdgeNoise] = useState(0.3);

  // Terrestrial controls
  const [terrSeaLevel, setTerrSeaLevel] = useState(0.50);
  const [terrContinentFreq, setTerrContinentFreq] = useState(0.15);
  const [terrWarpStrength, setTerrWarpStrength] = useState(0.5);
  const [terrIceCapSize, setTerrIceCapSize] = useState(0.85);

  // Rocky controls
  const [rockyCraterScale, setRockyCraterScale] = useState(1.0);
  const [rockyRidgeStrength, setRockyRidgeStrength] = useState(0.35);
  const [rockyCraterDepth, setRockyCraterDepth] = useState(0.7);

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

  const contextValue = useMemo(() => ({
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
      glowIntensity,
      setGlowIntensity,
      glowScale,
      setGlowScale,
      glowFalloff,
      setGlowFalloff,
      glowInner,
      setGlowInner,
      glowHueShift,
      setGlowHueShift,
      glowSaturation,
      setGlowSaturation,
      cloudCoverage,
      setCloudCoverage,
      cloudOpacity,
      setCloudOpacity,
      gasSwirl, setGasSwirl,
      gasWarp, setGasWarp,
      gasStorm, setGasStorm,
      gasTurb, setGasTurb,
      gasBands, setGasBands,
      gasEdgeNoise, setGasEdgeNoise,
      iceWarp, setIceWarp,
      iceStorm, setIceStorm,
      iceTurb, setIceTurb,
      iceBands, setIceBands,
      iceEdgeNoise, setIceEdgeNoise,
      terrSeaLevel, setTerrSeaLevel,
      terrContinentFreq, setTerrContinentFreq,
      terrWarpStrength, setTerrWarpStrength,
      terrIceCapSize, setTerrIceCapSize,
      rockyCraterScale, setRockyCraterScale,
      rockyRidgeStrength, setRockyRidgeStrength,
      rockyCraterDepth, setRockyCraterDepth,
      typeColorOverrides, setTypeColorOverrides,
      activePlanetInfo, setActivePlanetInfo,
  }), [Constants, planetDistanceFactor, binaryDistanceFactor, bodyScale, showHabitableZone, atmosIntensity, atmosFalloff, glowIntensity, glowScale, glowFalloff, glowInner, glowHueShift, glowSaturation, cloudCoverage, cloudOpacity, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, activePlanetInfo]);

  return (
    <EnvContext.Provider value={contextValue}>
      {children}
    </EnvContext.Provider>
  );
};
