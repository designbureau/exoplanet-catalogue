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
    if (
      cameraControlsRef.current &&
      activeRef?.current?.getWorldPosition instanceof Function
    ) {
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
    if (
      cameraControlsRef.current &&
      activeRef?.current?.getWorldPosition instanceof Function
    ) {
      const objectPosition = new THREE.Vector3();
      activeRef.current.getWorldPosition(objectPosition);

      // // Use setTarget to orient the camera towards the activeRef
      // cameraControlsRef.current.setTarget(
      //   objectPosition.x,
      //   objectPosition.y,
      //   objectPosition.z,
      //   true // Enable smooth transition
      // );

      cameraControlsRef.current.moveTo(
        objectPosition.x,
        objectPosition.y,
        objectPosition.z,
        true
      );
    }
  });

  return <CameraControls ref={cameraControlsRef} />;
};

export default Controls;
