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
import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { createPlanetMaterial, createCloudMaterial } from "~/shaders/planetShader";
import { buildShaderParams, numericSeedToVec3 } from "~/utils/planetSnapshot";
import type { PlanetType as CatType } from "~/components/PlanetCanvas";

const RENDER_PX    = 1300;                      // canvas side length in px
const ZOOM         = (RENDER_PX * 3) / 8;       // sphere diameter ≈ 75% of canvas
const AUTO_SPEED   = 0.04;                      // rad/s baseline auto-rotation
const DRAG_SENS    = 0.006;                     // rad per px of pointer drag
const BLEND_HALF   = 0.8;                       // seconds to blend velocity → auto

// ── TEMPORARY: live light tuning GUI ────────────────────────────────────────
// Remove the <LightGuiPanel> element in LivePlanet's JSX and the ref plumbing
// once a final direction/ambient is dialed in.

interface LightParams {
  x: number;         // sun direction X (-1..1) — +X = light travels left→right
  y: number;         // sun direction Y (-1..1) — +Y = sun above the equator
  z: number;         // sun direction Z (-1..1) — +Z = light travels toward camera
  intensity: number; // u_sunIntensity (0..3) — overall lit-side brightness
  ambient: number;   // u_ambient (0..1) — night-side brightness lift
  wrapRange: number; // u_wrapRange (0..1) — terminator softness
  wrapPower: number; // u_wrapPower (1..6) — terminator falloff sharpness
}

const DEFAULT_LIGHT: LightParams = {
  x: 0.8,
  y: 0.2,
  z: 0.45,
  intensity: 1.0,
  ambient: 0.0,
  wrapRange: 0.65,
  wrapPower: 4.0,
};

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
  lightRef: React.MutableRefObject<LightParams>;
}

function PlanetMesh({ type, seed, isDragging, rotY, vel, lightRef }: PlanetMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const params = useMemo(
    () => buildShaderParams(type, numericSeedToVec3(seed)),
    [type, seed],
  );

  const mat = useMemo(() => {
    const m = createPlanetMaterial(params);
    const { x, y, z } = lightRef.current;
    const v = new THREE.Vector3(x, y, z).normalize();
    m.uniforms.u_sunDirection.value.copy(v);
    m.uniforms.u_sunDirectionLocal.value.copy(v);
    m.uniforms.u_lod.value = 1.0;
    m.uniforms.u_ambient.value = lightRef.current.ambient;
    m.uniforms.u_wrapRange.value = lightRef.current.wrapRange;
    if (m.uniforms.u_wrapPower) m.uniforms.u_wrapPower.value = lightRef.current.wrapPower;
    if (m.uniforms.u_sunIntensity) m.uniforms.u_sunIntensity.value = lightRef.current.intensity;
    if (m.uniforms.u_gasBands) m.uniforms.u_gasBands.value = 2.5;
    return m;
  }, [params, lightRef]);

  // Cloud layer — returns null for any type other than TEMPERATE / WATER_WORLD,
  // which matches the terrestrial/ocean gate in createCloudMaterial.
  const cloudMat = useMemo(() => {
    const cm = createCloudMaterial(params);
    if (!cm) return null;
    const { x, y, z } = lightRef.current;
    const v = new THREE.Vector3(x, y, z).normalize();
    cm.uniforms.u_sunDirection.value.copy(v);
    cm.uniforms.u_sunDirectionLocal.value.copy(v);
    cm.uniforms.u_lod.value = 1.0;
    cm.uniforms.u_wrapRange.value = lightRef.current.wrapRange;
    if (cm.uniforms.u_wrapPower) cm.uniforms.u_wrapPower.value = lightRef.current.wrapPower;
    if (cm.uniforms.u_sunIntensity) cm.uniforms.u_sunIntensity.value = lightRef.current.intensity;
    return cm;
  }, [params, lightRef]);
  const cloudRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    // advance shader time
    timeRef.current += delta;
    mat.uniforms.u_time.value = timeRef.current;

    // live light tuning: pull latest values from the ref each frame so slider
    // movement takes effect without re-creating the material
    const { x, y, z, intensity, ambient, wrapRange, wrapPower } = lightRef.current;
    const sun = mat.uniforms.u_sunDirection.value as THREE.Vector3;
    sun.set(x, y, z);
    const len = sun.length();
    if (len > 0) sun.multiplyScalar(1 / len);
    (mat.uniforms.u_sunDirectionLocal.value as THREE.Vector3).copy(sun);
    mat.uniforms.u_ambient.value = ambient;
    mat.uniforms.u_wrapRange.value = wrapRange;
    if (mat.uniforms.u_wrapPower) mat.uniforms.u_wrapPower.value = wrapPower;
    if (mat.uniforms.u_sunIntensity) mat.uniforms.u_sunIntensity.value = intensity;

    // Mirror onto cloud material (when present) so clouds stay lit consistently
    if (cloudMat) {
      cloudMat.uniforms.u_time.value = timeRef.current;
      (cloudMat.uniforms.u_sunDirection.value as THREE.Vector3).copy(sun);
      (cloudMat.uniforms.u_sunDirectionLocal.value as THREE.Vector3).copy(sun);
      cloudMat.uniforms.u_wrapRange.value = wrapRange;
      if (cloudMat.uniforms.u_wrapPower) cloudMat.uniforms.u_wrapPower.value = wrapPower;
      if (cloudMat.uniforms.u_sunIntensity) cloudMat.uniforms.u_sunIntensity.value = intensity;
    }

    // rotation: drag moves rotY directly; when released, velocity decays
    // exponentially back to AUTO_SPEED (same feel as orbit controls inertia)
    if (!isDragging.current) {
      const t = 1 - Math.exp(-delta / BLEND_HALF);
      vel.current += (AUTO_SPEED - vel.current) * t;
      rotY.current += vel.current * delta;
    }

    if (meshRef.current) meshRef.current.rotation.y = rotY.current;
    // Cloud sphere co-rotates with the planet
    if (cloudRef.current) cloudRef.current.rotation.y = rotY.current;
  });

  return (
    <>
      {/* 96×96 segments for a smooth silhouette at 1300px render size. Using
          `material={mat}` (not <primitive>) so R3F cleanly rebinds when the
          memoized material is recreated by a type/seed change. */}
      <mesh ref={meshRef} material={mat}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>
      {cloudMat && (
        <mesh ref={cloudRef} material={cloudMat} frustumCulled={false}>
          {/* slightly larger than surface sphere (matches Planet.jsx offset) */}
          <sphereGeometry args={[1.006, 64, 32]} />
        </mesh>
      )}
    </>
  );
}

