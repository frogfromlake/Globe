/**
 * @file initializeCamera.ts
 * @description Creates and configures the main perspective camera for the 3D globe scene.
 * Ensures it points toward the Prime Meridian, adjusted by simulated solar rotation.
 */

import { PerspectiveCamera, Vector3 } from "three";
import { CONFIG } from "@/configs/config";
import { latLonToSphericalCoordsGeographic } from "@/core/earth/geo/coordinates";
import { getSolarRotationY } from "@/core/earth/lighting/sunDirection";

/**
 * Initializes the PerspectiveCamera positioned to view the globe from above the equator,
 * aligned with Earth's rotation and solar simulation.
 *
 * @returns A configured PerspectiveCamera instance.
 */
export function initializeCamera(): PerspectiveCamera {
  const { fov, near, far, initialPosition, fovDistanceMultiplier } =
    CONFIG.camera;

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new PerspectiveCamera(fov, aspect, near, far);

  // Calculate camera distance based on initial Z and FOV multiplier
  const distance = initialPosition.z * fovDistanceMultiplier;

  // Convert (lat=0, lon=0) to spherical coordinates
  const { phi, theta } = latLonToSphericalCoordsGeographic(0, 0, 0);

  // Calculate position vector and apply simulated Earth rotation
  const position = new Vector3().setFromSphericalCoords(distance, phi, theta);
  position.applyAxisAngle(new Vector3(0, 1, 0), getSolarRotationY());

  camera.position.copy(position);
  camera.lookAt(0, 0, 0);

  return camera;
}
