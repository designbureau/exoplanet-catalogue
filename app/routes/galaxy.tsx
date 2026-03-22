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
import MilkyWay from "~/components/MilkyWay";

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

// Ecliptic ring with zodiac constellation labels
const OBLIQUITY = 23.44 * (Math.PI / 180); // Earth's axial tilt
const ZODIAC_RADIUS = 800; // scene units

const zodiacSigns = [
  { name: "Aries", mid: 15 },
  { name: "Taurus", mid: 45 },
  { name: "Gemini", mid: 75 },
  { name: "Cancer", mid: 105 },
  { name: "Leo", mid: 135 },
  { name: "Virgo", mid: 165 },
  { name: "Libra", mid: 195 },
  { name: "Scorpio", mid: 225 },
  { name: "Sagittarius", mid: 255 },
  { name: "Capricorn", mid: 285 },
  { name: "Aquarius", mid: 315 },
  { name: "Pisces", mid: 345 },
];

// Convert ecliptic longitude to equatorial RA/Dec, then to scene Cartesian
function eclipticToScene(lambdaDeg: number, radius: number): [number, number, number] {
  const lambda = (lambdaDeg * Math.PI) / 180;
  const ra = Math.atan2(Math.sin(lambda) * Math.cos(OBLIQUITY), Math.cos(lambda));
  const dec = Math.asin(Math.sin(lambda) * Math.sin(OBLIQUITY));
  // Same mapping as StarField: x = cos(dec)*cos(ra), y→z, z→y
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const z = radius * Math.cos(dec) * Math.sin(ra); // RA axis → scene Z
  const y = radius * Math.sin(dec); // Dec axis → scene Y
  return [x, y, z];
}

function ZodiacRing() {
  const ringGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let deg = 0; deg <= 360; deg += 2) {
      const [x, y, z] = eclipticToScene(deg, ZODIAC_RADIUS);
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group>
      <lineLoop geometry={ringGeometry}>
        <lineBasicMaterial color="#4a3a6a" transparent opacity={0.4} />
      </lineLoop>
      {zodiacSigns.map((sign) => {
        const [x, y, z] = eclipticToScene(sign.mid, ZODIAC_RADIUS + 15);
        return (
          <Html
            key={sign.name}
            position={[x, y, z]}
            center
            zIndexRange={[0, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="text-[8px] text-purple-300/50 whitespace-nowrap">
              {sign.name}
            </span>
          </Html>
        );
      })}
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
  const navigate = useNavigate();

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
          far: 200000,
          near: 0.1,
          fov: 60,
        }}
      >
        <color attach="background" args={["#050510"]} />
        <ambientLight intensity={0.1} />
        <MilkyWay sunPosition={[0, 0, 0]} scale={1} />
        <StarField systems={systems} onSelect={setSelected} />
        <ZodiacRing />
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
          maxDistance={50000}
        />
      </Canvas>
    </div>
  );
}
