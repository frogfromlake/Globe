// aurora.vert
varying vec3 vLocalRayOrigin;
varying vec3 vLocalRayDir;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vLocalRayOrigin = vec3(0.0, 0.0, 0.0); // ray starts at globe center
    vLocalRayDir = normalize(worldPos.xyz); // outward from center

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