// ── TEMPORARY: light tuning panel ────────────────────────────────────────────

function LightGuiPanel({
  value,
  onChange,
  onReset,
  currentType,
}: {
  value: LightParams;
  onChange: (next: LightParams) => void;
  onReset: () => void;
  currentType?: string;
}) {
  // Mount-gate so SSR and first client render both return null; the panel
  // appears on the next render after hydration, avoiding mismatch warnings.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const set = (k: keyof LightParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: parseFloat(e.target.value) });

  const row = (
    label: string,
    k: keyof LightParams,
    min: number,
    max: number,
    step = 0.01,
  ) => {
    // Guard against stale HMR state that may not have every field yet
    const v = typeof value[k] === "number" ? value[k] : DEFAULT_LIGHT[k];
    return (
      <label
        style={{ display: "grid", gridTemplateColumns: "70px 1fr 56px", alignItems: "center", gap: 8 }}
      >
        <span style={{ opacity: 0.7 }}>{label}</span>
        <input type="range" min={min} max={max} step={step} value={v} onChange={set(k)} />
        <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
          {v.toFixed(2)}
        </span>
      </label>
    );
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        width: 280,
        padding: 14,
        background: "rgba(10,10,14,0.92)",
        color: "#eee",
        font: "12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: 0.85,
        }}
      >
        <span style={{ letterSpacing: 1.5 }}>
          LIGHT (TEMP){currentType ? ` · ${currentType}` : ""}
        </span>
        <button
          onClick={onReset}
          style={{
            background: "transparent",
            color: "#eee",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          reset
        </button>
      </div>
      {row("sun X", "x", -1, 1)}
      {row("sun Y", "y", -1, 1)}
      {row("sun Z", "z", -1, 1)}
      {row("intensity", "intensity", 0, 3)}
      {row("ambient", "ambient", 0, 1)}
      {row("wrap", "wrapRange", 0, 1)}
      {row("power", "wrapPower", 1, 6)}
      <div style={{ opacity: 0.5, fontSize: 11 }}>
        +X = source on screen-left · +Y = above · +Z = behind camera
      </div>
    </div>,
    document.body,
  );
}

// ── public component ─────────────────────────────────────────────────────────

export interface LivePlanetProps {
  type: CatType;
  seed: number;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Horizontal offset of the sphere within the container, as a fraction of
   * container width. 0 = centered. 0.2 = shifted right by 20% of width.
   * Lets the masthead place the planet to one side without narrowing the
   * container (which would clip the canvas with a straight edge).
   */
  offsetX?: number;
}

export function LivePlanet({ type, seed, className, style, offsetX = 0 }: LivePlanetProps) {
  // Shared drag state — refs so pointer handlers never trigger re-renders
  const isDragging = useRef(false);
  const rotY       = useRef(0);
  const vel        = useRef(AUTO_SPEED);   // start at auto speed, not 0
  const lastDragX  = useRef(0);
  const innerRef   = useRef<HTMLDivElement>(null);

  // TEMPORARY light-tuning GUI: state drives sliders, ref is what useFrame
  // reads each tick (avoids rebuilding the material on every slider nudge)
  const [light, setLight] = useState<LightParams>(DEFAULT_LIGHT);
  const lightRef = useRef<LightParams>(DEFAULT_LIGHT);
  useEffect(() => { lightRef.current = light; }, [light]);

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
          // Shift the inner div's center horizontally; pure translation, no
          // scale, so getBoundingClientRect() dimensions stay at RENDER_PX.
          left: `${50 + offsetX * 100}%`,
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
            key={`${type}-${seed}`}
            type={type}
            seed={seed}
            isDragging={isDragging}
            rotY={rotY}
            vel={vel}
            lightRef={lightRef}
          />
        </Canvas>
      </div>
      {/* Temporary light-tuning GUI — hidden. Re-enable by uncommenting.
      <LightGuiPanel
        value={light}
        onChange={setLight}
        onReset={() => setLight(DEFAULT_LIGHT)}
        currentType={String(type)}
      />
      */}
    </div>
  );
}
