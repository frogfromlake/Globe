/**
 * initializeRenderer.ts
 * Sets up the WebGL renderer for the application using configuration options.
 * Binds to the target canvas, sets resolution, color space, and handles resizing.
 */

import * as THREE from "three";
import { CONFIG } from "../configs/config";

/**
 * Initializes the WebGL renderer for the 3D globe scene.
 *
 * @param camera - The perspective camera, used to update aspect ratio on resize.
 * @returns {THREE.WebGLRenderer} The configured WebGLRenderer instance.
 */
export function initializeRenderer(
  camera: THREE.PerspectiveCamera
): THREE.WebGLRenderer {
  const canvas = document.getElementById(
    CONFIG.renderer.canvasId
  ) as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: CONFIG.renderer.antialias,
  });

  renderer.debug.checkShaderErrors = CONFIG.renderer.checkShaderErrors;
  renderer.outputColorSpace = CONFIG.renderer.outputColorSpace;

  // Set initial render size and pixel ratio
  renderer.setSize(window.innerWidth, window.innerHeight);

  const pixelRatio =
    CONFIG.renderer.pixelRatio === "device"
      ? window.devicePixelRatio
      : CONFIG.renderer.pixelRatio;
  renderer.setPixelRatio(pixelRatio);

  // Handle window resize: update renderer and camera projection
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return renderer;
}
