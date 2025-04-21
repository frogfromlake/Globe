import * as THREE from "three";
import gsap from "gsap";
import {
  getEarthRotationAngle,
  latLonToSphericalCoordsGeographic,
} from "../utils/geo";
import { countryCenters } from "../data/countryCenters";
import { oceanCenters } from "../data/oceanCenters";
import { CONFIG } from "../configs/config";

export function setupLocationSearch(
  inputLocation: HTMLInputElement,
  camera: THREE.Camera,
  controls: any,
  selectedCountryIds: Set<number>,
  selectedOceanIds: Set<number>,
  selectedFlags: Uint8Array,
  selectedOceanFlags: Uint8Array
) {
  const nameToIdMap = new Map<
    string,
    { id: number; type: "country" | "ocean" }
  >();
  const transitionDuration = CONFIG.camera.autoTransitionDuration;

  for (const [id, data] of Object.entries(countryCenters)) {
    nameToIdMap.set(data.name.toLowerCase(), {
      id: Number(id),
      type: "country",
    });
  }

  for (const [id, data] of Object.entries(oceanCenters)) {
    nameToIdMap.set(data.name.toLowerCase(), { id: Number(id), type: "ocean" });
  }

  inputLocation?.addEventListener("change", () => {
    const query = inputLocation.value.trim().toLowerCase();
    if (!query) return;

    const result = nameToIdMap.get(query);
    if (!result) {
      console.warn("Country or ocean not found:", query);
      return;
    }

    const { id, type } = result;
    const centerData =
      type === "country" ? countryCenters[id] : oceanCenters[id];

    // Clear previous selections
    for (const cid of selectedCountryIds) selectedFlags[cid] = 0;
    for (const oid of selectedOceanIds) selectedFlags[oid] = 0;
    selectedCountryIds.clear();
    selectedOceanIds.clear();

    for (let i = 0; i < selectedOceanFlags.length; i++) {
      selectedOceanFlags[i] = 0;
    }

    // Set new selection
    if (id < selectedFlags.length) {
      if (type === "country") {
        selectedCountryIds.add(id);
        selectedFlags[id] = 1;
      } else {
        selectedOceanIds.add(id);
        console.log("Added Ocean ID:", id);
        selectedFlags[id] = 1;

        const oceanIndex = CONFIG.oceanHover.oceanIdToIndex?.[id];
        if (
          typeof oceanIndex === "number" &&
          oceanIndex < CONFIG.oceanHover.maxOceanCount
        ) {
          selectedOceanFlags[oceanIndex] = 1;
        }
      }
    }

    const { lat, lon } = centerData;
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
      duration: transitionDuration,
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
      duration: transitionDuration,
      ease: "power2.inOut",
    });
  });
}
