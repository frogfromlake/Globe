// utils/camera/cameraUtils.ts
//
// Utility functions for extracting camera direction and longitude,
// primarily used for tile visibility, prioritization, and frustum alignment.

import { PerspectiveCamera, Vector3 } from "three";

/**
 * Returns a normalized vector pointing from the globe center to the camera.
 * This is the inverse of the camera view direction.
 */
export function getCameraCenterDirection(camera: PerspectiveCamera): Vector3 {
  const direction = new Vector3();
  camera.getWorldDirection(direction);
  return direction.negate().normalize(); // globe-center to camera
}

/**
 * Computes the camera's longitudinal angle in degrees,
 * assuming the camera position is relative to the globe center.
 */
export function getCameraLongitude(camera: PerspectiveCamera): number {
  const pos = camera.position.clone().normalize();
  return Math.atan2(pos.x, pos.z) * (180 / Math.PI);
}
