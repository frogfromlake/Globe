// sun.ts (fixed)
import { Vector3 } from "three";
import { getSubsolarPoint, getSunDirectionUTC, latLonToUnitVector } from "./geo";
import { CONFIG } from "../configs/config";

/**
 * Computes the current subsolar longitude and the Y-axis rotation
 * needed to center the subsolar point on the front of the globe.
 *
 * @returns Rotation angle in radians (negative of subsolar longitude)
 */
export function getSolarRotationY(): number {
  const { lon: solarLon } = getSubsolarPoint(new Date());

  const greenwichOffset = -Math.PI / 2;

  return -solarLon * CONFIG.geo.degToRad + greenwichOffset;
}

/**
 * Returns the rotated sunlight direction vector for shaders,
 * based on current UTC time and Earth's Y-axis rotation.
 *
 * @param rotationY - Current Y rotation of the globe (e.g., from getSolarRotationY)
 * @returns THREE.Vector3 representing the rotated light direction
 */
export function getRotatedSunDirection(rotationY: number): Vector3 {
  const sunDir = getSunDirectionUTC();
  return sunDir.clone().applyAxisAngle(new Vector3(0, 1, 0), -rotationY);
}

/**
 * Returns the direction vector pointing to the subsolar point in world space,
 * correctly accounting for Earth tilt and Y-rotation.
 */
export function getSunDirectionWorld(): Vector3 {
  const { lat, lon } = getSubsolarPoint(new Date());
  const subsolarVec = latLonToUnitVector(lat, lon); // unit vector from globe center to subsolar point
  return subsolarVec;
}
