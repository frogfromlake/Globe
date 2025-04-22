import * as THREE from "three";
import { latLonToSphericalCoordsGeographic } from "../utils/geo";
import { CONFIG } from "../configs/config";

export function setupUserLocation(scene: THREE.Scene, globe: THREE.Mesh) {
  const locationBtn = document.getElementById(
    "show-location"
  ) as HTMLButtonElement;

  let userMarker: THREE.Mesh | null = null;
  let locationVisible = false;

  if (!navigator.geolocation) {
    locationBtn.style.display = "none";
    return;
  }

  locationBtn.addEventListener("click", () => {
    if (locationVisible) {
      if (userMarker) {
        globe.remove(userMarker);
        userMarker.geometry.dispose();
        (Array.isArray(userMarker.material)
          ? userMarker.material
          : [userMarker.material]
        ).forEach((m) => m.dispose());
      }
      userMarker = null;
      locationVisible = false;
      locationBtn.textContent = "Show My Location";
      return;
    }

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

        userMarker = new THREE.Mesh(
          new THREE.SphereGeometry(
            CONFIG.userLocation.markerSize,
            CONFIG.userLocation.markerSegments,
            CONFIG.userLocation.markerSegments
          ),
          new THREE.MeshBasicMaterial({
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
