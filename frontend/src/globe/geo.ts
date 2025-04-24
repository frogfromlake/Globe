import * as THREE from "three";
import { CONFIG } from "../configs/config";

/**
 * Converts latitude and longitude to a unit vector in 3D space.
 * The result represents a point on the surface of a unit sphere with the given latitude and longitude.
 *
 * @param lat - Latitude in degrees (-90 to 90), where 0 is the equator.
 * @param lon - Longitude in degrees (-180 to 180), where 0 is the prime meridian.
 * @returns A normalized THREE.Vector3 pointing to the location on the globe.
 */
export function latLonToUnitVector(lat: number, lon: number): THREE.Vector3 {
  // Convert latitude and longitude to spherical coordinates
  const phi = (90 - lat) * CONFIG.geo.degToRad; // phi is latitude (colatitude), mapped from 90° to 0° for north to south pole
  const theta = (lon + 90) * CONFIG.geo.degToRad; // theta is longitude, adjusted by +90 to match texture rotation
  // Set the vector from spherical coordinates (radius=1) and normalize it
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta).normalize();
}

/**
 * Converts latitude and longitude to spherical coordinates with a specified radius.
 * This is useful for placing points on a globe or sphere with a given radius.
 *
 * @param lat - Latitude in degrees.
 * @param lon - Longitude in degrees.
 * @param radius - The radius of the globe. Defaults to the configured radius in `CONFIG.geo.defaultRadius`.
 * @returns An object containing spherical coordinates: { phi, theta, radius }
 */
export function latLonToSphericalCoordsGeographic(
  lat: number,
  lon: number,
  radius = CONFIG.geo.defaultRadius
): { phi: number; theta: number; radius: number } {
  // Convert latitude and longitude to spherical coordinates (phi, theta)
  const phi = (90 - lat) * CONFIG.geo.degToRad; // phi represents the colatitude
  const theta = (lon + 90) * CONFIG.geo.degToRad; // theta represents longitude, adjusted by +90 to match textures
  return { phi, theta, radius };
}

/**
 * Calculates the Earth's rotation angle based on the current date and time.
 * The rotation angle is used to determine the orientation of the Earth, simulating the Earth's rotation.
 * The angle is based on the number of seconds passed in a day (UTC), normalized to a full rotation (2π radians).
 *
 * @param date - The date for which to calculate the rotation angle. Defaults to the current date/time.
 * @returns The rotation angle in radians.
 */
export function getEarthRotationAngle(date: Date = new Date()): number {
  // Calculate the total number of seconds since midnight UTC of the current date
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;

  // Normalize the seconds into a full rotation (2π radians)
  return (utcSeconds / CONFIG.geo.secondsInDay) * Math.PI * 2;
}

/**
 * Calculates the direction of sunlight based on the UTC time.
 * The Sun's direction is used to simulate day/night cycles and lighting effects on the globe.
 * The calculation takes into account the Earth's axial tilt and the current position in the Earth's orbit.
 *
 * @param date - The date for which to calculate the sun's direction. Defaults to the current date/time.
 * @returns A THREE.Vector3 representing the direction of the Sun (unit vector).
 */
export function getSunDirectionUTC(date: Date = new Date()): THREE.Vector3 {
  // Calculate days since J2000 epoch
  const daysSinceJ2000 =
    (date.getTime() - CONFIG.geo.j2000UTC) / CONFIG.geo.msPerDay;

  // Calculate the mean longitude (L) and mean anomaly (g) of the Earth in its orbit
  const L =
    (CONFIG.geo.solar.meanLongitudeBase +
      CONFIG.geo.solar.meanLongitudePerDay * daysSinceJ2000) %
    360;
  const g =
    (CONFIG.geo.solar.meanAnomalyBase +
      CONFIG.geo.solar.meanAnomalyPerDay * daysSinceJ2000) %
    360;

  // Calculate the Sun's ecliptic longitude (λ), incorporating the ecliptic corrections
  const λ =
    L +
    CONFIG.geo.solar.eclipticCorrection1 * Math.sin(g * CONFIG.geo.degToRad) +
    CONFIG.geo.solar.eclipticCorrection2 *
      Math.sin(2 * g * CONFIG.geo.degToRad);

  // Earth's axial tilt (obliquity) in radians
  const obliquity = CONFIG.geo.obliquityDegrees * CONFIG.geo.degToRad;

  // Convert ecliptic longitude to 3D cartesian coordinates
  const x = Math.cos(λ * CONFIG.geo.degToRad);
  const y = Math.cos(obliquity) * Math.sin(λ * CONFIG.geo.degToRad);
  const z = Math.sin(obliquity) * Math.sin(λ * CONFIG.geo.degToRad);

  // The direction of sunlight (opposite of the calculated coordinates)
  return new THREE.Vector3(-x, -z, y).normalize();
}
