import { Vector3 } from "three";
import { CONFIG } from "../configs/config";

/**
 * Converts latitude and longitude to a unit vector in 3D space.
 * The result represents a point on the surface of a unit sphere with the given latitude and longitude.
 *
 * @param lat - Latitude in degrees (-90 to 90), where 0 is the equator.
 * @param lon - Longitude in degrees (-180 to 180), where 0 is the prime meridian.
 * @returns A normalized THREE.Vector3 pointing to the location on the globe.
 */
export function latLonToUnitVector(lat: number, lon: number): Vector3 {
  // Convert latitude and longitude to spherical coordinates
  const phi = (90 - lat) * CONFIG.geo.degToRad; // phi is latitude (colatitude), mapped from 90° to 0° for north to south pole
  const theta = (lon + 90) * CONFIG.geo.degToRad; // theta is longitude, adjusted by +90 to match texture rotation
  // Set the vector from spherical coordinates (radius=1) and normalize it
  return new Vector3().setFromSphericalCoords(1, phi, theta).normalize();
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
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;

  const rotation = (utcSeconds / CONFIG.geo.secondsInDay) * Math.PI * 2;

  // Offset rotation to align Earth's 0° longitude with the day texture
  return rotation; // No offset — texture alignment will now be handled via solar longitude
}

/**
 * Calculates the direction of sunlight based on the UTC time.
 * The Sun's direction is used to simulate day/night cycles and lighting effects on the globe.
 * The calculation takes into account the Earth's axial tilt and the current position in the Earth's orbit.
 *
 * @param date - The date for which to calculate the sun's direction. Defaults to the current date/time.
 * @returns A THREE.Vector3 representing the direction of the Sun (unit vector).
 */
export function getSunDirectionUTC(date: Date = new Date()): Vector3 {
  const daysSinceJ2000 =
    (date.getTime() - CONFIG.geo.j2000UTC) / CONFIG.geo.msPerDay;

  const L =
    (CONFIG.geo.solar.meanLongitudeBase +
      CONFIG.geo.solar.meanLongitudePerDay * daysSinceJ2000) %
    360;
  const g =
    (CONFIG.geo.solar.meanAnomalyBase +
      CONFIG.geo.solar.meanAnomalyPerDay * daysSinceJ2000) %
    360;

  const λ =
    L +
    CONFIG.geo.solar.eclipticCorrection1 * Math.sin(g * CONFIG.geo.degToRad) +
    CONFIG.geo.solar.eclipticCorrection2 *
      Math.sin(2 * g * CONFIG.geo.degToRad);

  const obliquity = CONFIG.geo.obliquityDegrees * CONFIG.geo.degToRad;

  const x = Math.cos(λ * CONFIG.geo.degToRad);
  const y = Math.cos(obliquity) * Math.sin(λ * CONFIG.geo.degToRad);
  const z = Math.sin(obliquity) * Math.sin(λ * CONFIG.geo.degToRad);

  // No negation: returns the real sunlight direction in space
  return new Vector3(x, z, y).normalize();
}

/**
 * Computes the Sun's subsolar longitude — the geographic longitude directly under the sun.
 * Used to align the globe so the correct region faces the sun.
 *
 * @param date - The UTC date and time
 * @returns The solar longitude in degrees (0–360)
 */
export function getSolarLongitudeUTC(date: Date = new Date()): number {
  const daysSinceJ2000 =
    (date.getTime() - CONFIG.geo.j2000UTC) / CONFIG.geo.msPerDay;

  const L =
    (CONFIG.geo.solar.meanLongitudeBase +
      CONFIG.geo.solar.meanLongitudePerDay * daysSinceJ2000) %
    360;

  return L; // solar longitude in degrees
}
