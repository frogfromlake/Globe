// src/utils/geo.ts
import * as THREE from "three";

// Used for labels and overlays that must match geographic locations
export function latLonToSphericalCoordsGeographic(
  lat: number,
  lon: number,
  radius = 1
): { phi: number; theta: number; radius: number } {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 90) * (Math.PI / 180); // ← Works for labels
  return { phi, theta, radius };
}

/**
 * Returns the Earth rotation angle based on the current UTC time.
 */
export function getEarthRotationAngle(date: Date = new Date()): number {
  const secondsInDay = 86400;
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;
  return (utcSeconds / secondsInDay) * Math.PI * 2;
}

/**
 * Calculates the sun direction vector based on UTC date.
 */
export function getSunDirectionUTC(date: Date = new Date()): THREE.Vector3 {
  const rad = Math.PI / 180;
  const daysSinceJ2000 = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  const meanLongitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * daysSinceJ2000) % 360;
  const eclipticLongitude =
    meanLongitude +
    1.915 * Math.sin(meanAnomaly * rad) +
    0.02 * Math.sin(2 * meanAnomaly * rad);
  const obliquity = 23.439 * rad;

  const x = Math.cos(eclipticLongitude * rad);
  const y = Math.cos(obliquity) * Math.sin(eclipticLongitude * rad);
  const z = Math.sin(obliquity) * Math.sin(eclipticLongitude * rad);

  return new THREE.Vector3(-x, -z, y).normalize();
}
