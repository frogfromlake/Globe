import * as THREE from "three";
import type { GlobeUniforms } from "../types/uniforms";
import { createSelectionTexture } from "../systems/countryHover";
import { CONFIG } from "../configs/config";
import { createSelectionOceanTexture } from "../systems/oceanHover";

export function initializeUniforms(
  dayTexture: THREE.Texture,
  nightTexture: THREE.Texture,
  countryIdMapTexture: THREE.Texture,
  oceanIdMapTexture: THREE.Texture
): {
  uniforms: GlobeUniforms;
  selectedData: Uint8Array;
  selectedFadeIn: Float32Array;
  selectedFlags: Uint8Array;
  selectedOceanData: Uint8Array;
  selectedOceanFadeIn: Float32Array;
  selectedOceanFlags: Uint8Array;
} {
  const selectedCountryMask = createSelectionTexture();
  const selectedData = selectedCountryMask.image.data as Uint8Array;
  const selectedFadeIn = new Float32Array(selectedData.length).fill(0);
  const selectedFlags = new Uint8Array(selectedData.length).fill(0);

  const selectedOceanMask = createSelectionOceanTexture();
  const selectedOceanData = selectedOceanMask.image.data as Uint8Array;
  const selectedOceanFadeIn = new Float32Array(selectedOceanData.length).fill(
    0
  );
  const selectedOceanFlags = new Uint8Array(selectedOceanData.length).fill(0);

  const uniforms: GlobeUniforms = {
    dayTexture: { value: dayTexture },
    nightTexture: { value: nightTexture },
    countryIdMap: { value: countryIdMapTexture },
    oceanIdMap: { value: oceanIdMapTexture },
    selectedMask: { value: selectedCountryMask },
    selectedOceanMask: { value: selectedOceanMask },
    hoveredCountryId: { value: CONFIG.uniforms.defaultHoveredId },
    hoveredOceanId: { value: 0 },
    previousHoveredId: { value: CONFIG.uniforms.defaultHoveredId },
    highlightFadeIn: { value: 0 },
    highlightFadeOut: { value: 0 },
    uTime: { value: 0 },
    lightDirection: { value: new THREE.Vector3() },
    cameraDirection: { value: new THREE.Vector3() },
    cityLightStrength: { value: CONFIG.uniforms.cityLightStrength },
    cursorWorldPos: { value: new THREE.Vector3(0, 0, 0) },
    cursorGlowStrength: { value: CONFIG.uniforms.cursorGlowStrength },
    cursorGlowRadius: { value: CONFIG.uniforms.cursorGlowRadius },
    cursorUV: { value: new THREE.Vector2(...CONFIG.uniforms.initialCursorUV) },
  };

  return {
    uniforms,
    selectedData,
    selectedFadeIn,
    selectedFlags,
    selectedOceanData,
    selectedOceanFadeIn,
    selectedOceanFlags,
  };
}
