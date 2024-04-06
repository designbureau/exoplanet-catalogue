import { useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { RefContext } from "./RefContext";
import { useEffect, useContext, useRef } from "react";
import * as THREE from "three";

const Controls = () => {
  const { activeRef } = useContext(RefContext);
  const cameraControlsRef = useRef();

  useEffect(() => {
    // https://codesandbox.io/p/sandbox/cameracontrols-basic-sew669?file=%2Fsrc%2FApp.js
    if (activeRef?.current && cameraControlsRef.current) {
      const objectPosition = new THREE.Vector3();

      activeRef.current.getWorldPosition(objectPosition);
      cameraControlsRef.current.setTarget(
        objectPosition.x,
        objectPosition.y,
        objectPosition.z,
        true
      );

      cameraControlsRef.current.fitToBox(activeRef.current, true);
    }
  }, [activeRef]);

  useFrame((state, delta) => {
    const elapsedTime = state.clock.getElapsedTime();
    // console.log({ elapsedTime });
    if (activeRef) {
      const objectPosition = new THREE.Vector3();
      activeRef.current.getWorldPosition(objectPosition);

      cameraControlsRef.current.moveTo(
        objectPosition.x,
        objectPosition.y,
        objectPosition.z,
        false
      );
    }
  });

  return <CameraControls ref={cameraControlsRef} />;
};

export default Controls;
