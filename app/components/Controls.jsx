import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { RefContext } from "./RefContext";
import { useEffect, useContext, useRef, useState } from "react";
import * as THREE from "three";
import { useKeyState } from "use-key-state";

const Controls = ({ follow }) => {
  const { activeRef } = useContext(RefContext);
  const cameraControlsRef = useRef();
  const { camera } = useThree();

  const [keyDown, setKeyDown] = useState(false);
  const [sensitivity, setSensitivity] = useState(25.0);

  const { ...keys } = useKeyState({
    w: "w",
    a: "a",
    s: "s",
    d: "d",
    up: "up",
    down: "down",
    left: "left",
    right: "right",
    plus: "plus",
    minus: "minus",
    enter: "enter",
  });

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
      // cameraControlsRef.current.rotate(
      //   90 * THREE.MathUtils.DEG2RAD,
      //   80 * THREE.MathUtils.DEG2RAD
      // );
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

      if (follow) {
        cameraControlsRef.current.moveTo(
          objectPosition.x,
          objectPosition.y,
          objectPosition.z,
          true
        );
      } else {
        cameraControlsRef.current.setTarget(
          objectPosition.x,
          objectPosition.y,
          objectPosition.z,
          true
        );
      }

      // console.log({ follow });

      if (keys.plus.down) {
        setSensitivity(sensitivity + 0.1);
      }
      if (keys.minus.down) {
        setSensitivity(sensitivity - 0.1);
      }
      if (keys.enter.pressed) {
        setKeyDown(false);
      }

      if (keys.a.pressed) {
        cameraControlsRef.current.truck(
          -0.5 * sensitivity * 0.25 * delta * elapsedTime,
          0,
          true
        );
        setKeyDown(true);
      }
      if (keys.d.pressed) {
        cameraControlsRef.current.truck(
          0.5 * sensitivity * delta * elapsedTime,
          0,
          true
        );
        setKeyDown(true);
      }
      if (keys.w.pressed) {
        cameraControlsRef.current.dolly(
          0.5 * sensitivity * delta * elapsedTime,
          true
        );
        setKeyDown(true);
      }
      if (keys.s.pressed) {
        cameraControlsRef.current.dolly(
          -0.5 * sensitivity * 0.25 * delta * elapsedTime,
          true
        );
        setKeyDown(true);
      }

      if (keys.left.pressed) {
        cameraControlsRef.current.rotate(
          -0.05 * sensitivity * THREE.MathUtils.DEG2RAD * delta * elapsedTime,
          0,
          true
        );
        setKeyDown(true);
      }
      if (keys.right.pressed) {
        cameraControlsRef.current.rotate(
          0.05 * sensitivity * THREE.MathUtils.DEG2RAD * delta * elapsedTime,
          0,
          true
        );
        setKeyDown(true);
      }
      if (keys.up.pressed) {
        cameraControlsRef.current.rotate(
          0,
          -0.05 * sensitivity * THREE.MathUtils.DEG2RAD * delta * elapsedTime,
          true
        );
        setKeyDown(true);
      }
      if (keys.down.pressed) {
        cameraControlsRef.current.rotate(
          0,
          0.05 * sensitivity * THREE.MathUtils.DEG2RAD * delta * elapsedTime,
          true
        );
        setKeyDown(true);
      }
    }
  });

  return <CameraControls makeDefault ref={cameraControlsRef} />;
};

export default Controls;
