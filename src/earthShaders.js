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
  uniform vec3 cameraDirection;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;

  vec3 desaturate(vec3 color, float factor) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(gray), factor);
  }

  void main() {
    // Daylight calculation
    float intensity = dot(normalize(vWorldNormal), normalize(lightDirection));
    float normalized = intensity * 0.5 + 0.5;
    float sharpened = smoothstep(0.45, 0.55, normalized);

    // Textures
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);

    // Process day map: brightness, desaturation, tint, saturation boost
    vec3 boostedDay = dayColor.rgb * 1.25;
    boostedDay = desaturate(boostedDay, 0.6);
    vec3 warmTint = vec3(1.05, 0.97, 0.92);
    float luminance = dot(boostedDay, vec3(0.299, 0.587, 0.114));
    float tintStrength = smoothstep(0.2, 0.8, luminance);
    boostedDay = mix(boostedDay, boostedDay * warmTint, tintStrength);
    vec3 desaturatedDay = vec3(dot(boostedDay, vec3(0.299, 0.587, 0.114)));
    boostedDay = mix(desaturatedDay, boostedDay, 1.1);

    // Blend with darkened night texture
    vec3 darkenedNight = nightColor.rgb * 0.45;
    vec3 baseColor = mix(darkenedNight, boostedDay, sharpened);

    // Gamma correction
    vec3 finalColor = pow(baseColor, vec3(0.9));

    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(vViewDirection);
    float rimDot = 1.0 - max(dot(viewDir, normal), 0.0);

    // === Day-side rim glow ===
    float dayRimFade = smoothstep(0.0, 1.0, pow(rimDot, 5.0)) * sharpened;

    // More realistic atmospheric scattering color (pale blue-white glow)
    vec3 rimColor = mix(vec3(0.5, 0.7, 1.0), vec3(0.5, 0.8, 0.9), rimDot); // sky blue to light cream
    finalColor += rimColor * dayRimFade * 0.4;

    // === Night-side dark rim fade ===
    float nightRimFade = smoothstep(0.0, 1.0, pow(rimDot, 3.5)) * (1.0 - sharpened);
    finalColor = mix(finalColor, vec3(0.0), nightRimFade * 0.9); // darkening fade

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

    // Country hover color
    vec3 highlightColor = vec3(0.2, 0.95, 1.0);

    // Hover
    if (isHovered) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
      float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
      float glowAmount = fresnel * pulse;
      vec3 halo = highlightColor * glowAmount * highlightFadeIn;
      finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeIn);
      finalColor += halo;
    }

    // Previous hover
    if (isPrevious) {
      float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
      float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
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
      float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
      vec3 halo = highlightColor * fresnel * 0.6;
      finalColor = mix(finalColor, highlightColor, 0.35);
      finalColor += halo;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
