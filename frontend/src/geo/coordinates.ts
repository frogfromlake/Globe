import { PerspectiveCamera, Vector3 } from "three";
import { CONFIG } from "../configs/config";

/**
 * Converts latitude and longitude to a unit vector pointing outward from Earth's center.
 */
export function latLonToUnitVector(lat: number, lon: number): Vector3 {
  const phi = (90 - lat) * CONFIG.geo.degToRad;
  const theta = (lon + CONFIG.geo.lonOffset) * CONFIG.geo.degToRad;
  return new Vector3().setFromSphericalCoords(1, phi, theta).normalize();
}

/**
 * Converts latitude and longitude to spherical coordinates for a given radius.
 */
export function latLonToSphericalCoordsGeographic(
  lat: number,
  lon: number,
  radius = CONFIG.geo.defaultRadius
): { phi: number; theta: number; radius: number } {
  const phi = (90 - lat) * CONFIG.geo.degToRad;
  const theta = (lon + CONFIG.geo.lonOffset) * CONFIG.geo.degToRad;
  return { phi, theta, radius };
}

/**
 * Computes the Earth’s rotation angle (radians) at a given UTC time.
 */
export function getEarthRotationAngle(date: Date = new Date()): number {
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;

  const rotation = (utcSeconds / CONFIG.geo.secondsInDay) * Math.PI * 2;
  return rotation - Math.PI / 2; // Greenwich faces +X
}
