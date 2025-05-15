/**
 * @file showUserLocation.ts
 * @description Adds a toggle button that displays the user's geolocation as a green arrow pointing at the location.
 */

import {
  Mesh,
  ConeGeometry,
  MeshBasicMaterial,
  Group,
  Object3DEventMap,
  Vector3,
  MathUtils,
  Camera,
  Quaternion,
} from "three";
import gsap from "gsap";

import { CONFIG } from "@/configs/config";
import { latLonToSphericalCoordsGeographic } from "@/core/earth/geo/coordinates";
import { getSolarRotationY } from "@/core/earth/lighting/sunDirection";

/**
 * Sets up the user location button and marker system.
 */
export function setupUserLocation(
  tiltGroup: Group<Object3DEventMap>,
  camera: Camera,
  controls: any
): void {
  const locationBtn = document.getElementById(
    "show-location"
  ) as HTMLButtonElement;

  let userMarker: Mesh | null = null;
  let locationVisible = false;

  if (!navigator.geolocation) {
    locationBtn.style.display = "none";
    return;
  }

  locationBtn.addEventListener("click", () => {
    if (locationVisible && userMarker) {
      tiltGroup.remove(userMarker);
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

        // Arrow dimensions
        const coneHeight = CONFIG.userLocation.markerSize * 4.5;
        const coneRadius = CONFIG.userLocation.markerSize * 0.8;

        const geometry = new ConeGeometry(coneRadius, coneHeight, 32);
        geometry.translate(0, -coneHeight / 2, 0); // shift so tip is at origin

        const material = new MeshBasicMaterial({
          color: CONFIG.userLocation.markerColor,
        });
        userMarker = new Mesh(geometry, material);

        // Position on globe
        const surfacePoint = new Vector3().setFromSphericalCoords(
          radius,
          phi,
          theta
        );
        const normal = surfacePoint.clone().normalize();

        // Position the marker at the surface
        userMarker.position.copy(surfacePoint);

        // Rotate so cone's -Z axis (tip) aligns with surface normal
        const tipDirection = new Vector3(0, -1, 0);
        const quat = new Quaternion().setFromUnitVectors(tipDirection, normal);
        userMarker.quaternion.copy(quat);

        tiltGroup.add(userMarker);

        locationVisible = true;
        locationBtn.textContent = "Hide My Location";
        locationBtn.disabled = false;

        // === Rotate camera to user location ===
        const targetRotation = getSolarRotationY();
        const targetDirection = surfacePoint
          .clone()
          .applyAxisAngle(new Vector3(0, 1, 0), targetRotation)
          .normalize();

        const currentDirection = camera.position
          .clone()
          .sub(controls.target)
          .normalize();
        const originalDistance = camera.position.distanceTo(controls.target);
        const defaultDistance =
          CONFIG.camera.initialPosition.z ?? originalDistance;
        const shouldZoom = originalDistance < defaultDistance * 0.98;

        const tmp = { t: 0 };
        gsap.to(tmp, {
          t: 1,
          duration: 2,
          ease: "power2.inOut",
          onUpdate: () => {
            const zoomFactor = shouldZoom
              ? tmp.t < 0.5
                ? MathUtils.lerp(originalDistance, defaultDistance, tmp.t * 2)
                : MathUtils.lerp(
                    defaultDistance,
                    originalDistance,
                    (tmp.t - 0.5) * 2
                  )
              : originalDistance;

            const interpolatedDirection = currentDirection
              .clone()
              .lerp(targetDirection, tmp.t)
              .normalize();
            const newPos = interpolatedDirection.multiplyScalar(zoomFactor);
            camera.position.copy(newPos);
            controls.update();
          },
        });

        gsap.to(controls.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 2,
          ease: "power2.inOut",
        });
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
