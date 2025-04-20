import * as THREE from "three";
import { CONFIG } from "../configs/config";

export function initializeCamera(): THREE.PerspectiveCamera {
  const fov = CONFIG.camera.fov;
  const aspect = window.innerWidth / window.innerHeight;
  const near = CONFIG.camera.near;
  const far = CONFIG.camera.far;

  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  // Adjust camera position based on fov scaling multiplier if defined
  const multiplier = CONFIG.camera.fovDistanceMultiplier || 1;
  const { x, y, z } = CONFIG.camera.initialPosition;
  camera.position.set(x * multiplier, y * multiplier, z * multiplier);

  camera.updateProjectionMatrix();

  return camera;
}
