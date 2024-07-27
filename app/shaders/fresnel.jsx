export const fresnel = {
  uniforms: {
    u_opacity: { value: 0.7 }, // Default opacity value
    u_lightPosition: { value: [-10, -10, -10] }, // Set default light position
  },
  vertexShader: `
  varying vec3 vNormal;

  void main() {
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  fragmentShader: `
  uniform float u_opacity;
  uniform vec3 u_lightPosition;
  varying vec3 vNormal;

  void main() {
    // Calculate the direction from the fragment to the light position
    vec3 lightDirection = normalize(u_lightPosition - vNormal);

    // Calculate the dot product between the normal vector and light direction
    float fresnel = dot(normalize(vNormal), lightDirection);
    fresnel = clamp(fresnel, 0.01, 1.0); // Clamp between 0 and 1
    fresnel = pow(fresnel, 0.8); // Adjust the power for the fresnel effect
    gl_FragColor = vec4(0.58, 0.74, 1.0, u_opacity * fresnel); // Apply fresnel effect to opacity
  }
  `,
  transparent: true,
  blending: true,
};
