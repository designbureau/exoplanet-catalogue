import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { RefContext } from "./RefContext";
import { useEffect, useContext, useRef, useState } from "react";
import * as THREE from "three";
import { useKeyState } from "use-key-state";

const _objectPosition = new THREE.Vector3();

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
    if (
      cameraControlsRef.current &&
      activeRef?.current?.getWorldPosition instanceof Function
    ) {
      activeRef.current.getWorldPosition(_objectPosition);
      cameraControlsRef.current.setTarget(
        _objectPosition.x,
        _objectPosition.y,
        _objectPosition.z,
        true
      );

      // Set min distance to the object's bounding sphere radius
      // so the camera can't clip through the surface
      const bbox = new THREE.Box3().setFromObject(activeRef.current);
      const sphere = new THREE.Sphere();
      bbox.getBoundingSphere(sphere);
      cameraControlsRef.current.minDistance = sphere.radius * 1.02;

      cameraControlsRef.current.fitToBox(activeRef.current, true);
    }
  }, [activeRef]);

  useFrame((state, delta) => {
    const elapsedTime = state.clock.getElapsedTime();
    if (
      cameraControlsRef.current &&
      activeRef?.current?.getWorldPosition instanceof Function
    ) {
      activeRef.current.getWorldPosition(_objectPosition);

      if (follow) {
        cameraControlsRef.current.moveTo(
          _objectPosition.x,
          _objectPosition.y,
          _objectPosition.z,
          true
        );
      } else {
        cameraControlsRef.current.setTarget(
          _objectPosition.x,
          _objectPosition.y,
          _objectPosition.z,
          true
        );
      }

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

      // Gentle auto-rotate when user isn't interacting
      if (!keyDown && !cameraControlsRef.current.active) {
        cameraControlsRef.current.azimuthAngle += 0.0001 * delta * 60;
      }
    }
  });

  return <CameraControls makeDefault ref={cameraControlsRef} maxDistance={49000} />;
};

export default Controls;
