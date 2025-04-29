// earthShaders.ts
// This module imports and exports the vertex and fragment shaders for rendering the Earth, atmosphere, stars, and clouds.

import vertexShader from "./earth.vert"; // Import the vertex shader for the Earth.
import fragmentShader from "./earth.frag"; // Import the fragment shader for the Earth.
import aVertexShader from "./atmosphere.vert"; // Import the vertex shader for the atmosphere.
import aFragmentShader from "./atmosphere.frag"; // Import the fragment shader for the atmosphere.
import sVertexShader from "./stars.vert"; // Import the vertex shader for the stars.
import sFragmentShader from "./stars.frag"; // Import the fragment shader for the stars.
import cVertexShader from "./clouds.vert"; // Import the vertex shader for the clouds.
import cFragmentShader from "./clouds.frag"; // Import the fragment shader for the clouds.

/**
 * Earth vertex shader.
 * Responsible for transforming the vertices of the Earth mesh in 3D space.
 */
export const earthVertexShader = vertexShader;

/**
 * Earth fragment shader.
 * Used for rendering the surface of the Earth, applying texture mapping, lighting, etc.
 */
export const earthFragmentShader = fragmentShader;

/**
 * Atmosphere vertex shader.
 * Handles the geometry and volume effects of the Earth's atmosphere.
 */
export const atmosphereVertexShader = aVertexShader;

/**
 * Atmosphere fragment shader.
 * Responsible for visual appearance and glow effects of the atmosphere.
 */
export const atmosphereFragmentShader = aFragmentShader;

/**
 * Stars vertex shader.
 * Positions the stars correctly around the scene.
 */
export const starsVertexShader = sVertexShader;

/**
 * Stars fragment shader.
 * Renders the visual appearance of the stars background.
 */
export const starsFragmentShader = sFragmentShader;

/**
 * Clouds vertex shader.
 * Handles the transformation of the cloud layer mesh.
 */
export const cloudsVertexShader = cVertexShader;

/**
 * Clouds fragment shader.
 * Renders the cloud layer with transparency based on texture brightness.
 */
export const cloudsFragmentShader = cFragmentShader;
