import { Quaternion, Vector3 } from "three";

// Interpolates points along a great-circle arc between start and end
export function slerpOnSphere(
  start: Vector3,
  end: Vector3,
  t: number
): Vector3 {
  const axis = new Vector3().crossVectors(start, end).normalize();
  const angle = start.angleTo(end);

  if (angle === 0 || isNaN(angle)) return start.clone();

  const q = new Quaternion().setFromAxisAngle(axis, angle * t);
  return start.clone().applyQuaternion(q);
}
