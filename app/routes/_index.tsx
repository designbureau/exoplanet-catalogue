import type { MetaFunction } from "@remix-run/node";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, shaderMaterial } from "@react-three/drei";
import { fresnel } from "../shaders/fresnel";
import { AdditiveBlending, MultiplyBlending, NormalBlending } from "three";
import PlanetTexture from "../utils/PlanetTextures";

const material = {
  uniforms: {
    u_opacity: { value: 0.7 },
    u_lightPosition: { value: [-10, -10, -10] }, // Set default light position
  },
  vertexShader: fresnel.vertexShader,
  fragmentShader: fresnel.fragmentShader,
  transparent: true,
  blending: AdditiveBlending,
};

function Sphere(props: any) {
  const planetTexture = PlanetTexture(0, 0, "Mars");

  // This reference will give us direct access to the mesh
  const meshRef = useRef<any>();
  // Set up state for the hovered and active state
  // Subscribe this component to the render-loop, rotate the mesh every frame
  // useFrame((state, delta) => (meshRef.current.rotation.x += delta));
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh {...props} ref={meshRef} scale={1}>
      <sphereGeometry args={[1, 256, 256]} />
      <meshStandardMaterial map={planetTexture} />
    </mesh>
  );
}

function Fresnel(props: any) {
  // This reference will give us direct access to the mesh
  const meshRef = useRef<any>();
  // Set up state for the hovered and active state
  // Subscribe this component to the render-loop, rotate the mesh every frame
  // useFrame((state, delta) => (meshRef.current.rotation.x += delta));
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh {...props} ref={meshRef} scale={1.01}>
      <sphereGeometry args={[1, 256, 256]} />
      <shaderMaterial attach="material" args={[material]} />
    </mesh>
  );
}

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <div id="canvas-container">
      <Canvas>
        <ambientLight intensity={0.005} />
        <pointLight
          position={[-10, -10, -10]}
          decay={0}
          intensity={1}
          castShadow
        />
        <Fresnel position={[0, 0, 0]} />
        <Sphere position={[0, 0, 0]} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
