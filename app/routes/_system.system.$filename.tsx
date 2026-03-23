import path from "path";
import { useLoaderData } from "react-router";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { fileURLToPath } from "url";
import { useEffect, useContext, useState } from "react";
import { RefContext, RefProvider } from "~/components/RefContext";
import { EnvContext, EnvProvider } from "~/components/EnvContext";
import Binary from "~/components/Binary";
import Menu from "~/components/Menu";
import { Canvas } from "@react-three/fiber";
import Controls from "~/components/Controls";

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
  } = useContext(EnvContext);
  const [follow, setFollow] = useState(true);

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
      </div>
      <div id="canvas-container">
        <Canvas dpr={[1, 2]} camera={{ far: 100000000, near: 0.001, fov: 50 }}>
          <ambientLight intensity={0.05} />
          <Binary data={data} />
          <Controls follow={follow} />
        </Canvas>
      </div>
    </>
  );
};

export default Root;
