import * as THREE from "three";
import type { ShaderParams } from "~/utils/planetClassification";

const vertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = normalize(position);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform float scale;
  uniform float swirl_strength;
  uniform float swirl_speed;
  uniform float warp_intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 color4;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  varying vec3 vPosition;
  varying vec3 vNormal;

  float random(in vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise(in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  #define NUM_OCTAVES 5

  float fbm(in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
      v += a * noise(_st);
      _st = rot * _st * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  vec3 swirl(vec3 p, float time, float strength) {
    for (int i = 0; i < 5; i++) {
      float angle = time * swirl_speed + length(p.xy) * strength * (float(i) * 0.5);
      float s = sin(angle);
      float c = cos(angle);
      mat2 rotation = mat2(c, -s, s, c);
      p.xy = rotation * p.xy * 0.6;
    }
    return p;
  }

  vec3 warpNoise(vec3 p, float intensity) {
    vec3 warpedP = p + intensity * vec3(
      fbm(p.xy * 0.9) * 0.9,
      fbm(p.zy * 0.9) * 0.9,
      fbm(p.xz * 0.9) * 0.9
    );
    return warpedP;
  }

  void main() {
    vec3 st = vPosition * scale;
    st = swirl(st, u_time, swirl_strength);
    st = warpNoise(st, warp_intensity);
    st += vec3(0.0, 0.0, u_time * 0.005);

    vec3 color = mix(color1, color2, fbm(st.xy));
    color = mix(color, color3, fbm(st.zy));
    color = mix(color, color4, fbm(st.xz));

    // Add emissive glow
    color += emissiveColor * emissiveIntensity * fbm(st.xz * 2.0);

    // Simple diffuse lighting
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
    float diff = max(dot(vNormal, lightDir), 0.15);
    color *= (0.3 + 0.7 * diff);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createPlanetMaterial(params: ShaderParams): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      scale: { value: params.noiseScale },
      swirl_strength: { value: params.swirlStrength },
      swirl_speed: { value: params.swirlSpeed },
      warp_intensity: { value: params.warpIntensity },
      color1: { value: params.color1 },
      color2: { value: params.color2 },
      color3: { value: params.color3 },
      color4: { value: params.color4 },
      emissiveColor: { value: params.emissive },
      emissiveIntensity: { value: params.emissiveIntensity },
    },
    vertexShader,
    fragmentShader,
  });
}
