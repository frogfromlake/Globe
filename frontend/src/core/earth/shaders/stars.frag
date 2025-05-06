uniform sampler2D uStarMap;
uniform float uStarFade;
uniform float uStarOpacity;

varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uStarMap, vUv);

  // Apply both fade and config opacity
  float visibleAlpha = max(tex.a * uStarFade * uStarOpacity, 0.001);

  gl_FragColor = vec4(tex.rgb, visibleAlpha);
}
