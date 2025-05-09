import { Vector2, ShaderMaterial } from "three";
import { updateHoveredCountry } from "@/core/earth/interactivity/countryHover";
import { updateHoveredOcean } from "@/core/earth/interactivity/oceanHover";
import { appState } from "@/state/appState";
import { CONFIG } from "@/configs/config";
import { countryBorderMeshMap, oceanBorderMeshMap } from "@/core/earth/borders/borderMeshMap";

export interface HoverState {
  currentHoveredId: number;
  previousHoveredId: number;
  fadeIn: number;
  fadeOut: number;
  currentHoveredOceanId: number;
  previousHoveredOceanId: number;
  fadeInOcean: number;
  fadeOutOcean: number;
}

/**
 * Detects hover over countries or oceans based on UV position, and updates highlight state.
 *
 * @param currentUV - UV coordinates of current raycast hit.
 * @param globeMaterial - Globe shader material for ID lookup.
 * @param hoverReady - Whether interactivity is enabled.
 * @param prevState - Previous hover state.
 * @param delta - Time delta in seconds.
 * @param uniforms - Shared shader uniforms (updated in-place).
 * @returns Updated hover state and transition fades.
 */
export function updateHoveredEntities(
  currentUV: Vector2 | null,
  globeMaterial: ShaderMaterial,
  hoverReady: boolean,
  prevState: HoverState,
  delta: number,
  uniforms: { [key: string]: any }
): HoverState {
  let newHoveredId = -1;
  let newHoveredOceanId = -1;

  if (hoverReady && currentUV) {
    if (appState.countryInteractivity) {
      const result = updateHoveredCountry(currentUV, globeMaterial);
      if (result.id > 0) {
        newHoveredId = result.id;
      }
    }

    if (appState.oceanInteractivity) {
      const result = updateHoveredOcean(currentUV);
      if (result.id >= 10000) {
        newHoveredId = result.id;
        newHoveredOceanId = result.id;
      }
    }
  }

  // State transitions
  let {
    currentHoveredId,
    previousHoveredId,
    fadeIn,
    fadeOut,
    currentHoveredOceanId,
    previousHoveredOceanId,
    fadeInOcean,
    fadeOutOcean,
  } = prevState;

  // Early reset if nothing is hovered (e.g., pointer left the globe)
  if (!hoverReady || !currentUV) {
    if (currentHoveredId > 0 && currentHoveredId < 10000) {
      const mesh = countryBorderMeshMap.get(currentHoveredId);
      if (mesh) mesh.visible = false;

      previousHoveredId = currentHoveredId;
      fadeOut = fadeIn;
      fadeIn = 0;
    } else if (currentHoveredId >= 10000) {
      const mesh = oceanBorderMeshMap.get(currentHoveredId);
      if (mesh) mesh.visible = false;

      previousHoveredOceanId = currentHoveredOceanId;
      fadeOutOcean = fadeInOcean;
      fadeInOcean = 0;
    }

    currentHoveredId = -1;
    currentHoveredOceanId = -1;
    newHoveredId = -1;
    newHoveredOceanId = -1;
  }

  // Now apply normal state transition logic
  if (newHoveredId !== currentHoveredId) {
    if (currentHoveredId > 0 && currentHoveredId < 10000) {
      previousHoveredId = currentHoveredId;
      fadeOut = fadeIn;
      fadeIn = 0;
      previousHoveredOceanId = 0;
      fadeOutOcean = 0;
    } else if (currentHoveredId >= 10000) {
      previousHoveredOceanId = currentHoveredId;
      fadeOutOcean = fadeInOcean;
      fadeInOcean = 0;
      previousHoveredId = 0;
      fadeOut = 0;
    }
    currentHoveredId = newHoveredId;
    currentHoveredOceanId = newHoveredOceanId;
  }

  // Update fade
  if (currentHoveredId > 0 && currentHoveredId < 10000) {
    fadeIn = Math.min(fadeIn + delta * CONFIG.fade.highlight, 1);
  }
  if (fadeOut > 0) {
    fadeOut = Math.max(fadeOut - delta * CONFIG.fade.highlight, 0);
  }
  if (currentHoveredId >= 10000) {
    fadeInOcean = Math.min(fadeInOcean + delta * CONFIG.fade.highlight, 1);
  }
  if (
    previousHoveredOceanId >= 10000 &&
    previousHoveredOceanId !== currentHoveredOceanId
  ) {
    fadeOutOcean = Math.max(fadeOutOcean - delta * CONFIG.fade.highlight, 0);
  }

  // Write to uniforms
  uniforms.hoveredCountryId.value =
    currentHoveredId > 0 && currentHoveredId < 10000 ? currentHoveredId : 0;
  uniforms.hoveredOceanId.value =
    currentHoveredId >= 10000 ? currentHoveredId : 0;
  uniforms.previousHoveredId.value = previousHoveredId;
  uniforms.previousHoveredOceanId.value = previousHoveredOceanId;
  uniforms.highlightFadeIn.value =
    currentHoveredId >= 10000 ? fadeInOcean : fadeIn;
  uniforms.highlightFadeOut.value =
    currentHoveredId >= 10000 ? fadeOutOcean : fadeOut;

  return {
    currentHoveredId,
    previousHoveredId,
    fadeIn,
    fadeOut,
    currentHoveredOceanId,
    previousHoveredOceanId,
    fadeInOcean,
    fadeOutOcean,
  };
}
