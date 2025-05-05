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
  // const theta = lon * CONFIG.geo.degToRad;
  const theta = (lon + CONFIG.geo.lonOffset) * CONFIG.geo.degToRad;

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
  const theta = (lon + CONFIG.geo.lonOffset) * CONFIG.geo.degToRad;
  // const theta = (lon - 90) * CONFIG.geo.degToRad;
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

  // Align Earth's 0° lon (Greenwich) to face forward
  const greenwichOffset = -Math.PI / 2;

  return rotation + greenwichOffset;
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
// === Estimate ΔT using Espenak & Meeus 2006 polynomial for 2005–2050
function estimateDeltaT(year: number): number {
  const t = (year - 2000) / 100;
  return 62.92 + 32.217 * t + 55.89 * t * t; // seconds
}

// === Normalize angle to [0, 360)
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculates the subsolar point (latitude and longitude) on Earth at the given UTC date/time.
 * Uses apparent solar longitude, nutation, aberration, and IAU 2006 sidereal time.
 */
export function getSubsolarPoint(date = new Date()) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // === Julian Date in UTC and TT
  const JD_UTC = date.getTime() / 86400000 + 2440587.5;
  const year =
    date.getUTCFullYear() +
    (date.getUTCMonth() + 1 - 1 + date.getUTCDate() / 30) / 12;
  const deltaT = estimateDeltaT(year);
  const JD_TT = JD_UTC + deltaT / 86400;

  // === Julian centuries since J2000 (TT)
  const T = (JD_TT - 2451545.0) / 36525;

  // === Mean solar coordinates
  const L0 = normalizeAngle(280.46646 + 36000.76983 * T);
  const M = normalizeAngle(357.52911 + 35999.05029 * T);

  // === Equation of center
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * Math.sin(M * rad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * rad) +
    0.000289 * Math.sin(3 * M * rad);

  // === True longitude and distance
  const trueLon = normalizeAngle(L0 + C);
  const r =
    1.00014 - 0.01671 * Math.cos(M * rad) - 0.00014 * Math.cos(2 * M * rad);
  const aberration = -20.4898 / (3600 * r); // deg

  // === Nutation in longitude (2-term approximation from IAU 2000B)
  const omega = normalizeAngle(125.04 - 1934.136 * T);
  const deltaPsi =
    (-17.2 * Math.sin(omega * rad) - 1.32 * Math.sin(2 * L0 * rad)) / 3600; // deg

  // === Apparent longitude
  const lambdaApp = normalizeAngle(trueLon + deltaPsi + aberration);

  // === Mean obliquity of the ecliptic (arcseconds, IAU formula)
  const epsilon =
    23.43929111 - 0.0130041667 * T - 1.66667e-7 * T ** 2 + 5.02778e-7 * T ** 3;

  // === Declination
  const decl =
    Math.asin(Math.sin(epsilon * rad) * Math.sin(lambdaApp * rad)) * deg;

  // === Right ascension (RA)
  let alpha =
    Math.atan2(
      Math.cos(epsilon * rad) * Math.sin(lambdaApp * rad),
      Math.cos(lambdaApp * rad)
    ) * deg;
  if (alpha < 0) alpha += 360;

  // === GMST (Greenwich Mean Sidereal Time at UTC, IAU 2006)
  let theta =
    280.46061837 +
    360.98564736629 * (JD_UTC - 2451545.0) +
    0.000387933 * T ** 2 -
    T ** 3 / 38710000;
  theta = normalizeAngle(theta);

  // === Subsolar longitude = RA - GMST
  const lon = ((alpha - theta + 540) % 360) - 180;

  return {
    lat: decl,
    lon,
  };
}
