precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec3 vWorldPosition;

uniform sampler2D uAuroraMap;
uniform vec3 lightDirection;
uniform vec3 uMagneticNorth;
uniform vec3 uMagneticSouth;

// --- Smoothed flicker using coherent sin-based offset ---
vec2 flickerVec(vec3 pos, float time) {
    float flicker = sin(dot(pos.xy, vec2(50.0, 30.0)) + time * 1.5);
    return vec2(
        sin(time + pos.y * 10.0),
        cos(time + pos.x * 8.0)
    ) * 0.01 * flicker;
}

// --- Soft 5-tap blur for aurora texture ---
float sampleAuroraBlurred(vec2 uv) {
    float w = 0.002;
    float sum = 0.0;
    sum += texture2D(uAuroraMap, fract(uv)).r * 0.4;
    sum += texture2D(uAuroraMap, fract(uv + vec2( w, 0.0))).r * 0.15;
    sum += texture2D(uAuroraMap, fract(uv + vec2(-w, 0.0))).r * 0.15;
    sum += texture2D(uAuroraMap, fract(uv + vec2(0.0,  w))).r * 0.15;
    sum += texture2D(uAuroraMap, fract(uv + vec2(0.0, -w))).r * 0.15;
    return pow(sum, 2.2); // Gamma correction
}

void main() {
    vec3 pos = normalize(vWorldPosition);

    // --- Magnetic pole axes ---
    vec3 northPole = normalize(uMagneticNorth);
    vec3 southPole = normalize(uMagneticSouth);
    vec3 up = vec3(0.0, 1.0, 0.0);

    vec3 northTangent = normalize(cross(up, northPole));
    vec3 northBitangent = cross(northPole, northTangent);

    vec3 southTangent = normalize(cross(up, southPole));
    vec3 southBitangent = cross(southPole, southTangent);

    // --- UV projection per pole ---
    vec2 northUV = vec2(dot(pos, northTangent), dot(pos, northBitangent)) * 0.5 + 0.5;
    vec2 southUV = vec2(dot(pos, southTangent), dot(pos, southBitangent)) * 0.5 + 0.5;

    // --- Zoom and offset for texture ---
    float auroraZoom = 0.6; // < 1 = zoom out, > 1 = zoom in
    vec2 auroraOffset = vec2(0.2, -0.07); // adjust to shift texture position

    northUV = (northUV - 0.5) / auroraZoom + 0.5 + auroraOffset;
    southUV = (southUV - 0.5) / auroraZoom + 0.5 + auroraOffset;

    // --- Rotation animation ---
    float angleN = uTime * 0.15;
    float angleS = -uTime * 0.1;
    mat2 rotN = mat2(cos(angleN), -sin(angleN), sin(angleN), cos(angleN));
    mat2 rotS = mat2(cos(angleS), -sin(angleS), sin(angleS), cos(angleS));

    vec2 baseNorthUV = rotN * (northUV - 0.5);
    vec2 baseSouthUV = rotS * (southUV - 0.5);

    vec2 flicker = flickerVec(pos, uTime);

    northUV = baseNorthUV + flicker + 0.5;
    southUV = baseSouthUV + flicker + 0.5;

    // --- Sample smoothed texture ---
    float northAlpha = sampleAuroraBlurred(northUV);
    float southAlpha = sampleAuroraBlurred(southUV);

    // --- Magnetic ring fade ---
    float distToNorth = length(cross(pos, northPole));
    float distToSouth = length(cross(pos, southPole));
    float northFade = 1.0 - smoothstep(0.25, 0.42, distToNorth);
    float southFade = 1.0 - smoothstep(0.25, 0.42, distToSouth);

    // --- Hemisphere logic ---
    bool isNorth = dot(pos, northPole) > 0.0;
    // bool isSouth = dot(pos, southPole) < 0.0;
    bool isSouth = dot(pos, southPole) > 0.0;

    float alpha = 0.0;

    if (isNorth) {
        float alignment = abs(dot(pos, northPole));
        float ringSharpness = smoothstep(0.75, 0.95, alignment);
        alpha = northAlpha * northFade * ringSharpness;
    } else if (isSouth) {
        float alignment = abs(dot(pos, southPole));
        float ringSharpness = smoothstep(0.75, 0.95, alignment);
        alpha = southAlpha * southFade * ringSharpness;
    }

    // --- Height fade (atmosphere shell) ---
    float heightFade = smoothstep(0.0, 0.06, length(vWorldPosition) - 1.0);

    // --- Edge blend for color ---
    float edgeBlend = smoothstep(0.0, 0.4, 1.0 - alpha);
    vec3 coreColor = vec3(0.1, 1.0, 0.4);
    vec3 edgeColor = vec3(0.2, 0.8, 1.0);
    vec3 auroraColor = mix(coreColor, edgeColor, edgeBlend) * alpha;

    // --- Final alpha with blending curve ---
    float finalAlpha = pow(alpha * heightFade * 2.5, 1.2);
    
    gl_FragColor = vec4(auroraColor, finalAlpha);
}
