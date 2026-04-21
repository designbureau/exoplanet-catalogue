/**
 * LivePlanet — real-time GLSL planet for hero contexts.
 *
 * Performance strategy: Canvas always renders at RENDER_PX × RENDER_PX.
 * The inner div is centered via translate(-50%,-50%) — a pure translation,
 * which does NOT change getBoundingClientRect() dimensions, so R3F always
 * measures the correct canvas size.
 *
 * Drag to rotate: pointer events on the inner div adjust rotation directly.
 * On release, velocity decays with exponential smoothing back to the constant
 * auto-rotate speed — the same feel as the system viewer.
 *
 * RENDER_PX=1300 renders ~1.69M pixels of 6-octave FBM — 2× the visible
 * sphere diameter vs 650, with the system viewer's detail level.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { createPlanetMaterial } from "~/shaders/planetShader";
import { buildShaderParams, numericSeedToVec3 } from "~/utils/planetSnapshot";
import type { PlanetType as CatType } from "~/components/PlanetCanvas";

const SUN_DIR = new THREE.Vector3(0.5, 0.28, 0.82).normalize();

const RENDER_PX    = 1300;                      // canvas side length in px
const ZOOM         = RENDER_PX / (2 * 1.15);   // sphere fills ~87% of canvas
const AUTO_SPEED   = 0.04;                      // rad/s baseline auto-rotation
const DRAG_SENS    = 0.006;                     // rad per px of pointer drag
const BLEND_HALF   = 0.8;                       // seconds to blend velocity → auto

// ── camera setup ─────────────────────────────────────────────────────────────

function OrthoFit() {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = ZOOM;
      camera.updateProjectionMatrix();
    }
  }, [camera]);
  return null;
}

// ── pre-compile to eliminate first-frame stutter ──────────────────────────────

function CompileHelper() {
  const { gl, scene, camera } = useThree();
  useEffect(() => { gl.compile(scene, camera); }, [gl, scene, camera]);
  return null;
}

// ── planet mesh ──────────────────────────────────────────────────────────────

interface PlanetMeshProps {
  type: CatType;
  seed: number;
  isDragging: React.MutableRefObject<boolean>;
  rotY: React.MutableRefObject<number>;
  vel: React.MutableRefObject<number>;
}

function PlanetMesh({ type, seed, isDragging, rotY, vel }: PlanetMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const params = useMemo(
    () => buildShaderParams(type, numericSeedToVec3(seed)),
    [type, seed],
  );

  const mat = useMemo(() => {
    const m = createPlanetMaterial(params);
    m.uniforms.u_sunDirection.value.copy(SUN_DIR);
    m.uniforms.u_sunDirectionLocal.value.copy(SUN_DIR);
    m.uniforms.u_lod.value = 1.0;
    m.uniforms.u_ambient.value = 0.22;
    m.uniforms.u_wrapRange.value = 0.65;
    if (m.uniforms.u_gasBands) m.uniforms.u_gasBands.value = 2.5;
    return m;
  }, [params]);

  useFrame((_, delta) => {
    // advance shader time
    timeRef.current += delta;
    mat.uniforms.u_time.value = timeRef.current;

    // rotation: drag moves rotY directly; when released, velocity decays
    // exponentially back to AUTO_SPEED (same feel as orbit controls inertia)
    if (!isDragging.current) {
      const t = 1 - Math.exp(-delta / BLEND_HALF);
      vel.current += (AUTO_SPEED - vel.current) * t;
      rotY.current += vel.current * delta;
    }

    if (meshRef.current) meshRef.current.rotation.y = rotY.current;
  });

  return (
    <mesh ref={meshRef}>
      {/* 96×96 segments for a smooth silhouette at 1300px render size */}
      <sphereGeometry args={[1, 96, 96]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

// ── public component ─────────────────────────────────────────────────────────

export interface LivePlanetProps {
  type: CatType;
  seed: number;
  className?: string;
  style?: React.CSSProperties;
}

export function LivePlanet({ type, seed, className, style }: LivePlanetProps) {
  // Shared drag state — refs so pointer handlers never trigger re-renders
  const isDragging = useRef(false);
  const rotY       = useRef(0);
  const vel        = useRef(AUTO_SPEED);   // start at auto speed, not 0
  const lastDragX  = useRef(0);
  const innerRef   = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastDragX.current  = e.clientX;
    // capture so moves are tracked even outside the element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (innerRef.current) innerRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastDragX.current;
    lastDragX.current = e.clientX;
    rotY.current += dx * DRAG_SENS;
    // keep a running throw velocity estimate (dx per frame → rad/s at ~60fps)
    vel.current = dx * DRAG_SENS * 60;
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
    // vel.current is already set to the throw velocity in onPointerMove;
    // useFrame's exponential blend will ease it back to AUTO_SPEED
    if (innerRef.current) innerRef.current.style.cursor = "grab";
  }, []);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {/*
       * Fixed RENDER_PX canvas, centered with a pure translation.
       * translate(-50%,-50%) does NOT change getBoundingClientRect() dimensions,
       * so R3F always sees a RENDER_PX×RENDER_PX container.
       *
       * pointer-events: auto overrides any pointer-events: none on ancestors
       * (e.g. the masthead planet container) so drag still works.
       */}
      <div
        ref={innerRef}
        style={{
          position: "absolute",
          width: RENDER_PX,
          height: RENDER_PX,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "auto",
          cursor: "grab",
          touchAction: "none",   // prevent scroll hijack on mobile
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 3], near: 0.1, far: 10 }}
          gl={{ alpha: true, antialias: false }}
          dpr={1}
        >
          <OrthoFit />
          <CompileHelper />
          <PlanetMesh
            type={type}
            seed={seed}
            isDragging={isDragging}
            rotY={rotY}
            vel={vel}
          />
        </Canvas>
      </div>
    </div>
  );
}
