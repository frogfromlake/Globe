uniform sampler2D topographyMap;
uniform float bumpScale;
uniform float obliquityRad;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
    vUv = uv;

    // === Apply axial tilt (rotation around X-axis) ===
    mat4 tiltMatrix = mat4(1.0, 0.0, 0.0, 0.0, 0.0, cos(obliquityRad), -sin(obliquityRad), 0.0, 0.0, sin(obliquityRad), cos(obliquityRad), 0.0, 0.0, 0.0, 0.0, 1.0);

    vec4 tiltedPos = tiltMatrix * vec4(position, 1.0);
    vec4 worldPos = modelMatrix * tiltedPos;

    vec3 tiltedNormal = mat3(tiltMatrix) * normal;
    vec3 baseNormal = normalize(mat3(modelMatrix) * tiltedNormal);

    float bump = texture2D(topographyMap, vUv).r;
    float height = (bump - 0.5) * bumpScale;
    vec3 displacedNormal = normalize(baseNormal + baseNormal * height);

    vWorldNormal = displacedNormal;

    vec3 cameraToVertex = cameraPosition - worldPos.xyz;
    vViewDirection = normalize(cameraToVertex);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
