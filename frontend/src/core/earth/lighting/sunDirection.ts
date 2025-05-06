import { Vector3 } from "three";
import { CONFIG } from '@/configs/config';
import { getSubsolarPoint } from '@/core/earth/lighting/subsolarPoint';
import { latLonToUnitVector } from '@/core/earth/geo/coordinates';

/**
 * Computes the Y-axis globe rotation so the subsolar point faces forward.
 */
export function getSolarRotationY(date: Date = new Date()): number {
  const { lon: solarLon } = getSubsolarPoint(date);
  return -solarLon * CONFIG.geo.degToRad;
}

/**
 * Returns the world-space direction vector to the subsolar point.
 */
export function getSunDirectionWorld(date: Date = new Date()): Vector3 {
  const { lat, lon } = getSubsolarPoint(date);
  return latLonToUnitVector(lat, lon);
}