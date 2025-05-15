// atmosphere.frag
// Fragment shader for rendering the atmosphere. This shader handles rim lighting, sunlight interaction, and twilight effects 
// based on the viewer's perspective and light direction.

uniform float uCameraDistance;      // The camera's distance from the center of the globe, used for distance-based fading.
uniform vec3 uLightDirection;       // The direction of the sunlight (light source), used to calculate lighting effects.

varying vec3 vNormal;               // The normal of the current vertex in world space, passed from the vertex shader.
varying vec3 vViewDirection;        // The direction from the camera to the vertex, passed from the vertex shader.

void main() {
    // Normalize the normal, view direction, and light direction vectors.
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDirection);
    vec3 lightDir = normalize(uLightDirection);

    // === Rim glow calculation ===
    // The fresnel term controls the strength of the rim glow effect, which is strongest at the tangent angles (when the view direction
    // is nearly perpendicular to the normal). The dot product of view direction and normal is used to calculate this.
    float fresnel = pow(0.82 - dot(viewDir, normal), 8.0);

    // === Sunlight incidence calculation ===
    // The dot product between the normal and the light direction gives the angle of incidence between the surface and the sunlight.
    // This determines how much sunlight hits the surface, and is used for the day-night transition effect.
    float lightDot = dot(normal, lightDir);

    // === Daylight fade ===
    // Apply a smooth transition for daylight (gradual fade in/out) when the light is perpendicular to the surface.
    float dayFade = smoothstep(-0.08, 0.08, lightDot);
    // === Twilight effect (sunset/sunrise) ===
    // Twilight is stronger when the light is at lower angles (closer to the horizon). 
    // Adjust the smoothstep range and the multiplier to increase twilight intensity.
    float twilight = smoothstep(-0.2, -0.02, lightDot) * (1.0 - dayFade);
    twilight *= 1.2;  // Increased intensity by multiplying with a factor

    // === Combine fade values for overall glow effect ===
    // The final fade value combines daylight and twilight. The twilight effect is reduced by a factor of 0.8 to create a more subtle sunset effect.
    float fade = dayFade + twilight * 0.7;
    // === Alpha calculation ===
    // Alpha is the transparency of the final color, combining the fresnel effect and the calculated fade.
    float alpha = fresnel * fade;

    // === Distance-based fade ===
    // Apply a smoothstep function to reduce the alpha as the camera gets farther from the atmosphere.
    // This helps simulate the effect of the atmosphere becoming less visible at larger distances.
    float distanceFade = smoothstep(1.0, 30.0, uCameraDistance);
    alpha *= 0.6 - distanceFade;

    // === Color blending for day and twilight ===
    // Daylight color (a soft blue) and twilight color (a warm orange-pink) are blended based on the twilight effect.
    vec3 dayColor = vec3(0.5, 0.8, 1.5); // Daylight color (light blue)
    // vec3 twilightHue = vec3(1.0, 0.5, 0.3); // Twilight color (sunset orange)
    vec3 twilightHue = mix(vec3(1.0, 0.5, 0.3), vec3(0.5, 0.3, 0.5), 0.55);  // Blending orange with purple

    // Blend the day and twilight colors based on the calculated twilight effect.
    vec3 glowColor = mix(dayColor, twilightHue, twilight);

    // === Final output ===
    // The final color is the combination of the glow color and the alpha, which is used to create the soft glow effect of the atmosphere.
    // The alpha determines the transparency of the atmosphere, with higher values making the atmosphere more visible.
    gl_FragColor = vec4(glowColor * alpha, alpha);
}
