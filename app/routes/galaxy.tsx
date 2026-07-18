import { useLoaderData, useNavigate, Link } from "react-router";
import type { MetaFunction } from "react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Html } from "@react-three/drei";
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import * as THREE from "three";
import {
  getSystemPositions,
  type SystemPosition,
} from "~/utils/parseSystemPositions";
import MilkyWay, { defaultParams, type MilkyWayParams } from "~/components/MilkyWay";
import { createStarMaterial, createStarGlowMaterial } from "~/shaders/starShader";
import StarEffects from "~/components/StarEffects";
import { ZODIAC_CONSTELLATIONS, type ConstellationStar } from "~/data/zodiacConstellations";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { SiteHeader } from "~/components/SiteHeader";

export const meta: MetaFunction = () => [
  { title: "Galaxy Map - Exoplanet Explorer" },
];

export const loader = async () => {
  const [systems, xmlFiles] = await Promise.all([
    getSystemPositions(),
    getXmlFilesList(),
  ]);
  return { systems, xmlFiles };
};

// Scale parsec distances down so the scene is navigable
// Most systems are within ~2000 pc; we'll use 1 pc = 1 scene unit
const SCALE = 1;

function StarField({
  systems,
  onSelect,
  onHover,
  onDoubleClick,
}: {
  systems: SystemPosition[];
  onSelect: (system: SystemPosition | null) => void;
  onHover: (system: SystemPosition | null) => void;
  onDoubleClick: (system: SystemPosition) => void;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const { raycaster, camera, pointer } = useThree();

  // Build geometry from system positions
  const { geometry, colors } = useMemo(() => {
    const positions = new Float32Array(systems.length * 3);
    const colorArray = new Float32Array(systems.length * 3);

    for (let i = 0; i < systems.length; i++) {
      positions[i * 3] = systems[i].x * SCALE;
      positions[i * 3 + 1] = systems[i].z * SCALE;
      positions[i * 3 + 2] = systems[i].y * SCALE;

      const pc = systems[i].planetCount;
      if (pc === 0) {
        colorArray[i * 3] = 0.6;
        colorArray[i * 3 + 1] = 0.6;
        colorArray[i * 3 + 2] = 0.7;
      } else if (pc <= 3) {
        colorArray[i * 3] = 0.2;
        colorArray[i * 3 + 1] = 0.8;
        colorArray[i * 3 + 2] = 0.9;
      } else {
        colorArray[i * 3] = 1.0;
        colorArray[i * 3 + 1] = 0.85;
        colorArray[i * 3 + 2] = 0.2;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

    return { geometry: geo, colors: colorArray };
  }, [systems]);

  // Raycast helper — returns system closest to cursor ray
  const raycastNearest = useCallback(() => {
    if (!pointsRef.current) return null;
    raycaster.setFromCamera(pointer, camera);
    raycaster.params.Points = { threshold: 15 };
    const intersects = raycaster.intersectObject(pointsRef.current);
    if (intersects.length === 0) return null;
    // Sort by distanceToRay to pick the star closest to the actual click point
    intersects.sort((a, b) => (a.distanceToRay ?? Infinity) - (b.distanceToRay ?? Infinity));
    const hit = intersects[0];
    if (hit.index !== undefined) return systems[hit.index];
    return null;
  }, [systems, raycaster, camera, pointer]);

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const system = raycastNearest();
      onSelect(system);
    },
    [raycastNearest, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const system = raycastNearest();
      if (system) onDoubleClick(system);
    },
    [raycastNearest, onDoubleClick]
  );

  // Update camera distance uniform for point size scaling
  useFrame(({ camera }) => {
    if (pointsRef.current) {
      const mat = (pointsRef.current as any).material;
      if (mat?.uniforms?.uCamDist) {
        mat.uniforms.uCamDist.value = camera.position.length();
      }
    }
  });

  const handlePointerMove = useCallback(
    (e: any) => {
      e.stopPropagation();
      const system = raycastNearest();
      document.body.style.cursor = system ? "pointer" : "default";
      onHover(system);
    },
    [raycastNearest, onHover]
  );

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      renderOrder={10}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        document.body.style.cursor = "default";
        onHover(null);
      }}
    >
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexColors
        uniforms={{
          uCamDist: { value: 1000 },
        }}
        vertexShader={`
          varying vec3 vColor;
          uniform float uCamDist;
          void main() {
            vColor = color;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            float dist = -mvPos.z;
            // Size grows as camera gets closer: min 2px, max 12px
            float size = clamp(300.0 / dist, 2.0, 12.0);
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            // Radial gradient: soft glow circle
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            float alpha = 1.0 - d * d; // soft falloff
            float core = smoothstep(0.5, 0.0, d); // bright centre
            vec3 col = vColor + vec3(0.3) * core; // whiter in centre
            gl_FragColor = vec4(col, alpha * 0.85);
          }
        `}
      />
    </points>
  );
}

