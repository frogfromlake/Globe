// atmosphere.vert
// Vertex shader for the atmosphere, responsible for calculating the position and view direction for each fragment of the atmosphere mesh.

varying vec3 vNormal;            // The normal of the vertex in world space, passed to the fragment shader.
varying vec3 vViewDirection;     // The direction from the camera to the vertex, passed to the fragment shader.

void main() {
    // Calculate the world position of the vertex by applying the model transformation matrix.
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    // Transform the normal from object space to world space by applying the model matrix.
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

    // The camera's position is automatically available in GLSL as 'cameraPosition'.
    // Calculate the direction from the camera to the vertex.
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);

    // Calculate the final position of the vertex in clip space (screen space) by multiplying
    // the vertex position with the model, view, and projection matrices.
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
