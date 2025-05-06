uniform float uCloudTime;
uniform vec3 uLightDirection;
uniform vec2 uCloudDrift;
uniform float uBaseDriftSpeed;

varying vec2 vUv;
varying float vSunlightFactor;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
    vUv = uv;

    vec3 objectNormal = normalize(normal);
    vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);

    float sunDot = dot(vWorldNormal, normalize(uLightDirection));
    float normalized = sunDot * 0.5 + 0.5;
    vSunlightFactor = smoothstep(0.42, 0.58, normalized);

    // Global cloud drift
    float driftSpeed = uBaseDriftSpeed;
    vec2 uvOffset = uCloudDrift * uCloudTime * driftSpeed;
    vUv = uv + uvOffset;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
