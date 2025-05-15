/**
 * Resets all highlight-related shader uniforms to default values.
 */
export function resetHighlightUniforms(uniforms: { [key: string]: any }) {
  uniforms.hoveredCountryId.value = 0;
  uniforms.previousHoveredId.value = 0;
  uniforms.hoveredOceanId.value = 0;
  uniforms.previousHoveredOceanId.value = 0;
  uniforms.highlightFadeIn.value = 0;
  uniforms.highlightFadeOut.value = 0;
}
