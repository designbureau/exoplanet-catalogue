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
  const matRef = useThree((s) => s.scene); // just to trigger re-renders
  const materialRef = { current: null as THREE.ShaderMaterial | null };

  const material = useState(() => {
    const mat = new THREE.ShaderMaterial({
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
    materialRef.current = mat;
    return mat;
  })[0];

  // Update uniforms reactively
  useEffect(() => {
    material.uniforms.u_brightness.value = brightness;
    material.uniforms.u_contrast.value = contrast;
  }, [brightness, contrast, material]);

  // Load textures: compressed first, then hi-res swap
  useEffect(() => {
    const faces = ["px", "nx", "py", "ny", "pz", "nz"];
    const loader = new THREE.CubeTextureLoader();

    loader.setPath("/textures/cubemaps/nasa/8k/compressed/");
    loader.load(faces.map(f => f + ".jpg"), (lowRes) => {
      lowRes.colorSpace = THREE.SRGBColorSpace;
      material.uniforms.u_envMap.value = lowRes;
      material.needsUpdate = true;

      const hiLoader = new THREE.CubeTextureLoader();
      hiLoader.setPath("/textures/cubemaps/nasa/8k/");
      hiLoader.load(faces.map(f => f + ".png"), (hiRes) => {
        hiRes.colorSpace = THREE.SRGBColorSpace;
        material.uniforms.u_envMap.value = hiRes;
        material.needsUpdate = true;
        lowRes.dispose();
      });
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
    cloudCoverage: ctxCloudCoverage, setCloudCoverage: ctxSetCloudCoverage,
    cloudOpacity: ctxCloudOpacity, setCloudOpacity: ctxSetCloudOpacity,
  } = useContext(EnvContext);
  const [follow, setFollow] = useState(true);
  const [nebulaDensity, setNebulaDensity] = useState(1.4);
  const [nebulaBrightness, setNebulaBrightness] = useState(0.6);
  const [showNebula, setShowNebula] = useState(true);
  const [showSkybox, setShowSkybox] = useState(true);
  const [skyBrightness, setSkyBrightness] = useState(1.0);
  const [skyContrast, setSkyContrast] = useState(1.0);
  const cloudCoverage = ctxCloudCoverage;
  const setCloudCoverage = ctxSetCloudCoverage;
  const cloudOpacity = ctxCloudOpacity;
  const setCloudOpacity = ctxSetCloudOpacity;

  useEffect(() => {
    resetRefs();
  }, [data, resetRefs]);

  return (
    <>
      <Menu data={data} />
      <div className="fixed bottom-0 left-0 z-10 p-3">
        <button className="outline-0 text-xs" onClick={() => setFollow(!follow)}>
          {follow ? "Following" : "Not following"}
        </button>
      </div>
      <div className="fixed top-2 right-2 z-10 flex flex-col gap-1 rounded-md bg-black/60 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="planet-distance" className="w-14 shrink-0">Orbit</label>
          <input
            id="planet-distance"
            type="range"
            min="0.01"
            max="2"
            step="0.01"
            value={planetDistanceFactor}
            onChange={(e) => setPlanetDistanceFactor(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{planetDistanceFactor.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="binary-distance" className="w-14 shrink-0">Stars</label>
          <input
            id="binary-distance"
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={binaryDistanceFactor}
            onChange={(e) => setBinaryDistanceFactor(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{binaryDistanceFactor.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="body-scale" className="w-14 shrink-0">Bodies</label>
          <input
            id="body-scale"
            type="range"
            min="1"
            max="50"
            step="1"
            value={bodyScale}
            onChange={(e) => setBodyScale(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{bodyScale}x</span>
        </div>
        <div className="my-0.5 border-t border-white/10" />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="nebula-density" className="w-14 shrink-0">Nebula</label>
          <input
            id="nebula-density"
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={nebulaDensity}
            onChange={(e) => setNebulaDensity(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{nebulaDensity.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="nebula-bright" className="w-14 shrink-0">Bright</label>
          <input
            id="nebula-bright"
            type="range"
            min="0.05"
            max="2"
            step="0.05"
            value={nebulaBrightness}
            onChange={(e) => setNebulaBrightness(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{nebulaBrightness.toFixed(2)}</span>
        </div>
        <div className="my-0.5 border-t border-white/10" />
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showHabitableZone}
            onChange={(e) => setShowHabitableZone(e.target.checked)}
            className="accent-cyan-400"
          />
          Habitable Zone
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showSkybox}
            onChange={(e) => setShowSkybox(e.target.checked)}
            className="accent-cyan-400"
          />
          Starfield
        </label>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="sky-bright" className="w-14 shrink-0">Sky Brt</label>
          <input
            id="sky-bright"
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={skyBrightness}
            onChange={(e) => setSkyBrightness(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{skyBrightness.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="sky-contrast" className="w-14 shrink-0">Sky Con</label>
          <input
            id="sky-contrast"
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={skyContrast}
            onChange={(e) => setSkyContrast(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{skyContrast.toFixed(2)}</span>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showNebula}
            onChange={(e) => setShowNebula(e.target.checked)}
            className="accent-cyan-400"
          />
          Nebula
        </label>
        <div className="my-0.5 border-t border-white/10" />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="atmos-intensity" className="w-14 shrink-0">Atmos</label>
          <input
            id="atmos-intensity"
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={atmosIntensity}
            onChange={(e) => setAtmosIntensity(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{atmosIntensity.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="atmos-falloff" className="w-14 shrink-0">Falloff</label>
          <input
            id="atmos-falloff"
            type="range"
            min="0.5"
            max="8"
            step="0.1"
            value={atmosFalloff}
            onChange={(e) => setAtmosFalloff(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{atmosFalloff.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="glow-intensity" className="w-14 shrink-0">Glow</label>
          <input
            id="glow-intensity"
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={glowIntensity}
            onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{glowIntensity.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="glow-scale" className="w-14 shrink-0">G.Scale</label>
          <input
            id="glow-scale"
            type="range"
            min="1.0"
            max="10.0"
            step="0.05"
            value={glowScale}
            onChange={(e) => setGlowScale(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{glowScale.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="glow-falloff" className="w-14 shrink-0">G.Fall</label>
          <input
            id="glow-falloff"
            type="range"
            min="0.1"
            max="5"
            step="0.05"
            value={glowFalloff}
            onChange={(e) => setGlowFalloff(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{glowFalloff.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="glow-inner" className="w-14 shrink-0">G.Inner</label>
          <input
            id="glow-inner"
            type="range"
            min="0"
            max="0.9"
            step="0.01"
            value={glowInner}
            onChange={(e) => setGlowInner(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{glowInner.toFixed(2)}</span>
        </div>
        <div className="my-0.5 border-t border-white/10" />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="cloud-coverage" className="w-14 shrink-0">Clouds</label>
          <input
            id="cloud-coverage"
            type="range"
            min="0.1"
            max="0.7"
            step="0.01"
            value={cloudCoverage}
            onChange={(e) => setCloudCoverage(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{cloudCoverage.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label htmlFor="cloud-opacity" className="w-14 shrink-0">Cl.Opac</label>
          <input
            id="cloud-opacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={cloudOpacity}
            onChange={(e) => setCloudOpacity(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-7 tabular-nums text-right">{cloudOpacity.toFixed(2)}</span>
        </div>
      </div>
      <div id="canvas-container">
        <Canvas dpr={[1, 2]} camera={{ far: 100000000, near: 0.001, fov: 50 }}>
          {showSkybox && <MilkyWaySkybox brightness={skyBrightness} contrast={skyContrast} />}
          <ambientLight intensity={0.05} />
          {showNebula && <Nebula seed={data?.name?.[0] ?? "system"} density={nebulaDensity} brightness={nebulaBrightness} starTemp={getPrimaryStarTemp(data)} />}
          <Binary data={data} />
          <Controls follow={follow} />
        </Canvas>
      </div>
    </>
  );
};

export default Root;
