uniform sampler2D uCloudMap;
uniform float uCloudFade;

varying vec2 vUv;
varying float vSunlightFactor;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

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

    gl_FragColor = vec4(baseColor, finalAlpha);
}
