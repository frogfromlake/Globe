// earthShaders.ts
// This module imports and exports the vertex and fragment shaders for rendering the Earth and its atmosphere.

import vertexShader from "./earth.vert"; // Import the vertex shader for the Earth.
import fragmentShader from "./earth.frag"; // Import the fragment shader for the Earth.
import aVertexShader from "./atmosphere.vert"; // Import the vertex shader for the atmosphere.
import aFragmentShader from "./atmosphere.frag"; // Import the fragment shader for the atmosphere.
import sVertexShader from "./stars.vert";
import sFragmentShader from "./stars.frag";

/**
 * Earth vertex shader.
 * This shader is responsible for transforming the vertices of the Earth mesh in 3D space.
 * It typically handles lighting and positioning effects.
 */
export const earthVertexShader = vertexShader;

/**
 * Earth fragment shader.
 * This shader is used for rendering the surface of the Earth.
 * It processes the pixel colors of the Earth mesh and applies effects like texture mapping, lighting, etc.
 */
export const earthFragmentShader = fragmentShader;

/**
 * Atmosphere vertex shader.
 * This shader handles the geometry of the atmosphere around the Earth, simulating its volume and lighting effects.
 */
export const atmosphereVertexShader = aVertexShader;

/**
 * Atmosphere fragment shader.
 * This shader is responsible for rendering the visual appearance of the atmosphere, including transparency, glow effects, and lighting.
 */
export const atmosphereFragmentShader = aFragmentShader;

/**
 * Stars vertex shader.
 *
 */
export const starsVertexShader = sVertexShader;

/**
 * Stars fragment shader.
 * This shader is responsible for rendering the visual appearance of the stars in the background.
 */
export const starsFragmentShader = sFragmentShader;
