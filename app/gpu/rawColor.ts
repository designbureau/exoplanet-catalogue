import * as THREE from "three/webgpu";

const _rgb = { r: 0, g: 0, b: 0 };

/**
 * Display-referred colour for canvases that render in "raw" output mode
 * (see GPUCanvas): copies the CSS colour's sRGB components verbatim instead of
 * converting them to linear, so built-in materials (lines, sprites, meshes)
 * land on the same screen colour as the hand-written shaders around them.
 */
export function rawColor(css: string): THREE.Color {
  new THREE.Color(css).getRGB(_rgb, THREE.SRGBColorSpace);
  return new THREE.Color().setRGB(_rgb.r, _rgb.g, _rgb.b, THREE.LinearSRGBColorSpace);
}
