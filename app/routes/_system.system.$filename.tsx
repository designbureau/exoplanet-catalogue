import { useLoaderData } from "react-router";
import { useEffect, useContext, useState } from "react";
import { RefContext, RefProvider } from "~/components/RefContext";
import { EnvContext, EnvProvider } from "~/components/EnvContext";
import Binary from "~/components/Binary";
import Menu from "~/components/Menu";
import Nebula from "~/components/Nebula";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Controls from "~/components/Controls";
import { getTemperature } from "~/utils/helperFunctions";
import { EffectComposer, Vignette, Noise, ChromaticAberration, HueSaturation, BrightnessContrast, ToneMapping, DepthOfField } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Cinematic } from "~/shaders/CinematicEffectComponent";

// Collect all star temperatures in a system (traverses binaries)
function getAllStarTemps(data: any): number[] {
  const temps: number[] = [];
  if (data?.star) {
    const stars = Array.isArray(data.star) ? data.star : [data.star];
    for (const star of stars) {
      const t = getTemperature({ data: star });
      if (t > 0) temps.push(t);
    }
  }
  if (data?.binary) {
    const binaries = Array.isArray(data.binary) ? data.binary : [data.binary];
    for (const binary of binaries) {
      temps.push(...getAllStarTemps(binary));
    }
  }
  return temps;
}

// Blend multiple star temperatures into one ambient colour
function systemAmbientHex(data: any): string {
  const temps = getAllStarTemps(data);
  if (temps.length === 0) return "#ffe699"; // default Sun-like
  // Luminosity-weighted average: hotter stars are brighter, contribute more
  let totalWeight = 0;
  let weightedTemp = 0;
  for (const t of temps) {
    const lum = Math.pow(t / 5780, 3.5); // rough main-sequence L ∝ T^3.5
    weightedTemp += t * lum;
    totalWeight += lum;
  }
  const avgTemp = totalWeight > 0 ? weightedTemp / totalWeight : 5500;
  return starTempToAmbientHex(avgTemp);
}

// Star temperature to ambient colour (matches stellar spectral type)
function starTempToAmbientHex(temp: number): string {
  if (temp > 30000) return "#99b3ff"; // O-type: blue
  if (temp > 10000) return "#b3ccff"; // B-type: blue-white
  if (temp > 7500) return "#e6e6ff";  // A-type: white-blue
  if (temp > 6000) return "#fff2d9";  // F-type: warm white
  if (temp > 5200) return "#ffe699";  // G-type: yellow (Sun)
  if (temp > 3700) return "#ffa64d";  // K-type: orange
  if (temp > 2400) return "#ff6626";  // M-type: red-orange
  return "#e64019";                    // L/T-type: deep red
}

// Sync renderer tone mapping with React state
function RendererSync({ toneMapping, exposure }: { toneMapping: number; exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = toneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, toneMapping, exposure]);
  return null;
}

// Extract primary star temperature from system data (traverses binaries)
function getPrimaryStarTemp(data: any): number {
  if (data?.star) {
    const star = Array.isArray(data.star) ? data.star[0] : data.star;
    return getTemperature({ data: star });
  }
  if (data?.binary) {
    const binary = Array.isArray(data.binary) ? data.binary[0] : data.binary;
    return getPrimaryStarTemp(binary);
  }
  return 5500;
}

function Slider({ label, min, max, step, value, onChange, suffix = "" }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="w-14 shrink-0">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 min-w-0 accent-cyan-400" />
      <span className="w-10 tabular-nums text-right shrink-0">{typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(Math.max(2, -Math.floor(Math.log10(step))))) : value}{suffix}</span>
    </div>
  );
}

function RangeSlider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] text-muted-foreground/70">{label}</label>
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-cyan-400/60 w-6">cold</span>
        <input type="range" min={min} max={max} step={step} value={value[0]}
          onChange={(e) => onChange([parseFloat(e.target.value), value[1]])}
          className="w-20 accent-cyan-400" />
        <span className="w-8 tabular-nums text-right text-[9px]">{value[0].toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-orange-400/60 w-6">warm</span>
        <input type="range" min={min} max={max} step={step} value={value[1]}
          onChange={(e) => onChange([value[0], parseFloat(e.target.value)])}
          className="w-20 accent-orange-400" />
        <span className="w-8 tabular-nums text-right text-[9px]">{value[1].toFixed(2)}</span>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-cyan-400" />
      {label}
    </label>
  );
}

