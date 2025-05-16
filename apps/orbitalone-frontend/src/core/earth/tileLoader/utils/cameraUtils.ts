import { PerspectiveCamera, Vector3 } from "three";

export function getCameraCenterDirection(camera: PerspectiveCamera): Vector3 {
  const direction = new Vector3();
  camera.getWorldDirection(direction);
  return direction.normalize();
}
