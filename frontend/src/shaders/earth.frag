// earth.frag
// Fragment shader for rendering the Earth's surface, including day/night texture blending, 
// country and ocean highlighting, and cursor interaction effects.

uniform sampler2D dayTexture;                    // The texture representing the Earth's surface during the day, used for the daylight effect.
uniform sampler2D nightTexture;                  // The texture representing the Earth's surface at night, used for the night effect.
uniform sampler2D countryIdMap;                  // A map encoding country IDs used to identify which country is being hovered or selected.
uniform sampler2D oceanIdMap;                    // A map encoding ocean IDs used to identify which ocean is being hovered or selected.
uniform sampler2D selectedMask;                  // A mask indicating selected countries on the globe, used for highlighting.
uniform sampler2D selectedOceanMask;             // A mask indicating selected oceans on the globe, used for highlighting.

uniform int hoveredCountryId;                    // The ID of the currently hovered country, used for hover detection.
uniform int previousHoveredId;                   // The ID of the previously hovered country, used for resetting hover effects.
uniform int previousHoveredOceanId;              // The ID of the previously hovered ocean, used for resetting hover effects.
uniform int selectedCountryId;                   // The ID of the currently selected country, used for selection effects.
uniform int hoveredOceanId;                      // The ID of the currently hovered ocean, used for hover detection.

uniform float highlightFadeIn;                   // A factor controlling how quickly the highlight fades in when hovering over a country or ocean.
uniform float highlightFadeOut;                  // A factor controlling how quickly the highlight fades out when moving the hover away.
uniform float uTime;                             // The global time uniform, used for animations like pulsating highlights.
uniform float cityLightStrength;                 // The strength of city lights visible at night on the Earth's surface.
uniform float cursorGlowStrength;                // The strength of the cursor's glow effect on the globe.
uniform float cursorGlowRadius;                  // The radius within which the cursor will cause a glow effect.
uniform float nightBrightness;                   // The brightness of the night side of the globe.
uniform float uTextureFade;
uniform float uCountryCount;                     // Number of countries in the selectedMask texture
uniform float uOceanCount;                       // Number of oceans in the selectedOceanMask texture

uniform vec3 lightDirection;                     // The direction of the sunlight, used to simulate day/night transitions.
uniform vec3 cameraDirection;                    // The direction from the camera to the Earth, used for lighting and view-dependent effects.
uniform vec3 cursorWorldPos;                     // The world-space position of the cursor, used for cursor-based effects.

uniform vec2 cursorUV;                           // The UV coordinates of the cursor, used for texture mapping during cursor effects.

uniform bool uFlashlightEnabled;                 // Whether the flashlight effect is enabled, based on user input.
uniform bool uCursorOnGlobe;                     // Whether the cursor is on the globe, used to trigger cursor-based effects.

varying vec2 vUv;                                // The UV coordinates of the current fragment, passed from the vertex shader.
varying vec3 vWorldNormal;                       // The normal vector at the current fragment, passed from the vertex shader.
varying vec3 vViewDirection;                     // The direction from the camera to the current fragment, passed from the vertex shader.
uniform sampler2D topographyMap;  // Topography (bump) texture
vec3 desaturate(vec3 color, float factor) {
    // Desaturates the given color by the specified factor, making the color more grayscale.
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(gray), factor);
}

