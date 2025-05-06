// earthShaders.ts
// This module imports and exports the vertex and fragment shaders for rendering the Earth, atmosphere, stars, and clouds.

import vertexShader from "@/core/earth/shaders/earth.vert";
import fragmentShader from "@/core/earth/shaders/earth.frag";
import aVertexShader from "@/core/earth/shaders/atmosphere.vert";
import aFragmentShader from "@/core/earth/shaders/atmosphere.frag";
import sVertexShader from "@/core/earth/shaders/stars.vert";
import sFragmentShader from "@/core/earth/shaders/stars.frag";
import cVertexShader from "@/core/earth/shaders/clouds.vert";
import cFragmentShader from "@/core/earth/shaders/clouds.frag";
import auFragmentShader from "@/core/earth/shaders/aurora.frag";
import auVertexShader from "@/core/earth/shaders/aurora.vert";

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

/**
 * Aurora vertex shader.
 * Renders the Aurora layer.
 */
export const auroraVertexShader = auVertexShader;

/**
 * Aurora fragment shader.
 * Renders the Aurora layer.
 */
export const auroraFragmentShader = auFragmentShader;
