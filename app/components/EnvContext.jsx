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
  const [showOrbits, setShowOrbits] = useState(true);

  // Shader lighting
  const [shaderAmbient, setShaderAmbient] = useState(0.0);
  const [lavaAmbient, setLavaAmbient] = useState(0.08);

  // Atmosphere controls — global shape (per-planet intensities are in hzPresets + classification)
  // Atmosphere global shape — all start at 0/neutral, build up from nothing
  const [atmosFalloff, setAtmosFalloff] = useState(1.0);    // rim fresnel exponent
  const [glowFalloff, setGlowFalloff] = useState(1.0);      // shell edge exponent
  const [glowInner, setGlowInner] = useState(0.0);           // shell inner cutout
  const [glowHueShift, setGlowHueShift] = useState(0.0);    // colour shift
  const [glowSaturation, setGlowSaturation] = useState(1.0); // colour saturation
  const [spriteGlowScale, setSpriteGlowScale] = useState(2.0); // halo extent
  const [spriteGlowFalloff, setSpriteGlowFalloff] = useState(1.5); // halo edge exponent
  const [spriteGlowInner, setSpriteGlowInner] = useState(0.0); // halo inner cutout
  const [cloudCoverage, setCloudCoverage] = useState(0.35);
  const [cloudOpacity, setCloudOpacity] = useState(0.6);

  // Gas giant controls
  const [gasSwirl, setGasSwirl] = useState(0.25);
  const [gasWarp, setGasWarp] = useState(4.0);
  const [gasStorm, setGasStorm] = useState(18.0);
  const [gasTurb, setGasTurb] = useState(0.4);
  const [gasBands, setGasBands] = useState(2.5);
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
  const [terrIceCapSize, setTerrIceCapSize] = useState(0.92);

  // HZ terrestrial presets: 3 categories interpolated by hz position
  const [hzPresets, setHzPresets] = useState({
    mars:  { atmos: 0.0, cloudCover: 0.15, cloudOpacity: 0.2,  seaLevel: 0.15, iceCap: 0.98, continentFreq: 0.10, warp: 0.3, rim: 0.0, rimFalloff: 1.5, shell: 0.0, halo: 0.0 },
    earth: { atmos: 0.0, cloudCover: 0.45, cloudOpacity: 0.7,  seaLevel: 0.38, iceCap: 0.96, continentFreq: 0.16, warp: 0.5, rim: 0.0, rimFalloff: 1.0, shell: 0.0, halo: 0.0 },
    venus: { atmos: 0.0, cloudCover: 0.60, cloudOpacity: 0.90, seaLevel: 0.10, iceCap: 0.99, continentFreq: 0.22, warp: 0.8, rim: 0.0, rimFalloff: 0.7, shell: 0.0, halo: 0.0 },
  });
  const updatePreset = (cat, key, value) => setHzPresets(prev => ({ ...prev, [cat]: { ...prev[cat], [key]: value } }));

  // Lava controls
  const [lavaWarp, setLavaWarp] = useState(0.2);
  const [lavaGlow, setLavaGlow] = useState(1.8);
  const [lavaHeightOffset, setLavaHeightOffset] = useState(-0.4);
  const [lavaFlowScale, setLavaFlowScale] = useState(1.5);

  // Rocky controls
  // Wrap lighting controls
  const [wrapRange, setWrapRange] = useState(0.45);
  const [wrapPower, setWrapPower] = useState(3.9);

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
      showOrbits,
      setShowOrbits,
      shaderAmbient, setShaderAmbient,
      lavaAmbient, setLavaAmbient,
      atmosFalloff, setAtmosFalloff,
      glowFalloff, setGlowFalloff,
      glowInner, setGlowInner,
      glowHueShift, setGlowHueShift,
      glowSaturation, setGlowSaturation,
      spriteGlowScale, setSpriteGlowScale,
      spriteGlowFalloff, setSpriteGlowFalloff,
      spriteGlowInner, setSpriteGlowInner,
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
      lavaWarp, setLavaWarp,
      lavaGlow, setLavaGlow,
      lavaHeightOffset, setLavaHeightOffset,
      lavaFlowScale, setLavaFlowScale,
      wrapRange, setWrapRange,
      wrapPower, setWrapPower,
      rockyCraterScale, setRockyCraterScale,
      rockyRidgeStrength, setRockyRidgeStrength,
      rockyCraterDepth, setRockyCraterDepth,
      typeColorOverrides, setTypeColorOverrides,
      activePlanetInfo, setActivePlanetInfo,
      hzPresets, updatePreset,
  }), [Constants, planetDistanceFactor, binaryDistanceFactor, bodyScale, showHabitableZone, showOrbits, shaderAmbient, lavaAmbient, wrapRange, wrapPower, lavaWarp, lavaGlow, lavaHeightOffset, lavaFlowScale, atmosFalloff, glowFalloff, glowInner, glowHueShift, glowSaturation, cloudCoverage, cloudOpacity, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, activePlanetInfo, hzPresets]);

  return (
    <EnvContext.Provider value={contextValue}>
      {children}
    </EnvContext.Provider>
  );
};
