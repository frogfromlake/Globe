import * as THREE from "three";
import type { GlobeUniforms } from "../types/uniforms";
import { createSelectionTexture } from "../systems/countryHover";
import { createSelectionOceanTexture } from "../systems/oceanHover";
import { CONFIG } from "../configs/config";

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
  const selectedOceanMask = createSelectionOceanTexture();

  const selectedData = selectedCountryMask.image.data as Uint8Array;
  const selectedOceanData = selectedOceanMask.image.data as Uint8Array;

  const maxCountryId = Math.max(...Object.keys(CONFIG.countryHover.countryCenters).map(Number));
  const maxOceanId = Math.max(
    ...Object.keys(CONFIG.oceanHover.oceanCenters).map(Number)
  );
  const maxId = Math.max(maxCountryId, maxOceanId);

  // Ensure all selection arrays are large enough
  const ensureSize = <T extends Uint8Array | Float32Array>(
    arr: T,
    length: number
  ): T => {
    if (arr.length >= length) return arr;
    const newArr = new (arr.constructor as any)(length);
    newArr.set(arr);
    return newArr;
  };

  const selectedFadeIn = ensureSize(
    new Float32Array(selectedData.length).fill(0),
    maxId + 1
  );
  const selectedFlags = ensureSize(
    new Uint8Array(selectedData.length).fill(0),
    maxId + 1
  );

  const selectedOceanFadeIn = ensureSize(
    new Float32Array(selectedOceanData.length).fill(0),
    maxId + 1
  );
  const selectedOceanFlags = ensureSize(
    new Uint8Array(selectedOceanData.length).fill(0),
    maxId + 1
  );

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
    cursorWorldPos: { value: new THREE.Vector3(0, 0, 0) },
    cursorGlowStrength: { value: cursorGlowStrength },
    cursorGlowRadius: { value: cursorGlowRadius },
    cursorUV: { value: new THREE.Vector2(...initialCursorUV) },
    uFlashlightEnabled: { value: true },
    uCursorOnGlobe: { value: false },
    nightBrightness: { value: CONFIG.textures.nightBrightness },
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
