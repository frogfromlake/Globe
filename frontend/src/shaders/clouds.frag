uniform sampler2D uCloudMap;
uniform float uCloudFade;

varying vec2 vUv;
varying float vSunlightFactor;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;
#define MAX_FLASHES 100

uniform vec2 uFlashPoints[MAX_FLASHES];    // Tiny flash centers (in UV)
uniform float uFlashStrengths[MAX_FLASHES]; // Strengths [0..1]
uniform int uNumFlashes;


vec3 desaturate(vec3 color, float factor) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(gray), factor);
}

void main() {
    vec4 cloudSample = texture2D(uCloudMap, vUv);

    float cloudAlpha = cloudSample.r;
    cloudAlpha = pow(cloudAlpha, 0.6);
    cloudAlpha = clamp(cloudAlpha * 1.3, 0.0, 1.0);

    vec3 dayCloudColor = vec3(0.7);
    dayCloudColor = desaturate(dayCloudColor * 1.25, 0.6);

    vec3 nightCloudColor = vec3(0.35);
    nightCloudColor = desaturate(nightCloudColor, 0.1);

    vec3 baseColor = mix(nightCloudColor, dayCloudColor, vSunlightFactor);
    baseColor = pow(baseColor, vec3(0.95));

    float brightness = mix(0.4, 1.0, vSunlightFactor);
    float finalAlpha = cloudAlpha * brightness * uCloudFade;

    // Rim glow near terminator
    float rimGlow = smoothstep(0.0, 0.5, 0.5 - vSunlightFactor);
    vec3 rimColor = vec3(0.4, 0.5, 0.8);
    baseColor += rimColor * rimGlow * 0.3;

    // === NEW: Fade clouds out near night-side rim ===
    float viewDot = dot(normalize(vViewDirection), normalize(vWorldNormal));
    float rimFactor = 1.0 - max(viewDot, 0.0); // 0 (center) to 1 (edge)
    
    float sharpenedSunlight = smoothstep(0.42, 0.58, vSunlightFactor);
    float nightRimFade = smoothstep(0.0, 1.0, pow(rimFactor, 1.5)) * (1.0 - sharpenedSunlight);

    // Apply night rim fade to alpha (you can also fade brightness if you prefer)
    finalAlpha *= 1.0 - clamp(nightRimFade * 1.5, 0.0, 1.0);

    // === Multi-storm Lightning Flashes ===
    float totalLightning = 0.0;

    for (int i = 0; i < MAX_FLASHES; i++) {
        if (i >= uNumFlashes) break;

        vec2 flashUV = uFlashPoints[i];
        float strength = uFlashStrengths[i];

        float dist = distance(vUv, flashUV);
        float falloff = smoothstep(0.004, 0.0, dist); // much tighter radius
        totalLightning += falloff * strength;
    }

    totalLightning *= (1.0 - vSunlightFactor) * cloudAlpha; // night-side only
    baseColor += vec3(1.3, 1.4, 1.8) * totalLightning * 1.0;
    finalAlpha += totalLightning * 0.2;

    gl_FragColor = vec4(baseColor, finalAlpha);
}
