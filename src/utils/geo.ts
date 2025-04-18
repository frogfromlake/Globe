import * as THREE from "three";
import { CONFIG } from "../configs/config";

export function latLonToSphericalCoordsGeographic(
  lat: number,
  lon: number,
  radius = CONFIG.geo.defaultRadius
): { phi: number; theta: number; radius: number } {
  const phi = (CONFIG.geo.latOffset - lat) * CONFIG.geo.degToRad;
  const theta = (lon + CONFIG.geo.lonOffset) * CONFIG.geo.degToRad;
  return { phi, theta, radius };
}

export function getEarthRotationAngle(date: Date = new Date()): number {
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;

  return (utcSeconds / CONFIG.geo.secondsInDay) * Math.PI * 2;
}

export function getSunDirectionUTC(date: Date = new Date()): THREE.Vector3 {
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

  return new THREE.Vector3(-x, -z, y).normalize();
}
