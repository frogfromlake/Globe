/**
 * initializeUniforms.ts
 * Initializes all GLSL shader uniforms and selection buffers for country and ocean highlighting.
 */

import * as THREE from "three";
import type { GlobeUniforms } from "../shaders/uniforms";
import { createSelectionTexture } from "../hoverLabel/countryHover";
import { createSelectionOceanTexture } from "../hoverLabel/oceanHover";
import { CONFIG } from "../configs/config";

/**
 * Initializes the complete uniform structure and all required selection buffers
 * for the country and ocean interaction systems.
 *
 * @param dayTexture - Diffuse Earth daytime texture
 * @param nightTexture - Emissive nighttime texture with city lights
 * @param countryIdMapTexture - RGB map where each country's ID is encoded in pixel color
 * @param oceanIdMapTexture - RGB map for ocean region IDs
 * @returns Uniforms and selection state arrays for countries and oceans
 */
export function initializeUniforms(
  dayTexture: THREE.Texture,
  nightTexture: THREE.Texture,
  countryIdMapTexture: THREE.Texture,
  oceanIdMapTexture: THREE.Texture
) {
  // === Selection Textures and Buffers ===
  const selectedCountryMask = createSelectionTexture();
  const selectedOceanMask = createSelectionOceanTexture();

  const selectedData = selectedCountryMask.image.data as Uint8Array;
  const selectedOceanData = selectedOceanMask.image.data as Uint8Array;

  const maxCountryId = Math.max(
    ...Object.keys(CONFIG.countryHover.countryCenters).map(Number)
  );
  const maxOceanId = Math.max(
    ...Object.keys(CONFIG.oceanHover.oceanCenters).map(Number)
  );
  const maxId = Math.max(maxCountryId, maxOceanId);

  /**
   * Ensures a selection array has the correct size.
   * Expands and preserves values if needed.
   */
  const ensureSize = <T extends Uint8Array | Float32Array>(
    arr: T,
    length: number
  ): T => {
    if (arr.length >= length) return arr;
    const resized = new (arr.constructor as any)(length);
    resized.set(arr);
    return resized;
  };

  // === Country Selection State ===
  const selectedFadeIn = ensureSize(
    new Float32Array(selectedData.length).fill(0),
    maxId + 1
  );
  const selectedFlags = ensureSize(
    new Uint8Array(selectedData.length).fill(0),
    maxId + 1
  );

  // === Ocean Selection State ===
  const selectedOceanFadeIn = ensureSize(
    new Float32Array(selectedOceanData.length).fill(0),
    maxId + 1
  );
  const selectedOceanFlags = ensureSize(
    new Uint8Array(selectedOceanData.length).fill(0),
    maxId + 1
  );

  // === Shader Uniforms ===
  const {
    defaultHoveredId,
    cityLightStrength,
    cursorGlowStrength,
    cursorGlowRadius,
    initialCursorUV,
  } = CONFIG.uniforms;

  const uniforms: GlobeUniforms = {
    dayTexture: { value: dayTexture },
    nightTexture: { value: nightTexture },
    countryIdMap: { value: countryIdMapTexture },
    oceanIdMap: { value: oceanIdMapTexture },
    selectedMask: { value: selectedCountryMask },
    selectedOceanMask: { value: selectedOceanMask },
    hoveredCountryId: { value: defaultHoveredId },
    hoveredOceanId: { value: 0 },
    previousHoveredId: { value: defaultHoveredId },
    previousHoveredOceanId: { value: defaultHoveredId },
    highlightFadeIn: { value: 0 },
    highlightFadeOut: { value: 0 },
    uTime: { value: 0 },
    lightDirection: { value: new THREE.Vector3() },
    cameraDirection: { value: new THREE.Vector3() },
    cityLightStrength: { value: cityLightStrength },
    cursorWorldPos: { value: new THREE.Vector3() },
    cursorGlowStrength: { value: cursorGlowStrength },
    cursorGlowRadius: { value: cursorGlowRadius },
    cursorUV: { value: new THREE.Vector2(...initialCursorUV) },
    uFlashlightEnabled: { value: true },
    uCursorOnGlobe: { value: false },
    nightBrightness: { value: CONFIG.textures.nightBrightness },
    uCameraDistance: { value: 0.0 },
    uTextureFade: { value: 0.0 },
    uStarFade: { value: 0.0 },
    uTimeStars: { value: 0 },
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
