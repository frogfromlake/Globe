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

  // Desaturate a color toward grayscale
  vec3 desaturate(vec3 color, float factor) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114)); // luminance
    return mix(color, vec3(gray), factor);
  }

  void main() {
    // Lighting intensity
    float intensity = dot(normalize(vWorldNormal), normalize(lightDirection));
    float normalized = intensity * 0.5 + 0.5;
    float sharpened = smoothstep(0.45, 0.55, normalized);

    // Sample textures
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);

    // Enhance and desaturate day side
    vec3 boostedDay = dayColor.rgb * 1.25;
    boostedDay = desaturate(boostedDay, 0.4); // reduce oversaturation

    // Blend with night side
    vec3 baseColor = mix(nightColor.rgb, boostedDay, sharpened);

    // Earth-tone tint correction (slightly warm)
    vec3 tint = vec3(1.0, 0.97, 0.94);
    baseColor *= tint;

    // Gamma correction for natural brightness
    vec3 finalColor = pow(baseColor, vec3(0.9));

    // Rim glow for atmospheric edge
    float rim = 1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal));
    float rimGlow = pow(rim, 2.5);
    vec3 rimColor = vec3(0.1, 0.4, 1.0);
    finalColor += rimColor * rimGlow * 0.25;

    // Optional edge fill near day/night line
    float edgeFill = smoothstep(0.0, 0.2, sharpened);
    finalColor += vec3(0.01, 0.015, 0.025) * edgeFill;

    // Read encoded country ID
    vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 encoded = texture2D(countryIdMap, flippedUv).rgb;
    float countryIdValue = encoded.r * 255.0 * 65536.0 + encoded.g * 255.0 * 256.0 + encoded.b * 255.0;

    float tolerance = 0.5;
    bool isHovered = (hoveredCountryId > 0) && (abs(countryIdValue - float(hoveredCountryId)) < tolerance);
    bool isPrevious = (previousHoveredId > 0) && (abs(countryIdValue - float(previousHoveredId)) < tolerance);

    vec3 highlightColor = vec3(0.2, 0.95, 1.0);

    // Hover highlight
    if (isHovered) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
      float fresnel = pow(1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal)), 2.5);
      float glowAmount = fresnel * pulse;
      vec3 halo = highlightColor * glowAmount * highlightFadeIn;
      finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeIn);
      finalColor += halo;
    }

    // Previous hover fade-out
    if (isPrevious) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
      float fresnel = pow(1.0 - dot(normalize(vViewDirection), normalize(vWorldNormal)), 2.5);
      float glowAmount = fresnel * pulse;
      vec3 halo = highlightColor * glowAmount * highlightFadeOut;
      finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeOut);
      finalColor += halo;
    }

    // Selection logic
    float selectedIndex = clamp(countryIdValue, 0.0, 2047.0);
    vec2 lookupUV = vec2((selectedIndex + 0.5) / 2048.0, 0.5);
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
