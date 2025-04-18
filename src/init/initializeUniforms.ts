import * as THREE from "three";
import type { GlobeUniforms } from "../types/uniforms";
import { createSelectionTexture } from "../systems/countryHover";

export function initializeUniforms(
  dayTexture: THREE.Texture,
  nightTexture: THREE.Texture,
  countryIdMapTexture: THREE.Texture
): {
  uniforms: GlobeUniforms;
  selectedData: Uint8Array;
  selectedFadeIn: Float32Array;
  selectedFlags: Uint8Array;
} {
  const selectedCountryMask = createSelectionTexture();
  const selectedData = selectedCountryMask.image.data as Uint8Array;
  const selectedFadeIn = new Float32Array(selectedData.length).fill(0);
  const selectedFlags = new Uint8Array(selectedData.length).fill(0);

  const uniforms: GlobeUniforms = {
    dayTexture: { value: dayTexture },
    nightTexture: { value: nightTexture },
    countryIdMap: { value: countryIdMapTexture },
    previousHoveredId: { value: -1 },
    hoveredCountryId: { value: -1 },
    uTime: { value: 0 },
    lightDirection: { value: new THREE.Vector3() },
    highlightFadeIn: { value: 0 },
    highlightFadeOut: { value: 0 },
    selectedMask: { value: selectedCountryMask },
    cameraDirection: { value: new THREE.Vector3() },
    cityLightStrength: { value: 0.5 },
    cursorWorldPos: { value: new THREE.Vector3(0, 0, 0) },
    cursorGlowStrength: { value: 0.1 },
    cursorGlowRadius: { value: 0.4 },
    cursorUV: { value: new THREE.Vector2(-1, -1) },
  };

  return { uniforms, selectedData, selectedFadeIn, selectedFlags };
}
