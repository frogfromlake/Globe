// earthShaders.js
export const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 cameraToVertex = cameraPosition - worldPos.xyz;
    vViewDirection = normalize(cameraToVertex);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D countryIdMap;
  uniform int hoveredCountryId;
  uniform vec3 lightDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;

  void main() {
    float intensity = dot(normalize(vWorldNormal), normalize(lightDirection));
    float normalized = intensity * 0.5 + 0.5;
    float transitionWidth = 0.05;
    float sharpened = smoothstep(0.5 - transitionWidth, 0.5 + transitionWidth, normalized);
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    vec3 finalColor = mix(nightColor.rgb, dayColor.rgb, sharpened);

    float rim = 1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal));
    rim = smoothstep(0.3, 0.7, rim);
    float daySide = smoothstep(0.0, 0.2, intensity);
    float glowFactor = rim * daySide;

    vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 encoded = texture2D(countryIdMap, flippedUv).rgb;
    float countryIdValue = encoded.r * 255.0 * 65536.0 + encoded.g * 255.0 * 256.0 + encoded.b * 255.0;

    float tolerance = 0.5;
    bool isHovered = abs(countryIdValue - float(hoveredCountryId)) < tolerance && hoveredCountryId > 0;

    vec3 glowColor = vec3(0.2, 0.95, 1.0) * glowFactor * 0.4;
    vec3 highlightColor = vec3(0.2, 0.95, 1.0);

    if (isHovered) {
      finalColor = mix(finalColor, highlightColor, 0.6);
      finalColor += glowColor;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
