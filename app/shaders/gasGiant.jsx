// Updated GasGiantVertexShader with CSM variables
export const GasGiantVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vPosition = normalize(position);
    csm_Normal = normalize(normalMatrix * normal);  // Use csm_Normal for custom normals
    csm_Position = position;  // Use csm_Position for custom vertex position
  }
`;

// Updated GasGiantFragmentShader with CSM variables
export const GasGiantFragmentShader = `
  uniform float u_time;
  uniform float scale;
  uniform float swirl_strength;
  uniform float swirl_speed;
  uniform float swirl_tightness;
  uniform float noise_speed;
  uniform float warp_intensity;
  uniform float warp_frequency;
  uniform float warp_scale;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 color4;
  varying vec3 vPosition;
  varying vec3 vNormal;

  float random (in vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
  }

  #define NUM_OCTAVES 5

  float fbm (in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.5));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
      v += a * noise(_st);
      _st = rot * _st * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  vec3 swirl(vec3 p, float time, float strength, float tightness) {
    for (int i = 0; i < 5; i++) {
      float angle = time * swirl_speed + length(p.xy) * strength * tightness * (float(i) * 0.5);
      float s = sin(angle);
      float c = cos(angle);
      mat2 rotation = mat2(c, -s, s, c);
      p.xy = rotation * p.xy * 0.6;
    }
    return p;
  }

  vec3 warpNoise(vec3 p, float intensity, float frequency, float scale) {
    vec3 warpedP = p + intensity * vec3(
      fbm(p.xy * frequency) * scale,
      fbm(p.zy * frequency) * scale,
      fbm(p.xz * frequency) * scale
    );
    return warpedP;
  }

  void main() {
    vec3 st = vPosition * scale;
    st = swirl(st, u_time, swirl_strength, swirl_tightness);
    st = warpNoise(st, warp_intensity, warp_frequency, warp_scale);
    st += vec3(0.0, 0.0, u_time * noise_speed);

    vec3 color = mix(color1, color2, fbm(st.xy));
    color = mix(color, color3, fbm(st.zy));
    color = mix(color, color4, fbm(st.xz));

    // Use csm_DiffuseColor to ensure compatibility with MeshStandardMaterial's shading logic
    csm_DiffuseColor = vec4(color, 1.0);
  }
`;
