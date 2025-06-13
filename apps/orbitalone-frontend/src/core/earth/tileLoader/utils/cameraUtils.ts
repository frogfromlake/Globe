import { PerspectiveCamera, Vector3 } from "three";

export function getCameraCenterDirection(camera: PerspectiveCamera): Vector3 {
  const direction = new Vector3();
  camera.getWorldDirection(direction);
  return direction.negate().normalize(); // invert the view direction
}

export function getCameraLongitude(camera: PerspectiveCamera): number {
  const pos = camera.position.clone().normalize();
  return Math.atan2(pos.x, pos.z) * (180 / Math.PI);
}
