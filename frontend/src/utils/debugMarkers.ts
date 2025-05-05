import { SphereGeometry, MeshBasicMaterial, Mesh, Vector3 } from "three";
import { CONFIG } from "../configs/config";
import { getSubsolarPoint } from "../astro/solar";
import { latLonToUnitVector, latLonToSphericalCoordsGeographic } from "../geo/coordinates";

/**
 * Creates a yellow marker positioned at the current subsolar point.
 * Useful for debugging daylight calculations.
 */
export function createSubsolarMarker(): Mesh {
  const geometry = new SphereGeometry(0.01, 16, 16);
  const material = new MeshBasicMaterial({ color: 0xffff00 }); // Yellow
  const marker = new Mesh(geometry, material);

  const { lat, lon } = getSubsolarPoint();
  const pos = latLonToUnitVector(lat, lon).multiplyScalar(
    CONFIG.globe.radius * 1.01
  );
  marker.position.copy(pos);

  return marker;
}

/**
 * Creates a red marker positioned at (0° lat, 0° lon) — the Prime Meridian.
 * Useful for verifying globe texture alignment.
 */
export function createPrimeMeridianMarker(): Mesh {
  const geometry = new SphereGeometry(0.01, 16, 16);
  const material = new MeshBasicMaterial({ color: 0xff0000 }); // Red
  const marker = new Mesh(geometry, material);

  const { phi, theta } = latLonToSphericalCoordsGeographic(
    0,
    0,
    CONFIG.globe.radius + 0.01
  );
  marker.position.setFromSphericalCoords(
    CONFIG.globe.radius + 0.01,
    phi,
    theta
  );

  return marker;
}