// Render the selected star exactly like in the system view
const STAR_RADIUS = 0.5;

function SelectionMarker({ system }: { system: SystemPosition }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.LineSegments>(null);
  const innerRingRef = useRef<THREE.LineSegments>(null);
  const midRingRef = useRef<THREE.Line>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const scaleRef = useRef(0);

  const temp = 5800;
  const { starMat, glowMat } = useMemo(() => ({
    starMat: createStarMaterial({ temperature: temp }),
    glowMat: createStarGlowMaterial({ temperature: temp }),
  }), []);

  // Reset scale on system change
  useEffect(() => {
    scaleRef.current = 0;
  }, [system]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    // Animate scale from 0 to 1
    scaleRef.current = Math.min(1, scaleRef.current + delta * 3);
    const s = 1 - Math.pow(1 - scaleRef.current, 3); // ease-out cubic
    if (groupRef.current) {
      groupRef.current.scale.setScalar(s);
    }
    if (ringRef.current) {
      ringRef.current.lookAt(state.camera.position);
      ringRef.current.rotation.z = t * 0.5;
    }
    if (midRingRef.current) {
      midRingRef.current.lookAt(state.camera.position);
    }
    if (innerRingRef.current) {
      innerRingRef.current.lookAt(state.camera.position);
      innerRingRef.current.rotation.z = -t * 0.3;
    }
    starMat.uniforms.u_time.value = t * 0.033; // 30x slower
  });

  const pos: [number, number, number] = [
    system.x * SCALE,
    system.z * SCALE,
    system.y * SCALE,
  ];

  return (
    <group ref={groupRef} position={pos} renderOrder={10} raycast={() => {}}>
      {/* Star sphere — same as system view */}
      <mesh material={starMat} raycast={() => {}}>
        <sphereGeometry args={[STAR_RADIUS, 32, 32]} />
      </mesh>

      {/* Glow sprite — same as system view (scale * 4) */}
      <sprite ref={glowRef} scale={[STAR_RADIUS * 4, STAR_RADIUS * 4, 1]} raycast={() => {}}>
        <primitive object={glowMat} attach="material" />
      </sprite>

      {/* Star effects — rays, flares, corona glow ring */}
      <StarEffects starRadius={STAR_RADIUS} temperature={temp} />

      {/* Outer crosshair ring — quarter marks extend outward */}
      <lineSegments ref={ringRef} raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={8}
            array={(() => {
              const pts = new Float32Array(8 * 3);
              const rInner = 1.3;
              const rOuter = 1.6;
              const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
              for (let i = 0; i < 4; i++) {
                const cos = Math.cos(angles[i]);
                const sin = Math.sin(angles[i]);
                pts[i * 6] = cos * rInner;
                pts[i * 6 + 1] = sin * rInner;
                pts[i * 6 + 2] = 0;
                pts[i * 6 + 3] = cos * rOuter;
                pts[i * 6 + 4] = sin * rOuter;
                pts[i * 6 + 5] = 0;
              }
              return pts;
            })()}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
      </lineSegments>
      {/* Thin solid circle between outer and inner rings */}
      <line ref={midRingRef} raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={65}
            array={(() => {
              const pts = new Float32Array(65 * 3);
              const r = 1.215; // midpoint of gap between inner (1.13) and outer (1.3)
              for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                pts[i * 3] = Math.cos(a) * r;
                pts[i * 3 + 1] = Math.sin(a) * r;
                pts[i * 3 + 2] = 0;
              }
              return pts;
            })()}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.2} depthWrite={false} />
      </line>
      {/* Inner crosshair ring — quarter marks extend inward */}
      <lineSegments ref={innerRingRef} raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={128}
            array={(() => {
              const pts = new Float32Array(128 * 3);
              const segments = 64;
              const rInner = 1.0;
              const rOuter = 1.13;
              const rInnerLong = 1.0 - (1.13 - 1.0) * 0.5; // 50% longer inward
              for (let i = 0; i < segments; i++) {
                const a = (i / segments) * Math.PI * 2;
                const cos = Math.cos(a);
                const sin = Math.sin(a);
                const isQuarter = (i % 16 === 0);
                const ri = isQuarter ? rInnerLong : rInner;
                pts[i * 6] = cos * ri;
                pts[i * 6 + 1] = sin * ri;
                pts[i * 6 + 2] = 0;
                pts[i * 6 + 3] = cos * rOuter;
                pts[i * 6 + 4] = sin * rOuter;
                pts[i * 6 + 5] = 0;
              }
              return pts;
            })()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={128}
            array={(() => {
              const cols = new Float32Array(128 * 3);
              const segments = 64;
              for (let i = 0; i < segments; i++) {
                const isQuarter = (i % 16 === 0);
                const r = isQuarter ? 1.0 : 0.133;
                const g = isQuarter ? 1.0 : 0.827;
                const b = isQuarter ? 1.0 : 0.933;
                cols[i * 6] = r; cols[i * 6 + 1] = g; cols[i * 6 + 2] = b;
                cols[i * 6 + 3] = r; cols[i * 6 + 4] = g; cols[i * 6 + 5] = b;
              }
              return cols;
            })()}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.5} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// Smooth camera fly-to using CameraControls built-in transitions
