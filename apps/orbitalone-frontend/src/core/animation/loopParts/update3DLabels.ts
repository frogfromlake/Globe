import { PerspectiveCamera, MathUtils } from "three";
import {
  update3DLabel,
  hideAll3DLabelsExcept,
} from "@/core/earth/interactivity/countryLabels3D";
import {
  update3DOceanLabel,
  hideAll3DOceanLabelsExcept,
} from "@/core/earth/interactivity/oceanLabel3D";
import { CONFIG } from "@/configs/config";
import { oceanIdToIndex } from "@/utils/oceanIdToIndex";

/**
 * Updates fading and visibility of country and ocean 3D labels.
 */
export function update3DLabels(
  camera: PerspectiveCamera,
  hoverIdState: {
    currentHoveredId: number;
    previousHoveredId: number;
    fadeIn: number;
    fadeOut: number;
    currentHoveredOceanId: number;
    previousHoveredOceanId: number;
    fadeInOcean: number;
    fadeOutOcean: number;
  },
  selectedCountryIds: Set<number>,
  selectedOceanIds: Set<number>,
  selectedOceanFadeIn: Float32Array,
  delta: number
): void {
  const hoveredCountry = hoverIdState.currentHoveredId;
  const hoveredOcean =
    hoverIdState.currentHoveredId >= 10000
      ? hoverIdState.currentHoveredId
      : null;

  // === Ocean fade logic ===
  if (hoveredOcean) {
    hoverIdState.fadeInOcean = Math.min(
      hoverIdState.fadeInOcean + delta * CONFIG.fade.highlight,
      1
    );
  }
  if (
    hoverIdState.previousHoveredOceanId >= 10000 &&
    hoverIdState.previousHoveredOceanId !== hoverIdState.currentHoveredOceanId
  ) {
    hoverIdState.fadeOutOcean = Math.max(
      hoverIdState.fadeOutOcean - delta * CONFIG.fade.highlight,
      0
    );
  }

  // === Country labels ===
  hideAll3DLabelsExcept(
    [...selectedCountryIds, hoveredCountry].filter((id) => id > 0 && id < 10000)
  );

  if (
    hoveredCountry &&
    hoveredCountry < 10000 &&
    !selectedCountryIds.has(hoveredCountry)
  ) {
    update3DLabel(hoveredCountry, camera, hoverIdState.fadeIn);
  }

  for (const id of selectedCountryIds) {
    if (id !== hoveredCountry) {
      update3DLabel(id, camera, 1.0);
    }
  }

  // === Ocean labels ===
  hideAll3DOceanLabelsExcept(
    [...selectedOceanIds, hoveredOcean].filter(
      (id): id is number => id !== null && id >= 10000
    )
  );

  if (hoveredOcean && !selectedOceanIds.has(hoveredOcean)) {
    const ocean = CONFIG.oceanHover.oceanCenters[hoveredOcean];
    if (ocean) {
      update3DOceanLabel(
        hoveredOcean,
        ocean.name,
        ocean.lat,
        ocean.lon,
        camera,
        hoverIdState.fadeInOcean
      );
    }
  }

  for (const id of selectedOceanIds) {
    if (id !== hoveredOcean) {
      const ocean = CONFIG.oceanHover.oceanCenters[id];
      if (ocean) {
        update3DOceanLabel(
          id,
          ocean.name,
          ocean.lat,
          ocean.lon,
          camera,
          selectedOceanFadeIn[oceanIdToIndex[id]]
        );
      }
    }
  }
}
