import path from "path";
import { json } from "@remix-run/node";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { useLoaderData } from "@remix-run/react";
import { fileURLToPath } from "url";
import { useEffect, useContext, useState, useRef } from "react";
import { RefContext, RefProvider } from "~/components/RefContext";
import { EnvProvider } from "~/components/EnvContext";
import BinaryBasic from "~/components/BinaryBasic";
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

  return json(jsonData);
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
  const { resetRefs, activeRef } = useContext(RefContext);
  const [cursor, setCursor] = useState("default");
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    resetRefs();
  }, [data, resetRefs]);

  return (
    <>
      <Menu data={data} />
      <div className="controls bottom-0 left-0 fixed z-10">
        <button className=" outline-0 p-3" onClick={() => setFollow(!follow)}>
          {follow ? "Following" : "Not following"}
        </button>
      </div>
      <div id="canvas-container" style={{ cursor: cursor }}>
        <Canvas dpr={[1, 2]} camera={{ far: 100000000, near: 0.001, fov: 50 }}>
          <ambientLight intensity={0.05} />
          <Binary data={data} />
          <Controls follow={follow} />
        </Canvas>
      </div>
      {/* <div className="w-full h-svh flex justify-center items-center">
        <BinaryBasic data={data} />
      </div> */}
      {/* <div className="max-w-5xl">
        <pre className=" whitespace-pre-wrap ">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div> */}
    </>
  );
};

export default Root;