function CameraFlyTo({
  target,
  controlsRef,
}: {
  target: SystemPosition | null;
  controlsRef: React.RefObject<any>;
}) {
  useEffect(() => {
    if (!target || !controlsRef?.current) return;
    const cc = controlsRef.current;
    const tx = target.x * SCALE;
    const ty = target.z * SCALE;
    const tz = target.y * SCALE;

    // Get current camera position and direction to preserve viewing angle
    const camPos = cc.camera.position.clone();
    const curTarget = new THREE.Vector3();
    cc.getTarget(curTarget);

    // Compute the offset from current target to camera (viewing direction)
    const offset = camPos.clone().sub(curTarget);
    // Scale offset to desired final distance
    offset.normalize().multiplyScalar(2);

    // Smoothly transition both camera and target together
    cc.setLookAt(
      tx + offset.x, ty + offset.y, tz + offset.z, // new camera position
      tx, ty, tz,                                     // new look-at target
      true                                            // animate
    );
  }, [target]);

  return null;
}

// Convert RA (decimal hours) / Dec (decimal degrees) / Distance (parsecs) to scene coords
// Same mapping as StarField: x = cos(dec)*cos(ra), y = sin(dec), z = cos(dec)*sin(ra)
function starToScene(star: ConstellationStar): [number, number, number] {
  const raRad = (star.ra * 15 * Math.PI) / 180;
  const decRad = (star.dec * Math.PI) / 180;
  const d = star.distance;
  return [
    d * Math.cos(decRad) * Math.cos(raRad),
    d * Math.sin(decRad),
    d * Math.cos(decRad) * Math.sin(raRad),
  ];
}

