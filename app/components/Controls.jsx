import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { RefContext } from "./RefContext";
import { useEffect, useContext, useRef, useState } from "react";
import * as THREE from "three";
import { useKeyState } from "use-key-state";

const _objectPosition = new THREE.Vector3();
const _starWorldPos = new THREE.Vector3();

const Controls = ({ follow, autoRotate = false, viewAzimuth = 0, viewPolar = Math.PI * 0.45 }) => {
  const { activeRef, refs } = useContext(RefContext);
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

      // First selection (initial load) is instant, subsequent ones animate
      const isFirstSelect = !cameraControlsRef.current._hasInitialTarget;
      cameraControlsRef.current._hasInitialTarget = true;
      const animate = !isFirstSelect;

      cameraControlsRef.current.setTarget(
        _objectPosition.x,
        _objectPosition.y,
        _objectPosition.z,
        animate
      );

      // Set min distance to the object's bounding sphere radius
      const bbox = new THREE.Box3().setFromObject(activeRef.current);
      const sphere = new THREE.Sphere();
      bbox.getBoundingSphere(sphere);
      cameraControlsRef.current.minDistance = sphere.radius * 1.02;

      // Check if this is a binary group (has children with stars, not a mesh itself)
      const isBinary = !activeRef.current.geometry;

      if (isBinary) {
        // For binaries: zoom to a reasonable distance showing the stars,
        // not the entire orbit system. Use a moderate multiple of the
        // separation between direct child stars.
        let maxChildDist = 0;
        activeRef.current.children.forEach(child => {
          if (child.position) {
            maxChildDist = Math.max(maxChildDist, child.position.length());
          }
        });
        const viewDist = Math.max(maxChildDist * 4, 50);
        cameraControlsRef.current.dollyTo(viewDist, animate);
      } else {
        // For stars/planets: fitToBox then orient for horizontal orbit + 80/20 lighting
        cameraControlsRef.current.fitToBox(activeRef.current, animate);

        // Find parent star position for sun-aware camera angle
        // Planet mesh → orbit group → star group
        const parent = activeRef.current.parent;
        const starGroup = parent?.parent;
        if (starGroup && starGroup.getWorldPosition) {
          starGroup.getWorldPosition(_starWorldPos);

          // Sun direction from planet to star, projected to XZ plane
          const dx = _starWorldPos.x - _objectPosition.x;
          const dz = _starWorldPos.z - _objectPosition.z;
          const sunDist = Math.sqrt(dx * dx + dz * dz);

          if (sunDist > 0.01) {
            // Azimuth of sun direction
            const sunAzimuth = Math.atan2(dx, dz);
            // Offset ~30° from sun for 80% lit / 20% shadow
            const cameraAzimuth = sunAzimuth + 0.5;
            // Eye level for horizontal orbit
            const cameraPolar = Math.PI / 2;
            cameraControlsRef.current.rotateTo(cameraAzimuth, cameraPolar, animate);
          }
        } else if (!isFirstSelect) {
          // Fallback: preserve polar angle
          cameraControlsRef.current.rotatePolarTo(Math.PI / 2, animate);
        }
      }
    }
  }, [activeRef]);

  // Live camera angle update from sliders
  useEffect(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.rotateTo(viewAzimuth, viewPolar, true);
    }
  }, [viewAzimuth, viewPolar]);

  useFrame((state, delta) => {
    const elapsedTime = state.clock.getElapsedTime();
    if (
      cameraControlsRef.current &&
      activeRef?.current?.getWorldPosition instanceof Function
    ) {
      activeRef.current.getWorldPosition(_objectPosition);

      const tx = _objectPosition.x;
      const ty = _objectPosition.y;
      const tz = _objectPosition.z;

      if (follow) {
        cameraControlsRef.current.moveTo(tx, ty, tz, true);
      } else {
        cameraControlsRef.current.setTarget(tx, ty, tz, true);
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
      if (autoRotate && !keyDown && !cameraControlsRef.current.active) {
        cameraControlsRef.current.azimuthAngle += 0.00005 * delta * 60;
      }
    }
  });

  return <CameraControls makeDefault ref={cameraControlsRef} maxDistance={49000} />;
};

export default Controls;
