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

  // Star glow controls
  const [starGlowScale, setStarGlowScale] = useState(4.0);
  const [starGlowFalloff, setStarGlowFalloff] = useState(1.8);
  const [starGlowOpacity, setStarGlowOpacity] = useState(1.0);

  // Atmosphere controls — global shape (per-planet intensities are in hzPresets + classification)
  // Atmosphere global shape — all start at 0/neutral, build up from nothing
  const [atmosFalloff, setAtmosFalloff] = useState(1.0);    // rim fresnel exponent
  const [glowFalloff, setGlowFalloff] = useState(1.0);      // shell edge exponent
  const [glowInner, setGlowInner] = useState(0.0);           // shell inner cutout
  const [glowHueShift, setGlowHueShift] = useState(0.0);    // colour shift
  const [glowSaturation, setGlowSaturation] = useState(1.0); // colour saturation
  const [spriteGlowInner, setSpriteGlowInner] = useState(0.0); // halo inner cutout (global)
  const [cloudCoverage, setCloudCoverage] = useState(0.35);
  const [cloudOpacity, setCloudOpacity] = useState(0.6);
  const [cloudSwirl, setCloudSwirl] = useState(0.8);
  const [cloudBands, setCloudBands] = useState(5.0);
  const [cloudWarp, setCloudWarp] = useState(0.35);

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
  const [terrContinentFreq, setTerrContinentFreq] = useState(0.11);
  const [terrWarpStrength, setTerrWarpStrength] = useState(0.5);
  const [terrIceCapSize, setTerrIceCapSize] = useState(0.92);
  const [terrCoastDetail, setTerrCoastDetail] = useState(0.35);
  const [terrLandContrast, setTerrLandContrast] = useState(1.6);
  const [terrDisplaceScale, setTerrDisplaceScale] = useState(0.008);
  const [terrBumpStrength, setTerrBumpStrength] = useState(0.6);

  // HZ terrestrial presets: 3 categories interpolated by hz position
  const [hzPresets, setHzPresets] = useState({
    mars:  { atmos: 0.0, cloudCover: 0.33, cloudOpacity: 0.29, cloudSwirl: 1.2, cloudBands: 3.0, cloudWarp: 0.2, seaLevel: 0.33, iceCap: 1.0, iceEdge: 0.025, iceWarp: 0.75, iceDetail: 0.9, continentFreq: 0.19, warp: 0.3, ridgeFreq: 0.4, ridgeMix: 1.2, bump: 0.5, displace: 0.008, rim: 0.05, rimFalloff: 1.7, rimDay: '#a06040', rimTwi: '#805030', shell: 0.0, halo: 0.25, haloScale: 1.5, haloFalloff: 3.1, haloWhiten: 0.35, haloShadow: 0.7 },
    earth: { atmos: 0.0, cloudCover: 0.41, cloudOpacity: 0.89, cloudSwirl: 0.3, cloudBands: 2.5, cloudWarp: 0.5, seaLevel: 0.70, iceCap: 0.89, iceEdge: 0.035, iceWarp: 1.0, iceDetail: 0.7, continentFreq: 0.30, warp: 0.5, ridgeFreq: 0.35, ridgeMix: 1.6, bump: 0.6, displace: 0.008, rim: 0.10, rimFalloff: 1.0, rimDay: '#00aaff', rimTwi: '#ff6600', shell: 0.0, halo: 0.60, haloScale: 2.0, haloFalloff: 2.7, haloWhiten: 0.15, haloShadow: 0.7 },
    warm:  { atmos: 0.0, cloudCover: 0.60, cloudOpacity: 0.90, cloudSwirl: 1.2, cloudBands: 2.0, cloudWarp: 0.5, seaLevel: 0.10, iceCap: 0.99, iceEdge: 0.035, iceWarp: 0.4, iceDetail: 1.8, continentFreq: 0.22, warp: 0.8, ridgeFreq: 0.5, ridgeMix: 2.0, bump: 0.5, displace: 0.008, rim: 0.0, rimFalloff: 0.7, rimDay: '#cc8833', rimTwi: '#aa6622', shell: 0.0, halo: 0.0, haloScale: 3.0, haloFalloff: 1.0, haloWhiten: 0.35, haloShadow: 0.7 },
    // Venus Zone: runaway greenhouse (S_eff > 1.04), separate from warm HZ
    venusZone: { atmos: 0.0, rim: 0.0, rimFalloff: 0.7, rimDay: '#ccaa44', rimTwi: '#aa6622', shell: 0.0, halo: 0.30, haloScale: 1.4, haloFalloff: 3.2, haloWhiten: 0.35, haloShadow: 0.7 },
    // Frozen: cold rocky with ice surface (S_eff < 0.35)
    frozen: { atmos: 0.0, rim: 0.0, rimFalloff: 1.5, rimDay: '#6688aa', rimTwi: '#334455', shell: 0.0, halo: 0.0, haloScale: 1.5, haloFalloff: 2.0, haloWhiten: 0.5, haloShadow: 0.5 },
    // Water World: deep ocean with moderate haze
    waterWorld: { seaLevel: 0.85, continentFreq: 0.05, coastDetail: 0.35, landContrast: 1.6, iceCap: 1.1, iceEdge: 0.025, iceWarp: 0.6, iceDetail: 0.8, warp: 0.4, ridgeFreq: 0.3, ridgeMix: 1.0, bump: 0.4, displace: 0.005, cloudCover: 0.36, cloudOpacity: 0.61, cloudSwirl: 0.35, cloudBands: 2.0, cloudWarp: 0.35, atmos: 0.0, rim: 0.0, rimFalloff: 1.0, rimDay: '#2266cc', rimTwi: '#ccccaa', shell: 0.0, halo: 0.50, haloScale: 1.3, haloFalloff: 1.6, haloWhiten: 0.30, haloShadow: 0.35 },
    // Sub-Neptune: thick atmosphere, blue-grey, no visible surface
    subNeptune: { atmos: 0.0, rim: 0.0, rimFalloff: 0.8, rimDay: '#6688bb', rimTwi: '#445566', shell: 0.0, halo: 0.0, haloScale: 2.5, haloFalloff: 1.2, haloWhiten: 0.35, haloShadow: 0.7 },
    // Gas Giant: soft edge glow
    gasGiant: { atmos: 0.0, rim: 0.0, rimFalloff: 1.0, rimDay: '#aabbcc', rimTwi: '#556677', shell: 0.0, halo: 0.0, haloScale: 2.0, haloFalloff: 1.5, haloWhiten: 0.35, haloShadow: 0.7 },
    // Ice Giant: subtle blue edge
    iceGiant: { atmos: 0.0, rim: 0.0, rimFalloff: 1.0, rimDay: '#6699bb', rimTwi: '#334466', shell: 0.0, halo: 0.0, haloScale: 2.0, haloFalloff: 1.5, haloWhiten: 0.35, haloShadow: 0.7 },
    // Lava World: molten glow
    lavaWorld: { atmos: 0.0, rim: 0.0, rimFalloff: 0.8, rimDay: '#ff7300', rimTwi: '#881100', shell: 0.0, halo: 0.45, haloScale: 1.5, haloFalloff: 4.0, haloWhiten: 0.1, haloShadow: 0.2 },
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
      showOrbits, setShowOrbits,
      shaderAmbient, setShaderAmbient,
      lavaAmbient, setLavaAmbient,
      starGlowScale, setStarGlowScale,
      starGlowFalloff, setStarGlowFalloff,
      starGlowOpacity, setStarGlowOpacity,
      atmosFalloff, setAtmosFalloff,
      glowFalloff, setGlowFalloff,
      glowInner, setGlowInner,
      glowHueShift, setGlowHueShift,
      glowSaturation, setGlowSaturation,
      spriteGlowInner, setSpriteGlowInner,
      cloudCoverage, setCloudCoverage,
      cloudOpacity, setCloudOpacity,
      cloudSwirl, setCloudSwirl,
      cloudBands, setCloudBands,
      cloudWarp, setCloudWarp,
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
      terrCoastDetail, setTerrCoastDetail,
      terrLandContrast, setTerrLandContrast,
      terrDisplaceScale, setTerrDisplaceScale,
      terrBumpStrength, setTerrBumpStrength,
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
  }), [Constants, planetDistanceFactor, binaryDistanceFactor, bodyScale, showHabitableZone, showOrbits, shaderAmbient, starGlowScale, starGlowFalloff, starGlowOpacity, lavaAmbient, wrapRange, wrapPower, lavaWarp, lavaGlow, lavaHeightOffset, lavaFlowScale, atmosFalloff, glowFalloff, glowInner, glowHueShift, glowSaturation, cloudCoverage, cloudOpacity, gasSwirl, gasWarp, gasStorm, gasTurb, gasBands, gasEdgeNoise, iceWarp, iceStorm, iceTurb, iceBands, iceEdgeNoise, terrSeaLevel, terrContinentFreq, terrWarpStrength, terrIceCapSize, rockyCraterScale, rockyRidgeStrength, rockyCraterDepth, typeColorOverrides, activePlanetInfo, hzPresets]);

  return (
    <EnvContext.Provider value={contextValue}>
      {children}
    </EnvContext.Provider>
  );
};
