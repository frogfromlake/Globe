/**
 * @file latLonToVector.ts
 * @description Utilities for converting geographic coordinates (latitude, longitude)
 *              to 3D vector or spherical coordinates for globe positioning in 3D space.
 *              Includes standard and flipped-Y versions for different projection use cases.
 */

import { Vector3 } from "three";

/**
 * Converts latitude and longitude (in degrees) to a unit 3D vector
 * pointing outward from the origin of a sphere (e.g. the center of Earth).
 * This is used for standard "upright" spherical positioning.
 *
 * @param lat Latitude in degrees (positive north)
 * @param lon Longitude in degrees (positive east)
 * @returns A normalized THREE.Vector3 on the unit sphere
 */
export function latLonToUnitVector(lat: number, lon: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle from vertical
  const theta = (lon + 90) * (Math.PI / 180); // azimuthal angle from x-axis
  return new Vector3().setFromSphericalCoords(1, phi, theta).normalize();
}

/**
 * Converts latitude and longitude (in degrees) to a unit 3D vector
 * where the Y-axis is flipped (used in texture-mapped or upside-down sources).
 *
 * @param lat Latitude in degrees
 * @param lon Longitude in degrees
 * @returns A normalized THREE.Vector3 with flipped Y-axis assumption
 */
export function latLonToUnitVectorFlipped(lat: number, lon: number): Vector3 {
  const phi = (90 + lat) * (Math.PI / 180); // flipped: closer to -lat
  const theta = (lon + 90) * (Math.PI / 180);
  return new Vector3().setFromSphericalCoords(1, phi, theta).normalize();
}

/**
 * Converts latitude and longitude (in degrees) into spherical coordinates
 * for use with `THREE.Spherical` or manual mesh placement.
 *
 * @param lat Latitude in degrees
 * @param lon Longitude in degrees
 * @param radius Radius of the sphere (default: 1.0)
 * @returns Object containing { phi, theta, radius }
 */
export function latLonToSphericalCoords(
  lat: number,
  lon: number,
  radius: number = 1.0
): {
  phi: number;
  theta: number;
  radius: number;
} {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 90) * (Math.PI / 180);
  return { phi, theta, radius };
}
