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
    vec4 baseColor = mix(nightColor, dayColor, sharpened);
    vec3 finalColor = mix(nightColor.rgb, dayColor.rgb, sharpened);

    float rim = 1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal));
    rim = smoothstep(0.3, 0.7, rim);
    float daySide = smoothstep(0.0, 0.2, intensity);
    float glowFactor = rim * daySide;
    vec3 glowColor = vec3(0.4, 0.6, 1.0) * glowFactor * 0.1;

    float countryIdValue = texture2D(countryIdMap, vUv).r * 999.0;
    float idMatch = float(hoveredCountryId > 0) * step(0.5, 1.0 - abs(countryIdValue - float(hoveredCountryId)));
    vec3 highlightColor = vec3(1.0, 0.7, 0.3);
    finalColor = mix(finalColor, highlightColor, idMatch * 0.4);

    gl_FragColor = vec4(finalColor + glowColor, 1.0);
  }
`;
