/**
 * @file locationSearch.ts
 * @description Handles country and ocean name search functionality.
 * Highlights and centers the selected region on the globe and optionally shows related news.
 */

import { Vector3, MathUtils, Camera } from "three";
import gsap from "gsap";

import {
  latLonToSphericalCoordsGeographic,
  getEarthRotationAngle,
} from "../globe/geo";
import { countryMeta } from "../data/countryMeta";
import { oceanCenters } from "../data/oceanCenters";
import { CONFIG } from "../configs/config";
import {
  hideAll3DLabelsExcept,
  update3DLabel,
} from "../hoverLabel/countryLabels3D";
import {
  hideAll3DOceanLabelsExcept,
  update3DOceanLabel,
} from "../hoverLabel/oceanLabel3D";

async function showNewsLazy(isoCode: string) {
  const { showNewsPanel } = await import("../features/news/handleNewsPanel");
  await showNewsPanel(isoCode);
}

/**
 * Initializes the location search input field.
 * Allows the user to search by country or ocean name and rotates the globe to center that region.
 *
 * @param inputLocation - The HTML input element for user location queries.
 * @param camera - The active Three.js camera used to orbit the globe.
 * @param controls - OrbitControls instance to handle camera interaction.
 * @param selectedCountryIds - Set to track currently selected country IDs.
 * @param selectedOceanIds - Set to track currently selected ocean IDs.
 * @param selectedFlags - Uint8Array to track selection states for countries.
 * @param selectedOceanFlags - Uint8Array to track selection states for oceans.
 */
export function setupLocationSearch(
  inputLocation: HTMLInputElement,
  camera: Camera,
  controls: any,
  selectedCountryIds: Set<number>,
  selectedOceanIds: Set<number>,
  selectedFlags: Uint8Array,
  selectedOceanFlags: Uint8Array,
  selectedFadeIn: Float32Array<ArrayBuffer>,
  selectedOceanFadeIn: Float32Array<ArrayBuffer>
) {
  const nameToIdMap = new Map<
    string,
    { id: number; type: "country" | "ocean" }
  >();
  const transitionDuration = CONFIG.camera.autoTransitionDuration;

  for (const [id, data] of Object.entries(countryMeta)) {
    nameToIdMap.set(data.name.toLowerCase(), {
      id: Number(id),
      type: "country",
    });
  }
  for (const [id, data] of Object.entries(oceanCenters)) {
    nameToIdMap.set(data.name.toLowerCase(), { id: Number(id), type: "ocean" });
  }

  inputLocation?.addEventListener("change", async () => {
    const query = inputLocation.value.trim().toLowerCase();
    if (!query) return;

    const result = nameToIdMap.get(query);
    if (!result) {
      console.warn("Location not found:", query);
      return;
    }

    const { id, type } = result;
    const centerData = type === "country" ? countryMeta[id] : oceanCenters[id];

    // === Clear previous selections ===
    for (const cid of selectedCountryIds) selectedFlags[cid - 1] = 0;
    for (const oid of selectedOceanIds) selectedOceanFlags[oid - 1] = 0;
    selectedCountryIds.clear();
    selectedOceanIds.clear();

    // === Apply new selection ===
    if (id < selectedFlags.length + 1) {
      if (type === "country") {
        selectedCountryIds.add(id);
        selectedFlags[id - 1] = 1;
        selectedFadeIn[id - 1] = 1;

        hideAll3DLabelsExcept([id]);
        await update3DLabel(id, camera, 1);

        const isoCode = countryMeta[id]?.iso;
        if (isoCode) {
          showNewsLazy(isoCode);
        } else {
          console.warn(`Missing ISO code for selected country ID: ${id}`);
        }
      } else {
        selectedOceanIds.add(id);

        const oceanIndex = CONFIG.oceanHover.oceanIdToIndex?.[id];
        if (
          typeof oceanIndex === "number" &&
          oceanIndex < CONFIG.oceanHover.maxOceanCount
        ) {
          selectedOceanFlags[oceanIndex] = 1;
          selectedOceanFadeIn[oceanIndex] = 1;
        }

        hideAll3DOceanLabelsExcept([id]);
        const ocean = CONFIG.oceanHover.oceanCenters[id];
        if (ocean) {
          await update3DOceanLabel(
            id,
            ocean.name,
            ocean.lat,
            ocean.lon,
            camera,
            1
          );
        }
      }
    }

    // === Calculate target rotation ===
    const { lat, lon } = centerData;
    const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
      lat,
      lon,
      CONFIG.labels3D.markerRadius
    );

    const rotationY = getEarthRotationAngle();

    const targetDirection = new Vector3()
      .setFromSphericalCoords(radius, phi, theta)
      .applyAxisAngle(new Vector3(0, 1, 0), rotationY) // Apply globe rotation
      .normalize();

    const currentDirection = camera.position
      .clone()
      .sub(controls.target)
      .normalize();
    const originalDistance = camera.position.distanceTo(controls.target);
    const defaultDistance = CONFIG.camera.initialPosition.z ?? originalDistance;
    const shouldZoom = originalDistance < defaultDistance * 0.98;

    // === Animate camera rotation and zoom ===
    const tmp = { t: 0 };
    gsap.to(tmp, {
      t: 1,
      duration: transitionDuration,
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

    // === Keep orbiting around globe center ===
    gsap.to(controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: transitionDuration,
      ease: "power2.inOut",
    });
  });
}
