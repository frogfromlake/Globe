varying vec3 vNormal;
varying vec3 vViewDirection;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

    // cameraPosition is built-in — use directly
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
