import { Mesh, MeshBasicMaterial } from "three";
import {
  countryBorderMeshMap,
  oceanBorderMeshMap,
} from "@/core/earth/borders/borderMeshMap";

export function updateCountryBorderVisibility(
  selectedCountryIds: Set<number>,
  hoverIdState: {
    currentHoveredId: number;
    previousHoveredId: number;
    fadeIn: number;
    fadeOut: number;
  }
): void {
  const visibleIds = new Set(
    [
      ...selectedCountryIds,
      hoverIdState.currentHoveredId > 0 && hoverIdState.currentHoveredId < 10000
        ? hoverIdState.currentHoveredId
        : null,
      hoverIdState.previousHoveredId > 0 &&
      hoverIdState.previousHoveredId < 10000
        ? hoverIdState.previousHoveredId
        : null,
    ].filter((id): id is number => id !== null)
  );

  for (const [id, group] of countryBorderMeshMap.entries()) {
    const isHovered = id === hoverIdState.currentHoveredId;
    const isPrev = id === hoverIdState.previousHoveredId;
    const isSelected = selectedCountryIds.has(id);
    const shouldBeVisible = visibleIds.has(id);

    // Determine the uniform opacity to apply to all meshes
    const targetOpacity = isSelected
      ? 1.0
      : isHovered
      ? hoverIdState.fadeIn
      : isPrev
      ? hoverIdState.fadeOut
      : 0.0;

    // Ensure the whole group is visible or hidden
    group.visible = shouldBeVisible;

    group.traverse((child) => {
      if (child instanceof Mesh) {
        // Always apply visibility based on group
        child.visible = shouldBeVisible;

        // Apply material opacity logic even if it was previously hidden
        if (child.material instanceof MeshBasicMaterial) {
          child.material.transparent = true;
          child.material.depthWrite = false;
          child.material.color.set(0xffffff);
          child.material.needsUpdate = true;
          child.material.opacity = targetOpacity;
        }
      }
    });

    // Debug: count how many children actually become visible
    if (id === 226 || id === 356) {
      let visibleMeshes = 0;
      let fadedMeshes = 0;
      group.traverse((child) => {
        if (child instanceof Mesh && child.visible) {
          visibleMeshes++;
          if (
            child.material instanceof MeshBasicMaterial &&
            child.material.opacity > 0.01
          ) {
            fadedMeshes++;
          }
        }
      });
    }
  }
}

export function updateOceanBorderVisibility(
  selectedOceanIds: Set<number>,
  hoverIdState: {
    currentHoveredOceanId: number;
    previousHoveredOceanId: number;
    fadeInOcean: number;
    fadeOutOcean: number;
  }
): void {
  const visibleIds = new Set(
    [
      ...selectedOceanIds,
      hoverIdState.currentHoveredOceanId >= 10000
        ? hoverIdState.currentHoveredOceanId
        : null,
      hoverIdState.previousHoveredOceanId >= 10000
        ? hoverIdState.previousHoveredOceanId
        : null,
    ].filter((id): id is number => id !== null)
  );

  for (const [id, group] of oceanBorderMeshMap.entries()) {
    const isHovered = id === hoverIdState.currentHoveredOceanId;
    const isPrev = id === hoverIdState.previousHoveredOceanId;
    const isSelected = selectedOceanIds.has(id);
    const shouldBeVisible = visibleIds.has(id);

    const targetOpacity = isSelected
      ? 1.0
      : isHovered
      ? hoverIdState.fadeInOcean
      : isPrev
      ? hoverIdState.fadeOutOcean
      : 0.0;

    group.visible = shouldBeVisible;

    group.traverse((child) => {
      if (child instanceof Mesh) {
        child.visible = shouldBeVisible;
        if (child.material instanceof MeshBasicMaterial) {
          child.material.transparent = true;
          child.material.depthWrite = false;
          child.material.color.set(0xffffff);
          child.material.needsUpdate = true;
          child.material.opacity = targetOpacity;
        }
      }
    });
  }
}

export function hideAllCountryBorders(): void {
  for (const group of countryBorderMeshMap.values()) {
    group.visible = false;
    group.traverse((child) => {
      if (
        child instanceof Mesh &&
        child.material instanceof MeshBasicMaterial
      ) {
        child.visible = false;
        child.material.opacity = 0;
        child.material.needsUpdate = true;
      }
    });
  }
}

export function hideAllOceanBorders(): void {
  for (const group of oceanBorderMeshMap.values()) {
    group.visible = false;
    group.traverse((child) => {
      if (
        child instanceof Mesh &&
        child.material instanceof MeshBasicMaterial
      ) {
        child.visible = false;
        child.material.opacity = 0;
        child.material.needsUpdate = true;
      }
    });
  }
}