function ColorRow({ label, colors, onChange }: { label: string; colors: string[]; onChange: (idx: number, hex: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <label className="w-14 shrink-0">{label}</label>
      {colors.map((c, i) => (
        <input key={i} type="color" value={c}
          onChange={(e) => onChange(i, e.target.value)}
          className="w-5 h-5 cursor-pointer border-0 p-0 bg-transparent" />
      ))}
    </div>
  );
}

function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 w-full py-0.5 text-left hover:text-cyan-400 transition-colors">
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
        <span className="font-medium">{title}</span>
      </button>
      {open && <div className="flex flex-col gap-0.5 pl-2 pb-1">{children}</div>}
    </div>
  );
}

// Milky Way starfield skybox with brightness/contrast — uses equirectangular on a sphere
// so we can apply a custom shader with uniform controls
const skyboxVertShader = `
  varying vec3 vWorldDirection;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyboxFragShader = `
  uniform samplerCube u_envMap;
  uniform float u_brightness;
  uniform float u_contrast;
  varying vec3 vWorldDirection;
  void main() {
    vec3 color = textureCube(u_envMap, vWorldDirection).rgb;
    // Brightness
    color *= u_brightness;
    // Contrast (pivot around 0.5 grey)
    color = (color - 0.5) * u_contrast + 0.5;
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function MilkyWaySkybox({ brightness, contrast }: { brightness: number; contrast: number }) {
  const material = useState(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_envMap: { value: null },
        u_brightness: { value: brightness },
        u_contrast: { value: contrast },
      },
      vertexShader: skyboxVertShader,
      fragmentShader: skyboxFragShader,
      side: THREE.BackSide,
      depthWrite: false,
    });
  })[0];

  useEffect(() => {
    material.uniforms.u_brightness.value = brightness;
    material.uniforms.u_contrast.value = contrast;
  }, [brightness, contrast, material]);

  useEffect(() => {
    const faces = ["px", "nx", "py", "ny", "pz", "nz"];
    const loader = new THREE.CubeTextureLoader();
    loader.setPath("/textures/cubemaps/nasa/8k/compressed/");
    loader.load(faces.map(f => f + ".jpg"), (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      material.uniforms.u_envMap.value = tex;
      material.needsUpdate = true;
    });
  }, [material]);

  return (
    <mesh renderOrder={-2}>
      <sphereGeometry args={[90000, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export const loader = async ({ params }: any) => {
  const { filename } = params;
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  // Resolve data-json relative to this module (works on Vercel serverless)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // In dev: __dirname is app/routes/, data-json is at project root
  // In build: __dirname is build/server/, data-json is at project root
  // Try multiple resolution strategies
  const candidates = [
    path.resolve("data-json", `${filename}.json`),                    // CWD-relative
    path.resolve(__dirname, "..", "..", "data-json", `${filename}.json`), // module-relative
    path.resolve(__dirname, "..", "data-json", `${filename}.json`),      // one level up
  ];

  for (const jsonPath of candidates) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  throw new Response("System not found", { status: 404 });
};

const Root = () => {
  const data = useLoaderData<any>();

  return (
    <EnvProvider>
      <RefProvider>
        <App data={data.system} />
      </RefProvider>
    </EnvProvider>
  );
};

const App = ({ data }: any) => {
  const { resetRefs } = useContext(RefContext);
  const {
    planetDistanceFactor, setPlanetDistanceFactor,
    binaryDistanceFactor, setBinaryDistanceFactor,
    bodyScale, setBodyScale,
    showHabitableZone, setShowHabitableZone,
    showOrbits, setShowOrbits,
    atmosIntensity, setAtmosIntensity,
    atmosFalloff, setAtmosFalloff,
    glowIntensity, setGlowIntensity,
    glowScale, setGlowScale,
    glowFalloff, setGlowFalloff,
    glowInner, setGlowInner,
    glowHueShift, setGlowHueShift,
    glowSaturation, setGlowSaturation,
    spriteGlowIntensity, setSpriteGlowIntensity,
    spriteGlowScale, setSpriteGlowScale,
    spriteGlowFalloff, setSpriteGlowFalloff,
    spriteGlowInner, setSpriteGlowInner,
    cloudCoverage: ctxCloudCoverage, setCloudCoverage: ctxSetCloudCoverage,
    cloudOpacity: ctxCloudOpacity, setCloudOpacity: ctxSetCloudOpacity,
    hzAtmosRange, setHzAtmosRange,
    hzCloudCoverRange, setHzCloudCoverRange,
    hzCloudOpacityRange, setHzCloudOpacityRange,
    hzSeaLevelRange, setHzSeaLevelRange,
    hzIceCapRange, setHzIceCapRange,
    hzContinentFreqRange, setHzContinentFreqRange,
    layerOverrides, setLayerOverrides,
  } = useContext(EnvContext);
  // Local soft glow sliders — move instantly, apply on button press
  const [localSGInt, setLocalSGInt] = useState(spriteGlowIntensity);
  const [localSGScale, setLocalSGScale] = useState(spriteGlowScale);
  const [localSGFall, setLocalSGFall] = useState(spriteGlowFalloff);
  const [localSGInner, setLocalSGInner] = useState(spriteGlowInner);
  const applySoftGlow = () => {
    setSpriteGlowIntensity(localSGInt);
    setSpriteGlowScale(localSGScale);
    setSpriteGlowFalloff(localSGFall);
    setSpriteGlowInner(localSGInner);
  };

  const [follow, setFollow] = useState(true);
  const [nebulaDensity, setNebulaDensity] = useState(1.0);
  const [nebulaBrightness, setNebulaBrightness] = useState(1.0);
  const [showNebula, setShowNebula] = useState(true);
  const [showSkybox, setShowSkybox] = useState(true);
  const [skyBrightness, setSkyBrightness] = useState(1.0);
  const [skyContrast, setSkyContrast] = useState(1.0);
  const cloudCoverage = ctxCloudCoverage;
  const setCloudCoverage = ctxSetCloudCoverage;
  const cloudOpacity = ctxCloudOpacity;
  const setCloudOpacity = ctxSetCloudOpacity;
  const {
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
    shaderAmbient, setShaderAmbient,
    lavaAmbient, setLavaAmbient,
    rockyCraterScale, setRockyCraterScale,
    rockyRidgeStrength, setRockyRidgeStrength,
    rockyCraterDepth, setRockyCraterDepth,
    typeColorOverrides, setTypeColorOverrides,
    activePlanetInfo,
  } = useContext(EnvContext);

  // Colour picker state — syncs with the active planet's type
  const activeType = activePlanetInfo?.type;
  const activeDefaultColors = activePlanetInfo?.colors || ["#888888", "#888888", "#888888", "#888888"];
  const currentColors = (activeType && typeColorOverrides[activeType]) || activeDefaultColors;

  const updateColor = (idx: number, hex: string) => {
    if (!activeType) return;
    const next = [...currentColors];
    next[idx] = hex;
    setTypeColorOverrides((prev: Record<string, string[]>) => ({ ...prev, [activeType]: next }));
  };
  const resetTypeColors = () => {
    if (!activeType) return;
    setTypeColorOverrides((prev: Record<string, string[]>) => {
      const next = { ...prev };
      delete next[activeType];
      return next;
    });
  };

  useEffect(() => {
    resetRefs();
  }, [data, resetRefs]);

  const [showControls, setShowControls] = useState(false);
  const [showPostFxGui, setShowPostFxGui] = useState(false);
  const [showLightsGui, setShowLightsGui] = useState(false);

  // Lights
  const [ambientIntensity, setAmbientIntensity] = useState(0.05);
  const [ambientColor, setAmbientColor] = useState(() => starTempToAmbientHex(getPrimaryStarTemp(data)));

  // Renderer (active when post-FX off)
  const [rendererToneMapping, setRendererToneMapping] = useState(THREE.ACESFilmicToneMapping);
  const [rendererExposure, setRendererExposure] = useState(1.0);

  // Post-processing — single config object, all neutral defaults
  const [fx, setFx] = useState({
    enabled: true,
    dof:           { on: false, focusDistance: 0.01, focalLength: 0.05, bokehScale: 3 },
    toneMap:       { on: true, mode: ToneMappingMode.ACES_FILMIC },
    colorGrade:    { on: false, temperature: 0, tint: 0, shadows: 0, highlights: 0 },
    hueSat:        { on: false, saturation: 0 },
    brightContrast:{ on: false, brightness: 0, contrast: 0 },
    chroma:        { on: false, offset: 0 },
    vignette:      { on: false, offset: 0.3, darkness: 0.5 },
    noise:         { on: false, opacity: 0 },
  });
  const updateFx = (key: string, values: any) => setFx(prev => ({ ...prev, [key]: { ...prev[key as keyof typeof prev], ...values } }));

  return (
    <>
      <Menu data={data} />
      <div className="fixed bottom-2 left-2 z-10 flex gap-2">
        <button
          className={`px-3 py-1.5 text-xs rounded-md backdrop-blur-sm transition-colors ${
            follow ? "bg-cyan-400/20 text-cyan-400" : "bg-black/60 text-muted-foreground hover:text-white"
          }`}
          onClick={() => setFollow(!follow)}
        >
          {follow ? "Following" : "Not following"}
        </button>
        <button
          className="px-3 py-1.5 text-xs rounded-md bg-black/60 text-muted-foreground backdrop-blur-sm hover:text-white transition-colors"
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? "Hide GUI" : "Show GUI"}
        </button>
        <button
          className={`px-3 py-1.5 text-xs rounded-md backdrop-blur-sm transition-colors ${
            showPostFxGui ? "bg-purple-400/20 text-purple-300" : "bg-black/60 text-muted-foreground hover:text-white"
          }`}
          onClick={() => setShowPostFxGui(!showPostFxGui)}
        >
          Post FX
        </button>
        <button
          className={`px-3 py-1.5 text-xs rounded-md backdrop-blur-sm transition-colors ${
            showLightsGui ? "bg-yellow-400/20 text-yellow-300" : "bg-black/60 text-muted-foreground hover:text-white"
          }`}
          onClick={() => setShowLightsGui(!showLightsGui)}
        >
          Lights
        </button>
      </div>
      {showLightsGui && (
        <div className="fixed bottom-12 left-2 z-10 flex flex-col gap-1 rounded-md bg-black/60 px-4 py-3 backdrop-blur-sm text-[10px] text-muted-foreground w-64" style={{ scrollbarWidth: 'thin' }}>
          <div className="text-xs font-medium text-yellow-300 mb-1">Lights</div>
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Scene Ambient</div>
          <Slider label="Intensity" min={0} max={1} step={0.01} value={ambientIntensity} onChange={setAmbientIntensity} />
          <div className="flex items-center gap-1">
            <label className="w-14 shrink-0">Colour</label>
            <input type="color" value={ambientColor} onChange={(e) => setAmbientColor(e.target.value)} className="w-6 h-5 cursor-pointer border-0 p-0 bg-transparent" />
            <span className="text-[9px] text-muted-foreground/50">{ambientColor}</span>
          </div>
          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Shader Ambient (min light on dark side)</div>
          <Slider label="Planets" min={0} max={0.3} step={0.005} value={shaderAmbient} onChange={setShaderAmbient} />
          <Slider label="Lava" min={0} max={0.3} step={0.005} value={lavaAmbient} onChange={setLavaAmbient} />
        </div>
      )}
      {showPostFxGui && (
        <div className="fixed top-2 left-2 z-10 flex flex-col gap-1 rounded-md bg-black/60 px-4 py-3 backdrop-blur-sm max-h-[80vh] overflow-y-auto text-[10px] text-muted-foreground w-72" style={{ scrollbarWidth: 'thin' }}>
          <div className="text-xs font-medium text-purple-300 mb-1">Post FX</div>

          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Renderer {fx.enabled ? <span className="text-yellow-400/60">(bypassed)</span> : ''}</div>
          <div className="flex items-center gap-1">
            <label className="w-14 shrink-0">Tone Map</label>
            <select value={rendererToneMapping} onChange={(e) => setRendererToneMapping(Number(e.target.value))} className="flex-1 bg-black/50 text-[9px] rounded px-1 py-0.5 border border-white/10">
              <option value={THREE.NoToneMapping}>None</option>
              <option value={THREE.ACESFilmicToneMapping}>ACES Filmic</option>
              <option value={THREE.AgXToneMapping}>AgX</option>
              <option value={THREE.NeutralToneMapping}>Neutral</option>
              <option value={THREE.ReinhardToneMapping}>Reinhard</option>
              <option value={THREE.CineonToneMapping}>Cineon</option>
            </select>
          </div>
          <Slider label="Exposure" min={0.1} max={3.0} step={0.05} value={rendererExposure} onChange={setRendererExposure} />

          <div className="border-t border-white/10 my-1" />
          <Toggle label="Enable Effects" checked={fx.enabled} onChange={(v: boolean) => setFx(prev => ({...prev, enabled: v}))} />

          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Depth of Field</div>
          <Toggle label="DoF" checked={fx.dof.on} onChange={(v: boolean) => updateFx('dof', {on: v})} />
          {fx.dof.on && <>
            <Slider label="Focus Dist" min={0.001} max={0.1} step={0.001} value={fx.dof.focusDistance} onChange={(v: number) => updateFx('dof', {focusDistance: v})} />
            <Slider label="Focal Len" min={0.01} max={0.2} step={0.005} value={fx.dof.focalLength} onChange={(v: number) => updateFx('dof', {focalLength: v})} />
            <Slider label="Bokeh" min={0} max={10} step={0.5} value={fx.dof.bokehScale} onChange={(v: number) => updateFx('dof', {bokehScale: v})} />
          </>}

          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Tone Mapping</div>
          <Toggle label="Tone Map" checked={fx.toneMap.on} onChange={(v: boolean) => updateFx('toneMap', {on: v})} />
          {fx.toneMap.on && <div className="flex items-center gap-1">
            <label className="w-14 shrink-0">Mode</label>
            <select value={fx.toneMap.mode} onChange={(e) => updateFx('toneMap', {mode: Number(e.target.value)})} className="flex-1 bg-black/50 text-[9px] rounded px-1 py-0.5 border border-white/10">
              <option value={ToneMappingMode.ACES_FILMIC}>ACES Filmic</option>
              <option value={ToneMappingMode.AGX}>AgX</option>
              <option value={ToneMappingMode.REINHARD}>Reinhard</option>
              <option value={ToneMappingMode.REINHARD2}>Reinhard 2</option>
              <option value={ToneMappingMode.UNCHARTED2}>Uncharted 2</option>
              <option value={ToneMappingMode.NEUTRAL}>Neutral</option>
              <option value={ToneMappingMode.LINEAR}>Linear</option>
            </select>
          </div>}

          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Colour Grade</div>
          <Toggle label="Grade" checked={fx.colorGrade.on} onChange={(v: boolean) => updateFx('colorGrade', {on: v})} />
          {fx.colorGrade.on && <>
            <Slider label="Temp" min={-1} max={1} step={0.05} value={fx.colorGrade.temperature} onChange={(v: number) => updateFx('colorGrade', {temperature: v})} />
            <Slider label="Tint" min={-1} max={1} step={0.05} value={fx.colorGrade.tint} onChange={(v: number) => updateFx('colorGrade', {tint: v})} />
            <Slider label="Shadows" min={-1} max={1} step={0.05} value={fx.colorGrade.shadows} onChange={(v: number) => updateFx('colorGrade', {shadows: v})} />
            <Slider label="Highlights" min={-1} max={1} step={0.05} value={fx.colorGrade.highlights} onChange={(v: number) => updateFx('colorGrade', {highlights: v})} />
          </>}

          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Adjustments</div>
          <Toggle label="Hue/Sat" checked={fx.hueSat.on} onChange={(v: boolean) => updateFx('hueSat', {on: v})} />
          {fx.hueSat.on && <Slider label="Saturation" min={-0.5} max={0.5} step={0.01} value={fx.hueSat.saturation} onChange={(v: number) => updateFx('hueSat', {saturation: v})} />}
          <Toggle label="Bright/Con" checked={fx.brightContrast.on} onChange={(v: boolean) => updateFx('brightContrast', {on: v})} />
          {fx.brightContrast.on && <>
            <Slider label="Bright" min={-0.5} max={0.5} step={0.01} value={fx.brightContrast.brightness} onChange={(v: number) => updateFx('brightContrast', {brightness: v})} />
            <Slider label="Contrast" min={-0.5} max={0.5} step={0.01} value={fx.brightContrast.contrast} onChange={(v: number) => updateFx('brightContrast', {contrast: v})} />
          </>}

          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Lens</div>
          <Toggle label="Chroma Ab." checked={fx.chroma.on} onChange={(v: boolean) => updateFx('chroma', {on: v})} />
          {fx.chroma.on && <Slider label="Offset" min={0} max={0.005} step={0.0001} value={fx.chroma.offset} onChange={(v: number) => updateFx('chroma', {offset: v})} />}
          <Toggle label="Vignette" checked={fx.vignette.on} onChange={(v: boolean) => updateFx('vignette', {on: v})} />
          {fx.vignette.on && <>
            <Slider label="Offset" min={0} max={1} step={0.05} value={fx.vignette.offset} onChange={(v: number) => updateFx('vignette', {offset: v})} />
            <Slider label="Darkness" min={0} max={1.5} step={0.05} value={fx.vignette.darkness} onChange={(v: number) => updateFx('vignette', {darkness: v})} />
          </>}

          <div className="border-t border-white/10 my-1" />
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Film</div>
          <Toggle label="Grain" checked={fx.noise.on} onChange={(v: boolean) => updateFx('noise', {on: v})} />
          {fx.noise.on && <Slider label="Opacity" min={0} max={0.5} step={0.01} value={fx.noise.opacity} onChange={(v: number) => updateFx('noise', {opacity: v})} />}
        </div>
      )}
      {showControls && <div className="fixed top-2 right-2 z-10 flex flex-col gap-0.5 rounded-md bg-black/60 px-3 py-2 backdrop-blur-sm max-h-[90vh] overflow-y-auto text-[10px] text-muted-foreground" style={{ scrollbarWidth: 'thin' }}>
        {/* Scale controls — always visible */}
        <Slider label="Orbit" min={0.01} max={2} step={0.01} value={planetDistanceFactor} onChange={setPlanetDistanceFactor} />
        <Slider label="Stars" min={0.01} max={1.0} step={0.01} value={binaryDistanceFactor} onChange={setBinaryDistanceFactor} />
        <Slider label="Bodies" min={1} max={50} step={1} value={bodyScale} onChange={setBodyScale} suffix="x" />

        <Accordion title="Environment" defaultOpen={false}>
          <Slider label="Nebula" min={0} max={3} step={0.05} value={nebulaDensity} onChange={setNebulaDensity} />
          <Slider label="Bright" min={0.05} max={2} step={0.05} value={nebulaBrightness} onChange={setNebulaBrightness} />
          <Toggle label="Orbits" checked={showOrbits} onChange={setShowOrbits} />
          <Toggle label="Habitable Zone" checked={showHabitableZone} onChange={setShowHabitableZone} />
          <Toggle label="Starfield" checked={showSkybox} onChange={setShowSkybox} />
          <Slider label="Sky Brt" min={0.1} max={3} step={0.05} value={skyBrightness} onChange={setSkyBrightness} />
          <Slider label="Sky Con" min={0.1} max={3} step={0.05} value={skyContrast} onChange={setSkyContrast} />
          <Toggle label="Nebula" checked={showNebula} onChange={setShowNebula} />
        </Accordion>

        <Accordion title="Atmosphere" defaultOpen={false}>
          {(() => {
            const atmosTypes = ['TEMPERATE', 'VENUS_LIKE', 'WATER_WORLD', 'SUB_NEPTUNE', 'LAVA_WORLD', 'FROZEN'];
            const setLayer = (t: string, key: string, val: boolean) => setLayerOverrides((prev: any) => ({ ...prev, [t]: { ...prev[t], [key]: val } }));
            return (
              <div className="flex flex-col gap-0.5 mb-1 pb-1 border-b border-white/10">
                <div className="text-[9px] text-muted-foreground/60 mb-0.5">Layers by type</div>
                {atmosTypes.map(t => {
                  const lo = layerOverrides[t] || {};
                  return (
                    <div key={t} className="flex items-center gap-2 text-[9px]">
                      <span className="w-20 text-muted-foreground/70 truncate">{t.replace(/_/g, ' ').toLowerCase()}</span>
                      <label className="flex items-center gap-0.5 cursor-pointer"><input type="checkbox" checked={lo.rim ?? true} onChange={e => setLayer(t, 'rim', e.target.checked)} className="accent-cyan-400" /><span className="text-[8px]">R</span></label>
                      <label className="flex items-center gap-0.5 cursor-pointer"><input type="checkbox" checked={lo.shell ?? true} onChange={e => setLayer(t, 'shell', e.target.checked)} className="accent-cyan-400" /><span className="text-[8px]">S</span></label>
                      <label className="flex items-center gap-0.5 cursor-pointer"><input type="checkbox" checked={lo.halo ?? true} onChange={e => setLayer(t, 'halo', e.target.checked)} className="accent-cyan-400" /><span className="text-[8px]">H</span></label>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="text-[9px] text-muted-foreground/60 mb-0.5">Rim (surface fresnel)</div>
          <Slider label="Intensity" min={0} max={3} step={0.05} value={atmosIntensity} onChange={setAtmosIntensity} />
          <Slider label="Falloff" min={0.5} max={8} step={0.1} value={atmosFalloff} onChange={setAtmosFalloff} />
          <div className="text-[9px] text-muted-foreground/60 mt-1 mb-0.5">Shell (day/twilight)</div>
          <Slider label="Intensity" min={0} max={5} step={0.01} value={glowIntensity} onChange={setGlowIntensity} />
          <Slider label="Scale" min={0.5} max={10} step={0.05} value={glowScale} onChange={setGlowScale} />
          <Slider label="Falloff" min={0.05} max={5} step={0.05} value={glowFalloff} onChange={setGlowFalloff} />
          <Slider label="Inner" min={0} max={0.9} step={0.01} value={glowInner} onChange={setGlowInner} />
          <Slider label="Hue" min={0} max={1} step={0.01} value={glowHueShift} onChange={setGlowHueShift} />
          <Slider label="Sat" min={0} max={3} step={0.05} value={glowSaturation} onChange={setGlowSaturation} />
          <div className="text-[9px] text-muted-foreground/60 mt-1 mb-0.5">Halo (outer glow)</div>
          <Slider label="Intensity" min={0} max={3} step={0.01} value={localSGInt} onChange={setLocalSGInt} />
          <Slider label="Scale" min={1} max={10} step={0.1} value={localSGScale} onChange={setLocalSGScale} />
          <Slider label="Falloff" min={0.1} max={5} step={0.05} value={localSGFall} onChange={setLocalSGFall} />
          <Slider label="Inner" min={0} max={0.9} step={0.01} value={localSGInner} onChange={setLocalSGInner} />
          <button onClick={applySoftGlow} className="mt-1 rounded bg-cyan-900/50 px-2 py-0.5 text-[9px] text-cyan-400 hover:bg-cyan-900/80">Apply</button>
        </Accordion>

        <Accordion title="Clouds" defaultOpen={false}>
          <Slider label="Cover" min={0.1} max={0.7} step={0.01} value={cloudCoverage} onChange={setCloudCoverage} />
          <Slider label="Opacity" min={0} max={1} step={0.05} value={cloudOpacity} onChange={setCloudOpacity} />
        </Accordion>

        <Accordion title="Terrestrial" defaultOpen={false}>
          <Slider label="Sea Lvl" min={0.3} max={0.7} step={0.01} value={terrSeaLevel} onChange={setTerrSeaLevel} />
          <Slider label="Cont Freq" min={0.05} max={0.5} step={0.01} value={terrContinentFreq} onChange={setTerrContinentFreq} />
          <Slider label="Warp" min={0.1} max={2.0} step={0.05} value={terrWarpStrength} onChange={setTerrWarpStrength} />
          <Slider label="Ice Cap" min={0.6} max={0.98} step={0.01} value={terrIceCapSize} onChange={setTerrIceCapSize} />
        </Accordion>

        <Accordion title="HZ Gradient" defaultOpen={false}>
          <RangeSlider label="Atmosphere" min={0} max={1} step={0.01} value={hzAtmosRange} onChange={setHzAtmosRange} />
          <RangeSlider label="Cloud Cover" min={0} max={1} step={0.01} value={hzCloudCoverRange} onChange={setHzCloudCoverRange} />
          <RangeSlider label="Cloud Opacity" min={0} max={1} step={0.01} value={hzCloudOpacityRange} onChange={setHzCloudOpacityRange} />
          <RangeSlider label="Sea Level" min={0} max={0.8} step={0.01} value={hzSeaLevelRange} onChange={setHzSeaLevelRange} />
          <RangeSlider label="Ice Cap" min={0.5} max={1} step={0.01} value={hzIceCapRange} onChange={setHzIceCapRange} />
          <RangeSlider label="Continent Freq" min={0.05} max={0.4} step={0.01} value={hzContinentFreqRange} onChange={setHzContinentFreqRange} />
        </Accordion>

        <Accordion title="Lava" defaultOpen={false}>
          <Slider label="Warp" min={0} max={0.2} step={0.005} value={lavaWarp} onChange={setLavaWarp} />
          <Slider label="Glow" min={0} max={2} step={0.05} value={lavaGlow} onChange={setLavaGlow} />
          <Slider label="Height" min={-0.6} max={0.3} step={0.02} value={lavaHeightOffset} onChange={setLavaHeightOffset} />
          <Slider label="Flow Scl" min={0.5} max={5} step={0.1} value={lavaFlowScale} onChange={setLavaFlowScale} />
        </Accordion>

        <Accordion title="Rocky" defaultOpen={false}>
          <Slider label="Crater Sz" min={0.3} max={3.0} step={0.1} value={rockyCraterScale} onChange={setRockyCraterScale} />
          <Slider label="Ridges" min={0} max={1} step={0.01} value={rockyRidgeStrength} onChange={setRockyRidgeStrength} />
          <Slider label="Depth" min={0} max={1.5} step={0.05} value={rockyCraterDepth} onChange={setRockyCraterDepth} />
        </Accordion>

        <Accordion title={`Colours${activeType ? ` (${activeType.replace(/_/g, ' ').toLowerCase()})` : ''}`} defaultOpen={false}>
          {activeType ? (
            <>
              <ColorRow label="C1-C4" colors={currentColors} onChange={updateColor} />
              <button
                className="text-[9px] text-cyan-400 hover:text-cyan-300 text-left"
                onClick={resetTypeColors}
              >Reset {activeType.replace(/_/g, ' ').toLowerCase()}</button>
            </>
          ) : (
            <span className="text-[9px] opacity-50">Click a planet to edit its type colours</span>
          )}
        </Accordion>

        <Accordion title="Gas Giant" defaultOpen={false}>
          <Slider label="Swirl" min={0} max={1} step={0.01} value={gasSwirl} onChange={setGasSwirl} />
          <Slider label="Warp" min={1} max={8} step={0.1} value={gasWarp} onChange={setGasWarp} />
          <Slider label="Storm" min={0} max={30} step={0.5} value={gasStorm} onChange={setGasStorm} />
          <Slider label="Turb" min={0} max={1} step={0.01} value={gasTurb} onChange={setGasTurb} />
          <Slider label="Bands" min={1} max={20} step={0.5} value={gasBands} onChange={setGasBands} />
          <Slider label="Edge" min={0} max={1} step={0.01} value={gasEdgeNoise} onChange={setGasEdgeNoise} />
        </Accordion>

        <Accordion title="Ice Giant" defaultOpen={false}>
          <Slider label="Warp" min={0.5} max={6} step={0.1} value={iceWarp} onChange={setIceWarp} />
          <Slider label="Spots" min={0} max={20} step={0.5} value={iceStorm} onChange={setIceStorm} />
          <Slider label="Turb" min={0} max={1} step={0.01} value={iceTurb} onChange={setIceTurb} />
          <Slider label="Bands" min={1} max={15} step={0.5} value={iceBands} onChange={setIceBands} />
          <Slider label="Edge" min={0} max={1} step={0.01} value={iceEdgeNoise} onChange={setIceEdgeNoise} />
        </Accordion>
      </div>}
      <div id="canvas-container">
        <Canvas dpr={[1, 2]} camera={{ far: 10000000, near: 0.01, fov: 50 }}>
          <RendererSync toneMapping={rendererToneMapping} exposure={rendererExposure} />
          {showSkybox && <MilkyWaySkybox brightness={skyBrightness} contrast={skyContrast} />}
          <ambientLight intensity={ambientIntensity} color={ambientColor} />
          {showNebula && <Nebula seed={data?.name?.[0] ?? "system"} density={nebulaDensity} brightness={nebulaBrightness} starTemp={getPrimaryStarTemp(data)} />}
          <Binary data={data} />
          <Controls follow={follow} />
          {fx.enabled && (
            <EffectComposer>
              {/* 1. HDR: Depth of Field */}
              <DepthOfField
                focusDistance={fx.dof.on ? fx.dof.focusDistance : 0}
                focalLength={fx.dof.on ? fx.dof.focalLength : 0}
                bokehScale={fx.dof.on ? fx.dof.bokehScale : 0}
              />
              {/* 2. Tone mapping: HDR → LDR */}
              <ToneMapping mode={fx.toneMap.on ? fx.toneMap.mode : ToneMappingMode.LINEAR} />
              {/* 3. Colour grading (LDR) */}
              <Cinematic
                temperature={fx.colorGrade.on ? fx.colorGrade.temperature : 0}
                tint={fx.colorGrade.on ? fx.colorGrade.tint : 0}
                shadows={fx.colorGrade.on ? fx.colorGrade.shadows : 0}
                highlights={fx.colorGrade.on ? fx.colorGrade.highlights : 0}
              />
              {/* 4. Adjustments (LDR) */}
              <HueSaturation saturation={fx.hueSat.on ? fx.hueSat.saturation : 0} />
              <BrightnessContrast
                brightness={fx.brightContrast.on ? fx.brightContrast.brightness : 0}
                contrast={fx.brightContrast.on ? fx.brightContrast.contrast : 0}
              />
              {/* 5. Lens effects */}
              <ChromaticAberration offset={new THREE.Vector2(fx.chroma.on ? fx.chroma.offset : 0, fx.chroma.on ? fx.chroma.offset : 0)} />
              <Vignette offset={fx.vignette.offset} darkness={fx.vignette.on ? fx.vignette.darkness : 0} />
              {/* 6. Film (last) */}
              <Noise opacity={fx.noise.on ? fx.noise.opacity : 0} blendFunction={BlendFunction.SOFT_LIGHT} />
            </EffectComposer>
          )}
        </Canvas>
      </div>
    </>
  );
};

export default Root;