function ConstellationLines({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const { lines, starPoints, labels } = useMemo(() => {
    const allLines: { points: THREE.Vector3[]; }[] = [];
    const allStars: THREE.Vector3[] = [];
    const allLabels: { position: [number, number, number]; name: string }[] = [];

    Object.values(ZODIAC_CONSTELLATIONS).forEach((constellation) => {
      const positions = constellation.stars.map(starToScene);

      // Star points
      positions.forEach((pos) => allStars.push(new THREE.Vector3(...pos)));

      // Connection lines
      constellation.connections.forEach(([a, b]) => {
        allLines.push({
          points: [
            new THREE.Vector3(...positions[a]),
            new THREE.Vector3(...positions[b]),
          ],
        });
      });

      // Label at centroid of constellation
      const cx = positions.reduce((s, p) => s + p[0], 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p[1], 0) / positions.length;
      const cz = positions.reduce((s, p) => s + p[2], 0) / positions.length;
      allLabels.push({ position: [cx, cy + 5, cz], name: constellation.name });
    });

    return { lines: allLines, starPoints: allStars, labels: allLabels };
  }, []);

  const starGeo = useMemo(() => {
    const positions = new Float32Array(starPoints.length * 3);
    starPoints.forEach((v, i) => {
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [starPoints]);

  return (
    <group>
      {/* Constellation star points */}
      <points geometry={starGeo}>
        <pointsMaterial
          size={1.5}
          sizeAttenuation={false}
          color="#ffeedd"
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>

      {/* Connection lines */}
      {lines.map((line, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(line.points);
        return (
          <line key={i} geometry={geo}>
            <lineBasicMaterial color="#aa8855" transparent opacity={0.6} />
          </line>
        );
      })}

      {/* Constellation name labels */}
      {labels.map((label) => (
        <Html
          key={label.name}
          position={label.position}
          center
          zIndexRange={[0, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="text-[9px] text-amber-200/60 whitespace-nowrap">
            {label.name}
          </span>
        </Html>
      ))}
    </group>
  );
}


// Subtle grid/axes at origin to show galactic reference
function GalacticReference({ onSolClick }: { onSolClick: () => void }) {
  return (
    <group>
      {/* Sol label — clicking selects Sol as a system */}
      <Html position={[0, 3, 0]} center>
        <div
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            onSolClick();
          }}
          className="cursor-pointer select-none rounded px-3 py-1 text-[10px] font-medium text-yellow-300 drop-shadow-[0_0_4px_rgba(255,221,68,0.6)] hover:bg-yellow-300/10 hover:text-yellow-100"
        >
          Sol
        </div>
      </Html>
      {/* Equatorial plane - circular grid (rings + radial lines) */}
      <group rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}} renderOrder={-1}>
        {/* Concentric rings */}
        {[200, 400, 600, 800, 1000].map((r) => (
          <mesh key={r} raycast={() => {}} renderOrder={-1}>
            <ringGeometry args={[r - 0.5, r + 0.5, 128]} />
            <meshBasicMaterial color="#445566" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
        {/* Radial lines every 30° (12 spokes) */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(angle) * 1000, Math.sin(angle) * 1000, 0),
          ];
          const geo = new THREE.BufferGeometry().setFromPoints(points);
          return (
            <line key={i} geometry={geo} raycast={() => {}} renderOrder={-1}>
              <lineBasicMaterial color="#556677" transparent opacity={0.6} depthWrite={false} />
            </line>
          );
        })}
      </group>
    </group>
  );
}

export default function GalaxyMap() {
  const { systems, xmlFiles } = useLoaderData<{ systems: SystemPosition[]; xmlFiles: string[] }>();
  const [selected, setSelected] = useState<SystemPosition | null>(null);
  const [hovered, setHovered] = useState<SystemPosition | null>(null);
  const [flyTarget, setFlyTarget] = useState<SystemPosition | null>(null);
  const [galaxyParams, setGalaxyParams] = useState<MilkyWayParams>(defaultParams);
  const [galaxyScale, setGalaxyScale] = useState(6);
  const [showZodiac, setShowZodiac] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();
  const controlsRef = useRef<any>(null);

  // Click selects + flies to; double-click navigates to system
  const handleSelect = useCallback((system: SystemPosition | null) => {
    setSelected(system);
    if (system) setFlyTarget(system);
  }, []);

  // Navigation only via Enter key — no double-click
  const handleDoubleClick = useCallback(() => {}, []);

  // Enter key navigates to selected system
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && selected) {
        navigate(`/system/${encodeURIComponent(selected.filename)}`);
      }
      if (e.key === "Escape") {
        setSelected(null);
        setFlyTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, navigate]);

  const updateParam = (key: keyof MilkyWayParams, value: number) => {
    setGalaxyParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative h-screen w-screen">
      <SiteHeader xmlFiles={xmlFiles} variant="fixed" />

      {/* HUD */}
      <div className="fixed top-16 left-2 z-10 flex flex-col gap-2">
        <Link
          to="/"
          className="rounded-md bg-black/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm hover:text-foreground"
        >
          Back
        </Link>
        <div className="rounded-md bg-black/60 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm">
          {systems.length.toLocaleString()} systems
        </div>
        <button
          onClick={() => setShowZodiac(!showZodiac)}
          className={`rounded-md px-3 py-1.5 text-[10px] backdrop-blur-sm ${showZodiac ? "bg-amber-900/40 text-amber-300" : "bg-black/60 text-muted-foreground"}`}
        >
          {showZodiac ? "Zodiac on" : "Zodiac off"}
        </button>
      </div>

      {/* Legend */}
      <div className="fixed bottom-2 left-2 z-10 flex flex-col gap-1 rounded-md bg-black/60 px-3 py-2 text-[10px] text-muted-foreground backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "rgb(153,153,179)" }} />
          No known planets
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "rgb(51,204,230)" }} />
          1-3 planets
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "rgb(255,217,51)" }} />
          4+ planets
        </div>
      </div>

      {/* Galaxy controls */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="fixed bottom-2 right-2 z-20 rounded-md bg-black/60 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm hover:text-foreground"
      >
        {showControls ? "Hide controls" : "Controls"}
      </button>
      {showControls && <div className="fixed bottom-8 right-2 z-10 flex flex-col gap-1 rounded-md bg-black/60 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <label className="w-20 shrink-0">Galaxy scale</label>
          <input
            type="range"
            min={0.5}
            max={30}
            step={0.1}
            value={galaxyScale}
            onChange={(e) => setGalaxyScale(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400"
          />
          <span className="w-12 tabular-nums text-right">{galaxyScale}x</span>
        </div>
        {([
          { key: "barAngle", label: "Bar angle", min: 0, max: 90, step: 1, unit: "°" },
          { key: "armAngle", label: "Arm angle", min: 0, max: 90, step: 1, unit: "°" },
          { key: "armStart", label: "Arm start", min: 1000, max: 8000, step: 100, unit: "pc" },
          { key: "secondaryStart", label: "Sec start", min: 1000, max: 8000, step: 100, unit: "pc" },
          { key: "pitchPrimary", label: "Pri pitch", min: 5, max: 25, step: 0.5, unit: "°" },
          { key: "pitchSecondary", label: "Sec pitch", min: 5, max: 25, step: 0.5, unit: "°" },
          { key: "secondaryOffset", label: "Arm offset", min: 45, max: 170, step: 1, unit: "°" },
          { key: "armWidth", label: "Arm width", min: 400, max: 3000, step: 50, unit: "pc" },
          { key: "armTaper", label: "Arm taper", min: 0.5, max: 3, step: 0.1, unit: "x" },
          { key: "discScatter", label: "Disc scatter", min: 1, max: 10, step: 0.5, unit: "x" },
          { key: "discWidth", label: "Disc width", min: 0.5, max: 5, step: 0.1, unit: "x" },
          { key: "discDensity", label: "Disc density", min: 0.5, max: 3, step: 0.1, unit: "x" },
          { key: "discScale", label: "Disc scale", min: 0.5, max: 2, step: 0.05, unit: "x" },
          { key: "discRotation", label: "Disc rotate", min: -90, max: 90, step: 1, unit: "°" },
          { key: "barLength", label: "Bar length", min: 1000, max: 8000, step: 100, unit: "pc" },
          { key: "barWidth", label: "Bar width", min: 200, max: 3000, step: 50, unit: "pc" },
          { key: "bulgeSize", label: "Bulge size", min: 400, max: 3000, step: 50, unit: "pc" },
          { key: "bulgeDensity", label: "Bulge density", min: 0.5, max: 3, step: 0.1, unit: "x" },
          { key: "bulgeFlattening", label: "Bulge flat", min: 0, max: 0.9, step: 0.05, unit: "" },
          { key: "hiiCount", label: "H-II count", min: 50, max: 2000, step: 50, unit: "" },
          { key: "hiiSize", label: "H-II size", min: 0.1, max: 3, step: 0.1, unit: "x" },
          { key: "hiiBrightness", label: "H-II bright", min: 0.1, max: 3, step: 0.1, unit: "x" },
          { key: "dustCount", label: "Dust count", min: 100, max: 3000, step: 100, unit: "" },
          { key: "dustSize", label: "Dust size", min: 0.1, max: 3, step: 0.1, unit: "x" },
          { key: "dustOpacity", label: "Dust opacity", min: 0.1, max: 3, step: 0.1, unit: "x" },
          { key: "fogCount", label: "Fog count", min: 1000, max: 15000, step: 500, unit: "" },
          { key: "fogSize", label: "Fog size", min: 0.1, max: 5, step: 0.1, unit: "x" },
          { key: "fogBrightness", label: "Fog bright", min: 0.1, max: 5, step: 0.1, unit: "x" },
        ] as const).map(({ key, label, min, max, step, unit }) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <label className="w-20 shrink-0">{label}</label>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={galaxyParams[key]}
              onChange={(e) => updateParam(key, parseFloat(e.target.value))}
              className="w-16 accent-cyan-400"
            />
            <span className="w-12 tabular-nums text-right">{galaxyParams[key]}{unit}</span>
          </div>
        ))}
      </div>}

      {/* Hover tooltip */}
      {hovered && !selected && (
        <div className="fixed top-16 right-2 z-10 rounded-md bg-black/60 px-3 py-2 backdrop-blur-sm pointer-events-none">
          <p className="text-xs font-medium text-foreground">{hovered.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {hovered.distance.toFixed(1)} pc &middot; {hovered.planetCount} planet{hovered.planetCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Selected system info */}
      {selected && (
        <div className="fixed top-16 right-2 z-10 rounded-md bg-black/80 px-4 py-3 backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">{selected.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {selected.distance.toFixed(1)} pc &middot; {selected.planetCount} planet{selected.planetCount !== 1 ? "s" : ""}
          </p>
          <p className="text-[9px] text-muted-foreground/60 mt-1">
            Press Enter or double-click to visit &middot; Esc to deselect
          </p>
          <button
            onClick={() => navigate(`/system/${encodeURIComponent(selected.filename)}`)}
            className="mt-2 rounded bg-cyan-900/50 px-3 py-1 text-xs text-cyan-400 hover:bg-cyan-900/80"
          >
            View system
          </button>
        </div>
      )}

      <Canvas
        camera={{
          position: [0, 500, 1000],
          far: 1000000,
          near: 0.1,
          fov: 60,
        }}
      >
        <color attach="background" args={["#050510"]} />
        <ambientLight intensity={0.1} />
        <MilkyWay sunPosition={[0, 0, 0]} scale={galaxyScale} params={galaxyParams} />
        <StarField
          systems={systems}
          onSelect={handleSelect}
          onHover={setHovered}
          onDoubleClick={handleDoubleClick}
        />
        <CameraFlyTo target={flyTarget} controlsRef={controlsRef} />
        <ConstellationLines visible={showZodiac} />
        <GalacticReference onSolClick={() => {
          const sol = { name: "Solar System", filename: "Sun", x: 0, y: 0, z: 0, distance: 0, planetCount: 8 };
          setSelected(sol);
          setFlyTarget(sol);
        }} />
        {selected && <SelectionMarker system={selected} />}
        <CameraControls
          ref={controlsRef}
          makeDefault
          minDistance={selected ? 1 : 1}
          maxDistance={500000}
          smoothTime={0.5}
          draggingSmoothTime={0.15}
        />
      </Canvas>
    </div>
  );
}
