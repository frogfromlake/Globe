uniform float uCameraDistance;
uniform vec3 uLightDirection;

varying vec3 vNormal;
varying vec3 vViewDirection;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDirection);
    vec3 lightDir = normalize(uLightDirection);

    // Rim glow strongest at tangent angles
    float fresnel = pow(0.85 - dot(viewDir, normal), 6.0);

    // Sunlight incidence angle
    float lightDot = dot(normal, lightDir);

    // Daylight fade
    float dayFade = smoothstep(-0.12, 0.12, lightDot);

    // Narrower twilight zone with strong color
    float twilight = smoothstep(-0.28, -0.05, lightDot) * (1.0 - dayFade);

    // Combine glow strength
    float fade = dayFade + twilight * 0.7;

    // Alpha with fresnel + distance-based fade
    float alpha = fresnel * fade;
    float distanceFade = smoothstep(1.0, 30.0, uCameraDistance);
    alpha *= 0.6 - distanceFade;

    // Warm orange-pink hue for twilight, blended into blue day
    vec3 dayColor = vec3(0.5, 0.8, 1.5);
    vec3 twilightHue = vec3(1.0, 0.5, 0.3); // sunset orange
    vec3 glowColor = mix(dayColor, twilightHue, twilight);

    gl_FragColor = vec4(glowColor * alpha, alpha);
}
