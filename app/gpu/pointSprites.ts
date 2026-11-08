import * as THREE from "three/webgpu";
import {
  attribute,
  clamp,
  cameraPosition,
  cameraProjectionMatrix,
  distance,
  float,
  Fn,
  length,
  modelViewMatrix,
  positionGeometry,
  screenSize,
  smoothstep,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
  type ShaderNodeObject,
} from "three/tsl";
import type { Node } from "three/webgpu";

/**
 * WebGPU has no gl_PointSize — a "point" is always one pixel. These helpers
 * replace the old THREE.Points + gl_PointSize shaders with instanced
 * camera-facing quads whose pixel size is computed in the vertex stage
 * (identical on-screen behaviour: size in framebuffer pixels, clamped).
 */
export interface PointCloudInput {
  positions: ArrayLike<number>;
  /** Optional per-point rgb (itemSize 3). */
  colors?: ArrayLike<number>;
  /** Per-point world size, converted to pixels as size * sizeScale / viewDepth. */
  sizes?: ArrayLike<number>;
}

export interface PointFragmentInput {
  /** Radial distance from sprite centre, 0 at centre → 1 at the edge. */
  d: ShaderNodeObject<Node>;
  /** Per-point colour (vec3) — white when the cloud has no colours. */
  color: ShaderNodeObject<Node>;
  /** smoothstep(fadeNear, fadeFar, distance(point, camera)) or 1 when fade is off. */
  camFade: ShaderNodeObject<Node>;
}

export interface PointCloudOptions {
  sizeScale?: number;
  minPx?: number;
  maxPx?: number;
  /** Fade each point out as the camera nears it (decorative backdrops). */
  camFade?: [near: number, far: number];
  blending?: THREE.Blending;
  /** Returns the final fragment colour (vec4, straight alpha). */
  fragment: (input: PointFragmentInput) => ShaderNodeObject<Node>;
}

export function createPointCloud(input: PointCloudInput, opts: PointCloudOptions): THREE.Mesh {
  const count = input.positions.length / 3;
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute("position", quad.getAttribute("position"));
  geo.setAttribute("uv", quad.getAttribute("uv"));
  geo.setAttribute("iPos", new THREE.InstancedBufferAttribute(Float32Array.from(input.positions), 3));
  if (input.colors) geo.setAttribute("iColor", new THREE.InstancedBufferAttribute(Float32Array.from(input.colors), 3));
  if (input.sizes) geo.setAttribute("iSize", new THREE.InstancedBufferAttribute(Float32Array.from(input.sizes), 1));
  geo.instanceCount = count;
  // Instances are scattered over the whole galaxy; skip frustum culling of the
  // (tiny) base quad.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

  const { sizeScale = 300, minPx = 1, maxPx = 8, camFade, blending, fragment } = opts;

  const iPos = attribute("iPos", "vec3");
  const iSize = input.sizes ? attribute("iSize", "float") : float(1);
  const iColor = input.colors ? attribute("iColor", "vec3") : vec3(1, 1, 1);

  const mat = new THREE.NodeMaterial();
  mat.transparent = true;
  mat.depthWrite = false;
  if (blending !== undefined) mat.blending = blending;

  // vertex: expand the quad around the projected point, in pixels
  const mv = modelViewMatrix.mul(vec4(iPos, 1));
  const clip = cameraProjectionMatrix.mul(mv);
  const px = clamp(iSize.mul(sizeScale).div(mv.z.negate()), minPx, maxPx);
  const offset = positionGeometry.xy.mul(px).mul(2).div(screenSize).mul(clip.w);
  mat.vertexNode = clip.add(vec4(offset, 0, 0));

  const fade = camFade
    ? varying(smoothstep(camFade[0], camFade[1], distance(iPos, cameraPosition)))
    : float(1);
  const d = length(uv().sub(vec2(0.5))).mul(2);

  mat.fragmentNode = Fn(() => {
    d.greaterThan(1).discard();
    return fragment({ d, color: iColor, camFade: fade });
  })();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
