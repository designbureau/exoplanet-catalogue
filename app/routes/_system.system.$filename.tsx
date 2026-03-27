import path from "path";
import { useLoaderData } from "react-router";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { fileURLToPath } from "url";
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
// import { EffectComposer } from "@react-three/postprocessing";

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
        className="w-16 accent-cyan-400" />
      <span className="w-7 tabular-nums text-right">{typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(2)) : value}{suffix}</span>
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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const { filename } = params;

  const filePath = path.join(
    __dirname,
    "..",
    "data",
    "open_exoplanet_catalogue",
    "systems",
    `${filename}.xml`
  );

  const jsonData = await loadXMLAsJSON(filePath);

  return jsonData;
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
  } = useContext(EnvContext);
  const [follow, setFollow] = useState(true);
  const [nebulaDensity, setNebulaDensity] = useState(1.0);
  const [nebulaBrightness, setNebulaBrightness] = useState(0.6);
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

  return (
    <>
      <Menu data={data} />
      <div className="fixed bottom-2 left-2 z-10">
        <button
          className={`px-3 py-1.5 text-xs rounded-md backdrop-blur-sm transition-colors ${
            follow ? "bg-cyan-400/20 text-cyan-400" : "bg-black/60 text-muted-foreground hover:text-white"
          }`}
          onClick={() => setFollow(!follow)}
        >
          {follow ? "Following" : "Not following"}
        </button>
      </div>
      <div className="fixed top-2 right-2 z-10 flex flex-col gap-0.5 rounded-md bg-black/60 px-3 py-2 backdrop-blur-sm max-h-[90vh] overflow-y-auto text-[10px] text-muted-foreground" style={{ scrollbarWidth: 'thin' }}>
        {/* Scale controls — always visible */}
        <Slider label="Orbit" min={0.01} max={2} step={0.01} value={planetDistanceFactor} onChange={setPlanetDistanceFactor} />
        <Slider label="Stars" min={0.01} max={1.0} step={0.01} value={binaryDistanceFactor} onChange={setBinaryDistanceFactor} />
        <Slider label="Bodies" min={1} max={50} step={1} value={bodyScale} onChange={setBodyScale} suffix="x" />

        <Accordion title="Environment" defaultOpen={false}>
          <Slider label="Nebula" min={0} max={3} step={0.05} value={nebulaDensity} onChange={setNebulaDensity} />
          <Slider label="Bright" min={0.05} max={2} step={0.05} value={nebulaBrightness} onChange={setNebulaBrightness} />
          <Toggle label="Habitable Zone" checked={showHabitableZone} onChange={setShowHabitableZone} />
          <Toggle label="Starfield" checked={showSkybox} onChange={setShowSkybox} />
          <Slider label="Sky Brt" min={0.1} max={3} step={0.05} value={skyBrightness} onChange={setSkyBrightness} />
          <Slider label="Sky Con" min={0.1} max={3} step={0.05} value={skyContrast} onChange={setSkyContrast} />
          <Toggle label="Nebula" checked={showNebula} onChange={setShowNebula} />
        </Accordion>

        <Accordion title="Atmosphere" defaultOpen={false}>
          <Slider label="Atmos" min={0} max={3} step={0.05} value={atmosIntensity} onChange={setAtmosIntensity} />
          <Slider label="Falloff" min={0.5} max={8} step={0.1} value={atmosFalloff} onChange={setAtmosFalloff} />
          <Slider label="Glow" min={0} max={5} step={0.01} value={glowIntensity} onChange={setGlowIntensity} />
          <Slider label="G.Scale" min={0.5} max={10} step={0.05} value={glowScale} onChange={setGlowScale} />
          <Slider label="G.Fall" min={0.05} max={5} step={0.05} value={glowFalloff} onChange={setGlowFalloff} />
          <Slider label="G.Inner" min={0} max={0.9} step={0.01} value={glowInner} onChange={setGlowInner} />
          <Slider label="G.Hue" min={0} max={1} step={0.01} value={glowHueShift} onChange={setGlowHueShift} />
          <Slider label="G.Sat" min={0} max={3} step={0.05} value={glowSaturation} onChange={setGlowSaturation} />
          <div className="text-[9px] text-muted-foreground/60 mt-1 mb-0.5">Soft Glow</div>
          <Slider label="S.Int" min={0} max={3} step={0.01} value={spriteGlowIntensity} onChange={setSpriteGlowIntensity} />
          <Slider label="S.Scale" min={1} max={10} step={0.1} value={spriteGlowScale} onChange={setSpriteGlowScale} />
          <Slider label="S.Fall" min={0.1} max={5} step={0.05} value={spriteGlowFalloff} onChange={setSpriteGlowFalloff} />
          <Slider label="S.Inner" min={0} max={0.9} step={0.01} value={spriteGlowInner} onChange={setSpriteGlowInner} />
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
      </div>
      <div id="canvas-container">
        <Canvas dpr={[1, 2]} camera={{ far: 10000000, near: 0.01, fov: 50 }}>
          {showSkybox && <MilkyWaySkybox brightness={skyBrightness} contrast={skyContrast} />}
          <ambientLight intensity={0.05} />
          {showNebula && <Nebula seed={data?.name?.[0] ?? "system"} density={nebulaDensity} brightness={nebulaBrightness} starTemp={getPrimaryStarTemp(data)} />}
          <Binary data={data} />
          <Controls follow={follow} />
          {/* Post-processing removed */}
        </Canvas>
      </div>
    </>
  );
};

export default Root;