void main() {
    // === Day and Night Texture Blending ===
    // Blending between day and night textures based on the light direction and view angle to simulate the day-night cycle.
    
    // The intensity of sunlight at the current point.
    float intensity = dot(normalize(vWorldNormal), normalize(lightDirection)); 

    // Normalize the intensity to range from 0 to 1.
    float normalized = intensity * 0.5 + 0.5; 
    
    // Apply a smooth step to sharpen the transition between day and night.
    float sharpened = smoothstep(0.42, 0.58, normalized); 

    // Sample the day and night textures.
    vec4 dayColor = texture2D(dayTexture, vUv); // The color from the day texture.
    vec4 nightColor = texture2D(nightTexture, vUv); // The color from the night texture.

    // Boost the day texture color and apply desaturation to reduce overly saturated colors.
    vec3 boostedDay = dayColor.rgb * 1.25;
    boostedDay = desaturate(boostedDay, 0.6);
    
    // A warm tint to apply to the day texture for realism.
    vec3 warmTint = vec3(1.05, 0.97, 0.92); 
    
    // Calculate the luminance (brightness) of the day texture.
    float luminance = dot(boostedDay, vec3(0.299, 0.587, 0.114)); 
    
    // Apply smoothstep to blend the warm tint based on brightness.
    float tintStrength = smoothstep(0.2, 0.8, luminance); 
    
    // Mix the boosted day texture with the warm tint based on brightness.
    boostedDay = mix(boostedDay, boostedDay * warmTint, tintStrength); 

    // === Night Texture Adjustment ===
    // Adjust the night texture to desaturate it slightly for a more natural look.
    
    const float desaturationFactor = 0.12; // The factor to desaturate the night texture.
    vec3 nightOriginal = nightColor.rgb;
    
    // Convert the night color to grayscale.
    float nightGray = dot(nightOriginal, vec3(0.299, 0.587, 0.114)); 
    
    // Mix the night color with its grayscale version for subtle desaturation.
    vec3 tonedNight = mix(nightOriginal, vec3(nightGray), desaturationFactor); 

    // Apply a light tint to the night texture to give it a more realistic color.
    vec3 lightTintColor = vec3(1.05, 0.9, 0.7); // The light tint for city lights.
    
    // Falloff for city lights, based on the sharpness of the transition.
    float cityFalloff = smoothstep(0.0, 0.7, 1.0 - sharpened); 
    
    // Apply city glow to the night texture.
    vec3 cityGlow = tonedNight * lightTintColor * cityLightStrength * cityFalloff * 0.05; 

    // Blend the toned night texture with the city glow.
    vec3 nightBlended = tonedNight + cityGlow; 
    
    // Apply night brightness to the blended night texture.
    nightBlended *= nightBrightness; 

    // === Final Color Blending ===
    // Blend the final color between day and night based on the sharpened transition.
    vec3 baseColor = mix(nightBlended, boostedDay, sharpened);

    // Apply a slight power function to the final color to achieve a smoother transition effect.
    vec3 finalColor = pow(baseColor, vec3(0.95));

    // === Rim Lighting ===
    // Add rim lighting effects for both day and night sides of the Earth, enhancing the atmospheric feel.
    
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(vViewDirection);
    
    // Compute the dot product between the view direction and normal to calculate rim lighting.
    float rimDot = 1.0 - max(dot(viewDir, normal), 0.0); 

    // Day rim fade effect, with a smooth transition based on the view angle.
    float dayRimFade = smoothstep(0.0, 1.0, pow(rimDot, 5.0)) * sharpened;
    
    // Mix blue and cyan for rim lighting.
    vec3 rimColor = mix(vec3(0.5, 0.7, 1.0), vec3(0.5, 0.8, 0.9), rimDot); 
    
    // Apply the rim color to the final color.
    finalColor += rimColor * dayRimFade * 0.6; 

    // Night rim fade effect, with a smoother transition for night-time glow.
    float nightRimFade = smoothstep(0.0, 1.0, pow(rimDot, 1.5)) * (1.0 - sharpened);
    
    // Darken the final color on the night side.
    finalColor = mix(finalColor, vec3(0.0), nightRimFade * 1.5);

    // Add a slight edge effect for visual enhancement.
    float edgeFill = smoothstep(0.0, 0.2, sharpened);
    
    // Add the edge effect to the final color.
    finalColor += vec3(0.01, 0.015, 0.025) * edgeFill;

    // === Country and Ocean Highlighting ===
    // Sample the country and ocean ID maps to identify hovered or selected regions.
    
    vec2 flippedUv = vec2(vUv.x, 1.0 - vUv.y);
    
    // Sample the country ID map.
    float countryIdValue = texture2D(countryIdMap, flippedUv).r * 255.0;
    
    // Sample the ocean ID map.
    vec3 oceanRGB = texture2D(oceanIdMap, vUv).rgb;
    // Convert the RGB values to their corresponding ID values.
    float oceanIdValue = oceanRGB.r * 255.0 * 65536.0 + oceanRGB.g * 255.0 * 256.0 + oceanRGB.b * 255.0;

    // === Hover, Previous, and Selection Effects ===
    // Check if the country or ocean is hovered, previously hovered, or selected.
    
    float tolerance = 0.5;
    
    // Check if the country is hovered.
    bool isHovered = (hoveredCountryId > 0) && (abs(countryIdValue - float(hoveredCountryId)) < tolerance);
    
    // Check if the country was previously hovered.
    bool isPrevious = (previousHoveredId > 0) && (abs(countryIdValue - float(previousHoveredId)) < tolerance);
    
    // Check if the ocean is hovered.
    bool isOceanHovered = (hoveredOceanId > 0) && (oceanIdValue == float(hoveredOceanId));
    
    // Check if the ocean was previously hovered.
    bool isPreviousOcean = (previousHoveredOceanId > 0) && (oceanIdValue == float(previousHoveredOceanId));

    // Highlight color for countries and oceans.
    vec3 highlightColor = vec3(0.88, 1.0, 0.86); // Light green for country highlights.
    vec3 oceanHighlightColor = vec3(0.43, 0.8, 1.0); // Blue for ocean highlights.

    float fresnel = pow(1.0 - dot(viewDir, normal), 2.5); // Fresnel effect for smoothness in the highlights.
    float pulse = 0.2 + 0.2 * sin(uTime * 2.5); // Pulsing effect based on time for dynamic highlighting.

    // === Highlight Effects for Hovered and Selected Regions ===
    
    if (isHovered) {
        // Apply highlight when a country is hovered.
        
        float glow = fresnel * pulse;
        vec3 halo = highlightColor * glow * highlightFadeIn * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.4 * highlightFadeIn);
        finalColor += halo;
    }

    if (isOceanHovered) {
        // Apply highlight when an ocean is hovered.
        
        float glow = fresnel * pulse;
        vec3 halo = oceanHighlightColor * glow * highlightFadeIn * 0.6;
        finalColor = mix(finalColor, oceanHighlightColor, 0.15 * highlightFadeIn);
        finalColor += halo;
    }

    if (isPrevious) {
        // Apply highlight for previously hovered countries.
        
        float glow = fresnel * pulse;
        vec3 halo = highlightColor * glow * highlightFadeOut * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.15 * highlightFadeOut);
        finalColor += halo;
    }

    if (isPreviousOcean) {
        // Apply highlight for previously hovered oceans.
        
        float glow = fresnel * pulse;
        vec3 halo = oceanHighlightColor * glow * highlightFadeOut * 0.6;
        finalColor = mix(finalColor, oceanHighlightColor, 0.15 * highlightFadeOut);
        finalColor += halo;
    }

    // === Selection Effects for Highlighted Countries and Oceans ===
    // Grayscale country IDs range 0–242:
    // Clamp the country ID for selection texture lookup.
    float selectedIndex = clamp(countryIdValue - 1.0, 0.0, 241.0);

    // Calculate the UV coordinates for the selected country mask.
    vec2 selectedUV = vec2((selectedIndex + 0.5) / uCountryCount, 0.5);
    
    // Sample the selected mask.
    float selected = texture2D(selectedMask, selectedUV).r;
    bool isSelected = selected > 0.5;

    if (isSelected) {
        // Apply selection highlight when a country is selected.
        float glow = pow(1.0 - dot(viewDir, normal), 2.5);
        vec3 halo = highlightColor * glow * 0.6;
        finalColor = mix(finalColor, highlightColor, 0.45);
        finalColor += halo;
    }

    // Clamp the ocean ID for selection texture lookup.
    // RGB ocean IDs range 10000–10305:
    float oceanIndex = clamp(oceanIdValue - 10000.0, 0.0, 2047.0);                  
    
    // Calculate the UV coordinates for the selected ocean mask.
    vec2 oceanUV = vec2((oceanIndex + 0.5) / 512.0, 0.5);                           
    float oceanSelected = texture2D(selectedOceanMask, oceanUV).r;                  
    bool isOceanSelected = oceanSelected > 0.5;

    if (isOceanSelected) {
        // Apply selection highlight when an ocean is selected.
        float glow = pow(1.0 - dot(viewDir, normal), 2.5);
        vec3 halo = oceanHighlightColor * glow * 0.6;
        finalColor = mix(finalColor, oceanHighlightColor, 0.2);
        finalColor += halo;
    }

    // === Flashlight Effect ===
    if (uFlashlightEnabled) {
        vec3 normalizedCursor = normalize(cursorWorldPos);
        vec3 normalizedFrag = normalize(vWorldNormal);

        float cursorDistance = distance(normalizedFrag, normalizedCursor);
        float glowFalloff = smoothstep(cursorGlowRadius, 0.0, cursorDistance);
        float nightFactor = 1.0 - sharpened;

        vec3 cursorGlowColor = vec3(0.65, 0.74, 1.0);
        finalColor += cursorGlowColor * glowFalloff * nightFactor * cursorGlowStrength;
    }

    // Final output color.
    gl_FragColor = vec4(finalColor * uTextureFade, 1.0); // Final color + fade, alpha is 1
}
