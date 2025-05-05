import { Vector3 } from "three";
import { CONFIG } from "../configs/config";
import { getSubsolarPoint } from "./solar";
import { latLonToUnitVector } from "../geo/coordinates";

/**
 * Computes the Y-axis globe rotation so the subsolar point faces forward.
 */
export function getSolarRotationY(): number {
  const { lon: solarLon } = getSubsolarPoint(new Date());
  const greenwichOffset = -Math.PI / 2;
  return -solarLon * CONFIG.geo.degToRad + greenwichOffset;
}

/**
 * Returns the world-space direction vector to the subsolar point.
 */
export function getSunDirectionWorld(): Vector3 {
  const { lat, lon } = getSubsolarPoint(new Date());
  return latLonToUnitVector(lat, lon);
}
