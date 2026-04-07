import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { RefContext } from "./RefContext";
import { useEffect, useContext, useRef, useState } from "react";
import * as THREE from "three";
import { useKeyState } from "use-key-state";

const _objectPosition = new THREE.Vector3();
const _planetPos = new THREE.Vector3();
const _toPlanet = new THREE.Vector3();
const _flightDir = new THREE.Vector3();
const _closestPt = new THREE.Vector3();
const _avoidDir = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _currentOffset = new THREE.Vector3();
const _zero = new THREE.Vector3();

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
      // so the camera can't clip through the surface
      const bbox = new THREE.Box3().setFromObject(activeRef.current);
      const sphere = new THREE.Sphere();
      bbox.getBoundingSphere(sphere);
      cameraControlsRef.current.minDistance = sphere.radius * 1.02;

      cameraControlsRef.current.fitToBox(activeRef.current, animate);
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

      // --- Obstacle avoidance: curve camera path around other planets ---
      _offset.set(0, 0, 0);
      const camPos = camera.position;
      _flightDir.copy(_objectPosition).sub(camPos);
      const flightDist = _flightDir.length();
      if (flightDist > 0.1) {
        _flightDir.divideScalar(flightDist); // normalize

        for (const key in refs) {
          const planetRef = refs[key];
          if (!planetRef?.current?.getWorldPosition) continue;
          if (planetRef === activeRef) continue;
          // Only avoid planets and stars (skip binaries etc.)
          const meta = planetRef.current.metadata;
          if (!meta || (meta.type !== "planet" && meta.type !== "star")) continue;

          planetRef.current.getWorldPosition(_planetPos);

          // Project planet position onto flight ray
          _toPlanet.copy(_planetPos).sub(camPos);
          const projection = _toPlanet.dot(_flightDir);
          if (projection < 0 || projection > flightDist) continue; // behind or beyond

          // Closest point on ray to planet center
          _closestPt.copy(camPos).addScaledVector(_flightDir, projection);
          const dist = _planetPos.distanceTo(_closestPt);

          // Get bounding radius (approximate from scale)
          const bbox = new THREE.Box3().setFromObject(planetRef.current);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const radius = Math.max(size.x, size.y, size.z) * 0.5;
          const avoidRadius = radius * 3.0; // generous avoidance zone

          if (dist < avoidRadius && dist > 0.001) {
            // Push away from planet perpendicular to flight path
            _avoidDir.copy(_closestPt).sub(_planetPos).normalize();
            const strength = (avoidRadius - dist) / avoidRadius;
            _offset.addScaledVector(_avoidDir, strength * radius * 2.0);
          }
        }
      }

      // Smooth the offset (blend in when avoiding, decay when clear)
      if (_offset.lengthSq() > 0.001) {
        _currentOffset.lerp(_offset, 0.04);
      } else {
        _currentOffset.lerp(_zero, 0.08);
      }

      const tx = _objectPosition.x + _currentOffset.x;
      const ty = _objectPosition.y + _currentOffset.y;
      const tz = _objectPosition.z + _currentOffset.z;

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
