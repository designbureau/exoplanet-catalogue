import { json } from "@remix-run/node";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { useLoaderData } from "@remix-run/react";
import { fileURLToPath } from "url";
import path from "path";
import { useEffect, useContext, useState, useRef } from "react";
import { RefContext, RefProvider } from "~/components/RefContext";
import Binary from "~/components/Binary";
import BinaryNew from "~/components/BinaryNew";
import Menu from "~/components/Menu";
import { OrbitControls, CameraControls } from "@react-three/drei";

import { Canvas, useFrame } from "@react-three/fiber";

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
    <RefProvider>
      <App data={data.system} />
    </RefProvider>
  );
};

const App = ({ data }: any) => {
  const { resetRefs } = useContext(RefContext);
  const [cursor, setCursor] = useState("default");

  useEffect(() => {
    resetRefs();
  }, [data, resetRefs]);

  return (
    <RefProvider>
      {/* <div className="w-full h-svh flex justify-center items-center">
        <Menu data={data} />
        <Binary data={data} />
      </div> */}
      <Menu data={data} />
      {/* <div className="max-w-5xl">
        <pre className=" whitespace-pre-wrap ">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div> */}
      {/* <Canvas dpr={[1, 2]}>
          <EnvContext.Provider value={Constants}>
            {useMemo(
              () => (
                <SkyBox />
              ),
              []
            )}
            {systemData && (
              <CreateSystem
                systemData={systemData}
                setFocus={setFocus}
                setClicked={setClicked}
                setDragged={setDragged}
                setViewState={setViewState}
                viewState={viewState}
                setRefsArray={setRefsArray}
                refs={refs}
              />
            )}
          </EnvContext.Provider>
          <Controls
            focus={focus}
            setFocus={setFocus}
            clicked={clicked}
            setDragged={setDragged}
            dragged={dragged}
            setClicked={setClicked}
            setInitialTarget={setInitialTarget}
            initialTarget={initialTarget}
            follow={follow}
          />
        </Canvas> */}
      <div id="canvas-container" style={{ cursor: cursor }}>
        <Canvas dpr={[1, 2]}>
          <ambientLight intensity={Math.PI / 2} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            decay={0}
            intensity={Math.PI}
          />
          <pointLight
            position={[-10, -10, -10]}
            decay={0}
            intensity={Math.PI}
          />
          <BinaryNew data={data} />
          <CameraControls />
        </Canvas>
      </div>
    </RefProvider>
  );
};

export default Root;
