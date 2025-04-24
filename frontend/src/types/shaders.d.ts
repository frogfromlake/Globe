/**
 * @file shaders.d.ts
 * @description Type declarations for the shader files used in the project.
 * These declarations allow TypeScript to recognize `.vert` and `.frag` files as modules,
 * enabling proper handling and importing of shader source code in the application.
 */

/**
 * Module declaration for `.vert` shader files (vertex shaders).
 * This allows TypeScript to correctly handle imports of `.vert` files as strings.
 */
declare module "*.vert" {
  /**
   * The content of the vertex shader file is treated as a string.
   * This is used to load and pass the shader code to WebGL or Three.js.
   */
  const value: string;
  export default value;
}

/**
 * Module declaration for `.frag` shader files (fragment shaders).
 * This allows TypeScript to correctly handle imports of `.frag` files as strings.
 */
declare module "*.frag" {
  /**
   * The content of the fragment shader file is treated as a string.
   * This is used to load and pass the shader code to WebGL or Three.js.
   */
  const value: string;
  export default value;
}
