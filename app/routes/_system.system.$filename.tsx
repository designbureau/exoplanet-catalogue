import { json } from "@remix-run/node";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { useLoaderData } from "@remix-run/react";
import { fileURLToPath } from "url";
import path from "path";
import { useEffect, useContext, useState, useRef } from "react";
import { RefContext, RefProvider } from "~/components/RefContext";
import BinaryBasic from "~/components/BinaryBasic";
import Binary from "~/components/Binary";
import Menu from "~/components/Menu";
import { CameraControls } from "@react-three/drei";
import * as THREE from "three";

import { Canvas } from "@react-three/fiber";

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
  const { resetRefs, activeRef } = useContext(RefContext);
  const [cursor, setCursor] = useState("default");
  const cameraControlsRef = useRef();

  useEffect(() => {
    resetRefs();
  }, [data, resetRefs]);

  useEffect(() => {
    if (activeRef?.current && cameraControlsRef.current) {
      const objectPosition = new THREE.Vector3();
      activeRef.current.getWorldPosition(objectPosition);

      console.log({ objectPosition });

      cameraControlsRef.current.setTarget(
        objectPosition.x,
        objectPosition.y,
        objectPosition.z,
        true
      );
    }
  }, [activeRef]);

  return (
    <>
      {/* <div className="w-full h-svh flex justify-center items-center">
        <Menu data={data} />
        <BinaryBasic data={data} />
      </div> */}
      {/* 
      <div className="max-w-5xl">
        <pre className=" whitespace-pre-wrap ">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div> */}
      <Menu data={data} />
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
          <Binary data={data} />
          <CameraControls ref={cameraControlsRef} />
        </Canvas>
      </div>
    </>
  );
};

export default Root;
