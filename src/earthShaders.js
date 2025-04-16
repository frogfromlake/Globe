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
  uniform int previousHoveredId;
  uniform float highlightFadeIn;
  uniform float highlightFadeOut;
  uniform float uTime;
  uniform vec3 lightDirection;
  uniform int selectedCountryId;
  uniform sampler2D selectedMask;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;

  void main() {
    float intensity = dot(normalize(vWorldNormal), normalize(lightDirection));
    float normalized = intensity * 0.5 + 0.5;
    float sharpened = smoothstep(0.45, 0.55, normalized);

    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    vec3 baseColor = mix(nightColor.rgb, dayColor.rgb, sharpened);
    vec3 finalColor = baseColor;

    vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 encoded = texture2D(countryIdMap, flippedUv).rgb;
    float countryIdValue = encoded.r * 255.0 * 65536.0 + encoded.g * 255.0 * 256.0 + encoded.b * 255.0;

    float tolerance = 0.5;
    bool isHovered = (hoveredCountryId > 0) && (abs(countryIdValue - float(hoveredCountryId)) < tolerance);
    bool isPrevious = (previousHoveredId > 0) && (abs(countryIdValue - float(previousHoveredId)) < tolerance);

    vec3 highlightColor = vec3(0.2, 0.95, 1.0);

    if (isHovered) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
      float fresnel = pow(1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal)), 2.5);
      float glowAmount = fresnel * pulse;

      vec3 halo = highlightColor * glowAmount * highlightFadeIn;
      finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeIn);
      finalColor += halo;
    }

    if (isPrevious) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
      float fresnel = pow(1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal)), 2.5);
      float glowAmount = fresnel * pulse;

      vec3 halo = highlightColor * glowAmount * highlightFadeOut;
      finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeOut);
      finalColor += halo;
    }

    float selectedIndex = clamp(countryIdValue, 0.0, 2047.0);
    vec2 lookupUV = vec2((selectedIndex + 0.5) / 2048.0, 0.5); // center of texel
    float selected = texture2D(selectedMask, lookupUV).r;
    bool isSelected = selected > 0.5;

    if (isSelected) {
      float fresnel = pow(1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal)), 2.5);
      vec3 halo = highlightColor * fresnel * 0.6;
      finalColor = mix(finalColor, highlightColor, 0.35);
      finalColor += halo;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
