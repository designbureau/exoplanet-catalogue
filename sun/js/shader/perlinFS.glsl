precision highp float;

varying vec3 vWorld;
uniform float uTime;
uniform float uSpatialFrequency;
uniform float uTemporalFrequency;
uniform float uH;
uniform float uContrast;
uniform float uFlatten;

#ifndef OCTAVES
#define OCTAVES 5
#endif

#include includes/simplex4d.glsl;

vec2 fbm(vec4 p){
  float a = 1.0;
  float f = 1.0;
  vec2 sum = vec2(0.0);
  for (int i = 0; i < OCTAVES; i++){
      sum.x += snoise(p * f) * a;
      p.w += 100.0;
      sum.y += snoise(p * f) * a;
      a *= uH;
      f *= 2.0;
  }
  return sum;
}

void main(){
    vec3 world = normalize(vWorld);
    world += 12.45; // offset like the original

    vec4 p = vec4(world * uSpatialFrequency, uTime * uTemporalFrequency);
    vec2 f = fbm(p) * uContrast + 0.5;

    // low-frequency modulation on opacity to mimic flares (channel X)
    vec4 p2 = vec4(world * 2.0, uTime * uTemporalFrequency);
    float modulate = max(snoise(p2), 0.0);
    float x = mix(f.x, f.x * modulate, uFlatten);

    gl_FragColor = vec4(x, f.y, f.y, x); // RG = noise, BA = swapped, like original
}