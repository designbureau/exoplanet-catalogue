import { useFrame } from "@react-three/fiber";
import { useRef, useContext, useEffect, useMemo } from "react";
import { RefContext } from "./RefContext";
import { EnvContext } from "./EnvContext";
import {
  calculateHZFromMassAndType,
} from "../utils/getHabitableZone";
import Planet from "./Planet";
import * as THREE from "three";
import { createStarMaterial, createStarGlowMaterial } from "../shaders/starShader";
import StarEffects from "./StarEffects";

import {
  getMass,
  getRadius,
  getTemperature,
  getColor,
  getInclination,
} from "../utils/helperFunctions";

const Star = ({ data, position, distance }) => {
  const ref = useRef();
  const glowRef = useRef();

  const { addRef, activeRef, setActive } = useContext(RefContext);
  const { Constants, showHabitableZone } = useContext(EnvContext);

  const name = data.name ? data.name[0] : "Unnamed star";

  const handleClick = (e) => {
    e.stopPropagation();
    setActive(ref);
  };

  useEffect(() => {
    addRef(name, "star", ref);
  }, [name, addRef, ref]);

  const mass = getMass({ data });
  const radius = getRadius({ data });
  const temperature = getTemperature({ data });
  const { color } = getColor({ temperature });

  const magnitudeToIntensity = (magnitude) => {
    const minIntensity = 1;
    const maxIntensity = 5;
    const base = 10;

    let rawIntensity = Math.pow(base, -magnitude / 2.5);
    let normalizedIntensity =
      ((rawIntensity - minIntensity) / (1 - minIntensity)) *
        (maxIntensity - minIntensity) +
      minIntensity;

    normalizedIntensity = Math.max(
      minIntensity,
      Math.min(maxIntensity, normalizedIntensity)
    );

    return isNaN(normalizedIntensity) ? 2 : normalizedIntensity;
  };

  const intensity = magnitudeToIntensity(data.magV);

  let scale = 1;
  if (mass > 0) {
    scale = mass;
  }
  if (radius > 0) {
    scale = radius;
  }

  scale = scale * Constants.radius.sol * Constants.radius.scale;

  // Create procedural star shader material
  const { starMaterial, glowMaterial } = useMemo(() => {
    const temp = temperature || 5500;
    const starMat = createStarMaterial({ temperature: temp });
    const glowMat = createStarGlowMaterial({ temperature: temp });
    return { starMaterial: starMat, glowMaterial: glowMat };
  }, [temperature]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    ref.current.rotation.y += 0.002;
    if (starMaterial.uniforms.u_time) {
      starMaterial.uniforms.u_time.value = elapsed * 0.075;
    }
  });

  const spectraltype = data.spectraltype?.[0]?.[0] || "M";
  const habitableZone = calculateHZFromMassAndType({ mass, spectraltype, Constants });

  // Average orbital inclination from planets for HZ ring tilt
  const avgInclination = useMemo(() => {
    if (!data.planet) return 0;
    const inclinations = data.planet
      .map(p => getInclination({ data: p }))
      .filter(i => i !== 0);
    if (inclinations.length === 0) return 0;
    return inclinations.reduce((a, b) => a + b, 0) / inclinations.length;
  }, [data.planet]);

  return (
    <group position={[position.x, position.y, position.z]}>
      <pointLight color={color} intensity={intensity} distance={30000} />
      {habitableZone && showHabitableZone && (() => {
        const inner = habitableZone.innerRadiusAU;
        const outer = habitableZone.outerRadiusAU;
        // Extend geometry slightly beyond HZ bounds for soft fade
        const padding = (outer - inner) * 0.3;
        const geoInner = Math.max(0, inner - padding);
        const geoOuter = outer + padding;
        return (
          <mesh rotation-x={-Math.PI / 2 + (avgInclination * Math.PI) / 180}>
            <ringGeometry args={[geoInner, geoOuter, 128]} />
            <shaderMaterial
              transparent={true}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              uniforms={{
                uColor: { value: new THREE.Color(0x00aaaa) },
                uOpacity: { value: 0.2 },
                uInnerEdge: { value: inner },
                uOuterEdge: { value: outer },
                uGeoInner: { value: geoInner },
                uGeoOuter: { value: geoOuter },
              }}
              vertexShader={`
                varying float vRadius;
                void main() {
                  vRadius = length(position.xy);
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={`
                uniform vec3 uColor;
                uniform float uOpacity;
                uniform float uInnerEdge;
                uniform float uOuterEdge;
                uniform float uGeoInner;
                uniform float uGeoOuter;
                varying float vRadius;
                void main() {
                  // Soft fade at inner edge
                  float innerFade = smoothstep(uGeoInner, uInnerEdge, vRadius);
                  // Full opacity in habitable zone
                  float core = 1.0;
                  // Soft fade at outer edge
                  float outerFade = 1.0 - smoothstep(uOuterEdge, uGeoOuter, vRadius);
                  float alpha = innerFade * outerFade * uOpacity;
                  gl_FragColor = vec4(uColor, alpha);
                }
              `}
            />
          </mesh>
        );
      })()}

      <mesh ref={ref} name={name} onClick={handleClick}>
        <sphereGeometry args={[scale, 64, 64]} />
        <primitive object={starMaterial} attach="material" />
      </mesh>

      {/* Star glow sprite */}
      <sprite ref={glowRef} scale={[scale * 4, scale * 4, 1]}>
        <primitive object={glowMaterial} attach="material" />
      </sprite>

      {/* Sun rays + flares — only rendered when star is focused */}
      {activeRef?.current === ref.current && (
        <StarEffects starRadius={scale} temperature={temperature} />
      )}

      {data.planet &&
        data.planet.map((planet, index) => (
          <Planet
            key={index}
            data={planet}
            starData={{ temperature, mass, radius }}
          />
        ))}
    </group>
  );
};

export default Star;
