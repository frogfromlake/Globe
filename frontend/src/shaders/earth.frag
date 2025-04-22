// === UNIFORMS ===
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D countryIdMap;
uniform sampler2D oceanIdMap;
uniform sampler2D selectedMask;
uniform sampler2D selectedOceanMask;

uniform int hoveredCountryId;
uniform int previousHoveredId;
uniform int previousHoveredOceanId;
uniform int selectedCountryId;
uniform int hoveredOceanId;

uniform float highlightFadeIn;
uniform float highlightFadeOut;
uniform float uTime;
uniform float cityLightStrength;
uniform float cursorGlowStrength;
uniform float cursorGlowRadius;
uniform float nightBrightness;

uniform vec3 lightDirection;
uniform vec3 cameraDirection;
uniform vec3 cursorWorldPos;

uniform vec2 cursorUV;

uniform bool uFlashlightEnabled;
uniform bool uCursorOnGlobe;

// === VARYINGS ===
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

// === UTILS ===
vec3 desaturate(vec3 color, float factor) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(gray), factor);
}

void main() {
    // === LIGHTING CALCULATION ===
    float intensity = dot(normalize(vWorldNormal), normalize(lightDirection));
    float normalized = intensity * 0.5 + 0.5;
    float sharpened = smoothstep(0.42, 0.58, normalized);

    // === BASE TEXTURE SAMPLES ===
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);

    // === DAY MAP STYLING ===
    vec3 boostedDay = dayColor.rgb * 1.25;
    boostedDay = desaturate(boostedDay, 0.6);
    vec3 warmTint = vec3(1.05, 0.97, 0.92);
    float luminance = dot(boostedDay, vec3(0.299, 0.587, 0.114));
    float tintStrength = smoothstep(0.2, 0.8, luminance);
    boostedDay = mix(boostedDay, boostedDay * warmTint, tintStrength);
    vec3 desaturatedDay = vec3(dot(boostedDay, vec3(0.299, 0.587, 0.114)));
    boostedDay = mix(desaturatedDay, boostedDay, 1.1);

    // === NIGHT MAP STYLING ===
    const float desaturationFactor = 0.12;
    vec3 nightOriginal = nightColor.rgb;

    // Soft desaturation of night texture
    float nightGray = dot(nightOriginal, vec3(0.299, 0.587, 0.114));
    vec3 tonedNight = mix(nightOriginal, vec3(nightGray), desaturationFactor);

    // Realistic warm light tint
    vec3 lightTint = vec3(1.05, 0.9, 0.7); // subtle amber

    // Smooth city glow with clean falloff
    float cityFalloff = smoothstep(0.0, 0.7, 1.0 - sharpened);
    vec3 cityGlow = tonedNight * lightTint * cityLightStrength * cityFalloff * 0.05;

    // Combine and darken near the terminator
    vec3 nightBlended = tonedNight + cityGlow;

    // Apply brightness (user controlled)
    nightBlended *= nightBrightness;

    // === FINAL BLEND BASE COLOR ===
    vec3 baseColor = mix(nightBlended, boostedDay, sharpened);

    // === GAMMA CORRECTION ===
    vec3 finalColor = pow(baseColor, vec3(0.95));

    // === VIEW NORMALS ===
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(vViewDirection);
    float rimDot = 1.0 - max(dot(viewDir, normal), 0.0);

    // === DAY-SIDE RIM LIGHTING ===
    float dayRimFade = smoothstep(0.0, 1.0, pow(rimDot, 5.0)) * sharpened;
    vec3 rimColor = mix(vec3(0.5, 0.7, 1.0), vec3(0.5, 0.8, 0.9), rimDot);
    finalColor += rimColor * dayRimFade * 0.6;

    // === NIGHT-SIDE RIM DARKENING ===
    float nightRimFade = smoothstep(0.0, 1.0, pow(rimDot, 3.5)) * (1.0 - sharpened);
    finalColor = mix(finalColor, vec3(0.0), nightRimFade * 0.9);

    // === DAY/NIGHT TRANSITION EDGE FILL ===
    float edgeFill = smoothstep(0.0, 0.2, sharpened);
    finalColor += vec3(0.01, 0.015, 0.025) * edgeFill;

    // === ID MAP DECODING ===
    // Country ID is Y-flipped (vUv.y is upside-down)
    vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 countryRGB = texture2D(countryIdMap, flippedUv).rgb;
    vec3 oceanRGB   = texture2D(oceanIdMap, vUv).rgb;

    // Decode RGB into integer IDs
    float countryIdValue = countryRGB.r * 255.0 * 65536.0 +
                        countryRGB.g * 255.0 * 256.0 +
                        countryRGB.b * 255.0;

    float oceanIdValue = oceanRGB.r * 255.0 * 65536.0 +
                        oceanRGB.g * 255.0 * 256.0 +
                        oceanRGB.b * 255.0;

    // === HOVER STATE CHECKS ===
    float tolerance = 0.5;
    bool isHovered        = (hoveredCountryId > 0) && (abs(countryIdValue - float(hoveredCountryId)) < tolerance);
    bool isPrevious       = (previousHoveredId > 0) && (abs(countryIdValue - float(previousHoveredId)) < tolerance);
    bool isOceanHovered   = (hoveredOceanId > 0) && (oceanIdValue == float(hoveredOceanId));
    bool isPreviousOcean = (previousHoveredOceanId > 0) && (oceanIdValue == float(previousHoveredOceanId));

    // === HOVER HIGHLIGHT EFFECTS ===
    vec3 highlightColor = vec3(0.93, 0.99, 0.93);       // Country highlight color
    vec3 oceanHighlight = vec3(0.19, 0.41, 0.74);      // Ocean hover highlight color

    float fresnel = pow(1.0 - dot(viewDir, normal), 2.5);
    float pulse   = 0.2 + 0.2 * sin(uTime * 2.5);      // Sinusoidal pulsing

    // --- Active hover on country ---
    if (isHovered) {
        float glow = fresnel * pulse;
        vec3 halo = highlightColor * glow * highlightFadeIn * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.2 * highlightFadeIn);
        finalColor += halo;
    }

    // --- Active hover on ocean ---
    if (isOceanHovered) {
        float glow = fresnel * pulse;
        vec3 halo = oceanHighlight * glow * highlightFadeIn * 0.6;
        finalColor = mix(finalColor, oceanHighlight, 0.2 * highlightFadeIn);
        finalColor += halo;
    }

    // --- Previous country hover (fading out) ---
    if (isPrevious) {
        float glow = fresnel * pulse;
        vec3 halo = highlightColor * glow * highlightFadeOut * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.15 * highlightFadeOut);
        finalColor += halo;
    }

    // --- Previous ocean hover (fading out) ---
    if (isPreviousOcean) {
        float glow = fresnel * pulse;
        vec3 halo = oceanHighlight * glow * highlightFadeOut * 0.6;
        finalColor = mix(finalColor, oceanHighlight, 0.15 * highlightFadeOut);
        finalColor += halo;
    }

    // === SELECTION HIGHLIGHTS ===
    // Country selection
    float selectedIndex = clamp(countryIdValue, 0.0, 2047.0);
    vec2 selectedUV = vec2((selectedIndex + 0.5) / 2048.0, 0.5);
    float selected = texture2D(selectedMask, selectedUV).r;
    bool isSelected = selected > 0.5;

    if (isSelected) {
        float glow = pow(1.0 - dot(viewDir, normal), 2.5);
        vec3 halo = highlightColor * glow * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.3);
        finalColor += halo;
    }

    // Ocean selection
    float oceanIndex = clamp(oceanIdValue - 10000.0, 0.0, 2047.0);
    vec2 oceanUV = vec2((oceanIndex + 0.5) / 512.0, 0.5);
    float oceanSelected = texture2D(selectedOceanMask, oceanUV).r;
    bool isOceanSelected = oceanSelected > 0.5;

    if (isOceanSelected) {
        float glow = pow(1.0 - dot(viewDir, normal), 2.5);
        vec3 halo = oceanHighlight * glow * 0.6;
        finalColor = mix(finalColor, oceanHighlight, 0.2);
        finalColor += halo;
    }

    // === CURSOR GLOW ON NIGHT SIDE ===
    if (uFlashlightEnabled && uCursorOnGlobe) {
        float cursorDistance = distance(normalize(vWorldNormal), normalize(cursorWorldPos));
        float glowFalloff = smoothstep(cursorGlowRadius, 0.0, cursorDistance);
        float nightFactor = 1.0 - sharpened;

        vec3 cursorGlowColor = vec3(0.65, 0.74, 1.0); // soft blue
        finalColor += cursorGlowColor * glowFalloff * nightFactor * cursorGlowStrength;
    }

    gl_FragColor = vec4(finalColor, 1.0);
}