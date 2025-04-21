import * as THREE from "three";
import gsap from "gsap";
import {
  getEarthRotationAngle,
  latLonToSphericalCoordsGeographic,
} from "../utils/geo";
import { countryCenters } from "../data/countryCenters";
import { CONFIG } from "../configs/config";

export function setupCountrySearch(
  inputEl: HTMLInputElement,
  camera: THREE.Camera,
  controls: any,
  selectedCountryIds: Set<number>,
  selectedFlags: Uint8Array
) {
  const nameToIdMap = new Map<string, number>();
  for (const [id, data] of Object.entries(countryCenters)) {
    nameToIdMap.set(data.name.toLowerCase(), Number(id));
  }

  inputEl?.addEventListener("change", () => {
    const query = inputEl.value.trim().toLowerCase();
    if (!query) return;

    const countryId = nameToIdMap.get(query);
    if (!countryId) {
      console.warn("Country not found:", query);
      return;
    }

    if (!selectedCountryIds.has(countryId)) {
      selectedCountryIds.add(countryId);
      selectedFlags[countryId] = 1;
    }

    const { lat, lon } = countryCenters[countryId];
    const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
      lat,
      lon,
      CONFIG.labels3D.markerRadius
    );

    const rotationY = getEarthRotationAngle();

    const targetDirection = new THREE.Vector3()
      .setFromSphericalCoords(radius, phi, theta)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
      .normalize();

    const currentDirection = camera.position
      .clone()
      .sub(controls.target)
      .normalize();

    const originalDistance = camera.position.distanceTo(controls.target);
    const defaultDistance = CONFIG.camera.initialPosition.z ?? originalDistance;
    const shouldZoom = originalDistance < defaultDistance * 0.98;

    const tmp = { t: 0 };

    gsap.to(tmp, {
      t: 1,
      duration: 2.4,
      ease: "power2.inOut",
      onUpdate: () => {
        const zoomFactor = shouldZoom
          ? tmp.t < 0.5
            ? THREE.MathUtils.lerp(originalDistance, defaultDistance, tmp.t * 2)
            : THREE.MathUtils.lerp(
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
      duration: 2.4,
      ease: "power2.inOut",
    });
  });
}
