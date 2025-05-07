import { Texture, Vector2, Vector3 } from "three";
import type { GlobeUniforms } from "@/core/earth/shaders/uniforms";
import { createSelectionTexture } from "@/core/earth/interactivity/countryHover";
import { createSelectionOceanTexture } from "@/core/earth/interactivity/oceanHover";
import { CONFIG } from "@/configs/config";

/**
 * Initializes the shared uniform structure and selection buffers
 * used across core shaders in the OrbitalOne visualization.
 */
export function initializeUniforms(
  dayTexture: Texture,
  nightTexture: Texture,
  countryIdMapTexture: Texture,
  oceanIdMapTexture: Texture
) {
  // === Selection Textures and Buffers ===
  const countryCount = Object.keys(CONFIG.countryHover.countryCenters).length;
  const oceanCount = Object.keys(CONFIG.oceanHover.oceanCenters).length;

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

  /** Ensures a buffer has the correct size. */
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

  // === Shared Shader Uniforms ===
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
    lightDirection: { value: new Vector3() },
    cameraDirection: { value: new Vector3() },
    cityLightStrength: { value: cityLightStrength },
    cursorWorldPos: { value: new Vector3() },
    cursorGlowStrength: { value: cursorGlowStrength },
    cursorGlowRadius: { value: cursorGlowRadius },
    cursorUV: { value: new Vector2(...initialCursorUV) },
    uFlashlightEnabled: { value: true },
    uCursorOnGlobe: { value: false },
    nightBrightness: { value: CONFIG.textures.nightBrightness },
    uCameraDistance: { value: 0.0 },
    uTextureFade: { value: 0.0 },
    uStarFade: { value: 0.0 },
    uCountryCount: { value: countryCount },
    uOceanCount: { value: oceanCount },
    topographyMap: { value: null },
    bumpScale: { value: 1.0 },
    uHoverEnabled: { value: false },
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
