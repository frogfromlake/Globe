import { PerspectiveCamera, Vector3 } from "three";
import { CONFIG } from '@/configs/config';
import { latLonToSphericalCoordsGeographic } from '@/core/earth/geo/coordinates';
import { getSolarRotationY } from '@/core/earth/lighting/sunDirection';

/**
 * Creates and configures the main perspective camera for the scene,
 * ensuring it looks at the Prime Meridian considering Earth's rotation.
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

  const distance = initialPosition.z * fovDistanceMultiplier;

  // Get spherical coords for (lat=0, lon=0)
  const { phi, theta } = latLonToSphericalCoordsGeographic(0, 0, 0);

  // Compute raw position vector
  const position = new Vector3().setFromSphericalCoords(distance, phi, theta);

  // Apply globe's rotation to camera position so it matches what the viewer sees
  const rotationY = getSolarRotationY();
  position.applyAxisAngle(new Vector3(0, 1, 0), rotationY);

  camera.position.copy(position);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  return camera;
}
