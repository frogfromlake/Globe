import { ShaderMaterial } from "three";

/**
 * Updates the highlight-related shader uniforms based on hover state.
 */
export function updateUniforms(
  uniforms: { [key: string]: any },
  hoverReady: boolean,
  hoverIdState: {
    currentHoveredId: number;
    previousHoveredId: number;
    currentHoveredOceanId: number;
    previousHoveredOceanId: number;
    fadeIn: number;
    fadeOut: number;
    fadeInOcean: number;
    fadeOutOcean: number;
  }
): void {
  if (!hoverReady) {
    uniforms.hoveredCountryId.value = 0;
    uniforms.hoveredOceanId.value = 0;
    uniforms.previousHoveredId.value = 0;
    uniforms.previousHoveredOceanId.value = 0;
    uniforms.highlightFadeIn.value = 0;
    uniforms.highlightFadeOut.value = 0;
    return;
  }

  const isOcean = hoverIdState.currentHoveredId >= 10000;

  uniforms.hoveredCountryId.value = isOcean ? 0 : hoverIdState.currentHoveredId;
  uniforms.hoveredOceanId.value = isOcean ? hoverIdState.currentHoveredId : 0;
  uniforms.previousHoveredId.value = hoverIdState.previousHoveredId;
  uniforms.previousHoveredOceanId.value = hoverIdState.previousHoveredOceanId;
  uniforms.highlightFadeIn.value = isOcean
    ? hoverIdState.fadeInOcean
    : hoverIdState.fadeIn;
  uniforms.highlightFadeOut.value = isOcean
    ? hoverIdState.fadeOutOcean
    : hoverIdState.fadeOut;
}
