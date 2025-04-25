/**
 * initializeCamera.ts
 * Initializes and returns a PerspectiveCamera based on global configuration.
 * Handles camera FOV, aspect ratio, clipping planes, and starting position.
 */

import { PerspectiveCamera } from "three";
import { CONFIG } from "../configs/config";

/**
 * Creates and configures the main perspective camera for the scene.
 *
 * @returns {THREE.PerspectiveCamera} A configured Three.js PerspectiveCamera instance.
 */
export function initializeCamera(): PerspectiveCamera {
  const {
    fov,
    near,
    far,
    initialPosition,
    fovDistanceMultiplier = 1,
  } = CONFIG.camera;

  const aspect = window.innerWidth / window.innerHeight;

  const camera = new PerspectiveCamera(fov, aspect, near, far);

  // Apply initial camera position with optional FOV-based distance scaling
  camera.position.set(
    initialPosition.x * fovDistanceMultiplier,
    initialPosition.y * fovDistanceMultiplier,
    initialPosition.z * fovDistanceMultiplier
  );

  camera.updateProjectionMatrix();

  return camera;
}
