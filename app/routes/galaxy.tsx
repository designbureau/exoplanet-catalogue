import { useLoaderData, useNavigate, Link } from "react-router";
import type { MetaFunction } from "react-router";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import {
  getSystemPositions,
  type SystemPosition,
} from "~/utils/parseSystemPositions";
import MilkyWay, { defaultParams, type MilkyWayParams } from "~/components/MilkyWay";
import { ZODIAC_CONSTELLATIONS, type ConstellationStar } from "~/data/zodiacConstellations";

export const meta: MetaFunction = () => [
  { title: "Galaxy Map - Exoplanet Explorer" },
];

export const loader = async () => {
  const systems = await getSystemPositions();
  return { systems };
};

// Scale parsec distances down so the scene is navigable
// Most systems are within ~2000 pc; we'll use 1 pc = 1 scene unit
const SCALE = 1;

function StarField({
  systems,
  onSelect,
}: {
  systems: SystemPosition[];
  onSelect: (system: SystemPosition | null) => void;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const { raycaster, camera, pointer } = useThree();

  // Build geometry from system positions
  const { geometry, colors } = useMemo(() => {
    const positions = new Float32Array(systems.length * 3);
    const colorArray = new Float32Array(systems.length * 3);

    for (let i = 0; i < systems.length; i++) {
      positions[i * 3] = systems[i].x * SCALE;
      positions[i * 3 + 1] = systems[i].z * SCALE; // z (dec) maps to Y in scene
      positions[i * 3 + 2] = systems[i].y * SCALE; // y (RA) maps to Z in scene

      // Color by planet count: white (0) → cyan (1-3) → gold (4+)
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

  // Raycasting for hover/click
  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (!pointsRef.current) return;

      raycaster.setFromCamera(pointer, camera);
      raycaster.params.Points = { threshold: 2 };
      const intersects = raycaster.intersectObject(pointsRef.current);

      if (intersects.length > 0 && intersects[0].index !== undefined) {
        onSelect(systems[intersects[0].index]);
      } else {
        onSelect(null);
      }
    },
    [systems, raycaster, camera, pointer, onSelect]
  );

  return (
    <points ref={pointsRef} geometry={geometry} onClick={handleClick}>
      <pointsMaterial
        size={1.5}
        sizeAttenuation={false}
        vertexColors={true}
        transparent={true}
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}

// Highlight the selected system with a ring
function SelectionMarker({ system }: { system: SystemPosition }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <mesh
      ref={ref}
      position={[
        system.x * SCALE,
        system.z * SCALE,
        system.y * SCALE,
      ]}
    >
      <ringGeometry args={[3, 4, 32]} />
      <meshBasicMaterial color="#22d3ee" side={THREE.DoubleSide} transparent opacity={0.8} />
    </mesh>
  );
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
      {/* Sun / origin marker */}
      <mesh
        position={[0, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onSolClick(); }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "default")}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffdd44" />
      </mesh>
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
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Concentric rings */}
        {[200, 400, 600, 800, 1000].map((r) => (
          <mesh key={r}>
            <ringGeometry args={[r - 0.5, r + 0.5, 128]} />
            <meshBasicMaterial color="#445566" transparent opacity={0.6} side={THREE.DoubleSide} />
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
            <line key={i} geometry={geo}>
              <lineBasicMaterial color="#556677" transparent opacity={0.6} />
            </line>
          );
        })}
      </group>
    </group>
  );
}

export default function GalaxyMap() {
  const { systems } = useLoaderData<{ systems: SystemPosition[] }>();
  const [selected, setSelected] = useState<SystemPosition | null>(null);
  const [galaxyParams, setGalaxyParams] = useState<MilkyWayParams>(defaultParams);
  const [galaxyScale, setGalaxyScale] = useState(15);
  const [showZodiac, setShowZodiac] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();

  const updateParam = (key: keyof MilkyWayParams, value: number) => {
    setGalaxyParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative h-screen w-screen">
      {/* HUD */}
      <div className="fixed top-2 left-2 z-10 flex flex-col gap-2">
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

      {/* Selected system info */}
      {selected && (
        <div className="fixed top-2 right-2 z-10 rounded-md bg-black/80 px-4 py-3 backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">{selected.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {selected.distance.toFixed(1)} pc &middot; {selected.planetCount} planet{selected.planetCount !== 1 ? "s" : ""}
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
        <StarField systems={systems} onSelect={setSelected} />
        <ConstellationLines visible={showZodiac} />
        <GalacticReference onSolClick={() => setSelected({
          name: "Solar System",
          filename: "Sun",
          x: 0, y: 0, z: 0,
          distance: 0,
          planetCount: 8,
        })} />
        {selected && <SelectionMarker system={selected} />}
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={10}
          maxDistance={500000}
        />
      </Canvas>
    </div>
  );
}
