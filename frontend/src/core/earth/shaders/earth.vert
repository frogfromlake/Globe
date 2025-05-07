
uniform float obliquityRad;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
    vUv = uv;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 baseNormal = normalize(mat3(modelMatrix) * normal);

    vec3 displacedNormal = normalize(baseNormal + baseNormal);

    vWorldNormal = displacedNormal;

    vec3 cameraToVertex = cameraPosition - worldPos.xyz;
    vViewDirection = normalize(cameraToVertex);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
