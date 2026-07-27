uniform float uTime;
uniform float uBidirectional;
varying vec2 vUv;

float flowPulse(float coord) {
  float band = fract(coord - uTime);
  float leading = smoothstep(0.0, 0.12, band);
  float trailing = 1.0 - smoothstep(0.12, 0.28, band);
  return leading * trailing;
}

void main() {
  float base = 0.18;
  float forwardPulse = flowPulse(vUv.x);
  float glow = base + forwardPulse * 0.82;

  if (uBidirectional > 0.5) {
    float reversePulse = flowPulse(1.0 - vUv.x);
    glow = base + max(forwardPulse, reversePulse) * 0.82;
  }

  vec3 color = vec3(0.35, 0.78, 1.0);
  gl_FragColor = vec4(color * glow, 0.95);
}
