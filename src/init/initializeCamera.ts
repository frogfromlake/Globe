import * as THREE from "three";
import { CONFIG } from "../configs/config";

export function initializeCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
  );

  const { x, y, z } = CONFIG.camera.initialPosition;
  camera.position.set(x, y, z);

  return camera;
}
