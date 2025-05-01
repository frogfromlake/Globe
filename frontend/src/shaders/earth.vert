// earth.vert
// Vertex shader for the Earth mesh, responsible for transforming the vertices
// and passing data for fragment processing such as lighting, bump mapping, etc.

uniform sampler2D topographyMap;  // Topography (bump) texture
uniform float bumpScale;          // Scale of bumpiness

varying vec2 vUv;                 // Varying: UV coordinates
varying vec3 vWorldNormal;         // Varying: World-space normal
varying vec3 vViewDirection;       // Varying: View direction (camera to fragment)

void main() {
    vUv = uv;

    // Calculate world position
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    // Base normal in world space
    vec3 baseNormal = normalize(mat3(modelMatrix) * normal);

    // === Bump Mapping ===
    // Sample bump map (topography)
    float bump = texture2D(topographyMap, vUv).r;

    // Center bump around 0 (because bump map goes from 0–1)
    float height = (bump - 0.5) * bumpScale;

    // Perturb the normal slightly
    vec3 displacedNormal = normalize(baseNormal + baseNormal * height);

    // Pass displaced normal to fragment shader
    vWorldNormal = displacedNormal;

    // View direction
    vec3 cameraToVertex = cameraPosition - worldPos.xyz;
    vViewDirection = normalize(cameraToVertex);

    // Final screen-space position
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
