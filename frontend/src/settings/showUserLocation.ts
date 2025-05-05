/**
 * @file showUserLocation.ts
 * @description Adds a toggle button that displays the user's geolocation as a marker on the globe using the Geolocation API.
 */

import { Mesh, SphereGeometry, MeshBasicMaterial } from "three";
import { CONFIG } from "../configs/config";
import { latLonToSphericalCoordsGeographic } from "../geo/coordinates";

/**
 * Sets up the user location button and marker system.
 * When activated, requests geolocation and places a marker on the globe.
 *
 * @param scene - The main Three.js scene.
 * @param globe - The globe mesh onto which the user marker will be added or removed.
 */
export function setupUserLocation(globe: Mesh): void {
  const locationBtn = document.getElementById(
    "show-location"
  ) as HTMLButtonElement;

  let userMarker: Mesh | null = null;
  let locationVisible = false;

  // Hide button if geolocation is not supported
  if (!navigator.geolocation) {
    locationBtn.style.display = "none";
    return;
  }

  locationBtn.addEventListener("click", () => {
    if (locationVisible && userMarker) {
      globe.remove(userMarker);
      userMarker.geometry.dispose();
      (Array.isArray(userMarker.material)
        ? userMarker.material
        : [userMarker.material]
      ).forEach((m) => m.dispose());
      userMarker = null;
    }

    if (locationVisible) {
      locationVisible = false;
      locationBtn.textContent = "Show My Location";
      return;
    }

    // === Show marker ===
    locationBtn.disabled = true;
    locationBtn.textContent = "Locating...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
          lat,
          lon,
          CONFIG.userLocation.markerAltitudeMultiplier
        );

        userMarker = new Mesh(
          new SphereGeometry(
            CONFIG.userLocation.markerSize,
            CONFIG.userLocation.markerSegments,
            CONFIG.userLocation.markerSegments
          ),
          new MeshBasicMaterial({
            color: CONFIG.userLocation.markerColor,
          })
        );

        userMarker.position.setFromSphericalCoords(radius, phi, theta);
        globe.add(userMarker);

        locationVisible = true;
        locationBtn.textContent = "Hide My Location";
        locationBtn.disabled = false;
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        locationBtn.disabled = false;
        locationBtn.textContent = "Show My Location";
      },
      CONFIG.userLocation.geolocationOptions
    );
  });
}
