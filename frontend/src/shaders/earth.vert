// earth.vert
// This is the vertex shader for the Earth mesh, responsible for transforming the vertices in 3D space 
// and passing data to the fragment shader for further processing, such as lighting and texture mapping.

varying vec2 vUv;                // Varying variable for the texture coordinates.
varying vec3 vWorldNormal;       // Varying variable for the world space normal at the vertex.
varying vec3 vViewDirection;     // Varying variable for the direction from the camera to the vertex.

void main() {
    // Pass texture coordinates (uv) to the fragment shader
    vUv = uv;

    // Calculate the world position of the vertex using the model matrix
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    // Calculate the normal vector in world space and pass it to the fragment shader
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    // Calculate the direction from the camera to the vertex position
    vec3 cameraToVertex = cameraPosition - worldPos.xyz;

    // Normalize the camera-to-vertex direction and pass it to the fragment shader
    vViewDirection = normalize(cameraToVertex);

    // Compute the final position of the vertex in screen space (projection of the world position)
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
