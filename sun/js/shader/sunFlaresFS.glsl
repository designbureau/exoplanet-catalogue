#ifdef GL_ES
precision highp float;
#endif

#include includes/visibility.glsl

varying float vUVY;
varying float vOpacity;
varying vec3  vColor;
varying vec3  vNormal;

uniform float uAlphaBlended;

void main(void){
    // soft strip edge across the two vertices (±1)
    float alpha = smoothstep(1.0, 0.0, abs(vUVY));
    alpha *= alpha;
    alpha *= vOpacity;
    alpha *= getAlpha(vNormal);  // uses WORLD-space normal

    gl_FragColor = vec4(vColor * alpha, alpha * uAlphaBlended);
}
