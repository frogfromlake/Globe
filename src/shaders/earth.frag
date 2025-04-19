uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D countryIdMap;
uniform sampler2D oceanIdMap;
uniform sampler2D selectedMask;
uniform sampler2D selectedOceanMask;
uniform int hoveredCountryId;
uniform int previousHoveredId;
uniform float highlightFadeIn;
uniform float highlightFadeOut;
uniform float uTime;
uniform vec3 lightDirection;
uniform int selectedCountryId;
uniform vec3 cameraDirection;
uniform float cityLightStrength;
uniform vec3 cursorWorldPos;
uniform float cursorGlowStrength;
uniform float cursorGlowRadius;
uniform vec2 cursorUV;
uniform int hoveredOceanId;

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
    // float sharpened = smoothstep(0.475, 0.525, normalized);
    float sharpened = smoothstep(0.42, 0.58, normalized);

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

    // Tone down night base and hue shift toward neutral
    const float desaturationFactor = 0.5; // 0.0 = original color, 1.0 = full grayscale

    vec3 nightOriginal = nightColor.rgb;
    float nightGray = dot(nightOriginal, vec3(0.299, 0.587, 0.114));
    vec3 tonedNight = mix(nightOriginal, vec3(nightGray), desaturationFactor);

    // Add city lights glow on top
    // Slight warm yellow tint for city lights
    vec3 lightTint = vec3(1.1, 1.0, 0.85); // Warm tone

    // Reduce brightness by multiplying the strength (try 0.5–0.7)
    vec3 cityGlow = nightColor.rgb * lightTint * cityLightStrength * 0.035 * (1.0 - sharpened);
    vec3 nightBlended = tonedNight + cityGlow;

    // Final blended color based on day/night
    vec3 baseColor = mix(nightBlended, boostedDay, sharpened);

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
    vec3 countryEncoded = texture2D(countryIdMap, flippedUv).rgb;
    vec3 oceanEncoded = texture2D(oceanIdMap, vUv).rgb;

    float countryIdValue = countryEncoded.r * 255.0 * 65536.0 + countryEncoded.g * 255.0 * 256.0 + countryEncoded.b * 255.0;
    float oceanIdValue   = oceanEncoded.r   * 255.0 * 65536.0 + oceanEncoded.g   * 255.0 * 256.0 + oceanEncoded.b   * 255.0;

    float tolerance = 0.5;
    bool isHovered = (hoveredCountryId > 0) && (abs(countryIdValue - float(hoveredCountryId)) < tolerance);
    bool isPrevious = (previousHoveredId > 0) && (abs(countryIdValue - float(previousHoveredId)) < tolerance);
    bool isOceanHovered = (hoveredOceanId > 0) && (oceanIdValue == float(hoveredOceanId));

    // Country hover color
    // vec3 highlightColor = vec3(0.2, 0.95, 1.0);
    // vec3 highlightColor = vec3(0.565, 0.933, 0.565);
    vec3 highlightColor = vec3(0.227, 0.471, 0.710);

    // Hover
    if(isHovered) {
        float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
        float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
        float glowAmount = fresnel * pulse;
        vec3 halo = highlightColor * glowAmount * highlightFadeIn;
        finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeIn);
        finalColor += halo;
    }

    // Ocean hover highlight
    if (isOceanHovered) {
        float pulse = 0.5 + 0.5 * sin(uTime * 2.5);
        float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
        float glowAmount = fresnel * pulse;
        vec3 oceanHighlight = vec3(0.3, 0.85, 1.0); // turquoise glow
        finalColor = mix(finalColor, oceanHighlight, 0.4);
        finalColor += oceanHighlight * glowAmount * 0.8;
    }

    // Previous hover
    if(isPrevious) {
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

    if(isSelected) {
        float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
        vec3 halo = highlightColor * fresnel * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.35);
        finalColor += halo;
    }

    // Ocean selection logic
    float oceanSelectedIndex = clamp(oceanIdValue - 10000.0, 0.0, 2047.0);
    vec2 oceanLookupUV = vec2((oceanSelectedIndex + 0.5) / 512.0, 0.5);

    float oceanSelected = texture2D(selectedOceanMask, oceanLookupUV).r;
    bool isOceanSelected = oceanSelected > 0.5;

    if (isOceanSelected) {
        float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
        vec3 oceanColor = vec3(0.3, 0.85, 1.0); // turquoise glow
        vec3 halo = oceanColor * fresnel * 0.6;
        finalColor = mix(finalColor, oceanColor, 0.3);
        finalColor += halo;
    }

    // === Cursor glow on night side ===
    float distToCursor = distance(normalize(vWorldNormal), normalize(cursorWorldPos));
    float cursorFalloff = smoothstep(cursorGlowRadius, 0.0, distToCursor);
    vec3 cursorGlowColor = vec3(0.6, 0.7, 1.0); // soft blue

    // Multiply with night factor so glow only appears at night
    float nightFactor = 1.0 - sharpened;

    finalColor += cursorGlowColor * cursorFalloff * nightFactor * cursorGlowStrength;

    gl_FragColor = vec4(finalColor, 1.0);
}